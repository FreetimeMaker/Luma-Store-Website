"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!mounted) return;

      if (!sessionData.session?.user) {
        const next = pathname || "/dashboard";
        router.replace(`/login?next=${encodeURIComponent(next)}`);
        setUser(null);
        setLoading(false);
        return;
      }

      setUser(sessionData.session.user);
      setLoading(false);
    }

    void checkSession();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      if (!mounted) return;

      if (!session?.user) {
        const next = pathname || "/dashboard";
        router.replace(`/login?next=${encodeURIComponent(next)}`);
        setUser(null);
        setLoading(false);
        return;
      }


      setUser(session.user);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [pathname, router, supabase]);

  if (loading) {
    return (
      <div className="glass-page flex min-h-[55vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-slate-700 border-t-indigo-500" />
          <p className="mt-4 text-sm text-slate-400">Checking your session…</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
