import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import {Link, useNavigate, useParams} from 'react-router-dom';
import type {AdminSong, SongDraftInput, TaxonomyItem} from '../../../shared/contracts';
import {adminApi} from '../../api/admin-api';
import {ApiError} from '../../api/http';
import {AsyncFormStatus} from './AsyncFormStatus';
import {ConfirmDialog} from './ConfirmDialog';
import {MediaUploadField} from './MediaUploadField';
import type {LrcLineError} from './useMediaUpload';

type FormValues = Omit<SongDraftInput,
  'audioUploadId' | 'coverUploadId' | 'confirmDuplicate' | 'confirmAudioReplacement'> & {
  audioUploadId?: string;
  coverUploadId?: string;
};

const emptyValues: FormValues = {
  title: '', artist: '', lyricsText: '', categoryId: null, tagIds: [],
  versionNote: '', performanceDate: '', sourceUrl: '',
  isFeatured: false, isLiveCover: false,
};

type Confirmation = 'duplicate' | 'audio-replacement' | null;

function valuesFromSong(song: AdminSong): FormValues {
  return {
    title: song.title,
    artist: song.artist,
    lyricsText: song.lyricsText,
    categoryId: song.categoryId,
    tagIds: song.tagIds,
    versionNote: song.versionNote,
    performanceDate: song.performanceDate,
    sourceUrl: song.sourceUrl,
    isFeatured: song.isFeatured,
    isLiveCover: song.isLiveCover,
  };
}

function messageFor(error: unknown): string {
  return error instanceof ApiError ? error.message : '保存失败，请重试';
}

export function SongForm() {
  const {songId} = useParams<{songId: string}>();
  const navigate = useNavigate();
  const [values, setValues] = useState<FormValues>(emptyValues);
  const [song, setSong] = useState<AdminSong | null>(null);
  const [categories, setCategories] = useState<TaxonomyItem[]>([]);
  const [tags, setTags] = useState<TaxonomyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [confirmation, setConfirmation] = useState<Confirmation>(null);
  const [lyricsErrors, setLyricsErrors] = useState<LrcLineError[]>([]);
  const [dirty, setDirty] = useState(false);
  const requestRef = useRef<AbortController | null>(null);
  const recentSaveRef = useRef<{key: string; at: number} | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    if (
      typeof adminApi.listCategories !== 'function' ||
      typeof adminApi.listTags !== 'function' ||
      (songId !== undefined && typeof adminApi.getSong !== 'function')
    ) {
      setLoading(false);
      return () => controller.abort();
    }
    const requests: [Promise<TaxonomyItem[]>, Promise<TaxonomyItem[]>, Promise<AdminSong | null>] = [
      adminApi.listCategories(controller.signal),
      adminApi.listTags(controller.signal),
      songId ? adminApi.getSong(songId, controller.signal) : Promise.resolve(null),
    ];
    void Promise.all(requests).then(([loadedCategories, loadedTags, loadedSong]) => {
      if (controller.signal.aborted) return;
      setCategories(loadedCategories);
      setTags(loadedTags);
      if (loadedSong) {
        setSong(loadedSong);
        setValues(valuesFromSong(loadedSong));
      }
    }).catch((loadError: unknown) => {
      if (!controller.signal.aborted) setError(messageFor(loadError));
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [songId]);

  useEffect(() => () => requestRef.current?.abort(), []);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const lyricsErrorText = useMemo(() => lyricsErrors
    .map(({line, message}) => `第 ${line} 行：${message}`).join('；'), [lyricsErrors]);

  function update<K extends keyof FormValues>(field: K, value: FormValues[K]) {
    setValues((current) => ({...current, [field]: value}));
    setDirty(true);
    setStatus('');
  }

  function payload(confirm: Confirmation = null): SongDraftInput {
    return {
      title: values.title,
      artist: values.artist,
      ...(values.audioUploadId ? {audioUploadId: values.audioUploadId} : {}),
      ...(values.coverUploadId ? {coverUploadId: values.coverUploadId} : {}),
      lyricsText: values.lyricsText,
      categoryId: values.categoryId,
      tagIds: values.tagIds,
      versionNote: values.versionNote,
      performanceDate: values.performanceDate,
      sourceUrl: values.sourceUrl,
      isFeatured: values.isFeatured,
      isLiveCover: values.isLiveCover,
      confirmDuplicate: confirm === 'duplicate',
      confirmAudioReplacement: confirm === 'audio-replacement',
    };
  }

  async function save(confirm: Confirmation = null) {
    const saveKey = confirm ?? 'initial';
    const now = Date.now();
    if (
      recentSaveRef.current?.key === saveKey &&
      now - recentSaveRef.current.at < 500
    ) return;
    if (requestRef.current || submitting) return;
    recentSaveRef.current = {key: saveKey, at: now};
    const controller = new AbortController();
    requestRef.current = controller;
    setSubmitting(true);
    setError('');
    setStatus('');
    try {
      const saved = await adminApi.saveSong(songId, payload(confirm), controller.signal);
      if (controller.signal.aborted) return;
      setSong(saved);
      setValues(valuesFromSong(saved));
      setLyricsErrors([]);
      setConfirmation(null);
      setDirty(false);
      setStatus(songId ? '修改已保存' : '草稿已保存');
      if (!songId) {
        navigate(`/admin/songs/${encodeURIComponent(saved.id)}`, {replace: true});
      }
    } catch (saveError) {
      if (controller.signal.aborted) return;
      if (saveError instanceof ApiError && saveError.code === 'DUPLICATE_CONFIRMATION_REQUIRED') {
        setConfirmation('duplicate');
      } else if (
        saveError instanceof ApiError &&
        saveError.code === 'AUDIO_REPLACEMENT_CONFIRMATION_REQUIRED'
      ) {
        setConfirmation('audio-replacement');
      } else {
        setError(messageFor(saveError));
      }
    } finally {
      if (requestRef.current === controller) requestRef.current = null;
      if (!controller.signal.aborted) setSubmitting(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void save();
  }

  const title = songId ? '编辑歌曲' : '新建歌曲';
  if (loading) return <p role="status">正在加载歌曲编辑器…</p>;

  return (
    <div className="admin-management-page admin-song-editor">
      <header className="admin-section-heading admin-section-heading--actions">
        <div>
          <h1>{title}</h1>
          <p>{songId ? `稳定歌曲编号：${songId}` : '先保存草稿，再从歌曲列表发布。'}</p>
        </div>
        <Link to="/admin">返回歌曲列表</Link>
      </header>
      <AsyncFormStatus error={error} errorId="song-form-error" focusError status={status} />
      <form className="admin-song-form" onSubmit={handleSubmit}>
        <div className="admin-song-form__grid">
          <label htmlFor="song-title">歌名</label>
          <input id="song-title" onChange={(event) => update('title', event.target.value)} value={values.title} />
          <label htmlFor="song-artist">歌手</label>
          <input id="song-artist" onChange={(event) => update('artist', event.target.value)} value={values.artist} />
        </div>

        <div className="admin-song-form__media">
          <MediaUploadField
            existingName={song?.audio?.originalName}
            kind="audio"
            label="音频文件"
            onCleared={() => update('audioUploadId', undefined)}
            onUploaded={(uploadId) => update('audioUploadId', uploadId)}
          />
          <MediaUploadField
            existingName={song?.cover?.originalName}
            kind="cover"
            label="封面文件"
            onCleared={() => update('coverUploadId', undefined)}
            onUploaded={(uploadId) => update('coverUploadId', uploadId)}
          />
        </div>

        <MediaUploadField
          errorId="song-lyrics-upload-errors"
          kind="lrc"
          label="LRC 文件"
          onLrcText={(text, errors) => {
            update('lyricsText', text);
            setLyricsErrors(errors);
          }}
        />
        <label htmlFor="song-lyrics">LRC 歌词</label>
        <textarea
          aria-describedby={lyricsErrorText ? 'song-lyrics-upload-errors' : undefined}
          id="song-lyrics"
          onChange={(event) => {
            update('lyricsText', event.target.value);
            setLyricsErrors([]);
          }}
          rows={8}
          value={values.lyricsText}
        />

        <div className="admin-song-form__grid">
          <label htmlFor="song-category">分类</label>
          <select
            id="song-category"
            onChange={(event) => update('categoryId', event.target.value || null)}
            value={values.categoryId ?? ''}
          >
            <option value="">未分类</option>
            {categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <fieldset className="admin-tag-picker">
            <legend>标签</legend>
            {tags.length === 0 ? <p>尚未创建标签</p> : tags.map((item) => (
              <label key={item.id}>
                <input
                  aria-label={`标签：${item.name}`}
                  checked={values.tagIds.includes(item.id)}
                  onChange={(event) => update('tagIds', event.target.checked
                    ? [...values.tagIds, item.id]
                    : values.tagIds.filter((id) => id !== item.id))}
                  type="checkbox"
                />
                {item.name}
              </label>
            ))}
          </fieldset>
          <label htmlFor="song-version-note">版本说明</label>
          <input id="song-version-note" onChange={(event) => update('versionNote', event.target.value)} value={values.versionNote} />
          <label htmlFor="song-performance-date">演唱日期</label>
          <input id="song-performance-date" onChange={(event) => update('performanceDate', event.target.value)} type="date" value={values.performanceDate} />
          <label htmlFor="song-source-url">来源链接</label>
          <input id="song-source-url" onChange={(event) => update('sourceUrl', event.target.value)} type="url" value={values.sourceUrl} />
        </div>

        <fieldset className="admin-home-flags">
          <legend>首页分区</legend>
          <label><input checked={values.isFeatured} onChange={(event) => update('isFeatured', event.target.checked)} type="checkbox" />加入精选歌曲</label>
          <label><input checked={values.isLiveCover} onChange={(event) => update('isLiveCover', event.target.checked)} type="checkbox" />加入直播翻唱精选</label>
        </fieldset>
        <button disabled={submitting} type="submit">
          {submitting ? '正在保存…' : songId ? '保存修改' : '保存草稿'}
        </button>
      </form>

      {confirmation === 'duplicate' ? (
        <ConfirmDialog
          busy={submitting}
          confirmLabel="仍然保存"
          description="存在同名同歌手歌曲。确认这是另一个版本后仍可保存。"
          onCancel={() => setConfirmation(null)}
          onConfirm={() => void save('duplicate')}
          title="确认重复歌曲"
        />
      ) : null}
      {confirmation === 'audio-replacement' ? (
        <ConfirmDialog
          busy={submitting}
          confirmLabel="确认替换并保存"
          description="替换音频后歌曲编号保持不变，旧音频将由系统清理。"
          onCancel={() => setConfirmation(null)}
          onConfirm={() => void save('audio-replacement')}
          title="确认替换音频"
        />
      ) : null}
    </div>
  );
}
