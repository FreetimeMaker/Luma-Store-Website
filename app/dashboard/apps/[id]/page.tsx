"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import SecurityScanPanel from "./SecurityScanPanel";

type SubmissionStatus = "Pending" | "In Review" | "Changes Requested" | "Approved" | "Rejected";

type Submission = {
  id: string;
  user_id: string;
  name: string;
  short_description: string | null;
  description: string | null;
  category: string | null;
  status: SubmissionStatus;
  submitted_at: string;
  status_updated_at: string | null;
  review_message: string | null;
  repo_url: string | null;
  link: string | null;
  license_type: string | null;
  version: string | null;
  version_code: number | null;
  package_name: string | null;
  changelog: string | null;
  ant_features: unknown;
  platforms: unknown[] | null;
  separate_platform_repos: boolean | null;
};

type VersionRow = {
  id: string;
  version: string | null;
  version_code: number | null;
  changelog: string | null;
  download_url: string | null;
  status: string;
  created_at: string;
  published_at: string | null;
};

type SecurityScan = {
  id: string;
  status: "Not Scanned" | "Queued" | "Scanning" | "Passed" | "Warnings" | "Failed";
  risk_level: "Unknown" | "Low" | "Medium" | "High" | "Critical";
  findings: unknown;
  permissions: unknown;
  scanned_at: string | null;
  created_at: string;
};

type DownloadStats = { app_id: string; total: number; today: number; this_month: number; this_year: number };

type PublishedPlatform = {
  id: string;
  platform: string;
  package_type: string | null;
  linux_package_base: string | null;
  download_url: string | null;
  file_size_mb: number | null;
  sha256: string | null;
  artifact_verified_at: string | null;
  artifact_size_bytes: number | string | null;
};

type SubmissionPlatform = {
  platform: string;
  packageType: string;
  downloadUrl: string;
  repoUrl: string;
  metadata: {
    title: string;
    shortDescription: string;
    fullDescription: string;
    changelog: string;
    screenshots: string[];
  } | null;
};

type PublishedApp = {
  id: string;
  name: string;
  short_description: string | null;
  description: string | null;
  version: string | null;
  version_code: number | null;
  package_name: string | null;
  license_type: string | null;
  repo_url: string | null;
  changelog: string | null;
  ant_features: unknown;
  updated_at: string | null;
};

const cardClass = "rounded-2xl border border-slate-800 bg-slate-900/80 shadow-lg shadow-black/10";

const statusColors: Record<SubmissionStatus, string> = {
  Pending: "border-yellow-700/50 bg-yellow-900/30 text-yellow-300",
  "In Review": "border-blue-700/50 bg-blue-900/30 text-blue-300",
  "Changes Requested": "border-orange-700/50 bg-orange-900/30 text-orange-300",
  Approved: "border-emerald-700/50 bg-emerald-900/30 text-emerald-300",
  Rejected: "border-red-700/50 bg-red-900/30 text-red-300",
};

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function hasSeparatePlatformData(value: unknown): boolean {
  return Array.isArray(value) && value.some((entry) => {
    if (!entry || typeof entry !== "object") return false;
    const item = entry as Record<string, unknown>;
    return (typeof item.repoUrl === "string" && item.repoUrl.trim().length > 0)
      || (typeof item.repo_url === "string" && item.repo_url.trim().length > 0)
      || (item.metadata !== null && typeof item.metadata === "object");
  });
}

function normalizeSubmissionPlatforms(value: unknown): SubmissionPlatform[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const item = entry as Record<string, unknown>;
    const platform = typeof item.platform === "string" ? item.platform : "";
    if (!platform) return [];
    const packageType = String(item.packageType ?? item.package_type ?? "artifact");
    const downloadUrl = String(item.downloadUrl ?? item.download_url ?? "");
    const repoUrl = String(item.repoUrl ?? item.repo_url ?? "");
    const rawMetadata = item.metadata;
    let metadata: SubmissionPlatform["metadata"] = null;
    if (rawMetadata && typeof rawMetadata === "object") {
      const row = rawMetadata as Record<string, unknown>;
      metadata = {
        title: String(row.title ?? ""),
        shortDescription: String(row.shortDescription ?? row.short_description ?? ""),
        fullDescription: String(row.fullDescription ?? row.full_description ?? ""),
        changelog: String(row.changelog ?? ""),
        screenshots: stringArray(row.screenshots),
      };
    }
    return [{ platform, packageType, downloadUrl, repoUrl, metadata }];
  });
}

function formatBytes(value: number | string | null | undefined): string {
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function SubmissionDetailsPage() {
  const params = useParams<{ id: string }>();
  const submissionId = params.id;
  const supabase = useMemo(() => createClient(), []);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [versions, setVersions] = useState<VersionRow[]>([]);
  const [scan, setScan] = useState<SecurityScan | null>(null);
  const [publishedApp, setPublishedApp] = useState<PublishedApp | null>(null);
  const [publishedPlatforms, setPublishedPlatforms] = useState<PublishedPlatform[]>([]);
  const [downloadStats, setDownloadStats] = useState<DownloadStats | null>(null);
  const [badgePlatform, setBadgePlatform] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("You must be signed in.");
      setLoading(false);
      return;
    }

    const { data: submissionData, error: submissionError } = await supabase
      .from("luma_submissions")
      .select("id,user_id,name,short_description,description,category,status,submitted_at,status_updated_at,review_message,repo_url,link,license_type,version,version_code,package_name,changelog,ant_features,platforms,separate_platform_repos")
      .eq("id", submissionId)
      .eq("user_id", user.id)
      .single();

    if (submissionError || !submissionData) {
      setError("Submission not found or you do not have access to it.");
      setLoading(false);
      return;
    }

    const currentSubmission = submissionData as Submission;
    setSubmission(currentSubmission);

    const scanResult = await supabase
      .from("luma_security_scans")
      .select("id,status,risk_level,findings,permissions,scanned_at,created_at")
      .eq("submission_id", submissionId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!scanResult.error) setScan((scanResult.data as SecurityScan | null) ?? null);

    if (currentSubmission.package_name) {
      const versionsResult = await supabase
        .from("luma_app_versions")
        .select("id,version,version_code,changelog,download_url,status,created_at,published_at")
        .eq("package_name", currentSubmission.package_name)
        .order("created_at", { ascending: false });
      if (!versionsResult.error) setVersions((versionsResult.data ?? []) as VersionRow[]);
    }

    if (currentSubmission.status === "Approved") {
      let publishedResult = await supabase
        .from("store_apps")
        .select("id,name,short_description,description,version,version_code,package_name,license_type,repo_url,changelog,ant_features,updated_at")
        .eq("luma_submission_id", submissionId)
        .maybeSingle();

      if (!publishedResult.data && currentSubmission.package_name) {
        publishedResult = await supabase
          .from("store_apps")
          .select("id,name,short_description,description,version,version_code,package_name,license_type,repo_url,changelog,ant_features,updated_at")
          .eq("package_name", currentSubmission.package_name)
          .maybeSingle();
      }
      if (!publishedResult.error) {
        const published = (publishedResult.data as PublishedApp | null) ?? null;
        setPublishedApp(published);
        if (published?.id) {
          const [{ data: statsRows }, platformResult] = await Promise.all([
            supabase.rpc("get_my_luma_download_stats"),
            supabase
              .from("store_app_platforms")
              .select("id,platform,package_type,linux_package_base,download_url,file_size_mb,sha256,artifact_verified_at,artifact_size_bytes")
              .eq("app_id", published.id)
              .order("platform", { ascending: true }),
          ]);
          const stats = ((statsRows ?? []) as DownloadStats[]).find((row) => row.app_id === published.id) ?? null;
          setDownloadStats(stats);
          if (!platformResult.error) setPublishedPlatforms((platformResult.data ?? []) as PublishedPlatform[]);
        }
      }
    }

    setLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submissionId, supabase]);

  if (loading) return <div className={`${cardClass} mx-auto max-w-6xl p-8 text-center text-slate-400`}>Loading app details…</div>;
  if (error && !submission) return <div className={`${cardClass} mx-auto max-w-6xl p-8`}><p className="text-red-300">{error}</p><Link href="/dashboard" className="mt-5 inline-flex rounded-xl bg-slate-800 px-4 py-2 text-sm text-white">Back to dashboard</Link></div>;
  if (!submission) return null;

  const antiFeatures = stringArray((publishedApp?.ant_features ?? submission.ant_features));
  const repoUrl = publishedApp?.repo_url || submission.repo_url || submission.link;
  const submissionPlatforms = normalizeSubmissionPlatforms(submission.platforms);
  const platformNames = Array.from(new Set(submissionPlatforms.map((item) => item.platform)));

  return (
    <div className="glass-page mx-auto max-w-6xl space-y-6 pb-20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="break-words text-3xl font-bold text-white">{submission.name}</h1>
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusColors[submission.status]}`}>{submission.status}</span>
          </div>
          <p className="mt-2 text-sm text-slate-400">{submission.package_name || "No package name"} · {submission.version || "No version"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(submission.status === "Rejected" || submission.status === "Changes Requested" || submission.status === "Approved") && (
            <Link href="/dashboard" className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500">
              {submission.status === "Approved" ? "Submit update" : "Edit & resubmit"}
            </Link>
          )}
          <Link href={`/dashboard/status?submission=${encodeURIComponent(submissionId)}`} className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-slate-800">View timeline</Link>
          <Link href="/dashboard" className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-slate-800">Dashboard</Link>
        </div>
      </div>

      {error && <div className="rounded-xl border border-amber-700/50 bg-amber-950/30 p-4 text-sm text-amber-200">{error}</div>}

      {submission.status === "In Review" && (
        <section className="rounded-2xl border border-amber-700/40 bg-amber-950/20 p-5">
          <h2 className="font-semibold text-amber-200">Security warning · manual review required</h2>
          <p className="mt-2 text-sm leading-6 text-amber-100/80">VirusTotal reported suspicious detections. This app will not be published automatically until the warning has been reviewed.</p>
          {submission.review_message && <p className="mt-3 whitespace-pre-wrap rounded-xl bg-slate-950/40 p-4 text-sm text-slate-300">{submission.review_message}</p>}
        </section>
      )}

      {submission.status === "Changes Requested" && (
        <section className="rounded-2xl border border-orange-700/40 bg-orange-950/20 p-5">
          <h2 className="font-semibold text-orange-200">Changes requested</h2>
          <p className="mt-2 text-sm leading-6 text-orange-100/80">This is a legacy status from the previous manual-review workflow. Check the existing message, update the submission, and resubmit it for automatic scanning.</p>
          {submission.review_message && <p className="mt-3 whitespace-pre-wrap rounded-xl bg-slate-950/40 p-4 text-sm text-slate-300">{submission.review_message}</p>}
        </section>
      )}

      {submission.status === "Approved" && (
        <section className={`${cardClass} overflow-hidden`}>
          <div className="border-b border-slate-800 px-5 py-4"><h2 className="font-semibold text-white">Published app</h2></div>
          {publishedApp ? (
            <div className="grid gap-5 p-5 md:grid-cols-2">
              <div><p className="text-xs uppercase tracking-wide text-slate-500">Published version</p><p className="mt-1 text-lg font-semibold text-white">{publishedApp.version || "—"} {publishedApp.version_code ? `(code ${publishedApp.version_code})` : ""}</p></div>
              <div><p className="text-xs uppercase tracking-wide text-slate-500">License</p><p className="mt-1 text-slate-200">{publishedApp.license_type || submission.license_type || "—"}</p></div>
              <div><p className="text-xs uppercase tracking-wide text-slate-500">Repository</p>{repoUrl ? <a href={repoUrl} target="_blank" rel="noopener noreferrer" className="mt-1 block break-all text-indigo-300 hover:text-indigo-200">{repoUrl}</a> : <p className="mt-1 text-slate-400">—</p>}</div>
              <div><p className="text-xs uppercase tracking-wide text-slate-500">Last published update</p><p className="mt-1 text-slate-200">{formatDate(publishedApp.updated_at)}</p></div>
              {downloadStats && <div className="md:col-span-2"><p className="text-xs uppercase tracking-wide text-slate-500">Luma Store downloads · all versions</p><div className="mt-3"><div className="rounded-xl border border-slate-800 bg-slate-950/45 p-3"><p className="text-xs text-slate-500">All-time</p><p className="mt-1 text-xl font-bold text-white">{Number(downloadStats.total).toLocaleString()}</p></div></div><div className="mt-4 flex flex-wrap items-center gap-3"><select value={badgePlatform} onChange={(e)=>setBadgePlatform(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200"><option value="all">All platforms</option><option value="Android">Android</option><option value="Windows">Windows</option><option value="Linux">Linux</option></select><img src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/download-badge?app_id=${encodeURIComponent(publishedApp.id)}${badgePlatform==="all"?"":`&platform=${encodeURIComponent(badgePlatform)}`}`} alt={`${publishedApp.name} ${badgePlatform==="all"?"all-platform":badgePlatform} Luma Store downloads`} className="h-5 w-auto"/><button type="button" onClick={()=>{const platformPart=badgePlatform==="all"?"":`&platform=${encodeURIComponent(badgePlatform)}`;navigator.clipboard.writeText(`[![Luma Store downloads](${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/download-badge?app_id=${publishedApp.id}${platformPart})](${window.location.origin}/discover/${publishedApp.id})`)}} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 hover:text-white">Copy badge Markdown</button></div></div>}
              <div className="md:col-span-2"><p className="text-xs uppercase tracking-wide text-slate-500">Anti-Features</p><div className="mt-2 flex flex-wrap gap-2">{antiFeatures.length ? antiFeatures.map((item) => <span key={item} className="rounded-full border border-amber-700/50 bg-amber-950/30 px-2.5 py-1 text-xs text-amber-200">{item}</span>) : <span className="text-sm text-slate-400">No Anti-Features detected or recorded.</span>}</div></div>
            </div>
          ) : <p className="p-5 text-sm text-slate-400">The submission is approved, but no matching published store record was found yet.</p>}
        </section>
      )}

      {publishedApp && publishedPlatforms.length > 0 && (
        <section className={`${cardClass} overflow-hidden`}>
          <div className="border-b border-slate-800 px-5 py-4">
            <h2 className="font-semibold text-white">Published platform artifacts</h2>
            <p className="mt-1 text-sm text-slate-400">Files currently available from Luma Store for each platform.</p>
          </div>
          <div className="grid gap-4 p-5 md:grid-cols-2">
            {publishedPlatforms.map((item) => (
              <article key={item.id} className="rounded-2xl border border-slate-800 bg-slate-950/35 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold text-white">{item.platform}</h3>
                  <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1 text-xs text-indigo-200">{item.package_type || "artifact"}</span>
                </div>
                <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div><dt className="text-xs uppercase tracking-wide text-slate-500">Size</dt><dd className="mt-1 text-sm text-slate-200">{item.file_size_mb ? `${Number(item.file_size_mb).toFixed(2)} MB` : formatBytes(item.artifact_size_bytes)}</dd></div>
                  <div><dt className="text-xs uppercase tracking-wide text-slate-500">Verified</dt><dd className="mt-1 text-sm text-slate-200">{formatDate(item.artifact_verified_at)}</dd></div>
                  {item.linux_package_base && <div><dt className="text-xs uppercase tracking-wide text-slate-500">Linux base</dt><dd className="mt-1 text-sm text-slate-200">{item.linux_package_base}</dd></div>}
                  {item.sha256 && <div className="sm:col-span-2"><dt className="text-xs uppercase tracking-wide text-slate-500">SHA-256</dt><dd className="mt-1 break-all font-mono text-xs text-slate-300">{item.sha256}</dd></div>}
                </dl>
                {item.download_url && <a href={item.download_url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-xs font-medium text-indigo-200 hover:bg-indigo-500/20">Open download ↗</a>}
              </article>
            ))}
          </div>
        </section>
      )}

      {submissionPlatforms.length > 0 && (
        <section className={`${cardClass} overflow-hidden`}>
          <div className="border-b border-slate-800 px-5 py-4">
            <h2 className="font-semibold text-white">{submission.separate_platform_repos || hasSeparatePlatformData(submission.platforms) ? "Platform repositories & metadata" : "Submission platforms"}</h2>
            <p className="mt-1 text-sm text-slate-400">Submitted repositories, package files and store metadata per platform.</p>
          </div>
          <div className="space-y-5 p-5">
            {platformNames.map((platform) => {
              const entries = submissionPlatforms.filter((item) => item.platform === platform);
              const metadataEntry = entries.find((item) => item.metadata);
              const repoEntry = entries.find((item) => item.repoUrl);
              const metadata = metadataEntry?.metadata;
              return (
                <article key={platform} className="rounded-2xl border border-slate-800 bg-slate-950/35 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold text-white">{platform}</h3>
                    <div className="flex flex-wrap gap-2">{entries.map((item, index) => <span key={`${item.packageType}-${index}`} className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1 text-xs text-indigo-200">{item.packageType}</span>)}</div>
                  </div>
                  {repoEntry?.repoUrl && <a href={repoEntry.repoUrl} target="_blank" rel="noopener noreferrer" className="mt-3 block break-all text-sm text-indigo-300 hover:text-indigo-200">{repoEntry.repoUrl}</a>}
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {entries.map((item, index) => (
                      <div key={`${item.packageType}-download-${index}`} className="rounded-xl border border-slate-800 bg-slate-950/45 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.packageType} download</p>
                        {item.downloadUrl ? <a href={item.downloadUrl} target="_blank" rel="noopener noreferrer" className="mt-1 block break-all text-sm text-indigo-300 hover:text-indigo-200">{item.downloadUrl}</a> : <p className="mt-1 text-sm text-slate-500">—</p>}
                      </div>
                    ))}
                  </div>
                  {metadata && (
                    <div className="mt-5 border-t border-slate-800 pt-4">
                      <dl className="space-y-3">
                        <div><dt className="text-xs uppercase tracking-wide text-slate-500">Title</dt><dd className="mt-1 text-sm text-slate-200">{metadata.title || "—"}</dd></div>
                        <div><dt className="text-xs uppercase tracking-wide text-slate-500">Short description</dt><dd className="mt-1 text-sm text-slate-300">{metadata.shortDescription || "—"}</dd></div>
                        <div><dt className="text-xs uppercase tracking-wide text-slate-500">Description</dt><dd className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-400">{metadata.fullDescription || "—"}</dd></div>
                        <div><dt className="text-xs uppercase tracking-wide text-slate-500">Changelog</dt><dd className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-400">{metadata.changelog || "—"}</dd></div>
                      </dl>
                      {metadata.screenshots.length > 0 && <div className="mt-4 flex gap-3 overflow-x-auto pb-2">{metadata.screenshots.map((url,index)=><img key={url+index} src={url} alt={`${platform} screenshot ${index+1}`} className="h-40 w-auto rounded-xl border border-slate-800 object-contain"/>)}</div>}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <SecurityScanPanel submissionId={submissionId} initialScan={scan} />

        <section className={`${cardClass} overflow-hidden`}>
          <div className="border-b border-slate-800 px-5 py-4"><h2 className="font-semibold text-white">Version history</h2></div>
          <div className="divide-y divide-slate-800">
            {versions.length === 0 ? <p className="p-5 text-sm text-slate-500">No version-history entries yet.</p> : versions.map((version) => (
              <div key={version.id} className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold text-white">{version.version || "Unknown version"} {version.version_code ? <span className="font-normal text-slate-500">({version.version_code})</span> : null}</p><span className="rounded-full border border-slate-700 bg-slate-950/40 px-2.5 py-1 text-xs text-slate-300">{version.status}</span></div>
                <p className="mt-1 text-xs text-slate-500">{version.published_at ? `Published ${formatDate(version.published_at)}` : `Created ${formatDate(version.created_at)}`}</p>
                {version.changelog && <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-400">{version.changelog}</p>}
              </div>
            ))}
          </div>
        </section>
      </div>

    </div>
  );
}
