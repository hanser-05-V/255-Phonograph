import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {nextIndex, previousIndex} from './player-utils';
import type {Track} from './types';

export type PlayerContextValue = {
  audio: HTMLAudioElement | null;
  tracks: Track[];
  currentTrack: Track;
  currentIndex: number;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isPlaying: boolean;
  isExpanded: boolean;
  error: string | null;
  toggle: () => Promise<void>;
  playTrack: (index: number) => Promise<void>;
  next: () => void;
  previous: () => void;
  seek: (seconds: number) => void;
  setVolume: (volume: number) => void;
  toggleMuted: () => void;
  setExpanded: (expanded: boolean) => void;
};

export const PlayerContext = createContext<PlayerContextValue | null>(null);

type PlayerProviderProps = {
  tracks: Track[];
  children: ReactNode;
};

const clampVolume = (value: number) => Math.min(1, Math.max(0, value));

const mediaErrorMessage = '音频加载失败，请尝试其他歌曲。';

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.isContentEditable ||
    target.closest('[contenteditable="true"]') !== null
  );
}

export function PlayerProvider({children, tracks}: PlayerProviderProps) {
  if (tracks.length === 0) {
    throw new Error('PlayerProvider requires a non-empty tracks array.');
  }

  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const tracksRef = useRef(tracks);
  const currentIndexRef = useRef(currentIndex);
  const desiredPlayingRef = useRef(false);
  const requestTokenRef = useRef(0);
  const pendingPlayTokenRef = useRef<number | null>(null);
  const loadedSourceRef = useRef<{index: number; url: string} | null>(null);
  const nextRef = useRef<() => void>(() => undefined);

  tracksRef.current = tracks;
  currentIndexRef.current = currentIndex;

  const setConfirmedPlaying = useCallback((playing: boolean) => {
    setIsPlaying(playing);
  }, []);

  const loadSource = useCallback((element: HTMLAudioElement, index: number) => {
    const track = tracksRef.current[index];
    loadedSourceRef.current = {index, url: track.audioUrl};
    element.src = track.audioUrl;
    setCurrentTime(0);
    setDuration(0);
    setError(null);
  }, []);

  const startPlayback = useCallback(async (element: HTMLAudioElement, token: number) => {
    pendingPlayTokenRef.current = token;

    try {
      await element.play();
    } catch {
      if (token !== requestTokenRef.current || !desiredPlayingRef.current) {
        return;
      }

      pendingPlayTokenRef.current = null;
      desiredPlayingRef.current = false;
      setConfirmedPlaying(false);
      setError(mediaErrorMessage);
      return;
    }

    if (token !== requestTokenRef.current || !desiredPlayingRef.current) {
      return;
    }

    pendingPlayTokenRef.current = null;
    setConfirmedPlaying(true);
    setError(null);
  }, [setConfirmedPlaying]);

  const selectTrack = useCallback((index: number) => {
    const element = audioRef.current;
    const shouldPlay = desiredPlayingRef.current;
    const token = ++requestTokenRef.current;
    pendingPlayTokenRef.current = shouldPlay ? token : null;
    currentIndexRef.current = index;
    setCurrentIndex(index);
    setConfirmedPlaying(false);

    if (!element) {
      return;
    }

    loadSource(element, index);
    if (shouldPlay) {
      void startPlayback(element, token);
    }
  }, [loadSource, setConfirmedPlaying, startPlayback]);

  const next = useCallback(() => {
    selectTrack(nextIndex(currentIndexRef.current, tracksRef.current.length));
  }, [selectTrack]);

  const previous = useCallback(() => {
    selectTrack(previousIndex(currentIndexRef.current, tracksRef.current.length));
  }, [selectTrack]);

  nextRef.current = next;

  const toggle = useCallback(async () => {
    const element = audioRef.current;
    if (!element) {
      return;
    }

    if (desiredPlayingRef.current) {
      desiredPlayingRef.current = false;
      requestTokenRef.current += 1;
      pendingPlayTokenRef.current = null;
      element.pause();
      setConfirmedPlaying(false);
      return;
    }

    desiredPlayingRef.current = true;
    const token = ++requestTokenRef.current;
    setConfirmedPlaying(false);
    setError(null);
    await startPlayback(element, token);
  }, [setConfirmedPlaying, startPlayback]);

  const playTrack = useCallback(async (index: number) => {
    const element = audioRef.current;
    if (!element || !Number.isInteger(index) || index < 0 || index >= tracksRef.current.length) {
      return;
    }

    desiredPlayingRef.current = true;
    const token = ++requestTokenRef.current;
    pendingPlayTokenRef.current = token;
    setConfirmedPlaying(false);
    setError(null);

    const loadedSource = loadedSourceRef.current;
    if (
      index !== currentIndexRef.current ||
      loadedSource?.index !== index ||
      loadedSource.url !== tracksRef.current[index].audioUrl
    ) {
      currentIndexRef.current = index;
      setCurrentIndex(index);
      loadSource(element, index);
    }

    await startPlayback(element, token);
  }, [loadSource, setConfirmedPlaying, startPlayback]);

  const seek = useCallback((seconds: number) => {
    const element = audioRef.current;
    if (!element || !Number.isFinite(seconds)) {
      return;
    }

    const safeDuration = Number.isFinite(element.duration) && element.duration > 0 ? element.duration : 0;
    const nextTime = safeDuration > 0 ? Math.min(Math.max(0, seconds), safeDuration) : Math.max(0, seconds);
    element.currentTime = nextTime;
    setCurrentTime(nextTime);
  }, []);

  const setVolume = useCallback((nextVolume: number) => {
    const safeVolume = clampVolume(nextVolume);
    const element = audioRef.current;
    if (element) {
      element.volume = safeVolume;
    }
    setVolumeState(safeVolume);
  }, []);

  const toggleMuted = useCallback(() => {
    const element = audioRef.current;
    const nextMuted = !isMuted;
    if (element) {
      element.muted = nextMuted;
    }
    setIsMuted(nextMuted);
  }, [isMuted]);

  useEffect(() => {
    const element = new Audio();
    element.preload = 'metadata';
    element.volume = volume;
    element.muted = isMuted;
    audioRef.current = element;

    const updateTime = () => setCurrentTime(element.currentTime);
    const updateDuration = () =>
      setDuration(Number.isFinite(element.duration) ? element.duration : 0);
    const handlePlay = () => {
      if (!desiredPlayingRef.current || pendingPlayTokenRef.current !== null) {
        return;
      }

      setConfirmedPlaying(true);
      setError(null);
    };
    const handlePause = () => {
      if (desiredPlayingRef.current) {
        return;
      }

      setConfirmedPlaying(false);
    };
    const handleEnded = () => {
      desiredPlayingRef.current = true;
      setConfirmedPlaying(false);
      nextRef.current();
    };
    const handleError = () => {
      requestTokenRef.current += 1;
      pendingPlayTokenRef.current = null;
      desiredPlayingRef.current = false;
      setError(mediaErrorMessage);
      setConfirmedPlaying(false);
    };

    element.addEventListener('timeupdate', updateTime);
    element.addEventListener('durationchange', updateDuration);
    element.addEventListener('play', handlePlay);
    element.addEventListener('pause', handlePause);
    element.addEventListener('ended', handleEnded);
    element.addEventListener('error', handleError);
    setAudio(element);

    return () => {
      element.removeEventListener('timeupdate', updateTime);
      element.removeEventListener('durationchange', updateDuration);
      element.removeEventListener('play', handlePlay);
      element.removeEventListener('pause', handlePause);
      element.removeEventListener('ended', handleEnded);
      element.removeEventListener('error', handleError);
      requestTokenRef.current += 1;
      pendingPlayTokenRef.current = null;
      desiredPlayingRef.current = false;
      element.pause();
      audioRef.current = null;
    };
  }, [setConfirmedPlaying]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.repeat ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        isEditableTarget(event.target)
      ) {
        return;
      }

      if (!audioRef.current) {
        return;
      }

      if (event.code === 'Space' || event.key === ' ') {
        event.preventDefault();
        void toggle();
        return;
      }

      if (event.code === 'ArrowLeft' || event.key === 'ArrowLeft') {
        event.preventDefault();
        seek(audioRef.current.currentTime - 5);
        return;
      }

      if (event.code === 'ArrowRight' || event.key === 'ArrowRight') {
        event.preventDefault();
        seek(audioRef.current.currentTime + 5);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [seek, toggle]);

  const currentTrack = tracks[currentIndex];

  useEffect(() => {
    if (!audio) {
      return;
    }

    const loadedSource = loadedSourceRef.current;
    if (
      loadedSource?.index === currentIndex &&
      loadedSource.url === currentTrack.audioUrl
    ) {
      return;
    }

    const shouldContinuePlaying = desiredPlayingRef.current;
    const token = ++requestTokenRef.current;
    pendingPlayTokenRef.current = shouldContinuePlaying ? token : null;
    setConfirmedPlaying(false);
    loadSource(audio, currentIndex);

    if (shouldContinuePlaying) {
      void startPlayback(audio, token);
    }
  }, [audio, currentIndex, currentTrack, loadSource, setConfirmedPlaying, startPlayback]);

  const value = useMemo<PlayerContextValue>(
    () => ({
      audio,
      tracks,
      currentTrack,
      currentIndex,
      currentTime,
      duration,
      volume,
      isMuted,
      isPlaying,
      isExpanded,
      error,
      toggle,
      playTrack,
      next,
      previous,
      seek,
      setVolume,
      toggleMuted,
      setExpanded: setIsExpanded,
    }),
    [
      audio,
      currentIndex,
      currentTime,
      currentTrack,
      duration,
      error,
      isExpanded,
      isMuted,
      isPlaying,
      next,
      playTrack,
      previous,
      seek,
      setVolume,
      toggle,
      toggleMuted,
      tracks,
      volume,
    ],
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}
