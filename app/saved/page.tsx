"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type SavedApp = {
  app_id: string;
  created_at: string;
  app: { id: string; name: string | null; package_name: string | null; short_description: string | null; icon_url: string | null; developer_name: string | null; version: string | null } | null;
};

export default function SavedAppsPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [items, setItems] = useState<SavedApp[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login?next=/saved"); return; }
      const { data, error } = await supabase
        .from("store_saved_apps")
        .select("app_id,created_at,app:store_apps(id,name,package_name,short_description,icon_url,developer_name,version)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (!cancelled) {
        if (error) alert(error.message);
        setItems((data ?? []) as unknown as SavedApp[]);
        setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [router, supabase]);

  async function remove(appId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("store_saved_apps").delete().eq("app_id", appId).eq("user_id", user.id);
    if (error) return alert(error.message);
    setItems((current) => current.filter((item) => item.app_id !== appId));
  }

  return (
    <div className="glass-page mx-auto max-w-5xl space-y-6">
      <header className="rounded-3xl border border-indigo-400/15 bg-gradient-to-br from-indigo-500/15 via-slate-900 to-violet-500/10 p-6 sm:p-8">
        <p className="text-sm font-medium text-indigo-300">Your account</p>
        <h1 className="mt-2 text-3xl font-bold text-white">Saved Apps</h1>
        <p className="mt-2 text-slate-400">Apps saved to your Luma Store account are available anywhere you sign in.</p>
      </header>
      <section className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/55">
        {loading ? <div className="p-8 text-slate-400">Loading saved apps…</div> : items.length === 0 ? <div className="p-8 text-center"><p className="text-slate-300">You have no saved apps yet.</p><Link href="/discover" className="mt-4 inline-flex rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500">Discover apps</Link></div> :
          <div className="divide-y divide-slate-800">{items.map(({ app_id, app }) => app && <div key={app_id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
            {app.icon_url ? <img src={app.icon_url} alt="" className="h-16 w-16 rounded-2xl border border-slate-700 object-cover" /> : <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800 text-xl font-bold">{(app.name || "?")[0]}</div>}
            <div className="min-w-0 flex-1"><h2 className="font-semibold text-white">{app.name || app.package_name || "Untitled app"}</h2><p className="mt-1 text-sm text-slate-400">{app.developer_name || "Unknown developer"}{app.version ? ` · v${app.version}` : ""}</p>{app.short_description && <p className="mt-2 line-clamp-2 text-sm text-slate-500">{app.short_description}</p>}</div>
            <div className="flex gap-2"><Link href={`/discover/${encodeURIComponent(app.package_name || app.id)}`} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500">Open</Link><button type="button" onClick={() => void remove(app_id)} className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-300 hover:text-white">Remove</button></div>
          </div>)}</div>}
      </section>
    </div>
  );
}
