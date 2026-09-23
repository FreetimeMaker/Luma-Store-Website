"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type SubmissionStatus = "Draft" | "Pending" | "In Review" | "Changes Requested" | "Approved" | "Rejected" | "Archived";
type AppPlatform = "Android" | "Windows" | "Linux";
type PackageType = "apk" | "exe" | "msi" | "deb" | "rpm";

type PlatformMetadataForm = {
  repoUrl: string;
  title: string;
  shortDescription: string;
  fullDescription: string;
  changelog: string;
  screenshotsText: string;
};

type PlatformArtifact = {
  platform: AppPlatform;
  packageType: PackageType;
  downloadUrl: string;
  repoUrl?: string;
  metadata?: {
    title: string;
    shortDescription: string;
    fullDescription: string;
    changelog: string;
    screenshots: string[];
  };
};

type AppMetadata = {
  id: string;
  name: string;
  status: SubmissionStatus;
  short_description: string | null;
  description: string | null;
  icon_url: string | null;
  category: string | null;
  categories: string[] | null;
  license_type: string | null;
  version: string | null;
  version_code: number | string | null;
  package_name: string | null;
  changelog: string | null;
  screenshots: unknown;
  platform: string | null;
  platforms: unknown;
  separate_platform_repos: boolean | null;
  linux_package_base: string | null;
  download_url: string | null;
  repo_url: string | null;
  link: string | null;
  localized_metadata: unknown;
  author_name: string | null;
  author_email: string | null;
  author_website: string | null;
  website_url: string | null;
  source_code_url: string | null;
  issue_tracker_url: string | null;
  translation_url: string | null;
  changelog_url: string | null;
};

type StoreCategoryRow = { name: string | null };
type LicenseRow = { name: string; display_name: string | null };

const fieldClass = "w-full rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3 text-white shadow-inner shadow-black/10 backdrop-blur-xl outline-none transition placeholder:text-slate-600 focus:border-indigo-400/60 focus:ring-2 focus:ring-indigo-500/20";
const cardClass = "rounded-3xl border border-white/10 bg-slate-900/50 shadow-lg shadow-black/10 backdrop-blur-xl";

function clean(value: string) {
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

function emptyPlatformMetadata(): PlatformMetadataForm {
  return { repoUrl: "", title: "", shortDescription: "", fullDescription: "", changelog: "", screenshotsText: "" };
}

function parsePlatformArtifacts(value: unknown, legacyPlatform: string | null, legacyUrl: string | null, legacyLinuxBase: string | null): PlatformArtifact[] {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => {
      if (!entry || typeof entry !== "object") return [];
      const row = entry as Record<string, unknown>;
      const rawPlatform = row.platform;
      if (rawPlatform !== "Android" && rawPlatform !== "Windows" && rawPlatform !== "Linux") return [];
      const platform = rawPlatform as AppPlatform;
      const rawType = String(row.packageType ?? row.package_type ?? (platform === "Android" ? "apk" : platform === "Windows" ? "exe" : legacyLinuxBase === "RPM-based" ? "rpm" : "deb"));
      if (!["apk", "exe", "msi", "deb", "rpm"].includes(rawType)) return [];
      const packageType = rawType as PackageType;
      const downloadUrl = String(row.downloadUrl ?? row.download_url ?? "");
      const repoUrlValue = row.repoUrl ?? row.repo_url;
      const repoUrl = typeof repoUrlValue === "string" ? repoUrlValue : undefined;
      const rawMetadata = row.metadata;
      let metadata: PlatformArtifact["metadata"];
      if (rawMetadata && typeof rawMetadata === "object") {
        const meta = rawMetadata as Record<string, unknown>;
        metadata = {
          title: String(meta.title ?? ""),
          shortDescription: String(meta.shortDescription ?? meta.short_description ?? ""),
          fullDescription: String(meta.fullDescription ?? meta.full_description ?? ""),
          changelog: String(meta.changelog ?? ""),
          screenshots: stringArray(meta.screenshots),
        };
      }
      if (!downloadUrl) return [];
      return [{ platform, packageType, downloadUrl, ...(repoUrl ? { repoUrl } : {}), ...(metadata ? { metadata } : {}) }];
    });
  }

  if (!legacyPlatform || !legacyUrl || !["Android", "Windows", "Linux"].includes(legacyPlatform)) return [];
  const platform = legacyPlatform as AppPlatform;
  const packageType: PackageType = platform === "Android" ? "apk" : platform === "Windows" ? "exe" : legacyLinuxBase === "RPM-based" ? "rpm" : "deb";
  return [{ platform, packageType, downloadUrl: legacyUrl }];
}

function updateEnglishMetadata(value: unknown, title: string, shortDescription: string, fullDescription: string, changelog: string, screenshots: string[]) {
  const existing = Array.isArray(value) ? value.filter((item) => item && typeof item === "object") as Record<string, unknown>[] : [];
  const otherLocales = existing.filter((item) => {
    const locale = String(item.locale ?? "").toLowerCase();
    return locale !== "en-us" && locale !== "en" && !locale.startsWith("en-");
  });
  return [
    { locale: "en-US", title, shortDescription, fullDescription, changelog, screenshots },
    ...otherLocales,
  ];
}

export default function AppMetadataPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [app, setApp] = useState<AppMetadata | null>(null);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [availableLicenses, setAvailableLicenses] = useState<LicenseRow[]>([]);
  const [platformMetadata, setPlatformMetadata] = useState<Record<AppPlatform, PlatformMetadataForm>>({
    Android: emptyPlatformMetadata(),
    Windows: emptyPlatformMetadata(),
    Linux: emptyPlatformMetadata(),
  });
  const [iconPreviewError, setIconPreviewError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    shortDescription: "",
    description: "",
    iconUrl: "",
    licenseType: "",
    version: "",
    packageName: "",
    versionCode: "",
    changelog: "",
    screenshotsText: "",
    categories: [] as string[],
    selectedPlatforms: [] as AppPlatform[],
    separatePlatformRepos: false,
    sourceCodeUrl: "",
    androidDownloadUrl: "",
    windowsExeUrl: "",
    windowsMsiUrl: "",
    linuxDebUrl: "",
    linuxRpmUrl: "",
    authorName: "",
    authorEmail: "",
    authorWebsite: "",
    websiteUrl: "",
    issueTrackerUrl: "",
    translationUrl: "",
    changelogUrl: "",
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

      const [appResult, categoryResult, licenseResult] = await Promise.all([
        supabase
          .from("luma_submissions")
          .select("id,name,status,short_description,description,icon_url,category,categories,license_type,version,version_code,package_name,changelog,screenshots,platform,platforms,separate_platform_repos,linux_package_base,download_url,repo_url,link,localized_metadata,author_name,author_email,author_website,website_url,source_code_url,issue_tracker_url,translation_url,changelog_url")
          .eq("id", id)
          .eq("user_id", user.id)
          .single(),
        supabase.from("store_categories").select("name").order("name"),
        supabase.from("store_license_types").select("name,display_name").eq("open_source", true).order("display_name"),
      ]);

      if (appResult.error || !appResult.data) {
        setError("App not found or you do not have access to it.");
        setLoading(false);
        return;
      }
      if (categoryResult.error) {
        setError("Categories could not be loaded: " + categoryResult.error.message);
        setLoading(false);
        return;
      }
      if (licenseResult.error) {
        setError("Licenses could not be loaded: " + licenseResult.error.message);
        setLoading(false);
        return;
      }

      const row = appResult.data as AppMetadata;
      const artifacts = parsePlatformArtifacts(row.platforms, row.platform, row.download_url, row.linux_package_base);
      const selectedPlatforms = Array.from(new Set(artifacts.map((item) => item.platform)));
      if (selectedPlatforms.length === 0 && row.platform && ["Android", "Windows", "Linux"].includes(row.platform)) {
        selectedPlatforms.push(row.platform as AppPlatform);
      }

      const separatePlatformRepos = row.separate_platform_repos === true || artifacts.some((item) => Boolean(item.repoUrl || item.metadata));
      const nextPlatformMetadata: Record<AppPlatform, PlatformMetadataForm> = {
        Android: emptyPlatformMetadata(),
        Windows: emptyPlatformMetadata(),
        Linux: emptyPlatformMetadata(),
      };

      (["Android", "Windows", "Linux"] as AppPlatform[]).forEach((platform) => {
        const artifact = artifacts.find((item) => item.platform === platform && (item.repoUrl || item.metadata));
        if (!artifact) return;
        nextPlatformMetadata[platform] = {
          repoUrl: artifact.repoUrl || "",
          title: artifact.metadata?.title || row.name || "",
          shortDescription: artifact.metadata?.shortDescription || row.short_description || "",
          fullDescription: artifact.metadata?.fullDescription || row.description || "",
          changelog: artifact.metadata?.changelog || row.changelog || "",
          screenshotsText: (artifact.metadata?.screenshots || stringArray(row.screenshots)).join("\n"),
        };
      });

      setAvailableCategories((categoryResult.data ?? [])
        .map((item: StoreCategoryRow) => String(item.name ?? "").trim())
        .filter(Boolean));
      setAvailableLicenses((licenseResult.data ?? []) as LicenseRow[]);
      setPlatformMetadata(nextPlatformMetadata);
      setApp(row);
      setIconPreviewError(false);

      setForm({
        name: row.name || "",
        shortDescription: row.short_description || "",
        description: row.description || "",
        iconUrl: row.icon_url || "",
        licenseType: row.license_type || "",
        version: row.version || "",
        packageName: row.package_name || "",
        versionCode: row.version_code == null ? "" : String(row.version_code),
        changelog: row.changelog || "",
        screenshotsText: stringArray(row.screenshots).join("\n"),
        categories: Array.isArray(row.categories) && row.categories.length > 0 ? row.categories : row.category ? [row.category] : [],
        selectedPlatforms,
        separatePlatformRepos,
        sourceCodeUrl: row.source_code_url || row.repo_url || row.link || "",
        androidDownloadUrl: artifacts.find((item) => item.platform === "Android" && item.packageType === "apk")?.downloadUrl || "",
        windowsExeUrl: artifacts.find((item) => item.platform === "Windows" && item.packageType === "exe")?.downloadUrl || "",
        windowsMsiUrl: artifacts.find((item) => item.platform === "Windows" && item.packageType === "msi")?.downloadUrl || "",
        linuxDebUrl: artifacts.find((item) => item.platform === "Linux" && item.packageType === "deb")?.downloadUrl || "",
        linuxRpmUrl: artifacts.find((item) => item.platform === "Linux" && item.packageType === "rpm")?.downloadUrl || "",
        authorName: row.author_name || "",
        authorEmail: row.author_email || "",
        authorWebsite: row.author_website || "",
        websiteUrl: row.website_url || "",
        issueTrackerUrl: row.issue_tracker_url || "",
        translationUrl: row.translation_url || "",
        changelogUrl: row.changelog_url || "",
      });

      setLoading(false);
    }

    void load();
  }, [id, supabase]);

  function setField<K extends keyof typeof form>(field: K, value: (typeof form)[K]) {
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

  function togglePlatform(platform: AppPlatform) {
    setForm((current) => ({
      ...current,
      selectedPlatforms: current.selectedPlatforms.includes(platform)
        ? current.selectedPlatforms.filter((item) => item !== platform)
        : [...current.selectedPlatforms, platform],
    }));
  }

  function updatePlatformMetadata(platform: AppPlatform, field: keyof PlatformMetadataForm, value: string) {
    setPlatformMetadata((current) => ({
      ...current,
      [platform]: { ...current[platform], [field]: value },
    }));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!app) return;

    setSaving(true);
    setError(null);

    try {
      if (!form.name.trim()) throw new Error("App name is required.");
      if (!form.shortDescription.trim()) throw new Error("Short description is required.");
      if (!form.description.trim()) throw new Error("Description is required.");
      if (!form.iconUrl.trim()) throw new Error("App icon URL is required.");
      if (!form.licenseType.trim()) throw new Error("Open-source license is required.");
      if (!form.version.trim()) throw new Error("Version is required.");
      if (!form.changelog.trim()) throw new Error("Changelog is required.");
      if (form.categories.length === 0) throw new Error("Select at least one category.");
      if (form.selectedPlatforms.length === 0) throw new Error("Select at least one platform.");

      const isAndroid = form.selectedPlatforms.includes("Android");
      const isWindows = form.selectedPlatforms.includes("Windows");
      const isLinux = form.selectedPlatforms.includes("Linux");

      if (isAndroid && !form.androidDownloadUrl.trim()) throw new Error("Android requires an APK download URL.");
      if (isWindows && !form.windowsExeUrl.trim() && !form.windowsMsiUrl.trim()) throw new Error("Windows requires an EXE or MSI download URL.");
      if (isLinux && !form.linuxDebUrl.trim() && !form.linuxRpmUrl.trim()) throw new Error("Linux requires a DEB or RPM download URL.");
      if (isAndroid && (!form.packageName.trim() || !/^([A-Za-z][A-Za-z0-9_]*\.)+[A-Za-z][A-Za-z0-9_]*$/.test(form.packageName.trim()))) {
        throw new Error("Android requires a valid package name.");
      }
      if (isAndroid && (!/^\d+$/.test(form.versionCode.trim()) || Number(form.versionCode) <= 0)) {
        throw new Error("Android requires a positive versionCode.");
      }

      const platformDetails = (platform: AppPlatform) => {
        if (!form.separatePlatformRepos) return {};
        const metadata = platformMetadata[platform];
        const screenshots = metadata.screenshotsText.split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
        if (!metadata.repoUrl.trim() || !metadata.title.trim() || !metadata.shortDescription.trim() || !metadata.fullDescription.trim() || !metadata.changelog.trim() || screenshots.length === 0) {
          throw new Error(platform + " requires its repository URL, complete metadata, changelog and at least one screenshot.");
        }
        return {
          repoUrl: metadata.repoUrl.trim(),
          metadata: {
            title: metadata.title.trim(),
            shortDescription: metadata.shortDescription.trim(),
            fullDescription: metadata.fullDescription.trim(),
            changelog: metadata.changelog.trim(),
            screenshots,
          },
        };
      };

      if (!form.separatePlatformRepos && !form.sourceCodeUrl.trim()) {
        throw new Error("Source code URL is required.");
      }

      const artifacts: PlatformArtifact[] = [];
      if (isAndroid) artifacts.push({ platform: "Android", packageType: "apk", downloadUrl: form.androidDownloadUrl.trim(), ...platformDetails("Android") });
      if (isWindows && form.windowsExeUrl.trim()) artifacts.push({ platform: "Windows", packageType: "exe", downloadUrl: form.windowsExeUrl.trim(), ...platformDetails("Windows") });
      if (isWindows && form.windowsMsiUrl.trim()) artifacts.push({ platform: "Windows", packageType: "msi", downloadUrl: form.windowsMsiUrl.trim(), ...platformDetails("Windows") });
      if (isLinux && form.linuxDebUrl.trim()) artifacts.push({ platform: "Linux", packageType: "deb", downloadUrl: form.linuxDebUrl.trim(), ...platformDetails("Linux") });
      if (isLinux && form.linuxRpmUrl.trim()) artifacts.push({ platform: "Linux", packageType: "rpm", downloadUrl: form.linuxRpmUrl.trim(), ...platformDetails("Linux") });

      const screenshots = form.screenshotsText.split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
      const primaryPlatform = form.selectedPlatforms[0];
      const primaryRepo = form.separatePlatformRepos ? platformMetadata[primaryPlatform].repoUrl.trim() : form.sourceCodeUrl.trim();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Your login session expired.");

      const { error: updateError } = await supabase
        .from("luma_submissions")
        .update({
          name: form.name.trim(),
          short_description: form.shortDescription.trim(),
          description: form.description.trim(),
          icon_url: form.iconUrl.trim(),
          category: form.categories[0],
          categories: form.categories,
          license_type: form.licenseType.trim(),
          version: form.version.trim(),
          package_name: isAndroid ? form.packageName.trim() : null,
          version_code: isAndroid ? Number(form.versionCode) : null,
          changelog: form.changelog.trim(),
          screenshots,
          localized_metadata: updateEnglishMetadata(app.localized_metadata, form.name.trim(), form.shortDescription.trim(), form.description.trim(), form.changelog.trim(), screenshots),
          platform: primaryPlatform,
          platforms: artifacts,
          separate_platform_repos: form.separatePlatformRepos,
          linux_package_base: null,
          download_url: artifacts[0]?.downloadUrl || null,
          link: primaryRepo || null,
          repo_url: primaryRepo || null,
          source_code_url: primaryRepo || null,
          closed_source: false,
          author_name: clean(form.authorName),
          author_email: clean(form.authorEmail),
          author_website: clean(form.authorWebsite),
          website_url: clean(form.websiteUrl),
          issue_tracker_url: clean(form.issueTrackerUrl),
          translation_url: clean(form.translationUrl),
          changelog_url: clean(form.changelogUrl),
          review_message: null,
          status: "Pending",
          status_updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      router.push("/dashboard/apps/" + id);
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "App metadata could not be saved.");
      setSaving(false);
    }
  }

  if (loading) {
    return <div className={cardClass + " mx-auto max-w-6xl p-8 text-center text-slate-400"}>Loading app metadata…</div>;
  }

  if (!app) {
    return <div className={cardClass + " mx-auto max-w-6xl p-8 text-red-300"}>{error || "App not found."}</div>;
  }

  const isAndroid = form.selectedPlatforms.includes("Android");
  const isWindows = form.selectedPlatforms.includes("Windows");
  const isLinux = form.selectedPlatforms.includes("Linux");

  return (
    <div className="glass-page mx-auto max-w-6xl space-y-6 pb-20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-indigo-300">Editable approved app configuration</p>
          <h1 className="mt-1 text-3xl font-bold text-white">App metadata</h1>
          <p className="mt-2 max-w-3xl text-slate-400">
            Edit the complete submission for <strong className="text-white">{app.name}</strong>, including platform artifacts, repositories and platform-specific store metadata.
          </p>
        </div>
        <Link href={"/dashboard/apps/" + id} className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-slate-800">Back to app</Link>
      </div>

      <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4 text-sm leading-6 text-amber-100/80">
        Saving changes sends this submission back to <strong className="text-amber-200">Pending</strong>. The currently published version stays available while the edited metadata and artifacts go through automatic validation and security scanning again.
      </div>

      {error && <div className="rounded-2xl border border-red-800/50 bg-red-950/30 p-4 text-sm text-red-200">{error}</div>}

      <form onSubmit={save} className="space-y-6">
        <section className={cardClass + " p-5 sm:p-7"}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.16em] text-indigo-300">Store listing</p>
            <h2 className="mt-1 text-xl font-semibold text-white">App information</h2>
          </div>

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <div><label className="mb-2 block text-sm text-slate-300">App name</label><input required value={form.name} onChange={(e) => setField("name", e.target.value)} className={fieldClass} /></div>
            <div><label className="mb-2 block text-sm text-slate-300">Version</label><input required value={form.version} onChange={(e) => setField("version", e.target.value)} className={fieldClass} /></div>
            <div className="md:col-span-2"><label className="mb-2 block text-sm text-slate-300">Short description</label><textarea required rows={2} value={form.shortDescription} onChange={(e) => setField("shortDescription", e.target.value)} className={fieldClass} /></div>
            <div className="md:col-span-2"><label className="mb-2 block text-sm text-slate-300">Full description</label><textarea required rows={8} value={form.description} onChange={(e) => setField("description", e.target.value)} className={fieldClass} /></div>
            <div><label className="mb-2 block text-sm text-slate-300">Open-source license</label><select required value={form.licenseType} onChange={(e) => setField("licenseType", e.target.value)} className={fieldClass}><option value="">Select a license</option>{availableLicenses.map((license) => <option key={license.name} value={license.name}>{license.display_name || license.name} ({license.name})</option>)}</select></div>
            <div><label className="mb-2 block text-sm text-slate-300">App icon URL</label><input type="url" required value={form.iconUrl} onChange={(e) => { setField("iconUrl", e.target.value); setIconPreviewError(false); }} className={fieldClass} /></div>
            <div className="md:col-span-2">
              <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-slate-900">
                    {form.iconUrl.trim() && !iconPreviewError ? <img src={form.iconUrl.trim()} alt="App icon preview" className="h-full w-full object-cover" onError={() => setIconPreviewError(true)} /> : <span className="text-xs text-slate-500">No icon</span>}
                  </div>
                  <div><p className="text-sm font-medium text-white">Icon preview</p><p className="mt-1 text-xs text-slate-500">The same icon will be used after the edited submission is approved.</p></div>
                </div>
              </div>
            </div>
            <div className="md:col-span-2"><label className="mb-2 block text-sm text-slate-300">Changelog</label><textarea required rows={5} value={form.changelog} onChange={(e) => setField("changelog", e.target.value)} className={fieldClass} /></div>
            <div className="md:col-span-2"><label className="mb-2 block text-sm text-slate-300">Screenshot URLs</label><textarea rows={5} value={form.screenshotsText} onChange={(e) => setField("screenshotsText", e.target.value)} className={fieldClass} placeholder={"https://.../screenshot1.png\nhttps://.../screenshot2.png"} /><p className="mt-2 text-xs text-slate-500">One screenshot URL per line.</p></div>
          </div>
        </section>

        <section className={cardClass + " p-5 sm:p-7"}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.16em] text-indigo-300">Distribution</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Platforms, repositories & artifacts</h2>
            <p className="mt-2 text-sm text-slate-400">You can change platform selection, package files, repository layout and platform-specific metadata even after the app has already been approved.</p>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Platforms</label>
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/35">
                {(["Android", "Windows", "Linux"] as AppPlatform[]).map((platform) => (
                  <label key={platform} className="flex cursor-pointer items-center gap-3 border-b border-white/10 px-4 py-3 text-sm text-slate-200 last:border-b-0 hover:bg-white/5">
                    <input type="checkbox" checked={form.selectedPlatforms.includes(platform)} onChange={() => togglePlatform(platform)} className="h-4 w-4 accent-indigo-500" />
                    <span>{platform}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4">
              <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-slate-200">
                <input type="checkbox" checked={form.separatePlatformRepos} onChange={(e) => setField("separatePlatformRepos", e.target.checked)} className="h-4 w-4 accent-indigo-500" />
                Different repository per platform
              </label>
              <p className="mt-2 text-xs leading-5 text-slate-500">When enabled, every selected platform gets its own repository and its own title, descriptions, changelog and screenshots.</p>
            </div>
          </div>

          {!form.separatePlatformRepos && (
            <div className="mt-5">
              <label className="mb-2 block text-sm text-slate-300">Source code / repository URL</label>
              <input type="url" required value={form.sourceCodeUrl} onChange={(e) => setField("sourceCodeUrl", e.target.value)} className={fieldClass} placeholder="https://github.com/owner/repository" />
            </div>
          )}

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {isAndroid && <div><label className="mb-2 block text-sm text-slate-300">Android APK URL</label><input type="url" required value={form.androidDownloadUrl} onChange={(e) => setField("androidDownloadUrl", e.target.value)} className={fieldClass} /></div>}
            {isWindows && <div><label className="mb-2 block text-sm text-slate-300">Windows EXE URL</label><input type="url" value={form.windowsExeUrl} onChange={(e) => setField("windowsExeUrl", e.target.value)} className={fieldClass} /></div>}
            {isWindows && <div><label className="mb-2 block text-sm text-slate-300">Windows MSI URL</label><input type="url" value={form.windowsMsiUrl} onChange={(e) => setField("windowsMsiUrl", e.target.value)} className={fieldClass} /></div>}
            {isLinux && <div><label className="mb-2 block text-sm text-slate-300">Linux DEB URL</label><input type="url" value={form.linuxDebUrl} onChange={(e) => setField("linuxDebUrl", e.target.value)} className={fieldClass} /></div>}
            {isLinux && <div><label className="mb-2 block text-sm text-slate-300">Linux RPM URL</label><input type="url" value={form.linuxRpmUrl} onChange={(e) => setField("linuxRpmUrl", e.target.value)} className={fieldClass} /></div>}
          </div>

          {isAndroid && (
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <div><label className="mb-2 block text-sm text-slate-300">Android package name</label><input required value={form.packageName} onChange={(e) => setField("packageName", e.target.value)} className={fieldClass} /></div>
              <div><label className="mb-2 block text-sm text-slate-300">Android versionCode</label><input type="number" min={1} required value={form.versionCode} onChange={(e) => setField("versionCode", e.target.value)} className={fieldClass} /></div>
            </div>
          )}

          {form.separatePlatformRepos && (
            <div className="mt-6 space-y-5">
              {form.selectedPlatforms.map((platform) => {
                const metadata = platformMetadata[platform];
                return (
                  <div key={platform} className="rounded-3xl border border-indigo-500/20 bg-indigo-500/5 p-5">
                    <div><p className="text-xs font-semibold uppercase tracking-[.16em] text-indigo-300">{platform}</p><h3 className="mt-1 text-lg font-semibold text-white">Repository & store metadata</h3></div>
                    <div className="mt-4 grid gap-4">
                      <div><label className="mb-2 block text-sm text-slate-300">Repository URL</label><input type="url" required value={metadata.repoUrl} onChange={(e) => updatePlatformMetadata(platform, "repoUrl", e.target.value)} className={fieldClass} /></div>
                      <div><label className="mb-2 block text-sm text-slate-300">Title</label><input required value={metadata.title} onChange={(e) => updatePlatformMetadata(platform, "title", e.target.value)} className={fieldClass} /></div>
                      <div><label className="mb-2 block text-sm text-slate-300">Short description</label><textarea required rows={2} value={metadata.shortDescription} onChange={(e) => updatePlatformMetadata(platform, "shortDescription", e.target.value)} className={fieldClass} /></div>
                      <div><label className="mb-2 block text-sm text-slate-300">Full description</label><textarea required rows={7} value={metadata.fullDescription} onChange={(e) => updatePlatformMetadata(platform, "fullDescription", e.target.value)} className={fieldClass} /></div>
                      <div><label className="mb-2 block text-sm text-slate-300">Changelog</label><textarea required rows={4} value={metadata.changelog} onChange={(e) => updatePlatformMetadata(platform, "changelog", e.target.value)} className={fieldClass} /></div>
                      <div><label className="mb-2 block text-sm text-slate-300">Screenshot URLs</label><textarea required rows={4} value={metadata.screenshotsText} onChange={(e) => updatePlatformMetadata(platform, "screenshotsText", e.target.value)} className={fieldClass} placeholder={"https://.../1.png\nhttps://.../2.png"} /></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className={cardClass + " p-5 sm:p-7"}>
          <h2 className="text-xl font-semibold text-white">Categories</h2>
          <p className="mt-1 text-sm text-slate-400">Choose every category that fits this app. The first selected category remains the primary category.</p>
          <div className="mt-4 grid max-h-80 gap-2 overflow-y-auto rounded-2xl border border-white/10 bg-slate-950/35 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {availableCategories.map((category) => (
              <label key={category} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm text-slate-300 hover:bg-white/5">
                <input type="checkbox" checked={form.categories.includes(category)} onChange={() => toggleCategory(category)} className="h-4 w-4 accent-indigo-500" />
                <span>{category}</span>
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">{form.categories.length} selected{form.categories.length > 0 ? ": " + form.categories.join(", ") : ""}</p>
        </section>

        <section className={cardClass + " p-5 sm:p-7"}>
          <h2 className="text-xl font-semibold text-white">Author & project links</h2>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <div><label className="mb-2 block text-sm text-slate-300">Author name</label><input value={form.authorName} onChange={(e) => setField("authorName", e.target.value)} className={fieldClass} /></div>
            <div><label className="mb-2 block text-sm text-slate-300">Author email</label><input type="email" value={form.authorEmail} onChange={(e) => setField("authorEmail", e.target.value)} className={fieldClass} /></div>
            <div><label className="mb-2 block text-sm text-slate-300">Author website</label><input type="url" value={form.authorWebsite} onChange={(e) => setField("authorWebsite", e.target.value)} className={fieldClass} /></div>
            <div><label className="mb-2 block text-sm text-slate-300">App website</label><input type="url" value={form.websiteUrl} onChange={(e) => setField("websiteUrl", e.target.value)} className={fieldClass} /></div>
            <div><label className="mb-2 block text-sm text-slate-300">Issue tracker</label><input type="url" value={form.issueTrackerUrl} onChange={(e) => setField("issueTrackerUrl", e.target.value)} className={fieldClass} /></div>
            <div><label className="mb-2 block text-sm text-slate-300">Translation</label><input type="url" value={form.translationUrl} onChange={(e) => setField("translationUrl", e.target.value)} className={fieldClass} /></div>
            <div className="md:col-span-2"><label className="mb-2 block text-sm text-slate-300">Changelog URL</label><input type="url" value={form.changelogUrl} onChange={(e) => setField("changelogUrl", e.target.value)} className={fieldClass} /></div>
          </div>
        </section>

        <section className="rounded-3xl border border-indigo-500/20 bg-indigo-500/5 p-5 backdrop-blur-xl">
          <h2 className="font-semibold text-white">Developer funding</h2>
          <p className="mt-1 text-sm text-slate-400">Donation methods remain managed once for your developer profile and apply to all of your apps.</p>
          <Link href="/dashboard/funding" className="mt-3 inline-flex rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500">Manage developer funding</Link>
        </section>

        <div className="sticky bottom-4 z-20 flex flex-col gap-3 rounded-3xl border border-white/10 bg-slate-950/80 p-4 shadow-2xl shadow-black/30 backdrop-blur-2xl sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-slate-400">Saving creates a new pending review state. The approved public app remains available until the edited submission is approved again.</p>
          <button type="submit" disabled={saving || form.categories.length === 0 || form.selectedPlatforms.length === 0} className="shrink-0 rounded-xl bg-indigo-600 px-5 py-2.5 font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40">{saving ? "Saving…" : "Save app metadata"}</button>
        </div>
      </form>
    </div>
  );
}
