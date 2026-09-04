import type {PlayerSnapshotV2} from './types';

export type {PlayerSnapshotV2} from './types';

export const PLAYER_SNAPSHOT_STORAGE_KEY = '255-phonograph:player:v2';

type AvailableTrack = {id: string};

export type ReconciledPlayerSnapshot = Omit<PlayerSnapshotV2, 'version'> & {
  shouldPlay: false;
};

const clampVolume = (value: number) => {
  if (!Number.isFinite(value)) {
    return 0.7;
  }
  return Math.min(1, Math.max(0, value));
};

const safeCurrentTime = (value: number) => (
  Number.isFinite(value) && value >= 0 ? value : 0
);

function isPlayerSnapshotV2(value: unknown): value is PlayerSnapshotV2 {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const snapshot = value as Record<string, unknown>;
  return (
    snapshot.version === 2 &&
    typeof snapshot.currentTrackId === 'string' &&
    typeof snapshot.currentTime === 'number' &&
    typeof snapshot.volume === 'number' &&
    typeof snapshot.isMuted === 'boolean' &&
    Array.isArray(snapshot.queueIds) &&
    snapshot.queueIds.every((id) => typeof id === 'string')
  );
}

function getBrowserStorage() {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function readPlayerSnapshot(storage: Storage | null = getBrowserStorage()) {
  if (!storage) {
    return null;
  }

  try {
    const serialized = storage.getItem(PLAYER_SNAPSHOT_STORAGE_KEY);
    if (!serialized) {
      return null;
    }

    const parsed: unknown = JSON.parse(serialized);
    return isPlayerSnapshotV2(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writePlayerSnapshot(
  snapshot: PlayerSnapshotV2,
  storage: Storage | null = getBrowserStorage(),
) {
  if (!storage) {
    return;
  }

  try {
    storage.setItem(PLAYER_SNAPSHOT_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Playback must remain usable when storage is blocked or full.
  }
}

export function reconcilePlayerSnapshot(
  snapshot: PlayerSnapshotV2,
  availableTracks: readonly AvailableTrack[],
): ReconciledPlayerSnapshot | null {
  const availableIds = [...new Set(availableTracks.map(({id}) => id))];
  if (availableIds.length === 0) {
    return null;
  }

  const availableIdSet = new Set(availableIds);
  const currentIsAvailable = availableIdSet.has(snapshot.currentTrackId);
  const currentTrackId = currentIsAvailable ? snapshot.currentTrackId : availableIds[0];
  const savedQueue = [...new Set(snapshot.queueIds.filter((id) => availableIdSet.has(id)))];
  const queueIds = savedQueue.length > 0 ? savedQueue : availableIds;

  if (!queueIds.includes(currentTrackId)) {
    queueIds.unshift(currentTrackId);
  }

  return {
    currentTrackId,
    currentTime: currentIsAvailable ? safeCurrentTime(snapshot.currentTime) : 0,
    volume: clampVolume(snapshot.volume),
    isMuted: snapshot.isMuted,
    queueIds,
    shouldPlay: false,
  };
}
