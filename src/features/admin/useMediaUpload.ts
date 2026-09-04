import {useCallback, useEffect, useRef, useState} from 'react';
import type {
  LrcUploadResponse,
  PendingUploadResponse,
} from '../../../shared/contracts';
import {adminApi} from '../../api/admin-api';

export type MediaUploadKind = 'audio' | 'cover' | 'lrc';
export type MediaUploadState = 'idle' | 'uploading' | 'uploaded' | 'cancelled' | 'error';
export type LrcLineError = {line: number; message: string};

export type MediaUploadController = {
  state: MediaUploadState;
  progress: number;
  uploadId: string | null;
  durationSeconds: number | null;
  lrcText: string;
  validationErrors: LrcLineError[];
  error: string;
  upload: (file: File) => void;
  cancel: () => Promise<void>;
  retry: () => void;
};

const uploadUrls: Record<MediaUploadKind, string> = {
  audio: '/api/admin/uploads/audio',
  cover: '/api/admin/uploads/cover',
  lrc: '/api/admin/uploads/lrc',
};

function responseMessage(xhr: XMLHttpRequest): string | null {
  const body = parseResponse<{error?: {message?: unknown}}>(xhr);
  return typeof body?.error?.message === 'string' ? body.error.message : null;
}

function messageForStatus(xhr: XMLHttpRequest): string {
  const {status} = xhr;
  if (status === 401) return '管理会话已失效，请重新登录';
  if (status === 413) return '文件超过大小限制';
  if (status === 415) return '不支持这种文件格式';
  if (status === 400 || status === 409 || status === 422) {
    return responseMessage(xhr) ?? '上传内容未通过校验';
  }
  return '上传失败，请重试';
}

function parseResponse<T>(xhr: XMLHttpRequest): T | null {
  if (!xhr.responseText) return null;
  try {
    return JSON.parse(xhr.responseText) as T;
  } catch {
    return null;
  }
}

export function useMediaUpload(kind: MediaUploadKind): MediaUploadController {
  const [state, setState] = useState<MediaUploadState>('idle');
  const [progress, setProgress] = useState(0);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [durationSeconds, setDurationSeconds] = useState<number | null>(null);
  const [lrcText, setLrcText] = useState('');
  const [validationErrors, setValidationErrors] = useState<LrcLineError[]>([]);
  const [error, setError] = useState('');
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const fileRef = useRef<File | null>(null);
  const uploadIdRef = useRef<string | null>(null);
  const mountedRef = useRef(true);

  const discardUpload = useCallback((id: string | null) => {
    if (!id) return;
    void adminApi.cancelUpload(id).catch(() => undefined);
  }, []);

  const upload = useCallback((file: File) => {
    const active = xhrRef.current;
    if (active) {
      xhrRef.current = null;
      active.abort();
    }
    discardUpload(uploadIdRef.current);
    uploadIdRef.current = null;
    fileRef.current = file;
    setUploadId(null);
    setDurationSeconds(null);
    setLrcText('');
    setValidationErrors([]);
    setError('');
    setProgress(0);
    setState('uploading');

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;
    xhr.open('POST', uploadUrls[kind]);
    xhr.withCredentials = true;
    xhr.upload.onprogress = (event) => {
      if (xhrRef.current !== xhr || !mountedRef.current || !event.lengthComputable) return;
      setProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onerror = () => {
      if (xhrRef.current !== xhr || !mountedRef.current) return;
      xhrRef.current = null;
      setError('上传失败，请检查本地服务后重试');
      setState('error');
    };
    xhr.onabort = () => {
      if (xhrRef.current !== xhr || !mountedRef.current) return;
      xhrRef.current = null;
      setState('cancelled');
    };
    xhr.onload = () => {
      if (xhrRef.current !== xhr || !mountedRef.current) return;
      xhrRef.current = null;
      if (xhr.status < 200 || xhr.status >= 300) {
        setError(messageForStatus(xhr));
        setState('error');
        return;
      }

      if (kind === 'lrc') {
        const response = parseResponse<LrcUploadResponse>(xhr);
        if (!response) {
          setError('上传响应无效，请重试');
          setState('error');
          return;
        }
        setLrcText(response.content);
        setValidationErrors(response.validation.errors);
      } else {
        const response = parseResponse<PendingUploadResponse>(xhr);
        if (!response) {
          setError('上传响应无效，请重试');
          setState('error');
          return;
        }
        uploadIdRef.current = response.uploadId;
        setUploadId(response.uploadId);
        setDurationSeconds(response.durationSeconds);
      }
      setProgress(100);
      setState('uploaded');
    };

    const form = new FormData();
    form.append('file', file);
    xhr.send(form);
  }, [discardUpload, kind]);

  const cancel = useCallback(async () => {
    const active = xhrRef.current;
    if (active) {
      active.abort();
      return;
    }
    const acceptedUploadId = uploadIdRef.current;
    uploadIdRef.current = null;
    setUploadId(null);
    if (acceptedUploadId) {
      try {
        await adminApi.cancelUpload(acceptedUploadId);
      } catch {
        // Cancellation is best-effort; the UI still stops using the token.
      }
    }
    if (mountedRef.current) setState('cancelled');
  }, []);

  const retry = useCallback(() => {
    if (fileRef.current) upload(fileRef.current);
  }, [upload]);

  useEffect(() => () => {
    mountedRef.current = false;
    const active = xhrRef.current;
    xhrRef.current = null;
    active?.abort();
  }, []);

  return {
    state, progress, uploadId, durationSeconds, lrcText, validationErrors,
    error, upload, cancel, retry,
  };
}
