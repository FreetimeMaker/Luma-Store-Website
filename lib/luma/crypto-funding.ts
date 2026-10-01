export type FundingCryptoSource = {
  bitcoin?: string | null;
  litecoin?: string | null;
  crypto_addresses?: Record<string, string> | null;
};

export type CryptoNetwork = {
  id: string;
  label: string;
  legacyNetworkNames: string[];
};

export type ConfiguredCryptoNetwork = CryptoNetwork & {
  address: string;
};

export const CRYPTO_NETWORKS: CryptoNetwork[] = [
  { id: "bitcoin", label: "Bitcoin", legacyNetworkNames: ["Bitcoin"] },
  { id: "ethereum", label: "Ethereum", legacyNetworkNames: ["Ethereum", "Ethereum (ERC-20)"] },
  { id: "tron", label: "TRON", legacyNetworkNames: ["TRON", "TRON (TRC-20)"] },
  { id: "bnb-smart-chain", label: "BNB Smart Chain", legacyNetworkNames: ["BNB Smart Chain (BEP-20)"] },
  { id: "solana", label: "Solana", legacyNetworkNames: ["Solana"] },
  { id: "polygon", label: "Polygon", legacyNetworkNames: ["Polygon"] },
  { id: "avalanche-c", label: "Avalanche C-Chain", legacyNetworkNames: ["Avalanche C-Chain"] },
  { id: "arbitrum", label: "Arbitrum", legacyNetworkNames: ["Arbitrum"] },
  { id: "optimism", label: "Optimism", legacyNetworkNames: ["Optimism"] },
  { id: "base", label: "Base", legacyNetworkNames: ["Base"] },
  { id: "cardano", label: "Cardano", legacyNetworkNames: ["Cardano"] },
  { id: "dogecoin", label: "Dogecoin", legacyNetworkNames: ["Dogecoin"] },
  { id: "polkadot", label: "Polkadot", legacyNetworkNames: ["Polkadot"] },
  { id: "avalanche-p", label: "Avalanche P-Chain", legacyNetworkNames: ["Avalanche P-Chain"] },
  { id: "litecoin", label: "Litecoin", legacyNetworkNames: ["Litecoin"] },
  { id: "bitcoin-cash", label: "Bitcoin Cash", legacyNetworkNames: ["Bitcoin Cash"] },
  { id: "stellar", label: "Stellar", legacyNetworkNames: ["Stellar"] },
  { id: "monero", label: "Monero", legacyNetworkNames: ["Monero"] },
  { id: "ton", label: "TON", legacyNetworkNames: ["TON"] },
  { id: "shibarium", label: "Shibarium", legacyNetworkNames: ["Shibarium"] },
]

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
      const legacyEntry = Object.entries(raw).find(([key, value]) => {
        if (!cleanAddress(value) || !key.includes("::")) return false;
        const networkName = key.split("::").slice(1).join("::");
        return network.legacyNetworkNames.includes(networkName);
      });

      if (legacyEntry) {
        address = cleanAddress(legacyEntry[1]);
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
