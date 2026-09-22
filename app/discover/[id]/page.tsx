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
};

type RelatedApp = { id:string; name:string|null; package_name:string|null; short_description:string|null; icon_url:string|null; version:string|null; };
type PlatformDownloadCount = { platform:string; downloads:number|string; };
type VersionHistoryItem = { version:string|null; version_code:number|string|null; changelog:string|null; published_at:string|null; };

type DeveloperFunding = { donate_url: string | null; liberapay: string | null; opencollective: string | null; bitcoin: string | null; litecoin: string | null; };

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
      {androidQrUrl&&<div role="presentation" onMouseDown={(event)=>{if(event.target===event.currentTarget)setAndroidQrUrl(null)}} className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md"><div role="dialog" aria-modal="true" aria-labelledby="android-download-title" className="glass-panel relative w-full max-w-sm p-6 text-center shadow-2xl"><button type="button" onClick={()=>setAndroidQrUrl(null)} aria-label="Close" className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-lg text-slate-300 hover:bg-white/10 hover:text-white">×</button><p className="text-xs font-semibold uppercase tracking-[.16em] text-indigo-300">Android download</p><h2 id="android-download-title" className="mt-2 text-2xl font-bold text-white">Install on Android</h2><p className="mt-2 text-sm leading-6 text-slate-400">Scan this QR code with your Android device. The download will start through Luma Store.</p><div className="mx-auto mt-5 w-fit rounded-3xl bg-white p-3 shadow-xl"><img src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(androidQrUrl)}`} alt={`QR code to download ${name} for Android`} width={240} height={240} className="h-52 w-52 sm:h-56 sm:w-56"/></div><a href={androidQrUrl} className="mt-5 inline-flex text-xs text-slate-500 hover:text-indigo-300">Download on this device instead</a></div></div>}
    </div>
  );
}
function fundingHref(value: string | null, provider: "liberapay" | "opencollective") { if (!value) return null; if (/^https?:\/\//i.test(value)) return value; return provider === "liberapay" ? `https://liberapay.com/${value.replace(/^@/, "")}/` : `https://opencollective.com/${value.replace(/^@/, "")}`; }

function LinkChip({ href, label, onClick }: { href: string | null; label: string; onClick?:()=>void }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={onClick}
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
  const [funding, setFunding] = useState<DeveloperFunding | null>(null);
  const [downloadCount, setDownloadCount] = useState(0);
  const [platformDownloadCounts, setPlatformDownloadCounts] = useState<PlatformDownloadCount[]>([]);
  const [relatedDeveloperApps, setRelatedDeveloperApps] = useState<RelatedApp[]>([]);
  const [similarApps, setSimilarApps] = useState<RelatedApp[]>([]);
  const [versionHistory, setVersionHistory] = useState<VersionHistoryItem[]>([]);
  const [ratingAverage, setRatingAverage] = useState(0);
  const [ratingCount, setRatingCount] = useState(0);
  const [pageUrl, setPageUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [androidQrUrl, setAndroidQrUrl] = useState<string | null>(null);
  const ratingApi = "https://api.free-time.me/lumastore";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {\n    setPageUrl(window.location.href);\n    window.scrollTo({ top: 0, left: 0, behavior: "auto" });\n    requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }));\n  }, [params.id]);

  async function shareApp() { if (!pageUrl || !app) return; const data={title:app.name || "Luma Store app",text:app.short_description || "View this app on Luma Store",url:pageUrl}; if(navigator.share){try{await navigator.share(data);return}catch(error){if(error instanceof DOMException&&error.name==="AbortError")return}} await navigator.clipboard.writeText(pageUrl);setCopied(true);window.setTimeout(()=>setCopied(false),1800); }
  function trackFunding(provider:"donate"|"liberapay"|"opencollective"|"bitcoin"|"litecoin"){if(!app?.developer_id)return;void supabase.from("luma_funding_clicks").insert({developer_id:app.developer_id,app_id:app.id,provider});}
  async function copyAppLink(){if(!pageUrl)return;await navigator.clipboard.writeText(pageUrl);setCopied(true);window.setTimeout(()=>setCopied(false),1800);}\n  function handleDownload(event: React.MouseEvent<HTMLAnchorElement>, platform: StoreAppPlatform, downloadUrl: string){if(platform.platform.toLowerCase()!=="android")return;const isDesktop=window.matchMedia("(hover: hover) and (pointer: fine)").matches;if(!isDesktop)return;event.preventDefault();setAndroidQrUrl(downloadUrl);}\n  useEffect(()=>{if(!androidQrUrl)return;const close=(event:KeyboardEvent)=>{if(event.key==="Escape")setAndroidQrUrl(null)};window.addEventListener("keydown",close);return()=>window.removeEventListener("keydown",close)},[androidQrUrl]);

  useEffect(() => {
    let cancelled = false;

    async function loadApp() {
      setLoading(true);
      setError(null);

      const identifier = decodeURIComponent(params.id);
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identifier);
      const appResult = await supabase
        .from("store_apps")
        .select("*")
        .is("archived_at", null).eq(isUuid ? "id" : "package_name", identifier)
        .single();

      if (cancelled) return;

      if (appResult.error) {
        setError(appResult.error.message);
        setApp(null);
        setPlatforms([]);
      } else {
        const loadedApp = appResult.data as StoreApp;
        setApp(loadedApp);
        if (loadedApp.developer_id) {
          const fundingResult = await supabase.from("luma_developer_funding").select("donate_url,liberapay,opencollective,bitcoin,litecoin").eq("developer_id", loadedApp.developer_id).maybeSingle();
          if (!cancelled) setFunding((fundingResult.data as DeveloperFunding | null) ?? null);
        } else if (!cancelled) setFunding(null);
        const platformResult = await supabase.from("store_app_platforms").select("id,app_id,platform,linux_package_base,download_url,file_size_mb").eq("app_id", loadedApp.id).order("platform", { ascending: true });
        if (!cancelled) setPlatforms((platformResult.data ?? []) as StoreAppPlatform[]);
        const { data: totalDownloads } = await supabase.rpc("luma_app_download_count", { target_app_id: loadedApp.id });
        if (!cancelled) setDownloadCount(Number(totalDownloads ?? 0));
        const { data: platformCounts } = await supabase.rpc("luma_app_platform_download_counts", { target_app_id: loadedApp.id });
        if (!cancelled) setPlatformDownloadCounts((platformCounts ?? []) as PlatformDownloadCount[]);
        if (loadedApp.developer_id) {
          const related = await supabase.from("store_apps").select("id,name,package_name,short_description,icon_url,version").eq("developer_id", loadedApp.developer_id).is("archived_at", null).neq("id", loadedApp.id).order("updated_at",{ascending:false}).limit(3);
          if (!cancelled) setRelatedDeveloperApps((related.data ?? []) as RelatedApp[]);
        }
        if (loadedApp.package_name) { const {data:versions}=await supabase.rpc("luma_public_version_history",{target_package_name:loadedApp.package_name}); if(!cancelled)setVersionHistory((versions??[]) as VersionHistoryItem[]); }
        const appCategories=Array.isArray(loadedApp.categories)?loadedApp.categories:[];
        if(appCategories.length){const similar=await supabase.from("store_apps").select("id,name,package_name,short_description,icon_url,version,categories").is("archived_at",null).neq("id",loadedApp.id).overlaps("categories",appCategories).limit(6);if(!cancelled)setSimilarApps(((similar.data??[]) as (RelatedApp & {categories?:string[]})[]).sort((a,b)=>((b.categories||[]).filter(x=>appCategories.includes(x)).length)-((a.categories||[]).filter(x=>appCategories.includes(x)).length)).slice(0,3));}
        const ratingResponse = await fetch(`${ratingApi}/apps/${encodeURIComponent(loadedApp.package_name || loadedApp.id)}/ratings`);
        if (ratingResponse.ok) {
          const summary = await ratingResponse.json();
          if (!cancelled) {
            setRatingCount(Number(summary.count || 0));
            setRatingAverage(Number(summary.average || 0));
          }
        }
      }

      setLoading(false);
    }

    void loadApp();
    return () => {
      cancelled = true;
    };
  }, [params.id, supabase]);

  if (loading) {
    return <div className="glass-page mx-auto max-w-6xl space-y-5 px-3 pb-20 sm:px-4"><div className="h-5 w-32 animate-pulse rounded bg-slate-800/70"/><div className="rounded-[2rem] border border-white/10 bg-slate-900/50 p-5 backdrop-blur-2xl sm:p-8"><div className="flex gap-5"><div className="h-24 w-24 animate-pulse rounded-3xl bg-slate-800/80"/><div className="flex-1 space-y-3 py-2"><div className="h-8 max-w-sm animate-pulse rounded bg-slate-800/80"/><div className="h-4 max-w-xs animate-pulse rounded bg-slate-800/60"/><div className="h-14 max-w-xl animate-pulse rounded-xl bg-slate-800/40"/></div></div></div><div className="h-44 animate-pulse rounded-3xl border border-white/10 bg-slate-900/40"/></div>;
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
    <div className="glass-page mx-auto max-w-6xl space-y-5 px-3 pb-20 sm:space-y-6 sm:px-4">
      <Link href="/discover" className="inline-flex text-sm font-medium text-indigo-300 transition hover:text-indigo-200">← Back to Discover</Link>

      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900/55 p-5 shadow-2xl shadow-black/20 backdrop-blur-2xl sm:p-8">
        <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-indigo-500/15 blur-3xl"/><div aria-hidden="true" className="pointer-events-none absolute -bottom-24 left-1/3 h-52 w-52 rounded-full bg-violet-500/10 blur-3xl"/><div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
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
              <div className="mt-4 flex flex-wrap items-center gap-2"><div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950/50 px-3 py-1.5 text-sm text-slate-300"><span aria-hidden="true">↓</span><span>{downloadCount.toLocaleString()} downloads</span></div><div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950/50 px-3 py-1.5 text-sm text-slate-300"><span className="text-amber-300">★</span><span>{ratingCount ? ratingAverage.toFixed(1) : "No ratings"}{ratingCount ? ` · ${ratingCount}` : ""}</span></div></div>

              <div className="mt-3 flex flex-wrap gap-2">{platforms.map((platform)=><span key={platform.id} className="rounded-full border border-slate-700 bg-slate-950/40 px-2.5 py-1 text-xs text-slate-300">{platform.platform}{platform.platform.toLowerCase()==="linux"&&platform.linux_package_base?` · ${platform.linux_package_base}`:""}</span>)}</div>
              {platformDownloadCounts.length>0&&<div className="mt-3 flex flex-wrap gap-2">{platformDownloadCounts.map((item)=><span key={item.platform} className="rounded-full border border-indigo-400/20 bg-indigo-500/10 px-2.5 py-1 text-xs text-indigo-200">{item.platform}: {Number(item.downloads).toLocaleString()} downloads</span>)}</div>}

              <div className="mt-5 flex flex-wrap gap-2">
                {app.categories?.map((category) => (
                  <span key={category} className="rounded-full border border-indigo-400/20 bg-indigo-500/10 px-2.5 py-1 text-xs text-indigo-200">{category}</span>
                ))}
                {app.subcategory && <span className="rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-300">{app.subcategory}</span>}
              </div>
            </div>
          </div>

          <div className="flex w-full shrink-0 flex-col gap-2 rounded-2xl border border-white/10 bg-slate-950/25 p-3 backdrop-blur-xl lg:w-72">
            <div className="grid grid-cols-2 gap-2"><button type="button" onClick={shareApp} className="rounded-xl border border-slate-700 bg-slate-950/50 px-3 py-2.5 text-sm font-medium text-slate-200 transition hover:border-indigo-400/40 hover:text-white">Share</button><button type="button" onClick={copyAppLink} className="rounded-xl border border-slate-700 bg-slate-950/50 px-3 py-2.5 text-sm font-medium text-slate-200 transition hover:border-indigo-400/40 hover:text-white">{copied?"Copied!":"Copy link"}</button></div>
            {downloadablePlatforms.length > 0 ? (
              downloadablePlatforms.map((platform) => (
                <a
                  key={platform.id}
                  href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/download-app?${app.package_name ? `package_name=${encodeURIComponent(app.package_name)}` : `app_id=${encodeURIComponent(app.id)}`}&platform=${encodeURIComponent(platform.platform)}`}\n                  onClick={(event)=>handleDownload(event,platform,`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/download-app?${app.package_name ? `package_name=${encodeURIComponent(app.package_name)}` : `app_id=${encodeURIComponent(app.id)}`}&platform=${encodeURIComponent(platform.platform)}`)}
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
        <section className="rounded-3xl border border-white/10 bg-slate-900/50 p-5 shadow-lg shadow-black/10 backdrop-blur-xl sm:p-6">
          <h2 className="text-xl font-semibold text-white">Description</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-300">{app.description}</p>
        </section>
      )}

      {screenshots.length > 0 && (
        <section className="rounded-3xl border border-white/10 bg-slate-900/50 p-5 shadow-lg shadow-black/10 backdrop-blur-xl sm:p-6">
          <h2 className="text-xl font-semibold text-white">Screenshots</h2>
          <div className="mt-4 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3">
            {screenshots.map((url, index) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={`${url}-${index}`} src={url} alt={`${name} screenshot ${index + 1}`} className="h-72 w-auto max-w-[85vw] shrink-0 snap-center rounded-2xl border border-white/10 bg-slate-950 object-contain shadow-lg sm:h-96" />
            ))}
          </div>
        </section>
      )}

      <section className="rounded-3xl border border-white/10 bg-slate-900/50 p-5 shadow-lg shadow-black/10 backdrop-blur-xl sm:p-6">
        <h2 className="text-xl font-semibold text-white">App details</h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Package name" value={app.package_name} mono />
          <Field label="Version" value={app.version} />
          <Field label="Version code" value={app.version_code} />
          <Field label="License" value={app.license_type} />
          <Field label="Developer" value={app.developer_name} />
          <Field label="Author" value={app.author_name} />
          <Field label="Author email" value={app.author_email} />
          <Field label="Created" value={formatDate(app.created_at)} />
          <Field label="Updated" value={formatDate(app.updated_at)} />
        </dl>
      </section>

      {(app.website_url || app.source_code_url || app.issue_tracker_url || app.translation_url || app.changelog_url || app.author_website || app.license_type) && (
        <section className="rounded-3xl border border-emerald-400/15 bg-emerald-500/5 p-5 shadow-lg shadow-black/10 backdrop-blur-xl sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">Open source</p><h2 className="mt-1 text-xl font-semibold text-white">Project & repository</h2></div>{app.license_type&&<span className="rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-200">{app.license_type}</span>}</div>
          <div className="mt-4 flex flex-wrap gap-2">
            <LinkChip href={app.website_url} label="Website" />
            <LinkChip href={app.author_website} label="Author website" />
            <LinkChip href={app.source_code_url} label="Source code" />
            <LinkChip href={app.issue_tracker_url} label="Issue tracker" />
            <LinkChip href={app.translation_url} label="Translations" />
            <LinkChip href={app.changelog_url} label="Changelog" />
          </div>
        </section>
      )}

      {versionHistory.length>0&&<section className="rounded-3xl border border-white/10 bg-slate-900/50 p-5 shadow-lg shadow-black/10 backdrop-blur-xl sm:p-6"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Releases</p><h2 className="mt-1 text-xl font-semibold text-white">Version history</h2></div><div className="mt-4 space-y-3">{versionHistory.map((item,index)=><div key={`${item.version}-${item.version_code}-${index}`} className="rounded-2xl border border-white/10 bg-slate-950/30 p-4 backdrop-blur-lg"><div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><span className="font-semibold text-white">{item.version?`v${item.version}`:"Version"}</span>{index===0&&<span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[11px] text-indigo-200">Latest</span>}{item.version_code!==null&&<span className="text-xs text-slate-500">#{item.version_code}</span>}</div><span className="text-xs text-slate-500">{formatDate(item.published_at)}</span></div>{item.changelog&&<p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-400">{item.changelog}</p>}</div>)}</div></section>}

      {app.changelog && (
        <section className="rounded-3xl border border-white/10 bg-slate-900/50 p-5 shadow-lg shadow-black/10 backdrop-blur-xl sm:p-6">
          <h2 className="text-xl font-semibold text-white">Changelog</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-300">{app.changelog}</p>
        </section>
      )}

      <section className="rounded-3xl border border-white/10 bg-slate-900/50 p-5 shadow-lg shadow-black/10 backdrop-blur-xl sm:p-6">
        <h2 className="text-xl font-semibold text-white">Anti-features</h2>
        {antiFeatures.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {antiFeatures.map((item) => <span key={item} className="rounded-full bg-amber-500/10 px-3 py-1 text-xs text-amber-200">{item}</span>)}
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500">No anti-features listed.</p>
        )}
      </section>

      {pageUrl&&platforms.some(p=>p.platform.toLowerCase()==="android")&&<section className="rounded-3xl border border-indigo-400/15 bg-indigo-500/5 p-5 shadow-lg shadow-black/10 backdrop-blur-xl sm:p-6"><div className="grid gap-6 sm:grid-cols-[1fr_auto] sm:items-center"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-300">Continue on Android</p><h2 className="mt-1 text-xl font-semibold text-white">Open this app on your phone</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Scan the QR code to open this Luma Store app page on Android. Downloads still go through Luma Store, so the download counter stays accurate.</p></div><div className="mx-auto rounded-3xl bg-white p-3 shadow-xl shadow-black/20 sm:mx-0"><img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(pageUrl)}`} alt={`QR code for ${name}`} width={180} height={180} className="h-40 w-40 sm:h-44 sm:w-44"/></div></div></section>}

      {similarApps.length>0&&<section className="rounded-3xl border border-white/10 bg-slate-900/50 p-5 shadow-lg shadow-black/10 backdrop-blur-xl sm:p-6"><h2 className="text-xl font-semibold text-white">Similar apps</h2><p className="mt-1 text-sm text-slate-500">Apps with matching categories.</p><div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{similarApps.map((item)=>{const itemName=item.name||item.package_name||"Untitled app";return <Link key={item.id} href={`/discover/${encodeURIComponent(item.package_name||item.id)}`} className="rounded-2xl border border-white/10 bg-slate-950/30 p-4 backdrop-blur-lg transition duration-300 hover:-translate-y-0.5 hover:border-indigo-400/40 hover:bg-slate-900/60"><div className="flex items-center gap-3">{item.icon_url?<img src={item.icon_url} alt="" className="h-12 w-12 rounded-xl border border-slate-700 object-cover"/>:<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 font-bold">{itemName[0]}</div>}<div className="min-w-0"><h3 className="truncate font-semibold text-white">{itemName}</h3><p className="text-xs text-slate-500">{item.version?`Version ${item.version}`:"View app"}</p></div></div>{item.short_description&&<p className="mt-3 line-clamp-2 text-sm text-slate-400">{item.short_description}</p>}</Link>})}</div></section>}

      {relatedDeveloperApps.length>0&&<section className="rounded-3xl border border-white/10 bg-slate-900/50 p-5 shadow-lg shadow-black/10 backdrop-blur-xl sm:p-6"><h2 className="text-xl font-semibold text-white">More from {app.developer_name || "this developer"}</h2><div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{relatedDeveloperApps.map((item)=>{const itemName=item.name||item.package_name||"Untitled app";return <Link key={item.id} href={`/discover/${encodeURIComponent(item.package_name||item.id)}`} className="rounded-2xl border border-white/10 bg-slate-950/30 p-4 backdrop-blur-lg transition duration-300 hover:-translate-y-0.5 hover:border-indigo-400/40 hover:bg-slate-900/60"><div className="flex items-center gap-3">{item.icon_url?<img src={item.icon_url} alt="" className="h-12 w-12 rounded-xl border border-slate-700 object-cover"/>:<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 font-bold">{itemName[0]}</div>}<div className="min-w-0"><h3 className="truncate font-semibold text-white">{itemName}</h3><p className="text-xs text-slate-500">{item.version?`Version ${item.version}`:"View app"}</p></div></div>{item.short_description&&<p className="mt-3 line-clamp-2 text-sm text-slate-400">{item.short_description}</p>}</Link>})}</div></section>}

      {funding && (funding.donate_url || funding.liberapay || funding.opencollective || funding.bitcoin || funding.litecoin) && (
        <section className="rounded-3xl border border-white/10 bg-slate-900/50 p-5 shadow-lg shadow-black/10 backdrop-blur-xl sm:p-6">
          <h2 className="text-xl font-semibold text-white">Support the developer</h2>
          <p className="mt-1 text-sm text-slate-400">These funding methods belong to {app.developer_name || "this developer"} and apply to all of their apps.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <LinkChip href={funding.donate_url} label="Donate" onClick={()=>trackFunding("donate")} />
            <LinkChip href={fundingHref(funding.liberapay, "liberapay")} label="Liberapay" onClick={()=>trackFunding("liberapay")} />
            <LinkChip href={fundingHref(funding.opencollective, "opencollective")} label="OpenCollective" onClick={()=>trackFunding("opencollective")} />
          </div>
          {(funding.bitcoin || funding.litecoin) && <dl className="mt-4 grid gap-3 sm:grid-cols-2"><Field label="Bitcoin" value={funding.bitcoin} mono /><Field label="Litecoin" value={funding.litecoin} mono /></dl>}
        </section>
      )}

    </div>
  );
}
