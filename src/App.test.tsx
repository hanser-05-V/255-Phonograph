import {cleanup, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter, useNavigate} from 'react-router-dom';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import type {LibraryResponse} from '../shared/contracts';
import {App} from './App';

const readyLibrary: LibraryResponse = {
  songs: [
    {
      id: 'first-light',
      title: '初光',
      artist: 'Hanser',
      durationSeconds: 120,
      audioUrl: '/api/media/first-light',
      category: null,
      tags: [],
      isFeatured: true,
      isLiveCover: false,
      publishedAt: '2026-09-03T12:00:00.000Z',
    },
    {
      id: 'volcano-planet',
      title: '等火山喷发的小星球',
      artist: 'Hanser',
      durationSeconds: 180,
      audioUrl: '/api/media/volcano-planet',
      category: null,
      tags: [],
      isFeatured: true,
      isLiveCover: false,
      publishedAt: '2026-09-02T12:00:00.000Z',
    },
  ],
  categories: [],
  tags: [],
  sections: {
    recent: ['first-light', 'volcano-planet'],
    featured: ['first-light', 'volcano-planet'],
    liveCovers: [],
  },
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {'Content-Type': 'application/json'},
  });
}

function renderApp(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

function AppWithPublicNavigation() {
  const navigate = useNavigate();
  return (
    <>
      <button onClick={() => navigate('/music')} type="button">打开音乐馆</button>
      <App />
    </>
  );
}

function expectFilingFooter() {
  const footer = screen.getByRole('contentinfo', {name: '网站备案信息'});
  expect(within(footer).getByRole('link', {name: '蜀ICP备2026063099号-1'}))
    .toHaveAttribute('href', 'https://beian.miit.gov.cn/');
  return footer;
}

function mockLibraryScenario(scenario: 'pending' | 'network' | 'http' | 'empty' | 'ready') {
  const responses = {
    pending: () => new Promise<Response>(() => undefined),
    network: () => Promise.reject(new TypeError('Failed to fetch')),
    http: () => Promise.resolve(jsonResponse({
      error: {code: 'LIBRARY_FAILED', message: '曲库读取失败'},
    }, 500)),
    empty: () => Promise.resolve(jsonResponse({...readyLibrary, songs: []})),
    ready: () => Promise.resolve(jsonResponse(readyLibrary)),
  };
  vi.stubGlobal('fetch', vi.fn(responses[scenario]));
}

function mockLibraryWithCover() {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({
    ...readyLibrary,
    songs: readyLibrary.songs.map((song, index) => index === 0
      ? {...song, coverUrl: '/api/media/broken-cover'}
      : song),
  })));
}

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('App', () => {
  it('opens the reading project directly even when the music library is empty', async () => {
    mockLibraryScenario('empty');
    renderApp('/goodnight-radio');
    expect(await screen.findByRole('heading', {name: '晚安电台', level: 1})).toBeInTheDocument();
    expect(screen.getByText('第一段晚安，正在准备。')).toBeInTheDocument();
    expect(screen.queryByRole('button', {name: /播放视频/})).not.toBeInTheDocument();
    expectFilingFooter();
  });

  it('keeps the audio instance and controls across the reading-project route', async () => {
    mockLibraryScenario('ready');
    const NativeAudio = window.Audio;
    const audioConstructor = vi.spyOn(window, 'Audio').mockImplementation(
      function AudioMock() { return new NativeAudio(); },
    );
    const user = userEvent.setup();
    renderApp();
    const mini = await screen.findByRole('region', {name: '迷你播放器'});
    fireEvent.change(within(mini).getByRole('slider', {name: '音量'}), {target: {value: '0.35'}});
    await user.click(within(mini).getByRole('button', {name: '静音'}));
    await user.click(screen.getByRole('link', {name: '进入晚安电台'}));
    expect(screen.getByRole('heading', {name: '晚安电台', level: 1})).toBeInTheDocument();
    expect(screen.getByRole('region', {name: '迷你播放器'})).toBe(mini);
    expect(within(mini).getByRole('slider', {name: '音量'})).toHaveValue('0.35');
    expect(within(mini).getByRole('button', {name: '取消静音'})).toBeInTheDocument();
    expect(audioConstructor).toHaveBeenCalledTimes(1);
  });

  it('shows the real playback queue and plays the selected stable song id', async () => {
    mockLibraryScenario('ready');
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderApp();
    const mini = await screen.findByRole('region', {name: '迷你播放器'});
    await user.click(within(mini).getByRole('button', {name: '播放列表'}));
    const queue = within(mini).getByRole('region', {name: '当前播放列表'});
    await user.click(within(queue).getByRole('button', {name: '播放 等火山喷发的小星球'}));
    expect(within(mini).getByRole('button', {name: '展开播放器'})).toHaveTextContent('等火山喷发的小星球');
    expect(play).toHaveBeenCalledTimes(1);
    await user.keyboard('{Escape}');
    expect(within(mini).queryByRole('region', {name: '当前播放列表'})).not.toBeInTheDocument();
    expect(within(mini).getByRole('button', {name: '播放列表'})).toHaveFocus();
  });
  it.each([
    ['pending', '正在加载曲库…'],
    ['network', '本地服务未运行'],
    ['http', '曲库加载失败'],
    ['empty', '曲库还是空的'],
  ] as const)('renders the distinct %s state without constructing a player', async (scenario, message) => {
    mockLibraryScenario(scenario);
    renderApp();

    expect(await screen.findByRole('status')).toHaveTextContent(message);
    const stateMain = screen.getByRole('main', {name: '曲库状态'});
    expect(stateMain).toHaveAttribute('aria-busy', String(scenario === 'pending'));
    const footer = expectFilingFooter();
    expect(window.getComputedStyle(footer.parentElement!).minHeight).toBe('100vh');
    for (const otherMessage of [
      '正在加载曲库…', '本地服务未运行', '曲库加载失败', '曲库还是空的',
    ].filter((candidate) => candidate !== message)) {
      expect(screen.queryByText(otherMessage)).not.toBeInTheDocument();
    }
    expect(screen.queryByRole('region', {name: '迷你播放器'})).not.toBeInTheDocument();
  });

  it('renders the homepage and persistent player only after the library is ready', async () => {
    mockLibraryScenario('ready');
    renderApp();

    expect(await screen.findByRole('navigation', {name: '主导航'})).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveClass('home-page');
    expect(screen.getByRole('region', {name: '迷你播放器'})).toBeInTheDocument();
    expect(screen.getByRole('heading', {name: '精选歌曲'})).toBeInTheDocument();
    expectFilingFooter();
  });

  it('reserves desktop clearance for the mini-player error state', async () => {
    mockLibraryScenario('ready');
    renderApp();

    await screen.findByRole('navigation', {name: '主导航'});
    const main = screen.getByRole('main');
    expect(main).toHaveClass('page-with-mini-player');
    expect(window.getComputedStyle(expectFilingFooter()).paddingBottom).toBe('208px');
  });

  it('shares expansion state between the persistent and full players', async () => {
    mockLibraryScenario('ready');
    const user = userEvent.setup();
    renderApp();

    const miniPlayer = await screen.findByRole('region', {name: '迷你播放器'});
    await user.click(within(miniPlayer).getByText('初光'));

    expect(screen.getByRole('region', {name: '沉浸式播放器'})).toBeInTheDocument();
    expect(miniPlayer).toHaveAttribute('aria-hidden', 'true');
  });

  it('offers a keyboard-accessible control for expanding the player', async () => {
    mockLibraryScenario('ready');
    const user = userEvent.setup();
    renderApp();

    const miniPlayer = await screen.findByRole('region', {name: '迷你播放器'});
    const expand = within(miniPlayer).getByRole('button', {name: '展开播放器'});
    expand.focus();
    await user.keyboard('{Enter}');

    expect(screen.getByRole('region', {name: '沉浸式播放器'})).toBeInTheDocument();
  });

  it('keeps player controls when the current cover fails', async () => {
    mockLibraryWithCover();
    renderApp();

    const miniPlayer = await screen.findByRole('region', {name: '迷你播放器'});
    fireEvent.error(within(miniPlayer).getByRole('img', {name: '初光 封面'}));

    expect(within(miniPlayer).getByRole('img', {name: '初光 默认封面'})).toBeInTheDocument();
    expect(within(miniPlayer).getByRole('button', {name: '播放'})).toBeEnabled();
  });

  it('uses the same cover fallback in the expanded player', async () => {
    mockLibraryWithCover();
    const user = userEvent.setup();
    renderApp();

    const miniPlayer = await screen.findByRole('region', {name: '迷你播放器'});
    await user.click(within(miniPlayer).getByText('初光'));
    const fullPlayer = screen.getByRole('region', {name: '沉浸式播放器'});
    fireEvent.error(within(fullPlayer).getByRole('img', {name: '初光 封面'}));

    expect(within(fullPlayer).getByRole('img', {name: '初光 默认封面'})).toBeInTheDocument();
    expect(within(fullPlayer).getByRole('button', {name: '播放'})).toBeEnabled();
  });

  it('keeps the admin route independent from public library failures', () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      needsSetup: false,
      authenticated: false,
    }));
    vi.stubGlobal('fetch', fetchMock);
    renderApp('/admin');

    expect(screen.getByRole('main', {name: '管理后台'})).toHaveTextContent('管理后台');
    expect(screen.queryByText('本地服务未运行')).not.toBeInTheDocument();
    expect(screen.queryByRole('contentinfo', {name: '网站备案信息'})).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/auth/status', expect.objectContaining({
      credentials: 'same-origin',
    }));
    expect(fetchMock.mock.calls.map(([url]) => url)).not.toContain('/api/library');
  });

  it('does not expose the fixed admin route in public navigation', async () => {
    mockLibraryScenario('ready');
    renderApp('/');

    await screen.findByRole('navigation', {name: '主导航'});
    expect(screen.queryByRole('link', {name: '管理后台'})).not.toBeInTheDocument();
  });

  it('keeps one player mounted while public routes change', async () => {
    mockLibraryScenario('ready');
    const NativeAudio = window.Audio;
    const audioConstructor = vi.spyOn(window, 'Audio').mockImplementation(
      function AudioMock() { return new NativeAudio(); },
    );
    const user = userEvent.setup();
    render(<MemoryRouter><AppWithPublicNavigation /></MemoryRouter>);

    await screen.findByRole('navigation', {name: '主导航'});
    await waitFor(() => expect(audioConstructor).toHaveBeenCalledTimes(1));
    const footer = expectFilingFooter();
    await user.click(screen.getByRole('button', {name: '打开音乐馆'}));

    expect(await screen.findByRole('main', {name: '音乐馆'})).toBeInTheDocument();
    expect(screen.getByRole('region', {name: '迷你播放器'})).toBeInTheDocument();
    expect(audioConstructor).toHaveBeenCalledTimes(1);
    expect(expectFilingFooter()).toBe(footer);
  });
});
