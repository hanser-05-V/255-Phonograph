import {describe, expect, it} from 'vitest';
import type {Track} from '../player/types';
import {filterTracks, getDailyTrackIndex} from './home-utils';

const tracks: Track[] = [
  {id: 'first-light', title: '初光', artist: 'Hanser', audioUrl: 'first.wav'},
  {
    id: 'volcano-planet',
    title: '等火山喷发的小星球',
    artist: 'Hanser',
    audioUrl: 'planet.wav',
  },
  {id: 'night-walk', title: '夜行', artist: 'Hanser', audioUrl: 'night.wav'},
];

describe('home utilities', () => {
  it('selects the same track for the same date and rotates across dates', () => {
    expect(getDailyTrackIndex('2026-09-01', 3)).toBe(getDailyTrackIndex('2026-09-01', 3));
    expect(getDailyTrackIndex('2026-09-01', 3)).not.toBe(
      getDailyTrackIndex('2026-09-02', 3),
    );
  });

  it('matches trimmed title or artist queries and treats empty input as all tracks', () => {
    expect(filterTracks(tracks, '  小星球 ')).toEqual([tracks[1]]);
    expect(filterTracks(tracks, 'HANSER')).toEqual(tracks);
    expect(filterTracks(tracks, '   ')).toEqual(tracks);
    expect(filterTracks(tracks, '不存在')).toEqual([]);
  });
});
