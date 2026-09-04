import {cleanup, fireEvent, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {MiniPlayer} from './MiniPlayer';
import {PlayerContext, type PlayerContextValue} from './PlayerProvider';
import {PlayerControls} from './PlayerControls';

const mockPlayer: PlayerContextValue = {
  audio: null,
  tracks: [],
  currentTrack: {
    id: 'first-light',
    title: '初光',
    artist: '255留音机',
    audioUrl: 'data:audio/wav;base64,UklGRg==',
  },
  currentIndex: 0,
  currentTime: 8,
  duration: 60,
  volume: 0.7,
  isMuted: false,
  isPlaying: false,
  isExpanded: false,
  error: null,
  queueIds: ['first-light'],
  toggle: vi.fn().mockResolvedValue(undefined),
  playTrack: vi.fn().mockResolvedValue(undefined),
  next: vi.fn(),
  previous: vi.fn(),
  seek: vi.fn(),
  setVolume: vi.fn(),
  toggleMuted: vi.fn(),
  setExpanded: vi.fn(),
};

function TestPlayer() {
  return (
    <PlayerContext.Provider value={mockPlayer}>
      <PlayerControls />
    </PlayerContext.Provider>
  );
}

function TestMiniPlayer() {
  return (
    <PlayerContext.Provider value={mockPlayer}>
      <MiniPlayer />
    </PlayerContext.Provider>
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mockPlayer.duration = 60;
});

describe('PlayerControls', () => {
  it('connects transport, seek, volume, mute, and expand controls', async () => {
    const user = userEvent.setup();
    render(<TestPlayer />);

    await user.click(screen.getByRole('button', {name: '上一首'}));
    expect(mockPlayer.previous).toHaveBeenCalledOnce();
    await user.click(screen.getByRole('button', {name: '播放'}));
    expect(mockPlayer.toggle).toHaveBeenCalledOnce();
    await user.click(screen.getByRole('button', {name: '下一首'}));
    expect(mockPlayer.next).toHaveBeenCalledOnce();
    fireEvent.change(screen.getByRole('slider', {name: '播放进度'}), {target: {value: '12'}});
    expect(mockPlayer.seek).toHaveBeenCalledWith(12);
    fireEvent.change(screen.getByRole('slider', {name: '音量'}), {target: {value: '0.4'}});
    expect(mockPlayer.setVolume).toHaveBeenCalledWith(0.4);
    await user.click(screen.getByRole('button', {name: '静音'}));
    expect(mockPlayer.toggleMuted).toHaveBeenCalledOnce();
  });

  it('disables seeking until the duration is finite and positive', () => {
    mockPlayer.duration = Number.NaN;
    render(<TestPlayer />);

    expect(screen.getByRole('slider', {name: '播放进度'})).toBeDisabled();
  });
});

describe('MiniPlayer', () => {
  it('expands only when its non-control area is clicked', async () => {
    const user = userEvent.setup();
    render(<TestMiniPlayer />);

    await user.click(screen.getByText('初光'));
    expect(mockPlayer.setExpanded).toHaveBeenCalledWith(true);

    vi.mocked(mockPlayer.setExpanded).mockClear();
    await user.click(screen.getByRole('button', {name: '播放'}));
    await user.click(screen.getByRole('slider', {name: '播放进度'}));
    fireEvent.change(screen.getByRole('slider', {name: '播放进度'}), {target: {value: '12'}});
    expect(mockPlayer.setExpanded).not.toHaveBeenCalled();
  });
});
