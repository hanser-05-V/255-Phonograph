import {useEffect, useRef, useState, type FormEvent} from 'react';
import {adminApi} from '../../api/admin-api';
import {ApiError} from '../../api/http';
import {AsyncFormStatus} from './AsyncFormStatus';

function passwordLength(password: string) {
  return Array.from(password).length;
}

export function SettingsPage() {
  const [dataDirectory, setDataDirectory] = useState('');
  const [directoryError, setDirectoryError] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const actionRequestRef = useRef<AbortController>(null);

  useEffect(() => {
    const controller = new AbortController();
    if (typeof adminApi.getSettings !== 'function') {
      setDirectoryError('无法读取数据目录');
      return () => controller.abort();
    }
    void adminApi.getSettings(controller.signal).then((settings) => {
      if (!controller.signal.aborted) setDataDirectory(settings.dataDirectoryDisplay);
    }).catch(() => {
      if (!controller.signal.aborted) setDirectoryError('无法读取数据目录');
    });
    return () => controller.abort();
  }, []);

  useEffect(() => () => actionRequestRef.current?.abort(), []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || actionRequestRef.current) return;
    setError('');
    setStatus('');

    const length = passwordLength(newPassword);
    if (length < 8 || length > 200) {
      setError('新密码需为 8–200 个字符');
      return;
    }
    if (newPassword !== confirmation) {
      setError('两次输入的新密码不一致');
      return;
    }

    const controller = new AbortController();
    actionRequestRef.current = controller;
    setSubmitting(true);
    try {
      await adminApi.changePassword(currentPassword, newPassword, controller.signal);
      if (controller.signal.aborted) return;
      setCurrentPassword('');
      setNewPassword('');
      setConfirmation('');
      setStatus('管理密码已修改');
    } catch (submitError) {
      if (!controller.signal.aborted) {
        setError(submitError instanceof ApiError ? submitError.message : '修改失败，请重试');
      }
    } finally {
      if (actionRequestRef.current === controller) actionRequestRef.current = null;
      if (!controller.signal.aborted) setSubmitting(false);
    }
  }

  const errorDescription = error ? 'settings-password-error' : undefined;
  return (
    <div className="admin-management-page">
      <header className="admin-section-heading">
        <h1>设置</h1>
        <p>查看本地数据位置并更新管理密码。</p>
      </header>

      <section className="admin-settings-section" aria-labelledby="data-directory-heading">
        <h2 id="data-directory-heading">数据目录</h2>
        <p>音乐资料和运行数据保存在：</p>
        {dataDirectory ? <output className="admin-data-directory">{dataDirectory}</output> : null}
        {!dataDirectory && !directoryError ? <p role="status">正在读取数据目录…</p> : null}
        {directoryError ? <p className="admin-form-error" role="alert">{directoryError}</p> : null}
      </section>

      <section className="admin-settings-section" aria-labelledby="password-heading">
        <h2 id="password-heading">修改管理密码</h2>
        <form className="admin-settings-form" onSubmit={(event) => void handleSubmit(event)}>
          <label htmlFor="current-password">当前密码</label>
          <input
            aria-describedby={errorDescription}
            autoComplete="current-password"
            disabled={submitting}
            id="current-password"
            onChange={(event) => setCurrentPassword(event.target.value)}
            required
            type="password"
            value={currentPassword}
          />
          <label htmlFor="new-password">新密码</label>
          <input
            aria-describedby={errorDescription}
            autoComplete="new-password"
            disabled={submitting}
            id="new-password"
            maxLength={200}
            onChange={(event) => setNewPassword(event.target.value)}
            required
            type="password"
            value={newPassword}
          />
          <label htmlFor="confirm-password">确认新密码</label>
          <input
            aria-describedby={errorDescription}
            autoComplete="new-password"
            disabled={submitting}
            id="confirm-password"
            maxLength={200}
            onChange={(event) => setConfirmation(event.target.value)}
            required
            type="password"
            value={confirmation}
          />
          <AsyncFormStatus error={error} errorId="settings-password-error" status={status} />
          <button disabled={submitting} type="submit">
            {submitting ? '正在修改…' : '修改管理密码'}
          </button>
        </form>
      </section>
    </div>
  );
}
