import { formatUnits } from "viem";

/** Formats a token amount for display, trimming to `maxDecimals` places. */
export function formatTokenAmount(value: bigint, decimals: number, maxDecimals = 2): string {
  const formatted = Number(formatUnits(value, decimals));
  return formatted.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  });
}
