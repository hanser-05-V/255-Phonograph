import {createHash, randomUUID} from 'node:crypto';
import {mkdtemp, readdir, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import type {DatabaseSync} from 'node:sqlite';

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import type {SongDraftInput} from '../../shared/contracts.js';
import {openDatabase} from '../db/database.js';
import {runMigrations} from '../db/migrate.js';
import {LocalMediaStore} from '../storage/local-media-store.js';
import {SongService} from './song-service.js';

const SESSION = 'admin-session';
const CREATED = new Date('2026-09-04T01:00:00.000Z');
const REPUBLISHED = new Date('2026-09-04T03:00:00.000Z');

function digest(token: string): string {
  return createHash('sha256').update(token).digest('base64url');
}

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

async function* mediaBytes(): AsyncIterable<Uint8Array> {
  yield Buffer.from([0xff, 0xfb, 0x90, 0x64, 0, 0, 0, 0]);
}

describe('SongService', () => {
  let dataDir: string;
  let db: DatabaseSync;
  let mediaStore: LocalMediaStore;
  let now: Date;
  let service: SongService;

  beforeEach(async () => {
    dataDir = await mkdtemp(path.join(tmpdir(), 'song-service-'));
    db = openDatabase(':memory:');
    runMigrations(db);
    mediaStore = new LocalMediaStore(path.join(dataDir, 'media'));
    now = CREATED;
    service = new SongService(db, mediaStore, {
      now: () => now,
      generateId: randomUUID,
    });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    db.close();
    await rm(dataDir, {recursive: true, force: true});
  });

  async function pendingUpload(
    kind: 'audio' | 'cover',
    options: {durationSeconds?: number | null; owner?: string} = {},
  ): Promise<string> {
    const id = randomUUID();
    const {temporaryKey} = await mediaStore.createTemporary(kind);
    await mediaStore.writeTemporary(temporaryKey, mediaBytes(), {});
    db.prepare(`
      INSERT INTO pending_uploads (
        id, owner_session_digest, kind, temporary_key, original_name,
        mime_type, byte_size, duration_seconds, lrc_text, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 8, ?, NULL, ?)
    `).run(
      id,
      digest(options.owner ?? SESSION),
      kind,
      temporaryKey,
      kind === 'audio' ? 'song.mp3' : 'cover.png',
      kind === 'audio' ? 'audio/mpeg' : 'image/png',
      Object.hasOwn(options, 'durationSeconds')
        ? options.durationSeconds
        : (kind === 'audio' ? 120 : null),
      now.toISOString(),
    );
    return id;
  }

  async function seedDraft(overrides: Partial<SongDraftInput> = {}) {
    return service.createDraft(SESSION, draftInput(overrides));
  }

  async function seedPublishableDraft(overrides: Partial<SongDraftInput> = {}) {
    const audioUploadId = await pendingUpload('audio');
    return seedDraft({audioUploadId, ...overrides});
  }

  it('keeps incomplete media as a draft but rejects publication', async () => {
    const song = await service.createDraft(
      SESSION,
      draftInput({title: '未完成', artist: ''}),
    );

    expect(song.status).toBe('draft');
    await expect(service.publish(song.id)).rejects.toMatchObject({
      code: 'SONG_NOT_PUBLISHABLE',
      details: expect.arrayContaining(['artist', 'audio', 'duration']),
    });
  });

  it('requires confirmation only for an exact trimmed title and artist duplicate', async () => {
    await seedDraft();

    await expect(seedDraft()).rejects.toMatchObject({
      code: 'DUPLICATE_CONFIRMATION_REQUIRED',
    });
    await expect(seedDraft({confirmDuplicate: true})).resolves.toMatchObject({
      title: '初光',
    });
    await expect(seedDraft({artist: '另一位歌手'})).resolves.toMatchObject({
      artist: '另一位歌手',
    });
  });

  it('enforces the four-state lifecycle, stable ids and publication timestamps', async () => {
    const song = await seedPublishableDraft();
    const id = song.id;
    const published = await service.publish(id);

    expect(published).toMatchObject({id, status: 'published'});
    expect(published.publishedAt).toBe(CREATED.toISOString());
    await expect(service.moveToTrash(id)).rejects.toMatchObject({
      code: 'INVALID_SONG_TRANSITION',
    });
    expect((await service.unpublish(id)).status).toBe('unlisted');
    expect((await service.moveToTrash(id)).status).toBe('trashed');
    expect((await service.restore(id)).status).toBe('unlisted');
    now = REPUBLISHED;
    expect((await service.publish(id)).publishedAt).toBe(REPUBLISHED.toISOString());
    expect((await service.getAdmin(id)).id).toBe(id);
  });

  it('restores trashed drafts to drafts and lists by status', async () => {
    const draft = await seedDraft({title: '草稿'});

    expect((await service.moveToTrash(draft.id))).toMatchObject({
      status: 'trashed',
      statusBeforeTrash: 'draft',
    });
    expect((await service.restore(draft.id)).status).toBe('draft');
    expect(service.listAdmin('draft').map(({id}) => id)).toContain(draft.id);
    expect(service.listAdmin('trashed')).toEqual([]);
  });

  it('validates taxonomy and keeps all editable source fields', async () => {
    const timestamp = now.toISOString();
    db.prepare(`
      INSERT INTO categories (id, name, normalized_name, created_at, updated_at)
      VALUES ('category-live', '现场', '现场', ?, ?)
    `).run(timestamp, timestamp);
    db.prepare(`
      INSERT INTO tags (id, name, normalized_name, created_at, updated_at)
      VALUES ('tag-soft', '温柔', '温柔', ?, ?)
    `).run(timestamp, timestamp);

    const song = await seedDraft({
      categoryId: 'category-live',
      tagIds: ['tag-soft', 'tag-soft'],
      versionNote: 'Live',
      performanceDate: '2026-09-03',
      sourceUrl: 'https://example.com/source',
      isFeatured: true,
      isLiveCover: true,
    });

    expect(song).toMatchObject({
      categoryId: 'category-live',
      tagIds: ['tag-soft'],
      versionNote: 'Live',
      performanceDate: '2026-09-03',
      sourceUrl: 'https://example.com/source',
      isFeatured: true,
      isLiveCover: true,
    });
    await expect(seedDraft({title: '坏分类', categoryId: 'missing'}))
      .rejects.toMatchObject({code: 'INVALID_SONG_TAXONOMY'});
    await expect(seedDraft({title: '坏标签', tagIds: ['missing']}))
      .rejects.toMatchObject({code: 'INVALID_SONG_TAXONOMY'});
  });

  it('allows empty lyrics but blocks invalid LRC at publication', async () => {
    const noLyrics = await seedPublishableDraft({title: '无歌词'});
    await expect(service.publish(noLyrics.id)).resolves.toMatchObject({
      status: 'published',
    });
    const invalidLyrics = await seedPublishableDraft({
      title: '错误歌词',
      lyricsText: '[00:01.00]第一句\n坏标签',
    });

    await expect(service.publish(invalidLyrics.id)).rejects.toMatchObject({
      code: 'SONG_NOT_PUBLISHABLE',
      details: expect.arrayContaining(['lyrics']),
    });
  });

  it('revalidates promoted audio and cover metadata before publication', async () => {
    const audioUploadId = await pendingUpload('audio');
    const coverUploadId = await pendingUpload('cover');
    const song = await seedDraft({
      title: '媒体复验',
      audioUploadId,
      coverUploadId,
    });
    expect(song.cover).toMatchObject({
      originalName: 'cover.png',
      mimeType: 'image/png',
    });
    db.prepare(`
      UPDATE media_objects
      SET byte_size = CASE kind
        WHEN 'audio' THEN ?
        ELSE byte_size
      END,
      mime_type = CASE kind
        WHEN 'cover' THEN 'image/gif'
        ELSE mime_type
      END
    `).run(200 * 1024 * 1024 + 1);

    await expect(service.publish(song.id)).rejects.toMatchObject({
      code: 'SONG_NOT_PUBLISHABLE',
      details: expect.arrayContaining(['audio', 'cover']),
    });
  });

  it('edits published metadata without changing its time and confirms audio replacement', async () => {
    const song = await seedPublishableDraft();
    const published = await service.publish(song.id);
    now = REPUBLISHED;
    const edited = await service.update(
      SESSION,
      song.id,
      draftInput({title: '初光（修改）'}),
    );
    expect(edited).toMatchObject({
      id: song.id,
      status: 'published',
      publishedAt: published.publishedAt,
      title: '初光（修改）',
    });

    const replacement = await pendingUpload('audio', {durationSeconds: 240});
    await expect(service.update(
      SESSION,
      song.id,
      draftInput({title: '初光（修改）', audioUploadId: replacement}),
    )).rejects.toMatchObject({
      code: 'AUDIO_REPLACEMENT_CONFIRMATION_REQUIRED',
    });
    const replaced = await service.update(
      SESSION,
      song.id,
      draftInput({
        title: '初光（修改）',
        audioUploadId: replacement,
        confirmAudioReplacement: true,
      }),
    );
    expect(replaced).toMatchObject({id: song.id, durationSeconds: 240});
    expect(db.prepare('SELECT COUNT(*) AS count FROM pending_media_cleanup').get())
      .toEqual({count: 0});
  });

  it('does not let an edit make a published song unpublishable', async () => {
    const song = await seedPublishableDraft({title: '保持有效'});
    await service.publish(song.id);
    const replacement = await pendingUpload('audio', {durationSeconds: null});

    await expect(service.update(
      SESSION,
      song.id,
      draftInput({
        title: '',
        audioUploadId: replacement,
        lyricsText: '坏标签',
        confirmAudioReplacement: true,
      }),
    )).rejects.toMatchObject({
      code: 'SONG_NOT_PUBLISHABLE',
      details: expect.arrayContaining(['title', 'duration', 'lyrics']),
    });
    await expect(service.getAdmin(song.id)).resolves.toMatchObject({
      status: 'published',
      title: '保持有效',
      durationSeconds: 120,
    });
  });

  it('allows metadata edits for an already-published transition song with internal demo audio', async () => {
    const timestamp = now.toISOString();
    db.prepare(`
      INSERT INTO media_objects (
        id, kind, storage_key, original_name, mime_type, byte_size, created_at
      ) VALUES ('demo-media', 'audio', ?, 'first-light.wav', 'audio/wav', 100, ?)
    `).run(randomUUID(), timestamp);
    db.prepare(`
      INSERT INTO songs (
        id, title, artist, status, duration_seconds, audio_media_id,
        published_at, created_at, updated_at
      ) VALUES (
        'first-light', '初光', 'Hanser', 'published', 1, 'demo-media', ?, ?, ?
      )
    `).run(timestamp, timestamp, timestamp);

    await expect(service.update(
      SESSION,
      'first-light',
      draftInput({title: '初光（过渡版）'}),
    )).resolves.toMatchObject({
      id: 'first-light',
      title: '初光（过渡版）',
      status: 'published',
    });
  });

  it('rejects pending uploads owned by another administrator session', async () => {
    const audioUploadId = await pendingUpload('audio', {owner: 'another-session'});

    await expect(seedDraft({audioUploadId})).rejects.toMatchObject({
      code: 'PENDING_UPLOAD_NOT_FOUND',
    });
  });

  it('returns a stable domain error when the same upload token is submitted concurrently', async () => {
    const audioUploadId = await pendingUpload('audio');
    const attempts = await Promise.allSettled([
      seedDraft({title: '竞争一', audioUploadId}),
      seedDraft({title: '竞争二', audioUploadId}),
    ]);
    const rejected = attempts.find((result) => result.status === 'rejected');

    expect(attempts.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(rejected).toMatchObject({
      status: 'rejected',
      reason: {code: 'PENDING_UPLOAD_NOT_FOUND'},
    });
  });

  it('validates every requested upload before promoting any of them', async () => {
    const audioUploadId = await pendingUpload('audio');
    const coverUploadId = await pendingUpload('cover', {owner: 'another-session'});

    await expect(seedDraft({audioUploadId, coverUploadId}))
      .rejects.toMatchObject({code: 'PENDING_UPLOAD_NOT_FOUND'});
    expect(db.prepare('SELECT COUNT(*) AS count FROM pending_uploads').get())
      .toEqual({count: 2});
    expect(await readdir(path.join(dataDir, 'media', 'tmp'))).toHaveLength(2);
  });

  it('removes consumed upload rows and promoted files when the song transaction fails', async () => {
    const audioUploadId = await pendingUpload('audio');
    db.exec(`
      CREATE TRIGGER reject_song_insert
      BEFORE INSERT ON songs
      BEGIN
        SELECT RAISE(ABORT, 'reject song insert');
      END;
    `);

    await expect(seedDraft({audioUploadId})).rejects.toThrowError('reject song insert');
    expect(db.prepare('SELECT COUNT(*) AS count FROM songs').get()).toEqual({count: 0});
    expect(db.prepare('SELECT COUNT(*) AS count FROM media_objects').get())
      .toEqual({count: 0});
    expect(db.prepare('SELECT COUNT(*) AS count FROM pending_uploads').get())
      .toEqual({count: 0});
    expect(await readdir(path.join(dataDir, 'media', 'objects'))).toEqual([]);
  });

  it('queues promoted media when both the song transaction and compensation delete fail', async () => {
    const audioUploadId = await pendingUpload('audio');
    db.exec(`
      CREATE TRIGGER reject_song_insert_with_cleanup
      BEFORE INSERT ON songs
      BEGIN
        SELECT RAISE(ABORT, 'reject with cleanup');
      END;
    `);
    vi.spyOn(mediaStore, 'delete').mockRejectedValueOnce(new Error('locked'));

    await expect(seedDraft({audioUploadId})).rejects.toThrowError('reject with cleanup');
    expect(db.prepare('SELECT COUNT(*) AS count FROM songs').get()).toEqual({count: 0});
    expect(db.prepare('SELECT COUNT(*) AS count FROM pending_uploads').get())
      .toEqual({count: 0});
    expect(db.prepare(`
      SELECT reason, attempts
      FROM pending_media_cleanup
    `).get()).toEqual({reason: 'song-save-rollback', attempts: 0});
  });

  it('uses a compare-and-swap update so concurrent replacements cannot orphan media', async () => {
    const song = await seedPublishableDraft({title: '并发替换'});
    const firstUpload = await pendingUpload('audio', {durationSeconds: 180});
    const secondUpload = await pendingUpload('audio', {durationSeconds: 240});
    const replace = (audioUploadId: string) => service.update(
      SESSION,
      song.id,
      draftInput({
        title: '并发替换',
        audioUploadId,
        confirmAudioReplacement: true,
      }),
    );

    const attempts = await Promise.allSettled([
      replace(firstUpload),
      replace(secondUpload),
    ]);

    expect(attempts.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(attempts.find((result) => result.status === 'rejected')).toMatchObject({
      status: 'rejected',
      reason: {code: 'SONG_CONCURRENT_MODIFICATION'},
    });
    expect(db.prepare('SELECT COUNT(*) AS count FROM media_objects').get())
      .toEqual({count: 1});
    expect(await readdir(path.join(dataDir, 'media', 'objects'))).toHaveLength(1);
  });

  it('deletes the trashed record first and queues failed media cleanup', async () => {
    const song = await seedPublishableDraft({title: '待删除'});
    await service.moveToTrash(song.id);
    vi.spyOn(mediaStore, 'delete').mockRejectedValueOnce(new Error('locked'));

    await service.permanentlyDelete(song.id, {confirmSongId: song.id});

    await expect(service.getAdmin(song.id)).rejects.toMatchObject({code: 'NOT_FOUND'});
    expect(db.prepare(`
      SELECT reason, attempts
      FROM pending_media_cleanup
    `).all()).toEqual([
      expect.objectContaining({reason: 'song-permanent-delete', attempts: 1}),
    ]);
  });

  it('requires trash status and an exact stable-id confirmation for permanent deletion', async () => {
    const song = await seedDraft({title: '保留'});

    await expect(service.permanentlyDelete(song.id, {confirmSongId: song.id}))
      .rejects.toMatchObject({code: 'INVALID_SONG_TRANSITION'});
    await service.moveToTrash(song.id);
    await expect(service.permanentlyDelete(song.id, {confirmSongId: 'wrong'}))
      .rejects.toMatchObject({code: 'PERMANENT_DELETE_CONFIRMATION_REQUIRED'});
    await expect(service.permanentlyDelete(song.id, {}))
      .rejects.toMatchObject({code: 'PERMANENT_DELETE_CONFIRMATION_REQUIRED'});
  });

  it.each([
    ['draft', 'unpublish'],
    ['draft', 'restore'],
    ['published', 'publish'],
    ['published', 'trash'],
    ['published', 'restore'],
    ['unlisted', 'unpublish'],
    ['unlisted', 'restore'],
    ['trashed', 'publish'],
    ['trashed', 'unpublish'],
    ['trashed', 'trash'],
  ] as const)('rejects %s to %s outside the explicit state table', async (status, action) => {
    const title = `${status}-${action}`;
    const song = status === 'draft' || status === 'trashed'
      ? await seedDraft({title})
      : await seedPublishableDraft({title});
    if (status === 'published' || status === 'unlisted') {
      await service.publish(song.id);
    }
    if (status === 'unlisted') {
      await service.unpublish(song.id);
    }
    if (status === 'trashed') {
      await service.moveToTrash(song.id);
    }
    const operation = {
      publish: () => service.publish(song.id),
      unpublish: () => service.unpublish(song.id),
      trash: () => service.moveToTrash(song.id),
      restore: () => service.restore(song.id),
    }[action];

    await expect(operation()).rejects.toMatchObject({
      code: 'INVALID_SONG_TRANSITION',
    });
  });
});
