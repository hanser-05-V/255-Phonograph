import {afterEach, describe, expect, it} from 'vitest';

import {
  createAuthenticatedTestContext,
  createTestContext,
  type AuthenticatedTestContext,
  type TestContext,
} from '../test/test-context.js';

describe('admin settings routes', () => {
  let context: TestContext | AuthenticatedTestContext | undefined;

  afterEach(async () => {
    await context?.dispose();
    context = undefined;
  });

  it('requires an authenticated admin', async () => {
    context = await createTestContext();

    const response = await context.app.inject({
      method: 'GET',
      url: '/api/admin/settings',
    });

    expect(response.statusCode).toBe(401);
  });

  it('returns only the display data directory to an authenticated admin', async () => {
    context = await createAuthenticatedTestContext();

    const response = await context.app.inject({
      method: 'GET',
      url: '/api/admin/settings',
      headers: {cookie: context.cookie},
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({dataDirectoryDisplay: context.config.dataDir});
    expect(response.body).not.toContain('library.sqlite');
    expect(response.body).not.toContain('password');
    expect(response.body).not.toContain('media');
  });
});
