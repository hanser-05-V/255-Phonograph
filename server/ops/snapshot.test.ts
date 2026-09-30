import {afterEach, expect, it} from 'vitest';
import {mkdtemp, mkdir, readFile, rm, writeFile, link, symlink} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {createTestContext, seedPublishedAudio, type TestContext} from '../test/test-context.js';
import {createSnapshot, verifySnapshot} from './snapshot.js';
import {writeAtomicJson} from './cli.js';

let context: TestContext | undefined; const roots: string[] = [];
afterEach(async () => { await context?.dispose(); context = undefined; for (const root of roots.splice(0)) await rm(root, {recursive: true, force: true}); });
async function fixture() {
  context = await createTestContext();
  const media = await seedPublishedAudio(context, Buffer.from('synthetic-media'));
  await writeFile(path.join(context.dataDir, '.initialized.json'), '{"format":1}');
  const root = await mkdtemp(path.join(tmpdir(), 'phonograph-snapshot-')); roots.push(root);
  return {context, media, input: {dataDir: context.dataDir, target: path.join(root, 'copy'), id: randomUUID(),
    createdAt: '2026-09-29T00:00:00.000Z', releaseId: 'a'.repeat(40)}};
}
it('captures committed WAL records and verifies database references plus file hashes', async () => {
  const {context, input, media} = await fixture();
  context.db.exec("INSERT INTO admin_sessions VALUES ('synthetic-session', '2099-01-01', NULL, 'now')");
  const result = await createSnapshot(input);
  const manifest = await verifySnapshot(result.directory); expect(manifest.id).toBe(input.id);
  const copy = new DatabaseSync(path.join(result.directory, 'library.sqlite'), {readOnly: true});
  expect(copy.prepare('SELECT digest FROM admin_sessions').get()?.digest).toBe('synthetic-session'); copy.close();
  await writeFile(path.join(result.directory, 'media', 'objects', media.storageKey), 'tampered');
  await expect(verifySnapshot(result.directory)).rejects.toThrow(/hash|size/i);
  let failureCode: string | undefined;
  try { await verifySnapshot(result.directory); } catch (error) { failureCode = (error as {code: string}).code; }
  expect(failureCode).toBe('FILE_HASH_OR_SIZE_MISMATCH');
  const stateDir = path.dirname(input.target);
  const state = {phase: 'failed', lastSuccessAt: null,
    lastErrorCode: failureCode, applicationWasActive: true, applicationRecovered: true};
  await writeAtomicJson(path.join(stateDir, 'state.json'), state);
  // cli.test.ts covers reading this error code under Linux root ownership and private modes.
  expect(JSON.parse(await readFile(path.join(stateDir, 'state.json'), 'utf8'))).toEqual(state);
  expect((await readFile(path.join(context.config.mediaDir, 'objects', media.storageKey))).toString()).toBe('synthetic-media');
});
it('rejects missing media and never changes source rows', async () => {
  const {context, input, media} = await fixture();
  await rm(path.join(context.config.mediaDir, 'objects', media.storageKey));
  await expect(createSnapshot(input)).rejects.toThrow();
  expect(context.db.prepare('SELECT id FROM media_objects').get()?.id).toBe(media.id);
});
it('refuses existing targets and hard-linked media', async () => {
  const {context, input, media} = await fixture();
  await mkdir(input.target); await writeFile(path.join(input.target, 'keep'), 'keep');
  await expect(createSnapshot(input)).rejects.toThrow();
  expect(await readFile(path.join(input.target, 'keep'), 'utf8')).toBe('keep');
  await link(path.join(context.config.mediaDir, 'objects', media.storageKey), path.join(context.config.mediaDir, 'objects', randomUUID()));
  await expect(createSnapshot({...input, target: `${input.target}-other`})).rejects.toThrow();
});
it('rejects escaped media keys, schema mismatch and linked media directories', async () => {
  const {context, input} = await fixture();
  context.db.exec("UPDATE media_objects SET storage_key = '../escape'");
  await expect(createSnapshot(input)).rejects.toThrow('MEDIA_REFERENCE_MISMATCH');
  context.db.exec('UPDATE schema_migrations SET version = 9');
  await expect(createSnapshot({...input, target: `${input.target}-schema`})).rejects.toThrow(/schema/i);
  const external = path.join(path.dirname(input.target), 'external'); await mkdir(external);
  const fakeData = path.join(path.dirname(input.target), 'linked'); await mkdir(fakeData);
  await symlink(external, path.join(fakeData, 'media'), 'junction');
  await expect(createSnapshot({...input, dataDir: fakeData, target: `${input.target}-link`})).rejects.toThrow(/link/i);
});
