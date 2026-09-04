import {describe, expect, it, vi} from 'vitest';
import {
  PLAYER_SNAPSHOT_STORAGE_KEY,
  readPlayerSnapshot,
  reconcilePlayerSnapshot,
  writePlayerSnapshot,
  type PlayerSnapshotV2,
} from './player-persistence';

const validSnapshot: PlayerSnapshotV2 = {
  version: 2,
  currentTrackId: 'b',
  currentTime: 12.5,
  volume: 0.6,
  isMuted: false,
  queueIds: ['b', 'a'],
};

function storageReturning(value: string | null): Storage {
  return {
    getItem: vi.fn(() => value),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    key: vi.fn(() => null),
    length: value === null ? 0 : 1,
  };
}

const throwingStorage: Storage = {
  getItem: vi.fn(() => {
    throw new DOMException('blocked', 'SecurityError');
  }),
  setItem: vi.fn(() => {
    throw new DOMException('blocked', 'QuotaExceededError');
  }),
  removeItem: vi.fn(),
  clear: vi.fn(),
  key: vi.fn(() => null),
  length: 0,
};

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}

describe('player persistence', () => {
  it('restores stable ids, removes unavailable queue entries and remains paused', () => {
    const restored = reconcilePlayerSnapshot({
      version: 2,
      currentTrackId: 'removed',
      currentTime: 42.5,
      volume: 0.35,
      isMuted: true,
      queueIds: ['b', 'removed', 'b'],
    }, [{id: 'a'}, {id: 'b'}]);

    expect(restored).toEqual({
      currentTrackId: 'a',
      currentTime: 0,
      volume: 0.35,
      isMuted: true,
      queueIds: ['a', 'b'],
      shouldPlay: false,
    });
  });

  it('falls back safely from malformed or blocked storage', () => {
    expect(readPlayerSnapshot(storageReturning('{bad json'))).toBeNull();
    expect(readPlayerSnapshot(throwingStorage)).toBeNull();
    expect(() => writePlayerSnapshot(validSnapshot, throwingStorage)).not.toThrow();
  });

  it('writes and reads a valid versioned snapshot', () => {
    const storage = memoryStorage();
    writePlayerSnapshot(validSnapshot, storage);

    expect(storage.getItem(PLAYER_SNAPSHOT_STORAGE_KEY)).toBe(JSON.stringify(validSnapshot));
    expect(readPlayerSnapshot(storage)).toEqual(validSnapshot);
  });

  it('ignores unknown versions and malformed snapshot fields', () => {
    expect(readPlayerSnapshot(storageReturning(JSON.stringify({
      ...validSnapshot,
      version: 1,
    })))).toBeNull();
    expect(readPlayerSnapshot(storageReturning(JSON.stringify({
      ...validSnapshot,
      queueIds: ['b', 1],
    })))).toBeNull();
  });

  it('clamps volume and invalid progress while preserving a valid current track', () => {
    expect(reconcilePlayerSnapshot({
      ...validSnapshot,
      currentTime: Number.NaN,
      volume: 4,
    }, [{id: 'a'}, {id: 'b'}])).toEqual({
      currentTrackId: 'b',
      currentTime: 0,
      volume: 1,
      isMuted: false,
      queueIds: ['b', 'a'],
      shouldPlay: false,
    });

    expect(reconcilePlayerSnapshot({
      ...validSnapshot,
      currentTime: -8,
      volume: -2,
    }, [{id: 'a'}, {id: 'b'}])).toMatchObject({currentTime: 0, volume: 0});
  });

  it('falls back to the full library when every saved queue entry is unavailable', () => {
    expect(reconcilePlayerSnapshot({
      ...validSnapshot,
      currentTrackId: 'a',
      queueIds: ['removed'],
    }, [{id: 'a'}, {id: 'b'}])).toMatchObject({
      currentTrackId: 'a',
      currentTime: 12.5,
      queueIds: ['a', 'b'],
    });
  });
});
