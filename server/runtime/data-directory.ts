import type {AppConfig} from '../config.js';
import {lstat, readdir, readFile, realpath} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';

export function isWithin(parent: string, child: string): boolean {
  const relative = path.relative(path.resolve(parent), path.resolve(child));
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

export function assertOutsideCode(directory: string): void {
  let codeRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  if (path.basename(codeRoot) === 'server-dist') codeRoot = path.dirname(codeRoot);
  if (path.resolve(directory) === path.parse(path.resolve(directory)).root ||
      isWithin(codeRoot, directory) || isWithin(process.cwd(), directory)) {
    throw new Error('Runtime data must be outside the code directory and filesystem root');
  }
}

/** Walk even missing targets, so an existing ancestor cannot redirect later writes. */
export async function assertRealPath(target: string, allowMissing = false): Promise<void> {
  if (!path.isAbsolute(target)) throw new Error('An absolute path is required');
  const resolved = path.resolve(target);
  const root = path.parse(resolved).root;
  let current = root;
  const parts = resolved.slice(root.length).split(path.sep).filter(Boolean);
  for (let index = -1; index < parts.length; index++) {
    if (index >= 0) current = path.join(current, parts[index]);
    let stats;
    try { stats = await lstat(current); }
    catch (error) {
      if (allowMissing && (error as NodeJS.ErrnoException).code === 'ENOENT') return;
      throw error;
    }
    if (stats.isSymbolicLink()) throw new Error('Symbolic links are not allowed in runtime paths');
    if (index < parts.length - 1 && !stats.isDirectory()) throw new Error('Invalid path ancestor');
  }
  if (path.relative(await realpath(resolved), resolved) !== '') throw new Error('Runtime path resolves through a link');
}

export async function assertExistingDataDirectory(config: AppConfig): Promise<void> {
  await assertRealPath(config.dataDir);
  if (!(await lstat(config.dataDir)).isDirectory()) throw new Error('Invalid data directory');
  for (const name of ['.initialized.json', 'library.sqlite']) {
    const file = path.join(config.dataDir, name);
    await assertRealPath(file);
    const stats = await lstat(file);
    if (!stats.isFile() || stats.nlink !== 1) throw new Error('Invalid runtime file');
  }
  if (config.databasePath !== path.join(config.dataDir, 'library.sqlite') ||
      config.mediaDir !== path.join(config.dataDir, 'media')) throw new Error('Inconsistent data paths');
  const marker = JSON.parse(await readFile(path.join(config.dataDir, '.initialized.json'), 'utf8')) as {format?: unknown};
  if (marker?.format !== 1) throw new Error('Invalid initialization marker');
  const db = new DatabaseSync(config.databasePath, {readOnly: true});
  try {
    const versions = db.prepare('SELECT version FROM schema_migrations ORDER BY version').all();
    if (versions.length !== 1 || versions[0].version !== 1) throw new Error('Unsupported database schema');
    const requiredColumns = {
      schema_migrations: 'version, applied_at',
      songs: 'id, title, artist, status, status_before_trash, duration_seconds, audio_media_id, cover_media_id, lyrics_text, category_id, version_note, performance_date, source_url, is_featured, is_live_cover, published_at, created_at, updated_at',
      media_objects: 'id, kind, storage_key, original_name, mime_type, byte_size, created_at',
      pending_uploads: 'id, owner_session_digest, kind, temporary_key, original_name, mime_type, byte_size, duration_seconds, lrc_text, created_at',
      admin_config: 'singleton, password_hash, created_at, updated_at',
      admin_sessions: 'digest, expires_at, revoked_at, created_at',
      categories: 'id, name, normalized_name, created_at, updated_at',
      tags: 'id, name, normalized_name, created_at, updated_at',
      song_tags: 'song_id, tag_id',
      pending_media_cleanup: 'id, storage_key, reason, attempts, last_error, created_at, updated_at',
    };
    for (const [table, columns] of Object.entries(requiredColumns)) db.prepare(`SELECT ${columns} FROM ${table} LIMIT 0`).all();
    const integrity = db.prepare('PRAGMA integrity_check').all();
    if (integrity.length !== 1 || integrity[0].integrity_check !== 'ok' ||
        db.prepare('PRAGMA foreign_key_check').all().length) throw new Error('Invalid database integrity');
  } finally { db.close(); }
}

export async function assertEmptyInitializationTarget(dataDir: string): Promise<void> {
  assertOutsideCode(dataDir);
  await assertRealPath(dataDir, true);
  try {
    if (!(await lstat(dataDir)).isDirectory() || (await readdir(dataDir)).length > 0) {
      throw new Error('Initialization target must be empty');
    }
  } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
}
