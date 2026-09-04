import type {FastifyInstance} from 'fastify';
import type {DatabaseSync} from 'node:sqlite';

import type {
  ApiErrorBody,
  LibraryResponse,
  PublicSong,
  TaxonomyItem,
} from '../../shared/contracts.js';
import {validateLrc} from '../../shared/lrc.js';
import {isPublicMediaMime} from './media.js';

type PublicSongRow = {
  id: string;
  title: string;
  artist: string;
  duration_seconds: number;
  audio_media_id: string;
  audio_mime_type: string;
  cover_media_id: string | null;
  cover_mime_type: string | null;
  lyrics_text: string | null;
  category_id: string | null;
  category_name: string | null;
  category_created_at: string | null;
  category_updated_at: string | null;
  version_note: string | null;
  performance_date: string | null;
  source_url: string | null;
  is_featured: 0 | 1;
  is_live_cover: 0 | 1;
  published_at: string;
};

type PublicTagRow = {
  song_id: string;
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

const PUBLIC_SONGS_QUERY = `
  SELECT s.id, s.title, s.artist, s.duration_seconds,
         s.audio_media_id, audio.mime_type AS audio_mime_type,
         s.cover_media_id,
         cover.mime_type AS cover_mime_type,
         s.lyrics_text, s.category_id,
         category.name AS category_name,
         category.created_at AS category_created_at,
         category.updated_at AS category_updated_at,
         s.version_note, s.performance_date, s.source_url,
         s.is_featured, s.is_live_cover, s.published_at
  FROM songs s
  JOIN media_objects audio ON audio.id = s.audio_media_id
  LEFT JOIN media_objects cover ON cover.id = s.cover_media_id
  LEFT JOIN categories category ON category.id = s.category_id
  WHERE s.status = 'published'
    AND s.published_at IS NOT NULL
  ORDER BY s.published_at DESC, s.id ASC
`;

const PUBLIC_TAGS_QUERY = `
  SELECT st.song_id, t.id, t.name, t.created_at, t.updated_at
  FROM song_tags st
  JOIN songs s ON s.id = st.song_id
  JOIN tags t ON t.id = st.tag_id
  WHERE s.status = 'published'
  ORDER BY t.normalized_name, t.id
`;

function taxonomyItem(
  id: string,
  name: string,
  createdAt: string,
  updatedAt: string,
): TaxonomyItem {
  return {id, name, createdAt, updatedAt};
}

function optionalText(value: string | null): string | undefined {
  return value?.trim() ? value : undefined;
}

function hasValidLyrics(value: string | null): value is string {
  return value !== null && value.trim() !== '' && validateLrc(value).valid;
}

function publicLibrary(db: DatabaseSync): LibraryResponse {
  const rows = (db.prepare(PUBLIC_SONGS_QUERY).all() as PublicSongRow[])
    .filter((row) => isPublicMediaMime('audio', row.audio_mime_type));
  const publicSongIds = new Set(rows.map(({id}) => id));
  const tagsBySong = new Map<string, TaxonomyItem[]>();
  const publicTags = new Map<string, TaxonomyItem>();
  for (const row of db.prepare(PUBLIC_TAGS_QUERY).all() as PublicTagRow[]) {
    if (!publicSongIds.has(row.song_id)) {
      continue;
    }
    const tag = taxonomyItem(
      row.id,
      row.name,
      row.created_at,
      row.updated_at,
    );
    publicTags.set(tag.id, tag);
    const tags = tagsBySong.get(row.song_id) ?? [];
    tags.push(tag);
    tagsBySong.set(row.song_id, tags);
  }

  const publicCategories = new Map<string, TaxonomyItem>();
  const songs: PublicSong[] = rows.map((row) => {
    let category: TaxonomyItem | null = null;
    if (
      row.category_id &&
      row.category_name &&
      row.category_created_at &&
      row.category_updated_at
    ) {
      category = taxonomyItem(
        row.category_id,
        row.category_name,
        row.category_created_at,
        row.category_updated_at,
      );
      publicCategories.set(category.id, category);
    }

    return {
      id: row.id,
      title: row.title,
      artist: row.artist,
      durationSeconds: row.duration_seconds,
      audioUrl: `/api/media/${row.audio_media_id}`,
      ...(row.cover_media_id &&
      row.cover_mime_type &&
      isPublicMediaMime('cover', row.cover_mime_type)
        ? {coverUrl: `/api/media/${row.cover_media_id}`}
        : {}),
      ...(hasValidLyrics(row.lyrics_text)
        ? {lyricsUrl: `/api/library/songs/${encodeURIComponent(row.id)}/lyrics`}
        : {}),
      category,
      tags: tagsBySong.get(row.id) ?? [],
      ...(optionalText(row.version_note)
        ? {versionNote: row.version_note as string}
        : {}),
      ...(optionalText(row.performance_date)
        ? {performanceDate: row.performance_date as string}
        : {}),
      ...(optionalText(row.source_url)
        ? {sourceUrl: row.source_url as string}
        : {}),
      isFeatured: row.is_featured === 1,
      isLiveCover: row.is_live_cover === 1,
      publishedAt: row.published_at,
    };
  });

  return {
    songs,
    categories: [...publicCategories.values()].sort(
      (left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id),
    ),
    tags: [...publicTags.values()],
    sections: {
      recent: songs.slice(0, 6).map(({id}) => id),
      featured: songs.filter(({isFeatured}) => isFeatured).slice(0, 6).map(({id}) => id),
      liveCovers: songs.filter(({isLiveCover}) => isLiveCover).slice(0, 6).map(({id}) => id),
    },
  };
}

function notFound(): ApiErrorBody {
  return {
    error: {
      code: 'NOT_FOUND',
      message: 'The requested resource was not found.',
    },
  };
}

export async function registerPublicLibraryRoutes(
  app: FastifyInstance,
  db: DatabaseSync,
): Promise<void> {
  app.get<{Reply: LibraryResponse}>('/api/library', async () => publicLibrary(db));

  app.get<{
    Params: {songId: string};
    Reply: string | ApiErrorBody;
  }>('/api/library/songs/:songId/lyrics', async (request, reply) => {
    const row = db.prepare(`
      SELECT lyrics_text AS lyricsText
      FROM songs
      WHERE id = ? AND status = 'published'
    `).get(request.params.songId) as {lyricsText: string | null} | undefined;
    if (!row || !hasValidLyrics(row.lyricsText)) {
      return reply.status(404).send(notFound());
    }
    return reply.type('text/plain; charset=utf-8').send(row.lyricsText);
  });
}
