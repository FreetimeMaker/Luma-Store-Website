"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
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

type RatingRow = {
  app_id: string;
  rating: number;
};

type RatingSummary = {
  average: number;
  count: number;
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

function compactDownloads(value: number) {
  if (value >= 1_000_000) return `${Math.floor(value / 1_000_000)}M+`;
  if (value >= 1_000) return `${Math.floor(value / 1_000)}K+`;
  return value > 0 ? `${value}+` : "";
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
  const [ratings, setRatings] = useState<Record<string, RatingSummary>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recentApps, setRecentApps] = useState<RecentApp[]>([]);
  const [fastlaneIconMap, setFastlaneIconMap] = useState<Record<string, string>>({});
  const [featureGraphics, setFeatureGraphics] = useState<Record<string, string>>({});

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
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadApps() {
      setLoading(true);
      setError(null);

      const [appResult, metricResult, listingResult, ratingResult] = await Promise.all([
        supabase
          .from("store_apps")
          .select("id,name,short_description,description,developer_name,icon_url,version,package_name,repo_url,license_type,subcategory,categories,created_at,updated_at")
          .is("archived_at", null)
          .order("updated_at", { ascending: false }),
        supabase.rpc("luma_discover_metrics"),
        supabase
          .from("store_app_platforms")
          .select("app_id,platform,listing_metadata")
          .eq("platform", "Android"),
        supabase
          .from("store_app_ratings")
          .select("app_id,rating"),
      ]);

      if (cancelled) return;

      if (appResult.error) {
        setError(appResult.error.message);
        setApps([]);
        setLoading(false);
        return;
      }

      setApps((appResult.data ?? []) as StoreApp[]);
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

      const ratingBuckets = new Map<string, number[]>();
      for (const row of (ratingResult.data ?? []) as RatingRow[]) {
        const bucket = ratingBuckets.get(row.app_id) ?? [];
        bucket.push(Number(row.rating));
        ratingBuckets.set(row.app_id, bucket);
      }
      setRatings(
        Object.fromEntries(
          Array.from(ratingBuckets.entries()).map(([appId, values]) => [
            appId,
            {
              average: values.reduce((sum, value) => sum + value, 0) / values.length,
              count: values.length,
            },
          ]),
        ),
      );
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
  const showFeaturedSection = !hasActiveSearch
    && platform === "all"
    && license === "all"
    && category === "all"
    && developer === "all";

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

  const featuredApps = filteredApps.slice(0, 3);

  return (
    <div className="store-page mx-auto max-w-[1440px] space-y-8 pb-14 pt-1 sm:space-y-10 sm:pb-20">
      <section className="space-y-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setPlatform("Linux")}
            aria-pressed={platform === "Linux"}
            className={`store-chip shrink-0 ${platform === "Linux" ? "active store-chip-active" : ""}`}
          >
            <span className="flex items-center gap-2">
              <img src="/desktop.png" alt="Linux-PC" className="h-4 w-4 object-contain" />
              <span>Linux-PC</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => setPlatform("Android")}
            aria-pressed={platform === "Android"}
            className={`store-chip shrink-0 ${platform === "Android" ? "active store-chip-active" : ""}`}
          >
            <span className="flex items-center gap-2">
              <img src="/android.png" alt="Android" className="h-4 w-4 object-contain" />
              <span>Android</span>
            </span>
          </button>
        </div>

        {(developer !== "all" || license !== "all" || category !== "all") && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>Active filters:</span>
            {category !== "all" && <button type="button" onClick={() => setCategory("all")} className="store-chip">{category} ×</button>}
            {developer !== "all" && <button type="button" onClick={() => setDeveloper("all")} className="store-chip">{developer} ×</button>}
            {license !== "all" && <button type="button" onClick={() => setLicense("all")} className="store-chip">{license} ×</button>}
          </div>
        )}
      </section>

      {loading ? (
        <div className="space-y-8">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="overflow-hidden rounded-3xl border border-white/10 bg-[#101722]">
                <div className="aspect-[1024/500] animate-pulse bg-slate-800/60" />
                <div className="h-24 animate-pulse bg-[#101722]" />
              </div>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-24 animate-pulse rounded-2xl bg-[#101722]" />
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="store-empty text-rose-200">{error}</div>
      ) : filteredApps.length === 0 ? (
        <div className="store-empty">
          <div className="mx-auto text-3xl text-slate-500">⌕</div>
          <h2 className="mt-3 text-xl font-semibold text-white">No apps found</h2>
          <p className="mt-2 text-sm text-slate-400">Try another search or clear your filters.</p>
          {hasFilters && (
            <button type="button" onClick={resetFilters} className="store-primary mt-5">
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <>
          {showFeaturedSection && featuredApps.length > 0 && (
            <div className="grid gap-5 pb-3 md:grid-cols-2 xl:grid-cols-3">
              {featuredApps.map((app) => (
                <div key={app.id} className="w-full">
                  <PlayStoreCard
                    app={app}
                    iconSrc={resolveAppIcon(app)}
                    featureGraphic={featureGraphics[app.id] || null}
                    rating={ratings[app.id]}
                  />
                </div>
              ))}
            </div>
          )}

          {!hasActiveSearch && (
            <div className="space-y-10">
              <Collection title="Recommended for you" apps={trending} ratings={ratings} resolveIcon={resolveAppIcon} />
              <Collection title="New & updated" apps={recentlyUpdated} ratings={ratings} resolveIcon={resolveAppIcon} />
            </div>
          )}

          <section>
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-white sm:text-2xl">
                  {hasActiveSearch
                    ? `Search results for “${search.trim()}”`
                    : sort === "downloads"
                      ? "Top charts"
                      : sort === "new"
                        ? "New releases"
                        : sort === "updated"
                          ? "Recently updated"
                          : "All apps"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">{filteredApps.length} apps</p>
              </div>
            </div>

            <div className="grid gap-x-10 gap-y-2 md:grid-cols-2">
              {filteredApps.map((app, index) => (
                <PlayStoreCard
                  key={app.id}
                  app={app}
                  iconSrc={resolveAppIcon(app)}
                  featureGraphic={featureGraphics[app.id] || null}
                  rating={ratings[app.id]}
                  rank={sort === "downloads" ? index + 1 : undefined}
                  downloads={Number(metrics[app.id]?.total_downloads || 0)}
                  showThumbnail={false}
                />
              ))}
            </div>
          </section>

          {!hasActiveSearch && recentApps.length > 0 && (
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white sm:text-2xl">Recently viewed</h2>
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem("luma-recent-apps");
                    setRecentApps([]);
                  }}
                  className="text-sm font-medium text-indigo-300 hover:text-indigo-200"
                >
                  Clear
                </button>
              </div>

              <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3">
                {recentApps.map((item) => (
                  <Link
                    key={item.id}
                    href={`/${encodeURIComponent(item.package_name || item.id)}`}
                    className="group flex min-w-[17rem] snap-start items-center gap-3 rounded-2xl px-3 py-3 transition hover:bg-white/[0.035]"
                  >
                    {item.icon_url ? (
                      <img src={item.icon_url} alt="" className="h-14 w-14 rounded-2xl object-cover" />
                    ) : (
                      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 font-semibold text-indigo-200">
                        {appInitials(item.name)}
                      </span>
                    )}
                    <div className="min-w-0">
                      <strong className="block truncate text-sm text-white">{item.name}</strong>
                      <span className="mt-1 block text-xs text-slate-500">Recently viewed</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function PlayStoreCard({
  app,
  iconSrc,
  featureGraphic,
  rating,
  rank,
  downloads,
  showThumbnail = true,
}: {
  app: StoreApp;
  iconSrc: string | null;
  featureGraphic: string | null;
  rating?: RatingSummary;
  rank?: number;
  downloads?: number;
  showThumbnail?: boolean;
}) {
  const name = app.name || app.package_name || "Untitled app";

  return (
    <Link
      href={`/${encodeURIComponent(app.package_name || app.id)}`}
      className="group block min-w-0"
    >
      {showThumbnail && (
        <div className="mx-auto overflow-hidden rounded-xl bg-[#101722] shadow-[0_1px_2px_rgba(0,0,0,0.22)]" style={{ width: "100%", maxWidth: "457.91px", height: "330.56px", margin: "-8px", position: "0" }}>
          {featureGraphic ? (
            <img
              src={featureGraphic}
              alt={`${name} feature graphic`}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.012]"
            />
          ) : iconSrc ? (
            <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br from-[#131d29] to-[#0d131d]">
              <div
                aria-hidden="true"
                className="absolute h-40 w-40 rounded-[2.5rem] bg-indigo-500/20 blur-3xl"
              />
              <img
                src={iconSrc}
                alt={`${name} icon`}
                className="relative h-28 w-28 rounded-[1.75rem] object-cover shadow-[0_16px_45px_rgba(0,0,0,0.35)] sm:h-32 sm:w-32"
              />
            </div>
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#131d29] to-[#0d131d] text-5xl font-semibold text-indigo-200">
              {appInitials(name)}
            </div>
          )}
        </div>
      )}

    </Link>
  );
}

function Collection({
  title,
  apps,
  ratings,
  resolveIcon,
}: {
  title: string;
  apps: StoreApp[];
  ratings: Record<string, RatingSummary>;
  resolveIcon: (app: StoreApp) => string | null;
}) {
  if (!apps.length) return null;

  const columnSize = 3;
  const columns = [
    apps.slice(0, columnSize),
    apps.slice(columnSize, columnSize * 2),
    apps.slice(columnSize * 2, columnSize * 3),
  ];

  const paddedColumns = columns.map((columnApps, columnIndex) => {
    const items = [...columnApps];
    while (items.length < columnSize) {
      items.push(null as never);
    }
    return { columnIndex, items };
  });

  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-white sm:text-2xl">{title}</h2>
        <span className="text-sm font-medium text-indigo-300">More</span>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {paddedColumns.map(({ columnIndex, items }) => (
          <div key={columnIndex} className="space-y-2">
            {items.map((app, itemIndex) => {
              if (!app) {
                return <div key={`empty-${columnIndex}-${itemIndex}`} className="h-[78px]" />;
              }

              const name = app.name || app.package_name || "Untitled app";
              const rating = ratings[app.id];
              const iconSrc = resolveIcon(app);
              const rank = columnIndex * columnSize + itemIndex + 1;

              return (
                <Link
                  key={app.id}
                  href={`/${encodeURIComponent(app.package_name || app.id)}`}
                  className="group flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-white/[0.035]"
                >
                  <div className="w-6 shrink-0 text-right text-base font-bold text-slate-300">
                    {rank}
                  </div>

                  <div className="relative shrink-0">
                    {iconSrc ? (
                      <img
                        src={iconSrc}
                        alt=""
                        className="relative h-14 w-14 rounded-[0.9rem] object-cover shadow-[0_4px_14px_rgba(0,0,0,0.18)]"
                      />
                    ) : (
                      <span className="relative flex h-14 w-14 items-center justify-center rounded-[0.9rem] bg-[#101722] text-sm font-bold text-indigo-200">
                        {appInitials(name)}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-white">{name}</div>
                    <div className="mt-0.5 truncate text-xs text-slate-400">
                      {app.subcategory || app.developer_name || "Unknown developer"}
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-300">
                      <span>{rating ? rating.average.toFixed(1) : "—"}</span>
                      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5 fill-current text-yellow-400">
                        <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                      </svg>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}

export default function DiscoverPage() {
  return (
    <Suspense
      fallback={
        <div className="store-page mx-auto max-w-7xl space-y-5 pb-20">
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
