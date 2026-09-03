import {mkdir, mkdtemp, readdir, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';

import type {DatabaseSync} from 'node:sqlite';

import {openDatabase} from '../db/database.js';
import {runMigrations} from '../db/migrate.js';
import type {TransitionSongMediaStore} from '../db/seed-transition-songs.js';

export type TestContext = {
  dataDir: string;
  db: DatabaseSync;
  mediaStore: TransitionSongMediaStore;
  listRuntimeMedia: () => Promise<string[]>;
  dispose: () => Promise<void>;
};

function resolveStoragePath(mediaDir: string, storageKey: string): string {
  const storagePath = path.resolve(mediaDir, storageKey);
  const mediaRoot = `${path.resolve(mediaDir)}${path.sep}`;

  if (!storagePath.startsWith(mediaRoot)) {
    throw new Error('Runtime media key must stay inside the test media directory');
  }

  return storagePath;
}

export async function createTestContext(): Promise<TestContext> {
  const dataDir = await mkdtemp(path.join(tmpdir(), 'phonograph-test-'));
  const mediaDir = path.join(dataDir, 'media');
  const runtimeDir = path.join(mediaDir, 'runtime');
  await mkdir(runtimeDir, {recursive: true});

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

  const mediaStore: TransitionSongMediaStore = {
    createRuntimeMedia: async (storageKey, bytes) => {
      const storagePath = resolveStoragePath(mediaDir, storageKey);
      await mkdir(path.dirname(storagePath), {recursive: true});
      await writeFile(storagePath, bytes, {flag: 'wx'});
    },
    deleteRuntimeMedia: async (storageKey) => {
      await rm(resolveStoragePath(mediaDir, storageKey), {force: true});
    },
  };

  let disposed = false;

  return {
    dataDir,
    db,
    mediaStore,
    listRuntimeMedia: async () => {
      const names = await readdir(runtimeDir);
      return names.sort().map((name) => `runtime/${name}`);
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
