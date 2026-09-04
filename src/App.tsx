import {Route, Routes} from 'react-router-dom';
import {AdminApp} from './features/admin/AdminApp';
import {LibraryProvider} from './features/library/LibraryProvider';
import {PublicApp} from './features/library/PublicApp';
import './styles/global.css';

export function App() {
  return (
    <Routes>
      <Route path="/admin/*" element={<AdminApp />} />
      <Route
        path="/*"
        element={(
          <LibraryProvider>
            <PublicApp />
          </LibraryProvider>
        )}
      />
    </Routes>
  );
}
