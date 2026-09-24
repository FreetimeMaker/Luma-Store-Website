"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { AuthChangeEvent, Session, User, UserResponse } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export default function AuthNav() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

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

  async function handleLogout() {
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
    <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4">
      <Link href="/" className="group flex min-w-0 items-center gap-3" aria-label="Luma Store home">
        <Image
          src="/android-chrome-192x192.png"
          alt="Luma Store"
          width={36}
          height={36}
          priority
          className="h-9 w-9 shrink-0 rounded-lg object-cover ring-1 ring-white/10"
        />
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold tracking-tight text-white transition-colors group-hover:text-indigo-200 sm:text-base">Luma Store</div>
          <div className="hidden text-[11px] text-slate-500 sm:block">Open-source app distribution</div>
        </div>
      </Link>

      <div className="flex items-center gap-1.5">
        <Link
          href="/discover"
          aria-label="Discover apps"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.04] hover:text-white"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="11" cy="11" r="6.5" />
            <path strokeLinecap="round" d="m16 16 4 4" />
          </svg>
        </Link>

        {!loading && user && (
          <Link
            href="/dashboard"
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.04] hover:text-white"
          >
            Dashboard
          </Link>
        )}

        {loading ? (
          <span className="inline text-sm text-slate-500">Checking login...</span>
        ) : user ? (
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#0c121b] p-1.5 pl-2">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={`${name} profile`}
                className="h-8 w-8 rounded-lg object-cover ring-1 ring-indigo-400/20"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <div
                aria-hidden
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/15 text-xs font-semibold text-indigo-200 ring-1 ring-indigo-400/20"
              >
                {initials || "U"}
              </div>
            )}
            <span className="hidden max-w-32 truncate text-sm text-slate-300 md:inline">{name}</span>
            <button
              onClick={handleLogout}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-400 transition hover:bg-white/[0.04] hover:text-white"
            >
              Logout
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            aria-label="Sign in"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 7V5.75A1.75 1.75 0 0 1 11.75 4h6.5A1.75 1.75 0 0 1 20 5.75v12.5A1.75 1.75 0 0 1 18.25 20h-6.5A1.75 1.75 0 0 1 10 18.25V17" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 12H4m0 0 3.5-3.5M4 12l3.5 3.5" />
            </svg>
          </Link>
        )}
      </div>
    </nav>
  );
}
