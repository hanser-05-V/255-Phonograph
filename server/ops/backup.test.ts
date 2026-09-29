import {expect, it, vi} from 'vitest';
import {randomUUID} from 'node:crypto';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {runBackup, recoverService, type BackupPorts} from './backup.js';
import type {BackupConfig, BackupIndex, BackupState} from './contracts.js';
function fixture(failure?: string, active = true) {
  const events: string[] = []; const id = randomUUID();
  const config = {workDir: path.join(tmpdir(), 'phonograph-backup-test'), cos: {prefix: `phonograph-backups/${randomUUID()}/`}, releaseId: 'a'.repeat(40)} as BackupConfig;
  let state: BackupState = {phase: 'idle', lastSuccessAt: null, lastErrorCode: null, applicationRecovered: true, applicationWasActive: false};
  let index: BackupIndex = {format: 1, active: [], pendingDelete: []};
  const event = (name: string) => { events.push(name); if (failure === name) throw new Error('sensitive failure details'); };
  const ports: BackupPorts = {
    service: {async isActive() { return active; }, async enterMaintenance() { event('maintenance'); }, async stop() { event('stop'); },
      async start() { event('start'); }, async waitHealthy() { event('healthy'); }, async leaveMaintenance() { event('leave'); }},
    store: {async readIndex() { return index; }, async writeIndex(next) { event('index'); index = structuredClone(next); },
      async upload() { event('upload'); }, async head(r) { event('head'); return {bytes: r.bytes}; }, async download() {}, async delete() { event('prune'); }},
    async snapshot(input) { event('snapshot'); return {directory: input.target, manifest: {format: 1, id, createdAt: '2026-09-29T00:00:00.000Z', releaseId: config.releaseId, schemaVersions: [1], files: []}}; },
    async encrypt() { event('encrypt'); return {bytes: 12, sha256: 'a'.repeat(64)}; },
    async readState() { return structuredClone(state); }, async writeState(next) { state = structuredClone(next); },
    now: () => new Date('2026-09-29T00:00:00.000Z'), randomId: () => id, async diskSpaceCheck() { event('preflight'); },
  };
  return {config, ports, events, state: () => state, setState: (next: BackupState) => { state = next; }, index: () => index};
}
it('resumes healthy application before encrypting or contacting remote storage', async () => {
  const f = fixture(); const receipt = await runBackup(f.config, f.ports);
  expect(f.events.slice(0, 11)).toEqual(['preflight', 'maintenance', 'stop', 'snapshot', 'start', 'healthy', 'leave', 'encrypt', 'upload', 'head', 'index']);
  expect(f.state().lastSuccessAt).toBe(receipt.createdAt); expect(f.state().applicationRecovered).toBe(true);
});
it.each(['preflight', 'stop', 'snapshot', 'start', 'healthy', 'encrypt', 'upload', 'head', 'index'])('handles %s failure without claiming a new success', async failure => {
  const f = fixture(failure); await expect(runBackup(f.config, f.ports)).rejects.toThrow();
  expect(f.state().lastSuccessAt).toBeNull(); expect(f.index().active).toEqual([]);
  expect(JSON.stringify(f.state())).not.toContain('sensitive');
  if (['stop', 'snapshot', 'encrypt', 'upload', 'head', 'index'].includes(failure)) expect(f.state().applicationRecovered).toBe(true);
  if (['start', 'healthy'].includes(failure)) { expect(f.events).not.toContain('leave'); expect(f.events).not.toContain('upload'); }
});
it('does not start a deliberately stopped application', async () => {
  const f = fixture(undefined, false); await expect(runBackup(f.config, f.ports)).rejects.toThrow(); expect(f.events).not.toContain('start');
});
it('compensates a killed backup only from an unrecovered active-service journal', async () => {
  const f = fixture(); f.setState({phase: 'snapshot', applicationWasActive: true, applicationRecovered: false, lastSuccessAt: null, lastErrorCode: null});
  await recoverService(f.ports); expect(f.events).toEqual(['start', 'healthy', 'leave']); expect(f.state().applicationRecovered).toBe(true);
  await recoverService(f.ports); expect(f.events).toHaveLength(3);
});
it('does not overwrite a remote index that lost the last locally confirmed backup', async () => {
  const f = fixture(); const id = randomUUID();
  f.setState({...f.state(), latestReceipt: {id, objectKey: `${f.config.cos.prefix}${id}.tar.age`, createdAt: '2026-09-28T00:00:00.000Z', bytes: 12, sha256: 'a'.repeat(64)}});
  await expect(runBackup(f.config, f.ports)).rejects.toThrow(); expect(f.events).not.toContain('stop'); expect(f.events).not.toContain('index');
});

it('does not remove a pre-existing maintenance marker when maintenance acquisition fails', async () => {
  const f = fixture('maintenance');
  await expect(runBackup(f.config, f.ports)).rejects.toThrow();
  expect(f.events).not.toContain('start'); expect(f.events).not.toContain('leave');
});

it('reports a preflight index failure without pretending the previous backup is current', async () => {
  const f = fixture(); f.ports.store.readIndex = async () => { throw new Error('unavailable'); };
  await expect(runBackup(f.config, f.ports)).rejects.toThrow();
  expect(f.state().phase).toBe('failed'); expect(f.state().lastErrorCode).toBe('BACKUP_FAILED');
  expect(f.events).not.toContain('stop');
});

it('waits for snapshot I/O to settle after timeout before restarting the application', async () => {
  vi.useFakeTimers();
  try {
    const f = fixture(); let finish!: () => void; let observedAbort = false;
    f.ports.snapshot = async input => {
      await new Promise<void>(resolve => {
        finish = resolve; input.signal!.addEventListener('abort', () => { observedAbort = true; }, {once: true});
      });
      f.events.push('snapshot-stopped'); throw new Error('cancelled');
    };
    const pending = runBackup(f.config, f.ports); const result = expect(pending).rejects.toThrow();
    await vi.advanceTimersByTimeAsync(600_000);
    expect(observedAbort).toBe(true); expect(f.events).not.toContain('start');
    finish(); await result;
    expect(f.events.indexOf('start')).toBeGreaterThan(f.events.indexOf('snapshot-stopped'));
  } finally { vi.useRealTimers(); }
});

it('keeps a confirmed new backup successful even when retention deletion must be retried', async () => {
  const f = fixture();
  const old = Array.from({length: 7}, (_, n) => { const id = randomUUID(); return {id, createdAt: `2026-09-0${n + 1}T00:00:00.000Z`,
    objectKey: `${f.config.cos.prefix}${id}.tar.age`, bytes: 12, sha256: 'a'.repeat(64)}; });
  f.ports.store.readIndex = async () => ({format: 1, active: old, pendingDelete: []});
  f.ports.store.delete = async () => { throw new Error('retry'); };
  const receipt = await runBackup(f.config, f.ports);
  expect(f.state().lastSuccessAt).toBe(receipt.createdAt); expect(f.state().lastErrorCode).toBe('RETENTION_RETRY');
  expect(f.index().pendingDelete).toHaveLength(1);
});
