import {lstat, readdir, statfs} from 'node:fs/promises';
import path from 'node:path';
import {assertRealPath} from '../runtime/data-directory.js';
import {OpsError, type BackupConfig, type BackupIndex, type BackupState} from './contracts.js';
import type {DiskStats} from '../storage/upload-capacity.js';
export type HealthPorts = {now: () => Date; applicationOk: () => Promise<boolean>; readState: () => Promise<BackupState>;
  readIndex: () => Promise<BackupIndex>; disk: (directory: string) => Promise<DiskStats>};
export async function collectHealth(config: BackupConfig, ports: HealthPorts) {
  const warnings: string[] = []; const now = ports.now();
  const results = await Promise.allSettled([ports.applicationOk(), ports.readState(), ports.readIndex(), ports.disk(config.dataDir)]);
  const app = results[0], state = results[1], index = results[2], disk = results[3];
  const applicationOk = app.status === 'fulfilled' && app.value;
  if (!applicationOk) warnings.push('APPLICATION_UNHEALTHY');
  let backupAgeHours: number | null = null; let backupPhase: string | null = null;
  if (state.status === 'rejected') warnings.push('STATE_UNAVAILABLE');
  else {
    backupPhase = state.value.phase;
    if (state.value.lastSuccessAt) backupAgeHours = (now.getTime() - Date.parse(state.value.lastSuccessAt)) / 3_600_000;
    if (backupAgeHours === null || backupAgeHours > 24) warnings.push('BACKUP_OVERDUE');
    if (backupAgeHours !== null && (!Number.isFinite(backupAgeHours) || backupAgeHours < 0)) warnings.push('BACKUP_CLOCK_INVALID');
    if (state.value.lastErrorCode) warnings.push(state.value.lastErrorCode);
    if (!state.value.applicationRecovered && state.value.applicationWasActive) warnings.push('SERVICE_RECOVERY_REQUIRED');
    if (state.value.pendingReceipt) warnings.push('UNCONFIRMED_BACKUP');
  }
  let pendingDeleteCount: number | null = null, backupStoredBytes: number | null = null, estimatedMonthlyCny: number | null = null;
  if (index.status === 'rejected') warnings.push('INDEX_UNAVAILABLE');
  else {
    pendingDeleteCount = index.value.pendingDelete.length;
    backupStoredBytes = [...index.value.active, ...index.value.pendingDelete].reduce((sum, r) => sum + r.bytes, 0);
    if (state.status === 'fulfilled' && state.value.pendingReceipt &&
        ![...index.value.active, ...index.value.pendingDelete].some(r => r.id === state.value.pendingReceipt!.id)) {
      backupStoredBytes += state.value.pendingReceipt.bytes;
    }
    estimatedMonthlyCny = Math.round((45 + 39 / 12 + backupStoredBytes / 1e9 * 0.00393333 * 30) * 100) / 100;
    if (pendingDeleteCount) warnings.push('RETENTION_RETRY');
    if (estimatedMonthlyCny > 50) warnings.push('BUDGET_EXCEEDED');
    else if (estimatedMonthlyCny >= 45) warnings.push('BUDGET_WATCH');
  }
  let diskUsedPercent: number | null = null;
  if (disk.status === 'fulfilled' && Number.isFinite(disk.value.blocks) && disk.value.blocks > 0 &&
      Number.isFinite(disk.value.bavail) && disk.value.bavail >= 0 && disk.value.bavail <= disk.value.blocks) {
    diskUsedPercent = (disk.value.blocks - disk.value.bavail) / disk.value.blocks * 100;
    if (diskUsedPercent >= 90) warnings.push('DISK_CRITICAL'); else if (diskUsedPercent >= 80) warnings.push('DISK_WARNING');
  } else warnings.push('DISK_UNAVAILABLE');
  return {checkedAt: now.toISOString(), applicationOk, diskUsedPercent, backupAgeHours, backupPhase,
    pendingDeleteCount, backupStoredBytes, estimatedMonthlyCny, warnings: [...new Set(warnings)]};
}

export async function checkBackupSpace(config: BackupConfig, readStats: (directory: string) => Promise<DiskStats> = statfs): Promise<void> {
  await assertRealPath(config.dataDir); await assertRealPath(config.workDir);
  async function sizeOf(directory: string): Promise<number> {
    let bytes = 0;
    for (const name of await readdir(directory)) {
      const file = path.join(directory, name); const stats = await lstat(file);
      if (stats.isSymbolicLink()) throw new OpsError('UNSAFE_DATA_PATH');
      if (stats.isDirectory()) bytes += await sizeOf(file);
      else if (stats.isFile() && stats.nlink === 1) bytes += stats.size;
      else throw new OpsError('UNSAFE_DATA_PATH');
    }
    return bytes;
  }
  const bytes = await sizeOf(config.dataDir), disk = await readStats(config.workDir);
  const total = disk.blocks * disk.bsize, available = disk.bavail * disk.bsize;
  if (!Number.isSafeInteger(total) || total <= 0 || !Number.isSafeInteger(available) || available < 0 || available > total ||
      available < bytes * 2 + 128 * 1024 ** 2 + total * 0.1) throw new OpsError('BACKUP_INSUFFICIENT_STORAGE');
}
