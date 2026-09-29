import {lstat, readFile} from 'node:fs/promises';
import path from 'node:path';
import {resolveAppConfig} from '../config.js';
import {assertOutsideCode, assertRealPath, isWithin} from '../runtime/data-directory.js';
import {OpsError, UUID, type BackupConfig} from './contracts.js';

export function validateBackupConfig(value: unknown): BackupConfig {
  try {
    if (!value || typeof value !== 'object' || JSON.stringify(value).includes('AGE-SECRET-KEY')) throw new Error();
    const config = value as BackupConfig;
    const keys = ['dataDir', 'workDir', 'stateDir', 'maintenanceFile', 'applicationUnit', 'applicationOrigin',
      'siteOrigin', 'releaseId', 'ageRecipientsFile', 'cos'];
    if (Object.keys(config).some(key => !keys.includes(key))) throw new Error();
    for (const field of ['dataDir', 'workDir', 'stateDir', 'maintenanceFile', 'ageRecipientsFile'] as const) {
      if (typeof config[field] !== 'string' || !path.isAbsolute(config[field]) || path.resolve(config[field]) !== config[field]) throw new Error();
      assertOutsideCode(config[field]);
    }
    const dirs = [config.dataDir, config.workDir, config.stateDir];
    for (let i = 0; i < dirs.length; i++) for (let j = i + 1; j < dirs.length; j++) {
      if (isWithin(dirs[i], dirs[j]) || isWithin(dirs[j], dirs[i])) throw new Error();
    }
    if (dirs.some(dir => isWithin(dir, config.maintenanceFile) || isWithin(dir, config.ageRecipientsFile))) throw new Error();
    if (config.applicationUnit !== 'phonograph.service' || config.applicationOrigin !== 'http://127.0.0.1:3001') throw new Error();
    resolveAppConfig({PHONOGRAPH_DEPLOYMENT: 'private-cloud', PHONOGRAPH_DATA_DIR: config.dataDir,
      PHONOGRAPH_SITE_ORIGIN: config.siteOrigin, PHONOGRAPH_RELEASE_ID: config.releaseId}, process.cwd());
    if (!config.cos || Object.keys(config.cos).some(k => !['bucket', 'region', 'prefix'].includes(k)) ||
        !/^[a-z0-9][a-z0-9-]{1,61}-\d+$/.test(config.cos.bucket) || config.cos.region !== 'ap-shanghai' ||
        !config.cos.prefix.startsWith('phonograph-backups/') || !config.cos.prefix.endsWith('/') ||
        !UUID.test(config.cos.prefix.slice(19, -1))) throw new Error();
    return structuredClone(config);
  } catch { throw new OpsError('INVALID_BACKUP_CONFIG'); }
}

export async function readBackupConfig(file: string): Promise<BackupConfig> {
  try {
    await assertRealPath(file);
    if (!(await lstat(file)).isFile() || (await lstat(file)).size > 64 * 1024) throw new Error();
    const config = validateBackupConfig(JSON.parse(await readFile(file, 'utf8')));
    for (const dir of [config.dataDir, config.workDir, config.stateDir, config.maintenanceFile]) await assertRealPath(dir, true);
    await assertRealPath(config.ageRecipientsFile);
    const stat = await lstat(config.ageRecipientsFile);
    if (!stat.isFile() || stat.size > 64 * 1024 || stat.nlink !== 1) throw new Error();
    const recipients = await readFile(config.ageRecipientsFile, 'utf8');
    const lines = recipients.split(/\r?\n/).map(line => line.trim()).filter(line => line && !line.startsWith('#'));
    if (!lines.length || lines.some(line => !/^age1[023456789acdefghjklmnpqrstuvwxyz]{58}$/.test(line))) throw new Error();
    return config;
  } catch { throw new OpsError('INVALID_BACKUP_CONFIG'); }
}
