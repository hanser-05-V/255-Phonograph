import {act, cleanup, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {PlayerProvider} from './PlayerProvider';
import {usePlayer} from './usePlayer';
import type {Track} from './types';

const tracks: Track[] = [
  {
    id: 'first',
    title: '第一首',
    artist: '测试歌手',
    audioUrl: 'data:audio/wav;base64,UklGRg==',
  },
  {
    id: 'second',
    title: '第二首',
    artist: '测试歌手',
    audioUrl: 'data:audio/wav;base64,UklGRg==',
  },
];

function Harness() {
  const {audio, currentTime, currentTrack, isPlaying, next, previous, toggle} = usePlayer();

  return (
    <>
      <p data-testid="title">{currentTrack.title}</p>
      <p data-testid="playing">{String(isPlaying)}</p>
      <p data-testid="current-time">{currentTime}</p>
      <p data-testid="audio-ready">{String(audio instanceof HTMLAudioElement)}</p>
      <button onClick={() => void toggle()}>播放</button>
      <button onClick={next}>下一首</button>
      <button onClick={previous}>上一首</button>
    </>
  );
}

describe('PlayerProvider', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('plays, pauses, and wraps the queue through one shared controller', async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    const user = userEvent.setup();

    render(
      <PlayerProvider tracks={tracks}>
        <Harness />
      </PlayerProvider>,
    );

    expect(screen.getByTestId('title')).toHaveTextContent('第一首');
    await user.click(screen.getByRole('button', {name: '播放'}));
    expect(screen.getByTestId('playing')).toHaveTextContent('true');
    await user.click(screen.getByRole('button', {name: '下一首'}));
    expect(screen.getByTestId('title')).toHaveTextContent('第二首');
    await user.click(screen.getByRole('button', {name: '下一首'}));
    expect(screen.getByTestId('title')).toHaveTextContent('第一首');
    await user.click(screen.getByRole('button', {name: '播放'}));
    expect(screen.getByTestId('playing')).toHaveTextContent('false');
  });

  it('uses the same wrapped queue advance path when audio ends', () => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    let controller: HTMLAudioElement | null = null;
    function AudioReader() {
      controller = usePlayer().audio;
      return null;
    }
    render(
      <PlayerProvider tracks={tracks}>
        <Harness />
        <AudioReader />
      </PlayerProvider>,
    );

    expect(screen.getByTestId('audio-ready')).toHaveTextContent('true');
    expect(controller).not.toBeNull();
    act(() => controller?.dispatchEvent(new Event('ended')));
    expect(screen.getByTestId('title')).toHaveTextContent('第二首');
  });

  it('automatically starts the next track after the pause and ended lifecycle', async () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    const user = userEvent.setup();
    let controller: HTMLAudioElement | null = null;
    function AudioReader() {
      controller = usePlayer().audio;
      return null;
    }
    render(
      <PlayerProvider tracks={tracks}>
        <Harness />
        <AudioReader />
      </PlayerProvider>,
    );

    await user.click(screen.getByRole('button', {name: '播放'}));
    expect(play).toHaveBeenCalledTimes(1);

    act(() => {
      controller?.dispatchEvent(new Event('pause'));
      controller?.dispatchEvent(new Event('ended'));
    });

    expect(screen.getByTestId('title')).toHaveTextContent('第二首');
    expect(play).toHaveBeenCalledTimes(2);
  });

  it('rejects an empty queue with a developer-facing error', () => {
    expect(() => render(<PlayerProvider tracks={[]}>content</PlayerProvider>)).toThrow(
      'PlayerProvider requires a non-empty tracks array.',
    );
  });
});
