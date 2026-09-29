import {expect, it} from 'vitest';
import {collectHealth, checkBackupSpace, type HealthPorts} from './health.js';
import {mkdtemp, mkdir, rm, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import type {BackupConfig, BackupIndex, BackupState} from './contracts.js';
const config = {dataDir: 'test'} as BackupConfig;
const state: BackupState = {phase: 'complete', lastSuccessAt: '2026-09-28T00:00:00.000Z', lastErrorCode: null, applicationRecovered: true, applicationWasActive: true};
const ports: HealthPorts = {
  now: () => new Date('2026-09-29T01:00:00.000Z'), async applicationOk() { return true; }, async readState() { return state; },
  async readIndex() { return {format: 1, active: [{bytes: 10 * 1000 ** 3}], pendingDelete: []} as BackupIndex; },
  async disk() { return {blocks: 100, bavail: 20, bsize: 1024}; },
};
it('warns on overdue backups and 80 percent disk usage and counts total backup storage', async () => {
  const health = await collectHealth(config, ports);
  expect(health.backupAgeHours).toBe(25); expect(health.backupStoredBytes).toBe(10_000_000_000);
  expect(health.estimatedMonthlyCny).toBeCloseTo(49.43, 2);
  expect(health.warnings).toEqual(expect.arrayContaining(['BACKUP_OVERDUE', 'DISK_WARNING', 'BUDGET_WATCH']));
});
it('fails visibly for missing state, unavailable storage and application failure', async () => {
  const health = await collectHealth(config, {...ports, async applicationOk() { return false; }, async readState() { throw new Error('secret'); },
    async readIndex() { throw new Error('secret'); }, async disk() { throw new Error('secret'); }});
  expect(health.warnings).toEqual(expect.arrayContaining(['APPLICATION_UNHEALTHY', 'STATE_UNAVAILABLE', 'INDEX_UNAVAILABLE', 'DISK_UNAVAILABLE']));
  expect(JSON.stringify(health)).not.toContain('secret');
});
it('reports critical disk, budget overrun and pending deletions', async () => {
  const health = await collectHealth(config, {...ports, async disk() { return {blocks: 100, bavail: 10, bsize: 1024}; },
    async readIndex() { return {format: 1, active: [], pendingDelete: [{bytes: 70 * 1000 ** 3}]} as BackupIndex; }});
  expect(health.warnings).toEqual(expect.arrayContaining(['DISK_CRITICAL', 'BUDGET_EXCEEDED', 'RETENTION_RETRY']));
});
it('refuses a backup before maintenance when two copies plus reserve cannot fit', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'phonograph-space-'));
  try {
    const sample = {dataDir: path.join(root, 'data'), workDir: path.join(root, 'work')} as BackupConfig;
    await mkdir(sample.dataDir); await mkdir(sample.workDir); await writeFile(path.join(sample.dataDir, 'synthetic'), Buffer.alloc(1024));
    await expect(checkBackupSpace(sample, async () => ({blocks: 1000, bavail: 100, bsize: 1024 * 1024})))
      .rejects.toThrow('BACKUP_INSUFFICIENT_STORAGE');
    await expect(checkBackupSpace(sample, async () => ({blocks: 1000, bavail: 500, bsize: 1024 * 1024}))).resolves.toBeUndefined();
  } finally { await rm(root, {recursive: true, force: true}); }
});
