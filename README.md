# Luma Store Developer Dashboard

Standalone developer dashboard for submitting and managing open-source Android apps for Luma Store.

## Setup

1. Copy `.env.example` to `.env.local`.
2. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to the same Supabase project used by Luma Store.
3. Install dependencies with `npm install`.
4. Run `npm run dev`.

The dashboard includes Fastlane metadata import, current F-Droid categories, app update resubmission, developer verification, and submission status/timeline.

## Luma Store support payments

The public support page at `/support` is optional and only shows methods that are configured.

For fiat bank transfers, configure:

- `NEXT_PUBLIC_LUMA_SUPPORT_BANK_BENEFICIARY`
- `NEXT_PUBLIC_LUMA_SUPPORT_BANK_NAME`
- `NEXT_PUBLIC_LUMA_SUPPORT_IBAN`
- `NEXT_PUBLIC_LUMA_SUPPORT_BIC`
- `NEXT_PUBLIC_LUMA_SUPPORT_BANK_REFERENCE`

For direct crypto support, set `NEXT_PUBLIC_LUMA_SUPPORT_CRYPTO_JSON` to a JSON object whose keys are the labels shown to users and whose values are the public receiving addresses, for example:

`{"Bitcoin (BTC)":"bc1...","Monero (XMR)":"4...","Solana (SOL)":"..."}`

These values are intentionally public because they are rendered on the support page. Do not put private keys, seed phrases, exchange API secrets, or other credentials in any `NEXT_PUBLIC_*` variable.
