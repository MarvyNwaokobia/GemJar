/** Index into CANDY_THEMES (components/game/candy-themes.ts). */
export type CandyType = 0 | 1 | 2 | 3 | 4 | 5;

export interface Tile {
  /** Stable identity used as a React key so cleared/new tiles animate correctly. */
  id: number;
  type: CandyType;
}

/** board[row][col], row 0 = top. */
export type Board = Tile[][];

export interface Position {
  row: number;
  col: number;
}

export interface Match {
  type: CandyType;
  positions: Position[];
}

/** One step of a cascade: a set of matches clears, the board collapses and refills. */
export interface CascadeStep {
  board: Board;
  clearedPositions: Position[];
  matches: Match[];
  points: number;
  comboLevel: number;
}

export interface GameState {
  board: Board;
  score: number;
  movesLeft: number;
  /** Monotonically increasing counter used to mint unique tile ids. */
  nextId: number;
}

export interface SwapAttempt {
  /** False if the positions aren't adjacent or the swap creates no match - state is unchanged. */
  valid: boolean;
  state: GameState;
  cascades: CascadeStep[];
  pointsGained: number;
}
