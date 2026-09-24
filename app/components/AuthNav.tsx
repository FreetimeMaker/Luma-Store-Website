"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { AuthChangeEvent, Session, User, UserResponse } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export default function AuthNav() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  function handleSearchSubmit() {
    const trimmed = searchValue.trim();
    if (!trimmed) {
      setShowSearch(false);
      return;
    }

    router.push(`/discover?search=${encodeURIComponent(trimmed)}`);
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
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setProfileMenuOpen(false);
        setShowSearch(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showSearch]);

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
    <nav className="relative flex w-full items-start justify-between gap-4">
      <Link href="/" className="group flex min-w-0 items-center gap-3" aria-label="Luma Store home">
        <Image
          src="/apple-touch-icon.png"
          alt="Luma Store"
          width={40}
          height={40}
          priority
          className="h-10 w-10 shrink-0 object-cover"
        />
        <div className="min-w-0">
          <div className="truncate text-[22px] font-semibold tracking-tight text-white transition-colors group-hover:text-indigo-200" style={{ fontFamily: "'Google Sans', sans-serif" }}>Luma Store</div>
          <div className="hidden text-[11px] text-slate-500 sm:block"></div>
        </div>
      </Link>

      <div className="ml-auto flex items-center gap-1.5">
        {showSearch ? (
          <div ref={searchRef} className="absolute left-1/2 top-1/2 flex w-[42rem] max-w-[70vw] -translate-x-1/2 -translate-y-1/2 items-center overflow-hidden rounded-md border border-white/10 bg-[#0f172a] shadow-lg shadow-black/20">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="ml-3 h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="11" cy="11" r="6.5" />
              <path strokeLinecap="round" d="m16 16 4 4" />
            </svg>
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
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.04] hover:text-white"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="11" cy="11" r="6.5" />
              <path strokeLinecap="round" d="m16 16 4 4" />
            </svg>
          </button>
        )}

        <button
          type="button"
          aria-label="Help"
          className="flex items-center gap-2 rounded-lg px-3.5 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/[0.04] hover:text-white"
        >
          <Image
            src="/helpp.png"
            alt="Help"
            width={20}
            height={20}
            className="h-4.5 w-4.5 object-contain"
          />
        </button>

        {loading ? (
          <span className="inline text-sm text-slate-500">Checking login...</span>
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
