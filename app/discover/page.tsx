"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { fetchFastlaneIconUrl } from "@/lib/luma/fastlane";

type StoreApp = {
  id: string;
  name: string | null;
  short_description: string | null;
  description: string | null;
  developer_name: string | null;
  icon_url: string | null;
  version: string | null;
  package_name: string | null;
  repo_url: string | null;
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

type PlatformListingRow = {
  app_id: string;
  platform: string;
  listing_metadata: unknown;
};

function featureGraphicFromMetadata(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const featureGraphic = row.featureGraphic ?? row.feature_graphic;
  return typeof featureGraphic === "string" && featureGraphic.trim()
    ? featureGraphic.trim()
    : null;
}

function appInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function DiscoverContent() {
  const supabase = useMemo(() => createClient(), []);
  const searchParams = useSearchParams();
  const [apps, setApps] = useState<StoreApp[]>([]);
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [license, setLicense] = useState("all");
  const [category, setCategory] = useState("all");
  const [developer, setDeveloper] = useState("all");
  const [platform, setPlatform] = useState("all");
  const [sort, setSort] = useState("trending");
  const [metrics, setMetrics] = useState<Record<string, DiscoverMetric>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recentApps, setRecentApps] = useState<RecentApp[]>([]);
  const [fastlaneIconMap, setFastlaneIconMap] = useState<Record<string, string>>({});
  const [featureGraphics, setFeatureGraphics] = useState<Record<string, string>>({});
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const query = searchParams.get("search") ?? "";
    if (query) {
      setSearch(query);
    }
  }, [searchParams]);

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
        const loadedApps = (data ?? []) as StoreApp[];
        setApps(loadedApps);

        const [metricResult, listingResult] = await Promise.all([
          supabase.rpc("luma_discover_metrics"),
          supabase
            .from("store_app_platforms")
            .select("app_id,platform,listing_metadata")
            .eq("platform", "Android"),
        ]);

        if (!cancelled) {
          setMetrics(
            Object.fromEntries(
              ((metricResult.data ?? []) as DiscoverMetric[]).map((row) => [row.app_id, row]),
            ),
          );

          const graphics = Object.fromEntries(
            ((listingResult.data ?? []) as PlatformListingRow[])
              .map((row) => [row.app_id, featureGraphicFromMetadata(row.listing_metadata)] as const)
              .filter((entry): entry is readonly [string, string] => Boolean(entry[1])),
          );
          setFeatureGraphics(graphics);
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

  const hasActiveSearch = search.trim().length > 0;

  const resolveAppIcon = (app: StoreApp) => app.icon_url || fastlaneIconMap[app.id] || null;

  useEffect(() => {
    let cancelled = false;

    async function loadFastlaneIcons() {
      const missing = apps.filter((app) => !app.icon_url && app.repo_url);
      if (!missing.length) {
        if (!cancelled) setFastlaneIconMap({});
        return;
      }

      const nextMap: Record<string, string> = {};
      for (const app of missing) {
        const iconUrl = await fetchFastlaneIconUrl(app.repo_url);
        if (!cancelled && iconUrl) {
          nextMap[app.id] = iconUrl;
        }
      }

      if (!cancelled) setFastlaneIconMap(nextMap);
    }

    void loadFastlaneIcons();
    return () => {
      cancelled = true;
    };
  }, [apps]);

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

      const haystack = [
        app.name || "",
        app.package_name || "",
        app.developer_name || "",
        app.subcategory || "",
        ...(Array.isArray(app.categories) ? app.categories : []),
        app.short_description || "",
        app.description || "",
      ].join(" ").toLowerCase();

      return haystack.includes(query);
    });

    return result
      .map((app) => {
        if (!query) {
          return { app, relevance: 0 };
        }

        const name = (app.name || "").toLowerCase();
        const packageName = (app.package_name || "").toLowerCase();
        const developerName = (app.developer_name || "").toLowerCase();
        const categoryText = [app.subcategory || "", ...(Array.isArray(app.categories) ? app.categories : [])].join(" ").toLowerCase();
        const description = [app.short_description || "", app.description || ""].join(" ").toLowerCase();

        let relevance = 0;

        if (name === query || packageName === query) relevance += 100;
        if (name.startsWith(query) || packageName.startsWith(query)) relevance += 60;
        if (name.includes(query) || packageName.includes(query)) relevance += 35;
        if (developerName.includes(query)) relevance += 20;
        if (categoryText.includes(query)) relevance += 15;
        if (description.includes(query)) relevance += 10;

        return { app, relevance };
      })
      .filter(({ relevance }) => query ? relevance > 0 : true)
      .sort((a, b) => {
        const relevanceDiff = b.relevance - a.relevance;
        if (relevanceDiff !== 0) return relevanceDiff;

        const aMetric = metrics[a.app.id];
        const bMetric = metrics[b.app.id];

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
          return new Date(b.app.created_at || 0).getTime()
            - new Date(a.app.created_at || 0).getTime();
        }

        if (sort === "updated") {
          return new Date(b.app.updated_at || 0).getTime()
            - new Date(a.app.updated_at || 0).getTime();
        }

        return (a.app.name || "").localeCompare(b.app.name || "");
      })
      .map(({ app }) => app);
  }, [apps, category, developer, license, search, platform, sort, metrics]);

  return (
    <div className="glass-page mx-auto max-w-6xl space-y-8 pb-20 pt-4 sm:pt-8">
      {!loading && !error && (
        <div className="space-y-5">
          {!hasActiveSearch && <Collection title="Trending now" apps={trending} />}
          {!hasActiveSearch && <Collection title="New this week" apps={newThisWeek} />}
          {!hasActiveSearch && <Collection title="Recently updated" apps={recentlyUpdated} />}

          {!hasActiveSearch && recentApps.length > 0 && (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Recently viewed</h2>
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem("luma-recent-apps");
                    setRecentApps([]);
                  }}
                  className="text-xs text-slate-500 hover:text-white"
                >
                  Clear
                </button>
              </div>

              <div className="flex gap-3 overflow-x-auto pb-2">
                {recentApps.map((item) => (
                  <Link
                    key={item.id}
                    href={`/discover/${encodeURIComponent(item.package_name || item.id)}`}
                    className="glass-action flex min-w-48 items-center gap-3 p-3"
                  >
                    {item.icon_url ? (
                      <img src={item.icon_url} alt="" className="h-10 w-10 rounded-xl object-cover" />
                    ) : (
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10">
                        {appInitials(item.name)}
                      </span>
                    )}
                    <span className="truncate text-sm font-medium">{item.name}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

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
          {!hasActiveSearch && (
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Catalog</p>
                <h2 className="mt-1 text-2xl font-bold text-white">{sort==="trending"?"Trending":sort==="new"?"New releases":sort==="updated"?"Recently updated":sort==="downloads"?"Most downloaded":"All apps"}</h2>
              </div>
              <span className="text-sm text-slate-500">{filteredApps.length} apps</span>
            </div>
          )}

          {hasActiveSearch && (
            <div className="mb-4 flex justify-end">
              <span className="text-sm text-slate-500">{filteredApps.length} apps</span>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredApps.map((app) => {
              const name = app.name?.trim() || app.package_name || "Untitled app";
              const iconSrc = resolveAppIcon(app);
              const featureGraphic = featureGraphics[app.id] || null;

              return (
                <Link
                  key={app.id}
                  href={`/discover/${encodeURIComponent(app.package_name || app.id)}`}
                  className="group block overflow-hidden rounded-2xl border border-white/10 bg-[#101722] transition duration-300 hover:border-indigo-400/30 hover:bg-[#131d29]"
                >
                  <div className="aspect-[1024/500] w-full overflow-hidden bg-slate-950">
                    {featureGraphic ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={featureGraphic}
                        alt={`${name} feature graphic`}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.01]"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-900 to-slate-950 text-sm font-medium text-slate-600">
                        No feature graphic
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4 p-4">
                    <div className="relative shrink-0">
                      <div
                        aria-hidden="true"
                        className="absolute inset-1 rounded-2xl bg-indigo-500/25 blur-xl transition duration-300 group-hover:bg-indigo-400/35"
                      />
                      {iconSrc ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={iconSrc}
                          alt={`${name} icon`}
                          className="relative h-16 w-16 rounded-2xl border border-indigo-300/20 bg-slate-950 object-cover shadow-[0_0_24px_rgba(99,102,241,0.18)]"
                        />
                      ) : (
                        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-indigo-300/20 bg-slate-950 text-sm font-bold text-indigo-200 shadow-[0_0_24px_rgba(99,102,241,0.18)]">
                          {appInitials(name) || "A"}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-lg font-semibold text-white transition group-hover:text-indigo-200">
                        {name}
                      </h3>
                      <p className="mt-1 truncate text-sm text-slate-400">
                        {app.developer_name || app.package_name || "Unknown developer"}
                      </p>
                    </div>
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


export default function DiscoverPage() {
  return (
    <Suspense
      fallback={
        <div className="glass-page mx-auto max-w-6xl space-y-5 pb-20">
          <div className="glass-panel h-36 animate-pulse" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="glass-panel h-40 animate-pulse" />
            ))}
          </div>
        </div>
      }
    >
      <DiscoverContent />
    </Suspense>
  );
}
