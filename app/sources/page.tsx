"use client";

import { useEffect, useState } from "react";

type Asset = { name: string; download_url: string; size: number | null; platform: string };
type SourceResult = { source_url: string; provider: string; version: string | null; title: string | null; published_at: string | null; assets: Asset[] };
type SavedSource = { url: string; platform: string; result?: SourceResult; error?: string };

const STORAGE_KEY = "luma-tracked-sources";
const API = "https://api.free-time.me/lumastore";

export default function SourcesPage() {
  const [url, setUrl] = useState("");
  const [platform, setPlatform] = useState("Linux");
  const [sources, setSources] = useState<SavedSource[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try { setSources(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")); } catch { setSources([]); }
  }, []);

  function persist(next: SavedSource[]) {
    setSources(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next.map(({ url, platform }) => ({ url, platform }))));
  }

  async function resolve(source: SavedSource) {
    const response = await fetch(`${API}/sources/resolve?url=${encodeURIComponent(source.url)}&platform=${encodeURIComponent(source.platform)}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || data.error || "Unable to resolve source");
    return data as SourceResult;
  }

  async function addSource() {
    const value = url.trim();
    if (!value) return;
    setBusy(true);
    try {
      const entry = { url: value, platform };
      const result = await resolve(entry);
      const next = [{ ...entry, result }, ...sources.filter(item => item.url !== value || item.platform !== platform)];
      persist(next);
      setUrl("");
    } catch (error) {
      const next = [{ url: value, platform, error: error instanceof Error ? error.message : "Unable to resolve source" }, ...sources.filter(item => item.url !== value || item.platform !== platform)];
      persist(next);
    } finally { setBusy(false); }
  }

  async function refreshAll() {
    setBusy(true);
    const next = await Promise.all(sources.map(async source => {
      try { return { ...source, result: await resolve(source), error: undefined }; }
      catch (error) { return { ...source, result: undefined, error: error instanceof Error ? error.message : "Unable to resolve source" }; }
    }));
    persist(next);
    setBusy(false);
  }

  return <main className="glass-page mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
    <section className="glass-panel p-5 sm:p-7">
      <p className="ui-eyebrow mb-2">Tracked sources</p>
      <h1 className="text-3xl font-semibold text-white">Add an app source</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Track releases directly from GitHub, GitLab, or Codeberg, or add a direct HTTPS download URL. No Luma Store developer submission is required. This is especially useful for Linux apps distributed outside a central repository.</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_10rem_auto]">
        <input className="ui-input min-w-0" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://github.com/owner/repository" />
        <select className="ui-input" value={platform} onChange={e => setPlatform(e.target.value)}>
          <option>Linux</option><option>Android</option><option>Windows</option>
        </select>
        <button className="ui-button-primary" disabled={busy} onClick={addSource}>{busy ? "Checking…" : "Add source"}</button>
      </div>
      <p className="mt-3 text-xs text-slate-500">Supported VCS providers: GitHub, GitLab and Codeberg. Direct URLs are treated as a single downloadable artifact.</p>
    </section>

    <div className="mt-5 flex items-center justify-between gap-3">
      <h2 className="text-xl font-semibold text-white">Your sources</h2>
      {sources.length > 0 && <button className="ui-button-secondary" disabled={busy} onClick={refreshAll}>Check for updates</button>}
    </div>

    <div className="mt-3 grid gap-4">
      {sources.length === 0 && <div className="glass-panel p-5 text-sm text-slate-400">No tracked sources yet.</div>}
      {sources.map((source, index) => <article key={source.url + source.platform} className="glass-panel p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-white/10 px-2 py-1 text-xs text-slate-300">{source.result?.provider || "source"}</span><span className="text-xs text-slate-500">{source.platform}</span></div>
            <p className="mt-2 break-all text-sm font-medium text-white">{source.url}</p>
            {source.result?.version && <p className="mt-1 text-sm text-slate-400">Latest release: {source.result.version}</p>}
            {source.error && <p className="mt-2 text-sm text-red-300">{source.error}</p>}
          </div>
          <button className="ui-button-secondary" onClick={() => persist(sources.filter((_, i) => i !== index))}>Remove</button>
        </div>
        {source.result?.assets?.length ? <div className="mt-4 grid gap-2">
          {source.result.assets.map(asset => <a key={asset.download_url} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.025] px-4 py-3 text-sm transition hover:bg-white/[0.05]" href={asset.download_url} target="_blank" rel="noreferrer"><span className="min-w-0 truncate text-slate-200">{asset.name}</span><span className="shrink-0 text-indigo-300">Download</span></a>)}
        </div> : source.result && <p className="mt-4 text-sm text-slate-500">No {source.platform} release assets found.</p>}
      </article>)}
    </div>
  </main>;
}
