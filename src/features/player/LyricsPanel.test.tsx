import {cleanup, render, screen} from '@testing-library/react';
import {afterEach, expect, it, vi} from 'vitest';
import {LyricsPanel} from './LyricsPanel';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView');
});

it('smooth-scrolls the newly active line to the center', () => {
  const scrollIntoView = vi.fn();
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: scrollIntoView,
  });
  const lines = [
    {time: 1, text: '守候日落'},
    {time: 3, text: '开启旅程'},
  ];
  const {rerender} = render(<LyricsPanel lines={lines} currentTime={1.2} />);

  scrollIntoView.mockClear();
  rerender(<LyricsPanel lines={lines} currentTime={3.2} />);

  expect(scrollIntoView).toHaveBeenCalledWith({behavior: 'smooth', block: 'center'});
});

it('marks the current LRC line and falls back when lyrics are absent', () => {
  const lines = [
    {time: 1, text: '守候日落'},
    {time: 3, text: '开启旅程'},
  ];
  const {rerender} = render(<LyricsPanel lines={lines} currentTime={3.2} />);

  expect(screen.getByText('开启旅程')).toHaveAttribute('aria-current', 'true');
  expect(screen.getByText('守候日落')).not.toHaveAttribute('aria-current');

  rerender(<LyricsPanel lines={[]} currentTime={3.2} />);
  expect(screen.getByText('暂无歌词')).toBeInTheDocument();
});
