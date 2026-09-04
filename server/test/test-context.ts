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

export async function createTestContext(
  options: {secureCookies?: boolean} = {},
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

  const mediaStore = new LocalMediaStore(mediaDir);
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
