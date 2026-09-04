import {StrictMode} from 'react';
import {act, cleanup, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {PLAYER_SNAPSHOT_STORAGE_KEY} from './player-persistence';
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

const thirdTrack: Track = {
  id: 'third',
  title: '第三首',
  artist: '测试歌手',
  audioUrl: 'data:audio/wav;base64,UklGRgMA',
};

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
      <button onClick={() => void playTrack('second')}>播放第二首</button>
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

function renderDynamicPlayer(initialTracks: Track[]) {
  let player: PlayerContextValue | null = null;

  function Capture() {
    player = usePlayer();
    return null;
  }

  const view = render(
    <PlayerProvider tracks={initialTracks}>
      <Harness />
      <Capture />
    </PlayerProvider>,
  );

  return {
    getPlayer: () => {
      if (!player) {
        throw new Error('Expected the player context to be ready.');
      }
      return player;
    },
    rerender: (nextTracks: Track[]) => view.rerender(
      <PlayerProvider tracks={nextTracks}>
        <Harness />
        <Capture />
      </PlayerProvider>,
    ),
  };
}

describe('PlayerProvider', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
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
      successRequest = getPlayer().playTrack('first');
    });

    expect(screen.getByTestId('playing')).toHaveTextContent('false');
    act(() => success.resolve());
    await act(async () => successRequest);
    expect(screen.getByTestId('playing')).toHaveTextContent('true');
    expect(screen.getByTestId('error')).toBeEmptyDOMElement();

    await act(async () => getPlayer().toggle());
    let failureRequest!: Promise<void>;
    act(() => {
      failureRequest = getPlayer().playTrack('first');
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
      request = getPlayer().playTrack('second').then(() => {
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
      olderRequest = getPlayer().playTrack('first');
      newerRequest = getPlayer().playTrack('second');
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

  it('keeps the current stable song when the library order changes', async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    const {getPlayer, rerender} = renderDynamicPlayer(tracks);

    await act(() => getPlayer().playTrack('second'));
    const audio = getPlayer().audio;
    rerender([tracks[1], tracks[0]]);

    expect(getPlayer().currentTrack.id).toBe('second');
    expect(getPlayer().audio).toBe(audio);
  });

  it('uses and wraps a temporary stable-id queue, then restores the full queue', async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    const {getPlayer} = renderDynamicPlayer([...tracks, thirdTrack]);

    await act(() => getPlayer().playTrack('second', ['second', 'third']));
    expect(getPlayer().queueIds).toEqual(['second', 'third']);
    act(() => getPlayer().next());
    expect(getPlayer().currentTrack.id).toBe('third');
    act(() => getPlayer().audio?.dispatchEvent(new Event('ended')));
    expect(getPlayer().currentTrack.id).toBe('second');

    await act(() => getPlayer().playTrack('first'));
    expect(getPlayer().queueIds).toEqual(['first', 'second', 'third']);
    act(() => getPlayer().next());
    expect(getPlayer().currentTrack.id).toBe('second');
  });

  it('restores track, time, volume and queue but never autoplays after reload', () => {
    localStorage.setItem('255-phonograph:player:v2', JSON.stringify({
      version: 2,
      currentTrackId: 'second',
      currentTime: 31,
      volume: 0.4,
      isMuted: true,
      queueIds: ['second', 'first'],
    }));
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    const {getPlayer} = renderDynamicPlayer(tracks);
    const audio = getPlayer().audio;

    expect(audio).not.toBeNull();
    act(() => audio?.dispatchEvent(new Event('loadedmetadata')));

    expect(getPlayer().currentTrack.id).toBe('second');
    expect(audio?.currentTime).toBe(31);
    expect(getPlayer().volume).toBe(0.4);
    expect(getPlayer().isMuted).toBe(true);
    expect(getPlayer().queueIds).toEqual(['second', 'first']);
    expect(getPlayer().isPlaying).toBe(false);
    expect(play).not.toHaveBeenCalled();
    expect(pause).toHaveBeenCalled();

    act(() => getPlayer().seek(9));
    act(() => audio?.dispatchEvent(new Event('loadedmetadata')));
    expect(audio?.currentTime).toBe(9);
  });

  it('does not overwrite an explicit seek with pending restored progress', () => {
    localStorage.setItem(PLAYER_SNAPSHOT_STORAGE_KEY, JSON.stringify({
      version: 2,
      currentTrackId: 'second',
      currentTime: 31,
      volume: 0.4,
      isMuted: false,
      queueIds: ['second', 'first'],
    }));
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    const {getPlayer} = renderDynamicPlayer(tracks);
    const audio = getPlayer().audio;

    act(() => getPlayer().seek(7));
    act(() => audio?.dispatchEvent(new Event('loadedmetadata')));

    expect(audio?.currentTime).toBe(7);
    expect(getPlayer().currentTime).toBe(7);
  });

  it('keeps pending restored progress when the page hides before metadata loads', () => {
    localStorage.setItem(PLAYER_SNAPSHOT_STORAGE_KEY, JSON.stringify({
      version: 2,
      currentTrackId: 'second',
      currentTime: 31,
      volume: 0.4,
      isMuted: false,
      queueIds: ['second', 'first'],
    }));
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    const {getPlayer} = renderDynamicPlayer(tracks);
    const audio = getPlayer().audio;

    act(() => window.dispatchEvent(new Event('pagehide')));
    const saved = JSON.parse(localStorage.getItem(PLAYER_SNAPSHOT_STORAGE_KEY) ?? 'null');
    expect(saved.currentTime).toBe(31);

    act(() => audio?.dispatchEvent(new Event('loadedmetadata')));
    expect(audio?.currentTime).toBe(31);
  });

  it('does not erase pending restored progress during StrictMode effect cleanup', () => {
    localStorage.setItem(PLAYER_SNAPSHOT_STORAGE_KEY, JSON.stringify({
      version: 2,
      currentTrackId: 'second',
      currentTime: 31,
      volume: 0.4,
      isMuted: false,
      queueIds: ['second', 'first'],
    }));
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    let audio: HTMLAudioElement | null = null;

    function CaptureAudio() {
      audio = usePlayer().audio;
      return null;
    }

    render(
      <StrictMode>
        <PlayerProvider tracks={tracks}>
          <CaptureAudio />
        </PlayerProvider>
      </StrictMode>,
    );

    const getAudio = (): HTMLAudioElement | null => audio;
    const saved = JSON.parse(localStorage.getItem(PLAYER_SNAPSHOT_STORAGE_KEY) ?? 'null');
    expect(saved.currentTime).toBe(31);
    act(() => getAudio()?.dispatchEvent(new Event('loadedmetadata')));
    expect(getAudio()?.currentTime).toBe(31);
  });

  it('pauses and safely falls back when the current stable id disappears', async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    const {getPlayer, rerender} = renderDynamicPlayer([...tracks, thirdTrack]);

    await act(() => getPlayer().playTrack('second', ['second', 'third']));
    act(() => getPlayer().seek(18));
    pause.mockClear();
    rerender([tracks[0], thirdTrack]);

    expect(getPlayer().currentTrack.id).toBe('first');
    expect(getPlayer().currentTime).toBe(0);
    expect(getPlayer().queueIds).toEqual(['first', 'third']);
    expect(getPlayer().isPlaying).toBe(false);
    expect(pause).toHaveBeenCalledOnce();
  });

  it('keeps the loaded source through metadata updates until the next active play', async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    const {getPlayer, rerender} = renderDynamicPlayer(tracks);
    const audio = getPlayer().audio;
    const loadedUrl = audio?.src;
    const updatedFirst = {
      ...tracks[0],
      title: '第一首（新标题）',
      audioUrl: 'data:audio/wav;base64,TkVX',
    };

    rerender([updatedFirst, tracks[1]]);
    expect(getPlayer().currentTrack.title).toBe('第一首（新标题）');
    expect(audio?.src).toBe(loadedUrl);

    await act(() => getPlayer().playTrack('first'));
    expect(audio?.src).toBe(updatedFirst.audioUrl);
  });

  it('persists stable playback state changes without persisting playing intent', async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    const {getPlayer} = renderDynamicPlayer(tracks);

    await act(() => getPlayer().playTrack('second', ['second', 'first']));
    act(() => {
      const audio = getPlayer().audio;
      if (!audio) {
        throw new Error('Expected the player audio to be ready.');
      }
      audio.currentTime = 22.5;
      audio.dispatchEvent(new Event('timeupdate'));
      getPlayer().setVolume(0.25);
      getPlayer().toggleMuted();
    });

    const saved = JSON.parse(localStorage.getItem(PLAYER_SNAPSHOT_STORAGE_KEY) ?? 'null');
    expect(saved).toEqual({
      version: 2,
      currentTrackId: 'second',
      currentTime: 22.5,
      volume: 0.25,
      isMuted: true,
      queueIds: ['second', 'first'],
    });
    expect(saved).not.toHaveProperty('isPlaying');
  });

  it('limits progress writes and flushes the latest time when playback pauses', () => {
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    const write = vi.spyOn(Storage.prototype, 'setItem');
    const {getPlayer} = renderDynamicPlayer(tracks);
    const audio = getPlayer().audio;
    write.mockClear();

    act(() => {
      if (audio) audio.currentTime = 1;
      audio?.dispatchEvent(new Event('timeupdate'));
    });
    act(() => {
      if (audio) audio.currentTime = 2;
      audio?.dispatchEvent(new Event('timeupdate'));
    });

    expect(write).toHaveBeenCalledOnce();
    act(() => audio?.dispatchEvent(new Event('pause')));
    const saved = JSON.parse(localStorage.getItem(PLAYER_SNAPSHOT_STORAGE_KEY) ?? 'null');
    expect(saved.currentTime).toBe(2);
  });

  it('limits rapid seek writes and flushes the final seek position', () => {
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    vi.spyOn(Date, 'now').mockReturnValue(1_000);
    const write = vi.spyOn(Storage.prototype, 'setItem');
    const {getPlayer} = renderDynamicPlayer(tracks);
    write.mockClear();

    act(() => getPlayer().seek(4));
    act(() => getPlayer().seek(8));

    expect(write).toHaveBeenCalledOnce();
    act(() => getPlayer().audio?.dispatchEvent(new Event('pause')));
    const saved = JSON.parse(localStorage.getItem(PLAYER_SNAPSHOT_STORAGE_KEY) ?? 'null');
    expect(saved.currentTime).toBe(8);
  });
});
