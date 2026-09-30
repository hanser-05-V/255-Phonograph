import {afterEach, expect, it, vi} from 'vitest';
import {lstat, mkdtemp, readFile, readdir, rm, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {parseArguments, readBackupState, writeAtomicJson, createServiceControl} from './cli.js';
import type {BackupConfig} from './contracts.js';

// Keep real filesystem operations; only the exact fixture's POSIX metadata is simulated.
const stateMetadata = vi.hoisted(() => ({file: '', uid: 0, mode: undefined as number | undefined}));
vi.mock('node:fs/promises', async importOriginal => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return {...actual, async lstat(...args: Parameters<typeof actual.lstat>) {
    const stats = await actual.lstat(...args);
    if (args[0] === stateMetadata.file) {
      Object.defineProperty(stats, 'uid', {value: stateMetadata.uid});
      if (stateMetadata.mode !== undefined) {
        Object.defineProperty(stats, 'mode', {value: (Number(stats.mode) & ~0o777) | stateMetadata.mode});
      }
    }
    return stats;
  }};
});
afterEach(() => { stateMetadata.file = ''; stateMetadata.uid = 0; stateMetadata.mode = undefined; vi.unstubAllGlobals(); });

async function readOnLinux(config: BackupConfig) {
  vi.stubGlobal('process', Object.create(process, {platform: {value: 'linux'}}));
  try { return await readBackupState(config); }
  finally { vi.unstubAllGlobals(); }
}
it('requires exact subcommands and complete named arguments', () => {
  expect(parseArguments(['backup', '--config', '/etc/backup.json'])).toEqual({command: 'backup', options: {config: '/etc/backup.json'}});
  expect(parseArguments(['--help']).command).toBe('help');
  expect(parseArguments(['verify', '--target', '/isolated'])).toEqual({command: 'verify', options: {target: '/isolated'}});
  expect(parseArguments(['restore', '--config', '/etc/backup.json', '--id', '00000000-0000-4000-8000-000000000000', '--identity-file', '/keys/owner', '--target', '/new']).command).toBe('restore');
});

it('requires explicit valid recovery state and writes atomic state without leaking partial files', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'phonograph-cli-'));
  try {
    const config = {stateDir: root, cos: {prefix: 'phonograph-backups/00000000-0000-4000-8000-000000000000/'}} as BackupConfig;
    await expect(readBackupState(config)).rejects.toThrow('INVALID_BACKUP_STATE');
    const state = await readBackupState(config, true); expect(state.applicationWasActive).toBe(false);
    await writeAtomicJson(path.join(root, 'state.json'), state);
    expect(await readdir(root)).toEqual(['state.json']);
    if (process.platform === 'linux') {
      const stats = await lstat(path.join(root, 'state.json'));
      expect(stats.mode & 0o077).toBe(0);
      if (stats.uid !== 0) await expect(readBackupState(config)).rejects.toThrow('INVALID_BACKUP_STATE');
    }
    stateMetadata.file = path.join(root, 'state.json'); stateMetadata.uid = 0; stateMetadata.mode = 0o600;
    expect(await readOnLinux(config)).toEqual(state);
    await writeFile(path.join(root, 'state.json'), JSON.stringify({...state, applicationWasActive: 'yes'}));
    await expect(readOnLinux(config)).rejects.toThrow('INVALID_BACKUP_STATE');
    expect(await readFile(path.join(root, 'state.json'), 'utf8')).toContain('yes');
  } finally { await rm(root, {recursive: true, force: true}); }
});

it.each([
  {label: 'root-owned private state', uid: 0, mode: 0o600, accepted: true},
  {label: 'non-root owner', uid: 1000, mode: 0o600, accepted: false},
  {label: 'group read', uid: 0, mode: 0o640, accepted: false},
  {label: 'group write', uid: 0, mode: 0o620, accepted: false},
  {label: 'group execute', uid: 0, mode: 0o610, accepted: false},
  {label: 'other read', uid: 0, mode: 0o604, accepted: false},
  {label: 'other write', uid: 0, mode: 0o602, accepted: false},
  {label: 'other execute', uid: 0, mode: 0o601, accepted: false},
])('enforces Linux recovery-state permissions: $label', async ({uid, mode, accepted}) => {
  const root = await mkdtemp(path.join(tmpdir(), 'phonograph-state-permissions-'));
  try {
    const file = path.join(root, 'state.json');
    const state = {phase: 'failed', lastSuccessAt: null, lastErrorCode: 'FILE_HASH_OR_SIZE_MISMATCH',
      applicationWasActive: true, applicationRecovered: true};
    await writeAtomicJson(file, state);
    stateMetadata.file = file; stateMetadata.uid = uid; stateMetadata.mode = mode;
    const result = readOnLinux({stateDir: root} as BackupConfig);
    if (accepted) expect(await result).toEqual(state);
    else await expect(result).rejects.toThrow('INVALID_BACKUP_STATE');
  } finally { await rm(root, {recursive: true, force: true}); }
});

it('uses the fixed service command and verifies shutdown before allowing a snapshot', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'phonograph-service-'));
  try {
    let active = true; let ignoreStop = false;
    const commands: string[][] = [];
    const config = {applicationUnit: 'phonograph.service', maintenanceFile: path.join(root, 'maintenance')} as BackupConfig;
    const service = createServiceControl(config, async (file, args) => {
      commands.push([file, ...args]);
      if (args[0] === 'is-active') {
        if (!active) throw {code: 3, stdout: 'inactive\n'};
        return {stdout: 'active\n'};
      }
      if (args[0] === 'stop' && !ignoreStop) active = false;
      if (args[0] === 'start') active = true;
      return {stdout: ''};
    }, async () => true);
    expect(await service.isActive()).toBe(true);
    await service.enterMaintenance(); expect(await readFile(config.maintenanceFile, 'utf8')).toContain('maintenance');
    await expect(service.enterMaintenance()).rejects.toThrow();
    await service.stop(); expect(active).toBe(false);
    await service.start(); await service.waitHealthy(1000); await service.leaveMaintenance();
    await expect(readFile(config.maintenanceFile)).rejects.toThrow();
    expect(commands.every(command => command[0] === '/usr/bin/systemctl' && command[2] === 'phonograph.service')).toBe(true);
    ignoreStop = true; await expect(service.stop()).rejects.toThrow('APPLICATION_NOT_STOPPED');
  } finally { await rm(root, {recursive: true, force: true}); }
});
it.each([[], ['unknown'], ['backup'], ['backup', '--config'], ['backup', '--config', '/x', '--force', 'yes'],
  ['backup', '--config', '/x', '--config', '/y'], ['verify', '--target', 'relative'], ['restore', '--config', '/x']]
  .map(args => ({args})))('rejects ambiguous or incomplete arguments %#', ({args}) => {
  expect(() => parseArguments(args)).toThrow('INVALID_ARGUMENTS');
});
