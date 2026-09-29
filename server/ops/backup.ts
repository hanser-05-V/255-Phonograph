import path from 'node:path';
import {rm} from 'node:fs/promises';
import {OpsError, UUID, type BackupConfig, type BackupReceipt, type BackupState, type BackupStore, type ServiceControl} from './contracts.js';
import {confirmBackup, pruneBackups, validateReceipt} from './backup-store.js';
import type {createSnapshot} from './snapshot.js';
import type {encryptSnapshot} from './archive.js';
export type BackupPorts = {
  service: ServiceControl; store: BackupStore; snapshot: typeof createSnapshot; encrypt: typeof encryptSnapshot;
  readState: () => Promise<BackupState>; writeState: (state: BackupState) => Promise<void>;
  now: () => Date; randomId: () => string; diskSpaceCheck: (config: BackupConfig) => Promise<void>;
};
export async function recoverService(ports: Pick<BackupPorts, 'service' | 'readState' | 'writeState'>): Promise<void> {
  const state = await ports.readState();
  if (!state.applicationWasActive || state.applicationRecovered || !['snapshot', 'failed'].includes(state.phase)) return;
  try {
    await ports.service.start(); await ports.service.waitHealthy(30_000); await ports.service.leaveMaintenance();
    await ports.writeState({...state, applicationRecovered: true});
  } catch {
    await ports.writeState({...state, phase: 'failed', lastErrorCode: 'SERVICE_RECOVERY_FAILED'});
    throw new OpsError('SERVICE_RECOVERY_FAILED');
  }
}

export async function runBackup(config: BackupConfig, ports: BackupPorts): Promise<BackupReceipt> {
  let state = await ports.readState();
  if (state.applicationWasActive && !state.applicationRecovered) throw new OpsError('SERVICE_RECOVERY_REQUIRED');
  let index;
  try { index = await ports.store.readIndex(); }
  catch (error) {
    await ports.writeState({...state, phase: 'failed', lastErrorCode: error instanceof OpsError ? error.code : 'BACKUP_FAILED'});
    throw new OpsError(error instanceof OpsError ? error.code : 'BACKUP_FAILED');
  }
  if (state.latestReceipt && !index.active.some(r => r.id === state.latestReceipt!.id && r.sha256 === state.latestReceipt!.sha256)) {
    await ports.writeState({...state, phase: 'failed', lastErrorCode: 'INDEX_REPLAY_OR_LOSS'});
    throw new OpsError('INDEX_REPLAY_OR_LOSS');
  }
  let receipt = state.pendingReceipt;
  if (receipt) validateReceipt(receipt, config.cos.prefix);
  // A crash after committing the index is reconciled from the exact trusted receipt.
  if (receipt && index.active.some(r => r.id === receipt!.id && r.sha256 === receipt!.sha256 && r.bytes === receipt!.bytes)) {
    state = {...state, latestReceipt: receipt, pendingReceipt: undefined, lastSuccessAt: receipt.createdAt, phase: 'complete'};
    await ports.writeState(state);
    const pruning = await pruneBackups(ports.store, index);
    await ports.writeState({...state, lastErrorCode: pruning.pending ? 'RETENTION_RETRY' : null});
    return receipt;
  }
  const id = receipt?.id ?? ports.randomId();
  if (!UUID.test(id)) throw new OpsError('INVALID_BACKUP_ID');
  const directory = path.join(config.workDir, id);
  const archive = path.join(config.workDir, `${id}.tar.age`);
  try {
    if (!receipt) {
      const active = await ports.service.isActive();
      if (!active) throw new OpsError('APPLICATION_STOPPED');
      await ports.diskSpaceCheck(config);
      await ports.service.enterMaintenance();
      state = {...state, phase: 'snapshot', applicationWasActive: true, applicationRecovered: false, lastErrorCode: null};
      await ports.writeState(state);
      await ports.service.stop();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10 * 60 * 1000);
      let snapshot: Awaited<ReturnType<typeof createSnapshot>>;
      try {
        snapshot = await ports.snapshot({dataDir: config.dataDir, target: directory, id,
          createdAt: ports.now().toISOString(), releaseId: config.releaseId, signal: controller.signal});
        controller.signal.throwIfAborted();
      } finally { clearTimeout(timeout); }
      await recoverService(ports); state = await ports.readState();
      const encrypted = await ports.encrypt(snapshot.directory, config.ageRecipientsFile, archive);
      receipt = {id, createdAt: snapshot.manifest.createdAt, objectKey: `${config.cos.prefix}${id}.tar.age`, ...encrypted};
      validateReceipt(receipt, config.cos.prefix);
      state = {...state, phase: 'upload', pendingReceipt: receipt};
      await ports.writeState(state);
    }
    await ports.store.upload(archive, receipt);
    index = await confirmBackup(ports.store, index, receipt);
    state = {...state, phase: 'complete', lastSuccessAt: receipt.createdAt, latestReceipt: receipt,
      pendingReceipt: undefined, lastErrorCode: null};
    await ports.writeState(state);
    const pruned = await pruneBackups(ports.store, index);
    state.lastErrorCode = pruned.pending ? 'RETENTION_RETRY' : null;
    await ports.writeState(state);
    // Only this run's validated UUID paths may be removed after durable success.
    await rm(directory, {recursive: true, force: true}); await rm(archive, {force: true});
    return receipt;
  } catch (error) {
    try { await recoverService(ports); } catch { /* The durable journal retains recovery failure. */ }
    const current = await ports.readState();
    await ports.writeState({...current, phase: 'failed', lastErrorCode: current.lastErrorCode === 'SERVICE_RECOVERY_FAILED'
      ? current.lastErrorCode : error instanceof OpsError ? error.code : 'BACKUP_FAILED'});
    throw new OpsError(error instanceof OpsError ? error.code : 'BACKUP_FAILED');
  }
}
