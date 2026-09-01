import {act, cleanup, fireEvent, render, screen} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {App} from '../../App';
import {PlayerProvider} from './PlayerProvider';
import {usePlayer} from './usePlayer';
import type {Track} from './types';

const tracks: Track[] = [
  {
    id: 'first',
    title: '第一首',
    artist: '测试歌手',
    audioUrl: 'data:audio/wav;base64,UklGRg==',
  },
];

function Harness() {
  const {audio, currentTime} = usePlayer();

  return (
    <>
      <p data-testid="time">{currentTime}</p>
      <p data-testid="audio-ready">{String(audio instanceof HTMLAudioElement)}</p>
      <input aria-label="歌曲搜索" />
      <textarea aria-label="播放列表备注" />
      <select aria-label="播放模式">
        <option>顺序播放</option>
      </select>
      <div aria-label="歌词编辑器" contentEditable />
    </>
  );
}

describe('Player keyboard and error behavior', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('maps global keys without stealing input interaction', () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    let controller: HTMLAudioElement | null = null;

    function AudioReader() {
      controller = usePlayer().audio;
      return null;
    }

    render(
      <PlayerProvider tracks={tracks}>
        <Harness />
        <AudioReader />
      </PlayerProvider>,
    );

    expect(screen.getByTestId('audio-ready')).toHaveTextContent('true');
    if (!controller) {
      throw new Error('Expected the shared audio controller to be ready.');
    }
    Object.defineProperty(controller, 'duration', {configurable: true, value: 6});
    const space = new KeyboardEvent('keydown', {bubbles: true, cancelable: true, code: 'Space'});
    act(() => window.dispatchEvent(space));
    expect(play).toHaveBeenCalledOnce();
    expect(space.defaultPrevented).toBe(true);

    const forward = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      code: 'ArrowRight',
    });
    act(() => window.dispatchEvent(forward));
    expect(screen.getByTestId('time')).toHaveTextContent('5');
    expect(forward.defaultPrevented).toBe(true);

    act(() => window.dispatchEvent(new KeyboardEvent('keydown', {code: 'ArrowRight'})));
    expect(screen.getByTestId('time')).toHaveTextContent('6');
    act(() => window.dispatchEvent(new KeyboardEvent('keydown', {code: 'ArrowLeft'})));
    act(() => window.dispatchEvent(new KeyboardEvent('keydown', {code: 'ArrowLeft'})));
    expect(screen.getByTestId('time')).toHaveTextContent('0');

    fireEvent.keyDown(screen.getByRole('textbox', {name: '歌曲搜索'}), {code: 'Space'});
    fireEvent.keyDown(screen.getByRole('textbox', {name: '播放列表备注'}), {code: 'Space'});
    fireEvent.keyDown(screen.getByRole('combobox', {name: '播放模式'}), {code: 'Space'});
    fireEvent.keyDown(screen.getByLabelText('歌词编辑器'), {code: 'Space'});
    fireEvent.keyDown(window, {code: 'ArrowLeft', ctrlKey: true});
    fireEvent.keyDown(window, {code: 'ArrowLeft', repeat: true});
    expect(play).toHaveBeenCalledOnce();
    expect(screen.getByTestId('time')).toHaveTextContent('0');
  });

  it('announces audio errors in the collapsed player without removing transport', () => {
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    let controller: HTMLAudioElement | null = null;
    const NativeAudio = window.Audio;
    vi.spyOn(window, 'Audio').mockImplementation(() => {
      controller = new NativeAudio();
      return controller;
    });

    render(<App />);

    const getController = () => controller;
    const audioController = getController();
    if (!audioController) {
      throw new Error('Expected the shared audio controller to be ready.');
    }
    act(() => audioController.dispatchEvent(new Event('error')));

    expect(screen.getByRole('status', {name: '音频状态'})).toHaveTextContent(
      '音频加载失败，请尝试其他歌曲。',
    );
    expect(screen.getByRole('button', {name: '播放'})).toBeEnabled();
    expect(screen.getByRole('button', {name: '下一首'})).toBeEnabled();
  });
});
