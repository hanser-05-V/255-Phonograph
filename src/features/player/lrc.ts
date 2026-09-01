import type {LyricLine} from './types';

export const parseLrc = (content: string): LyricLine[] =>
  content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .flatMap((line) => {
      const match = line.match(/\[(\d{2}):(\d{2}(?:\.\d+)?)\](.*)/);
      if (!match) return [];
      return [{time: Number(match[1]) * 60 + Number(match[2]), text: match[3].trim()}];
    })
    .sort((a, b) => a.time - b.time);

export const findActiveLyricIndex = (lyrics: LyricLine[], currentTime: number) => {
  for (let index = lyrics.length - 1; index >= 0; index -= 1) {
    if (lyrics[index].time <= currentTime) return index;
  }
  return -1;
};
