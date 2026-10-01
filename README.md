# Luma Store Developer Dashboard

Standalone developer dashboard for submitting and managing open-source Android apps for Luma Store.

## Setup

1. Copy `.env.example` to `.env.local`.
2. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to the same Supabase project used by Luma Store.
3. Install dependencies with `npm install`.
4. Run `npm run dev`.

The dashboard includes Fastlane metadata import, current F-Droid categories, app update resubmission, developer verification, and submission status/timeline.

## Luma Store support payments

The public support page at `/support` loads the complete **Freetime Maker** developer funding configuration from `luma_developer_funding`, including the Donation URL, Liberapay, OpenCollective, and crypto network wallet addresses.

Crypto funding uses **one global address per network**, never one address per token. A configured Ethereum address therefore applies to every current or future asset using Ethereum; a Solana address applies to every asset using Solana; and so on. Luma does not need to know or maintain a token list for this mapping. Existing legacy `coin::network` values remain readable and are collapsed into the network-based format the next time Developer Funding is saved.

Manage these methods from **Developer Dashboard → Developer funding**. Changes to that profile are picked up automatically by the public Luma Store support page, so separate support-payment environment variables are not required.
