"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type SubmissionStatus = "Pending" | "In Review" | "Changes Requested" | "Approved" | "Rejected";

type AppMetadata = {
  id: string;
  name: string;
  status: SubmissionStatus;
  category: string | null;
  categories: string[] | null;
  author_name: string | null;
  author_email: string | null;
  author_website: string | null;
  website_url: string | null;
  source_code_url: string | null;
  issue_tracker_url: string | null;
  translation_url: string | null;
  changelog_url: string | null;
  donate_url: string | null;
  liberapay: string | null;
  opencollective: string | null;
  bitcoin: string | null;
  litecoin: string | null;
};

type StoreCategoryRow = {
  name: string | null;
};

const fieldClass = "w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-white outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20";
const cardClass = "rounded-2xl border border-slate-800 bg-slate-900/80 shadow-lg shadow-black/10";

function clean(value: string) {
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export default function AppMetadataPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [app, setApp] = useState<AppMetadata | null>(null);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    categories: [] as string[],
    author_name: "",
    author_email: "",
    author_website: "",
    website_url: "",
    source_code_url: "",
    issue_tracker_url: "",
    translation_url: "",
    changelog_url: "",
    donate_url: "",
    liberapay: "",
    opencollective: "",
    bitcoin: "",
    litecoin: "",
  });

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("You must be signed in.");
        setLoading(false);
        return;
      }

      const [{ data, error: loadError }, { data: categoryData, error: categoryError }] = await Promise.all([
        supabase
          .from("luma_submissions")
          .select("id,name,status,category,categories,author_name,author_email,author_website,website_url,source_code_url,issue_tracker_url,translation_url,changelog_url,donate_url,liberapay,opencollective,bitcoin,litecoin")
          .eq("id", id)
          .eq("user_id", user.id)
          .single(),
        supabase.from("store_categories").select("name").order("name"),
      ]);

      if (loadError || !data) {
        setError("App not found or you do not have access to it.");
        setLoading(false);
        return;
      }
      if (categoryError) {
        setError(`Categories could not be loaded: ${categoryError.message}`);
        setLoading(false);
        return;
      }

      const row = data as AppMetadata;
      const selectedCategories = Array.isArray(row.categories) && row.categories.length > 0
        ? row.categories
        : row.category ? [row.category] : [];

      setAvailableCategories((categoryData ?? [])
        .map((item: StoreCategoryRow) => String(item.name ?? "").trim())
        .filter(Boolean));
      setApp(row);
      setForm({
        categories: selectedCategories,
        author_name: row.author_name || "",
        author_email: row.author_email || "",
        author_website: row.author_website || "",
        website_url: row.website_url || "",
        source_code_url: row.source_code_url || "",
        issue_tracker_url: row.issue_tracker_url || "",
        translation_url: row.translation_url || "",
        changelog_url: row.changelog_url || "",
        donate_url: row.donate_url || "",
        liberapay: row.liberapay || "",
        opencollective: row.opencollective || "",
        bitcoin: row.bitcoin || "",
        litecoin: row.litecoin || "",
      });
      setLoading(false);
    }
    void load();
  }, [id, supabase]);

  function setField(field: Exclude<keyof typeof form, "categories">, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function toggleCategory(category: string) {
    setForm((current) => ({
      ...current,
      categories: current.categories.includes(category)
        ? current.categories.filter((item) => item !== category)
        : [...current.categories, category],
    }));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!app) return;
    if (form.categories.length === 0) {
      setError("Select at least one category.");
      return;
    }
    setSaving(true);
    setError(null);
    const { error: updateError } = await supabase
      .from("luma_submissions")
      .update({
        category: form.categories[0],
        categories: form.categories,
        author_name: clean(form.author_name),
        author_email: clean(form.author_email),
        author_website: clean(form.author_website),
        website_url: clean(form.website_url),
        source_code_url: clean(form.source_code_url),
        repo_url: clean(form.source_code_url),
        closed_source: false,
        issue_tracker_url: clean(form.issue_tracker_url),
        translation_url: clean(form.translation_url),
        changelog_url: clean(form.changelog_url),
        donate_url: clean(form.donate_url),
        liberapay: clean(form.liberapay),
        opencollective: clean(form.opencollective),
        bitcoin: clean(form.bitcoin),
        litecoin: clean(form.litecoin),
        status: "Pending",
        status_updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }
    router.push(`/dashboard/apps/${id}`);
    router.refresh();
  }

  if (loading) return <div className={`${cardClass} mx-auto max-w-5xl p-8 text-center text-slate-400`}>Loading app metadata…</div>;
  if (!app) return <div className={`${cardClass} mx-auto max-w-5xl p-8 text-red-300`}>{error || "App not found."}</div>;

  return (
    <div className="glass-page mx-auto max-w-5xl space-y-6 pb-20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">App metadata</h1>
          <p className="mt-2 text-slate-400">Metadata for <strong className="text-white">{app.name}</strong>. These values belong to this app, not to your user profile.</p>
        </div>
        <Link href={`/dashboard/apps/${id}`} className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-slate-800">Back to app</Link>
      </div>

      {app.status !== "Pending" && (
        <div className="rounded-xl border border-amber-700/40 bg-amber-950/20 p-4 text-sm leading-6 text-amber-200">
          Saving app metadata sends this app back to <strong>Pending</strong> so the automatic security scan and validation can run again.
        </div>
      )}
      {error && <div className="rounded-xl border border-red-800/50 bg-red-950/30 p-4 text-sm text-red-200">{error}</div>}

      <form onSubmit={save} className={`${cardClass} space-y-8 p-6 md:p-8`}>
        <section>
          <h2 className="text-lg font-semibold text-white">Categories</h2>
          <p className="mt-1 text-sm text-slate-400">Choose every category that fits this app. The first selected category remains the primary category for compatibility.</p>
          <div className="mt-4 grid max-h-80 gap-2 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/40 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {availableCategories.map((category) => (
              <label key={category} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm text-slate-300 hover:bg-slate-800/60">
                <input type="checkbox" checked={form.categories.includes(category)} onChange={() => toggleCategory(category)} className="h-4 w-4" />
                <span>{category}</span>
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">{form.categories.length} selected{form.categories.length > 0 ? `: ${form.categories.join(", ")}` : ""}</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">Author & project</h2>
          <div className="mt-4 grid gap-5 md:grid-cols-2">
            <div><label className="mb-2 block text-sm text-slate-300">Author name</label><input value={form.author_name} onChange={(e) => setField("author_name", e.target.value)} className={fieldClass} /></div>
            <div><label className="mb-2 block text-sm text-slate-300">Author email</label><input type="email" value={form.author_email} onChange={(e) => setField("author_email", e.target.value)} className={fieldClass} /></div>
            <div><label className="mb-2 block text-sm text-slate-300">Author website</label><input type="url" value={form.author_website} onChange={(e) => setField("author_website", e.target.value)} className={fieldClass} /></div>
            <div><label className="mb-2 block text-sm text-slate-300">App website</label><input type="url" value={form.website_url} onChange={(e) => setField("website_url", e.target.value)} className={fieldClass} /></div>
            <div className="md:col-span-2"><label className="mb-2 block text-sm text-slate-300">Source code URL</label><input type="url" required value={form.source_code_url} onChange={(e) => setField("source_code_url", e.target.value)} className={fieldClass} placeholder="https://github.com/owner/repo" /></div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">Project links</h2>
          <div className="mt-4 grid gap-5 md:grid-cols-2">
            <div><label className="mb-2 block text-sm text-slate-300">Issue tracker</label><input type="url" value={form.issue_tracker_url} onChange={(e) => setField("issue_tracker_url", e.target.value)} className={fieldClass} /></div>
            <div><label className="mb-2 block text-sm text-slate-300">Translation</label><input type="url" value={form.translation_url} onChange={(e) => setField("translation_url", e.target.value)} className={fieldClass} /></div>
            <div><label className="mb-2 block text-sm text-slate-300">Changelog URL</label><input type="url" value={form.changelog_url} onChange={(e) => setField("changelog_url", e.target.value)} className={fieldClass} /></div>
            <div><label className="mb-2 block text-sm text-slate-300">Donate URL</label><input type="url" value={form.donate_url} onChange={(e) => setField("donate_url", e.target.value)} className={fieldClass} /></div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">Donations</h2>
          <div className="mt-4 grid gap-5 md:grid-cols-2">
            <div><label className="mb-2 block text-sm text-slate-300">Liberapay</label><input value={form.liberapay} onChange={(e) => setField("liberapay", e.target.value)} className={fieldClass} placeholder="username" /></div>
            <div><label className="mb-2 block text-sm text-slate-300">OpenCollective</label><input value={form.opencollective} onChange={(e) => setField("opencollective", e.target.value)} className={fieldClass} placeholder="project-name" /></div>
            <div><label className="mb-2 block text-sm text-slate-300">Bitcoin address</label><input value={form.bitcoin} onChange={(e) => setField("bitcoin", e.target.value)} className={fieldClass} /></div>
            <div><label className="mb-2 block text-sm text-slate-300">Litecoin address</label><input value={form.litecoin} onChange={(e) => setField("litecoin", e.target.value)} className={fieldClass} /></div>
          </div>
        </section>

        <div className="flex justify-end"><button type="submit" disabled={saving || form.categories.length === 0} className="rounded-xl bg-indigo-600 px-5 py-2.5 font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40">{saving ? "Saving…" : "Save app metadata"}</button></div>
      </form>
    </div>
  );
}
