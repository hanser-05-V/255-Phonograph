import {randomUUID} from 'node:crypto';

import {afterEach, describe, expect, it} from 'vitest';

import type {SongDraftInput} from '../../shared/contracts.js';
import {
  createAuthenticatedTestContext,
  createTestContext,
  type AuthenticatedTestContext,
  type TestContext,
} from '../test/test-context.js';

function draftInput(overrides: Partial<SongDraftInput> = {}): SongDraftInput {
  return {
    title: '初光',
    artist: 'Hanser',
    lyricsText: '',
    categoryId: null,
    tagIds: [],
    versionNote: '',
    performanceDate: '',
    sourceUrl: '',
    isFeatured: false,
    isLiveCover: false,
    confirmDuplicate: false,
    confirmAudioReplacement: false,
    ...overrides,
  };
}

describe('admin song routes', () => {
  let context: TestContext | AuthenticatedTestContext | undefined;

  afterEach(async () => {
    await context?.dispose();
    context = undefined;
  });

  it('protects every song endpoint with the administrator session', async () => {
    context = await createTestContext();
    const requests = [
      {method: 'GET', url: '/api/admin/songs'},
      {method: 'POST', url: '/api/admin/songs', payload: draftInput()},
      {method: 'GET', url: '/api/admin/songs/song-1'},
      {method: 'PUT', url: '/api/admin/songs/song-1', payload: draftInput()},
      {method: 'POST', url: '/api/admin/songs/song-1/publish'},
      {method: 'POST', url: '/api/admin/songs/song-1/unpublish'},
      {method: 'POST', url: '/api/admin/songs/song-1/trash'},
      {method: 'POST', url: '/api/admin/songs/song-1/restore'},
      {method: 'DELETE', url: '/api/admin/songs/song-1', payload: {confirmSongId: 'song-1'}},
    ] as const;

    const responses = await Promise.all(
      requests.map((request) => context!.app.inject(request)),
    );
    expect(responses.map(({statusCode}) => statusCode))
      .toEqual(requests.map(() => 401));
  });

  it('creates, lists, reads and updates a draft through JSON interfaces', async () => {
    context = await createAuthenticatedTestContext();
    const created = await context.app.inject({
      method: 'POST',
      url: '/api/admin/songs',
      headers: {cookie: context.cookie},
      payload: draftInput({title: ' 草稿 '}),
    });

    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({title: '草稿', status: 'draft'});
    const {id} = created.json<{id: string}>();
    const listed = await context.app.inject({
      url: '/api/admin/songs?status=draft',
      headers: {cookie: context.cookie},
    });
    expect(listed.statusCode).toBe(200);
    expect(listed.json()).toEqual([created.json()]);

    const updated = await context.app.inject({
      method: 'PUT',
      url: `/api/admin/songs/${id}`,
      headers: {cookie: context.cookie},
      payload: draftInput({title: '完成编辑', versionNote: 'Live'}),
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json()).toMatchObject({id, title: '完成编辑', versionNote: 'Live'});
    const read = await context.app.inject({
      url: `/api/admin/songs/${id}`,
      headers: {cookie: context.cookie},
    });
    expect(read.json()).toEqual(updated.json());
  });

  it('rejects malformed bodies, unknown status filters and duplicate songs with stable errors', async () => {
    context = await createAuthenticatedTestContext();
    const missing = await context.app.inject({
      method: 'POST',
      url: '/api/admin/songs',
      headers: {cookie: context.cookie},
      payload: {title: '不完整'},
    });
    const extra = await context.app.inject({
      method: 'POST',
      url: '/api/admin/songs',
      headers: {cookie: context.cookie},
      payload: {...draftInput(), hidden: true},
    });
    const invalidStatus = await context.app.inject({
      url: '/api/admin/songs?status=deleted',
      headers: {cookie: context.cookie},
    });
    const first = await context.app.inject({
      method: 'POST',
      url: '/api/admin/songs',
      headers: {cookie: context.cookie},
      payload: draftInput(),
    });
    const duplicate = await context.app.inject({
      method: 'POST',
      url: '/api/admin/songs',
      headers: {cookie: context.cookie},
      payload: draftInput(),
    });

    expect(missing.statusCode).toBe(400);
    expect(extra.statusCode).toBe(400);
    expect(invalidStatus.statusCode).toBe(400);
    expect(first.statusCode).toBe(201);
    expect(duplicate.statusCode).toBe(409);
    expect(duplicate.json()).toMatchObject({
      error: {code: 'DUPLICATE_CONFIRMATION_REQUIRED'},
    });
  });

  it('publishes, unpublishes, trashes, restores and permanently deletes only with confirmation', async () => {
    context = await createAuthenticatedTestContext();
    const mediaId = randomUUID();
    const songId = randomUUID();
    const {temporaryKey} = await context.mediaStore.createTemporary('audio');
    await context.mediaStore.writeTemporary(
      temporaryKey,
      (async function* () { yield Buffer.from('audio'); })(),
      {},
    );
    const stored = await context.mediaStore.promote(temporaryKey);
    const timestamp = '2026-09-04T00:00:00.000Z';
    context.db.prepare(`
      INSERT INTO media_objects (
        id, kind, storage_key, original_name, mime_type, byte_size, created_at
      ) VALUES (?, 'audio', ?, 'song.mp3', 'audio/mpeg', ?, ?)
    `).run(mediaId, stored.storageKey, stored.byteSize, timestamp);
    context.db.prepare(`
      INSERT INTO songs (
        id, title, artist, status, duration_seconds, audio_media_id,
        created_at, updated_at
      ) VALUES (?, '完整歌曲', 'Hanser', 'draft', 120, ?, ?, ?)
    `).run(songId, mediaId, timestamp, timestamp);
    const action = (name: string) => context!.app.inject({
      method: 'POST',
      url: `/api/admin/songs/${songId}/${name}`,
      headers: {cookie: (context as AuthenticatedTestContext).cookie},
    });
    expect((await action('publish')).statusCode).toBe(200);
    expect((await action('unpublish')).statusCode).toBe(200);
    expect((await action('trash')).statusCode).toBe(200);
    expect((await action('restore')).json()).toMatchObject({status: 'unlisted'});
    await action('trash');

    const wrong = await context.app.inject({
      method: 'DELETE',
      url: `/api/admin/songs/${songId}`,
      headers: {cookie: context.cookie},
      payload: {confirmSongId: 'wrong'},
    });
    const deleted = await context.app.inject({
      method: 'DELETE',
      url: `/api/admin/songs/${songId}`,
      headers: {cookie: context.cookie},
      payload: {confirmSongId: songId},
    });

    expect(wrong.statusCode).toBe(409);
    expect(deleted.statusCode).toBe(204);
    const missing = await context.app.inject({
      url: `/api/admin/songs/${songId}`,
      headers: {cookie: context.cookie},
    });
    expect(missing.statusCode).toBe(404);
  });

  it('rejects undeclared JSON bodies on lifecycle actions without changing state', async () => {
    context = await createAuthenticatedTestContext();
    const timestamp = '2026-09-04T00:00:00.000Z';
    context.db.prepare(`
      INSERT INTO songs (id, title, artist, status, created_at, updated_at)
      VALUES ('draft-with-body', '草稿', 'Hanser', 'draft', ?, ?)
    `).run(timestamp, timestamp);

    const response = await context.app.inject({
      method: 'POST',
      url: '/api/admin/songs/draft-with-body/publish',
      headers: {cookie: context.cookie},
      payload: {unexpected: true},
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({error: {code: 'INVALID_SONG_INPUT'}});
    expect(context.db.prepare(`
      SELECT status FROM songs WHERE id = 'draft-with-body'
    `).get()).toEqual({status: 'draft'});
  });
});
