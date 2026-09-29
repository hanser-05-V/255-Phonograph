import COS from 'cos-nodejs-sdk-v5';
import {createReadStream, createWriteStream} from 'node:fs';
import {rm} from 'node:fs/promises';
import {Transform} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {assertRealPath} from '../runtime/data-directory.js';
import {hashFile} from './snapshot.js';
import {OpsError, UUID, SHA256, validTime, MAX_ARCHIVE_BYTES, type BackupConfig, type BackupIndex, type BackupReceipt, type BackupStore} from './contracts.js';

export function validateReceipt(value: unknown, prefix: string): BackupReceipt {
  const receipt = value as BackupReceipt;
  if (!receipt || !UUID.test(receipt.id) || receipt.objectKey !== `${prefix}${receipt.id}.tar.age` ||
      !validTime(receipt.createdAt) || !SHA256.test(receipt.sha256) || !Number.isSafeInteger(receipt.bytes) ||
      receipt.bytes <= 0 || receipt.bytes > MAX_ARCHIVE_BYTES) throw new OpsError('INVALID_RECEIPT');
  return receipt;
}
export function validateIndex(value: unknown, prefix: string): BackupIndex {
  const index = value as BackupIndex;
  if (!index || index.format !== 1 || !Array.isArray(index.active) || !Array.isArray(index.pendingDelete) ||
      index.active.length > 7 || index.pendingDelete.length > 128) throw new OpsError('INVALID_INDEX');
  const ids = new Set<string>();
  for (const receipt of [...index.active, ...index.pendingDelete]) {
    validateReceipt(receipt, prefix);
    if (ids.has(receipt.id.toLowerCase())) throw new OpsError('INVALID_INDEX');
    ids.add(receipt.id.toLowerCase());
  }
  return structuredClone(index);
}
export async function confirmBackup(store: BackupStore, index: BackupIndex, receipt: BackupReceipt): Promise<BackupIndex> {
  if (index.active.some(existing => Date.parse(existing.createdAt) > Date.parse(receipt.createdAt))) {
    throw new OpsError('BACKUP_CLOCK_REGRESSED');
  }
  if ((await store.head(receipt)).bytes !== receipt.bytes) throw new OpsError('REMOTE_SIZE_MISMATCH');
  if ([...index.active, ...index.pendingDelete].some(r => r.id === receipt.id)) throw new OpsError('DUPLICATE_BACKUP');
  const ordered = [receipt, ...index.active].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const next: BackupIndex = {format: 1, active: ordered.slice(0, 7), pendingDelete: [...index.pendingDelete, ...ordered.slice(7)]};
  if (next.pendingDelete.length > 128) throw new OpsError('RETENTION_BACKLOG');
  await store.writeIndex(next); return next;
}
export async function pruneBackups(store: BackupStore, index: BackupIndex): Promise<{index: BackupIndex; pending: boolean}> {
  const remaining: BackupReceipt[] = [];
  for (const receipt of index.pendingDelete) {
    if (index.active.some(r => r.id === receipt.id)) throw new OpsError('INVALID_INDEX');
    try { await store.delete(receipt); } catch { remaining.push(receipt); }
  }
  const next = {...index, pendingDelete: remaining};
  try { await store.writeIndex(next); }
  catch { return {index, pending: true}; }
  return {index: next, pending: remaining.length > 0};
}
export type ObjectClient = Pick<COS, 'getObject' | 'putObject' | 'headObject' | 'deleteObject'>;
export class CosBackupStore implements BackupStore {
  constructor(private readonly config: BackupConfig, private readonly client: ObjectClient) {}
  private params(key: string) { return {Bucket: this.config.cos.bucket, Region: this.config.cos.region, Key: key}; }
  private request<T>(call: (callback: (error: COS.CosError | null, data: T) => void) => void, missingCode = 'COS_OBJECT_MISSING'): Promise<T> {
    return new Promise((resolve, reject) => {
      try { call((error, data) => error ? reject(new OpsError(error.statusCode === 404 ? missingCode : 'COS_REQUEST_FAILED')) : resolve(data)); }
      catch { reject(new OpsError('COS_REQUEST_FAILED')); }
    });
  }
  async readIndex(): Promise<BackupIndex> {
    const data = await this.request<COS.GetObjectResult>(cb => this.client.getObject({
      ...this.params(`${this.config.cos.prefix}index.json`), Range: 'bytes=0-262144',
    }, cb), 'INDEX_MISSING');
    try {
      if (!Buffer.isBuffer(data.Body) || data.Body.length > 262144) throw new Error();
      return validateIndex(JSON.parse(data.Body.toString('utf8')), this.config.cos.prefix);
    } catch { throw new OpsError('INVALID_INDEX'); }
  }
  async writeIndex(index: BackupIndex): Promise<void> {
    const body = JSON.stringify(validateIndex(index, this.config.cos.prefix));
    await this.request<COS.PutObjectResult>(cb => this.client.putObject({...this.params(`${this.config.cos.prefix}index.json`),
      Body: body, ContentLength: Buffer.byteLength(body), ContentType: 'application/json', ACL: 'private'}, cb));
  }
  async upload(file: string, receipt: BackupReceipt): Promise<void> {
    validateReceipt(receipt, this.config.cos.prefix);
    const digest = await hashFile(file);
    if (digest.sha256 !== receipt.sha256 || digest.bytes !== receipt.bytes) throw new OpsError('ARCHIVE_HASH_MISMATCH');
    const source = createReadStream(file);
    // The SDK owns network backpressure; local read failures still reject the operation.
    let readError: unknown;
    source.on('error', error => { readError = error; });
    try {
      await this.request<COS.PutObjectResult>(cb => this.client.putObject({...this.params(receipt.objectKey), Body: source,
        ContentLength: receipt.bytes, ContentType: 'application/octet-stream', ACL: 'private'}, cb));
      if (readError) throw new OpsError('ARCHIVE_READ_FAILED');
    } finally { source.destroy(); }
  }
  async head(receipt: BackupReceipt): Promise<{bytes: number}> {
    validateReceipt(receipt, this.config.cos.prefix);
    const data = await this.request<COS.HeadObjectResult>(cb => this.client.headObject(this.params(receipt.objectKey), cb));
    const bytes = Number(data.headers?.['content-length']);
    if (!Number.isSafeInteger(bytes) || bytes < 0) throw new OpsError('REMOTE_SIZE_MISMATCH');
    return {bytes};
  }
  async download(receipt: BackupReceipt, target: string): Promise<void> {
    validateReceipt(receipt, this.config.cos.prefix); await assertRealPath(target, true);
    const output = createWriteStream(target, {flags: 'wx', mode: 0o600});
    let created = false; output.once('open', () => { created = true; });
    let bytes = 0;
    const bounded = new Transform({transform(chunk: Buffer, _encoding, callback) {
      bytes += chunk.length; callback(bytes > receipt.bytes ? new OpsError('REMOTE_SIZE_MISMATCH') : null, chunk);
    }});
    const writing = pipeline(bounded, output);
    const fetching = this.request<COS.GetObjectResult>(cb => this.client.getObject({...this.params(receipt.objectKey), Output: bounded}, cb));
    try {
      await Promise.all([fetching, writing]);
      const actual = await hashFile(target);
      if (actual.bytes !== receipt.bytes || actual.sha256 !== receipt.sha256) throw new OpsError('ARCHIVE_HASH_MISMATCH');
    } catch (error) {
      bounded.destroy(); output.destroy(); await Promise.allSettled([fetching, writing]);
      if (created) await rm(target, {force: true}); throw error;
    }
  }
  async delete(receipt: BackupReceipt): Promise<void> {
    validateReceipt(receipt, this.config.cos.prefix);
    try { await this.request<COS.DeleteObjectResult>(cb => this.client.deleteObject(this.params(receipt.objectKey), cb)); }
    catch (error) { if (!(error instanceof OpsError) || error.code !== 'COS_OBJECT_MISSING') throw error; }
  }
  async initializeIndex(): Promise<void> {
    try { await this.readIndex(); }
    catch (error) {
      if (error instanceof OpsError && error.code === 'INDEX_MISSING') {
        await this.writeIndex({format: 1, active: [], pendingDelete: []}); return;
      }
      throw error;
    }
    throw new OpsError('INDEX_ALREADY_EXISTS');
  }
}

export function createCosStore(config: BackupConfig, env: NodeJS.ProcessEnv): CosBackupStore {
  const SecretId = env.PHONOGRAPH_COS_SECRET_ID, SecretKey = env.PHONOGRAPH_COS_SECRET_KEY;
  if (!SecretId || !SecretKey) throw new OpsError('COS_CREDENTIALS_MISSING');
  return new CosBackupStore(config, new COS({SecretId, SecretKey, Protocol: 'https:', Timeout: 120_000}));
}
