import {cleanup, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import type {AdminSong, SongStatus} from '../../../shared/contracts';
import {adminApi} from '../../api/admin-api';
import {ApiError} from '../../api/http';
import {renderAdmin} from './test/render-admin';

vi.mock('../../api/admin-api', () => ({
  adminApi: {
    getAuthStatus: vi.fn(), logout: vi.fn(), login: vi.fn(), setup: vi.fn(),
    listSongs: vi.fn(), publishSong: vi.fn(), unpublishSong: vi.fn(), trashSong: vi.fn(),
  },
}));

function song(status: SongStatus, id = `song-${status}`): AdminSong {
  return {
    id, title: `${status === 'published' ? '已发布' : status === 'draft' ? '草稿' : '已下架'}歌曲`,
    artist: 'Hanser', status, statusBeforeTrash: null, durationSeconds: 120,
    audio: {id: 'audio-1', originalName: 'song.mp3', mimeType: 'audio/mpeg', byteSize: 10},
    cover: null, lyricsText: '', categoryId: null, tagIds: [], versionNote: '',
    performanceDate: '', sourceUrl: '', isFeatured: false, isLiveCover: false,
    publishedAt: status === 'published' ? '2026-09-03T00:00:00.000Z' : null,
    createdAt: '2026-09-03T00:00:00.000Z', updatedAt: '2026-09-04T00:00:00.000Z',
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(adminApi.getAuthStatus).mockResolvedValue({needsSetup: false, authenticated: true});
  vi.mocked(adminApi.listSongs).mockImplementation(async (status) => [song(status ?? 'draft')]);
  vi.mocked(adminApi.publishSong).mockResolvedValue(song('published'));
  vi.mocked(adminApi.unpublishSong).mockResolvedValue(song('unlisted'));
  vi.mocked(adminApi.trashSong).mockResolvedValue({...song('trashed'), statusBeforeTrash: 'draft'});
});

afterEach(cleanup);

describe('AdminSongListPage', () => {
  it('queries status tabs and exposes only valid lifecycle actions', async () => {
    const user = userEvent.setup();
    renderAdmin('/admin');

    const draftRow = await screen.findByRole('row', {name: /草稿歌曲/});
    expect(within(draftRow).getByRole('link', {name: '编辑'})).toHaveAttribute(
      'href', '/admin/songs/song-draft',
    );
    expect(within(draftRow).getByRole('button', {name: '发布'})).toBeInTheDocument();
    expect(within(draftRow).getByRole('button', {name: '移入回收站'})).toBeInTheDocument();
    expect(within(draftRow).queryByRole('button', {name: '下架'})).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', {name: '已发布'}));
    const publishedRow = await screen.findByRole('row', {name: /已发布歌曲/});
    expect(within(publishedRow).getByRole('button', {name: '下架'})).toBeInTheDocument();
    expect(within(publishedRow).queryByRole('button', {name: '永久删除'})).not.toBeInTheDocument();
    expect(adminApi.listSongs).toHaveBeenLastCalledWith('published', expect.any(AbortSignal));

    await user.click(screen.getByRole('tab', {name: '回收站'}));
    expect(await screen.findByRole('heading', {name: '回收站'})).toBeInTheDocument();
  });

  it('runs lifecycle actions once and refreshes the active list', async () => {
    const user = userEvent.setup();
    renderAdmin('/admin');
    const publish = within(await screen.findByRole('row', {name: /草稿歌曲/}))
      .getByRole('button', {name: '发布'});

    await user.dblClick(publish);

    expect(adminApi.publishSong).toHaveBeenCalledTimes(1);
    expect(adminApi.listSongs).toHaveBeenCalledTimes(2);
    expect(await screen.findByText('歌曲已发布')).toHaveAttribute('role', 'status');
  });

  it('summarizes publishability errors and links them to the affected row', async () => {
    vi.mocked(adminApi.publishSong).mockRejectedValue(new ApiError(
      422,
      'SONG_NOT_PUBLISHABLE',
      '歌曲资料不满足发布要求',
      ['title', 'audio', 'duration', 'lyrics'],
    ));
    const user = userEvent.setup();
    renderAdmin('/admin');
    await user.click(within(await screen.findByRole('row', {name: /草稿歌曲/}))
      .getByRole('button', {name: '发布'}));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('歌名、音频文件、歌曲时长、LRC 歌词');
    expect(screen.getByRole('row', {name: /草稿歌曲/})).toHaveAccessibleDescription(
      /发布前请补充/,
    );
  });

  it('unpublishes before allowing a song to enter trash', async () => {
    const user = userEvent.setup();
    renderAdmin('/admin');
    await user.click(await screen.findByRole('tab', {name: '已发布'}));
    await user.click(within(await screen.findByRole('row', {name: /已发布歌曲/}))
      .getByRole('button', {name: '下架'}));

    expect(adminApi.unpublishSong).toHaveBeenCalledWith('song-published', expect.any(AbortSignal));
    expect(adminApi.trashSong).not.toHaveBeenCalled();
  });
});
