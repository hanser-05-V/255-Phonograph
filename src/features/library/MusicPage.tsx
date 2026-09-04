import {Link, useSearchParams} from 'react-router-dom';
import {useState} from 'react';
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
  const [categoryId, setCategoryId] = useState('');
  const [tagId, setTagId] = useState('');
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
    setCategoryId('');
    setTagId('');
    setSearchParams(updateTitleQuery(searchParams, ''), {replace: true});
  };

  return (
    <main aria-labelledby="music-page-title" className="music-page">
      <header className="music-page__header">
        <Link className="music-page__brand" to="/">255留音机</Link>
        <div>
          <p>全部音乐</p>
          <h1 id="music-page-title">音乐馆</h1>
          <p>从歌名、分类和标签里，找到此刻想听的声音。</p>
        </div>
        <Link className="music-page__home-link" to="/">返回首页</Link>
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
            value={query}
          />
        </label>
        <label>
          <span>分类</span>
          <select
            aria-label="分类"
            onChange={(event) => setCategoryId(event.target.value)}
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
            onChange={(event) => setTagId(event.target.value)}
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
          <h2 id="music-results-title">全部歌曲</h2>
          <p>{results.length} 首</p>
        </header>
        {songs.length === 0 ? (
          <p className="music-page__empty" role="status">曲库还是空的</p>
        ) : results.length === 0 ? (
          <p className="music-page__empty" role="status">没有符合条件的歌曲</p>
        ) : (
          <div className="music-page__song-list">
            {results.map((song) => (
              <article className="music-song-card" key={song.id}>
                {song.coverUrl ? (
                  <img alt="" src={song.coverUrl} />
                ) : (
                  <div aria-hidden="true" className="music-song-card__cover">255</div>
                )}
                <div className="music-song-card__details">
                  <h3>{song.title}</h3>
                  <p>{song.artist}</p>
                  <p>
                    {song.category?.name ?? '未分类'}
                    {song.tags.length > 0 ? ` · ${song.tags.map(({name}) => name).join(' / ')}` : ''}
                  </p>
                </div>
                <button
                  aria-label={`播放 ${song.title}`}
                  onClick={() => void player.playTrack(song.id, resultIds)}
                  type="button"
                >
                  播放
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
