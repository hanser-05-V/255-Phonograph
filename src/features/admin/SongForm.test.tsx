import {act, cleanup, fireEvent, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import type {AdminSong, TaxonomyItem} from '../../../shared/contracts';
import {adminApi} from '../../api/admin-api';
import {ApiError} from '../../api/http';
import {createdXhrs, installFakeXhr} from './test/fake-xhr';
import {renderAdmin} from './test/render-admin';

vi.mock('../../api/admin-api', () => ({
  adminApi: {
    getAuthStatus: vi.fn(), logout: vi.fn(), login: vi.fn(), setup: vi.fn(),
    listCategories: vi.fn(), listTags: vi.fn(), getSong: vi.fn(), saveSong: vi.fn(),
  },
}));

const category: TaxonomyItem = {
  id: 'cat-live', name: '现场',
  createdAt: '2026-09-03T00:00:00.000Z', updatedAt: '2026-09-03T00:00:00.000Z',
};
const tag: TaxonomyItem = {
  id: 'tag-soft', name: '温柔',
  createdAt: '2026-09-03T00:00:00.000Z', updatedAt: '2026-09-03T00:00:00.000Z',
};
const draft: AdminSong = {
  id: 'song-255', title: '初光', artist: 'Hanser', status: 'draft',
  statusBeforeTrash: null, durationSeconds: 125,
  audio: {id: 'audio-1', originalName: 'old.mp3', mimeType: 'audio/mpeg', byteSize: 5},
  cover: null, lyricsText: '', categoryId: null, tagIds: [], versionNote: '',
  performanceDate: '', sourceUrl: '', isFeatured: false, isLiveCover: false,
  publishedAt: null, createdAt: '2026-09-03T00:00:00.000Z',
  updatedAt: '2026-09-03T00:00:00.000Z',
};

let restoreXhr: (() => void) | undefined;

beforeEach(() => {
  vi.clearAllMocks();
  restoreXhr = installFakeXhr();
  vi.mocked(adminApi.getAuthStatus).mockResolvedValue({needsSetup: false, authenticated: true});
  vi.mocked(adminApi.listCategories).mockResolvedValue([category]);
  vi.mocked(adminApi.listTags).mockResolvedValue([tag]);
  vi.mocked(adminApi.getSong).mockResolvedValue(draft);
  vi.mocked(adminApi.saveSong).mockResolvedValue(draft);
});

afterEach(() => {
  cleanup();
  restoreXhr?.();
});

describe('SongForm', () => {
  it('keeps form values when save fails and confirms duplicates', async () => {
    vi.mocked(adminApi.saveSong)
      .mockRejectedValueOnce(new ApiError(
        409, 'DUPLICATE_CONFIRMATION_REQUIRED', '存在同名同歌手歌曲',
      ))
      .mockResolvedValueOnce(draft);
    const user = userEvent.setup();
    renderAdmin('/admin/songs/new');

    await user.type(await screen.findByLabelText('歌名'), '初光');
    await user.type(screen.getByLabelText('歌手'), 'Hanser');
    await user.click(screen.getByRole('button', {name: '保存草稿'}));

    const dialog = await screen.findByRole('dialog', {name: '确认重复歌曲'});
    expect(dialog).toHaveTextContent('存在同名同歌手歌曲');
    expect(screen.getByLabelText('歌名')).toHaveValue('初光');
    await user.click(within(dialog).getByRole('button', {name: '仍然保存'}));
    expect(adminApi.saveSong).toHaveBeenLastCalledWith(
      undefined,
      expect.objectContaining({title: '初光', artist: 'Hanser', confirmDuplicate: true}),
      expect.any(AbortSignal),
    );
    expect(await screen.findByText('草稿已保存')).toHaveAttribute('role', 'status');
    expect(await screen.findByText('稳定歌曲编号：song-255')).toBeInTheDocument();
  });

  it('submits the exact song draft fields with one category and multiple tags', async () => {
    const secondTag = {...tag, id: 'tag-live', name: '直播'};
    vi.mocked(adminApi.listTags).mockResolvedValue([tag, secondTag]);
    const user = userEvent.setup();
    renderAdmin('/admin/songs/new');

    await user.type(await screen.findByLabelText('歌名'), '新歌');
    await user.type(screen.getByLabelText('歌手'), 'Hanser');
    await user.selectOptions(screen.getByLabelText('分类'), 'cat-live');
    await user.click(screen.getByLabelText('标签：温柔'));
    await user.click(screen.getByLabelText('标签：直播'));
    await user.type(screen.getByLabelText('版本说明'), '音乐会版');
    await user.type(screen.getByLabelText('演唱日期'), '2026-09-03');
    await user.type(screen.getByLabelText('来源链接'), 'https://example.com/source');
    await user.click(screen.getByLabelText('加入精选歌曲'));
    await user.click(screen.getByLabelText('加入直播翻唱精选'));
    fireEvent.change(screen.getByLabelText('LRC 歌词'), {
      target: {value: '[00:01.00]第一句'},
    });
    await user.click(screen.getByRole('button', {name: '保存草稿'}));

    expect(adminApi.saveSong).toHaveBeenCalledWith(undefined, {
      title: '新歌', artist: 'Hanser', lyricsText: '[00:01.00]第一句',
      categoryId: 'cat-live', tagIds: ['tag-soft', 'tag-live'],
      versionNote: '音乐会版', performanceDate: '2026-09-03',
      sourceUrl: 'https://example.com/source', isFeatured: true, isLiveCover: true,
      confirmDuplicate: false, confirmAudioReplacement: false,
    }, expect.any(AbortSignal));
  });

  it('requires confirmation before replacing an existing audio upload', async () => {
    vi.mocked(adminApi.saveSong)
      .mockRejectedValueOnce(new ApiError(
        409,
        'AUDIO_REPLACEMENT_CONFIRMATION_REQUIRED',
        '替换音频文件需要额外确认',
      ))
      .mockResolvedValueOnce(draft);
    const user = userEvent.setup();
    renderAdmin('/admin/songs/song-255');

    await screen.findByDisplayValue('初光');
    await user.upload(screen.getByLabelText('音频文件'), new File(['new'], 'new.mp3', {
      type: 'audio/mpeg',
    }));
    act(() => createdXhrs[0].respond(201, {
      uploadId: 'upload-new', originalName: 'new.mp3', mimeType: 'audio/mpeg',
      byteSize: 3, durationSeconds: 150,
    }));
    expect(await screen.findByText('识别时长：2:30')).toBeInTheDocument();
    await user.click(screen.getByRole('button', {name: '保存修改'}));

    const dialog = await screen.findByRole('dialog', {name: '确认替换音频'});
    await user.click(within(dialog).getByRole('button', {name: '确认替换并保存'}));
    expect(adminApi.saveSong).toHaveBeenLastCalledWith(
      'song-255',
      expect.objectContaining({
        audioUploadId: 'upload-new',
        confirmAudioReplacement: true,
      }),
      expect.any(AbortSignal),
    );
    expect(await screen.findByText('修改已保存')).toHaveAttribute('role', 'status');
    await user.click(screen.getByRole('button', {name: '保存修改'}));
    const latestPayload = vi.mocked(adminApi.saveSong).mock.calls.at(-1)?.[1];
    expect(latestPayload).not.toHaveProperty('audioUploadId');
  });

  it('puts LRC upload errors next to the editable lyrics field', async () => {
    const user = userEvent.setup();
    renderAdmin('/admin/songs/new');
    await screen.findByLabelText('LRC 歌词');
    await user.upload(screen.getByLabelText('LRC 文件'), new File(['bad'], 'lyrics.lrc', {
      type: 'text/plain',
    }));
    act(() => createdXhrs[0].respond(200, {
      content: '[00:01.00]第一句\n错误行',
      validation: {valid: false, errors: [{line: 2, message: '歌词行缺少有效时间标签'}]},
    }));

    expect(await screen.findByLabelText('LRC 歌词')).toHaveValue('[00:01.00]第一句\n错误行');
    expect(screen.getByLabelText('LRC 歌词')).toHaveAccessibleDescription(
      '第 2 行：歌词行缺少有效时间标签',
    );
  });

  it('submits an edit only once when the save button is double-clicked', async () => {
    const user = userEvent.setup();
    renderAdmin('/admin/songs/song-255');
    await screen.findByDisplayValue('初光');

    await user.dblClick(screen.getByRole('button', {name: '保存修改'}));

    expect(adminApi.saveSong).toHaveBeenCalledTimes(1);
  });
});
