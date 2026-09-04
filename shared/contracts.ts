export type HealthResponse = {
  ok: true;
};

export type TaxonomyItem = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type SongStatus = 'draft' | 'published' | 'unlisted' | 'trashed';

export type AdminMediaSummary = {
  id: string;
  originalName: string;
  mimeType: string;
  byteSize: number;
};

export type AdminSong = {
  id: string;
  title: string;
  artist: string;
  status: SongStatus;
  statusBeforeTrash: 'draft' | 'unlisted' | null;
  durationSeconds: number | null;
  audio: AdminMediaSummary | null;
  cover: AdminMediaSummary | null;
  lyricsText: string;
  categoryId: string | null;
  tagIds: string[];
  versionNote: string;
  performanceDate: string;
  sourceUrl: string;
  isFeatured: boolean;
  isLiveCover: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SongDraftInput = {
  title: string;
  artist: string;
  audioUploadId?: string;
  coverUploadId?: string;
  lyricsText: string;
  categoryId: string | null;
  tagIds: string[];
  versionNote: string;
  performanceDate: string;
  sourceUrl: string;
  isFeatured: boolean;
  isLiveCover: boolean;
  confirmDuplicate: boolean;
  confirmAudioReplacement: boolean;
};

export type AdminAuthStatusResponse = {
  needsSetup: boolean;
  authenticated: boolean;
};

export type AdminAuthenticatedResponse = {
  authenticated: true;
};

export type AdminPasswordRequest = {
  password: string;
};

export type AdminChangePasswordRequest = {
  currentPassword: string;
  newPassword: string;
};

export type PendingUploadResponse = {
  uploadId: string;
  originalName: string;
  mimeType: string;
  byteSize: number;
  durationSeconds: number | null;
};

export type LrcValidationResponse = {
  valid: boolean;
  errors: Array<{line: number; message: string}>;
};

export type LrcUploadResponse = {
  content: string;
  validation: LrcValidationResponse;
};

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};
