import {describe, expect, it} from 'vitest';
import type {Track} from '../player/types';
import {getDailyTrackIndex, resolveSectionTracks} from './home-utils';

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

  it('resolves server section ids in order, drops stale ids, and caps after filtering', () => {
    const sectionTracks = Array.from({length: 7}, (_, index): Track => ({
      id: `track-${index}`,
      title: `歌曲 ${index}`,
      artist: 'Hanser',
      audioUrl: `${index}.mp3`,
    }));

    expect(resolveSectionTracks(
      new Map(sectionTracks.map((track) => [track.id, track])),
      ['missing', ...sectionTracks.map(({id}) => id)],
    ).map(({id}) => id)).toEqual([
      'track-0',
      'track-1',
      'track-2',
      'track-3',
      'track-4',
      'track-5',
    ]);
  });
});
