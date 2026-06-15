const STORAGE_KEY = "gemjar:guest-progress:v1";

export interface GuestProgress {
  bestScore: number;
  gamesPlayed: number;
  totalScore: number;
  lastPlayedAt: string | null;
}

const DEFAULT_PROGRESS: GuestProgress = {
  bestScore: 0,
  gamesPlayed: 0,
  totalScore: 0,
  lastPlayedAt: null,
};

function hasLocalStorage(): boolean {
  return typeof window !== "undefined" && !!window.localStorage;
}

/** Reads saved progress for a wallet-less guest. Safe to call during SSR or with storage disabled. */
export function loadGuestProgress(): GuestProgress {
  if (!hasLocalStorage()) return { ...DEFAULT_PROGRESS };

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PROGRESS };

    const parsed = JSON.parse(raw) as Partial<GuestProgress>;
    return {
      bestScore: typeof parsed.bestScore === "number" ? parsed.bestScore : 0,
      gamesPlayed: typeof parsed.gamesPlayed === "number" ? parsed.gamesPlayed : 0,
      totalScore: typeof parsed.totalScore === "number" ? parsed.totalScore : 0,
      lastPlayedAt: typeof parsed.lastPlayedAt === "string" ? parsed.lastPlayedAt : null,
    };
  } catch {
    return { ...DEFAULT_PROGRESS };
  }
}

export function saveGuestProgress(progress: GuestProgress): void {
  if (!hasLocalStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

/** Folds a finished round's score into stored guest progress and persists it. */
export function recordGameResult(
  score: number,
  now: () => string = () => new Date().toISOString(),
): GuestProgress {
  const current = loadGuestProgress();
  const next: GuestProgress = {
    bestScore: Math.max(current.bestScore, score),
    gamesPlayed: current.gamesPlayed + 1,
    totalScore: current.totalScore + score,
    lastPlayedAt: now(),
  };
  saveGuestProgress(next);
  return next;
}
