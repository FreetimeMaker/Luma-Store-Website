"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { fetchFastlaneIconUrl } from "@/lib/luma/fastlane";

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
  repo_url: string | null;
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

type DeveloperFunding = { donate_url: string | null; liberapay: string | null; opencollective: string | null; bitcoin: string | null; litecoin: string | null; crypto_addresses: Record<string,string> | null; };

type StoreAppPlatform = {
  id: string;
  app_id: string;
  platform: string;
  package_type: string | null;
  linux_package_base: string | null;
  download_url: string | null;
  file_size_mb: number | null;
  sha256: string | null;
  artifact_verified_at: string | null;
  artifact_size_bytes: number | string | null;
  permissions: JsonValue;
  repo_url: string | null;
  listing_metadata: JsonValue;
};

type PlatformListing = {
  title: string;
  shortDescription: string;
  fullDescription: string;
  changelog: string;
  screenshots: string[];
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

function platformListing(value: JsonValue): PlatformListing | null {
  if (!value || Array.isArray(value) || typeof value !== "object") return null;
  const row = value as Record<string, JsonValue>;
  const screenshots = Array.isArray(row.screenshots)
    ? row.screenshots.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
  const listing = {
    title: typeof row.title === "string" ? row.title : "",
    shortDescription: typeof row.shortDescription === "string" ? row.shortDescription : typeof row.short_description === "string" ? row.short_description : "",
    fullDescription: typeof row.fullDescription === "string" ? row.fullDescription : typeof row.full_description === "string" ? row.full_description : "",
    changelog: typeof row.changelog === "string" ? row.changelog : "",
    screenshots,
  };
  return listing.title || listing.shortDescription || listing.fullDescription || listing.changelog || listing.screenshots.length ? listing : null;
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
function CryptoAddressField({ label, value }: { label: string; value: string }) {
  const compact = value.length > 26 ? `${value.slice(0, 12)}…${value.slice(-10)}` : value;
  return (
    <div className="min-w-0 rounded-xl border border-slate-800 bg-slate-950/45 p-3">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className="mt-2 flex min-w-0 items-center gap-2">
        <span className="min-w-0 flex-1 font-mono text-xs text-slate-200 sm:hidden">{compact}</span>
        <span className="hidden min-w-0 flex-1 break-all font-mono text-xs text-slate-200 sm:block">{value}</span>
        <button
          type="button"
          onClick={() => void navigator.clipboard.writeText(value)}
          className="shrink-0 rounded-lg border border-indigo-400/20 bg-indigo-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-indigo-200 transition hover:bg-indigo-500/20 hover:text-white sm:px-3 sm:py-2"
          aria-label={`Copy ${label} address`}
        >
          <span className="sm:hidden">Copy</span>
          <span className="hidden sm:inline">Copy address</span>
        </button>
      </dd>
    </div>
  );
}

function fundingRedirect(appId:string,provider:"donate"|"liberapay"|"opencollective"){const base=process.env.NEXT_PUBLIC_SUPABASE_URL;if(!base)return null;return `${base}/functions/v1/funding-click?app=${encodeURIComponent(appId)}&provider=${provider}`;}

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
  const [selectedListingPlatform, setSelectedListingPlatform] = useState<string | null>(null);
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
  const [screenshotIndex, setScreenshotIndex] = useState<number | null>(null);
  const [appIcon, setAppIcon] = useState<string | null>(null);
  const ratingApi = "https://api.free-time.me/lumastore";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPageUrl(window.location.href);
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }));
  }, [params.id]);

  async function shareApp() { if (!pageUrl || !app) return; const data={title:app.name || "Luma Store app",text:app.short_description || "View this app on Luma Store",url:pageUrl}; if(navigator.share){try{await navigator.share(data);return}catch(error){if(error instanceof DOMException&&error.name==="AbortError")return}} await navigator.clipboard.writeText(pageUrl);setCopied(true);window.setTimeout(()=>setCopied(false),1800); }
  async function copyAppLink(){if(!pageUrl)return;await navigator.clipboard.writeText(pageUrl);setCopied(true);window.setTimeout(()=>setCopied(false),1800);}
  async function recordSuccessfulDownload(platform: StoreAppPlatform) {
    if (!app) return;
    const response = await fetch(downloadHref(platform), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(app.package_name ? { package_name: app.package_name } : { app_id: app.id }),
        platform: platform.platform,
        package_type: platform.package_type,
      }),
    });
    if (!response.ok) throw new Error("Download could not be recorded.");
  }

  async function saveDesktopDownload(platform: StoreAppPlatform) {
    if (!platform.download_url) return;

    const filename = decodeURIComponent(new URL(platform.download_url).pathname.split("/").pop() || "download");
    const picker = (window as typeof window & {
      showSaveFilePicker?: (options?: {
        suggestedName?: string;
        types?: Array<{ description?: string; accept: Record<string, string[]> }>;
      }) => Promise<{
        createWritable: () => Promise<{
          write: (data: Blob | ArrayBuffer | Uint8Array) => Promise<void>;
          close: () => Promise<void>;
        }>;
      }>;
    }).showSaveFilePicker;

    if (picker) {
      try {
        const handle = await picker({ suggestedName: filename });
        const response = await fetch(platform.download_url, { cache: "no-store" });
        if (!response.ok) throw new Error("Artifact download failed.");
        const blob = await response.blob();
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        await recordSuccessfulDownload(platform);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        throw error;
      }
      return;
    }

    const response = await fetch(platform.download_url, { cache: "no-store" });
    if (!response.ok) throw new Error("Artifact download failed.");
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
    await recordSuccessfulDownload(platform);
  }

  function startDownload(platform: StoreAppPlatform) {
    const downloadUrl = downloadHref(platform);
    const isDesktop = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    if (platform.platform.toLowerCase() === "android" && isDesktop) {
      setAndroidQrUrl(downloadUrl);
      return;
    }

    if (isDesktop) {
      void saveDesktopDownload(platform).catch((error) => {
        console.error("desktop download", error);
      });
      return;
    }

    window.location.assign(downloadUrl);
  }
  useEffect(()=>{if(!androidQrUrl)return;const close=(event:KeyboardEvent)=>{if(event.key==="Escape")setAndroidQrUrl(null)};window.addEventListener("keydown",close);return()=>window.removeEventListener("keydown",close)},[androidQrUrl]);

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
        .is("archived_at", null)
        .eq(isUuid ? "id" : "package_name", identifier)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;

      if (appResult.error) {
        setError(appResult.error.message);
        setApp(null);
        setPlatforms([]);
      } else {
        const loadedApp = appResult.data as StoreApp;
        setApp(loadedApp);
        setAppIcon(loadedApp.icon_url ?? null);
        if (!loadedApp.icon_url && loadedApp.repo_url) {
          const fallbackIcon = await fetchFastlaneIconUrl(loadedApp.repo_url);
          if (!cancelled) setAppIcon(fallbackIcon ?? null);
        }
        try {
          const key = "luma-recent-apps";
          const current = JSON.parse(localStorage.getItem(key) || "[]") as Array<{id:string;name:string;package_name:string|null;icon_url:string|null}>;
          const next = [{id:loadedApp.id,name:loadedApp.name || loadedApp.package_name || "Untitled app",package_name:loadedApp.package_name,icon_url:loadedApp.icon_url}, ...current.filter(item=>item.id!==loadedApp.id)].slice(0,6);
          localStorage.setItem(key, JSON.stringify(next));
        } catch {}
        if (loadedApp.developer_id) {
          const fundingResult = await supabase.from("luma_developer_funding").select("donate_url,liberapay,opencollective,bitcoin,litecoin,crypto_addresses").eq("developer_id", loadedApp.developer_id).maybeSingle();
          if (!cancelled) setFunding((fundingResult.data as DeveloperFunding | null) ?? null);
        } else if (!cancelled) setFunding(null);
        const platformResult = await supabase.from("store_app_platforms").select("id,app_id,platform,package_type,linux_package_base,download_url,file_size_mb,sha256,artifact_verified_at,artifact_size_bytes,permissions,repo_url,listing_metadata").eq("app_id", loadedApp.id).order("platform", { ascending: true });
        if (!cancelled) {
          const loadedPlatforms = (platformResult.data ?? []) as StoreAppPlatform[];
          setPlatforms(loadedPlatforms);
          const listingPlatforms = Array.from(new Set(loadedPlatforms.filter((item) => platformListing(item.listing_metadata)).map((item) => item.platform)));
          setSelectedListingPlatform((current) => current && listingPlatforms.includes(current) ? current : (listingPlatforms.includes("Android") ? "Android" : listingPlatforms[0] ?? null));
        }
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
    return <div className="glass-page mx-auto max-w-6xl space-y-5 px-3 pb-20 sm:px-4"><div className="h-5 w-32 animate-pulse rounded bg-slate-800/70"/><div className="rounded-[2rem] border border-white/10 bg-slate-900/50 p-5 sm:p-8"><div className="flex gap-5"><div className="h-24 w-24 animate-pulse rounded-3xl bg-slate-800/80"/><div className="flex-1 space-y-3 py-2"><div className="h-8 max-w-sm animate-pulse rounded bg-slate-800/80"/><div className="h-4 max-w-xs animate-pulse rounded bg-slate-800/60"/><div className="h-14 max-w-xl animate-pulse rounded-xl bg-slate-800/40"/></div></div></div><div className="h-44 animate-pulse rounded-3xl border border-white/10 bg-slate-900/40"/></div>;
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

  const cryptoLabels:Record<string,string>={bitcoin:"Bitcoin (BTC)",ethereum:"Ethereum (ETH)",tether:"Tether (USDT)",usdc:"USD Coin (USDC)",bnb:"BNB",solana:"Solana (SOL)",cardano:"Cardano (ADA)",dogecoin:"Dogecoin (DOGE)",tron:"TRON (TRX)",polkadot:"Polkadot (DOT)",avalanche:"AvalAX (AVAX)",chainlink:"Chainlink (LINK)",polygon:"Polygon (POL)",litecoin:"Litecoin (LTC)",bitcoin_cash:"Bitcoin Cash (BCH)",stellar:"Stellar (XLM)",monero:"Monero (XMR)",toncoin:"Toncoin (TON)",shiba_inu:"Shiba Inu (SHIB)"}; const cryptoEntries=Object.entries(funding?.crypto_addresses||{}).filter(([key,value])=>Boolean(value)&&!key.startsWith("xrp::")&&key!=="bnb::BNB Beacon Chain");
  const listingPlatforms = Array.from(new Set(platforms.filter((item) => platformListing(item.listing_metadata)).map((item) => item.platform)));
  const activePlatformRow = selectedListingPlatform ? platforms.find((item) => item.platform === selectedListingPlatform && platformListing(item.listing_metadata)) : undefined;
  const activeListing = activePlatformRow ? platformListing(activePlatformRow.listing_metadata) : null;
  const screenshots = activeListing?.screenshots.length ? activeListing.screenshots : stringArray(app.screenshots);
  const antiFeatures = stringArray(app.ant_features);
  const name = activeListing?.title || app.name || app.package_name || "Untitled app";
  const shortDescription = activeListing?.shortDescription || app.short_description;
  const description = activeListing?.fullDescription || app.description;
  const changelog = activeListing?.changelog || app.changelog;
  const downloadablePlatforms = platforms.filter((platform) => Boolean(platform.download_url));
  const artifactLabel=(platform:StoreAppPlatform)=>platform.platform.toLowerCase()==="linux"?`Linux ${(platform.package_type||platform.linux_package_base||"").toUpperCase().replace("-BASED","")}`:platform.package_type?`${platform.platform} ${platform.package_type.toUpperCase()}`:platform.platform;
  const downloadHref=(platform:StoreAppPlatform)=>`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/download-app?${app.package_name ? `package_name=${encodeURIComponent(app.package_name)}` : `app_id=${encodeURIComponent(app.id)}`}&platform=${encodeURIComponent(platform.platform)}${platform.package_type?`&package_type=${encodeURIComponent(platform.package_type)}`:""}`;

  return (
    <div className="glass-page mx-auto max-w-6xl space-y-5 px-3 pb-20 sm:space-y-6 sm:px-4">
      <Link href="/discover" className="inline-flex text-sm font-medium text-indigo-300 transition hover:text-indigo-200">← Back to Discover</Link>

      <section className="glass-panel p-5 sm:p-8">
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
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
              {shortDescription && <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">{shortDescription}</p>}
              <div className="mt-4 flex flex-wrap items-center gap-2"><div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950/50 px-3 py-1.5 text-sm text-slate-300"><span aria-hidden="true">↓</span><span>{downloadCount.toLocaleString()} downloads</span></div><div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950/50 px-3 py-1.5 text-sm text-slate-300"><span className="text-amber-300">★</span><span>{ratingCount ? ratingAverage.toFixed(1) : "No ratings"}{ratingCount ? ` · ${ratingCount}` : ""}</span></div></div>

              {listingPlatforms.length > 1 && <div className="mt-4 flex flex-wrap gap-2">{listingPlatforms.map((platform)=><button type="button" key={platform} onClick={()=>{setSelectedListingPlatform(platform);setScreenshotIndex(null);}} className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${selectedListingPlatform===platform?"border-indigo-400/40 bg-indigo-500/15 text-indigo-100":"border-slate-700 bg-slate-950/40 text-slate-400 hover:text-white"}`}>{platform} listing</button>)}</div>}
              <div className="mt-3 flex flex-wrap gap-2">{platforms.map((platform)=><span key={platform.id} className="rounded-full border border-slate-700 bg-slate-950/40 px-2.5 py-1 text-xs text-slate-300">{artifactLabel(platform)}</span>)}</div>
              {platformDownloadCounts.length>0&&<div className="mt-3 flex flex-wrap gap-2">{platformDownloadCounts.map((item)=><span key={item.platform} className="rounded-full border border-indigo-400/20 bg-indigo-500/10 px-2.5 py-1 text-xs text-indigo-200">{item.platform}: {Number(item.downloads).toLocaleString()} downloads</span>)}</div>}

              <div className="mt-5 flex flex-wrap gap-2">
                {app.categories?.map((category) => (
                  <span key={category} className="rounded-full border border-indigo-400/20 bg-indigo-500/10 px-2.5 py-1 text-xs text-indigo-200">{category}</span>
                ))}
                {app.subcategory && <span className="rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-300">{app.subcategory}</span>}
              </div>
            </div>
          </div>

          <div className="flex w-full shrink-0 flex-col gap-2 rounded-2xl border border-white/10 bg-slate-950/25 p-3 lg:w-72">
            <div className="grid grid-cols-2 gap-2"><button type="button" onClick={shareApp} className="rounded-xl border border-slate-700 bg-slate-950/50 px-3 py-2.5 text-sm font-medium text-slate-200 transition hover:border-indigo-400/40 hover:text-white">Share</button><button type="button" onClick={copyAppLink} className="rounded-xl border border-slate-700 bg-slate-950/50 px-3 py-2.5 text-sm font-medium text-slate-200 transition hover:border-indigo-400/40 hover:text-white">{copied?"Copied!":"Copy link"}</button></div>
            {downloadablePlatforms.length > 0 ? (
              downloadablePlatforms.map((platform) => (
                <button
                  key={platform.id}
                  type="button"
                  onClick={()=>startDownload(platform)}
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-indigo-500 px-5 py-3 text-center text-sm font-bold text-white shadow-lg shadow-indigo-950/30 transition hover:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-300/60"
                >
                  Download {artifactLabel(platform)}
                  {platform.file_size_mb !== null ? ` · ${platform.file_size_mb.toFixed(2)} MB` : ""}
                </button>
              ))
            ) : (
              <div className="rounded-xl border border-slate-700 bg-slate-950/50 px-4 py-3 text-center text-sm text-slate-500">
                No download available
              </div>
            )}
          </div>
        </div>
      </section>

      {description && (
        <section className="glass-panel p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-semibold text-white">Description</h2>{selectedListingPlatform&&activeListing&&<span className="rounded-full border border-indigo-400/20 bg-indigo-500/10 px-2.5 py-1 text-xs text-indigo-200">{selectedListingPlatform} listing</span>}</div>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-300">{description}</p>
        </section>
      )}

      <section className="glass-panel p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-indigo-300">Trust & transparency</p><h2 className="mt-1 text-xl font-semibold text-white">Integrity & privacy</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Information published by Luma Store for this release. Missing data is shown as unavailable rather than assumed to be safe.</p></div><span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-200">{app.source_code_url||app.repo_url?"Source available":"Source not provided"}</span></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <TrustItem label="Source code" value={app.source_code_url||app.repo_url?"Repository linked":"Not provided"} tone={app.source_code_url||app.repo_url?"good":"neutral"}/>
          <TrustItem label="License" value={app.license_type||"Not provided"} tone={app.license_type?"good":"neutral"}/>
          <TrustItem label="Anti-features" value={hasJsonValue(app.ant_features)?stringArray(app.ant_features).join(", ")||"Declared":"None declared"} tone={hasJsonValue(app.ant_features)?"warn":"good"}/>
          <TrustItem label="SHA-256" value={platforms.some(p=>p.sha256)?platforms.filter(p=>p.sha256).map(p=>artifactLabel(p)+": "+p.sha256).join(" · "):"Not provided yet"} tone={platforms.some(p=>p.sha256)?"good":"neutral"}/>
          <TrustItem label="Android permissions" value={(()=>{const android=platforms.find(p=>p.platform.toLowerCase()==="android");return android?(hasJsonValue(android.permissions)?stringArray(android.permissions).join(", ")||"Metadata available":"Not provided yet"):"Not applicable"})()} tone="neutral"/>
          <TrustItem label="Artifact size" value={platforms.some(p=>p.artifact_size_bytes!=null||p.file_size_mb!=null)?platforms.filter(p=>p.artifact_size_bytes!=null||p.file_size_mb!=null).map(p=>artifactLabel(p)+": "+(p.artifact_size_bytes!=null?(Number(p.artifact_size_bytes)/1024/1024).toLocaleString(undefined,{maximumFractionDigits:2}):Number(p.file_size_mb).toLocaleString(undefined,{maximumFractionDigits:2}))+" MB").join(" · "):"Not provided"} tone="neutral"/>
          <TrustItem label="Artifact verification" value={platforms.some(p=>p.artifact_verified_at)?"SHA-256 calculated by Luma Store during publishing":"Not verified yet"} tone={platforms.some(p=>p.artifact_verified_at)?"good":"neutral"}/>
        </div>
        {hasJsonValue(app.ant_features)&&<div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4"><p className="text-sm font-semibold text-amber-100">Declared anti-features</p><p className="mt-1 text-sm leading-6 text-amber-100/70">{stringArray(app.ant_features).join(", ")||"This app has anti-feature metadata, but it is not stored as a simple list."}</p></div>}
      </section>

      {screenshots.length > 0 && (
        <section className="glass-panel p-5 sm:p-6">
          <h2 className="text-xl font-semibold text-white">Screenshots</h2>
          <div className="mt-4 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3">
            {screenshots.map((url, index) => (
              // eslint-disable-next-line @next/next/no-img-element
              <button type="button" key={`${url}-${index}`} onClick={()=>setScreenshotIndex(index)} className="shrink-0 snap-center rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-300/60"><img src={url} alt={`${name} screenshot ${index + 1}`} className="h-72 w-auto max-w-[85vw] rounded-2xl border border-white/10 bg-slate-950 object-contain shadow-lg transition hover:scale-[1.01] sm:h-96" /></button>
            ))}
          </div>
        </section>
      )}

      <section className="glass-panel p-5 sm:p-6">
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
        <section className="rounded-3xl border border-emerald-400/15 bg-emerald-500/5 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">Open source</p><h2 className="mt-1 text-xl font-semibold text-white">Project & repository</h2></div>{app.license_type&&<span className="rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-200">{app.license_type}</span>}</div>
          <div className="mt-4 flex flex-wrap gap-2">
            <LinkChip href={app.website_url} label="Website" />
            <LinkChip href={app.author_website} label="Author website" />
            <LinkChip href={activePlatformRow?.repo_url || app.source_code_url} label={selectedListingPlatform&&activePlatformRow?.repo_url?`${selectedListingPlatform} source code`:"Source code"} />
            <LinkChip href={app.issue_tracker_url} label="Issue tracker" />
            <LinkChip href={app.translation_url} label="Translations" />
            <LinkChip href={app.changelog_url} label="Changelog" />
          </div>
        </section>
      )}

      {versionHistory.length>0&&<section className="glass-panel p-5 sm:p-6"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Releases</p><h2 className="mt-1 text-xl font-semibold text-white">Version history</h2><div className="mt-4 space-y-3">{versionHistory.map((item,index)=><details key={String(item.version)+"-"+String(item.version_code)+"-"+index} open={index===0} className="group ui-panel-muted p-4"><summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2"><span className="font-semibold text-white">{item.version?"v"+item.version:"Version"} {index===0&&<span className="ml-2 rounded-full bg-indigo-500/10 px-2 py-0.5 text-[11px] text-indigo-200">Latest</span>}</span><span className="text-xs text-slate-500">{formatDate(item.published_at)} · #{item.version_code??"—"} <span className="ml-1 inline-block transition group-open:rotate-180">⌄</span></span></summary><p className="mt-3 whitespace-pre-wrap border-t border-white/10 pt-3 text-sm leading-6 text-slate-400">{item.changelog||"No changelog provided."}</p></details>)}</div></section>}

      {changelog && (
        <section className="glass-panel p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-semibold text-white">Changelog</h2>{selectedListingPlatform&&activeListing&&<span className="rounded-full border border-indigo-400/20 bg-indigo-500/10 px-2.5 py-1 text-xs text-indigo-200">{selectedListingPlatform}</span>}</div>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-300">{changelog}</p>
        </section>
      )}

      <section className="glass-panel p-5 sm:p-6">
        <h2 className="text-xl font-semibold text-white">Anti-features</h2>
        {antiFeatures.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {antiFeatures.map((item) => <span key={item} className="rounded-full bg-amber-500/10 px-3 py-1 text-xs text-amber-200">{item}</span>)}
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500">No anti-features listed.</p>
        )}
      </section>

      {pageUrl&&platforms.some(p=>p.platform.toLowerCase()==="android")&&<section className="rounded-3xl border border-indigo-400/15 bg-indigo-500/5 p-5 sm:p-6"><div className="grid gap-6 sm:grid-cols-[1fr_auto] sm:items-center"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-300">Continue on Android</p><h2 className="mt-1 text-xl font-semibold text-white">Open this app on your phone</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Scan the QR code to open this Luma Store app page on Android. Downloads still go through Luma Store, so the download counter stays accurate.</p></div><div className="mx-auto rounded-3xl bg-white p-3 sm:mx-0"><img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(pageUrl)}`} alt={`QR code for ${name}`} width={180} height={180} className="h-40 w-40 sm:h-44 sm:w-44"/></div></div></section>}

      {similarApps.length>0&&<section className="glass-panel p-5 sm:p-6"><h2 className="text-xl font-semibold text-white">Similar apps</h2><p className="mt-1 text-sm text-slate-500">Apps with matching categories.</p><div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{similarApps.map((item)=>{const itemName=item.name||item.package_name||"Untitled app";return <Link key={item.id} href={`/discover/${encodeURIComponent(item.package_name||item.id)}`} className="ui-panel-muted p-4 transition duration-300 hover:border-indigo-400/40 hover:bg-slate-900/60"><div className="flex items-center gap-3">{item.icon_url?<img src={item.icon_url} alt="" className="h-12 w-12 rounded-xl border border-slate-700 object-cover"/>:<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 font-bold">{itemName[0]}</div>}<div className="min-w-0"><h3 className="truncate font-semibold text-white">{itemName}</h3><p className="text-xs text-slate-500">{item.version?`Version ${item.version}`:"View app"}</p></div></div>{item.short_description&&<p className="mt-3 line-clamp-2 text-sm text-slate-400">{item.short_description}</p>}</Link>})}</div></section>}

      {relatedDeveloperApps.length>0&&<section className="glass-panel p-5 sm:p-6"><h2 className="text-xl font-semibold text-white">More from {app.developer_name || "this developer"}</h2><div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{relatedDeveloperApps.map((item)=>{const itemName=item.name||item.package_name||"Untitled app";return <Link key={item.id} href={`/discover/${encodeURIComponent(item.package_name||item.id)}`} className="ui-panel-muted p-4 transition duration-300 hover:border-indigo-400/40 hover:bg-slate-900/60"><div className="flex items-center gap-3">{item.icon_url?<img src={item.icon_url} alt="" className="h-12 w-12 rounded-xl border border-slate-700 object-cover"/>:<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 font-bold">{itemName[0]}</div>}<div className="min-w-0"><h3 className="truncate font-semibold text-white">{itemName}</h3><p className="text-xs text-slate-500">{item.version?`Version ${item.version}`:"View app"}</p></div></div>{item.short_description&&<p className="mt-3 line-clamp-2 text-sm text-slate-400">{item.short_description}</p>}</Link>})}</div></section>}

      {funding && (funding.donate_url || funding.liberapay || funding.opencollective || funding.bitcoin || funding.litecoin || Object.values(funding.crypto_addresses||{}).some(Boolean)) && (
        <section className="glass-panel p-5 sm:p-6">
          <h2 className="text-xl font-semibold text-white">Support the developer</h2>
          <p className="mt-1 text-sm text-slate-400">These funding methods belong to {app.developer_name || "this developer"} and apply to all of their apps.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <LinkChip href={funding.donate_url?fundingRedirect(app.id,"donate"):null} label="Donate" />
            <LinkChip href={funding.liberapay?fundingRedirect(app.id,"liberapay"):null} label="Liberapay" />
            <LinkChip href={funding.opencollective?fundingRedirect(app.id,"opencollective"):null} label="OpenCollective" />
          </div>
          {cryptoEntries.length>0 && <dl className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2">{cryptoEntries.map(([key,value])=><CryptoAddressField key={key} label={`${cryptoLabels[key.split("::")[0]]||key.split("::")[0]}${key.includes("::")?` · ${key.split("::")[1]}`:""}`} value={value} />)}</dl>}
        </section>
      )}

      {androidQrUrl && <div onMouseDown={(e)=>{if(e.target===e.currentTarget)setAndroidQrUrl(null)}} className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-md"><div role="dialog" aria-modal="true" aria-label="Install on Android" className="glass-panel relative w-full max-w-md p-6 text-center"><button type="button" onClick={()=>setAndroidQrUrl(null)} className="absolute right-3 top-3 h-9 w-9 rounded-full border border-white/10 bg-white/5 text-white" aria-label="Close">×</button>{app.icon_url&&<img src={app.icon_url} alt="" className="mx-auto h-16 w-16 rounded-2xl object-cover"/>}<h2 className="mt-4 text-2xl font-bold text-white">Install {name} on Android</h2><p className="mt-2 text-sm text-slate-400">Version {app.version||"latest"} · Scan this code with your Android device.</p><div className="mt-4 rounded-2xl border border-amber-400/15 bg-amber-500/5 p-4 text-left"><p className="text-sm font-semibold text-amber-100">Installing outside your current app store</p><ol className="mt-2 space-y-1.5 text-xs leading-5 text-slate-400"><li><strong className="text-slate-300">1.</strong> Download the APK on your Android device.</li><li><strong className="text-slate-300">2.</strong> Android may ask you to allow installs from the browser or file manager you used.</li><li><strong className="text-slate-300">3.</strong> Enable that permission only for the app you trust, install the APK, then you can disable it again.</li></ol><p className="mt-2 text-[11px] leading-4 text-slate-500">The exact Settings name varies by Android version and manufacturer. Luma Store does not ask you to disable Play Protect or other device security.</p></div><div className="mx-auto mt-5 w-fit rounded-3xl bg-white p-3"><img src={"https://api.qrserver.com/v1/create-qr-code/?size=240x240&data="+encodeURIComponent(androidQrUrl)} alt={"QR code to download "+name} width={240} height={240}/></div><div className="mt-5 flex flex-col gap-2 sm:flex-row"><button type="button" onClick={()=>void navigator.clipboard.writeText(androidQrUrl)} className="glass-action flex-1 px-4 py-2.5 text-sm">Copy link</button><button type="button" onClick={()=>window.location.assign(androidQrUrl)} className="rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white">Download here instead</button></div></div></div>}
      {screenshotIndex!==null && screenshots[screenshotIndex] && <div onMouseDown={(e)=>{if(e.target===e.currentTarget)setScreenshotIndex(null)}} className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/90 p-3 backdrop-blur-md"><div role="dialog" aria-modal="true" aria-label="Screenshot preview" className="relative flex h-full w-full max-w-6xl items-center justify-center"><button type="button" onClick={()=>setScreenshotIndex(null)} className="absolute right-2 top-2 z-10 h-10 w-10 rounded-full bg-slate-950/80 text-xl text-white" aria-label="Close">×</button>{screenshots.length>1&&<button type="button" onClick={()=>setScreenshotIndex((screenshotIndex-1+screenshots.length)%screenshots.length)} className="absolute left-2 z-10 h-11 w-11 rounded-full bg-slate-950/80 text-2xl text-white" aria-label="Previous">‹</button>}<img src={screenshots[screenshotIndex]} alt={name+" screenshot "+(screenshotIndex+1)} className="max-h-[90vh] max-w-full rounded-2xl object-contain"/>{screenshots.length>1&&<button type="button" onClick={()=>setScreenshotIndex((screenshotIndex+1)%screenshots.length)} className="absolute right-2 z-10 h-11 w-11 rounded-full bg-slate-950/80 text-2xl text-white" aria-label="Next">›</button>}<span className="absolute bottom-2 rounded-full bg-slate-950/80 px-3 py-1 text-xs text-slate-300">{screenshotIndex+1} / {screenshots.length}</span></div></div>}
    </div>
  );
}

function TrustItem({label,value,tone}:{label:string;value:string;tone:"good"|"warn"|"neutral"}){const style=tone==="good"?"border-emerald-400/15 bg-emerald-500/5":tone==="warn"?"border-amber-400/20 bg-amber-500/10":"border-white/10 bg-slate-950/25";const dot=tone==="good"?"bg-emerald-400":tone==="warn"?"bg-amber-400":"bg-slate-500";return <div className={"rounded-2xl border p-4 "+style}><div className="flex items-center gap-2"><span className={"h-2 w-2 rounded-full "+dot}/><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p></div><p className="mt-2 break-words text-sm font-medium text-slate-200">{value}</p></div>}
