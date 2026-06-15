"use client";

import { useEffect, useState } from "react";
import { useAccount, useReadContracts } from "wagmi";
import { prizePoolAbi } from "@/lib/celo/abi";
import { getGemJarContracts } from "@/lib/celo/contracts";
import { useFeeCurrency } from "./useStakeToken";
import { useTxStatus } from "./useTxStatus";

const REFETCH_INTERVAL_MS = 15_000;
const ROUND_DURATION_MS = 24 * 60 * 60 * 1000;

export function usePrizePoolAddress() {
  const { chainId } = useAccount();
  return getGemJarContracts(chainId)?.prizePool;
}

/** Round-level config and the current round id - independent of the connected account. */
export function usePrizePoolConfig() {
  const address = usePrizePoolAddress();

  const { data, isLoading, refetch } = useReadContracts({
    contracts: address
      ? [
          { address, abi: prizePoolAbi, functionName: "stakeAmount" },
          { address, abi: prizePoolAbi, functionName: "savingsRateBps" },
          { address, abi: prizePoolAbi, functionName: "currentRound" },
        ]
      : [],
    query: { enabled: !!address, refetchInterval: REFETCH_INTERVAL_MS },
  });

  const [stakeAmount, savingsRateBps, currentRound] = data ?? [];

  return {
    address,
    stakeAmount: stakeAmount?.result,
    savingsRateBps: savingsRateBps?.result,
    currentRound: currentRound?.result,
    isLoading,
    refetch,
  };
}

/** Pool-wide totals for a given round - how much is staked and how it's split by score. */
export function usePrizePoolRoundStats(roundId: bigint | undefined) {
  const address = usePrizePoolAddress();

  const enabled = !!address && roundId !== undefined;

  const { data, isLoading, refetch } = useReadContracts({
    contracts: enabled
      ? [
          { address, abi: prizePoolAbi, functionName: "totalPool", args: [roundId] },
          { address, abi: prizePoolAbi, functionName: "totalScore", args: [roundId] },
        ]
      : [],
    query: { enabled, refetchInterval: REFETCH_INTERVAL_MS },
  });

  const [totalPool, totalScore] = data ?? [];

  return {
    totalPool: totalPool?.result ?? 0n,
    totalScore: totalScore?.result ?? 0n,
    isLoading,
    refetch,
  };
}

/** The connected player's entry status for a given round. */
export function usePrizePoolEntry(roundId: bigint | undefined) {
  const address = usePrizePoolAddress();
  const { address: player } = useAccount();

  const enabled = !!address && !!player && roundId !== undefined;

  const { data, isLoading, refetch } = useReadContracts({
    contracts: enabled
      ? [
          { address, abi: prizePoolAbi, functionName: "stakesOf", args: [roundId, player] },
          { address, abi: prizePoolAbi, functionName: "scoreSubmissionsOf", args: [roundId, player] },
          { address, abi: prizePoolAbi, functionName: "claimedOf", args: [roundId, player] },
          { address, abi: prizePoolAbi, functionName: "pendingPayout", args: [roundId, player] },
        ]
      : [],
    query: { enabled, refetchInterval: REFETCH_INTERVAL_MS },
  });

  const [stakes, submissions, claimed, pending] = data ?? [];

  return {
    stakes: stakes?.result ?? 0n,
    submissions: submissions?.result ?? 0n,
    claimed: claimed?.result ?? false,
    pendingPayout: pending?.result ?? 0n,
    isLoading,
    refetch,
  };
}

/** Milliseconds remaining until `roundId` ends, ticking down every second. */
export function useRoundCountdown(roundId: bigint | undefined) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(interval);
  }, []);

  if (roundId === undefined) return undefined;

  const roundEndMs = (Number(roundId) + 1) * ROUND_DURATION_MS;
  return Math.max(0, roundEndMs - now);
}

/** Buys one entry into the current round for `stakeAmount` of the stake token. */
export function useStake() {
  const address = usePrizePoolAddress();
  const feeCurrency = useFeeCurrency();
  const status = useTxStatus();

  function stake() {
    if (!address) return;
    status.writeContract({ address, abi: prizePoolAbi, functionName: "stake", feeCurrency });
  }

  return { stake, ...status };
}

/** Submits a game score for the current round, consuming one unused entry. */
export function useSubmitScore() {
  const address = usePrizePoolAddress();
  const feeCurrency = useFeeCurrency();
  const status = useTxStatus();

  function submitScore(score: bigint) {
    if (!address) return;
    status.writeContract({ address, abi: prizePoolAbi, functionName: "submitScore", args: [score], feeCurrency });
  }

  return { submitScore, ...status };
}

/** Claims the caller's share of a finished round's pool. */
export function useClaim() {
  const address = usePrizePoolAddress();
  const feeCurrency = useFeeCurrency();
  const status = useTxStatus();

  function claim(roundId: bigint) {
    if (!address) return;
    status.writeContract({ address, abi: prizePoolAbi, functionName: "claim", args: [roundId], feeCurrency });
  }

  return { claim, ...status };
}
