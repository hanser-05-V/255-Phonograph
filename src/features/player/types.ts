export type Track = {
  id: string;
  title: string;
  artist: string;
  audioUrl: string;
  coverUrl?: string;
  backgroundUrl?: string;
  lyricsUrl?: string;
};

export type LyricLine = {time: number; text: string};

export type PlayerSnapshotV2 = {
  version: 2;
  currentTrackId: string;
  currentTime: number;
  volume: number;
  isMuted: boolean;
  queueIds: string[];
};
