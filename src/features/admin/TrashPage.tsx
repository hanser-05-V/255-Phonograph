import {useCallback, useEffect, useRef, useState} from 'react';
import type {AdminSong} from '../../../shared/contracts';
import {adminApi} from '../../api/admin-api';
import {ApiError} from '../../api/http';
import {AsyncFormStatus} from './AsyncFormStatus';
import {ConfirmDialog} from './ConfirmDialog';

function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : '操作失败，请重试';
}

function restoreLabel(song: AdminSong): string {
  return song.statusBeforeTrash === 'draft' ? '草稿' : '已下架';
}

export function TrashPage() {
  const [songs, setSongs] = useState<AdminSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [deleting, setDeleting] = useState<AdminSong | null>(null);
  const [confirmation, setConfirmation] = useState('');
  const requestRef = useRef<AbortController | null>(null);

  const loadSongs = useCallback(async (signal: AbortSignal) => {
    const result = await adminApi.listSongs('trashed', signal);
    if (!signal.aborted) setSongs(result);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadSongs(controller.signal).catch((loadError: unknown) => {
      if (!controller.signal.aborted) setError(errorMessage(loadError));
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [loadSongs]);

  useEffect(() => () => requestRef.current?.abort(), []);

  async function run(action: 'restore' | 'delete', song: AdminSong) {
    if (requestRef.current) return;
    const controller = new AbortController();
    requestRef.current = controller;
    setBusy(true);
    setError('');
    setStatus('');
    try {
      if (action === 'restore') {
        const restored = await adminApi.restoreSong(song.id, controller.signal);
        if (!controller.signal.aborted) setStatus(`歌曲已恢复为${restoreLabel({...song, statusBeforeTrash: restored.status === 'draft' ? 'draft' : 'unlisted'})}`);
      } else {
        await adminApi.permanentlyDeleteSong(song.id, confirmation, controller.signal);
        if (!controller.signal.aborted) setStatus('歌曲已永久删除');
      }
      await loadSongs(controller.signal);
      if (!controller.signal.aborted && action === 'delete') {
        setDeleting(null);
        setConfirmation('');
      }
    } catch (actionError) {
      if (!controller.signal.aborted) setError(errorMessage(actionError));
    } finally {
      if (requestRef.current === controller) requestRef.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  return (
    <div className="admin-management-page">
      <header className="admin-section-heading">
        <h1>回收站</h1>
        <p>恢复歌曲，或在核对稳定歌曲编号后永久删除。</p>
      </header>
      <AsyncFormStatus error={error} errorId="trash-error" focusError status={status} />
      {loading ? <p role="status">正在加载回收站…</p> : null}
      {!loading && !error && songs.length === 0 ? <p>回收站为空</p> : null}
      {!loading && songs.length > 0 ? (
        <div className="admin-table-wrap">
          <table className="admin-song-table">
            <thead><tr><th>歌名</th><th>歌手</th><th>恢复位置</th><th>歌曲编号</th><th>操作</th></tr></thead>
            <tbody>{songs.map((song) => (
              <tr key={song.id}>
                <td data-label="歌名">{song.title}</td>
                <td data-label="歌手">{song.artist}</td>
                <td data-label="恢复位置">恢复为{restoreLabel(song)}</td>
                <td data-label="歌曲编号"><code>{song.id}</code></td>
                <td data-label="操作"><div className="admin-row-actions">
                  <button disabled={busy} onClick={() => void run('restore', song)} type="button">恢复</button>
                  <button disabled={busy} onClick={() => {
                    setDeleting(song);
                    setConfirmation('');
                  }} type="button">永久删除</button>
                </div></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : null}
      {deleting ? (
        <ConfirmDialog
          busy={busy}
          busyLabel="正在永久删除…"
          confirmDisabled={confirmation !== deleting.id}
          confirmLabel="永久删除"
          description={`此操作不可恢复。请输入稳定歌曲编号 ${deleting.id} 后继续。`}
          onCancel={() => {
            setDeleting(null);
            setConfirmation('');
          }}
          onConfirm={() => void run('delete', deleting)}
          title="永久删除歌曲"
        >
          <label htmlFor="permanent-delete-confirmation">输入歌曲编号 {deleting.id} 以确认</label>
          <input
            autoComplete="off"
            id="permanent-delete-confirmation"
            onChange={(event) => setConfirmation(event.target.value)}
            value={confirmation}
          />
        </ConfirmDialog>
      ) : null}
    </div>
  );
}
