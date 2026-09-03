# 255留音机本地曲库与音乐管理后台 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不破坏现有播放器体验的前提下，为“255留音机”增加可一键启动的本地 TypeScript/Fastify 服务、SQLite 动态曲库、项目外媒体存储、管理员后台、独立音乐馆，以及基于稳定歌曲编号的播放器与今日统计恢复能力。

**Architecture:** 同一仓库内保留 React/Vite 前端，并新增 Fastify 服务端；服务端通过 Node.js 24 的 `node:sqlite` 管理版本化数据库，通过 `MediaStore` 接口访问项目外数据目录。普通页面先加载公开曲库，再创建唯一的 `PlayerProvider` 和唯一 `HTMLAudioElement`；后台走独立的受会话保护接口，上传先落临时区，业务保存成功后再原子转为正式媒体。

**Tech Stack:** Node.js 24、TypeScript 5.9、React 19、React Router、Vite 7、Fastify、`node:sqlite`、Vitest 3、Testing Library、`@fastify/cookie`、`@fastify/multipart`、`@fastify/static`、`music-metadata`、`file-type`、原生 CSS、浏览器 `localStorage`。

**Spec:** `docs/superpowers/specs/2026-09-03-local-music-library-admin-design.md`（批准提交：`b294e86`）

## Global Constraints

- 只在现有工作树 `E:\codex\hanser\.worktrees\pc-music-player`、分支 `codex/pc-music-player` 中实施；不得在主仓库 `main` 分支直接开发，也不得重建工作树。
- Node.js 主版本固定为 24；SQLite 使用 Node.js 24 自带的 `node:sqlite`，不引入另一个 SQLite 原生绑定。
- 普通页面、首页歌曲卡、音乐馆、每日憨曲、迷你播放器和完整播放器必须共用一个 `PlayerProvider` 与一个 `HTMLAudioElement`；页面组件不得直接设置 `audio.src`。
- 必须保护现有播放/暂停、上一首/下一首、进度、音量、静音、自动续播、LRC 同步、实时频谱、键盘快捷键、唱片布局、展开/收起和今日统计行为。
- 动态曲库和播放器持久化必须使用稳定歌曲编号，不得依赖数组索引；恢复后始终暂停，不得自动播放。
- 生命周期术语固定映射为 `draft=草稿`、`published=已发布`、`unlisted=已下架`、`trashed=回收站`；不得引入第五种隐含状态。
- 音乐馆搜索或筛选结果形成临时播放列表，上一首、下一首和自动续播只在该列表内循环；回到全部歌曲后恢复完整曲库队列。
- 首页分区只按发布时间和后台标记生成，本阶段不增加手动排序能力。
- 音频只接受 MP3/M4A 且不超过 200 MB；封面只接受 JPG/PNG/WebP 且不超过 10 MB；LRC 可上传或粘贴编辑，格式错误可保存草稿但不得随错误歌词发布。
- 所有服务端集成测试必须使用测试自己的临时数据目录和临时数据库；不得读写真实曲库目录。
- 数据目录、数据库、密码配置、会话、临时上传、正式媒体、运行时示范音频、`node_modules`、`dist` 和 `server-dist` 必须被 Git 忽略。
- 不提交 MP3、M4A、WAV、JPG、PNG、WebP、数据库、密码、运行数据、迁移数据包、`node_modules` 或其他大体积媒体；允许提交的迁移只包含结构和必要元数据代码。
- 不实现云端部署、域名、对象存储、APK/iOS、普通账号系统、登录绑定、评论/点赞/举报、故事会上传、普通用户上传、批量导入、断点续传、转码、密码找回、自动备份或多用户扩容。
- 不增加开屏、滑入、淡入或其他入场动画；继续支持 `prefers-reduced-motion`。
- 每个任务严格执行 RED → GREEN → REFACTOR；聚焦测试通过后再跑受影响回归；每项实现分别做规格符合性审查和代码质量审查，审查通过后才到建议提交点。
- 本计划中的提交命令只是后续执行建议；编写计划阶段不提交、不推送、不合并、不部署。

---

## Dependency Order

1. Task 1 建立服务端构建、测试和统一启动骨架。
2. Tasks 2–3 建立数据库与存储边界；二者完成后才允许实现认证、上传和歌曲业务。
3. Task 4 依赖数据库；Task 5 依赖认证与存储；Tasks 6–7 依赖前述全部后端基础。
4. Task 8 在歌曲生命周期稳定后公开只读曲库和媒体流。
5. Task 9 建立前端路由和曲库加载边界；Tasks 10–12 在此基础上完成后台。
6. Task 13 先把唯一播放器迁移到稳定编号、动态队列和暂停恢复；Tasks 14–15 再接音乐馆和首页。
7. Task 16 只在所有功能任务通过后进行异常状态、响应式、全量回归和浏览器验收。

## One Task Per Window Delivery Protocol

本计划严格采用“一个任务、一个新窗口、一次独立提交、一次 GitHub 推送”的串行方式。任何窗口都不得顺手执行下一任务。

### Window start gate

每个新窗口收到交接提示词后必须先做只读检查：

```powershell
git branch --show-current
git status --short --branch
git log -5 --oneline --decorate
git rev-parse HEAD
```

只有同时满足下列条件才开始该窗口的唯一任务：

- 工作树是 `E:\codex\hanser\.worktrees\pc-music-player`。
- 分支是 `codex/pc-music-player`，不得切到主仓库 `main`。
- `HEAD` 与交接提示词中的“预期前置提交 SHA”完全相同。
- 工作区没有未解释的改动；如果存在用户改动，必须保留并先报告冲突，不得覆盖、重置或清理。
- 已读取本计划的 Global Constraints、Shared Interface Contract、当前任务全文，以及批准规格中与当前任务相关的章节；不得重新做需求访谈、架构选择或范围讨论。

### Single-task implementation gate

- 当前窗口只能修改该任务 `Files` 列出的路径。若测试驱动过程证明必须扩大路径，先列出新增路径、原因、影响和验证方式，并取得用户明确批准。
- 若执行环境提供 `superpowers:executing-plans`，只用它执行当前一个任务；不得用多任务或子代理模式跨越窗口边界。
- 严格执行当前任务列出的失败测试 → RED → 最小实现 → GREEN → 重构/回归 → 规格符合性审查 → 代码质量审查。
- 不能用跳过测试、降低断言、宽泛 `any`、删除既有回归测试或提交生成物来换取通过。
- 当前任务全部验证成功前不得提交；提交后不得修改历史、不得 amend 已推送提交、不得 force push。

### Commit and GitHub push gate

每个任务使用任务内给定的提交信息创建一个独立提交，然后执行：

```powershell
git status --short --branch
git show --stat --oneline --decorate HEAD
git push origin codex/pc-music-player
git status --short --branch
git rev-parse HEAD
git ls-remote --heads origin codex/pc-music-player
```

完成条件是：推送命令成功、工作区干净、本地分支不再领先远端，并且 `git rev-parse HEAD` 与 `git ls-remote` 返回的远端分支 SHA 相同。推送失败时留在当前窗口处理或向用户报告，不得把任务称为完成，也不得生成下一任务的可执行交接提示词。

### Required handoff output

推送验证成功后，当前窗口的最终答复必须包含：

1. 本任务结果摘要。
2. 实际修改文件列表。
3. RED、GREEN、回归、类型检查/构建（如果当前任务要求）的实际命令与结果。
4. 规格符合性审查和代码质量审查结论。
5. 已推送的提交信息与完整 40 位 SHA。
6. 一个可直接复制到新窗口的交接提示词；生成后停止，不执行下一任务。

交接提示词必须使用实际值替换以下字段，不得留下占位内容：

```text
请继续开发 GitHub 项目“255留音机”。

工作树：E:\codex\hanser\.worktrees\pc-music-player
分支：codex/pc-music-player
预期前置提交：{刚刚推送并核验的完整 40 位 SHA}
批准规格：docs/superpowers/specs/2026-09-03-local-music-library-admin-design.md
实施计划：docs/superpowers/plans/2026-09-03-local-music-library-admin.md

前一窗口已完成并推送：Task {已完成编号} — {已完成标题}
本窗口只执行：Task {下一编号} — {下一标题}

开始前只读检查当前分支、工作区状态、最近提交和 HEAD；HEAD 必须等于上述预期前置提交。保留已有改动，不创建新工作树，不在主仓库 main 分支开发。

已批准规格和实施计划是最终需求，不重新访谈、设计或扩大范围。严格按当前任务的 Files、Interfaces 和步骤执行 TDD：先写失败测试并确认 RED，再做最小实现、GREEN、重构与回归，然后分别完成规格符合性审查和代码质量审查。

本窗口不得执行其他任务。若需要修改当前任务 Files 之外的路径，先按 AGENTS.md 列出新增写入范围并取得明确批准。

用户已明确要求并授权：本任务验证通过并创建独立提交后，使用非强制方式推送该提交到 origin/codex/pc-music-player。该授权不包含 force push、合并或部署。

完成后使用计划指定的提交信息创建一个独立提交，推送到 origin/codex/pc-music-player；禁止 force push、合并或部署。核验本地 HEAD 与远端分支 SHA 一致后，报告测试和审查证据，并生成下一任务的新窗口交接提示词。不要在本窗口开始下一任务。
```

Task 16 推送成功后不生成 Task 17，而是把“本窗口只执行”替换为“只读最终审阅：对照批准规格审查 Task 1–16 的全部提交、测试证据、禁止文件和浏览器验收；不得修改、合并或部署”。

### Handoff sequence

| 完成窗口 | 下一新窗口唯一任务 |
| --- | --- |
| 计划文档提交 | Task 1 — 建立本地服务端骨架与统一启动方式 |
| Task 1 | Task 2 — 初始化 SQLite、执行版本升级并生成过渡歌曲 |
| Task 2 | Task 3 — 建立本地媒体目录和可替换存储接口 |
| Task 3 | Task 4 — 实现管理密码、安全会话和管理接口保护 |
| Task 4 | Task 5 — 实现音频、封面和 LRC 上传校验与取消 |
| Task 5 | Task 6 — 实现分类和标签管理 |
| Task 6 | Task 7 — 实现歌曲草稿、编辑和完整生命周期 |
| Task 7 | Task 8 — 提供公开动态曲库和媒体分段读取 |
| Task 8 | Task 9 — 建立前端路由、曲库客户端和普通页面加载边界 |
| Task 9 | Task 10 — 实现管理后台首次设置、登录和会话门 |
| Task 10 | Task 11 — 实现分类、标签和管理密码设置页面 |
| Task 11 | Task 12 — 实现管理歌曲页面、上传进度和生命周期操作 |
| Task 12 | Task 13 — 将唯一播放器接入稳定编号、动态队列和暂停恢复 |
| Task 13 | Task 14 — 新增独立音乐馆、歌名搜索和筛选播放列表 |
| Task 14 | Task 15 — 将首页分区和今日统计接入动态曲库 |
| Task 15 | Task 16 — 完成响应式、异常状态、全量回归和浏览器验收 |
| Task 16 | 只读最终审阅窗口 |

## File Map

### Repository and shared contracts

- `package.json`、`package-lock.json`：增加服务端、路由、媒体识别、统一启动与分组测试依赖和脚本。
- `.nvmrc`：固定 Node.js 24。
- `.env.example`：只记录可公开的本地配置键，不包含密码或真实数据路径。
- `.gitignore`：排除本地数据、数据库、媒体、会话、上传临时文件和双端构建产物。
- `tsconfig.json`、`tsconfig.server.json`：分别约束浏览器和服务端类型检查，并共同包含 `shared/`。
- `vite.config.ts`、`vitest.server.config.ts`：限制客户端测试范围，建立服务端 Node 测试环境和开发代理。
- `shared/contracts.ts`：普通曲库、后台、上传、分类/标签和错误响应的跨端类型。
- `shared/lrc.ts`：LRC 解析与发布校验的单一实现；现有播放器从兼容导出继续使用。

### Server

- `server/config.ts`：解析端口、数据目录、数据库路径、媒体目录和会话 Cookie 配置。
- `server/app.ts`、`server/index.ts`：可注入依赖的 Fastify 应用工厂与真实启动入口。
- `server/test/test-context.ts`：为每个集成测试创建/销毁独立临时目录、数据库、媒体存储和应用。
- `server/db/database.ts`：打开 SQLite、启用外键/WAL、事务辅助和关闭连接。
- `server/db/migrate.ts`、`server/db/migrations/001-initial.ts`：受控版本升级及初始结构。
- `server/db/seed-transition-songs.ts`、`server/media/create-demo-audio.ts`：首次初始化三首过渡歌曲和数据目录内的运行时 WAV。
- `server/storage/media-store.ts`、`server/storage/local-media-store.ts`：可替换存储接口与本地目录适配器。
- `server/auth/password.ts`、`server/auth/admin-auth-service.ts`、`server/auth/require-admin.ts`：安全密码哈希、会话生命周期和路由保护。
- `server/media/media-validation.ts`、`server/media/audio-metadata.ts`、`server/media/upload-service.ts`：文件限制、真实类型/时长识别、临时上传与取消。
- `server/taxonomy/taxonomy-service.ts`：分类和标签的规范化、唯一性和删除规则。
- `server/songs/song-validation.ts`、`server/songs/song-service.ts`：草稿、重复确认、发布校验、编辑、媒体替换和生命周期。
- `server/http/range.ts`：严格解析单段 HTTP Range。
- `server/routes/admin-auth.ts`、`admin-uploads.ts`、`admin-taxonomy.ts`、`admin-songs.ts`、`admin-settings.ts`、`public-library.ts`、`media.ts`：边界校验和 HTTP 映射。

### Frontend

- `src/api/http.ts`、`src/api/library-api.ts`、`src/api/admin-api.ts`：统一 JSON 错误、公开曲库和后台请求。
- `src/features/library/LibraryProvider.tsx`：加载状态、错误状态和动态曲库刷新。
- `src/features/library/MusicPage.tsx`、`music-filter.ts`：歌名搜索、单分类/标签筛选和结果队列。
- `src/features/admin/*`：认证门、后台布局、歌曲列表/编辑、上传、分类标签、回收站和设置页面。
- `src/features/admin/test/*`、`src/features/library/test/*`：可复用的路由渲染、XHR 控制和字面量曲库夹具，不进入生产 bundle。
- `src/features/player/player-persistence.ts`：播放器快照读取、校验、队列清理与保存。
- `src/features/player/types.ts`、`PlayerProvider.tsx` 及现有播放器组件：改用稳定编号和动态队列，同时保持唯一音频元素与全部现有能力。
- `src/features/home/*`：改用公开曲库分区和稳定编号，并兼容既有今日统计。
- `src/App.tsx`、`src/main.tsx`：路由、普通页面曲库门、后台分支和唯一播放器装配。
- `src/styles/global.css`、`src/styles/library.css`、`src/styles/admin.css`：现有视觉延续、底部安全空间、后台/音乐馆布局和三档视口。
- 与每个模块相邻的 `*.test.ts` / `*.test.tsx`：先失败的单元和集成测试。

---

## Shared Interface Contract

执行 Task 1 时先建立错误/健康类型，Tasks 4–9 逐步补齐以下最终公共契约；字段名不得在后续任务自行改写：

```ts
export type SongStatus = 'draft' | 'published' | 'unlisted' | 'trashed';
export type MediaKind = 'audio' | 'cover';

export type TaxonomyItem = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type PublicSong = {
  id: string;
  title: string;
  artist: string;
  durationSeconds: number;
  audioUrl: string;
  coverUrl?: string;
  lyricsUrl?: string;
  category: TaxonomyItem | null;
  tags: TaxonomyItem[];
  versionNote?: string;
  performanceDate?: string;
  sourceUrl?: string;
  isFeatured: boolean;
  isLiveCover: boolean;
  publishedAt: string;
};

export type LibraryResponse = {
  songs: PublicSong[];
  categories: TaxonomyItem[];
  tags: TaxonomyItem[];
  sections: {
    recent: string[];
    featured: string[];
    liveCovers: string[];
  };
};

export type AdminMediaSummary = {
  id: string;
  originalName: string;
  mimeType: string;
  byteSize: number;
};

export type AdminSong = {
  id: string;
  title: string;
  artist: string;
  status: SongStatus;
  statusBeforeTrash: 'draft' | 'unlisted' | null;
  durationSeconds: number | null;
  audio: AdminMediaSummary | null;
  cover: AdminMediaSummary | null;
  lyricsText: string;
  categoryId: string | null;
  tagIds: string[];
  versionNote: string;
  performanceDate: string;
  sourceUrl: string;
  isFeatured: boolean;
  isLiveCover: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SongDraftInput = {
  title: string;
  artist: string;
  audioUploadId?: string;
  coverUploadId?: string;
  lyricsText: string;
  categoryId: string | null;
  tagIds: string[];
  versionNote: string;
  performanceDate: string;
  sourceUrl: string;
  isFeatured: boolean;
  isLiveCover: boolean;
  confirmDuplicate: boolean;
  confirmAudioReplacement: boolean;
};

export type PendingMediaUpload = {
  uploadId: string;
  kind: MediaKind;
  originalName: string;
  mimeType: string;
  byteSize: number;
  durationSeconds: number | null;
};

export type LrcUploadResult = {
  text: string;
  valid: boolean;
  errors: Array<{line: number; message: string}>;
};

export type ApiErrorBody = {
  error: {code: string; message: string; details?: unknown};
};
```

前端 `Track` 最终精确为 `Pick<PublicSong, 'id' | 'title' | 'artist' | 'audioUrl' | 'coverUrl' | 'lyricsUrl'>` 加现有可选 `backgroundUrl`；首页分区读取 `PublicSong`，播放器只消费 `Track`。

---

### Task 1: 建立本地服务端骨架与统一启动方式

**Files:**
- Create: `.nvmrc`
- Create: `.env.example`
- Create: `tsconfig.server.json`
- Create: `vitest.server.config.ts`
- Create: `server/config.ts`
- Create: `server/config.test.ts`
- Create: `server/app.ts`
- Create: `server/app.test.ts`
- Create: `server/index.ts`
- Create: `shared/contracts.ts`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `tsconfig.json`
- Modify: `vite.config.ts`
- Modify: `.gitignore`
- Modify: `README.md`

**Interfaces:**
- Produces: `resolveAppConfig(env, cwd): AppConfig`，其中 `AppConfig = {host, port, dataDir, databasePath, mediaDir, sessionCookieName}`。
- Produces: `buildApp(deps): Promise<FastifyInstance>`；后续路由只向该工厂注册，不直接监听端口。
- Produces scripts: `dev` 同时启动 Vite/Fastify，`build` 构建双端，`start` 启动本地正式服务，`test:client`/`test:server`/`test:run` 分组运行。

- [ ] **Step 1: 写配置与健康检查的失败测试**

`server/config.test.ts` 先固定项目外默认路径和显式覆盖行为：

```ts
it('keeps runtime data outside the repository and allows an explicit test directory', () => {
  const config = resolveAppConfig(
    {LOCALAPPDATA: 'C:\\Users\\tester\\AppData\\Local'},
    'E:\\repo\\pc-music-player',
  );
  expect(config.dataDir).toBe('C:\\Users\\tester\\AppData\\Local\\255-phonograph');
  expect(config.dataDir.startsWith('E:\\repo\\pc-music-player')).toBe(false);

  const overridden = resolveAppConfig(
    {PHONOGRAPH_DATA_DIR: 'E:\\tmp\\phonograph-test'},
    'E:\\repo\\pc-music-player',
  );
  expect(overridden.databasePath).toBe('E:\\tmp\\phonograph-test\\library.sqlite');
});
```

`server/app.test.ts` 使用 `app.inject()`：

```ts
it('answers health checks without opening a network port', async () => {
  const app = await buildApp({config: testConfig});
  const response = await app.inject({method: 'GET', url: '/api/health'});
  expect(response.statusCode).toBe(200);
  expect(response.json()).toEqual({ok: true});
  await app.close();
});
```

- [ ] **Step 2: 运行服务端聚焦测试并确认 RED**

Run: `npm run test:server -- server/config.test.ts server/app.test.ts`

Expected: FAIL；服务端测试配置、`resolveAppConfig` 和 `buildApp` 尚不存在。

- [ ] **Step 3: 增加依赖、配置和脚本**

执行阶段使用 npm 更新锁文件，不手改依赖树：

```powershell
npm install fastify @fastify/cookie @fastify/multipart @fastify/static react-router-dom music-metadata file-type
npm install --save-dev @types/node concurrently tsx
```

`package.json` 的脚本收敛为：

```json
{
  "engines": {"node": ">=24 <25"},
  "scripts": {
    "dev": "concurrently -k -n web,server \"npm:dev:web\" \"npm:dev:server\"",
    "dev:web": "vite",
    "dev:server": "tsx watch server/index.ts",
    "typecheck": "tsc --noEmit && tsc -p tsconfig.server.json --noEmit",
    "build": "npm run typecheck && vite build && tsc -p tsconfig.server.json",
    "start": "node server-dist/server/index.js",
    "test": "vitest",
    "test:client": "vitest run",
    "test:server": "vitest run --config vitest.server.config.ts",
    "test:run": "npm run test:client && npm run test:server"
  }
}
```

`.nvmrc` 只包含 `24`。`vite.config.ts` 将客户端测试限制为 `src/**/*.test.{ts,tsx}`，并代理 `/api` 到 `http://127.0.0.1:3001`。`vitest.server.config.ts` 使用 `environment: 'node'`、`include: ['server/**/*.test.ts']`。`tsconfig.server.json` 输出到 `server-dist`，包含 `server/**/*.ts` 和 `shared/**/*.ts`，排除测试文件。

`.env.example` 只列出 `PHONOGRAPH_HOST=127.0.0.1`、`PHONOGRAPH_PORT=3001`、空值 `PHONOGRAPH_DATA_DIR=` 和 `NODE_ENV=development`；`shared/contracts.ts` 先定义健康检查和统一 `{error: {code, message, details?}}` 响应类型，后续任务在同一文件扩展业务 DTO。

- [ ] **Step 4: 实现最小配置和应用工厂**

`resolveAppConfig` 按 `PHONOGRAPH_DATA_DIR` → Windows `LOCALAPPDATA/255-phonograph` → `os.homedir()/.255-phonograph` 的顺序解析；默认 `host=127.0.0.1`、`port=3001`、Cookie 名 `phonograph_admin_session`。`buildApp` 先只注册 Cookie、`GET /api/health` 和统一错误 JSON；`server/index.ts` 创建数据目录、构建应用并监听。生产模式由 Fastify 静态托管 `dist/`，未知的非 `/api` GET 回退到 `index.html`，API 404 仍返回 JSON。

- [ ] **Step 5: GREEN、重构与回归**

Run: `npm run test:server -- server/config.test.ts server/app.test.ts`

Expected: PASS，且测试没有监听真实端口。

Run: `npm run test:client && npm run typecheck`

Expected: 当前全部客户端测试通过，双端类型检查为 0 errors。提取 `registerStaticFrontend()`，避免测试应用隐式读取真实 `dist/`。

- [ ] **Step 6: 规格符合性审查**

检查 `git diff -- package.json .gitignore server vite.config.ts tsconfig.server.json README.md`：必须看到 Node 24、同命令双启动、本地正式 `start`、项目外数据目录；不得出现云端、APK、账号或真实密码/路径。

- [ ] **Step 7: 代码质量审查**

确认应用工厂可注入、测试不占用端口、配置解析无仓库内默认回退、前后端测试不重复收集、进程退出会 `app.close()`，Windows 路径通过 `node:path` 生成而非字符串拼接。

- [ ] **Step 8: 建议独立提交点**

```powershell
git add .nvmrc .env.example .gitignore package.json package-lock.json tsconfig.json tsconfig.server.json vite.config.ts vitest.server.config.ts README.md shared/contracts.ts server/config.ts server/config.test.ts server/app.ts server/app.test.ts server/index.ts
git commit -m "build: add local server runtime"
```

- [ ] **Step 9: 推送并核验 Task 1 提交**

Run: `git push origin codex/pc-music-player`

Expected: 推送成功；`git status --short --branch` 显示工作区干净且不领先远端，本地与远端分支 SHA 相同。

- [ ] **Step 10: 生成 Task 2 新窗口交接提示词**

按 Required handoff output 使用实际 Task 1 SHA，下一任务精确填写“Task 2 — 初始化 SQLite、执行版本升级并生成过渡歌曲”。输出提示词后停止。

---

### Task 2: 初始化 SQLite、执行版本升级并生成过渡歌曲

**Files:**
- Create: `server/db/database.ts`
- Create: `server/db/migrate.ts`
- Create: `server/db/migrate.test.ts`
- Create: `server/db/migrations/001-initial.ts`
- Create: `server/db/seed-transition-songs.ts`
- Create: `server/db/seed-transition-songs.test.ts`
- Create: `server/media/create-demo-audio.ts`
- Create: `server/test/test-context.ts`
- Modify: `server/app.ts`
- Modify: `server/index.ts`

**Interfaces:**
- Produces: `openDatabase(databasePath): DatabaseSync`、`runMigrations(db): void`、`withTransaction(db, work): T`。
- Produces: `seedTransitionSongs(db, mediaStore): Promise<void>`；稳定歌曲编号固定为 `first-light`、`volcano-planet`、`night-walk`，与现有浏览器统计键兼容。
- Database statuses: `'draft' | 'published' | 'unlisted' | 'trashed'`。

- [ ] **Step 1: 写首次/重复迁移和过渡数据的失败测试**

```ts
it('creates version 1 once with every required table', () => {
  const db = openDatabase(':memory:');
  runMigrations(db);
  runMigrations(db);
  const names = db.prepare("SELECT name FROM sqlite_master WHERE type='table'")
    .all().map((row) => row.name);
  expect(names).toEqual(expect.arrayContaining([
    'schema_migrations', 'songs', 'categories', 'tags', 'song_tags',
    'media_objects', 'pending_uploads', 'admin_config', 'admin_sessions',
    'pending_media_cleanup',
  ]));
  expect(db.prepare('SELECT version FROM schema_migrations').all()).toEqual([{version: 1}]);
});

it('seeds the three published transition songs and runtime media only once', async () => {
  const context = await createTestContext();
  await seedTransitionSongs(context.db, context.mediaStore);
  await seedTransitionSongs(context.db, context.mediaStore);
  expect(context.db.prepare('SELECT id, title, status FROM songs ORDER BY id').all()).toEqual([
    {id: 'first-light', title: '初光', status: 'published'},
    {id: 'night-walk', title: '夜行', status: 'published'},
    {id: 'volcano-planet', title: '等火山喷发的小星球', status: 'published'},
  ]);
  expect(await context.listRuntimeMedia()).toHaveLength(3);
  await context.dispose();
});
```

- [ ] **Step 2: 运行数据库测试并确认 RED**

Run: `npm run test:server -- server/db/migrate.test.ts server/db/seed-transition-songs.test.ts`

Expected: FAIL；数据库、迁移、测试上下文和种子模块尚不存在。

- [ ] **Step 3: 实现受控初始结构**

`001-initial.ts` 必须在一个事务内创建：

```text
schema_migrations(version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)
songs(id TEXT PRIMARY KEY, title TEXT NOT NULL DEFAULT '', artist TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK status IN ('draft','published','unlisted','trashed'),
  status_before_trash TEXT, duration_seconds REAL, audio_media_id TEXT, cover_media_id TEXT,
  lyrics_text TEXT, category_id TEXT, version_note TEXT, performance_date TEXT, source_url TEXT,
  is_featured INTEGER NOT NULL DEFAULT 0, is_live_cover INTEGER NOT NULL DEFAULT 0,
  published_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)
categories(id TEXT PRIMARY KEY, name TEXT NOT NULL, normalized_name TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL)
tags(id TEXT PRIMARY KEY, name TEXT NOT NULL, normalized_name TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL)
song_tags(song_id TEXT NOT NULL, tag_id TEXT NOT NULL, PRIMARY KEY(song_id, tag_id))
media_objects(id TEXT PRIMARY KEY, kind TEXT NOT NULL, storage_key TEXT NOT NULL UNIQUE,
  original_name TEXT NOT NULL, mime_type TEXT NOT NULL, byte_size INTEGER NOT NULL,
  created_at TEXT NOT NULL)
pending_uploads(id TEXT PRIMARY KEY, owner_session_digest TEXT NOT NULL, kind TEXT NOT NULL,
  temporary_key TEXT NOT NULL UNIQUE, original_name TEXT NOT NULL, mime_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL, duration_seconds REAL, lrc_text TEXT, created_at TEXT NOT NULL)
admin_config(singleton INTEGER PRIMARY KEY CHECK singleton = 1, password_hash TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL)
admin_sessions(digest TEXT PRIMARY KEY, expires_at TEXT NOT NULL, revoked_at TEXT,
  created_at TEXT NOT NULL)
pending_media_cleanup(id TEXT PRIMARY KEY, storage_key TEXT NOT NULL, reason TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0, last_error TEXT, created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL)
```

所有外键明确声明 `ON DELETE` 行为；`PRAGMA foreign_keys=ON`，文件数据库启用 WAL。迁移只存结构和必要元数据，不包含 `.sqlite` 文件或用户数据。

- [ ] **Step 4: 生成过渡媒体并幂等种子化**

`create-demo-audio.ts` 在内存中生成短 WAV 字节；`seedTransitionSongs` 只在对应稳定编号缺失时写入媒体对象和已发布歌曲，三首歌分别保存独立不可猜测 `storage_key`，`published_at` 使用固定且有序的 ISO 时间。运行时文件写到测试/真实 `mediaDir`，永不写入仓库；种子失败时回滚数据库并删除本次已生成文件。

- [ ] **Step 5: GREEN、重构与回归**

Run: `npm run test:server -- server/db/migrate.test.ts server/db/seed-transition-songs.test.ts`

Expected: PASS；重复运行仍只有 migration version 1、三首歌曲和三份运行时音频。

Run: `npm run test:server -- server/app.test.ts`

Expected: PASS。将固定时钟和 ID 生成器注入种子函数，测试不得依赖真实当前时间或随机结果。

- [ ] **Step 6: 规格符合性审查**

逐表对照规格第 6.2、6.5 节；确认稳定 ID、独立发布时间、分类一对多、标签多对多、会话摘要、清理队列和三首指定过渡歌曲均有落点，且不存在提交媒体的步骤。

- [ ] **Step 7: 代码质量审查**

确认迁移事务化且幂等；所有查询参数化；测试上下文只删除自己创建的临时目录；关闭数据库后再清理；外键和唯一索引有测试；种子代码不复用浏览器 `URL.createObjectURL`。

- [ ] **Step 8: 建议独立提交点**

```powershell
git add server/db server/media/create-demo-audio.ts server/test/test-context.ts server/app.ts server/index.ts
git commit -m "feat: initialize local music database"
```

- [ ] **Step 9: 推送并核验 Task 2 提交**

Run: `git push origin codex/pc-music-player`

Expected: 推送成功；工作区干净，本地与远端 `codex/pc-music-player` SHA 完全相同。

- [ ] **Step 10: 生成 Task 3 新窗口交接提示词**

按 Required handoff output 使用实际 Task 2 SHA，下一任务精确填写“Task 3 — 建立本地媒体目录和可替换存储接口”。输出提示词后停止。

---

### Task 3: 建立本地媒体目录和可替换存储接口

**Files:**
- Create: `server/storage/media-store.ts`
- Create: `server/storage/local-media-store.ts`
- Create: `server/storage/local-media-store.test.ts`
- Modify: `server/test/test-context.ts`
- Modify: `server/db/seed-transition-songs.ts`

**Interfaces:**
- Produces:

```ts
type MediaKind = 'audio' | 'cover';
type StoredMedia = {storageKey: string; byteSize: number};
interface MediaStore {
  createTemporary(kind: MediaKind): Promise<{temporaryKey: string}>;
  writeTemporary(temporaryKey: string, source: AsyncIterable<Uint8Array>, options: {
    signal?: AbortSignal;
    onProgress?: (writtenBytes: number) => void;
  }): Promise<number>;
  promote(temporaryKey: string): Promise<StoredMedia>;
  open(storageKey: string, range?: {start: number; end: number}): Promise<{
    stream: NodeJS.ReadableStream; byteSize: number; contentLength: number;
  }>;
  delete(storageKey: string): Promise<void>;
  cleanupTemporary(temporaryKey: string): Promise<void>;
  cleanupStaleTemporary(olderThan: Date): Promise<number>;
}
```

- [ ] **Step 1: 写临时写入、原子提升、范围读取、取消清理的失败测试**

在 `local-media-store.test.ts` 内定义 `chunks(text)`、`readStream(stream)` 两个局部辅助函数，并从 `node:fs/promises` 导入 `readdir`，不把测试辅助方法加入生产接口：

```ts
it('promotes a temporary upload to an opaque final key and reads a byte range', async () => {
  const store = new LocalMediaStore(tempDirectory);
  const {temporaryKey} = await store.createTemporary('audio');
  const progress: number[] = [];
  await store.writeTemporary(temporaryKey, chunks('abcdef'), {
    onProgress: (bytes) => progress.push(bytes),
  });
  const stored = await store.promote(temporaryKey);
  expect(stored.storageKey).not.toContain('abcdef');
  expect(stored.storageKey).not.toContain('song.mp3');
  expect(progress.at(-1)).toBe(6);
  expect(await readStream((await store.open(stored.storageKey, {start: 1, end: 3})).stream))
    .toBe('bcd');
});

it('removes partial bytes when the upload is aborted', async () => {
  const controller = new AbortController();
  const {temporaryKey} = await store.createTemporary('cover');
  controller.abort();
  await expect(store.writeTemporary(temporaryKey, chunks('partial'), {
    signal: controller.signal,
  })).rejects.toMatchObject({name: 'AbortError'});
  expect(await readdir(path.join(tempDirectory, 'tmp'))).toEqual([]);
});
```

- [ ] **Step 2: 运行存储测试并确认 RED**

Run: `npm run test:server -- server/storage/local-media-store.test.ts`

Expected: FAIL；接口和本地适配器尚不存在。

- [ ] **Step 3: 实现最小本地适配器**

构造函数只接受已解析的 `mediaDir`；内部固定使用 `tmp/` 和 `objects/` 两层。`createTemporary` 与 `promote` 使用 `randomUUID()` 生成不含原文件名的键；同卷 `rename()` 完成原子提升。写入逐 chunk 累计字节并回调进度；收到 abort 或写入异常时关闭句柄并删除临时文件。`open` 先 `stat`，再以明确 start/end 创建只读流；所有键先用严格 UUID/内部格式校验，禁止 `..`、分隔符和绝对路径。

- [ ] **Step 4: 实现失效临时文件清理**

`cleanupStaleTemporary(olderThan)` 只枚举 `tmp/` 的直属合法文件，按修改时间删除并返回数量；单文件删除失败继续处理其他文件并汇总为可记录错误。应用启动后清理超过 24 小时的临时文件，但测试通过注入时间和临时目录验证，不等待真实时间。

- [ ] **Step 5: GREEN、重构与回归**

Run: `npm run test:server -- server/storage/local-media-store.test.ts server/db/seed-transition-songs.test.ts`

Expected: PASS；完整读取、闭区间范围、取消、提升、删除和陈旧清理全部通过。

将流复制和安全删除提取为私有小函数；不得把绝对路径放入 `StoredMedia` 或任何 API DTO。

- [ ] **Step 6: 规格符合性审查**

确认接口覆盖“临时上传、进度、校验后原子转正、Range 打开、删除、失效临时清理”，正式文件名不可猜测，原始文件名不参与路径，且本地适配器之外没有直接文件访问。

- [ ] **Step 7: 代码质量审查**

重点检查路径穿越、符号链接逃逸、流错误后的句柄关闭、Windows rename 语义、重复删除的幂等性和 abort 竞态；任何递归清理只能指向测试创建的临时目录或配置解析后的 `tmp/` 子目录。

- [ ] **Step 8: 建议独立提交点**

```powershell
git add server/storage server/test/test-context.ts server/db/seed-transition-songs.ts
git commit -m "feat: add replaceable local media storage"
```

- [ ] **Step 9: 推送并核验 Task 3 提交**

Run: `git push origin codex/pc-music-player`

Expected: 推送成功；工作区干净，本地与远端 `codex/pc-music-player` SHA 完全相同。

- [ ] **Step 10: 生成 Task 4 新窗口交接提示词**

按 Required handoff output 使用实际 Task 3 SHA，下一任务精确填写“Task 4 — 实现管理密码、安全会话和管理接口保护”。输出提示词后停止。

---

### Task 4: 实现管理密码、安全会话和管理接口保护

**Files:**
- Create: `server/auth/password.ts`
- Create: `server/auth/password.test.ts`
- Create: `server/auth/admin-auth-service.ts`
- Create: `server/auth/admin-auth-service.test.ts`
- Create: `server/auth/require-admin.ts`
- Create: `server/routes/admin-auth.ts`
- Create: `server/routes/admin-auth.test.ts`
- Modify: `server/app.ts`
- Modify: `server/test/test-context.ts`
- Modify: `shared/contracts.ts`

**Interfaces:**
- Produces: `hashPassword(password): Promise<string>`、`verifyPassword(password, encoded): Promise<boolean>`；编码只含 scrypt 参数、随机 salt 和派生摘要。
- Produces: `AdminAuthService.setup/login/logout/changePassword/verifySession`。
- HTTP: `GET /api/admin/auth/status`，`POST /setup`、`/login`、`/logout`、`/password`；成功会话使用 HttpOnly、SameSite=Strict Cookie，固定有效期 7 天。
- Produces: `requireAdmin(request, reply)`，所有后续管理写接口复用。

- [ ] **Step 1: 写密码、会话和未授权拦截的失败测试**

```ts
it('stores a salted scrypt hash and never the plaintext password', async () => {
  const first = await hashPassword('correct horse battery staple');
  const second = await hashPassword('correct horse battery staple');
  expect(first).not.toBe(second);
  expect(first).not.toContain('correct horse battery staple');
  await expect(verifyPassword('correct horse battery staple', first)).resolves.toBe(true);
  await expect(verifyPassword('wrong password', first)).resolves.toBe(false);
});

it('supports setup, login, logout, password change and protected-route rejection', async () => {
  const context = await createTestContext();
  expect((await context.app.inject({url: '/api/admin/auth/status'})).json())
    .toEqual({needsSetup: true, authenticated: false});
  const setup = await context.app.inject({method: 'POST', url: '/api/admin/auth/setup',
    payload: {password: 'owner-password'}});
  expect(setup.statusCode).toBe(201);
  expect(setup.headers['set-cookie']).toContain('HttpOnly');
  expect(setup.headers['set-cookie']).toContain('SameSite=Strict');
  await context.dispose();
});
```

同文件再覆盖：二次 setup 为 409、错误密码为 401、无 Cookie 的保护路由为 401、退出后旧 token 失效、改密撤销全部既有会话、数据库中只出现 token 的 SHA-256 摘要而非原 token。

- [ ] **Step 2: 运行认证测试并确认 RED**

Run: `npm run test:server -- server/auth/password.test.ts server/auth/admin-auth-service.test.ts server/routes/admin-auth.test.ts`

Expected: FAIL；密码与认证模块尚不存在。

- [ ] **Step 3: 实现密码哈希和会话服务**

密码使用 `node:crypto` 的异步 `scrypt`、每次 16 字节随机 salt、64 字节摘要和 `timingSafeEqual`；编码格式固定为 `scrypt$16384$8$1$<salt-base64url>$<hash-base64url>`。接口层要求密码 8–200 个 Unicode 字符。登录生成 32 字节随机 token，只把 `sha256(token)` 存入 `admin_sessions.digest`；`verifySession` 同时检查 `revoked_at IS NULL` 和 `expires_at > now`。

- [ ] **Step 4: 注册 Cookie、认证路由和保护钩子**

Cookie 固定 `HttpOnly; SameSite=Strict; Path=/; Max-Age=604800`；只在显式 HTTPS 配置时增加 `Secure`，localhost HTTP 可用。首次设置用事务保证只能成功一次；改密先验证当前密码，更新哈希并撤销所有会话，再签发新会话。响应和日志都不得包含密码、哈希或 session digest。

在 `server/test/test-context.ts` 增加 `createAuthenticatedTestContext()`：它只在自己的临时数据库内完成首次设置并返回测试 Cookie，供所有后续管理路由测试复用。

- [ ] **Step 5: GREEN、重构与回归**

Run: `npm run test:server -- server/auth/password.test.ts server/auth/admin-auth-service.test.ts server/routes/admin-auth.test.ts`

Expected: PASS，覆盖首次设置、重复设置、登录、失败登录、退出、改密和未授权。

Run: `npm run test:server -- server/app.test.ts server/db/migrate.test.ts`

Expected: PASS。把时间、token 生成器注入 service，使过期/撤销测试确定化。

- [ ] **Step 6: 规格符合性审查**

确认 `/admin` 所需的唯一身份层级已具备：首次创建独立密码、安全哈希、HttpOnly/SameSite Cookie、退出和登录后改密；不存在找回、重置、普通账号或明文密码存储。

- [ ] **Step 7: 代码质量审查**

检查时序安全比较、畸形哈希返回 false 而非崩溃、setup 竞态、过期会话清理、Cookie 清除属性一致、所有管理写路由都能复用同一 preHandler，不在日志打印敏感 payload。

- [ ] **Step 8: 建议独立提交点**

```powershell
git add server/auth server/routes/admin-auth.ts server/routes/admin-auth.test.ts server/app.ts server/test/test-context.ts shared/contracts.ts
git commit -m "feat: secure local admin sessions"
```

- [ ] **Step 9: 推送并核验 Task 4 提交**

Run: `git push origin codex/pc-music-player`

Expected: 推送成功；工作区干净，本地与远端 `codex/pc-music-player` SHA 完全相同。

- [ ] **Step 10: 生成 Task 5 新窗口交接提示词**

按 Required handoff output 使用实际 Task 4 SHA，下一任务精确填写“Task 5 — 实现音频、封面和 LRC 上传校验与取消”。输出提示词后停止。

---

### Task 5: 实现音频、封面和 LRC 上传校验与取消

**Files:**
- Create: `shared/lrc.ts`
- Create: `server/media/media-validation.ts`
- Create: `server/media/media-validation.test.ts`
- Create: `server/media/audio-metadata.ts`
- Create: `server/media/audio-metadata.test.ts`
- Create: `server/media/upload-service.ts`
- Create: `server/media/upload-service.test.ts`
- Create: `server/routes/admin-uploads.ts`
- Create: `server/routes/admin-uploads.test.ts`
- Modify: `src/features/player/lrc.ts`
- Modify: `src/features/player/lrc.test.ts`
- Modify: `server/app.ts`
- Modify: `shared/contracts.ts`

**Interfaces:**
- Produces: `validateLrc(content): {valid: boolean; errors: Array<{line: number; message: string}>}` 与现有 `parseLrc(content): LyricLine[]`。
- Produces: `validateUpload(kind, {originalName, declaredMime, detectedMime, byteSize})`；限制音频 200 MiB、封面 10 MiB。
- Produces: `UploadService.ingestAudio/ingestCover/ingestLrc/cancel`；音频/封面返回会话绑定的 `uploadId`，LRC 返回可编辑文本和校验结果。
- HTTP: `POST /api/admin/uploads/audio|cover|lrc`、`DELETE /api/admin/uploads/:uploadId`，全部要求有效管理会话。

- [ ] **Step 1: 写类型、大小、时长和 LRC 格式的失败测试**

```ts
it.each([
  ['audio', 'song.mp3', 'audio/mpeg', 'audio/mpeg', 200 * 1024 * 1024],
  ['audio', 'song.m4a', 'audio/mp4', 'audio/mp4', 1024],
  ['cover', 'cover.webp', 'image/webp', 'image/webp', 10 * 1024 * 1024],
] as const)('accepts valid %s uploads', (kind, originalName, declaredMime, detectedMime, byteSize) => {
  expect(() => validateUpload(kind, {originalName, declaredMime, detectedMime, byteSize}))
    .not.toThrow();
});

it('rejects mismatched content and one byte above each limit', () => {
  expect(() => validateUpload('audio', {
    originalName: 'fake.mp3', declaredMime: 'audio/mpeg', detectedMime: 'image/png',
    byteSize: 1024,
  })).toThrowError('音频文件内容与格式不匹配');
  expect(() => validateUpload('cover', {
    originalName: 'large.png', declaredMime: 'image/png', detectedMime: 'image/png',
    byteSize: 10 * 1024 * 1024 + 1,
  })).toThrowError('封面不能超过 10 MB');
});

it('reports exact invalid LRC lines while allowing empty lyrics', () => {
  expect(validateLrc('')).toEqual({valid: true, errors: []});
  expect(validateLrc('[00:01.20]第一句\n坏的时间标签')).toEqual({
    valid: false,
    errors: [{line: 2, message: '歌词行缺少有效时间标签'}],
  });
});
```

上传服务测试注入伪 `detectFileType` 和 `probeAudioDuration`，覆盖：无法识别时长仍返回可用于草稿的 upload、客户端 abort 删除临时文件、校验失败删除临时文件、非所属会话不能取消、LRC 上传完成后不遗留二进制临时文件。

- [ ] **Step 2: 运行上传聚焦测试并确认 RED**

Run: `npm run test:server -- server/media/media-validation.test.ts server/media/audio-metadata.test.ts server/media/upload-service.test.ts server/routes/admin-uploads.test.ts`

Expected: FAIL；校验、上传服务和路由尚不存在。

- [ ] **Step 3: 统一 LRC 解析和发布校验**

把时间标签解析移到 `shared/lrc.ts`；允许空文本、空行、标准元信息标签（如 `[ar:...]`）以及一个歌词行上的多个 `[mm:ss.xx]` 标签。非空歌词行只要没有完整时间标签、秒数大于等于 60 或括号残缺，就返回带 1-based 行号的错误。`src/features/player/lrc.ts` 只从 shared 重新导出 `parseLrc` 和 `findActiveLyricIndex`，原有歌词同步测试必须保持通过。

- [ ] **Step 4: 实现流式上传、真实类型和时长探测**

`@fastify/multipart` 每次只接受一个文件并设置硬限制；先写 `MediaStore` 临时区，同时累计字节并在超限时立即 abort。完成后用 `file-type` 检查实际内容：MP3=`audio/mpeg`，M4A 接受 MP4 family 且扩展为 `.m4a`，封面仅 JPG/PNG/WebP。音频通过 `music-metadata` 读取有限且大于 0 的秒数；`audio-metadata.test.ts` mock `parseFile` 分别验证正常 duration、缺失 duration 和解析异常，后两者都返回 `null`。探测失败不拒绝草稿。LRC 限制为 UTF-8 `.lrc`，读取为文本后删除临时二进制，只返回文本和错误列表。

- [ ] **Step 5: 实现会话绑定的待处理上传和取消**

音频/封面验证成功后写 `pending_uploads`，字段含 upload ID、会话 digest、临时 key、原名、检测 MIME、字节数、时长和创建时间。取消必须同时匹配 upload ID 与当前 session digest，随后删数据库行和临时文件；失败/取消不得创建 `songs` 或 `media_objects`。路由把断开的请求映射为 `AbortSignal`，413/415/422 使用稳定错误码 `FILE_TOO_LARGE`、`UNSUPPORTED_MEDIA_TYPE`、`INVALID_MEDIA`。

- [ ] **Step 6: GREEN、重构与回归**

Run: `npm run test:server -- server/media/media-validation.test.ts server/media/audio-metadata.test.ts server/media/upload-service.test.ts server/routes/admin-uploads.test.ts`

Expected: PASS，覆盖成功、类型/大小失败、取消、清理、无时长和未授权。

Run: `npm run test:client -- src/features/player/lrc.test.ts src/features/player/useTrackLyrics.test.tsx src/features/player/LyricsPanel.test.tsx`

Expected: 现有解析、请求切换、无歌词提示和同步高亮全部通过。重构后检测器、时钟和存储均从构造参数注入，测试不需要提交音频/图片夹具。

- [ ] **Step 7: 规格符合性审查**

逐项确认 MP3/M4A 200 MB、JPG/PNG/WebP 10 MB、进度所需字节回调、取消、失败重传、自动时长、LRC 上传/粘贴、错误歌词只限草稿、业务失败可清理均有明确实现和测试；不得加入断点续传或转码。

- [ ] **Step 8: 代码质量审查**

检查声明 MIME 不能绕过真实内容检测、边界值按字节准确、错误日志不含歌词全文、abort 只清理本次 temp key、流背压有效、pending upload 有 24 小时启动清理策略，播放器仍使用原有公开 LRC 函数。

- [ ] **Step 9: 建议独立提交点**

```powershell
git add shared/lrc.ts server/media server/routes/admin-uploads.ts server/routes/admin-uploads.test.ts server/app.ts shared/contracts.ts src/features/player/lrc.ts src/features/player/lrc.test.ts
git commit -m "feat: validate local media uploads"
```

- [ ] **Step 10: 推送并核验 Task 5 提交**

Run: `git push origin codex/pc-music-player`

Expected: 推送成功；工作区干净，本地与远端 `codex/pc-music-player` SHA 完全相同。

- [ ] **Step 11: 生成 Task 6 新窗口交接提示词**

按 Required handoff output 使用实际 Task 5 SHA，下一任务精确填写“Task 6 — 实现分类和标签管理”。输出提示词后停止。

---

### Task 6: 实现分类和标签管理

**Files:**
- Create: `server/taxonomy/taxonomy-service.ts`
- Create: `server/taxonomy/taxonomy-service.test.ts`
- Create: `server/routes/admin-taxonomy.ts`
- Create: `server/routes/admin-taxonomy.test.ts`
- Modify: `server/app.ts`
- Modify: `shared/contracts.ts`

**Interfaces:**
- Produces: `TaxonomyService.list/create/rename/deleteCategory` 与 `list/create/rename/deleteTag`。
- HTTP: `GET|POST /api/admin/categories|tags`，`PATCH|DELETE /api/admin/categories/:id|tags/:id`。
- Name rule: 显示名 trim 后 1–50 字符；唯一键为 Unicode NFKC、trim、连续空白折叠、locale lowercase 后的 `normalized_name`。

- [ ] **Step 1: 写唯一性、改名和关系清理的失败测试**

`taxonomy-service.test.ts` 内定义 `seedSongTaxonomy`、`readSong` 和 `readTagIds`，它们只操作该测试的内存数据库：

```ts
it('normalizes names and rejects duplicate categories and tags', () => {
  const service = new TaxonomyService(db, fixedClock, fixedIds);
  const category = service.createCategory('  直播   翻唱 ');
  expect(category.name).toBe('直播 翻唱');
  expect(() => service.createCategory('直播 翻唱')).toThrowError('分类名称已存在');
  const tag = service.createTag('温柔');
  expect(() => service.renameTag(tag.id, '  温柔  ')).not.toThrow();
});

it('clears a deleted category and cascades only the deleted tag relation', () => {
  const {songId, categoryId, keptTagId, removedTagId} = seedSongTaxonomy(db);
  service.deleteCategory(categoryId);
  service.deleteTag(removedTagId);
  expect(readSong(db, songId).categoryId).toBeNull();
  expect(readTagIds(db, songId)).toEqual([keptTagId]);
});
```

路由测试再断言所有写请求无 Cookie 为 401、列表需要登录、空名/超长名为 400、冲突为 409。

- [ ] **Step 2: 运行分类标签测试并确认 RED**

Run: `npm run test:server -- server/taxonomy/taxonomy-service.test.ts server/routes/admin-taxonomy.test.ts`

Expected: FAIL；服务和路由尚不存在。

- [ ] **Step 3: 实现最小服务和路由**

分类删除由外键 `ON DELETE SET NULL` 清空歌曲分类；标签删除由 `song_tags ON DELETE CASCADE` 只移除对应关系，不删除歌曲。ID 使用 UUID；返回 DTO 固定 `{id, name, createdAt, updatedAt}`，按规范化名称排序。所有写接口使用 `requireAdmin`，输入只接受 JSON object 和已声明字段。

- [ ] **Step 4: GREEN、重构与回归**

Run: `npm run test:server -- server/taxonomy/taxonomy-service.test.ts server/routes/admin-taxonomy.test.ts server/routes/admin-auth.test.ts`

Expected: PASS；认证流程、分类标签 CRUD、唯一性和关系清理全部通过。抽出一个内部 `normalizeTaxonomyName`，但保持分类和标签方法分别命名，避免把表名作为未经校验的 SQL 字符串插值。

- [ ] **Step 5: 规格符合性审查**

确认歌曲只能引用后台预先创建的一个分类和多个标签；重复/同义拼写通过规范化阻止；删除词条不删除歌曲；普通接口尚未暴露草稿数据。

- [ ] **Step 6: 代码质量审查**

检查所有 SQL 参数化、改名保留稳定 ID、冲突响应稳定、Unicode 规范化有测试、事务覆盖改名/删除关系、服务层不依赖 Fastify request 对象。

- [ ] **Step 7: 建议独立提交点**

```powershell
git add server/taxonomy server/routes/admin-taxonomy.ts server/routes/admin-taxonomy.test.ts server/app.ts shared/contracts.ts
git commit -m "feat: manage music taxonomy"
```

- [ ] **Step 8: 推送并核验 Task 6 提交**

Run: `git push origin codex/pc-music-player`

Expected: 推送成功；工作区干净，本地与远端 `codex/pc-music-player` SHA 完全相同。

- [ ] **Step 9: 生成 Task 7 新窗口交接提示词**

按 Required handoff output 使用实际 Task 6 SHA，下一任务精确填写“Task 7 — 实现歌曲草稿、编辑和完整生命周期”。输出提示词后停止。

---

### Task 7: 实现歌曲草稿、编辑和完整生命周期

**Files:**
- Create: `server/songs/song-validation.ts`
- Create: `server/songs/song-validation.test.ts`
- Create: `server/songs/song-service.ts`
- Create: `server/songs/song-service.test.ts`
- Create: `server/media/cleanup-service.ts`
- Create: `server/media/cleanup-service.test.ts`
- Create: `server/routes/admin-songs.ts`
- Create: `server/routes/admin-songs.test.ts`
- Modify: `server/app.ts`
- Modify: `server/index.ts`
- Modify: `shared/contracts.ts`

**Interfaces:**
- Produces: `SongService.listAdmin/getAdmin/createDraft/update/publish/unpublish/moveToTrash/restore/permanentlyDelete`。
- Draft input: 精确使用全局 `SongDraftInput`；空字符串、`null` 和空数组分别表示未填写的可选文本、分类和标签，只有 upload ID 可省略。
- HTTP: `GET|POST /api/admin/songs`、`GET|PUT /api/admin/songs/:id`、`POST /:id/publish|unpublish|trash|restore`、`DELETE /:id`；永久删除 body 必须为 `{confirmSongId: id}`。

- [ ] **Step 1: 写发布校验、重复确认和状态机的失败测试**

`song-service.test.ts` 内定义 `seedDraft`、`seedPublishableDraft`、`seedTrashedSongWithMedia` 和固定 clock/ID 生成器；所有媒体使用测试临时目录：

```ts
it('keeps incomplete media as a draft but rejects publication', async () => {
  const song = await service.createDraft(session, {
    title: '未完成', artist: '', tagIds: [], isFeatured: false, isLiveCover: false,
    confirmDuplicate: false, confirmAudioReplacement: false,
  });
  expect(song.status).toBe('draft');
  await expect(service.publish(song.id)).rejects.toMatchObject({
    code: 'SONG_NOT_PUBLISHABLE',
    details: expect.arrayContaining(['artist', 'audio', 'duration']),
  });
});

it('requires confirmation for an exact title and artist duplicate', async () => {
  await seedDraft(service, {title: '初光', artist: 'Hanser'});
  await expect(seedDraft(service, {title: '初光', artist: 'Hanser'}))
    .rejects.toMatchObject({code: 'DUPLICATE_CONFIRMATION_REQUIRED'});
  await expect(seedDraft(service, {
    title: '初光', artist: 'Hanser', confirmDuplicate: true,
  })).resolves.toMatchObject({title: '初光'});
});

it('enforces draft/published/unlisted/trash transitions and stable ids', async () => {
  const song = await seedPublishableDraft(service);
  const id = song.id;
  expect((await service.publish(id)).status).toBe('published');
  await expect(service.moveToTrash(id)).rejects.toMatchObject({code: 'INVALID_SONG_TRANSITION'});
  expect((await service.unpublish(id)).status).toBe('unlisted');
  expect((await service.moveToTrash(id)).status).toBe('trashed');
  expect((await service.restore(id)).status).toBe('unlisted');
  expect((await service.getAdmin(id)).id).toBe(id);
});
```

再覆盖：错误 LRC 发布失败、无歌词发布成功、同名不同歌手成功、分类/标签不存在失败、编辑已发布普通资料保持发布、替换音频需确认且 ID 不变、发布时间只在首次发布或从下架重新发布时按规则更新、草稿可直接入回收站并恢复草稿。

- [ ] **Step 2: 写永久删除与失败清理的失败测试**

```ts
it('deletes the trashed record first and queues failed media cleanup', async () => {
  const song = await seedTrashedSongWithMedia(service);
  mediaStore.delete = vi.fn().mockRejectedValue(new Error('locked'));
  await service.permanentlyDelete(song.id, {confirmSongId: song.id});
  await expect(service.getAdmin(song.id)).rejects.toMatchObject({code: 'NOT_FOUND'});
  expect(readPendingCleanup(db)).toEqual(expect.arrayContaining([
    expect.objectContaining({reason: 'song-permanent-delete', attempts: 1}),
  ]));
});
```

同时断言非回收站歌曲、错误确认 ID 和缺少确认均不能永久删除；已删除歌曲不会因文件清理失败重新出现。

- [ ] **Step 3: 运行歌曲服务测试并确认 RED**

Run: `npm run test:server -- server/songs/song-validation.test.ts server/songs/song-service.test.ts server/media/cleanup-service.test.ts server/routes/admin-songs.test.ts`

Expected: FAIL；歌曲校验、服务和路由尚不存在。

- [ ] **Step 4: 实现草稿保存与媒体原子转正**

草稿允许标题、歌手、音频或时长缺失。保存时在事务前确认 pending upload 属于当前 session；把临时媒体提升到正式 key，再在数据库事务中写 `media_objects`、歌曲和 `song_tags`。任何数据库失败都删除本次已提升文件；删除失败写 `pending_media_cleanup`，但不留下歌曲业务记录。编辑音频时若没有 `confirmAudioReplacement=true` 返回 `AUDIO_REPLACEMENT_CONFIRMATION_REQUIRED`；成功后稳定歌曲 ID 不变，旧媒体进入清理队列。

- [ ] **Step 5: 实现发布规则和显式状态机**

`assertPublishable` 要求 trim 后歌名/歌手非空、正式音频存在、`duration_seconds > 0`、媒体类型/大小仍合法；有歌词时 `validateLrc(...).valid === true`。允许的转换固定为 `draft→published`、`draft→trashed`、`published→unlisted`、`unlisted→published|trashed`、`trashed→status_before_trash`。发布保存 `published_at`；普通资料编辑不改变该时间，重新发布时刷新以进入“最近加入”。

- [ ] **Step 6: 实现重复提醒、列表和安全永久删除**

重复检查对 title/artist 做 trim 后完全匹配，排除当前 song ID；未确认返回 409，但确认后不阻止。同一事务中永久删除歌曲关系和业务记录，并为每个媒体 key 先写待清理任务；提交后逐项删除文件，成功删除 cleanup row，失败增加 attempts/last_error。`CleanupService.drain()` 在应用启动完成迁移后重试所有待清理 key，单项失败不阻止服务启动，成功项删除任务；测试用一次失败、下一次成功证明记录最终清除。管理列表按状态过滤，包含完整可编辑字段和重复提示所需 ID，不暴露磁盘路径。

- [ ] **Step 7: GREEN、重构与回归**

Run: `npm run test:server -- server/songs/song-validation.test.ts server/songs/song-service.test.ts server/media/cleanup-service.test.ts server/routes/admin-songs.test.ts`

Expected: PASS，覆盖全部状态转换、发布门槛、重复确认、媒体替换、分类标签、来源字段和失败清理。

Run: `npm run test:server -- server/routes/admin-auth.test.ts server/routes/admin-uploads.test.ts server/routes/admin-taxonomy.test.ts`

Expected: PASS。把 DTO 映射、事务体和媒体清理分成可独立测试的小函数；不得让路由层拼 SQL。

- [ ] **Step 8: 规格符合性审查**

用状态转换表逐项对照规格第 4.2–4.5、6.3、7 节；确认发布必填、全部可选字段、单分类/多标签、同名允许但提醒、稳定 ID、音频替换确认、下架→回收站→二次确认删除和清理失败不可见均有测试。

- [ ] **Step 9: 代码质量审查**

检查事务/文件系统失败补偿、并发重复提交 upload token、状态比较、时间字段、URL 长度/格式、标签去重、错误响应不泄露 SQL/路径、永久删除幂等边界和 pending cleanup 重试函数。

- [ ] **Step 10: 建议独立提交点**

```powershell
git add server/songs server/media/cleanup-service.ts server/media/cleanup-service.test.ts server/routes/admin-songs.ts server/routes/admin-songs.test.ts server/app.ts server/index.ts shared/contracts.ts
git commit -m "feat: manage song lifecycle"
```

- [ ] **Step 11: 推送并核验 Task 7 提交**

Run: `git push origin codex/pc-music-player`

Expected: 推送成功；工作区干净，本地与远端 `codex/pc-music-player` SHA 完全相同。

- [ ] **Step 12: 生成 Task 8 新窗口交接提示词**

按 Required handoff output 使用实际 Task 7 SHA，下一任务精确填写“Task 8 — 提供公开动态曲库和媒体分段读取”。输出提示词后停止。

---

### Task 8: 提供公开动态曲库和媒体分段读取

**Files:**
- Create: `server/routes/public-library.ts`
- Create: `server/routes/public-library.test.ts`
- Create: `server/http/range.ts`
- Create: `server/http/range.test.ts`
- Create: `server/routes/media.ts`
- Create: `server/routes/media.test.ts`
- Modify: `server/app.ts`
- Modify: `shared/contracts.ts`

**Interfaces:**
- HTTP: `GET /api/library` 返回 `{songs, categories, tags, sections: {recent, featured, liveCovers}}`；section 值为稳定 song ID 数组。
- HTTP: `GET /api/media/:mediaId` 返回受控媒体；音频支持一个字节范围，封面返回完整内容。
- HTTP: `GET /api/library/songs/:songId/lyrics` 返回已发布歌曲的 `text/plain; charset=utf-8` LRC。
- Produces: `parseByteRange(header, size): {start, end} | null`；多段、越界或倒置范围抛出 416 错误。

- [ ] **Step 1: 写公开可见性和分区排序的失败测试**

在 `server/test/test-context.ts` 导出 `seedSongsAcrossStatuses` 和 `seedPublishedAudio`；预期分区 ID 由测试夹具的字面量数组给出，不复用生产排序函数：

```ts
it('returns only published songs and caps ordered home sections at six ids', async () => {
  await seedSongsAcrossStatuses(context, 9);
  const response = await context.app.inject({method: 'GET', url: '/api/library'});
  expect(response.statusCode).toBe(200);
  const body = response.json<LibraryResponse>();
  expect(body.songs.every((song) => !('status' in song))).toBe(true);
  expect(body.songs.map((song) => song.title)).not.toContain('草稿歌');
  expect(body.sections.recent).toHaveLength(6);
  expect(body.sections.featured).toEqual(expectedFeaturedNewestFirst.slice(0, 6));
  expect(body.sections.liveCovers).toEqual(expectedLiveNewestFirst.slice(0, 6));
  expect(JSON.stringify(body)).not.toContain(context.config.mediaDir);
});
```

同时验证分类/标签只返回公开歌曲筛选所需数据；歌曲 DTO 包含稳定 ID、标题、歌手、时长、受控 audio/cover/lyrics URL、分类、标签、来源资料、分区标记和发布时间。

- [ ] **Step 2: 写 Range 的失败测试**

```ts
it.each([
  ['bytes=0-3', {start: 0, end: 3}],
  ['bytes=4-', {start: 4, end: 9}],
  ['bytes=-4', {start: 6, end: 9}],
])('parses %s', (header, expected) => {
  expect(parseByteRange(header, 10)).toEqual(expected);
});

it('serves audio ranges and rejects invalid or missing media', async () => {
  const media = await seedPublishedAudio(context, Buffer.from('0123456789'));
  const partial = await context.app.inject({
    method: 'GET', url: `/api/media/${media.id}`, headers: {range: 'bytes=2-5'},
  });
  expect(partial.statusCode).toBe(206);
  expect(partial.headers['content-range']).toBe('bytes 2-5/10');
  expect(partial.headers['accept-ranges']).toBe('bytes');
  expect(partial.body).toBe('2345');
  expect((await context.app.inject({
    method: 'GET', url: `/api/media/${media.id}`, headers: {range: 'bytes=20-30'},
  })).statusCode).toBe(416);
});
```

- [ ] **Step 3: 运行公开接口测试并确认 RED**

Run: `npm run test:server -- server/routes/public-library.test.ts server/http/range.test.ts server/routes/media.test.ts`

Expected: FAIL；公开路由和 Range 解析尚不存在。

- [ ] **Step 4: 实现只读曲库 DTO 和分区**

单次查询或明确的少量查询读取 published songs，按 `published_at DESC, id ASC` 稳定排序；`recent` 为前 6，`featured`/`liveCovers` 先按标记过滤再各取 6。audio URL 必须存在；cover 缺失时省略 `coverUrl` 让统一前端默认封面接管；有效 LRC 才返回 lyrics URL。普通 DTO 不包含 status、storage key、原文件名、管理字段或磁盘路径。

- [ ] **Step 5: 实现安全媒体读取和歌词响应**

media ID 先按 UUID/过渡媒体 ID 格式校验，再从 `media_objects` 查到 storage key；不存在返回 404。无 Range 返回 200、准确 `Content-Length`/`Content-Type`；合法音频 Range 返回 206；非法、多段或越界返回 416 和 `Content-Range: bytes */<size>`。封面忽略 Range 并完整返回。歌词路由只查询 published song，空歌词返回 404，不把 LRC 拼进 JSON 曲库。

- [ ] **Step 6: GREEN、重构与回归**

Run: `npm run test:server -- server/routes/public-library.test.ts server/http/range.test.ts server/routes/media.test.ts`

Expected: PASS，覆盖 200/206/404/416、首段/尾段/开放范围、公开过滤和三个首页分区。

Run: `npm run test:server`

Expected: 所有服务端测试通过。确认 stream 关闭由 Fastify 响应生命周期接管，HEAD 请求的 header 与 GET 一致而不传 body。

- [ ] **Step 7: 规格符合性审查**

确认普通访问无需登录且只见 published；媒体 URL 不暴露路径；音频 Range 完整；下架后旧页面持有的不可猜测媒体 URL仍可读到永久删除为止，而下一次曲库刷新不再返回歌曲；本阶段没有实时推送。

- [ ] **Step 8: 代码质量审查**

检查 SQL 无 N+1 放大、排序确定、Range 整数溢出/空文件/多段处理、MIME 白名单、stream 错误日志脱敏、媒体对象被永久删除后 404、默认封面不依赖提交图片。

- [ ] **Step 9: 建议独立提交点**

```powershell
git add server/routes/public-library.ts server/routes/public-library.test.ts server/http server/routes/media.ts server/routes/media.test.ts server/app.ts shared/contracts.ts
git commit -m "feat: expose public music library"
```

- [ ] **Step 10: 推送并核验 Task 8 提交**

Run: `git push origin codex/pc-music-player`

Expected: 推送成功；工作区干净，本地与远端 `codex/pc-music-player` SHA 完全相同。

- [ ] **Step 11: 生成 Task 9 新窗口交接提示词**

按 Required handoff output 使用实际 Task 8 SHA，下一任务精确填写“Task 9 — 建立前端路由、曲库客户端和普通页面加载边界”。输出提示词后停止。

---

### Task 9: 建立前端路由、曲库客户端和普通页面加载边界

**Files:**
- Create: `src/api/http.ts`
- Create: `src/api/http.test.ts`
- Create: `src/api/library-api.ts`
- Create: `src/api/library-api.test.ts`
- Create: `src/features/library/LibraryProvider.tsx`
- Create: `src/features/library/LibraryProvider.test.tsx`
- Create: `src/features/library/PublicApp.tsx`
- Create: `src/features/library/PublicLibraryState.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/main.tsx`
- Modify: `shared/contracts.ts`

**Interfaces:**
- Produces: `requestJson<T>(url, init?): Promise<T>`，将非 2xx 解析成 `ApiError {status, code, message, details?}`。
- Produces: `fetchLibrary(signal): Promise<LibraryResponse>`。
- Produces: `LibraryContextValue = {library, status, error, refresh}`，status 为 `'loading' | 'ready' | 'empty' | 'unavailable' | 'error'`。
- Routing: `/` 首页、`/music` 音乐馆、`/admin/*` 后台；后台分支不依赖公开曲库成功。

- [ ] **Step 1: 写请求错误和曲库状态的失败测试**

```ts
it('preserves stable server error codes', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
    error: {code: 'LIBRARY_FAILED', message: '曲库读取失败'},
  }), {status: 500, headers: {'Content-Type': 'application/json'}})));
  await expect(requestJson('/api/library')).rejects.toMatchObject({
    status: 500, code: 'LIBRARY_FAILED', message: '曲库读取失败',
  });
});
```

```tsx
it.each([
  ['pending', '正在加载曲库…'],
  ['network', '本地服务未运行'],
  ['http', '曲库加载失败'],
  ['empty', '曲库还是空的'],
] as const)('renders the distinct %s state', async (scenario, message) => {
  mockLibraryScenario(scenario);
  render(<App />);
  expect(await screen.findByRole('status')).toHaveTextContent(message);
});
```

App 测试还要证明访问 `/admin` 时即使 `/api/library` 失败也不会显示普通曲库错误，并且只有 ready 且非空时才构造播放器。

- [ ] **Step 2: 运行客户端聚焦测试并确认 RED**

Run: `npm run test:client -- src/api/http.test.ts src/api/library-api.test.ts src/features/library/LibraryProvider.test.tsx src/App.test.tsx`

Expected: FAIL；API 客户端、Provider 和路由尚不存在。

- [ ] **Step 3: 实现统一请求和可取消曲库加载**

`requestJson` 只在 JSON content type 时解析 body，204 返回 `undefined`，网络 `TypeError` 映射为 `SERVICE_UNAVAILABLE`，AbortError 原样抛出供 effect 忽略。`LibraryProvider` 首次 mount 创建 AbortController；成功且 `songs.length===0` 为 empty，网络错误为 unavailable，其他错误为 error；`refresh()` 增加 request token，旧请求后返回时不得覆盖新数据。

- [ ] **Step 4: 实现路由边界和普通应用门**

`main.tsx` 在 StrictMode 内放一个 `BrowserRouter`。`App` 用 route branch：`/admin/*` 先渲染 App 内最小的 `<main aria-label="管理后台">管理后台</main>` 边界，Task 10 再替换为完整 `AdminApp`；其他路径渲染 `LibraryProvider` 和 `PublicApp`。`PublicApp` 在 loading/unavailable/error/empty 时只渲染对应带 `role=status` 的明确状态；ready 时把公开 songs 映射为 `Track[]`，创建唯一 `PlayerProvider`，其内部用嵌套路由渲染首页或音乐馆，再统一渲染 `FullPlayer`/`MiniPlayer`。

- [ ] **Step 5: GREEN、重构与回归**

Run: `npm run test:client -- src/api/http.test.ts src/api/library-api.test.ts src/features/library/LibraryProvider.test.tsx src/App.test.tsx`

Expected: PASS，四种状态、刷新竞态和后台隔离全部通过。

Run: `npm run test:client -- src/features/player src/features/home`

Expected: 现有播放器和首页测试仍通过；若 App 测试改用 mocked library，播放器断言必须继续使用真实 Provider 而非完全 mock 掉。

- [ ] **Step 6: 规格符合性审查**

确认“先加载曲库，再建立播放器”、本地服务未运行/接口失败/空曲库分别提示、后台不依赖公开数据、刷新才看到后台变化、普通页面不直接读数据库或目录均已落地。

- [ ] **Step 7: 代码质量审查**

检查 StrictMode 双请求可取消、旧响应竞态、错误 body 非 JSON、空响应、unmount 后 setState、路由切换不重新创建 PublicApp 内的 Provider，以及 shared DTO 不带服务端专用类型。

- [ ] **Step 8: 建议独立提交点**

```powershell
git add src/api/http.ts src/api/http.test.ts src/api/library-api.ts src/api/library-api.test.ts src/features/library/LibraryProvider.tsx src/features/library/LibraryProvider.test.tsx src/features/library/PublicApp.tsx src/features/library/PublicLibraryState.tsx src/App.tsx src/App.test.tsx src/main.tsx shared/contracts.ts
git commit -m "feat: load the public library"
```

- [ ] **Step 9: 推送并核验 Task 9 提交**

Run: `git push origin codex/pc-music-player`

Expected: 推送成功；工作区干净，本地与远端 `codex/pc-music-player` SHA 完全相同。

- [ ] **Step 10: 生成 Task 10 新窗口交接提示词**

按 Required handoff output 使用实际 Task 9 SHA，下一任务精确填写“Task 10 — 实现管理后台首次设置、登录和会话门”。输出提示词后停止。

---

### Task 10: 实现管理后台首次设置、登录和会话门

**Files:**
- Create: `src/api/admin-api.ts`
- Create: `src/api/admin-api.test.ts`
- Create: `src/features/admin/AdminApp.tsx`
- Create: `src/features/admin/AdminAuthGate.tsx`
- Create: `src/features/admin/AdminAuthGate.test.tsx`
- Create: `src/features/admin/AdminLoginPage.tsx`
- Create: `src/features/admin/AdminLoginPage.test.tsx`
- Create: `src/features/admin/AdminLayout.tsx`
- Create: `src/features/admin/test/render-admin.tsx`
- Create: `src/styles/admin.css`
- Modify: `src/App.tsx`

**Interfaces:**
- Produces: `adminApi.getAuthStatus/setup/login/logout/changePassword`，所有请求使用 `credentials: 'same-origin'`。
- Produces: `AdminAuthGate`；状态为 checking/setup/login/authenticated，不把后台入口加入普通导航。
- Route shell: `/admin`、`/admin/songs/new`、`/admin/songs/:songId`、`/admin/taxonomy`、`/admin/trash`、`/admin/settings`。

- [ ] **Step 1: 写首次设置、登录、键盘和错误保留的失败测试**

`src/features/admin/test/render-admin.tsx` 定义 `renderAdmin(initialPath)`，用 MemoryRouter 渲染真实 `AdminApp`；各测试只 mock `adminApi` 网络边界：

```tsx
it('shows first-time setup and enters the protected admin shell', async () => {
  adminApi.getAuthStatus.mockResolvedValue({needsSetup: true, authenticated: false});
  adminApi.setup.mockResolvedValue({authenticated: true});
  const user = userEvent.setup();
  renderAdmin('/admin');
  expect(await screen.findByRole('heading', {name: '创建管理密码'})).toBeInTheDocument();
  await user.type(screen.getByLabelText('管理密码'), 'owner-password');
  await user.type(screen.getByLabelText('确认管理密码'), 'owner-password');
  await user.click(screen.getByRole('button', {name: '创建并进入后台'}));
  expect(await screen.findByRole('navigation', {name: '管理导航'})).toBeInTheDocument();
});

it('keeps the entered password field and announces a failed login', async () => {
  adminApi.getAuthStatus.mockResolvedValue({needsSetup: false, authenticated: false});
  adminApi.login.mockRejectedValue(new ApiError(401, 'INVALID_CREDENTIALS', '密码错误'));
  const user = userEvent.setup();
  renderAdmin('/admin');
  const password = await screen.findByLabelText('管理密码');
  await user.type(password, 'wrong-value');
  await user.keyboard('{Enter}');
  expect(await screen.findByRole('alert')).toHaveTextContent('密码错误');
  expect(password).toHaveValue('wrong-value');
});
```

再覆盖两次密码不一致、少于 8 字符、status 请求失败、退出回登录、普通页面导航中找不到“管理后台”。

- [ ] **Step 2: 运行后台认证 UI 测试并确认 RED**

Run: `npm run test:client -- src/api/admin-api.test.ts src/features/admin/AdminAuthGate.test.tsx src/features/admin/AdminLoginPage.test.tsx src/App.test.tsx`

Expected: FAIL；管理 API 和页面尚不存在。

- [ ] **Step 3: 实现管理 API 和认证状态机**

`admin-api.ts` 为每个端点提供具名函数；密码只存在于本次 request body，不写 localStorage/sessionStorage。`AdminAuthGate` 首次检查 status；setup/login 成功切换 authenticated；401 自动回登录；网络失败显示“无法连接本地管理服务”和重试按钮。表单失败只更新错误状态，不清空输入。

- [ ] **Step 4: 实现后台布局和隐藏入口**

`AdminLayout` 提供歌曲、分类与标签、回收站、设置和退出导航；`/admin` 默认进入歌曲列表占位。普通 `HomeHeader` 只保留首页/音乐馆/故事会，不能新增后台链接。所有 label 显式关联 input；错误 `role=alert`，加载/成功状态 `role=status`；Tab/Enter 可完整设置和登录。

- [ ] **Step 5: GREEN、重构与回归**

Run: `npm run test:client -- src/api/admin-api.test.ts src/features/admin/AdminAuthGate.test.tsx src/features/admin/AdminLoginPage.test.tsx src/App.test.tsx`

Expected: PASS，首次设置、登录、退出、错误保留、键盘提交和隐藏入口全部通过。

Run: `npm run test:client -- src/features/home/HomePage.test.tsx src/features/player/PlayerKeyboard.test.tsx`

Expected: 普通导航和键盘播放器无回归。表单逻辑提取为局部 hook 时不得缓存密码。

- [ ] **Step 6: 规格符合性审查**

确认固定 `/admin` 可直接访问但普通导航无入口；首次设置、登录、退出、状态检查可用；没有忘记密码/找回/本机重置；密码和 Cookie 均不进入前端持久化。

- [ ] **Step 7: 代码质量审查**

检查 401/网络/验证错误分流、重复提交按钮禁用、组件卸载后的请求取消、focus 移到错误摘要、浏览器自动填充属性合理、后台 CSS 不污染播放器全局类名。

- [ ] **Step 8: 建议独立提交点**

```powershell
git add src/api/admin-api.ts src/api/admin-api.test.ts src/features/admin/AdminApp.tsx src/features/admin/AdminAuthGate.tsx src/features/admin/AdminAuthGate.test.tsx src/features/admin/AdminLoginPage.tsx src/features/admin/AdminLoginPage.test.tsx src/features/admin/AdminLayout.tsx src/features/admin/test/render-admin.tsx src/styles/admin.css src/App.tsx
git commit -m "feat: add admin authentication pages"
```

- [ ] **Step 9: 推送并核验 Task 10 提交**

Run: `git push origin codex/pc-music-player`

Expected: 推送成功；工作区干净，本地与远端 `codex/pc-music-player` SHA 完全相同。

- [ ] **Step 10: 生成 Task 11 新窗口交接提示词**

按 Required handoff output 使用实际 Task 10 SHA，下一任务精确填写“Task 11 — 实现分类、标签和管理密码设置页面”。输出提示词后停止。

---

### Task 11: 实现分类、标签和管理密码设置页面

**Files:**
- Create: `src/features/admin/TaxonomyPage.tsx`
- Create: `src/features/admin/TaxonomyPage.test.tsx`
- Create: `src/features/admin/SettingsPage.tsx`
- Create: `src/features/admin/SettingsPage.test.tsx`
- Create: `src/features/admin/ConfirmDialog.tsx`
- Create: `src/features/admin/AsyncFormStatus.tsx`
- Create: `server/routes/admin-settings.ts`
- Create: `server/routes/admin-settings.test.ts`
- Modify: `src/features/admin/AdminApp.tsx`
- Modify: `src/api/admin-api.ts`
- Modify: `src/api/admin-api.test.ts`
- Modify: `src/styles/admin.css`
- Modify: `server/app.ts`

**Interfaces:**
- Consumes: Task 6 taxonomy endpoints、Task 4 password endpoint。
- Produces: 分类/标签新增、改名、删除交互；设置页显示服务端返回的展示用数据目录并支持已登录改密。
- HTTP addition: `GET /api/admin/settings` 只返回 `{dataDirectoryDisplay: string}`；不得返回数据库文件名、媒体 key 或密码信息。

- [ ] **Step 1: 写分类标签管理和改密的失败测试**

```tsx
it('creates, renames and deletes taxonomy with accessible confirmation', async () => {
  adminApi.listCategories.mockResolvedValue([{id: 'cat-1', name: '现场'}]);
  const user = userEvent.setup();
  renderAdmin('/admin/taxonomy');
  await user.type(await screen.findByLabelText('新分类名称'), '直播翻唱');
  await user.click(screen.getByRole('button', {name: '创建分类'}));
  expect(adminApi.createCategory).toHaveBeenCalledWith({name: '直播翻唱'});
  await user.click(screen.getByRole('button', {name: '删除分类：现场'}));
  expect(screen.getByRole('dialog', {name: '确认删除分类'})).toBeInTheDocument();
});

it('changes the password without clearing fields on failure', async () => {
  adminApi.changePassword.mockRejectedValue(new ApiError(401, 'INVALID_CREDENTIALS', '当前密码错误'));
  const user = userEvent.setup();
  renderAdmin('/admin/settings');
  await user.type(screen.getByLabelText('当前密码'), 'old-password');
  await user.type(screen.getByLabelText('新密码'), 'new-password');
  await user.click(screen.getByRole('button', {name: '修改管理密码'}));
  expect(await screen.findByRole('alert')).toHaveTextContent('当前密码错误');
  expect(screen.getByLabelText('当前密码')).toHaveValue('old-password');
});
```

`server/routes/admin-settings.test.ts` 先写受保护路径测试：

```ts
it('returns only the display data directory to an authenticated admin', async () => {
  const context = await createAuthenticatedTestContext();
  const response = await context.app.inject({
    method: 'GET', url: '/api/admin/settings', headers: {cookie: context.cookie},
  });
  expect(response.statusCode).toBe(200);
  expect(response.json()).toEqual({dataDirectoryDisplay: context.config.dataDir});
  expect(response.body).not.toContain('library.sqlite');
});
```

- [ ] **Step 2: 运行设置页面测试并确认 RED**

Run: `npm run test:client -- src/features/admin/TaxonomyPage.test.tsx src/features/admin/SettingsPage.test.tsx src/api/admin-api.test.ts`

Run: `npm run test:server -- server/routes/admin-settings.test.ts`

Expected: 两条命令均 FAIL；页面、API 方法和设置路由尚不存在。

- [ ] **Step 3: 实现分类/标签交互**

页面分别列出分类和标签，每行有显式“重命名”和“删除”按钮；新增/改名使用受控 input。409 显示服务器重复名称消息；删除必须打开原生可聚焦 dialog，说明分类会从歌曲清空、标签关系会移除但歌曲不会删除。成功后重新拉取列表并以 `role=status` 宣告，不做乐观删除。

- [ ] **Step 4: 实现设置页和数据目录展示**

服务端设置路由使用 `requireAdmin`，将路径作为只读 display string 返回；前端不提供浏览/移动/删除目录按钮。改密表单含当前密码、新密码、确认新密码；成功后服务端新会话 Cookie 生效，清空字段并显示成功；失败保留输入。新密码执行与首次设置相同的 8–200 字符规则。

- [ ] **Step 5: GREEN、重构与回归**

Run: `npm run test:client -- src/features/admin/TaxonomyPage.test.tsx src/features/admin/SettingsPage.test.tsx src/api/admin-api.test.ts`

Expected: PASS，创建/改名/删除/冲突/确认/改密成功失败均通过。

Run: `npm run test:server -- server/routes/admin-taxonomy.test.ts server/routes/admin-auth.test.ts server/routes/admin-settings.test.ts`

Expected: PASS。复用一个 `ConfirmDialog` 和一个 `AsyncFormStatus`，但分类/标签 API 保持具名方法。

- [ ] **Step 6: 规格符合性审查**

确认分类标签先统一创建、操作可键盘完成、设置只显示目录位置和改密；没有目录迁移、备份、密码找回或普通账号管理。

- [ ] **Step 7: 代码质量审查**

检查删除确认 focus trap/返回焦点、错误与字段 `aria-describedby`、成功提示可读、重复提交锁、请求失败保留输入、数据目录只读且不作为链接暴露。

- [ ] **Step 8: 建议独立提交点**

```powershell
git add src/features/admin/TaxonomyPage.tsx src/features/admin/TaxonomyPage.test.tsx src/features/admin/SettingsPage.tsx src/features/admin/SettingsPage.test.tsx src/features/admin/ConfirmDialog.tsx src/features/admin/AsyncFormStatus.tsx src/features/admin/AdminApp.tsx src/api/admin-api.ts src/api/admin-api.test.ts src/styles/admin.css server/routes/admin-settings.ts server/routes/admin-settings.test.ts server/app.ts
git commit -m "feat: add admin taxonomy settings"
```

- [ ] **Step 9: 推送并核验 Task 11 提交**

Run: `git push origin codex/pc-music-player`

Expected: 推送成功；工作区干净，本地与远端 `codex/pc-music-player` SHA 完全相同。

- [ ] **Step 10: 生成 Task 12 新窗口交接提示词**

按 Required handoff output 使用实际 Task 11 SHA，下一任务精确填写“Task 12 — 实现管理歌曲页面、上传进度和生命周期操作”。输出提示词后停止。

---

### Task 12: 实现管理歌曲页面、上传进度和生命周期操作

**Files:**
- Create: `src/features/admin/useMediaUpload.ts`
- Create: `src/features/admin/useMediaUpload.test.tsx`
- Create: `src/features/admin/MediaUploadField.tsx`
- Create: `src/features/admin/MediaUploadField.test.tsx`
- Create: `src/features/admin/SongForm.tsx`
- Create: `src/features/admin/SongForm.test.tsx`
- Create: `src/features/admin/AdminSongListPage.tsx`
- Create: `src/features/admin/AdminSongListPage.test.tsx`
- Create: `src/features/admin/TrashPage.tsx`
- Create: `src/features/admin/TrashPage.test.tsx`
- Create: `src/features/admin/test/fake-xhr.ts`
- Modify: `src/features/admin/ConfirmDialog.tsx`
- Modify: `src/features/admin/AsyncFormStatus.tsx`
- Modify: `src/features/admin/AdminApp.tsx`
- Modify: `src/api/admin-api.ts`
- Modify: `src/api/admin-api.test.ts`
- Modify: `src/styles/admin.css`

**Interfaces:**
- Produces: `useMediaUpload(kind)`，状态 `'idle' | 'uploading' | 'uploaded' | 'cancelled' | 'error'`，并公开 `progress`, `uploadId`, `upload(file)`, `cancel()`, `retry()`。
- Produces: 后台歌曲 tabs `draft/published/unlisted/trashed`、新建/编辑表单、发布/下架/入回收站/恢复/永久删除。
- Song form 只提交 Task 7 的精确 input；上传通过 XHR 以获得 `upload.onprogress` 和 `abort()`。

- [ ] **Step 1: 写上传进度、取消和失败重试的失败测试**

`src/features/admin/test/fake-xhr.ts` 定义可触发 progress/load/error/abort 的 `installFakeXhr()` 和 `createdXhrs`，每个测试 afterEach 恢复原始 `XMLHttpRequest`：

```tsx
it('announces upload progress, cancels, and can retry the same selected file', async () => {
  const xhr = installFakeXhr();
  const user = userEvent.setup();
  render(<MediaUploadField kind="audio" label="音频文件" />);
  const file = new File(['audio'], 'song.mp3', {type: 'audio/mpeg'});
  await user.upload(screen.getByLabelText('音频文件'), file);
  xhr.progress({loaded: 50, total: 100});
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
  expect(screen.getByRole('status')).toHaveTextContent('已上传 50%');
  await user.click(screen.getByRole('button', {name: '取消上传'}));
  expect(xhr.abort).toHaveBeenCalled();
  expect(screen.getByRole('status')).toHaveTextContent('上传已取消');
  await user.click(screen.getByRole('button', {name: '重新上传'}));
  expect(createdXhrs).toHaveLength(2);
});
```

再测试 401/413/415/网络错误、unmount abort、取消已取得 uploadId 后调用 DELETE、LRC 文件内容回填文本框且格式错误关联到歌词字段。

- [ ] **Step 2: 写歌曲表单和列表状态的失败测试**

```tsx
it('keeps form values when save fails and confirms duplicates and audio replacement', async () => {
  adminApi.saveSong.mockRejectedValueOnce(new ApiError(
    409, 'DUPLICATE_CONFIRMATION_REQUIRED', '存在同名同歌手歌曲',
  ));
  const user = userEvent.setup();
  renderAdmin('/admin/songs/new');
  await user.type(screen.getByLabelText('歌名'), '初光');
  await user.type(screen.getByLabelText('歌手'), 'Hanser');
  await user.click(screen.getByRole('button', {name: '保存草稿'}));
  expect(await screen.findByRole('dialog', {name: '确认重复歌曲'})).toBeInTheDocument();
  expect(screen.getByLabelText('歌名')).toHaveValue('初光');
});

it('requires the full unpublish-trash-confirm-delete path', async () => {
  renderAdmin('/admin');
  const row = await screen.findByRole('row', {name: /已发布歌曲/});
  expect(within(row).getByRole('button', {name: '下架'})).toBeInTheDocument();
  expect(within(row).queryByRole('button', {name: '永久删除'})).not.toBeInTheDocument();
});
```

覆盖状态 tabs、草稿发布错误汇总、下架、恢复、回收站、永久删除输入歌名/确认 ID、分类单选、标签多选、来源字段、两个首页标记和 audio replacement confirmation。

- [ ] **Step 3: 运行后台歌曲测试并确认 RED**

Run: `npm run test:client -- src/features/admin/useMediaUpload.test.tsx src/features/admin/MediaUploadField.test.tsx src/features/admin/SongForm.test.tsx src/features/admin/AdminSongListPage.test.tsx src/features/admin/TrashPage.test.tsx`

Expected: FAIL；上传 hook 和歌曲页面尚不存在。

- [ ] **Step 4: 实现 XHR 上传 hook 和可访问上传字段**

XHR URL 按 kind 固定映射；`upload.onprogress` 计算 `Math.round(loaded / total * 100)`；`abort()` 后 UI 进入 cancelled；服务端成功返回 uploadId/时长或 LRC text。音频字段显示识别时长或“无法识别，可保存草稿但不能发布”；封面接受属性只列 `.jpg,.jpeg,.png,.webp`；LRC 文件回填同一 textarea。视觉状态同时用 progressbar、`role=status/alert` 和文字表达。

- [ ] **Step 5: 实现表单、重复/替换确认和发布错误**

表单字段完整对应规格：音频、歌名、歌手、封面、LRC、分类、标签、版本说明、演唱日期、来源链接、精选、直播翻唱精选。保存失败不 reset。遇到 duplicate 409 打开确认框，确认后原 payload 加 `confirmDuplicate: true` 重交；编辑页选择新音频后必须先确认，再加 `confirmAudioReplacement: true`。发布 422 按字段显示并在顶部提供错误摘要；无歌词不产生错误。

- [ ] **Step 6: 实现列表、回收站和刷新行为**

歌曲列表按四个状态查询并显示歌名、歌手、状态、更新时间；每种状态只显示允许动作。发布/下架/编辑成功后刷新管理列表，但不假装推送普通页面。回收站恢复到 `status_before_trash`；永久删除 dialog 显示不可恢复警告，并要求用户输入歌曲稳定 ID 后才启用按钮。所有确认可用键盘完成。

- [ ] **Step 7: GREEN、重构与回归**

Run: `npm run test:client -- src/features/admin/useMediaUpload.test.tsx src/features/admin/MediaUploadField.test.tsx src/features/admin/SongForm.test.tsx src/features/admin/AdminSongListPage.test.tsx src/features/admin/TrashPage.test.tsx`

Expected: PASS，进度、取消、重试、表单保留、重复、替换和全部生命周期 UI 通过。

Run: `npm run test:server -- server/routes/admin-uploads.test.ts server/routes/admin-songs.test.ts`

Expected: PASS。将表单 DTO 映射、状态动作和上传传输分离；不得让页面保存 XHR、密码或文件内容到 localStorage。

- [ ] **Step 8: 规格符合性审查**

逐项走查后台页面清单和字段清单；确认逐首上传、进度/取消/失败重试、无时长草稿、错误 LRC 草稿、重复确认、音频替换确认、稳定 ID、下架/回收站/恢复/永久删除均可操作；没有批量导入、断点续传或普通用户入口。

- [ ] **Step 9: 代码质量审查**

检查 XHR cleanup、对象 URL 释放、旧上传 token 在换文件时取消、双击提交、表单脏状态导航提示、焦点管理、错误字段关联、移动端表格退化、服务端错误码映射和敏感表单日志。

- [ ] **Step 10: 建议独立提交点**

```powershell
git add src/features/admin src/api/admin-api.ts src/api/admin-api.test.ts src/styles/admin.css
git commit -m "feat: add local music admin workflow"
```

- [ ] **Step 11: 推送并核验 Task 12 提交**

Run: `git push origin codex/pc-music-player`

Expected: 推送成功；工作区干净，本地与远端 `codex/pc-music-player` SHA 完全相同。

- [ ] **Step 12: 生成 Task 13 新窗口交接提示词**

按 Required handoff output 使用实际 Task 12 SHA，下一任务精确填写“Task 13 — 将唯一播放器接入稳定编号、动态队列和暂停恢复”。输出提示词后停止。

---

### Task 13: 将唯一播放器接入稳定编号、动态队列和暂停恢复

**Files:**
- Create: `src/features/player/player-persistence.ts`
- Create: `src/features/player/player-persistence.test.ts`
- Modify: `src/features/player/types.ts`
- Modify: `src/features/player/PlayerProvider.tsx`
- Modify: `src/features/player/PlayerProvider.test.tsx`
- Modify: `src/features/player/PlayerControls.test.tsx`
- Modify: `src/features/player/PlayerKeyboard.test.tsx`
- Modify: `src/features/player/FullPlayer.test.tsx`
- Modify: `src/features/library/PublicApp.tsx`
- Modify: `src/App.test.tsx`

**Interfaces:**
- Changes: `playTrack(index)` → `playTrack(trackId: string, queueIds?: readonly string[]): Promise<void>`。
- Produces: `PlayerSnapshotV2 = {version: 2, currentTrackId, currentTime, volume, isMuted, queueIds}`，键为 `255-phonograph:player:v2`。
- Produces: `reconcilePlayerSnapshot(snapshot, availableTracks)`，移除失效 ID、去重并保序；当前歌曲失效时选全曲库第一首。
- Player context 保留现有字段，并新增 `queueIds: string[]`；`currentIndex` 仅作为兼容视图，不作为持久身份。

- [ ] **Step 1: 写快照校验和失效队列清理的失败测试**

在 `player-persistence.test.ts` 内定义只实现 `Storage` 必需方法的 `storageReturning`、`throwingStorage` 和 `memoryStorage`；不依赖真实浏览器持久数据：

```ts
it('restores stable ids, removes unavailable queue entries and remains paused', () => {
  const restored = reconcilePlayerSnapshot({
    version: 2,
    currentTrackId: 'removed',
    currentTime: 42.5,
    volume: 0.35,
    isMuted: true,
    queueIds: ['b', 'removed', 'b'],
  }, [{id: 'a'}, {id: 'b'}]);
  expect(restored).toEqual({
    currentTrackId: 'a', currentTime: 0, volume: 0.35, isMuted: true,
    queueIds: ['a', 'b'], shouldPlay: false,
  });
});

it('falls back safely from malformed or blocked storage', () => {
  expect(readPlayerSnapshot(storageReturning('{bad json'))).toBeNull();
  expect(() => writePlayerSnapshot(validSnapshot, throwingStorage)).not.toThrow();
});
```

再覆盖 volume clamp、负/NaN progress、队列全失效回退全部歌曲、当前歌曲仍有效时保留 progress、旧未知 version 忽略。

- [ ] **Step 2: 写动态重排、临时队列、刷新暂停和唯一音频的失败测试**

在 `PlayerProvider.test.tsx` 内扩展现有 Capture/Harness，并定义 `renderDynamicPlayer`；它只 rerender 同一个 Provider root，用收集到的 context 和 Audio identity 断言：

```tsx
it('keeps the current stable song when the library order changes', async () => {
  const {rerender, getPlayer} = renderDynamicPlayer([trackA, trackB]);
  await act(() => getPlayer().playTrack('b'));
  const audio = getPlayer().audio;
  rerender(<PlayerProvider tracks={[trackB, trackA]}><Capture /></PlayerProvider>);
  expect(getPlayer().currentTrack.id).toBe('b');
  expect(getPlayer().audio).toBe(audio);
});

it('restores track, time, volume and queue but never autoplays after reload', () => {
  localStorage.setItem('255-phonograph:player:v2', JSON.stringify({
    version: 2, currentTrackId: 'b', currentTime: 31, volume: 0.4,
    isMuted: true, queueIds: ['b', 'a'],
  }));
  const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  render(<PlayerProvider tracks={[trackA, trackB]}><Harness /></PlayerProvider>);
  fireEvent.loadedMetadata(getAudio());
  expect(screen.getByTestId('title')).toHaveTextContent('B');
  expect(getAudio().currentTime).toBe(31);
  expect(screen.getByTestId('playing')).toHaveTextContent('false');
  expect(play).not.toHaveBeenCalled();
});
```

临时队列测试调用 `playTrack('b', ['b', 'c'])`，随后 next/ended 只能在 b/c 循环；无 queue 参数调用 `playTrack('a')` 时恢复全部 published tracks 队列。

- [ ] **Step 3: 运行播放器聚焦测试并确认 RED**

Run: `npm run test:client -- src/features/player/player-persistence.test.ts src/features/player/PlayerProvider.test.tsx`

Expected: FAIL；V2 快照和 ID-based 播放接口尚不存在。

- [ ] **Step 4: 实现稳定 ID 队列和动态曲库协调**

Provider 内部以 `currentTrackId` 和 `queueIds` 为真值，通过 Map 找 Track；next/previous 在 queue IDs 中循环。`tracks` prop 更新时：保留仍存在的 current ID；清理 queue；current 失效则 pause、清空时间并选新曲库第一首；只更新标题/封面/歌词等资料时不重设已经加载的 audio URL，只有 audioUrl 变化且下一次主动加载/播放才换源。全程继续复用 mount 时创建的一个 Audio。

- [ ] **Step 5: 实现本地快照和“恢复但暂停”**

首次构造 state 时安全读取 V2 快照；设置 element.volume/muted；source ready 后应用一次恢复进度。`timeupdate`、track/queue、volume/mute 变化写快照；`isPlaying` 永不持久化。刷新恢复时 `desiredPlayingRef=false`、调用 `pause()` 但绝不 `play()`。当前 ID 无效则 time=0 并选第一首；队列保留顺序且删除下架/删除 ID。

- [ ] **Step 6: 迁移调用点并保护既有播放器能力**

把所有 `playTrack(index)` 调用改成稳定 ID；现有控制条 API 不变。保留 request token 竞态保护、ended 自动 next、native pause 确认、seek clamp、媒体错误提示、editable target 快捷键排除、LyricsPanel 和 Spectrum 使用相同 audio。`currentTrack` 在非空 Provider 中始终定义。

- [ ] **Step 7: GREEN、重构与完整播放器回归**

Run: `npm run test:client -- src/features/player/player-persistence.test.ts src/features/player/PlayerProvider.test.tsx src/features/player/PlayerControls.test.tsx src/features/player/PlayerKeyboard.test.tsx src/features/player/FullPlayer.test.tsx src/features/player/LyricsPanel.test.tsx src/features/player/Spectrum.test.tsx`

Expected: 全部通过，包括自动续播、竞态、原生暂停、歌词、64 条频谱、快捷键和唱片定位。

Run: `npm run test:client -- src/App.test.tsx`

Expected: 路由切换/展开状态下只收集到一个 Audio identity。把快照纯函数与副作用 effect 分离，避免 Provider 主体继续膨胀。

- [ ] **Step 8: 规格符合性审查**

逐项确认稳定 ID、当前进度、音量/静音、临时队列顺序、本地下架清理、失效 current 回退、刷新暂停、单 Provider/单 Audio、自动续播及全套既有功能均有测试；页面组件没有直接改 `src`。

- [ ] **Step 9: 代码质量审查**

检查 React rerender 不创建 Audio、loadedmetadata 恢复只执行一次、快速切歌/失败 play promise、localStorage 写入频率、队列空值、曲库重排、source URL 变化、StrictMode cleanup 和 Web Audio graph 复用。

- [ ] **Step 10: 建议独立提交点**

```powershell
git add src/features/player src/features/library/PublicApp.tsx src/App.test.tsx
git commit -m "feat: persist the dynamic player queue"
```

- [ ] **Step 11: 推送并核验 Task 13 提交**

Run: `git push origin codex/pc-music-player`

Expected: 推送成功；工作区干净，本地与远端 `codex/pc-music-player` SHA 完全相同。

- [ ] **Step 12: 生成 Task 14 新窗口交接提示词**

按 Required handoff output 使用实际 Task 13 SHA，下一任务精确填写“Task 14 — 新增独立音乐馆、歌名搜索和筛选播放列表”。输出提示词后停止。

---

### Task 14: 新增独立音乐馆、歌名搜索和筛选播放列表

**Files:**
- Create: `src/features/library/music-filter.ts`
- Create: `src/features/library/music-filter.test.ts`
- Create: `src/features/library/MusicPage.tsx`
- Create: `src/features/library/MusicPage.test.tsx`
- Create: `src/features/library/test/render-public.tsx`
- Create: `src/features/library/test/library-fixtures.ts`
- Create: `src/styles/library.css`
- Modify: `src/features/library/PublicApp.tsx`
- Modify: `src/features/home/HomeHeader.tsx`
- Modify: `src/features/home/HomePage.test.tsx`

**Interfaces:**
- Produces: `filterLibrarySongs(songs, {query, categoryId, tagId}): PublicSong[]`。
- Search rule: 只匹配 trim 后、不区分大小写的 `title`，明确不搜索 artist。
- Playback rule: 从结果点击时调用 `playTrack(song.id, resultIds)`；清空全部条件后的结果队列即完整 published library。

- [ ] **Step 1: 写歌名限定搜索和组合筛选的失败测试**

```ts
it('searches title only and combines one category with one tag', () => {
  expect(filterLibrarySongs(songs, {query: ' 星球 ', categoryId: null, tagId: null}))
    .toEqual([planetSong]);
  expect(filterLibrarySongs(songs, {query: 'Hanser', categoryId: null, tagId: null}))
    .toEqual([]);
  expect(filterLibrarySongs(songs, {query: '', categoryId: 'live', tagId: 'gentle'}))
    .toEqual([liveGentleSong]);
});
```

- [ ] **Step 2: 写页面结果队列和空状态的失败测试**

`src/features/library/test/render-public.tsx` 使用真实 MemoryRouter/LibraryContext 和只 mock 命令的 PlayerContext 导出 `renderPublic`；`library-fixtures.ts` 以字面量导出 `libraryFixture`、`allPublishedIds` 和 `libraryWithSections`：

```tsx
it('plays inside the current result set and restores the full queue after reset', async () => {
  const user = userEvent.setup();
  renderPublic('/music', libraryFixture);
  await user.type(screen.getByLabelText('按歌名搜索'), '星球');
  await user.selectOptions(screen.getByLabelText('分类'), 'live');
  await user.click(screen.getByRole('button', {name: '播放 等火山喷发的小星球'}));
  expect(player.playTrack).toHaveBeenCalledWith('volcano-planet', ['volcano-planet']);
  await user.click(screen.getByRole('button', {name: '清除筛选'}));
  await user.click(screen.getByRole('button', {name: '播放 初光'}));
  expect(player.playTrack).toHaveBeenLastCalledWith('first-light', allPublishedIds);
});

it('distinguishes a valid empty search result from an empty library', async () => {
  renderPublic('/music', libraryFixture);
  await userEvent.type(screen.getByLabelText('按歌名搜索'), '不存在');
  expect(screen.getByRole('status')).toHaveTextContent('没有符合条件的歌曲');
  expect(screen.queryByText('曲库还是空的')).not.toBeInTheDocument();
});
```

- [ ] **Step 3: 运行音乐馆测试并确认 RED**

Run: `npm run test:client -- src/features/library/music-filter.test.ts src/features/library/MusicPage.test.tsx src/features/home/HomePage.test.tsx`

Expected: FAIL；音乐馆和新筛选规则尚不存在。

- [ ] **Step 4: 实现 `/music` 页面和查询参数**

页面从 LibraryProvider 读取全部 published songs/categories/tags；搜索框、分类 select、标签 select 都是受控字段。初始 query 从 `?q=` 读取，变更时用 history replace 保持可分享 URL；分类/标签用空字符串表示“全部”。歌曲按钮只调用 Provider 的 ID API；不排序原数组，保持服务端 published 时间顺序。

- [ ] **Step 5: 调整普通导航和首页搜索入口**

`HomeHeader` 的“音乐馆”使用 React Router `Link` 指向 `/music`；首页搜索提交后导航到 `/music?q=<encoded title query>`，placeholder 改为“按歌名搜索”，不再在首页内按歌手过滤。首页、音乐馆之间导航不得重建 PlayerProvider，迷你播放器保持固定。

- [ ] **Step 6: GREEN、重构与回归**

Run: `npm run test:client -- src/features/library/music-filter.test.ts src/features/library/MusicPage.test.tsx src/features/home/HomePage.test.tsx src/App.test.tsx`

Expected: PASS，title-only 搜索、单分类、单标签、组合筛选、无结果、URL query 和临时队列全部通过。

Run: `npm run test:client -- src/features/player/PlayerProvider.test.tsx`

Expected: 临时结果上一首/下一首/ended 循环与全曲库恢复通过。提取 `MusicSongCard` 只在重复 JSX 明显时进行，不新增页面级播放器状态。

- [ ] **Step 7: 规格符合性审查**

确认独立 `/music`、全部已发布歌曲、只搜歌名、单分类/标签筛选、明确无结果、点击立即播放、当前结果成为临时列表、清除筛选恢复全曲库均有测试。

- [ ] **Step 8: 代码质量审查**

检查 query URL 编码、筛选选项失效、歌曲/分类/标签 ID 比较、空白搜索、中文大小写处理、按钮 accessible name、导航时唯一播放器 identity 和移动端控件顺序。

- [ ] **Step 9: 建议独立提交点**

```powershell
git add src/features/library/music-filter.ts src/features/library/music-filter.test.ts src/features/library/MusicPage.tsx src/features/library/MusicPage.test.tsx src/features/library/test/render-public.tsx src/features/library/test/library-fixtures.ts src/features/library/PublicApp.tsx src/features/home/HomeHeader.tsx src/features/home/HomePage.test.tsx src/styles/library.css
git commit -m "feat: add searchable music library"
```

- [ ] **Step 10: 推送并核验 Task 14 提交**

Run: `git push origin codex/pc-music-player`

Expected: 推送成功；工作区干净，本地与远端 `codex/pc-music-player` SHA 完全相同。

- [ ] **Step 11: 生成 Task 15 新窗口交接提示词**

按 Required handoff output 使用实际 Task 14 SHA，下一任务精确填写“Task 15 — 将首页分区和今日统计接入动态曲库”。输出提示词后停止。

---

### Task 15: 将首页分区和今日统计接入动态曲库

**Files:**
- Modify: `src/features/home/HomePage.tsx`
- Modify: `src/features/home/HomePage.test.tsx`
- Modify: `src/features/home/FeaturedTracks.tsx`
- Modify: `src/features/home/DailyFeatures.tsx`
- Modify: `src/features/home/HomeHeader.tsx`
- Modify: `src/features/home/home-utils.ts`
- Modify: `src/features/home/home-utils.test.ts`
- Modify: `src/features/home/daily-listening.ts`
- Modify: `src/features/home/useDailyListeningStats.ts`
- Modify: `src/features/home/useDailyListeningStats.test.tsx`
- Delete: `src/features/player/demo-tracks.ts`
- Delete: `src/features/player/demo-audio.ts`
- Modify: `src/styles/global.css`

**Interfaces:**
- Consumes: `LibraryResponse.sections`、稳定 `PublicSong.id`、Task 13 `playTrack(songId)`。
- Produces: 首页“精选歌曲”“直播翻唱精选”“最近加入”各最多 6 首；每日憨曲按本地日期从全部 published songs 稳定选择。
- Preserves: 当前统计键 `255-phonograph:listening:<YYYY-MM-DD>` 和 `{date,totalSeconds,trackSeconds}` 结构，过渡歌曲 ID 保持不变以尽量保留升级当天累计。

- [ ] **Step 1: 写动态分区、六首上限和每日稳定选择的失败测试**

在 `HomePage.test.tsx` 内扩展既有真实 Provider harness，并复用 Task 14 的 `libraryFixture` 与 `libraryWithSections`；分区 ID 和歌曲均由测试夹具的字面量声明：

```tsx
it('renders three server-defined sections capped at six and plays by stable id', async () => {
  const library = libraryWithSections({recent: 8, featured: 7, liveCovers: 7});
  renderPublic('/', library);
  expect(within(screen.getByRole('region', {name: '最近加入'})).getAllByRole('article'))
    .toHaveLength(6);
  expect(within(screen.getByRole('region', {name: '精选歌曲'})).getAllByRole('article'))
    .toHaveLength(6);
  await userEvent.click(screen.getByRole('button', {name: '播放每日憨曲：初光'}));
  expect(player.playTrack).toHaveBeenCalledWith('first-light');
});

it('keeps story previews non-navigable and links every music section to the library', () => {
  renderPublic('/', libraryFixture);
  const musicLinks = screen.getAllByRole('link', {name: '进入音乐馆'});
  expect(musicLinks.length).toBeGreaterThan(0);
  expect(musicLinks.every((link) => link.getAttribute('href') === '/music')).toBe(true);
  expect(screen.queryByRole('link', {name: /故事会精选|最近更新|时间轴/})).toBeNull();
});
```

- [ ] **Step 2: 写统计升级兼容和规则回归的失败测试**

```ts
it('preserves an existing same-day stable-id record', () => {
  const storage = memoryStorage({
    '255-phonograph:listening:2026-09-03': JSON.stringify({
      date: '2026-09-03', totalSeconds: 73, trackSeconds: {'first-light': 11},
    }),
  });
  expect(toDailyListeningView(readDailyStats('2026-09-03', storage))).toEqual({
    date: '2026-09-03', totalSeconds: 73, minutes: 1, songCount: 1,
    concentration: 2,
  });
});
```

保留并明确断言：恰好 10 秒不计、超过 10 秒计一次、同 ID 不重复计数、跨本地日重置、只累计确认播放秒数、浓度 `min(100, round(seconds / 3600 * 100))`。

- [ ] **Step 3: 运行首页与统计测试并确认 RED**

Run: `npm run test:client -- src/features/home/HomePage.test.tsx src/features/home/home-utils.test.ts src/features/home/useDailyListeningStats.test.tsx`

Expected: FAIL；首页仍使用旧静态 tracks 结构和旧分区占位。

- [ ] **Step 4: 实现三个动态首页分区和每日憨曲**

用 `sections` 中的 ID 从 library song Map 取值，过滤失效 ID 后再次 `slice(0, 6)`；每个分区都有 `/music` 入口。每日憨曲对全部 published songs 使用 `getDailyTrackIndex(localDate, songs.length)`，同一天刷新稳定；按钮调用 `playTrack(id)`，因此使用全曲库默认队列。最近加入和两个标记分区不在前端重新解释发布时间。

- [ ] **Step 5: 保留故事预览和统计兼容**

故事会三张预览继续显示“尚未开放”，不新增详情路由。统计继续按 `currentTrack.id` 累计；读取同日旧结构原样保留总秒数和合法 trackSeconds，即使其中某个 ID 暂时不在曲库也不删当天历史。移除 App 对 `demoTracks`/`demoAudio` 的运行时依赖；保留这两个文件仅到本任务测试/引用完全迁移后删除，删除前用 `rg` 确认无引用。

- [ ] **Step 6: GREEN、重构与受保护功能回归**

Run: `npm run test:client -- src/features/home/HomePage.test.tsx src/features/home/home-utils.test.ts src/features/home/useDailyListeningStats.test.tsx`

Expected: PASS，三个分区、每日歌曲、故事占位和全部统计规则通过。

Run: `npm run test:client -- src/features/player src/App.test.tsx`

Expected: 播放、自动续播、歌词、频谱、快捷键、唱片布局和唯一音频全部通过。删除不再使用的首页搜索过滤代码，保持 daily pure functions 小而确定。

- [ ] **Step 7: 规格符合性审查**

确认首页三分区最多 6 首、发布时间排序由服务端稳定提供、每日憨曲从全部 published 选择、歌曲卡共享播放、故事不建空页、今日统计公式/阈值/跨日/稳定 ID/同日数据保留全部符合规格。

- [ ] **Step 8: 代码质量审查**

检查失效 section ID、空数组（应由 LibraryGate 拦截）、日期切换、interval cleanup、隐藏标签页计时是否仍以 confirmed `isPlaying` 为准、Map 构造 memo、删除 demo 文件前无引用且未删除任何测试保护。

- [ ] **Step 9: 建议独立提交点**

```powershell
git add src/features/home src/features/player/demo-tracks.ts src/features/player/demo-audio.ts src/styles/global.css
git commit -m "feat: connect home to the local library"
```

- [ ] **Step 10: 推送并核验 Task 15 提交**

Run: `git push origin codex/pc-music-player`

Expected: 推送成功；工作区干净，本地与远端 `codex/pc-music-player` SHA 完全相同。

- [ ] **Step 11: 生成 Task 16 新窗口交接提示词**

按 Required handoff output 使用实际 Task 15 SHA，下一任务精确填写“Task 16 — 完成响应式、异常状态、全量回归和浏览器验收”。输出提示词后停止。

---

### Task 16: 完成响应式、异常状态、全量回归和浏览器验收

**Files:**
- Create: `src/components/MediaImage.tsx`
- Create: `src/components/MediaImage.test.tsx`
- Modify: `src/styles/global.css`
- Modify: `src/styles/library.css`
- Modify: `src/styles/admin.css`
- Modify: `src/features/player/MiniPlayer.tsx`
- Modify: `src/features/player/DiscArtwork.tsx`
- Modify: `src/features/player/FullPlayer.tsx`
- Modify: `src/features/library/PublicLibraryState.tsx`
- Modify: `src/features/library/MusicPage.test.tsx`
- Modify: `src/features/admin/AdminSongListPage.test.tsx`
- Modify: `src/features/admin/SongForm.test.tsx`
- Modify: `src/App.test.tsx`
- Modify: `README.md`

**Interfaces:**
- Produces: `MediaImage` 在封面请求失败时切换到统一 CSS 默认封面，不冒泡导致页面崩溃。
- Acceptance viewports: `390×844`、`1280×720`、`1920×1080`。
- Produces documented local workflow: `npm run dev`、`npm run build && npm start`，以及真实数据目录说明。

- [ ] **Step 1: 写资源失败、底部避让和可访问状态的失败测试**

```tsx
it('falls back from a broken cover without removing player controls', async () => {
  render(<MediaImage src="/api/media/broken" alt="初光 封面" fallbackLabel="初光" />);
  fireEvent.error(screen.getByRole('img', {name: '初光 封面'}));
  expect(screen.getByRole('img', {name: '初光 默认封面'})).toBeInTheDocument();
});

it('keeps ordinary pages clear of the fixed mini player', () => {
  renderPublic('/music', libraryFixture);
  expect(screen.getByRole('main')).toHaveClass('page-with-mini-player');
  expect(window.getComputedStyle(screen.getByRole('main')).paddingBottom)
    .not.toBe('0px');
});
```

管理表单测试核对每个错误 `aria-describedby`、进度既有 `progressbar` 又有文本、dialog 可 Escape/取消、窄屏列表具有语义化字段标签。App 测试核对 loading/unavailable/error/empty 文案互不混用。

- [ ] **Step 2: 运行异常和布局语义测试并确认 RED**

Run: `npm run test:client -- src/components/MediaImage.test.tsx src/App.test.tsx src/features/library/MusicPage.test.tsx src/features/admin/AdminSongListPage.test.tsx src/features/admin/SongForm.test.tsx`

Expected: FAIL；统一资源回退或最终布局语义尚未完成。

- [ ] **Step 3: 实现统一资源回退和三档响应式样式**

`MediaImage` 仅在有效 src 时渲染 `<img>`，`onError` 后渲染与现有唱片 fallback 同视觉语言的 `role=img` CSS 块；歌词请求失败继续显示“暂无歌词”，单资源错误不替换整个 Player。首页/音乐馆使用 `.page-with-mini-player`：桌面底部至少 208px，中窄屏至少 260px。390px 下筛选器、表单、状态 tabs 和操作按钮单列；1280px 保证 720px 高度可滚动且播放器不遮内容；1920px 限制正文最大宽度。后台表格在窄屏变为带字段名的 cards。

- [ ] **Step 4: 完成键盘、减少动画和失败状态**

所有页面提供可见 focus；表单错误与字段绑定；上传进度/取消/成功/失败有 live region；登录、编辑、筛选、播放、确认全键盘可达。保留唱片播放旋转，但 `prefers-reduced-motion: reduce` 下停用；不得添加任何 mount/route 入场 animation。服务未运行、HTTP 失败、空曲库、搜索无结果、无歌词、破损封面、音频失败分别使用规格文案。

- [ ] **Step 5: GREEN 并运行全部自动验证**

Run: `npm run test:client`

Expected: 所有 React、播放器、首页、音乐馆和后台测试通过。

Run: `npm run test:server`

Expected: 所有数据库、存储、认证、上传、歌曲、公开 API 和 Range 测试通过，测试结束没有遗留临时目录/句柄。

Run: `npm run typecheck`

Expected: 浏览器和服务端均为 0 TypeScript errors。

Run: `npm run build`

Expected: Vite 与服务端生产构建成功；只有被忽略的 `dist/`、`server-dist/` 产物。

- [ ] **Step 6: 启动并完成应用内浏览器验收**

Run: `npm run dev`

Expected: 一个命令同时启动 Vite 和 Fastify；浏览器能从 Vite 地址访问 `/`、`/music`、`/admin`。

在应用内浏览器依次设置 `390×844`、`1280×720`、`1920×1080`，每档检查首页、音乐馆、首次设置/登录、歌曲列表/表单、回收站、迷你播放器和完整播放器；确认普通内容不被底部播放器遮挡、无开屏/入场动画、焦点可见、完整播放器唱片布局保持。

- [ ] **Step 7: 执行完整业务验收链**

使用测试专用 `PHONOGRAPH_DATA_DIR` 启动，完整执行：首次设置密码 → 上传一首音频草稿（观察进度）→ 取消一次并重传 → 填资料/封面/LRC/分类/标签 → 发布 → 首页分区出现 → 音乐馆按歌名搜索并筛选 → 点击后验证结果队列 next/previous 循环 → 展开播放器检查拖动、音量、静音、歌词、频谱、快捷键和自动下一首 → 刷新后恢复歌曲/进度/音量/队列但保持暂停 → 下架 → 刷新普通曲库后消失 → 入回收站并恢复 → 再下架/入回收站/二次确认永久删除。

若应用内浏览器不可用或报告可信依赖路径错误，保持本地服务运行，不切换到未经授权的独立自动化工具，不声称浏览器验收成功；把上述三视口和业务链逐项列为“需用户手动检查”。

- [ ] **Step 8: 检查禁止提交内容和工作树差异**

Run: `git status --short --branch`

Expected: 分支仍为 `codex/pc-music-player`；没有数据库、媒体、密码、真实数据目录、`node_modules`、`dist` 或 `server-dist` 条目。

Run: `git ls-files | rg -i "(^|/)(node_modules|dist|server-dist|data)(/|$)|\.(mp3|m4a|wav|jpg|jpeg|png|webp|db|sqlite|sqlite3)$"`

Expected: 无输出；若仓库此前已有受控例外，逐一对照基线，不新增任何禁止文件。

Run: `git diff --check b294e86..HEAD`

Expected: 无 whitespace errors。

Run: `git diff --stat b294e86..HEAD`

Expected: 只有计划列出的源代码、测试、配置和文档；无意外二进制或大文件。

- [ ] **Step 9: 最终规格符合性审查**

重新通读批准规格 1–10 节，使用本计划末尾 Traceability Matrix 逐行核对证据；重点确认唯一播放器、自动续播、歌词、频谱、快捷键、唱片布局、今日统计、项目外数据、管理状态机、Range、三种错误状态和三档视口全部有自动或浏览器证据。确认第 2.2 和第 11 节内容均未实现。

- [ ] **Step 10: 最终代码质量审查**

审查完整 `b294e86..HEAD`：模块边界、跨端类型、SQL 参数化、事务补偿、路径安全、会话安全、流/Abort cleanup、React 请求竞态、单 Audio identity、可访问名称、响应式 CSS、无未使用 demo 代码、无跳过测试或宽泛 `any`。发现问题先新增失败测试再修复，并重跑 Steps 5–8。

- [ ] **Step 11: 建议独立提交点**

```powershell
git add src/components src/styles src/features/player src/features/library src/features/admin src/App.test.tsx README.md
git commit -m "test: complete local library acceptance"
```

- [ ] **Step 12: 推送并核验 Task 16 提交**

Run: `git push origin codex/pc-music-player`

Expected: 推送成功；工作区干净，本地与远端 `codex/pc-music-player` SHA 完全相同。不得合并或部署。

- [ ] **Step 13: 生成只读最终审阅窗口交接提示词**

按 Required handoff output 使用实际 Task 16 SHA；把唯一工作改为“只读最终审阅 Task 1–16”，要求对照批准规格、提交序列、自动测试、禁止文件扫描和浏览器验收证据，只报告问题，不修改代码、不提交、不推送、不合并、不部署。输出提示词后停止。

---

## Traceability Matrix

| 批准规格阶段/保护项 | 主要实施任务 | 自动证据 | 浏览器证据 |
| --- | --- | --- | --- |
| 本地服务端与统一启动 | Task 1 | config/app tests、typecheck/build | 一个命令访问三条路由 |
| SQLite 初始化、升级、过渡歌曲 | Task 2 | migration/seed tests | 初次启动可见三首过渡歌 |
| 项目外媒体目录、可替换存储 | Task 3 | store/cleanup/range-open tests | 设置页显示目录 |
| 管理密码与会话 | Tasks 4、10 | auth service/route/UI tests | 首次设置、登录、退出、改密 |
| 音频、封面、LRC 上传校验 | Tasks 5、12 | validator/upload/UI tests | 进度、取消、失败重试、时长/LRC 提示 |
| 生命周期、分类、标签 | Tasks 6、7、11、12 | service/route/UI state tests | 发布、下架、回收站、恢复、永久删除 |
| 公开曲库与媒体 Range | Task 8 | public API、200/206/404/416 tests | 播放、拖动进度 |
| 管理后台页面 | Tasks 10–12 | admin component tests | 桌面/窄屏后台完整流程 |
| 独立音乐馆、歌名搜索、筛选队列 | Task 14 | filter/page/queue tests | 搜索筛选、上一首/下一首循环 |
| 唯一播放器、动态曲库、刷新暂停恢复 | Tasks 9、13 | identity/reorder/snapshot tests | 导航不断播、刷新恢复但暂停 |
| 首页分区和今日统计 | Task 15 | sections/daily stats tests | 三分区、每日憨曲、统计跨日 |
| 响应式、异常和完整回归 | Task 16 | full suites/typecheck/build | 390×844、1280×720、1920×1080 |
| 播放/暂停、进度、音量、静音 | Tasks 13、16 | PlayerProvider/Controls tests | 完整业务链 |
| 自动续播、歌词、频谱、快捷键 | Tasks 5、13、16 | existing dedicated regression tests | 完整播放器实听 |
| 唱片布局、减少动画、无入场动画 | Tasks 13、16 | FullPlayer tests/CSS assertions | 三视口完整播放器 |
| 不包含云端/APK/账号/评论/故事上传 | Global Constraints、Task 16 | diff review | 验收中不出现相关入口 |

## Plan Self-Review Checklist

- [x] **Dependency order:** 后端配置 → 数据库/存储 → 认证/上传/业务 → 公开 API → 前端加载 → 后台 → 稳定 ID 播放器 → 音乐馆/首页 → 全量验收；没有任务依赖后置模块。
- [x] **Test coverage:** 每个阶段都有先失败的测试、精确聚焦命令、GREEN 命令和受影响回归；服务端测试只使用临时目录/数据库。
- [x] **Path audit:** 所有 Create/Modify/Delete/Test 路径在 File Map 或既有仓库中有责任说明；新目录归属明确。
- [x] **Type consistency:** `SongStatus`、`LibraryResponse`、`SongDraftInput`、`MediaKind`、`PlayerSnapshotV2`、`playTrack(trackId, queueIds?)` 在生产端、前端和测试使用相同拼写与含义。
- [x] **Specification coverage:** Traceability Matrix 覆盖批准规格所有包含项、失败状态、可访问性、视口和最终验收；所有明确排除项留在 Global Constraints，未被任务引入。
- [x] **Protected behavior:** 播放器唯一性、自动续播、歌词、频谱、快捷键、唱片定位、音量/静音/进度、今日统计分别有现有测试和新增回归命令。
- [x] **Placeholder scan:** 已扫描空泛占位语句和未定义引用，未把待决设计留给执行者。
- [x] **Artifact safety:** 计划没有要求提交媒体、数据库、密码、运行数据、`node_modules` 或构建产物；所有真实状态变化仅存在于后续明确获批的执行任务。
- [x] **Window isolation:** 计划文档提交、Task 1–16 和最终只读审阅分别进入新窗口；每个开发窗口只执行一个任务。
- [x] **Push continuity:** 每个任务在交接前都要求非强制推送、核对本地/远端 SHA，并把实际完整 SHA 写入下一窗口提示词。

## Execution Boundary

本次获批只允许修改、提交并推送本计划文档。计划推送成功后生成 Task 1 新窗口提示词并停止；未在新窗口获得针对 Task 1 的明确执行请求前，不修改功能代码、不安装依赖、不创建数据库或媒体。后续窗口只按 One Task Per Window Delivery Protocol 提交并推送自己的单项任务，任何窗口都不得自行合并或部署。
