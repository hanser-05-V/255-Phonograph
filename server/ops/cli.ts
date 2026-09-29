import {execFile} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {chmod, lstat, mkdir, open, readFile, rename, rm, statfs, writeFile} from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {promisify} from 'node:util';
import {assertRealPath} from '../runtime/data-directory.js';
import {encryptSnapshot} from './archive.js';
import {runBackup, recoverService} from './backup.js';
import {createCosStore, validateReceipt} from './backup-store.js';
import {readBackupConfig} from './config.js';
import {OpsError, UUID, validTime, type BackupConfig, type BackupState, type ServiceControl} from './contracts.js';
import {checkBackupSpace, collectHealth} from './health.js';
import {restoreBackup} from './restore.js';
import {createSnapshot, verifySnapshot} from './snapshot.js';

export function parseArguments(args: string[]): {command: string; options: Record<string, string>} {
  if (args.length === 1 && args[0] === '--help') return {command: 'help', options: {}};
  const commands: Record<string, string[]> = {backup: ['config'], 'initialize-index': ['config'],
    'recover-service': ['config'], health: ['config'], verify: ['target'], restore: ['config', 'id', 'identity-file', 'target']};
  const command = args[0];
  if (!Object.hasOwn(commands, command ?? '') || args.length !== 1 + commands[command].length * 2) throw new OpsError('INVALID_ARGUMENTS');
  const options: Record<string, string> = {};
  for (let i = 1; i < args.length; i += 2) {
    const key = args[i].slice(2), value = args[i + 1];
    if (!args[i].startsWith('--') || !commands[command].includes(key) || Object.hasOwn(options, key) || !value) throw new OpsError('INVALID_ARGUMENTS');
    if (key === 'id' ? !UUID.test(value) : !path.isAbsolute(value)) throw new OpsError('INVALID_ARGUMENTS');
    options[key] = value;
  }
  return {command, options};
}

export async function writeAtomicJson(file: string, value: unknown): Promise<void> {
  await assertRealPath(path.dirname(file)); await assertRealPath(file, true);
  const temporary = `${file}.${randomUUID()}.tmp`;
  try {
    const handle = await open(temporary, 'wx', 0o600);
    try { await handle.writeFile(JSON.stringify(value)); await handle.sync(); } finally { await handle.close(); }
    await rename(temporary, file);
    if (process.platform === 'linux') {
      const directory = await open(path.dirname(file), 'r');
      try { await directory.sync(); } finally { await directory.close(); }
    }
  }
  finally { await rm(temporary, {force: true}); }
}

export async function readBackupState(config: BackupConfig, allowMissing = false): Promise<BackupState> {
  const file = path.join(config.stateDir, 'state.json');
  try {
    await assertRealPath(file);
    const stats = await lstat(file);
    if (!stats.isFile() || stats.nlink !== 1 || stats.size > 64 * 1024 ||
        (process.platform === 'linux' && (stats.uid !== 0 || (stats.mode & 0o077) !== 0))) throw new Error();
    const state = JSON.parse(await readFile(file, 'utf8')) as BackupState;
    if (!['idle', 'snapshot', 'upload', 'failed', 'complete'].includes(state.phase) ||
        typeof state.applicationRecovered !== 'boolean' || typeof state.applicationWasActive !== 'boolean' ||
        (state.lastSuccessAt !== null && !validTime(state.lastSuccessAt)) ||
        (state.lastErrorCode !== null && !/^[A-Z0-9_]+$/.test(state.lastErrorCode))) throw new Error();
    if (state.latestReceipt) validateReceipt(state.latestReceipt, config.cos.prefix);
    if (state.pendingReceipt) validateReceipt(state.pendingReceipt, config.cos.prefix);
    return state;
  } catch (error) {
    if (allowMissing && (error as NodeJS.ErrnoException).code === 'ENOENT') return {
      phase: 'idle', lastSuccessAt: null, lastErrorCode: null, applicationWasActive: false, applicationRecovered: true,
    };
    throw new OpsError('INVALID_BACKUP_STATE');
  }
}

export function applicationHealthy(config: BackupConfig): Promise<boolean> {
  return new Promise(resolve => {
    const request = http.get(config.applicationOrigin + '/api/health', {headers: {Host: new URL(config.siteOrigin).host}, timeout: 3000}, response => {
      let body = ''; response.setEncoding('utf8');
      response.on('data', chunk => { body += chunk; if (body.length > 1024) request.destroy(); });
      response.on('end', () => { try { resolve(response.statusCode === 200 && JSON.parse(body).ok === true); } catch { resolve(false); } });
      response.on('error', () => resolve(false));
    });
    request.on('timeout', () => request.destroy()); request.on('error', () => resolve(false));
  });
}

const runFile = promisify(execFile);
type CommandRunner = (file: string, args: string[], options: {timeout: number; maxBuffer: number}) => Promise<{stdout: string}>;
export function createServiceControl(config: BackupConfig, execute: CommandRunner = runFile,
  probe: () => Promise<boolean> = () => applicationHealthy(config)): ServiceControl {
  async function command(action: string): Promise<string> {
    try { return (await execute('/usr/bin/systemctl', [action, config.applicationUnit], {timeout: 90_000, maxBuffer: 4096})).stdout.trim(); }
    catch (error) {
      const result = error as {code?: unknown; stdout?: string};
      if (action === 'is-active' && result.code === 3 && ['inactive', 'failed'].includes(result.stdout?.trim() ?? '')) return result.stdout!.trim();
      throw new OpsError('SERVICE_COMMAND_FAILED');
    }
  }
  return {
    async isActive() { return await command('is-active') === 'active'; },
    async enterMaintenance() {
      await assertRealPath(path.dirname(config.maintenanceFile));
      await writeFile(config.maintenanceFile, 'maintenance\n', {flag: 'wx', mode: 0o644});
      await chmod(config.maintenanceFile, 0o644);
    },
    async stop() { await command('stop'); const state = await command('is-active'); if (!['inactive', 'failed'].includes(state)) throw new OpsError('APPLICATION_NOT_STOPPED'); },
    async start() { await command('start'); },
    async waitHealthy(timeoutMs) {
      const deadline = Date.now() + Math.min(timeoutMs, 30_000);
      while (Date.now() < deadline) { if (await probe()) return; await new Promise(resolve => setTimeout(resolve, 250)); }
      throw new OpsError('APPLICATION_UNHEALTHY');
    },
    async leaveMaintenance() { await assertRealPath(config.maintenanceFile, true); await rm(config.maintenanceFile, {force: true}); },
  };
}

export async function runCli(args: string[]): Promise<number> {
  const {command, options} = parseArguments(args);
  if (command === 'help') {
    console.log('Commands: backup, initialize-index, recover-service, health --config ABSOLUTE_FILE; verify --target ABSOLUTE_DIR; restore --config FILE --id UUID --identity-file FILE --target NEW_DIR.\nProduction mutations require root and the documented flock wrapper. Never run concurrent backup writers.');
    return 0;
  }
  if (command === 'verify') { await verifySnapshot(options.target); console.log(JSON.stringify({ok: true})); return 0; }
  if (process.platform !== 'linux' || process.getuid?.() !== 0) throw new OpsError('LINUX_ROOT_REQUIRED');
  const config = await readBackupConfig(options.config);
  for (const dir of [config.workDir, config.stateDir]) {
    await assertRealPath(dir, true); await mkdir(dir, {recursive: true, mode: 0o700});
    const stats = await lstat(dir);
    if (stats.uid !== 0 || (stats.mode & 0o077) !== 0) throw new OpsError('UNSAFE_OPS_PERMISSIONS');
  }
  const service = createServiceControl(config);
  const readState = () => readBackupState(config, command !== 'recover-service');
  const writeState = (state: BackupState) => writeAtomicJson(path.join(config.stateDir, 'state.json'), state);
  if (command === 'recover-service') { await recoverService({service, readState, writeState}); return 0; }
  const store = createCosStore(config, process.env);
  if (command === 'initialize-index') { await store.initializeIndex(); return 0; }
  if (command === 'restore') { await restoreBackup(config, options.id, options['identity-file'], options.target, store); return 0; }
  if (command === 'health') {
    const report = await collectHealth(config, {now: () => new Date(), applicationOk: () => applicationHealthy(config), readState,
      readIndex: () => store.readIndex(), disk: statfs});
    await writeAtomicJson(path.join(config.stateDir, 'health.json'), report); console.log(JSON.stringify(report));
    return report.warnings.length ? 1 : 0;
  }
  await runBackup(config, {service, store, readState, writeState, snapshot: createSnapshot, encrypt: encryptSnapshot,
    now: () => new Date(), randomId: randomUUID, diskSpaceCheck: checkBackupSpace});
  console.log(JSON.stringify({ok: true})); return 0;
}

const entry = process.argv[1];
if (entry && import.meta.url === pathToFileURL(entry).href) {
  runCli(process.argv.slice(2)).then(code => { process.exitCode = code; }).catch(error => {
    console.error(JSON.stringify({error: error instanceof OpsError ? error.code : 'OPERATION_FAILED'})); process.exitCode = 1;
  });
}
