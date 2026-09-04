import {cleanup, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {adminApi} from '../../api/admin-api';
import {ApiError} from '../../api/http';
import {renderAdmin} from './test/render-admin';

vi.mock('../../api/admin-api', () => ({
  adminApi: {
    changePassword: vi.fn(),
    getAuthStatus: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    setup: vi.fn(),
  },
}));

beforeEach(() => {
  vi.mocked(adminApi.changePassword).mockReset();
  vi.mocked(adminApi.getAuthStatus).mockReset();
  vi.mocked(adminApi.login).mockReset();
  vi.mocked(adminApi.logout).mockReset();
  vi.mocked(adminApi.setup).mockReset();
});

afterEach(cleanup);

describe('AdminAuthGate', () => {
  it('shows first-time setup and enters the protected admin shell', async () => {
    vi.mocked(adminApi.getAuthStatus).mockResolvedValue({
      needsSetup: true,
      authenticated: false,
    });
    vi.mocked(adminApi.setup).mockResolvedValue({authenticated: true});
    const user = userEvent.setup();
    renderAdmin('/admin');

    expect(await screen.findByRole('heading', {name: '创建管理密码'})).toBeInTheDocument();
    await user.type(screen.getByLabelText('管理密码'), 'owner-password');
    await user.type(screen.getByLabelText('确认管理密码'), 'owner-password');
    await user.click(screen.getByRole('button', {name: '创建并进入后台'}));

    expect(await screen.findByRole('navigation', {name: '管理导航'})).toBeInTheDocument();
    expect(screen.getByRole('heading', {name: '歌曲管理'})).toBeInTheDocument();
  });

  it('shows an unavailable state and retries the status request', async () => {
    vi.mocked(adminApi.getAuthStatus)
      .mockRejectedValueOnce(new ApiError(0, 'SERVICE_UNAVAILABLE', '本地服务未运行'))
      .mockResolvedValueOnce({needsSetup: false, authenticated: true});
    const user = userEvent.setup();
    renderAdmin('/admin');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('无法连接本地管理服务');
    expect(alert).toHaveFocus();
    await user.click(screen.getByRole('button', {name: '重试'}));

    expect(await screen.findByRole('navigation', {name: '管理导航'})).toBeInTheDocument();
    expect(adminApi.getAuthStatus).toHaveBeenCalledTimes(2);
  });

  it('returns to login when the status request reports an expired session', async () => {
    vi.mocked(adminApi.getAuthStatus).mockRejectedValue(
      new ApiError(401, 'UNAUTHORIZED', 'Authentication required.'),
    );

    renderAdmin('/admin');

    expect(await screen.findByRole('heading', {name: '登录管理后台'})).toBeInTheDocument();
    expect(screen.queryByText('无法连接本地管理服务')).not.toBeInTheDocument();
  });

  it('announces a valid authenticated session', async () => {
    vi.mocked(adminApi.getAuthStatus).mockResolvedValue({
      needsSetup: false,
      authenticated: true,
    });

    renderAdmin('/admin');

    expect(await screen.findByText('管理会话有效')).toHaveAttribute('role', 'status');
  });

  it('logs in and enters the protected admin shell', async () => {
    vi.mocked(adminApi.getAuthStatus).mockResolvedValue({
      needsSetup: false,
      authenticated: false,
    });
    vi.mocked(adminApi.login).mockResolvedValue({authenticated: true});
    const user = userEvent.setup();
    renderAdmin('/admin');

    await user.type(await screen.findByLabelText('管理密码'), 'owner-password');
    await user.keyboard('{Enter}');

    expect(await screen.findByRole('navigation', {name: '管理导航'})).toBeInTheDocument();
    expect(adminApi.login).toHaveBeenCalledWith('owner-password', expect.any(AbortSignal));
  });

  it.each([
    ['/admin', '歌曲管理'],
    ['/admin/songs/new', '新建歌曲'],
    ['/admin/songs/song-255', '编辑歌曲'],
    ['/admin/taxonomy', '分类与标签'],
    ['/admin/trash', '回收站'],
    ['/admin/settings', '设置'],
  ])('renders the protected route shell for %s', async (path, heading) => {
    vi.mocked(adminApi.getAuthStatus).mockResolvedValue({
      needsSetup: false,
      authenticated: true,
    });

    renderAdmin(path);

    expect(await screen.findByRole('heading', {name: heading})).toBeInTheDocument();
    expect(screen.getByRole('link', {name: '回收站'})).toHaveAttribute('href', '/admin/trash');
    expect(screen.getByRole('link', {name: '设置'})).toHaveAttribute('href', '/admin/settings');
  });

  it('logs out and returns to the login form', async () => {
    vi.mocked(adminApi.getAuthStatus).mockResolvedValue({
      needsSetup: false,
      authenticated: true,
    });
    vi.mocked(adminApi.logout).mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderAdmin('/admin');

    await user.click(await screen.findByRole('button', {name: '退出'}));

    expect(await screen.findByRole('heading', {name: '登录管理后台'})).toBeInTheDocument();
    expect(adminApi.logout).toHaveBeenCalledTimes(1);
  });

  it('aborts the initial status request when the gate unmounts', () => {
    let signal: AbortSignal | undefined;
    vi.mocked(adminApi.getAuthStatus).mockImplementation((requestSignal) => {
      signal = requestSignal;
      return new Promise(() => undefined);
    });

    const view = renderAdmin('/admin');
    view.unmount();

    expect(signal?.aborted).toBe(true);
  });
});
