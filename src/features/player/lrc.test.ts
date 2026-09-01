import {describe, expect, it} from 'vitest';
import {findActiveLyricIndex, parseLrc} from './lrc';

describe('LRC', () => {
  const lyrics = parseLrc('[00:01.00]第一句\n[00:03.50]第二句');

  it('parses and sorts timestamped lines', () => {
    expect(lyrics).toEqual([
      {time: 1, text: '第一句'},
      {time: 3.5, text: '第二句'},
    ]);
  });

  it('finds the active lyric for playback time', () => {
    expect(findActiveLyricIndex(lyrics, 0.5)).toBe(-1);
    expect(findActiveLyricIndex(lyrics, 3.8)).toBe(1);
  });
});
