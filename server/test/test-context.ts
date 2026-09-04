import {mkdtemp, readdir, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';

import type {DatabaseSync} from 'node:sqlite';

import {openDatabase} from '../db/database.js';
import {runMigrations} from '../db/migrate.js';
import {LocalMediaStore} from '../storage/local-media-store.js';
import type {MediaStore} from '../storage/media-store.js';

export type TestContext = {
  dataDir: string;
  db: DatabaseSync;
  mediaStore: MediaStore;
  listStoredMedia: () => Promise<string[]>;
  dispose: () => Promise<void>;
};

export async function createTestContext(): Promise<TestContext> {
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

  const mediaStore = new LocalMediaStore(mediaDir);

  let disposed = false;

  return {
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
        db.close();
      } finally {
        await rm(dataDir, {recursive: true, force: true});
      }
    },
  };
}
