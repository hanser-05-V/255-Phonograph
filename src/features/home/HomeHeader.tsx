type HomeHeaderProps = {
  query: string;
  onQueryChange: (query: string) => void;
};

export function HomeHeader({query, onQueryChange}: HomeHeaderProps) {
  return (
    <header className="home-header">
      <a className="home-header__brand" href="#home">
        255留音机
      </a>
      <nav aria-label="主导航">
        <a href="#home">首页</a>
        <a href="#music">音乐馆</a>
        <a href="#stories">故事会</a>
      </nav>
      <label className="home-header__search">
        <span>搜索</span>
        <input
          aria-label="搜索歌曲"
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="搜索歌曲或歌手"
          type="search"
          value={query}
        />
      </label>
    </header>
  );
}
