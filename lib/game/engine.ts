import {
  BASE_SCORE_PER_TILE,
  BOARD_SIZE,
  CANDY_TYPE_COUNT,
  COMBO_STEP,
  MIN_MATCH,
  STARTING_MOVES,
} from "./constants";
import type {
  Board,
  CandyType,
  CascadeStep,
  GameState,
  Match,
  Position,
  SwapAttempt,
  Tile,
} from "./types";

type Rng = () => number;

/** Mutable id counter threaded through board generation/refills, snapshotted into GameState.nextId. */
function createIdGenerator(start: number) {
  let current = start;
  return {
    next: () => current++,
    value: () => current,
  };
}

function randomCandyType(rng: Rng): CandyType {
  return Math.floor(rng() * CANDY_TYPE_COUNT) as CandyType;
}

function cloneBoard(board: Board): Board {
  return board.map((row) => row.map((tile) => ({ ...tile })));
}

export function isAdjacent(a: Position, b: Position): boolean {
  const distance = Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
  return distance === 1;
}

function positionKey(p: Position): string {
  return `${p.row},${p.col}`;
}

function dedupePositions(positions: Position[]): Position[] {
  const seen = new Set<string>();
  const result: Position[] = [];
  for (const p of positions) {
    const key = positionKey(p);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(p);
    }
  }
  return result;
}

/** Swaps two tiles, returning a new board (input is left untouched). */
export function swapPositions(board: Board, a: Position, b: Position): Board {
  const next = cloneBoard(board);
  const temp = next[a.row][a.col];
  next[a.row][a.col] = next[b.row][b.col];
  next[b.row][b.col] = temp;
  return next;
}

/**
 * Scans every row and column for runs of `MIN_MATCH`+ same-type tiles.
 * A tile that completes both a horizontal and vertical run appears in two
 * separate Match entries - callers that need a flat position list should
 * dedupe via `dedupePositions`.
 */
export function findMatches(board: Board): Match[] {
  const matches: Match[] = [];
  const size = board.length;

  // Horizontal runs.
  for (let row = 0; row < size; row++) {
    let runStart = 0;
    for (let col = 1; col <= size; col++) {
      const sameAsPrev = col < size && board[row][col].type === board[row][col - 1].type;
      if (sameAsPrev) continue;

      const runLength = col - runStart;
      if (runLength >= MIN_MATCH) {
        matches.push({
          type: board[row][runStart].type,
          positions: Array.from({ length: runLength }, (_, i) => ({ row, col: runStart + i })),
        });
      }
      runStart = col;
    }
  }

  // Vertical runs.
  for (let col = 0; col < size; col++) {
    let runStart = 0;
    for (let row = 1; row <= size; row++) {
      const sameAsPrev = row < size && board[row][col].type === board[row - 1][col].type;
      if (sameAsPrev) continue;

      const runLength = row - runStart;
      if (runLength >= MIN_MATCH) {
        matches.push({
          type: board[runStart][col].type,
          positions: Array.from({ length: runLength }, (_, i) => ({ row: runStart + i, col })),
        });
      }
      runStart = row;
    }
  }

  return matches;
}

/** True if swapping any adjacent pair would create at least one match. */
export function hasPossibleMove(board: Board): boolean {
  const size = board.length;
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (col + 1 < size) {
        const swapped = swapPositions(board, { row, col }, { row, col: col + 1 });
        if (findMatches(swapped).length > 0) return true;
      }
      if (row + 1 < size) {
        const swapped = swapPositions(board, { row, col }, { row: row + 1, col });
        if (findMatches(swapped).length > 0) return true;
      }
    }
  }
  return false;
}

/** Clears the given positions, drops remaining tiles down, and fills new tiles from the top. */
function clearAndRefill(
  board: Board,
  positions: Position[],
  idGen: ReturnType<typeof createIdGenerator>,
  rng: Rng,
): Board {
  const size = board.length;
  const cleared = new Set(positions.map(positionKey));
  const columns: Tile[][] = [];

  for (let col = 0; col < size; col++) {
    const remaining: Tile[] = [];
    for (let row = 0; row < size; row++) {
      if (!cleared.has(positionKey({ row, col }))) {
        remaining.push(board[row][col]);
      }
    }
    const missing = size - remaining.length;
    const newTiles: Tile[] = Array.from({ length: missing }, () => ({
      id: idGen.next(),
      type: randomCandyType(rng),
    }));
    columns.push([...newTiles, ...remaining]);
  }

  const next: Board = [];
  for (let row = 0; row < size; row++) {
    const rowTiles: Tile[] = [];
    for (let col = 0; col < size; col++) {
      rowTiles.push(columns[col][row]);
    }
    next.push(rowTiles);
  }
  return next;
}

/**
 * Repeatedly clears matches and refills until the board is stable, tallying
 * score with an increasing combo multiplier per cascade level.
 */
function resolveCascades(
  board: Board,
  idGen: ReturnType<typeof createIdGenerator>,
  rng: Rng,
): { board: Board; cascades: CascadeStep[]; points: number } {
  const cascades: CascadeStep[] = [];
  let current = board;
  let comboLevel = 0;
  let totalPoints = 0;

  while (true) {
    const matches = findMatches(current);
    if (matches.length === 0) break;

    const clearedPositions = dedupePositions(matches.flatMap((m) => m.positions));
    const points = Math.round(
      clearedPositions.length * BASE_SCORE_PER_TILE * (1 + comboLevel * COMBO_STEP),
    );
    totalPoints += points;

    current = clearAndRefill(current, clearedPositions, idGen, rng);
    cascades.push({ board: current, clearedPositions, matches, points, comboLevel });
    comboLevel++;
  }

  return { board: current, cascades, points: totalPoints };
}

/** Builds an initial board with no pre-existing matches and at least one possible move. */
function buildBoard(idGen: ReturnType<typeof createIdGenerator>, rng: Rng): Board {
  const board: Board = [];
  for (let row = 0; row < BOARD_SIZE; row++) {
    const rowTiles: Tile[] = [];
    for (let col = 0; col < BOARD_SIZE; col++) {
      let type: CandyType;
      do {
        type = randomCandyType(rng);
      } while (
        (col >= 2 && rowTiles[col - 1].type === type && rowTiles[col - 2].type === type) ||
        (row >= 2 && board[row - 1][col].type === type && board[row - 2][col].type === type)
      );
      rowTiles.push({ id: idGen.next(), type });
    }
    board.push(rowTiles);
  }
  return board;
}

export function createInitialState(rng: Rng = Math.random): GameState {
  const idGen = createIdGenerator(0);
  let board = buildBoard(idGen, rng);
  while (!hasPossibleMove(board)) {
    board = buildBoard(idGen, rng);
  }

  return {
    board,
    score: 0,
    movesLeft: STARTING_MOVES,
    nextId: idGen.value(),
  };
}

/**
 * Attempts to swap two adjacent tiles. Returns `valid: false` with the
 * original state untouched if the positions aren't adjacent or the swap
 * doesn't create a match - the caller can play a "shake" animation in that
 * case.
 */
export function performSwap(
  state: GameState,
  a: Position,
  b: Position,
  rng: Rng = Math.random,
): SwapAttempt {
  if (!isAdjacent(a, b)) {
    return { valid: false, state, cascades: [], pointsGained: 0 };
  }

  const swapped = swapPositions(state.board, a, b);
  if (findMatches(swapped).length === 0) {
    return { valid: false, state, cascades: [], pointsGained: 0 };
  }

  const idGen = createIdGenerator(state.nextId);
  const { board, cascades, points } = resolveCascades(swapped, idGen, rng);

  return {
    valid: true,
    state: {
      board,
      score: state.score + points,
      movesLeft: Math.max(0, state.movesLeft - 1),
      nextId: idGen.value(),
    },
    cascades,
    pointsGained: points,
  };
}

/**
 * Reshuffles the board in place (same tiles, new positions) when no move is
 * possible. Score and moves are preserved.
 */
export function reshuffleBoard(state: GameState, rng: Rng = Math.random): GameState {
  const flatTiles = state.board.flat();

  let board: Board;
  do {
    const shuffled = [...flatTiles];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    board = [];
    for (let row = 0; row < BOARD_SIZE; row++) {
      board.push(shuffled.slice(row * BOARD_SIZE, (row + 1) * BOARD_SIZE));
    }
  } while (findMatches(board).length > 0 || !hasPossibleMove(board));

  return { ...state, board };
}
