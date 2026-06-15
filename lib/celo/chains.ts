import { defineChain } from "viem";
import { chainConfig } from "viem/celo";

// Spreading Celo's chainConfig wires up the CIP-64 formatters/serializers
// that let writeContract calls carry a `feeCurrency`, so gas can be paid in
// USDm instead of CELO.
export const celoMainnet = defineChain({
  ...chainConfig,
  id: 42220,
  name: "Celo",
  nativeCurrency: { name: "CELO", symbol: "CELO", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://forno.celo.org"] },
  },
  blockExplorers: {
    default: { name: "Celoscan", url: "https://celoscan.io" },
    blockscout: { name: "Blockscout", url: "https://celo.blockscout.com" },
  },
  testnet: false,
});

export const celoSepolia = defineChain({
  ...chainConfig,
  id: 11142220,
  name: "Celo Sepolia",
  nativeCurrency: { name: "CELO", symbol: "CELO", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://forno.celo-sepolia.celo-testnet.org"] },
  },
  blockExplorers: {
    default: { name: "Blockscout", url: "https://celo-sepolia.blockscout.com" },
  },
  testnet: true,
});

export const SUPPORTED_CHAINS = [celoMainnet, celoSepolia] as const;

export type SupportedChainId = (typeof SUPPORTED_CHAINS)[number]["id"];

/**
 * Defaults to Mainnet, where GemJar's contracts are deployed and verified.
 * Set NEXT_PUBLIC_CHAIN_ENV=sepolia for local testing against a Sepolia
 * deployment once one exists.
 */
export const DEFAULT_CHAIN =
  process.env.NEXT_PUBLIC_CHAIN_ENV === "sepolia" ? celoSepolia : celoMainnet;
