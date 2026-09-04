import type {
  AdminSong,
  AdminAuthenticatedResponse,
  AdminAuthStatusResponse,
  SongDraftInput,
  SongStatus,
  TaxonomyItem,
} from '../../shared/contracts';
import {requestJson} from './http';

type TaxonomyNameInput = {name: string};

export type AdminSettingsResponse = {
  dataDirectoryDisplay: string;
};

function jsonMutation(
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  body?: unknown,
  signal?: AbortSignal,
): RequestInit {
  return {
    method,
    credentials: 'same-origin',
    ...(body === undefined ? {} : {
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(body),
    }),
    ...(signal ? {signal} : {}),
  };
}

function jsonPost(body?: unknown, signal?: AbortSignal): RequestInit {
  return jsonMutation('POST', body, signal);
}

function authenticatedGet(signal?: AbortSignal): RequestInit {
  return {
    credentials: 'same-origin',
    ...(signal ? {signal} : {}),
  };
}

export const adminApi = {
  getAuthStatus(signal?: AbortSignal): Promise<AdminAuthStatusResponse> {
    return requestJson('/api/admin/auth/status', authenticatedGet(signal));
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

  listCategories(signal?: AbortSignal): Promise<TaxonomyItem[]> {
    return requestJson('/api/admin/categories', authenticatedGet(signal));
  },

  createCategory(
    input: TaxonomyNameInput,
    signal?: AbortSignal,
  ): Promise<TaxonomyItem> {
    return requestJson(
      '/api/admin/categories',
      jsonMutation('POST', input, signal),
    );
  },

  renameCategory(
    id: string,
    input: TaxonomyNameInput,
    signal?: AbortSignal,
  ): Promise<TaxonomyItem> {
    return requestJson(
      `/api/admin/categories/${encodeURIComponent(id)}`,
      jsonMutation('PATCH', input, signal),
    );
  },

  deleteCategory(id: string, signal?: AbortSignal): Promise<void> {
    return requestJson(
      `/api/admin/categories/${encodeURIComponent(id)}`,
      jsonMutation('DELETE', undefined, signal),
    );
  },

  listTags(signal?: AbortSignal): Promise<TaxonomyItem[]> {
    return requestJson('/api/admin/tags', authenticatedGet(signal));
  },

  createTag(input: TaxonomyNameInput, signal?: AbortSignal): Promise<TaxonomyItem> {
    return requestJson('/api/admin/tags', jsonMutation('POST', input, signal));
  },

  renameTag(
    id: string,
    input: TaxonomyNameInput,
    signal?: AbortSignal,
  ): Promise<TaxonomyItem> {
    return requestJson(
      `/api/admin/tags/${encodeURIComponent(id)}`,
      jsonMutation('PATCH', input, signal),
    );
  },

  deleteTag(id: string, signal?: AbortSignal): Promise<void> {
    return requestJson(
      `/api/admin/tags/${encodeURIComponent(id)}`,
      jsonMutation('DELETE', undefined, signal),
    );
  },

  getSettings(signal?: AbortSignal): Promise<AdminSettingsResponse> {
    return requestJson('/api/admin/settings', authenticatedGet(signal));
  },

  listSongs(status?: SongStatus, signal?: AbortSignal): Promise<AdminSong[]> {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return requestJson(`/api/admin/songs${query}`, authenticatedGet(signal));
  },

  getSong(id: string, signal?: AbortSignal): Promise<AdminSong> {
    return requestJson(
      `/api/admin/songs/${encodeURIComponent(id)}`,
      authenticatedGet(signal),
    );
  },

  saveSong(
    id: string | undefined,
    input: SongDraftInput,
    signal?: AbortSignal,
  ): Promise<AdminSong> {
    return requestJson(
      id ? `/api/admin/songs/${encodeURIComponent(id)}` : '/api/admin/songs',
      jsonMutation(id ? 'PUT' : 'POST', input, signal),
    );
  },

  publishSong(id: string, signal?: AbortSignal): Promise<AdminSong> {
    return requestJson(
      `/api/admin/songs/${encodeURIComponent(id)}/publish`,
      jsonPost(undefined, signal),
    );
  },

  unpublishSong(id: string, signal?: AbortSignal): Promise<AdminSong> {
    return requestJson(
      `/api/admin/songs/${encodeURIComponent(id)}/unpublish`,
      jsonPost(undefined, signal),
    );
  },

  trashSong(id: string, signal?: AbortSignal): Promise<AdminSong> {
    return requestJson(
      `/api/admin/songs/${encodeURIComponent(id)}/trash`,
      jsonPost(undefined, signal),
    );
  },

  restoreSong(id: string, signal?: AbortSignal): Promise<AdminSong> {
    return requestJson(
      `/api/admin/songs/${encodeURIComponent(id)}/restore`,
      jsonPost(undefined, signal),
    );
  },

  permanentlyDeleteSong(
    id: string,
    confirmSongId: string,
    signal?: AbortSignal,
  ): Promise<void> {
    return requestJson(
      `/api/admin/songs/${encodeURIComponent(id)}`,
      jsonMutation('DELETE', {confirmSongId}, signal),
    );
  },

  cancelUpload(uploadId: string, signal?: AbortSignal): Promise<void> {
    return requestJson(
      `/api/admin/uploads/${encodeURIComponent(uploadId)}`,
      jsonMutation('DELETE', undefined, signal),
    );
  },
};
