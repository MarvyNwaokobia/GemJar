"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { BoardStateUpdate } from "@/components/game/GameBoard";
import { GameOverModal } from "@/components/game/GameOverModal";
import { Hud } from "@/components/game/Hud";
import { WalletButton } from "@/components/wallet/WalletButton";
import { STARTING_MOVES } from "@/lib/game/constants";
import { loadGuestProgress, recordGameResult } from "@/lib/storage/guestProgress";

// The board's initial layout is randomized client-side, so it must never be
// rendered during SSR (the server and client would disagree on the result).
const GameBoard = dynamic(() => import("@/components/game/GameBoard").then((m) => m.GameBoard), {
  ssr: false,
  loading: () => (
    <div className="aspect-square w-full max-w-[420px] animate-pulse rounded-clay bg-white/60 shadow-clay" />
  ),
});

export default function HomePage() {
  const [gameKey, setGameKey] = useState(0);
  const [score, setScore] = useState(0);
  const [movesLeft, setMovesLeft] = useState(STARTING_MOVES);
  const [bestScore, setBestScore] = useState(0);
  const [gamesPlayed, setGamesPlayed] = useState(0);
  const [isNewBest, setIsNewBest] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  // Guest progress lives in localStorage, so it can only be read once mounted on the client.
  useEffect(() => {
    const progress = loadGuestProgress();
    setBestScore(progress.bestScore);
    setGamesPlayed(progress.gamesPlayed);
  }, []);

  function handleStateChange({ score: nextScore, movesLeft: nextMovesLeft }: BoardStateUpdate) {
    setScore(nextScore);
    setMovesLeft(nextMovesLeft);

    if (nextMovesLeft === 0) {
      setIsNewBest(nextScore > bestScore);
      const progress = recordGameResult(nextScore);
      setBestScore(progress.bestScore);
      setGamesPlayed(progress.gamesPlayed);
      setGameOver(true);
    }
  }

  function handlePlayAgain() {
    setGameOver(false);
    setIsNewBest(false);
    setGameKey((key) => key + 1);
  }

  return (
    <main className="flex min-h-dvh flex-col items-center gap-5 px-4 py-6">
      <div className="flex w-full max-w-[420px] justify-end">
        <WalletButton />
      </div>

      <header className="flex flex-col items-center gap-1 text-center">
        <h1 className="font-display text-3xl font-extrabold text-primary">GemJar</h1>
        <p className="font-body text-sm text-muted-foreground">
          Match gems, build cascades, fill the jar.
        </p>
      </header>

      <Hud score={score} movesLeft={movesLeft} bestScore={bestScore} />

      <GameBoard gameKey={gameKey} disabled={gameOver} onStateChange={handleStateChange} />

      <p className="max-w-[420px] text-center font-body text-xs text-muted-foreground">
        Tap a gem, then tap a neighbor to swap. Match 3 or more of the same gem to clear them.
      </p>

      <GameOverModal
        open={gameOver}
        score={score}
        bestScore={bestScore}
        gamesPlayed={gamesPlayed}
        isNewBest={isNewBest}
        onPlayAgain={handlePlayAgain}
      />
    </main>
  );
}
