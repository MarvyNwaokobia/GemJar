"use client";

import { AnimatePresence, motion } from "framer-motion";
import { LogOut, Smartphone, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { DEFAULT_CHAIN } from "@/lib/celo/chains";
import { useIsMiniPay } from "@/lib/wallet/useIsMiniPay";
import { truncateAddress } from "@/lib/wallet/utils";

export function WalletButton() {
  const [menuOpen, setMenuOpen] = useState(false);
  const miniPay = useIsMiniPay();
  const { address, status, chainId } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  const isConnected = status === "connected" && !!address;

  // Inside MiniPay there's no connect button - silently connect to the
  // injected wallet as soon as it's available.
  useEffect(() => {
    if (!miniPay || status !== "disconnected") return;
    const injectedConnector = connectors.find((connector) => connector.type === "injected");
    if (injectedConnector) connect({ connector: injectedConnector });
  }, [miniPay, status, connectors, connect]);

  if (miniPay) {
    if (!isConnected) return null;
    return (
      <div className="flex items-center gap-1.5 rounded-clay-sm bg-white/70 px-3 py-1.5 shadow-clay-sm">
        <Smartphone className="h-3.5 w-3.5 text-primary" strokeWidth={2.5} />
        <span className="font-body text-xs font-bold text-foreground">{truncateAddress(address)}</span>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          disabled={isPending}
          className="flex items-center gap-1.5 rounded-clay-sm bg-primary px-3 py-1.5 font-display text-xs font-extrabold text-primary-foreground shadow-clay-sm transition-transform active:scale-95 disabled:opacity-60"
        >
          <Wallet className="h-3.5 w-3.5" strokeWidth={2.5} />
          {isPending ? "Connecting…" : "Connect Wallet"}
        </button>

        <AnimatePresence>
          {menuOpen && (
            <>
              <motion.button
                type="button"
                aria-label="Close wallet menu"
                onClick={() => setMenuOpen(false)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-30 cursor-default"
              />
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full z-40 mt-2 w-52 rounded-clay-sm bg-background p-1.5 shadow-clay"
              >
                {connectors.map((connector) => (
                  <button
                    key={connector.uid}
                    type="button"
                    onClick={() => {
                      connect({ connector });
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-clay-sm px-2.5 py-2 text-left font-body text-sm font-medium text-foreground transition-colors hover:bg-primary/10"
                  >
                    <Wallet className="h-4 w-4 text-primary" strokeWidth={2.25} />
                    {connector.name}
                  </button>
                ))}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  }

  const wrongNetwork = chainId !== DEFAULT_CHAIN.id;

  return (
    <div className="flex items-center gap-1.5">
      {wrongNetwork && (
        <button
          type="button"
          onClick={() => switchChain({ chainId: DEFAULT_CHAIN.id })}
          disabled={isSwitching}
          className="rounded-clay-sm bg-destructive/10 px-2.5 py-1.5 font-body text-xs font-bold text-destructive transition-transform active:scale-95 disabled:opacity-60"
        >
          {isSwitching ? "Switching…" : "Switch network"}
        </button>
      )}
      <div className="flex items-center gap-1.5 rounded-clay-sm bg-white/70 px-3 py-1.5 shadow-clay-sm">
        <span className="font-body text-xs font-bold text-foreground">{truncateAddress(address)}</span>
        <button type="button" onClick={() => disconnect()} aria-label="Disconnect wallet">
          <LogOut className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
