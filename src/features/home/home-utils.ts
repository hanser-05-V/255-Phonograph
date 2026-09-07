import type {Track} from '../player/types';

export const getDailyTrackIndex = (date: string, count: number) => {
  if (count < 1) {
    throw new Error('Daily track selection requires a non-empty queue.');
  }

  const seed = Array.from(date).reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  );
  return seed % count;
};

export const resolveSectionTracks = (
  trackById: ReadonlyMap<string, Track>,
  trackIds: readonly string[],
  limit = 6,
) => trackIds
  .map((trackId) => trackById.get(trackId))
  .filter((track): track is Track => track !== undefined)
  .slice(0, limit);
