import {afterEach, describe, expect, it} from 'vitest';

import {
  createAuthenticatedTestContext,
  createTestContext,
  type AuthenticatedTestContext,
  type TestContext,
} from '../test/test-context.js';

describe('admin taxonomy routes', () => {
  let context: TestContext | AuthenticatedTestContext | undefined;

  afterEach(async () => {
    await context?.dispose();
    context = undefined;
  });

  it('requires an admin session for every taxonomy endpoint', async () => {
    context = await createTestContext();
    const requests = [
      {method: 'GET', url: '/api/admin/categories'},
      {method: 'POST', url: '/api/admin/categories', payload: {name: '现场'}},
      {
        method: 'PATCH',
        url: '/api/admin/categories/category-1',
        payload: {name: '直播'},
      },
      {method: 'DELETE', url: '/api/admin/categories/category-1'},
      {method: 'GET', url: '/api/admin/tags'},
      {method: 'POST', url: '/api/admin/tags', payload: {name: '温柔'}},
      {
        method: 'PATCH',
        url: '/api/admin/tags/tag-1',
        payload: {name: '治愈'},
      },
      {method: 'DELETE', url: '/api/admin/tags/tag-1'},
    ] as const;

    const responses = await Promise.all(
      requests.map((request) => context!.app.inject(request)),
    );

    expect(responses.map(({statusCode}) => statusCode)).toEqual(
      requests.map(() => 401),
    );
  });

  it('creates, lists, renames and deletes categories and tags', async () => {
    context = await createAuthenticatedTestContext();

    const category = await context.app.inject({
      method: 'POST',
      url: '/api/admin/categories',
      headers: {cookie: context.cookie},
      payload: {name: '  直播   翻唱  '},
    });
    const tag = await context.app.inject({
      method: 'POST',
      url: '/api/admin/tags',
      headers: {cookie: context.cookie},
      payload: {name: '温柔'},
    });

    expect(category.statusCode).toBe(201);
    expect(category.json()).toMatchObject({name: '直播 翻唱'});
    expect(tag.statusCode).toBe(201);
    expect(tag.json()).toMatchObject({name: '温柔'});

    const categoryBody = category.json<{id: string}>();
    const tagBody = tag.json<{id: string}>();
    const renamed = await context.app.inject({
      method: 'PATCH',
      url: `/api/admin/categories/${categoryBody.id}`,
      headers: {cookie: context.cookie},
      payload: {name: '现场'},
    });

    expect(renamed.statusCode).toBe(200);
    expect(renamed.json()).toMatchObject({id: categoryBody.id, name: '现场'});
    expect(
      (
        await context.app.inject({
          url: '/api/admin/categories',
          headers: {cookie: context.cookie},
        })
      ).json(),
    ).toEqual([renamed.json()]);
    expect(
      (
        await context.app.inject({
          url: '/api/admin/tags',
          headers: {cookie: context.cookie},
        })
      ).json(),
    ).toEqual([tag.json()]);

    expect(
      (
        await context.app.inject({
          method: 'DELETE',
          url: `/api/admin/categories/${categoryBody.id}`,
          headers: {cookie: context.cookie},
        })
      ).statusCode,
    ).toBe(204);
    expect(
      (
        await context.app.inject({
          method: 'DELETE',
          url: `/api/admin/tags/${tagBody.id}`,
          headers: {cookie: context.cookie},
        })
      ).statusCode,
    ).toBe(204);
  });

  it('rejects invalid bodies and maps duplicate names to a stable conflict', async () => {
    context = await createAuthenticatedTestContext();
    const request = (url: string, payload: unknown) =>
      context!.app.inject({
        method: 'POST',
        url,
        headers: {cookie: context!.cookie},
        payload,
      });

    const empty = await request('/api/admin/categories', {name: '   '});
    const tooLong = await request('/api/admin/tags', {name: '音'.repeat(51)});
    const arrayBody = await request('/api/admin/categories', []);
    const nullBody = await request('/api/admin/categories', null);
    const scalarBody = await context.app.inject({
      method: 'POST',
      url: '/api/admin/categories',
      headers: {
        cookie: context.cookie,
        'content-type': 'application/json',
      },
      payload: JSON.stringify('现场'),
    });
    const nonStringName = await request('/api/admin/tags', {name: 1});
    const undeclaredField = await request('/api/admin/tags', {
      name: '温柔',
      color: 'pink',
    });
    const created = await request('/api/admin/categories', {name: '现场'});
    const duplicate = await request('/api/admin/categories', {name: ' 现场 '});

    expect(empty.statusCode).toBe(400);
    expect(tooLong.statusCode).toBe(400);
    expect(arrayBody.statusCode).toBe(400);
    expect(nullBody.statusCode).toBe(400);
    expect(scalarBody.statusCode).toBe(400);
    expect(nonStringName.statusCode).toBe(400);
    expect(undeclaredField.statusCode).toBe(400);
    expect(created.statusCode).toBe(201);
    expect(duplicate.statusCode).toBe(409);
    expect(duplicate.json()).toEqual({
      error: {
        code: 'TAXONOMY_NAME_CONFLICT',
        message: '分类名称已存在',
      },
    });
  });

  it('returns not found for missing taxonomy IDs', async () => {
    context = await createAuthenticatedTestContext();

    const renamed = await context.app.inject({
      method: 'PATCH',
      url: '/api/admin/tags/missing',
      headers: {cookie: context.cookie},
      payload: {name: '温柔'},
    });
    const deleted = await context.app.inject({
      method: 'DELETE',
      url: '/api/admin/categories/missing',
      headers: {cookie: context.cookie},
    });

    expect(renamed.statusCode).toBe(404);
    expect(renamed.json()).toEqual({
      error: {
        code: 'TAXONOMY_NOT_FOUND',
        message: '标签不存在',
      },
    });
    expect(deleted.statusCode).toBe(404);
    expect(deleted.json()).toEqual({
      error: {
        code: 'TAXONOMY_NOT_FOUND',
        message: '分类不存在',
      },
    });
  });
});
