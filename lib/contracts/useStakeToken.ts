"use client";

import type { Address } from "viem";
import { useAccount, useReadContracts } from "wagmi";
import { erc20Abi } from "@/lib/celo/abi";
import { getPrimaryStakeToken } from "@/lib/celo/tokens";
import { useIsMiniPay } from "@/lib/wallet/useIsMiniPay";
import { useTxStatus } from "./useTxStatus";

const REFETCH_INTERVAL_MS = 15_000;

/** GemJar's stake/savings token (USDm) on the connected chain, if known. */
export function useStakeToken() {
  const { chainId } = useAccount();
  return getPrimaryStakeToken(chainId);
}

/**
 * CIP-64 fee-currency address for the connected wallet's transactions.
 * MiniPay users typically hold no CELO, so gas comes out of their stake
 * token (USDm) instead; outside MiniPay, `undefined` leaves the wallet's
 * native currency untouched.
 */
export function useFeeCurrency(): Address | undefined {
  const isMiniPay = useIsMiniPay();
  const token = useStakeToken();
  return isMiniPay ? token?.feeCurrencyAddress : undefined;
}

/** The connected player's stake-token balance and remaining allowance for `spender`. */
export function useStakeTokenAllowance(spender: Address | undefined) {
  const token = useStakeToken();
  const { address: account } = useAccount();

  const enabled = !!token && !!account && !!spender;

  const { data, isLoading, refetch } = useReadContracts({
    contracts: enabled
      ? [
          { address: token.tokenAddress, abi: erc20Abi, functionName: "balanceOf", args: [account] },
          { address: token.tokenAddress, abi: erc20Abi, functionName: "allowance", args: [account, spender] },
        ]
      : [],
    query: { enabled, refetchInterval: REFETCH_INTERVAL_MS },
  });

  const [balance, allowance] = data ?? [];

  return {
    token,
    balance: balance?.result ?? 0n,
    allowance: allowance?.result ?? 0n,
    isLoading,
    refetch,
  };
}

/** Approves `spender` to pull up to `amount` of the connected player's stake token. */
export function useApproveStakeToken() {
  const token = useStakeToken();
  const feeCurrency = useFeeCurrency();
  const status = useTxStatus();

  function approve(spender: Address, amount: bigint) {
    if (!token) return;
    status.writeContract({
      address: token.tokenAddress,
      abi: erc20Abi,
      functionName: "approve",
      args: [spender, amount],
      feeCurrency,
    });
  }

  return { approve, token, ...status };
}
