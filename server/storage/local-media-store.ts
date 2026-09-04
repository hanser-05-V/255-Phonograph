import {randomUUID} from 'node:crypto';
import {
  lstat,
  mkdir,
  open,
  realpath,
  readdir,
  rename,
  rm,
  type FileHandle,
} from 'node:fs/promises';
import path from 'node:path';

import type {MediaKind, MediaStore, StoredMedia} from './media-store.js';

const STORAGE_KEY_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assertStorageKey(key: string): void {
  if (!STORAGE_KEY_PATTERN.test(key)) {
    throw new Error('Invalid media storage key');
  }
}

function abortError(): Error {
  const error = new Error('The media write was aborted');
  error.name = 'AbortError';
  return error;
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) {
    throw abortError();
  }
}

async function writeAll(
  file: Awaited<ReturnType<typeof open>>,
  bytes: Uint8Array,
): Promise<void> {
  let offset = 0;

  while (offset < bytes.byteLength) {
    const {bytesWritten} = await file.write(
      bytes,
      offset,
      bytes.byteLength - offset,
    );
    if (bytesWritten === 0) {
      throw new Error('Media write made no progress');
    }
    offset += bytesWritten;
  }
}

async function statRegularFile(filePath: string): Promise<number> {
  const fileStats = await lstat(filePath);
  if (!fileStats.isFile() || fileStats.isSymbolicLink()) {
    throw new Error('Media storage key does not reference a regular file');
  }
  return fileStats.size;
}

async function openRegularFile(
  filePath: string,
  flags: 'r' | 'r+',
): Promise<{file: FileHandle; byteSize: number}> {
  const pathStats = await lstat(filePath);
  if (!pathStats.isFile() || pathStats.isSymbolicLink()) {
    throw new Error('Media storage key does not reference a regular file');
  }

  const file = await open(filePath, flags);
  try {
    const handleStats = await file.stat();
    if (
      !handleStats.isFile() ||
      handleStats.dev !== pathStats.dev ||
      handleStats.ino !== pathStats.ino
    ) {
      throw new Error('Media file changed while it was being opened');
    }
    return {file, byteSize: handleStats.size};
  } catch (error) {
    await file.close();
    throw error;
  }
}

async function copySource(
  file: FileHandle,
  source: AsyncIterable<Uint8Array>,
  options: {
    signal?: AbortSignal;
    onProgress?: (writtenBytes: number) => void;
  },
): Promise<number> {
  let writtenBytes = 0;

  for await (const chunk of source) {
    throwIfAborted(options.signal);
    await writeAll(file, chunk);
    writtenBytes += chunk.byteLength;
    options.onProgress?.(writtenBytes);
  }

  throwIfAborted(options.signal);
  return writtenBytes;
}

async function safeDelete(filePath: string): Promise<void> {
  await rm(filePath, {force: true});
}

async function assertStorageDirectory(directory: string): Promise<void> {
  const directoryStats = await lstat(directory);
  if (directoryStats.isSymbolicLink()) {
    throw new Error('Media storage directory must not be a symbolic link');
  }
  if (!directoryStats.isDirectory()) {
    throw new Error('Media storage path must be a directory');
  }
}

function isMissingPath(error: unknown): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    error.code === 'ENOENT'
  );
}

async function assertExistingPathHasNoLinks(target: string): Promise<void> {
  const resolvedTarget = path.resolve(target);
  const {root} = path.parse(resolvedTarget);
  const segments = path.relative(root, resolvedTarget).split(path.sep);
  let currentPath = root;

  for (const segment of segments) {
    if (!segment) {
      continue;
    }

    currentPath = path.join(currentPath, segment);
    let pathStats: Awaited<ReturnType<typeof lstat>>;
    try {
      pathStats = await lstat(currentPath);
    } catch (error) {
      if (isMissingPath(error)) {
        return;
      }
      throw error;
    }

    if (pathStats.isSymbolicLink()) {
      throw new Error(
        'Media storage directory must not traverse a symbolic link',
      );
    }
    if (!pathStats.isDirectory()) {
      throw new Error('Media storage ancestor must be a directory');
    }
  }
}

function samePath(left: string, right: string): boolean {
  const normalizedLeft = path.normalize(left);
  const normalizedRight = path.normalize(right);
  return process.platform === 'win32'
    ? normalizedLeft.toLowerCase() === normalizedRight.toLowerCase()
    : normalizedLeft === normalizedRight;
}

export class LocalMediaStore implements MediaStore {
  readonly #mediaDirectory: string;
  readonly #temporaryDirectory: string;
  readonly #objectDirectory: string;

  constructor(mediaDir: string) {
    if (!path.isAbsolute(mediaDir) || path.resolve(mediaDir) !== mediaDir) {
      throw new Error('LocalMediaStore requires a resolved media directory');
    }

    this.#mediaDirectory = mediaDir;
    this.#temporaryDirectory = path.join(mediaDir, 'tmp');
    this.#objectDirectory = path.join(mediaDir, 'objects');
  }

  async #ensureDirectories(): Promise<void> {
    await assertExistingPathHasNoLinks(this.#mediaDirectory);
    await mkdir(this.#mediaDirectory, {recursive: true});
    await this.#assertMediaDirectory();
    await Promise.all([
      mkdir(this.#temporaryDirectory, {recursive: true}),
      mkdir(this.#objectDirectory, {recursive: true}),
    ]);
    await this.#assertTemporaryDirectory();
    await this.#assertObjectDirectory();
  }

  async #assertMediaDirectory(): Promise<string> {
    await assertStorageDirectory(this.#mediaDirectory);
    const actualPath = await realpath(this.#mediaDirectory);
    if (!samePath(actualPath, this.#mediaDirectory)) {
      throw new Error('Media storage directory must not traverse a symbolic link');
    }
    return actualPath;
  }

  async #assertTemporaryDirectory(): Promise<void> {
    const mediaDirectory = await this.#assertMediaDirectory();
    await assertStorageDirectory(this.#temporaryDirectory);
    const actualPath = await realpath(this.#temporaryDirectory);
    if (!samePath(actualPath, path.join(mediaDirectory, 'tmp'))) {
      throw new Error('Media storage directory must not be a symbolic link');
    }
  }

  async #assertObjectDirectory(): Promise<void> {
    const mediaDirectory = await this.#assertMediaDirectory();
    await assertStorageDirectory(this.#objectDirectory);
    const actualPath = await realpath(this.#objectDirectory);
    if (!samePath(actualPath, path.join(mediaDirectory, 'objects'))) {
      throw new Error('Media storage directory must not be a symbolic link');
    }
  }

  async createTemporary(kind: MediaKind): Promise<{temporaryKey: string}> {
    if (kind !== 'audio' && kind !== 'cover') {
      throw new Error('Invalid media kind');
    }

    await this.#ensureDirectories();
    const temporaryKey = randomUUID();
    const handle = await open(
      path.join(this.#temporaryDirectory, temporaryKey),
      'wx',
    );
    await handle.close();
    return {temporaryKey};
  }

  async writeTemporary(
    temporaryKey: string,
    source: AsyncIterable<Uint8Array>,
    options: {
      signal?: AbortSignal;
      onProgress?: (writtenBytes: number) => void;
    },
  ): Promise<number> {
    assertStorageKey(temporaryKey);
    await this.#assertTemporaryDirectory();
    const temporaryPath = path.join(this.#temporaryDirectory, temporaryKey);
    let file: FileHandle | undefined;
    let writtenBytes: number | undefined;
    let failed = false;
    let operationError: unknown;

    try {
      throwIfAborted(options.signal);
      ({file} = await openRegularFile(temporaryPath, 'r+'));
      await file.truncate(0);
      writtenBytes = await copySource(file, source, options);
    } catch (error) {
      failed = true;
      operationError = error;
    }

    const cleanupErrors: unknown[] = [];
    if (file) {
      try {
        await file.close();
      } catch (error) {
        cleanupErrors.push(error);
      }
    }

    if (failed || cleanupErrors.length > 0) {
      try {
        await safeDelete(temporaryPath);
      } catch (error) {
        cleanupErrors.push(error);
      }
    }

    if (failed) {
      if (cleanupErrors.length > 0) {
        throw new AggregateError(
          [operationError, ...cleanupErrors],
          'Media write failed and temporary cleanup was incomplete',
        );
      }
      throw operationError;
    }

    if (cleanupErrors.length > 0) {
      throw new AggregateError(
        cleanupErrors,
        'Failed to close or clean the temporary media file',
      );
    }

    if (writtenBytes === undefined) {
      throw new Error('Media write completed without a byte count');
    }
    return writtenBytes;
  }

  async promote(temporaryKey: string): Promise<StoredMedia> {
    assertStorageKey(temporaryKey);
    await this.#ensureDirectories();
    const temporaryPath = path.join(this.#temporaryDirectory, temporaryKey);
    const byteSize = await statRegularFile(temporaryPath);
    const storageKey = randomUUID();

    await rename(
      temporaryPath,
      path.join(this.#objectDirectory, storageKey),
    );

    return {storageKey, byteSize};
  }

  async open(
    storageKey: string,
    range?: {start: number; end: number},
  ): Promise<{
    stream: NodeJS.ReadableStream;
    byteSize: number;
    contentLength: number;
  }> {
    assertStorageKey(storageKey);
    await this.#assertObjectDirectory();
    const objectPath = path.join(this.#objectDirectory, storageKey);
    const {file, byteSize} = await openRegularFile(objectPath, 'r');

    try {
      if (range) {
        if (
          !Number.isSafeInteger(range.start) ||
          !Number.isSafeInteger(range.end) ||
          range.start < 0 ||
          range.end < range.start ||
          range.end >= byteSize
        ) {
          throw new RangeError('Invalid media byte range');
        }

        return {
          stream: file.createReadStream(range),
          byteSize,
          contentLength: range.end - range.start + 1,
        };
      }

      return {
        stream: file.createReadStream(),
        byteSize,
        contentLength: byteSize,
      };
    } catch (error) {
      await file.close();
      throw error;
    }
  }

  async delete(storageKey: string): Promise<void> {
    assertStorageKey(storageKey);
    await this.#assertObjectDirectory();
    await safeDelete(path.join(this.#objectDirectory, storageKey));
  }

  async cleanupTemporary(temporaryKey: string): Promise<void> {
    assertStorageKey(temporaryKey);
    await this.#assertTemporaryDirectory();
    await safeDelete(path.join(this.#temporaryDirectory, temporaryKey));
  }

  async cleanupStaleTemporary(olderThan: Date): Promise<number> {
    if (Number.isNaN(olderThan.getTime())) {
      throw new TypeError('Stale temporary cutoff must be a valid date');
    }

    await this.#ensureDirectories();
    const entries = await readdir(this.#temporaryDirectory, {
      withFileTypes: true,
    });
    const errors: unknown[] = [];
    let deletedCount = 0;

    for (const entry of entries) {
      if (!entry.isFile() || !STORAGE_KEY_PATTERN.test(entry.name)) {
        continue;
      }

      const temporaryPath = path.join(this.#temporaryDirectory, entry.name);
      try {
        const fileStats = await lstat(temporaryPath);
        if (
          fileStats.isFile() &&
          !fileStats.isSymbolicLink() &&
          fileStats.mtime < olderThan
        ) {
          await safeDelete(temporaryPath);
          deletedCount += 1;
        }
      } catch (error) {
        errors.push(error);
      }
    }

    if (errors.length > 0) {
      throw new AggregateError(
        errors,
        `Failed to clean ${errors.length} stale temporary media file(s)`,
      );
    }

    return deletedCount;
  }
}
