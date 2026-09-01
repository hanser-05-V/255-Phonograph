import {useEffect, useState} from 'react';
import {
  addListeningSeconds,
  getLocalDateKey,
  readDailyStats,
  toDailyListeningView,
  writeDailyStats,
  type DailyListeningView,
} from './daily-listening';

export function useDailyListeningStats({isPlaying, trackId}: {
  isPlaying: boolean;
  trackId: string;
}): DailyListeningView {
  const [stats, setStats] = useState(() => readDailyStats(getLocalDateKey()));

  useEffect(() => {
    const timer = window.setInterval(() => {
      setStats((current) => {
        const date = getLocalDateKey();
        if (current.date !== date) {
          return readDailyStats(date);
        }

        if (!isPlaying) {
          return current;
        }

        const next = addListeningSeconds(current, date, trackId, 1);
        writeDailyStats(next);
        return next;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isPlaying, trackId]);

  return toDailyListeningView(stats);
}
