"use client";

import { motion } from "framer-motion";
import { Loader2, Trophy } from "lucide-react";
import { useOnConfirmed } from "@/lib/contracts/useOnConfirmed";
import { useClaim, usePrizePoolEntry } from "@/lib/contracts/usePrizePool";
import { useSavingsJarSummary } from "@/lib/contracts/useSavingsJar";
import { useStakeToken } from "@/lib/contracts/useStakeToken";
import { formatTokenAmount } from "@/lib/utils/format";

interface ClaimWinningsProps {
  roundId: bigint;
}

/** Shown when the connected player has an unclaimed payout from a finished round. */
export function ClaimWinnings({ roundId }: ClaimWinningsProps) {
  const token = useStakeToken();
  const { stakes, pendingPayout, refetch } = usePrizePoolEntry(roundId);
  const claimStatus = useClaim();
  const { refetch: refetchSavings } = useSavingsJarSummary();

  useOnConfirmed(claimStatus.isConfirmed, () => {
    refetch();
    refetchSavings();
    claimStatus.reset();
  });

  if (!token || stakes === 0n || pendingPayout === 0n) return null;

  const amountLabel = formatTokenAmount(pendingPayout, token.decimals);
  const isBusy = claimStatus.isPending || claimStatus.isConfirming;

  let buttonLabel = `Claim ${amountLabel} ${token.symbol}`;
  if (claimStatus.isPending) buttonLabel = "Confirm in wallet…";
  if (claimStatus.isConfirming) buttonLabel = "Submitting…";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex w-full max-w-[420px] flex-col items-center gap-3 rounded-clay bg-white/70 p-4 text-center shadow-clay"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-accent to-primary shadow-clay-sm">
        <Trophy className="h-6 w-6 text-white" strokeWidth={2.25} />
      </div>

      <div>
        <h2 className="font-display text-lg font-extrabold text-foreground">Yesterday&apos;s Winnings</h2>
        <p className="font-body text-sm text-muted-foreground">
          Your share of yesterday&apos;s prize pool is ready to claim.
        </p>
      </div>

      <button
        type="button"
        onClick={() => claimStatus.claim(roundId)}
        disabled={isBusy}
        className="flex w-full items-center justify-center gap-2 rounded-clay-sm bg-accent px-4 py-3 font-display text-base font-extrabold text-accent-foreground shadow-clay-sm transition-transform active:scale-95 disabled:opacity-60"
      >
        {isBusy && <Loader2 className="h-4 w-4 animate-spin" />}
        {buttonLabel}
      </button>

      {claimStatus.error && (
        <p className="font-body text-xs font-medium text-destructive">Claim failed - please try again.</p>
      )}
    </motion.div>
  );
}
