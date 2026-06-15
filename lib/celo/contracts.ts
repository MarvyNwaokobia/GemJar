import type { Address } from "viem";
import { celoMainnet, celoSepolia } from "./chains";

export interface GemJarContracts {
  prizePool: Address;
  savingsJar: Address;
}

/**
 * UUPS proxy addresses for GemJar's PrizePool and SavingsJar contracts on
 * Celo Mainnet, verified on Celoscan. Both proxies share the same owner and
 * can be upgraded via upgradeToAndCall without changing these addresses.
 */
export const MAINNET_CONTRACTS: GemJarContracts = {
  prizePool: "0xf508930cC806936700abfD9bAEb7534558684Ed0",
  savingsJar: "0x734c2B09DB7c790d298ad639697b6ab02C452A83",
};

/**
 * Celo Sepolia testnet addresses are intentionally left unset until the
 * contracts are deployed there.
 */
export const SEPOLIA_CONTRACTS: Partial<GemJarContracts> = {};

/** Looks up GemJar's contract addresses for a connected chain, if deployed there. */
export function getGemJarContracts(chainId: number | undefined): GemJarContracts | undefined {
  if (chainId === celoMainnet.id) return MAINNET_CONTRACTS;
  if (chainId === celoSepolia.id) {
    return SEPOLIA_CONTRACTS.prizePool && SEPOLIA_CONTRACTS.savingsJar
      ? (SEPOLIA_CONTRACTS as GemJarContracts)
      : undefined;
  }
  return undefined;
}
