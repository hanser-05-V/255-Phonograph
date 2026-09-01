import {act, cleanup, render, screen} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {
  addListeningSeconds,
  createEmptyDailyStats,
  readDailyStats,
  toDailyListeningView,
  writeDailyStats,
} from './daily-listening';
import {useDailyListeningStats} from './useDailyListeningStats';

function DailyListeningHarness({isPlaying, trackId}: {isPlaying: boolean; trackId: string}) {
  const stats = useDailyListeningStats({isPlaying, trackId});

  return <output data-testid="daily-listening-stats">{JSON.stringify(stats)}</output>;
}

function currentView() {
  return JSON.parse(screen.getByTestId('daily-listening-stats').textContent ?? '');
}

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('daily listening records', () => {
  it('accumulates seconds, counts a track after ten seconds, and caps concentration', () => {
    let stats = createEmptyDailyStats('2026-09-01');
    stats = addListeningSeconds(stats, '2026-09-01', 'track-a', 9);
    expect(toDailyListeningView(stats)).toEqual({
      date: '2026-09-01', totalSeconds: 9, minutes: 0, songCount: 0, concentration: 0,
    });

    stats = addListeningSeconds(stats, '2026-09-01', 'track-a', 1);
    expect(toDailyListeningView(stats).songCount).toBe(0);

    stats = addListeningSeconds(stats, '2026-09-01', 'track-a', 1);
    expect(toDailyListeningView(stats).songCount).toBe(1);

    stats = addListeningSeconds(stats, '2026-09-01', 'track-b', 3600);
    expect(toDailyListeningView(stats).concentration).toBe(100);
  });

  it('resets when the local date changes', () => {
    const yesterday = addListeningSeconds(createEmptyDailyStats('2026-09-01'), '2026-09-01', 'a', 25);
    expect(addListeningSeconds(yesterday, '2026-09-02', 'b', 1)).toEqual({
      date: '2026-09-02', totalSeconds: 1, trackSeconds: {b: 1},
    });
  });

  it('falls back to a zero record for malformed or blocked storage', () => {
    localStorage.setItem('255-phonograph:listening:2026-09-01', '{not-json');
    expect(readDailyStats('2026-09-01', localStorage)).toEqual(createEmptyDailyStats('2026-09-01'));

    const brokenStorage = {getItem: () => { throw new Error('blocked'); }} as unknown as Storage;
    expect(readDailyStats('2026-09-01', brokenStorage)).toEqual(createEmptyDailyStats('2026-09-01'));
  });

  it('rejects structurally invalid saved records and safely ignores failed writes', () => {
    localStorage.setItem('255-phonograph:listening:2026-09-01', JSON.stringify({
      date: '2026-09-01', totalSeconds: -3, trackSeconds: {a: 3},
    }));
    expect(readDailyStats('2026-09-01', localStorage)).toEqual(createEmptyDailyStats('2026-09-01'));

    const blockedStorage = {setItem: () => { throw new Error('blocked'); }} as unknown as Storage;
    expect(() => writeDailyStats(createEmptyDailyStats('2026-09-01'), blockedStorage)).not.toThrow();
  });
});

describe('useDailyListeningStats', () => {
  it('counts playing seconds and stops counting when playback pauses', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 1, 9));
    const {rerender} = render(<DailyListeningHarness isPlaying trackId="track-a" />);

    act(() => {
      vi.advanceTimersByTime(11_000);
    });
    expect(currentView()).toEqual({
      date: '2026-09-01', totalSeconds: 11, minutes: 0, songCount: 1, concentration: 0,
    });

    rerender(<DailyListeningHarness isPlaying={false} trackId="track-a" />);
    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    expect(currentView().totalSeconds).toBe(11);
  });

  it('starts a new zero-based record when a playing tick crosses local midnight', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 1, 23, 59, 59));
    render(<DailyListeningHarness isPlaying trackId="track-a" />);

    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(currentView()).toEqual({
      date: '2026-09-02', totalSeconds: 1, minutes: 0, songCount: 0, concentration: 0,
    });
  });
});
