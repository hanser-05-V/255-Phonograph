import type {
  AdminAuthenticatedResponse,
  AdminAuthStatusResponse,
} from '../../shared/contracts';
import {requestJson} from './http';

function jsonPost(body?: unknown, signal?: AbortSignal): RequestInit {
  return {
    method: 'POST',
    credentials: 'same-origin',
    ...(body === undefined ? {} : {
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(body),
    }),
    ...(signal ? {signal} : {}),
  };
}

export const adminApi = {
  getAuthStatus(signal?: AbortSignal): Promise<AdminAuthStatusResponse> {
    return requestJson('/api/admin/auth/status', {
      credentials: 'same-origin',
      ...(signal ? {signal} : {}),
    });
  },

  setup(password: string, signal?: AbortSignal): Promise<AdminAuthenticatedResponse> {
    return requestJson(
      '/api/admin/auth/setup',
      jsonPost({password}, signal),
    );
  },

  login(password: string, signal?: AbortSignal): Promise<AdminAuthenticatedResponse> {
    return requestJson(
      '/api/admin/auth/login',
      jsonPost({password}, signal),
    );
  },

  logout(signal?: AbortSignal): Promise<void> {
    return requestJson('/api/admin/auth/logout', jsonPost(undefined, signal));
  },

  changePassword(
    currentPassword: string,
    newPassword: string,
    signal?: AbortSignal,
  ): Promise<AdminAuthenticatedResponse> {
    return requestJson(
      '/api/admin/auth/password',
      jsonPost({currentPassword, newPassword}, signal),
    );
  },
};
