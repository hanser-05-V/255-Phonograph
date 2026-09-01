import {describe, expect, it} from 'vitest';
import {formatTime, nextIndex, previousIndex} from './player-utils';

describe('player utilities', () => {
  it('formats seconds and clamps invalid values', () => {
    expect(formatTime(65)).toBe('1:05');
    expect(formatTime(Number.NaN)).toBe('0:00');
  });

  it('wraps the queue in both directions', () => {
    expect(nextIndex(2, 3)).toBe(0);
    expect(previousIndex(0, 3)).toBe(2);
  });
});
