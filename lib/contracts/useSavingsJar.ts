"use client";

import { useAccount, useReadContracts } from "wagmi";
import { savingsJarAbi } from "@/lib/celo/abi";
import { getGemJarContracts } from "@/lib/celo/contracts";
import { useFeeCurrency } from "./useStakeToken";
import { useTxStatus } from "./useTxStatus";

const REFETCH_INTERVAL_MS = 15_000;

export function useSavingsJarAddress() {
  const { chainId } = useAccount();
  return getGemJarContracts(chainId)?.savingsJar;
}

export function useSavingsJarSummary() {
  const address = useSavingsJarAddress();
  const { address: account } = useAccount();

  const enabled = !!address && !!account;

  const { data, isLoading, refetch } = useReadContracts({
    contracts: enabled
      ? [
          { address, abi: savingsJarAbi, functionName: "balanceOf", args: [account] },
          { address, abi: savingsJarAbi, functionName: "streak", args: [account] },
          { address, abi: savingsJarAbi, functionName: "longestStreak", args: [account] },
          { address, abi: savingsJarAbi, functionName: "isStreakActive", args: [account] },
        ]
      : [],
    query: { enabled, refetchInterval: REFETCH_INTERVAL_MS },
  });

  const [balance, streak, longestStreak, isStreakActive] = data ?? [];

  return {
    address,
    balance: balance?.result ?? 0n,
    streak: streak?.result ?? 0n,
    longestStreak: longestStreak?.result ?? 0n,
    isStreakActive: isStreakActive?.result ?? false,
    isLoading,
    refetch,
  };
}

/** Withdraws `amount` of saved funds from the jar to the connected wallet. */
export function useWithdrawSavings() {
  const address = useSavingsJarAddress();
  const feeCurrency = useFeeCurrency();
  const status = useTxStatus();

  function withdraw(amount: bigint) {
    if (!address) return;
    status.writeContract({ address, abi: savingsJarAbi, functionName: "withdraw", args: [amount], feeCurrency });
  }

  return { withdraw, ...status };
}
