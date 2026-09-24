"use client";

import { Suspense, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { AuthError, UserResponse } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

function safeNext(value: string | null) {
  return value?.startsWith("/dashboard") ? value : "/dashboard";
}

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");
    const next = safeNext(searchParams.get("next"));

    if (error) {
      router.replace(`/login?next=${encodeURIComponent(next)}&error=${encodeURIComponent(errorDescription || error)}`);
      return;
    }

    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }: { error: AuthError | null }) => {
        if (error) {
          router.replace(`/login?next=${encodeURIComponent(next)}&error=${encodeURIComponent("Authentication failed.")}`);
        } else {
          router.replace(next);
        }
      });
    } else {
      supabase.auth.getUser().then(({ data }: UserResponse) => {
        if (data.user) router.replace(next);
        else router.replace(`/login?next=${encodeURIComponent(next)}&error=${encodeURIComponent("No authorization code received.")}`);
      });
    }
  }, [router, searchParams, supabase]);

  return (
    <div className="glass-page flex min-h-[70vh] items-center justify-center px-4">
      <div className="glass-panel w-full max-w-sm p-6 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-indigo-400" />
        <p className="mt-4 text-sm font-medium text-slate-200">Finishing sign in</p>
        <p className="mt-1 text-xs text-slate-500">You will be redirected automatically.</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div className="glass-page flex min-h-[70vh] items-center justify-center text-sm text-slate-500">Loading…</div>}>
      <AuthCallbackContent />
    </Suspense>
  );
}
