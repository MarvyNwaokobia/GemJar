import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadGuestProgress, recordGameResult, saveGuestProgress } from "./guestProgress";

class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length() {
    return this.store.size;
  }

  clear() {
    this.store.clear();
  }

  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number) {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string) {
    this.store.delete(key);
  }

  setItem(key: string, value: string) {
    this.store.set(key, value);
  }
}

describe("guestProgress with localStorage available", () => {
  beforeEach(() => {
    vi.stubGlobal("window", { localStorage: new MemoryStorage() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns defaults when nothing has been saved", () => {
    expect(loadGuestProgress()).toEqual({
      bestScore: 0,
      gamesPlayed: 0,
      totalScore: 0,
      lastPlayedAt: null,
    });
  });

  it("round-trips saved progress", () => {
    saveGuestProgress({ bestScore: 120, gamesPlayed: 3, totalScore: 300, lastPlayedAt: "2026-01-01T00:00:00.000Z" });

    expect(loadGuestProgress()).toEqual({
      bestScore: 120,
      gamesPlayed: 3,
      totalScore: 300,
      lastPlayedAt: "2026-01-01T00:00:00.000Z",
    });
  });

  it("falls back to defaults when stored JSON is corrupted", () => {
    window.localStorage.setItem("gemjar:guest-progress:v1", "{not json");

    expect(loadGuestProgress()).toEqual({
      bestScore: 0,
      gamesPlayed: 0,
      totalScore: 0,
      lastPlayedAt: null,
    });
  });

  it("records a new best score, total score, and game count", () => {
    const first = recordGameResult(150, () => "2026-06-15T00:00:00.000Z");
    expect(first).toEqual({
      bestScore: 150,
      gamesPlayed: 1,
      totalScore: 150,
      lastPlayedAt: "2026-06-15T00:00:00.000Z",
    });

    const second = recordGameResult(90, () => "2026-06-15T00:05:00.000Z");
    expect(second).toEqual({
      bestScore: 150,
      gamesPlayed: 2,
      totalScore: 240,
      lastPlayedAt: "2026-06-15T00:05:00.000Z",
    });

    const third = recordGameResult(200, () => "2026-06-15T00:10:00.000Z");
    expect(third).toEqual({
      bestScore: 200,
      gamesPlayed: 3,
      totalScore: 440,
      lastPlayedAt: "2026-06-15T00:10:00.000Z",
    });
  });
});

describe("guestProgress without localStorage (SSR)", () => {
  it("returns defaults and does not throw", () => {
    expect(loadGuestProgress()).toEqual({
      bestScore: 0,
      gamesPlayed: 0,
      totalScore: 0,
      lastPlayedAt: null,
    });
    expect(() => saveGuestProgress({ bestScore: 1, gamesPlayed: 1, totalScore: 1, lastPlayedAt: null })).not.toThrow();
    expect(() => recordGameResult(50)).not.toThrow();
  });
});
