import { createPublicClient, http, type Chain } from "viem";
import { DEFAULT_CHAIN } from "./chains";

/**
 * Read-only client for the active Celo network. Pass a chain explicitly to
 * read from a specific network regardless of NEXT_PUBLIC_CHAIN_ENV.
 */
export function getPublicClient(chain: Chain = DEFAULT_CHAIN) {
  return createPublicClient({
    chain,
    transport: http(),
  });
}
