import {cleanup, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import type {AdminSong} from '../../../shared/contracts';
import {adminApi} from '../../api/admin-api';
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
  vi.clearAllMocks();
  vi.mocked(adminApi.getAuthStatus).mockResolvedValue({needsSetup: false, authenticated: true});
  vi.mocked(adminApi.listSongs).mockResolvedValue([trashed]);
  vi.mocked(adminApi.restoreSong).mockResolvedValue({...trashed, status: 'unlisted', statusBeforeTrash: null});
  vi.mocked(adminApi.permanentlyDeleteSong).mockResolvedValue(undefined);
});

afterEach(cleanup);

describe('TrashPage', () => {
  it('restores a song to its pre-trash state and refreshes the list', async () => {
    const user = userEvent.setup();
    renderAdmin('/admin/trash');
    const row = await screen.findByRole('row', {name: /待删除歌曲/});
    expect(row).toHaveTextContent('恢复为已下架');

    await user.click(within(row).getByRole('button', {name: '恢复'}));
    expect(adminApi.restoreSong).toHaveBeenCalledWith('song-trash-255', expect.any(AbortSignal));
    expect(adminApi.listSongs).toHaveBeenCalledTimes(2);
    expect(await screen.findByText('歌曲已恢复为已下架')).toHaveAttribute('role', 'status');
  });

  it('requires the stable song ID before permanent deletion', async () => {
    const user = userEvent.setup();
    renderAdmin('/admin/trash');
    const row = await screen.findByRole('row', {name: /待删除歌曲/});
    await user.click(within(row).getByRole('button', {name: '永久删除'}));

    const dialog = screen.getByRole('dialog', {name: '永久删除歌曲'});
    expect(dialog).toHaveTextContent('不可恢复');
    const confirmation = within(dialog).getByLabelText('输入歌曲编号 song-trash-255 以确认');
    const button = within(dialog).getByRole('button', {name: '永久删除'});
    expect(button).toBeDisabled();
    await user.type(confirmation, 'wrong');
    expect(button).toBeDisabled();
    await user.clear(confirmation);
    await user.type(confirmation, 'song-trash-255');
    expect(button).toBeEnabled();
    await user.click(button);

    expect(adminApi.permanentlyDeleteSong).toHaveBeenCalledWith(
      'song-trash-255', 'song-trash-255', expect.any(AbortSignal),
    );
    expect(adminApi.listSongs).toHaveBeenCalledTimes(2);
  });
});
