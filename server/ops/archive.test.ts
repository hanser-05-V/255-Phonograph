import {afterEach, expect, it} from 'vitest';
import {mkdtemp, writeFile, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import {gzipSync} from 'node:zlib';
import {Readable, Writable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {createArchiveTools, runAge} from './archive.js';
import {createSnapshot, verifySnapshot} from './snapshot.js';
import {createTestContext, type TestContext} from '../test/test-context.js';

let context: TestContext | undefined; const roots: string[] = [];
afterEach(async () => { await context?.dispose(); context = undefined; for (const root of roots.splice(0)) await rm(root, {recursive: true, force: true}); });
async function fixture() {
  const root = await mkdtemp(path.join(tmpdir(), 'phonograph-archive-')); roots.push(root); return root;
}
const passthrough = createArchiveTools(async (input, output, _args, signal) => { await pipeline(input, output, {signal}); });
it('round-trips real tar and verifies the manifest using a test-only age process boundary', async () => {
  const root = await fixture(); context = await createTestContext();
  await writeFile(path.join(context.dataDir, '.initialized.json'), '{"format":1}');
  const source = path.join(root, 'snapshot'); const output = path.join(root, 'backup.tar.age');
  await createSnapshot({dataDir: context.dataDir, target: source, id: randomUUID(), createdAt: new Date().toISOString(), releaseId: 'a'.repeat(40)});
  const result = await passthrough.encryptSnapshot(source, 'test-public-key', output);
  expect(result.bytes).toBeGreaterThan(0); expect(result.sha256).toMatch(/^[0-9a-f]{64}$/);
  await passthrough.decryptArchive(output, 'test-private-key', path.join(root, 'restored'));
  expect((await verifySnapshot(path.join(root, 'restored'))).files.length).toBe(2);
  await expect(passthrough.decryptArchive(output, 'test-private-key', source)).rejects.toThrow();
  const compressed = path.join(root, 'unexpected-compression.age');
  await writeFile(compressed, gzipSync(await readFile(output)));
  await expect(passthrough.decryptArchive(compressed, 'test-private-key', path.join(root, 'compressed-output')))
    .rejects.toThrow('UNSUPPORTED_ARCHIVE_FORMAT');
});

// A literal USTAR header lets the test generate members that safe tar writers refuse to create.
function maliciousTar(name: string, type = '0', size = 0): Buffer {
  const header = Buffer.alloc(512); header.write(name, 0, 100, 'utf8');
  header.write('0000600\0', 100); header.write('0000000\0', 108); header.write('0000000\0', 116);
  header.write(`${size.toString(8).padStart(11, '0')}\0`, 124); header.write('00000000000\0', 136);
  header.fill(32, 148, 156); header.write(type, 156); header.write('ustar\0', 257);
  const checksum = header.reduce((sum, byte) => sum + byte, 0);
  header.write(`${checksum.toString(8).padStart(6, '0')}\0 `, 148);
  return header;
}
it.each([
  ['../escape', '0', 0], ['/absolute', '0', 0], ['C:/escape', '0', 0],
  ['library.sqlite', '1', 0], ['library.sqlite', '2', 0], ['library.sqlite', '0', 5 * 1024 ** 3],
])('rejects unsafe tar member %s type %s', async (name, type, size) => {
  const root = await fixture(); const archive = path.join(root, 'bad.age');
  await writeFile(archive, Buffer.concat([maliciousTar(name, type, size), Buffer.alloc(1024)]));
  await expect(passthrough.decryptArchive(archive, 'test-key', path.join(root, 'output'))).rejects.toThrow();
});
it('rejects duplicate members and does not publish partial output', async () => {
  const root = await fixture(); const archive = path.join(root, 'bad.age'); const target = path.join(root, 'output');
  await writeFile(archive, Buffer.concat([maliciousTar('library.sqlite'), maliciousTar('library.sqlite'), Buffer.alloc(1024)]));
  await expect(passthrough.decryptArchive(archive, 'test-key', target)).rejects.toThrow();
  await expect(readFile(path.join(target, 'library.sqlite'))).rejects.toThrow();
});
it('redacts failing subprocess stderr and terminates cancelled pipelines', async () => {
  const sink = () => new Writable({write(_chunk, _encoding, done) { done(); }});
  const failure = (() => spawn(process.execPath, ['-e', 'process.stderr.write("SENSITIVE_TEST_VALUE");process.exit(2)'], {stdio: 'pipe'})) as typeof spawn;
  await expect(runAge(Readable.from(['input']), sink(), ['--encrypt'], undefined, failure)).rejects.toThrow('AGE_PROCESS_FAILED');
  const controller = new AbortController();
  const waiting = (() => spawn(process.execPath, ['-e', 'setInterval(()=>{},1000)'], {stdio: 'pipe'})) as typeof spawn;
  const pending = runAge(Readable.from(['input']), sink(), ['--encrypt'], controller.signal, waiting);
  controller.abort(); await expect(pending).rejects.toThrow();
});

it('runs both pipe directions and removes partial ciphertext on a child failure', async () => {
  const chunks: Buffer[] = [];
  const echo = (() => spawn(process.execPath, ['-e', 'process.stdin.pipe(process.stdout)'], {stdio: 'pipe'})) as typeof spawn;
  await runAge(Readable.from(['sample']), new Writable({write(chunk, _encoding, next) { chunks.push(Buffer.from(chunk)); next(); }}), ['--encrypt'], undefined, echo);
  expect(Buffer.concat(chunks).toString()).toBe('sample');
  const root = await fixture(); context = await createTestContext();
  await writeFile(path.join(context.dataDir, '.initialized.json'), '{"format":1}');
  const source = path.join(root, 'snapshot'), output = path.join(root, 'failed.age');
  await createSnapshot({dataDir: context.dataDir, target: source, id: randomUUID(), createdAt: new Date().toISOString(), releaseId: 'a'.repeat(40)});
  const failing = createArchiveTools((input, destination, args, signal) => runAge(input, destination, args, signal,
    (() => spawn(process.execPath, ['-e', 'process.stdout.write("partial");process.exit(2)'], {stdio: 'pipe'})) as typeof spawn));
  await expect(failing.encryptSnapshot(source, 'test-key', output)).rejects.toThrow('AGE_PROCESS_FAILED');
  await expect(readFile(output)).rejects.toThrow();
});
it('closes both provided streams when cancellation happens before the process starts', async () => {
  const controller = new AbortController(); controller.abort();
  const source = Readable.from(['private data']);
  const destination = new Writable({write(_chunk, _encoding, next) { next(); }});
  const echo = (() => spawn(process.execPath, ['-e', 'process.stdin.pipe(process.stdout)'], {stdio: 'pipe'})) as typeof spawn;
  await expect(runAge(source, destination, ['--encrypt'], controller.signal, echo)).rejects.toThrow();
  expect(source.destroyed).toBe(true); expect(destination.destroyed).toBe(true);
});
