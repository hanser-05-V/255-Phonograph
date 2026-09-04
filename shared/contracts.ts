export type HealthResponse = {
  ok: true;
};

export type TaxonomyItem = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
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
