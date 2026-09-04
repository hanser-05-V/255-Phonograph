import {createHash} from 'node:crypto';

import {afterEach, describe, expect, it} from 'vitest';

import {
  AdminAuthError,
  AdminAuthService,
  type AdminAuthServiceDependencies,
} from './admin-auth-service.js';
import {createTestContext, type TestContext} from '../test/test-context.js';

function deterministicDependencies(
  tokens: string[],
  now: () => Date = () => new Date('2026-09-04T00:00:00.000Z'),
): AdminAuthServiceDependencies {
  return {
    now,
    generateSessionToken: () => {
      const token = tokens.shift();
      if (!token) {
        throw new Error('Test session token queue is empty.');
      }
      return token;
    },
  };
}

describe('AdminAuthService', () => {
  let context: TestContext | undefined;

  afterEach(async () => {
    await context?.dispose();
    context = undefined;
  });

  it('sets up the password exactly once without storing plaintext', async () => {
    context = await createTestContext();
    const service = new AdminAuthService(
      context.db,
      deterministicDependencies(['setup-token']),
    );

    expect(service.needsSetup()).toBe(true);
    const session = await service.setup('owner-password');

    expect(service.needsSetup()).toBe(false);
    expect(service.verifySession(session.token)).toBe(true);
    const row = context.db
      .prepare('SELECT password_hash FROM admin_config WHERE singleton = 1')
      .get() as {password_hash: string};
    expect(row.password_hash).not.toContain('owner-password');
    await expect(service.setup('replacement-password')).rejects.toMatchObject({
      code: 'ALREADY_SETUP',
    } satisfies Partial<AdminAuthError>);
  });

  it('allows only one concurrent first-time setup', async () => {
    context = await createTestContext();
    const service = new AdminAuthService(
      context.db,
      deterministicDependencies(['first-token', 'second-token']),
    );

    const results = await Promise.allSettled([
      service.setup('first-password'),
      service.setup('second-password'),
    ]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    const passwordHash = context.db
      .prepare('SELECT password_hash FROM admin_config WHERE singleton = 1')
      .get() as {password_hash: string};
    expect(passwordHash.password_hash).not.toContain('password');
  });

  it('rejects a wrong password and creates a session for a correct login', async () => {
    context = await createTestContext();
    const service = new AdminAuthService(
      context.db,
      deterministicDependencies(['setup-token', 'login-token']),
    );
    await service.setup('owner-password');

    await expect(service.login('wrong-password')).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    } satisfies Partial<AdminAuthError>);
    const login = await service.login('owner-password');

    expect(login.token).toBe('login-token');
    expect(service.verifySession(login.token)).toBe(true);
  });

  it('stores only a SHA-256 token digest and rejects expired or logged-out sessions', async () => {
    context = await createTestContext();
    let now = new Date('2026-09-04T00:00:00.000Z');
    const service = new AdminAuthService(
      context.db,
      deterministicDependencies(['setup-token', 'login-token'], () => now),
    );
    const setup = await service.setup('owner-password');

    const stored = context.db
      .prepare('SELECT digest FROM admin_sessions WHERE digest = ?')
      .get(createHash('sha256').update(setup.token).digest('base64url')) as {
      digest: string;
    };
    expect(stored.digest).not.toBe(setup.token);
    expect(
      context.db
        .prepare('SELECT 1 FROM admin_sessions WHERE digest = ?')
        .get(setup.token),
    ).toBeUndefined();

    now = new Date('2026-09-11T00:00:00.000Z');
    expect(service.verifySession(setup.token)).toBe(false);
    expect(
      context.db.prepare('SELECT 1 FROM admin_sessions').get(),
    ).toBeUndefined();

    const login = await service.login('owner-password');
    service.logout(login.token);
    expect(service.verifySession(login.token)).toBe(false);
  });

  it('changes the password, revokes every old session and issues a fresh one', async () => {
    context = await createTestContext();
    const service = new AdminAuthService(
      context.db,
      deterministicDependencies([
        'setup-token',
        'second-token',
        'changed-token',
        'new-login-token',
      ]),
    );
    const setup = await service.setup('owner-password');
    const second = await service.login('owner-password');

    await expect(
      service.changePassword(
        setup.token,
        'wrong-password',
        'new-owner-password',
      ),
    ).rejects.toMatchObject({code: 'INVALID_CREDENTIALS'});
    expect(service.verifySession(setup.token)).toBe(true);

    const changed = await service.changePassword(
      setup.token,
      'owner-password',
      'new-owner-password',
    );

    expect(service.verifySession(setup.token)).toBe(false);
    expect(service.verifySession(second.token)).toBe(false);
    expect(service.verifySession(changed.token)).toBe(true);
    await expect(service.login('owner-password')).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    } satisfies Partial<AdminAuthError>);
    await expect(service.login('new-owner-password')).resolves.toMatchObject({
      token: 'new-login-token',
    });
  });
});
