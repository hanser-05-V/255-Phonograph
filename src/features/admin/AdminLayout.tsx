import {useEffect, useRef, useState} from 'react';
import {Link, Outlet} from 'react-router-dom';

type AdminLayoutProps = {
  onLogout: (signal?: AbortSignal) => Promise<void>;
};

export function AdminLayout({onLogout}: AdminLayoutProps) {
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const logoutErrorRef = useRef<HTMLParagraphElement>(null);
  const logoutRequestRef = useRef<AbortController>(null);

  useEffect(() => () => logoutRequestRef.current?.abort(), []);

  useEffect(() => {
    if (logoutError) {
      logoutErrorRef.current?.focus();
    }
  }, [logoutError]);

  async function handleLogout() {
    if (loggingOut) {
      return;
    }
    setLoggingOut(true);
    setLogoutError('');
    const controller = new AbortController();
    logoutRequestRef.current = controller;
    try {
      await onLogout(controller.signal);
    } catch {
      if (!controller.signal.aborted) {
        setLogoutError('退出失败，请重试');
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoggingOut(false);
      }
    }
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <p className="admin-sidebar__title">曲库管理</p>
        <nav aria-label="管理导航">
          <Link to="/admin">歌曲</Link>
          <Link to="/admin/taxonomy">分类与标签</Link>
          <Link to="/admin/trash">回收站</Link>
          <Link to="/admin/settings">设置</Link>
        </nav>
        <button disabled={loggingOut} onClick={handleLogout} type="button">
          {loggingOut ? '正在退出…' : '退出'}
        </button>
        {logoutError ? (
          <p ref={logoutErrorRef} role="alert" tabIndex={-1}>{logoutError}</p>
        ) : null}
      </aside>
      <section className="admin-content"><Outlet /></section>
    </div>
  );
}
