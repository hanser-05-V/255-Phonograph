import {render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';
import {App} from './App';

describe('App', () => {
  it('renders the product name and mini player landmark', () => {
    render(<App />);
    expect(screen.getByRole('heading', {name: '255留音机'})).toBeInTheDocument();
    expect(screen.getByRole('region', {name: '迷你播放器'})).toBeInTheDocument();
  });
});
