import {afterEach, describe, expect, it, vi} from 'vitest';
import {ApiError, requestJson} from './http';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('requestJson', () => {
  it('preserves stable server error codes', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: {code: 'LIBRARY_FAILED', message: '曲库读取失败'},
    }), {status: 500, headers: {'Content-Type': 'application/json'}})));

    await expect(requestJson('/api/library')).rejects.toMatchObject({
      status: 500,
      code: 'LIBRARY_FAILED',
      message: '曲库读取失败',
    });
  });

  it('maps fetch network failures to the stable unavailable error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(requestJson('/api/library')).rejects.toEqual(
      expect.objectContaining({
        status: 0,
        code: 'SERVICE_UNAVAILABLE',
        message: '本地服务未运行',
      }),
    );
  });

  it('does not try to parse non-JSON error bodies', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Proxy failure', {
      status: 502,
      headers: {'Content-Type': 'text/plain'},
    })));

    await expect(requestJson('/api/library')).rejects.toMatchObject({
      status: 502,
      code: 'HTTP_ERROR',
      message: '请求失败',
    });
  });

  it('keeps malformed JSON error bodies inside the ApiError boundary', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{not-json', {
      status: 502,
      headers: {'Content-Type': 'application/json'},
    })));

    await expect(requestJson('/api/library')).rejects.toMatchObject({
      status: 502,
      code: 'HTTP_ERROR',
      message: '请求失败',
    });
  });

  it('returns undefined for an empty 204 response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, {status: 204})));

    await expect(requestJson('/api/session', {method: 'DELETE'})).resolves.toBeUndefined();
  });

  it('preserves abort errors so request owners can ignore cancellation', async () => {
    const abortError = new DOMException('Aborted', 'AbortError');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abortError));

    await expect(requestJson('/api/library')).rejects.toBe(abortError);
    expect(abortError).not.toBeInstanceOf(ApiError);
  });
});
