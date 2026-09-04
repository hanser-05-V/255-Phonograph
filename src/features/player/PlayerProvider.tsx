import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  readPlayerSnapshot,
  reconcilePlayerSnapshot,
  writePlayerSnapshot,
} from './player-persistence';
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
  queueIds: string[];
  toggle: () => Promise<void>;
  playTrack: (trackId: string, queueIds?: readonly string[]) => Promise<void>;
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

type InitialPlayerState = {
  currentTrackId: string;
  currentTime: number;
  volume: number;
  isMuted: boolean;
  queueIds: string[];
};

const defaultVolume = 0.7;
const mediaErrorMessage = '音频加载失败，请尝试其他歌曲。';

const clampVolume = (value: number) => Math.min(1, Math.max(0, value));

const sameIds = (left: readonly string[], right: readonly string[]) => (
  left.length === right.length && left.every((id, index) => id === right[index])
);

const availableIds = (tracks: readonly Track[]) => [...new Set(tracks.map(({id}) => id))];

function createInitialPlayerState(tracks: readonly Track[]): InitialPlayerState {
  const restored = readPlayerSnapshot();
  if (restored) {
    const reconciled = reconcilePlayerSnapshot(restored, tracks);
    if (reconciled) {
      return reconciled;
    }
  }

  return {
    currentTrackId: tracks[0].id,
    currentTime: 0,
    volume: defaultVolume,
    isMuted: false,
    queueIds: availableIds(tracks),
  };
}

function reconcileRequestedQueue(
  requestedQueue: readonly string[],
  tracks: readonly Track[],
  currentTrackId: string,
) {
  const allIds = availableIds(tracks);
  const available = new Set(allIds);
  const queueIds = [...new Set(requestedQueue.filter((id) => available.has(id)))];

  if (queueIds.length === 0) {
    return allIds;
  }
  if (!queueIds.includes(currentTrackId)) {
    queueIds.unshift(currentTrackId);
  }
  return queueIds;
}

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

  const [initialState] = useState(() => createInitialPlayerState(tracks));
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [currentTrackId, setCurrentTrackId] = useState(initialState.currentTrackId);
  const [queueIds, setQueueIds] = useState(initialState.queueIds);
  const [currentTime, setCurrentTime] = useState(initialState.currentTime);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(initialState.volume);
  const [isMuted, setIsMuted] = useState(initialState.isMuted);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const tracksRef = useRef(tracks);
  const currentTrackIdRef = useRef(currentTrackId);
  const queueIdsRef = useRef(queueIds);
  const currentTimeRef = useRef(currentTime);
  const volumeRef = useRef(volume);
  const isMutedRef = useRef(isMuted);
  const desiredPlayingRef = useRef(false);
  const requestTokenRef = useRef(0);
  const pendingPlayTokenRef = useRef<number | null>(null);
  const lastProgressWriteAtRef = useRef(0);
  const progressWriteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedSourceRef = useRef<{trackId: string; url: string} | null>(null);
  const pendingRestoreRef = useRef(
    initialState.currentTime > 0
      ? {trackId: initialState.currentTrackId, currentTime: initialState.currentTime}
      : null,
  );
  const nextRef = useRef<() => void>(() => undefined);

  tracksRef.current = tracks;
  currentTrackIdRef.current = currentTrackId;
  queueIdsRef.current = queueIds;
  currentTimeRef.current = currentTime;
  volumeRef.current = volume;
  isMutedRef.current = isMuted;

  const trackById = useMemo(
    () => new Map(tracks.map((track) => [track.id, track])),
    [tracks],
  );
  const currentTrack = trackById.get(currentTrackId) ?? tracks[0];
  const currentIndex = tracks.findIndex(({id}) => id === currentTrack.id);

  const setConfirmedPlaying = useCallback((playing: boolean) => {
    setIsPlaying(playing);
  }, []);

  const persistSnapshot = useCallback(() => {
    writePlayerSnapshot({
      version: 2,
      currentTrackId: currentTrackIdRef.current,
      currentTime: currentTimeRef.current,
      volume: volumeRef.current,
      isMuted: isMutedRef.current,
      queueIds: queueIdsRef.current,
    });
  }, []);

  const persistProgress = useCallback(() => {
    const now = Date.now();
    const elapsed = now - lastProgressWriteAtRef.current;
    if (elapsed < 1_000) {
      if (progressWriteTimerRef.current === null) {
        progressWriteTimerRef.current = setTimeout(() => {
          progressWriteTimerRef.current = null;
          lastProgressWriteAtRef.current = Date.now();
          persistSnapshot();
        }, 1_000 - elapsed);
      }
      return;
    }

    if (progressWriteTimerRef.current !== null) {
      clearTimeout(progressWriteTimerRef.current);
      progressWriteTimerRef.current = null;
    }
    lastProgressWriteAtRef.current = now;
    persistSnapshot();
  }, [persistSnapshot]);

  const flushProgressSnapshot = useCallback(() => {
    if (progressWriteTimerRef.current !== null) {
      clearTimeout(progressWriteTimerRef.current);
      progressWriteTimerRef.current = null;
    }
    lastProgressWriteAtRef.current = Date.now();
    persistSnapshot();
  }, [persistSnapshot]);

  const loadSource = useCallback((element: HTMLAudioElement, track: Track) => {
    loadedSourceRef.current = {trackId: track.id, url: track.audioUrl};
    element.src = track.audioUrl;
    setDuration(0);
    setError(null);

    const pendingRestore = pendingRestoreRef.current;
    if (!pendingRestore || pendingRestore.trackId !== track.id) {
      pendingRestoreRef.current = null;
      element.currentTime = 0;
      currentTimeRef.current = 0;
      setCurrentTime(0);
    }
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

  const selectTrack = useCallback((trackId: string) => {
    const track = tracksRef.current.find(({id}) => id === trackId);
    if (!track) {
      return;
    }

    const element = audioRef.current;
    const shouldPlay = desiredPlayingRef.current;
    const token = ++requestTokenRef.current;
    pendingPlayTokenRef.current = shouldPlay ? token : null;
    currentTrackIdRef.current = trackId;
    setCurrentTrackId(trackId);
    setConfirmedPlaying(false);

    if (!element) {
      return;
    }

    loadSource(element, track);
    if (shouldPlay) {
      void startPlayback(element, token);
    }
  }, [loadSource, setConfirmedPlaying, startPlayback]);

  const next = useCallback(() => {
    const activeQueue = queueIdsRef.current;
    const currentQueueIndex = activeQueue.indexOf(currentTrackIdRef.current);
    const targetIndex = nextIndex(Math.max(0, currentQueueIndex), activeQueue.length);
    selectTrack(activeQueue[targetIndex]);
  }, [selectTrack]);

  const previous = useCallback(() => {
    const activeQueue = queueIdsRef.current;
    const currentQueueIndex = activeQueue.indexOf(currentTrackIdRef.current);
    const targetIndex = previousIndex(Math.max(0, currentQueueIndex), activeQueue.length);
    selectTrack(activeQueue[targetIndex]);
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
      if (!pendingRestoreRef.current) {
        currentTimeRef.current = element.currentTime;
      }
      flushProgressSnapshot();
      return;
    }

    const track = tracksRef.current.find(({id}) => id === currentTrackIdRef.current);
    if (!track) {
      return;
    }

    desiredPlayingRef.current = true;
    const token = ++requestTokenRef.current;
    setConfirmedPlaying(false);
    setError(null);
    const loadedSource = loadedSourceRef.current;
    if (
      loadedSource?.trackId !== track.id ||
      loadedSource.url !== track.audioUrl
    ) {
      loadSource(element, track);
    }
    await startPlayback(element, token);
  }, [flushProgressSnapshot, loadSource, setConfirmedPlaying, startPlayback]);

  const playTrack = useCallback(async (
    trackId: string,
    requestedQueue?: readonly string[],
  ) => {
    const element = audioRef.current;
    const track = tracksRef.current.find(({id}) => id === trackId);
    if (!element || !track) {
      return;
    }

    const nextQueue = requestedQueue
      ? reconcileRequestedQueue(requestedQueue, tracksRef.current, trackId)
      : availableIds(tracksRef.current);
    queueIdsRef.current = nextQueue;
    setQueueIds((previousQueue) => sameIds(previousQueue, nextQueue) ? previousQueue : nextQueue);

    desiredPlayingRef.current = true;
    const token = ++requestTokenRef.current;
    pendingPlayTokenRef.current = token;
    setConfirmedPlaying(false);
    setError(null);

    const loadedSource = loadedSourceRef.current;
    if (
      trackId !== currentTrackIdRef.current ||
      loadedSource?.trackId !== trackId ||
      loadedSource.url !== track.audioUrl
    ) {
      currentTrackIdRef.current = trackId;
      setCurrentTrackId(trackId);
      loadSource(element, track);
    }

    await startPlayback(element, token);
  }, [loadSource, setConfirmedPlaying, startPlayback]);

  const seek = useCallback((seconds: number) => {
    const element = audioRef.current;
    if (!element || !Number.isFinite(seconds)) {
      return;
    }

    pendingRestoreRef.current = null;
    const safeDuration = Number.isFinite(element.duration) && element.duration > 0
      ? element.duration
      : 0;
    const nextTime = safeDuration > 0
      ? Math.min(Math.max(0, seconds), safeDuration)
      : Math.max(0, seconds);
    element.currentTime = nextTime;
    currentTimeRef.current = nextTime;
    setCurrentTime(nextTime);
    persistProgress();
  }, [persistProgress]);

  const setVolume = useCallback((nextVolume: number) => {
    const safeVolume = clampVolume(nextVolume);
    const element = audioRef.current;
    if (element) {
      element.volume = safeVolume;
    }
    setVolumeState(safeVolume);
  }, []);

  const toggleMuted = useCallback(() => {
    setIsMuted((muted) => {
      const nextMuted = !muted;
      if (audioRef.current) {
        audioRef.current.muted = nextMuted;
      }
      return nextMuted;
    });
  }, []);

  useEffect(() => {
    const element = new Audio();
    element.preload = 'metadata';
    element.volume = initialState.volume;
    element.muted = initialState.isMuted;
    audioRef.current = element;

    const updateTime = () => {
      currentTimeRef.current = element.currentTime;
      setCurrentTime(element.currentTime);
      persistProgress();
    };
    const updateDuration = () => {
      setDuration(Number.isFinite(element.duration) ? element.duration : 0);
    };
    const restoreProgress = () => {
      const pendingRestore = pendingRestoreRef.current;
      const loadedSource = loadedSourceRef.current;
      if (!pendingRestore || loadedSource?.trackId !== pendingRestore.trackId) {
        return;
      }

      const restoredTime = Number.isFinite(element.duration) && element.duration > 0
        ? Math.min(pendingRestore.currentTime, element.duration)
        : pendingRestore.currentTime;
      pendingRestoreRef.current = null;
      element.currentTime = restoredTime;
      currentTimeRef.current = restoredTime;
      setCurrentTime(restoredTime);
    };
    const flushProgress = () => {
      const pendingRestore = pendingRestoreRef.current;
      if (!pendingRestore) {
        currentTimeRef.current = element.currentTime;
      }
      flushProgressSnapshot();
    };
    const handlePlay = () => {
      if (!desiredPlayingRef.current || pendingPlayTokenRef.current !== null) {
        return;
      }

      setConfirmedPlaying(true);
      setError(null);
    };
    const handlePause = () => {
      if (pendingPlayTokenRef.current === null) {
        desiredPlayingRef.current = false;
      }
      flushProgress();
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
    element.addEventListener('loadedmetadata', restoreProgress);
    element.addEventListener('play', handlePlay);
    element.addEventListener('pause', handlePause);
    element.addEventListener('ended', handleEnded);
    element.addEventListener('error', handleError);
    window.addEventListener('pagehide', flushProgress);
    element.pause();
    setAudio(element);

    return () => {
      element.removeEventListener('timeupdate', updateTime);
      element.removeEventListener('durationchange', updateDuration);
      element.removeEventListener('loadedmetadata', restoreProgress);
      element.removeEventListener('play', handlePlay);
      element.removeEventListener('pause', handlePause);
      element.removeEventListener('ended', handleEnded);
      element.removeEventListener('error', handleError);
      window.removeEventListener('pagehide', flushProgress);
      flushProgress();
      requestTokenRef.current += 1;
      pendingPlayTokenRef.current = null;
      desiredPlayingRef.current = false;
      element.pause();
      audioRef.current = null;
    };
  }, [
    initialState.isMuted,
    initialState.volume,
    flushProgressSnapshot,
    persistProgress,
    setConfirmedPlaying,
  ]);

  useEffect(() => {
    const reconciled = reconcilePlayerSnapshot({
      version: 2,
      currentTrackId: currentTrackIdRef.current,
      currentTime: currentTimeRef.current,
      volume: volumeRef.current,
      isMuted: isMutedRef.current,
      queueIds: queueIdsRef.current,
    }, tracks);
    if (!reconciled) {
      return;
    }

    queueIdsRef.current = reconciled.queueIds;
    setQueueIds((previousQueue) => (
      sameIds(previousQueue, reconciled.queueIds) ? previousQueue : reconciled.queueIds
    ));

    if (reconciled.currentTrackId === currentTrackIdRef.current) {
      return;
    }

    desiredPlayingRef.current = false;
    requestTokenRef.current += 1;
    pendingPlayTokenRef.current = null;
    pendingRestoreRef.current = null;
    audioRef.current?.pause();
    currentTrackIdRef.current = reconciled.currentTrackId;
    setCurrentTrackId(reconciled.currentTrackId);
    currentTimeRef.current = 0;
    setCurrentTime(0);
    setConfirmedPlaying(false);
  }, [setConfirmedPlaying, tracks]);

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

  useEffect(() => {
    if (!audio) {
      return;
    }

    const track = tracksRef.current.find(({id}) => id === currentTrackId);
    if (!track || loadedSourceRef.current?.trackId === currentTrackId) {
      return;
    }

    loadSource(audio, track);
  }, [audio, currentTrackId, loadSource]);

  useEffect(() => {
    persistSnapshot();
  }, [currentTrackId, isMuted, persistSnapshot, queueIds, volume]);

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
      queueIds,
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
      queueIds,
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
