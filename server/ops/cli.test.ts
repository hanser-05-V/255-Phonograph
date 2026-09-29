import {expect, it} from 'vitest';
import {mkdtemp, mkdir, readFile, rm, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {parseArguments, readBackupState, writeAtomicJson, createServiceControl} from './cli.js';
import type {BackupConfig} from './contracts.js';
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
    expect(await readBackupState(config)).toEqual(state);
    await writeFile(path.join(root, 'state.json'), JSON.stringify({...state, applicationWasActive: 'yes'}));
    await expect(readBackupState(config)).rejects.toThrow('INVALID_BACKUP_STATE');
    expect(await readFile(path.join(root, 'state.json'), 'utf8')).toContain('yes');
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
  ['backup', '--config', '/x', '--config', '/y'], ['verify', '--target', 'relative'], ['restore', '--config', '/x']])('rejects ambiguous or incomplete arguments %#', args => {
  expect(() => parseArguments(args)).toThrow();
});
