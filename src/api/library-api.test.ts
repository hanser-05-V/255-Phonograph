import {afterEach, describe, expect, it, vi} from 'vitest';
import type {LibraryResponse} from '../../shared/contracts';
import {fetchLibrary} from './library-api';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchLibrary', () => {
  it('loads the public library through the cancellable endpoint', async () => {
    const library: LibraryResponse = {
      songs: [],
      categories: [],
      tags: [],
      sections: {recent: [], featured: [], liveCovers: []},
    };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(library), {
      status: 200,
      headers: {'Content-Type': 'application/json; charset=utf-8'},
    }));
    vi.stubGlobal('fetch', fetchMock);
    const controller = new AbortController();

    await expect(fetchLibrary(controller.signal)).resolves.toEqual(library);
    expect(fetchMock).toHaveBeenCalledWith('/api/library', {signal: controller.signal});
  });
});
