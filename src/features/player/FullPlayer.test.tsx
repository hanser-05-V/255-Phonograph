import {cleanup, render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {App} from '../../App';
import {demoTracks} from './demo-tracks';
import {FullPlayer} from './FullPlayer';
import {PlayerProvider} from './PlayerProvider';

beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('FullPlayer', () => {
  it('opens at its final visual state and rotates only while playing', async () => {
    const user = userEvent.setup();
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();

    render(
      <PlayerProvider tracks={demoTracks}>
        <FullPlayer />
      </PlayerProvider>,
    );

    const positioner = screen.getByTestId('disc-positioner');
    const disc = screen.getByTestId('disc');
    expect(positioner).toContainElement(disc);
    expect(positioner).toHaveClass('disc-artwork__disc-positioner');
    expect(disc).toHaveClass('disc');
    expect(positioner).not.toHaveAttribute('data-playing');
    expect(disc).toHaveAttribute('data-playing', 'false');
    expect(screen.queryByTestId('intro-overlay')).not.toBeInTheDocument();
    expect(screen.getByRole('button', {name: '收起播放器'})).toBeInTheDocument();

    await user.click(screen.getByRole('button', {name: '播放'}));
    expect(disc).toHaveAttribute('data-playing', 'true');

    await user.click(screen.getByRole('button', {name: '暂停'}));
    expect(disc).toHaveAttribute('data-playing', 'false');
  });

  it('shares expansion state with the persistent mini player', async () => {
    const user = userEvent.setup();
    render(<App />);

    const miniPlayer = screen.getByRole('region', {name: '迷你播放器'});
    await user.click(screen.getByText('初光'));
    expect(screen.getByRole('region', {name: '沉浸式播放器'})).toBeInTheDocument();
    expect(miniPlayer).toBeInTheDocument();
    expect(miniPlayer).toHaveAttribute('inert');
    expect(miniPlayer).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByRole('region', {name: '迷你播放器'})).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', {name: '收起播放器'}));
    expect(screen.queryByRole('region', {name: '沉浸式播放器'})).not.toBeInTheDocument();
    expect(miniPlayer).not.toHaveAttribute('inert');
    expect(miniPlayer).toHaveAttribute('aria-hidden', 'false');
    expect(screen.getByRole('region', {name: '迷你播放器'})).toBe(miniPlayer);
  });

  it('fills the right-side visual panel with lyrics and 64 spectrum bars', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('[00:00.00]初光\n[00:01.20]让今天慢慢开始'),
    }));
    render(
      <PlayerProvider tracks={demoTracks}>
        <FullPlayer />
      </PlayerProvider>,
    );

    const lyrics = await screen.findByRole('region', {name: '歌词'});
    expect(within(lyrics).getByText('让今天慢慢开始')).toBeInTheDocument();
    expect(screen.getByTestId('spectrum').children).toHaveLength(64);
  });
});
