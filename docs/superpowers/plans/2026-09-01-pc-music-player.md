# 255留音机 PC Music Player Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a working PC web player with a persistent mini player, an immersive disc-and-lyrics view, real audio controls, and no opening transition.

**Architecture:** A React context owns one browser `HTMLAudioElement` and exposes a small player command API to every view. Pure modules handle queue navigation, time formatting, and LRC parsing; visual components consume state without controlling audio directly. The Remotion reference contributes only the stable disc/background/lyrics visual language, while browser time and Web Audio replace frame-based behavior.

**Tech Stack:** React, TypeScript, Vite, Vitest, Testing Library, CSS, HTMLAudioElement, Web Audio API

---

## File map

- `package.json`: scripts and exact runtime/test dependencies.
- `index.html`: Vite entry document and Chinese page metadata.
- `tsconfig.json`, `vite.config.ts`: TypeScript, Vite, and Vitest configuration.
- `src/main.tsx`: React entry point.
- `src/App.tsx`: page shell and player view composition.
- `src/styles/global.css`: tokens, reset, layout, responsive rules, and motion policy.
- `src/features/player/types.ts`: public player and track contracts.
- `src/features/player/player-utils.ts`: queue navigation and time formatting.
- `src/features/player/lrc.ts`: LRC parsing and active-line lookup.
- `src/features/player/demo-audio.ts`: generates a short local WAV object URL so controls work before real media arrives.
- `src/features/player/demo-tracks.ts`: replaceable demo metadata and lyrics.
- `src/features/player/PlayerProvider.tsx`: single audio instance, state, commands, media events, and keyboard shortcuts.
- `src/features/player/usePlayer.ts`: guarded context hook.
- `src/features/player/useTrackLyrics.ts`: loads and parses the current track's optional LRC resource.
- `src/features/player/MiniPlayer.tsx`: persistent compact player.
- `src/features/player/FullPlayer.tsx`: immersive player container.
- `src/features/player/DiscArtwork.tsx`: cover and disc presentation with play-state rotation.
- `src/features/player/LyricsPanel.tsx`: synchronized lyric stack.
- `src/features/player/Spectrum.tsx`: progressive-enhancement Web Audio spectrum.
- `src/features/player/PlayerControls.tsx`: transport, seek, volume, and time controls.
- `src/features/player/Icons.tsx`: dependency-free accessible SVG icons.
- `src/features/player/*.test.ts(x)`: focused unit and component tests.
- `src/test/setup.ts`: DOM matchers and media mocks.
- `README.md`: local run instructions and real-song replacement contract.

### Task 1: Create the tested Vite foundation

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/test/setup.ts`
- Create: `src/App.test.tsx`

- [ ] **Step 1: Add package scripts and dependencies**

Create `package.json` with `dev`, `build`, `test`, and `test:run` scripts. Pin React and React DOM to the same version, keep Vite and Vitest in dev dependencies, and configure the project as an ES module.

```json
{
  "name": "255-phonograph",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "test": "vitest",
    "test:run": "vitest run"
  },
  "dependencies": {
    "react": "19.1.1",
    "react-dom": "19.1.1"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "6.8.0",
    "@testing-library/react": "16.3.0",
    "@testing-library/user-event": "14.6.1",
    "@types/react": "19.1.10",
    "@types/react-dom": "19.1.7",
    "@vitejs/plugin-react": "5.0.2",
    "jsdom": "26.1.0",
    "typescript": "5.9.2",
    "vite": "7.1.3",
    "vitest": "3.2.4"
  }
}
```

- [ ] **Step 2: Add the initial failing app test**

```tsx
import {render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';
import {App} from './App';

describe('App', () => {
  it('renders the product name and mini player landmark', () => {
    render(<App />);
    expect(screen.getByRole('heading', {name: '255留音机'})).toBeInTheDocument();
    expect(screen.getByRole('region', {name: '迷你播放器'})).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Install packages and verify the test fails**

Run: `npm install`

Run: `npm run test:run -- src/App.test.tsx`

Expected: FAIL because `App` and the mini player landmark are not implemented.

- [ ] **Step 4: Add the minimal entry and shell**

```tsx
export function App() {
  return (
    <main>
      <h1>255留音机</h1>
      <section role="region" aria-label="迷你播放器" />
    </main>
  );
}
```

- [ ] **Step 5: Run foundation checks**

Run: `npm run test:run -- src/App.test.tsx`

Expected: 1 test passes.

Run: `npm run build`

Expected: TypeScript and Vite finish with exit code 0.

- [ ] **Step 6: Commit the foundation**

```powershell
git add package.json package-lock.json index.html tsconfig.json vite.config.ts src/main.tsx src/App.tsx src/App.test.tsx src/test/setup.ts
git commit -m "build: scaffold PC web player"
```

### Task 2: Add the track, queue, and lyric domain

**Files:**
- Create: `src/features/player/types.ts`
- Create: `src/features/player/player-utils.ts`
- Create: `src/features/player/player-utils.test.ts`
- Create: `src/features/player/lrc.ts`
- Create: `src/features/player/lrc.test.ts`

- [ ] **Step 1: Write failing utility tests**

```ts
import {describe, expect, it} from 'vitest';
import {formatTime, nextIndex, previousIndex} from './player-utils';

describe('player utilities', () => {
  it('formats seconds and clamps invalid values', () => {
    expect(formatTime(65)).toBe('1:05');
    expect(formatTime(Number.NaN)).toBe('0:00');
  });

  it('wraps the queue in both directions', () => {
    expect(nextIndex(2, 3)).toBe(0);
    expect(previousIndex(0, 3)).toBe(2);
  });
});
```

```ts
import {describe, expect, it} from 'vitest';
import {findActiveLyricIndex, parseLrc} from './lrc';

describe('LRC', () => {
  const lyrics = parseLrc('[00:01.00]第一句\n[00:03.50]第二句');

  it('parses and sorts timestamped lines', () => {
    expect(lyrics).toEqual([
      {time: 1, text: '第一句'},
      {time: 3.5, text: '第二句'},
    ]);
  });

  it('finds the active lyric for playback time', () => {
    expect(findActiveLyricIndex(lyrics, 0.5)).toBe(-1);
    expect(findActiveLyricIndex(lyrics, 3.8)).toBe(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:run -- src/features/player/player-utils.test.ts src/features/player/lrc.test.ts`

Expected: FAIL because the modules do not exist.

- [ ] **Step 3: Add the public contracts and pure implementations**

```ts
export type Track = {
  id: string;
  title: string;
  artist: string;
  audioUrl: string;
  coverUrl?: string;
  backgroundUrl?: string;
  lyricsUrl?: string;
};

export type LyricLine = {time: number; text: string};
```

```ts
export const formatTime = (seconds: number) => {
  const safe = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
};

export const nextIndex = (current: number, length: number) =>
  length > 0 ? (current + 1) % length : 0;

export const previousIndex = (current: number, length: number) =>
  length > 0 ? (current - 1 + length) % length : 0;
```

Implement `parseLrc` with `/\[(\d{2}):(\d{2}(?:\.\d+)?)\](.*)/`, trim empty lines, convert minutes to seconds, and sort ascending. Implement `findActiveLyricIndex` as a reverse scan that returns the last line whose timestamp is not later than the current time.

- [ ] **Step 4: Run the domain tests**

Run: `npm run test:run -- src/features/player/player-utils.test.ts src/features/player/lrc.test.ts`

Expected: 4 tests pass.

- [ ] **Step 5: Commit the domain modules**

```powershell
git add src/features/player/types.ts src/features/player/player-utils.ts src/features/player/player-utils.test.ts src/features/player/lrc.ts src/features/player/lrc.test.ts
git commit -m "feat: add player track and lyric domain"
```

### Task 3: Build the shared audio state and demo source

**Files:**
- Create: `src/features/player/demo-audio.ts`
- Create: `src/features/player/demo-tracks.ts`
- Create: `src/features/player/PlayerProvider.tsx`
- Create: `src/features/player/usePlayer.ts`
- Create: `src/features/player/PlayerProvider.test.tsx`

- [ ] **Step 1: Write a failing provider behavior test**

Create a harness that renders `title`, `isPlaying`, `currentTime`, and buttons calling `toggle`, `next`, and `previous`. Mock `HTMLMediaElement.prototype.play` to resolve and `pause` to return normally.

```tsx
it('plays, pauses, and wraps the queue through one shared controller', async () => {
  const user = userEvent.setup();
  render(<PlayerProvider tracks={tracks}><Harness /></PlayerProvider>);
  expect(screen.getByTestId('title')).toHaveTextContent('第一首');
  await user.click(screen.getByRole('button', {name: '播放'}));
  expect(screen.getByTestId('playing')).toHaveTextContent('true');
  await user.click(screen.getByRole('button', {name: '下一首'}));
  expect(screen.getByTestId('title')).toHaveTextContent('第二首');
  await user.click(screen.getByRole('button', {name: '下一首'}));
  expect(screen.getByTestId('title')).toHaveTextContent('第一首');
});
```

- [ ] **Step 2: Run the provider test to verify it fails**

Run: `npm run test:run -- src/features/player/PlayerProvider.test.tsx`

Expected: FAIL because `PlayerProvider` and `usePlayer` do not exist.

- [ ] **Step 3: Implement one audio instance and command API**

Expose this stable shape from context:

```ts
type PlayerContextValue = {
  audio: HTMLAudioElement | null;
  tracks: Track[];
  currentTrack: Track;
  currentIndex: number;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isPlaying: boolean;
  isExpanded: boolean;
  error: string | null;
  toggle: () => Promise<void>;
  next: () => void;
  previous: () => void;
  seek: (seconds: number) => void;
  setVolume: (volume: number) => void;
  toggleMuted: () => void;
  setExpanded: (expanded: boolean) => void;
};
```

Create the audio element once in an effect, attach `timeupdate`, `durationchange`, `play`, `pause`, `ended`, and `error` listeners, and remove them during cleanup. `ended` calls the same wrapped `next` path used by the button，实现自动播放下一首。Changing tracks updates `audio.src` and preserves the intention to keep playing.

Generate a short, low-volume WAV in `demo-audio.ts` using an `ArrayBuffer`, write a valid mono PCM header, fill samples from two sine waves, wrap it in `Blob({type: 'audio/wav'})`, and return `URL.createObjectURL(blob)`. This is a replaceable local demo, not committed media.

Build demo tracks after creating the WAV URL. Provide demo LRC through a `data:text/plain;charset=utf-8,` URL so the public `Track` contract remains identical to real songs and no media file enters Git.

- [ ] **Step 4: Run provider tests**

Run: `npm run test:run -- src/features/player/PlayerProvider.test.tsx`

Expected: provider transport test passes with no unhandled media promise.

- [ ] **Step 5: Commit player state**

```powershell
git add src/features/player/demo-audio.ts src/features/player/demo-tracks.ts src/features/player/PlayerProvider.tsx src/features/player/usePlayer.ts src/features/player/PlayerProvider.test.tsx
git commit -m "feat: add shared browser audio controller"
```

### Task 4: Implement functional controls and the mini player

**Files:**
- Create: `src/features/player/Icons.tsx`
- Create: `src/features/player/PlayerControls.tsx`
- Create: `src/features/player/MiniPlayer.tsx`
- Create: `src/features/player/PlayerControls.test.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Write failing interaction tests**

```tsx
it('connects transport, seek, volume, mute, and expand controls', async () => {
  const user = userEvent.setup();
  render(<TestPlayer />);
  await user.click(screen.getByRole('button', {name: '上一首'}));
  expect(mockPlayer.previous).toHaveBeenCalledOnce();
  await user.click(screen.getByRole('button', {name: '播放'}));
  expect(mockPlayer.toggle).toHaveBeenCalledOnce();
  await user.click(screen.getByRole('button', {name: '下一首'}));
  expect(mockPlayer.next).toHaveBeenCalledOnce();
  fireEvent.change(screen.getByRole('slider', {name: '播放进度'}), {target: {value: '12'}});
  expect(mockPlayer.seek).toHaveBeenCalledWith(12);
  fireEvent.change(screen.getByRole('slider', {name: '音量'}), {target: {value: '0.4'}});
  expect(mockPlayer.setVolume).toHaveBeenCalledWith(0.4);
  await user.click(screen.getByRole('button', {name: '静音'}));
  expect(mockPlayer.toggleMuted).toHaveBeenCalledOnce();
});
```

- [ ] **Step 2: Run the interaction test to verify it fails**

Run: `npm run test:run -- src/features/player/PlayerControls.test.tsx`

Expected: FAIL because the components do not exist.

- [ ] **Step 3: Implement accessible controls**

Every icon button, including 上一首、播放/暂停、下一首 and 静音, receives a visible tooltip or `aria-label`. Use native range inputs for progress and volume. Prevent the mini player's expand click from firing when a nested button or slider is used. `PlayerControls` renders formatted current/duration time and disables seeking until duration is finite and positive.

```tsx
<button type="button" aria-label={isPlaying ? '暂停' : '播放'} onClick={() => void toggle()}>
  {isPlaying ? <PauseIcon /> : <PlayIcon />}
</button>
<input aria-label="播放进度" type="range" min={0} max={duration || 0} value={currentTime} onChange={(event) => seek(Number(event.target.value))} />
<input aria-label="音量" type="range" min={0} max={1} step={0.01} value={volume} onChange={(event) => setVolume(Number(event.target.value))} />
```

- [ ] **Step 4: Run control and app tests**

Run: `npm run test:run -- src/features/player/PlayerControls.test.tsx src/App.test.tsx`

Expected: all control calls and the mini-player landmark pass.

- [ ] **Step 5: Commit functional controls**

```powershell
git add src/App.tsx src/features/player/Icons.tsx src/features/player/PlayerControls.tsx src/features/player/MiniPlayer.tsx src/features/player/PlayerControls.test.tsx
git commit -m "feat: add functional mini player controls"
```

### Task 5: Build the no-intro immersive disc view

**Files:**
- Create: `src/features/player/DiscArtwork.tsx`
- Create: `src/features/player/FullPlayer.tsx`
- Create: `src/features/player/FullPlayer.test.tsx`
- Create: `src/styles/global.css`
- Modify: `src/App.tsx`

- [ ] **Step 1: Write the failing full-player test**

```tsx
it('opens at its final visual state and rotates only while playing', async () => {
  render(<FullPlayer />);
  const disc = screen.getByTestId('disc');
  expect(disc).toHaveAttribute('data-playing', 'false');
  expect(screen.queryByTestId('intro-overlay')).not.toBeInTheDocument();
  expect(screen.getByRole('button', {name: '收起播放器'})).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the view test to verify it fails**

Run: `npm run test:run -- src/features/player/FullPlayer.test.tsx`

Expected: FAIL because the immersive components do not exist.

- [ ] **Step 3: Implement final-position visual components**

`FullPlayer` uses a two-column desktop grid. `DiscArtwork` renders the square cover in front of a circular disc with grooves, a translucent center ring, and `animation-play-state` controlled by `data-playing`.

```css
.disc {
  animation: disc-spin 18s linear infinite;
  animation-play-state: paused;
  will-change: transform;
}
.disc[data-playing='true'] { animation-play-state: running; }
@keyframes disc-spin { to { transform: rotate(360deg); } }
```

Do not add keyframes for scene blur, opacity reveal, cover movement, or disc translation. Apply the fixed background blur directly:

```css
.full-player__backdrop {
  filter: blur(18px) brightness(.48) saturate(1.15);
  transform: scale(1.08);
}
```

- [ ] **Step 4: Run the view tests and build**

Run: `npm run test:run -- src/features/player/FullPlayer.test.tsx`

Expected: the disc state and no-intro assertions pass.

Run: `npm run build`

Expected: exit code 0.

- [ ] **Step 5: Commit the immersive shell**

```powershell
git add src/App.tsx src/styles/global.css src/features/player/DiscArtwork.tsx src/features/player/FullPlayer.tsx src/features/player/FullPlayer.test.tsx
git commit -m "feat: add no-intro immersive disc player"
```

### Task 6: Add synchronized lyrics and live spectrum

**Files:**
- Create: `src/features/player/LyricsPanel.tsx`
- Create: `src/features/player/LyricsPanel.test.tsx`
- Create: `src/features/player/useTrackLyrics.ts`
- Create: `src/features/player/Spectrum.tsx`
- Modify: `src/features/player/FullPlayer.tsx`
- Modify: `src/styles/global.css`

- [ ] **Step 1: Write the failing lyrics test**

```tsx
it('marks the current LRC line and falls back when lyrics are absent', () => {
  const lines = [{time: 1, text: '守候日落'}, {time: 3, text: '开启旅程'}];
  const {rerender} = render(<LyricsPanel lines={lines} currentTime={3.2} />);
  expect(screen.getByText('开启旅程')).toHaveAttribute('aria-current', 'true');
  rerender(<LyricsPanel lines={[]} currentTime={3.2} />);
  expect(screen.getByText('暂无歌词')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the lyric test to verify it fails**

Run: `npm run test:run -- src/features/player/LyricsPanel.test.tsx`

Expected: FAIL because `LyricsPanel` does not exist.

- [ ] **Step 3: Implement lyrics and progressive spectrum**

`useTrackLyrics` fetches the current track's optional `lyricsUrl`, parses the response with `parseLrc`, clears stale lines when the track changes, and ignores aborted requests. `LyricsPanel` sets `aria-current="true"` only on the active line and scrolls that line into view with `block: 'center'` and `behavior: 'smooth'` after the active index changes.

`Spectrum` creates `AudioContext`, `MediaElementAudioSourceNode`, and `AnalyserNode` only after playback begins. Draw 64 mirrored CSS bars from `getByteFrequencyData` inside `requestAnimationFrame`; cancel the frame and disconnect nodes on cleanup. If context creation throws, render nothing and leave playback untouched.

- [ ] **Step 4: Run lyrics tests and the complete suite**

Run: `npm run test:run -- src/features/player/LyricsPanel.test.tsx`

Expected: active-line and no-lyrics cases pass.

Run: `npm run test:run`

Expected: all tests pass with zero unhandled errors.

- [ ] **Step 5: Commit synchronized visuals**

```powershell
git add src/styles/global.css src/features/player/LyricsPanel.tsx src/features/player/LyricsPanel.test.tsx src/features/player/useTrackLyrics.ts src/features/player/Spectrum.tsx src/features/player/FullPlayer.tsx
git commit -m "feat: add synchronized lyrics and spectrum"
```

### Task 7: Complete keyboard, error, fallback, and responsive behavior

**Files:**
- Create: `src/features/player/PlayerKeyboard.test.tsx`
- Modify: `src/features/player/PlayerProvider.tsx`
- Modify: `src/features/player/DiscArtwork.tsx`
- Modify: `src/features/player/FullPlayer.tsx`
- Modify: `src/styles/global.css`

- [ ] **Step 1: Write failing keyboard and error tests**

```tsx
it('maps global keys without stealing input interaction', async () => {
  render(<PlayerProvider tracks={tracks}><Harness /></PlayerProvider>);
  fireEvent.keyDown(window, {code: 'Space'});
  expect(playSpy).toHaveBeenCalledOnce();
  fireEvent.keyDown(window, {code: 'ArrowRight'});
  expect(screen.getByTestId('time')).toHaveTextContent('5');
});
```

Also dispatch an audio `error` event and assert the status region contains `音频加载失败，请尝试其他歌曲。`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test:run -- src/features/player/PlayerKeyboard.test.tsx`

Expected: FAIL because keyboard and user-facing error handling are incomplete.

- [ ] **Step 3: Implement guarded shortcuts and fallbacks**

Ignore shortcuts when the event target is `INPUT`, `TEXTAREA`, `SELECT`, or content-editable. Space toggles playback; ArrowLeft and ArrowRight seek by five seconds with clamping. Render a CSS-generated fallback cover when `coverUrl` is absent, and expose player errors through `role="status"` without blocking other controls.

At widths below 960px, stack artwork over lyrics and keep controls within the viewport. Respect `prefers-reduced-motion` by disabling disc rotation while preserving all controls.

- [ ] **Step 4: Run all automated checks**

Run: `npm run test:run`

Expected: all tests pass.

Run: `npm run build`

Expected: production build succeeds without TypeScript errors.

- [ ] **Step 5: Commit resilience and responsive behavior**

```powershell
git add src/features/player/PlayerKeyboard.test.tsx src/features/player/PlayerProvider.tsx src/features/player/DiscArtwork.tsx src/features/player/FullPlayer.tsx src/styles/global.css
git commit -m "feat: complete resilient player interactions"
```

### Task 8: Browser verification and project handoff

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Document local use and media replacement**

Add exact commands `npm install`, `npm run dev`, `npm run test:run`, and `npm run build`. Document the `Track` fields and state that real MP3/WAV, images, videos, generated output, and `node_modules` stay outside Git.

- [ ] **Step 2: Start the PC site**

Run: `npm run dev -- --host 127.0.0.1`

Expected: Vite prints a local URL and remains running.

- [ ] **Step 3: Verify the visible workflow in the browser**

Open the local URL and verify:

1. The initial page has no blur-to-clear, opacity reveal, cover slide, or disc slide.
2. The mini player is visible and expands when its non-control area is clicked.
3. Play starts audible demo audio, changes the icon to pause, and rotates the disc.
4. Pause freezes the disc without returning it to its initial angle.
5. Previous, next, seek, volume, mute, and keyboard shortcuts update the same player state.
6. The active lyric changes with time and the spectrum moves when Web Audio is available.
7. The full player closes back to the mini player without stopping audio.
8. At 1280x720 and 1920x1080, no important control is clipped or horizontally overflowing.

- [ ] **Step 4: Run final verification from a clean command**

Run: `npm run test:run`

Expected: all tests pass.

Run: `npm run build`

Expected: build exits 0 and creates `dist/`.

Run: `git diff --check`

Expected: no whitespace errors.

- [ ] **Step 5: Commit documentation**

```powershell
git add README.md
git commit -m "docs: add PC player development guide"
```
