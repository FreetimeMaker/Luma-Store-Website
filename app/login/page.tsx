"use client";

import React, { Suspense, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { UserResponse } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

function ProviderIcon({ provider }: { provider: "github" | "gitlab" }) {
  return (
    <img
      src={provider === "github" ? "/github.svg" : "/gitlab.svg"}
      alt=""
      aria-hidden="true"
      className="h-5 w-5 shrink-0 object-contain"
    />
  );
}

function safeNext(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/";
}

function authOrigin() {
  return typeof window === "undefined" ? "" : window.location.origin;
}

function LoginContent() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const searchParams = useSearchParams();
  safeNext(searchParams.get("next"));

  useEffect(() => {
    supabase.auth.getUser().then(({ data }: UserResponse) => {
      if (data.user) {
        router.replace("/dashboard");
      }
    });
  }, [router, supabase]);

  async function redirectTo(provider: "github" | "gitlab") {
    const destination = "/dashboard";
    const callbackUrl = `${authOrigin()}/auth/callback?next=${encodeURIComponent(destination)}`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: callbackUrl, scopes: provider === "github" ? "read:user public_repo" : undefined },
    });

    if (error) console.error("Login error:", error.message);
  }

  return (
    <main className="glass-page flex min-h-[65vh] items-center justify-center py-5 sm:min-h-[70vh] sm:px-6 sm:py-8">
      <div className="glass-panel w-full max-w-md p-5 sm:p-8">
        <p className="ui-eyebrow mb-3">Developer access</p>
        <h1 className="text-2xl font-semibold text-white">Sign in to Luma Store</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Sign in with GitHub or GitLab to access the Developer Dashboard.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <button onClick={() => redirectTo("github")} className="ui-button-primary min-h-12 w-full justify-start px-4 py-3 text-left"><ProviderIcon provider="github" /><span className="font-medium text-slate-200">Sign in with GitHub</span></button><button onClick={() => redirectTo("gitlab")} className="ui-button-secondary min-h-12 w-full justify-start px-4 py-3 text-left"><ProviderIcon provider="gitlab" /><span className="font-medium text-slate-200">Sign in with GitLab</span></button>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="glass-page flex min-h-[70vh] items-center justify-center text-slate-400">Loading…</div>}>
      <LoginContent />
    </Suspense>
  );
}
