"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type SubmissionStatus = "Draft" | "Pending" | "In Review" | "Changes Requested" | "Approved" | "Rejected";
type AppPlatform = "" | "Android" | "Windows" | "Linux";
type LinuxPackageBase = "" | "Debian-based" | "RPM-based";

type LocalizedMetadata = {
  locale: string;
  title: string;
  shortDescription: string;
  fullDescription: string;
  changelog: string;
  screenshots: string[];
};

type LocalizedMetadataInput = Omit<LocalizedMetadata, "screenshots"> & { screenshotsText: string };

type AppSubmission = {
  id: string;
  name: string;
  shortDescription: string;
  description: string;
  link: string;
  status: SubmissionStatus;
  submittedAt: string;
  category: string;
  categories: string[];
  licenseType: string;
  iconUrl: string;
  version: string;
  platform: string;
  linuxPackageBase: string;
  downloadUrl: string;
  changelog: string;
  packageName: string;
  versionCode: string;
  screenshots: string[];
  localizedMetadata: LocalizedMetadata[];
  repoUrl: string;
  websiteUrl: string;
  issueTrackerUrl: string;
  translationUrl: string;
  authorName: string;
  authorEmail: string;
  authorWebsite: string;
  donateUrl: string;
  liberapay: string;
  opencollective: string;
  bitcoin: string;
  litecoin: string;
};

type LumaSubmissionRow = {
  id: string;
  name: string;
  short_description: string | null;
  description: string;
  link: string | null;
  status: SubmissionStatus;
  submitted_at: string;
  category: string;
  categories: unknown;
  license_type: string | null;
  closed_source: boolean | null;
  icon_url: string | null;
  version: string | null;
  platform: string | null;
  linux_package_base: string | null;
  download_url: string | null;
  changelog: string | null;
  package_name: string | null;
  version_code: number | string | null;
  screenshots: unknown;
  localized_metadata: unknown;
  repo_url: string | null;
  website_url: string | null;
  issue_tracker_url: string | null;
  translation_url: string | null;
  author_name: string | null;
  author_email: string | null;
  author_website: string | null;
  donate_url: string | null;
  liberapay: string | null;
  opencollective: string | null;
  bitcoin: string | null;
  litecoin: string | null;
};

type DownloadStats = { app_id: string; total: number; today: number; this_month: number; this_year: number };

type FastlaneMetadata = {
  title: string;
  shortDescription: string;
  fullDescription: string;
  changelog: string;
  screenshots: string[];
  locale: string;
  branch: string;
};

const FDROID_CATEGORIES = [
  "Action Game", "AI Chat", "Alarm Clock", "Ambient Sound", "App Manager", "App Store & Updater",
  "Battery", "Board Game", "Bookmark", "Browser", "Calculator", "Calendar & Agenda", "Camera",
  "Card Game", "Cast", "Casual Game", "Clock", "Cloud Storage & File Sync", "Code & Forge",
  "Connectivity", "Contact", "Covid", "Development", "Dice", "Diet", "DNS & Hosts", "Download",
  "Draw", "Ebook Reader", "Educational Game", "Email", "Emulator", "File Encryption & Vault",
  "File Manager", "File Transfer", "Firewall", "Finance Manager", "Flashlight", "Forum", "Gallery",
  "Game Helper", "Graphics", "Habit Tracker", "Health Manager", "Icon Pack", "Internet", "Inventory",
  "Keyboard & IME", "Launcher", "Local Media Player", "Location Tracker & Sharer", "Lyrics",
  "Market & Price", "Messaging", "Medication", "Meditation", "Mental Health", "Multimedia",
  "Music Practice Tool", "Navigation", "Network Analyzer", "News", "Note", "Notification", "OCR",
  "Online Media Player", "Party Game", "Pass Wallet", "Password & 2FA", "Phone & SMS", "Platformer Game",
  "Podcast", "Public Transport", "Push", "Puzzle Game", "Radio", "Reading", "Recipe Manager", "Recorder",
  "Remote Access", "Remote Controller", "Religion", "Role-Playing Game", "Science & Education", "Security",
  "Schedule", "Shooter Game", "Shopping List", "Social Network", "Sport Game", "Sports & Health",
  "Stopwatch", "Strategy Game", "System", "Task", "Text Editor", "Text Encryption", "Text to Speech",
  "Theming", "Time Tracker", "Timer", "Translation & Dictionary", "Unit Convertor", "Visual Novel",
  "Voice & Video Chat", "Volume", "VPN & Proxy", "Wallet", "Wallpaper", "Weather", "Workout",
  "Word Game", "Writing",
] as const;

const LICENSE_OPTIONS = [
  ["MIT", "MIT License"], ["Apache-2.0", "Apache License 2.0"],
  ["GPL-2.0-only", "GNU GPL v2 only"], ["GPL-2.0-or-later", "GNU GPL v2 or later"],
  ["GPL-3.0-only", "GNU GPL v3 only"], ["GPL-3.0-or-later", "GNU GPL v3 or later"],
  ["LGPL-2.1-only", "GNU LGPL v2.1 only"], ["LGPL-2.1-or-later", "GNU LGPL v2.1 or later"],
  ["LGPL-3.0-only", "GNU LGPL v3 only"], ["LGPL-3.0-or-later", "GNU LGPL v3 or later"],
  ["AGPL-3.0-only", "GNU AGPL v3 only"], ["AGPL-3.0-or-later", "GNU AGPL v3 or later"],
  ["MPL-2.0", "Mozilla Public License 2.0"], ["BSD-2-Clause", "BSD 2-Clause"],
  ["BSD-3-Clause", "BSD 3-Clause"], ["ISC", "ISC License"], ["Unlicense", "The Unlicense"],
  ["CC0-1.0", "CC0 1.0"], ["EPL-2.0", "Eclipse Public License 2.0"],
  ["EUPL-1.2", "European Union Public Licence 1.2"], ["Zlib", "zlib License"],
  ["BSL-1.0", "Boost Software License 1.0"], ["Artistic-2.0", "Artistic License 2.0"],
] as const;

const fieldClass = "w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-white outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20";
const cardClass = "rounded-2xl border border-slate-800 bg-slate-900/80 shadow-lg shadow-black/10";

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function parseLocalizedMetadata(value: unknown): LocalizedMetadata[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    if (typeof row.locale !== "string") return [];
    return [{
      locale: row.locale,
      title: typeof row.title === "string" ? row.title : "",
      shortDescription: typeof row.shortDescription === "string" ? row.shortDescription : "",
      fullDescription: typeof row.fullDescription === "string" ? row.fullDescription : "",
      changelog: typeof row.changelog === "string" ? row.changelog : "",
      screenshots: asStringArray(row.screenshots),
    }];
  });
}

function rowToApp(item: LumaSubmissionRow): AppSubmission {
  return {
    id: item.id,
    name: item.name,
    shortDescription: item.short_description || "",
    description: item.description,
    link: item.link || "",
    status: item.status,
    submittedAt: item.submitted_at,
    category: item.category,
    categories: asStringArray(item.categories).length ? asStringArray(item.categories) : [item.category],
    licenseType: item.license_type || "",
    iconUrl: item.icon_url || "",
    version: item.version || "",
    platform: item.platform || "",
    linuxPackageBase: item.linux_package_base || "",
    downloadUrl: item.download_url || "",
    changelog: item.changelog || "",
    packageName: item.package_name || "",
    versionCode: item.version_code == null ? "" : String(item.version_code),
    screenshots: asStringArray(item.screenshots),
    localizedMetadata: parseLocalizedMetadata(item.localized_metadata),
    repoUrl: item.repo_url || item.link || "",
    websiteUrl: item.website_url || "",
    issueTrackerUrl: item.issue_tracker_url || "",
    translationUrl: item.translation_url || "",
    authorName: item.author_name || "",
    authorEmail: item.author_email || "",
    authorWebsite: item.author_website || "",
    donateUrl: item.donate_url || "",
    liberapay: item.liberapay || "",
    opencollective: item.opencollective || "",
    bitcoin: item.bitcoin || "",
    litecoin: item.litecoin || "",
  };
}

function githubRepository(projectUrl: string): { owner: string; repo: string; branches: string[] } {
  let parsed: URL;
  try { parsed = new URL(projectUrl.trim()); } catch { throw new Error("Please enter a valid GitHub repository URL."); }
  if (parsed.hostname.toLowerCase() !== "github.com") throw new Error("Fastlane metadata is currently read from GitHub repositories. Please use a github.com repository URL.");
  const parts = parsed.pathname.split("/").filter(Boolean);
  if (parts.length < 2) throw new Error("Please enter the URL of a GitHub repository.");
  const branchFromUrl = parts[2] === "tree" && parts[3] ? decodeURIComponent(parts[3]) : null;
  return { owner: parts[0], repo: parts[1].replace(/\.git$/i, ""), branches: Array.from(new Set([branchFromUrl, "main", "master"].filter(Boolean))) as string[] };
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return null;
    const value = (await response.text()).trim();
    return value || null;
  } catch { return null; }
}

async function fetchPhoneScreenshots(owner: string, repo: string, branch: string, locale: string): Promise<string[]> {
  const path = `fastlane/metadata/android/${locale}/images/phoneScreenshots`;
  const apiUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path}?ref=${encodeURIComponent(branch)}`;
  try {
    const response = await fetch(apiUrl, { cache: "no-store", headers: { Accept: "application/vnd.github+json" } });
    if (!response.ok) return [];
    const data = await response.json();
    if (!Array.isArray(data)) return [];
    return data
      .filter((item) => item?.type === "file" && typeof item?.name === "string" && /\.(png|jpe?g)$/i.test(item.name))
      .sort((a, b) => String(a.name).localeCompare(String(b.name)))
      .map((item) => item.download_url)
      .filter((url): url is string => typeof url === "string" && url.length > 0);
  } catch { return []; }
}

async function fetchFastlaneMetadata(projectUrl: string, versionCode: string): Promise<FastlaneMetadata> {
  const numericVersionCode = Number(versionCode);
  if (!Number.isInteger(numericVersionCode) || numericVersionCode <= 0) throw new Error("Enter a positive Android versionCode before checking Fastlane metadata.");
  const { owner, repo, branches } = githubRepository(projectUrl);
  for (const branch of branches) {
    for (const locale of ["en-US", "en-GB", "de-DE", "en", "de"]) {
      const base = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/fastlane/metadata/android/${locale}`;
      const title = await fetchText(`${base}/title.txt`);
      if (!title) continue;
      const shortDescription = await fetchText(`${base}/short_description.txt`);
      const fullDescription = await fetchText(`${base}/full_description.txt`);
      if (!shortDescription || !fullDescription) continue;
      const changelog = (await fetchText(`${base}/changelogs/${numericVersionCode}.txt`)) ?? (await fetchText(`${base}/changelogs/default.txt`));
      if (!changelog) continue;
      const screenshots = await fetchPhoneScreenshots(owner, repo, branch, locale);
      if (screenshots.length > 0) return { title, shortDescription, fullDescription, changelog, screenshots, locale, branch };
    }
  }
  throw new Error("Fastlane metadata is incomplete. Luma Store requires title.txt, short_description.txt, full_description.txt, a changelog for the versionCode (or default.txt), and at least one phone screenshot.");
}

export default function LumaDeveloperPortal() {
  const supabase = useMemo(() => createClient(), []);
  const [step, setStep] = useState(1);
  const [appName, setAppName] = useState("");
  const [appLink, setAppLink] = useState("");
  const [appCategories, setAppCategories] = useState<string[]>([]);
  const [appLicenseType, setAppLicenseType] = useState("");
  const [appIconUrl, setAppIconUrl] = useState("");
  const [iconPreviewError, setIconPreviewError] = useState(false);
  const [appVersion, setAppVersion] = useState("");
  const [appPlatform, setAppPlatform] = useState<AppPlatform>("");
  const [appLinuxPackageBase, setAppLinuxPackageBase] = useState<LinuxPackageBase>("");
  const [appDownloadUrl, setAppDownloadUrl] = useState("");
  const [appPackageName, setAppPackageName] = useState("");
  const [appVersionCode, setAppVersionCode] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [issueTrackerUrl, setIssueTrackerUrl] = useState("");
  const [translationUrl, setTranslationUrl] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [authorEmail, setAuthorEmail] = useState("");
  const [authorWebsite, setAuthorWebsite] = useState("");
  const [donateUrl, setDonateUrl] = useState("");
  const [liberapay, setLiberapay] = useState("");
  const [opencollective, setOpencollective] = useState("");
  const [bitcoin, setBitcoin] = useState("");
  const [litecoin, setLitecoin] = useState("");
  const [closedTitle, setClosedTitle] = useState("");
  const [closedShortDescription, setClosedShortDescription] = useState("");
  const [closedFullDescription, setClosedFullDescription] = useState("");
  const [closedChangelog, setClosedChangelog] = useState("");
  const [closedScreenshotsText, setClosedScreenshotsText] = useState("");
  const [additionalClosedMetadata, setAdditionalClosedMetadata] = useState<LocalizedMetadataInput[]>([]);
  const [fastlaneMetadata, setFastlaneMetadata] = useState<FastlaneMetadata | null>(null);
  const [fastlaneError, setFastlaneError] = useState<string | null>(null);
  const [fastlaneLoading, setFastlaneLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingStatus, setEditingStatus] = useState<SubmissionStatus | null>(null);
  const [myApps, setMyApps] = useState<AppSubmission[]>([]);
  const [loadingApps, setLoadingApps] = useState(true);
  const [downloadStats, setDownloadStats] = useState<Record<string, DownloadStats>>({});
  const [submissionStoreIds, setSubmissionStoreIds] = useState<Record<string, string>>({});
  const [developerId, setDeveloperId] = useState<string | null>(null);
  const [developerName, setDeveloperName] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);

  const isAndroid = appPlatform === "Android";
  const isWindows = appPlatform === "Windows";
  const isLinux = appPlatform === "Linux";
  const manualStoreMetadata = isWindows || isLinux;
  const validAndroidMetadata = !isAndroid || (/^([A-Za-z][A-Za-z0-9_]*\.)+[A-Za-z][A-Za-z0-9_]*$/.test(appPackageName.trim()) && /^\d+$/.test(appVersionCode.trim()) && Number(appVersionCode) > 0);
  const invalidateFastlane = () => { setFastlaneMetadata(null); setFastlaneError(null); };
  const saveDraft = async (draftStep = step) => {
    setSavingDraft(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Your login session expired. Please sign in again.");
      const submission = {
        name: appName.trim() || closedTitle.trim() || "Untitled draft", short_description: closedShortDescription.trim() || null, description: closedFullDescription.trim() || null,
        link: appLink.trim() || null, repo_url: appLink.trim() || null, source_code_url: appLink.trim() || null,
        categories: appCategories, category: appCategories[0] || null, subcategory: null, license_type: appLicenseType || null, closed_source: false,
        icon_url: appIconUrl.trim() || null, version: appVersion.trim() || null, platform: appPlatform || null, linux_package_base: isLinux ? appLinuxPackageBase || null : null,
        download_url: appDownloadUrl.trim() || null, package_name: isAndroid ? appPackageName.trim() || null : null,
        version_code: isAndroid && /^\d+$/.test(appVersionCode.trim()) ? Number(appVersionCode) : null,
        website_url: websiteUrl.trim() || null, issue_tracker_url: issueTrackerUrl.trim() || null, translation_url: translationUrl.trim() || null,
        author_name: authorName.trim() || null, author_email: authorEmail.trim() || null, author_website: authorWebsite.trim() || null,
        donate_url: donateUrl.trim() || null, liberapay: liberapay.trim() || null, opencollective: opencollective.trim() || null, bitcoin: bitcoin.trim() || null, litecoin: litecoin.trim() || null,
      };
      const response = await fetch("/api/luma/submissions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ submission, editingId: draftId, draft: true, draftStep }) });
      const result = await response.json() as { submission?: LumaSubmissionRow; error?: string };
      if (!response.ok || !result.submission) throw new Error(result.error || "Draft could not be saved");
      setDraftId(result.submission.id); setEditingId(result.submission.id); setEditingStatus("Draft"); setDraftSavedAt(new Date().toLocaleTimeString());
    } catch (error) { alert(error instanceof Error ? `Failed to save draft: ${error.message}` : "Failed to save draft."); }
    finally { setSavingDraft(false); }
  };

  const goToStep = (nextStep: number) => {
    void saveDraft(nextStep);
    setStep(nextStep);
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  useEffect(() => {
    async function fetchApps() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoadingApps(false); return; }
      setDeveloperId(user.id);
      const [{ data, error }, { data: storeApps, error: storeAppsError }] = await Promise.all([
        supabase.from("luma_submissions").select("*").eq("user_id", user.id).order("submitted_at", { ascending: false }),
        supabase.from("store_apps").select("id,luma_submission_id,developer_name").eq("developer_id", user.id).not("luma_submission_id", "is", null),
      ]);

      if (!error && data) {
        const resolvedDeveloperName = (storeApps ?? []).map((item: { developer_name?: string | null }) => item.developer_name?.trim()).find(Boolean) || null;
        setDeveloperName(resolvedDeveloperName);
        const canonicalSubmissionIds = new Set(
          (storeApps ?? [])
            .map((item: { luma_submission_id: string | null }) => item.luma_submission_id)
            .filter((id: string | null): id is string => typeof id === "string" && id.length > 0)
        );

        const rows = (data as LumaSubmissionRow[]).filter((item) => item.closed_source !== true);
        const canonicalRows = !storeAppsError
          ? rows.filter((item) => item.status !== "Approved" || canonicalSubmissionIds.has(item.id))
          : rows;

        const seenApprovedApps = new Set<string>();
        const visibleSubmissions = canonicalRows.filter((item) => {
          if (item.status !== "Approved") return true;

          const appKey = item.package_name?.trim().toLowerCase()
            || `${item.name.trim().toLowerCase()}|${(item.platform ?? "").trim().toLowerCase()}`;

          if (seenApprovedApps.has(appKey)) return false;
          seenApprovedApps.add(appKey);
          return true;
        });

        setMyApps(visibleSubmissions.map(rowToApp));
      }
      setLoadingApps(false);
    }
    void fetchApps();
  }, [supabase]);

  const resetForm = () => {
    setStep(1); setAppName(""); setAppLink(""); setAppCategories([]); setAppLicenseType(""); setAppIconUrl(""); setIconPreviewError(false);
    setAppVersion(""); setAppPlatform(""); setAppLinuxPackageBase(""); setAppDownloadUrl(""); setAppPackageName(""); setAppVersionCode("");
    setWebsiteUrl(""); setIssueTrackerUrl(""); setTranslationUrl(""); setAuthorName(""); setAuthorEmail(""); setAuthorWebsite("");
    setDonateUrl(""); setLiberapay(""); setOpencollective(""); setBitcoin(""); setLitecoin("");
    setClosedTitle(""); setClosedShortDescription(""); setClosedFullDescription(""); setClosedChangelog(""); setClosedScreenshotsText(""); setAdditionalClosedMetadata([]);
    setFastlaneMetadata(null); setFastlaneError(null); setEditingId(null); setEditingStatus(null); setDraftId(null); setDraftSavedAt(null);
  };

  const beginEdit = (app: AppSubmission) => {
    if (!(["Rejected", "Approved", "Changes Requested"] as SubmissionStatus[]).includes(app.status)) return;
    setEditingId(app.id); setEditingStatus(app.status); setAppName(app.name); setAppLink(app.repoUrl || app.link);
    setAppCategories((app.categories?.length ? app.categories : [app.category]).filter((category) => FDROID_CATEGORIES.includes(category as typeof FDROID_CATEGORIES[number])));
    setAppLicenseType(app.licenseType || ""); setAppIconUrl(app.iconUrl); setIconPreviewError(false); setAppVersion(app.version);
    setAppPlatform(app.platform === "Linux" ? "Linux" : app.platform === "Windows" ? "Windows" : app.platform === "Android" ? "Android" : "");
    setAppLinuxPackageBase(app.linuxPackageBase === "Debian-based" || app.linuxPackageBase === "RPM-based" ? app.linuxPackageBase : "");
    setAppDownloadUrl(app.downloadUrl); setAppPackageName(app.packageName); setAppVersionCode(app.versionCode);
    setWebsiteUrl(app.websiteUrl); setIssueTrackerUrl(app.issueTrackerUrl); setTranslationUrl(app.translationUrl);
    setAuthorName(app.authorName); setAuthorEmail(app.authorEmail); setAuthorWebsite(app.authorWebsite);
    setDonateUrl(app.donateUrl); setLiberapay(app.liberapay); setOpencollective(app.opencollective); setBitcoin(app.bitcoin); setLitecoin(app.litecoin);
    const english = app.localizedMetadata.find((item) => item.locale.toLowerCase() === "en-us") ?? app.localizedMetadata.find((item) => item.locale.toLowerCase().startsWith("en"));
    setClosedTitle(english?.title || app.name);
    setClosedShortDescription(english?.shortDescription || app.shortDescription);
    setClosedFullDescription(english?.fullDescription || app.description);
    setClosedChangelog(english?.changelog || app.changelog);
    setClosedScreenshotsText((english?.screenshots || app.screenshots).join("\n"));
    setAdditionalClosedMetadata(app.localizedMetadata.filter((item) => item !== english).map((item) => ({ ...item, screenshotsText: item.screenshots.join("\n") })));
    setFastlaneMetadata(null); setFastlaneError(null); setStep(1); setSubmitted(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const verifyFastlane = async () => {
    if (!isAndroid) return;
    setFastlaneLoading(true); setFastlaneError(null); setFastlaneMetadata(null);
    try {
      const metadata = await fetchFastlaneMetadata(appLink, appVersionCode);
      setFastlaneMetadata(metadata); setAppName(metadata.title);
    } catch (error) {
      setFastlaneError(error instanceof Error ? error.message : "Fastlane metadata could not be loaded.");
    } finally { setFastlaneLoading(false); }
  };

  const addClosedLanguage = () => setAdditionalClosedMetadata((items) => [...items, { locale: "", title: "", shortDescription: "", fullDescription: "", changelog: "", screenshotsText: "" }]);
  const updateClosedLanguage = (index: number, field: keyof LocalizedMetadataInput, value: string) => setAdditionalClosedMetadata((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
  const removeClosedLanguage = (index: number) => setAdditionalClosedMetadata((items) => items.filter((_, itemIndex) => itemIndex !== index));

  const isApprovedUpdate = editingStatus === "Approved";
  const isRequestedChange = editingStatus === "Changes Requested";
  const closedScreenshots = closedScreenshotsText.split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
  const englishMetadataValid = Boolean(closedTitle.trim() && closedShortDescription.trim() && closedFullDescription.trim() && closedChangelog.trim() && closedScreenshots.length > 0);
  const additionalMetadataValid = additionalClosedMetadata.every((item) => Boolean(item.locale.trim() && item.title.trim() && item.shortDescription.trim() && item.fullDescription.trim() && item.changelog.trim() && item.screenshotsText.split(/\r?\n/).some((value) => value.trim())));
  const localeKeys = ["en-US", ...additionalClosedMetadata.map((item) => item.locale.trim().toLowerCase())];
  const localesUnique = new Set(localeKeys.map((locale) => locale.toLowerCase())).size === localeKeys.length;
  const manualMetadataValid = englishMetadataValid && additionalMetadataValid && localesUnique;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault(); setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      if (!appPlatform) throw new Error("Please select a platform.");
      if (isLinux && !appLinuxPackageBase) throw new Error("Linux submissions must specify Debian-based or RPM-based.");
      if (!appDownloadUrl.trim()) throw new Error("A download URL is required.");
      if (!validAndroidMetadata) throw new Error("Android apps require a valid package name and positive versionCode.");
      if (!appCategories.length || appCategories.some((category) => !FDROID_CATEGORIES.includes(category as typeof FDROID_CATEGORIES[number]))) throw new Error("Please select at least one valid F-Droid category.");
      if (!appLicenseType) throw new Error("Please select an open-source license.");
      githubRepository(appLink);
      if (manualStoreMetadata && !manualMetadataValid) throw new Error("Manual store metadata requires complete English metadata and complete optional languages.");

      const localizedMetadata: LocalizedMetadata[] = manualStoreMetadata ? [
        { locale: "en-US", title: closedTitle.trim(), shortDescription: closedShortDescription.trim(), fullDescription: closedFullDescription.trim(), changelog: closedChangelog.trim(), screenshots: closedScreenshots },
        ...additionalClosedMetadata.map((item) => ({ locale: item.locale.trim(), title: item.title.trim(), shortDescription: item.shortDescription.trim(), fullDescription: item.fullDescription.trim(), changelog: item.changelog.trim(), screenshots: item.screenshotsText.split(/\r?\n/).map((value) => value.trim()).filter(Boolean) })),
      ] : [];

      const currentStoreMetadata = manualStoreMetadata ? {
        title: localizedMetadata[0].title,
        shortDescription: localizedMetadata[0].shortDescription,
        fullDescription: localizedMetadata[0].fullDescription,
        changelog: localizedMetadata[0].changelog,
        screenshots: localizedMetadata[0].screenshots,
        locale: "en-US",
        branch: "manual",
      } : await fetchFastlaneMetadata(appLink.trim(), appVersionCode);
      setFastlaneMetadata(currentStoreMetadata); setAppName(currentStoreMetadata.title);

      const appMetadata = {
        name: currentStoreMetadata.title,
        short_description: currentStoreMetadata.shortDescription,
        description: currentStoreMetadata.fullDescription,
        link: appLink.trim(),
        repo_url: appLink.trim(),
        source_code_url: appLink.trim(),
        category: appCategories[0],
        categories: appCategories,
        subcategory: null,
        license_type: appLicenseType,
        closed_source: false,
        localized_metadata: localizedMetadata,
        icon_url: appIconUrl.trim(),
        version: appVersion.trim(),
        platform: appPlatform,
        linux_package_base: isLinux ? appLinuxPackageBase : null,
        download_url: appDownloadUrl.trim(),
        changelog: currentStoreMetadata.changelog,
        package_name: isAndroid ? appPackageName.trim() : null,
        version_code: isAndroid ? Number(appVersionCode) : null,
        screenshots: currentStoreMetadata.screenshots,
        website_url: websiteUrl.trim() || null,
        issue_tracker_url: issueTrackerUrl.trim() || null,
        translation_url: translationUrl.trim() || null,
        author_name: authorName.trim() || null,
        author_email: authorEmail.trim() || null,
        author_website: authorWebsite.trim() || null,
        donate_url: donateUrl.trim() || null,
        liberapay: liberapay.trim() || null,
        opencollective: opencollective.trim() || null,
        bitcoin: bitcoin.trim() || null,
        litecoin: litecoin.trim() || null,
      };

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Your login session expired. Please sign in again.");
      if (!session.provider_token) throw new Error("GitHub authorization is required. Please sign out and sign in with GitHub again.");

      const response = await fetch("/api/luma/submissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          "X-GitHub-Token": session.provider_token,
        },
        body: JSON.stringify({ submission: appMetadata, editingId: draftId || editingId, editingStatus: draftId ? "Draft" : editingStatus }),
      });
      const result = await response.json() as { submission?: LumaSubmissionRow; error?: string };
      if (!response.ok) throw new Error(result.error || "Submission could not be saved");
      const data = result.submission ?? null;
      if (!data) throw new Error("Submission could not be saved");
      const savedApp = rowToApp(data);
      if (editingId) setMyApps((apps) => apps.map((app) => app.id === editingId ? savedApp : app));
      else setMyApps((apps) => [savedApp, ...apps]);
      setSubmitted(true); setEditingId(null); setEditingStatus(null);
    } catch (err) {
      const error = err as { message?: string; code?: string; details?: string; hint?: string };
      const details = [error.message, error.code, error.details, error.hint].filter(Boolean).join(" | ");
      alert(`Failed to save submission${details ? `: ${details}` : "."}`);
    } finally { setIsSubmitting(false); }
  };

  const getStatusColor = (status: SubmissionStatus) => {
    switch (status) {
      case "Draft": return "border-slate-600/50 bg-slate-800/50 text-slate-300";
      case "Pending": return "border-yellow-700/50 bg-yellow-900/30 text-yellow-300";
      case "In Review": return "border-blue-700/50 bg-blue-900/30 text-blue-300";
      case "Changes Requested": return "border-orange-700/50 bg-orange-900/30 text-orange-300";
      case "Approved": return "border-emerald-700/50 bg-emerald-900/30 text-emerald-300";
      case "Rejected": return "border-red-700/50 bg-red-900/30 text-red-300";
    }
  };

  if (submitted) return (
    <div className="glass-page mx-auto max-w-3xl py-16 text-center"><div className={`${cardClass} p-10`}>
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-950/40 text-2xl text-emerald-300">✓</div>
      <h1 className="text-3xl font-bold text-white">{isApprovedUpdate ? "Update submitted" : isRequestedChange ? "Changes resubmitted" : "Submission received"}</h1>
      <p className="mt-3 text-slate-400">App metadata for <strong className="text-white">{appName}</strong> were saved. The automatic security scan and validation will run next.</p>
      <button onClick={() => { setSubmitted(false); resetForm(); }} className="mt-8 rounded-xl bg-indigo-600 px-5 py-2.5 font-medium text-white hover:bg-indigo-500">Back to apps</button>
    </div></div>
  );

  return (
    <div className="glass-page mx-auto max-w-6xl space-y-8 pb-20">
      <header className="border-b border-slate-800 pb-7">
        <h1 className="text-3xl font-bold text-white"><span className="bg-gradient-to-r from-pink-500 to-indigo-500 bg-clip-text text-transparent">Luma Store</span> Developer Portal</h1>
        <p className="mt-2 max-w-2xl text-slate-400">Submit and maintain Android, Windows and Linux apps.</p>
      </header>

      <section className={cardClass}><div className="border-b border-slate-800 px-6 py-5"><h2 className="font-semibold text-white">Luma Store downloads</h2><p className="mt-1 text-xs text-slate-500">Combined across all of your published apps and all versions. Only files hosted by Luma Store are counted.</p></div><div className="p-6"><div className="rounded-xl border border-slate-800 bg-slate-950/45 p-4"><p className="text-xs uppercase tracking-wider text-slate-500">All-time downloads</p><p className="mt-2 text-2xl font-bold text-white">{Object.values(downloadStats).reduce((sum,row)=>sum+Number(row.total||0),0).toLocaleString()}</p></div></div>{developerName&&<div className="border-t border-slate-800 px-6 py-5"><p className="mb-3 text-xs uppercase tracking-wide text-slate-500">README badge · all apps</p><div className="flex flex-wrap items-center gap-3"><img src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/download-badge?developer_name=${encodeURIComponent(developerName)}&badge_v=2`} alt="Luma Store total downloads" className="h-5 w-auto"/><button type="button" onClick={()=>navigator.clipboard.writeText(`[![Luma Store total downloads](${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/download-badge?developer_name=${encodeURIComponent(developerName)}&badge_v=2)](${window.location.origin}/discover/developers/${encodeURIComponent(developerName)})`)} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 hover:text-white">Copy badge Markdown</button></div></div>}</section>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <main className="space-y-8">
          <section className={cardClass}>
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-5"><div><h2 className="font-semibold text-white">{isApprovedUpdate ? "Submit App Update" : isRequestedChange ? "Fix Requested Changes" : editingId ? "Edit Rejected Submission" : "New App Submission"}</h2><p className="mt-1 text-xs text-slate-500">Step {step} of 3</p></div><div className="flex gap-1.5">{[1,2,3].map((item)=><div key={item} className={`h-1.5 w-9 rounded-full ${item<=step?"bg-indigo-500":"bg-slate-700"}`}/>)}</div></div>
            <form onSubmit={handleSubmit} className="p-6 md:p-8">
              <div className="mb-5 flex flex-wrap items-center justify-end gap-3"><span className="text-xs text-slate-500">{draftSavedAt ? `Draft saved ${draftSavedAt}` : "Not saved yet"}</span><button type="button" onClick={()=>void saveDraft()} disabled={savingDraft} className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-200 hover:text-white disabled:opacity-40">{savingDraft ? "Saving…" : "Save draft"}</button></div>
              {step === 1 && <div className="space-y-6">
                
                <div className="grid gap-5 md:grid-cols-2">
                  <div><label className="mb-2 block text-sm font-medium text-slate-300">Platform</label><div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-950/70">{(["Android","Windows","Linux"] as AppPlatform[]).map((platform)=><label key={platform} className="flex cursor-pointer items-center gap-3 border-b border-slate-800 px-4 py-3 text-sm text-slate-200 last:border-b-0 hover:bg-slate-900/80"><input type="radio" name="app-platform" value={platform} checked={appPlatform===platform} onChange={()=>{setAppPlatform(platform);if(platform!=="Linux")setAppLinuxPackageBase("");invalidateFastlane();}} className="h-4 w-4 accent-indigo-500"/><span>{platform}</span></label>)}</div></div>
                  {isLinux && <div><label className="mb-2 block text-sm font-medium text-slate-300">Linux package base</label><select required value={appLinuxPackageBase} onChange={(e)=>setAppLinuxPackageBase(e.target.value as LinuxPackageBase)} className={fieldClass}><option value="">Select package base…</option><option value="Debian-based">Debian-based (.deb)</option><option value="RPM-based">RPM-based (.rpm)</option></select></div>}
                </div>
                <div className="grid gap-5 md:grid-cols-2">
                  <div><label className="mb-2 block text-sm font-medium text-slate-300">F-Droid Categories</label><div className="max-h-64 overflow-y-auto rounded-xl border border-slate-700 bg-slate-950/70">{FDROID_CATEGORIES.map((category)=><label key={category} className="flex cursor-pointer items-center gap-3 border-b border-slate-800 px-4 py-3 text-sm text-slate-200 last:border-b-0 hover:bg-slate-900/80"><input type="checkbox" checked={appCategories.includes(category)} onChange={(e)=>setAppCategories((current)=>e.target.checked ? [...new Set([...current, category])] : current.filter((item)=>item!==category))} className="h-4 w-4 accent-indigo-500"/><span>{category}</span></label>)}</div><p className="mt-2 text-xs text-slate-500">{appCategories.length ? `${appCategories.length} selected` : "No category selected"} · Select all categories that apply.</p></div>
                  <div><label className="mb-2 block text-sm font-medium text-slate-300">Open-Source License</label><div className="max-h-64 overflow-y-auto rounded-xl border border-slate-700 bg-slate-950/70">{LICENSE_OPTIONS.map(([value,label])=><label key={value} className="flex cursor-pointer items-center gap-3 border-b border-slate-800 px-4 py-3 text-sm text-slate-200 last:border-b-0 hover:bg-slate-900/80"><input type="radio" name="app-license" value={value} checked={appLicenseType===value} onChange={()=>setAppLicenseType(value)} className="h-4 w-4 accent-indigo-500"/><span>{label} <span className="text-slate-500">({value})</span></span></label>)}</div><p className="mt-2 text-xs text-slate-500">{appLicenseType ? `Selected: ${LICENSE_OPTIONS.find(([value])=>value===appLicenseType)?.[1] || appLicenseType}` : "No license selected"} · Select one license.</p></div>
                </div>
                <div><label className="mb-2 block text-sm font-medium text-slate-300">App Icon URL</label><div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px]"><input type="url" required value={appIconUrl} onChange={(e)=>{setAppIconUrl(e.target.value);setIconPreviewError(false);}} className={fieldClass}/><div className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4 text-center"><div className="mx-auto flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border border-slate-700 bg-slate-900">{appIconUrl.trim()&&!iconPreviewError?<img src={appIconUrl.trim()} alt="App icon preview" className="h-full w-full object-cover" onError={()=>setIconPreviewError(true)}/>:<span className="text-xs text-slate-500">No icon</span>}</div></div></div></div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-5"><h3 className="font-semibold text-white">Author</h3><div className="mt-4 grid gap-4 md:grid-cols-2"><div><label className="mb-2 block text-sm text-slate-300">Author name</label><input value={authorName} onChange={(e)=>setAuthorName(e.target.value)} className={fieldClass}/></div><div><label className="mb-2 block text-sm text-slate-300">Author email</label><input type="email" value={authorEmail} onChange={(e)=>setAuthorEmail(e.target.value)} className={fieldClass}/></div><div className="md:col-span-2"><label className="mb-2 block text-sm text-slate-300">Author website</label><input type="url" value={authorWebsite} onChange={(e)=>setAuthorWebsite(e.target.value)} className={fieldClass}/></div></div></div>
                <div className="flex justify-end"><button type="button" onClick={()=>goToStep(2)} disabled={!appPlatform||(isLinux&&!appLinuxPackageBase)} className="rounded-xl bg-indigo-600 px-5 py-2.5 font-medium text-white hover:bg-indigo-500 disabled:opacity-40">Next</button></div>
              </div>}

              {step === 2 && <div className="space-y-6">
                <div><label className="mb-2 block text-sm font-medium text-slate-300">GitHub Project / Source URL</label><input type="url" value={appLink} onChange={(e)=>{setAppLink(e.target.value);invalidateFastlane();}} className={fieldClass}/><p className="mt-2 text-xs text-slate-500">The repository must be public. Your GitHub account must own it or have write access.</p></div>

                {manualStoreMetadata && <div className="space-y-5">
                  <div className="rounded-2xl border border-fuchsia-700/30 bg-fuchsia-950/10 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold text-white">English store metadata</h3><p className="mt-1 text-xs text-slate-500">Required for Windows and Linux apps · locale en-US.</p></div><span className="rounded-full border border-fuchsia-700/50 px-2.5 py-1 text-xs text-fuchsia-300">Required</span></div><div className="mt-4 grid gap-4"><div><label className="mb-2 block text-sm text-slate-300">Title</label><input required value={closedTitle} onChange={(e)=>setClosedTitle(e.target.value)} className={fieldClass}/></div><div><label className="mb-2 block text-sm text-slate-300">Short description</label><textarea required value={closedShortDescription} onChange={(e)=>setClosedShortDescription(e.target.value)} className={fieldClass}/></div><div><label className="mb-2 block text-sm text-slate-300">Full description</label><textarea required rows={8} value={closedFullDescription} onChange={(e)=>setClosedFullDescription(e.target.value)} className={fieldClass}/></div><div><label className="mb-2 block text-sm text-slate-300">Changelog</label><textarea required rows={5} value={closedChangelog} onChange={(e)=>setClosedChangelog(e.target.value)} className={fieldClass}/></div><div><label className="mb-2 block text-sm text-slate-300">Screenshot URLs</label><textarea required rows={5} value={closedScreenshotsText} onChange={(e)=>setClosedScreenshotsText(e.target.value)} className={fieldClass} placeholder="https://.../screenshot1.png\nhttps://.../screenshot2.png"/></div></div></div>
                  {additionalClosedMetadata.map((metadata,index)=><div key={index} className="rounded-2xl border border-slate-700 bg-slate-950/30 p-5"><div className="flex items-center justify-between"><h3 className="font-semibold text-white">Additional language</h3><button type="button" onClick={()=>removeClosedLanguage(index)} className="text-xs text-red-300">Remove</button></div><div className="mt-4 grid gap-4"><input required value={metadata.locale} onChange={(e)=>updateClosedLanguage(index,"locale",e.target.value)} className={fieldClass} placeholder="de-DE"/><input required value={metadata.title} onChange={(e)=>updateClosedLanguage(index,"title",e.target.value)} className={fieldClass} placeholder="Title"/><textarea required value={metadata.shortDescription} onChange={(e)=>updateClosedLanguage(index,"shortDescription",e.target.value)} className={fieldClass} placeholder="Short description"/><textarea required rows={6} value={metadata.fullDescription} onChange={(e)=>updateClosedLanguage(index,"fullDescription",e.target.value)} className={fieldClass} placeholder="Full description"/><textarea required rows={4} value={metadata.changelog} onChange={(e)=>updateClosedLanguage(index,"changelog",e.target.value)} className={fieldClass} placeholder="Changelog"/><textarea required rows={4} value={metadata.screenshotsText} onChange={(e)=>updateClosedLanguage(index,"screenshotsText",e.target.value)} className={fieldClass} placeholder="Screenshot URLs, one per line"/></div></div>)}
                  <button type="button" onClick={addClosedLanguage} className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-slate-200">+ Add language</button>
                </div>}

                <div className="grid gap-5 md:grid-cols-2">
                  <div><label className="mb-2 block text-sm text-slate-300">Download URL</label><input type="url" required value={appDownloadUrl} onChange={(e)=>setAppDownloadUrl(e.target.value)} className={fieldClass}/></div>
                  <div><label className="mb-2 block text-sm text-slate-300">Version</label><input required value={appVersion} onChange={(e)=>setAppVersion(e.target.value)} className={fieldClass}/></div>
                  {isAndroid && <><div><label className="mb-2 block text-sm text-slate-300">Android Package Name</label><input required value={appPackageName} onChange={(e)=>setAppPackageName(e.target.value)} className={fieldClass}/></div><div><label className="mb-2 block text-sm text-slate-300">Android versionCode</label><input type="number" min={1} required value={appVersionCode} onChange={(e)=>{setAppVersionCode(e.target.value);invalidateFastlane();}} className={fieldClass}/></div></>}
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-5"><h3 className="font-semibold text-white">App links</h3><div className="mt-4 grid gap-4"><div><label className="mb-2 block text-sm text-slate-300">Website</label><input type="url" value={websiteUrl} onChange={(e)=>setWebsiteUrl(e.target.value)} className={fieldClass}/></div><div><label className="mb-2 block text-sm text-slate-300">Issue tracker</label><input type="url" value={issueTrackerUrl} onChange={(e)=>setIssueTrackerUrl(e.target.value)} className={fieldClass}/></div><div><label className="mb-2 block text-sm text-slate-300">Translation</label><input type="url" value={translationUrl} onChange={(e)=>setTranslationUrl(e.target.value)} className={fieldClass}/></div></div></div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-5"><h3 className="font-semibold text-white">Donations</h3><div className="mt-4 grid gap-4 md:grid-cols-2"><div className="md:col-span-2"><label className="mb-2 block text-sm text-slate-300">Donation URL</label><input type="url" value={donateUrl} onChange={(e)=>setDonateUrl(e.target.value)} className={fieldClass}/></div><div><label className="mb-2 block text-sm text-slate-300">Liberapay</label><input value={liberapay} onChange={(e)=>setLiberapay(e.target.value)} className={fieldClass}/></div><div><label className="mb-2 block text-sm text-slate-300">OpenCollective</label><input value={opencollective} onChange={(e)=>setOpencollective(e.target.value)} className={fieldClass}/></div><div><label className="mb-2 block text-sm text-slate-300">Bitcoin address</label><input value={bitcoin} onChange={(e)=>setBitcoin(e.target.value)} className={fieldClass}/></div><div><label className="mb-2 block text-sm text-slate-300">Litecoin address</label><input value={litecoin} onChange={(e)=>setLitecoin(e.target.value)} className={fieldClass}/></div></div></div>

                {!manualStoreMetadata && <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4"><button type="button" onClick={verifyFastlane} disabled={!appLink.trim()||!validAndroidMetadata||fastlaneLoading} className="rounded-xl bg-slate-700 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40">{fastlaneLoading?"Checking Fastlane…":"Check Fastlane metadata"}</button>{fastlaneError&&<p className="mt-3 text-sm text-red-400">{fastlaneError}</p>}</div>}
                {fastlaneMetadata&&<div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/10 p-5"><p className="text-sm font-semibold text-emerald-300">Store metadata ready</p><p className="mt-1 text-xs text-slate-500">{fastlaneMetadata.locale} · {fastlaneMetadata.screenshots.length} screenshots</p><p className="mt-4 text-lg font-semibold text-white">{fastlaneMetadata.title}</p></div>}
                <div className="flex justify-between"><button type="button" onClick={()=>goToStep(1)} className="rounded-xl bg-slate-800 px-5 py-2.5 text-white">Back</button><button type="button" onClick={()=>{if(manualStoreMetadata&&manualMetadataValid){setFastlaneMetadata({title:closedTitle.trim(),shortDescription:closedShortDescription.trim(),fullDescription:closedFullDescription.trim(),changelog:closedChangelog.trim(),screenshots:closedScreenshots,locale:"en-US",branch:"manual"});setAppName(closedTitle.trim());} goToStep(3);}} disabled={manualStoreMetadata?!manualMetadataValid:!fastlaneMetadata} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-white disabled:opacity-40">Continue</button></div>
              </div>}

              {step === 3 && <div className="space-y-6"><div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5"><dl className="grid gap-4 text-sm md:grid-cols-2"><div><dt className="text-slate-500">Title</dt><dd className="text-white">{fastlaneMetadata?.title}</dd></div><div><dt className="text-slate-500">Platform</dt><dd className="text-white">{appPlatform}{isLinux&&appLinuxPackageBase?` · ${appLinuxPackageBase}`:""}</dd></div><div><dt className="text-slate-500">Categories</dt><dd className="text-white">{appCategories.join(", ")}</dd></div><div><dt className="text-slate-500">Source model</dt><dd className="text-white">Open source</dd></div><div><dt className="text-slate-500">License</dt><dd className="text-white">{appLicenseType}</dd></div><div><dt className="text-slate-500">Version</dt><dd className="text-white">{appVersion}</dd></div>{isAndroid&&<div><dt className="text-slate-500">Package</dt><dd className="break-all text-white">{appPackageName}</dd></div>}<div><dt className="text-slate-500">Author</dt><dd className="text-white">{authorName||"—"}</dd></div><div><dt className="text-slate-500">Website</dt><dd className="break-all text-white">{websiteUrl||"—"}</dd></div><div><dt className="text-slate-500">Donations</dt><dd className="text-white">{[donateUrl,liberapay,opencollective,bitcoin,litecoin].filter(Boolean).length} configured</dd></div></dl></div><div className="flex justify-between"><button type="button" onClick={()=>setStep(2)} className="rounded-xl bg-slate-800 px-5 py-2.5 text-white">Back</button><button type="submit" disabled={isSubmitting||!fastlaneMetadata} className="rounded-xl bg-emerald-600 px-5 py-2.5 font-medium text-white disabled:opacity-40">{isSubmitting?"Saving…":isApprovedUpdate?"Submit Update":isRequestedChange?"Resubmit Changes":"Submit App"}</button></div></div>}
            </form>
          </section>

          <section className={cardClass}><div className="border-b border-slate-800 px-6 py-5"><h2 className="font-semibold text-white">My submissions</h2></div><div className="divide-y divide-slate-800">{loadingApps?<div className="p-6 text-slate-400">Loading…</div>:myApps.length===0?<div className="p-6 text-slate-400">No submissions yet.</div>:myApps.map((app)=><div key={app.id} className="grid gap-4 p-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-white">{app.name}</h3><span className={`rounded-full border px-2 py-0.5 text-xs ${getStatusColor(app.status)}`}>{app.status}</span></div><p className="mt-1 line-clamp-2 text-sm text-slate-400">{app.shortDescription||app.description}</p><p className="mt-2 text-xs text-slate-500">{app.category} · {app.platform}{app.platform==="Linux"&&app.linuxPackageBase?` (${app.linuxPackageBase})`:""} · {app.version||"No version"}</p>{submissionStoreIds[app.id]&&downloadStats[submissionStoreIds[app.id]]&&<><div className="mt-3 text-xs text-slate-300"><span>All-time downloads: {downloadStats[submissionStoreIds[app.id]].total}</span></div><div className="mt-3 flex flex-wrap items-center gap-2"><img src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/download-badge?app_id=${encodeURIComponent(submissionStoreIds[app.id])}`} alt={`${app.name} Luma Store downloads`} className="h-5 w-auto"/><button type="button" onClick={()=>navigator.clipboard.writeText(`[![Luma Store downloads](${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/download-badge?app_id=${submissionStoreIds[app.id]})](${window.location.origin}/discover/${submissionStoreIds[app.id]})`)} className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs text-slate-300 hover:text-white">Copy badge Markdown</button></div></>}</div><div className="flex gap-2"><Link href={`/dashboard/apps/${app.id}`} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm text-white">Details</Link>{(["Rejected","Approved","Changes Requested"] as SubmissionStatus[]).includes(app.status)&&<button type="button" onClick={()=>beginEdit(app)} className="rounded-xl bg-slate-800 px-4 py-2 text-sm text-white">{app.status==="Approved"?"Submit update":app.status==="Changes Requested"?"Fix changes":"Edit & resubmit"}</button>}</div></div>)}</div></section>
        </main>

        <aside className="space-y-4"><div className={`${cardClass} p-5`}><h3 className="font-semibold text-white">Platform rules</h3><p className="mt-2 text-sm leading-6 text-slate-400">Every submission needs a platform. Android, Windows and Linux are supported. Linux submissions additionally require either Debian-based or RPM-based packaging.</p></div><div className={`${cardClass} p-5`}><h3 className="font-semibold text-white">Android Fastlane requirements</h3><ul className="mt-4 space-y-2 text-sm text-slate-400"><li>• title.txt</li><li>• short_description.txt</li><li>• full_description.txt</li><li>• changelogs/&lt;versionCode&gt;.txt or default.txt</li><li>• images/phoneScreenshots/*</li></ul></div></aside>
      </div>
    </div>
  );
}
