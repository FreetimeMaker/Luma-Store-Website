"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type StoreApp = {
  id: string;
  name: string | null;
  short_description: string | null;
  description: string | null;
  developer_name: string | null;
  developer_id: string | null;
  icon_url: string | null;
  version: string | null;
  package_name: string | null;
  license_type: string | null;
  categories: string[] | null;
  updated_at: string | null;
};

function fundingHref(value: string | null, provider: "liberapay" | "opencollective") { if (!value) return null; if (/^https?:\/\//i.test(value)) return value; return provider === "liberapay" ? `https://liberapay.com/${value.replace(/^@/, "")}/` : `https://opencollective.com/${value.replace(/^@/, "")}`; }

type DeveloperProfile = { display_name:string|null; bio:string|null; website_url:string|null; github_url:string|null; gitlab_url:string|null; avatar_url:string|null; verified:boolean; created_at:string|null; };

type DeveloperFunding = { donate_url: string | null; liberapay: string | null; opencollective: string | null; bitcoin: string | null; litecoin: string | null; crypto_addresses: Record<string,string> | null; };

export default function DiscoverDeveloperPage() {
  const params = useParams<{ id: string }>();
  const supabase = useMemo(() => createClient(), []);
  const [apps, setApps] = useState<StoreApp[]>([]);
  const [totalDownloads, setTotalDownloads] = useState<number | null>(null);
  const [funding, setFunding] = useState<DeveloperFunding | null>(null);
  const [profile, setProfile] = useState<DeveloperProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const identifier = decodeURIComponent(params.id);
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identifier);
      const result = await supabase.from("store_apps").select("id,name,short_description,description,developer_name,developer_id,icon_url,version,package_name,license_type,categories,updated_at").is("archived_at", null).eq(isUuid ? "developer_id" : "developer_name", identifier).order("updated_at", { ascending: false });
      if (cancelled) return;
      if (result.error) { setError(result.error.message); setApps([]); }
      else {
        const rows = (result.data ?? []) as StoreApp[];
        setApps(rows);
        const developerId = rows.find((app) => app.developer_id)?.developer_id;
        if (developerId) { const profileResult=await supabase.from("luma_developer_profiles").select("display_name,bio,website_url,github_url,gitlab_url,avatar_url,verified,created_at").eq("developer_id",developerId).maybeSingle(); if(!cancelled)setProfile((profileResult.data as DeveloperProfile|null)??null); const {data:developerDownloads}=await supabase.rpc("luma_developer_download_count",{target_developer_id:developerId}); if(!cancelled)setTotalDownloads(Number(developerDownloads??0)); const fundingResult = await supabase.from("luma_developer_funding").select("donate_url,liberapay,opencollective,bitcoin,litecoin,crypto_addresses").eq("developer_id", developerId).maybeSingle(); if (!cancelled) setFunding((fundingResult.data as DeveloperFunding | null) ?? null); }
        if (!developerId) setTotalDownloads(0);
      }
      setLoading(false);
    }
    void load();
    return () => { cancelled = true; };
  }, [params.id, supabase]);

  if (loading) return <div className="store-page mx-auto max-w-7xl space-y-5 px-3 pb-20 sm:px-4"><div className="h-5 w-32 animate-pulse rounded bg-slate-800/70"/><div className="rounded-[2rem] border border-white/10 bg-slate-900/50 p-6"><div className="flex gap-5"><div className="h-20 w-20 animate-pulse rounded-3xl bg-slate-800/80"/><div className="flex-1 space-y-3"><div className="h-7 max-w-xs animate-pulse rounded bg-slate-800/80"/><div className="h-4 max-w-xl animate-pulse rounded bg-slate-800/50"/></div></div></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0,1,2].map(i=><div key={i} className="h-48 animate-pulse glass-panel"/>)}</div></div>;
  if (error || apps.length === 0) return <div className="store-page mx-auto max-w-3xl rounded-2xl border border-rose-500/25 bg-rose-950/20 p-6"><h1 className="text-xl font-semibold text-rose-200">Developer not found</h1><p className="mt-2 text-sm text-rose-100/70">{error || "No published apps were found for this developer."}</p><Link href="/" className="mt-4 inline-flex text-sm font-medium text-indigo-300">← Back to apps</Link></div>;

  const developerName = profile?.display_name || apps.find((app) => app.developer_name)?.developer_name || "Luma Store developer";
  const cryptoLabels:Record<string,string>={bitcoin:"Bitcoin (BTC)",ethereum:"Ethereum (ETH)",tether:"Tether (USDT)",usdc:"USD Coin (USDC)",bnb:"BNB",solana:"Solana (SOL)",cardano:"Cardano (ADA)",dogecoin:"Dogecoin (DOGE)",tron:"TRON (TRX)",polkadot:"Polkadot (DOT)",avalanche:"Avalanche (AVAX)",chainlink:"Chainlink (LINK)",polygon:"Polygon (POL)",litecoin:"Litecoin (LTC)",bitcoin_cash:"Bitcoin Cash (BCH)",stellar:"Stellar (XLM)",monero:"Monero (XMR)",toncoin:"Toncoin (TON)",shiba_inu:"Shiba Inu (SHIB)"}; const cryptoEntries=Object.entries(funding?.crypto_addresses||{}).filter(([key,value])=>Boolean(value)&&!key.startsWith("xrp::")&&key!=="bnb::BNB Beacon Chain");
  const developerCategories=Array.from(new Set(apps.flatMap(app=>app.categories||[]))).sort();
  const memberSince=profile?.created_at?new Intl.DateTimeFormat("en",{year:"numeric",month:"long"}).format(new Date(profile.created_at)):null;
  const latestUpdate=apps.map(app=>app.updated_at).filter((value):value is string=>Boolean(value)).sort().at(-1)||null;
  return <div className="store-page mx-auto max-w-7xl space-y-6 px-3 pb-20 sm:space-y-8 sm:px-4">
    <Link href="/" className="inline-flex text-sm font-medium text-indigo-300 hover:text-indigo-200">← Back to apps</Link>
    <section className="glass-panel p-5 sm:p-8">
      <div className="relative flex flex-col items-start gap-5 sm:flex-row">{profile?.avatar_url&&<img src={profile.avatar_url} alt="" className="h-20 w-20 rounded-3xl border border-slate-700 object-cover"/>}<div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-200">Luma Store Developer</p><div className="mt-3 flex flex-wrap items-center gap-2"><h1 className="text-3xl font-bold text-white sm:text-4xl">{developerName}</h1>{profile?.verified&&<span className="rounded-full bg-sky-500/10 px-2.5 py-1 text-xs font-semibold text-sky-200">✓ Verified</span>}</div>{profile?.bio&&<p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">{profile.bio}</p>}<div className="mt-3 flex flex-wrap gap-2">
          {profile?.website_url&&<a href={profile.website_url} target="_blank" rel="noreferrer" className="text-sm text-indigo-300">Website ↗</a>}
          {profile?.github_url&&<a href={profile.github_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-sm text-slate-200 transition hover:bg-white/[0.06]">
            <img src="/github.svg" alt="" className="h-4 w-4 rounded-sm" />
            GitHub
          </a>}
          {profile?.gitlab_url&&<a href={profile.gitlab_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-sm text-slate-200 transition hover:bg-white/[0.06]">
            <img src="/gitlab.svg" alt="" className="h-4 w-4 object-contain" />
            GitLab
          </a>}
        </div><div className="mt-4 flex flex-wrap gap-2"><span className="rounded-full border border-white/10 bg-slate-950/35 px-3 py-1.5 text-sm text-slate-300">{apps.length} published {apps.length === 1 ? "app" : "apps"}</span><span className="rounded-full border border-white/10 bg-slate-950/35 px-3 py-1.5 text-sm text-slate-300">↓ {totalDownloads === null ? "—" : totalDownloads.toLocaleString()} downloads</span>{memberSince&&<span className="rounded-full border border-white/10 bg-slate-950/35 px-3 py-1.5 text-sm text-slate-300">Member since {memberSince}</span>}{latestUpdate&&<span className="rounded-full border border-white/10 bg-slate-950/35 px-3 py-1.5 text-sm text-slate-300">Updated {new Intl.DateTimeFormat("en",{month:"short",day:"numeric",year:"numeric"}).format(new Date(latestUpdate))}</span>}</div></div></div>
    </section>
    {developerCategories.length>0&&<section className="glass-panel p-5 sm:p-6"><p className="text-xs font-semibold uppercase tracking-[.16em] text-slate-500">Focus areas</p><h2 className="mt-1 text-xl font-semibold text-white">Categories</h2><div className="mt-4 flex flex-wrap gap-2">{developerCategories.map(category=><span key={category} className="rounded-full border border-indigo-400/20 bg-indigo-500/10 px-3 py-1.5 text-xs text-indigo-200">{category}</span>)}</div></section>}
    {funding && (funding.donate_url || funding.liberapay || funding.opencollective || funding.bitcoin || funding.litecoin || Object.values(funding.crypto_addresses||{}).some(Boolean)) && <section className="glass-panel p-5 sm:p-6"><h2 className="text-xl font-semibold text-white">Support {developerName}</h2><div className="mt-4 flex flex-wrap gap-2">{funding.donate_url&&<a href={funding.donate_url} target="_blank" rel="noreferrer" className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white">Donate ↗</a>}{funding.liberapay&&<a href={fundingHref(funding.liberapay, "liberapay") || "#"} target="_blank" rel="noreferrer" className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200">Liberapay ↗</a>}{funding.opencollective&&<a href={fundingHref(funding.opencollective, "opencollective") || "#"} target="_blank" rel="noreferrer" className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200">OpenCollective ↗</a>}</div>{cryptoEntries.length>0&&<div className="mt-4 grid gap-3 sm:grid-cols-2">{cryptoEntries.map(([key,value])=><div key={key} className="rounded-xl border border-slate-800 bg-slate-950/45 p-3"><p className="text-xs text-slate-500">{cryptoLabels[key.split("::")[0]]||key.split("::")[0]}{key.includes("::")?` · ${key.split("::")[1]}`:""}</p><p className="mt-1 break-all font-mono text-xs text-slate-200">{value}</p></div>)}</div>}</section>}
    <section><div className="mb-4"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Published apps</p><h2 className="mt-1 text-2xl font-bold text-white">Apps by {developerName}</h2></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{apps.map((app) => { const name=app.name||app.package_name||"Untitled app"; return <Link key={app.id} href={`/${encodeURIComponent(app.package_name || app.id)}`} className="group glass-panel p-5 transition duration-300 hover:border-indigo-400/40 hover:bg-slate-900/70">
        <div className="flex items-start gap-4">{app.icon_url ? <img src={app.icon_url} alt={`${name} icon`} className="h-16 w-16 rounded-2xl border border-slate-700 bg-slate-950 object-cover" /> : <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-700 bg-slate-950 text-xl font-bold text-indigo-200">{name.slice(0,1).toUpperCase()}</div>}<div className="min-w-0"><h3 className="truncate font-semibold text-white group-hover:text-indigo-200">{name}</h3><p className="mt-1 text-xs text-slate-500">{app.version ? `Version ${app.version}` : app.package_name}</p></div></div>
        <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-400">{app.short_description || app.description || "No description available."}</p>
        <div className="mt-4 flex flex-wrap gap-2">{app.license_type && <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-200">{app.license_type}</span>}{app.categories?.slice(0,2).map((category)=><span key={category} className="rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-300">{category}</span>)}</div>
      </Link>; })}</div>
    </section>
  </div>;
}
