"use client";

import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import { useAccount } from "wagmi";
import { useLeaderboard } from "@/lib/contracts/useLeaderboard";
import { cn } from "@/lib/utils/cn";
import { truncateAddress } from "@/lib/wallet/utils";

interface LeaderboardProps {
  roundId: bigint;
}

const RANK_BADGE_STYLES = ["bg-accent text-accent-foreground", "bg-secondary text-primary-foreground", "bg-primary text-primary-foreground"];

/** Live ranking of today's top scores, aggregated from on-chain ScoreSubmitted events. */
export function Leaderboard({ roundId }: LeaderboardProps) {
  const { address: account } = useAccount();
  const { entries, isLoading } = useLeaderboard(roundId);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex w-full max-w-[420px] flex-col gap-3 rounded-clay bg-white/70 p-4 shadow-clay"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent shadow-clay-sm">
          <Trophy className="h-6 w-6 text-white" strokeWidth={2.25} />
        </div>
        <div className="flex-1">
          <h2 className="font-display text-lg font-extrabold text-foreground">Today&apos;s Leaderboard</h2>
          <p className="font-body text-sm text-muted-foreground">Top scores claim the biggest share of the pool.</p>
        </div>
      </div>

      {entries.length === 0 ? (
        <p className="rounded-clay-sm bg-white/70 px-3 py-4 text-center font-body text-sm text-muted-foreground shadow-clay-sm">
          {isLoading ? "Loading scores…" : "No scores yet today - be the first to play!"}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {entries.map((entry, index) => {
            const isMe = account?.toLowerCase() === entry.player.toLowerCase();
            return (
              <li
                key={entry.player}
                className={cn(
                  "flex items-center gap-3 rounded-clay-sm px-3 py-2.5 shadow-clay-sm",
                  isMe ? "bg-primary/10" : "bg-white/70",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-display text-sm font-extrabold",
                    RANK_BADGE_STYLES[index] ?? "bg-foreground/10 text-foreground",
                  )}
                >
                  {index + 1}
                </span>
                <span className="flex-1 truncate font-body text-sm font-bold text-foreground">
                  {isMe ? "You" : truncateAddress(entry.player)}
                </span>
                <span className="tabular font-display text-base font-extrabold text-foreground">
                  {entry.score.toLocaleString()}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </motion.div>
  );
}
