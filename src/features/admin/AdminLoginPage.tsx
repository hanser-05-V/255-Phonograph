import {type FormEvent, useEffect, useRef, useState} from 'react';
import {ApiError} from '../../api/http';

export type AdminLoginMode = 'setup' | 'login';

type AdminLoginPageProps = {
  mode: AdminLoginMode;
  onSubmit: (password: string, signal?: AbortSignal) => Promise<void>;
};

function passwordLength(password: string) {
  return Array.from(password).length;
}

function messageFor(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }
  return '操作失败，请重试';
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === 'AbortError';
}

export function AdminLoginPage({mode, onSubmit}: AdminLoginPageProps) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const alertRef = useRef<HTMLParagraphElement>(null);
  const requestRef = useRef<AbortController>(null);

  useEffect(() => () => requestRef.current?.abort(), []);

  useEffect(() => {
    if (error) {
      alertRef.current?.focus();
    }
  }, [error]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) {
      return;
    }

    if (passwordLength(password) < 8) {
      setError('管理密码至少需要 8 个字符');
      return;
    }
    if (passwordLength(password) > 200) {
      setError('管理密码不能超过 200 个字符');
      return;
    }
    if (mode === 'setup' && password !== confirmation) {
      setError('两次输入的管理密码不一致');
      return;
    }

    setError('');
    setSubmitting(true);
    const controller = new AbortController();
    requestRef.current = controller;
    try {
      await onSubmit(password, controller.signal);
    } catch (submitError) {
      if (!controller.signal.aborted && !isAbortError(submitError)) {
        setError(messageFor(submitError));
      }
    } finally {
      if (!controller.signal.aborted) {
        setSubmitting(false);
      }
    }
  }

  const setup = mode === 'setup';

  return (
    <section className="admin-auth-card" aria-labelledby="admin-auth-title">
      <p className="admin-auth-card__eyebrow">仅限本机管理</p>
      <h1 id="admin-auth-title">{setup ? '创建管理密码' : '登录管理后台'}</h1>
      <p className="admin-auth-card__intro">
        {setup
          ? '首次使用需要创建一个独立管理密码。本站不会提供密码找回功能。'
          : '输入管理密码后继续维护本地曲库。'}
      </p>
      <form onSubmit={handleSubmit}>
        <label htmlFor="admin-password">管理密码</label>
        <input
          aria-describedby={error ? 'admin-auth-error' : undefined}
          aria-invalid={error ? true : undefined}
          autoComplete={setup ? 'new-password' : 'current-password'}
          id="admin-password"
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          value={password}
        />
        {setup ? (
          <>
            <label htmlFor="admin-password-confirmation">确认管理密码</label>
            <input
              aria-describedby={error ? 'admin-auth-error' : undefined}
              aria-invalid={error ? true : undefined}
              autoComplete="new-password"
              id="admin-password-confirmation"
              onChange={(event) => setConfirmation(event.target.value)}
              type="password"
              value={confirmation}
            />
          </>
        ) : null}
        {error ? (
          <p
            className="admin-form-error"
            id="admin-auth-error"
            ref={alertRef}
            role="alert"
            tabIndex={-1}
          >
            {error}
          </p>
        ) : null}
        {submitting ? (
          <p className="admin-visually-hidden" role="status">正在验证管理密码…</p>
        ) : null}
        <button disabled={submitting} type="submit">
          {submitting ? '正在提交…' : setup ? '创建并进入后台' : '登录'}
        </button>
      </form>
    </section>
  );
}
