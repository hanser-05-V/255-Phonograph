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

export const filterTracks = (tracks: Track[], query: string) => {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) {
    return tracks;
  }

  return tracks.filter((track) =>
    `${track.title} ${track.artist}`.toLocaleLowerCase().includes(normalized),
  );
};
