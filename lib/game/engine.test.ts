import { describe, expect, it } from "vitest";
import { BOARD_SIZE, STARTING_MOVES } from "./constants";
import {
  createInitialState,
  findMatches,
  hasPossibleMove,
  isAdjacent,
  performSwap,
  reshuffleBoard,
  swapPositions,
} from "./engine";
import type { Board, CandyType, GameState } from "./types";

function makeBoard(types: CandyType[][]): Board {
  let id = 0;
  return types.map((row) => row.map((type) => ({ id: id++, type })));
}

/** Deterministic LCG so refill tiles are reproducible without risking infinite cascades. */
function seededRng(seed: number) {
  let state = seed;
  return () => {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };
}

describe("isAdjacent", () => {
  it("is true for horizontally adjacent tiles", () => {
    expect(isAdjacent({ row: 0, col: 0 }, { row: 0, col: 1 })).toBe(true);
  });

  it("is true for vertically adjacent tiles", () => {
    expect(isAdjacent({ row: 0, col: 0 }, { row: 1, col: 0 })).toBe(true);
  });

  it("is false for diagonal tiles", () => {
    expect(isAdjacent({ row: 0, col: 0 }, { row: 1, col: 1 })).toBe(false);
  });

  it("is false for the same position", () => {
    expect(isAdjacent({ row: 2, col: 2 }, { row: 2, col: 2 })).toBe(false);
  });

  it("is false for tiles two apart", () => {
    expect(isAdjacent({ row: 0, col: 0 }, { row: 0, col: 2 })).toBe(false);
  });
});

describe("swapPositions", () => {
  it("swaps two tiles without mutating the original board", () => {
    const board = makeBoard([
      [0, 1],
      [2, 3],
    ]);

    const swapped = swapPositions(board, { row: 0, col: 0 }, { row: 0, col: 1 });

    expect(swapped[0][0].type).toBe(1);
    expect(swapped[0][1].type).toBe(0);
    expect(board[0][0].type).toBe(0);
    expect(board[0][1].type).toBe(1);
    expect(swapped).not.toBe(board);
  });
});

describe("findMatches", () => {
  it("detects a horizontal run of three", () => {
    const board = makeBoard([
      [0, 0, 0, 1],
      [2, 3, 4, 5],
      [1, 2, 3, 4],
      [5, 1, 2, 3],
    ]);

    const matches = findMatches(board);

    expect(matches).toHaveLength(1);
    expect(matches[0].type).toBe(0);
    expect(matches[0].positions).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
    ]);
  });

  it("detects a vertical run of three", () => {
    const board = makeBoard([
      [0, 2, 1, 5],
      [0, 3, 2, 1],
      [0, 4, 3, 2],
      [1, 5, 4, 3],
    ]);

    const matches = findMatches(board);

    expect(matches).toHaveLength(1);
    expect(matches[0].type).toBe(0);
    expect(matches[0].positions).toEqual([
      { row: 0, col: 0 },
      { row: 1, col: 0 },
      { row: 2, col: 0 },
    ]);
  });

  it("returns nothing for a board with no runs", () => {
    const board = makeBoard([
      [0, 1, 0],
      [1, 0, 1],
      [0, 1, 0],
    ]);

    expect(findMatches(board)).toHaveLength(0);
  });

  it("reports overlapping horizontal and vertical runs separately", () => {
    const board = makeBoard([
      [0, 0, 0],
      [0, 1, 2],
      [0, 3, 4],
    ]);

    expect(findMatches(board)).toHaveLength(2);
  });
});

describe("hasPossibleMove", () => {
  it("is true when an adjacent swap would create a match", () => {
    const board = makeBoard([
      [0, 1, 0],
      [0, 0, 1],
      [2, 2, 1],
    ]);

    expect(hasPossibleMove(board)).toBe(true);
  });

  it("is false when the board is too small for any run of three", () => {
    const board = makeBoard([
      [0, 1],
      [1, 0],
    ]);

    expect(hasPossibleMove(board)).toBe(false);
  });
});

describe("performSwap", () => {
  const baseBoard = makeBoard([
    [3, 4, 3, 4, 3],
    [4, 1, 4, 3, 4],
    [3, 4, 1, 1, 3],
    [4, 3, 4, 3, 4],
    [3, 4, 3, 4, 3],
  ]);

  function baseState(): GameState {
    return { board: baseBoard, score: 100, movesLeft: 10, nextId: 25 };
  }

  it("rejects non-adjacent swaps without changing state", () => {
    const state = baseState();

    const result = performSwap(state, { row: 0, col: 0 }, { row: 0, col: 2 });

    expect(result.valid).toBe(false);
    expect(result.state).toBe(state);
    expect(result.pointsGained).toBe(0);
    expect(result.cascades).toHaveLength(0);
  });

  it("rejects adjacent swaps that create no match", () => {
    const state = baseState();

    const result = performSwap(state, { row: 0, col: 0 }, { row: 0, col: 1 });

    expect(result.valid).toBe(false);
    expect(result.state).toBe(state);
    expect(result.pointsGained).toBe(0);
  });

  it("resolves a match, scores it, and leaves the board stable", () => {
    const state = baseState();

    const result = performSwap(state, { row: 1, col: 1 }, { row: 2, col: 1 }, seededRng(7));

    expect(result.valid).toBe(true);
    expect(result.cascades.length).toBeGreaterThan(0);

    // The swap clears two runs of three (row 1 + row 2) = 6 tiles at combo level 0.
    expect(result.cascades[0].comboLevel).toBe(0);
    expect(result.cascades[0].points).toBe(60);

    const totalPoints = result.cascades.reduce((sum, c) => sum + c.points, 0);
    expect(result.pointsGained).toBe(totalPoints);
    expect(result.state.score).toBe(state.score + result.pointsGained);
    expect(result.state.movesLeft).toBe(state.movesLeft - 1);
    expect(result.state.nextId).toBeGreaterThan(state.nextId);

    expect(result.state.board).toHaveLength(5);
    expect(result.state.board[0]).toHaveLength(5);
    expect(findMatches(result.state.board)).toHaveLength(0);
  });

  it("never lets movesLeft drop below zero", () => {
    const state: GameState = { ...baseState(), movesLeft: 0 };

    const result = performSwap(state, { row: 1, col: 1 }, { row: 2, col: 1 }, seededRng(3));

    expect(result.state.movesLeft).toBe(0);
  });
});

describe("createInitialState", () => {
  it("builds a full board with no existing matches and at least one possible move", () => {
    const state = createInitialState(seededRng(42));

    expect(state.board).toHaveLength(BOARD_SIZE);
    expect(state.board[0]).toHaveLength(BOARD_SIZE);
    expect(findMatches(state.board)).toHaveLength(0);
    expect(hasPossibleMove(state.board)).toBe(true);
    expect(state.score).toBe(0);
    expect(state.movesLeft).toBe(STARTING_MOVES);
    expect(state.nextId).toBeGreaterThanOrEqual(BOARD_SIZE * BOARD_SIZE);
  });

  it("assigns a unique id to every tile", () => {
    const state = createInitialState(seededRng(99));

    const ids = state.board.flat().map((tile) => tile.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("reshuffleBoard", () => {
  it("keeps score, moves, and the same set of tiles while producing a playable layout", () => {
    const initial = createInitialState(seededRng(5));

    const reshuffled = reshuffleBoard(initial, seededRng(11));

    expect(reshuffled.score).toBe(initial.score);
    expect(reshuffled.movesLeft).toBe(initial.movesLeft);
    expect(findMatches(reshuffled.board)).toHaveLength(0);
    expect(hasPossibleMove(reshuffled.board)).toBe(true);

    const originalIds = initial.board
      .flat()
      .map((tile) => tile.id)
      .sort((a, b) => a - b);
    const reshuffledIds = reshuffled.board
      .flat()
      .map((tile) => tile.id)
      .sort((a, b) => a - b);
    expect(reshuffledIds).toEqual(originalIds);
  });
});
