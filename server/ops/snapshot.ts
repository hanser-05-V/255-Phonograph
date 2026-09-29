import {createHash} from 'node:crypto';
import {lstat, mkdir, open, readdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {backup, DatabaseSync} from 'node:sqlite';
import {pipeline} from 'node:stream/promises';
import {assertExistingDataDirectory, assertRealPath, isWithin} from '../runtime/data-directory.js';
import {OpsError, UUID, SHA256, validTime, MAX_ARCHIVE_BYTES, type BackupFile, type BackupManifest} from './contracts.js';
export type SnapshotResult = {directory: string; manifest: BackupManifest};

export function validBackupPath(name: string): boolean {
  if (name === 'library.sqlite' || name === '.initialized.json') return true;
  const parts = name.split('/');
  return parts.length === 3 && parts[0] === 'media' && ['objects', 'tmp'].includes(parts[1]) && UUID.test(parts[2]);
}

export async function openSafeFile(file: string) {
  await assertRealPath(file);
  const before = await lstat(file);
  if (!before.isFile() || before.nlink !== 1) throw new OpsError('INVALID_BACKUP_FILE');
  const handle = await open(file, 'r');
  const after = await handle.stat();
  if (before.ino !== after.ino || before.dev !== after.dev || !after.isFile() || after.nlink !== 1) {
    await handle.close(); throw new OpsError('BACKUP_FILE_CHANGED');
  }
  return handle;
}

export async function hashFile(file: string, signal?: AbortSignal): Promise<{bytes: number; sha256: string}> {
  const handle = await openSafeFile(file);
  try {
    const hash = createHash('sha256'); let bytes = 0;
    for await (const chunk of handle.createReadStream({autoClose: false})) {
      signal?.throwIfAborted(); bytes += chunk.length; hash.update(chunk);
    }
    return {bytes, sha256: hash.digest('hex')};
  } finally { await handle.close(); }
}

async function dataFiles(directory: string): Promise<string[]> {
  const result = ['.initialized.json', 'library.sqlite'];
  for (const sub of ['media', 'media/objects', 'media/tmp']) {
    const target = path.join(directory, sub);
    await assertRealPath(target, true);
    let names: string[];
    try { names = await readdir(target); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue; throw error; }
    if (sub === 'media') {
      if (names.some(name => name !== 'objects' && name !== 'tmp')) throw new OpsError('UNKNOWN_MEDIA_PATH');
    } else for (const name of names) {
      const relative = `${sub}/${name}`;
      if (!validBackupPath(relative)) throw new OpsError('INVALID_BACKUP_PATH');
      result.push(relative);
    }
  }
  return result.sort();
}

export function validateManifest(value: unknown): BackupManifest {
  const manifest = value as BackupManifest;
  if (!manifest || manifest.format !== 1 || !UUID.test(manifest.id) || !validTime(manifest.createdAt) ||
      !/^[a-f0-9]{40}$/i.test(manifest.releaseId) || !Array.isArray(manifest.schemaVersions) ||
      manifest.schemaVersions.length !== 1 || manifest.schemaVersions[0] !== 1 ||
      !Array.isArray(manifest.files) || manifest.files.length > 100_000) throw new OpsError('INVALID_MANIFEST');
  const names = new Set<string>(); let total = 0;
  for (const file of manifest.files) {
    if (!file || typeof file.path !== 'string' || !validBackupPath(file.path) || names.has(file.path.toLowerCase()) ||
        !Number.isSafeInteger(file.bytes) || file.bytes < 0 || !SHA256.test(file.sha256)) throw new OpsError('INVALID_MANIFEST');
    names.add(file.path.toLowerCase()); total += file.bytes;
  }
  if (!names.has('library.sqlite') || !names.has('.initialized.json') || total > MAX_ARCHIVE_BYTES) throw new OpsError('INVALID_MANIFEST');
  if (manifest.restoredFrom && (!UUID.test(manifest.restoredFrom.backupId) || !SHA256.test(manifest.restoredFrom.archiveSha256) ||
      !validTime(manifest.restoredFrom.restoredAt))) throw new OpsError('INVALID_MANIFEST');
  return manifest;
}

async function validateDatabase(directory: string, files: BackupFile[]): Promise<void> {
  await assertExistingDataDirectory({dataDir: directory, databasePath: path.join(directory, 'library.sqlite'),
    mediaDir: path.join(directory, 'media'), host: '127.0.0.1', port: 3001, sessionCookieName: 'unused'});
  const sizes = new Map(files.map(file => [file.path, file.bytes]));
  const db = new DatabaseSync(path.join(directory, 'library.sqlite'), {readOnly: true});
  try {
    for (const [table, column, folder] of [['media_objects', 'storage_key', 'objects'], ['pending_uploads', 'temporary_key', 'tmp']]) {
      for (const row of db.prepare(`SELECT ${column} AS key, byte_size FROM ${table}`).all()) {
        if (typeof row.key !== 'string' || !UUID.test(row.key) || sizes.get(`media/${folder}/${row.key}`) !== row.byte_size) {
          throw new OpsError('MEDIA_REFERENCE_MISMATCH');
        }
      }
    }
  } finally { db.close(); }
}

export async function writeManifest(directory: string, metadata: Omit<BackupManifest, 'files' | 'schemaVersions' | 'format'>,
  signal?: AbortSignal, exclusive = true): Promise<BackupManifest> {
  const files: BackupFile[] = [];
  for (const name of await dataFiles(directory)) files.push({path: name, ...await hashFile(path.join(directory, name), signal)});
  const manifest = validateManifest({format: 1, ...metadata, schemaVersions: [1], files});
  await validateDatabase(directory, files);
  await writeFile(path.join(directory, 'manifest.json'), JSON.stringify(manifest), {flag: exclusive ? 'wx' : 'w', mode: 0o600});
  return manifest;
}

export async function createSnapshot(input: {dataDir: string; target: string; id: string; createdAt: string; releaseId: string; signal?: AbortSignal}): Promise<SnapshotResult> {
  if (isWithin(input.dataDir, input.target) || isWithin(input.target, input.dataDir)) throw new OpsError('INVALID_SNAPSHOT_TARGET');
  await assertRealPath(input.target, true);
  await assertRealPath(input.dataDir);
  input.signal?.throwIfAborted();
  const names = await dataFiles(input.dataDir);
  // Validate source files before acquiring the SQLite connection (which must never create a source DB).
  for (const name of names) { const handle = await openSafeFile(path.join(input.dataDir, name)); await handle.close(); }
  await mkdir(input.target, {mode: 0o700});
  const db = new DatabaseSync(path.join(input.dataDir, 'library.sqlite'), {readOnly: true});
  try {
    await backup(db, path.join(input.target, 'library.sqlite'), {rate: 128, progress: () => { input.signal?.throwIfAborted(); }});
  } finally { db.close(); }
  for (const name of names.filter(name => name !== 'library.sqlite')) {
    input.signal?.throwIfAborted();
    const source = await openSafeFile(path.join(input.dataDir, name));
    try {
      await mkdir(path.dirname(path.join(input.target, name)), {recursive: true, mode: 0o700});
      const destination = await open(path.join(input.target, name), 'wx', 0o600);
      try { await pipeline(source.createReadStream(), destination.createWriteStream(), {signal: input.signal}); }
      finally { await destination.close(); }
    } finally { await source.close(); }
  }
  const manifest = await writeManifest(input.target, {id: input.id, createdAt: input.createdAt, releaseId: input.releaseId}, input.signal);
  return {directory: input.target, manifest};
}

export async function verifySnapshot(directory: string): Promise<BackupManifest> {
  const manifestFile = path.join(directory, 'manifest.json');
  const handle = await openSafeFile(manifestFile);
  let manifest: BackupManifest;
  try {
    if ((await handle.stat()).size > 32 * 1024 * 1024) throw new OpsError('INVALID_MANIFEST');
    manifest = validateManifest(JSON.parse(await handle.readFile('utf8')));
  } finally { await handle.close(); }
  const actual = await dataFiles(directory);
  if (actual.join('\n') !== manifest.files.map(file => file.path).sort().join('\n')) throw new OpsError('MANIFEST_FILES_MISMATCH');
  for (const file of manifest.files) {
    const digest = await hashFile(path.join(directory, file.path));
    if (digest.bytes !== file.bytes || digest.sha256 !== file.sha256) throw new OpsError('FILE_HASH_OR_SIZE_MISMATCH');
  }
  await validateDatabase(directory, manifest.files);
  return manifest;
}
