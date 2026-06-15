"use client";

import { motion } from "framer-motion";
import { CircleAlert, Coins, Loader2, ShieldCheck } from "lucide-react";
import { maxUint256 } from "viem";
import { useApproveStakeToken, useStakeTokenAllowance } from "@/lib/contracts/useStakeToken";
import { useOnConfirmed } from "@/lib/contracts/useOnConfirmed";
import { useStake } from "@/lib/contracts/usePrizePool";
import { formatTokenAmount } from "@/lib/utils/format";
import { useIsMiniPay } from "@/lib/wallet/useIsMiniPay";

interface StakeToPlayProps {
  prizePoolAddress: `0x${string}`;
  stakeAmount: bigint;
  onStaked: () => void;
}

export function StakeToPlay({ prizePoolAddress, stakeAmount, onStaked }: StakeToPlayProps) {
  const { token, balance, allowance, isLoading, refetch } = useStakeTokenAllowance(prizePoolAddress);
  const approveStatus = useApproveStakeToken();
  const stakeStatus = useStake();
  const miniPay = useIsMiniPay();

  useOnConfirmed(approveStatus.isConfirmed, () => {
    refetch();
    approveStatus.reset();
  });

  useOnConfirmed(stakeStatus.isConfirmed, () => {
    refetch();
    onStaked();
    stakeStatus.reset();
  });

  if (!token || isLoading) {
    return (
      <div className="flex w-full max-w-[420px] items-center justify-center gap-2 rounded-clay bg-white/70 px-4 py-5 shadow-clay">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="font-body text-sm text-muted-foreground">Loading prize pool…</span>
      </div>
    );
  }

  const amountLabel = formatTokenAmount(stakeAmount, token.decimals);
  const needsApproval = allowance < stakeAmount;
  const insufficientBalance = balance < stakeAmount;

  function handleApprove() {
    approveStatus.approve(prizePoolAddress, maxUint256);
  }

  function handleStake() {
    stakeStatus.stake();
  }

  const activeStatus = needsApproval ? approveStatus : stakeStatus;
  const isBusy = activeStatus.isPending || activeStatus.isConfirming;

  let buttonLabel = `Stake ${amountLabel} ${token.symbol} to play`;
  if (needsApproval) buttonLabel = `Approve ${token.symbol}`;
  if (activeStatus.isPending) buttonLabel = "Confirm in wallet…";
  if (activeStatus.isConfirming) buttonLabel = "Submitting…";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex w-full max-w-[420px] flex-col items-center gap-3 rounded-clay bg-white/70 p-4 text-center shadow-clay"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary shadow-clay-sm">
        {needsApproval ? (
          <ShieldCheck className="h-6 w-6 text-white" strokeWidth={2.25} />
        ) : (
          <Coins className="h-6 w-6 text-white" strokeWidth={2.25} />
        )}
      </div>

      <div>
        <h2 className="font-display text-lg font-extrabold text-foreground">Stake to Play</h2>
        <p className="font-body text-sm text-muted-foreground">
          Stake {amountLabel} {token.symbol} for a shot at today&apos;s prize pool. A share of every win goes
          straight into your savings jar.
        </p>
      </div>

      {insufficientBalance ? (
        <div className="flex items-center gap-2 rounded-clay-sm bg-destructive/10 px-3 py-2 text-destructive">
          <CircleAlert className="h-4 w-4 shrink-0" strokeWidth={2.5} />
          <span className="font-body text-xs font-bold">
            You need {amountLabel} {token.symbol} to enter today&apos;s round.
          </span>
        </div>
      ) : (
        <button
          type="button"
          onClick={needsApproval ? handleApprove : handleStake}
          disabled={isBusy}
          className="flex w-full items-center justify-center gap-2 rounded-clay-sm bg-primary px-4 py-3 font-display text-base font-extrabold text-primary-foreground shadow-clay-sm transition-transform active:scale-95 disabled:opacity-60"
        >
          {isBusy && <Loader2 className="h-4 w-4 animate-spin" />}
          {buttonLabel}
        </button>
      )}

      {activeStatus.error && (
        <p className="font-body text-xs font-medium text-destructive">
          {needsApproval ? "Approval" : "Stake"} failed - please try again.
        </p>
      )}

      {miniPay && (
        <p className="font-body text-[11px] text-muted-foreground">
          Network fees are paid in {token.symbol} - no CELO needed.
        </p>
      )}
    </motion.div>
  );
}
