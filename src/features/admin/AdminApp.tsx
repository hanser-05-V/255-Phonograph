import {Navigate, Route, Routes} from 'react-router-dom';
import {AdminAuthGate} from './AdminAuthGate';
import {AdminLayout} from './AdminLayout';
import {SettingsPage} from './SettingsPage';
import {TaxonomyPage} from './TaxonomyPage';
import {AdminSongListPage} from './AdminSongListPage';
import {SongForm} from './SongForm';
import {TrashPage} from './TrashPage';
import '../../styles/admin.css';

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
                element={<AdminSongListPage />}
              />
              <Route
                path="songs/new"
                element={<SongForm />}
              />
              <Route
                path="songs/:songId"
                element={<SongForm />}
              />
              <Route
                path="taxonomy"
                element={<TaxonomyPage />}
              />
              <Route
                path="trash"
                element={<TrashPage />}
              />
              <Route
                path="settings"
                element={<SettingsPage />}
              />
            </Route>
            <Route path="*" element={<Navigate replace to="/admin" />} />
          </Routes>
        )}
      </AdminAuthGate>
    </main>
  );
}
