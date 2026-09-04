import {render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {AdminApp} from '../AdminApp';

export function renderAdmin(initialPath = '/admin') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AdminApp />
    </MemoryRouter>,
  );
}
