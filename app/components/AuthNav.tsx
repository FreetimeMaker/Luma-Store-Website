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
    <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 sm:gap-3">
      <Link href="/" className="group flex min-w-0 items-center gap-3">
        <Image
          src="/android-chrome-192x192.png"
          alt="Luma Store"
          width={36}
          height={36}
          priority
          className="h-9 w-9 shrink-0 rounded-xl object-cover shadow-sm shadow-indigo-950/40 ring-1 ring-white/10"
        />
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-white transition-colors group-hover:text-indigo-200 sm:text-base">
            Luma Store
          </div>
          <div className="block text-[11px] text-slate-500">Apps & developer tools</div>
        </div>
      </Link>

      <div className="flex flex-wrap items-center gap-1 sm:gap-3">
        <Link
          href="/discover"
          className="rounded-lg px-2.5 py-2 text-sm font-medium text-slate-300 transition hover:bg-indigo-500/10 hover:text-indigo-200 sm:px-3"
        >
          Discover
        </Link>

        {!loading && user && (
          <Link
            href="/dashboard"
            className="inline-flex rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-indigo-500/10 hover:text-indigo-200"
          >
            Dashboard
          </Link>
        )}

        {loading ? (
          <span className="inline text-sm text-slate-500">Checking login...</span>
        ) : user ? (
          <div className="glass-action flex items-center gap-2 p-1.5 pl-2 sm:gap-3">
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
            <span className="inline max-w-36 truncate text-sm text-slate-200">{name}</span>
            <button
              onClick={handleLogout}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-300"
            >
              Logout
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="glass-action rounded-xl px-3 py-2 text-sm font-medium text-indigo-200 hover:text-white"
          >
            Sign in
          </Link>
        )}
      </div>
    </nav>
  );
}
