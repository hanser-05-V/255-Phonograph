import {useMemo} from 'react';
import {Navigate, Route, Routes} from 'react-router-dom';
import type {PublicSong} from '../../../shared/contracts';
import type {Track} from '../player/types';
import {HomePage} from '../home/HomePage';
import {FullPlayer} from '../player/FullPlayer';
import {MiniPlayer} from '../player/MiniPlayer';
import {PlayerProvider} from '../player/PlayerProvider';
import {usePlayer} from '../player/usePlayer';
import {useLibrary} from './LibraryProvider';
import {MusicPage} from './MusicPage';
import {PublicLibraryState} from './PublicLibraryState';

export const toPlayerTracks = (songs: readonly PublicSong[]): Track[] => (
  songs.map((song) => ({
    id: song.id,
    title: song.title,
    artist: song.artist,
    audioUrl: song.audioUrl,
    coverUrl: song.coverUrl,
    lyricsUrl: song.lyricsUrl,
  }))
);

function PublicRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/music" element={<MusicPage />} />
      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
  );
}

function PlayerSurface() {
  const {isExpanded} = usePlayer();

  return (
    <>
      <PublicRoutes />
      {isExpanded ? <FullPlayer /> : null}
      <MiniPlayer />
    </>
  );
}

export function PublicApp() {
  const {library, status} = useLibrary();
  const tracks = useMemo(() => toPlayerTracks(library?.songs ?? []), [library?.songs]);

  if (status !== 'ready' || !library || tracks.length === 0) {
    return <PublicLibraryState status={status === 'ready' ? 'empty' : status} />;
  }

  return (
    <PlayerProvider tracks={tracks}>
      <PlayerSurface />
    </PlayerProvider>
  );
}
