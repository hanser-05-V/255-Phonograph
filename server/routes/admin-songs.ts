import type {FastifyInstance} from 'fastify';

import type {
  AdminSong,
  ApiErrorBody,
  SongDraftInput,
  SongStatus,
} from '../../shared/contracts.js';
import {requireAdmin} from '../auth/require-admin.js';
import {SongError, type SongService} from '../songs/song-service.js';
import {
  SongValidationError,
  validateSongDraftInput,
} from '../songs/song-validation.js';

type SongParams = {id: string};
type SongListQuery = {status?: string};
type DeleteBody = {confirmSongId: string};

const SONG_STATUSES = new Set<SongStatus>([
  'draft',
  'published',
  'unlisted',
  'trashed',
]);

function readStatus(value: string | undefined): SongStatus | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!SONG_STATUSES.has(value as SongStatus)) {
    throw new SongValidationError('歌曲状态筛选无效');
  }
  return value as SongStatus;
}

function readConfirmation(body: unknown): {confirmSongId?: string} {
  if (
    typeof body !== 'object' ||
    body === null ||
    Array.isArray(body) ||
    Object.keys(body).length !== 1 ||
    !Object.hasOwn(body, 'confirmSongId') ||
    typeof (body as {confirmSongId?: unknown}).confirmSongId !== 'string'
  ) {
    return {};
  }
  return {confirmSongId: (body as DeleteBody).confirmSongId};
}

function sessionToken(request: {adminSessionToken?: string}): string {
  if (!request.adminSessionToken) {
    throw new Error('Authenticated song request is missing its session token.');
  }
  return request.adminSessionToken;
}

function assertNoBody(body: unknown): void {
  if (body !== undefined) {
    throw new SongValidationError('该歌曲生命周期操作不接受请求体');
  }
}

export async function registerAdminSongRoutes(
  app: FastifyInstance,
  service: SongService,
): Promise<void> {
  app.get<{Querystring: SongListQuery; Reply: AdminSong[]}>(
    '/api/admin/songs',
    {preHandler: requireAdmin},
    async (request) => service.listAdmin(readStatus(request.query.status)),
  );

  app.post<{Body: SongDraftInput; Reply: AdminSong}>(
    '/api/admin/songs',
    {preHandler: requireAdmin},
    async (request, reply) => reply.status(201).send(
      await service.createDraft(
        sessionToken(request),
        validateSongDraftInput(request.body),
      ),
    ),
  );

  app.get<{Params: SongParams; Reply: AdminSong}>(
    '/api/admin/songs/:id',
    {preHandler: requireAdmin},
    async (request) => service.getAdmin(request.params.id),
  );

  app.put<{Body: SongDraftInput; Params: SongParams; Reply: AdminSong}>(
    '/api/admin/songs/:id',
    {preHandler: requireAdmin},
    async (request) => service.update(
      sessionToken(request),
      request.params.id,
      validateSongDraftInput(request.body),
    ),
  );

  app.post<{Params: SongParams; Reply: AdminSong}>(
    '/api/admin/songs/:id/publish',
    {preHandler: requireAdmin},
    async (request) => {
      assertNoBody(request.body);
      return service.publish(request.params.id);
    },
  );

  app.post<{Params: SongParams; Reply: AdminSong}>(
    '/api/admin/songs/:id/unpublish',
    {preHandler: requireAdmin},
    async (request) => {
      assertNoBody(request.body);
      return service.unpublish(request.params.id);
    },
  );

  app.post<{Params: SongParams; Reply: AdminSong}>(
    '/api/admin/songs/:id/trash',
    {preHandler: requireAdmin},
    async (request) => {
      assertNoBody(request.body);
      return service.moveToTrash(request.params.id);
    },
  );

  app.post<{Params: SongParams; Reply: AdminSong}>(
    '/api/admin/songs/:id/restore',
    {preHandler: requireAdmin},
    async (request) => {
      assertNoBody(request.body);
      return service.restore(request.params.id);
    },
  );

  app.delete<{
    Body: DeleteBody;
    Params: SongParams;
    Reply: ApiErrorBody | undefined;
  }>(
    '/api/admin/songs/:id',
    {preHandler: requireAdmin},
    async (request, reply) => {
      await service.permanentlyDelete(
        request.params.id,
        readConfirmation(request.body),
      );
      return reply.status(204).send(undefined);
    },
  );
}
