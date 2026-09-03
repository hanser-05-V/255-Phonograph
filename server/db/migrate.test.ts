import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';

import {afterEach, describe, expect, it} from 'vitest';

import {openDatabase, withTransaction} from './database.js';
import {runMigrations} from './migrate.js';

const REQUIRED_TABLES = [
  'schema_migrations',
  'songs',
  'categories',
  'tags',
  'song_tags',
  'media_objects',
  'pending_uploads',
  'admin_config',
  'admin_sessions',
  'pending_media_cleanup',
];

describe('database migrations', () => {
  const temporaryDirectories: string[] = [];

  afterEach(async () => {
    await Promise.all(
      temporaryDirectories.splice(0).map((directory) =>
        rm(directory, {recursive: true, force: true}),
      ),
    );
  });

  it('creates version 1 once with every required table', () => {
    const db = openDatabase(':memory:');

    try {
      runMigrations(db);
      runMigrations(db);

      const names = db
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
        .all()
        .map((row) => row.name);

      expect(names).toEqual(expect.arrayContaining(REQUIRED_TABLES));
      expect(
        db.prepare('SELECT version FROM schema_migrations ORDER BY version').all(),
      ).toEqual([{version: 1}]);
    } finally {
      db.close();
    }
  });

  it('enforces foreign keys and normalized taxonomy uniqueness', () => {
    const db = openDatabase(':memory:');

    try {
      runMigrations(db);
      expect(db.prepare('PRAGMA foreign_keys').all()).toEqual([
        {foreign_keys: 1},
      ]);

      const insertCategory = db.prepare(`
        INSERT INTO categories (id, name, normalized_name, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `);
      insertCategory.run('category-1', '翻唱', '翻唱', '2026-09-03T00:00:00.000Z', '2026-09-03T00:00:00.000Z');

      expect(() =>
        insertCategory.run('category-2', ' 翻唱 ', '翻唱', '2026-09-03T00:00:00.000Z', '2026-09-03T00:00:00.000Z'),
      ).toThrow();

      expect(() =>
        db.prepare(`
          INSERT INTO songs (id, status, category_id, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?)
        `).run('orphan-song', 'draft', 'missing-category', '2026-09-03T00:00:00.000Z', '2026-09-03T00:00:00.000Z'),
      ).toThrow();
    } finally {
      db.close();
    }
  });

  it('uses WAL journaling for a file database', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'phonograph-db-'));
    temporaryDirectories.push(directory);
    const db = openDatabase(path.join(directory, 'library.sqlite'));

    try {
      expect(db.prepare('PRAGMA journal_mode').all()).toEqual([
        {journal_mode: 'wal'},
      ]);
    } finally {
      db.close();
    }
  });

  it('commits successful work and rolls back failed work', () => {
    const db = openDatabase(':memory:');

    try {
      db.exec('CREATE TABLE examples (value TEXT NOT NULL)');

      expect(
        withTransaction(db, () => {
          db.prepare('INSERT INTO examples (value) VALUES (?)').run('kept');
          return 'committed';
        }),
      ).toBe('committed');

      expect(() =>
        withTransaction(db, () => {
          db.prepare('INSERT INTO examples (value) VALUES (?)').run('removed');
          throw new Error('stop transaction');
        }),
      ).toThrow('stop transaction');

      expect(db.prepare('SELECT value FROM examples').all()).toEqual([
        {value: 'kept'},
      ]);
    } finally {
      db.close();
    }
  });
});
