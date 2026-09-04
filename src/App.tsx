import {Route, Routes} from 'react-router-dom';
import {LibraryProvider} from './features/library/LibraryProvider';
import {PublicApp} from './features/library/PublicApp';
import './styles/global.css';

export function App() {
  return (
    <Routes>
      <Route path="/admin/*" element={<main aria-label="管理后台">管理后台</main>} />
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
