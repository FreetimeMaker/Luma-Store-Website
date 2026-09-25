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
  return (
    <div className="store-page mx-auto max-w-7xl space-y-7 pb-14 sm:space-y-10 sm:px-4 sm:pb-20">
      <Link
        href="/"
        className="inline-flex text-sm font-medium text-indigo-300 transition hover:text-indigo-200"
      >
        ← Back to apps
      </Link>

      <section className="border-b border-white/10 pb-6 sm:pb-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="shrink-0">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={developerName}
                className="h-24 w-24 rounded-[1.5rem] object-cover sm:h-28 sm:w-28 sm:rounded-[2rem] shadow-[0_12px_36px_rgba(0,0,0,0.28)]"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-[1.5rem] sm:h-28 sm:w-28 sm:rounded-[2rem] bg-[#101722] text-3xl font-semibold text-indigo-200 shadow-[0_12px_36px_rgba(0,0,0,0.28)]">
                {developerName.slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-4xl">
                {developerName}
              </h1>
              {profile?.verified && (
                <span className="rounded-full bg-indigo-500/10 px-2.5 py-1 text-xs font-semibold text-indigo-200">
                  ✓ Verified
                </span>
              )}
            </div>

            {profile?.bio && (
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400 sm:text-base">
                {profile.bio}
              </p>
            )}

            <div className="mt-5 flex flex-wrap gap-x-8 gap-y-4">
              <div>
                <p className="text-sm font-semibold text-white">{apps.length}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Published {apps.length === 1 ? "app" : "apps"}
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">
                  {totalDownloads === null ? "—" : totalDownloads.toLocaleString()}+
                </p>
                <p className="mt-0.5 text-xs text-slate-500">Downloads</p>
              </div>
              {memberSince && (
                <div>
                  <p className="text-sm font-semibold text-white">{memberSince}</p>
                  <p className="mt-0.5 text-xs text-slate-500">Member since</p>
                </div>
              )}
              {latestUpdate && (
                <div>
                  <p className="text-sm font-semibold text-white">
                    {new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(latestUpdate))}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">Latest update</p>
                </div>
              )}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {profile?.website_url && (
                <a
                  href={profile.website_url}
                  target="_blank"
                  rel="noreferrer"
                  className="store-chip"
                >
                  Website ↗
                </a>
              )}
              {profile?.github_url && (
                <a
                  href={profile.github_url}
                  target="_blank"
                  rel="noreferrer"
                  className="store-chip inline-flex items-center gap-2"
                >
                  <img src="/github.svg" alt="" className="h-4 w-4" />
                  GitHub
                </a>
              )}
              {profile?.gitlab_url && (
                <a
                  href={profile.gitlab_url}
                  target="_blank"
                  rel="noreferrer"
                  className="store-chip inline-flex items-center gap-2"
                >
                  <img src="/gitlab.svg" alt="" className="h-4 w-4 object-contain" />
                  GitLab
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {developerCategories.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold text-white">Categories</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {developerCategories.map((category) => (
              <span key={category} className="store-chip">
                {category}
              </span>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-5">
          <h2 className="text-2xl font-semibold text-white">Apps by {developerName}</h2>
          <p className="mt-1 text-sm text-slate-500">
            Published apps from this developer.
          </p>
        </div>

        <div className="grid gap-x-8 gap-y-2 md:grid-cols-2">
          {apps.map((app) => {
            const name = app.name || app.package_name || "Untitled app";

            return (
              <Link
                key={app.id}
                href={`/${encodeURIComponent(app.package_name || app.id)}`}
                className="group flex items-center gap-3 rounded-2xl px-1 py-3 transition sm:gap-4 sm:px-2 hover:bg-white/[0.035]"
              >
                {app.icon_url ? (
                  <div className="relative shrink-0">
                    <div
                      aria-hidden="true"
                      className="absolute inset-2 rounded-2xl bg-indigo-500/15 blur-xl"
                    />
                    <img
                      src={app.icon_url}
                      alt={`${name} icon`}
                      className="relative h-16 w-16 rounded-2xl object-cover sm:h-20 sm:w-20 shadow-[0_8px_28px_rgba(0,0,0,0.24)]"
                    />
                  </div>
                ) : (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl sm:h-20 sm:w-20 bg-[#101722] text-xl font-semibold text-indigo-200">
                    {name.slice(0, 1).toUpperCase()}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-base font-semibold text-white group-hover:text-indigo-200">
                    {name}
                  </h3>
                  <p className="mt-1 line-clamp-1 text-sm text-slate-400">
                    {app.short_description || app.description || app.package_name || "No description available."}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    {app.version && <span>Version {app.version}</span>}
                    {app.license_type && <span>· {app.license_type}</span>}
                    {app.categories?.[0] && <span>· {app.categories[0]}</span>}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {funding && (
        funding.donate_url
        || funding.liberapay
        || funding.opencollective
        || funding.bitcoin
        || funding.litecoin
        || Object.values(funding.crypto_addresses || {}).some(Boolean)
      ) && (
        <section className="border-t border-white/10 pt-8">
          <h2 className="text-xl font-semibold text-white">Support {developerName}</h2>

          <div className="mt-4 flex flex-wrap gap-2">
            {funding.donate_url && (
              <a
                href={funding.donate_url}
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400"
              >
                Donate
              </a>
            )}
            {funding.liberapay && (
              <a
                href={fundingHref(funding.liberapay, "liberapay") || "#"}
                target="_blank"
                rel="noreferrer"
                className="store-chip"
              >
                Liberapay ↗
              </a>
            )}
            {funding.opencollective && (
              <a
                href={fundingHref(funding.opencollective, "opencollective") || "#"}
                target="_blank"
                rel="noreferrer"
                className="store-chip"
              >
                OpenCollective ↗
              </a>
            )}
          </div>

          {cryptoEntries.length > 0 && (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {cryptoEntries.map(([key, value]) => (
                <div
                  key={key}
                  className="rounded-2xl bg-[#101722] p-4"
                >
                  <p className="text-xs font-medium text-slate-500">
                    {cryptoLabels[key.split("::")[0]] || key.split("::")[0]}
                    {key.includes("::") ? ` · ${key.split("::")[1]}` : ""}
                  </p>
                  <p className="mt-2 break-all font-mono text-xs text-slate-300">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
