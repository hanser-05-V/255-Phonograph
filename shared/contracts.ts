export type HealthResponse = {
  ok: true;
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

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};
