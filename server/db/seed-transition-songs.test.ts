import {describe, expect, it} from 'vitest';

import {createDemoAudio} from '../media/create-demo-audio.js';
import {createTestContext} from '../test/test-context.js';
import {seedTransitionSongs} from './seed-transition-songs.js';

const fixedDependencies = () => {
  const ids = ['media-first', 'media-volcano', 'media-night'];

  return {
    generateId: () => {
      const id = ids.shift();
      if (!id) {
        throw new Error('Unexpected extra ID request');
      }
      return id;
    },
    now: () => '2026-09-03T08:00:00.000Z',
  };
};

describe('transition song seed', () => {
  it('generates a valid one-second PCM WAV for runtime playback', () => {
    const audio = Buffer.from(
      createDemoAudio({durationSeconds: 1, frequencyHz: 440, sampleRate: 8_000}),
    );

    expect(audio.subarray(0, 4).toString('ascii')).toBe('RIFF');
    expect(audio.subarray(8, 12).toString('ascii')).toBe('WAVE');
    expect(audio.subarray(36, 40).toString('ascii')).toBe('data');
    expect(audio.readUInt16LE(20)).toBe(1);
    expect(audio.readUInt32LE(24)).toBe(8_000);
    expect(audio.readUInt32LE(40)).toBe(16_000);
    expect(audio.byteLength).toBe(16_044);
  });

  it('seeds the three published transition songs and runtime media only once', async () => {
    const context = await createTestContext();

    try {
      await seedTransitionSongs(context.db, context.mediaStore, fixedDependencies());
      await seedTransitionSongs(context.db, context.mediaStore, fixedDependencies());

      expect(
        context.db
          .prepare('SELECT id, title, artist, status FROM songs ORDER BY id')
          .all(),
      ).toEqual([
        {id: 'first-light', title: '初光', artist: 'Hanser', status: 'published'},
        {id: 'night-walk', title: '夜行', artist: 'Hanser', status: 'published'},
        {
          id: 'volcano-planet',
          title: '等火山喷发的小星球',
          artist: 'Hanser',
          status: 'published',
        },
      ]);
      expect(
        context.db
          .prepare('SELECT storage_key FROM media_objects ORDER BY storage_key')
          .all(),
      ).toEqual([
        {storage_key: 'runtime/media-first.wav'},
        {storage_key: 'runtime/media-night.wav'},
        {storage_key: 'runtime/media-volcano.wav'},
      ]);
      expect(await context.listRuntimeMedia()).toEqual([
        'runtime/media-first.wav',
        'runtime/media-night.wav',
        'runtime/media-volcano.wav',
      ]);
    } finally {
      await context.dispose();
    }
  });

  it('stores fixed ordered publication times and generated audio metadata', async () => {
    const context = await createTestContext();

    try {
      await seedTransitionSongs(context.db, context.mediaStore, fixedDependencies());

      expect(
        context.db
          .prepare(`
            SELECT id, duration_seconds, published_at, created_at, updated_at
            FROM songs
            ORDER BY published_at
          `)
          .all(),
      ).toEqual([
        {
          id: 'first-light',
          duration_seconds: 1,
          published_at: '2026-09-01T00:00:00.000Z',
          created_at: '2026-09-03T08:00:00.000Z',
          updated_at: '2026-09-03T08:00:00.000Z',
        },
        {
          id: 'volcano-planet',
          duration_seconds: 1,
          published_at: '2026-09-01T00:01:00.000Z',
          created_at: '2026-09-03T08:00:00.000Z',
          updated_at: '2026-09-03T08:00:00.000Z',
        },
        {
          id: 'night-walk',
          duration_seconds: 1,
          published_at: '2026-09-01T00:02:00.000Z',
          created_at: '2026-09-03T08:00:00.000Z',
          updated_at: '2026-09-03T08:00:00.000Z',
        },
      ]);

      const media = context.db
        .prepare('SELECT kind, mime_type, byte_size FROM media_objects')
        .all() as Array<{byte_size: number; kind: string; mime_type: string}>;
      expect(media).toHaveLength(3);
      expect(media.every((item) => item.kind === 'audio')).toBe(true);
      expect(media.every((item) => item.mime_type === 'audio/wav')).toBe(true);
      expect(media.every((item) => item.byte_size > 44)).toBe(true);
    } finally {
      await context.dispose();
    }
  });

  it('rolls back database rows and removes newly written media when seeding fails', async () => {
    const context = await createTestContext();
    let writes = 0;
    const failingMediaStore = {
      deleteRuntimeMedia: context.mediaStore.deleteRuntimeMedia,
      createRuntimeMedia: async (storageKey: string, bytes: Uint8Array) => {
        writes += 1;
        if (writes === 2) {
          throw new Error('simulated media failure');
        }
        await context.mediaStore.createRuntimeMedia(storageKey, bytes);
      },
    };

    try {
      await expect(
        seedTransitionSongs(context.db, failingMediaStore, fixedDependencies()),
      ).rejects.toThrow('simulated media failure');
      expect(context.db.prepare('SELECT id FROM songs').all()).toEqual([]);
      expect(context.db.prepare('SELECT id FROM media_objects').all()).toEqual([]);
      expect(await context.listRuntimeMedia()).toEqual([]);
    } finally {
      await context.dispose();
    }
  });

  it('does not overwrite or clean up media that already owns a generated key', async () => {
    const context = await createTestContext();
    await context.mediaStore.createRuntimeMedia(
      'runtime/media-first.wav',
      new Uint8Array([1, 2, 3]),
    );

    try {
      await expect(
        seedTransitionSongs(context.db, context.mediaStore, fixedDependencies()),
      ).rejects.toThrow();
      expect(context.db.prepare('SELECT id FROM songs').all()).toEqual([]);
      expect(context.db.prepare('SELECT id FROM media_objects').all()).toEqual([]);
      expect(await context.listRuntimeMedia()).toEqual([
        'runtime/media-first.wav',
      ]);
    } finally {
      await context.dispose();
    }
  });
});
