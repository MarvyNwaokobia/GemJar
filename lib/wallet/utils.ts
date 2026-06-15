import type { Address } from "viem";

/** True when the page is running inside the MiniPay in-app browser. */
export function isMiniPay(): boolean {
  if (typeof window === "undefined") return false;
  const ethereum = (window as { ethereum?: { isMiniPay?: boolean } }).ethereum;
  return ethereum?.isMiniPay === true;
}

/** Shortens a hex address for display, e.g. "0x1234…abcd". */
export function truncateAddress(address: Address, chars = 4): string {
  return `${address.slice(0, 2 + chars)}…${address.slice(-chars)}`;
}
