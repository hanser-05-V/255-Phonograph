import fastifyCookie from '@fastify/cookie';
import fastifyStatic from '@fastify/static';
import Fastify, {
  type FastifyError,
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
} from 'fastify';
import type {DatabaseSync} from 'node:sqlite';

import type {ApiErrorBody, HealthResponse} from '../shared/contracts.js';
import {AdminAuthService} from './auth/admin-auth-service.js';
import type {AppConfig} from './config.js';
import {UploadValidationError} from './media/media-validation.js';
import {UploadService} from './media/upload-service.js';
import {CleanupService} from './media/cleanup-service.js';
import {registerAdminAuthRoutes} from './routes/admin-auth.js';
import {registerAdminSongRoutes} from './routes/admin-songs.js';
import {registerAdminSettingsRoutes} from './routes/admin-settings.js';
import {registerAdminTaxonomyRoutes} from './routes/admin-taxonomy.js';
import {registerAdminUploadRoutes} from './routes/admin-uploads.js';
import {registerMediaRoutes} from './routes/media.js';
import {registerPublicLibraryRoutes} from './routes/public-library.js';
import {LocalMediaStore} from './storage/local-media-store.js';
import type {MediaStore} from './storage/media-store.js';
import {SongError, SongService} from './songs/song-service.js';
import {SongValidationError} from './songs/song-validation.js';
import {
  TaxonomyError,
  TaxonomyService,
} from './taxonomy/taxonomy-service.js';

export type BuildAppDependencies = {
  config: AppConfig;
  database?: DatabaseSync;
  frontendDir?: string;
  secureCookies?: boolean;
  mediaStore?: MediaStore;
};

function notFoundBody(): ApiErrorBody {
  return {
    error: {
      code: 'NOT_FOUND',
      message: 'The requested resource was not found.',
    },
  };
}

function isApiPath(url: string): boolean {
  const [pathname] = url.split('?', 1);
  return pathname === '/api' || pathname.startsWith('/api/');
}

function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler<FastifyError>((error, _request, reply) => {
    if (error instanceof UploadValidationError) {
      const body: ApiErrorBody = {
        error: {code: error.code, message: error.message},
      };
      return reply.status(error.statusCode).send(body);
    }

    if (error instanceof TaxonomyError) {
      const body: ApiErrorBody = {
        error: {code: error.code, message: error.message},
      };
      return reply.status(error.statusCode).send(body);
    }

    if (error instanceof SongValidationError || error instanceof SongError) {
      const body: ApiErrorBody = {
        error: {
          code: error.code,
          message: error.message,
          ...(error instanceof SongError && error.details !== undefined
            ? {details: error.details}
            : {}),
        },
      };
      return reply.status(error.statusCode).send(body);
    }

    if (error.code === 'FST_REQ_FILE_TOO_LARGE') {
      return reply.status(413).send({
        error: {code: 'FILE_TOO_LARGE', message: '上传文件超过大小限制'},
      } satisfies ApiErrorBody);
    }

    if (
      error.code === 'FST_INVALID_MULTIPART_CONTENT_TYPE' ||
      error.code === 'FST_FILES_LIMIT' ||
      error.code === 'FST_PARTS_LIMIT' ||
      error.code === 'FST_FIELDS_LIMIT'
    ) {
      const invalidStructure = error.code !== 'FST_INVALID_MULTIPART_CONTENT_TYPE';
      return reply.status(invalidStructure ? 422 : 415).send({
        error: {
          code: invalidStructure ? 'INVALID_MEDIA' : 'UNSUPPORTED_MEDIA_TYPE',
          message: invalidStructure
            ? '每次上传只允许一个文件'
            : '请求必须使用 multipart/form-data',
        },
      } satisfies ApiErrorBody);
    }

    const statusCode = error.statusCode ?? 500;
    const body: ApiErrorBody = {
      error: {
        code: statusCode >= 500 ? 'INTERNAL_SERVER_ERROR' : 'REQUEST_ERROR',
        message:
          statusCode >= 500 ? 'An unexpected server error occurred.' : error.message,
      },
    };

    return reply.status(statusCode).send(body);
  });
}

async function registerStaticFrontend(
  app: FastifyInstance,
  frontendDir: string,
): Promise<void> {
  await app.register(fastifyStatic, {
    root: frontendDir,
  });

  app.setNotFoundHandler(
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (request.method === 'GET' && !isApiPath(request.url)) {
        return reply.type('text/html').sendFile('index.html');
      }

      return reply.status(404).send(notFoundBody());
    },
  );
}

export async function buildApp(
  dependencies: BuildAppDependencies,
): Promise<FastifyInstance> {
  const app = Fastify();
  const {database} = dependencies;

  registerErrorHandler(app);

  await app.register(fastifyCookie);

  if (database) {
    const mediaStore = dependencies.mediaStore ??
      new LocalMediaStore(dependencies.config.mediaDir);
    app.decorate('adminAuthService', new AdminAuthService(database));
    app.decorate('adminSessionCookieName', dependencies.config.sessionCookieName);
    app.decorate('adminCookieSecure', dependencies.secureCookies === true);
    await app.register(registerAdminAuthRoutes);
    await app.register(
      async (settingsRoutes) => registerAdminSettingsRoutes(
        settingsRoutes,
        dependencies.config.dataDir,
      ),
    );
    const taxonomyService = new TaxonomyService(database);
    await app.register(
      async (taxonomyRoutes) =>
        registerAdminTaxonomyRoutes(taxonomyRoutes, taxonomyService),
    );
    const cleanupService = new CleanupService(database, mediaStore);
    await cleanupService.drain();
    const uploadService = new UploadService(
      database,
      mediaStore,
      dependencies.config.mediaDir,
    );
    await uploadService.cleanupStalePendingUploads();
    await app.register(
      async (uploadRoutes) =>
        registerAdminUploadRoutes(
          uploadRoutes,
          uploadService,
        ),
    );
    const songService = new SongService(database, mediaStore);
    await app.register(
      async (songRoutes) => registerAdminSongRoutes(songRoutes, songService),
    );
    await app.register(
      async (publicRoutes) => registerPublicLibraryRoutes(publicRoutes, database),
    );
    await app.register(
      async (mediaRoutes) => registerMediaRoutes(mediaRoutes, database, mediaStore),
    );

    app.addHook('onClose', () => {
      database.close();
    });
  }

  app.get<{Reply: HealthResponse}>('/api/health', async () => ({ok: true}));

  if (dependencies.frontendDir) {
    await registerStaticFrontend(app, dependencies.frontendDir);
  } else {
    app.setNotFoundHandler((_request, reply) =>
      reply.status(404).send(notFoundBody()),
    );
  }

  return app;
}
