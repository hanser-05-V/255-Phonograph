import {afterEach, expect, it} from 'vitest';
import {createHash, randomUUID} from 'node:crypto';
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import type {Writable} from 'node:stream';
import {confirmBackup, pruneBackups, validateIndex, CosBackupStore, type ObjectClient} from './backup-store.js';
import type {BackupConfig, BackupIndex, BackupReceipt, BackupStore} from './contracts.js';
const prefix = `phonograph-backups/${randomUUID()}/`;
const roots: string[] = [];
afterEach(async () => { for (const root of roots.splice(0)) await rm(root, {recursive: true, force: true}); });
function receipt(day: number): BackupReceipt { const id = randomUUID(); return {id, createdAt: `2026-09-${String(day).padStart(2, '0')}T00:00:00.000Z`,
  objectKey: `${prefix}${id}.tar.age`, bytes: 123, sha256: 'a'.repeat(64)}; }
function storeFor(initial: BackupIndex) {
  let saved = structuredClone(initial); const deleted: string[] = []; let failIndex = false; let failDelete = false;
  const store: BackupStore = {
    async readIndex() { return structuredClone(saved); },
    async writeIndex(index) { if (failIndex) throw new Error('index failed'); saved = structuredClone(index); },
    async upload() {}, async head(r) { return {bytes: r.bytes}; }, async download() {},
    async delete(r) { if (failDelete) throw new Error('delete failed'); deleted.push(r.id); },
  };
  return {store, deleted, saved: () => saved, failIndex: () => { failIndex = true; }, failDelete: () => { failDelete = true; }};
}
it('records the eighth confirmed backup before pruning only the oldest exact key', async () => {
  const index: BackupIndex = {format: 1, active: Array.from({length: 7}, (_, i) => receipt(i + 1)), pendingDelete: []};
  const fake = storeFor(index); const newest = receipt(8);
  const committed = await confirmBackup(fake.store, index, newest);
  expect(fake.deleted).toEqual([]); expect(fake.saved().active).toHaveLength(7);
  expect(fake.saved().pendingDelete[0].id).toBe(index.active[0].id);
  await pruneBackups(fake.store, committed);
  expect(fake.deleted).toEqual([index.active[0].id]); expect(fake.saved().pendingDelete).toEqual([]);
});
it('preserves the old successful set when head or index commit fails', async () => {
  const index: BackupIndex = {format: 1, active: [receipt(1)], pendingDelete: []}; const fake = storeFor(index);
  fake.store.head = async () => ({bytes: 1});
  await expect(confirmBackup(fake.store, index, receipt(2))).rejects.toThrow();
  fake.store.head = async r => ({bytes: r.bytes}); fake.failIndex();
  await expect(confirmBackup(fake.store, index, receipt(2))).rejects.toThrow();
  expect(fake.saved()).toEqual(index); expect(fake.deleted).toEqual([]);
});
it('refuses a regressed clock instead of immediately pruning the just-created backup', async () => {
  const index: BackupIndex = {format: 1, active: Array.from({length: 7}, (_, i) => receipt(i + 10)), pendingDelete: []};
  const fake = storeFor(index);
  await expect(confirmBackup(fake.store, index, receipt(1))).rejects.toThrow('BACKUP_CLOCK_REGRESSED');
  expect(fake.saved()).toEqual(index); expect(fake.deleted).toEqual([]);
});
it('retains deletion retry records and prevents active objects from being deleted', async () => {
  const old = receipt(1), active = receipt(2);
  const index: BackupIndex = {format: 1, active: [active], pendingDelete: [old]}; const fake = storeFor(index); fake.failDelete();
  expect((await pruneBackups(fake.store, index)).pending).toBe(true);
  expect(fake.saved().pendingDelete).toEqual([old]); expect(fake.deleted).toEqual([]);
  expect(() => validateIndex({...index, pendingDelete: [active]}, prefix)).toThrow();
});
it('rejects foreign keys, duplicate IDs, bad hashes and oversized index lists', () => {
  const good = receipt(1); const index = {format: 1, active: [good], pendingDelete: []};
  expect(validateIndex(index, prefix)).toEqual(index);
  for (const patch of [{objectKey: `elsewhere/${good.id}.tar.age`}, {sha256: 'etag'}, {bytes: -1}, {createdAt: 'invalid'}]) {
    expect(() => validateIndex({...index, active: [{...good, ...patch}]}, prefix)).toThrow();
  }
  expect(() => validateIndex({...index, active: [good, good]}, prefix)).toThrow();
  expect(() => validateIndex({...index, active: Array.from({length: 8}, () => receipt(2))}, prefix)).toThrow();
});
it.each(['ap-shanghai', 'ap-chengdu'] as const)('requires explicit index initialization in %s and never treats forbidden as empty', async region => {
  let status = 404; let stored = '';
  const requests: {Bucket: string; Region: string; Key: string}[] = [];
  const client = {
    getObject(p: {Bucket: string; Region: string; Key: string}, cb: (err: unknown, data?: unknown) => void) { requests.push(p); cb({statusCode: status, message: 'secret'}); },
    putObject(p: {Bucket: string; Region: string; Key: string; Body: string}, cb: (err: unknown, data?: unknown) => void) { requests.push(p); stored = p.Body; cb(null, {}); },
  } as unknown as ObjectClient;
  const store = new CosBackupStore({cos: {bucket: 'test-1234567890', region, prefix}} as BackupConfig, client);
  await expect(store.readIndex()).rejects.toThrow('INDEX_MISSING');
  await store.initializeIndex(); expect(JSON.parse(stored)).toEqual({format: 1, active: [], pendingDelete: []});
  status = 403; await expect(store.initializeIndex()).rejects.toThrow('COS_REQUEST_FAILED');
  expect(requests).toHaveLength(4);
  for (const request of requests) expect(request).toMatchObject({Bucket: 'test-1234567890', Region: region, Key: `${prefix}index.json`});
});

it.each(['ap-shanghai', 'ap-chengdu'] as const)('streams exact private objects in %s, verifies downloaded hashes and preserves existing targets', async region => {
  const root = await mkdtemp(path.join(tmpdir(), 'phonograph-cos-')); roots.push(root);
  const body = Buffer.from('synthetic ciphertext'); const objects = new Map<string, Buffer>();
  let failDownload = false;
  const requests: {Bucket: string; Region: string; Key: string}[] = [];
  const client = {
    putObject(p: {Bucket: string; Region: string; Key: string; Body: AsyncIterable<Uint8Array>; ACL: string; ContentLength: number}, cb: (err: unknown, data?: unknown) => void) {
      requests.push(p);
      void (async () => {
        const chunks: Buffer[] = []; for await (const chunk of p.Body) chunks.push(Buffer.from(chunk));
        const bytes = Buffer.concat(chunks);
        if (p.ACL !== 'private' || p.ContentLength !== bytes.length) throw new Error('Unsafe upload contract');
        objects.set(p.Key, bytes); cb(null, {});
      })().catch(cb);
    },
    headObject(p: {Bucket: string; Region: string; Key: string}, cb: (err: unknown, data?: unknown) => void) {
      requests.push(p);
      cb(null, {headers: {'content-length': String(objects.get(p.Key)?.length ?? 0)}, ETag: 'not-a-sha256'});
    },
    getObject(p: {Bucket: string; Region: string; Key: string; Output: Writable}, cb: (err: unknown, data?: unknown) => void) {
      requests.push(p);
      if (failDownload) { p.Output.destroy(new Error('partial')); cb({statusCode: 500}); return; }
      p.Output.end(objects.get(p.Key)); cb(null, {});
    },
    deleteObject(p: {Bucket: string; Region: string; Key: string}, cb: (err: unknown, data?: unknown) => void) { requests.push(p); objects.delete(p.Key); cb(null, {}); },
  } as unknown as ObjectClient;
  const store = new CosBackupStore({cos: {bucket: 'test-1234567890', region, prefix}} as BackupConfig, client);
  const r = {...receipt(1), bytes: body.length, sha256: createHash('sha256').update(body).digest('hex')};
  const source = path.join(root, 'source.age'); await writeFile(source, body);
  await store.upload(source, r); expect(await store.head(r)).toEqual({bytes: body.length});
  const target = path.join(root, 'restored.age'); await store.download(r, target); expect(await readFile(target)).toEqual(body);
  await expect(store.download(r, target)).rejects.toThrow(); expect(await readFile(target)).toEqual(body);
  objects.set(r.objectKey, Buffer.from('same size wrong data!'));
  await expect(store.download(r, path.join(root, 'corrupted.age'))).rejects.toThrow();
  failDownload = true; await expect(store.download(r, path.join(root, 'partial.age'))).rejects.toThrow();
  await expect(store.delete({...r, objectKey: 'foreign/key'})).rejects.toThrow('INVALID_RECEIPT');
  expect(objects.has(r.objectKey)).toBe(true); await store.delete(r); expect(objects.has(r.objectKey)).toBe(false);
  expect(requests.length).toBeGreaterThanOrEqual(6);
  for (const request of requests) expect(request).toMatchObject({Bucket: 'test-1234567890', Region: region, Key: r.objectKey});
});
