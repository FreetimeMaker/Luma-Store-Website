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
type DiscoverMetric = {
  app_id: string;
  total_downloads: number | string;
  recent_downloads: number | string;
  platforms: string[];
};

type RecentApp = {
  id: string;
  name: string;
  package_name: string | null;
  icon_url: string | null;
};

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
  const [metrics, setMetrics] = useState<Record<string, DiscoverMetric>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recentApps, setRecentApps] = useState<RecentApp[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      setRecentApps(JSON.parse(localStorage.getItem("luma-recent-apps") || "[]"));
    } catch {
      setRecentApps([]);
    }

    function handleShortcut(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [contenteditable=true]")) return;

      const shouldFocusSearch =
        event.key === "/"
        || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k");

      if (shouldFocusSearch) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    }

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

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
        const { data: metricRows } = await supabase.rpc("luma_discover_metrics");

        if (!cancelled) {
          setMetrics(
            Object.fromEntries(
              ((metricRows ?? []) as DiscoverMetric[]).map((row) => [row.app_id, row]),
            ),
          );
        }
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

  const platforms = useMemo(
    () => Array.from(
      new Set(Object.values(metrics).flatMap((item) => item.platforms || [])),
    ).sort(),
    [metrics],
  );

  const hasFilters =
    Boolean(search.trim())
    || license !== "all"
    || category !== "all"
    || developer !== "all"
    || platform !== "all";

  function resetFilters() {
    setSearch("");
    setLicense("all");
    setCategory("all");
    setDeveloper("all");
    setPlatform("all");
  }

  const trending = useMemo(
    () => [...apps]
      .sort((a, b) =>
        Number(metrics[b.id]?.recent_downloads || 0)
        - Number(metrics[a.id]?.recent_downloads || 0),
      )
      .slice(0, 5),
    [apps, metrics],
  );

  const newThisWeek = useMemo(
    () => apps
      .filter((app) =>
        app.created_at
        && Date.now() - new Date(app.created_at).getTime() <= 7 * 86400000,
      )
      .slice(0, 5),
    [apps],
  );

  const recentlyUpdated = useMemo(
    () => [...apps]
      .sort((a, b) =>
        new Date(b.updated_at || 0).getTime()
        - new Date(a.updated_at || 0).getTime(),
      )
      .slice(0, 5),
    [apps],
  );

  const filteredApps = useMemo(() => {
    const query = search.trim().toLowerCase();

    const result = apps.filter((app) => {
      const appCategories = Array.isArray(app.categories) ? app.categories : [];
      const matchesLicense = license === "all" || app.license_type === license;
      const matchesCategory = category === "all" || appCategories.includes(category) || app.subcategory === category;
      const matchesDeveloper = developer === "all" || app.developer_name === developer;
      const matchesPlatform =
        platform === "all"
        || (metrics[app.id]?.platforms || []).includes(platform);
      if (!matchesLicense || !matchesCategory || !matchesDeveloper || !matchesPlatform) return false;
      if (!query) return true;

      return JSON.stringify(app).toLowerCase().includes(query);
    });
    return result.sort((a, b) => {
      const aMetric = metrics[a.id];
      const bMetric = metrics[b.id];

      if (sort === "trending") {
        return (
          Number(bMetric?.recent_downloads || 0)
          - Number(aMetric?.recent_downloads || 0)
          || Number(bMetric?.total_downloads || 0)
          - Number(aMetric?.total_downloads || 0)
        );
      }

      if (sort === "downloads") {
        return Number(bMetric?.total_downloads || 0)
          - Number(aMetric?.total_downloads || 0);
      }

      if (sort === "new") {
        return new Date(b.created_at || 0).getTime()
          - new Date(a.created_at || 0).getTime();
      }

      if (sort === "updated") {
        return new Date(b.updated_at || 0).getTime()
          - new Date(a.updated_at || 0).getTime();
      }

      return (a.name || "").localeCompare(b.name || "");
    });
  }, [apps, category, developer, license, search, platform, sort, metrics]);

  return (
    <div className="glass-page mx-auto max-w-6xl space-y-8 pb-20 pt-4 sm:pt-8">
      <section className="ui-panel p-5 sm:p-7">
        <div className="max-w-3xl">
          <p className="ui-eyebrow">Catalog</p>
          <h1 className="ui-title mt-2 text-3xl sm:text-4xl">Discover apps</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
            Search published apps by platform, developer, category or license.
          </p>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search apps..."
            aria-label="Search apps"
            className="glass-input min-h-11 text-sm"
          />
          <select value={category} onChange={(event) => setCategory(event.target.value)} className="glass-input min-h-11 text-sm">
            <option value="all">All categories</option>
            {categories.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>

          <select value={developer} onChange={(event) => setDeveloper(event.target.value)} className="glass-input min-h-11 text-sm">
            <option value="all">All developers</option>
            {developers.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>

          <select value={license} onChange={(event) => setLicense(event.target.value)} className="glass-input min-h-11 text-sm">
            <option value="all">All licenses</option>
            {licenses.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select value={platform} onChange={(e)=>setPlatform(e.target.value)} className="glass-input min-h-11 text-sm"><option value="all">All platforms</option>{platforms.map(item=><option key={item} value={item}>{item}</option>)}</select>
          <select value={sort} onChange={(e)=>setSort(e.target.value)} className="glass-input min-h-11 text-sm"><option value="trending">Trending</option><option value="new">New releases</option><option value="updated">Recently updated</option><option value="downloads">Most downloaded</option><option value="name">Name</option></select>
          {hasFilters && <button type="button" onClick={resetFilters} className="ui-button-secondary min-h-11 px-4 py-2.5 text-sm">Clear filters</button>}
        </div>
      </section>

      {!loading&&!error&&<div className="space-y-5"><Collection title="Trending now" apps={trending}/><Collection title="New this week" apps={newThisWeek}/><Collection title="Recently updated" apps={recentlyUpdated}/>{recentApps.length>0&&<section><div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-semibold text-white">Recently viewed</h2><button type="button" onClick={()=>{localStorage.removeItem("luma-recent-apps");setRecentApps([])}} className="text-xs text-slate-500 hover:text-white">Clear</button></div><div className="flex gap-3 overflow-x-auto pb-2">{recentApps.map(item=><Link key={item.id} href={`/discover/${encodeURIComponent(item.package_name||item.id)}`} className="glass-action flex min-w-48 items-center gap-3 p-3">{item.icon_url?<img src={item.icon_url} alt="" className="h-10 w-10 rounded-xl object-cover"/>:<span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10">{appInitials(item.name)}</span>}<span className="truncate text-sm font-medium">{item.name}</span></Link>)}</div></section>}</div>}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="ui-panel p-5"><div className="flex gap-4"><div className="h-14 w-14 animate-pulse rounded-2xl bg-slate-800/80"/><div className="flex-1 space-y-2 pt-1"><div className="h-5 w-2/3 animate-pulse rounded bg-slate-800/80"/><div className="h-3 w-1/2 animate-pulse rounded bg-slate-800/60"/></div></div><div className="mt-5 h-14 animate-pulse rounded-xl bg-slate-800/50"/><div className="mt-5 h-8 animate-pulse rounded-xl bg-slate-800/40"/></div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-500/25 bg-rose-950/20 p-6 text-rose-200">{error}</div>
      ) : filteredApps.length === 0 ? (
        <div className="ui-empty sm:p-12"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-2xl">⌕</div><h2 className="mt-4 text-lg font-semibold text-white">No apps found</h2><p className="mt-2 text-sm text-slate-400">Try another search or clear the active filters.</p>{hasFilters&&<button type="button" onClick={resetFilters} className="ui-button-primary mt-5 px-4 py-2 text-sm">Clear filters</button>}</div>
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
              const metric = metrics[app.id];
              const ageDays = app.created_at
                ? Math.floor((Date.now() - new Date(app.created_at).getTime()) / 86400000)
                : 9999;
              const updateDays = app.updated_at
                ? Math.floor((Date.now() - new Date(app.updated_at).getTime()) / 86400000)
                : 9999;

              return (
                <Link
                  key={app.id}
                  href={`/discover/${encodeURIComponent(app.package_name || app.id)}`}
                  className="group ui-panel p-5 transition-colors hover:border-indigo-400/30 hover:bg-[#151f2b]"
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

function Collection({ title, apps }: { title: string; apps: StoreApp[] }) {
  if (!apps.length) return null;

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold text-white">{title}</h2>
      <div className="flex snap-x gap-3 overflow-x-auto pb-2">
        {apps.map((app) => {
          const name = app.name || app.package_name || "Untitled app";

          return (
            <Link
              key={app.id}
              href={`/discover/${encodeURIComponent(app.package_name || app.id)}`}
              className="glass-action flex min-w-56 snap-start items-center gap-3 p-3"
            >
              <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-slate-900">
                {app.icon_url ? (
                  <img src={app.icon_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full items-center justify-center text-xs font-bold text-indigo-200">
                    {appInitials(name)}
                  </span>
                )}
              </div>

              <div className="min-w-0">
                <strong className="block truncate text-sm text-white">{name}</strong>
                <span className="block truncate text-xs text-slate-500">
                  {app.developer_name || app.package_name || "Unknown developer"}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}