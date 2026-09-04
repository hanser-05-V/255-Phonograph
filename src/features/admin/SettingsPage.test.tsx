import {cleanup, screen} from '@testing-library/react';
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

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(adminApi.getAuthStatus).mockResolvedValue({
    needsSetup: false,
    authenticated: true,
  });
  vi.mocked(adminApi.getSettings).mockResolvedValue({
    dataDirectoryDisplay: 'D:\\255-phonograph-data',
  });
});

afterEach(cleanup);

describe('SettingsPage', () => {
  it('shows the data directory as read-only display text', async () => {
    renderAdmin('/admin/settings');

    expect(await screen.findByText('D:\\255-phonograph-data')).toBeInTheDocument();
    expect(screen.queryByRole('link', {name: /255-phonograph-data/})).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {name: /浏览|移动|删除目录/})).not.toBeInTheDocument();
  });

  it('changes the password without clearing fields on failure', async () => {
    vi.mocked(adminApi.changePassword).mockRejectedValue(
      new ApiError(401, 'INVALID_CREDENTIALS', '当前密码错误'),
    );
    const user = userEvent.setup();
    renderAdmin('/admin/settings');

    const currentPassword = await screen.findByLabelText('当前密码');
    const newPassword = screen.getByLabelText('新密码');
    await user.type(currentPassword, 'old-password');
    await user.type(newPassword, 'new-password');
    await user.type(screen.getByLabelText('确认新密码'), 'new-password');
    await user.click(screen.getByRole('button', {name: '修改管理密码'}));

    expect(adminApi.changePassword).toHaveBeenCalledWith(
      'old-password',
      'new-password',
      expect.any(AbortSignal),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('当前密码错误');
    expect(currentPassword).toHaveValue('old-password');
    expect(newPassword).toHaveValue('new-password');
    expect(currentPassword).toHaveAttribute('aria-describedby');
  });

  it('validates the new password and confirmation before submitting', async () => {
    const user = userEvent.setup();
    renderAdmin('/admin/settings');

    await user.type(await screen.findByLabelText('当前密码'), 'old-password');
    await user.type(screen.getByLabelText('新密码'), 'short');
    await user.type(screen.getByLabelText('确认新密码'), 'different');
    await user.click(screen.getByRole('button', {name: '修改管理密码'}));

    expect(await screen.findByRole('alert')).toHaveTextContent('新密码需为 8–200 个字符');
    expect(adminApi.changePassword).not.toHaveBeenCalled();
  });

  it('clears password fields and announces success after changing it', async () => {
    vi.mocked(adminApi.changePassword).mockResolvedValue({authenticated: true});
    const user = userEvent.setup();
    renderAdmin('/admin/settings');

    const currentPassword = await screen.findByLabelText('当前密码');
    const newPassword = screen.getByLabelText('新密码');
    const confirmation = screen.getByLabelText('确认新密码');
    await user.type(currentPassword, 'old-password');
    await user.type(newPassword, 'new-password');
    await user.type(confirmation, 'new-password');
    await user.click(screen.getByRole('button', {name: '修改管理密码'}));

    expect(await screen.findByText('管理密码已修改')).toHaveAttribute('role', 'status');
    expect(currentPassword).toHaveValue('');
    expect(newPassword).toHaveValue('');
    expect(confirmation).toHaveValue('');
  });

  it('aborts a pending password change when the page unmounts', async () => {
    let mutationSignal: AbortSignal | undefined;
    vi.mocked(adminApi.changePassword).mockImplementation(
      (_currentPassword, _newPassword, signal) => {
        mutationSignal = signal;
        return new Promise(() => undefined);
      },
    );
    const user = userEvent.setup();
    const view = renderAdmin('/admin/settings');

    await user.type(await screen.findByLabelText('当前密码'), 'old-password');
    await user.type(screen.getByLabelText('新密码'), 'new-password');
    await user.type(screen.getByLabelText('确认新密码'), 'new-password');
    await user.click(screen.getByRole('button', {name: '修改管理密码'}));
    expect(adminApi.changePassword).toHaveBeenCalledTimes(1);
    view.unmount();

    expect(mutationSignal?.aborted).toBe(true);
  });
});
