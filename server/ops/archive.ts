import {Readable, Writable, Transform} from 'node:stream';
import {spawn} from 'node:child_process';
import {pipeline} from 'node:stream/promises';
import {createReadStream, createWriteStream} from 'node:fs';
import {lstat, mkdir, mkdtemp, open, rename, rm} from 'node:fs/promises';
import path from 'node:path';
import * as tar from 'tar';
import {assertRealPath} from '../runtime/data-directory.js';
import {MAX_ARCHIVE_BYTES, OpsError} from './contracts.js';
import {hashFile, validBackupPath, verifySnapshot} from './snapshot.js';
export type AgeRunner = (source: Readable, destination: Writable, args: string[], signal?: AbortSignal) => Promise<void>;

function boundedStream(): Transform {
  let bytes = 0;
  return new Transform({transform(chunk: Buffer, _encoding, done) {
    bytes += chunk.length;
    done(bytes > MAX_ARCHIVE_BYTES ? new OpsError('ARCHIVE_TOO_LARGE') : null, chunk);
  }});
}

export async function runAge(source: Readable, destination: Writable, args: string[], signal?: AbortSignal, launch: typeof spawn = spawn): Promise<void> {
  const child = launch('age', args, {shell: false, stdio: ['pipe', 'pipe', 'pipe']});
  const stop = () => { child.kill('SIGKILL'); };
  const exited = new Promise<void>((resolve, reject) => {
    child.once('error', () => reject(new OpsError('AGE_PROCESS_FAILED')));
    child.once('close', code => code === 0 ? resolve() : reject(new OpsError('AGE_PROCESS_FAILED')));
  });
  // Consume diagnostics without forwarding potentially sensitive paths or key material.
  child.stderr?.resume();
  signal?.addEventListener('abort', stop, {once: true});
  if (signal?.aborted) stop();
  if (!child.stdin || !child.stdout) { stop(); await exited.catch(() => {}); throw new OpsError('AGE_PROCESS_FAILED'); }
  const operations = [exited, pipeline(source, child.stdin, {signal}),
    pipeline(child.stdout, boundedStream(), destination, {signal})];
  try { await Promise.all(operations); }
  catch {
    stop(); source.destroy(); destination.destroy(); child.stdin.destroy(); child.stdout.destroy();
    await Promise.allSettled(operations);
    throw new OpsError(signal?.aborted ? 'ARCHIVE_ABORTED' : 'AGE_PROCESS_FAILED');
  } finally { signal?.removeEventListener('abort', stop); }
}

async function requireMissing(target: string): Promise<void> {
  await assertRealPath(target, true);
  try { await lstat(target); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return; throw error; }
  throw new OpsError('TARGET_EXISTS');
}

export function createArchiveTools(runner: AgeRunner = runAge) {
  return {
    async encryptSnapshot(directory: string, recipientsFile: string, output: string, signal?: AbortSignal): Promise<{bytes: number; sha256: string}> {
      signal?.throwIfAborted();
      const manifest = await verifySnapshot(directory);
      await requireMissing(output);
      const destination = createWriteStream(output, {flags: 'wx', mode: 0o600});
      let created = false; destination.once('open', () => { created = true; });
      try {
        const source = tar.c({cwd: directory, portable: true, noPax: true, strict: true}, ['manifest.json', ...manifest.files.map(file => file.path)]);
        await runner(source as unknown as Readable, destination, ['--encrypt', '--recipients-file', recipientsFile], signal);
        const result = await hashFile(output, signal);
        if (result.bytes > MAX_ARCHIVE_BYTES || result.bytes === 0) throw new OpsError('ARCHIVE_TOO_LARGE');
        return result;
      } catch (error) {
        destination.destroy();
        if (!destination.closed) await new Promise<void>(resolve => destination.once('close', resolve));
        if (created) await rm(output, {force: true});
        throw error;
      }
    },
    async decryptArchive(archive: string, identityFile: string, target: string, signal?: AbortSignal): Promise<void> {
      signal?.throwIfAborted();
      await requireMissing(target);
      await assertRealPath(archive);
      const archiveStats = await lstat(archive);
      if (!archiveStats.isFile() || archiveStats.nlink !== 1 || archiveStats.size > MAX_ARCHIVE_BYTES) throw new OpsError('INVALID_ARCHIVE');
      const stage = await mkdtemp(path.join(path.dirname(target), '.phonograph-decrypt-'));
      const plaintext = path.join(stage, 'archive.tar'); const extracted = path.join(stage, 'data');
      try {
        await runner(createReadStream(archive), createWriteStream(plaintext, {flags: 'wx', mode: 0o600}),
          ['--decrypt', '--identity', identityFile], signal);
        // Our format is uncompressed USTAR; disable auto-detection of compressed tar bombs.
        const headerFile = await open(plaintext, 'r');
        try {
          const header = Buffer.alloc(512); const {bytesRead} = await headerFile.read(header, 0, 512, 0);
          if (bytesRead !== 512 || header.toString('ascii', 257, 263) !== 'ustar\0') throw new OpsError('UNSUPPORTED_ARCHIVE_FORMAT');
        } finally { await headerFile.close(); }
        const names = new Set<string>(); let declared = 0;
        const parser = tar.t({strict: true, onReadEntry(entry) {
          const name = entry.path; declared += entry.size;
          if (entry.type !== 'File' || (!validBackupPath(name) && name !== 'manifest.json') ||
              names.has(name.toLowerCase()) || !Number.isSafeInteger(entry.size) || entry.size < 0 || declared > MAX_ARCHIVE_BYTES ||
              names.size >= 100_001) { parser.abort(new OpsError('UNSAFE_ARCHIVE')); return; }
          names.add(name.toLowerCase());
        }});
        await pipeline(createReadStream(plaintext), parser as unknown as Writable, {signal});
        if (!names.has('manifest.json')) throw new OpsError('UNSAFE_ARCHIVE');
        signal?.throwIfAborted();
        await mkdir(extracted, {mode: 0o700});
        await tar.x({file: plaintext, cwd: extracted, strict: true, preservePaths: false, noChmod: true,
          filter: name => names.has(name.toLowerCase())});
        await verifySnapshot(extracted);
        signal?.throwIfAborted(); await requireMissing(target); await rename(extracted, target);
      } finally { await rm(stage, {recursive: true, force: true}); }
    },
  };
}
export const {encryptSnapshot, decryptArchive} = createArchiveTools();
