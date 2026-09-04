import type {SongDraftInput} from '../../shared/contracts.js';
import {validateLrc} from '../../shared/lrc.js';
import {
  UploadValidationError,
  validateUpload,
} from '../media/media-validation.js';

const REQUIRED_FIELDS = [
  'title',
  'artist',
  'lyricsText',
  'categoryId',
  'tagIds',
  'versionNote',
  'performanceDate',
  'sourceUrl',
  'isFeatured',
  'isLiveCover',
  'confirmDuplicate',
  'confirmAudioReplacement',
] as const;

const OPTIONAL_FIELDS = ['audioUploadId', 'coverUploadId'] as const;
const ALLOWED_FIELDS = new Set<string>([...REQUIRED_FIELDS, ...OPTIONAL_FIELDS]);

export class SongValidationError extends Error {
  readonly code = 'INVALID_SONG_INPUT';
  readonly statusCode = 400;

  constructor(message: string) {
    super(message);
    this.name = 'SongValidationError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return false;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
}

function validateSourceUrl(value: string): void {
  if (value === '') {
    return;
  }
  if (value.length > 2_048) {
    throw new SongValidationError('来源链接不能超过 2048 个字符');
  }
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new SongValidationError('来源链接必须使用 http 或 https');
    }
  } catch (error) {
    if (error instanceof SongValidationError) {
      throw error;
    }
    throw new SongValidationError('来源链接格式无效');
  }
}

export function validateSongDraftInput(value: unknown): SongDraftInput {
  if (!isRecord(value)) {
    throw new SongValidationError('歌曲草稿必须是 JSON 对象');
  }
  if (Object.keys(value).some((field) => !ALLOWED_FIELDS.has(field))) {
    throw new SongValidationError('歌曲草稿包含未声明字段');
  }
  if (REQUIRED_FIELDS.some((field) => !Object.hasOwn(value, field))) {
    throw new SongValidationError('歌曲草稿字段不完整');
  }

  const stringFields = [
    'title',
    'artist',
    'lyricsText',
    'versionNote',
    'performanceDate',
    'sourceUrl',
  ] as const;
  const booleanFields = [
    'isFeatured',
    'isLiveCover',
    'confirmDuplicate',
    'confirmAudioReplacement',
  ] as const;
  const validStrings = stringFields.every((field) => typeof value[field] === 'string');
  const validBooleans = booleanFields.every((field) => typeof value[field] === 'boolean');
  const validCategory = value.categoryId === null ||
    (typeof value.categoryId === 'string' && value.categoryId.length > 0);
  const validTags = Array.isArray(value.tagIds) &&
    value.tagIds.every((tagId) => typeof tagId === 'string' && tagId.length > 0);
  const validUploads = OPTIONAL_FIELDS.every((field) =>
    !Object.hasOwn(value, field) ||
    (typeof value[field] === 'string' && value[field].length > 0),
  );
  if (!validStrings || !validBooleans || !validCategory || !validTags || !validUploads) {
    throw new SongValidationError('歌曲草稿字段类型无效');
  }

  const performanceDate = (value.performanceDate as string).trim();
  if (performanceDate !== '' && !isValidCalendarDate(performanceDate)) {
    throw new SongValidationError('演唱日期格式无效');
  }
  const sourceUrl = (value.sourceUrl as string).trim();
  validateSourceUrl(sourceUrl);

  return {
    title: (value.title as string).trim(),
    artist: (value.artist as string).trim(),
    ...(value.audioUploadId ? {audioUploadId: value.audioUploadId as string} : {}),
    ...(value.coverUploadId ? {coverUploadId: value.coverUploadId as string} : {}),
    lyricsText: value.lyricsText as string,
    categoryId: value.categoryId as string | null,
    tagIds: [...new Set(value.tagIds as string[])],
    versionNote: value.versionNote as string,
    performanceDate,
    sourceUrl,
    isFeatured: value.isFeatured as boolean,
    isLiveCover: value.isLiveCover as boolean,
    confirmDuplicate: value.confirmDuplicate as boolean,
    confirmAudioReplacement: value.confirmAudioReplacement as boolean,
  };
}

export type PublishableSongInput = {
  title: string;
  artist: string;
  durationSeconds: number | null;
  lyricsText: string;
  audio: {
    originalName: string;
    mimeType: string;
    byteSize: number;
  } | null;
  cover: {
    originalName: string;
    mimeType: string;
    byteSize: number;
  } | null;
};

export function publishabilityIssues(
  song: PublishableSongInput,
  options: {validateAudioType?: boolean; validateCoverType?: boolean} = {},
): string[] {
  const issues: string[] = [];
  if (song.title.trim() === '') {
    issues.push('title');
  }
  if (song.artist.trim() === '') {
    issues.push('artist');
  }
  if (!song.audio) {
    issues.push('audio');
  } else if (options.validateAudioType !== false) {
    try {
      validateUpload('audio', {
        originalName: song.audio.originalName,
        declaredMime: song.audio.mimeType,
        detectedMime: song.audio.mimeType,
        byteSize: song.audio.byteSize,
      });
    } catch (error) {
      if (!(error instanceof UploadValidationError)) {
        throw error;
      }
      issues.push('audio');
    }
  }
  if (!(typeof song.durationSeconds === 'number' &&
    Number.isFinite(song.durationSeconds) && song.durationSeconds > 0)) {
    issues.push('duration');
  }
  if (song.cover && options.validateCoverType !== false) {
    try {
      validateUpload('cover', {
        originalName: song.cover.originalName,
        declaredMime: song.cover.mimeType,
        detectedMime: song.cover.mimeType,
        byteSize: song.cover.byteSize,
      });
    } catch (error) {
      if (!(error instanceof UploadValidationError)) {
        throw error;
      }
      issues.push('cover');
    }
  }
  if (song.lyricsText !== '' && !validateLrc(song.lyricsText).valid) {
    issues.push('lyrics');
  }
  return issues;
}
