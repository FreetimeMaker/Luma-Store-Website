import Link from "next/link";

const capabilities = [
  {
    title: "Discover",
    description: "Browse published apps with clear metadata, platform downloads and release information.",
  },
  {
    title: "Verify",
    description: "Review source links, licenses, artifact hashes and platform-specific details before downloading.",
  },
  {
    title: "Publish",
    description: "Submit and maintain Android, Linux and Windows releases from one developer workflow.",
  },
];

const listingDetails = [
  "Platform-specific downloads",
  "Screenshots and changelogs",
  "License and source information",
  "Developer and project links",
];

export default function HomePage() {
  return (
    <div className="glass-page mx-auto max-w-6xl space-y-16 pb-20 pt-8 sm:pt-12">
      <section className="grid gap-10 border-b border-white/10 pb-14 lg:grid-cols-[1.2fr_.8fr] lg:items-center">
        <div>
          <p className="ui-eyebrow">Luma Store</p>
          <h1 className="ui-title mt-4 max-w-3xl text-4xl leading-tight sm:text-5xl lg:text-6xl">
            Open-source apps with clear release information.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-400 sm:text-lg">
            Discover applications, review their metadata and download verified platform artifacts from a focused, developer-friendly catalog.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/discover" className="ui-button-primary px-5 py-3 text-sm">
              Browse apps
            </Link>
            <Link href="/login?next=/dashboard" className="ui-button-secondary px-5 py-3 text-sm">
              Developer dashboard
            </Link>
          </div>
        </div>

        <div className="ui-panel p-5 sm:p-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <p className="text-sm font-semibold text-white">App listing</p>
              <p className="mt-1 text-xs text-slate-500">What every published app can show</p>
            </div>
            <span className="ui-badge">Open source</span>
          </div>
          <ul className="mt-2 divide-y divide-white/10">
            {listingDetails.map((item) => (
              <li key={item} className="flex items-center gap-3 py-3 text-sm text-slate-300">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section>
        <div className="max-w-2xl">
          <p className="ui-eyebrow">Product principles</p>
          <h2 className="ui-title mt-2 text-2xl sm:text-3xl">Built around useful information.</h2>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Luma Store keeps the interface secondary to the app information. The important actions and metadata stay easy to scan on desktop and mobile.
          </p>
        </div>

        <div className="mt-7 grid gap-4 md:grid-cols-3">
          {capabilities.map((item, index) => (
            <article key={item.title} className="ui-panel p-5">
              <div className="text-xs font-semibold tabular-nums text-slate-600">0{index + 1}</div>
              <h3 className="mt-6 text-base font-semibold text-white">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="ui-panel flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div>
          <h2 className="text-xl font-semibold text-white">Publishing an app?</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Use the developer dashboard to submit releases, maintain metadata and review download analytics.
          </p>
        </div>
        <Link href="/login?next=/dashboard" className="ui-button-primary shrink-0 px-5 py-3 text-sm">
          Open dashboard
        </Link>
      </section>
    </div>
  );
}
