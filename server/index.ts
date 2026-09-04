import {mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

import type {FastifyInstance} from 'fastify';

import {buildApp} from './app.js';
import {resolveAppConfig, resolveFrontendDir} from './config.js';
import {openDatabase} from './db/database.js';
import {runMigrations} from './db/migrate.js';
import {seedTransitionSongs} from './db/seed-transition-songs.js';
import {LocalMediaStore} from './storage/local-media-store.js';
import type {MediaStore} from './storage/media-store.js';

const TEMPORARY_MEDIA_MAX_AGE_MS = 24 * 60 * 60 * 1_000;

export async function cleanupStaleTemporaryMedia(
  mediaStore: Pick<MediaStore, 'cleanupStaleTemporary'>,
  now: () => Date = () => new Date(),
): Promise<number> {
  return mediaStore.cleanupStaleTemporary(
    new Date(now().getTime() - TEMPORARY_MEDIA_MAX_AGE_MS),
  );
}

async function start(): Promise<void> {
  const config = resolveAppConfig(process.env, process.cwd());
  await mkdir(config.dataDir, {recursive: true});
  const mediaStore = new LocalMediaStore(config.mediaDir);

  const database = openDatabase(config.databasePath);
  try {
    runMigrations(database);
    await cleanupStaleTemporaryMedia(mediaStore);
    await seedTransitionSongs(database, mediaStore);
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

const entryPoint = process.argv[1];
if (entryPoint && import.meta.url === pathToFileURL(entryPoint).href) {
  start().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
