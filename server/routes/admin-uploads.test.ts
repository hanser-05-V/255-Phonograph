import {randomUUID} from 'node:crypto';
import {mkdtemp, readdir, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';

import {afterEach, describe, expect, it} from 'vitest';

import {buildApp} from '../app.js';
import {openDatabase} from '../db/database.js';
import {runMigrations} from '../db/migrate.js';
import {LocalMediaStore} from '../storage/local-media-store.js';
import {
  createAuthenticatedTestContext,
  createTestContext,
  type AuthenticatedTestContext,
  type TestContext,
} from '../test/test-context.js';

type MultipartFile = {
  fieldName?: string;
  filename: string;
  mimeType: string;
  content: Uint8Array | string;
};

function multipartPayload(files: MultipartFile[]): {
  body: Buffer;
  headers: {'content-type': string};
} {
  const boundary = '----255-phonograph-test-boundary';
  const parts: Buffer[] = [];

  for (const file of files) {
    parts.push(
      Buffer.from(
        `--${boundary}\r\n` +
          `Content-Disposition: form-data; name="${file.fieldName ?? 'file'}"; filename="${file.filename}"\r\n` +
          `Content-Type: ${file.mimeType}\r\n\r\n`,
      ),
      typeof file.content === 'string' ? Buffer.from(file.content) : Buffer.from(file.content),
      Buffer.from('\r\n'),
    );
  }
  parts.push(Buffer.from(`--${boundary}--\r\n`));

  return {
    body: Buffer.concat(parts),
    headers: {'content-type': `multipart/form-data; boundary=${boundary}`},
  };
}

async function temporaryFiles(context: TestContext): Promise<string[]> {
  try {
    return await readdir(path.join(context.config.mediaDir, 'tmp'));
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

describe('admin upload routes', () => {
  let context: TestContext | AuthenticatedTestContext | undefined;

  afterEach(async () => {
    await context?.dispose();
    context = undefined;
  });

  it.each([
    ['POST', '/api/admin/uploads/audio'],
    ['POST', '/api/admin/uploads/cover'],
    ['POST', '/api/admin/uploads/lrc'],
    ['DELETE', '/api/admin/uploads/missing'],
  ] as const)('protects %s %s with the administrator session', async (method, url) => {
    context = await createTestContext();
    const response = await context.app.inject({method, url});

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({error: {code: 'UNAUTHORIZED'}});
  });

  it('streams one audio file into a session-bound pending upload and cancels it', async () => {
    context = await createAuthenticatedTestContext();
    const multipart = multipartPayload([
      {
        filename: 'song.mp3',
        mimeType: 'audio/mpeg',
        content: Buffer.from([0xff, 0xfb, 0x90, 0x64, 0, 0, 0, 0]),
      },
    ]);

    const uploaded = await context.app.inject({
      method: 'POST',
      url: '/api/admin/uploads/audio',
      headers: {...multipart.headers, cookie: context.cookie},
      payload: multipart.body,
    });

    expect(uploaded.statusCode).toBe(201);
    expect(uploaded.json()).toMatchObject({
      originalName: 'song.mp3',
      mimeType: 'audio/mpeg',
      byteSize: 8,
      durationSeconds: null,
    });
    expect(
      context.db.prepare('SELECT COUNT(*) AS count FROM pending_uploads').get(),
    ).toEqual({count: 1});
    expect(await temporaryFiles(context)).toHaveLength(1);

    const cancelled = await context.app.inject({
      method: 'DELETE',
      url: `/api/admin/uploads/${uploaded.json().uploadId as string}`,
      headers: {cookie: context.cookie},
    });

    expect(cancelled.statusCode).toBe(204);
    expect(context.db.prepare('SELECT COUNT(*) AS count FROM pending_uploads').get()).toEqual({count: 0});
    expect(await temporaryFiles(context)).toEqual([]);
  });

  it('returns editable LRC text with line errors and leaves no temporary upload', async () => {
    context = await createAuthenticatedTestContext();
    const multipart = multipartPayload([
      {
        filename: 'lyrics.lrc',
        mimeType: 'text/plain',
        content: '[00:01.20]第一句\n坏的时间标签',
      },
    ]);

    const response = await context.app.inject({
      method: 'POST',
      url: '/api/admin/uploads/lrc',
      headers: {...multipart.headers, cookie: context.cookie},
      payload: multipart.body,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      content: '[00:01.20]第一句\n坏的时间标签',
      validation: {
        valid: false,
        errors: [{line: 2, message: '歌词行缺少有效时间标签'}],
      },
    });
    expect(await temporaryFiles(context)).toEqual([]);
  });

  it('rejects a second file without retaining the first pending upload', async () => {
    context = await createAuthenticatedTestContext();
    const multipart = multipartPayload([
      {
        filename: 'first.mp3',
        mimeType: 'audio/mpeg',
        content: Buffer.from([0xff, 0xfb, 0x90, 0x64, 0, 0, 0, 0]),
      },
      {
        filename: 'second.mp3',
        mimeType: 'audio/mpeg',
        content: Buffer.from([0xff, 0xfb, 0x90, 0x64, 0, 0, 0, 0]),
      },
    ]);

    const response = await context.app.inject({
      method: 'POST',
      url: '/api/admin/uploads/audio',
      headers: {...multipart.headers, cookie: context.cookie},
      payload: multipart.body,
    });

    expect(response.statusCode, response.body).toBe(422);
    expect(response.json()).toMatchObject({error: {code: 'INVALID_MEDIA'}});
    expect(context.db.prepare('SELECT COUNT(*) AS count FROM pending_uploads').get()).toEqual({count: 0});
    expect(await temporaryFiles(context)).toEqual([]);
  });

  it('uses stable error codes for invalid content and malformed upload requests', async () => {
    context = await createAuthenticatedTestContext();
    const mismatch = multipartPayload([
      {
        filename: 'fake.mp3',
        mimeType: 'audio/mpeg',
        content: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      },
    ]);

    const invalid = await context.app.inject({
      method: 'POST',
      url: '/api/admin/uploads/audio',
      headers: {...mismatch.headers, cookie: context.cookie},
      payload: mismatch.body,
    });
    const missing = await context.app.inject({
      method: 'POST',
      url: '/api/admin/uploads/cover',
      headers: {cookie: context.cookie},
    });

    expect(invalid.statusCode).toBe(422);
    expect(invalid.json()).toMatchObject({error: {code: 'INVALID_MEDIA'}});
    expect(missing.statusCode).toBe(415);
    expect(missing.json()).toMatchObject({error: {code: 'UNSUPPORTED_MEDIA_TYPE'}});
    expect(await temporaryFiles(context)).toEqual([]);
  });

  it('maps multipart file truncation to the stable size error and cleans partial bytes', async () => {
    context = await createAuthenticatedTestContext();
    const multipart = multipartPayload([
      {
        filename: 'large.png',
        mimeType: 'image/png',
        content: Buffer.alloc(10 * 1024 * 1024 + 1),
      },
    ]);

    const response = await context.app.inject({
      method: 'POST',
      url: '/api/admin/uploads/cover',
      headers: {...multipart.headers, cookie: context.cookie},
      payload: multipart.body,
    });

    expect(response.statusCode).toBe(413);
    expect(response.json()).toMatchObject({error: {code: 'FILE_TOO_LARGE'}});
    expect(context.db.prepare('SELECT COUNT(*) AS count FROM pending_uploads').get()).toEqual({count: 0});
    expect(await temporaryFiles(context)).toEqual([]);
  });

  it('cleans stale pending rows and their temporary files while building the app', async () => {
    const dataDir = await mkdtemp(path.join(tmpdir(), 'upload-app-startup-'));
    const mediaDir = path.join(dataDir, 'media');
    const databasePath = path.join(dataDir, 'library.sqlite');
    const db = openDatabase(databasePath);
    runMigrations(db);
    const mediaStore = new LocalMediaStore(mediaDir);
    const {temporaryKey} = await mediaStore.createTemporary('audio');
    await mediaStore.writeTemporary(
      temporaryKey,
      (async function* () {
        yield Buffer.from('stale');
      })(),
      {},
    );
    db.prepare(`
      INSERT INTO pending_uploads (
        id, owner_session_digest, kind, temporary_key, original_name,
        mime_type, byte_size, duration_seconds, lrc_text, created_at
      ) VALUES (?, 'digest', 'audio', ?, 'stale.mp3', 'audio/mpeg', 5, NULL, NULL, ?)
    `).run(randomUUID(), temporaryKey, '2000-01-01T00:00:00.000Z');

    const app = await buildApp({
      config: {
        host: '127.0.0.1',
        port: 0,
        dataDir,
        databasePath,
        mediaDir,
        sessionCookieName: 'phonograph_admin_session',
      },
      database: db,
    });
    try {
      expect(db.prepare('SELECT COUNT(*) AS count FROM pending_uploads').get()).toEqual({count: 0});
      expect(await readdir(path.join(mediaDir, 'tmp'))).toEqual([]);
    } finally {
      await app.close();
      await rm(dataDir, {recursive: true, force: true});
    }
  });
});
