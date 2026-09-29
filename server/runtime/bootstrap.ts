import type {AppConfig} from '../config.js';
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {openDatabase} from '../db/database.js';
import {runMigrations} from '../db/migrate.js';
import {seedTransitionSongs} from '../db/seed-transition-songs.js';
import {LocalMediaStore} from '../storage/local-media-store.js';
import {assertEmptyInitializationTarget, assertExistingDataDirectory} from './data-directory.js';

export async function prepareRuntime(config: AppConfig, options: {initialize: boolean}): Promise<void> {
  if (!options.initialize) {
    if (config.cloud) await assertExistingDataDirectory(config);
    else await mkdir(config.dataDir, {recursive: true});
    return;
  }
  await assertEmptyInitializationTarget(config.dataDir);
  await mkdir(config.dataDir, {recursive: true, mode: 0o700});
  const db = openDatabase(config.databasePath);
  try {
    runMigrations(db);
    await seedTransitionSongs(db, new LocalMediaStore(config.mediaDir));
  } finally { db.close(); }
  await writeFile(path.join(config.dataDir, '.initialized.json'), JSON.stringify({format: 1}), {flag: 'wx', mode: 0o600});
}
