import {afterEach, describe, expect, it, vi} from 'vitest';
import type {SongDraftInput} from '../../shared/contracts';
import {adminApi} from './admin-api';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {'Content-Type': 'application/json'},
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('adminApi', () => {
  it('uses the same-origin session for every authentication request', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({needsSetup: false, authenticated: false}))
      .mockResolvedValueOnce(jsonResponse({authenticated: true}, 201))
      .mockResolvedValueOnce(jsonResponse({authenticated: true}))
      .mockResolvedValueOnce(new Response(null, {status: 204}))
      .mockResolvedValueOnce(jsonResponse({authenticated: true}));
    vi.stubGlobal('fetch', fetchMock);

    await adminApi.getAuthStatus();
    await adminApi.setup('owner-password');
    await adminApi.login('owner-password');
    await adminApi.logout();
    await adminApi.changePassword('owner-password', 'new-owner-password');

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/admin/auth/status', {
      credentials: 'same-origin',
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/admin/auth/setup', {
      body: JSON.stringify({password: 'owner-password'}),
      credentials: 'same-origin',
      headers: {'Content-Type': 'application/json'},
      method: 'POST',
    });
    expect(fetchMock).toHaveBeenNthCalledWith(3, '/api/admin/auth/login', {
      body: JSON.stringify({password: 'owner-password'}),
      credentials: 'same-origin',
      headers: {'Content-Type': 'application/json'},
      method: 'POST',
    });
    expect(fetchMock).toHaveBeenNthCalledWith(4, '/api/admin/auth/logout', {
      credentials: 'same-origin',
      method: 'POST',
    });
    expect(fetchMock).toHaveBeenNthCalledWith(5, '/api/admin/auth/password', {
      body: JSON.stringify({
        currentPassword: 'owner-password',
        newPassword: 'new-owner-password',
      }),
      credentials: 'same-origin',
      headers: {'Content-Type': 'application/json'},
      method: 'POST',
    });
  });

  it('passes an abort signal to the status request owner', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({needsSetup: true, authenticated: false}),
    );
    vi.stubGlobal('fetch', fetchMock);
    const controller = new AbortController();

    await adminApi.getAuthStatus(controller.signal);

    expect(fetchMock).toHaveBeenCalledWith('/api/admin/auth/status', {
      credentials: 'same-origin',
      signal: controller.signal,
    });
  });

  it('uses named taxonomy methods and reads the protected settings display', async () => {
    const item = {
      id: 'cat-1',
      name: '现场',
      createdAt: '2026-09-03T00:00:00.000Z',
      updatedAt: '2026-09-03T00:00:00.000Z',
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse([item]))
      .mockResolvedValueOnce(jsonResponse(item, 201))
      .mockResolvedValueOnce(jsonResponse(item))
      .mockResolvedValueOnce(new Response(null, {status: 204}))
      .mockResolvedValueOnce(jsonResponse([item]))
      .mockResolvedValueOnce(jsonResponse(item, 201))
      .mockResolvedValueOnce(jsonResponse(item))
      .mockResolvedValueOnce(new Response(null, {status: 204}))
      .mockResolvedValueOnce(jsonResponse({dataDirectoryDisplay: 'D:\\music-data'}));
    vi.stubGlobal('fetch', fetchMock);

    await adminApi.listCategories();
    await adminApi.createCategory({name: '现场'});
    await adminApi.renameCategory('cat-1', {name: '音乐会'});
    await adminApi.deleteCategory('cat-1');
    await adminApi.listTags();
    await adminApi.createTag({name: '温柔'});
    await adminApi.renameTag('tag-1', {name: '治愈'});
    await adminApi.deleteTag('tag-1');
    await adminApi.getSettings();

    expect(fetchMock.mock.calls).toEqual([
      ['/api/admin/categories', {credentials: 'same-origin'}],
      ['/api/admin/categories', {
        body: JSON.stringify({name: '现场'}),
        credentials: 'same-origin',
        headers: {'Content-Type': 'application/json'},
        method: 'POST',
      }],
      ['/api/admin/categories/cat-1', {
        body: JSON.stringify({name: '音乐会'}),
        credentials: 'same-origin',
        headers: {'Content-Type': 'application/json'},
        method: 'PATCH',
      }],
      ['/api/admin/categories/cat-1', {
        credentials: 'same-origin',
        method: 'DELETE',
      }],
      ['/api/admin/tags', {credentials: 'same-origin'}],
      ['/api/admin/tags', {
        body: JSON.stringify({name: '温柔'}),
        credentials: 'same-origin',
        headers: {'Content-Type': 'application/json'},
        method: 'POST',
      }],
      ['/api/admin/tags/tag-1', {
        body: JSON.stringify({name: '治愈'}),
        credentials: 'same-origin',
        headers: {'Content-Type': 'application/json'},
        method: 'PATCH',
      }],
      ['/api/admin/tags/tag-1', {
        credentials: 'same-origin',
        method: 'DELETE',
      }],
      ['/api/admin/settings', {credentials: 'same-origin'}],
    ]);
  });

  it('maps song reads, saves, lifecycle actions, deletion, and upload cancellation', async () => {
    const song = {id: 'song 255', status: 'draft'};
    const input: SongDraftInput = {
      title: '初光', artist: 'Hanser', lyricsText: '', categoryId: null,
      tagIds: [], versionNote: '', performanceDate: '', sourceUrl: '',
      isFeatured: false, isLiveCover: false, confirmDuplicate: false,
      confirmAudioReplacement: false,
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse([song]))
      .mockResolvedValueOnce(jsonResponse(song))
      .mockResolvedValueOnce(jsonResponse(song, 201))
      .mockResolvedValueOnce(jsonResponse(song))
      .mockResolvedValueOnce(jsonResponse(song))
      .mockResolvedValueOnce(jsonResponse(song))
      .mockResolvedValueOnce(jsonResponse(song))
      .mockResolvedValueOnce(jsonResponse(song))
      .mockResolvedValueOnce(new Response(null, {status: 204}))
      .mockResolvedValueOnce(new Response(null, {status: 204}));
    vi.stubGlobal('fetch', fetchMock);

    await adminApi.listSongs('draft');
    await adminApi.getSong('song 255');
    await adminApi.saveSong(undefined, input);
    await adminApi.saveSong('song 255', input);
    await adminApi.publishSong('song 255');
    await adminApi.unpublishSong('song 255');
    await adminApi.trashSong('song 255');
    await adminApi.restoreSong('song 255');
    await adminApi.permanentlyDeleteSong('song 255', 'song 255');
    await adminApi.cancelUpload('upload 1');

    expect(fetchMock.mock.calls).toEqual([
      ['/api/admin/songs?status=draft', {credentials: 'same-origin'}],
      ['/api/admin/songs/song%20255', {credentials: 'same-origin'}],
      ['/api/admin/songs', expect.objectContaining({method: 'POST', body: JSON.stringify(input)})],
      ['/api/admin/songs/song%20255', expect.objectContaining({method: 'PUT', body: JSON.stringify(input)})],
      ['/api/admin/songs/song%20255/publish', expect.objectContaining({method: 'POST'})],
      ['/api/admin/songs/song%20255/unpublish', expect.objectContaining({method: 'POST'})],
      ['/api/admin/songs/song%20255/trash', expect.objectContaining({method: 'POST'})],
      ['/api/admin/songs/song%20255/restore', expect.objectContaining({method: 'POST'})],
      ['/api/admin/songs/song%20255', expect.objectContaining({
        method: 'DELETE', body: JSON.stringify({confirmSongId: 'song 255'}),
      })],
      ['/api/admin/uploads/upload%201', {credentials: 'same-origin', method: 'DELETE'}],
    ]);
  });
});
