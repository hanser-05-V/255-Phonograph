import {useState, type FormEvent} from 'react';
import {Link, NavLink, useNavigate} from 'react-router-dom';
import {RecordMark} from '../../components/HanserArtwork';

export function HomeHeader({showSearch = true}: {showSearch?: boolean}) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set('q', searchQuery.trim());
    navigate({pathname: '/music', search: params.size ? `?${params}` : ''});
  };
  return (
    <header className="home-header">
      <Link aria-label="255 留音机首页" className="home-header__brand" to="/">
        <RecordMark /><span>255 留音机<small>hanser 的声音小站</small></span>
      </Link>
      <nav aria-label="主导航">
        <NavLink end to="/">首页</NavLink>
        <NavLink to="/music">音乐馆</NavLink>
        <NavLink to="/goodnight-radio">晚安电台</NavLink>
      </nav>
      {showSearch ? <form className="home-header__search" onSubmit={submitSearch}>
        <label><span className="public-sr-only">搜索</span>
          <input aria-label="按歌名搜索" onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="按歌名搜索" type="search" value={searchQuery} />
        </label>
        <button aria-label="搜索歌曲" type="submit"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="10" cy="10" r="6" /><path d="m15 15 5 5" /></svg></button>
      </form> : null}
    </header>
  );
}
