import type {DatabaseSync} from 'node:sqlite';

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {openDatabase} from '../db/database.js';
import {runMigrations} from '../db/migrate.js';
import {TaxonomyService} from './taxonomy-service.js';

const CREATED_AT = new Date('2026-09-04T01:00:00.000Z');
const UPDATED_AT = new Date('2026-09-04T02:00:00.000Z');

function createIdGenerator(...ids: string[]): () => string {
  return () => {
    const id = ids.shift();
    if (!id) {
      throw new Error('Test ID generator exhausted.');
    }
    return id;
  };
}

function seedSongTaxonomy(db: DatabaseSync) {
  const songId = 'song-1';
  const categoryId = 'category-live';
  const keptTagId = 'tag-kept';
  const removedTagId = 'tag-removed';
  const timestamp = CREATED_AT.toISOString();

  db.prepare(`
    INSERT INTO categories (id, name, normalized_name, created_at, updated_at)
    VALUES (?, '现场', '现场', ?, ?)
  `).run(categoryId, timestamp, timestamp);
  db.prepare(`
    INSERT INTO tags (id, name, normalized_name, created_at, updated_at)
    VALUES (?, '保留', '保留', ?, ?), (?, '删除', '删除', ?, ?)
  `).run(
    keptTagId,
    timestamp,
    timestamp,
    removedTagId,
    timestamp,
    timestamp,
  );
  db.prepare(`
    INSERT INTO songs (id, status, category_id, created_at, updated_at)
    VALUES (?, 'draft', ?, ?, ?)
  `).run(songId, categoryId, timestamp, timestamp);
  db.prepare(`
    INSERT INTO song_tags (song_id, tag_id)
    VALUES (?, ?), (?, ?)
  `).run(songId, keptTagId, songId, removedTagId);

  return {songId, categoryId, keptTagId, removedTagId};
}

function readSong(db: DatabaseSync, songId: string): {categoryId: string | null} {
  return db.prepare(`
    SELECT category_id AS categoryId
    FROM songs
    WHERE id = ?
  `).get(songId) as {categoryId: string | null};
}

function readTagIds(db: DatabaseSync, songId: string): string[] {
  return (
    db.prepare(`
      SELECT tag_id AS tagId
      FROM song_tags
      WHERE song_id = ?
      ORDER BY tag_id
    `).all(songId) as Array<{tagId: string}>
  ).map(({tagId}) => tagId);
}

describe('TaxonomyService', () => {
  let db: DatabaseSync;

  beforeEach(() => {
    db = openDatabase(':memory:');
    runMigrations(db);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    db.close();
  });

  it('normalizes names and rejects duplicate categories and tags', () => {
    const service = new TaxonomyService(
      db,
      () => CREATED_AT,
      createIdGenerator('category-1', 'category-2', 'tag-1'),
    );
    const category = service.createCategory('  直播   翻唱 ');

    expect(category).toEqual({
      id: 'category-1',
      name: '直播 翻唱',
      createdAt: CREATED_AT.toISOString(),
      updatedAt: CREATED_AT.toISOString(),
    });
    expect(() => service.createCategory('直播 翻唱')).toThrowError(
      '分类名称已存在',
    );

    const tag = service.createTag('ＡＢＣ');
    expect(tag.name).toBe('ＡＢＣ');
    expect(() => service.createTag('abc')).toThrowError('标签名称已存在');
    expect(service.renameTag(tag.id, '  ＡＢＣ  ')).toMatchObject({
      id: tag.id,
      name: 'ＡＢＣ',
    });
    expect(service.listTags()).toEqual([
      expect.objectContaining({id: tag.id, name: 'ＡＢＣ'}),
    ]);
  });

  it('uses a fixed locale when producing the persistent unique key', () => {
    const localeLowercase = String.prototype.toLocaleLowerCase;
    vi.spyOn(String.prototype, 'toLocaleLowerCase').mockImplementation(
      function simulatedTurkishHost(locales) {
        return localeLowercase.call(
          this,
          locales === undefined ? 'tr' : locales,
        );
      },
    );
    const service = new TaxonomyService(
      db,
      () => CREATED_AT,
      createIdGenerator('tag-uppercase', 'tag-lowercase'),
    );

    service.createTag('I');

    expect(() => service.createTag('i')).toThrowError('标签名称已存在');
  });

  it('sorts by normalized name and keeps stable IDs when renaming', () => {
    let now = CREATED_AT;
    const service = new TaxonomyService(
      db,
      () => now,
      createIdGenerator('category-z', 'category-a'),
    );
    const zulu = service.createCategory('Zulu');
    const alpha = service.createCategory('alpha');

    expect(service.listCategories().map(({id}) => id)).toEqual([
      alpha.id,
      zulu.id,
    ]);

    now = UPDATED_AT;
    expect(service.renameCategory(zulu.id, ' Bravo ')).toEqual({
      id: zulu.id,
      name: 'Bravo',
      createdAt: CREATED_AT.toISOString(),
      updatedAt: UPDATED_AT.toISOString(),
    });
    expect(service.listCategories().map(({id}) => id)).toEqual([
      alpha.id,
      zulu.id,
    ]);
  });

  it('rejects empty and overlong Unicode display names', () => {
    const service = new TaxonomyService(
      db,
      () => CREATED_AT,
      createIdGenerator('unused'),
    );

    expect(() => service.createCategory(' \t\n ')).toThrowError(
      '分类名称长度必须为 1–50 个字符',
    );
    expect(() => service.createTag('音'.repeat(51))).toThrowError(
      '标签名称长度必须为 1–50 个字符',
    );
  });

  it('clears a deleted category and cascades only the deleted tag relation', () => {
    const seeded = seedSongTaxonomy(db);
    const service = new TaxonomyService(
      db,
      () => CREATED_AT,
      createIdGenerator('unused'),
    );

    service.deleteCategory(seeded.categoryId);
    service.deleteTag(seeded.removedTagId);

    expect(readSong(db, seeded.songId).categoryId).toBeNull();
    expect(readTagIds(db, seeded.songId)).toEqual([seeded.keptTagId]);
    expect(
      db.prepare('SELECT id FROM songs WHERE id = ?').get(seeded.songId),
    ).toEqual({id: seeded.songId});
  });
});
