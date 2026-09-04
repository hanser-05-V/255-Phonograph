import {cleanup, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {ApiError} from '../../api/http';
import {AdminLoginPage} from './AdminLoginPage';

afterEach(cleanup);

describe('AdminLoginPage', () => {
  it('keeps the entered password and announces a failed keyboard login', async () => {
    const onSubmit = vi.fn().mockRejectedValue(
      new ApiError(401, 'INVALID_CREDENTIALS', '密码错误'),
    );
    const user = userEvent.setup();
    render(<AdminLoginPage mode="login" onSubmit={onSubmit} />);

    const password = screen.getByLabelText('管理密码');
    await user.type(password, 'wrong-value');
    await user.keyboard('{Enter}');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('密码错误');
    expect(password).toHaveValue('wrong-value');
    expect(password).toHaveAttribute('aria-describedby', 'admin-auth-error');
    expect(password).toHaveAttribute('aria-invalid', 'true');
    expect(alert).toHaveFocus();
  });

  it('rejects short and mismatched setup passwords before calling the API', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<AdminLoginPage mode="setup" onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('管理密码'), 'short');
    await user.type(screen.getByLabelText('确认管理密码'), 'different');
    await user.click(screen.getByRole('button', {name: '创建并进入后台'}));

    expect(await screen.findByRole('alert')).toHaveTextContent('管理密码至少需要 8 个字符');
    expect(onSubmit).not.toHaveBeenCalled();

    await user.clear(screen.getByLabelText('管理密码'));
    await user.clear(screen.getByLabelText('确认管理密码'));
    await user.type(screen.getByLabelText('管理密码'), 'owner-password');
    await user.type(screen.getByLabelText('确认管理密码'), 'other-password');
    await user.click(screen.getByRole('button', {name: '创建并进入后台'}));

    expect(await screen.findByRole('alert')).toHaveTextContent('两次输入的管理密码不一致');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('disables repeated submission while authentication is pending', async () => {
    let resolveSubmit: (() => void) | undefined;
    const onSubmit = vi.fn(() => new Promise<void>((resolve) => {
      resolveSubmit = resolve;
    }));
    const user = userEvent.setup();
    render(<AdminLoginPage mode="login" onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('管理密码'), 'owner-password');
    const submit = screen.getByRole('button', {name: '登录'});
    await user.click(submit);

    expect(submit).toBeDisabled();
    expect(onSubmit).toHaveBeenCalledTimes(1);
    resolveSubmit?.();
  });
});
