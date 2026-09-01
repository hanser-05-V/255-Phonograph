import {cleanup, render, screen} from '@testing-library/react';
import {afterEach, expect, it, vi} from 'vitest';
import {useTrackLyrics} from './useTrackLyrics';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((fulfill) => {
    resolve = fulfill;
  });
  return {promise, resolve};
}

function LyricsHarness({lyricsUrl}: {lyricsUrl?: string}) {
  const lines = useTrackLyrics(lyricsUrl);

  return <div>{lines.map((line) => <span key={line.time}>{line.text}</span>)}</div>;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it('fetches and parses the current lyrics URL', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    text: () => Promise.resolve('[00:03.00]开启旅程\n[00:01.00]守候日落'),
  }));

  render(<LyricsHarness lyricsUrl="/track.lrc" />);

  expect(await screen.findByText('守候日落')).toBeInTheDocument();
  expect(screen.getByText('开启旅程')).toBeInTheDocument();
  expect(fetch).toHaveBeenCalledWith('/track.lrc', expect.objectContaining({signal: expect.any(AbortSignal)}));
});

it('clears stale lines and ignores an obsolete lyrics request', async () => {
  const first = deferred<{ok: boolean; text: () => Promise<string>}>();
  const second = deferred<{ok: boolean; text: () => Promise<string>}>();
  const fetchMock = vi.fn()
    .mockReturnValueOnce(first.promise)
    .mockReturnValueOnce(second.promise);
  vi.stubGlobal('fetch', fetchMock);

  const {rerender} = render(<LyricsHarness lyricsUrl="/first.lrc" />);
  first.resolve({ok: true, text: () => Promise.resolve('[00:01.00]旧歌词')});
  expect(await screen.findByText('旧歌词')).toBeInTheDocument();

  rerender(<LyricsHarness lyricsUrl="/second.lrc" />);
  expect(screen.queryByText('旧歌词')).not.toBeInTheDocument();
  expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true);

  second.resolve({ok: true, text: () => Promise.resolve('[00:02.00]新歌词')});
  expect(await screen.findByText('新歌词')).toBeInTheDocument();
});
