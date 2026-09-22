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

export default function SubmissionDetailsPage() {
  const params = useParams<{ id: string }>();
  const submissionId = params.id;
  const supabase = useMemo(() => createClient(), []);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [versions, setVersions] = useState<VersionRow[]>([]);
  const [scan, setScan] = useState<SecurityScan | null>(null);
  const [publishedApp, setPublishedApp] = useState<PublishedApp | null>(null);
  const [downloadStats, setDownloadStats] = useState<DownloadStats | null>(null);
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
      .select("id,user_id,name,short_description,description,category,status,submitted_at,status_updated_at,review_message,repo_url,link,license_type,version,version_code,package_name,changelog,ant_features")
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
          const { data: statsRows } = await supabase.rpc("get_my_luma_download_stats");
          const stats = ((statsRows ?? []) as DownloadStats[]).find((row) => row.app_id === published.id) ?? null;
          setDownloadStats(stats);
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
              {downloadStats && <div className="md:col-span-2"><p className="text-xs uppercase tracking-wide text-slate-500">Luma Store downloads · all versions</p><div className="mt-3"><div className="rounded-xl border border-slate-800 bg-slate-950/45 p-3"><p className="text-xs text-slate-500">All-time</p><p className="mt-1 text-xl font-bold text-white">{Number(downloadStats.total).toLocaleString()}</p></div></div><div className="mt-4 flex flex-wrap items-center gap-3"><img src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/download-badge?app_id=${encodeURIComponent(publishedApp.id)}`} alt={`${publishedApp.name} Luma Store downloads`} className="h-5 w-auto"/><button type="button" onClick={()=>navigator.clipboard.writeText(`[![Luma Store downloads](${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/download-badge?app_id=${publishedApp.id})](${window.location.origin}/discover/${publishedApp.id})`)} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 hover:text-white">Copy badge Markdown</button></div></div>}
              <div className="md:col-span-2"><p className="text-xs uppercase tracking-wide text-slate-500">Anti-Features</p><div className="mt-2 flex flex-wrap gap-2">{antiFeatures.length ? antiFeatures.map((item) => <span key={item} className="rounded-full border border-amber-700/50 bg-amber-950/30 px-2.5 py-1 text-xs text-amber-200">{item}</span>) : <span className="text-sm text-slate-400">No Anti-Features detected or recorded.</span>}</div></div>
            </div>
          ) : <p className="p-5 text-sm text-slate-400">The submission is approved, but no matching published store record was found yet.</p>}
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
