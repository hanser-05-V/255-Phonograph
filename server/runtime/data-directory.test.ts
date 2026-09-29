import {afterEach, expect, it} from 'vitest';
import {mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {resolveAppConfig} from '../config.js';
import {assertEmptyInitializationTarget, assertExistingDataDirectory} from './data-directory.js';

const roots: string[] = [];
afterEach(async () => { for (const root of roots.splice(0)) await rm(root, {recursive: true, force: true}); });
async function fixture() {
  const root = await mkdtemp(path.join(tmpdir(), 'phonograph-directory-'));
  roots.push(root);
  return {root, config: resolveAppConfig({PHONOGRAPH_DEPLOYMENT: 'private-cloud', PHONOGRAPH_DATA_DIR: root,
    PHONOGRAPH_SITE_ORIGIN: 'https://phonograph.invalid', PHONOGRAPH_RELEASE_ID: 'a'.repeat(40)}, process.cwd())};
}
it('fails without creating a missing cloud directory or database', async () => {
  const {root, config} = await fixture();
  await expect(assertExistingDataDirectory(config)).rejects.toThrow();
  expect(await readdir(root)).toEqual([]);
  await expect(assertExistingDataDirectory({...config, dataDir: path.join(root, 'missing')})).rejects.toThrow();
  expect(await readdir(root)).toEqual([]);
});
it('rejects a marker without a database and an invalid database schema', async () => {
  const {root, config} = await fixture();
  await writeFile(path.join(root, '.initialized.json'), '{"format":1}');
  await expect(assertExistingDataDirectory(config)).rejects.toThrow();
  const db = new DatabaseSync(config.databasePath); db.exec('CREATE TABLE unrelated (id TEXT)'); db.close();
  const before = await readFile(config.databasePath);
  await expect(assertExistingDataDirectory(config)).rejects.toThrow();
  expect(await readFile(config.databasePath)).toEqual(before);
});
it('rejects a falsely versioned database whose required columns are missing', async () => {
  const {root, config} = await fixture();
  await writeFile(path.join(root, '.initialized.json'), '{"format":1}');
  const db = new DatabaseSync(config.databasePath);
  db.exec('CREATE TABLE schema_migrations (version INTEGER); INSERT INTO schema_migrations VALUES (1)');
  for (const name of ['songs', 'media_objects', 'pending_uploads', 'admin_config', 'admin_sessions', 'categories', 'tags', 'song_tags', 'pending_media_cleanup']) {
    db.exec(`CREATE TABLE ${name} (id TEXT)`);
  }
  db.close();
  await expect(assertExistingDataDirectory(config)).rejects.toThrow();
});
it('rejects linked data roots and linked ancestors', async () => {
  const {root, config} = await fixture();
  const real = path.join(root, 'real'); await mkdir(real);
  const link = path.join(root, 'linked'); await symlink(real, link, 'junction');
  await expect(assertExistingDataDirectory({...config, dataDir: link})).rejects.toThrow(/link/i);
  await expect(assertEmptyInitializationTarget(path.join(link, 'new'))).rejects.toThrow(/link/i);
});
it('rejects nonempty initialization, filesystem root and repository paths', async () => {
  const {root} = await fixture();
  await expect(assertEmptyInitializationTarget(path.join(root, 'new'))).resolves.toBeUndefined();
  await writeFile(path.join(root, 'keep.txt'), 'keep');
  await expect(assertEmptyInitializationTarget(root)).rejects.toThrow();
  await expect(assertEmptyInitializationTarget(path.parse(root).root)).rejects.toThrow();
  await expect(assertEmptyInitializationTarget(path.join(process.cwd(), 'data'))).rejects.toThrow();
  expect(await readFile(path.join(root, 'keep.txt'), 'utf8')).toBe('keep');
});
