import type {FastifyInstance, FastifyReply} from 'fastify';

import type {
  AdminAuthenticatedResponse,
  AdminAuthStatusResponse,
  AdminChangePasswordRequest,
  AdminPasswordRequest,
  ApiErrorBody,
} from '../../shared/contracts.js';
import {requireAdmin} from '../auth/require-admin.js';

const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

function validPassword(password: unknown): password is string {
  if (typeof password !== 'string') {
    return false;
  }
  const length = Array.from(password).length;
  return length >= 8 && length <= 200;
}

function sendInvalidPassword(reply: FastifyReply): void {
  const body: ApiErrorBody = {
    error: {
      code: 'INVALID_PASSWORD',
      message: 'Password must contain between 8 and 200 Unicode characters.',
    },
  };
  void reply.status(400).send(body);
}

function cookieOptions(app: FastifyInstance) {
  return {
    httpOnly: true,
    sameSite: 'strict' as const,
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
    secure: app.adminCookieSecure,
  };
}

function setSessionCookie(
  app: FastifyInstance,
  reply: FastifyReply,
  token: string,
): void {
  reply.setCookie(app.adminSessionCookieName, token, cookieOptions(app));
}

export async function registerAdminAuthRoutes(
  app: FastifyInstance,
): Promise<void> {
  app.get<{Reply: AdminAuthStatusResponse}>(
    '/api/admin/auth/status',
    async (request) => {
      const token = request.cookies[app.adminSessionCookieName];
      return {
        needsSetup: app.adminAuthService.needsSetup(),
        authenticated: app.adminAuthService.verifySession(token),
      };
    },
  );

  app.post<{Body: AdminPasswordRequest; Reply: AdminAuthenticatedResponse}>(
    '/api/admin/auth/setup',
    async (request, reply) => {
      if (!validPassword(request.body?.password)) {
        sendInvalidPassword(reply);
        return;
      }

      const session = await app.adminAuthService.setup(request.body.password);
      setSessionCookie(app, reply, session.token);
      return reply.status(201).send({authenticated: true});
    },
  );

  app.post<{Body: AdminPasswordRequest; Reply: AdminAuthenticatedResponse}>(
    '/api/admin/auth/login',
    async (request, reply) => {
      if (!validPassword(request.body?.password)) {
        sendInvalidPassword(reply);
        return;
      }

      const session = await app.adminAuthService.login(request.body.password);
      setSessionCookie(app, reply, session.token);
      return {authenticated: true};
    },
  );

  app.post('/api/admin/auth/logout', async (request, reply) => {
    app.adminAuthService.logout(
      request.cookies[app.adminSessionCookieName],
    );
    reply.clearCookie(app.adminSessionCookieName, cookieOptions(app));
    return reply.status(204).send();
  });

  app.post<{
    Body: AdminChangePasswordRequest;
    Reply: AdminAuthenticatedResponse;
  }>(
    '/api/admin/auth/password',
    {preHandler: requireAdmin},
    async (request, reply) => {
      if (
        !validPassword(request.body?.currentPassword) ||
        !validPassword(request.body?.newPassword)
      ) {
        sendInvalidPassword(reply);
        return;
      }

      const session = await app.adminAuthService.changePassword(
        request.adminSessionToken,
        request.body.currentPassword,
        request.body.newPassword,
      );
      setSessionCookie(app, reply, session.token);
      return {authenticated: true};
    },
  );
}
