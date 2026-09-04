import {useCallback, useEffect, useRef, useState} from 'react';
import {Link} from 'react-router-dom';
import type {AdminSong, SongStatus} from '../../../shared/contracts';
import {adminApi} from '../../api/admin-api';
import {ApiError} from '../../api/http';
import {AsyncFormStatus} from './AsyncFormStatus';

type ListStatus = Exclude<SongStatus, 'trashed'>;
type ActionName = 'publish' | 'unpublish' | 'trash';

const statusCopy: Record<SongStatus, string> = {
  draft: '草稿', published: '已发布', unlisted: '已下架', trashed: '回收站',
};

const publishIssueCopy: Record<string, string> = {
  title: '歌名', artist: '歌手', audio: '音频文件', duration: '歌曲时长',
  cover: '封面文件', lyrics: 'LRC 歌词',
};

function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : '操作失败，请重试';
}

function publishError(error: ApiError): string {
  const issues = Array.isArray(error.details)
    ? error.details.filter((item): item is string => typeof item === 'string')
    : [];
  const fields = issues.map((issue) => publishIssueCopy[issue] ?? issue);
  return fields.length > 0
    ? `发布前请补充或修正：${fields.join('、')}`
    : error.message;
}

export function AdminSongListPage() {
  const [activeStatus, setActiveStatus] = useState<ListStatus>('draft');
  const [songs, setSongs] = useState<AdminSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [busySongId, setBusySongId] = useState('');
  const [error, setError] = useState('');
  const [errorSongId, setErrorSongId] = useState('');
  const [status, setStatus] = useState('');
  const actionRef = useRef<AbortController | null>(null);
  const recentActionRef = useRef<{key: string; at: number} | null>(null);

  const loadSongs = useCallback(async (listStatus: ListStatus, signal: AbortSignal) => {
    const result = await adminApi.listSongs(listStatus, signal);
    if (!signal.aborted) setSongs(result);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setErrorSongId('');
    void loadSongs(activeStatus, controller.signal).catch((loadError: unknown) => {
      if (!controller.signal.aborted) setError(errorMessage(loadError));
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [activeStatus, loadSongs]);

  useEffect(() => () => actionRef.current?.abort(), []);

  async function runAction(song: AdminSong, action: ActionName) {
    const actionKey = `${song.id}:${action}`;
    const now = Date.now();
    if (
      recentActionRef.current?.key === actionKey &&
      now - recentActionRef.current.at < 500
    ) return;
    if (actionRef.current) return;
    recentActionRef.current = {key: actionKey, at: now};
    const controller = new AbortController();
    actionRef.current = controller;
    setBusySongId(song.id);
    setError('');
    setErrorSongId('');
    setStatus('');
    try {
      if (action === 'publish') await adminApi.publishSong(song.id, controller.signal);
      if (action === 'unpublish') await adminApi.unpublishSong(song.id, controller.signal);
      if (action === 'trash') await adminApi.trashSong(song.id, controller.signal);
      await loadSongs(activeStatus, controller.signal);
      if (!controller.signal.aborted) {
        setStatus(action === 'publish'
          ? '歌曲已发布'
          : action === 'unpublish' ? '歌曲已下架' : '歌曲已移入回收站');
      }
    } catch (actionError) {
      if (!controller.signal.aborted) {
        setErrorSongId(song.id);
        setError(actionError instanceof ApiError && actionError.code === 'SONG_NOT_PUBLISHABLE'
          ? publishError(actionError)
          : errorMessage(actionError));
      }
    } finally {
      if (actionRef.current === controller) actionRef.current = null;
      if (!controller.signal.aborted) setBusySongId('');
    }
  }

  return (
    <div className="admin-management-page">
      <header className="admin-section-heading admin-section-heading--actions">
        <div>
          <h1>歌曲管理</h1>
          <p>逐首维护歌曲资料，并通过完整生命周期控制公开状态。</p>
        </div>
        <Link className="admin-primary-link" to="/admin/songs/new">新建歌曲</Link>
      </header>
      <div aria-label="歌曲状态" className="admin-status-tabs" role="tablist">
        {(['draft', 'published', 'unlisted'] as const).map((item) => (
          <button
            aria-selected={activeStatus === item}
            key={item}
            onClick={() => setActiveStatus(item)}
            role="tab"
            type="button"
          >
            {statusCopy[item]}
          </button>
        ))}
        <Link aria-selected={false} role="tab" to="/admin/trash">回收站</Link>
      </div>
      <AsyncFormStatus error={error} errorId="song-list-error" focusError status={status} />
      {loading ? <p role="status">正在加载歌曲…</p> : null}
      {!loading && !error && songs.length === 0 ? <p>当前状态下没有歌曲</p> : null}
      {!loading && songs.length > 0 ? (
        <div className="admin-table-wrap">
          <table className="admin-song-table">
            <thead><tr><th>歌名</th><th>歌手</th><th>状态</th><th>更新时间</th><th>操作</th></tr></thead>
            <tbody>
              {songs.map((song) => (
                <tr
                  aria-describedby={errorSongId === song.id ? 'song-list-error' : undefined}
                  key={song.id}
                >
                  <td data-label="歌名">{song.title}</td>
                  <td data-label="歌手">{song.artist}</td>
                  <td data-label="状态">{statusCopy[song.status]}</td>
                  <td data-label="更新时间"><time dateTime={song.updatedAt}>{new Date(song.updatedAt).toLocaleString()}</time></td>
                  <td data-label="操作"><div className="admin-row-actions">
                    <Link to={`/admin/songs/${encodeURIComponent(song.id)}`}>编辑</Link>
                    {song.status === 'draft' || song.status === 'unlisted' ? (
                      <button
                        disabled={Boolean(busySongId)}
                        onClick={(event) => {
                          event.currentTarget.disabled = true;
                          void runAction(song, 'publish');
                        }}
                        type="button"
                      >发布</button>
                    ) : null}
                    {song.status === 'published' ? (
                      <button
                        disabled={Boolean(busySongId)}
                        onClick={(event) => {
                          event.currentTarget.disabled = true;
                          void runAction(song, 'unpublish');
                        }}
                        type="button"
                      >下架</button>
                    ) : null}
                    {song.status === 'draft' || song.status === 'unlisted' ? (
                      <button
                        disabled={Boolean(busySongId)}
                        onClick={(event) => {
                          event.currentTarget.disabled = true;
                          void runAction(song, 'trash');
                        }}
                        type="button"
                      >移入回收站</button>
                    ) : null}
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
