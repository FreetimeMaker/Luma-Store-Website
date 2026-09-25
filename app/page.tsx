"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { fetchFastlaneIconUrl } from "@/lib/luma/fastlane";
import { detectClientPlatform } from "@/lib/client-platform";

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

type PlatformListing = {
  title: string;
  shortDescription: string;
  fullDescription: string;
  featureGraphic: string | null;
};

function platformListingKey(appId: string, platform: string) {
  return `${appId}:${platform.toLowerCase()}`;
}

function platformListingFromMetadata(value: unknown): PlatformListing | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const title = typeof row.title === "string" ? row.title.trim() : "";
  const shortDescription = typeof row.shortDescription === "string"
    ? row.shortDescription.trim()
    : typeof row.short_description === "string"
      ? row.short_description.trim()
      : "";
  const fullDescription = typeof row.fullDescription === "string"
    ? row.fullDescription.trim()
    : typeof row.full_description === "string"
      ? row.full_description.trim()
      : "";
  const featureGraphicValue = row.featureGraphic ?? row.feature_graphic;
  const featureGraphic = typeof featureGraphicValue === "string" && featureGraphicValue.trim()
    ? featureGraphicValue.trim()
    : null;

  return title || shortDescription || fullDescription || featureGraphic
    ? { title, shortDescription, fullDescription, featureGraphic }
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
  const [platform, setPlatform] = useState("Android");
  const [sort, setSort] = useState("trending");
  const [metrics, setMetrics] = useState<Record<string, DiscoverMetric>>({});
  const [ratings, setRatings] = useState<Record<string, RatingSummary>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recentApps, setRecentApps] = useState<RecentApp[]>([]);
  const [fastlaneIconMap, setFastlaneIconMap] = useState<Record<string, string>>({});
  const [platformListings, setPlatformListings] = useState<Record<string, PlatformListing>>({});

  useEffect(() => {
    const query = searchParams.get("search") ?? "";
    if (query) {
      setSearch(query);
    }
  }, [searchParams]);

  useEffect(() => {
    const detectedPlatform = detectClientPlatform();
    if (detectedPlatform === "Android" || detectedPlatform === "Linux") {
      setPlatform(detectedPlatform);
    }
  }, []);

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
          .select("app_id,platform,listing_metadata"),
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

      const listings = Object.fromEntries(
        ((listingResult.data ?? []) as PlatformListingRow[])
          .flatMap((row) => {
            const listing = platformListingFromMetadata(row.listing_metadata);
            return listing ? [[platformListingKey(row.app_id, row.platform), listing] as const] : [];
          }),
      );
      setPlatformListings(listings);

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
    setPlatform("Android");
  }

  const platformApps = useMemo(
    () => apps.filter((app) =>
      platform === "all" || (metrics[app.id]?.platforms || []).includes(platform),
    ),
    [apps, metrics, platform],
  );

  const trending = useMemo(
    () => [...platformApps]
      .sort((a, b) =>
        Number(metrics[b.id]?.recent_downloads || 0)
        - Number(metrics[a.id]?.recent_downloads || 0),
      )
      .slice(0, 5),
    [platformApps, metrics],
  );

  const newThisWeek = useMemo(
    () => platformApps
      .filter((app) =>
        app.created_at
        && Date.now() - new Date(app.created_at).getTime() <= 7 * 86400000,
      )
      .slice(0, 5),
    [platformApps],
  );

  const recentlyUpdated = useMemo(
    () => [...platformApps]
      .sort((a, b) =>
        new Date(b.updated_at || 0).getTime()
        - new Date(a.updated_at || 0).getTime(),
      )
      .slice(0, 5),
    [platformApps],
  );

  const hasActiveSearch = search.trim().length > 0;
  const showFeaturedSection = !hasActiveSearch
    && license === "all"
    && category === "all"
    && developer === "all";

  const resolveAppIcon = (app: StoreApp) => app.icon_url || fastlaneIconMap[app.id] || null;
  const resolveListing = (app: StoreApp) => {
    if (platform !== "all") {
      return platformListings[platformListingKey(app.id, platform)] ?? null;
    }
    return platformListings[platformListingKey(app.id, "Android")]
      ?? platformListings[platformListingKey(app.id, "Linux")]
      ?? null;
  };
  const resolveFeatureGraphic = (app: StoreApp) => resolveListing(app)?.featureGraphic ?? null;

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

      const listing = platform === "all"
        ? platformListings[platformListingKey(app.id, "Android")]
          ?? platformListings[platformListingKey(app.id, "Linux")]
          ?? null
        : platformListings[platformListingKey(app.id, platform)] ?? null;
      const haystack = [
        listing?.title || "",
        app.name || "",
        app.package_name || "",
        app.developer_name || "",
        app.subcategory || "",
        ...(Array.isArray(app.categories) ? app.categories : []),
        listing?.shortDescription || "",
        listing?.fullDescription || "",
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

        const listing = platform === "all"
          ? platformListings[platformListingKey(app.id, "Android")]
            ?? platformListings[platformListingKey(app.id, "Linux")]
            ?? null
          : platformListings[platformListingKey(app.id, platform)] ?? null;
        const name = (listing?.title || app.name || "").toLowerCase();
        const packageName = (app.package_name || "").toLowerCase();
        const developerName = (app.developer_name || "").toLowerCase();
        const categoryText = [app.subcategory || "", ...(Array.isArray(app.categories) ? app.categories : [])].join(" ").toLowerCase();
        const description = [listing?.shortDescription || "", listing?.fullDescription || "", app.short_description || "", app.description || ""].join(" ").toLowerCase();

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
  }, [apps, category, developer, license, search, platform, sort, metrics, platformListings]);

  const featuredApps = filteredApps.slice(0, 3);
  const visibleRecentApps = recentApps.filter((item) =>
    platform === "all" || (metrics[item.id]?.platforms || []).includes(platform),
  );

  return (
    <div className="store-page mx-auto max-w-[1440px] space-y-8 pb-14 pt-1 sm:space-y-10 sm:pb-20">
      <section className="space-y-3">
        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-white/[0.025] p-1 sm:flex sm:w-fit sm:items-center sm:gap-2 sm:border-0 sm:bg-transparent sm:p-0">
          <button
            type="button"
            onClick={() => setPlatform("Linux")}
            aria-pressed={platform === "Linux"}
            className={`store-chip min-h-11 w-full rounded-xl px-3 text-center sm:w-auto sm:rounded-none ${platform === "Linux" ? "active store-chip-active bg-indigo-500/10 sm:bg-transparent" : ""}`}
          >
            <span className="flex items-center justify-center gap-2">
              <img src="/desktop.png" alt="" className="h-4 w-4 object-contain" />
              <span>Linux-PC</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => setPlatform("Android")}
            aria-pressed={platform === "Android"}
            className={`store-chip min-h-11 w-full rounded-xl px-3 text-center sm:w-auto sm:rounded-none ${platform === "Android" ? "active store-chip-active bg-indigo-500/10 sm:bg-transparent" : ""}`}
          >
            <span className="flex items-center justify-center gap-2">
              <img src="/android.png" alt="" className="h-4 w-4 object-contain" />
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
            <div className="grid gap-4 pb-3 sm:gap-5 md:grid-cols-2 xl:grid-cols-3">
              {featuredApps.map((app) => (
                <div key={app.id} className="w-full">
                  <PlayStoreCard
                    app={app}
                    iconSrc={resolveAppIcon(app)}
                    featureGraphic={resolveFeatureGraphic(app)}
                    rating={ratings[app.id]}
                    listing={resolveListing(app)}
                  />
                </div>
              ))}
            </div>
          )}

          {!hasActiveSearch && (
            <div className="space-y-10">
              <Collection title="Recommended for you" apps={trending} ratings={ratings} resolveIcon={resolveAppIcon} resolveListing={resolveListing} />
              <Collection title="New & updated" apps={recentlyUpdated} ratings={ratings} resolveIcon={resolveAppIcon} resolveListing={resolveListing} />
            </div>
          )}

          <section>
            <div className="grid gap-x-10 gap-y-2 md:grid-cols-2">
              {filteredApps.map((app, index) => (
                <PlayStoreCard
                  key={app.id}
                  app={app}
                  iconSrc={resolveAppIcon(app)}
                  featureGraphic={resolveFeatureGraphic(app)}
                  rating={ratings[app.id]}
                  listing={resolveListing(app)}
                  rank={sort === "downloads" ? index + 1 : undefined}
                  downloads={Number(metrics[app.id]?.total_downloads || 0)}
                  showThumbnail={false}
                />
              ))}
            </div>
          </section>

          {!hasActiveSearch && visibleRecentApps.length > 0 && (
            <section>
              <div className="mb-4 flex items-center justify-between gap-4">
                <h2 className="text-xl font-semibold text-white sm:text-2xl">Recently viewed</h2>
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem("luma-recent-apps");
                    setRecentApps([]);
                  }}
                  className="min-h-10 shrink-0 rounded-xl px-3 text-sm font-medium text-indigo-300 transition hover:bg-indigo-500/10 hover:text-indigo-200"
                >
                  Clear
                </button>
              </div>

              <div className="divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
                {visibleRecentApps.map((item) => {
                  const currentApp = apps.find((app) => app.id === item.id);
                  const listing = currentApp ? resolveListing(currentApp) : null;
                  const displayName = listing?.title || item.name;
                  const iconSrc = currentApp ? resolveAppIcon(currentApp) : item.icon_url;
                  const rating = ratings[item.id];
                  const downloads = Number(metrics[item.id]?.total_downloads || 0);

                  return (
                    <Link
                      key={item.id}
                      href={`/${encodeURIComponent(item.package_name || item.id)}`}
                      className="group flex min-w-0 items-center gap-3 px-3 py-3 transition hover:bg-white/[0.035] sm:px-4 sm:py-3.5"
                    >
                      {iconSrc ? (
                        <img
                          src={iconSrc}
                          alt=""
                          className="h-12 w-12 shrink-0 rounded-xl object-cover sm:h-14 sm:w-14"
                        />
                      ) : (
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-sm font-semibold text-indigo-200 sm:h-14 sm:w-14">
                          {appInitials(displayName)}
                        </span>
                      )}

                      <div className="min-w-0 flex-1">
                        <strong className="block truncate text-sm font-semibold text-white group-hover:text-indigo-200">
                          {displayName}
                        </strong>
                        <span className="mt-0.5 block truncate text-xs text-slate-400">
                          {listing?.shortDescription
                            || currentApp?.short_description
                            || currentApp?.developer_name
                            || item.package_name
                            || "Recently viewed"}
                        </span>
                        <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                          <span>{rating ? `${rating.average.toFixed(1)} ★` : "— ★"}</span>
                          {downloads > 0 && <span>· {compactDownloads(downloads)} downloads</span>}
                          <span className="hidden sm:inline">· Recently viewed</span>
                        </div>
                      </div>

                      <span className="shrink-0 text-lg text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-indigo-300" aria-hidden="true">›</span>
                    </Link>
                  );
                })}
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
  listing,
  rating,
  rank,
  downloads,
  showThumbnail = true,
}: {
  app: StoreApp;
  iconSrc: string | null;
  featureGraphic: string | null;
  listing?: PlatformListing | null;
  rating?: RatingSummary;
  rank?: number;
  downloads?: number;
  showThumbnail?: boolean;
}) {
  const name = listing?.title || app.name || app.package_name || "Untitled app";

  return (
    <Link
      href={`/${encodeURIComponent(app.package_name || app.id)}`}
      className="group block min-w-0"
    >
      {showThumbnail ? (
        <div className="mx-auto aspect-[16/9] w-full max-w-[458px] overflow-hidden rounded-2xl bg-[#101722] shadow-[0_1px_2px_rgba(0,0,0,0.22)] sm:aspect-[457.91/330.56]">
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
      ) : (
        <div className="flex min-w-0 items-center gap-3 rounded-xl px-1 py-2.5 transition group-hover:bg-white/[0.035] sm:px-2">
          {rank !== undefined && (
            <span className="w-6 shrink-0 text-right text-sm font-semibold text-slate-500">{rank}</span>
          )}
          <div className="relative shrink-0">
            {iconSrc ? (
              <img
                src={iconSrc}
                alt={`${name} icon`}
                className="h-12 w-12 rounded-[0.8rem] object-cover shadow-[0_4px_14px_rgba(0,0,0,0.18)] sm:h-14 sm:w-14 sm:rounded-[0.9rem]"
              />
            ) : (
              <span className="flex h-12 w-12 items-center justify-center rounded-[0.8rem] bg-[#101722] text-sm font-bold text-indigo-200 sm:h-14 sm:w-14 sm:rounded-[0.9rem]">
                {appInitials(name)}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[13px] font-semibold text-white group-hover:text-indigo-200 sm:text-sm">{name}</h3>
            <p className="mt-0.5 truncate text-[11px] text-slate-400 sm:text-xs">
              {listing?.shortDescription || app.short_description || app.developer_name || app.package_name || "No description"}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
              <span>{rating ? `${rating.average.toFixed(1)} ★` : "— ★"}</span>
              {downloads !== undefined && downloads > 0 && <span>· {compactDownloads(downloads)} downloads</span>}
            </div>
          </div>
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
  resolveListing,
}: {
  title: string;
  apps: StoreApp[];
  ratings: Record<string, RatingSummary>;
  resolveIcon: (app: StoreApp) => string | null;
  resolveListing: (app: StoreApp) => PlatformListing | null;
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

      <div className="space-y-2 md:hidden">
        {apps.slice(0, 9).map((app, index) => {
          const listing = resolveListing(app);
          const name = listing?.title || app.name || app.package_name || "Untitled app";
          const rating = ratings[app.id];
          const iconSrc = resolveIcon(app);
          return (
            <Link
              key={app.id}
              href={`/${encodeURIComponent(app.package_name || app.id)}`}
              className="group flex min-w-0 items-center gap-3 rounded-xl px-1 py-2.5 transition hover:bg-white/[0.035]"
            >
              <div className="w-6 shrink-0 text-right text-sm font-bold text-slate-400">{index + 1}</div>
              {iconSrc ? (
                <img src={iconSrc} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
              ) : (
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#101722] text-sm font-bold text-indigo-200">
                  {appInitials(name)}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-white">{name}</div>
                <div className="mt-0.5 truncate text-xs text-slate-400">
                  {listing?.shortDescription || app.subcategory || app.developer_name || "View app"}
                </div>
                <div className="mt-1 text-[11px] text-slate-500">{rating ? rating.average.toFixed(1) : "—"} ★</div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="hidden gap-4 md:grid md:grid-cols-3">
        {paddedColumns.map(({ columnIndex, items }) => (
          <div key={columnIndex} className="space-y-2">
            {items.map((app, itemIndex) => {
              if (!app) {
                return <div key={`empty-${columnIndex}-${itemIndex}`} className="h-[78px]" />;
              }

              const listing = resolveListing(app);
              const name = listing?.title || app.name || app.package_name || "Untitled app";
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
                      <span aria-hidden="true">★</span>
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
