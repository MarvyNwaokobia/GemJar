import type { Address } from "viem";

export type StablecoinSymbol = "USDm" | "EURm" | "USDC" | "USDT";

export interface FeeCurrencyToken {
  symbol: StablecoinSymbol;
  decimals: number;
  /** ERC-20 token address. */
  tokenAddress: Address;
  /**
   * Address to pass in the transaction's `feeCurrency` field (CIP-64).
   * For USDC/USDT this is a 6->18 decimal adapter, NOT the token address -
   * sending the token address here will cause the transaction to fail.
   */
  feeCurrencyAddress: Address;
}

/**
 * Verified Celo Mainnet addresses (docs.celo.org / network-info.md).
 * GemJar's stake-to-play and savings jar flows default to USDm; USDC/USDT
 * are supported for fee abstraction since that's what MiniPay users hold.
 */
export const MAINNET_TOKENS: Record<StablecoinSymbol, FeeCurrencyToken> = {
  USDm: {
    symbol: "USDm",
    decimals: 18,
    tokenAddress: "0x765DE816845861e75A25fCA122bb6898B8B1282a",
    feeCurrencyAddress: "0x765DE816845861e75A25fCA122bb6898B8B1282a",
  },
  EURm: {
    symbol: "EURm",
    decimals: 18,
    tokenAddress: "0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73",
    feeCurrencyAddress: "0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73",
  },
  USDC: {
    symbol: "USDC",
    decimals: 6,
    tokenAddress: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C",
    feeCurrencyAddress: "0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B",
  },
  USDT: {
    symbol: "USDT",
    decimals: 6,
    tokenAddress: "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e",
    feeCurrencyAddress: "0x0e2a3e05bc9a16f5292a6170456a710cb89c6f72",
  },
};

/** Governs the live feeCurrency allowlist - source of truth beyond the table above. */
export const FEE_CURRENCY_DIRECTORY: Address = "0x15F344b9E6c3Cb6F0376A36A64928b13F62C6276";

export const PRIMARY_STAKE_TOKEN: StablecoinSymbol = "USDm";

/**
 * Celo Sepolia testnet token addresses are intentionally left unset.
 * Verify against https://celo-sepolia.blockscout.com (or the live
 * FeeCurrencyDirectory.getCurrencies() allowlist) before wiring up the
 * testnet PrizePool/SavingsJar contracts - do not guess these addresses.
 */
export const SEPOLIA_TOKENS: Partial<Record<StablecoinSymbol, FeeCurrencyToken>> = {};
