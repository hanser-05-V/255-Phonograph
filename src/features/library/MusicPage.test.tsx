import {cleanup, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {
  allPublishedIds,
  libraryFixture,
} from './test/library-fixtures';
import {player, renderPublic} from './test/render-public';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('MusicPage', () => {
  it('plays inside the current result set and restores the full queue after reset', async () => {
    const user = userEvent.setup();
    renderPublic('/music', libraryFixture);

    await user.type(screen.getByLabelText('按歌名搜索'), '星球');
    await user.selectOptions(screen.getByLabelText('分类'), 'live');
    await user.click(screen.getByRole('button', {name: '播放 等火山喷发的小星球'}));
    expect(player.playTrack).toHaveBeenCalledWith('volcano-planet', ['volcano-planet']);

    await user.click(screen.getByRole('button', {name: '清除筛选'}));
    await user.click(screen.getByRole('button', {name: '播放 初光'}));
    expect(player.playTrack).toHaveBeenLastCalledWith('first-light', allPublishedIds);
  });

  it('distinguishes a valid empty search result from an empty library', async () => {
    const user = userEvent.setup();
    const view = renderPublic('/music', libraryFixture);

    await user.type(screen.getByLabelText('按歌名搜索'), '不存在');
    expect(screen.getByRole('status')).toHaveTextContent('没有符合条件的歌曲');
    expect(screen.queryByText('曲库还是空的')).not.toBeInTheDocument();

    view.unmount();
    renderPublic('/music', {...libraryFixture, songs: []});
    expect(screen.getByRole('status')).toHaveTextContent('曲库还是空的');
    expect(screen.queryByText('没有符合条件的歌曲')).not.toBeInTheDocument();
  });

  it('reads the initial title query from the URL and updates it with replace navigation', async () => {
    const user = userEvent.setup();
    renderPublic('/music?q=%E5%88%9D%E5%85%89', libraryFixture);

    const search = screen.getByLabelText('按歌名搜索');
    expect(search).toHaveValue('初光');
    expect(screen.getByRole('button', {name: '播放 初光'})).toBeInTheDocument();
    expect(screen.queryByRole('button', {name: '播放 夜行'})).not.toBeInTheDocument();

    await user.clear(search);
    expect(screen.getByRole('button', {name: '播放 夜行'})).toBeInTheDocument();
  });

  it('supports a single category, a single tag, and their intersection', async () => {
    const user = userEvent.setup();
    renderPublic('/music', libraryFixture);

    await user.selectOptions(screen.getByLabelText('分类'), 'live');
    expect(screen.queryByRole('button', {name: '播放 初光'})).not.toBeInTheDocument();
    expect(screen.getByRole('button', {name: '播放 等火山喷发的小星球'})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: '播放 夜行'})).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('标签'), 'gentle');
    expect(screen.queryByRole('button', {name: '播放 等火山喷发的小星球'})).not.toBeInTheDocument();
    expect(screen.getByRole('button', {name: '播放 夜行'})).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('分类'), '');
    expect(screen.getByRole('button', {name: '播放 初光'})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: '播放 夜行'})).toBeInTheDocument();

    await user.click(screen.getByRole('button', {name: '清除筛选'}));
    expect(screen.getByLabelText('标签')).toHaveValue('');
  });
});
