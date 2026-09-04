import {useState, type FormEvent} from 'react';
import {Link, useNavigate} from 'react-router-dom';

type HomeHeaderProps = {
  query: string;
  onQueryChange: (query: string) => void;
};

export function HomeHeader({query, onQueryChange}: HomeHeaderProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState(query);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedQuery = searchQuery.trim();
    onQueryChange(trimmedQuery);
    const searchParams = new URLSearchParams();
    if (trimmedQuery.length > 0) {
      searchParams.set('q', trimmedQuery);
    }
    const search = searchParams.toString();
    navigate({pathname: '/music', search: search.length > 0 ? `?${search}` : ''});
  };

  return (
    <header className="home-header">
      <Link className="home-header__brand" to="/">
        255留音机
      </Link>
      <nav aria-label="主导航">
        <Link to="/">首页</Link>
        <Link to="/music">音乐馆</Link>
        <a href="#stories">故事会</a>
      </nav>
      <form className="home-header__search" onSubmit={submitSearch}>
        <label>
          <span>搜索</span>
          <input
            aria-label="按歌名搜索"
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="按歌名搜索"
            type="search"
            value={searchQuery}
          />
        </label>
      </form>
    </header>
  );
}
