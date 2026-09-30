import {expect, it} from 'vitest';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {mkdtemp, mkdir, rm, writeFile, symlink} from 'node:fs/promises';
import {readBackupConfig, validateBackupConfig} from './config.js';
const root = path.join(tmpdir(), 'phonograph-config');
const config = {
  dataDir: path.join(root, 'data'), workDir: path.join(root, 'work'), stateDir: path.join(root, 'state'),
  maintenanceFile: path.join(root, 'run', 'maintenance'), ageRecipientsFile: path.join(root, 'config', 'recipients'),
  applicationUnit: 'phonograph.service', applicationOrigin: 'http://127.0.0.1:3001',
  siteOrigin: 'https://phonograph.invalid', releaseId: 'a'.repeat(40),
  cos: {bucket: 'test-backups-1234567890', region: 'ap-shanghai', prefix: 'phonograph-backups/00000000-0000-4000-8000-000000000000/'},
};
it('accepts separated absolute paths and a dedicated object prefix', () => { expect(validateBackupConfig(config)).toEqual(config); });
it.each(['ap-shanghai', 'ap-chengdu'])('accepts the approved backup region %s', region => {
  const sample = {...config, cos: {...config.cos, region}};
  expect(validateBackupConfig(sample)).toEqual(sample);
});
it.each(['', 'ap-beijing', 'ap-chengdu-2', 'AP-CHENGDU', 'ap-chengdu ', null, 123])('rejects unsupported region %s', region => {
  expect(() => validateBackupConfig({...config, cos: {...config.cos, region}})).toThrow('INVALID_BACKUP_CONFIG');
});
it.each([
  {workDir: config.dataDir}, {stateDir: path.join(config.workDir, 'nested')}, {dataDir: 'relative'},
  {applicationUnit: 'other.service'}, {applicationOrigin: 'http://example.com'}, {siteOrigin: 'http://phonograph.invalid'},
  {releaseId: 'main'}, {workDir: path.join(process.cwd(), 'backups')},
  {cos: {...config.cos, prefix: '../escape/'}}, {cos: {...config.cos, region: 'other'}},
  {secret: 'AGE-SECRET-KEY-should-never-be-here'},
])('rejects unsafe configuration %#', patch => { expect(() => validateBackupConfig({...config, ...patch})).toThrow(); });

it('loads isolated public configuration and rejects secret keys or linked operational paths', async () => {
  const temporary = await mkdtemp(path.join(tmpdir(), 'phonograph-config-read-'));
  try {
    const sample = {...config, cos: {...config.cos, region: 'ap-chengdu'}, dataDir: path.join(temporary, 'data'), workDir: path.join(temporary, 'work'), stateDir: path.join(temporary, 'state'),
      maintenanceFile: path.join(temporary, 'run', 'maintenance'), ageRecipientsFile: path.join(temporary, 'recipients')};
    const file = path.join(temporary, 'backup.json');
    await writeFile(file, JSON.stringify(sample), {mode: 0o600});
    await writeFile(sample.ageRecipientsFile, `age1${'q'.repeat(58)}\n`, {mode: 0o600});
    expect(await readBackupConfig(file)).toEqual(sample);
    await writeFile(sample.ageRecipientsFile, 'AGE-SECRET-KEY-SYNTHETIC');
    await expect(readBackupConfig(file)).rejects.toThrow('INVALID_BACKUP_CONFIG');
    await writeFile(sample.ageRecipientsFile, `age1${'q'.repeat(58)}\n`);
    const actual = path.join(temporary, 'actual'); await mkdir(actual);
    await symlink(actual, sample.workDir, 'junction');
    await expect(readBackupConfig(file)).rejects.toThrow('INVALID_BACKUP_CONFIG');
  } finally { await rm(temporary, {recursive: true, force: true}); }
});
