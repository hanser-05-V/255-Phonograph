import type {FastifyReply, FastifyRequest} from 'fastify';

import type {ApiErrorBody} from '../../shared/contracts.js';
import type {AdminAuthService} from './admin-auth-service.js';

declare module 'fastify' {
  interface FastifyInstance {
    adminAuthService: AdminAuthService;
    adminSessionCookieName: string;
    adminCookieSecure: boolean;
  }

  interface FastifyRequest {
    adminSessionToken?: string;
  }
}

export async function requireAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const token = request.cookies[request.server.adminSessionCookieName];
  if (!token || !request.server.adminAuthService.verifySession(token)) {
    const body: ApiErrorBody = {
      error: {
        code: 'UNAUTHORIZED',
        message: 'A valid administrator session is required.',
      },
    };
    await reply.status(401).send(body);
    return;
  }

  request.adminSessionToken = token;
}
