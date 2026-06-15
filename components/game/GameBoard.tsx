"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  createInitialState,
  hasPossibleMove,
  isAdjacent,
  performSwap,
  reshuffleBoard,
  swapPositions,
} from "@/lib/game/engine";
import type { GameState, Position } from "@/lib/game/types";
import { CandyTile } from "./CandyTile";

const SWAP_MS = 180;
const CLEAR_MS = 260;
const REFILL_MS = 340;
const RESHUFFLE_PAUSE_MS = 450;

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function samePosition(a: Position, b: Position) {
  return a.row === b.row && a.col === b.col;
}

interface ComboToast {
  id: number;
  level: number;
  points: number;
}

export interface BoardStateUpdate {
  score: number;
  movesLeft: number;
}

interface GameBoardProps {
  /** Increment to start a fresh board. */
  gameKey: number;
  disabled?: boolean;
  onStateChange: (state: BoardStateUpdate) => void;
}

export function GameBoard({ gameKey, disabled, onStateChange }: GameBoardProps) {
  const [gameState, setGameState] = useState<GameState>(() => createInitialState());
  const [selected, setSelected] = useState<Position | null>(null);
  const [shaking, setShaking] = useState<Position[]>([]);
  const [clearingIds, setClearingIds] = useState<Set<number>>(new Set());
  const [locked, setLocked] = useState(false);
  const [combo, setCombo] = useState<ComboToast | null>(null);

  const gameStateRef = useRef(gameState);
  const comboIdRef = useRef(0);
  const isFirstRun = useRef(true);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      onStateChange({ score: gameState.score, movesLeft: gameState.movesLeft });
      return;
    }

    const next = createInitialState();
    setGameState(next);
    setSelected(null);
    setShaking([]);
    setClearingIds(new Set());
    setLocked(false);
    setCombo(null);
    onStateChange({ score: next.score, movesLeft: next.movesLeft });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameKey]);

  const animateSwap = useCallback(
    async (a: Position, b: Position) => {
      const current = gameStateRef.current;
      const result = performSwap(current, a, b);

      if (!result.valid) {
        setShaking([a, b]);
        await sleep(300);
        setShaking([]);
        return;
      }

      setLocked(true);

      const swapped = swapPositions(current.board, a, b);
      setGameState((prev) => ({ ...prev, board: swapped }));
      await sleep(SWAP_MS);

      let runningBoard = swapped;
      let runningScore = current.score;

      for (const cascade of result.cascades) {
        const clearedIds = new Set(cascade.clearedPositions.map((p) => runningBoard[p.row][p.col].id));
        setClearingIds(clearedIds);
        await sleep(CLEAR_MS);

        runningScore += cascade.points;
        runningBoard = cascade.board;
        setClearingIds(new Set());
        setGameState((prev) => ({ ...prev, board: runningBoard, score: runningScore }));
        setCombo({ id: ++comboIdRef.current, level: cascade.comboLevel, points: cascade.points });
        onStateChange({ score: runningScore, movesLeft: current.movesLeft });

        await sleep(REFILL_MS);
      }

      let finalState: GameState = {
        board: runningBoard,
        score: result.state.score,
        movesLeft: result.state.movesLeft,
        nextId: result.state.nextId,
      };

      if (!hasPossibleMove(finalState.board)) {
        await sleep(RESHUFFLE_PAUSE_MS);
        finalState = reshuffleBoard(finalState);
      }

      setGameState(finalState);
      setCombo(null);
      onStateChange({ score: finalState.score, movesLeft: finalState.movesLeft });
      setLocked(false);
    },
    [onStateChange],
  );

  const handleTap = useCallback(
    (pos: Position) => {
      if (locked || disabled) return;

      if (!selected) {
        setSelected(pos);
        return;
      }

      if (samePosition(selected, pos)) {
        setSelected(null);
        return;
      }

      if (!isAdjacent(selected, pos)) {
        setSelected(pos);
        return;
      }

      const from = selected;
      setSelected(null);
      void animateSwap(from, pos);
    },
    [selected, locked, disabled, animateSwap],
  );

  return (
    <div className="relative w-full max-w-[420px]">
      <AnimatePresence>
        {combo && combo.level > 0 && (
          <motion.div
            key={combo.id}
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-full bg-accent px-4 py-1.5 text-sm font-extrabold text-accent-foreground shadow-clay-sm"
          >
            Combo x{combo.level + 1} · +{combo.points}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid aspect-square grid-cols-8 [grid-template-rows:repeat(8,minmax(0,1fr))] gap-1.5 rounded-clay bg-white/60 p-2 shadow-clay backdrop-blur-sm sm:gap-2 sm:p-3">
        {gameState.board.map((rowTiles, row) =>
          rowTiles.map((tile, col) => (
            <CandyTile
              key={tile.id}
              tile={tile}
              row={row}
              col={col}
              selected={!!selected && samePosition(selected, { row, col })}
              clearing={clearingIds.has(tile.id)}
              shaking={shaking.some((p) => samePosition(p, { row, col }))}
              disabled={!!disabled || locked}
              onTap={() => handleTap({ row, col })}
            />
          )),
        )}
      </div>
    </div>
  );
}
