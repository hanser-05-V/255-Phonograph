import {randomUUID} from 'node:crypto';
import {mkdtemp, readdir, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';

import type {FastifyInstance} from 'fastify';
import type {DatabaseSync} from 'node:sqlite';

import {buildApp} from '../app.js';
import type {AppConfig} from '../config.js';
import {openDatabase} from '../db/database.js';
import {runMigrations} from '../db/migrate.js';
import {LocalMediaStore} from '../storage/local-media-store.js';
import type {MediaStore} from '../storage/media-store.js';

export type TestContext = {
  app: FastifyInstance;
  config: AppConfig;
  dataDir: string;
  db: DatabaseSync;
  mediaStore: MediaStore;
  listStoredMedia: () => Promise<string[]>;
  dispose: () => Promise<void>;
};

async function* oneChunk(bytes: Uint8Array): AsyncIterable<Uint8Array> {
  yield bytes;
}

export type SeededMedia = {
  id: string;
  storageKey: string;
  byteSize: number;
  mimeType: string;
};

async function seedMedia(
  context: TestContext,
  kind: 'audio' | 'cover',
  bytes: Uint8Array,
  mimeType: string,
  originalName: string,
): Promise<SeededMedia> {
  const {temporaryKey} = await context.mediaStore.createTemporary(kind);
  await context.mediaStore.writeTemporary(temporaryKey, oneChunk(bytes), {});
  const stored = await context.mediaStore.promote(temporaryKey);
  const id = randomUUID();
  context.db.prepare(`
    INSERT INTO media_objects (
      id, kind, storage_key, original_name, mime_type, byte_size, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    kind,
    stored.storageKey,
    originalName,
    mimeType,
    stored.byteSize,
    '2026-09-03T00:00:00.000Z',
  );
  return {
    id,
    storageKey: stored.storageKey,
    byteSize: stored.byteSize,
    mimeType,
  };
}

export async function seedPublishedAudio(
  context: TestContext,
  bytes: Uint8Array,
  mimeType = 'audio/mpeg',
): Promise<SeededMedia> {
  return seedMedia(context, 'audio', bytes, mimeType, 'published.mp3');
}

export type SeededSongsAcrossStatuses = {
  publishedIds: string[];
  categoryId: string;
  tagId: string;
  lyricSongId: string;
  emptyLyricSongId: string;
  draftSongId: string;
};

export async function seedSongsAcrossStatuses(
  context: TestContext,
  publishedCount: number,
): Promise<SeededSongsAcrossStatuses> {
  const timestamp = '2026-09-03T00:00:00.000Z';
  const categoryId = 'category-public';
  const privateCategoryId = 'category-private';
  const tagId = 'tag-public';
  const privateTagId = 'tag-private';
  context.db.prepare(`
    INSERT INTO categories (id, name, normalized_name, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(categoryId, '公开分类', '公开分类', timestamp, timestamp);
  context.db.prepare(`
    INSERT INTO categories (id, name, normalized_name, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(privateCategoryId, '私有分类', '私有分类', timestamp, timestamp);
  context.db.prepare(`
    INSERT INTO tags (id, name, normalized_name, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(tagId, '公开标签', '公开标签', timestamp, timestamp);
  context.db.prepare(`
    INSERT INTO tags (id, name, normalized_name, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(privateTagId, '私有标签', '私有标签', timestamp, timestamp);

  const songs = Array.from({length: publishedCount}, (_, index) => {
    const sequence = index + 1;
    return {
      id: `published-${String(sequence).padStart(2, '0')}`,
      title: `已发布歌曲 ${sequence}`,
      publishedAt: sequence <= 2
        ? '2026-09-03T12:00:00.000Z'
        : `2026-09-03T${String(13 - sequence).padStart(2, '0')}:00:00.000Z`,
      featured: sequence <= 8,
      liveCover: sequence >= 2,
      lyricsText: sequence === 1 ? '[00:00.00]公开歌词' : '',
    };
  });

  const insertSong = context.db.prepare(`
    INSERT INTO songs (
      id, title, artist, status, duration_seconds, audio_media_id,
      cover_media_id, lyrics_text, category_id, version_note,
      performance_date, source_url, is_featured, is_live_cover,
      published_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertTag = context.db.prepare(
    'INSERT INTO song_tags (song_id, tag_id) VALUES (?, ?)',
  );

  for (const [index, song] of songs.entries()) {
    const audio = await seedPublishedAudio(
      context,
      Buffer.from(`audio-${song.id}`),
    );
    const cover = index === 0
      ? await seedMedia(
          context,
          'cover',
          Buffer.from('cover-bytes'),
          'image/png',
          'cover.png',
        )
      : undefined;
    insertSong.run(
      song.id,
      song.title,
      'Hanser',
      'published',
      123 + index,
      audio.id,
      cover?.id ?? null,
      song.lyricsText,
      categoryId,
      `版本 ${index + 1}`,
      '2026-09-03',
      `https://example.com/${song.id}`,
      song.featured ? 1 : 0,
      song.liveCover ? 1 : 0,
      song.publishedAt,
      timestamp,
      timestamp,
    );
    insertTag.run(song.id, tagId);
  }

  const draftAudio = await seedPublishedAudio(context, Buffer.from('draft-audio'));
  const draftSongId = 'draft-song';
  insertSong.run(
    draftSongId,
    '草稿歌',
    'Hanser',
    'draft',
    60,
    draftAudio.id,
    null,
    '[00:00.00]草稿歌词',
    privateCategoryId,
    '',
    '',
    '',
    0,
    0,
    null,
    timestamp,
    timestamp,
  );
  insertTag.run(draftSongId, privateTagId);

  for (const status of ['unlisted', 'trashed'] as const) {
    const audio = await seedPublishedAudio(
      context,
      Buffer.from(`${status}-audio`),
    );
    insertSong.run(
      `${status}-song`,
      `${status} 歌曲`,
      'Hanser',
      status,
      60,
      audio.id,
      null,
      '',
      privateCategoryId,
      '',
      '',
      '',
      0,
      0,
      '2026-09-03T13:00:00.000Z',
      timestamp,
      timestamp,
    );
    insertTag.run(`${status}-song`, privateTagId);
  }

  return {
    publishedIds: songs.map(({id}) => id),
    categoryId,
    tagId,
    lyricSongId: songs[0]?.id ?? '',
    emptyLyricSongId: songs[1]?.id ?? '',
    draftSongId,
  };
}

export async function createTestContext(
  options: {secureCookies?: boolean; mediaStore?: MediaStore} = {},
): Promise<TestContext> {
  const dataDir = await mkdtemp(path.join(tmpdir(), 'phonograph-test-'));
  const mediaDir = path.join(dataDir, 'media');
  const objectDirectory = path.join(mediaDir, 'objects');

  let db: DatabaseSync;
  try {
    db = openDatabase(path.join(dataDir, 'library.sqlite'));
  } catch (error) {
    await rm(dataDir, {recursive: true, force: true});
    throw error;
  }

  try {
    runMigrations(db);
  } catch (error) {
    db.close();
    await rm(dataDir, {recursive: true, force: true});
    throw error;
  }

  const mediaStore = options.mediaStore ?? new LocalMediaStore(mediaDir);
  const config: AppConfig = {
    host: '127.0.0.1',
    port: 0,
    dataDir,
    databasePath: path.join(dataDir, 'library.sqlite'),
    mediaDir,
    sessionCookieName: 'phonograph_admin_session',
  };
  const app = await buildApp({
    config,
    database: db,
    secureCookies: options.secureCookies,
    mediaStore,
  });

  let disposed = false;

  return {
    app,
    config,
    dataDir,
    db,
    mediaStore,
    listStoredMedia: async () => {
      try {
        return (await readdir(objectDirectory)).sort();
      } catch (error) {
        if (
          error instanceof Error &&
          'code' in error &&
          error.code === 'ENOENT'
        ) {
          return [];
        }
        throw error;
      }
    },
    dispose: async () => {
      if (disposed) {
        return;
      }

      disposed = true;
      try {
        await app.close();
      } finally {
        await rm(dataDir, {recursive: true, force: true});
      }
    },
  };
}

export type AuthenticatedTestContext = TestContext & {
  cookie: string;
};

export async function createAuthenticatedTestContext(): Promise<AuthenticatedTestContext> {
  const context = await createTestContext();
  const response = await context.app.inject({
    method: 'POST',
    url: '/api/admin/auth/setup',
    payload: {password: 'owner-password'},
  });

  if (response.statusCode !== 201) {
    await context.dispose();
    throw new Error(`Admin test setup failed with ${response.statusCode}.`);
  }

  const setCookie = response.headers['set-cookie'];
  const serialized = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  if (!serialized) {
    await context.dispose();
    throw new Error('Admin test setup did not return a session cookie.');
  }

  return {
    ...context,
    cookie: serialized.split(';', 1)[0],
  };
}
