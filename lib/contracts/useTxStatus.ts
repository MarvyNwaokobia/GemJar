"use client";

import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";

/** Wraps a single contract write with its on-chain confirmation status. */
export function useTxStatus() {
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  return { writeContract, hash, isPending, isConfirming, isConfirmed, error, reset };
}
