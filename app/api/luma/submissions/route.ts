import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type SubmissionStatus = "Draft" | "Pending" | "In Review" | "Changes Requested" | "Approved" | "Rejected" | "Archived";

type SubmissionBody = {
  submission?: Record<string, unknown>;
  editingId?: string | null;
  editingStatus?: SubmissionStatus | null;
  draft?: boolean;
  draftStep?: number;
};

function parseGitHubRepository(value: unknown) {
  if (typeof value !== "string") throw new Error("A GitHub repository URL is required.");
  let url: URL;
  try { url = new URL(value.trim()); } catch { throw new Error("A valid GitHub repository URL is required."); }
  if (url.protocol !== "https:" || url.hostname.toLowerCase() !== "github.com") throw new Error("Only github.com repository URLs are supported.");
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length < 2) throw new Error("A valid GitHub repository URL is required.");
  return { owner: parts[0], repo: parts[1].replace(/\.git$/i, "") };
}

async function githubJson(path: string, token: string) {
  const response = await fetch(`https://api.github.com${path}`, {
    cache: "no-store",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!response.ok) {
    if (response.status === 401) throw new Error("GitHub authorization expired. Please sign in with GitHub again.");
    if (response.status === 404) throw new Error("Repository not found or your GitHub authorization cannot access it.");
    throw new Error("GitHub repository permission check failed.");
  }
  return response.json();
}

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("authorization");
    const githubToken = request.headers.get("x-github-token");
    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
    }

    const supabase = createAdminClient();
    const accessToken = authorization.slice("Bearer ".length);
    const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !authData.user) {
      return NextResponse.json({ error: "Your Luma Store session is invalid or expired." }, { status: 401 });
    }

    const body = await request.json() as SubmissionBody;
    const submission = body.submission;
    if (!submission || typeof submission !== "object") {
      return NextResponse.json({ error: "Invalid submission." }, { status: 400 });
    }
    const isDraft = body.draft === true;
    const rawPlatforms = Array.isArray(submission.platforms) ? submission.platforms : [];
    const platforms = rawPlatforms.flatMap((entry) => { if (!entry || typeof entry !== "object") return []; const item=entry as Record<string,unknown>; const platform=String(item.platform??""), packageType=String(item.packageType??""); const downloadUrl=String(item.downloadUrl??"").trim(), repoUrl=String(item.repoUrl??"").trim(); const metadata=item.metadata&&typeof item.metadata==="object"?item.metadata as Record<string,unknown>:null; if (!["Android","Windows","Linux"].includes(platform) || !["apk","exe","msi","deb","rpm"].includes(packageType) || !downloadUrl) return []; try { const url=new URL(downloadUrl); if (url.protocol!=="https:"&&url.protocol!=="http:") return []; } catch { return []; } if(platform==="Android"&&packageType!=="apk")return []; if(platform==="Windows"&&!["exe","msi"].includes(packageType))return []; if(platform==="Linux"&&!["deb","rpm"].includes(packageType))return []; return [{platform,packageType,downloadUrl,...(repoUrl?{repoUrl}:{}),...(metadata?{metadata}: {})}]; });
    if (!isDraft && platforms.length === 0) return NextResponse.json({ error: "At least one valid platform download is required." }, { status: 400 });
    submission.platforms = platforms;
    submission.platform = platforms[0]?.platform ?? submission.platform ?? null;
    submission.download_url = platforms[0]?.downloadUrl ?? submission.download_url ?? null;

    if (submission.closed_source === true || submission.license_type === "Proprietary") {
      return NextResponse.json({ error: "Luma Store submissions must be open source." }, { status: 400 });
    }

    if (isDraft) {
      const draftStep = Math.max(1, Math.min(3, Number(body.draftStep) || 1));
      const safeDraft = { ...submission, name: typeof submission.name === "string" && submission.name.trim() ? submission.name : "Untitled draft", platform: typeof submission.platform === "string" && submission.platform.trim() ? submission.platform : null, link: typeof submission.link === "string" && submission.link.trim() ? submission.link.trim() : null, repo_url: typeof submission.repo_url === "string" && submission.repo_url.trim() ? submission.repo_url.trim() : null, source_code_url: typeof submission.source_code_url === "string" && submission.source_code_url.trim() ? submission.source_code_url.trim() : null, closed_source: false, status: "Draft", draft_step: draftStep, draft_updated_at: new Date().toISOString(), status_updated_at: new Date().toISOString() };
      const draftResult = body.editingId
        ? await supabase.from("luma_submissions").update(safeDraft).eq("id", body.editingId).eq("user_id", authData.user.id).eq("status", "Draft").select().single()
        : await supabase.from("luma_submissions").insert([{ ...safeDraft, user_id: authData.user.id, submitted_at: new Date().toISOString() }]).select().single();
      if (draftResult.error) throw draftResult.error;
      return NextResponse.json({ submission: draftResult.data });
    }

    if (!githubToken) return NextResponse.json({ error: "GitHub authentication is required." }, { status: 401 });
    const separatePlatformRepos = submission.separate_platform_repos === true;
    submission.separate_platform_repos = separatePlatformRepos;
    if (separatePlatformRepos) {
      const uniquePlatforms = [...new Set(platforms.map((item) => item.platform))];
      for (const platform of uniquePlatforms) {
        const entries = platforms.filter((item) => item.platform === platform);
        const repoUrl = entries.find((item) => item.repoUrl)?.repoUrl;
        const metadata = entries.find((item) => item.metadata)?.metadata as Record<string, unknown> | undefined;
        if (!repoUrl) return NextResponse.json({ error: `${platform} requires its own repository URL when separate repositories are enabled.` }, { status: 400 });
        try { parseGitHubRepository(repoUrl); } catch (error) { return NextResponse.json({ error: `${platform}: ${error instanceof Error ? error.message : "Invalid repository URL."}` }, { status: 400 }); }
        const screenshots = Array.isArray(metadata?.screenshots) ? metadata.screenshots.filter((value) => typeof value === "string" && value.trim()) : [];
        if (!metadata || !String(metadata.title??"").trim() || !String(metadata.shortDescription??"").trim() || !String(metadata.fullDescription??"").trim() || !String(metadata.changelog??"").trim() || screenshots.length === 0) {
          return NextResponse.json({ error: `${platform} requires complete store metadata and at least one screenshot when separate repositories are enabled.` }, { status: 400 });
        }
      }
    }
    const primaryRepoUrl = separatePlatformRepos ? platforms.find((item) => item.repoUrl)?.repoUrl : String(submission.repo_url ?? submission.link ?? "");
    const { owner, repo } = parseGitHubRepository(primaryRepoUrl);
    const [githubUser, githubRepo] = await Promise.all([
      githubJson("/user", githubToken),
      githubJson(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, githubToken),
    ]) as [Record<string, unknown>, Record<string, unknown>];

    if (githubRepo.private === true) {
      return NextResponse.json({ error: "The submitted repository must be public." }, { status: 400 });
    }

    const login = typeof githubUser.login === "string" ? githubUser.login : "";
    const repoOwner = githubRepo.owner && typeof githubRepo.owner === "object" && "login" in githubRepo.owner
      ? String((githubRepo.owner as { login?: unknown }).login ?? "")
      : "";
    const permissions = githubRepo.permissions && typeof githubRepo.permissions === "object"
      ? githubRepo.permissions as Record<string, unknown>
      : {};
    const ownsRepository = login.length > 0 && repoOwner.toLowerCase() === login.toLowerCase();
    const canWrite = permissions.push === true || permissions.maintain === true || permissions.admin === true;

    if (!ownsRepository && !canWrite) {
      return NextResponse.json({ error: "Your GitHub account must own this repository or have write access to it." }, { status: 403 });
    }

    if (separatePlatformRepos) {
      const checked = new Set<string>([`https://github.com/${owner}/${repo}`.toLowerCase()]);
      for (const item of platforms) {
        if (!item.repoUrl) continue;
        const parsed = parseGitHubRepository(item.repoUrl);
        const canonical = `https://github.com/${parsed.owner}/${parsed.repo}`;
        if (checked.has(canonical.toLowerCase())) continue;
        const platformRepo = await githubJson(`/repos/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.repo)}`, githubToken) as Record<string, unknown>;
        if (platformRepo.private === true) return NextResponse.json({ error: `${item.platform} repository must be public.` }, { status: 400 });
        const platformOwner = platformRepo.owner && typeof platformRepo.owner === "object" && "login" in platformRepo.owner ? String((platformRepo.owner as { login?: unknown }).login ?? "") : "";
        const platformPermissions = platformRepo.permissions && typeof platformRepo.permissions === "object" ? platformRepo.permissions as Record<string, unknown> : {};
        const platformOwned = login.length > 0 && platformOwner.toLowerCase() === login.toLowerCase();
        const platformWritable = platformPermissions.push === true || platformPermissions.maintain === true || platformPermissions.admin === true;
        if (!platformOwned && !platformWritable) return NextResponse.json({ error: `Your GitHub account must own or have write access to the ${item.platform} repository.` }, { status: 403 });
        checked.add(canonical.toLowerCase());
      }
    }

    const safeSubmission = {
      ...submission,
      link: `https://github.com/${owner}/${repo}`,
      repo_url: `https://github.com/${owner}/${repo}`,
      source_code_url: `https://github.com/${owner}/${repo}`,
      closed_source: false,
      status: "Pending",
      status_updated_at: new Date().toISOString(),
    };

    let result;
    if (body.editingId && body.editingStatus) {
      if (!["Draft", "Rejected", "Approved", "Changes Requested"].includes(body.editingStatus)) {
        return NextResponse.json({ error: "This submission cannot be edited in its current state." }, { status: 409 });
      }
      result = await supabase
        .from("luma_submissions")
        .update(safeSubmission)
        .eq("id", body.editingId)
        .eq("user_id", authData.user.id)
        .eq("status", body.editingStatus)
        .select()
        .single();
    } else {
      result = await supabase
        .from("luma_submissions")
        .insert([{ ...safeSubmission, user_id: authData.user.id, submitted_at: new Date().toISOString() }])
        .select()
        .single();
    }

    if (result.error) throw result.error;
    if (!result.data) return NextResponse.json({ error: "Submission could not be saved." }, { status: 409 });
    return NextResponse.json({ submission: result.data });
  } catch (error) {
    console.error("Luma submission failed:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Submission failed." }, { status: 500 });
  }
}


export async function DELETE(request: Request) {
  try {
    const authorization = request.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
    const supabase = createAdminClient();
    const { data: authData, error: authError } = await supabase.auth.getUser(authorization.slice(7));
    if (authError || !authData.user) return NextResponse.json({ error: "Your Luma Store session is invalid or expired." }, { status: 401 });
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Submission id is required." }, { status: 400 });
    const { data: submission, error } = await supabase.from("luma_submissions").select("id,status,store_app_id").eq("id", id).eq("user_id", authData.user.id).single();
    if (error || !submission) return NextResponse.json({ error: "Submission not found." }, { status: 404 });
    if (submission.status === "Approved") {
      if (!submission.store_app_id) return NextResponse.json({ error: "Published app could not be found." }, { status: 409 });
      const now = new Date().toISOString();
      const { error: archiveError } = await supabase.from("store_apps").update({ archived_at: now, updated_at: now }).eq("id", submission.store_app_id).eq("developer_id", authData.user.id);
      if (archiveError) throw archiveError;
      const { error: statusError } = await supabase.from("luma_submissions").update({ status: "Archived", status_updated_at: now }).eq("id", id).eq("user_id", authData.user.id);
      if (statusError) throw statusError;
      return NextResponse.json({ archived: true });
    }
    if (!["Draft","Pending","In Review","Changes Requested","Rejected"].includes(submission.status)) return NextResponse.json({ error: "This submission cannot be deleted." }, { status: 409 });
    const { error: deleteError } = await supabase.from("luma_submissions").delete().eq("id", id).eq("user_id", authData.user.id);
    if (deleteError) throw deleteError;
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("Luma submission removal failed:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Action failed." }, { status: 500 });
  }
}
