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
  const isPlayingRef = useRef(isPlaying);
  const nextRef = useRef<() => void>(() => undefined);

  tracksRef.current = tracks;
  isPlayingRef.current = isPlaying;

  const next = useCallback(() => {
    setCurrentIndex((index) => nextIndex(index, tracksRef.current.length));
  }, []);

  const previous = useCallback(() => {
    setCurrentIndex((index) => previousIndex(index, tracksRef.current.length));
  }, []);

  nextRef.current = next;

  const toggle = useCallback(async () => {
    const element = audioRef.current;
    if (!element) {
      return;
    }

    if (isPlayingRef.current) {
      element.pause();
      isPlayingRef.current = false;
      setIsPlaying(false);
      return;
    }

    try {
      await element.play();
      isPlayingRef.current = true;
      setIsPlaying(true);
      setError(null);
    } catch {
      isPlayingRef.current = false;
      setIsPlaying(false);
      setError(mediaErrorMessage);
    }
  }, []);

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
      isPlayingRef.current = true;
      setIsPlaying(true);
      setError(null);
    };
    const handlePause = () => {
      isPlayingRef.current = false;
      setIsPlaying(false);
    };
    const handleEnded = () => {
      isPlayingRef.current = true;
      setIsPlaying(true);
      nextRef.current();
    };
    const handleError = () => {
      setError(mediaErrorMessage);
      isPlayingRef.current = false;
      setIsPlaying(false);
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
      element.pause();
      audioRef.current = null;
    };
  }, []);

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

    const shouldContinuePlaying = isPlayingRef.current;
    audio.src = currentTrack.audioUrl;
    setCurrentTime(0);
    setDuration(0);
    setError(null);

    if (shouldContinuePlaying) {
      void audio.play().catch(() => {
        isPlayingRef.current = false;
        setIsPlaying(false);
        setError(mediaErrorMessage);
      });
    }
  }, [audio, currentTrack]);

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
