import {createHash, randomUUID} from 'node:crypto';
import path from 'node:path';
import type {DatabaseSync} from 'node:sqlite';

import {fileTypeFromFile} from 'file-type';

import {validateLrc, type LrcValidationResult} from '../../shared/lrc.js';
import type {MediaStore} from '../storage/media-store.js';
import {probeAudioDuration} from './audio-metadata.js';
import {
  AUDIO_MAX_BYTES,
  COVER_MAX_BYTES,
  LRC_MAX_BYTES,
  UploadValidationError,
  validateUpload,
  type UploadKind,
} from './media-validation.js';

type DetectedFileType = {ext: string; mime: string};

export type UploadSource = {
  originalName: string;
  declaredMime: string;
  source: AsyncIterable<Uint8Array>;
  signal?: AbortSignal;
  onProgress?: (writtenBytes: number) => void;
};

export type PendingUpload = {
  uploadId: string;
  originalName: string;
  mimeType: string;
  byteSize: number;
  durationSeconds: number | null;
};

export type LrcUpload = {
  content: string;
  validation: LrcValidationResult;
};

export type UploadServiceDependencies = {
  detectFileType: (filePath: string) => Promise<DetectedFileType | undefined>;
  probeAudioDuration: (filePath: string) => Promise<number | null>;
  generateUploadId: () => string;
  now: () => Date;
};

const defaultDependencies: UploadServiceDependencies = {
  detectFileType: fileTypeFromFile,
  probeAudioDuration,
  generateUploadId: randomUUID,
  now: () => new Date(),
};

const PENDING_UPLOAD_MAX_AGE_MS = 24 * 60 * 60 * 1_000;

function sessionDigest(token: string): string {
  return createHash('sha256').update(token).digest('base64url');
}

function abortError(): Error {
  const error = new Error('The upload was aborted.');
  error.name = 'AbortError';
  return error;
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) {
    throw abortError();
  }
}

async function* limitSource(
  source: AsyncIterable<Uint8Array>,
  limit: number,
  signal: AbortSignal | undefined,
  message: string,
): AsyncIterable<Uint8Array> {
  let receivedBytes = 0;
  for await (const chunk of source) {
    throwIfAborted(signal);
    receivedBytes += chunk.byteLength;
    if (receivedBytes > limit) {
      throw new UploadValidationError('FILE_TOO_LARGE', message, 413);
    }
    yield chunk;
  }
  throwIfAborted(signal);
}

async function readBoundedText(
  upload: UploadSource,
): Promise<string> {
  const chunks: Uint8Array[] = [];
  let byteSize = 0;

  for await (const chunk of upload.source) {
    throwIfAborted(upload.signal);
    byteSize += chunk.byteLength;
    if (byteSize > LRC_MAX_BYTES) {
      throw new UploadValidationError(
        'FILE_TOO_LARGE',
        'LRC 文件不能超过 1 MB',
        413,
      );
    }
    chunks.push(chunk);
    upload.onProgress?.(byteSize);
  }
  throwIfAborted(upload.signal);

  try {
    return new TextDecoder('utf-8', {fatal: true}).decode(
      Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))),
    );
  } catch {
    throw new UploadValidationError(
      'INVALID_MEDIA',
      'LRC 文件必须使用 UTF-8 编码',
      422,
    );
  }
}

export class UploadService {
  readonly #dependencies: UploadServiceDependencies;

  constructor(
    private readonly db: DatabaseSync,
    private readonly mediaStore: MediaStore,
    private readonly mediaDirectory: string,
    dependencies: Partial<UploadServiceDependencies> = {},
  ) {
    this.#dependencies = {...defaultDependencies, ...dependencies};
  }

  ingestAudio(sessionToken: string, upload: UploadSource): Promise<PendingUpload> {
    return this.#ingestMedia('audio', sessionToken, upload);
  }

  ingestCover(sessionToken: string, upload: UploadSource): Promise<PendingUpload> {
    return this.#ingestMedia('cover', sessionToken, upload);
  }

  async ingestLrc(upload: UploadSource): Promise<LrcUpload> {
    const extension = path.extname(upload.originalName).toLowerCase();
    const declaredMime = upload.declaredMime.split(';', 1)[0].trim().toLowerCase();
    if (
      extension !== '.lrc' ||
      (declaredMime !== 'text/plain' && declaredMime !== 'application/octet-stream')
    ) {
      throw new UploadValidationError(
        'UNSUPPORTED_MEDIA_TYPE',
        '仅支持 UTF-8 编码的 .lrc 文件',
        415,
      );
    }

    const content = await readBoundedText(upload);
    return {content, validation: validateLrc(content)};
  }

  async cleanupStalePendingUploads(): Promise<number> {
    const cutoff = new Date(
      this.#dependencies.now().getTime() - PENDING_UPLOAD_MAX_AGE_MS,
    ).toISOString();
    const rows = this.db
      .prepare(`
        SELECT id, temporary_key
        FROM pending_uploads
        WHERE created_at < ?
        ORDER BY created_at, id
      `)
      .all(cutoff) as Array<{id: string; temporary_key: string}>;

    let removed = 0;
    for (const row of rows) {
      const result = this.db
        .prepare('DELETE FROM pending_uploads WHERE id = ? AND created_at < ?')
        .run(row.id, cutoff);
      if (result.changes === 0) {
        continue;
      }
      try {
        await this.mediaStore.cleanupTemporary(row.temporary_key);
      } catch (error) {
        if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) {
          throw error;
        }
      }
      removed += 1;
    }
    return removed;
  }

  async cancel(sessionToken: string, uploadId: string): Promise<boolean> {
    const row = this.db
      .prepare(`
        SELECT temporary_key
        FROM pending_uploads
        WHERE id = ? AND owner_session_digest = ?
      `)
      .get(uploadId, sessionDigest(sessionToken)) as
      | {temporary_key: string}
      | undefined;

    if (!row) {
      return false;
    }

    this.db
      .prepare(`
        DELETE FROM pending_uploads
        WHERE id = ? AND owner_session_digest = ?
      `)
      .run(uploadId, sessionDigest(sessionToken));
    await this.mediaStore.cleanupTemporary(row.temporary_key);
    return true;
  }

  async #ingestMedia(
    kind: UploadKind,
    sessionToken: string,
    upload: UploadSource,
  ): Promise<PendingUpload> {
    const maxBytes = kind === 'audio' ? AUDIO_MAX_BYTES : COVER_MAX_BYTES;
    const tooLargeMessage =
      kind === 'audio' ? '音频不能超过 200 MB' : '封面不能超过 10 MB';

    validateUpload(kind, {
      originalName: upload.originalName,
      declaredMime: upload.declaredMime,
      detectedMime: upload.declaredMime,
      byteSize: 0,
    });

    const {temporaryKey} = await this.mediaStore.createTemporary(kind);
    const temporaryPath = path.join(this.mediaDirectory, 'tmp', temporaryKey);
    let byteSize: number;

    try {
      byteSize = await this.mediaStore.writeTemporary(
        temporaryKey,
        limitSource(upload.source, maxBytes, upload.signal, tooLargeMessage),
        {signal: upload.signal, onProgress: upload.onProgress},
      );

      const detected = await this.#dependencies.detectFileType(temporaryPath);
      const detectedMime = detected?.mime;
      validateUpload(kind, {
        originalName: upload.originalName,
        declaredMime: upload.declaredMime,
        detectedMime,
        byteSize,
      });

      const durationSeconds =
        kind === 'audio'
          ? await this.#dependencies.probeAudioDuration(temporaryPath)
          : null;
      const uploadId = this.#dependencies.generateUploadId();

      this.db
        .prepare(`
          INSERT INTO pending_uploads (
            id, owner_session_digest, kind, temporary_key, original_name,
            mime_type, byte_size, duration_seconds, lrc_text, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)
        `)
        .run(
          uploadId,
          sessionDigest(sessionToken),
          kind,
          temporaryKey,
          upload.originalName,
          detectedMime ?? '',
          byteSize,
          durationSeconds,
          this.#dependencies.now().toISOString(),
        );

      return {
        uploadId,
        originalName: upload.originalName,
        mimeType: detectedMime ?? upload.declaredMime,
        byteSize,
        durationSeconds,
      };
    } catch (error) {
      await this.mediaStore.cleanupTemporary(temporaryKey);
      throw error;
    }
  }
}
