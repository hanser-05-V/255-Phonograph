import {act, cleanup, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {PlayerProvider, type PlayerContextValue} from './PlayerProvider';
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
  const {audio, currentTime, currentTrack, error, isPlaying, next, playTrack, previous, toggle} = usePlayer();

  return (
    <>
      <p data-testid="title">{currentTrack.title}</p>
      <p data-testid="playing">{String(isPlaying)}</p>
      <p data-testid="error">{error ?? ''}</p>
      <p data-testid="current-time">{currentTime}</p>
      <p data-testid="audio-ready">{String(audio instanceof HTMLAudioElement)}</p>
      <p data-testid="audio-identity">{audio ? 'ready' : 'missing'}</p>
      <button onClick={() => void toggle()}>播放</button>
      <button onClick={() => void playTrack(1)}>播放第二首</button>
      <button onClick={next}>下一首</button>
      <button onClick={previous}>上一首</button>
    </>
  );
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return {promise, reject, resolve};
}

function renderWithPlayerCapture() {
  let player: PlayerContextValue | null = null;

  function PlayerCapture() {
    player = usePlayer();
    return null;
  }

  render(
    <PlayerProvider tracks={tracks}>
      <Harness />
      <PlayerCapture />
    </PlayerProvider>,
  );

  return () => {
    if (!player) {
      throw new Error('Expected the player context to be ready.');
    }
    return player;
  };
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
    const continuation = deferred<void>();
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play')
      .mockResolvedValueOnce(undefined)
      .mockReturnValueOnce(continuation.promise);
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
    expect(screen.getByTestId('playing')).toHaveTextContent('true');

    act(() => controller?.dispatchEvent(new Event('pause')));
    expect(screen.getByTestId('playing')).toHaveTextContent('false');

    act(() => controller?.dispatchEvent(new Event('ended')));
    expect(screen.getByTestId('title')).toHaveTextContent('第二首');
    expect(play).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('playing')).toHaveTextContent('false');

    await act(async () => {
      continuation.resolve();
      await continuation.promise;
    });
    expect(screen.getByTestId('playing')).toHaveTextContent('true');
  });

  it('reports a standalone native pause as confirmed paused state', async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
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
    expect(screen.getByTestId('playing')).toHaveTextContent('true');

    act(() => controller?.dispatchEvent(new Event('pause')));
    expect(screen.getByTestId('playing')).toHaveTextContent('false');
  });

  it('plays a requested track through the existing shared audio element', async () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    const user = userEvent.setup();
    const controllers: HTMLAudioElement[] = [];

    function AudioReader() {
      const {audio} = usePlayer();
      if (audio && !controllers.includes(audio)) controllers.push(audio);
      return null;
    }

    render(
      <PlayerProvider tracks={tracks}>
        <Harness />
        <AudioReader />
      </PlayerProvider>,
    );

    await user.click(screen.getByRole('button', {name: '播放第二首'}));
    expect(screen.getByTestId('title')).toHaveTextContent('第二首');
    expect(screen.getByTestId('playing')).toHaveTextContent('true');
    expect(play).toHaveBeenCalledOnce();
    expect(controllers).toHaveLength(1);
  });

  it('confirms current-track playback only after play resolves and reports a current rejection', async () => {
    const success = deferred<void>();
    const failure = deferred<void>();
    vi.spyOn(HTMLMediaElement.prototype, 'play')
      .mockReturnValueOnce(success.promise)
      .mockReturnValueOnce(failure.promise);
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    const getPlayer = renderWithPlayerCapture();

    let successRequest!: Promise<void>;
    act(() => {
      successRequest = getPlayer().playTrack(0);
    });

    expect(screen.getByTestId('playing')).toHaveTextContent('false');
    act(() => success.resolve());
    await act(async () => successRequest);
    expect(screen.getByTestId('playing')).toHaveTextContent('true');
    expect(screen.getByTestId('error')).toBeEmptyDOMElement();

    await act(async () => getPlayer().toggle());
    let failureRequest!: Promise<void>;
    act(() => {
      failureRequest = getPlayer().playTrack(0);
    });
    expect(screen.getByTestId('playing')).toHaveTextContent('false');

    act(() => failure.reject(new Error('decoder failed')));
    await act(async () => failureRequest);
    expect(screen.getByTestId('playing')).toHaveTextContent('false');
    expect(screen.getByTestId('error')).toHaveTextContent('音频加载失败，请尝试其他歌曲。');
  });

  it('keeps a switched-track request pending until its play attempt resolves', async () => {
    const switched = deferred<void>();
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockReturnValueOnce(switched.promise);
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    const getPlayer = renderWithPlayerCapture();
    let completed = false;
    let request!: Promise<void>;

    act(() => {
      request = getPlayer().playTrack(1).then(() => {
        completed = true;
      });
    });

    expect(screen.getByTestId('title')).toHaveTextContent('第二首');
    expect(screen.getByTestId('playing')).toHaveTextContent('false');
    expect(completed).toBe(false);

    act(() => switched.resolve());
    await act(async () => request);
    expect(completed).toBe(true);
    expect(screen.getByTestId('playing')).toHaveTextContent('true');
  });

  it('ignores a superseded request rejection after a newer track starts playing', async () => {
    const older = deferred<void>();
    const newer = deferred<void>();
    vi.spyOn(HTMLMediaElement.prototype, 'play')
      .mockReturnValueOnce(older.promise)
      .mockReturnValueOnce(newer.promise);
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    const getPlayer = renderWithPlayerCapture();
    let olderRequest!: Promise<void>;
    let newerRequest!: Promise<void>;

    act(() => {
      olderRequest = getPlayer().playTrack(0);
      newerRequest = getPlayer().playTrack(1);
    });

    expect(screen.getByTestId('title')).toHaveTextContent('第二首');
    expect(screen.getByTestId('playing')).toHaveTextContent('false');

    act(() => newer.resolve());
    await act(async () => newerRequest);
    expect(screen.getByTestId('playing')).toHaveTextContent('true');
    expect(screen.getByTestId('error')).toBeEmptyDOMElement();

    act(() => older.reject(new DOMException('superseded', 'AbortError')));
    await act(async () => olderRequest);
    expect(screen.getByTestId('title')).toHaveTextContent('第二首');
    expect(screen.getByTestId('playing')).toHaveTextContent('true');
    expect(screen.getByTestId('error')).toBeEmptyDOMElement();
  });

  it('rejects an empty queue with a developer-facing error', () => {
    expect(() => render(<PlayerProvider tracks={[]}>content</PlayerProvider>)).toThrow(
      'PlayerProvider requires a non-empty tracks array.',
    );
  });
});
