export type FastlaneMetadata = {
  title: string;
  shortDescription: string;
  fullDescription: string;
  changelog: string;
  screenshots: string[];
  locale: string;
  branch: string;
};

function githubRepository(projectUrl: string): { owner: string; repo: string; branches: string[] } {
  let parsed: URL;
  try {
    parsed = new URL(projectUrl.trim());
  } catch {
    throw new Error("Please enter a valid GitHub repository URL.");
  }

  if (parsed.hostname.toLowerCase() !== "github.com") {
    throw new Error("Fastlane metadata is currently read from GitHub repositories. Please use a github.com repository URL.");
  }

  const parts = parsed.pathname.split("/").filter(Boolean);
  if (parts.length < 2) throw new Error("Please enter the URL of a GitHub repository.");

  const branchFromUrl = parts[2] === "tree" && parts[3] ? decodeURIComponent(parts[3]) : null;
  return {
    owner: parts[0],
    repo: parts[1].replace(/\.git$/i, ""),
    branches: Array.from(new Set([branchFromUrl, "main", "master"].filter(Boolean))) as string[],
  };
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return null;
    const value = (await response.text()).trim();
    return value || null;
  } catch {
    return null;
  }
}

async function fetchPhoneScreenshots(owner: string, repo: string, branch: string, locale: string): Promise<string[]> {
  const path = `fastlane/metadata/android/${locale}/images/phoneScreenshots`;
  const apiUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path}?ref=${encodeURIComponent(branch)}`;

  try {
    const response = await fetch(apiUrl, {
      cache: "no-store",
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!response.ok) return [];

    const data = await response.json();
    if (!Array.isArray(data)) return [];

    return data
      .filter((item) => item?.type === "file" && typeof item?.name === "string" && /\.(png|jpe?g)$/i.test(item.name))
      .sort((a, b) => String(a.name).localeCompare(String(b.name)))
      .map((item) => item.download_url)
      .filter((url): url is string => typeof url === "string" && url.length > 0);
  } catch {
    return [];
  }
}

export async function fetchFastlaneIconUrl(projectUrl: string | null | undefined): Promise<string | null> {
  if (!projectUrl) return null;

  try {
    const { owner, repo, branches } = githubRepository(projectUrl);
    const locales = ["en-US", "en-GB", "de-DE", "en", "de"];
    const preferredNames = ["icon.png", "icon.webp", "icon.jpg", "icon.jpeg", "featureGraphic.png", "featureGraphic.jpg"];

    for (const branch of branches) {
      for (const locale of locales) {
        const imagesPath = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/fastlane/metadata/android/${locale}/images?ref=${encodeURIComponent(branch)}`;
        const response = await fetch(imagesPath, {
          cache: "no-store",
          headers: { Accept: "application/vnd.github+json" },
        });

        if (!response.ok) continue;

        const payload = await response.json();
        if (!Array.isArray(payload)) continue;

        const match = payload.find((item) => {
          if (!item || typeof item !== "object") return false;
          const name = typeof item.name === "string" ? item.name.toLowerCase() : "";
          return preferredNames.includes(name);
        });

        if (match && typeof match.download_url === "string" && match.download_url.length > 0) {
          return match.download_url;
        }
      }
    }
  } catch {
    return null;
  }

  return null;
}

export async function fetchFastlaneMetadata(projectUrl: string, versionCode: string): Promise<FastlaneMetadata> {
  const numericVersionCode = Number(versionCode);
  if (!Number.isInteger(numericVersionCode) || numericVersionCode <= 0) {
    throw new Error("Enter a positive Android versionCode before checking Fastlane metadata.");
  }

  const { owner, repo, branches } = githubRepository(projectUrl);

  for (const branch of branches) {
    for (const locale of ["en-US", "en-GB", "de-DE", "en", "de"]) {
      const base = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/fastlane/metadata/android/${locale}`;
      const title = await fetchText(`${base}/title.txt`);
      if (!title) continue;

      const shortDescription = await fetchText(`${base}/short_description.txt`);
      const fullDescription = await fetchText(`${base}/full_description.txt`);
      if (!shortDescription || !fullDescription) continue;

      const changelog =
        (await fetchText(`${base}/changelogs/${numericVersionCode}.txt`))
        ?? (await fetchText(`${base}/changelogs/default.txt`));
      if (!changelog) continue;

      const screenshots = await fetchPhoneScreenshots(owner, repo, branch, locale);
      if (screenshots.length > 0) {
        return { title, shortDescription, fullDescription, changelog, screenshots, locale, branch };
      }
    }
  }

  throw new Error(
    "Fastlane metadata is incomplete. Luma Store requires title.txt, short_description.txt, full_description.txt, a changelog for the versionCode (or default.txt), and at least one phone screenshot."
  );
}
