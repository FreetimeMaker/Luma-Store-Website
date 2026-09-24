"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type AppStat = {
  id: string;
  name: string | null;
  package_name: string | null;
  downloads: number;
};

type PlatformStat = {
  platform: string;
  downloads: number;
};

type AppPlatformStat = {
  app_id: string;
  name: string | null;
  package_name: string | null;
  platform: string;
  downloads: number;
};

type DailyStat = {
  download_day: string;
  app_id: string;
  platform: string;
  downloads: number;
};

type FundingStat = {
  provider: string;
  clicks: number;
};

type Analytics = {
  total_downloads: number;
  apps: AppStat[];
  platforms: PlatformStat[];
  app_platforms: AppPlatformStat[];
  daily: DailyStat[];
  funding: FundingStat[];
};

type DailyPoint = {
  download_day: string;
  downloads: number;
};

function formatNumber(value: number) {
  return Number(value || 0).toLocaleString();
}

function dayKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildDailySeries(rows: DailyStat[], days: number) {
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - (days - 1));

  const totals = new Map<string, number>();

  for (const row of rows) {
    const key = String(row.download_day).slice(0, 10);
    if (new Date(`${key}T12:00:00`) < cutoff) continue;
    totals.set(key, (totals.get(key) || 0) + Number(row.downloads || 0));
  }

  return Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - (days - 1 - index));

    const key = dayKey(date);
    return {
      download_day: key,
      downloads: totals.get(key) || 0,
    };
  });
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-panel p-5">
      <p className="text-xs uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-2 break-words text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

function DataTable({
  title,
  rows,
  empty,
}: {
  title: string;
  rows: string[][];
  empty: string;
}) {
  return (
    <section className="glass-panel p-5 sm:p-6">
      <h2 className="text-xl font-semibold text-white">{title}</h2>

      {rows.length ? (
        <div className="mt-4 divide-y divide-white/10">
          {rows.map((row, index) => (
            <div
              key={row[0] + index}
              className="flex items-center justify-between gap-4 py-3 text-sm"
            >
              <span className="min-w-0 truncate text-slate-300">{row[0]}</span>
              <strong className="shrink-0 text-white">{row[1]}</strong>
            </div>
          ))}
        </div>
      ) : (
        <div className="ui-empty mt-4 p-6 text-sm">{empty}</div>
      )}
    </section>
  );
}

function BarChart({
  points,
  max,
}: {
  points: DailyPoint[];
  max: number;
}) {
  return (
    <div className="mt-6 flex h-48 items-end gap-1 overflow-visible">
      {points.map((point, index) => (
        <div
          key={point.download_day}
          className="group relative flex h-full min-w-0 flex-1 items-end"
        >
          <div
            className="relative w-full rounded-t-md bg-indigo-500/65 transition group-hover:bg-indigo-400"
            style={{
              height: `${point.downloads ? Math.max(5, (point.downloads / max) * 100) : 2}%`,
            }}
          >
            <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden min-w-max -translate-x-1/2 rounded-lg border border-white/10 bg-[#080c12] px-3 py-2 text-left group-hover:block">
              <p className="text-xs text-slate-400">{point.download_day}</p>
              <p className="mt-1 text-sm font-bold text-white">
                {formatNumber(point.downloads)} download{point.downloads === 1 ? "" : "s"}
              </p>
            </div>

            {(index === 0
              || index === Math.floor((points.length - 1) / 2)
              || index === points.length - 1) && (
              <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] text-slate-600">
                {point.download_day.slice(5)}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const supabase = useMemo(() => createClient(), []);

  const [data, setData] = useState<Analytics | null>(null);
  const [days, setDays] = useState(30);
  const [appFilter, setAppFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAnalytics() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setError("Sign in to view developer analytics.");
        setLoading(false);
        return;
      }

      const result = await supabase.rpc("luma_my_developer_analytics");

      if (result.error) {
        setError(result.error.message);
      } else {
        setData(result.data as Analytics);
      }

      setLoading(false);
    }

    void loadAnalytics();
  }, [supabase]);

  if (loading) {
    return (
      <div className="glass-page mx-auto max-w-6xl space-y-5 pb-20">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-800/70" />
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="glass-panel h-28 animate-pulse" />
          ))}
        </div>
        <div className="glass-panel h-64 animate-pulse" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="glass-page mx-auto max-w-3xl pb-20">
        <div className="rounded-xl border border-rose-500/25 bg-rose-950/25 p-6 text-rose-100">
          <h1 className="text-xl font-semibold">Analytics unavailable</h1>
          <p className="mt-2 text-sm text-rose-100/70">
            {error || "Analytics could not be loaded."}
          </p>
          <Link href="/dashboard" className="mt-4 inline-flex text-sm font-medium text-indigo-200">
            ← Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const filteredRows = data.daily.filter((row) => (
    (appFilter === "all" || row.app_id === appFilter)
    && (platformFilter === "all" || row.platform === platformFilter)
  ));

  const daily = buildDailySeries(filteredRows, days);
  const maxDaily = Math.max(1, ...daily.map((point) => point.downloads));
  const periodTotal = daily.reduce((sum, point) => sum + point.downloads, 0);

  const platformOptions = Array.from(
    new Set([
      ...data.platforms.map((item) => item.platform),
      ...data.daily.map((item) => item.platform),
    ]),
  ).sort();

  const selectedApp = appFilter === "all"
    ? null
    : data.apps.find((app) => app.id === appFilter);

  const scopedPlatformStats = data.app_platforms.filter(
    (row) => appFilter === "all" || row.app_id === appFilter,
  );

  const platformCards = platformOptions.map((platform) => ({
    platform,
    downloads: scopedPlatformStats
      .filter((row) => row.platform === platform)
      .reduce((sum, row) => sum + Number(row.downloads || 0), 0),
  }));

  const topApp = data.apps[0];

  return (
    <div className="glass-page mx-auto max-w-6xl space-y-6 pb-20">
      <div>
        <Link href="/dashboard" className="text-sm text-indigo-300">
          ← Dashboard
        </Link>

        <section className="glass-panel mt-4 p-5 sm:p-8">
          <p className="ui-eyebrow">Private developer analytics</p>
          <h1 className="ui-title mt-1 text-3xl">Analytics</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Download activity for your published apps and clicks on your funding links.
            Only your developer account can access these statistics.
          </p>
        </section>
      </div>

      <section className="glass-panel grid gap-3 p-4 sm:grid-cols-3">
        <select value={days} onChange={(event) => setDays(Number(event.target.value))} className="glass-input">
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>

        <select value={appFilter} onChange={(event) => setAppFilter(event.target.value)} className="glass-input">
          <option value="all">All apps</option>
          {data.apps.map((app) => (
            <option key={app.id} value={app.id}>
              {app.name || app.package_name || "App"}
            </option>
          ))}
        </select>

        <select value={platformFilter} onChange={(event) => setPlatformFilter(event.target.value)} className="glass-input">
          <option value="all">All platforms</option>
          {platformOptions.map((platform) => (
            <option key={platform} value={platform}>{platform}</option>
          ))}
        </select>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="All-time downloads" value={formatNumber(data.total_downloads)} />
        <StatCard label={`Last ${days} days`} value={formatNumber(periodTotal)} />
        <StatCard
          label="Top app"
          value={topApp
            ? `${topApp.name || topApp.package_name || "App"} · ${formatNumber(topApp.downloads)}`
            : "—"}
        />
      </div>

      <section className="glass-panel p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500">Downloads</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Last {days} days</h2>
          </div>
          <span className="ui-badge">{formatNumber(periodTotal)} total</span>
        </div>

        <BarChart points={daily} max={maxDaily} />
        <div className="h-5" />
      </section>

      <section className="glass-panel p-5 sm:p-6">
        <p className="text-xs uppercase tracking-wider text-slate-500">Platform analytics</p>
        <h2 className="mt-1 text-xl font-semibold text-white">
          {selectedApp
            ? `${selectedApp.name || selectedApp.package_name || "App"} · downloads by platform`
            : "Downloads by platform"}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {selectedApp
            ? "All-time platform totals for the selected app."
            : "All-time totals across all of your published apps."}
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {platformCards.map((item) => (
            <div key={item.platform} className="ui-panel-muted p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                {item.platform}
              </p>
              <p className="mt-2 text-2xl font-bold text-white">
                {formatNumber(item.downloads)}
              </p>
              <p className="mt-1 text-xs text-slate-600">all-time downloads</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <DataTable
          title="Downloads by app"
          rows={data.apps.map((item) => [
            item.name || item.package_name || "App",
            formatNumber(item.downloads),
          ])}
          empty="No published apps yet."
        />
        <DataTable
          title="Downloads by platform"
          rows={platformCards.map((item) => [
            item.platform,
            formatNumber(item.downloads),
          ])}
          empty="No platform downloads yet."
        />
      </div>

      <DataTable
        title="Downloads by app & platform"
        rows={data.app_platforms.map((item) => [
          `${item.name || item.package_name || "App"} · ${item.platform}`,
          formatNumber(item.downloads),
        ])}
        empty="No per-platform app downloads yet."
      />

      <DataTable
        title="Funding link clicks"
        rows={data.funding.map((item) => [
          item.provider,
          formatNumber(item.clicks),
        ])}
        empty="No funding link clicks yet."
      />
    </div>
  );
}
