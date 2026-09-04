import fastifyMultipart from '@fastify/multipart';
import type {FastifyInstance, FastifyRequest} from 'fastify';

import type {
  ApiErrorBody,
  LrcUploadResponse,
  PendingUploadResponse,
} from '../../shared/contracts.js';
import {requireAdmin} from '../auth/require-admin.js';
import {
  AUDIO_MAX_BYTES,
  COVER_MAX_BYTES,
  LRC_MAX_BYTES,
  UploadValidationError,
  type UploadKind,
} from '../media/media-validation.js';
import type {UploadService} from '../media/upload-service.js';

function unsupportedUpload(): UploadValidationError {
  return new UploadValidationError(
    'UNSUPPORTED_MEDIA_TYPE',
    '请求必须包含一个受支持的文件',
    415,
  );
}

function abortSignalFor(request: FastifyRequest): {
  signal: AbortSignal;
  dispose: () => void;
} {
  const controller = new AbortController();
  const abort = () => controller.abort();
  const abortIfDisconnected = () => {
    if (request.raw.aborted) {
      abort();
    }
  };

  request.raw.once('aborted', abort);
  request.raw.once('close', abortIfDisconnected);
  return {
    signal: controller.signal,
    dispose: () => {
      request.raw.off('aborted', abort);
      request.raw.off('close', abortIfDisconnected);
    },
  };
}

function assertMultipart(request: FastifyRequest): void {
  if (!request.isMultipart()) {
    throw unsupportedUpload();
  }
}

async function ingestMedia(
  request: FastifyRequest,
  uploadService: UploadService,
  kind: UploadKind,
): Promise<PendingUploadResponse> {
  assertMultipart(request);
  const maxBytes = kind === 'audio' ? AUDIO_MAX_BYTES : COVER_MAX_BYTES;
  const requestAbort = abortSignalFor(request);
  const token = request.adminSessionToken;
  if (!token) {
    throw new Error('Authenticated upload request is missing its session token.');
  }
  let result: PendingUploadResponse | undefined;

  try {
    for await (const file of request.files({
      limits: {files: 2, fields: 0, parts: 2, fileSize: maxBytes + 1},
    })) {
      if (result) {
        file.file.resume();
        await uploadService.cancel(token, result.uploadId);
        throw new UploadValidationError(
          'INVALID_MEDIA',
          '每次上传只允许一个文件',
          422,
        );
      }
      const input = {
        originalName: file.filename,
        declaredMime: file.mimetype,
        source: file.file,
        signal: requestAbort.signal,
      };
      result = kind === 'audio'
        ? await uploadService.ingestAudio(token, input)
        : await uploadService.ingestCover(token, input);
    }

    if (!result) {
      throw unsupportedUpload();
    }
    return result;
  } finally {
    requestAbort.dispose();
  }
}

export async function registerAdminUploadRoutes(
  app: FastifyInstance,
  uploadService: UploadService,
): Promise<void> {
  await app.register(fastifyMultipart, {
    limits: {files: 1, fields: 0, parts: 1, fileSize: AUDIO_MAX_BYTES},
  });

  app.post<{Reply: PendingUploadResponse}>(
    '/api/admin/uploads/audio',
    {preHandler: requireAdmin},
    async (request, reply) =>
      reply.status(201).send(await ingestMedia(request, uploadService, 'audio')),
  );

  app.post<{Reply: PendingUploadResponse}>(
    '/api/admin/uploads/cover',
    {preHandler: requireAdmin},
    async (request, reply) =>
      reply.status(201).send(await ingestMedia(request, uploadService, 'cover')),
  );

  app.post<{Reply: LrcUploadResponse}>(
    '/api/admin/uploads/lrc',
    {preHandler: requireAdmin},
    async (request) => {
      assertMultipart(request);
      const requestAbort = abortSignalFor(request);
      try {
        let result: LrcUploadResponse | undefined;
        for await (const file of request.files({
          limits: {files: 2, fields: 0, parts: 2, fileSize: LRC_MAX_BYTES + 1},
        })) {
          if (result) {
            file.file.resume();
            throw new UploadValidationError(
              'INVALID_MEDIA',
              '每次上传只允许一个文件',
              422,
            );
          }
          result = await uploadService.ingestLrc({
            originalName: file.filename,
            declaredMime: file.mimetype,
            source: file.file,
            signal: requestAbort.signal,
          });
        }
        if (!result) {
          throw unsupportedUpload();
        }
        return result;
      } finally {
        requestAbort.dispose();
      }
    },
  );

  app.delete<{
    Params: {uploadId: string};
    Reply: ApiErrorBody | undefined;
  }>(
    '/api/admin/uploads/:uploadId',
    {preHandler: requireAdmin},
    async (request, reply) => {
      const token = request.adminSessionToken;
      if (!token) {
        throw new Error('Authenticated cancel request is missing its session token.');
      }
      if (!(await uploadService.cancel(token, request.params.uploadId))) {
        return reply.status(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'The pending upload was not found.',
          },
        });
      }
      return reply.status(204).send(undefined);
    },
  );
}
