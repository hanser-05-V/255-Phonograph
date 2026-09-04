import {afterEach, beforeEach, describe, expect, it} from 'vitest';

import type {LibraryResponse} from '../../shared/contracts.js';
import {
  createTestContext,
  seedSongsAcrossStatuses,
  type TestContext,
} from '../test/test-context.js';

describe('public library routes', () => {
  let context: TestContext;

  beforeEach(async () => {
    context = await createTestContext();
  });

  afterEach(async () => {
    await context.dispose();
  });

  it('returns only published songs and caps ordered home sections at six ids', async () => {
    await seedSongsAcrossStatuses(context, 9);
    const expectedNewestFirst = [
      'published-01',
      'published-02',
      'published-03',
      'published-04',
      'published-05',
      'published-06',
      'published-07',
      'published-08',
      'published-09',
    ];
    const expectedFeaturedNewestFirst = [
      'published-01',
      'published-02',
      'published-03',
      'published-04',
      'published-05',
      'published-06',
      'published-07',
      'published-08',
    ];
    const expectedLiveNewestFirst = [
      'published-02',
      'published-03',
      'published-04',
      'published-05',
      'published-06',
      'published-07',
      'published-08',
      'published-09',
    ];

    const response = await context.app.inject({method: 'GET', url: '/api/library'});

    expect(response.statusCode).toBe(200);
    const body = response.json<LibraryResponse>();
    expect(body.songs.map(({id}) => id)).toEqual(expectedNewestFirst);
    expect(body.songs.every((song) => !('status' in song))).toBe(true);
    expect(body.songs.map((song) => song.title)).not.toContain('草稿歌');
    expect(body.sections.recent).toEqual(expectedNewestFirst.slice(0, 6));
    expect(body.sections.featured).toEqual(
      expectedFeaturedNewestFirst.slice(0, 6),
    );
    expect(body.sections.liveCovers).toEqual(
      expectedLiveNewestFirst.slice(0, 6),
    );
    expect(JSON.stringify(body)).not.toContain(context.config.mediaDir);
  });

  it('returns complete public DTOs and only taxonomy used by published songs', async () => {
    const seeded = await seedSongsAcrossStatuses(context, 3);

    const response = await context.app.inject({method: 'GET', url: '/api/library'});

    expect(response.statusCode).toBe(200);
    const body = response.json<LibraryResponse>();
    expect(body.categories.map(({id}) => id)).toEqual([seeded.categoryId]);
    expect(body.tags.map(({id}) => id)).toEqual([seeded.tagId]);
    expect(body.songs[0]).toEqual({
      id: seeded.publishedIds[0],
      title: '已发布歌曲 1',
      artist: 'Hanser',
      durationSeconds: 123,
      audioUrl: expect.stringMatching(/^\/api\/media\/[0-9a-f-]+$/),
      coverUrl: expect.stringMatching(/^\/api\/media\/[0-9a-f-]+$/),
      lyricsUrl: `/api/library/songs/${seeded.lyricSongId}/lyrics`,
      category: {
        id: seeded.categoryId,
        name: '公开分类',
        createdAt: '2026-09-03T00:00:00.000Z',
        updatedAt: '2026-09-03T00:00:00.000Z',
      },
      tags: [{
        id: seeded.tagId,
        name: '公开标签',
        createdAt: '2026-09-03T00:00:00.000Z',
        updatedAt: '2026-09-03T00:00:00.000Z',
      }],
      versionNote: '版本 1',
      performanceDate: '2026-09-03',
      sourceUrl: `https://example.com/${seeded.publishedIds[0]}`,
      isFeatured: true,
      isLiveCover: false,
      publishedAt: '2026-09-03T12:00:00.000Z',
    });
    expect(body.songs[1]).not.toHaveProperty('coverUrl');
    expect(body.songs[1]).not.toHaveProperty('lyricsUrl');
    expect(JSON.stringify(body)).not.toMatch(/storage_key|original_name|mediaDir|lyricsText/);
  });

  it('serves valid lyrics only for published songs', async () => {
    const seeded = await seedSongsAcrossStatuses(context, 3);

    const lyrics = await context.app.inject({
      method: 'GET',
      url: `/api/library/songs/${seeded.lyricSongId}/lyrics`,
    });

    expect(lyrics.statusCode).toBe(200);
    expect(lyrics.headers['content-type']).toBe('text/plain; charset=utf-8');
    expect(lyrics.body).toBe('[00:00.00]公开歌词');
    for (const songId of [
      seeded.emptyLyricSongId,
      seeded.draftSongId,
      'missing-song',
    ]) {
      const response = await context.app.inject({
        method: 'GET',
        url: `/api/library/songs/${songId}/lyrics`,
      });
      expect(response.statusCode).toBe(404);
    }
  });

  it('omits published songs whose audio MIME type is not publicly servable', async () => {
    const seeded = await seedSongsAcrossStatuses(context, 3);
    context.db.prepare(`
      UPDATE media_objects
      SET mime_type = 'text/html'
      WHERE id = (SELECT audio_media_id FROM songs WHERE id = ?)
    `).run(seeded.publishedIds[0]);

    const response = await context.app.inject({method: 'GET', url: '/api/library'});

    expect(response.json<LibraryResponse>().songs.map(({id}) => id))
      .not.toContain(seeded.publishedIds[0]);
  });

  it('omits a cover URL whose MIME type is not publicly servable', async () => {
    const seeded = await seedSongsAcrossStatuses(context, 3);
    context.db.prepare(`
      UPDATE media_objects
      SET mime_type = 'text/html'
      WHERE id = (SELECT cover_media_id FROM songs WHERE id = ?)
    `).run(seeded.publishedIds[0]);

    const response = await context.app.inject({method: 'GET', url: '/api/library'});

    expect(response.json<LibraryResponse>().songs[0]).not.toHaveProperty('coverUrl');
  });
});
