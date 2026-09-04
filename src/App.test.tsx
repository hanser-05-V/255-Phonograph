import {cleanup, render, screen, within} from '@testing-library/react';
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
  it.each([
    ['pending', '正在加载曲库…'],
    ['network', '本地服务未运行'],
    ['http', '曲库加载失败'],
    ['empty', '曲库还是空的'],
  ] as const)('renders the distinct %s state without constructing a player', async (scenario, message) => {
    mockLibraryScenario(scenario);
    renderApp();

    expect(await screen.findByRole('status')).toHaveTextContent(message);
    expect(screen.queryByRole('region', {name: '迷你播放器'})).not.toBeInTheDocument();
  });

  it('renders the homepage and persistent player only after the library is ready', async () => {
    mockLibraryScenario('ready');
    renderApp();

    expect(await screen.findByRole('navigation', {name: '主导航'})).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveClass('home-page');
    expect(screen.getByRole('region', {name: '迷你播放器'})).toBeInTheDocument();
    expect(screen.getByRole('heading', {name: '精选歌曲'})).toBeInTheDocument();
  });

  it('reserves desktop clearance for the mini-player error state', async () => {
    mockLibraryScenario('ready');
    renderApp();

    await screen.findByRole('navigation', {name: '主导航'});
    expect(window.getComputedStyle(screen.getByRole('main')).paddingBottom).toBe('208px');
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

  it('keeps the admin route independent from public library failures', () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      needsSetup: false,
      authenticated: false,
    }));
    vi.stubGlobal('fetch', fetchMock);
    renderApp('/admin');

    expect(screen.getByRole('main', {name: '管理后台'})).toHaveTextContent('管理后台');
    expect(screen.queryByText('本地服务未运行')).not.toBeInTheDocument();
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
      () => new NativeAudio(),
    );
    const user = userEvent.setup();
    render(<MemoryRouter><AppWithPublicNavigation /></MemoryRouter>);

    await screen.findByRole('navigation', {name: '主导航'});
    expect(audioConstructor).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', {name: '打开音乐馆'}));

    expect(await screen.findByRole('main', {name: '音乐馆'})).toBeInTheDocument();
    expect(screen.getByRole('region', {name: '迷你播放器'})).toBeInTheDocument();
    expect(audioConstructor).toHaveBeenCalledTimes(1);
  });
});
