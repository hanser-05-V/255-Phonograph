import {act, cleanup, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {MediaUploadField} from './MediaUploadField';
import {createdXhrs, installFakeXhr} from './test/fake-xhr';

let restoreXhr: (() => void) | undefined;

beforeEach(() => {
  restoreXhr = installFakeXhr();
});

afterEach(() => {
  cleanup();
  restoreXhr?.();
  vi.unstubAllGlobals();
});

describe('MediaUploadField', () => {
  it('announces upload progress, cancels, and can retry the same selected file', async () => {
    const user = userEvent.setup();
    render(<MediaUploadField kind="audio" label="音频文件" />);
    const file = new File(['audio'], 'song.mp3', {type: 'audio/mpeg'});

    await user.upload(screen.getByLabelText('音频文件'), file);
    act(() => createdXhrs[0].progress({loaded: 50, total: 100}));
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
    expect(screen.getByRole('status')).toHaveTextContent('已上传 50%');
    await user.click(screen.getByRole('button', {name: '取消上传'}));
    expect(createdXhrs[0].abort).toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent('上传已取消');
    await user.click(screen.getByRole('button', {name: '重新上传'}));
    expect(createdXhrs).toHaveLength(2);
  });

  it('shows recognized audio duration and an explicit missing-duration warning', async () => {
    const user = userEvent.setup();
    const view = render(<MediaUploadField kind="audio" label="音频文件" />);
    await user.upload(screen.getByLabelText('音频文件'), new File(['a'], 'song.mp3', {
      type: 'audio/mpeg',
    }));
    act(() => createdXhrs[0].respond(201, {
      uploadId: 'upload-a', originalName: 'song.mp3', mimeType: 'audio/mpeg',
      byteSize: 1, durationSeconds: 95,
    }));
    expect(await screen.findByText('识别时长：1:35')).toBeInTheDocument();

    view.unmount();
    render(<MediaUploadField kind="audio" label="音频文件" />);
    await user.upload(screen.getByLabelText('音频文件'), new File(['b'], 'unknown.mp3', {
      type: 'audio/mpeg',
    }));
    act(() => createdXhrs[1].respond(201, {
      uploadId: 'upload-b', originalName: 'unknown.mp3', mimeType: 'audio/mpeg',
      byteSize: 1, durationSeconds: null,
    }));
    expect(await screen.findByRole('alert')).toHaveTextContent('无法识别，可保存草稿但不能发布');
  });

  it('cancels an accepted pending upload and clears it from the owning form', async () => {
    const onCleared = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, {status: 204}));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<MediaUploadField kind="cover" label="封面文件" onCleared={onCleared} />);
    await user.upload(screen.getByLabelText('封面文件'), new File(['a'], 'cover.jpg', {
      type: 'image/jpeg',
    }));
    act(() => createdXhrs[0].respond(201, {
      uploadId: 'upload-cover', originalName: 'cover.jpg', mimeType: 'image/jpeg',
      byteSize: 1, durationSeconds: null,
    }));
    await screen.findByText('封面上传完成');

    await user.click(screen.getByRole('button', {name: '取消本次上传'}));

    expect(fetchMock).toHaveBeenCalledWith('/api/admin/uploads/upload-cover', {
      credentials: 'same-origin', method: 'DELETE',
    });
    expect(onCleared).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status')).toHaveTextContent('上传已取消');
  });

  it('clears the previous token before replacing an accepted pending upload', async () => {
    const onCleared = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, {status: 204}));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<MediaUploadField kind="cover" label="封面文件" onCleared={onCleared} />);
    const input = screen.getByLabelText('封面文件');
    await user.upload(input, new File(['a'], 'first.jpg', {type: 'image/jpeg'}));
    act(() => createdXhrs[0].respond(201, {
      uploadId: 'upload-first', originalName: 'first.jpg', mimeType: 'image/jpeg',
      byteSize: 1, durationSeconds: null,
    }));
    await screen.findByText('封面上传完成');

    await user.upload(input, new File(['b'], 'second.jpg', {type: 'image/jpeg'}));

    expect(onCleared).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/uploads/upload-first', {
      credentials: 'same-origin', method: 'DELETE',
    });
    expect(createdXhrs).toHaveLength(2);
  });

  it('restricts cover selection and returns invalid LRC text to the editor', async () => {
    const onLrcText = vi.fn();
    const user = userEvent.setup();
    const {rerender} = render(<MediaUploadField kind="cover" label="封面文件" />);
    expect(screen.getByLabelText('封面文件')).toHaveAttribute(
      'accept',
      '.jpg,.jpeg,.png,.webp',
    );

    rerender(<MediaUploadField kind="lrc" label="LRC 文件" onLrcText={onLrcText} />);
    await user.upload(screen.getByLabelText('LRC 文件'), new File(['bad'], 'lyrics.lrc', {
      type: 'text/plain',
    }));
    act(() => createdXhrs[0].respond(200, {
      content: '[00:01.00]第一句\n错误行',
      validation: {
        valid: false,
        errors: [{line: 2, message: '歌词行缺少有效时间标签'}],
      },
    }));
    expect(await screen.findByRole('alert')).toHaveTextContent('第 2 行：歌词行缺少有效时间标签');
    expect(onLrcText).toHaveBeenCalledWith(
      '[00:01.00]第一句\n错误行',
      [{line: 2, message: '歌词行缺少有效时间标签'}],
    );
  });
});
