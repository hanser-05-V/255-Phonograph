import {useEffect, useRef} from 'react';
import {useMediaUpload, type LrcLineError, type MediaUploadKind} from './useMediaUpload';

type MediaUploadFieldProps = {
  kind: MediaUploadKind;
  label: string;
  existingName?: string;
  errorId?: string;
  onCleared?: () => void;
  onUploaded?: (uploadId: string, durationSeconds: number | null) => void;
  onLrcText?: (text: string, errors: LrcLineError[]) => void;
};

const accepts: Record<MediaUploadKind, string> = {
  audio: '.mp3,.m4a',
  cover: '.jpg,.jpeg,.png,.webp',
  lrc: '.lrc,text/plain',
};

function formatDuration(seconds: number): string {
  const rounded = Math.round(seconds);
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, '0')}`;
}

function lrcErrorText(errors: LrcLineError[]): string {
  return errors.map(({line, message}) => `第 ${line} 行：${message}`).join('；');
}

export function MediaUploadField({
  kind,
  label,
  existingName,
  errorId,
  onCleared,
  onUploaded,
  onLrcText,
}: MediaUploadFieldProps) {
  const upload = useMediaUpload(kind);
  const notificationKeyRef = useRef('');
  const inputId = `admin-upload-${kind}`;
  const validationText = lrcErrorText(upload.validationErrors);

  useEffect(() => {
    if (upload.state !== 'uploaded') return;
    const notificationKey = kind === 'lrc'
      ? `${kind}:${upload.lrcText}:${JSON.stringify(upload.validationErrors)}`
      : `${kind}:${upload.uploadId ?? ''}`;
    if (notificationKeyRef.current === notificationKey) return;
    notificationKeyRef.current = notificationKey;
    if (kind === 'lrc') {
      onLrcText?.(upload.lrcText, upload.validationErrors);
    } else if (upload.uploadId) {
      onUploaded?.(upload.uploadId, upload.durationSeconds);
    }
  }, [kind, onLrcText, onUploaded, upload.durationSeconds, upload.lrcText,
    upload.state, upload.uploadId, upload.validationErrors]);

  return (
    <div className="admin-upload-field">
      <label htmlFor={inputId}>{label}</label>
      {existingName ? <p className="admin-field-hint">当前文件：{existingName}</p> : null}
      <input
        accept={accepts[kind]}
        aria-describedby={errorId}
        disabled={upload.state === 'uploading'}
        id={inputId}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            if (upload.uploadId) onCleared?.();
            upload.upload(file);
          }
          event.target.value = '';
        }}
        type="file"
      />
      {upload.state === 'uploading' ? (
        <div className="admin-upload-progress">
          <progress
            aria-label={`${label}上传进度`}
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={upload.progress}
            max={100}
            value={upload.progress}
          />
          <p role="status">已上传 {upload.progress}%</p>
          <button onClick={() => void upload.cancel()} type="button">取消上传</button>
        </div>
      ) : null}
      {upload.state === 'cancelled' ? (
        <div className="admin-upload-result">
          <p role="status">上传已取消</p>
          <button onClick={upload.retry} type="button">重新上传</button>
        </div>
      ) : null}
      {upload.state === 'error' ? (
        <div className="admin-upload-result">
          <p role="alert">{upload.error}</p>
          <button onClick={upload.retry} type="button">重新上传</button>
        </div>
      ) : null}
      {upload.state === 'uploaded' && kind === 'audio' && upload.durationSeconds !== null ? (
        <p role="status">识别时长：{formatDuration(upload.durationSeconds)}</p>
      ) : null}
      {upload.state === 'uploaded' && kind === 'audio' && upload.durationSeconds === null ? (
        <p role="alert">无法识别，可保存草稿但不能发布</p>
      ) : null}
      {upload.state === 'uploaded' && kind === 'cover' ? <p role="status">封面上传完成</p> : null}
      {upload.state === 'uploaded' && kind !== 'lrc' ? (
        <button
          onClick={() => void upload.cancel().then(() => onCleared?.())}
          type="button"
        >
          取消本次上传
        </button>
      ) : null}
      {upload.state === 'uploaded' && kind === 'lrc' && validationText ? (
        <p id={errorId} role="alert">{validationText}</p>
      ) : null}
      {upload.state === 'uploaded' && kind === 'lrc' && !validationText ? (
        <p role="status">LRC 文件已读取</p>
      ) : null}
    </div>
  );
}
