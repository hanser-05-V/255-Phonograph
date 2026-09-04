import {createHash, randomUUID} from 'node:crypto';
import {mkdtemp, readdir, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import type {DatabaseSync} from 'node:sqlite';

import {afterEach, beforeEach, describe, expect, it} from 'vitest';

import {openDatabase} from '../db/database.js';
import {runMigrations} from '../db/migrate.js';
import {LocalMediaStore} from '../storage/local-media-store.js';
import type {MediaStore} from '../storage/media-store.js';
import {UploadService} from './upload-service.js';

async function* chunks(...values: Array<string | Uint8Array>): AsyncIterable<Uint8Array> {
  for (const value of values) {
    yield typeof value === 'string' ? Buffer.from(value) : value;
  }
}

function digest(token: string): string {
  return createHash('sha256').update(token).digest('base64url');
}

describe('UploadService', () => {
  let dataDirectory: string;
  let mediaDirectory: string;
  let db: DatabaseSync;
  let mediaStore: MediaStore;

  beforeEach(async () => {
    dataDirectory = await mkdtemp(path.join(tmpdir(), 'upload-service-'));
    mediaDirectory = path.join(dataDirectory, 'media');
    db = openDatabase(path.join(dataDirectory, 'library.sqlite'));
    runMigrations(db);
    mediaStore = new LocalMediaStore(mediaDirectory);
  });

  afterEach(async () => {
    db.close();
    await rm(dataDirectory, {recursive: true, force: true});
  });

  function createService(overrides: {
    detected?: {ext: string; mime: string} | undefined;
    duration?: number | null;
    generateUploadId?: () => string;
  } = {}) {
    return new UploadService(db, mediaStore, mediaDirectory, {
      detectFileType: async () =>
        Object.hasOwn(overrides, 'detected')
          ? overrides.detected
          : {ext: 'mp3', mime: 'audio/mpeg'},
      probeAudioDuration: async () => overrides.duration ?? null,
      generateUploadId: overrides.generateUploadId ?? randomUUID,
      now: () => new Date('2026-09-04T00:00:00.000Z'),
    });
  }

  async function listTemporary(): Promise<string[]> {
    try {
      return (await readdir(path.join(mediaDirectory, 'tmp'))).sort();
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  it('keeps an audio upload as a session-owned draft candidate when duration is unknown', async () => {
    const progress: number[] = [];
    const service = createService({duration: null});

    const result = await service.ingestAudio('session-a', {
      originalName: 'song.mp3',
      declaredMime: 'audio/mpeg',
      source: chunks('abc', 'def'),
      onProgress: (bytes) => progress.push(bytes),
    });

    expect(result).toMatchObject({
      originalName: 'song.mp3',
      mimeType: 'audio/mpeg',
      byteSize: 6,
      durationSeconds: null,
    });
    expect(progress).toEqual([3, 6]);
    expect(
      db.prepare(`
        SELECT owner_session_digest, kind, temporary_key, original_name,
               mime_type, byte_size, duration_seconds, created_at
        FROM pending_uploads
        WHERE id = ?
      `).get(result.uploadId),
    ).toEqual({
      owner_session_digest: digest('session-a'),
      kind: 'audio',
      temporary_key: (await listTemporary())[0],
      original_name: 'song.mp3',
      mime_type: 'audio/mpeg',
      byte_size: 6,
      duration_seconds: null,
      created_at: '2026-09-04T00:00:00.000Z',
    });
    expect(db.prepare('SELECT COUNT(*) AS count FROM songs').get()).toEqual({count: 0});
    expect(db.prepare('SELECT COUNT(*) AS count FROM media_objects').get()).toEqual({count: 0});
  });

  it('removes only the current temporary file when the client aborts', async () => {
    const service = createService();
    const controller = new AbortController();

    async function* abortingSource(): AsyncIterable<Uint8Array> {
      yield Buffer.from('partial');
      controller.abort();
      yield Buffer.from('ignored');
    }

    await expect(
      service.ingestAudio('session-a', {
        originalName: 'song.mp3',
        declaredMime: 'audio/mpeg',
        source: abortingSource(),
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({name: 'AbortError'});
    expect(await listTemporary()).toEqual([]);
    expect(db.prepare('SELECT COUNT(*) AS count FROM pending_uploads').get()).toEqual({count: 0});
  });

  it('deletes temporary bytes when detected content does not match the declaration', async () => {
    const service = createService({detected: {ext: 'png', mime: 'image/png'}});

    await expect(
      service.ingestAudio('session-a', {
        originalName: 'fake.mp3',
        declaredMime: 'audio/mpeg',
        source: chunks('not audio'),
      }),
    ).rejects.toMatchObject({code: 'INVALID_MEDIA', statusCode: 422});
    expect(await listTemporary()).toEqual([]);
    expect(db.prepare('SELECT COUNT(*) AS count FROM pending_uploads').get()).toEqual({count: 0});
  });

  it('stops an oversized stream and removes its partial temporary file', async () => {
    const service = createService({detected: {ext: 'webp', mime: 'image/webp'}});

    await expect(
      service.ingestCover('session-a', {
        originalName: 'large.webp',
        declaredMime: 'image/webp',
        source: chunks(Buffer.alloc(10 * 1024 * 1024), Buffer.of(0)),
      }),
    ).rejects.toMatchObject({code: 'FILE_TOO_LARGE', statusCode: 413});
    expect(await listTemporary()).toEqual([]);
  });

  it('allows only the owning session to cancel a pending upload', async () => {
    const service = createService();
    const upload = await service.ingestAudio('session-a', {
      originalName: 'song.mp3',
      declaredMime: 'audio/mpeg',
      source: chunks('audio'),
    });

    await expect(service.cancel('session-b', upload.uploadId)).resolves.toBe(false);
    expect(await listTemporary()).toHaveLength(1);
    await expect(service.cancel('session-a', upload.uploadId)).resolves.toBe(true);
    expect(await listTemporary()).toEqual([]);
    expect(db.prepare('SELECT COUNT(*) AS count FROM pending_uploads').get()).toEqual({count: 0});
  });

  it('returns editable UTF-8 LRC text and validation without leaving temporary media', async () => {
    const service = createService();

    const result = await service.ingestLrc({
      originalName: 'lyrics.lrc',
      declaredMime: 'text/plain',
      source: chunks('[00:01.20]第一句\n坏的时间标签'),
    });

    expect(result).toEqual({
      content: '[00:01.20]第一句\n坏的时间标签',
      validation: {
        valid: false,
        errors: [{line: 2, message: '歌词行缺少有效时间标签'}],
      },
    });
    expect(await listTemporary()).toEqual([]);
    expect(db.prepare('SELECT COUNT(*) AS count FROM pending_uploads').get()).toEqual({count: 0});
  });

  it('cleans its own temporary file if the pending row cannot be recorded', async () => {
    const uploadId = randomUUID();
    db.prepare(`
      INSERT INTO pending_uploads (
        id, owner_session_digest, kind, temporary_key, original_name,
        mime_type, byte_size, duration_seconds, lrc_text, created_at
      ) VALUES (?, ?, 'audio', ?, 'existing.mp3', 'audio/mpeg', 1, NULL, NULL, ?)
    `).run(
      uploadId,
      digest('existing-session'),
      randomUUID(),
      '2026-09-03T00:00:00.000Z',
    );
    const service = createService({generateUploadId: () => uploadId});

    await expect(
      service.ingestAudio('session-a', {
        originalName: 'song.mp3',
        declaredMime: 'audio/mpeg',
        source: chunks('audio'),
      }),
    ).rejects.toThrow();
    expect(await listTemporary()).toEqual([]);
    expect(db.prepare('SELECT COUNT(*) AS count FROM pending_uploads').get()).toEqual({count: 1});
  });

  it('removes pending rows and temporary files older than 24 hours at startup', async () => {
    const oldId = randomUUID();
    const recentId = randomUUID();
    const oldService = new UploadService(db, mediaStore, mediaDirectory, {
      detectFileType: async () => ({ext: 'mp3', mime: 'audio/mpeg'}),
      probeAudioDuration: async () => null,
      generateUploadId: () => oldId,
      now: () => new Date('2026-09-02T23:59:59.000Z'),
    });
    const recentService = new UploadService(db, mediaStore, mediaDirectory, {
      detectFileType: async () => ({ext: 'mp3', mime: 'audio/mpeg'}),
      probeAudioDuration: async () => null,
      generateUploadId: () => recentId,
      now: () => new Date('2026-09-03T00:00:01.000Z'),
    });
    await oldService.ingestAudio('old-session', {
      originalName: 'old.mp3',
      declaredMime: 'audio/mpeg',
      source: chunks('old'),
    });
    await recentService.ingestAudio('recent-session', {
      originalName: 'recent.mp3',
      declaredMime: 'audio/mpeg',
      source: chunks('recent'),
    });
    const startupService = new UploadService(db, mediaStore, mediaDirectory, {
      now: () => new Date('2026-09-04T00:00:00.000Z'),
    });

    await expect(startupService.cleanupStalePendingUploads()).resolves.toBe(1);
    expect(
      db.prepare('SELECT id FROM pending_uploads ORDER BY id').all(),
    ).toEqual([{id: recentId}]);
    expect(await listTemporary()).toHaveLength(1);
  });
});
