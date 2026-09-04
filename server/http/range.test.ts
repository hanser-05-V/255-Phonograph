import {describe, expect, it} from 'vitest';

import {parseByteRange} from './range.js';

describe('parseByteRange', () => {
  it.each([
    ['bytes=0-3', {start: 0, end: 3}],
    ['bytes=4-', {start: 4, end: 9}],
    ['bytes=-4', {start: 6, end: 9}],
  ])('parses %s', (header, expected) => {
    expect(parseByteRange(header, 10)).toEqual(expected);
  });

  it('returns null when the request does not include a range', () => {
    expect(parseByteRange(undefined, 10)).toBeNull();
  });

  it.each([
    'bytes=0-1,4-5',
    'bytes=20-30',
    'bytes=7-3',
    'bytes=-0',
    'bytes=',
    'items=0-3',
    'bytes=9007199254740992-',
  ])('rejects invalid range %s', (header) => {
    expect(() => parseByteRange(header, 10)).toThrow(RangeError);
  });

  it('rejects a range for an empty media object', () => {
    expect(() => parseByteRange('bytes=0-', 0)).toThrow(RangeError);
  });
});
