import { formatUnits } from "viem";

/** Formats a token amount for display, trimming to `maxDecimals` places. */
export function formatTokenAmount(value: bigint, decimals: number, maxDecimals = 2): string {
  const formatted = Number(formatUnits(value, decimals));
  return formatted.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  });
}

/** Formats milliseconds remaining as "Hh Mm" (or "Mm Ss" under an hour). */
export function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m ${seconds}s`;
}
