import {act, cleanup, fireEvent, render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter, Route, Routes, useLocation} from 'react-router-dom';
import {afterEach, describe, expect, it, vi} from 'vitest';
import type {LibraryResponse, PublicSong} from '../../../shared/contracts';
import {LibraryContext} from '../library/LibraryProvider';
import {toPlayerTracks} from '../library/PublicApp';
import {
  libraryFixture,
  libraryWithSections,
} from '../library/test/library-fixtures';
import {MiniPlayer} from '../player/MiniPlayer';
import {PlayerProvider} from '../player/PlayerProvider';
import {usePlayer} from '../player/usePlayer';
import {getLocalDateKey} from './daily-listening';
import {getDailyTrackIndex} from './home-utils';
import {HomePage} from './HomePage';

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function renderHome({
  library = libraryWithSections,
  audioControllers = [],
}: {
  library?: LibraryResponse;
  audioControllers?: HTMLAudioElement[];
} = {}) {
  function PlayerReader() {
    const {audio, currentTrack} = usePlayer();
    if (audio && !audioControllers.includes(audio)) {
      audioControllers.push(audio);
    }

    return <output data-testid="current-track">{currentTrack.title}</output>;
  }

  function MusicDestination() {
    const location = useLocation();
    return (
      <main aria-label="音乐馆">
        <output data-testid="music-query">{new URLSearchParams(location.search).get('q')}</output>
      </main>
    );
  }

  return render(
    <MemoryRouter>
      <LibraryContext.Provider value={{
        library,
        status: 'ready',
        error: null,
        refresh: vi.fn(),
      }}>
        <PlayerProvider tracks={toPlayerTracks(library.songs)}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/music" element={<MusicDestination />} />
          </Routes>
          <MiniPlayer />
          <PlayerReader />
        </PlayerProvider>
      </LibraryContext.Provider>
    </MemoryRouter>,
  );
}

function makeSectionLibrary(counts: {
  recent: number;
  featured: number;
  liveCovers: number;
}): LibraryResponse {
  const songCount = Math.max(counts.recent, counts.featured, counts.liveCovers);
  const songs: PublicSong[] = Array.from({length: songCount}, (_, index) => {
    const source = libraryFixture.songs[index % libraryFixture.songs.length];
    return index === 0
      ? source
      : {
          ...source,
          id: `section-song-${index}`,
          title: `分区歌曲 ${index}`,
          audioUrl: `/api/media/section-song-${index}`,
        };
  });
  const ids = songs.map(({id}) => id);

  return {
    ...libraryFixture,
    songs,
    sections: {
      recent: ids.slice(0, counts.recent),
      featured: ids.slice(0, counts.featured),
      liveCovers: ids.slice(0, counts.liveCovers),
    },
  };
}

describe('HomePage', () => {
  it('presents the daily dashboard and honest non-interactive previews', () => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);

    renderHome();

    expect(screen.getByRole('navigation', {name: '主导航'})).toBeInTheDocument();
    expect(screen.getByRole('link', {name: '首页'})).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', {name: '音乐馆'})).toHaveAttribute('href', '/music');
    expect(screen.getByRole('link', {name: '故事会'})).toHaveAttribute('href', '#stories');
    expect(screen.getByRole('searchbox', {name: '按歌名搜索'})).toHaveAttribute(
      'placeholder',
      '按歌名搜索',
    );
    expect(screen.getByText('今天的憨浓度')).toBeInTheDocument();
    expect(screen.getByRole('button', {name: /每日憨曲/})).toBeEnabled();
    expect(screen.getByRole('button', {name: '每日一签'})).toBeDisabled();
    expect(screen.getByText('功能筹备中')).toBeInTheDocument();
    expect(screen.getByText('直播翻唱精选')).toBeInTheDocument();
    expect(screen.getByText('最近加入')).toBeInTheDocument();
    expect(screen.getByText('故事会精选')).toBeInTheDocument();
    expect(screen.queryByText('安静时刻')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', {name: /故事会精选|最近更新|时间轴/})).not.toBeInTheDocument();
  });

  it('submits homepage title search without remounting the shared player', async () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    const user = userEvent.setup();
    const audioControllers: HTMLAudioElement[] = [];
    renderHome({audioControllers});

    const search = screen.getByRole('searchbox', {name: '按歌名搜索'});
    await user.type(search, '小星球');
    const recentSection = screen.getByRole('region', {name: '最近加入'});
    expect(within(recentSection).getByRole('button', {name: '播放 等火山喷发的小星球'}))
      .toBeInTheDocument();
    expect(within(recentSection).getByRole('button', {name: '播放 初光'}))
      .toBeInTheDocument();
    expect(within(recentSection).getByRole('button', {name: '播放 夜行'}))
      .toBeInTheDocument();

    await user.click(within(recentSection).getByRole('button', {
      name: '播放 等火山喷发的小星球',
    }));
    expect(play).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('current-track')).toHaveTextContent('等火山喷发的小星球');

    await user.click(search);
    await user.keyboard('{Enter}');
    expect(screen.getByRole('main', {name: '音乐馆'})).toBeInTheDocument();
    expect(screen.getByTestId('music-query')).toHaveTextContent('小星球');
    expect(screen.getByTestId('current-track')).toHaveTextContent('等火山喷发的小星球');
    expect(play).toHaveBeenCalledTimes(1);
    expect(audioControllers).toHaveLength(1);
  });

  it('updates the daily track from the listening view date while playback is paused', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 1, 23, 59, 59));
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    renderHome();

    const firstDate = '2026-09-01';
    const nextDate = '2026-09-02';
    const tracks = toPlayerTracks(libraryWithSections.songs);
    const firstTrack = tracks[getDailyTrackIndex(firstDate, tracks.length)];
    const nextTrack = tracks[getDailyTrackIndex(nextDate, tracks.length)];
    expect(firstTrack).not.toBe(nextTrack);
    expect(screen.getByRole('button', {
      name: new RegExp(`每日憨曲.*${firstTrack.title}`),
    })).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(screen.getByRole('button', {
      name: new RegExp(`每日憨曲.*${nextTrack.title}`),
    })).toBeInTheDocument();
  });

  it('renders three server-defined sections capped at six and plays the daily track by stable id', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 3, 9));
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    localStorage.setItem('255-phonograph:player:v2', JSON.stringify({
      version: 2,
      currentTrackId: 'section-song-1',
      currentTime: 0,
      volume: 0.7,
      isMuted: false,
      queueIds: ['section-song-1'],
    }));
    const library = makeSectionLibrary({recent: 8, featured: 7, liveCovers: 7});
    renderHome({library});

    expect(screen.getByTestId('current-track')).toHaveTextContent('分区歌曲 1');
    expect(screen.getByRole('region', {name: '最近加入'}).querySelectorAll('article'))
      .toHaveLength(6);
    expect(screen.getByRole('region', {name: '精选歌曲'}).querySelectorAll('article'))
      .toHaveLength(6);
    expect(screen.getByRole('region', {name: '直播翻唱精选'}).querySelectorAll('article'))
      .toHaveLength(6);

    fireEvent.click(screen.getByRole('button', {name: '播放每日憨曲：初光'}));
    expect(screen.getByTestId('current-track')).toHaveTextContent('初光');
  });

  it('keeps story previews non-navigable and links every music section to the library', () => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    renderHome();

    const musicLinks = screen.getAllByRole('link', {name: '进入音乐馆'});
    expect(musicLinks).toHaveLength(3);
    expect(musicLinks.every((link) => link.getAttribute('href') === '/music')).toBe(true);
    expect(screen.queryByRole('link', {name: /故事会精选|最近更新|时间轴/}))
      .not.toBeInTheDocument();
  });
});
