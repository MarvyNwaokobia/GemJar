"use client";

import { motion } from "framer-motion";
import { ArrowDownToLine, Flame, Loader2, PiggyBank } from "lucide-react";
import { useOnConfirmed } from "@/lib/contracts/useOnConfirmed";
import { useSavingsJarSummary, useWithdrawSavings } from "@/lib/contracts/useSavingsJar";
import { useStakeToken } from "@/lib/contracts/useStakeToken";
import { formatTokenAmount } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

/** Shows the connected player's savings jar balance, streak, and a withdraw action. */
export function SavingsJarCard() {
  const token = useStakeToken();
  const { balance, streak, longestStreak, isStreakActive, refetch } = useSavingsJarSummary();
  const withdrawStatus = useWithdrawSavings();

  useOnConfirmed(withdrawStatus.isConfirmed, () => {
    refetch();
    withdrawStatus.reset();
  });

  if (!token) return null;

  const balanceLabel = formatTokenAmount(balance, token.decimals);
  const hasBalance = balance > 0n;
  const isBusy = withdrawStatus.isPending || withdrawStatus.isConfirming;

  let buttonLabel = `Withdraw ${balanceLabel} ${token.symbol}`;
  if (withdrawStatus.isPending) buttonLabel = "Confirm in wallet…";
  if (withdrawStatus.isConfirming) buttonLabel = "Submitting…";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex w-full max-w-[420px] flex-col gap-3 rounded-clay bg-white/70 p-4 shadow-clay"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-secondary to-primary shadow-clay-sm">
          <PiggyBank className="h-6 w-6 text-white" strokeWidth={2.25} />
        </div>
        <div className="flex-1">
          <h2 className="font-display text-lg font-extrabold text-foreground">Savings Jar</h2>
          <p className="font-body text-sm text-muted-foreground">A share of every win is saved here.</p>
        </div>
      </div>

      <div className="flex items-stretch gap-2.5">
        <div className="flex flex-1 flex-col items-center gap-1 rounded-clay-sm bg-white/70 px-3 py-2.5 shadow-clay-sm">
          <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Balance</span>
          <span className="tabular font-display text-2xl font-extrabold text-foreground">{balanceLabel}</span>
          <span className="font-body text-[11px] font-medium text-muted-foreground">{token.symbol}</span>
        </div>
        <div className="flex flex-1 flex-col items-center gap-1 rounded-clay-sm bg-white/70 px-3 py-2.5 shadow-clay-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Flame
              className={cn("h-3.5 w-3.5", isStreakActive && "text-accent")}
              strokeWidth={2.5}
              fill={isStreakActive ? "currentColor" : "none"}
            />
            <span className="text-[11px] font-bold uppercase tracking-wide">Streak</span>
          </div>
          <span className="tabular font-display text-2xl font-extrabold text-foreground">{streak.toString()}</span>
          <span className="font-body text-[11px] font-medium text-muted-foreground">
            Best {longestStreak.toString()}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => withdrawStatus.withdraw(balance)}
        disabled={!hasBalance || isBusy}
        className="flex w-full items-center justify-center gap-2 rounded-clay-sm bg-secondary px-4 py-3 font-display text-base font-extrabold text-primary-foreground shadow-clay-sm transition-transform active:scale-95 disabled:opacity-60"
      >
        {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowDownToLine className="h-4 w-4" />}
        {hasBalance ? buttonLabel : "Nothing to withdraw yet"}
      </button>

      {withdrawStatus.error && (
        <p className="text-center font-body text-xs font-medium text-destructive">
          Withdrawal failed - please try again.
        </p>
      )}
    </motion.div>
  );
}
