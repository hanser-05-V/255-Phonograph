import {cleanup, fireEvent, render, screen} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';
import {MediaImage} from './MediaImage';

afterEach(cleanup);

describe('MediaImage', () => {
  it('falls back from a broken cover without removing surrounding controls', () => {
    render(
      <div>
        <MediaImage
          alt="初光 封面"
          fallbackLabel="初光"
          src="/api/media/broken"
        />
        <button type="button">播放</button>
      </div>,
    );

    fireEvent.error(screen.getByRole('img', {name: '初光 封面'}));

    expect(screen.getByRole('img', {name: '初光 默认封面'})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: '播放'})).toBeInTheDocument();
  });

  it('uses the default cover when no source is available', () => {
    render(<MediaImage alt="夜行 封面" fallbackLabel="夜行" />);

    expect(screen.getByRole('img', {name: '夜行 默认封面'})).toBeInTheDocument();
  });
});
