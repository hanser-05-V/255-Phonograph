import {cleanup, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {adminApi} from '../../api/admin-api';
import {ApiError} from '../../api/http';
import {renderAdmin} from './test/render-admin';

vi.mock('../../api/admin-api', () => ({
  adminApi: {
    changePassword: vi.fn(),
    createCategory: vi.fn(),
    createTag: vi.fn(),
    deleteCategory: vi.fn(),
    deleteTag: vi.fn(),
    getAuthStatus: vi.fn(),
    getSettings: vi.fn(),
    listCategories: vi.fn(),
    listTags: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    renameCategory: vi.fn(),
    renameTag: vi.fn(),
    setup: vi.fn(),
  },
}));

const category = {
  id: 'cat-1',
  name: '现场',
  createdAt: '2026-09-03T00:00:00.000Z',
  updatedAt: '2026-09-03T00:00:00.000Z',
};
const tag = {
  id: 'tag-1',
  name: '温柔',
  createdAt: '2026-09-03T00:00:00.000Z',
  updatedAt: '2026-09-03T00:00:00.000Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(adminApi.getAuthStatus).mockResolvedValue({
    needsSetup: false,
    authenticated: true,
  });
  vi.mocked(adminApi.listCategories).mockResolvedValue([category]);
  vi.mocked(adminApi.listTags).mockResolvedValue([tag]);
  vi.mocked(adminApi.createCategory).mockResolvedValue({
    ...category,
    id: 'cat-2',
    name: '直播翻唱',
  });
  vi.mocked(adminApi.createTag).mockResolvedValue({...tag, id: 'tag-2'});
  vi.mocked(adminApi.renameCategory).mockResolvedValue({...category, name: '音乐会'});
  vi.mocked(adminApi.renameTag).mockResolvedValue({...tag, name: '治愈'});
  vi.mocked(adminApi.deleteCategory).mockResolvedValue(undefined);
  vi.mocked(adminApi.deleteTag).mockResolvedValue(undefined);
});

afterEach(cleanup);

describe('TaxonomyPage', () => {
  it('creates, renames and deletes taxonomy through named API methods', async () => {
    const user = userEvent.setup();
    renderAdmin('/admin/taxonomy');

    await user.type(await screen.findByLabelText('新分类名称'), '直播翻唱');
    await user.click(screen.getByRole('button', {name: '创建分类'}));
    expect(adminApi.createCategory).toHaveBeenCalledWith(
      {name: '直播翻唱'},
      expect.any(AbortSignal),
    );
    expect(adminApi.listCategories).toHaveBeenCalledTimes(2);

    await user.click(screen.getByRole('button', {name: '重命名分类：现场'}));
    const renameInput = screen.getByLabelText('分类名称：现场');
    await user.clear(renameInput);
    await user.type(renameInput, '音乐会');
    await user.click(screen.getByRole('button', {name: '保存分类名称'}));
    expect(adminApi.renameCategory).toHaveBeenCalledWith(
      'cat-1',
      {name: '音乐会'},
      expect.any(AbortSignal),
    );

    const deleteButton = screen.getByRole('button', {name: '删除标签：温柔'});
    await user.click(deleteButton);
    const dialog = screen.getByRole('dialog', {name: '确认删除标签'});
    expect(dialog).toHaveTextContent('标签关系会从歌曲移除，但不会删除歌曲');
    await user.click(screen.getByRole('button', {name: '确认删除标签'}));
    expect(adminApi.deleteTag).toHaveBeenCalledWith('tag-1', expect.any(AbortSignal));
    expect(adminApi.listTags).toHaveBeenCalledTimes(2);
    expect(await screen.findByText('标签已删除')).toHaveAttribute('role', 'status');
  });

  it('shows conflict errors without clearing the submitted field', async () => {
    vi.mocked(adminApi.createTag).mockRejectedValue(
      new ApiError(409, 'TAXONOMY_NAME_CONFLICT', '标签名称已存在'),
    );
    const user = userEvent.setup();
    renderAdmin('/admin/taxonomy');

    const input = await screen.findByLabelText('新标签名称');
    await user.type(input, '温柔');
    await user.click(screen.getByRole('button', {name: '创建标签'}));

    expect(await screen.findByRole('alert')).toHaveTextContent('标签名称已存在');
    expect(input).toHaveValue('温柔');
    expect(input).toHaveAttribute('aria-describedby');
    expect(screen.getByRole('button', {name: '创建标签'})).toBeEnabled();
  });

  it('traps focus inside deletion confirmation and returns it on cancel', async () => {
    const showModal = vi.fn(function showModal(this: HTMLDialogElement) {
      this.setAttribute('open', '');
    });
    const close = vi.fn(function close(this: HTMLDialogElement) {
      this.removeAttribute('open');
    });
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true,
      value: showModal,
    });
    Object.defineProperty(HTMLDialogElement.prototype, 'close', {
      configurable: true,
      value: close,
    });
    const user = userEvent.setup();
    renderAdmin('/admin/taxonomy');

    const trigger = await screen.findByRole('button', {name: '删除分类：现场'});
    await user.click(trigger);
    const cancel = screen.getByRole('button', {name: '取消'});
    const confirm = screen.getByRole('button', {name: '确认删除分类'});
    expect(showModal).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(cancel).toHaveFocus());

    await user.tab({shift: true});
    expect(confirm).toHaveFocus();
    await user.tab();
    expect(cancel).toHaveFocus();
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('aborts a pending taxonomy mutation when the page unmounts', async () => {
    let mutationSignal: AbortSignal | undefined;
    vi.mocked(adminApi.createCategory).mockImplementation((_input, signal) => {
      mutationSignal = signal;
      return new Promise(() => undefined);
    });
    const user = userEvent.setup();
    const view = renderAdmin('/admin/taxonomy');

    await user.type(await screen.findByLabelText('新分类名称'), '直播翻唱');
    await user.click(screen.getByRole('button', {name: '创建分类'}));
    expect(adminApi.createCategory).toHaveBeenCalledTimes(1);
    view.unmount();

    expect(mutationSignal?.aborted).toBe(true);
  });
});
