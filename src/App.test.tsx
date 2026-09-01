import {cleanup, render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {App} from './App';

beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('App', () => {
  it('renders the homepage and persistent player inside one application surface', () => {
    render(<App />);

    expect(screen.getByRole('navigation', {name: '主导航'})).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveClass('home-page');
    expect(screen.getByRole('region', {name: '迷你播放器'})).toBeInTheDocument();
    expect(screen.getByRole('heading', {name: '精选歌曲'})).toBeInTheDocument();
  });

  it('reserves desktop clearance for the mini-player error state', () => {
    render(<App />);

    expect(window.getComputedStyle(screen.getByRole('main')).paddingBottom).toBe('208px');
  });

  it('shares expansion state between the persistent and full players', async () => {
    const user = userEvent.setup();
    render(<App />);

    const miniPlayer = screen.getByRole('region', {name: '迷你播放器'});
    await user.click(within(miniPlayer).getByText('初光'));

    expect(screen.getByRole('region', {name: '沉浸式播放器'})).toBeInTheDocument();
    expect(miniPlayer).toHaveAttribute('aria-hidden', 'true');
  });
});
