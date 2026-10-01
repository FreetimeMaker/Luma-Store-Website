export type FundingCryptoSource = {
  bitcoin?: string | null;
  litecoin?: string | null;
  crypto_addresses?: Record<string, string> | null;
};

export type CryptoAsset = {
  id: string;
  label: string;
};

export type CryptoNetwork = {
  id: string;
  label: string;
  legacyNetworkNames: string[];
  assets: CryptoAsset[];
};

export type ConfiguredCryptoNetwork = CryptoNetwork & {
  address: string;
};

export const CRYPTO_NETWORKS: CryptoNetwork[] = [
  {
    id: "bitcoin",
    label: "Bitcoin",
    legacyNetworkNames: ["Bitcoin"],
    assets: [{ id: "bitcoin", label: "Bitcoin (BTC)" }],
  },
  {
    id: "ethereum",
    label: "Ethereum",
    legacyNetworkNames: ["Ethereum", "Ethereum (ERC-20)"],
    assets: [
      { id: "ethereum", label: "Ethereum (ETH)" },
      { id: "tether", label: "Tether (USDT)" },
      { id: "usdc", label: "USD Coin (USDC)" },
      { id: "chainlink", label: "Chainlink (LINK)" },
      { id: "polygon", label: "Polygon (POL)" },
      { id: "shiba_inu", label: "Shiba Inu (SHIB)" },
    ],
  },
  {
    id: "tron",
    label: "TRON",
    legacyNetworkNames: ["TRON", "TRON (TRC-20)"],
    assets: [
      { id: "tron", label: "TRON (TRX)" },
      { id: "tether", label: "Tether (USDT)" },
    ],
  },
  {
    id: "bnb-smart-chain",
    label: "BNB Smart Chain",
    legacyNetworkNames: ["BNB Smart Chain (BEP-20)"],
    assets: [
      { id: "bnb", label: "BNB" },
      { id: "tether", label: "Tether (USDT)" },
      { id: "chainlink", label: "Chainlink (LINK)" },
    ],
  },
  {
    id: "solana",
    label: "Solana",
    legacyNetworkNames: ["Solana"],
    assets: [
      { id: "solana", label: "Solana (SOL)" },
      { id: "tether", label: "Tether (USDT)" },
      { id: "usdc", label: "USD Coin (USDC)" },
    ],
  },
  {
    id: "polygon",
    label: "Polygon",
    legacyNetworkNames: ["Polygon"],
    assets: [
      { id: "polygon", label: "Polygon (POL)" },
      { id: "tether", label: "Tether (USDT)" },
      { id: "usdc", label: "USD Coin (USDC)" },
      { id: "chainlink", label: "Chainlink (LINK)" },
    ],
  },
  {
    id: "avalanche-c",
    label: "Avalanche C-Chain",
    legacyNetworkNames: ["Avalanche C-Chain"],
    assets: [
      { id: "avalanche", label: "Avalanche (AVAX)" },
      { id: "tether", label: "Tether (USDT)" },
      { id: "usdc", label: "USD Coin (USDC)" },
    ],
  },
  {
    id: "arbitrum",
    label: "Arbitrum",
    legacyNetworkNames: ["Arbitrum"],
    assets: [
      { id: "tether", label: "Tether (USDT)" },
      { id: "usdc", label: "USD Coin (USDC)" },
      { id: "chainlink", label: "Chainlink (LINK)" },
    ],
  },
  {
    id: "optimism",
    label: "Optimism",
    legacyNetworkNames: ["Optimism"],
    assets: [
      { id: "tether", label: "Tether (USDT)" },
      { id: "usdc", label: "USD Coin (USDC)" },
      { id: "chainlink", label: "Chainlink (LINK)" },
    ],
  },
  {
    id: "base",
    label: "Base",
    legacyNetworkNames: ["Base"],
    assets: [{ id: "usdc", label: "USD Coin (USDC)" }],
  },
  {
    id: "cardano",
    label: "Cardano",
    legacyNetworkNames: ["Cardano"],
    assets: [{ id: "cardano", label: "Cardano (ADA)" }],
  },
  {
    id: "dogecoin",
    label: "Dogecoin",
    legacyNetworkNames: ["Dogecoin"],
    assets: [{ id: "dogecoin", label: "Dogecoin (DOGE)" }],
  },
  {
    id: "polkadot",
    label: "Polkadot",
    legacyNetworkNames: ["Polkadot"],
    assets: [{ id: "polkadot", label: "Polkadot (DOT)" }],
  },
  {
    id: "avalanche-p",
    label: "Avalanche P-Chain",
    legacyNetworkNames: ["Avalanche P-Chain"],
    assets: [{ id: "avalanche", label: "Avalanche (AVAX)" }],
  },
  {
    id: "litecoin",
    label: "Litecoin",
    legacyNetworkNames: ["Litecoin"],
    assets: [{ id: "litecoin", label: "Litecoin (LTC)" }],
  },
  {
    id: "bitcoin-cash",
    label: "Bitcoin Cash",
    legacyNetworkNames: ["Bitcoin Cash"],
    assets: [{ id: "bitcoin_cash", label: "Bitcoin Cash (BCH)" }],
  },
  {
    id: "stellar",
    label: "Stellar",
    legacyNetworkNames: ["Stellar"],
    assets: [{ id: "stellar", label: "Stellar (XLM)" }],
  },
  {
    id: "monero",
    label: "Monero",
    legacyNetworkNames: ["Monero"],
    assets: [{ id: "monero", label: "Monero (XMR)" }],
  },
  {
    id: "ton",
    label: "TON",
    legacyNetworkNames: ["TON"],
    assets: [{ id: "toncoin", label: "Toncoin (TON)" }],
  },
  {
    id: "shibarium",
    label: "Shibarium",
    legacyNetworkNames: ["Shibarium"],
    assets: [{ id: "shiba_inu", label: "Shiba Inu (SHIB)" }],
  },
];

export function networkAddressKey(networkId: string) {
  return `network::${networkId}`;
}

function cleanAddress(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function fundingToNetworkAddressMap(source: FundingCryptoSource | null | undefined) {
  const raw = source?.crypto_addresses || {};
  const result: Record<string, string> = {};

  for (const network of CRYPTO_NETWORKS) {
    let address = cleanAddress(raw[networkAddressKey(network.id)]);

    if (!address && network.id === "bitcoin") {
      address = cleanAddress(source?.bitcoin);
    }

    if (!address && network.id === "litecoin") {
      address = cleanAddress(source?.litecoin);
    }

    if (!address) {
      outer:
      for (const asset of network.assets) {
        for (const legacyNetworkName of network.legacyNetworkNames) {
          const legacyAddress = cleanAddress(raw[`${asset.id}::${legacyNetworkName}`]);
          if (legacyAddress) {
            address = legacyAddress;
            break outer;
          }
        }
      }
    }

    if (address) {
      result[network.id] = address;
    }
  }

  return result;
}

export function configuredCryptoNetworks(source: FundingCryptoSource | null | undefined): ConfiguredCryptoNetwork[] {
  const addresses = fundingToNetworkAddressMap(source);

  return CRYPTO_NETWORKS.flatMap((network) => {
    const address = addresses[network.id];
    return address ? [{ ...network, address }] : [];
  });
}
