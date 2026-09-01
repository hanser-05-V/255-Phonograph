export type DailyListeningStats = {
  date: string;
  totalSeconds: number;
  trackSeconds: Record<string, number>;
};

export type DailyListeningView = {
  date: string;
  totalSeconds: number;
  minutes: number;
  songCount: number;
  concentration: number;
};

const storageKey = (date: string) => `255-phonograph:listening:${date}`;

export const getLocalDateKey = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export const createEmptyDailyStats = (date: string): DailyListeningStats => ({
  date,
  totalSeconds: 0,
  trackSeconds: {},
});

export function addListeningSeconds(
  stats: DailyListeningStats,
  date: string,
  trackId: string,
  seconds: number,
): DailyListeningStats {
  const current = stats.date === date ? stats : createEmptyDailyStats(date);
  const increment = Number.isFinite(seconds) && seconds >= 0 ? seconds : 0;

  return {
    date,
    totalSeconds: current.totalSeconds + increment,
    trackSeconds: {
      ...current.trackSeconds,
      [trackId]: (current.trackSeconds[trackId] ?? 0) + increment,
    },
  };
}

export function toDailyListeningView(stats: DailyListeningStats): DailyListeningView {
  return {
    date: stats.date,
    totalSeconds: stats.totalSeconds,
    minutes: Math.floor(stats.totalSeconds / 60),
    songCount: Object.values(stats.trackSeconds).filter((seconds) => seconds > 10).length,
    concentration: Math.min(100, Math.round(stats.totalSeconds / 3600 * 100)),
  };
}

function isDailyListeningStats(value: unknown, date: string): value is DailyListeningStats {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;

  const stats = value as Record<string, unknown>;
  if (stats.date !== date || !Number.isFinite(stats.totalSeconds) || (stats.totalSeconds as number) < 0) return false;
  if (!stats.trackSeconds || typeof stats.trackSeconds !== 'object' || Array.isArray(stats.trackSeconds)) return false;

  return Object.values(stats.trackSeconds as Record<string, unknown>)
    .every((seconds) => Number.isFinite(seconds) && (seconds as number) >= 0);
}

export function readDailyStats(date: string, storage?: Storage): DailyListeningStats {
  try {
    const saved = (storage ?? window.localStorage).getItem(storageKey(date));
    if (!saved) return createEmptyDailyStats(date);

    const parsed: unknown = JSON.parse(saved);
    return isDailyListeningStats(parsed, date) ? parsed : createEmptyDailyStats(date);
  } catch {
    return createEmptyDailyStats(date);
  }
}

export function writeDailyStats(stats: DailyListeningStats, storage?: Storage): void {
  try {
    (storage ?? window.localStorage).setItem(storageKey(stats.date), JSON.stringify(stats));
  } catch {
    // Persistence is optional: React state remains the authoritative in-session record.
  }
}
