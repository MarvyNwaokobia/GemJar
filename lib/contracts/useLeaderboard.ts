"use client";

import { useCallback, useEffect, useState } from "react";
import type { Address } from "viem";
import { getAbiItem } from "viem";
import { usePublicClient } from "wagmi";
import { prizePoolAbi } from "@/lib/celo/abi";
import { usePrizePoolAddress } from "./usePrizePool";

const SCORE_SUBMITTED_EVENT = getAbiItem({ abi: prizePoolAbi, name: "ScoreSubmitted" });

const REFETCH_INTERVAL_MS = 15_000;
const ROUND_DURATION_SECONDS = 86_400n;
/** Safety margin around the ~1s/block estimate used to bound the log query. */
const LOOKBACK_BUFFER_BLOCKS = 300n;
const MAX_ENTRIES = 5;

export interface LeaderboardEntry {
  player: Address;
  score: bigint;
}

/** Top scores submitted for `roundId`, ranked from on-chain ScoreSubmitted events. */
export function useLeaderboard(roundId: bigint | undefined) {
  const address = usePrizePoolAddress();
  const client = usePublicClient();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const refetch = useCallback(() => setRefreshKey((key) => key + 1), []);

  useEffect(() => {
    const interval = setInterval(refetch, REFETCH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refetch]);

  useEffect(() => {
    if (!address || !client || roundId === undefined) {
      setEntries([]);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    client
      .getBlock()
      .then((latest) => {
        const roundStart = roundId * ROUND_DURATION_SECONDS;
        const elapsedSeconds = latest.timestamp > roundStart ? latest.timestamp - roundStart : 0n;
        const lookback = elapsedSeconds + LOOKBACK_BUFFER_BLOCKS;
        const fromBlock = latest.number > lookback ? latest.number - lookback : 0n;

        return client.getLogs({
          address,
          event: SCORE_SUBMITTED_EVENT,
          args: { roundId },
          fromBlock,
          toBlock: "latest",
        });
      })
      .then((logs) => {
        if (cancelled) return;

        const totals = new Map<Address, bigint>();
        for (const log of logs) {
          const player = log.args.player;
          const score = log.args.score;
          if (!player || score === undefined) continue;
          totals.set(player, (totals.get(player) ?? 0n) + score);
        }

        const ranked = [...totals.entries()]
          .map(([player, score]) => ({ player, score }))
          .sort((a, b) => (a.score === b.score ? 0 : a.score > b.score ? -1 : 1))
          .slice(0, MAX_ENTRIES);

        setEntries(ranked);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [address, client, roundId, refreshKey]);

  return { entries, isLoading, refetch };
}
