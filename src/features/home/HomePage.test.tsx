import {act, cleanup, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter, Route, Routes, useLocation} from 'react-router-dom';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {MiniPlayer} from '../player/MiniPlayer';
import {PlayerProvider} from '../player/PlayerProvider';
import {demoTracks} from '../player/demo-tracks';
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

function renderHome(audioControllers: HTMLAudioElement[] = []) {
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
      <PlayerProvider tracks={demoTracks}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/music" element={<MusicDestination />} />
        </Routes>
        <MiniPlayer />
        <PlayerReader />
      </PlayerProvider>
    </MemoryRouter>,
  );
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
    expect(screen.getAllByText('持续整理中')).toHaveLength(2);
    expect(screen.getByText('故事会精选')).toBeInTheDocument();
    expect(screen.queryByText('安静时刻')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', {name: /直播翻唱精选|最近加入|故事会精选/})).not.toBeInTheDocument();
  });

  it('submits homepage title search without remounting the shared player', async () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    const user = userEvent.setup();
    const audioControllers: HTMLAudioElement[] = [];
    renderHome(audioControllers);

    const search = screen.getByRole('searchbox', {name: '按歌名搜索'});
    await user.type(search, '小星球');
    expect(screen.getByRole('button', {name: '播放 等火山喷发的小星球'})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: '播放 初光'})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: '播放 夜行'})).toBeInTheDocument();

    await user.click(screen.getByRole('button', {name: '播放 等火山喷发的小星球'}));
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
    const firstTrack = demoTracks[getDailyTrackIndex(firstDate, demoTracks.length)];
    const nextTrack = demoTracks[getDailyTrackIndex(nextDate, demoTracks.length)];
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
});
