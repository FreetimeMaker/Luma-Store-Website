"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type SecurityScan = {
  id: string;
  status: "Not Scanned" | "Queued" | "Scanning" | "Passed" | "Warnings" | "Failed";
  risk_level: "Unknown" | "Low" | "Medium" | "High" | "Critical";
  findings: unknown;
  permissions: unknown;
  scanned_at: string | null;
  created_at: string;
  provider?: string | null;
  virus_total_permalink?: string | null;
  malicious_count?: number | null;
  suspicious_count?: number | null;
  harmless_count?: number | null;
  undetected_count?: number | null;
  error_message?: string | null;
};

const scanColors: Record<string, string> = {
  Passed: "border-emerald-700/50 bg-emerald-950/30 text-emerald-300",
  Warnings: "border-amber-700/50 bg-amber-950/30 text-amber-300",
  Failed: "border-red-700/50 bg-red-950/30 text-red-300",
  Scanning: "border-blue-700/50 bg-blue-950/30 text-blue-300",
  Queued: "border-indigo-700/50 bg-indigo-950/30 text-indigo-300",
  Error: "border-red-700/50 bg-red-950/30 text-red-300",
  "Not Scanned": "border-slate-700 bg-slate-950/30 text-slate-300",
};

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function objectArray(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    : [];
}

export default function SecurityScanPanel({ submissionId, initialScan }: { submissionId: string; initialScan: SecurityScan | null }) {
  const supabase = useMemo(() => createClient(), []);
  const [scan, setScan] = useState<SecurityScan | null>(initialScan);
  const [error, setError] = useState<string | null>(null);

  async function reloadLatest() {
    const { data, error: loadError } = await supabase
      .from("luma_security_scans")
      .select("id,status,risk_level,findings,permissions,scanned_at,created_at,provider,virus_total_permalink,malicious_count,suspicious_count,harmless_count,undetected_count,error_message")
      .eq("submission_id", submissionId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (loadError) throw loadError;
    setScan((data as SecurityScan | null) ?? null);
  }

  useEffect(() => {
    setScan(initialScan);
    void reloadLatest().catch((err) => setError(err instanceof Error ? err.message : "Could not load security scan."));

    const timer = window.setInterval(() => {
      void reloadLatest().catch((err) => setError(err instanceof Error ? err.message : "Could not refresh security scan."));
    }, 12000);

    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialScan, submissionId]);

  const findings = objectArray(scan?.findings);
  const permissions = stringArray(scan?.permissions);

  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-lg shadow-black/10">
      <div className="border-b border-slate-800 px-4 py-4 sm:px-5">
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-white">Security scan</h2>
            <p className="mt-1 text-xs text-slate-500">VirusTotal scans start automatically after every new submission and update.</p>
          </div>
          {(scan?.status === "Queued" || scan?.status === "Scanning") && (
            <span className="rounded-full border border-blue-700/50 bg-blue-950/30 px-3 py-1 text-xs font-medium text-blue-300">Updating automatically…</span>
          )}
        </div>
      </div>

      <div className="space-y-4 p-4 sm:space-y-5 sm:p-5">
        {error && <div className="rounded-xl border border-red-800/50 bg-red-950/30 p-3 text-sm text-red-200">{error}</div>}
        {scan?.error_message && <div className="rounded-xl border border-red-800/50 bg-red-950/30 p-3 text-sm text-red-200">{scan.error_message}</div>}

        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <span className={`inline-flex min-h-9 items-center justify-center rounded-xl border px-3 py-1.5 text-center text-xs font-semibold sm:min-h-0 sm:rounded-full sm:py-1 ${scanColors[scan?.status || "Not Scanned"]}`}>{scan?.status || "Not Scanned"}</span>
          <span className="inline-flex min-h-9 items-center justify-center rounded-xl border border-slate-700 bg-slate-950/40 px-3 py-1.5 text-center text-xs text-slate-300 sm:min-h-0 sm:rounded-full sm:py-1">Risk: {scan?.risk_level || "Unknown"}</span>
          <span className="col-span-2 inline-flex min-h-9 items-center justify-center rounded-xl border border-slate-700 bg-slate-950/40 px-3 py-1.5 text-center text-xs text-slate-400 sm:col-span-1 sm:min-h-0 sm:rounded-full sm:py-1">Provider: VirusTotal</span>
        </div>

        <p className="text-xs text-slate-500">Scanned: {formatDate(scan?.scanned_at)}</p>

        {scan && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-3"><p className="text-xs text-red-300">Malicious</p><p className="mt-1 text-xl font-bold text-white">{scan.malicious_count ?? 0}</p></div>
            <div className="rounded-xl border border-amber-900/50 bg-amber-950/20 p-3"><p className="text-xs text-amber-300">Suspicious</p><p className="mt-1 text-xl font-bold text-white">{scan.suspicious_count ?? 0}</p></div>
            <div className="rounded-xl border border-emerald-900/50 bg-emerald-950/20 p-3"><p className="text-xs text-emerald-300">Harmless</p><p className="mt-1 text-xl font-bold text-white">{scan.harmless_count ?? 0}</p></div>
            <div className="rounded-xl border border-slate-700 bg-slate-950/30 p-3"><p className="text-xs text-slate-400">Undetected</p><p className="mt-1 text-xl font-bold text-white">{scan.undetected_count ?? 0}</p></div>
          </div>
        )}

        {scan?.virus_total_permalink && (
          <a href={scan.virus_total_permalink} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-indigo-700/50 bg-indigo-950/30 px-4 py-2 text-center text-sm font-medium text-indigo-200 transition hover:bg-indigo-900/40 sm:w-auto">
            Open VirusTotal report
          </a>
        )}

        <div>
          <h3 className="text-sm font-semibold text-slate-200">Findings</h3>
          {findings.length ? (
            <div className="mt-2 space-y-2">
              {findings.map((finding, index) => (
                <div key={index} className="min-w-0 rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-sm text-slate-300">
                  <p className="min-w-0 [overflow-wrap:anywhere] font-medium text-white">{String(finding.engine_name ?? finding.title ?? finding.name ?? `Finding ${index + 1}`)}</p>
                  <p className="mt-1 min-w-0 [overflow-wrap:anywhere] text-slate-400">{[finding.category, finding.result].filter(Boolean).map(String).join(" · ") || String(finding.description ?? "Suspicious or malicious result")}</p>
                </div>
              ))}
            </div>
          ) : <p className="mt-2 text-sm text-slate-500">No malicious or suspicious engine results recorded.</p>}
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-200">Permission analysis</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {permissions.length ? permissions.map((permission) => (
              <span key={permission} className="max-w-full break-all rounded-lg border border-slate-700 bg-slate-950/50 px-2.5 py-1 text-xs text-slate-300">{permission}</span>
            )) : <span className="text-sm text-slate-500">No Android permissions were returned by VirusTotal for this file.</span>}
          </div>
        </div>
      </div>
    </section>
  );
}
