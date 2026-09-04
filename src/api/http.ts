import type {ApiErrorBody} from '../../shared/contracts';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function isJsonContentType(contentType: string | null) {
  const mediaType = contentType?.split(';', 1)[0].trim().toLowerCase();
  return mediaType === 'application/json' || mediaType?.endsWith('+json') === true;
}

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  if (!value || typeof value !== 'object' || !('error' in value)) {
    return false;
  }

  const error = value.error;
  return Boolean(
    error &&
    typeof error === 'object' &&
    'code' in error &&
    typeof error.code === 'string' &&
    'message' in error &&
    typeof error.message === 'string',
  );
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === 'AbortError';
}

export async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(url, init);
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    if (error instanceof TypeError) {
      throw new ApiError(0, 'SERVICE_UNAVAILABLE', '本地服务未运行');
    }

    throw error;
  }

  let body: unknown;
  if (response.status !== 204 && isJsonContentType(response.headers.get('Content-Type'))) {
    const text = await response.text();
    if (text !== '') {
      try {
        body = JSON.parse(text);
      } catch (error) {
        if (response.ok) {
          throw error;
        }
      }
    }
  }

  if (!response.ok) {
    if (isApiErrorBody(body)) {
      throw new ApiError(
        response.status,
        body.error.code,
        body.error.message,
        body.error.details,
      );
    }

    throw new ApiError(response.status, 'HTTP_ERROR', '请求失败');
  }

  return body as T;
}
