import {randomUUID} from 'node:crypto';

import type {DatabaseSync} from 'node:sqlite';

import {createDemoAudio} from '../media/create-demo-audio.js';

export type TransitionSongMediaStore = {
  createRuntimeMedia(storageKey: string, bytes: Uint8Array): Promise<void>;
  deleteRuntimeMedia(storageKey: string): Promise<void>;
};

export type TransitionSeedDependencies = {
  generateId: () => string;
  now: () => string;
};

type TransitionSong = {
  id: string;
  title: string;
  lyricsText: string;
  frequencyHz: number;
  publishedAt: string;
};

const transitionSongs: readonly TransitionSong[] = [
  {
    id: 'first-light',
    title: '初光',
    lyricsText: '[00:00.00]初光\n[00:01.20]让今天慢慢开始\n[00:02.40]留住一点安静',
    frequencyHz: 261.63,
    publishedAt: '2026-09-01T00:00:00.000Z',
  },
  {
    id: 'volcano-planet',
    title: '等火山喷发的小星球',
    lyricsText: '[00:00.00]等火山喷发的小星球\n[00:01.20]等待星光越过山口\n[00:02.40]把愿望留给宇宙',
    frequencyHz: 329.63,
    publishedAt: '2026-09-01T00:01:00.000Z',
  },
  {
    id: 'night-walk',
    title: '夜行',
    lyricsText: '[00:00.00]夜行\n[00:01.20]路灯照亮回家的路\n[00:02.40]晚风轻轻地唱',
    frequencyHz: 392,
    publishedAt: '2026-09-01T00:02:00.000Z',
  },
];

const defaultDependencies: TransitionSeedDependencies = {
  generateId: randomUUID,
  now: () => new Date().toISOString(),
};

function rollback(db: DatabaseSync): void {
  try {
    db.exec('ROLLBACK');
  } catch {
    // Preserve the seed failure if SQLite already ended the transaction.
  }
}

export async function seedTransitionSongs(
  db: DatabaseSync,
  mediaStore: TransitionSongMediaStore,
  dependencies: TransitionSeedDependencies = defaultDependencies,
): Promise<void> {
  const missingSongs = transitionSongs.filter(
    (song) =>
      !db.prepare('SELECT 1 FROM songs WHERE id = ?').get(song.id),
  );

  if (missingSongs.length === 0) {
    return;
  }

  const writtenStorageKeys: string[] = [];
  db.exec('BEGIN IMMEDIATE');

  try {
    for (const song of missingSongs) {
      const mediaId = dependencies.generateId();
      const storageKey = `runtime/${mediaId}.wav`;
      const audio = createDemoAudio({
        durationSeconds: 1,
        frequencyHz: song.frequencyHz,
      });
      const timestamp = dependencies.now();

      await mediaStore.createRuntimeMedia(storageKey, audio);
      writtenStorageKeys.push(storageKey);

      db.prepare(`
        INSERT INTO media_objects (
          id, kind, storage_key, original_name, mime_type, byte_size, created_at
        ) VALUES (?, 'audio', ?, ?, 'audio/wav', ?, ?)
      `).run(
        mediaId,
        storageKey,
        `${song.id}.wav`,
        audio.byteLength,
        timestamp,
      );

      db.prepare(`
        INSERT INTO songs (
          id, title, artist, status, duration_seconds, audio_media_id,
          lyrics_text, is_featured, is_live_cover, published_at,
          created_at, updated_at
        ) VALUES (?, ?, 'Hanser', 'published', 1, ?, ?, 0, 0, ?, ?, ?)
      `).run(
        song.id,
        song.title,
        mediaId,
        song.lyricsText,
        song.publishedAt,
        timestamp,
        timestamp,
      );
    }

    db.exec('COMMIT');
  } catch (error) {
    rollback(db);
    await Promise.allSettled(
      writtenStorageKeys.map((storageKey) =>
        mediaStore.deleteRuntimeMedia(storageKey),
      ),
    );
    throw error;
  }
}
