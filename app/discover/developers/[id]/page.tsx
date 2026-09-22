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

export default function DiscoverDeveloperPage() {
  const params = useParams<{ id: string }>();
  const supabase = useMemo(() => createClient(), []);
  const [apps, setApps] = useState<StoreApp[]>([]);
  const [totalDownloads, setTotalDownloads] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const identifier = decodeURIComponent(params.id);
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identifier);
      const result = await supabase.from("store_apps").select("id,name,short_description,description,developer_name,developer_id,icon_url,version,package_name,license_type,categories,updated_at").eq(isUuid ? "developer_id" : "developer_name", identifier).order("updated_at", { ascending: false });
      if (cancelled) return;
      if (result.error) { setError(result.error.message); setApps([]); }
      else {
        const rows = (result.data ?? []) as StoreApp[];
        setApps(rows);
        const ids = rows.map((app) => app.id);
        if (ids.length) {
          const events = await supabase.from("luma_download_events").select("id", { count: "exact", head: true }).in("app_id", ids);
          if (!events.error) setTotalDownloads(events.count ?? 0);
        } else setTotalDownloads(0);
      }
      setLoading(false);
    }
    void load();
    return () => { cancelled = true; };
  }, [params.id, supabase]);

  if (loading) return <div className="glass-page mx-auto h-80 max-w-6xl animate-pulse rounded-3xl border border-slate-800 bg-slate-900/60" />;
  if (error || apps.length === 0) return <div className="glass-page mx-auto max-w-3xl rounded-2xl border border-rose-500/25 bg-rose-950/20 p-6"><h1 className="text-xl font-semibold text-rose-200">Developer not found</h1><p className="mt-2 text-sm text-rose-100/70">{error || "No published apps were found for this developer."}</p><Link href="/discover" className="mt-4 inline-flex text-sm font-medium text-indigo-300">← Back to Discover</Link></div>;

  const developerName = apps.find((app) => app.developer_name)?.developer_name || "Luma Store developer";
  return <div className="glass-page mx-auto max-w-6xl space-y-8 pb-20">
    <Link href="/discover" className="inline-flex text-sm font-medium text-indigo-300 hover:text-indigo-200">← Back to Discover</Link>
    <section className="rounded-3xl border border-indigo-400/15 bg-gradient-to-br from-indigo-500/15 via-slate-900 to-violet-500/10 p-6 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-200">Luma Store Developer</p>
      <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl">{developerName}</h1>
      <p className="mt-2 text-sm text-slate-400">{apps.length} published {apps.length === 1 ? "app" : "apps"} · {totalDownloads === null ? "—" : totalDownloads.toLocaleString()} total downloads</p>
    </section>
    <section><div className="mb-4"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Published apps</p><h2 className="mt-1 text-2xl font-bold text-white">Apps by {developerName}</h2></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{apps.map((app) => { const name=app.name||app.package_name||"Untitled app"; return <Link key={app.id} href={`/discover/${encodeURIComponent(app.package_name || app.id)}`} className="group rounded-2xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-indigo-400/40 hover:bg-slate-900">
        <div className="flex items-start gap-4">{app.icon_url ? <img src={app.icon_url} alt={`${name} icon`} className="h-16 w-16 rounded-2xl border border-slate-700 bg-slate-950 object-cover" /> : <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-700 bg-slate-950 text-xl font-bold text-indigo-200">{name.slice(0,1).toUpperCase()}</div>}<div className="min-w-0"><h3 className="truncate font-semibold text-white group-hover:text-indigo-200">{name}</h3><p className="mt-1 text-xs text-slate-500">{app.version ? `Version ${app.version}` : app.package_name}</p></div></div>
        <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-400">{app.short_description || app.description || "No description available."}</p>
        <div className="mt-4 flex flex-wrap gap-2">{app.license_type && <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-200">{app.license_type}</span>}{app.categories?.slice(0,2).map((category)=><span key={category} className="rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-300">{category}</span>)}</div>
      </Link>; })}</div>
    </section>
  </div>;
}
