import {act, renderHook, waitFor} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {createdXhrs, installFakeXhr} from './test/fake-xhr';
import {useMediaUpload} from './useMediaUpload';

let restoreXhr: (() => void) | undefined;

beforeEach(() => {
  restoreXhr = installFakeXhr();
});

afterEach(() => {
  restoreXhr?.();
  vi.unstubAllGlobals();
});

describe('useMediaUpload', () => {
  it('reports progress, returns the upload token, and cancels an accepted upload', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, {status: 204}));
    vi.stubGlobal('fetch', fetchMock);
    const {result} = renderHook(() => useMediaUpload('audio'));
    const file = new File(['audio'], 'song.mp3', {type: 'audio/mpeg'});

    act(() => result.current.upload(file));
    expect(createdXhrs[0]?.url).toBe('/api/admin/uploads/audio');
    expect(createdXhrs[0]?.withCredentials).toBe(true);
    act(() => createdXhrs[0].progress({loaded: 51, total: 100}));
    expect(result.current.progress).toBe(51);

    act(() => createdXhrs[0].respond(201, {
      uploadId: 'upload-1',
      originalName: 'song.mp3',
      mimeType: 'audio/mpeg',
      byteSize: 5,
      durationSeconds: 125,
    }));
    await waitFor(() => expect(result.current.state).toBe('uploaded'));
    expect(result.current.uploadId).toBe('upload-1');
    expect(result.current.durationSeconds).toBe(125);

    await act(() => result.current.cancel());
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/uploads/upload-1', {
      credentials: 'same-origin',
      method: 'DELETE',
    });
    expect(result.current.state).toBe('cancelled');
    expect(result.current.uploadId).toBeNull();
  });

  it.each([
    [401, '管理会话已失效，请重新登录', 'server message'],
    [413, '文件超过大小限制', 'server message'],
    [415, '不支持这种文件格式', 'server message'],
    [422, '音频格式与内容不匹配', '音频格式与内容不匹配'],
  ])('maps HTTP %s and retries the same file', async (status, message, serverMessage) => {
    const {result} = renderHook(() => useMediaUpload('cover'));
    const file = new File(['image'], 'cover.jpg', {type: 'image/jpeg'});

    act(() => result.current.upload(file));
    act(() => createdXhrs[0].respond(status, {
      error: {code: 'UPLOAD_ERROR', message: serverMessage},
    }));
    await waitFor(() => expect(result.current.state).toBe('error'));
    expect(result.current.error).toBe(message);

    act(() => result.current.retry());
    expect(createdXhrs).toHaveLength(2);
  });

  it('reports a network failure and aborts an active request on unmount', async () => {
    const {result, unmount} = renderHook(() => useMediaUpload('audio'));
    const file = new File(['audio'], 'song.mp3', {type: 'audio/mpeg'});

    act(() => result.current.upload(file));
    act(() => createdXhrs[0].fail());
    await waitFor(() => expect(result.current.error).toBe('上传失败，请检查本地服务后重试'));

    act(() => result.current.retry());
    const active = createdXhrs[1];
    unmount();
    expect(active.abort).toHaveBeenCalledTimes(1);
  });

  it('returns uploaded LRC text and validation errors without an upload token', async () => {
    const {result} = renderHook(() => useMediaUpload('lrc'));
    act(() => result.current.upload(new File(['bad'], 'lyrics.lrc', {type: 'text/plain'})));
    act(() => createdXhrs[0].respond(200, {
      content: '[00:01.00]第一句\n错误行',
      validation: {
        valid: false,
        errors: [{line: 2, message: '歌词行缺少有效时间标签'}],
      },
    }));

    await waitFor(() => expect(result.current.state).toBe('uploaded'));
    expect(result.current.lrcText).toContain('第一句');
    expect(result.current.validationErrors).toEqual([
      {line: 2, message: '歌词行缺少有效时间标签'},
    ]);
    expect(result.current.uploadId).toBeNull();
  });
});
