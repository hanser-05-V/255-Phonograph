import {cleanup, render, screen, waitFor} from '@testing-library/react';
import {afterEach, expect, it, vi} from 'vitest';
import {Spectrum} from './Spectrum';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it('reuses one Web Audio graph when remounted for the same audio element', async () => {
  const analyser = {
    connect: vi.fn(),
    fftSize: 0,
    frequencyBinCount: 64,
    getByteFrequencyData: vi.fn((data: Uint8Array) => {
      data[0] = 255;
      data[31] = 128;
    }),
  };
  const source = {connect: vi.fn()};
  const context = {
    createAnalyser: vi.fn(() => analyser),
    createMediaElementSource: vi.fn(() => source),
    destination: {},
    resume: vi.fn().mockResolvedValue(undefined),
  };
  const AudioContextMock = vi.fn(function AudioContextMock() {
    return context;
  });
  vi.stubGlobal('AudioContext', AudioContextMock);
  const requestFrame = vi.fn(() => 1);
  vi.stubGlobal('requestAnimationFrame', requestFrame);
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  const audio = new Audio();

  const first = render(<Spectrum audio={audio} isPlaying />);
  expect(await screen.findByTestId('spectrum')).toBeInTheDocument();
  expect(screen.getByTestId('spectrum').children).toHaveLength(64);
  await waitFor(() => expect(context.resume).toHaveBeenCalledTimes(1));
  await waitFor(() => {
    const bars = screen.getByTestId('spectrum').children;
    expect(bars[31]).toHaveStyle({transform: 'scaleY(1)'});
    expect(bars[32]).toHaveStyle({transform: 'scaleY(1)'});
    expect(bars[0]).toHaveStyle({transform: 'scaleY(0.5019607843137255)'});
    expect(bars[63]).toHaveStyle({transform: 'scaleY(0.5019607843137255)'});
  });
  first.unmount();

  const second = render(<Spectrum audio={audio} isPlaying />);
  await waitFor(() => expect(requestFrame).toHaveBeenCalledTimes(2));
  second.unmount();

  expect(AudioContextMock).toHaveBeenCalledTimes(1);
  expect(context.resume).toHaveBeenCalledTimes(1);
  expect(context.createMediaElementSource).toHaveBeenCalledTimes(1);
});

it('renders nothing when Web Audio creation fails', async () => {
  const AudioContextMock = vi.fn(function AudioContextMock() {
    throw new Error('Web Audio unavailable');
  });
  vi.stubGlobal('AudioContext', AudioContextMock);
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());

  render(<Spectrum audio={new Audio()} isPlaying />);

  await waitFor(() => expect(screen.queryByTestId('spectrum')).not.toBeInTheDocument());
});

it('renders nothing when resuming Web Audio fails', async () => {
  const analyser = {
    connect: vi.fn(),
    fftSize: 0,
    frequencyBinCount: 64,
    getByteFrequencyData: vi.fn(),
  };
  const source = {connect: vi.fn()};
  const context = {
    createAnalyser: vi.fn(() => analyser),
    createMediaElementSource: vi.fn(() => source),
    destination: {},
    resume: vi.fn().mockRejectedValue(new Error('resume denied')),
  };
  vi.stubGlobal('AudioContext', vi.fn(function AudioContextMock() {
    return context;
  }));
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());

  render(<Spectrum audio={new Audio()} isPlaying />);

  await waitFor(() => expect(screen.queryByTestId('spectrum')).not.toBeInTheDocument());
  expect(context.createMediaElementSource).not.toHaveBeenCalled();
  expect(analyser.getByteFrequencyData).not.toHaveBeenCalled();
});
