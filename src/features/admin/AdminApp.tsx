import {Navigate, Route, Routes} from 'react-router-dom';
import {AdminAuthGate} from './AdminAuthGate';
import {AdminLayout} from './AdminLayout';
import '../../styles/admin.css';

type AdminPlaceholderProps = {
  title: string;
  description: string;
};

function AdminPlaceholder({title, description}: AdminPlaceholderProps) {
  return (
    <div className="admin-placeholder">
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  );
}

export function AdminApp() {
  return (
    <main aria-label="管理后台" className="admin-page">
      <header className="admin-page__header">
        <span>255留音机</span>
        <strong>管理后台</strong>
      </header>
      <AdminAuthGate>
        {({logout}) => (
          <Routes>
            <Route path="/admin" element={<AdminLayout onLogout={logout} />}>
              <Route
                index
                element={<AdminPlaceholder title="歌曲管理" description="歌曲列表将在下一阶段接入。" />}
              />
              <Route
                path="songs/new"
                element={<AdminPlaceholder title="新建歌曲" description="歌曲编辑器将在下一阶段接入。" />}
              />
              <Route
                path="songs/:songId"
                element={<AdminPlaceholder title="编辑歌曲" description="歌曲编辑器将在下一阶段接入。" />}
              />
              <Route
                path="taxonomy"
                element={<AdminPlaceholder title="分类与标签" description="分类与标签管理将在下一阶段接入。" />}
              />
              <Route
                path="trash"
                element={<AdminPlaceholder title="回收站" description="回收站管理将在下一阶段接入。" />}
              />
              <Route
                path="settings"
                element={<AdminPlaceholder title="设置" description="管理密码设置将在下一阶段接入。" />}
              />
            </Route>
            <Route path="*" element={<Navigate replace to="/admin" />} />
          </Routes>
        )}
      </AdminAuthGate>
    </main>
  );
}
