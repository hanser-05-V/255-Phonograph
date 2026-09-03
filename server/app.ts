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
import type {AppConfig} from './config.js';

export type BuildAppDependencies = {
  config: AppConfig;
  database?: DatabaseSync;
  frontendDir?: string;
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

  await app.register(fastifyCookie);

  if (database) {
    app.addHook('onClose', () => {
      database.close();
    });
  }

  app.get<{Reply: HealthResponse}>('/api/health', async () => ({ok: true}));

  app.setErrorHandler<FastifyError>((error, _request, reply) => {
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

  if (dependencies.frontendDir) {
    await registerStaticFrontend(app, dependencies.frontendDir);
  } else {
    app.setNotFoundHandler((_request, reply) =>
      reply.status(404).send(notFoundBody()),
    );
  }

  return app;
}
