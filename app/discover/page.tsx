"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type StoreApp = {
  id: string;
  name: string | null;
  short_description: string | null;
  description: string | null;
  developer_name: string | null;
  icon_url: string | null;
  version: string | null;
  package_name: string | null;
  license_type: string | null;
  subcategory: string | null;
  categories: string[];
  created_at: string | null;
  updated_at: string | null;
  [key: string]: unknown;
};
type DiscoverMetric={app_id:string;total_downloads:number|string;recent_downloads:number|string;platforms:string[]};\ntype RecentApp={id:string;name:string;package_name:string|null;icon_url:string|null};

function appInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default function DiscoverPage() {
  const supabase = useMemo(() => createClient(), []);
  const [apps, setApps] = useState<StoreApp[]>([]);
  const [search, setSearch] = useState("");
  const [license, setLicense] = useState("all");
  const [category, setCategory] = useState("all");
  const [developer, setDeveloper] = useState("all");
  const [platform, setPlatform] = useState("all");
  const [sort, setSort] = useState("trending");
  const [metrics, setMetrics] = useState<Record<string,DiscoverMetric>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);\n  const [recentApps,setRecentApps]=useState<RecentApp[]>([]);\n  const searchRef=useRef<HTMLInputElement>(null);\n\n  useEffect(()=>{try{setRecentApps(JSON.parse(localStorage.getItem("luma-recent-apps")||"[]"))}catch{}const keys=(event:KeyboardEvent)=>{const target=event.target as HTMLElement|null;if(target?.matches("input, textarea, select, [contenteditable=true]"))return;if(event.key==="/"||((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="k")){event.preventDefault();searchRef.current?.focus()}};window.addEventListener("keydown",keys);return()=>window.removeEventListener("keydown",keys)},[]);

  useEffect(() => {
    let cancelled = false;

    async function loadApps() {
      setLoading(true);
      setError(null);

      const { data, error: loadError } = await supabase
        .from("store_apps")
        .select("*")
        .is("archived_at", null)
        .order("updated_at", { ascending: false });

      if (cancelled) return;

      if (loadError) {
        setError(loadError.message);
        setApps([]);
      } else {
        setApps((data ?? []) as StoreApp[]);
        const {data:metricRows}=await supabase.rpc("luma_discover_metrics");
        if(!cancelled)setMetrics(Object.fromEntries(((metricRows??[]) as DiscoverMetric[]).map(row=>[row.app_id,row])));
      }

      setLoading(false);
    }

    void loadApps();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const licenses = useMemo(
    () =>
      Array.from(
        new Set(
          apps
            .map((app) => app.license_type?.trim())
            .filter((value): value is string => Boolean(value)),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [apps],
  );

  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          apps.flatMap((app) => [
            ...(Array.isArray(app.categories) ? app.categories : []),
            ...(app.subcategory ? [app.subcategory] : []),
          ]),
        ),
      )
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    [apps],
  );

  const developers = useMemo(
    () =>
      Array.from(
        new Set(
          apps
            .map((app) => app.developer_name?.trim())
            .filter((value): value is string => Boolean(value)),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [apps],
  );

  const platforms=useMemo(()=>Array.from(new Set(Object.values(metrics).flatMap(item=>item.platforms||[]))).sort(),[metrics]);

  const hasFilters = Boolean(search.trim()) || license !== "all" || category !== "all" || developer !== "all" || platform !== "all";
  const resetFilters = () => { setSearch(""); setLicense("all"); setCategory("all"); setDeveloper("all"); setPlatform("all"); };

  const suggestions=useMemo(()=>{const q=search.trim().toLowerCase();if(!q)return [];return apps.filter(app=>(app.name||"").toLowerCase().includes(q)||(app.package_name||"").toLowerCase().includes(q)||(app.developer_name||"").toLowerCase().includes(q)).slice(0,5)},[apps,search]);\n  const trending=useMemo(()=>[...apps].sort((a,b)=>Number(metrics[b.id]?.recent_downloads||0)-Number(metrics[a.id]?.recent_downloads||0)).slice(0,5),[apps,metrics]);\n  const newThisWeek=useMemo(()=>apps.filter(a=>a.created_at&&Date.now()-new Date(a.created_at).getTime()<=7*86400000).slice(0,5),[apps]);\n  const recentlyUpdated=useMemo(()=>[...apps].sort((a,b)=>new Date(b.updated_at||0).getTime()-new Date(a.updated_at||0).getTime()).slice(0,5),[apps]);\n\n  const filteredApps = useMemo(() => {
    const query = search.trim().toLowerCase();

    const result=apps.filter((app) => {
      const appCategories = Array.isArray(app.categories) ? app.categories : [];
      const matchesLicense = license === "all" || app.license_type === license;
      const matchesCategory = category === "all" || appCategories.includes(category) || app.subcategory === category;
      const matchesDeveloper = developer === "all" || app.developer_name === developer;
      const matchesPlatform = platform === "all" || (metrics[app.id]?.platforms||[]).includes(platform);
      if (!matchesLicense || !matchesCategory || !matchesDeveloper || !matchesPlatform) return false;
      if (!query) return true;

      return JSON.stringify(app).toLowerCase().includes(query);
    });
    return result.sort((a,b)=>{const am=metrics[a.id],bm=metrics[b.id];if(sort==="trending")return Number(bm?.recent_downloads||0)-Number(am?.recent_downloads||0)||Number(bm?.total_downloads||0)-Number(am?.total_downloads||0);if(sort==="downloads")return Number(bm?.total_downloads||0)-Number(am?.total_downloads||0);if(sort==="new")return new Date(b.created_at||0).getTime()-new Date(a.created_at||0).getTime();if(sort==="updated")return new Date(b.updated_at||0).getTime()-new Date(a.updated_at||0).getTime();return (a.name||"").localeCompare(b.name||"");});
  }, [apps, category, developer, license, search, platform, sort, metrics]);

  return (
    <div className="glass-page mx-auto max-w-6xl space-y-6 px-3 pb-20 sm:space-y-8 sm:px-4">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900/55 p-5 shadow-2xl shadow-black/20 backdrop-blur-2xl sm:p-8 lg:p-10">
        <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-indigo-500/15 blur-3xl" /><div aria-hidden="true" className="pointer-events-none absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-violet-500/10 blur-3xl" /><div className="relative max-w-3xl">
          <div className="mb-4 inline-flex items-center rounded-full border border-indigo-400/20 bg-indigo-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-200">
            Luma Store Discover
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">Discover apps</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
            Browse published apps. Click an app to open its full details, screenshots, changelog, links and metadata.
          </p>
        </div>

        <div className="relative mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search apps..."
            aria-label="Search apps"
            className="min-h-12 w-full rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3 text-sm text-white shadow-inner shadow-black/10 backdrop-blur-xl outline-none placeholder:text-slate-500 transition focus:border-indigo-400/60 focus:ring-2 focus:ring-indigo-500/20"
          />
          <select value={category} onChange={(event) => setCategory(event.target.value)} className="min-h-12 rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-200">
            <option value="all">All categories</option>
            {categories.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>

          <select value={developer} onChange={(event) => setDeveloper(event.target.value)} className="min-h-12 rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-200">
            <option value="all">All developers</option>
            {developers.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>

          <select value={license} onChange={(event) => setLicense(event.target.value)} className="min-h-12 rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-200">
            <option value="all">All licenses</option>
            {licenses.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select value={platform} onChange={(e)=>setPlatform(e.target.value)} className="min-h-12 rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-200"><option value="all">All platforms</option>{platforms.map(item=><option key={item} value={item}>{item}</option>)}</select>
          <select value={sort} onChange={(e)=>setSort(e.target.value)} className="min-h-12 rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-200"><option value="trending">Trending</option><option value="new">New releases</option><option value="updated">Recently updated</option><option value="downloads">Most downloaded</option><option value="name">Name</option></select>
          {hasFilters && <button type="button" onClick={resetFilters} className="min-h-12 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-slate-300 backdrop-blur-xl transition hover:bg-white/10 hover:text-white">Clear filters</button>}
        </div>
      </section>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="rounded-3xl border border-white/10 bg-slate-900/45 p-5 backdrop-blur-xl"><div className="flex gap-4"><div className="h-14 w-14 animate-pulse rounded-2xl bg-slate-800/80"/><div className="flex-1 space-y-2 pt-1"><div className="h-5 w-2/3 animate-pulse rounded bg-slate-800/80"/><div className="h-3 w-1/2 animate-pulse rounded bg-slate-800/60"/></div></div><div className="mt-5 h-14 animate-pulse rounded-xl bg-slate-800/50"/><div className="mt-5 h-8 animate-pulse rounded-xl bg-slate-800/40"/></div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-500/25 bg-rose-950/20 p-6 text-rose-200">{error}</div>
      ) : filteredApps.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-8 text-center backdrop-blur-xl sm:p-12"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-2xl">⌕</div><h2 className="mt-4 text-lg font-semibold text-white">No apps found</h2><p className="mt-2 text-sm text-slate-400">Try another search or clear the active filters.</p>{hasFilters&&<button type="button" onClick={resetFilters} className="mt-5 rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400">Clear filters</button>}</div>
      ) : (
        <section>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Catalog</p>
              <h2 className="mt-1 text-2xl font-bold text-white">{sort==="trending"?"Trending":sort==="new"?"New releases":sort==="updated"?"Recently updated":sort==="downloads"?"Most downloaded":"All apps"}</h2>
            </div>
            <span className="text-sm text-slate-500">{filteredApps.length} apps</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredApps.map((app) => {
              const name = app.name?.trim() || app.package_name || "Untitled app";
              const metric=metrics[app.id]; const ageDays=app.created_at?Math.floor((Date.now()-new Date(app.created_at).getTime())/86400000):9999; const updateDays=app.updated_at?Math.floor((Date.now()-new Date(app.updated_at).getTime())/86400000):9999;

              return (
                <Link
                  key={app.id}
                  href={`/discover/${encodeURIComponent(app.package_name || app.id)}`}
                  className="group relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/50 p-5 shadow-lg shadow-black/10 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-indigo-400/30 hover:bg-slate-900/70 hover:shadow-xl hover:shadow-indigo-950/20"
                >
                  <div className="flex items-start gap-4">
                    {app.icon_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={app.icon_url} alt={`${name} icon`} className="h-14 w-14 shrink-0 rounded-2xl border border-slate-700 bg-slate-950 object-cover" />
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-slate-700 bg-slate-950 text-sm font-bold text-indigo-200">
                        {appInitials(name) || "A"}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-lg font-semibold text-white group-hover:text-indigo-200">{name}</h3>
                      <p className="mt-1 truncate text-xs text-slate-500">{app.developer_name || app.package_name || "Unknown developer"}</p>
                    </div>
                  </div>

                  <p className="mt-4 line-clamp-3 min-h-15 text-sm leading-5 text-slate-400">
                    {app.short_description || app.description || "No description available."}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2 text-xs">{ageDays<=14&&<span className="rounded-full bg-sky-500/10 px-2.5 py-1 text-sky-200">New</span>}{ageDays>14&&updateDays<=14&&<span className="rounded-full bg-violet-500/10 px-2.5 py-1 text-violet-200">Recently updated</span>}{(metric?.platforms||[]).map(item=><span key={item} className="rounded-full border border-slate-700 px-2.5 py-1 text-slate-300">{item}</span>)}</div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs"><span className="rounded-full border border-slate-700 bg-slate-950/40 px-2.5 py-1 text-slate-300">↓ {Number(metric?.total_downloads||0).toLocaleString()}</span>{Number(metric?.recent_downloads||0)>0&&<span className="rounded-full border border-indigo-400/20 bg-indigo-500/10 px-2.5 py-1 text-indigo-200">↗ {Number(metric.recent_downloads).toLocaleString()} / 30d</span>}</div>

                  <div className="mt-5 flex flex-wrap gap-2 text-xs">
                    {app.version && <span className="rounded-full border border-slate-700 px-2.5 py-1 text-slate-300">v{app.version}</span>}
                    {app.license_type && <span className="rounded-full border border-indigo-400/20 bg-indigo-500/10 px-2.5 py-1 text-indigo-200">{app.license_type}</span>}
                    <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-emerald-200">Open source</span>
                  </div>

                  <div className="mt-5 border-t border-slate-800 pt-4 text-right text-xs font-medium text-indigo-300 group-hover:text-indigo-200">
                    View app details →
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
\nfunction Collection({title,apps}:{title:string;apps:StoreApp[]}){if(!apps.length)return null;return <section><h2 className="mb-3 text-lg font-semibold text-white">{title}</h2><div className="flex snap-x gap-3 overflow-x-auto pb-2">{apps.map(app=>{const name=app.name||app.package_name||"Untitled app";return <Link key={app.id} href={`/discover/${encodeURIComponent(app.package_name||app.id)}`} className="glass-action flex min-w-56 snap-start items-center gap-3 p-3"><div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-slate-900">{app.icon_url?<img src={app.icon_url} alt="" className="h-full w-full object-cover"/>:<span className="flex h-full items-center justify-center text-xs font-bold text-indigo-200">{appInitials(name)}</span>}</div><div className="min-w-0"><strong className="block truncate text-sm text-white">{name}</strong><span className="block truncate text-xs text-slate-500">{app.developer_name||app.package_name||"Unknown developer"}</span></div></Link>})}</div></section>}