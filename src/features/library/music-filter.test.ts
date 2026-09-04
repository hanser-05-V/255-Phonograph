import {describe, expect, it} from 'vitest';
import {
  firstLightSong,
  libraryFixture,
  liveGentleSong,
  planetSong,
} from './test/library-fixtures';
import {filterLibrarySongs} from './music-filter';

describe('filterLibrarySongs', () => {
  it('searches title only and combines one category with one tag', () => {
    expect(filterLibrarySongs(libraryFixture.songs, {
      query: ' 星球 ',
      categoryId: null,
      tagId: null,
    })).toEqual([planetSong]);
    expect(filterLibrarySongs(libraryFixture.songs, {
      query: 'Hanser',
      categoryId: null,
      tagId: null,
    })).toEqual([]);
    expect(filterLibrarySongs(libraryFixture.songs, {
      query: '',
      categoryId: 'live',
      tagId: 'gentle',
    })).toEqual([liveGentleSong]);
  });

  it('matches titles without changing the published order or input array', () => {
    const songs = [...libraryFixture.songs];

    expect(filterLibrarySongs(songs, {
      query: '初光',
      categoryId: null,
      tagId: null,
    })).toEqual([firstLightSong]);
    expect(songs).toEqual(libraryFixture.songs);
  });
});
