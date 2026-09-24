"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type FundingForm = {
  donate_url: string;
  liberapay: string;
  opencollective: string;
  crypto_addresses: Record<string, string>;
};

type FundingLinkField = "donate_url" | "liberapay" | "opencollective";

const cryptoOptions = [
  ["bitcoin", "Bitcoin (BTC)", ["Bitcoin"]],
  ["ethereum", "Ethereum (ETH)", ["Ethereum"]],
  ["tether", "Tether (USDT)", ["Ethereum (ERC-20)", "TRON (TRC-20)", "BNB Smart Chain (BEP-20)", "Solana", "Polygon", "Avalanche C-Chain", "Arbitrum", "Optimism"]],
  ["usdc", "USD Coin (USDC)", ["Ethereum (ERC-20)", "Solana", "Base", "Arbitrum", "Optimism", "Polygon", "Avalanche C-Chain"]],
  ["bnb", "BNB", ["BNB Smart Chain (BEP-20)"]],
  ["solana", "Solana (SOL)", ["Solana"]],
  ["cardano", "Cardano (ADA)", ["Cardano"]],
  ["dogecoin", "Dogecoin (DOGE)", ["Dogecoin"]],
  ["tron", "TRON (TRX)", ["TRON"]],
  ["polkadot", "Polkadot (DOT)", ["Polkadot"]],
  ["avalanche", "Avalanche (AVAX)", ["Avalanche C-Chain", "Avalanche P-Chain"]],
  ["chainlink", "Chainlink (LINK)", ["Ethereum (ERC-20)", "BNB Smart Chain (BEP-20)", "Polygon", "Arbitrum", "Optimism"]],
  ["polygon", "Polygon (POL)", ["Polygon", "Ethereum (ERC-20)"]],
  ["litecoin", "Litecoin (LTC)", ["Litecoin"]],
  ["bitcoin_cash", "Bitcoin Cash (BCH)", ["Bitcoin Cash"]],
  ["stellar", "Stellar (XLM)", ["Stellar"]],
  ["monero", "Monero (XMR)", ["Monero"]],
  ["toncoin", "Toncoin (TON)", ["TON"]],
  ["shiba_inu", "Shiba Inu (SHIB)", ["Ethereum (ERC-20)", "Shibarium"]],
] as const;

const fundingLinks: Array<[FundingLinkField, string, string]> = [
  ["donate_url", "Donation URL", "https://example.com/donate"],
  ["liberapay", "Liberapay URL", "https://liberapay.com/..."],
  ["opencollective", "OpenCollective URL", "https://opencollective.com/..."],
];

function cryptoKey(currency: string, network: string) {
  return `${currency}::${network}`;
}

function clean(value: string) {
  return value.trim() || null;
}

export default function DeveloperFundingPage() {
  const supabase = useMemo(() => createClient(), []);

  const [userId, setUserId] = useState<string | null>(null);
  const [form, setForm] = useState<FundingForm>({
    donate_url: "",
    liberapay: "",
    opencollective: "",
    crypto_addresses: {},
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadFunding() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      setUserId(user.id);

      const { data } = await supabase
        .from("luma_developer_funding")
        .select("donate_url,liberapay,opencollective,bitcoin,litecoin,crypto_addresses")
        .eq("developer_id", user.id)
        .maybeSingle();

      if (data) {
        const addresses = {
          ...(data.crypto_addresses || {}),
          ...(data.bitcoin && !data.crypto_addresses?.["bitcoin::Bitcoin"]
            ? { "bitcoin::Bitcoin": data.bitcoin }
            : {}),
          ...(data.litecoin && !data.crypto_addresses?.["litecoin::Litecoin"]
            ? { "litecoin::Litecoin": data.litecoin }
            : {}),
        };

        setForm({
          donate_url: data.donate_url || "",
          liberapay: data.liberapay || "",
          opencollective: data.opencollective || "",
          crypto_addresses: addresses,
        });
      }

      setLoading(false);
    }

    void loadFunding();
  }, [supabase]);

  function updateLink(field: FundingLinkField, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateCrypto(key: string, value: string) {
    setForm((current) => ({
      ...current,
      crypto_addresses: {
        ...current.crypto_addresses,
        [key]: value,
      },
    }));
  }

  async function saveFunding(event: React.FormEvent) {
    event.preventDefault();
    if (!userId) return;

    setSaving(true);
    setMessage(null);

    const cryptoAddresses = Object.fromEntries(
      Object.entries(form.crypto_addresses)
        .map(([key, value]) => [key, value.trim()])
        .filter(([key, value]) =>
          Boolean(value)
          && !key.startsWith("xrp::")
          && key !== "bnb::BNB Beacon Chain"
        ),
    );

    const { error } = await supabase
      .from("luma_developer_funding")
      .upsert(
        {
          developer_id: userId,
          donate_url: clean(form.donate_url),
          liberapay: clean(form.liberapay),
          opencollective: clean(form.opencollective),
          crypto_addresses: cryptoAddresses,
          bitcoin: clean(form.crypto_addresses["bitcoin::Bitcoin"] || ""),
          litecoin: clean(form.crypto_addresses["litecoin::Litecoin"] || ""),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "developer_id" },
      );

    setMessage(
      error
        ? error.message
        : "Developer funding saved. These methods now apply to all your apps.",
    );
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="glass-page mx-auto max-w-3xl space-y-5 pb-20">
        <div className="h-8 w-56 animate-pulse rounded bg-slate-800/70" />
        <div className="glass-panel space-y-5 p-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index}>
              <div className="mb-2 h-4 w-24 animate-pulse rounded bg-slate-800/60" />
              <div className="h-12 animate-pulse rounded-xl bg-slate-800/40" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="glass-page mx-auto max-w-3xl p-8 text-slate-300">
        Sign in to manage developer funding.
      </div>
    );
  }

  return (
    <div className="glass-page mx-auto max-w-3xl space-y-6 pb-20">
      <div>
        <Link href="/dashboard" className="text-sm text-indigo-300">
          ← Dashboard
        </Link>

        <section className="glass-panel mt-4 p-5 sm:p-7">
          <p className="ui-eyebrow">Developer support</p>
          <h1 className="ui-title mt-1 text-3xl">Developer funding</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Configure support methods once for your developer profile.
            They are shown for every app you publish.
          </p>
        </section>
      </div>

      {message && (
        <div role="status" className="ui-panel-muted p-4 text-sm text-slate-300">
          {message}
        </div>
      )}

      <form onSubmit={saveFunding} className="glass-panel space-y-6 p-5 sm:p-6">
        <div className="grid gap-5">
          {fundingLinks.map(([field, label, placeholder]) => (
            <div key={field}>
              <label className="mb-2 block text-sm text-slate-300">{label}</label>
              <input
                type="url"
                value={form[field]}
                onChange={(event) => updateLink(field, event.target.value)}
                placeholder={placeholder}
                className="glass-input"
              />
            </div>
          ))}
        </div>

        <section className="border-t border-white/10 pt-6">
          <p className="ui-eyebrow">Cryptocurrency</p>
          <h2 className="mt-1 text-xl font-semibold text-white">Wallet addresses</h2>
          <p className="mt-1 text-sm text-slate-500">
            Add only the currencies you accept. Leave all others empty.
          </p>

          <div className="mt-5 space-y-4">
            {cryptoOptions.map(([currency, label, networks]) => (
              <article key={currency} className="ui-panel-muted p-4">
                <div>
                  <p className="text-sm font-semibold text-white">{label}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {networks.length > 1
                      ? "Multiple supported networks"
                      : "Native network"}
                  </p>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {networks.map((network) => {
                    const key = cryptoKey(currency, network);

                    return (
                      <div key={key}>
                        <label className="mb-1.5 block text-xs text-slate-400">
                          {network}
                        </label>
                        <input
                          value={form.crypto_addresses[key] || ""}
                          onChange={(event) => updateCrypto(key, event.target.value)}
                          className="glass-input"
                          placeholder={`${label} · ${network}`}
                        />
                      </div>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>
        </section>

        <div className="flex flex-col-reverse gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">
            Funding clicks can be viewed in Developer Analytics.
          </p>
          <button
            disabled={saving}
            className="ui-button-primary px-5 py-2.5 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save developer funding"}
          </button>
        </div>
      </form>
    </div>
  );
}
