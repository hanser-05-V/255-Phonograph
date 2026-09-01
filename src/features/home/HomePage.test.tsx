import {act, cleanup, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  return render(
    <PlayerProvider tracks={demoTracks}>
      <HomePage />
      <MiniPlayer />
      <PlayerReader />
    </PlayerProvider>,
  );
}

describe('HomePage', () => {
  it('presents the daily dashboard and honest non-interactive previews', () => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);

    renderHome();

    expect(screen.getByRole('navigation', {name: '主导航'})).toBeInTheDocument();
    expect(screen.getByRole('link', {name: '首页'})).toHaveAttribute('href', '#home');
    expect(screen.getByRole('link', {name: '音乐馆'})).toHaveAttribute('href', '#music');
    expect(screen.getByRole('link', {name: '故事会'})).toHaveAttribute('href', '#stories');
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

  it('filters real tracks without changing playback and plays through one shared audio element', async () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    const user = userEvent.setup();
    const audioControllers: HTMLAudioElement[] = [];
    renderHome(audioControllers);

    const search = screen.getByRole('searchbox', {name: '搜索歌曲'});
    await user.type(search, '小星球');
    expect(screen.getByRole('button', {name: '播放 等火山喷发的小星球'})).toBeInTheDocument();
    expect(screen.queryByRole('button', {name: '播放 初光'})).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {name: '播放 夜行'})).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', {name: '播放 等火山喷发的小星球'}));
    expect(play).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('current-track')).toHaveTextContent('等火山喷发的小星球');

    await user.clear(search);
    await user.type(search, '没有的歌');
    expect(screen.getByText('没有找到相关歌曲')).toBeInTheDocument();
    expect(screen.getByTestId('current-track')).toHaveTextContent('等火山喷发的小星球');
    expect(play).toHaveBeenCalledTimes(1);

    await user.clear(search);
    expect(screen.getByRole('button', {name: '播放 初光'})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: '播放 等火山喷发的小星球'})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: '播放 夜行'})).toBeInTheDocument();

    const dailyTrack = demoTracks[getDailyTrackIndex(getLocalDateKey(), demoTracks.length)];
    await user.click(screen.getByRole('button', {name: new RegExp(`每日憨曲.*${dailyTrack.title}`)}));
    expect(play).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('current-track')).toHaveTextContent(dailyTrack.title);
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
