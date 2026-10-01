"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type CryptoMethod = {
  label: string;
  value: string;
};

function parseCryptoMethods(raw: string | undefined): CryptoMethod[] {
  if (!raw?.trim()) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return [];

    return Object.entries(parsed as Record<string, unknown>)
      .flatMap(([label, value]) => {
        if (typeof value !== "string" || !value.trim()) return [];
        return [{ label: label.trim() || "Crypto", value: value.trim() }];
      });
  } catch {
    return [];
  }
}

function CopyValue({
  label,
  value,
}: {
  label: string;
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
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
  const cryptoMethods = useMemo(
    () => parseCryptoMethods(process.env.NEXT_PUBLIC_LUMA_SUPPORT_CRYPTO_JSON),
    [],
  );

  const beneficiary = process.env.NEXT_PUBLIC_LUMA_SUPPORT_BANK_BENEFICIARY?.trim() || "";
  const bankName = process.env.NEXT_PUBLIC_LUMA_SUPPORT_BANK_NAME?.trim() || "";
  const iban = process.env.NEXT_PUBLIC_LUMA_SUPPORT_IBAN?.trim() || "";
  const bic = process.env.NEXT_PUBLIC_LUMA_SUPPORT_BIC?.trim() || "";
  const reference = process.env.NEXT_PUBLIC_LUMA_SUPPORT_BANK_REFERENCE?.trim() || "";
  const hasBank = Boolean(iban);
  const hasSupportMethod = hasBank || cryptoMethods.length > 0;

  return (
    <main className="glass-page mx-auto max-w-5xl space-y-6 px-3 pb-16 sm:px-4 sm:pb-20">
      <section className="glass-panel p-5 sm:p-8">
        <p className="ui-eyebrow mb-3">Support Luma Store</p>
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Help keep Luma Store independent
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
          Luma Store is free and open source. If the project is useful to you, you can support its development
          voluntarily with a direct bank transfer or crypto payment. Supporting Luma Store does not unlock paid
          features and is not required to browse, download, or publish apps.
        </p>
      </section>

      {!hasSupportMethod && (
        <section className="glass-panel p-5 sm:p-8">
          <h2 className="text-xl font-semibold text-white">Support methods are being configured</h2>
          <p className="mt-3 text-sm leading-7 text-slate-400">
            No public payment destination has been configured yet. The store remains fully usable while support
            methods are being prepared.
          </p>
        </section>
      )}

      {hasBank && (
        <section className="glass-panel p-5 sm:p-8">
          <p className="ui-eyebrow mb-2">Fiat</p>
          <h2 className="text-xl font-semibold text-white">Bank transfer</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            Send a voluntary bank transfer directly to the account below. Your bank may charge its own transfer or
            currency-conversion fee.
          </p>

          <div className="mt-5 space-y-3">
            {beneficiary && <CopyValue label="Beneficiary" value={beneficiary} />}
            {bankName && <CopyValue label="Bank" value={bankName} />}
            <CopyValue label="IBAN" value={iban} />
            {bic && <CopyValue label="BIC / SWIFT" value={bic} />}
            {reference && <CopyValue label="Reference" value={reference} />}
          </div>
        </section>
      )}

      {cryptoMethods.length > 0 && (
        <section className="glass-panel p-5 sm:p-8">
          <p className="ui-eyebrow mb-2">Crypto</p>
          <h2 className="text-xl font-semibold text-white">Direct crypto support</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            Crypto is sent directly to the published receiving address. Check the asset and network carefully before
            sending; blockchain transfers normally cannot be reversed.
          </p>

          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {cryptoMethods.map((method) => (
              <CopyValue key={`${method.label}:${method.value}`} label={method.label} value={method.value} />
            ))}
          </div>
        </section>
      )}

      <section className="glass-panel p-5 sm:p-8">
        <h2 className="text-xl font-semibold text-white">Developers keep their own funding</h2>
        <p className="mt-3 text-sm leading-7 text-slate-300">
          Developer funding shown on individual app and developer pages remains separate from Luma Store support.
          Those links and wallet addresses belong to the respective developer; this page supports Luma Store itself.
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
