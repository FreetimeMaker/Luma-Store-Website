"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type ProfileForm = {
  display_name: string;
  bio: string;
  website_url: string;
  github_url: string;
  gitlab_url: string;
  avatar_url: string;
};

const emptyProfile: ProfileForm = {
  display_name: "",
  bio: "",
  website_url: "",
  github_url: "",
  gitlab_url: "",
  avatar_url: "",
};

const profileFields: Array<[keyof Omit<ProfileForm, "bio">, string]> = [
  ["display_name", "Display name"],
  ["avatar_url", "Avatar URL"],
  ["website_url", "Website"],
  ["github_url", "GitHub"],
  ["gitlab_url", "GitLab"],
];

function clean(value: string) {
  return value.trim() || null;
}

export default function DeveloperProfilePage() {
  const supabase = useMemo(() => createClient(), []);

  const [userId, setUserId] = useState<string | null>(null);
  const [form, setForm] = useState<ProfileForm>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      setUserId(user.id);

      const { data } = await supabase
        .from("luma_developer_profiles")
        .select("display_name,bio,website_url,github_url,gitlab_url,avatar_url")
        .eq("developer_id", user.id)
        .maybeSingle();

      if (data) {
        setForm({
          display_name: data.display_name || "",
          bio: data.bio || "",
          website_url: data.website_url || "",
          github_url: data.github_url || "",
          gitlab_url: data.gitlab_url || "",
          avatar_url: data.avatar_url || "",
        });
      }

      setLoading(false);
    }

    void loadProfile();
  }, [supabase]);

  function updateField<K extends keyof ProfileForm>(field: K, value: ProfileForm[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    if (!userId) return;

    setSaving(true);
    setMessage(null);

    const { error } = await supabase
      .from("luma_developer_profiles")
      .upsert(
        {
          developer_id: userId,
          display_name: clean(form.display_name),
          bio: clean(form.bio),
          website_url: clean(form.website_url),
          github_url: clean(form.github_url),
          gitlab_url: clean(form.gitlab_url),
          avatar_url: clean(form.avatar_url),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "developer_id" },
      );

    setMessage(error ? error.message : "Developer profile saved.");
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="glass-page mx-auto max-w-3xl space-y-5 pb-20">
        <div className="h-8 w-56 animate-pulse rounded bg-slate-800/70" />
        <div className="glass-panel space-y-5 p-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index}>
              <div className="mb-2 h-4 w-24 animate-pulse rounded bg-slate-800/60" />
              <div className="h-12 animate-pulse rounded-xl bg-slate-800/40" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="glass-page mx-auto max-w-3xl p-8 text-slate-300">
        Sign in to manage your developer profile.
      </div>
    );
  }

  const avatarFallback = (form.display_name || "D").slice(0, 1).toUpperCase();

  return (
    <div className="glass-page mx-auto max-w-3xl space-y-6 pb-20">
      <div>
        <Link href="/dashboard" className="text-sm text-indigo-300">
          ← Dashboard
        </Link>

        <section className="glass-panel mt-4 p-5 sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            {form.avatar_url ? (
              <img
                src={form.avatar_url}
                alt=""
                className="h-20 w-20 rounded-2xl border border-white/10 object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/40 text-2xl font-bold text-indigo-200">
                {avatarFallback}
              </div>
            )}

            <div>
              <p className="ui-eyebrow">Public identity</p>
              <h1 className="ui-title mt-1 text-3xl">Developer profile</h1>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Public information shown on your Luma Store developer page.
                Verification is managed by Luma Store.
              </p>
            </div>
          </div>
        </section>
      </div>

      {message && (
        <div role="status" className="ui-panel-muted p-4 text-sm text-slate-300">
          {message}
        </div>
      )}

      <form onSubmit={saveProfile} className="glass-panel space-y-5 p-5 sm:p-6">
        {profileFields.map(([field, label]) => (
          <div key={field}>
            <label className="mb-2 block text-sm text-slate-300">{label}</label>
            <input
              value={form[field]}
              onChange={(event) => updateField(field, event.target.value)}
              className="glass-input"
            />
          </div>
        ))}

        <div>
          <label className="mb-2 block text-sm text-slate-300">Bio</label>
          <textarea
            rows={5}
            value={form.bio}
            onChange={(event) => updateField("bio", event.target.value)}
            className="glass-input"
          />
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-slate-500">
            Changes become visible on your public developer page after saving.
          </p>
          <button
            disabled={saving}
            className="ui-button-primary min-h-11 px-5 py-2.5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save profile"}
          </button>
        </div>
      </form>
    </div>
  );
}
