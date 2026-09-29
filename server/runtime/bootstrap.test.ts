import {afterEach, expect, it} from 'vitest';
import {mkdtemp, readFile, readdir, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {resolveAppConfig} from '../config.js';
import {prepareRuntime} from './bootstrap.js';

const roots: string[] = [];
afterEach(async () => { for (const root of roots.splice(0)) await rm(root, {recursive: true, force: true}); });
it('initializes only explicitly and preserves records and bytes on restart', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'phonograph-bootstrap-')); roots.push(root);
  const config = resolveAppConfig({PHONOGRAPH_DEPLOYMENT: 'private-cloud', PHONOGRAPH_DATA_DIR: root,
    PHONOGRAPH_SITE_ORIGIN: 'https://phonograph.invalid', PHONOGRAPH_RELEASE_ID: 'a'.repeat(40)}, process.cwd());
  await expect(prepareRuntime(config, {initialize: false})).rejects.toThrow();
  expect(await readdir(root)).toEqual([]);
  await prepareRuntime(config, {initialize: true});
  expect(JSON.parse(await readFile(path.join(root, '.initialized.json'), 'utf8'))).toEqual({format: 1});
  const db = new DatabaseSync(config.databasePath);
  db.prepare("INSERT INTO admin_config VALUES (1, 'synthetic-hash', 'now', 'now')").run();
  const songs = db.prepare('SELECT id FROM songs ORDER BY id').all(); db.close();
  const bytes = await readFile(config.databasePath);
  await expect(prepareRuntime(config, {initialize: true})).rejects.toThrow();
  await prepareRuntime(config, {initialize: false});
  expect(await readFile(config.databasePath)).toEqual(bytes);
  const check = new DatabaseSync(config.databasePath, {readOnly: true});
  expect(check.prepare('SELECT id FROM songs ORDER BY id').all()).toEqual(songs);
  expect(check.prepare('SELECT password_hash FROM admin_config').get()?.password_hash).toBe('synthetic-hash'); check.close();
});
