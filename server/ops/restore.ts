import path from 'node:path';
import {lstat, mkdtemp, rename, rm} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import {OpsError, UUID, type BackupConfig, type BackupStore} from './contracts.js';
import {decryptArchive} from './archive.js';
import {assertOutsideCode, assertRealPath, isWithin} from '../runtime/data-directory.js';
import {hashFile, verifySnapshot, writeManifest} from './snapshot.js';
import {validateIndex} from './backup-store.js';

export async function restoreBackup(config: BackupConfig, id: string, identityFile: string, target: string, store: BackupStore, decrypt = decryptArchive): Promise<void> {
  if (!UUID.test(id)) throw new OpsError('INVALID_BACKUP_ID');
  assertOutsideCode(target); await assertRealPath(target, true);
  for (const dir of [config.dataDir, config.workDir, config.stateDir]) {
    if (isWithin(dir, target) || isWithin(target, dir)) throw new OpsError('INVALID_RESTORE_TARGET');
  }
  try { await lstat(target); throw new OpsError('TARGET_EXISTS'); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  const index = validateIndex(await store.readIndex(), config.cos.prefix);
  const receipt = index.active.find(item => item.id === id);
  if (!receipt) throw new OpsError('BACKUP_NOT_FOUND');
  await assertRealPath(config.workDir);
  const downloadStage = await mkdtemp(path.join(config.workDir, 'phonograph-restore-'));
  // Keep extraction on the final target's filesystem so publication is a rename.
  const stage = await mkdtemp(path.join(path.dirname(target), '.phonograph-restore-'));
  const archive = path.join(downloadStage, `${id}.tar.age`), data = path.join(stage, 'data');
  try {
    await store.download(receipt, archive);
    const digest = await hashFile(archive);
    if (digest.sha256 !== receipt.sha256 || digest.bytes !== receipt.bytes) throw new OpsError('ARCHIVE_HASH_MISMATCH');
    await decrypt(archive, identityFile, data);
    const manifest = await verifySnapshot(data);
    if (manifest.id !== receipt.id) throw new OpsError('BACKUP_ID_MISMATCH');
    const db = new DatabaseSync(path.join(data, 'library.sqlite'));
    let keys: string[] = [];
    try {
      db.exec('PRAGMA foreign_keys=ON'); db.exec('PRAGMA journal_mode=DELETE');
      keys = db.prepare('SELECT temporary_key FROM pending_uploads').all().map(row => String(row.temporary_key));
      if (keys.some(key => !UUID.test(key))) throw new OpsError('INVALID_TEMPORARY_KEY');
      db.exec('BEGIN IMMEDIATE');
      try { db.exec('DELETE FROM admin_sessions; DELETE FROM pending_uploads; COMMIT'); }
      catch (error) { db.exec('ROLLBACK'); throw error; }
    } finally { db.close(); }
    for (const key of keys) await rm(path.join(data, 'media', 'tmp', key));
    await writeManifest(data, {id: manifest.id, createdAt: manifest.createdAt, releaseId: manifest.releaseId,
      restoredFrom: {backupId: receipt.id, archiveSha256: receipt.sha256, restoredAt: new Date().toISOString()}}, undefined, false);
    await verifySnapshot(data);
    try { await lstat(target); throw new OpsError('TARGET_EXISTS'); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    await rename(data, target);
  } finally {
    await rm(stage, {recursive: true, force: true}); await rm(downloadStage, {recursive: true, force: true});
  }
}
