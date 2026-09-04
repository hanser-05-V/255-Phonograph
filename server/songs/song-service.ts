import {createHash, randomUUID} from 'node:crypto';
import type {DatabaseSync} from 'node:sqlite';

import type {
  AdminMediaSummary,
  AdminSong,
  SongDraftInput,
  SongStatus,
} from '../../shared/contracts.js';
import {withTransaction} from '../db/database.js';
import {CleanupService} from '../media/cleanup-service.js';
import type {MediaStore, StoredMedia} from '../storage/media-store.js';
import {
  publishabilityIssues,
  validateSongDraftInput,
} from './song-validation.js';

type SongRow = {
  id: string;
  title: string;
  artist: string;
  status: SongStatus;
  status_before_trash: 'draft' | 'unlisted' | null;
  duration_seconds: number | null;
  audio_media_id: string | null;
  audio_original_name: string | null;
  audio_mime_type: string | null;
  audio_byte_size: number | null;
  cover_media_id: string | null;
  cover_original_name: string | null;
  cover_mime_type: string | null;
  cover_byte_size: number | null;
  lyrics_text: string | null;
  category_id: string | null;
  version_note: string | null;
  performance_date: string | null;
  source_url: string | null;
  is_featured: number;
  is_live_cover: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

type PendingUploadRow = {
  id: string;
  kind: 'audio' | 'cover';
  temporary_key: string;
  original_name: string;
  mime_type: string;
  byte_size: number;
  duration_seconds: number | null;
};

type PromotedUpload = PendingUploadRow & StoredMedia & {mediaId: string};
type RequestedUploads = {audio?: PendingUploadRow; cover?: PendingUploadRow};

export type SongServiceDependencies = {
  now: () => Date;
  generateId: () => string;
};

const defaultDependencies: SongServiceDependencies = {
  now: () => new Date(),
  generateId: randomUUID,
};

const SONG_SELECT = `
  SELECT
    s.*,
    audio.original_name AS audio_original_name,
    audio.mime_type AS audio_mime_type,
    audio.byte_size AS audio_byte_size,
    cover.original_name AS cover_original_name,
    cover.mime_type AS cover_mime_type,
    cover.byte_size AS cover_byte_size
  FROM songs s
  LEFT JOIN media_objects audio ON audio.id = s.audio_media_id
  LEFT JOIN media_objects cover ON cover.id = s.cover_media_id
`;

function sessionDigest(token: string): string {
  return createHash('sha256').update(token).digest('base64url');
}

function mediaSummary(
  id: string | null,
  originalName: string | null,
  mimeType: string | null,
  byteSize: number | null,
): AdminMediaSummary | null {
  if (id === null || originalName === null || mimeType === null || byteSize === null) {
    return null;
  }
  return {id, originalName, mimeType, byteSize};
}

export class SongError extends Error {
  constructor(
    readonly code:
      | 'NOT_FOUND'
      | 'DUPLICATE_CONFIRMATION_REQUIRED'
      | 'AUDIO_REPLACEMENT_CONFIRMATION_REQUIRED'
      | 'INVALID_SONG_TAXONOMY'
      | 'PENDING_UPLOAD_NOT_FOUND'
      | 'SONG_CONCURRENT_MODIFICATION'
      | 'SONG_NOT_PUBLISHABLE'
      | 'INVALID_SONG_TRANSITION'
      | 'PERMANENT_DELETE_CONFIRMATION_REQUIRED',
    message: string,
    readonly statusCode: 404 | 409 | 422,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'SongError';
  }
}

export class SongService {
  readonly #dependencies: SongServiceDependencies;
  readonly #cleanupService: CleanupService;

  constructor(
    private readonly db: DatabaseSync,
    private readonly mediaStore: MediaStore,
    dependencies: Partial<SongServiceDependencies> = {},
  ) {
    this.#dependencies = {...defaultDependencies, ...dependencies};
    this.#cleanupService = new CleanupService(db, mediaStore, this.#dependencies);
  }

  listAdmin(status?: SongStatus): AdminSong[] {
    const rows = status
      ? this.db.prepare(`${SONG_SELECT} WHERE s.status = ? ORDER BY s.updated_at DESC, s.id`).all(status)
      : this.db.prepare(`${SONG_SELECT} ORDER BY s.updated_at DESC, s.id`).all();
    return (rows as SongRow[]).map((row) => this.#toAdminSong(row));
  }

  async getAdmin(id: string): Promise<AdminSong> {
    return this.#toAdminSong(this.#getRow(id));
  }

  async createDraft(sessionToken: string, rawInput: SongDraftInput): Promise<AdminSong> {
    const input = validateSongDraftInput(rawInput);
    this.#assertTaxonomy(input);
    this.#assertDuplicate(input, '');
    const requested = this.#requestedUploads(sessionToken, input);
    const promoted = await this.#promoteUploads(requested);
    const timestamp = this.#dependencies.now().toISOString();
    const songId = this.#dependencies.generateId();

    try {
      withTransaction(this.db, () => {
        this.#consumeAndInsertMedia(sessionToken, promoted, timestamp);
        this.db.prepare(`
          INSERT INTO songs (
            id, title, artist, status, duration_seconds, audio_media_id,
            cover_media_id, lyrics_text, category_id, version_note,
            performance_date, source_url, is_featured, is_live_cover,
            created_at, updated_at
          ) VALUES (?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          songId,
          input.title,
          input.artist,
          promoted.audio?.duration_seconds ?? null,
          promoted.audio?.mediaId ?? null,
          promoted.cover?.mediaId ?? null,
          input.lyricsText,
          input.categoryId,
          input.versionNote,
          input.performanceDate,
          input.sourceUrl,
          Number(input.isFeatured),
          Number(input.isLiveCover),
          timestamp,
          timestamp,
        );
        this.#replaceTags(songId, input.tagIds);
      });
    } catch (error) {
      await this.#compensatePromotions(promoted, 'song-save-rollback');
      throw error;
    }

    return this.getAdmin(songId);
  }

  async update(
    sessionToken: string,
    id: string,
    rawInput: SongDraftInput,
  ): Promise<AdminSong> {
    const input = validateSongDraftInput(rawInput);
    const current = this.#getRow(id);
    if (current.status === 'trashed') {
      this.#invalidTransition(current.status, 'edit');
    }
    this.#assertTaxonomy(input);
    this.#assertDuplicate(input, id);
    if (input.audioUploadId && current.audio_media_id && !input.confirmAudioReplacement) {
      throw new SongError(
        'AUDIO_REPLACEMENT_CONFIRMATION_REQUIRED',
        '替换音频文件需要额外确认',
        409,
      );
    }
    const requested = this.#requestedUploads(sessionToken, input);
    if (current.status === 'published') {
      this.#assertPublishedUpdate(current, input, requested);
    }
    const promoted = await this.#promoteUploads(requested);
    const timestamp = this.#dependencies.now().toISOString();
    const cleanupIds: string[] = [];

    try {
      withTransaction(this.db, () => {
        this.#consumeAndInsertMedia(sessionToken, promoted, timestamp);
        const update = this.db.prepare(`
          UPDATE songs
          SET title = ?, artist = ?, duration_seconds = ?, audio_media_id = ?,
              cover_media_id = ?, lyrics_text = ?, category_id = ?,
              version_note = ?, performance_date = ?, source_url = ?,
              is_featured = ?, is_live_cover = ?, updated_at = ?
          WHERE id = ?
            AND status = ?
            AND audio_media_id IS ?
            AND cover_media_id IS ?
        `).run(
          input.title,
          input.artist,
          promoted.audio
            ? promoted.audio.duration_seconds
            : current.duration_seconds,
          promoted.audio?.mediaId ?? current.audio_media_id,
          promoted.cover?.mediaId ?? current.cover_media_id,
          input.lyricsText,
          input.categoryId,
          input.versionNote,
          input.performanceDate,
          input.sourceUrl,
          Number(input.isFeatured),
          Number(input.isLiveCover),
          timestamp,
          id,
          current.status,
          current.audio_media_id,
          current.cover_media_id,
        );
        if (update.changes !== 1) {
          throw new SongError(
            'SONG_CONCURRENT_MODIFICATION',
            '歌曲已被其他操作修改，请刷新后重试',
            409,
          );
        }
        this.#replaceTags(id, input.tagIds);
        if (promoted.audio && current.audio_media_id) {
          cleanupIds.push(...this.#queueDetachedMedia(
            current.audio_media_id,
            'song-audio-replacement',
          ));
        }
        if (promoted.cover && current.cover_media_id) {
          cleanupIds.push(...this.#queueDetachedMedia(
            current.cover_media_id,
            'song-cover-replacement',
          ));
        }
      });
    } catch (error) {
      await this.#compensatePromotions(promoted, 'song-update-rollback');
      throw error;
    }

    await this.#cleanupService.drain(cleanupIds);
    return this.getAdmin(id);
  }

  async publish(id: string): Promise<AdminSong> {
    const current = this.#getRow(id);
    if (current.status !== 'draft' && current.status !== 'unlisted') {
      this.#invalidTransition(current.status, 'publish');
    }
    const song = this.#toAdminSong(current);
    const issues = publishabilityIssues(song);
    if (issues.length > 0) {
      throw new SongError(
        'SONG_NOT_PUBLISHABLE',
        '歌曲资料不满足发布要求',
        422,
        issues,
      );
    }
    const timestamp = this.#dependencies.now().toISOString();
    this.db.prepare(`
      UPDATE songs
      SET status = 'published', status_before_trash = NULL,
          published_at = ?, updated_at = ?
      WHERE id = ?
    `).run(timestamp, timestamp, id);
    return this.getAdmin(id);
  }

  async unpublish(id: string): Promise<AdminSong> {
    return this.#transition(id, ['published'], 'unlisted', null);
  }

  async moveToTrash(id: string): Promise<AdminSong> {
    const current = this.#getRow(id);
    if (current.status !== 'draft' && current.status !== 'unlisted') {
      this.#invalidTransition(current.status, 'trash');
    }
    return this.#transition(id, [current.status], 'trashed', current.status);
  }

  async restore(id: string): Promise<AdminSong> {
    const current = this.#getRow(id);
    if (current.status !== 'trashed' || current.status_before_trash === null) {
      this.#invalidTransition(current.status, 'restore');
    }
    return this.#transition(
      id,
      ['trashed'],
      current.status_before_trash,
      null,
    );
  }

  async permanentlyDelete(
    id: string,
    confirmation: {confirmSongId?: string},
  ): Promise<void> {
    const current = this.#getRow(id);
    if (current.status !== 'trashed') {
      this.#invalidTransition(current.status, 'permanently-delete');
    }
    if (confirmation.confirmSongId !== id) {
      throw new SongError(
        'PERMANENT_DELETE_CONFIRMATION_REQUIRED',
        '永久删除需要输入正确的歌曲编号',
        409,
      );
    }
    const cleanupIds: string[] = [];
    withTransaction(this.db, () => {
      const mediaIds = [current.audio_media_id, current.cover_media_id]
        .filter((mediaId): mediaId is string => mediaId !== null);
      for (const mediaId of mediaIds) {
        cleanupIds.push(...this.#queueDetachedMedia(
          mediaId,
          'song-permanent-delete',
          false,
        ));
      }
      this.db.prepare('DELETE FROM songs WHERE id = ?').run(id);
      for (const mediaId of mediaIds) {
        this.db.prepare('DELETE FROM media_objects WHERE id = ?').run(mediaId);
      }
    });
    await this.#cleanupService.drain(cleanupIds);
  }

  #getRow(id: string): SongRow {
    const row = this.db.prepare(`${SONG_SELECT} WHERE s.id = ?`).get(id) as
      | SongRow
      | undefined;
    if (!row) {
      throw new SongError('NOT_FOUND', '歌曲不存在', 404);
    }
    return row;
  }

  #toAdminSong(row: SongRow): AdminSong {
    const tagIds = (this.db.prepare(`
      SELECT st.tag_id AS tagId
      FROM song_tags st
      JOIN tags t ON t.id = st.tag_id
      WHERE st.song_id = ?
      ORDER BY t.normalized_name, t.id
    `).all(row.id) as Array<{tagId: string}>).map(({tagId}) => tagId);
    return {
      id: row.id,
      title: row.title,
      artist: row.artist,
      status: row.status,
      statusBeforeTrash: row.status_before_trash,
      durationSeconds: row.duration_seconds,
      audio: mediaSummary(
        row.audio_media_id,
        row.audio_original_name,
        row.audio_mime_type,
        row.audio_byte_size,
      ),
      cover: mediaSummary(
        row.cover_media_id,
        row.cover_original_name,
        row.cover_mime_type,
        row.cover_byte_size,
      ),
      lyricsText: row.lyrics_text ?? '',
      categoryId: row.category_id,
      tagIds,
      versionNote: row.version_note ?? '',
      performanceDate: row.performance_date ?? '',
      sourceUrl: row.source_url ?? '',
      isFeatured: row.is_featured === 1,
      isLiveCover: row.is_live_cover === 1,
      publishedAt: row.published_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  #assertTaxonomy(input: SongDraftInput): void {
    if (input.categoryId &&
      !this.db.prepare('SELECT 1 FROM categories WHERE id = ?').get(input.categoryId)) {
      throw new SongError('INVALID_SONG_TAXONOMY', '歌曲分类不存在', 422);
    }
    for (const tagId of input.tagIds) {
      if (!this.db.prepare('SELECT 1 FROM tags WHERE id = ?').get(tagId)) {
        throw new SongError('INVALID_SONG_TAXONOMY', '歌曲标签不存在', 422);
      }
    }
  }

  #assertDuplicate(input: SongDraftInput, ownId: string): void {
    if (input.title === '' || input.artist === '' || input.confirmDuplicate) {
      return;
    }
    const duplicate = this.db.prepare(`
      SELECT id
      FROM songs
      WHERE title = ? AND artist = ? AND id <> ?
      LIMIT 1
    `).get(input.title, input.artist, ownId) as {id: string} | undefined;
    if (duplicate) {
      throw new SongError(
        'DUPLICATE_CONFIRMATION_REQUIRED',
        '存在同名同歌手歌曲，需要确认后保存',
        409,
        {duplicateSongId: duplicate.id},
      );
    }
  }

  #pendingUpload(
    sessionToken: string,
    uploadId: string,
    expectedKind: 'audio' | 'cover',
  ): PendingUploadRow {
    const row = this.db.prepare(`
      SELECT id, kind, temporary_key, original_name, mime_type,
             byte_size, duration_seconds
      FROM pending_uploads
      WHERE id = ? AND owner_session_digest = ? AND kind = ?
    `).get(uploadId, sessionDigest(sessionToken), expectedKind) as
      | PendingUploadRow
      | undefined;
    if (!row) {
      throw new SongError(
        'PENDING_UPLOAD_NOT_FOUND',
        '待处理上传不存在或不属于当前会话',
        404,
      );
    }
    return row;
  }

  #requestedUploads(
    sessionToken: string,
    input: SongDraftInput,
  ): RequestedUploads {
    return {
      ...(input.audioUploadId
        ? {audio: this.#pendingUpload(sessionToken, input.audioUploadId, 'audio')}
        : {}),
      ...(input.coverUploadId
        ? {cover: this.#pendingUpload(sessionToken, input.coverUploadId, 'cover')}
        : {}),
    };
  }

  #assertPublishedUpdate(
    current: SongRow,
    input: SongDraftInput,
    requested: RequestedUploads,
  ): void {
    const currentSong = this.#toAdminSong(current);
    const audio = requested.audio
      ? {
          originalName: requested.audio.original_name,
          mimeType: requested.audio.mime_type,
          byteSize: requested.audio.byte_size,
        }
      : currentSong.audio;
    const cover = requested.cover
      ? {
          originalName: requested.cover.original_name,
          mimeType: requested.cover.mime_type,
          byteSize: requested.cover.byte_size,
        }
      : currentSong.cover;
    const issues = publishabilityIssues(
      {
        title: input.title,
        artist: input.artist,
        durationSeconds: requested.audio
          ? requested.audio.duration_seconds
          : current.duration_seconds,
        lyricsText: input.lyricsText,
        audio,
        cover,
      },
      {
        validateAudioType: requested.audio !== undefined,
        validateCoverType: requested.cover !== undefined,
      },
    );
    if (issues.length > 0) {
      throw new SongError(
        'SONG_NOT_PUBLISHABLE',
        '已发布歌曲的修改不满足发布要求',
        422,
        issues,
      );
    }
  }

  async #promoteUploads(
    requested: RequestedUploads,
  ): Promise<{audio?: PromotedUpload; cover?: PromotedUpload}> {
    const promoted: {audio?: PromotedUpload; cover?: PromotedUpload} = {};
    try {
      if (requested.audio) {
        const pending = requested.audio;
        promoted.audio = {
          ...pending,
          ...(await this.mediaStore.promote(pending.temporary_key)),
          mediaId: this.#dependencies.generateId(),
        };
      }
      if (requested.cover) {
        const pending = requested.cover;
        promoted.cover = {
          ...pending,
          ...(await this.mediaStore.promote(pending.temporary_key)),
          mediaId: this.#dependencies.generateId(),
        };
      }
      return promoted;
    } catch (error) {
      await this.#compensatePromotions(promoted, 'song-promotion-rollback');
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        throw new SongError(
          'PENDING_UPLOAD_NOT_FOUND',
          '待处理上传已被使用或文件不存在',
          404,
        );
      }
      throw error;
    }
  }

  #consumeAndInsertMedia(
    sessionToken: string,
    promoted: {audio?: PromotedUpload; cover?: PromotedUpload},
    timestamp: string,
  ): void {
    for (const media of [promoted.audio, promoted.cover]) {
      if (!media) {
        continue;
      }
      const consumed = this.db.prepare(`
        DELETE FROM pending_uploads
        WHERE id = ? AND owner_session_digest = ? AND temporary_key = ?
      `).run(media.id, sessionDigest(sessionToken), media.temporary_key);
      if (consumed.changes !== 1) {
        throw new SongError(
          'PENDING_UPLOAD_NOT_FOUND',
          '待处理上传已被使用',
          404,
        );
      }
      this.db.prepare(`
        INSERT INTO media_objects (
          id, kind, storage_key, original_name, mime_type, byte_size, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        media.mediaId,
        media.kind,
        media.storageKey,
        media.original_name,
        media.mime_type,
        media.byteSize,
        timestamp,
      );
    }
  }

  #replaceTags(songId: string, tagIds: readonly string[]): void {
    this.db.prepare('DELETE FROM song_tags WHERE song_id = ?').run(songId);
    const insert = this.db.prepare(
      'INSERT INTO song_tags (song_id, tag_id) VALUES (?, ?)',
    );
    for (const tagId of tagIds) {
      insert.run(songId, tagId);
    }
  }

  #queueDetachedMedia(
    mediaId: string,
    reason: string,
    deleteMediaRow = true,
  ): string[] {
    const row = this.db.prepare(`
      SELECT storage_key AS storageKey
      FROM media_objects
      WHERE id = ?
    `).get(mediaId) as {storageKey: string} | undefined;
    if (!row) {
      return [];
    }
    const cleanupId = this.#cleanupService.queue(row.storageKey, reason);
    if (deleteMediaRow) {
      this.db.prepare('DELETE FROM media_objects WHERE id = ?').run(mediaId);
    }
    return [cleanupId];
  }

  async #compensatePromotions(
    promoted: {audio?: PromotedUpload; cover?: PromotedUpload},
    reason: string,
  ): Promise<void> {
    for (const media of [promoted.audio, promoted.cover]) {
      if (!media) {
        continue;
      }
      try {
        await this.mediaStore.delete(media.storageKey);
      } catch {
        this.#cleanupService.queue(media.storageKey, reason);
      }
      this.db.prepare('DELETE FROM pending_uploads WHERE id = ?').run(media.id);
    }
  }

  async #transition(
    id: string,
    allowed: readonly SongStatus[],
    status: SongStatus,
    statusBeforeTrash: 'draft' | 'unlisted' | null,
  ): Promise<AdminSong> {
    const current = this.#getRow(id);
    if (!allowed.includes(current.status)) {
      this.#invalidTransition(current.status, status);
    }
    this.db.prepare(`
      UPDATE songs
      SET status = ?, status_before_trash = ?, updated_at = ?
      WHERE id = ?
    `).run(status, statusBeforeTrash, this.#dependencies.now().toISOString(), id);
    return this.getAdmin(id);
  }

  #invalidTransition(status: SongStatus, action: string): never {
    throw new SongError(
      'INVALID_SONG_TRANSITION',
      `歌曲状态 ${status} 不允许执行 ${action}`,
      409,
    );
  }
}
