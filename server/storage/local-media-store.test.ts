import {randomUUID} from 'node:crypto';
import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  symlink,
  utimes,
  writeFile,
} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';

import {afterEach, beforeEach, describe, expect, it} from 'vitest';

import {cleanupStaleTemporaryMedia} from '../index.js';
import {LocalMediaStore} from './local-media-store.js';

async function* chunks(text: string): AsyncIterable<Uint8Array> {
  for (const character of text) {
    yield Buffer.from(character);
  }
}

async function readStream(stream: NodeJS.ReadableStream): Promise<string> {
  const received: Buffer[] = [];

  for await (const chunk of stream as AsyncIterable<Buffer | string>) {
    received.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(received).toString('utf8');
}

describe('LocalMediaStore', () => {
  let tempDirectory: string;

  beforeEach(async () => {
    tempDirectory = await mkdtemp(path.join(tmpdir(), 'local-media-store-'));
  });

  afterEach(async () => {
    await rm(tempDirectory, {recursive: true, force: true});
  });

  it('promotes a temporary upload to an opaque final key and reads a byte range', async () => {
    const store = new LocalMediaStore(tempDirectory);
    const {temporaryKey} = await store.createTemporary('audio');
    const progress: number[] = [];

    await store.writeTemporary(temporaryKey, chunks('abcdef'), {
      onProgress: (bytes) => progress.push(bytes),
    });

    const stored = await store.promote(temporaryKey);

    expect(stored.storageKey).not.toContain('abcdef');
    expect(stored.storageKey).not.toContain('song.mp3');
    expect(stored.byteSize).toBe(6);
    expect(progress.at(-1)).toBe(6);
    expect(await readdir(path.join(tempDirectory, 'tmp'))).toEqual([]);
    expect(await readdir(path.join(tempDirectory, 'objects'))).toEqual([
      stored.storageKey,
    ]);

    const opened = await store.open(stored.storageKey, {start: 1, end: 3});
    expect(opened.byteSize).toBe(6);
    expect(opened.contentLength).toBe(3);
    expect(await readStream(opened.stream)).toBe('bcd');
  });

  it('removes partial bytes when the upload is aborted', async () => {
    const store = new LocalMediaStore(tempDirectory);
    const controller = new AbortController();
    const {temporaryKey} = await store.createTemporary('cover');
    controller.abort();

    await expect(
      store.writeTemporary(temporaryKey, chunks('partial'), {
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({name: 'AbortError'});
    expect(await readdir(path.join(tempDirectory, 'tmp'))).toEqual([]);
  });

  it('removes bytes written before an upload is aborted', async () => {
    const store = new LocalMediaStore(tempDirectory);
    const controller = new AbortController();
    const {temporaryKey} = await store.createTemporary('audio');

    async function* abortingChunks(): AsyncIterable<Uint8Array> {
      yield Buffer.from('partial');
      controller.abort();
      yield Buffer.from('ignored');
    }

    await expect(
      store.writeTemporary(temporaryKey, abortingChunks(), {
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({name: 'AbortError'});
    expect(await readdir(path.join(tempDirectory, 'tmp'))).toEqual([]);
  });

  it('removes partial bytes when the source stream fails', async () => {
    const store = new LocalMediaStore(tempDirectory);
    const {temporaryKey} = await store.createTemporary('audio');

    async function* failingChunks(): AsyncIterable<Uint8Array> {
      yield Buffer.from('partial');
      throw new Error('simulated source failure');
    }

    await expect(
      store.writeTemporary(temporaryKey, failingChunks(), {}),
    ).rejects.toThrow('simulated source failure');
    expect(await readdir(path.join(tempDirectory, 'tmp'))).toEqual([]);
  });

  it('cleans up when the source stream throws undefined', async () => {
    const store = new LocalMediaStore(tempDirectory);
    const {temporaryKey} = await store.createTemporary('audio');

    async function* failingChunks(): AsyncIterable<Uint8Array> {
      yield Buffer.from('partial');
      throw undefined;
    }

    await expect(
      store.writeTemporary(temporaryKey, failingChunks(), {}),
    ).rejects.toBeUndefined();
    expect(await readdir(path.join(tempDirectory, 'tmp'))).toEqual([]);
  });

  it('reads a complete object and deletes it idempotently', async () => {
    const store = new LocalMediaStore(tempDirectory);
    const {temporaryKey} = await store.createTemporary('cover');
    await store.writeTemporary(temporaryKey, chunks('complete'), {});
    const stored = await store.promote(temporaryKey);

    const opened = await store.open(stored.storageKey);
    expect(opened.byteSize).toBe(8);
    expect(opened.contentLength).toBe(8);
    expect(await readStream(opened.stream)).toBe('complete');

    await store.delete(stored.storageKey);
    await store.delete(stored.storageKey);
    await expect(store.open(stored.storageKey)).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });

  it('cleans up an abandoned temporary upload idempotently', async () => {
    const store = new LocalMediaStore(tempDirectory);
    const {temporaryKey} = await store.createTemporary('audio');

    await store.cleanupTemporary(temporaryKey);
    await store.cleanupTemporary(temporaryKey);

    expect(await readdir(path.join(tempDirectory, 'tmp'))).toEqual([]);
  });

  it('cleans only stale direct temporary files with valid internal keys', async () => {
    const store = new LocalMediaStore(tempDirectory);
    const {temporaryKey: staleKey} = await store.createTemporary('audio');
    const {temporaryKey: recentKey} = await store.createTemporary('cover');
    const temporaryDirectory = path.join(tempDirectory, 'tmp');

    await utimes(
      path.join(temporaryDirectory, staleKey),
      new Date('2020-01-01T00:00:00.000Z'),
      new Date('2020-01-01T00:00:00.000Z'),
    );
    await utimes(
      path.join(temporaryDirectory, recentKey),
      new Date('2030-01-01T00:00:00.000Z'),
      new Date('2030-01-01T00:00:00.000Z'),
    );
    await writeFile(path.join(temporaryDirectory, 'not-a-storage-key'), 'keep');

    await expect(
      store.cleanupStaleTemporary(new Date('2025-01-01T00:00:00.000Z')),
    ).resolves.toBe(1);
    expect((await readdir(temporaryDirectory)).sort()).toEqual(
      [recentKey, 'not-a-storage-key'].sort(),
    );
  });

  it('cleans uploads older than 24 hours at startup using an injected clock', async () => {
    const store = new LocalMediaStore(tempDirectory);
    const {temporaryKey: staleKey} = await store.createTemporary('audio');
    const {temporaryKey: recentKey} = await store.createTemporary('cover');
    const temporaryDirectory = path.join(tempDirectory, 'tmp');
    const now = new Date('2025-01-03T00:00:00.000Z');

    await utimes(
      path.join(temporaryDirectory, staleKey),
      new Date('2025-01-01T22:00:00.000Z'),
      new Date('2025-01-01T22:00:00.000Z'),
    );
    await utimes(
      path.join(temporaryDirectory, recentKey),
      new Date('2025-01-02T02:00:00.000Z'),
      new Date('2025-01-02T02:00:00.000Z'),
    );

    await cleanupStaleTemporaryMedia(store, () => now);

    expect(await readdir(temporaryDirectory)).toEqual([recentKey]);
  });

  it('rejects unresolved roots, path-like keys, and invalid byte ranges', async () => {
    expect(() => new LocalMediaStore('relative/media')).toThrow(
      'requires a resolved media directory',
    );

    const store = new LocalMediaStore(tempDirectory);
    const {temporaryKey} = await store.createTemporary('audio');
    await store.writeTemporary(temporaryKey, chunks('abcdef'), {});
    const stored = await store.promote(temporaryKey);

    await expect(store.open('../outside')).rejects.toThrow(
      'Invalid media storage key',
    );
    await expect(store.cleanupTemporary('..')).rejects.toThrow(
      'Invalid media storage key',
    );
    await expect(
      store.open(stored.storageKey, {start: 0, end: 6}),
    ).rejects.toThrow('Invalid media byte range');
    await expect(
      store.open(stored.storageKey, {start: 4, end: 3}),
    ).rejects.toThrow('Invalid media byte range');
  });

  it('does not follow a symbolic link stored under a valid object key', async () => {
    const store = new LocalMediaStore(tempDirectory);
    const {temporaryKey} = await store.createTemporary('cover');
    await store.cleanupTemporary(temporaryKey);
    const outsideDirectory = path.join(tempDirectory, 'outside');
    const linkedKey = randomUUID();
    await mkdir(outsideDirectory);
    await writeFile(path.join(outsideDirectory, 'secret.txt'), 'outside');
    await symlink(
      outsideDirectory,
      path.join(tempDirectory, 'objects', linkedKey),
      'junction',
    );

    await expect(store.open(linkedKey)).rejects.toThrow(
      'does not reference a regular file',
    );
  });

  it('rejects a temporary directory junction that escapes the media root', async () => {
    const mediaDirectory = path.join(tempDirectory, 'media');
    const outsideDirectory = path.join(tempDirectory, 'outside');
    await mkdir(mediaDirectory);
    await mkdir(outsideDirectory);
    await symlink(
      outsideDirectory,
      path.join(mediaDirectory, 'tmp'),
      'junction',
    );
    const store = new LocalMediaStore(mediaDirectory);

    await expect(store.createTemporary('audio')).rejects.toThrow(
      'Media storage directory must not be a symbolic link',
    );
    expect(await readdir(outsideDirectory)).toEqual([]);
  });

  it('rejects an ancestor junction before creating the media directory', async () => {
    const outsideDirectory = path.join(tempDirectory, 'outside');
    const linkedParent = path.join(tempDirectory, 'linked-parent');
    await mkdir(outsideDirectory);
    await symlink(outsideDirectory, linkedParent, 'junction');
    const store = new LocalMediaStore(
      path.join(linkedParent, 'missing', 'media'),
    );

    await expect(store.createTemporary('audio')).rejects.toThrow(
      'Media storage directory must not traverse a symbolic link',
    );
    expect(await readdir(outsideDirectory)).toEqual([]);
  });

  it('revalidates the temporary directory before writing or cleaning', async () => {
    const mediaDirectory = path.join(tempDirectory, 'media');
    const outsideDirectory = path.join(tempDirectory, 'outside');
    const store = new LocalMediaStore(mediaDirectory);
    const {temporaryKey} = await store.createTemporary('audio');
    await rm(path.join(mediaDirectory, 'tmp'), {recursive: true});
    await mkdir(outsideDirectory);
    await writeFile(path.join(outsideDirectory, temporaryKey), 'outside');
    await symlink(
      outsideDirectory,
      path.join(mediaDirectory, 'tmp'),
      'junction',
    );

    await expect(
      store.writeTemporary(temporaryKey, chunks('escaped'), {}),
    ).rejects.toThrow('Media storage directory must not be a symbolic link');
    await expect(store.cleanupTemporary(temporaryKey)).rejects.toThrow(
      'Media storage directory must not be a symbolic link',
    );
    expect(
      await readFile(path.join(outsideDirectory, temporaryKey), 'utf8'),
    ).toBe('outside');
  });

  it('revalidates the object directory before opening or deleting', async () => {
    const mediaDirectory = path.join(tempDirectory, 'media');
    const outsideDirectory = path.join(tempDirectory, 'outside');
    const store = new LocalMediaStore(mediaDirectory);
    const {temporaryKey} = await store.createTemporary('audio');
    await store.writeTemporary(temporaryKey, chunks('stored'), {});
    const stored = await store.promote(temporaryKey);
    await rm(path.join(mediaDirectory, 'objects'), {recursive: true});
    await mkdir(outsideDirectory);
    await writeFile(path.join(outsideDirectory, stored.storageKey), 'outside');
    await symlink(
      outsideDirectory,
      path.join(mediaDirectory, 'objects'),
      'junction',
    );

    await expect(store.open(stored.storageKey)).rejects.toThrow(
      'Media storage directory must not be a symbolic link',
    );
    await expect(store.delete(stored.storageKey)).rejects.toThrow(
      'Media storage directory must not be a symbolic link',
    );
    expect(
      await readFile(path.join(outsideDirectory, stored.storageKey), 'utf8'),
    ).toBe('outside');
  });
});
