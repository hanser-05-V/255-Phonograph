import {mkdir, rm, writeFile} from 'node:fs/promises';
import path from 'node:path';

import type {FastifyInstance} from 'fastify';

import {buildApp} from './app.js';
import {resolveAppConfig, resolveFrontendDir} from './config.js';
import {openDatabase} from './db/database.js';
import {runMigrations} from './db/migrate.js';
import {
  seedTransitionSongs,
  type TransitionSongMediaStore,
} from './db/seed-transition-songs.js';

function createRuntimeMediaStore(mediaDir: string): TransitionSongMediaStore {
  const resolveStoragePath = (storageKey: string): string => {
    const storagePath = path.resolve(mediaDir, storageKey);
    const mediaRoot = `${path.resolve(mediaDir)}${path.sep}`;

    if (!storagePath.startsWith(mediaRoot)) {
      throw new Error('Runtime media key must stay inside the media directory');
    }

    return storagePath;
  };

  return {
    createRuntimeMedia: async (storageKey, bytes) => {
      const storagePath = resolveStoragePath(storageKey);
      await mkdir(path.dirname(storagePath), {recursive: true});
      await writeFile(storagePath, bytes, {flag: 'wx'});
    },
    deleteRuntimeMedia: async (storageKey) => {
      await rm(resolveStoragePath(storageKey), {force: true});
    },
  };
}

async function start(): Promise<void> {
  const config = resolveAppConfig(process.env, process.cwd());
  await mkdir(config.dataDir, {recursive: true});
  await mkdir(config.mediaDir, {recursive: true});

  const database = openDatabase(config.databasePath);
  try {
    runMigrations(database);
    await seedTransitionSongs(database, createRuntimeMediaStore(config.mediaDir));
  } catch (error) {
    database.close();
    throw error;
  }

  let app: FastifyInstance;
  try {
    app = await buildApp({
      config,
      database,
      frontendDir: resolveFrontendDir(process.env, process.cwd()),
    });
  } catch (error) {
    database.close();
    throw error;
  }

  let shuttingDown = false;
  const shutdown = async (): Promise<void> => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    await app.close();
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);

  try {
    await app.listen({host: config.host, port: config.port});
  } catch (error) {
    await app.close();
    throw error;
  }
}

start().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
