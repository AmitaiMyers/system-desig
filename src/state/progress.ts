// Player progress, persisted in localStorage.

const STORAGE_KEY = 'scale-or-fail/progress/v1';

export type Progress = {
  /** Best star rating per level id. */
  stars: Record<string, number>;
  /** Unlocked concept card ids. */
  cards: string[];
  /** Player chose to skip the unlock order. */
  unlockAll: boolean;
};

const EMPTY: Progress = { stars: {}, cards: [], unlockAll: false };

export function loadProgress(): Progress {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === null) return EMPTY;
  const parsed = JSON.parse(raw) as Progress;
  if (typeof parsed.stars !== 'object' || !Array.isArray(parsed.cards) || typeof parsed.unlockAll !== 'boolean') {
    throw new Error(`Corrupt saved progress under "${STORAGE_KEY}"`);
  }
  return parsed;
}

export function saveProgress(progress: Progress): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export function starsFor(progress: Progress, levelId: string): number {
  return levelId in progress.stars ? progress.stars[levelId] : 0;
}

export function recordWin(progress: Progress, levelId: string, stars: number, cardIds: string[]): Progress {
  return {
    ...progress,
    stars: { ...progress.stars, [levelId]: Math.max(starsFor(progress, levelId), stars) },
    cards: [...new Set([...progress.cards, ...cardIds])],
  };
}
