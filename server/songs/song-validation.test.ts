import {describe, expect, it} from 'vitest';

import {validateSongDraftInput} from './song-validation.js';

const validInput = {
  title: ' 初光 ',
  artist: ' Hanser ',
  lyricsText: '',
  categoryId: null,
  tagIds: ['tag-1', 'tag-1', 'tag-2'],
  versionNote: '',
  performanceDate: '',
  sourceUrl: '',
  isFeatured: false,
  isLiveCover: false,
  confirmDuplicate: false,
  confirmAudioReplacement: false,
};

describe('song draft validation', () => {
  it('preserves optional empty values while trimming identity fields and deduplicating tags', () => {
    expect(validateSongDraftInput(validInput)).toEqual({
      ...validInput,
      title: '初光',
      artist: 'Hanser',
      tagIds: ['tag-1', 'tag-2'],
    });
  });

  it('allows only upload IDs to be omitted and rejects undeclared fields', () => {
    expect(validateSongDraftInput({...validInput, audioUploadId: 'audio-1'}))
      .toMatchObject({audioUploadId: 'audio-1'});
    expect(() => validateSongDraftInput({title: '未完成'})).toThrowError(
      '歌曲草稿字段不完整',
    );
    expect(() => validateSongDraftInput({...validInput, hidden: true})).toThrowError(
      '歌曲草稿包含未声明字段',
    );
  });

  it('rejects malformed dates, unsafe source URLs and invalid scalar types', () => {
    expect(() => validateSongDraftInput({...validInput, performanceDate: '2026-02-30'}))
      .toThrowError('演唱日期格式无效');
    expect(() => validateSongDraftInput({...validInput, sourceUrl: 'file:///secret'}))
      .toThrowError('来源链接必须使用 http 或 https');
    expect(() => validateSongDraftInput({...validInput, isFeatured: 1}))
      .toThrowError('歌曲草稿字段类型无效');
  });
});
