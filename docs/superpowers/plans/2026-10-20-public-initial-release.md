# 255 留音机公开初版功能完善 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 争取 2026-11-10 前完成可公开使用的初版，为重新提交公安备案预留时间。用户最新顺序为视觉先行：首页＋迷你播放器样板，再统一音乐馆、完整播放器及其他功能，最后打磨细节。公共页脚批次已完成；当前暂定 B“毛怪手帐”，界面先保持现状，后续按用户具体反馈调整。

**Architecture:** 保留 React 公共站点、单一 PlayerProvider 和独立管理后台。通过 PublicApp 统一组合页面、播放器与 SiteFooter，使曲库加载失败或为空时备案信息仍可访问。现有 Fastify、SQLite、独立媒体目录和服务器入口继续复用。

**Tech Stack:** React 19、React Router 7、TypeScript、Vite 7、Vitest 4、Testing Library；后端 Fastify / SQLite，本批不修改后端。

---

## 范围、证据和授权

- **最新协作规则：** 2026-10-20 用户更新协作规则：简单、可撤销的界面、文案、文档调整及相应本地验证，授权代理自行判断并执行，不再逐文件等待用户批准；重大设计方向、技术架构、范围显著扩大或高影响操作先征求用户意见。提交、推送、部署、云资源、真实数据和破坏性操作仍单独确认。此最新规则覆盖此前对所有文件写入逐项审批的要求；历史审批记录保留，不追溯改写。不自动派发子代理。
- **当前简单调整：** 在现有四个样板/文档文件中补回首页“每日一签”预留位，显示“功能筹备中”并禁用入口；同步功能暂缓及新规则，不开发抽签逻辑。

- 此前样板批次授权（2026-10-20）：用户批准仅修改视觉样板 compare.html、PRODUCT.md、private-cloud-next-steps.md 和本计划四文件，新增晚安电台独立读书视频页面样板、进入/返回交互及空状态，更新产品定位。此前同四文件的 B 默认展示与改名批次已完成。桌面和手机检查不写截图或构建产物；视频上传、真实播放及正式 React 页面接入另批。下述 Task 1—3 与八文件授权为此前页脚批次的历史记录。

- 2026-10-20 用户批准上一轮列明的八文件及本地客户端测试、类型检查、构建，并补充“现在的阶段计划是丰富网站的功能”。功能完善是主线，内容整理和备案作为验收配套。
- 工作树：`E:/codex/hanser/.worktrees/pc-music-player`；分支 `codex/pc-music-player`；起始 HEAD `22db7be60e58dacd892cfffccde472584bbc506a`。
- 编辑前已有三份部署文档修改、四个 COS 脚本/测试未跟踪；保留原内容与证据。服务器发布目录沿用此前确认的 `ad23f3644498dd542357092c1aaca018e5c971d4`，本批本地修改不等于已上线。
- ICP 已通过：`蜀ICP备2026063099号-1`；备案网站名为毛怪小站，网站品牌为 255 留音机。公安申请已由用户取消，状态为准备重新申请，没有公安备案号。
- 用户终端确认域名 A 记录解析到 `1.14.111.74`、Caddy active/running/enabled、HTTPS health 返回 200；用户浏览器截图确认首页能打开。代理没有独立完成公网浏览器复验。
- 本地初始化代码生成三首 1 秒合成音频；未读取线上数据库来确认当前每个文件。真实音频上传、播放、拖动和手机体验仍需实际验证。
- 产品依据：`docs/superpowers/specs/2026-09-03-local-music-library-admin-design.md`。其“云端部署不在范围”是当时阶段边界，当前入口事实以 2026-10-20 用户证据为准。

## 功能路线（后续方向，按最新协作规则判断执行范围）

| 时间目标 | 功能重点 | 验收结果 |
| --- | --- | --- |
| 10月20—23日 | 公共页脚已完成；视觉方向、首页结构和播放器布局先行，完成首页＋迷你播放器样板 | B“毛怪手帐”暂定；晚安电台为读书企划；样板与正式产品能力区分 |
| 10月24—31日 | 获批后将首页与迷你播放器样式接入已有 React 组件，再统一音乐馆和完整播放器；同步真实音频上传验收 | 复用共享播放状态及接口；浏览、搜索、播放、拖动和切歌可实际使用 |
| 11月1—7日 | 按统一样式完善其他功能和各状态，最后打磨细节；完成必要数据备份恢复验证 | 核心功能在手机和电脑可用，已发布内容可保存和恢复 |
| 11月8—10日 | 初版功能冻结、真实内容验收、发布验证 | 首批真实内容可浏览播放，主要流程无阻断问题 |
| 争取11月12日前 | 根据实际网站功能和内容重新提交公安备案 | 提交后预留补充材料时间；内部排期不代表审核通过或法律期限认定 |

首页保留“每日一签”禁用占位，提示“功能筹备中”；抽签、签文、结果页与持久化暂缓开发。

当前以用户最新的视觉优先顺序为准，覆盖此前“音乐馆功能优先”的排序。B 版界面暂时保持，后续按用户指出的具体位置调整；接入真实首页与迷你播放器需先明确文件与验证范围；简单调整自主执行，重大结构或范围变化先确认。音乐馆排序、时长/版本信息、筛选反馈、可见播放队列及播放模式随后评估。代码已具备稳定编号的临时播放队列和刷新恢复，不把现有能力再开发一次。

初版沿用首页、音乐馆、播放器、管理后台四个核心部分。账号注册、评论、用户上传、APP 和晚安电台完整发布系统作为后续候选，不自动纳入本批。晚安电台已明确为用户的读书视频企划：首页入口进入独立站内页面，承载后续上传的视频。本次只做页面样板、进入/返回和视频空状态，不虚构书目、期数、朗读者或示例视频；上传、真实播放及后台接口另行审批。真实音频由用户提供可使用的素材；示例音频不充当完整内容。www 解析、入口模板对齐、服务器发布和备案提交均按各自准确范围另批。

## Task 1: 更新阶段与部署记录

**Files:**
- Modify: `docs/deployment/private-cloud-next-steps.md`
- Modify: `docs/deployment/private-cloud-acceptance.md`
- Modify: `docs/deployment/private-cloud-runbook.md`
- Create: `docs/superpowers/plans/2026-10-20-public-initial-release.md`

- [x] 更新当前摘要与状态表：ICP 通过、公安申请取消、管理员已初始化、公网已打通、初版功能开发进行中。
- [x] 保存用户回传的 DNS、端口、Caddy、HTTPS 健康检查和浏览器证据。历史 COS/age 检查继续保留，不称为正式备份已验收。
- [x] 在运维手册记录实际公开 Caddy 配置，并给旧私用模板加历史适用范围，避免后续覆盖现有入口。
- [x] 以本计划的功能路线替换“继续 COS 测试优先”的接续指令。备份恢复仍是发布前验收工作，额外权限测试和成本模型不挤占当前功能开发主线。

验证：`git diff --check` 预期退出码 0；检查三文档当前摘要一致、相对链接存在，保留历史时间语境。文档不新增自动化测试。

## Task 2: 公共页脚与播放器留白

**Files:**
- Create: `src/components/SiteFooter.tsx`
- Modify: `src/features/library/PublicApp.tsx`
- Modify: `src/styles/global.css`
- Modify: `src/App.test.tsx`

- [x] 在已有 App 集成用例中检查正常、加载、网络失败、HTTP 失败、空曲库时都能找到备案链接；检查路由切换后仍只有一个页脚和一个播放器；后台继续独立。使用以下断言，不为静态组件另建镜像测试：

```tsx
const footer = screen.getByRole('contentinfo', {name: '网站备案信息'});
expect(within(footer).getByRole('link', {name: '蜀ICP备2026063099号-1'}))
  .toHaveAttribute('href', 'https://beian.miit.gov.cn/');
```

原来主内容底部的播放器安全留白迁到页脚下面。已有断言改为公共外壳 `min-height: 100vh`、页脚桌面 `padding-bottom: 208px`，保留路由切换不重建 Audio 的断言。

- [x] 运行 `node node_modules/vitest/vitest.mjs run src/App.test.tsx --reporter=dot`。预期新断言因当前没有页脚而失败。
- [x] 新建完整页脚组件：

```tsx
export function SiteFooter() {
  return (
    <footer aria-label="网站备案信息" className="site-footer">
      <a href="https://beian.miit.gov.cn/" rel="noopener noreferrer" target="_blank">
        蜀ICP备2026063099号-1
      </a>
    </footer>
  );
}
```

- [x] 在 PublicApp 引入 `SiteFooter`，保留现有轨道转换、PublicRoutes、PlayerSurface，替换 PublicApp 的返回分支：

```tsx
export function PublicApp() {
  const {library, status} = useLibrary();
  const tracks = useMemo(() => toPlayerTracks(library?.songs ?? []), [library?.songs]);
  const isPlayable = status === 'ready' && tracks.length > 0;

  return (
    <div className={`public-site-shell${isPlayable ? ' public-site-shell--with-player' : ''}`}>
      {isPlayable ? (
        <PlayerProvider tracks={tracks}>
          <PlayerSurface />
        </PlayerProvider>
      ) : (
        <PublicLibraryState status={status === 'ready' ? 'empty' : status} />
      )}
      <SiteFooter />
    </div>
  );
}
```

- [x] 在现有 `.public-library-state p` 规则后添加样式：

```css
.public-site-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.public-site-shell > main {
  flex: 1;
  min-height: 0;
}

.public-site-shell > .page-with-mini-player {
  padding-bottom: 48px;
}

.site-footer {
  flex-shrink: 0;
  padding: 24px 24px 32px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(247, 242, 232, 0.72);
  font-size: 13px;
  line-height: 1.7;
  text-align: center;
}

.site-footer a {
  display: inline-block;
  padding: 8px 4px;
  color: inherit;
  text-underline-offset: 4px;
}

.site-footer a:hover,
.site-footer a:focus-visible {
  color: #f1c96f;
}

.public-site-shell--with-player .site-footer {
  padding-bottom: 208px;
}
```

在现有 `@media (max-width: 1023px)` 内添加：

```css
.public-site-shell--with-player .site-footer {
  padding-bottom: 260px;
}
```

- [x] 重跑 App 聚焦用例，预期全部通过。PlayerProvider 不增加 key、不移入路由；管理员、歌曲和媒体接口保持原样。

## Task 3: 验证与交接

- [x] `node node_modules/vitest/vitest.mjs run --reporter=dot`：预期全量客户端通过，记录实际数量和退出码。
- [x] `node node_modules/typescript/bin/tsc --noEmit` 与 `node node_modules/typescript/bin/tsc -p tsconfig.server.json --noEmit`：预期退出码 0。
- [x] `node node_modules/vite/bin/vite.js build` 与 `node node_modules/typescript/bin/tsc -p tsconfig.server.json`：预期退出码 0，生成 `dist/` 与 `server-dist/`；工具缓存仅写入已批准的 `node_modules/.vite/`、`node_modules/.vite-temp/`。
- [x] `git diff --check`、`git status --short`，复核本批八文件和既有四个 COS 文件哈希。
- [x] 将实际验证结果写入本文和验收记录，注明本地构建尚未发布。真实浏览器尺寸、可点击性、遮挡未实测时保持待验收。

## 执行记录

- Pre-flight: SiteFooter 由 PublicApp 使用；CSS 与 JSX className 一致；公共异常和正常状态使用同一外壳。原 App 断言检查主内容留白，改为页脚下方留白。
- Ruling: 台账维护在本计划，复用已有工作树，不生成额外技能工作区或提交记录——批准限八文件和指定构建/缓存路径，范围扩展、提交、部署须另批。
- Ruling: 后续功能路线是排期方向，本批只实现已列明的页脚和布局——用户强调丰富功能，但尚未批准具体新功能文件。
- Ruling: 本批运行客户端回归、两端类型检查与构建——后端未改，真实数据库/媒体与仓库外服务端测试夹具不在本批写入范围。
### 本批完成记录（2026-10-20）

- Task 1: complete — 三份部署文档已更新当前摘要、备案与公网证据、功能路线和跨电脑接续；原 COS/age 历史记录保留。当前八文件未提交、未部署。
- Task 2: complete — App 新断言先出现 7 failed / 6 passed，均因页脚不存在；实现后 13/13 通过。统一页脚覆盖正常、加载、网络失败、HTTP 失败和空曲库，路由切换仍保持单个播放器。
- Task 3: complete — 全量客户端 30 文件 163/163 通过；前后端 noEmit、Vite 构建和服务端编译退出码均为 0；git diff --check 无空白错误，50 个文档相对链接均可解析，没有计划占位项。
- 四个既有 COS 脚本/测试 SHA-256 与本批修改前一致；没有修改依赖、后端、云端配置或真实数据。运行产物仅落入获批构建/工具缓存目录。
- Review: 实现者逐项复核公共分支、CSS 留白、路由切换、文档当前/历史证据区分；沿用用户接续要求，不自动派发子代理，未进行独立审查。没有未解决的本批实现阻断项。
- 体验验收边界：真实浏览器尺寸、页脚外链点击与固定播放器遮挡没有实测；现有 DOM/CSS 测试不替代实际浏览器验收。线上仍使用原发布版本。
- 当时安排下一批核对音乐馆排序、时长/版本展示和筛选反馈；该排序已被下方最新视觉优先决定替代。页脚批次完成不代表公开初版交付。

### 最新视觉决定与样板调整（2026-10-20）

- 用户确认“界面暂时这样，后面我再说具体哪里要改”：B“毛怪手帐”作为当前界面基准，暖白纸感、绿色点缀、hanser 图片和布局保持现状；样板默认打开 B，A/C 保留供比较。
- 原“故事会”统一改为“晚安电台”，定位为用户的读书企划；栏目文案“读一段文字，道一声晚安。”，补充“读书企划”，不虚构具体内容或发布状态。
- 本批只涉及获批的四个样板/文档文件，保留现有播放器演示、歌曲封面兜底和 ICP 页脚。样板没有真实音频，尚未接入正式 React 页面，也未提交、推送或部署。
- 下一步按用户具体反馈调整；正式首页与迷你播放器接入、其他页面和晚安电台完整功能各自列范围审批，不把路线图视为写入批准。
- 本批验证：样板默认 B；桌面 1280×720 和手机 390×844 无横向溢出，晚安电台文案与 ICP 链接可见，页面底部与播放器装饰保有留白。桌面晚安电台锚点、播放/暂停和下一首已在独立浏览器标签实测，未见控制台错误；内联 JavaScript 语法检查通过。检查仅针对本地样板，不替代真实音频或正式 React 页面的验收；未生成截图文件或构建产物。

### 晚安电台独立视频页面样板（2026-10-20）

- 用户澄清晚安电台需要进入新界面，承载后续上传的读书视频，并明确批准相同四文件范围。
- 样板在 `#goodnight-radio` 展示独立页面：企划介绍、读书视频标题与空状态；导航和首页栏目均可进入，提供返回首页及去音乐馆入口，支持刷新直达和浏览器后退/前进。手机导航保留晚安电台入口。
- 沿用当前 B“毛怪手帐”的暖白、绿色及既有 hanser 图片，不新增素材文件、不更换首页视觉方向。歌曲、时间、播放状态、搜索词在站内切换期间继续保留，迷你播放器和 ICP 页脚复用。
- 视频封面、标题及观看入口待真实内容接入；本批没有上传按钮、虚构视频或无效播放入口，不读取真实曲库或修改后台。本批验证见下项，历史验证不作为本次通过依据。
- 本批验证通过：进入/返回首页、空状态返回音乐馆、刷新直达、浏览器后退/前进；页面切换保留歌曲、播放/暂停状态、进度和搜索词。1280×720 桌面、768×1024 平板与 390×844 手机已目视检查；另测 320×740 和 1440×1000，均无横向溢出。页面底部备案区域距播放器装饰至少约 30px，仅有一个页脚和一个迷你播放器。新页面 10 组文字/背景对比度最低 5.02:1，浏览器未见控制台错误。按 Taste 方法使用浏览器检查，未运行上游 inspect.mjs，也未保存截图或生成构建产物。

### 每日一签预留与协作规则更新（2026-10-20）

- 只读核对确认原 `src/features/home/DailyFeatures.tsx` 已有每日一签禁用入口，`HomePage.test.tsx` 有对应禁用及“功能筹备中”断言；新版视觉样板此前遗漏，本次补回。
- 每日一签置于每日憨曲下方，手机端顺序排列；使用原生 disabled 按钮并关联筹备中说明，不绑定抽签、弹窗、路由或持久化。
- 用户将简单事项的审批授权代理自行判断执行，重大事项仍征求意见。同步当前产品约束和跨电脑接续提示，保留旧批次审批事实。
- 本次仅调整 compare.html、PRODUCT.md、private-cloud-next-steps.md 和本计划；既有 React 功能、后端、真实数据及线上版本不变。
- 本批验证：1280px 桌面与 390px 手机实际显示已检查，另测 320px、768px 无横向溢出；每日一签位于每日憨曲下方，原生 disabled 状态及“功能筹备中”说明存在。晚安电台进入/返回后占位仍禁用，未见浏览器控制台错误；内联 JavaScript 语法与 git diff --check 通过。原 React 每日功能及其测试未改动，未生成截图或构建产物。

### 音乐馆独立页面样板补齐（2026-10-20）

- 用户确认音乐馆应保留独立页面，并批准仅修改 compare.html、PRODUCT.md、private-cloud-next-steps.md 和本计划。沿用 B“毛怪手帐”，保留 A/C 比较，不扩大为全站改版或正式 React 接入。
- 修正样板原先的首页 `#music` 锚点行为：该地址现在打开独立音乐馆视图，首页推荐区更名为 `home-music`。主导航、逛逛音乐馆、全部歌曲和晚安电台的去音乐馆入口均进入独立视图，支持直接打开、刷新以及浏览器前进/后退。
- 音乐馆提供歌名搜索、分类/标签组合筛选、结果数量和无结果后的清除入口；筛选值及首页搜索词分别保留，点击全部歌曲会清空音乐馆筛选。样板使用原有三首示例，新增示例标签并明确标注，不虚构真实上传或同步结果。
- 切页保留当前曲目、播放/暂停状态、播放进度、音量和静音设置。复用既有 hanser 图片、歌曲封面兜底、迷你播放器、每日一签占位、晚安电台空状态及 ICP 页脚。
- 正式 React `/music` 路由、后台和数据库未修改。后续将获批样式接入正式组件时保留独立音乐馆；线上内容与本地样板分开验收。
- 本批实际浏览器验证：主导航、首页两个入口和晚安电台入口进入独立音乐馆；直接刷新、浏览器前进/后退正常。歌名、分类、标签组合筛选及数量准确，空结果可清除并将键盘焦点送回搜索框；首页搜索与音乐馆筛选分别保留，全部歌曲入口清空音乐馆筛选。
- 页面切换实测保留曲目、暂停状态、进度、音量和静音；另在演示播放中往返首页与音乐馆，进度继续推进。刷新只验证视图直达，不将样板表述为已具备真实音频或刷新后播放恢复。A/C 比较开关仍可切换，交付时恢复 B。
- 1280×800 桌面、768×1024 平板和 390×844 手机已目视检查，另测 320×740；上述尺寸均无横向溢出。页面底部 ICP 区域距迷你播放器装饰至少约 30px，始终只有一个页脚和一个播放器；新增筛选控件至少 44px 高。B 音乐馆实测标题、说明、标签、表单和主要按钮的文字/背景对比度最低 5.02:1，浏览器未见控制台错误。
- 按 Impeccable 延续已确认样式，按 Taste 对实际页面复核；未运行上游 inspect.mjs，未保存截图文件或生成构建产物。内联 JavaScript 语法与 git diff --check 均通过，三份文档的 18 个相对链接全部可解析；211 文件 SHA-256 基线核对仅获批四文件发生变化，没有新增或删除文件，既有修改及图片素材保持不变。

### 正式 React 界面接入批次（2026-10-20，已批准）

- Goal：将 B“毛怪手帐”样板接入现有首页、独立音乐馆、迷你播放器及晚安电台空页面，读取真实 API，形成可部署候选版本。
- Architecture：保留 LibraryProvider、PlayerProvider、后台和媒体接口；在 PublicApp 导入限定公共页面的 public-theme.css，首页与音乐馆共用导航，HanserArtwork 复用现有图片裁切，MediaImage 统一兜底。
- 本批准确范围以聊天中获批 26 个源码/素材/测试/文档文件为准。构建及缓存限 dist、server-dist、node_modules/.vite、node_modules/.vite-temp；隔离数据限 C:/Users/Administrator/AppData/Local/Temp/255-phonograph-public-ui-20261020/。不写额外截图或报告文件。
- Ruling：继续使用本工作树和本计划作为台账；不创建技能工作目录、不自动派发子代理、不提交推送。用户精确写入范围和独立提交/部署审批优先于技能默认流程。
- Pre-flight：公共曲库映射继续提供稳定 Track.id/audioUrl/coverUrl；播放器仍在路由外挂载。音乐馆沿用后端类别与标签，真实 durationSeconds 只在曲库展示，播放进度由 audio metadata 驱动。
- [x] Task P1：先补晚安电台直达、切页播放器复用、统一图片兜底、筛选恢复和队列交互测试；运行指定四个客户端测试文件观察缺失行为。
- [x] Task P2：实现获批样式和组件，原图片原样复制到 public/brand，精确放行 Git 忽略；保留真实听歌记录、每日功能和三组后端分区。
- [x] Task P3：运行全量客户端、上传/歌曲/媒体/公共曲库接口测试、前后端类型检查和构建；在隔离服务验证实际 HTTP/API 和浏览器播放。
- [x] Task P4：Taste 检查桌面/手机页面、错误/空状态、真实封面优先、独立导航和播放器留白；自检差异、更新运维和验收记录，给出候选版本发布范围。线上真实音乐与家庭网络另行验收，不使用示例音频冒充。

- P1 验证：四文件 31 项中先有 6 failed / 25 passed，分别指向未接入的电台路由、队列、图片兜底、导航和 URL 筛选；实现后 31/31 通过。类型检查指出测试的 ByRoleOptions 不支持 exact，已删除该冗余参数，下一轮复验。

- P2/P3 进度：正式组件已接入；全量客户端 168/168、服务端上传/歌曲/媒体/公共曲库 38/38、两端类型检查和构建通过。隔离 localhost:4701 通过实际 HTTP 上传约 62.69 秒合成静音 MP3 与 PNG，草稿/未使用标签不公开，发布后曲库与分类标签可见；Range 206、封面 200、歌词 200，浏览器已解码推进。仅属于本地合成验收。Taste 首轮发现旧 CSS 覆盖导致首页导航/标签对比不足和手机播放按钮换行，修正公共主题选择器后继续目视验证。

- P3 最终复验：客户端 30 文件 168/168、前后端 noEmit 均成功；Vite 最终产物为 index-CHkginCq.css / index-DjUfLE4I.js（92 modules），服务端编译成功。服务端相关四文件 38/38 与隔离真实 HTTP 上传/发布/媒体验证已通过；本地静音测试不代表线上真实素材验收。
- P4：已按 Taste 方法检查 320/390/768/1280 尺寸、桌面/手机真实渲染、导航/筛选/队列/切页播放/刷新；修正旧样式覆盖和 320px 完整播放器按钮挤压。抽查文字对比最低 5.02:1，备案链接距装饰最低约 38px，浏览器日志无 warn/error。错误/加载/空曲库由客户端测试覆盖，浏览器不声称注入全部网络错误。
- Verification：未运行上游 inspect.mjs；未生成截图或额外报告；未自动派发代理。沿用当前候选与隔离预览，不扩展视频功能、抽签、后台或依赖。
- 最新门禁：本轮用户 AGENTS.md 恢复逐范围明确写入审批；此前简单事项自主审批记录只作为历史。26 文件与指定验证目录已获准，提交、推送及部署未包含在该批准中。

#### 待批准提交与推送的准确清单（28 文件）

目标：在现有 `codex/pc-music-player` 上提交本地已验证的正式界面、统一页脚及接续文档，并推送到 `origin/codex/pc-music-player`。不改写历史，不包含四个 COS 文件、静态样板或测试数据库。提交和推送属于后续独立审批；本记录不表示已执行。

```text
.gitignore
PRODUCT.md
docs/deployment/private-cloud-next-steps.md
docs/deployment/private-cloud-runbook.md
docs/deployment/private-cloud-acceptance.md
docs/superpowers/plans/2026-10-20-public-initial-release.md
public/brand/hanser-main.png
public/brand/hanser-chibi.png
public/brand/fallback-cover.svg
public/brand/sources.json
src/App.test.tsx
src/components/HanserArtwork.tsx
src/components/MediaImage.tsx
src/components/MediaImage.test.tsx
src/components/SiteFooter.tsx
src/features/home/HomePage.tsx
src/features/home/HomePage.test.tsx
src/features/home/HomeHeader.tsx
src/features/home/FeaturedTracks.tsx
src/features/home/DailyFeatures.tsx
src/features/home/StoryPreview.tsx
src/features/home/GoodnightRadioPage.tsx
src/features/library/PublicApp.tsx
src/features/library/MusicPage.tsx
src/features/library/MusicPage.test.tsx
src/features/player/MiniPlayer.tsx
src/styles/public-theme.css
src/styles/global.css
```

影响：形成可跨电脑同步的固定候选 SHA，不会因 Git 推送自动替换当前腾讯云服务（现有手动发布流程）。验证：只暂存上列文件，检查 staged 差异与文件清单；提交后核对 SHA，推送后核对远端分支 SHA。部署前另列 release 目录、current 切换、服务重启、回退与验证范围，并沿用正式数据和公开 Caddy 配置。

- 范围审计：211 个既有文件 SHA-256 基线对照，恰好 19 个获批既有文件变化、7 个获批新文件增加，0 删除；其余既有改动、四个 COS 文件及原样板/图片均未变化。git diff --check 通过（仅既有 LF/CRLF 提示），五份当前文档的相对链接检查均可解析。
