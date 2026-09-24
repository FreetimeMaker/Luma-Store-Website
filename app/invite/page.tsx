"use client";

import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function safeNext(value: string | null) {
  return value?.startsWith("/dashboard") ? value : "/dashboard";
}

function InviteContent() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"));
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function checkAccess() {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (!mounted) return;

      if (userError || !userData.user) {
        router.replace(`/login?next=${encodeURIComponent(next)}`);
        return;
      }

      const { data: redemption, error: redemptionError } = await supabase
        .from("luma_invite_redemptions")
        .select("user_id")
        .eq("user_id", userData.user.id)
        .maybeSingle();

      if (!mounted) return;

      if (!redemptionError && redemption) {
        router.replace(next);
        return;
      }

      setLoading(false);
    }

    void checkAccess();

    return () => {
      mounted = false;
    };
  }, [next, router, supabase]);

  async function redeemInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedCode = code.trim();
    if (!normalizedCode) return;

    setSubmitting(true);
    setError(null);

    try {
      const { data, error: redeemError } = await supabase.rpc("redeem_luma_invite", {
        invite_code: normalizedCode,
      });

      if (redeemError) {
        setError("The invite code could not be verified. Please try again.");
        return;
      }

      if (data !== true) {
        setError("Invalid or inactive invite code.");
        return;
      }

      router.replace(next);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="glass-page flex min-h-[70vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-slate-700 border-t-indigo-500" />
          <p className="mt-4 text-sm text-slate-400">Checking invite access…</p>
        </div>
      </div>
    );
  }

  return (
    <main className="glass-page flex min-h-[70vh] items-center justify-center px-4 py-8 sm:p-6">
      <div className="glass-panel w-full max-w-md p-6 sm:p-8">
        <p className="ui-eyebrow mb-3">Invite required</p>

        <h1 className="text-2xl font-semibold text-white">Enter your invite code</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Your account is signed in. To access the Luma Store Developer Dashboard, enter a valid invite code provided by the dashboard owner.
        </p>

        <form onSubmit={redeemInvite} className="mt-6 space-y-4">
          <div>
            <label htmlFor="invite-code" className="mb-2 block text-sm font-medium text-slate-300">
              Invite code
            </label>
            <input
              id="invite-code"
              type="text"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              required
              placeholder="Enter invite code"
              className="glass-input text-base"
            />
          </div>

          {error && (
            <p className="rounded-xl border border-red-500/20 bg-red-950/30 px-4 py-3 text-sm text-red-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || !code.trim()}
            className="ui-button-primary w-full px-4 py-3 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Checking…" : "Continue"}
          </button>
        </form>

        <button
          type="button"
          onClick={signOut}
          className="ui-button-secondary mt-3 w-full px-4 py-3 text-sm"
        >
          Sign out and use another account
        </button>
      </div>
    </main>
  );
}

export default function InvitePage() {
  return (
    <Suspense fallback={<div className="glass-page flex min-h-[70vh] items-center justify-center text-slate-400">Loading…</div>}>
      <InviteContent />
    </Suspense>
  );
}
