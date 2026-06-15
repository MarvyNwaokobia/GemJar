"use client";

import { AnimatePresence, motion } from "framer-motion";
import { PartyPopper, RotateCcw, Trophy } from "lucide-react";

interface GameOverModalProps {
  open: boolean;
  score: number;
  bestScore: number;
  isNewBest: boolean;
  onPlayAgain: () => void;
}

export function GameOverModal({ open, score, bestScore, isNewBest, onPlayAgain }: GameOverModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 px-6 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.92 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className="flex w-full max-w-sm flex-col items-center gap-4 rounded-clay bg-background p-6 text-center shadow-clay"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary shadow-clay-sm">
              {isNewBest ? (
                <PartyPopper className="h-8 w-8 text-white" strokeWidth={2.25} />
              ) : (
                <Trophy className="h-8 w-8 text-white" strokeWidth={2.25} />
              )}
            </div>

            <div>
              <h2 className="font-display text-2xl font-extrabold text-foreground">
                {isNewBest ? "New Best!" : "Out of Moves"}
              </h2>
              <p className="font-body text-sm text-muted-foreground">
                {isNewBest ? "You just set a new high score." : "No more swaps left this round."}
              </p>
            </div>

            <div className="flex w-full items-stretch gap-2.5">
              <div className="flex flex-1 flex-col items-center gap-1 rounded-clay-sm bg-white/70 px-3 py-2.5 shadow-clay-sm">
                <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Score</span>
                <span className="tabular font-display text-2xl font-extrabold text-primary">{score}</span>
              </div>
              <div className="flex flex-1 flex-col items-center gap-1 rounded-clay-sm bg-white/70 px-3 py-2.5 shadow-clay-sm">
                <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Best</span>
                <span className="tabular font-display text-2xl font-extrabold text-foreground">{bestScore}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onPlayAgain}
              className="flex w-full items-center justify-center gap-2 rounded-clay-sm bg-primary px-4 py-3 font-display text-base font-extrabold text-primary-foreground shadow-clay-sm transition-transform active:scale-95"
            >
              <RotateCcw className="h-5 w-5" strokeWidth={2.5} />
              Play Again
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
