import {Link, useSearchParams} from 'react-router-dom';
import {useRef} from 'react';
import {HomeHeader} from '../home/HomeHeader';
import {HanserArtwork} from '../../components/HanserArtwork';
import {PlayIcon, PauseIcon} from '../player/Icons';
import {formatTime} from '../player/player-utils';
import {MediaImage} from '../../components/MediaImage';
import {usePlayer} from '../player/usePlayer';
import {useLibrary} from './LibraryProvider';
import {filterLibrarySongs} from './music-filter';
import '../../styles/library.css';

function updateTitleQuery(
  searchParams: URLSearchParams,
  query: string,
) {
  const nextParams = new URLSearchParams(searchParams);
  if (query.length > 0) {
    nextParams.set('q', query);
  } else {
    nextParams.delete('q');
  }
  return nextParams;
}

export function MusicPage() {
  const {library} = useLibrary();
  const player = usePlayer();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchInput = useRef<HTMLInputElement>(null);
  const categoryId = searchParams.get('category') ?? '';
  const tagId = searchParams.get('tag') ?? '';
  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value); else next.delete(key);
    setSearchParams(next, {replace: true});
  };
  const query = searchParams.get('q') ?? '';
  const songs = library?.songs ?? [];
  const categories = library?.categories ?? [];
  const tags = library?.tags ?? [];
  const selectedCategoryId = categories.some(({id}) => id === categoryId) ? categoryId : '';
  const selectedTagId = tags.some(({id}) => id === tagId) ? tagId : '';
  const results = filterLibrarySongs(songs, {
    query,
    categoryId: selectedCategoryId || null,
    tagId: selectedTagId || null,
  });
  const resultIds = results.map(({id}) => id);

  const clearFilters = () => {
    const next = updateTitleQuery(searchParams, '');
    next.delete('category'); next.delete('tag');
    setSearchParams(next, {replace: true});
    searchInput.current?.focus();
  };

  return (
    <main aria-labelledby="music-page-title" className="music-page page-with-mini-player">
      <HomeHeader showSearch={false} />
      <header className="music-page__header">
        <div><Link className="back-home" to="/">返回首页</Link>
          <h1 id="music-page-title" tabIndex={-1}>音乐馆</h1>
          <p>把喜欢的声音，一首首找回来。</p>
        </div>
        <figure><HanserArtwork kind="hug" label="hanser 抱着毛怪的 Q 版形象" /><figcaption>hanser 的声音收藏</figcaption></figure>
      </header>

      <section aria-label="筛选歌曲" className="music-page__filters">
        <label>
          <span>按歌名搜索</span>
          <input
            aria-label="按歌名搜索"
            onChange={(event) => setSearchParams(
              updateTitleQuery(searchParams, event.target.value),
              {replace: true},
            )}
            placeholder="输入歌名"
            type="search"
            ref={searchInput}
            value={query}
          />
        </label>
        <label>
          <span>分类</span>
          <select
            aria-label="分类"
            onChange={(event) => setFilter('category', event.target.value)}
            value={selectedCategoryId}
          >
            <option value="">全部分类</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </label>
        <label>
          <span>标签</span>
          <select
            aria-label="标签"
            onChange={(event) => setFilter('tag', event.target.value)}
            value={selectedTagId}
          >
            <option value="">全部标签</option>
            {tags.map((tag) => (
              <option key={tag.id} value={tag.id}>{tag.name}</option>
            ))}
          </select>
        </label>
        <button onClick={clearFilters} type="button">清除筛选</button>
      </section>

      <section aria-labelledby="music-results-title" className="music-page__results">
        <header>
          <h2 id="music-results-title">{query || selectedCategoryId || selectedTagId ? '筛选结果' : '全部歌曲'}</h2>
          <p aria-live="polite" aria-atomic="true">{results.length} 首</p>
        </header>
        {songs.length === 0 ? (
          <p className="music-page__empty" role="status">曲库还是空的</p>
        ) : results.length === 0 ? (
          <div className="music-page__empty"><p role="status">没有符合条件的歌曲</p><p>换个歌名，或试试其他分类和标签。</p><button onClick={clearFilters} type="button">清除全部条件</button></div>
        ) : (
          <div className="music-page__song-list">
            {results.map((song) => (
              <article className="music-song-card" key={song.id}>
                <MediaImage
                  alt={`${song.title} 封面`}
                  className="music-song-card__cover"
                  fallbackLabel={song.title}
                  src={song.coverUrl}
                />
                <div className="music-song-card__details">
                  <h3>{song.title}</h3>
                  <p>{song.artist} · {formatTime(song.durationSeconds)}</p>
                  <p>
                    {song.category?.name ?? '未分类'}
                    {song.tags.length > 0 ? ` · ${song.tags.map(({name}) => name).join(' / ')}` : ''}
                  </p>
                </div>
                <button
                  aria-label={`${player.currentTrack.id === song.id && player.isPlaying ? '暂停' : '播放'} ${song.title}`}
                  onClick={() => void (player.currentTrack.id === song.id && player.isPlaying ? player.toggle() : player.playTrack(song.id, resultIds))}
                  type="button"
                >
                  {player.currentTrack.id === song.id && player.isPlaying ? <PauseIcon /> : <PlayIcon />}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
