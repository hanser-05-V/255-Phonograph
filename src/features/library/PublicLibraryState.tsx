import type {LibraryStatus} from './LibraryProvider';

const stateMessages: Record<Exclude<LibraryStatus, 'ready'>, string> = {
  loading: '正在加载曲库…',
  unavailable: '本地服务未运行',
  error: '曲库加载失败',
  empty: '曲库还是空的',
};

export function PublicLibraryState({status}: {status: Exclude<LibraryStatus, 'ready'>}) {
  return (
    <main aria-label="曲库状态">
      <p role="status">{stateMessages[status]}</p>
    </main>
  );
}
