"use client";

import { motion } from "framer-motion";
import { Clock, Coins, Sparkles, Users } from "lucide-react";
import { useRoundCountdown } from "@/lib/contracts/usePrizePool";
import { useStakeToken } from "@/lib/contracts/useStakeToken";
import { formatCountdown, formatTokenAmount } from "@/lib/utils/format";

interface PrizePoolCardProps {
  roundId: bigint;
  stakeAmount: bigint;
  totalPool: bigint;
}

/** Shows today's prize pool size, entry cost, and a live countdown to the round's end. */
export function PrizePoolCard({ roundId, stakeAmount, totalPool }: PrizePoolCardProps) {
  const token = useStakeToken();
  const countdownMs = useRoundCountdown(roundId);

  if (!token) return null;

  const entries = stakeAmount > 0n ? totalPool / stakeAmount : 0n;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex w-full max-w-[420px] flex-col gap-3 rounded-clay bg-white/70 p-4 shadow-clay"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-primary shadow-clay-sm">
          <Sparkles className="h-6 w-6 text-white" strokeWidth={2.25} />
        </div>
        <div className="flex-1">
          <h2 className="font-display text-lg font-extrabold text-foreground">Today&apos;s Prize Pool</h2>
          <p className="font-body text-sm text-muted-foreground">
            Stake {formatTokenAmount(stakeAmount, token.decimals)} {token.symbol} for a shot at the pool.
          </p>
        </div>
      </div>

      <div className="flex items-stretch gap-2.5">
        <div className="flex flex-1 flex-col items-center gap-1 rounded-clay-sm bg-white/70 px-3 py-2.5 shadow-clay-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Coins className="h-3.5 w-3.5" strokeWidth={2.5} />
            <span className="text-[11px] font-bold uppercase tracking-wide">Pool</span>
          </div>
          <span className="tabular font-display text-2xl font-extrabold text-foreground">
            {formatTokenAmount(totalPool, token.decimals)}
          </span>
          <span className="font-body text-[11px] font-medium text-muted-foreground">{token.symbol}</span>
        </div>
        <div className="flex flex-1 flex-col items-center gap-1 rounded-clay-sm bg-white/70 px-3 py-2.5 shadow-clay-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Users className="h-3.5 w-3.5" strokeWidth={2.5} />
            <span className="text-[11px] font-bold uppercase tracking-wide">Entries</span>
          </div>
          <span className="tabular font-display text-2xl font-extrabold text-foreground">{entries.toString()}</span>
          <span className="font-body text-[11px] font-medium text-muted-foreground">today</span>
        </div>
        <div className="flex flex-1 flex-col items-center gap-1 rounded-clay-sm bg-white/70 px-3 py-2.5 shadow-clay-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="h-3.5 w-3.5" strokeWidth={2.5} />
            <span className="text-[11px] font-bold uppercase tracking-wide">Ends in</span>
          </div>
          <span className="tabular font-display text-2xl font-extrabold text-foreground">
            {countdownMs !== undefined ? formatCountdown(countdownMs) : "—"}
          </span>
          <span className="font-body text-[11px] font-medium text-muted-foreground">UTC</span>
        </div>
      </div>
    </motion.div>
  );
}
