"use client";

import { useEffect, useMemo, useState } from "react";
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
  updated_at: string | null;
  [key: string]: unknown;
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadApps() {
      setLoading(true);
      setError(null);

      const { data, error: loadError } = await supabase
        .from("store_apps")
        .select("*")
        .order("updated_at", { ascending: false });

      if (cancelled) return;

      if (loadError) {
        setError(loadError.message);
        setApps([]);
      } else {
        setApps((data ?? []) as StoreApp[]);
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

  const filteredApps = useMemo(() => {
    const query = search.trim().toLowerCase();

    return apps.filter((app) => {
      const appCategories = Array.isArray(app.categories) ? app.categories : [];
      const matchesLicense = license === "all" || app.license_type === license;
      const matchesCategory = category === "all" || appCategories.includes(category) || app.subcategory === category;
      if (!matchesLicense || !matchesCategory) return false;
      if (!query) return true;

      return JSON.stringify(app).toLowerCase().includes(query);
    });
  }, [apps, category, license, search]);

  return (
    <div className="glass-page mx-auto max-w-6xl space-y-8">
      <section className="rounded-3xl border border-indigo-400/15 bg-gradient-to-br from-indigo-500/15 via-slate-900 to-violet-500/10 p-6 shadow-2xl shadow-indigo-950/20 sm:p-8 lg:p-10">
        <div className="max-w-3xl">
          <div className="mb-4 inline-flex items-center rounded-full border border-indigo-400/20 bg-indigo-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-200">
            Luma Store Discover
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">Discover apps</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
            Browse published apps. Click an app to open its full details, screenshots, changelog, links and metadata.
          </p>
        </div>

        <div className="mt-7 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search apps..."
            className="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-indigo-400/60 focus:ring-2 focus:ring-indigo-500/20"
          />

          <select value={category} onChange={(event) => setCategory(event.target.value)} className="min-h-12 rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-200">
            <option value="all">All categories</option>
            {categories.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>

          <select value={license} onChange={(event) => setLicense(event.target.value)} className="min-h-12 rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-200">
            <option value="all">All licenses</option>
            {licenses.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>

        </div>
      </section>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-48 animate-pulse rounded-2xl border border-slate-800 bg-slate-900/60" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-500/25 bg-rose-950/20 p-6 text-rose-200">{error}</div>
      ) : filteredApps.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center text-slate-400">No apps found.</div>
      ) : (
        <section>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Catalog</p>
              <h2 className="mt-1 text-2xl font-bold text-white">All apps</h2>
            </div>
            <span className="text-sm text-slate-500">{filteredApps.length} apps</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredApps.map((app) => {
              const name = app.name?.trim() || app.package_name || "Untitled app";

              return (
                <Link
                  key={app.id}
                  href={`/discover/${app.id}`}
                  className="group rounded-2xl border border-slate-800 bg-slate-900/60 p-5 transition hover:-translate-y-0.5 hover:border-indigo-400/30 hover:bg-slate-900/90"
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
