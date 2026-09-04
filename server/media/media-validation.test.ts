import {describe, expect, it} from 'vitest';

import {UploadValidationError, validateUpload} from './media-validation.js';

describe('validateUpload', () => {
  it.each([
    ['audio', 'song.mp3', 'audio/mpeg', 'audio/mpeg', 200 * 1024 * 1024],
    ['audio', 'song.m4a', 'audio/mp4', 'audio/mp4', 1024],
    ['cover', 'cover.jpg', 'image/jpeg', 'image/jpeg', 1024],
    ['cover', 'cover.png', 'image/png', 'image/png', 1024],
    ['cover', 'cover.webp', 'image/webp', 'image/webp', 10 * 1024 * 1024],
  ] as const)(
    'accepts a valid %s upload at its byte boundary',
    (kind, originalName, declaredMime, detectedMime, byteSize) => {
      expect(() =>
        validateUpload(kind, {
          originalName,
          declaredMime,
          detectedMime,
          byteSize,
        }),
      ).not.toThrow();
    },
  );

  it('rejects content whose detected type contradicts its audio extension', () => {
    expect(() =>
      validateUpload('audio', {
        originalName: 'fake.mp3',
        declaredMime: 'audio/mpeg',
        detectedMime: 'image/png',
        byteSize: 1024,
      }),
    ).toThrowError('音频文件内容与格式不匹配');
  });

  it('accepts an M4A whose detected container is from the MP4 family', () => {
    expect(() =>
      validateUpload('audio', {
        originalName: 'song.m4a',
        declaredMime: 'audio/mp4',
        detectedMime: 'video/mp4',
        byteSize: 1024,
      }),
    ).not.toThrow();
  });

  it.each([
    ['audio', 'large.mp3', 'audio/mpeg', 'audio/mpeg', 200 * 1024 * 1024 + 1, '音频不能超过 200 MB'],
    ['cover', 'large.png', 'image/png', 'image/png', 10 * 1024 * 1024 + 1, '封面不能超过 10 MB'],
  ] as const)(
    'rejects a %s upload one byte above its limit',
    (kind, originalName, declaredMime, detectedMime, byteSize, message) => {
      expect(() =>
        validateUpload(kind, {
          originalName,
          declaredMime,
          detectedMime,
          byteSize,
        }),
      ).toThrowError(message);
    },
  );

  it.each([
    ['audio', 'song.wav', 'audio/wav', 'audio/wav'],
    ['audio', 'song.mp3', 'application/octet-stream', 'audio/mpeg'],
    ['cover', 'cover.gif', 'image/gif', 'image/gif'],
  ] as const)(
    'rejects unsupported %s declarations with a stable media error',
    (kind, originalName, declaredMime, detectedMime) => {
      try {
        validateUpload(kind, {
          originalName,
          declaredMime,
          detectedMime,
          byteSize: 10,
        });
        throw new Error('Expected validation to reject the upload.');
      } catch (error) {
        expect(error).toBeInstanceOf(UploadValidationError);
        expect(error).toMatchObject({
          code: 'UNSUPPORTED_MEDIA_TYPE',
          statusCode: 415,
        });
      }
    },
  );
});
