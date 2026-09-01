# 255留音机首页与唱片定位修正 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修正完整播放器唱片的垂直定位，并交付一个由同一播放器驱动、包含今日统计、每日憨曲、搜索、精选歌曲和故事会预览的响应式首页。

**Architecture:** 保留唯一的 `PlayerProvider` 与其创建的唯一 `HTMLAudioElement`，通过新增的 `playTrack(index)` 命令让首页触发选曲播放。首页拆成聚合页、头部、统计、每日功能、精选歌曲和故事预览组件；每日统计由独立 hook 与纯函数负责日期键、本地持久化和计算。唱片改成“外层定位、内层旋转”的两层 DOM/CSS 结构，避免定位变换与旋转动画竞争。

**Tech Stack:** React 19、TypeScript 5.9、Vite 7、Vitest 3、Testing Library、原生 CSS、`localStorage`。

**Spec:** `docs/superpowers/specs/2026-09-01-homepage-and-disc-alignment-design.md`

## Global Constraints

- 只在现有工作树 `E:\codex\hanser\.worktrees\pc-music-player` 和分支 `codex/pc-music-player` 开发，不创建新工作树。
- 不提交 MP3、WAV、图片、视频、渲染结果、`node_modules`、迁移包或其他大体积媒体。
- 首页、歌曲卡、每日憨曲和底部播放器共用同一个 `PlayerProvider` 与同一个音频元素；首页不得直接写 `audio.src`。
- 不破坏自动续播、歌词、频谱、快捷键、进度、音量、静音和展开/收起行为。
- 不增加模糊开屏、滑入、淡入或其他入场动画；保留 `prefers-reduced-motion` 支持。
- 统计按浏览器本地自然日保存；歌曲实际播放超过 10 秒计数；憨浓度为 `min(100, round(totalSeconds / 3600 * 100))`。
- 每日一签只显示“功能筹备中”，必须禁用，不实现抽签逻辑或空白详情页。
- 精选歌曲不出现“安静时刻”；至少展示“等火山喷发的小星球”和“初光”。
- 页面为固定迷你播放器预留空间；最终检查 1280×720 与 1920×1080。
- 每个行为变化遵守 RED → GREEN → REFACTOR；每个任务后提交，并接受规格与代码质量双重审查。

---

## File Map

- `src/features/player/DiscArtwork.tsx`：新增唱片定位包装层；内层 `.disc` 仅旋转。
- `src/styles/global.css`：唱片定位修复，以及首页所有布局、响应式和固定播放器避让样式。
- `src/features/player/PlayerProvider.tsx`：公开并实现 `playTrack(index)`，继续拥有唯一音频元素。
- `src/features/player/PlayerProvider.test.tsx`：覆盖直接选曲播放和单音频控制器。
- `src/features/home/daily-listening.ts`：日期键、零记录、读取/保存、累计和憨浓度纯函数。
- `src/features/home/useDailyListeningStats.ts`：把播放器播放状态按秒写入当天统计。
- `src/features/home/useDailyListeningStats.test.tsx`：覆盖累计、跨日、10 秒歌曲计数、存储异常和 100% 封顶。
- `src/features/home/home-utils.ts`：每日憨曲稳定索引和歌曲搜索纯函数。
- `src/features/home/home-utils.test.ts`：覆盖稳定选择、日期轮换、标题/歌手/空查询匹配。
- `src/features/home/HomeHeader.tsx`：品牌、锚点导航和受控搜索框。
- `src/features/home/ListeningSummary.tsx`：憨浓度、分钟数、歌曲数和继续播放。
- `src/features/home/DailyFeatures.tsx`：每日憨曲播放入口和禁用每日一签。
- `src/features/home/FeaturedTracks.tsx`：真实歌曲卡、搜索结果、无结果和两个整理中集合。
- `src/features/home/StoryPreview.tsx`：三个未开放的故事会预览，不产生详情链接。
- `src/features/home/HomePage.tsx`：组合首页各区域并只使用播放器上下文。
- `src/features/home/HomePage.test.tsx`：覆盖搜索、无结果、每日一签禁用、歌曲卡/每日憨曲共享播放。
- `src/features/player/demo-tracks.ts`：提供规格中的真实展示标题，不引入媒体文件。
- `src/App.tsx`、`src/App.test.tsx`：在唯一 Provider 内组合首页、完整播放器与固定迷你播放器。

---

### Task 1: 用两层结构修复唱片定位

**Files:**
- Modify: `src/features/player/DiscArtwork.tsx`
- Modify: `src/styles/global.css`
- Test: `src/features/player/FullPlayer.test.tsx`

**Interfaces:**
- Consumes: `DiscArtworkProps.isPlaying` 与现有 `.disc[data-playing]` 动画状态。
- Produces: `.disc-artwork__disc-positioner` 负责 `top: 50%` 和 `transform: translateY(-50%)`；`.disc` 只负责旋转。

- [ ] **Step 1: 写出会被旧结构捕获的回归测试**

在 `FullPlayer.test.tsx` 的首个测试中加入真实 DOM 结构断言：

```tsx
const positioner = screen.getByTestId('disc-positioner');
const disc = screen.getByTestId('disc');
expect(positioner).toContainElement(disc);
expect(positioner).toHaveClass('disc-artwork__disc-positioner');
expect(disc).toHaveClass('disc');
expect(positioner).not.toHaveAttribute('data-playing');
expect(disc).toHaveAttribute('data-playing', 'false');
```

该测试捕获的生产缺陷是：删除定位包装层、重新让旋转元素承担垂直定位时应失败。

- [ ] **Step 2: 运行聚焦测试并确认 RED**

Run: `npm run test:run -- src/features/player/FullPlayer.test.tsx`

Expected: FAIL，提示找不到 `disc-positioner`。

- [ ] **Step 3: 增加定位包装层**

将唱片 JSX 改成：

```tsx
<div className="disc-artwork__disc-positioner" data-testid="disc-positioner">
  <div
    aria-hidden="true"
    className="disc"
    data-playing={String(isPlaying)}
    data-testid="disc"
  >
    <div className="disc__surface">
      {coverUrl ? (
        <img alt="" className="disc__art" src={coverUrl} />
      ) : (
        <div className="disc__art disc__art--fallback" />
      )}
      <div className="disc__grooves" />
      <div className="disc__reflection" />
    </div>
    <div className="disc__center-ring" />
  </div>
</div>
```

将定位规则从 `.disc` 移到外层：

```css
.disc-artwork__disc-positioner {
  position: absolute;
  top: 50%;
  right: 0;
  width: min(36vw, 540px);
  aspect-ratio: 1;
  transform: translateY(-50%);
}

.disc {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  animation: disc-spin 18s linear infinite;
  animation-play-state: paused;
  will-change: transform;
}
```

删除 `.disc` 上的 `position`、`top`、`right`、`width`、`aspect-ratio` 和独立 `translate`；在窄屏媒体查询中把宽度覆盖目标改为 `.disc-artwork__disc-positioner`。不新增任何入场动画。

- [ ] **Step 4: 运行聚焦测试并确认 GREEN**

Run: `npm run test:run -- src/features/player/FullPlayer.test.tsx`

Expected: 3 tests passed，播放时 `data-playing=true`，暂停后恢复 `false`，无 `intro-overlay`。

- [ ] **Step 5: 提交任务**

```powershell
git add src/features/player/DiscArtwork.tsx src/features/player/FullPlayer.test.tsx src/styles/global.css
git commit -m "fix: separate disc positioning from rotation"
```

---

### Task 2: 为共享播放器增加 `playTrack(index)`

**Files:**
- Modify: `src/features/player/PlayerProvider.tsx`
- Modify: `src/features/player/PlayerProvider.test.tsx`
- Modify: `src/features/player/PlayerControls.test.tsx`

**Interfaces:**
- Consumes: `tracks: Track[]`、`audioRef`、`isPlayingRef` 和现有曲目切换 effect。
- Produces: `playTrack: (index: number) => Promise<void>`；合法索引切换并播放，当前索引直接播放，非法索引安全返回。

- [ ] **Step 1: 扩展测试 harness 并写失败测试**

在测试 `Harness` 中读取 `audio`、`playTrack`，增加：

```tsx
<p data-testid="audio-identity">{audio ? 'ready' : 'missing'}</p>
<button onClick={() => void playTrack(1)}>播放第二首</button>
```

加入测试：

```tsx
it('plays a requested track through the existing shared audio element', async () => {
  const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
  const user = userEvent.setup();
  const controllers: HTMLAudioElement[] = [];

  function AudioReader() {
    const {audio} = usePlayer();
    if (audio && !controllers.includes(audio)) controllers.push(audio);
    return null;
  }

  render(
    <PlayerProvider tracks={tracks}>
      <Harness />
      <AudioReader />
    </PlayerProvider>,
  );

  await user.click(screen.getByRole('button', {name: '播放第二首'}));
  expect(screen.getByTestId('title')).toHaveTextContent('第二首');
  expect(screen.getByTestId('playing')).toHaveTextContent('true');
  expect(play).toHaveBeenCalledOnce();
  expect(controllers).toHaveLength(1);
});
```

该测试捕获的生产缺陷是：首页选曲只改标题但不播放，或额外创建音频元素。

- [ ] **Step 2: 运行聚焦测试并确认 RED**

Run: `npm run test:run -- src/features/player/PlayerProvider.test.tsx`

Expected: TypeScript/运行失败，`playTrack` 尚不存在。

- [ ] **Step 3: 实现最小共享播放命令**

在 `PlayerContextValue` 增加：

```ts
playTrack: (index: number) => Promise<void>;
```

在 Provider 中实现并放入 memo value：

```ts
const playTrack = useCallback(async (index: number) => {
  const element = audioRef.current;
  if (!element || !Number.isInteger(index) || index < 0 || index >= tracksRef.current.length) {
    return;
  }

  isPlayingRef.current = true;
  setIsPlaying(true);
  setError(null);

  if (index !== currentIndexRef.current) {
    setCurrentIndex(index);
    return;
  }

  try {
    await element.play();
  } catch {
    isPlayingRef.current = false;
    setIsPlaying(false);
    setError(mediaErrorMessage);
  }
}, []);
```

新增 `currentIndexRef` 并在每次 render 同步，确保相同曲目和不同曲目走正确路径。不同曲目继续由已有 `[audio, currentTrack]` effect 设置 `src` 后调用同一元素的 `play()`。给 `PlayerControls.test.tsx` 的 `mockPlayer` 增加 `playTrack: vi.fn().mockResolvedValue(undefined)` 以保持类型完整。

- [ ] **Step 4: 运行 Provider 和控制栏测试并确认 GREEN**

Run: `npm run test:run -- src/features/player/PlayerProvider.test.tsx src/features/player/PlayerControls.test.tsx`

Expected: 两个测试文件全部通过；原有自动续播与控制行为仍通过。

- [ ] **Step 5: 提交任务**

```powershell
git add src/features/player/PlayerProvider.tsx src/features/player/PlayerProvider.test.tsx src/features/player/PlayerControls.test.tsx
git commit -m "feat: expose shared track playback command"
```

---

### Task 3: 实现按自然日保存的听歌统计

**Files:**
- Create: `src/features/home/daily-listening.ts`
- Create: `src/features/home/useDailyListeningStats.ts`
- Create: `src/features/home/useDailyListeningStats.test.tsx`

**Interfaces:**
- Consumes: `isPlaying: boolean`、`trackId: string`、浏览器 `Storage` 和本地日期。
- Produces: `DailyListeningStats {date, totalSeconds, trackSeconds}`、`songCount`、`minutes`、`concentration`；hook 签名 `useDailyListeningStats({isPlaying, trackId}): DailyListeningView`。

- [ ] **Step 1: 先写纯函数和 hook 的失败测试**

测试必须使用手算字面量，不复用生产计算：

```tsx
it('accumulates seconds, counts a track after ten seconds, and caps concentration', () => {
  let stats = createEmptyDailyStats('2026-09-01');
  stats = addListeningSeconds(stats, '2026-09-01', 'track-a', 9);
  expect(toDailyListeningView(stats)).toEqual({
    date: '2026-09-01', totalSeconds: 9, minutes: 0, songCount: 0, concentration: 0,
  });

  stats = addListeningSeconds(stats, '2026-09-01', 'track-a', 1);
  expect(toDailyListeningView(stats).songCount).toBe(0);

  stats = addListeningSeconds(stats, '2026-09-01', 'track-a', 1);
  expect(toDailyListeningView(stats).songCount).toBe(1);

  stats = addListeningSeconds(stats, '2026-09-01', 'track-b', 3600);
  expect(toDailyListeningView(stats).concentration).toBe(100);
});

it('resets when the local date changes', () => {
  const yesterday = addListeningSeconds(createEmptyDailyStats('2026-09-01'), '2026-09-01', 'a', 25);
  expect(addListeningSeconds(yesterday, '2026-09-02', 'b', 1)).toEqual({
    date: '2026-09-02', totalSeconds: 1, trackSeconds: {b: 1},
  });
});

it('falls back to a zero record for malformed or blocked storage', () => {
  const brokenStorage = {getItem: () => { throw new Error('blocked'); }} as unknown as Storage;
  expect(readDailyStats('2026-09-01', brokenStorage)).toEqual(createEmptyDailyStats('2026-09-01'));
});
```

另用 fake timers 渲染一个读取 hook 的 harness，播放 11 秒后断言 `totalSeconds === 11` 且 `songCount === 1`；暂停再推进时钟时总秒数不再增加。该测试捕获的生产缺陷是统计只存在纯函数但未接入真实播放器状态。

- [ ] **Step 2: 运行聚焦测试并确认 RED**

Run: `npm run test:run -- src/features/home/useDailyListeningStats.test.tsx`

Expected: FAIL，模块和导出尚不存在。

- [ ] **Step 3: 实现日期、累计、派生和安全存储纯函数**

`daily-listening.ts` 使用以下公开类型和规则：

```ts
export type DailyListeningStats = {
  date: string;
  totalSeconds: number;
  trackSeconds: Record<string, number>;
};

export type DailyListeningView = {
  date: string;
  totalSeconds: number;
  minutes: number;
  songCount: number;
  concentration: number;
};

export const getLocalDateKey = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export const createEmptyDailyStats = (date: string): DailyListeningStats => ({
  date,
  totalSeconds: 0,
  trackSeconds: {},
});
```

`addListeningSeconds` 先在日期变化时创建零记录，再把有限非负秒数累加到总量和当前曲目；`toDailyListeningView` 使用 `Math.floor(totalSeconds / 60)`、`Object.values(trackSeconds).filter(seconds => seconds > 10).length` 和 `Math.min(100, Math.round(totalSeconds / 3600 * 100))`。存储键为 `255-phonograph:listening:${date}`；JSON 结构无效或 `localStorage` 抛错时回退零记录，写入失败时只保留 React 会话状态。

- [ ] **Step 4: 实现播放器状态到统计的 hook**

`useDailyListeningStats.ts` 用一个 1000ms interval 只在 `isPlaying` 时更新；每次 tick 重新计算本地日期，因此跨午夜会自然切到零记录并写新日期键。`trackId` 变化时后续 tick 记到新曲目，不创建音频元素也不读取/修改音频地址：

```ts
export function useDailyListeningStats({isPlaying, trackId}: {
  isPlaying: boolean;
  trackId: string;
}): DailyListeningView {
  const [stats, setStats] = useState(() => readDailyStats(getLocalDateKey()));

  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setInterval(() => {
      setStats(current => {
        const date = getLocalDateKey();
        const next = addListeningSeconds(current, date, trackId, 1);
        writeDailyStats(next);
        return next;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isPlaying, trackId]);

  return toDailyListeningView(stats);
}
```

- [ ] **Step 5: 运行统计测试并确认 GREEN**

Run: `npm run test:run -- src/features/home/useDailyListeningStats.test.tsx`

Expected: 累计、暂停、跨日、10 秒计数、异常存储和封顶测试全部通过，且 fake timer 在测试后恢复。

- [ ] **Step 6: 提交任务**

```powershell
git add src/features/home/daily-listening.ts src/features/home/useDailyListeningStats.ts src/features/home/useDailyListeningStats.test.tsx
git commit -m "feat: track daily listening locally"
```

---

### Task 4: 实现每日憨曲、搜索与首页内容组件

**Files:**
- Create: `src/features/home/home-utils.ts`
- Create: `src/features/home/home-utils.test.ts`
- Create: `src/features/home/HomeHeader.tsx`
- Create: `src/features/home/ListeningSummary.tsx`
- Create: `src/features/home/DailyFeatures.tsx`
- Create: `src/features/home/FeaturedTracks.tsx`
- Create: `src/features/home/StoryPreview.tsx`
- Create: `src/features/home/HomePage.tsx`
- Create: `src/features/home/HomePage.test.tsx`
- Modify: `src/features/player/demo-tracks.ts`

**Interfaces:**
- Consumes: `usePlayer()` 的 `tracks`、`currentTrack`、`isPlaying`、`toggle`、`playTrack(index)`；Task 3 的统计 hook。
- Produces: `HomePage`；`getDailyTrackIndex(date, count)`；`filterTracks(tracks, query)`；全部实际歌曲按钮只调用 `playTrack(index)`。

- [ ] **Step 1: 写每日选择与搜索纯函数失败测试**

```ts
it('selects the same track for the same date and rotates across dates', () => {
  expect(getDailyTrackIndex('2026-09-01', 3)).toBe(getDailyTrackIndex('2026-09-01', 3));
  expect(getDailyTrackIndex('2026-09-01', 3)).not.toBe(getDailyTrackIndex('2026-09-02', 3));
});

it('matches trimmed title or artist queries and treats empty input as all tracks', () => {
  expect(filterTracks(tracks, '  小星球 ')).toEqual([tracks[1]]);
  expect(filterTracks(tracks, 'HANSER')).toEqual([tracks[1]]);
  expect(filterTracks(tracks, '   ')).toEqual(tracks);
  expect(filterTracks(tracks, '不存在')).toEqual([]);
});
```

该测试捕获的生产缺陷是每日选择依赖随机数或刷新变化，以及搜索只匹配标题、不 trim 或区分大小写。

- [ ] **Step 2: 运行工具测试并确认 RED**

Run: `npm run test:run -- src/features/home/home-utils.test.ts`

Expected: FAIL，模块不存在。

- [ ] **Step 3: 实现稳定选择、搜索并更新展示曲目**

```ts
export const getDailyTrackIndex = (date: string, count: number) => {
  if (count < 1) throw new Error('Daily track selection requires a non-empty queue.');
  const seed = Array.from(date).reduce((total, character) => total + character.charCodeAt(0), 0);
  return seed % count;
};

export const filterTracks = (tracks: Track[], query: string) => {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return tracks;
  return tracks.filter(track =>
    `${track.title} ${track.artist}`.toLocaleLowerCase().includes(normalized),
  );
};
```

把 `demo-tracks.ts` 的展示队列调整为包含：

```ts
{id: 'first-light', title: '初光', artist: 'Hanser', ...}
{id: 'volcano-planet', title: '等火山喷发的小星球', artist: 'Hanser', ...}
{id: 'night-walk', title: '夜行', artist: 'Hanser', ...}
```

保留已有内嵌演示音频和 LRC，不新增媒体文件；任何标题均不得为“安静时刻”。

- [ ] **Step 4: 写首页行为失败测试**

在 `HomePage.test.tsx` 用真实 `PlayerProvider` 渲染 `HomePage`，mock `HTMLMediaElement.play/pause`，覆盖：

```tsx
expect(screen.getByRole('navigation', {name: '主导航'})).toBeInTheDocument();
expect(screen.getByText('今天的憨浓度')).toBeInTheDocument();
expect(screen.getByRole('button', {name: /每日憨曲/})).toBeEnabled();
expect(screen.getByRole('button', {name: '每日一签'})).toBeDisabled();
expect(screen.getByText('功能筹备中')).toBeInTheDocument();
expect(screen.getByText('直播翻唱精选')).toBeInTheDocument();
expect(screen.getByText('持续整理中')).toBeInTheDocument();
expect(screen.getByText('故事会精选')).toBeInTheDocument();
expect(screen.queryByText('安静时刻')).not.toBeInTheDocument();
```

输入 `小星球` 后只显示该真实歌曲；输入 `没有的歌` 后显示“没有找到相关歌曲”且当前播放标题不变；清空后恢复全部。点击“等火山喷发的小星球”和每日憨曲按钮分别断言 `play()` 被调用、迷你播放器/测试 reader 显示对应曲目，并用 reader 收集到的 `audio` identity 断言始终只有一个元素。

- [ ] **Step 5: 运行首页行为测试并确认 RED**

Run: `npm run test:run -- src/features/home/HomePage.test.tsx`

Expected: FAIL，首页组件尚不存在。

- [ ] **Step 6: 实现组件，保持未开放入口不可导航**

`HomePage` 只组合组件并从播放器上下文取状态：

```tsx
export function HomePage() {
  const player = usePlayer();
  const [query, setQuery] = useState('');
  const stats = useDailyListeningStats({
    isPlaying: player.isPlaying,
    trackId: player.currentTrack.id,
  });
  const date = getLocalDateKey();

  return (
    <div className="home-page">
      <HomeHeader query={query} onQueryChange={setQuery} />
      <div className="home-page__content">
        <section className="home-dashboard" aria-label="今日听歌">
          <ListeningSummary stats={stats} isPlaying={player.isPlaying} onContinue={() => void player.toggle()} />
          <DailyFeatures
            dailyTrack={player.tracks[getDailyTrackIndex(date, player.tracks.length)]}
            onPlayDaily={() => void player.playTrack(getDailyTrackIndex(date, player.tracks.length))}
          />
        </section>
        <FeaturedTracks tracks={player.tracks} query={query} onPlayTrack={index => void player.playTrack(index)} />
        <StoryPreview />
      </div>
    </div>
  );
}
```

`HomeHeader` 的锚点为 `#home`、`#music`、`#stories`，搜索输入 `aria-label="搜索歌曲"`。`FeaturedTracks` 用真实 `<button type="button">` 播放歌曲，集合卡只用非交互 `<article>` 显示“直播翻唱精选 / 持续整理中”和“最近加入 / 持续整理中”。`StoryPreview` 三张 `<article>` 显示“故事会精选”“最近更新”“时间轴”及“尚未开放”，不设置 `href`。`DailyFeatures` 的签按钮使用原生 `disabled`。

- [ ] **Step 7: 运行工具与首页测试并确认 GREEN**

Run: `npm run test:run -- src/features/home/home-utils.test.ts src/features/home/HomePage.test.tsx`

Expected: 稳定选择、搜索、无结果、禁用签、真实歌曲播放和单音频元素测试全部通过。

- [ ] **Step 8: 提交任务**

```powershell
git add src/features/home src/features/player/demo-tracks.ts
git commit -m "feat: add daily music homepage content"
```

---

### Task 5: 整合首页、完成响应式布局并做全量验证

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/styles/global.css`

**Interfaces:**
- Consumes: Task 4 的 `HomePage` 与现有 `FullPlayer`、`MiniPlayer`。
- Produces: 唯一 `PlayerProvider` 包裹全部页面和播放器；底部避让、宽屏 2:1/四列、中屏两列、小屏一列。

- [ ] **Step 1: 先写 App 级共享和避让语义测试**

扩展 `App.test.tsx`：

```tsx
it('renders the homepage and persistent player inside one application surface', () => {
  render(<App />);
  expect(screen.getByRole('navigation', {name: '主导航'})).toBeInTheDocument();
  expect(screen.getByRole('main')).toHaveClass('home-page');
  expect(screen.getByRole('region', {name: '迷你播放器'})).toBeInTheDocument();
  expect(screen.getByRole('heading', {name: '精选歌曲'})).toBeInTheDocument();
});
```

保留原有展开完整播放器测试作为唯一 Provider 状态共享的集成保护。该测试捕获的生产缺陷是把首页放到另一个 Provider、移除固定播放器或只留下旧的孤立标题。

- [ ] **Step 2: 运行 App 测试并确认 RED**

Run: `npm run test:run -- src/App.test.tsx`

Expected: FAIL，主内容尚不是 `HomePage`。

- [ ] **Step 3: 在唯一 Provider 内整合应用**

```tsx
function PlayerSurface() {
  const {isExpanded} = usePlayer();
  return (
    <>
      <HomePage />
      {isExpanded ? <FullPlayer /> : null}
      <MiniPlayer />
    </>
  );
}

export function App() {
  return (
    <PlayerProvider tracks={demoTracks}>
      <PlayerSurface />
    </PlayerProvider>
  );
}
```

- [ ] **Step 4: 实现首页视觉与播放器底部避让**

在 `global.css` 中使用以下确定布局值：

```css
.home-page {
  min-height: 100vh;
  padding: 0 40px 208px;
}
.home-header,
.home-page__content {
  width: min(1180px, 100%);
  margin: 0 auto;
}
.home-header {
  display: grid;
  grid-template-columns: auto 1fr minmax(220px, 320px);
  gap: 40px;
  align-items: center;
  min-height: 88px;
}
.home-dashboard {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(280px, 1fr);
  gap: 24px;
}
.track-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;
}
```

卡片沿用蓝黑、暖棕、金色系统；搜索框有可见 label/placeholder/focus 状态；歌曲按钮有 hover/focus 但没有入场 animation/transition。`@media (max-width: 1023px)` 把 header 与 dashboard 垂直堆叠、精选改两列，并把 `.home-page` 底部 padding 提高到 `260px` 以容纳两行迷你播放器；`@media (max-width: 600px)` 改单列、水平 padding 16px。已有完整播放器样式和 reduced-motion 规则必须保留。

- [ ] **Step 5: 运行聚焦测试和完整测试**

Run: `npm run test:run -- src/App.test.tsx src/features/home/HomePage.test.tsx src/features/player/FullPlayer.test.tsx`

Expected: 聚焦测试全部通过。

Run: `npm run test:run`

Expected: 所有测试文件通过，0 failures。

- [ ] **Step 6: 运行生产构建**

Run: `npm run build`

Expected: `tsc --noEmit` 与 `vite build` exit 0；`dist` 不提交。

- [ ] **Step 7: 启动本地页面并按两种视口验收**

Run: `npm run dev -- --host 127.0.0.1`

使用 Browser 插件在 `http://127.0.0.1:5173/` 检查：

- 1280×720：首页最后一行内容可滚动到迷你播放器上方，不被遮挡。
- 1920×1080：首页最大宽度居中，今日区域约 2:1，精选四列。
- 两个视口：展开完整播放器后唱片与封面垂直中心一致，唱片不越过底部控制栏。
- 播放后唱片旋转，暂停后停在当前角度；首页和完整播放器均无模糊开屏、滑入或淡入。
- 搜索标题与歌手、歌曲卡播放、每日憨曲播放、无结果提示、禁用每日一签均可操作或按规格禁用。

若 Browser 插件返回 `Trusted RPC dependency must resolve within a configured trusted code path`，保持 dev server 运行，不改用独立 Playwright/其他浏览器，并把上述项目原样列为用户手工验收清单。

- [ ] **Step 8: 提交整合任务**

```powershell
git add src/App.tsx src/App.test.tsx src/styles/global.css
git commit -m "feat: integrate responsive music homepage"
```

- [ ] **Step 9: 完成前核对提交范围**

Run: `git status --short --branch`

Expected: 分支为 `codex/pc-music-player`，没有意外媒体、`node_modules`、`dist` 或迁移包变更。

Run: `git log --oneline 994419e..HEAD`

Expected: 只包含本计划文档和五个实现任务的本地提交；不推送、不合并、不发布。
