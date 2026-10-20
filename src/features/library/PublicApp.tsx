import {useEffect, useMemo} from 'react';
import {Navigate, Route, Routes, useLocation} from 'react-router-dom';
import type {PublicSong} from '../../../shared/contracts';
import {SiteFooter} from '../../components/SiteFooter';
import type {Track} from '../player/types';
import {HomePage} from '../home/HomePage';
import {GoodnightRadioPage} from '../home/GoodnightRadioPage';
import '../../styles/public-theme.css';
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
      <Route path="/goodnight-radio" element={<GoodnightRadioPage />} />
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
  const {pathname} = useLocation();
  useEffect(() => {
    document.title = `${pathname === '/music' ? '音乐馆 · ' : pathname === '/goodnight-radio' ? '晚安电台 · ' : ''}255 留音机`;
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname]);
  const tracks = useMemo(() => toPlayerTracks(library?.songs ?? []), [library?.songs]);
  const isPlayable = status === 'ready' && tracks.length > 0;

  return (
    <div className={`public-site-shell${isPlayable ? ' public-site-shell--with-player' : ''}`}>
      {isPlayable ? (
        <PlayerProvider tracks={tracks}>
          <PlayerSurface />
        </PlayerProvider>
      ) : (
        pathname === '/goodnight-radio' ? <GoodnightRadioPage /> : <PublicLibraryState status={status === 'ready' ? 'empty' : status} />
      )}
      <SiteFooter />
    </div>
  );
}
