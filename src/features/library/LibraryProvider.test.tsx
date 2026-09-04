import {act, cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import type {LibraryResponse} from '../../../shared/contracts';
import {ApiError} from '../../api/http';
import {fetchLibrary} from '../../api/library-api';
import {LibraryProvider, useLibrary} from './LibraryProvider';

vi.mock('../../api/library-api', () => ({
  fetchLibrary: vi.fn(),
}));

const fetchLibraryMock = vi.mocked(fetchLibrary);

const emptyLibrary: LibraryResponse = {
  songs: [],
  categories: [],
  tags: [],
  sections: {recent: [], featured: [], liveCovers: []},
};

function libraryWithSong(id: string, title: string): LibraryResponse {
  return {
    ...emptyLibrary,
    songs: [{
      id,
      title,
      artist: 'Hanser',
      durationSeconds: 120,
      audioUrl: `/api/media/${id}`,
      category: null,
      tags: [],
      isFeatured: false,
      isLiveCover: false,
      publishedAt: '2026-09-03T12:00:00.000Z',
    }],
  };
}

function LibraryReader() {
  const {error, library, refresh, status} = useLibrary();

  return (
    <>
      <output data-testid="library-status">{status}</output>
      <output data-testid="library-title">{library?.songs[0]?.title ?? ''}</output>
      <output data-testid="library-error">{error?.message ?? ''}</output>
      <button onClick={refresh} type="button">刷新</button>
    </>
  );
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return {promise, reject, resolve};
}

afterEach(() => {
  cleanup();
  fetchLibraryMock.mockReset();
});

describe('LibraryProvider', () => {
  it('starts loading and becomes ready when published songs arrive', async () => {
    const request = deferred<LibraryResponse>();
    fetchLibraryMock.mockReturnValue(request.promise);

    render(<LibraryProvider><LibraryReader /></LibraryProvider>);
    expect(screen.getByTestId('library-status')).toHaveTextContent('loading');

    await act(async () => request.resolve(libraryWithSong('first-light', '初光')));
    expect(screen.getByTestId('library-status')).toHaveTextContent('ready');
    expect(screen.getByTestId('library-title')).toHaveTextContent('初光');
  });

  it('distinguishes empty, unavailable, and server error states', async () => {
    const scenarios = [
      {result: emptyLibrary, status: 'empty', error: ''},
      {
        result: new ApiError(0, 'SERVICE_UNAVAILABLE', '本地服务未运行'),
        status: 'unavailable',
        error: '本地服务未运行',
      },
      {
        result: new ApiError(500, 'LIBRARY_FAILED', '曲库读取失败'),
        status: 'error',
        error: '曲库读取失败',
      },
    ] as const;

    for (const scenario of scenarios) {
      fetchLibraryMock.mockReset();
      if (scenario.result instanceof Error) {
        fetchLibraryMock.mockRejectedValueOnce(scenario.result);
      } else {
        fetchLibraryMock.mockResolvedValueOnce(scenario.result);
      }

      const view = render(<LibraryProvider><LibraryReader /></LibraryProvider>);
      await waitFor(() => {
        expect(screen.getByTestId('library-status')).toHaveTextContent(scenario.status);
      });
      expect(screen.getByTestId('library-error')).toHaveTextContent(scenario.error);
      view.unmount();
    }
  });

  it('keeps a stale request from replacing a newer refresh result', async () => {
    const first = deferred<LibraryResponse>();
    const second = deferred<LibraryResponse>();
    fetchLibraryMock
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    render(<LibraryProvider><LibraryReader /></LibraryProvider>);

    fireEvent.click(screen.getByRole('button', {name: '刷新'}));
    await act(async () => second.resolve(libraryWithSong('new', '新曲库')));
    expect(screen.getByTestId('library-title')).toHaveTextContent('新曲库');

    await act(async () => first.resolve(libraryWithSong('old', '旧曲库')));
    expect(screen.getByTestId('library-title')).toHaveTextContent('新曲库');
  });

  it('aborts the active request when its owner unmounts', () => {
    fetchLibraryMock.mockReturnValue(new Promise(() => undefined));
    const view = render(<LibraryProvider><LibraryReader /></LibraryProvider>);
    const signal = fetchLibraryMock.mock.calls[0][0];

    view.unmount();

    expect(signal.aborted).toBe(true);
  });
});
