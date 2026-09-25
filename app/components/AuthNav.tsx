"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import type { AuthChangeEvent, Session, User, UserResponse } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export default function AuthNav() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const helpRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);
  const isAppsActive = pathname === "/";
  const isDevelopersActive = pathname === "/login" || pathname.startsWith("/dashboard");

  function handleSearchSubmit() {
    const trimmed = searchValue.trim();
    if (!trimmed) {
      setShowSearch(false);
      return;
    }

    router.push(`/?search=${encodeURIComponent(trimmed)}`);
    setShowSearch(false);
    setSearchValue("");
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }: UserResponse) => {
      setUser(data.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (!profileMenuRef.current?.contains(target)) {
        setProfileMenuOpen(false);
      }
      if (showSearch && searchRef.current && !searchRef.current.contains(target)) {
        setShowSearch(false);
      }
      if (showHelp && helpRef.current && !helpRef.current.contains(target)) {
        setShowHelp(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setProfileMenuOpen(false);
        setShowSearch(false);
        setShowHelp(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showHelp, showSearch]);

  async function handleLogout() {
    setProfileMenuOpen(false);
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const name =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email ||
    "User";
  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;
  const initials = String(name)
    .split(" ")
    .map((part: string) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <nav className="relative flex w-full items-center justify-between gap-2 sm:gap-4">
      <Link href="/" className="group flex min-w-0 items-center gap-3" aria-label="Luma Store home">
        <Image
          src="/apple-touch-icon.png"
          alt="Luma Store"
          width={40}
          height={40}
          priority
          className="h-9 w-9 shrink-0 object-cover sm:h-10 sm:w-10"
        />
        <div className="min-w-0">
          <div className="truncate text-[18px] font-semibold tracking-tight text-white transition-colors group-hover:text-indigo-200 sm:text-[22px]" style={{ fontFamily: "'Google Sans', sans-serif" }}>Luma Store</div>
          <div className="hidden text-[11px] text-slate-500 sm:block"></div>
        </div>
      </Link>

      <div className="hidden items-center gap-1 md:flex">
        <Link
          href="/"
          aria-current={isAppsActive ? "page" : undefined}
          className={`nav-tab ${isAppsActive ? "active" : ""}`}
        >
          Apps
        </Link>
        <Link
          href="/login?next=/dashboard"
          aria-current={isDevelopersActive ? "page" : undefined}
          className={`nav-tab ${isDevelopersActive ? "active" : "text-slate-400 hover:text-white"}`}
        >
          Developers
        </Link>
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        {showSearch ? (
          <div ref={searchRef} className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 flex items-center overflow-hidden rounded-2xl border border-white/10 bg-[#111923] shadow-xl shadow-black/30 sm:left-1/2 sm:right-auto sm:top-1/2 sm:w-[42rem] sm:max-w-[70vw] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-full">
            <Image
              src="/search.png"
              alt="Search"
              width={16}
              height={16}
              className="ml-3 h-4 w-4 shrink-0 object-contain"
            />
            <input
              type="text"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleSearchSubmit();
                }
              }}
              onBlur={() => window.setTimeout(() => {
                if (!searchRef.current?.contains(document.activeElement)) {
                  setShowSearch(false);
                  setSearchValue("");
                }
              }, 80)}
              placeholder="Search apps"
              aria-label="Search apps"
              autoFocus
              className="w-full border-0 bg-transparent px-3 py-3 text-base text-white placeholder:text-slate-500 focus:outline-none"
              style={{ fontFamily: "'Google Sans', sans-serif" }}
            />
            <button
              type="button"
              aria-label="Close search"
              onClick={() => {
                setShowSearch(false);
                setSearchValue("");
              }}
              className="mr-3 text-xl leading-none text-slate-400"
            >
              ×
            </button>
          </div>
        ) : (
          <button
            type="button"
            aria-label="Discover apps"
            onClick={() => setShowSearch(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium text-slate-300 transition hover:bg-white/[0.04] hover:text-white sm:h-auto sm:w-auto sm:rounded-lg sm:px-3 sm:py-2"
          >
            <Image
              src="/search.png"
              alt="Search"
              width={16}
              height={16}
              className="h-4 w-4 shrink-0 object-contain"
            />
          </button>
        )}

        <div ref={helpRef} className="relative">
          <button
            type="button"
            aria-label="Help"
            aria-expanded={showHelp}
            onClick={() => {
              setShowHelp((open) => !open);
              setShowSearch(false);
              setProfileMenuOpen(false);
            }}
            className={`flex h-10 w-10 items-center justify-center rounded-full text-slate-300 transition hover:bg-white/[0.04] hover:text-white sm:h-auto sm:w-auto sm:rounded-lg sm:px-3.5 sm:py-2.5 ${showHelp ? "bg-white/[0.06] text-white" : ""}`}
          >
            <Image
              src="/helpp.png"
              alt="Help"
              width={20}
              height={20}
              className="h-[18px] w-[18px] object-contain"
            />
          </button>

          {showHelp && (
            <section
              aria-label="Help"
              className="fixed left-3 right-3 top-[4.5rem] z-50 rounded-2xl border border-white/10 bg-[#0d131d] p-4 shadow-2xl shadow-black/35 sm:absolute sm:left-auto sm:right-0 sm:top-[calc(100%+0.65rem)] sm:w-[22rem]"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-white">Help</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Quick links for using Luma Store.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowHelp(false)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg text-slate-400 transition hover:bg-white/[0.05] hover:text-white"
                  aria-label="Close help"
                >
                  ×
                </button>
              </div>

              <div className="mt-4 space-y-5">
                <section>
                  <div className="mb-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-300">
                      For users
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Installing, finding and using apps.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <details className="group rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2.5">
                      <summary className="cursor-pointer list-none text-sm font-medium text-white">
                        How do I install an app?
                      </summary>
                      <p className="mt-2 text-xs leading-5 text-slate-400">
                        Open an app page and use the download button for your platform. On Android, download the APK and install it after allowing installs from your browser or file manager if Android asks.
                      </p>
                    </details>

                    <details className="group rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2.5">
                      <summary className="cursor-pointer list-none text-sm font-medium text-white">
                        How do I search for an app?
                      </summary>
                      <p className="mt-2 text-xs leading-5 text-slate-400">
                        Use the search icon in the top bar. You can search by app name, package name, developer, category, or description.
                      </p>
                    </details>

                    <details className="group rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2.5">
                      <summary className="cursor-pointer list-none text-sm font-medium text-white">
                        Is Luma Store only for Android?
                      </summary>
                      <p className="mt-2 text-xs leading-5 text-slate-400">
                        No. Luma Store supports Android, Windows, and Linux releases, and the app detail page shows the download that matches your operating system when available.
                      </p>
                    </details>

                    <details className="group rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2.5">
                      <summary className="cursor-pointer list-none text-sm font-medium text-white">
                        What do the download and rating values mean?
                      </summary>
                      <p className="mt-2 text-xs leading-5 text-slate-400">
                        Ratings summarize user feedback for an app. Download values show how often releases have been downloaded through Luma Store and may be shortened to values such as 1K+ or 1M+.
                      </p>
                    </details>
                  </div>
                </section>

                <section className="border-t border-white/10 pt-4">
                  <div className="mb-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-300">
                      For developers
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Submissions, updates and developer settings.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <details className="group rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2.5">
                      <summary className="cursor-pointer list-none text-sm font-medium text-white">
                        How do I submit my app?
                      </summary>
                      <p className="mt-2 text-xs leading-5 text-slate-400">
                        Sign in with GitHub or GitLab, open the Developer Dashboard, and complete the submission form. Android metadata is read from Fastlane, while Windows and Linux metadata can be entered manually.
                      </p>
                    </details>

                    <details className="group rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2.5">
                      <summary className="cursor-pointer list-none text-sm font-medium text-white">
                        Can I upload release files instead of using links?
                      </summary>
                      <p className="mt-2 text-xs leading-5 text-slate-400">
                        Yes. In the submission form, choose between using download links or uploading release files directly. APK, EXE, DEB, RPM, and AppImage files are supported.
                      </p>
                    </details>

                    <details className="group rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2.5">
                      <summary className="cursor-pointer list-none text-sm font-medium text-white">
                        How do app updates work?
                      </summary>
                      <p className="mt-2 text-xs leading-5 text-slate-400">
                        Open your existing app in the Developer Dashboard and submit an update. The update goes through the normal review flow before replacing the published version.
                      </p>
                    </details>

                    <details className="group rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2.5">
                      <summary className="cursor-pointer list-none text-sm font-medium text-white">
                        How do donations work?
                      </summary>
                      <p className="mt-2 text-xs leading-5 text-slate-400">
                        Developers can configure donation links and crypto wallet addresses once in Developer Funding. These support options are then shown on their published apps.
                      </p>
                    </details>

                    <details className="group rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2.5">
                      <summary className="cursor-pointer list-none text-sm font-medium text-white">
                        What metadata is required?
                      </summary>
                      <p className="mt-2 text-xs leading-5 text-slate-400">
                        Android submissions use Fastlane metadata, including title, descriptions, changelog and screenshots. Windows and Linux submissions use manual store metadata when Fastlane is not available.
                      </p>
                    </details>
                  </div>
                </section>
              </div>
            </section>
          )}
        </div>

        {loading ? (
          <span className="hidden text-sm text-slate-500 sm:inline">Checking login...</span>
        ) : user ? (
          <div ref={profileMenuRef} className="relative">
            <button
              type="button"
              aria-label="Open profile menu"
              aria-haspopup="menu"
              aria-expanded={profileMenuOpen}
              onClick={() => setProfileMenuOpen((open) => !open)}
              className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/[0.04] text-slate-200 transition hover:border-white/20 hover:bg-white/[0.08]"
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center bg-indigo-500/15 text-xs font-semibold text-indigo-100">
                  {initials || "U"}
                </span>
              )}
            </button>

            {profileMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-[calc(100%+0.55rem)] z-50 w-64 overflow-hidden border border-white/10 bg-[#0d131d] p-1.5 shadow-2xl shadow-black/30"
              >
                <div className="border-b border-white/10 px-3 py-3">
                  <p className="truncate text-sm font-semibold text-white">{name}</p>
                  {user.email && user.email !== name && (
                    <p className="mt-0.5 truncate text-xs text-slate-500">{user.email}</p>
                  )}
                </div>

                <div className="py-1.5">
                  <Link
                    href="/dashboard"
                    role="menuitem"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/[0.05] hover:text-white"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <rect x="4" y="4" width="6" height="6" rx="1.5" />
                      <rect x="14" y="4" width="6" height="6" rx="1.5" />
                      <rect x="4" y="14" width="6" height="6" rx="1.5" />
                      <rect x="14" y="14" width="6" height="6" rx="1.5" />
                    </svg>
                    Dashboard
                  </Link>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-slate-300 transition hover:bg-white/[0.05] hover:text-white"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 7V5.75A1.75 1.75 0 0 1 11.75 4h6.5A1.75 1.75 0 0 1 20 5.75v12.5A1.75 1.75 0 0 1 18.25 20h-6.5A1.75 1.75 0 0 1 10 18.25V17" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 12H4m0 0 3.5-3.5M4 12l3.5 3.5" />
                    </svg>
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <Link
            href="/login"
            aria-label="Sign in"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="8.5" r="3.25" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.5 19c.8-3.2 3.2-5 6.5-5s5.7 1.8 6.5 5" />
            </svg>
          </Link>
        )}
      </div>
    </nav>
  );
}
