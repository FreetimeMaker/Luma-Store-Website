"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { configuredCryptoNetworks } from "@/lib/luma/crypto-funding";

type DeveloperFunding = {
  donate_url: string | null;
  liberapay: string | null;
  opencollective: string | null;
  bitcoin: string | null;
  litecoin: string | null;
  crypto_addresses: Record<string, string> | null;
};

type FundingLink = {
  key: "donate_url" | "liberapay" | "opencollective";
  label: string;
  value: string;
};

function fundingToLinks(funding: DeveloperFunding | null): FundingLink[] {
  if (!funding) return [];

  return [
    { key: "donate_url", label: "Donation", value: funding.donate_url?.trim() || "" },
    { key: "liberapay", label: "Liberapay", value: funding.liberapay?.trim() || "" },
    { key: "opencollective", label: "OpenCollective", value: funding.opencollective?.trim() || "" },
  ].filter((item): item is FundingLink => Boolean(item.value));
}

function CopyValue({
  label,
  assets,
  value,
}: {
  label: string;
  assets: string;
  value: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
      <div>
        <p className="text-sm font-semibold text-white">{label}</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">For: {assets}</p>
      </div>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <code className="min-w-0 break-all text-sm leading-6 text-slate-200">{value}</code>
        <button
          type="button"
          onClick={copy}
          className="ui-button-secondary shrink-0 px-3.5 py-2 text-xs font-semibold text-white"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

export default function SupportPage() {
  const supabase = useMemo(() => createClient(), []);
  const [funding, setFunding] = useState<DeveloperFunding | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadFreetimeMakerFunding() {
      setLoading(true);

      const profileResult = await supabase
        .from("luma_developer_profiles")
        .select("developer_id")
        .ilike("display_name", "Freetime Maker")
        .limit(1);

      if (cancelled) return;

      const developerId = profileResult.data?.[0]?.developer_id;
      if (!developerId) {
        setFunding(null);
        setLoading(false);
        return;
      }

      const fundingResult = await supabase
        .from("luma_developer_funding")
        .select("donate_url,liberapay,opencollective,bitcoin,litecoin,crypto_addresses")
        .eq("developer_id", developerId)
        .maybeSingle();

      if (cancelled) return;

      setFunding((fundingResult.data as DeveloperFunding | null) ?? null);
      setLoading(false);
    }

    void loadFreetimeMakerFunding();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const fundingLinks = useMemo(() => fundingToLinks(funding), [funding]);
  const cryptoMethods = useMemo(() => configuredCryptoNetworks(funding), [funding]);
  const hasSupportMethod = fundingLinks.length > 0 || cryptoMethods.length > 0;

  return (
    <main className="glass-page mx-auto max-w-5xl space-y-6 px-3 pb-16 sm:px-4 sm:pb-20">
      <section className="glass-panel p-5 sm:p-8">
        <p className="ui-eyebrow mb-3">Support Luma Store</p>
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Help keep Luma Store independent
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
          Luma Store is free and open source. If the project is useful to you, you can support its development
          voluntarily using any funding method configured on the Freetime Maker developer profile. Donation links,
          Liberapay, OpenCollective, coins, tokens, networks, and wallet addresses are loaded from that one profile.
        </p>
      </section>

      {loading ? (
        <section className="glass-panel p-5 sm:p-8">
          <div className="h-5 w-40 animate-pulse rounded bg-slate-800/70" />
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-28 animate-pulse rounded-2xl bg-slate-800/40" />
            ))}
          </div>
        </section>
      ) : !hasSupportMethod ? (
        <section className="glass-panel p-5 sm:p-8">
          <h2 className="text-xl font-semibold text-white">No support methods configured</h2>
          <p className="mt-3 text-sm leading-7 text-slate-400">
            Add funding links or wallet addresses to the Freetime Maker Developer Funding profile. They will
            automatically appear here.
          </p>
        </section>
      ) : (
        <>
          {fundingLinks.length > 0 && (
            <section className="glass-panel p-5 sm:p-8">
              <p className="ui-eyebrow mb-2">Funding</p>
              <h2 className="text-xl font-semibold text-white">Support links</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                These links are loaded directly from the Freetime Maker Developer Funding profile.
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {fundingLinks.map((method) => (
                  <a
                    key={method.key}
                    href={method.value}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 transition hover:border-indigo-400/30 hover:bg-white/[0.05]"
                  >
                    <p className="text-sm font-semibold text-white">{method.label}</p>
                    <p className="mt-2 break-all text-xs leading-5 text-slate-500">{method.value}</p>
                    <span className="mt-4 inline-flex text-xs font-semibold text-indigo-300">
                      Open ↗
                    </span>
                  </a>
                ))}
              </div>
            </section>
          )}

          {cryptoMethods.length > 0 && (
            <section className="glass-panel p-5 sm:p-8">
              <p className="ui-eyebrow mb-2">Crypto</p>
              <h2 className="text-xl font-semibold text-white">Direct crypto support</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                Each network uses one wallet address for all supported coins and tokens on that network. These payment
                destinations come directly from the Freetime Maker developer profile. Check the network carefully before
                sending; blockchain transfers normally cannot be reversed.
              </p>

              <div className="mt-5 grid gap-3 lg:grid-cols-2">
                {cryptoMethods.map((method) => (
                  <CopyValue
                    key={method.id}
                    label={method.label}
                    assets={method.assets.map((asset) => asset.label).join(", ")}
                    value={method.address}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <section className="glass-panel p-5 sm:p-8">
        <h2 className="text-xl font-semibold text-white">One funding profile</h2>
        <p className="mt-3 text-sm leading-7 text-slate-300">
          Luma Store support reuses the complete Freetime Maker Developer Funding configuration. Updating the
          Donation URL, Liberapay, OpenCollective, or a network wallet address in the Developer Dashboard
          automatically updates this page too. One network address is reused for all supported assets on that network.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/" className="ui-button-primary px-4 py-2.5 text-sm font-medium text-white">
            Back to apps
          </Link>
          <Link href="/privacy" className="ui-button-secondary px-4 py-2.5 text-sm text-white">
            Privacy
          </Link>
        </div>
      </section>
    </main>
  );
}
