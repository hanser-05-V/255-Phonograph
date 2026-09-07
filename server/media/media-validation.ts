export type UploadKind = 'audio' | 'cover';

export type UploadValidationInput = {
  originalName: string;
  declaredMime: string;
  detectedMime: string | undefined;
  byteSize: number;
};

export type UploadErrorCode =
  | 'FILE_TOO_LARGE'
  | 'UNSUPPORTED_MEDIA_TYPE'
  | 'INVALID_MEDIA';

export class UploadValidationError extends Error {
  constructor(
    readonly code: UploadErrorCode,
    message: string,
    readonly statusCode: 413 | 415 | 422,
  ) {
    super(message);
    this.name = 'UploadValidationError';
  }
}

export const AUDIO_MAX_BYTES = 200 * 1024 * 1024;
export const COVER_MAX_BYTES = 10 * 1024 * 1024;
export const LRC_MAX_BYTES = 1024 * 1024;

const acceptedTypes = {
  audio: new Map([
    ['.mp3', new Set(['audio/mpeg'])],
    ['.m4a', new Set(['audio/mp4', 'audio/x-m4a'])],
  ]),
  cover: new Map([
    ['.jpg', new Set(['image/jpeg'])],
    ['.jpeg', new Set(['image/jpeg'])],
    ['.png', new Set(['image/png'])],
    ['.webp', new Set(['image/webp'])],
  ]),
} satisfies Record<UploadKind, Map<string, Set<string>>>;

function extensionOf(filename: string): string {
  const basename = filename.replaceAll('\\', '/').split('/').at(-1) ?? '';
  const dot = basename.lastIndexOf('.');
  return dot < 0 ? '' : basename.slice(dot).toLowerCase();
}

function normalizedMime(mime: string): string {
  return mime.split(';', 1)[0].trim().toLowerCase();
}

export function validateUpload(
  kind: UploadKind,
  input: UploadValidationInput,
): void {
  const limit = kind === 'audio' ? AUDIO_MAX_BYTES : COVER_MAX_BYTES;
  if (!Number.isSafeInteger(input.byteSize) || input.byteSize < 0) {
    throw new UploadValidationError(
      'INVALID_MEDIA',
      '文件大小无效',
      422,
    );
  }
  if (input.byteSize > limit) {
    throw new UploadValidationError(
      'FILE_TOO_LARGE',
      kind === 'audio' ? '音频不能超过 200 MB' : '封面不能超过 10 MB',
      413,
    );
  }

  const extension = extensionOf(input.originalName);
  const expectedMimes = acceptedTypes[kind].get(extension);
  if (!expectedMimes || !expectedMimes.has(normalizedMime(input.declaredMime))) {
    throw new UploadValidationError(
      'UNSUPPORTED_MEDIA_TYPE',
      kind === 'audio' ? '仅支持 MP3 或 M4A 音频' : '仅支持 JPG、PNG 或 WebP 封面',
      415,
    );
  }

  const detectedMime = input.detectedMime
    ? normalizedMime(input.detectedMime)
    : undefined;
  const detectedTypeMatches =
    (detectedMime !== undefined && expectedMimes.has(detectedMime)) ||
    (extension === '.m4a' && detectedMime === 'video/mp4');
  if (!detectedTypeMatches) {
    throw new UploadValidationError(
      'INVALID_MEDIA',
      kind === 'audio'
        ? '音频文件内容与格式不匹配'
        : '封面文件内容与格式不匹配',
      422,
    );
  }
}
