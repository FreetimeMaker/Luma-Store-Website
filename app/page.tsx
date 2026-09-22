import Link from "next/link";

const highlights = [
  {
    title: "Discover apps",
    description: "Browse the Luma Store catalog and open a dedicated details page for every published app.",
    icon: "search",
  },
  {
    title: "Clear app information",
    description: "See descriptions, screenshots, changelogs, licenses, source type and useful links in one place.",
    icon: "details",
  },
  {
    title: "Built for developers",
    description: "Submit and manage apps from the developer dashboard and follow each automatic security scan through publishing.",
    icon: "code",
  },
];

const appDetails = [
  "Screenshots & changelogs",
  "License & source information",
  "Categories & app metadata",
  "Developer and project links",
];

function FeatureIcon({ type }: { type: string }) {
  if (type === "search") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
        <circle cx="11" cy="11" r="6.5" />
        <path d="m16 16 4 4" />
      </svg>
    );
  }

  if (type === "details") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
        <path d="M5 4.5h14v15H5z" />
        <path d="M8 8h8M8 12h8M8 16h5" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
      <path d="m8.5 8-4 4 4 4M15.5 8l4 4-4 4M13.5 5l-3 14" />
    </svg>
  );
}

export default function HomePage() {
  return (
    <div className="glass-page mx-auto max-w-6xl pb-16 pt-4 sm:pb-24 sm:pt-8">
      <section className="relative isolate overflow-hidden rounded-[2rem] border border-indigo-400/15 bg-slate-900/70 shadow-2xl shadow-black/25">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_0%,rgba(99,102,241,0.28),transparent_36%),radial-gradient(circle_at_92%_16%,rgba(168,85,247,0.20),transparent_30%),linear-gradient(to_bottom_right,rgba(15,23,42,0.15),rgba(2,6,23,0.7))]" />
        <div className="pointer-events-none absolute -right-24 -top-24 -z-10 h-72 w-72 rounded-full border border-indigo-400/10" />
        <div className="pointer-events-none absolute -right-8 -top-8 -z-10 h-44 w-44 rounded-full border border-violet-400/10" />

        <div className="grid gap-12 px-6 py-12 sm:px-10 sm:py-16 lg:grid-cols-[1.12fr_0.88fr] lg:items-center lg:px-14 lg:py-20">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-500/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-200">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-300 shadow-[0_0_12px_rgba(165,180,252,0.9)]" />
              Luma Store
            </div>

            <h1 className="mt-6 max-w-3xl text-4xl font-bold tracking-[-0.035em] text-white sm:text-5xl lg:text-6xl lg:leading-[1.05]">
              Discover apps. <span className="bg-gradient-to-r from-indigo-300 via-violet-300 to-fuchsia-300 bg-clip-text text-transparent">Know what you install.</span>
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
              Luma Store brings published Android apps, detailed metadata and developer publishing tools together in one clean experience.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/discover"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-indigo-500 px-6 py-3 font-semibold text-white shadow-lg shadow-indigo-950/30 transition hover:-translate-y-0.5 hover:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-300/60"
              >
                Explore apps
                <span aria-hidden="true">→</span>
              </Link>
              <Link
                href="/login?next=/dashboard"
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-700 bg-slate-950/55 px-6 py-3 font-semibold text-slate-200 transition hover:-translate-y-0.5 hover:border-slate-600 hover:bg-slate-800/80 hover:text-white focus:outline-none focus:ring-2 focus:ring-slate-500/50"
              >
                Developer dashboard
              </Link>
            </div>

            <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-400">
              <span className="inline-flex items-center gap-2"><span className="text-emerald-300">✓</span> Android apps</span>
              <span className="inline-flex items-center gap-2"><span className="text-emerald-300">✓</span> Open-source apps</span>
              <span className="inline-flex items-center gap-2"><span className="text-emerald-300">✓</span> Detailed app pages</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md lg:ml-auto">
            <div className="absolute -inset-8 -z-10 rounded-full bg-indigo-500/10 blur-3xl" />
            <div className="overflow-hidden rounded-3xl border border-slate-700/80 bg-slate-950/80 shadow-2xl shadow-black/30 backdrop-blur">
              <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white shadow-lg shadow-indigo-950/40">L</div>
                  <div>
                    <p className="text-sm font-semibold text-white">Luma Store</p>
                    <p className="text-[11px] text-slate-500">Discover</p>
                  </div>
                </div>
                <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300">Catalog</div>
              </div>

              <div className="p-5">
                <div className="rounded-2xl border border-indigo-400/15 bg-gradient-to-br from-indigo-500/10 to-violet-500/5 p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-indigo-400/20 bg-indigo-500/15 text-lg font-bold text-indigo-200">A</div>
                    <div className="min-w-0 flex-1">
                      <div className="h-4 w-32 rounded-full bg-slate-200/90" />
                      <div className="mt-2 h-2.5 w-20 rounded-full bg-slate-700" />
                      <div className="mt-4 flex gap-2">
                        <div className="h-6 w-16 rounded-full bg-indigo-500/15" />
                        <div className="h-6 w-20 rounded-full bg-emerald-500/10" />
                      </div>
                    </div>
                  </div>
                  <div className="mt-5 space-y-2">
                    <div className="h-2.5 w-full rounded-full bg-slate-800" />
                    <div className="h-2.5 w-11/12 rounded-full bg-slate-800" />
                    <div className="h-2.5 w-3/5 rounded-full bg-slate-800" />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                    <div className="text-xs text-slate-500">Browse by</div>
                    <div className="mt-1 text-sm font-semibold text-slate-200">Category</div>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                    <div className="text-xs text-slate-500">Filter by</div>
                    <div className="mt-1 text-sm font-semibold text-slate-200">Source type</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-16 sm:mt-20">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-indigo-300">One store, two sides</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">Useful for users and developers.</h2>
          <p className="mt-4 text-base leading-7 text-slate-400">
            The public catalog focuses on finding and understanding apps, while the protected dashboard gives developers the tools to publish and maintain them.
          </p>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          <Link href="/discover" className="group relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/60 p-7 transition hover:-translate-y-0.5 hover:border-indigo-400/30 hover:bg-slate-900/90 sm:p-8">
            <div className="absolute right-0 top-0 h-40 w-40 translate-x-16 -translate-y-16 rounded-full bg-indigo-500/10 blur-2xl transition group-hover:bg-indigo-500/20" />
            <div className="relative">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-indigo-400/20 bg-indigo-500/10 text-indigo-200">
                <FeatureIcon type="search" />
              </div>
              <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-300">For everyone</p>
              <h3 className="mt-2 text-2xl font-bold text-white">Explore the app catalog</h3>
              <p className="mt-3 max-w-lg text-sm leading-6 text-slate-400 sm:text-base">
                Search published apps, filter the catalog and open complete app pages with the information you need before downloading.
              </p>
              <div className="mt-6 text-sm font-semibold text-indigo-300 transition group-hover:text-indigo-200">Open Discover <span aria-hidden="true">→</span></div>
            </div>
          </Link>

          <Link href="/login?next=/dashboard" className="group relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/60 p-7 transition hover:-translate-y-0.5 hover:border-violet-400/30 hover:bg-slate-900/90 sm:p-8">
            <div className="absolute right-0 top-0 h-40 w-40 translate-x-16 -translate-y-16 rounded-full bg-violet-500/10 blur-2xl transition group-hover:bg-violet-500/20" />
            <div className="relative">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-500/10 text-violet-200">
                <FeatureIcon type="code" />
              </div>
              <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-violet-300">For developers</p>
              <h3 className="mt-2 text-2xl font-bold text-white">Publish and manage apps</h3>
              <p className="mt-3 max-w-lg text-sm leading-6 text-slate-400 sm:text-base">
                Sign in to submit an app, provide its metadata and releases, then track automatic scan status and future updates from your dashboard.
              </p>
              <div className="mt-6 text-sm font-semibold text-violet-300 transition group-hover:text-violet-200">Open developer dashboard <span aria-hidden="true">→</span></div>
            </div>
          </Link>
        </div>
      </section>

      <section className="mt-16 sm:mt-20">
        <div className="grid gap-4 md:grid-cols-3">
          {highlights.map((feature) => (
            <article key={feature.title} className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-950/70 text-indigo-300">
                <FeatureIcon type={feature.icon} />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-white">{feature.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-400">{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-16 overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/45 sm:mt-20">
        <div className="grid lg:grid-cols-[1fr_0.9fr]">
          <div className="p-7 sm:p-9 lg:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-300">More context, less guessing</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white">App details that are easy to inspect.</h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-slate-400 sm:text-base">
              Luma Store keeps important information close to the app itself so users can understand what they are looking at and developers can present releases clearly.
            </p>

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {appDetails.map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/45 px-4 py-3 text-sm text-slate-300">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-xs text-emerald-300">✓</span>
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-800 bg-slate-950/45 p-7 sm:p-9 lg:border-l lg:border-t-0 lg:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Developer flow</p>
            <ol className="mt-6 space-y-5">
              {[
                ["01", "Sign in", "Access the protected developer tools."],
                ["02", "Submit", "Add app information and release metadata."],
                ["03", "Automatic scan", "Follow the security scan and automatic publishing status."],
                ["04", "Maintain", "Return to manage updates after publication."],
              ].map(([number, title, description]) => (
                <li key={number} className="flex gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-indigo-400/20 bg-indigo-500/10 text-xs font-bold text-indigo-200">{number}</div>
                  <div>
                    <div className="font-semibold text-slate-200">{title}</div>
                    <p className="mt-1 text-sm leading-5 text-slate-500">{description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="relative mt-16 overflow-hidden rounded-3xl border border-indigo-400/15 bg-gradient-to-r from-indigo-500/10 via-violet-500/10 to-fuchsia-500/10 px-6 py-10 text-center sm:mt-20 sm:px-10 sm:py-12">
        <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-48 w-80 -translate-x-1/2 rounded-full bg-indigo-500/10 blur-3xl" />
        <h2 className="text-2xl font-bold text-white sm:text-3xl">Ready to look around?</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-400 sm:text-base">Browse the catalog now, or sign in when you are ready to publish and manage an app.</p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/discover" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-400">Browse apps</Link>
          <Link href="/login?next=/dashboard" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-950/50 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-800">Developer sign in</Link>
        </div>
      </section>
    </div>
  );
}
