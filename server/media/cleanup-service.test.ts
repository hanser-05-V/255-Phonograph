import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import type {DatabaseSync} from 'node:sqlite';

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {buildApp} from '../app.js';
import {openDatabase} from '../db/database.js';
import {runMigrations} from '../db/migrate.js';
import {LocalMediaStore} from '../storage/local-media-store.js';
import {CleanupService} from './cleanup-service.js';

async function* bytes(): AsyncIterable<Uint8Array> {
  yield Buffer.from('media');
}

describe('CleanupService', () => {
  let dataDir: string;
  let db: DatabaseSync;
  let mediaStore: LocalMediaStore;

  beforeEach(async () => {
    dataDir = await mkdtemp(path.join(tmpdir(), 'song-cleanup-'));
    db = openDatabase(':memory:');
    runMigrations(db);
    mediaStore = new LocalMediaStore(path.join(dataDir, 'media'));
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    db.close();
    await rm(dataDir, {recursive: true, force: true});
  });

  it('keeps a failed cleanup queued and clears it on the next successful drain', async () => {
    const {temporaryKey} = await mediaStore.createTemporary('audio');
    await mediaStore.writeTemporary(temporaryKey, bytes(), {});
    const stored = await mediaStore.promote(temporaryKey);
    const service = new CleanupService(db, mediaStore, {
      now: () => new Date('2026-09-04T04:00:00.000Z'),
      generateId: () => 'cleanup-1',
    });
    service.queue(stored.storageKey, 'song-permanent-delete');
    const deleteMedia = vi.spyOn(mediaStore, 'delete');
    deleteMedia.mockRejectedValueOnce(new Error('locked'));

    await expect(service.drain()).resolves.toEqual({succeeded: 0, failed: 1});
    expect(db.prepare(`
      SELECT reason, attempts, last_error AS lastError
      FROM pending_media_cleanup
    `).get()).toEqual({
      reason: 'song-permanent-delete',
      attempts: 1,
      lastError: 'locked',
    });

    await expect(service.drain()).resolves.toEqual({succeeded: 1, failed: 0});
    expect(db.prepare('SELECT COUNT(*) AS count FROM pending_media_cleanup').get())
      .toEqual({count: 0});
  });

  it('drains queued media while building the app and keeps individual failures retryable', async () => {
    const startupDb = openDatabase(':memory:');
    runMigrations(startupDb);
    const startupDir = path.join(dataDir, 'startup-media');
    const startupStore = new LocalMediaStore(startupDir);
    const service = new CleanupService(startupDb, startupStore);
    const keys: string[] = [];
    for (const kind of ['audio', 'cover'] as const) {
      const {temporaryKey} = await startupStore.createTemporary(kind);
      await startupStore.writeTemporary(temporaryKey, bytes(), {});
      keys.push((await startupStore.promote(temporaryKey)).storageKey);
    }
    service.queue(keys[0], 'startup-test');
    service.queue(keys[1], 'startup-test');
    vi.spyOn(startupStore, 'delete').mockRejectedValueOnce(new Error('busy'));

    const app = await buildApp({
      config: {
        host: '127.0.0.1',
        port: 0,
        dataDir,
        databasePath: ':memory:',
        mediaDir: startupDir,
        sessionCookieName: 'phonograph_admin_session',
      },
      database: startupDb,
      mediaStore: startupStore,
    });
    try {
      expect(startupDb.prepare(`
        SELECT attempts, last_error AS lastError
        FROM pending_media_cleanup
      `).all()).toEqual([{attempts: 1, lastError: 'busy'}]);
    } finally {
      await app.close();
    }
  });
});
