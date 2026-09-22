"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

type StoreApp = {
  id: string;
  name: string | null;
  description: string | null;
  developer_name: string | null;
  developer_id: string | null;
  category_id: string | null;
  icon_url: string | null;
  version: string | null;
  created_at: string | null;
  updated_at: string | null;
  luma_submission_id: string | null;
  package_name: string | null;
  version_code: number | string | null;
  subcategory: string | null;
  license_type: string | null;
  short_description: string | null;
  screenshots: JsonValue;
  changelog: string | null;
  repo_url: string | null;
  ant_features: JsonValue;
  author_name: string | null;
  author_email: string | null;
  author_website: string | null;
  website_url: string | null;
  source_code_url: string | null;
  issue_tracker_url: string | null;
  translation_url: string | null;
  changelog_url: string | null;
  donate_url: string | null;
  liberapay: string | null;
  opencollective: string | null;
  bitcoin: string | null;
  litecoin: string | null;
  categories: string[];
  localized_metadata: JsonValue;
};

type StoreAppPlatform = {
  id: string;
  app_id: string;
  platform: string;
  linux_package_base: string | null;
  download_url: string | null;
  file_size_mb: number | null;
};

function formatDate(value: string | null) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function stringArray(value: JsonValue): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function hasJsonValue(value: JsonValue) {
  if (value === null) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
}

function Field({ label, value, mono = false }: { label: string; value: string | number | null | undefined; mono?: boolean }) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/45 p-3">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className={`mt-1 break-words text-sm text-slate-200 ${mono ? "font-mono text-xs" : ""}`}>{String(value)}</dd>
    </div>
  );
}

function LinkChip({ href, label }: { href: string | null; label: string }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center rounded-lg border border-indigo-400/20 bg-indigo-500/10 px-3 py-2 text-xs font-medium text-indigo-200 transition hover:bg-indigo-500/20 hover:text-white"
    >
      {label} ↗
    </a>
  );
}

export default function DiscoverAppPage() {
  const params = useParams<{ id: string }>();
  const supabase = useMemo(() => createClient(), []);
  const [app, setApp] = useState<StoreApp | null>(null);
  const [platforms, setPlatforms] = useState<StoreAppPlatform[]>([]);
  const [downloadCount, setDownloadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadApp() {
      setLoading(true);
      setError(null);

      const [appResult, platformsResult] = await Promise.all([
        supabase
          .from("store_apps")
          .select("*")
          .or(`package_name.eq.${params.id},id.eq.${params.id}`)
          .single(),
        Promise.resolve({ data: [], error: null }),
      ]);

      if (cancelled) return;

      if (appResult.error) {
        setError(appResult.error.message);
        setApp(null);
        setPlatforms([]);
      } else {
        const loadedApp = appResult.data as StoreApp;
        setApp(loadedApp);
        const platformResult = await supabase.from("store_app_platforms").select("id,app_id,platform,linux_package_base,download_url,file_size_mb").eq("app_id", loadedApp.id).order("platform", { ascending: true });
        if (!cancelled) setPlatforms((platformResult.data ?? []) as StoreAppPlatform[]);
        const { count } = await supabase.from("luma_download_events").select("id", { count: "exact", head: true }).eq("app_id", loadedApp.id);
        if (!cancelled) setDownloadCount(Number(count ?? 0));
      }

      setLoading(false);
    }

    void loadApp();
    return () => {
      cancelled = true;
    };
  }, [params.id, supabase]);

  if (loading) {
    return <div className="glass-page mx-auto h-96 max-w-6xl animate-pulse rounded-3xl border border-slate-800 bg-slate-900/60" />;
  }

  if (error || !app) {
    return (
      <div className="glass-page mx-auto max-w-3xl rounded-2xl border border-rose-500/25 bg-rose-950/20 p-6">
        <h1 className="text-xl font-semibold text-rose-200">App not found</h1>
        <p className="mt-2 text-sm text-rose-100/70">{error || "This app could not be loaded."}</p>
        <Link href="/discover" className="mt-4 inline-flex text-sm font-medium text-indigo-300 hover:text-indigo-200">← Back to Discover</Link>
      </div>
    );
  }

  const screenshots = stringArray(app.screenshots);
  const antiFeatures = stringArray(app.ant_features);
  const name = app.name || app.package_name || "Untitled app";
  const downloadablePlatforms = platforms.filter((platform) => Boolean(platform.download_url));

  return (
    <div className="glass-page mx-auto max-w-6xl space-y-6">
      <Link href="/discover" className="inline-flex text-sm font-medium text-indigo-300 transition hover:text-indigo-200">← Back to Discover</Link>

      <section className="rounded-3xl border border-indigo-400/15 bg-gradient-to-br from-indigo-500/15 via-slate-900 to-violet-500/10 p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            {app.icon_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={app.icon_url} alt={`${name} icon`} className="h-24 w-24 rounded-3xl border border-slate-700 bg-slate-950 object-cover" />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-3xl border border-slate-700 bg-slate-950 text-3xl font-bold text-indigo-200">
                {name.slice(0, 1).toUpperCase()}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">{name}</h1>
                <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-200">Open source</span>
              </div>
              {app.developer_id ? <Link href={`/discover/developers/${encodeURIComponent(app.developer_name || app.developer_id)}`} className="mt-2 inline-flex text-sm text-indigo-300 hover:text-indigo-200">{app.developer_name || app.author_name || "Unknown developer"} →</Link> : <p className="mt-2 text-sm text-slate-400">{app.developer_name || app.author_name || "Unknown developer"}</p>}
              {app.short_description && <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">{app.short_description}</p>}
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950/50 px-3 py-1.5 text-sm text-slate-300"><span aria-hidden="true">↓</span><span>{downloadCount.toLocaleString()} downloads</span></div>

              <div className="mt-5 flex flex-wrap gap-2">
                {app.categories?.map((category) => (
                  <span key={category} className="rounded-full border border-indigo-400/20 bg-indigo-500/10 px-2.5 py-1 text-xs text-indigo-200">{category}</span>
                ))}
                {app.subcategory && <span className="rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-300">{app.subcategory}</span>}
              </div>
            </div>
          </div>

          <div className="flex w-full shrink-0 flex-col gap-2 lg:w-auto lg:min-w-56">
            {downloadablePlatforms.length > 0 ? (
              downloadablePlatforms.map((platform) => (
                <a
                  key={platform.id}
                  href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/download-app?package_name=${encodeURIComponent(app.package_name || "")}&platform=${encodeURIComponent(platform.platform)}`}
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-indigo-500 px-5 py-3 text-center text-sm font-bold text-white shadow-lg shadow-indigo-950/30 transition hover:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-300/60"
                >
                  Download {platform.platform}
                  {platform.platform.toLowerCase() === "linux" && platform.linux_package_base ? ` · ${platform.linux_package_base}` : ""}
                  {platform.file_size_mb !== null ? ` · ${platform.file_size_mb.toFixed(2)} MB` : ""}
                </a>
              ))
            ) : (
              <div className="rounded-xl border border-slate-700 bg-slate-950/50 px-4 py-3 text-center text-sm text-slate-500">
                No download available
              </div>
            )}
          </div>
        </div>
      </section>

      {app.description && (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-xl font-semibold text-white">Description</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-300">{app.description}</p>
        </section>
      )}

      {screenshots.length > 0 && (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-xl font-semibold text-white">Screenshots</h2>
          <div className="mt-4 flex gap-4 overflow-x-auto pb-2">
            {screenshots.map((url, index) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={`${url}-${index}`} src={url} alt={`${name} screenshot ${index + 1}`} className="h-96 w-auto shrink-0 rounded-2xl border border-slate-800 bg-slate-950 object-contain" />
            ))}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="text-xl font-semibold text-white">App details</h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Package name" value={app.package_name} mono />
          <Field label="Version" value={app.version} />
          <Field label="Version code" value={app.version_code} />
          <Field label="License" value={app.license_type} />
          <Field label="Developer" value={app.developer_name} />
          <Field label="Developer ID" value={app.developer_id} mono />
          <Field label="Author" value={app.author_name} />
          <Field label="Author email" value={app.author_email} />
          <Field label="Category ID" value={app.category_id} mono />
          <Field label="Submission ID" value={app.luma_submission_id} mono />
          <Field label="Created" value={formatDate(app.created_at)} />
          <Field label="Updated" value={formatDate(app.updated_at)} />
        </dl>
      </section>

      {(app.repo_url || app.website_url || app.source_code_url || app.issue_tracker_url || app.translation_url || app.changelog_url || app.author_website) && (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-xl font-semibold text-white">Links</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            <LinkChip href={app.website_url} label="Website" />
            <LinkChip href={app.author_website} label="Author website" />
            <LinkChip href={app.repo_url} label="Repository" />
            <LinkChip href={app.source_code_url} label="Source code" />
            <LinkChip href={app.issue_tracker_url} label="Issue tracker" />
            <LinkChip href={app.translation_url} label="Translations" />
            <LinkChip href={app.changelog_url} label="Changelog" />
          </div>
        </section>
      )}

      {app.changelog && (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-xl font-semibold text-white">Changelog</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-300">{app.changelog}</p>
        </section>
      )}

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="text-xl font-semibold text-white">Anti-features</h2>
        {antiFeatures.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {antiFeatures.map((item) => <span key={item} className="rounded-full bg-amber-500/10 px-3 py-1 text-xs text-amber-200">{item}</span>)}
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500">No anti-features listed.</p>
        )}
      </section>

      {(app.donate_url || app.liberapay || app.opencollective || app.bitcoin || app.litecoin) && (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-xl font-semibold text-white">Support the developer</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            <LinkChip href={app.donate_url} label="Donate" />
            <LinkChip href={app.liberapay} label="Liberapay" />
            <LinkChip href={app.opencollective} label="OpenCollective" />
          </div>
          {(app.bitcoin || app.litecoin) && (
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field label="Bitcoin" value={app.bitcoin} mono />
              <Field label="Litecoin" value={app.litecoin} mono />
            </dl>
          )}
        </section>
      )}

      {hasJsonValue(app.localized_metadata) && (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-xl font-semibold text-white">Localized metadata</h2>
          <pre className="mt-4 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-xs leading-6 text-slate-300">{JSON.stringify(app.localized_metadata, null, 2)}</pre>
        </section>
      )}
    </div>
  );
}
