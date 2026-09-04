import {afterEach, describe, expect, it, vi} from 'vitest';
import {adminApi} from './admin-api';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {'Content-Type': 'application/json'},
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('adminApi', () => {
  it('uses the same-origin session for every authentication request', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({needsSetup: false, authenticated: false}))
      .mockResolvedValueOnce(jsonResponse({authenticated: true}, 201))
      .mockResolvedValueOnce(jsonResponse({authenticated: true}))
      .mockResolvedValueOnce(new Response(null, {status: 204}))
      .mockResolvedValueOnce(jsonResponse({authenticated: true}));
    vi.stubGlobal('fetch', fetchMock);

    await adminApi.getAuthStatus();
    await adminApi.setup('owner-password');
    await adminApi.login('owner-password');
    await adminApi.logout();
    await adminApi.changePassword('owner-password', 'new-owner-password');

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/admin/auth/status', {
      credentials: 'same-origin',
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/admin/auth/setup', {
      body: JSON.stringify({password: 'owner-password'}),
      credentials: 'same-origin',
      headers: {'Content-Type': 'application/json'},
      method: 'POST',
    });
    expect(fetchMock).toHaveBeenNthCalledWith(3, '/api/admin/auth/login', {
      body: JSON.stringify({password: 'owner-password'}),
      credentials: 'same-origin',
      headers: {'Content-Type': 'application/json'},
      method: 'POST',
    });
    expect(fetchMock).toHaveBeenNthCalledWith(4, '/api/admin/auth/logout', {
      credentials: 'same-origin',
      method: 'POST',
    });
    expect(fetchMock).toHaveBeenNthCalledWith(5, '/api/admin/auth/password', {
      body: JSON.stringify({
        currentPassword: 'owner-password',
        newPassword: 'new-owner-password',
      }),
      credentials: 'same-origin',
      headers: {'Content-Type': 'application/json'},
      method: 'POST',
    });
  });

  it('passes an abort signal to the status request owner', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({needsSetup: true, authenticated: false}),
    );
    vi.stubGlobal('fetch', fetchMock);
    const controller = new AbortController();

    await adminApi.getAuthStatus(controller.signal);

    expect(fetchMock).toHaveBeenCalledWith('/api/admin/auth/status', {
      credentials: 'same-origin',
      signal: controller.signal,
    });
  });
});
