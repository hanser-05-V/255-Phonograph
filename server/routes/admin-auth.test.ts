import {afterEach, describe, expect, it} from 'vitest';

import {requireAdmin} from '../auth/require-admin.js';
import {
  createAuthenticatedTestContext,
  createTestContext,
  type AuthenticatedTestContext,
  type TestContext,
} from '../test/test-context.js';

function cookiePair(setCookie: string | string[] | undefined): string {
  const value = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  if (!value) {
    throw new Error('Expected a Set-Cookie header.');
  }
  return value.split(';', 1)[0];
}

describe('admin auth routes', () => {
  let context: TestContext | AuthenticatedTestContext | undefined;

  afterEach(async () => {
    await context?.dispose();
    context = undefined;
  });

  it('supports first-time setup and sets a hardened seven-day cookie', async () => {
    context = await createTestContext();
    expect(
      (await context.app.inject({url: '/api/admin/auth/status'})).json(),
    ).toEqual({needsSetup: true, authenticated: false});

    const setup = await context.app.inject({
      method: 'POST',
      url: '/api/admin/auth/setup',
      payload: {password: 'owner-password'},
    });

    expect(setup.statusCode).toBe(201);
    expect(setup.json()).toEqual({authenticated: true});
    expect(setup.headers['set-cookie']).toContain('HttpOnly');
    expect(setup.headers['set-cookie']).toContain('SameSite=Strict');
    expect(setup.headers['set-cookie']).toContain('Path=/');
    expect(setup.headers['set-cookie']).toContain('Max-Age=604800');
    expect(setup.headers['set-cookie']).not.toContain('Secure');
    expect(
      (
        await context.app.inject({
          url: '/api/admin/auth/status',
          headers: {cookie: cookiePair(setup.headers['set-cookie'])},
        })
      ).json(),
    ).toEqual({needsSetup: false, authenticated: true});
  });

  it('rejects repeated setup, invalid passwords and wrong login credentials', async () => {
    context = await createTestContext();
    await context.app.inject({
      method: 'POST',
      url: '/api/admin/auth/setup',
      payload: {password: 'owner-password'},
    });

    const repeated = await context.app.inject({
      method: 'POST',
      url: '/api/admin/auth/setup',
      payload: {password: 'another-password'},
    });
    const tooShort = await context.app.inject({
      method: 'POST',
      url: '/api/admin/auth/login',
      payload: {password: '短密码'},
    });
    const tooLong = await context.app.inject({
      method: 'POST',
      url: '/api/admin/auth/login',
      payload: {password: '密'.repeat(201)},
    });
    const wrong = await context.app.inject({
      method: 'POST',
      url: '/api/admin/auth/login',
      payload: {password: 'wrong-password'},
    });

    expect(repeated.statusCode).toBe(409);
    expect(tooShort.statusCode).toBe(400);
    expect(tooLong.statusCode).toBe(400);
    expect(wrong.statusCode).toBe(401);
  });

  it('adds Secure only when HTTPS cookies are explicitly configured', async () => {
    context = await createTestContext({secureCookies: true});

    const setup = await context.app.inject({
      method: 'POST',
      url: '/api/admin/auth/setup',
      payload: {password: 'owner-password'},
    });

    expect(setup.headers['set-cookie']).toContain('Secure');
  });

  it('rejects an uncredentialed protected route and invalidates a logged-out cookie', async () => {
    context = await createTestContext();
    context.app.post(
      '/api/admin/protected-test',
      {preHandler: requireAdmin},
      async () => ({ok: true}),
    );
    const setup = await context.app.inject({
      method: 'POST',
      url: '/api/admin/auth/setup',
      payload: {password: 'owner-password'},
    });
    const cookie = cookiePair(setup.headers['set-cookie']);

    const rejected = await context.app.inject({
      method: 'POST',
      url: '/api/admin/protected-test',
    });
    const accepted = await context.app.inject({
      method: 'POST',
      url: '/api/admin/protected-test',
      headers: {cookie},
    });
    const logout = await context.app.inject({
      method: 'POST',
      url: '/api/admin/auth/logout',
      headers: {cookie},
    });
    const rejectedAfterLogout = await context.app.inject({
      method: 'POST',
      url: '/api/admin/protected-test',
      headers: {cookie},
    });

    expect(rejected.statusCode).toBe(401);
    expect(accepted.statusCode).toBe(200);
    expect(logout.statusCode).toBe(204);
    expect(logout.headers['set-cookie']).toContain('HttpOnly');
    expect(logout.headers['set-cookie']).toContain('SameSite=Strict');
    expect(logout.headers['set-cookie']).toContain('Path=/');
    expect(logout.headers['set-cookie']).toContain('Max-Age=0');
    expect(rejectedAfterLogout.statusCode).toBe(401);
  });

  it('changes the password, revokes existing sessions and returns a new cookie', async () => {
    context = await createAuthenticatedTestContext();
    const secondLogin = await context.app.inject({
      method: 'POST',
      url: '/api/admin/auth/login',
      payload: {password: 'owner-password'},
    });
    const secondCookie = cookiePair(secondLogin.headers['set-cookie']);

    const changed = await context.app.inject({
      method: 'POST',
      url: '/api/admin/auth/password',
      headers: {cookie: context.cookie},
      payload: {
        currentPassword: 'owner-password',
        newPassword: 'new-owner-password',
      },
    });

    expect(changed.statusCode).toBe(200);
    expect(changed.json()).toEqual({authenticated: true});
    const changedCookie = cookiePair(changed.headers['set-cookie']);
    expect(
      (
        await context.app.inject({
          url: '/api/admin/auth/status',
          headers: {cookie: context.cookie},
        })
      ).json(),
    ).toEqual({needsSetup: false, authenticated: false});
    expect(
      (
        await context.app.inject({
          url: '/api/admin/auth/status',
          headers: {cookie: secondCookie},
        })
      ).json(),
    ).toEqual({needsSetup: false, authenticated: false});
    expect(
      (
        await context.app.inject({
          url: '/api/admin/auth/status',
          headers: {cookie: changedCookie},
        })
      ).json(),
    ).toEqual({needsSetup: false, authenticated: true});
  });

  it('never returns password, hash, session token or digest in response bodies', async () => {
    context = await createTestContext();
    const password = 'owner-password';
    const setup = await context.app.inject({
      method: 'POST',
      url: '/api/admin/auth/setup',
      payload: {password},
    });
    const digest = (
      context.db.prepare('SELECT digest FROM admin_sessions').get() as {
        digest: string;
      }
    ).digest;

    expect(setup.body).not.toContain(password);
    expect(setup.body).not.toContain('scrypt$');
    expect(setup.body).not.toContain(digest);
    expect(setup.body).not.toContain(cookiePair(setup.headers['set-cookie']).split('=')[1]);
  });
});
