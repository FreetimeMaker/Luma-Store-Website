import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type SubmissionStatus = "Pending" | "In Review" | "Changes Requested" | "Approved" | "Rejected";

type SubmissionBody = {
  submission?: Record<string, unknown>;
  editingId?: string | null;
  editingStatus?: SubmissionStatus | null;
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
    if (!authorization?.startsWith("Bearer ") || !githubToken) {
      return NextResponse.json({ error: "GitHub authentication is required." }, { status: 401 });
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
    if (submission.closed_source === true || submission.license_type === "Proprietary") {
      return NextResponse.json({ error: "Luma Store submissions must be open source." }, { status: 400 });
    }

    const { owner, repo } = parseGitHubRepository(submission.repo_url ?? submission.link);
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
      if (!["Rejected", "Approved", "Changes Requested"].includes(body.editingStatus)) {
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
