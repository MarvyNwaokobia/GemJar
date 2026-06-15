import type { CandyType } from "./types";

export const BOARD_SIZE = 8;

export const CANDY_TYPE_COUNT = 6;

export const CANDY_TYPES: CandyType[] = [0, 1, 2, 3, 4, 5];

/** Minimum run length to count as a match. */
export const MIN_MATCH = 3;

export const BASE_SCORE_PER_TILE = 10;

/** Each cascade level adds this fraction to the per-tile score (0 = first clear, 1 = first cascade, ...). */
export const COMBO_STEP = 0.5;

export const STARTING_MOVES = 25;
