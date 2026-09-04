import {describe, expect, it} from 'vitest';
import {validateLrc} from '../../../shared/lrc';
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

  it('expands multiple timestamps and ignores blank and metadata lines', () => {
    expect(
      parseLrc('[ar:255]\n[length:03:00]\n\n[00:03.50][00:01.00]同一句'),
    ).toEqual([
      {time: 1, text: '同一句'},
      {time: 3.5, text: '同一句'},
    ]);
    expect(validateLrc('[length:03:00]')).toEqual({valid: true, errors: []});
  });

  it('reports exact invalid lines while allowing empty lyrics', () => {
    expect(validateLrc('')).toEqual({valid: true, errors: []});
    expect(
      validateLrc(
        '[00:01.20]第一句\n坏的时间标签\n[00:60.00]秒数越界\n[00:02.00残缺',
      ),
    ).toEqual({
      valid: false,
      errors: [
        {line: 2, message: '歌词行缺少有效时间标签'},
        {line: 3, message: '歌词时间标签的秒数必须小于 60'},
        {line: 4, message: '歌词时间标签括号不完整'},
      ],
    });
  });
});
