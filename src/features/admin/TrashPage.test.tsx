import {act, cleanup, screen, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import type {AdminSong} from '../../../shared/contracts';
import {adminApi} from '../../api/admin-api';
import {ApiError} from '../../api/http';
import {renderAdmin} from './test/render-admin';

vi.mock('../../api/admin-api', () => ({
  adminApi: {
    getAuthStatus: vi.fn(), logout: vi.fn(), login: vi.fn(), setup: vi.fn(),
    listSongs: vi.fn(), restoreSong: vi.fn(), permanentlyDeleteSong: vi.fn(),
  },
}));

const trashed: AdminSong = {
  id: 'song-trash-255', title: '待删除歌曲', artist: 'Hanser', status: 'trashed',
  statusBeforeTrash: 'unlisted', durationSeconds: 100,
  audio: {id: 'audio-1', originalName: 'song.mp3', mimeType: 'audio/mpeg', byteSize: 1},
  cover: null, lyricsText: '', categoryId: null, tagIds: [], versionNote: '',
  performanceDate: '', sourceUrl: '', isFeatured: false, isLiveCover: false,
  publishedAt: null, createdAt: '2026-09-03T00:00:00.000Z',
  updatedAt: '2026-09-04T00:00:00.000Z',
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(adminApi.getAuthStatus).mockResolvedValue({needsSetup: false, authenticated: true});
  vi.mocked(adminApi.listSongs).mockResolvedValue([trashed]);
  vi.mocked(adminApi.restoreSong).mockResolvedValue({...trashed, status: 'unlisted', statusBeforeTrash: null});
  vi.mocked(adminApi.permanentlyDeleteSong).mockResolvedValue(undefined);
});

afterEach(cleanup);

describe('TrashPage', () => {
  it.each([
    {previousStatus: 'unlisted' as const, label: '已下架'},
    {previousStatus: 'draft' as const, label: '草稿'},
  ])('restores a song to $previousStatus and refreshes the list', async ({previousStatus, label}) => {
    const user = userEvent.setup();
    vi.mocked(adminApi.listSongs)
      .mockResolvedValueOnce([{...trashed, statusBeforeTrash: previousStatus}])
      .mockResolvedValueOnce([]);
    vi.mocked(adminApi.restoreSong).mockResolvedValue({...trashed, status: previousStatus, statusBeforeTrash: null});
    renderAdmin('/admin/trash');
    const row = await screen.findByRole('row', {name: /待删除歌曲/});
    expect(row).toHaveTextContent(`恢复为${label}`);

    await user.click(within(row).getByRole('button', {name: '恢复'}));
    expect(adminApi.restoreSong).toHaveBeenCalledWith('song-trash-255', expect.any(AbortSignal));
    expect(adminApi.listSongs).toHaveBeenCalledTimes(2);
    expect(await screen.findByText(`歌曲已恢复为${label}`)).toHaveAttribute('role', 'status');
    expect(await screen.findByText('回收站为空')).toBeInTheDocument();
    expect(screen.queryByRole('row', {name: /待删除歌曲/})).not.toBeInTheDocument();
    expect(adminApi.permanentlyDeleteSong).not.toHaveBeenCalled();
  });

  it('permanently deletes only the clicked song without a dialog or ID input', async () => {
    const user = userEvent.setup();
    const remaining: AdminSong = {...trashed, id: 'song-keep-256', title: '保留歌曲'};
    vi.mocked(adminApi.listSongs)
      .mockResolvedValueOnce([remaining, trashed])
      .mockResolvedValueOnce([remaining]);
    renderAdmin('/admin/trash');
    const row = await screen.findByRole('row', {name: /待删除歌曲/});
    expect(adminApi.permanentlyDeleteSong).not.toHaveBeenCalled();
    await user.click(within(row).getByRole('button', {name: '永久删除'}));

    expect(adminApi.permanentlyDeleteSong).toHaveBeenCalledWith(
      'song-trash-255', 'song-trash-255', expect.any(AbortSignal),
    );
    expect(adminApi.permanentlyDeleteSong).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByText(/删除后不可恢复/)).toBeInTheDocument();
    expect(await screen.findByText('歌曲已永久删除')).toHaveAttribute('role', 'status');
    await waitFor(() => expect(screen.queryByRole('row', {name: /待删除歌曲/})).not.toBeInTheDocument());
    expect(screen.getByRole('row', {name: /保留歌曲/})).toBeInTheDocument();
    expect(adminApi.listSongs).toHaveBeenCalledTimes(2);
    expect(adminApi.restoreSong).not.toHaveBeenCalled();
  });

  it('disables row actions and prevents repeat deletion while a request is pending', async () => {
    const user = userEvent.setup();
    let finishDelete!: () => void;
    const deletion = new Promise<void>((resolve) => { finishDelete = resolve; });
    vi.mocked(adminApi.permanentlyDeleteSong).mockReturnValueOnce(deletion);
    vi.mocked(adminApi.listSongs).mockResolvedValueOnce([trashed]).mockResolvedValueOnce([]);
    renderAdmin('/admin/trash');
    const row = await screen.findByRole('row', {name: /待删除歌曲/});
    const deleteButton = within(row).getByRole('button', {name: '永久删除'});
    const restoreButton = within(row).getByRole('button', {name: '恢复'});

    try {
      await user.dblClick(deleteButton);
      expect(deleteButton).toBeDisabled();
      expect(restoreButton).toBeDisabled();
      await user.click(restoreButton);
      expect(adminApi.permanentlyDeleteSong).toHaveBeenCalledTimes(1);
      expect(adminApi.restoreSong).not.toHaveBeenCalled();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    } finally {
      await act(async () => { finishDelete(); });
    }

    expect(await screen.findByText('回收站为空')).toBeInTheDocument();
    expect(screen.getByText('歌曲已永久删除')).toHaveAttribute('role', 'status');
  });

  it.each([
    {error: new ApiError(503, 'SERVICE_UNAVAILABLE', '本地服务未运行'), message: '本地服务未运行'},
    {error: new Error('network failure'), message: '操作失败，请重试'},
  ])('keeps the song and allows retry after $message', async ({error, message}) => {
    const user = userEvent.setup();
    vi.mocked(adminApi.permanentlyDeleteSong).mockRejectedValueOnce(error);
    vi.mocked(adminApi.listSongs).mockResolvedValueOnce([trashed]).mockResolvedValueOnce([]);
    renderAdmin('/admin/trash');
    const row = await screen.findByRole('row', {name: /待删除歌曲/});
    const deleteButton = within(row).getByRole('button', {name: '永久删除'});
    await user.click(deleteButton);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(message);
    await waitFor(() => expect(alert).toHaveFocus());
    expect(row).toBeInTheDocument();
    expect(deleteButton).toBeEnabled();
    expect(within(row).getByRole('button', {name: '恢复'})).toBeEnabled();
    expect(screen.queryByText('歌曲已永久删除')).not.toBeInTheDocument();
    expect(adminApi.listSongs).toHaveBeenCalledTimes(1);

    await user.click(deleteButton);
    expect(await screen.findByText('回收站为空')).toBeInTheDocument();
    expect(screen.getByText('歌曲已永久删除')).toHaveAttribute('role', 'status');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(adminApi.permanentlyDeleteSong).toHaveBeenCalledTimes(2);
    expect(adminApi.listSongs).toHaveBeenCalledTimes(2);
  });
});
