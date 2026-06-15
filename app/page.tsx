"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useAccount } from "wagmi";
import type { BoardStateUpdate } from "@/components/game/GameBoard";
import { GameOverModal, type OnChainSubmitStatus } from "@/components/game/GameOverModal";
import { Hud } from "@/components/game/Hud";
import { ClaimWinnings } from "@/components/jar/ClaimWinnings";
import { SavingsJarCard } from "@/components/jar/SavingsJarCard";
import { StakeToPlay } from "@/components/jar/StakeToPlay";
import { WalletButton } from "@/components/wallet/WalletButton";
import { useOnConfirmed } from "@/lib/contracts/useOnConfirmed";
import { usePrizePoolAddress, usePrizePoolConfig, usePrizePoolEntry, useSubmitScore } from "@/lib/contracts/usePrizePool";
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

  const { isConnected } = useAccount();
  const prizePoolAddress = usePrizePoolAddress();
  const onChainEnabled = isConnected && !!prizePoolAddress;

  const { stakeAmount, currentRound, refetch: refetchConfig } = usePrizePoolConfig();
  const { stakes, submissions, refetch: refetchEntry } = usePrizePoolEntry(currentRound);
  const hasEntry = onChainEnabled && stakes > submissions;

  const submitScoreStatus = useSubmitScore();
  const submittedForGameRef = useRef<number | null>(null);

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

  // Submit the final score on-chain once, if the player staked an entry for this round.
  useEffect(() => {
    if (!gameOver || !onChainEnabled || !hasEntry) return;
    if (submittedForGameRef.current === gameKey) return;
    submittedForGameRef.current = gameKey;
    submitScoreStatus.submitScore(BigInt(score));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameOver, onChainEnabled, hasEntry, gameKey, score]);

  useOnConfirmed(submitScoreStatus.isConfirmed, () => {
    refetchEntry();
    refetchConfig();
  });

  const onChainStatus: OnChainSubmitStatus =
    submittedForGameRef.current === gameKey && onChainEnabled
      ? submitScoreStatus.isConfirmed
        ? "confirmed"
        : submitScoreStatus.isConfirming
          ? "confirming"
          : submitScoreStatus.isPending
            ? "pending"
            : submitScoreStatus.error
              ? "error"
              : "none"
      : "none";

  function handlePlayAgain() {
    setGameOver(false);
    setIsNewBest(false);
    submittedForGameRef.current = null;
    submitScoreStatus.reset();
    setGameKey((key) => key + 1);
  }

  const boardDisabled = gameOver || (onChainEnabled && !hasEntry);
  const previousRound = currentRound !== undefined && currentRound > 0n ? currentRound - 1n : undefined;

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

      {onChainEnabled && !hasEntry && prizePoolAddress && stakeAmount !== undefined && (
        <StakeToPlay prizePoolAddress={prizePoolAddress} stakeAmount={stakeAmount} onStaked={refetchEntry} />
      )}

      <GameBoard gameKey={gameKey} disabled={boardDisabled} onStateChange={handleStateChange} />

      <p className="max-w-[420px] text-center font-body text-xs text-muted-foreground">
        Tap a gem, then tap a neighbor to swap. Match 3 or more of the same gem to clear them.
      </p>

      {onChainEnabled && previousRound !== undefined && <ClaimWinnings roundId={previousRound} />}

      {isConnected && <SavingsJarCard />}

      <GameOverModal
        open={gameOver}
        score={score}
        bestScore={bestScore}
        gamesPlayed={gamesPlayed}
        isNewBest={isNewBest}
        onChainStatus={onChainStatus}
        onPlayAgain={handlePlayAgain}
      />
    </main>
  );
}
