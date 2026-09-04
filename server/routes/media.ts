import type {FastifyInstance, FastifyReply, FastifyRequest} from 'fastify';
import type {DatabaseSync} from 'node:sqlite';

import type {ApiErrorBody} from '../../shared/contracts.js';
import {parseByteRange} from '../http/range.js';
import type {MediaStore} from '../storage/media-store.js';

type MediaRow = {
  kind: 'audio' | 'cover';
  storage_key: string;
  mime_type: string;
  byte_size: number;
};

const PUBLIC_MEDIA_MIME_TYPES = {
  audio: new Set(['audio/mpeg', 'audio/mp4', 'video/mp4', 'audio/wav']),
  cover: new Set(['image/jpeg', 'image/png', 'image/webp']),
} satisfies Record<MediaRow['kind'], ReadonlySet<string>>;

export function isPublicMediaMime(
  kind: MediaRow['kind'],
  mimeType: string,
): boolean {
  return PUBLIC_MEDIA_MIME_TYPES[kind].has(mimeType.toLowerCase());
}

const MEDIA_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TRANSITION_MEDIA_IDS = new Set([
  'media-first',
  'media-volcano',
  'media-night',
]);

function isMediaId(value: string): boolean {
  return MEDIA_ID_PATTERN.test(value) || TRANSITION_MEDIA_IDS.has(value);
}

function notFound(reply: FastifyReply): FastifyReply {
  return reply.status(404).send({
    error: {
      code: 'NOT_FOUND',
      message: 'The requested resource was not found.',
    },
  } satisfies ApiErrorBody);
}

function isMissingFile(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}

function destroyStream(stream: NodeJS.ReadableStream): void {
  if (!('destroy' in stream) || typeof stream.destroy !== 'function') {
    throw new Error('Media store returned a stream that cannot be closed');
  }
  stream.destroy();
}

export async function registerMediaRoutes(
  app: FastifyInstance,
  db: DatabaseSync,
  mediaStore: MediaStore,
): Promise<void> {
  type MediaRequest = FastifyRequest<{Params: {mediaId: string}}>;

  const serveMedia = async (
    request: MediaRequest,
    reply: FastifyReply,
    headOnly: boolean,
  ): Promise<FastifyReply> => {
    const {mediaId} = request.params;
    if (!isMediaId(mediaId)) {
      return notFound(reply);
    }
    const row = db.prepare(`
      SELECT kind, storage_key, mime_type, byte_size
      FROM media_objects
      WHERE id = ?
    `).get(mediaId) as MediaRow | undefined;
    if (!row || !isPublicMediaMime(row.kind, row.mime_type)) {
      return notFound(reply);
    }

    let range = null;
    if (row.kind === 'audio') {
      try {
        range = parseByteRange(request.headers.range, row.byte_size);
      } catch (error) {
        if (!(error instanceof RangeError)) {
          throw error;
        }
        return reply
          .status(416)
          .header('content-range', `bytes */${row.byte_size}`)
          .send();
      }
    }

    try {
      const media = await mediaStore.open(row.storage_key, range ?? undefined);
      reply.type(row.mime_type).header('content-length', media.contentLength);
      if (row.kind === 'audio') {
        reply.header('accept-ranges', 'bytes');
      }
      if (range) {
        reply
          .status(206)
          .header(
            'content-range',
            `bytes ${range.start}-${range.end}/${media.byteSize}`,
          );
      }
      if (headOnly) {
        destroyStream(media.stream);
        return reply.send();
      }
      return reply.send(media.stream);
    } catch (error) {
      if (isMissingFile(error)) {
        return notFound(reply);
      }
      throw error;
    }
  };

  app.get<{Params: {mediaId: string}}>(
    '/api/media/:mediaId',
    {exposeHeadRoute: false},
    async (request, reply) => serveMedia(request, reply, false),
  );
  app.head<{Params: {mediaId: string}}>(
    '/api/media/:mediaId',
    async (request, reply) => serveMedia(request, reply, true),
  );
}
