import {render} from '@testing-library/react';
import {MemoryRouter, Route, Routes} from 'react-router-dom';
import {vi} from 'vitest';
import type {LibraryResponse} from '../../../../shared/contracts';
import {PlayerContext, type PlayerContextValue} from '../../player/PlayerProvider';
import {LibraryContext} from '../LibraryProvider';
import {MusicPage} from '../MusicPage';
import {toPlayerTracks} from '../PublicApp';
import {libraryFixture} from './library-fixtures';

const fixtureTracks = toPlayerTracks(libraryFixture.songs);

export const player: PlayerContextValue = {
  audio: null,
  tracks: fixtureTracks,
  currentTrack: fixtureTracks[0],
  currentIndex: 0,
  currentTime: 0,
  duration: 0,
  volume: 0.7,
  isMuted: false,
  isPlaying: false,
  isExpanded: false,
  error: null,
  queueIds: fixtureTracks.map(({id}) => id),
  toggle: vi.fn().mockResolvedValue(undefined),
  playTrack: vi.fn().mockResolvedValue(undefined),
  next: vi.fn(),
  previous: vi.fn(),
  seek: vi.fn(),
  setVolume: vi.fn(),
  toggleMuted: vi.fn(),
  setExpanded: vi.fn(),
};

export function renderPublic(path: string, library: LibraryResponse) {
  const tracks = toPlayerTracks(library.songs);
  player.tracks = tracks;
  player.currentTrack = tracks[0] ?? fixtureTracks[0];
  player.currentIndex = 0;
  player.queueIds = tracks.map(({id}) => id);

  return render(
    <MemoryRouter initialEntries={[path]}>
      <LibraryContext.Provider value={{
        library,
        status: library.songs.length === 0 ? 'empty' : 'ready',
        error: null,
        refresh: vi.fn(),
      }}>
        <PlayerContext.Provider value={player}>
          <Routes>
            <Route path="/music" element={<MusicPage />} />
          </Routes>
        </PlayerContext.Provider>
      </LibraryContext.Provider>
    </MemoryRouter>,
  );
}
