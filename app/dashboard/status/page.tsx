"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface SubmissionRow {
  id: string;
  name: string;
  description: string;
  link: string | null;
  category: string | null;
  status: "Pending" | "In Review" | "Changes Requested" | "Approved" | "Rejected";
  submitted_at: string;
  review_message: string | null;
  changelog: string | null;
  status_updated_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
}

interface HistoryRow {
  id: number;
  submission_id: string;
  status: SubmissionRow["status"];
  review_message: string | null;
  created_at: string;
}

const statusColors: Record<SubmissionRow["status"], string> = {
  Pending: "border-yellow-700/50 bg-yellow-900/30 text-yellow-300",
  "In Review": "border-blue-700/50 bg-blue-900/30 text-blue-300",
  "Changes Requested": "border-orange-700/50 bg-orange-900/30 text-orange-300",
  Approved: "border-emerald-700/50 bg-emerald-900/30 text-emerald-300",
  Rejected: "border-red-700/50 bg-red-900/30 text-red-300",
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

export default function DeveloperStatusPage() {
  const supabase = useMemo(() => createClient(), []);
  const searchParams = useSearchParams();
  const selectedSubmissionId = searchParams.get("submission")?.trim() || null;
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      setHistory([]);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("You must be signed in.");
        setSubmissions([]);
        setLoading(false);
        return;
      }

      let submissionQuery = supabase
        .from("luma_submissions")
        .select("id,name,description,link,category,status,submitted_at,review_message,changelog,status_updated_at,approved_at,rejected_at")
        .eq("user_id", user.id);

      if (selectedSubmissionId) {
        submissionQuery = submissionQuery.eq("id", selectedSubmissionId);
      }

      const { data: submissionData, error: submissionError } = await submissionQuery.order("submitted_at", { ascending: false });

      if (submissionError) {
        setError("Could not load your app submission.");
        setSubmissions([]);
        setLoading(false);
        return;
      }

      let rows = (submissionData ?? []) as SubmissionRow[];

      if (!selectedSubmissionId) {
        const { data: storeApps, error: storeAppsError } = await supabase
          .from("store_apps")
          .select("luma_submission_id");

        if (storeAppsError) {
          setError("Could not resolve the current store submissions.");
          setSubmissions([]);
          setLoading(false);
          return;
        }

        const canonicalSubmissionIds = new Set(
          (storeApps ?? [])
            .map((item: { luma_submission_id: string | null }) => item.luma_submission_id)
            .filter((id: string | null): id is string => typeof id === "string" && id.length > 0)
        );

        rows = rows.filter(
          (item) => item.status !== "Approved" || canonicalSubmissionIds.has(item.id)
        );
      }

      setSubmissions(rows);

      if (rows.length > 0) {
        const { data: historyData, error: historyError } = await supabase
          .from("luma_submission_status_history")
          .select("id,submission_id,status,review_message,created_at")
          .in("submission_id", rows.map((row) => row.id))
          .order("created_at", { ascending: true });

        if (historyError) setError("Submission loaded, but the status timeline could not be loaded.");
        else setHistory((historyData ?? []) as HistoryRow[]);
      }

      setLoading(false);
    }

    void load();
  }, [selectedSubmissionId, supabase]);

  const selectedSubmission = selectedSubmissionId ? submissions[0] ?? null : null;

  return (
    <div className="glass-page mx-auto min-w-0 max-w-6xl space-y-5 pb-16 sm:space-y-6 sm:pb-20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold leading-tight text-white sm:text-3xl">
            {selectedSubmissionId ? (selectedSubmission ? `${selectedSubmission.name} timeline` : "App timeline") : "Submission status"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base sm:leading-7">
            {selectedSubmissionId
              ? "Follow the automatic scan, validation and publishing history for this app."
              : "Follow automatic scans, changelogs, security information and publishing decisions for your apps."}
          </p>
        </div>
        <Link
          href={selectedSubmissionId ? `/dashboard/apps/${selectedSubmissionId}` : "/dashboard"}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-center text-sm font-medium text-slate-200 transition hover:bg-slate-800 sm:w-auto"
        >
          {selectedSubmissionId ? "Back to app details" : "Back to Developer Dashboard"}
        </Link>
      </div>

      {loading && <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center text-sm text-slate-400 sm:p-10 sm:text-base">Loading submission history…</div>}
      {error && <div className="rounded-2xl border border-amber-800/50 bg-amber-950/30 px-4 py-4 text-sm leading-6 text-amber-200 sm:px-5">{error}</div>}
      {!loading && submissions.length === 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center text-sm text-slate-400 sm:p-10 sm:text-base">
          {selectedSubmissionId ? "This app submission was not found or you do not have access to it." : "You have not submitted an app yet."}
        </div>
      )}

      <div className="space-y-5">
        {submissions.map((submission) => {
          const events = history.filter((entry) => entry.submission_id === submission.id);
          return (
            <section key={submission.id} className="min-w-0 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-sm shadow-black/20">
              <div className="min-w-0 border-b border-slate-800 p-4 sm:p-6">
                <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <h2 className="min-w-0 break-words text-lg font-bold leading-tight text-white sm:text-xl">{submission.name}</h2>
                      <span className={`shrink-0 rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider sm:text-xs ${statusColors[submission.status]}`}>
                        {submission.status}
                      </span>
                    </div>
                    {submission.category && (
                      <p className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-500">{submission.category}</p>
                    )}
                  </div>

                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                    <Link
                      href={`/dashboard/apps/${submission.id}`}
                      className="inline-flex min-h-11 w-full shrink-0 items-center justify-center whitespace-nowrap rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500 sm:w-auto"
                    >
                      Open app details
                    </Link>
                    {submission.link && (
                      <a
                        href={submission.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-11 w-full shrink-0 items-center justify-center whitespace-nowrap rounded-xl border border-slate-700 bg-slate-950/50 px-4 py-2.5 text-sm font-medium text-indigo-300 transition hover:border-indigo-500/40 hover:bg-slate-800 sm:w-auto"
                      >
                        Repository
                      </a>
                    )}
                  </div>
                </div>

                <p className="mt-4 break-words text-sm leading-6 text-slate-400 sm:leading-7">{submission.description}</p>
                <div className="mt-4 rounded-xl bg-slate-950/50 px-3 py-2.5 text-xs leading-5 text-slate-500 sm:inline-flex sm:px-4">
                  Last status update: {formatDate(submission.status_updated_at)}
                </div>
              </div>

              {submission.status === "In Review" && (\n                <div className="mx-4 mt-4 rounded-xl border border-amber-700/50 bg-amber-950/30 p-4 sm:mx-6 sm:mt-6">\n                  <p className="text-[11px] font-bold uppercase tracking-wider text-amber-300 sm:text-xs">Security warning · review required</p>\n                  <p className="mt-2 text-sm leading-6 text-slate-300">VirusTotal reported suspicious detections. Automatic publishing is paused until the warning has been reviewed.</p>\n                </div>\n              )}\n\n              {submission.status === "Changes Requested" && (
                <div className="mx-4 mt-4 rounded-xl border border-orange-800/40 bg-orange-950/30 p-4 sm:mx-6 sm:mt-6">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-orange-300 sm:text-xs">Changes requested</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">This is a legacy status. Open app details to inspect the existing feedback and prepare a new submission.</p>
                </div>
              )}

              {submission.changelog && (
                <div className="mx-4 mt-4 rounded-xl border border-blue-800/40 bg-blue-950/30 p-4 sm:mx-6 sm:mt-6">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-blue-300 sm:text-xs">Update changelog</p>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-300">{submission.changelog}</p>
                </div>
              )}

              {submission.review_message && (
                <div className="mx-4 mt-4 rounded-xl border border-indigo-800/40 bg-indigo-950/30 p-4 sm:mx-6 sm:mt-6">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-300 sm:text-xs">Latest status message</p>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-300">{submission.review_message}</p>
                </div>
              )}

              <div className="p-4 sm:p-6">
                <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-300 sm:mb-5 sm:text-sm">Timeline</h3>
                <div>
                  {events.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-slate-800 bg-slate-950/30 px-4 py-4 text-sm text-slate-500">No timeline entries are available yet.</p>
                  ) : (
                    events.map((event, index) => (
                      <div key={event.id} className="relative grid min-w-0 grid-cols-[18px_minmax(0,1fr)] gap-3 pb-6 last:pb-0 sm:grid-cols-[20px_minmax(0,1fr)] sm:gap-4">
                        {index < events.length - 1 && <div className="absolute bottom-0 left-[8px] top-4 w-px bg-slate-700 sm:left-[9px]" />}
                        <div className="relative z-10 mt-1 h-[18px] w-[18px] rounded-full border-2 border-indigo-400 bg-slate-900 sm:h-5 sm:w-5" />
                        <div className="min-w-0 rounded-xl bg-slate-950/35 px-3 py-3 sm:px-4">
                          <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
                            <p className="text-sm font-semibold text-white sm:text-base">{event.status}</p>
                            <span className="break-words text-xs leading-5 text-slate-500">{formatDate(event.created_at)}</span>
                          </div>
                          {event.review_message && <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-400">{event.review_message}</p>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
