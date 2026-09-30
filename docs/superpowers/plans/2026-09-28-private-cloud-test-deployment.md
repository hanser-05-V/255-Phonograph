# 255留音机个人云端测试部署 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task in this session. Steps use checkbox (`- [ ]`) syntax for tracking. 用户已指定保留现有工作树与逐级审批；不自动创建工作树、派发子代理、提交、推送或创建云资源。

**Goal:** 在中国内地单台服务器上提供仅所有者可访问的 HTTPS 网页，补齐生产访问保护、媒体权限、持久化、加密备份及恢复验证。

**Architecture:** Caddy 私人入口代理本机单进程 Fastify；Node.js 24 自带 SQLite 与本地媒体存储使用固定数据目录。独立运维程序在停写窗口制作一致快照，恢复应用后用 age 加密并通过 COS SDK 上传到私有 Lighthouse COS；对象存储不参与播放器媒体分发。

**Tech Stack:** 现有 TypeScript/Fastify/React/Vite/Vitest、Node.js 24、Ubuntu 26.04（已购镜像，运行待验）、systemd、Caddy、Fail2ban、age、官方 `cos-nodejs-sdk-v5`、Node `tar` 包。

**当前执行入口（2026-09-30）：** 以末尾“测试部署准备”章节为准。服务器已完成预检和 Node/Caddy 安装（用户终端回传的交接证据）；Caddy 保持 masked，应用尚未上传。本次仅批准四份文档更新，Linux 测试及后续远端写入仍须对应批准。

**Spec:** [已确认设计规格](../specs/2026-09-28-private-cloud-test-deployment-design.md)。

**状态：** 2026-09-29 用户批准执行 Task 1–10 的本地实现与可用环境验证，包含 F01–F32 对应文件及当时列明的生成产物。后续采购、服务器预检和 Node/Caddy 安装按交接已有各自批准与执行记录，见末尾当前章节；不因此授权 Task 11–12 的其余远端操作和真实数据操作。

### 执行记录

- 基线：本地/远端 main 与 codex/pc-music-player 均为 `000e3344f0f5dfb06e8ce18c689efdc716cd8f8d`；仅两份批准文档未跟踪；主仓库迁移包保留。
- Ruling: 执行台账使用本计划，测试报告使用已批准 `.verification/private-cloud/`，不创建技能默认 `.superpowers/sdd` 目录或自动提交 — 遵守用户明确文件范围与 Git 审批 — 代价是人工维护任务记录。
- 接口预检：Task 1 cloud 配置供 2/3/5 消费；Task 2 标记供 6/8 验证；Task 6 清单与 7 对象回执供 8 编排；Task 8 CLI/恢复状态供 9 服务单元和 10 故障验证。固定契约相符，后续以真实测试继续核验。

---

## 1. 执行边界

- 唯一开发根目录：`E:\codex\hanser\.worktrees\pc-music-player`，分支 `codex/pc-music-player`。本文代码命令均从此目录执行，文中的仓库相对路径均相对此绝对根目录。
- 当前适配基线 HEAD：`3e20be0e6881941bc339dc569392bafaf25fe83a`。2026-09-30 适配前工作树未列出变更，目前累计 14 个文件未提交；本次仅批准更新其中四份部署文档，不复用此前测试/构建产物授权。原实施基线和当时两个未提交文档的状态保留在历史执行记录中。
- 主仓库的迁移包目录保持原样；不在 main 开发，不重建工作树，不重置密码，不读写现有真实曲库补测试。
- 计划批准不替代付费采购、远端部署、真实媒体上传/迁移、覆盖恢复、Git 提交或推送授权。这些操作分别在 Task 11–12 中停在明确关口。
- 每个开发任务开始前核对本任务文件表和生成产物范围。若批准未覆盖该表，先申请；若实现证明需要扩展表，列明新增文件和原因后再申请。允许在已批准的同一任务范围内修复失败，不要求为每一行修改再次审批。
- 源码行为改动按失败测试、最小实现、聚焦回归进行。配置模板不写仅复述模板的测试，用真正的 Caddy/systemd/Fail2ban 校验及 HTTP 联调验证。
- 修改计划复选框和验证记录也属于文档写入；任务执行批准时应一并列入。没有执行结果的条目不能勾选。
- 本阶段不实现正式媒体 COS 适配器、前端直传、CDN、账号系统、APK 或新的播放器交互。永久删除继续点击直接执行。

### 已知事实与执行输入

当前域名为 `255fm.cn`，成都实例为 `lhins-856nphe0`（`1.14.111.74`），详细事实见最新章节。SSH ED25519 主机指纹已在交接记录；继续采用腾讯云控制台由用户逐条执行命令，不在公司电脑保存 SSH 私钥。云凭据、桶/前缀与真实音频尚未提供。本文 `.invalid` 域名和 `127.0.0.1` 测试地址只是隔离测试数据。运行配置通过独立受限文件提供，仓库中只有无秘密模板。

已发现必须处理的测试问题：`server/config.test.ts` 与 `server/app.test.ts` 写死 Windows 路径；`seedPublishedAudio()` 只创建媒体对象，并没有创建已发布歌曲。上线权限修复不能靠继续使用无发布引用的测试夹具蒙混通过。

## 2. 文件与生成产物范围

下列是实施阶段拟用文件清单；本轮写计划不创建它们。每个 Task 的 Files 栏从此表选择，角色为 Create 的路径由实施任务创建，Modify 保留既有内容和行为。

| 编号 | 文件（相对于上述唯一开发根目录） | 角色与职责 |
|---|---|---|
| F01 | `server/config.ts`、`server/config.test.ts` | Modify：云端配置验证及跨平台路径测试。 |
| F02 | `server/index.ts`、`server/app.ts`、`server/app.test.ts` | Modify：安全启动、云端保护接线、响应缓存与测试。 |
| F03 | `server/test/test-context.ts` | Modify：测试配置覆盖与真实发布关系夹具。 |
| F04 | `.env.example` | Modify：只增加公开配置键和用途，不填生产秘密。 |
| F05 | `server/runtime/data-directory.ts`、`server/runtime/data-directory.test.ts` | Create：首次初始化与普通启动的目录保护。 |
| F06 | `server/runtime/bootstrap.ts`、`server/runtime/bootstrap.test.ts` | Create：启动前检查和初始化过程，供入口及隔离测试使用。 |
| F07 | `server/auth/cloud-security.ts`、`server/auth/cloud-security.test.ts` | Create：云端 Origin、Host、身份入口信任边界及认证尝试限制。 |
| F08 | `server/routes/admin-auth.test.ts` | Modify：Secure Cookie、来源检查和限速端到端验证。 |
| F09 | `server/routes/media.ts`、`server/routes/media.test.ts` | Modify：发布引用授权、Range/HEAD/缓存回归。 |
| F10 | `server/routes/public-library.test.ts` | Modify：下架、歌词与缓存联合回归。 |
| F11 | `server/storage/upload-capacity.ts`、`server/storage/upload-capacity.test.ts` | Create：磁盘阈值和并发上传容量预约。 |
| F12 | `server/routes/admin-uploads.ts`、`server/routes/admin-uploads.test.ts` | Modify：先鉴权再预约容量，在所有退出路径释放预约。 |
| F13 | `server/ops/contracts.ts`、`server/ops/config.ts`、`server/ops/config.test.ts` | Create：备份/恢复契约、受限配置解析。 |
| F14 | `server/ops/snapshot.ts`、`server/ops/snapshot.test.ts` | Create：一致快照、清单与完整性验证。 |
| F15 | `server/ops/archive.ts`、`server/ops/archive.test.ts` | Create：tar/age 流式加密及安全解密校验。 |
| F16 | `server/ops/backup-store.ts`、`server/ops/backup-store.test.ts` | Create：COS 对象操作、成功索引与精确轮换。 |
| F17 | `server/ops/backup.ts`、`server/ops/backup.test.ts` | Create：备份状态机与失败恢复。 |
| F18 | `server/ops/restore.ts`、`server/ops/restore.test.ts` | Create：恢复到全新隔离目录、撤销旧会话。 |
| F19 | `server/ops/cli.ts`、`server/ops/cli.test.ts` | Create：显式运维子命令、参数校验和固定进程调用。 |
| F20 | `server/ops/health.ts`、`server/ops/health.test.ts` | Create：健康、磁盘、备份时效及费用预估状态。 |
| F21 | `package.json`、`package-lock.json` | Modify：固定 COS SDK 与 tar 依赖；不升级现有框架主版本。 |
| F22 | `deploy/Caddyfile` | Create：HTTPS、Basic Auth、维护响应、反向代理与脱敏日志。 |
| F23 | `deploy/phonograph.env.example`、`deploy/backup-config.example.json` | Create：部署参数模板。 |
| F24 | `deploy/systemd/phonograph.service`、`deploy/systemd/phonograph-backup.service`、`deploy/systemd/phonograph-backup.timer` | Create：应用与每日备份单元。 |
| F25 | `deploy/systemd/phonograph-health.service`、`deploy/systemd/phonograph-health.timer` | Create：本机状态检查，不包含外部通知目的地。 |
| F26 | `deploy/fail2ban/phonograph.conf`、`deploy/fail2ban/phonograph.local` | Create：入口失败日志过滤及有时限的来源封禁。 |
| F27 | `deploy/fail2ban/fixtures/access.jsonl` | Create：纯合成日志，验证真实过滤器，禁止放真实 IP 或凭据。 |
| F28 | `deploy/journald/phonograph.conf`、`deploy/caddy-service.conf` | Create：新专用主机日志总量限制、Caddy 环境/权限补充。 |
| F29 | `docs/deployment/private-cloud-runbook.md` | Create：采购信息、配置、发布、维护、恢复和回滚操作手册。 |
| F30 | `docs/deployment/private-cloud-acceptance.md` | Create：验收标准和空白结果栏，实际结果另外审批记录。 |
| F31 | `README.md`、`.gitignore` | Modify：入口文档与额外运行产物忽略规则。 |
| F32 | `docs/superpowers/plans/2026-09-28-private-cloud-test-deployment.md` | Modify：执行期间记录真实进度与验证结果。 |

测试生成范围另列入执行批准：测试自身通过 `mkdtemp` 创建的 `phonograph-*` 临时目录及数据库/合成媒体；构建输出 `dist/`、`server-dist/`；依赖安装更新 `node_modules/` 和包管理器缓存。它们不提交。需要落盘的验收报告仅使用专用忽略目录 `.verification/private-cloud/`；其中不得放真实密钥或媒体。本阶段不把固定真实数据目录设置为测试环境变量。

若 Linux 环境不存在，不自动安装 WSL、虚拟机或 Docker。保留 Windows 自动化结果，将 Linux 服务级校验标为未执行，待用户批准合适的隔离环境或目标服务器后再做。不得用 Windows 静态检查冒充 Linux 通过。

## 3. 固定实现契约

### 3.1 应用配置

在 `AppConfig` 上增加可选云端配置，保持现有本地测试对象兼容：

```ts
export type CloudConfig = {
  siteOrigin: string;
  releaseId: string;
};
// Add to AppConfig:
// cloud?: CloudConfig;
```

`PHONOGRAPH_DEPLOYMENT` 只接受空值/`local`/`private-cloud`；云端必须提供绝对 `PHONOGRAPH_DATA_DIR`、无路径/查询/凭据的 HTTPS `PHONOGRAPH_SITE_ORIGIN` 和 40 位提交 SHA `PHONOGRAPH_RELEASE_ID`。云端强制 host 为 `127.0.0.1`。普通云端启动不得自动创建丢失目录；首次创建走独立 `--initialize-data` 命令，成功后退出，不同时启动监听端口。

`.initialized.json` 是数据根目录中的非秘密标记，格式 `{ "format": 1 }`。初始化只接受不存在或完全空的真实目录；已有数据库、媒体或未知文件一律拒绝覆盖。正常启动必须同时看到标记、数据库和有效 schema；禁止把“数据库不存在”当作首次启动。

### 3.2 运维配置与备份格式

运维配置仅存于云端 `/etc/255-phonograph/backup.json`，配置字段为：

```ts
export type BackupConfig = {
  dataDir: string;
  workDir: string;
  stateDir: string;
  maintenanceFile: string;
  applicationUnit: 'phonograph.service';
  applicationOrigin: 'http://127.0.0.1:3001';
  siteOrigin: string;
  releaseId: string;
  ageRecipientsFile: string;
  cos: {bucket: string; region: 'ap-shanghai' | 'ap-chengdu'; prefix: string};
};
export type BackupFile = {path: string; bytes: number; sha256: string};
export type BackupManifest = {
  format: 1;
  id: string;
  createdAt: string;
  releaseId: string;
  schemaVersions: number[];
  files: BackupFile[];
  restoredFrom?: {backupId: string; archiveSha256: string; restoredAt: string};
};
export type BackupReceipt = {
  id: string;
  createdAt: string;
  objectKey: string;
  bytes: number;
  sha256: string;
};
export type BackupIndex = {
  format: 1;
  active: BackupReceipt[];
  pendingDelete: BackupReceipt[];
};
```

`id` 使用 UUID v4；对象键只能是已批准前缀下的 `<uuid>.tar.age` 或 `index.json`。所有清单路径均为 `/` 分隔的相对路径，仅接受 `library.sqlite`、`.initialized.json`、`media/objects/<受控键>`、`media/tmp/<受控键>`，清单自身为 `manifest.json`；拒绝绝对路径、盘符、空段、`..`、重复名、符号链接和硬链接。正式/临时存储键使用现有 UUID 校验约束。

快照保留完整源数据库记录；恢复副本中清空 `admin_sessions`，并使恢复的 `pending_uploads` 失效，清理这些记录对应的恢复副本临时文件。对原始备份和源目录不做这类修改。正式媒体记录、密码哈希和歌曲 ID 保持。

官方 SDK 只使用对象级 `putObject`、`getObject`、`headObject`、`deleteObject`；不依赖 Bucket 列表、生命周期、版本控制或同步整个桶。为控制首轮复杂度与费用，单个密文包上限 4 GiB，超过时明确报错并要求容量/方案调整，不静默停备份或回退公开上传。采用单次上传避免首轮 multipart 残留；实际 COS 限制与 SDK 行为须在 Task 11 用隔离对象验证。

### 3.3 命令与错误约定

运维程序入口为 `node server-dist/server/ops/cli.js`，只实现以下明确命令：

| 命令 | 行为 |
|---|---|
| `backup --config <配置文件>` | 生成、加密并上传一套备份；由 systemd 单实例触发。 |
| `initialize-index --config <配置文件>` | 只在专用全新前缀建立空索引；发现已有索引即拒绝，不清桶。 |
| `restore --config <配置文件> --id <UUID> --identity-file <私钥路径> --target <新目录>` | 从索引找到备份，下载验证并恢复到不存在的目录；不切换生产服务。 |
| `verify --target <已有隔离目录>` | 检查恢复内容与数据库引用，不运行种子或迁移。 |
| `health --config <配置文件>` | 读取健康状态，输出无秘密的 JSON，异常返回非零。 |
| `recover-service --config <配置文件>` | 备份进程异常结束后的受限补偿；只按可信本机状态恢复此前由本次备份停止的应用，不恢复数据库。 |

配置文件路径、域名与资源 ID 是运行参数，不提供虚构生产默认值。CLI 验证未知参数和缺失参数；只有 `--help` 可以不读配置，任何错误均不能打印配置原文。测试注入进程、时钟、远端存储和文件系统边界；不运行真实 `systemctl` 或请求云端。

## Task 1：云端配置与跨平台测试

**Files:** F01、F02 的 `server/app.test.ts`、F03、F04。

- [x] **1.1 添加失败测试。** 在 `server/config.test.ts` 用本机 `path.resolve`/`path.join` 构造测试路径，不再把 Windows 反斜杠路径当作跨平台常量。保留“显式目录覆盖默认目录”“生产前端目录选择”两项原有行为，再增加下面的云端用例：

```ts
it('requires an explicit data directory for private cloud', () => {
  expect(() => resolveAppConfig({
    PHONOGRAPH_DEPLOYMENT: 'private-cloud',
    PHONOGRAPH_SITE_ORIGIN: 'https://phonograph.invalid',
    PHONOGRAPH_RELEASE_ID: '0'.repeat(40),
  }, process.cwd())).toThrow(/PHONOGRAPH_DATA_DIR/);
});
it('rejects an insecure public origin', () => {
  expect(() => resolveAppConfig({
    PHONOGRAPH_DEPLOYMENT: 'private-cloud',
    PHONOGRAPH_DATA_DIR: path.resolve('isolated-data'),
    PHONOGRAPH_SITE_ORIGIN: 'http://phonograph.invalid',
    PHONOGRAPH_RELEASE_ID: '0'.repeat(40),
  }, process.cwd())).toThrow(/HTTPS/);
});
```

- [x] **1.2 验证失败原因。** 运行 `npm run test:server -- server/config.test.ts`；新用例应因缺少云端校验失败，而非导入或路径错误。
- [x] **1.3 实现配置校验。** 扩展 `AppEnvironment` 的三个云端键和 deployment 键；用 `new URL()` 检查协议、用户名、密码、pathname、search、hash、port；只允许 `https:`、pathname `/`、默认 HTTPS 端口、其他为空，保存 `url.origin`。releaseId 使用 `/^[0-9a-f]{40}$/i`。云端未显式设置数据目录、设置相对目录、host 不是 `127.0.0.1`、配置未知 deployment 均抛出明确错误。本地模式不启用这些限制。
- [x] **1.4 接入测试配置覆盖。** `createTestContext` 增加 `cloud?: CloudConfig`，在 config 中显式传入；不改变其他调用者默认值。`app.test.ts` 的无数据库测试路径使用 `path.resolve(tmpdir(), 'phonograph-app-test')`，不实际创建该目录。
- [x] **1.5 补边界用例并回归。** 增加带用户名/密码、路径、查询、fragment、无效 SHA、错误 host、unknown deployment；运行 `npm run test:server -- server/config.test.ts server/app.test.ts` 和 `npm run typecheck`，预期全部通过。

## Task 2：显式初始化与丢失数据保护

**Files:** F02 的 `server/index.ts`、F05、F06。

- [x] **2.1 测试启动不得创建空库。** 用测试临时目录调用 `assertExistingDataDirectory`，断言缺标记、缺数据库、目录为符号链接、任一祖先为链接、数据库 schema 不合法分别失败；测试结束确认没有新增文件。

```ts
await expect(assertExistingDataDirectory(config)).rejects.toThrow();
expect(await readdir(config.dataDir)).toEqual([]);
```

该用例的 config 使用 Task 1 定义的云端配置，目录由本测试创建；不使用生产环境变量。

- [x] **2.2 建立函数边界。** `data-directory.ts` 导出 `assertExistingDataDirectory(config: AppConfig): Promise<void>` 和 `assertEmptyInitializationTarget(dataDir: string): Promise<void>`。逐段 lstat/realpath 验证祖先与最终路径，拒绝链接、异常权限和非普通数据库文件；验证标记 format 和 schema_migrations，不执行 migrate。初始化检查仅允许空目录或不存在的目标，拒绝根目录、代码目录及其内部路径。
- [x] **2.3 抽离启动准备。** `bootstrap.ts` 导出 `prepareRuntime(config: AppConfig, options: {initialize: boolean}): Promise<void>`。普通云端启动先检查既有目录；本地模式保留自动初始化。显式初始化按“检查空目标 → 创建目录 → 打开数据库 → migrations → seedTransitionSongs → 关闭数据库 → 独占写标记”顺序，失败保留诊断状态但不把半成品标记成功。重试发现非空半成品时退出，由操作者决定处理，禁止自动删库。
- [x] **2.4 修改入口。** `index.ts` 仅识别 `--initialize-data`，未知参数失败。初始化结束退出，不调用 listen；普通云端启动调用检查后才打开数据库和执行原有清理、迁移/种子流程。保留正常 SIGTERM 退出。
- [x] **2.5 验证无覆盖。** 初始化隔离空目录后写入测试记录，重复初始化应拒绝且原记录保留；普通重启应保留 ID、密码哈希和文件 SHA。运行 `npm run test:server -- server/runtime/data-directory.test.ts server/runtime/bootstrap.test.ts`，随后 `npm run typecheck`。

## Task 3：云端认证、来源检查与尝试限制

**Files:** F02 的 `server/app.ts`、F07、F08。

- [x] **3.1 写端到端失败测试。** 云端 `createTestContext` 设置 origin，分别在有/无 Origin、跨站 Origin、伪造 Host、伪造 X-Forwarded-For 下调用 setup/login/password；正确来源才进入既有认证逻辑。正确 setup 的 Cookie 必须含 Secure。无 Origin 返回 403，不消耗密码验证 CPU。
- [x] **3.2 实现并接线保护。** `cloud-security.ts` 导出 `registerCloudSecurity(app: FastifyInstance, cloud: CloudConfig, now?: () => number): void`。`app.ts` 仅在 cloud 存在时信任来自 `127.0.0.1` 的代理，`adminCookieSecure` 为 `Boolean(config.cloud) || dependencies.secureCookies === true`，在注册 routes 前安装 hook。

核心来源检查使用已匹配路由而非未经规范化的字符串前缀：

```ts
const writeMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
app.addHook('onRequest', async (request, reply) => {
  const route = request.routeOptions.url ?? '';
  if (request.headers.host !== new URL(cloud.siteOrigin).host) {
    return reply.code(421).send({error: {code: 'INVALID_HOST', message: '请求域名不匹配'}});
  }
  if (writeMethods.has(request.method) && route.startsWith('/api/admin/')) {
    if (request.headers.origin !== cloud.siteOrigin) {
      return reply.code(403).send({error: {code: 'INVALID_ORIGIN', message: '请求来源不受信任'}});
    }
  }
});
```

Host 验证对本机运维健康探测也生效；探测必须发送配置域名的 Host，不添加不受保护的外部健康路径。不要信任客户端提供的 X-Forwarded-Host 去覆盖此判断。

- [x] **3.3 加入有界尝试限制。** 同模块实现 `createAuthAttemptLimiter(now: () => number)`，返回 `take(ip: string): {allowed: boolean; retryAfterSeconds: number}`。setup/login/password 三条 POST 路由共用窗口：每 IP 每 60 秒最多 5 次，全站每 60 秒最多 20 次；新窗口重置，过期 IP 条目清理，最多 1024 个未过期键，达到上限拒绝新键而非无限增长。计数包括成功/失败尝试，不永久锁账户。拒绝返回 429 和正整数 Retry-After。仅在云端且通过 Origin 后计数，媒体 GET/HEAD 不经过 limiter。
- [x] **3.4 验证真实来源与恢复。** 用可注入时钟测试窗口到期恢复、不同 IP 与全局额度、容量上限；Fastify inject 显式设 `remoteAddress` 验证非回环来源伪造转发头不能改变判定。源端口仅绑定回环的网络检查留 Task 10/12。新测试发送正确 Host/Origin，不修改旧本地用例去强行启用云模式。
- [x] **3.5 回归。** `npm run test:server -- server/auth/cloud-security.test.ts server/routes/admin-auth.test.ts server/app.test.ts`；Cookie、旧会话撤销及永久删除接口现有授权行为不变。

## Task 4：媒体发布权限、缓存与 Range

**Files:** F02 的 `server/app.ts`、F03、F09、F10。

- [x] **4.1 修复测试语义而非放宽权限。** 保留 `seedPublishedAudio()` 现有行为，避免改变 `seedSongsAcrossStatuses` 的计数；新增测试辅助函数 `linkPublishedMedia(context: TestContext, media: SeededMedia, kind: 'audio' | 'cover'): string`，插入一条明确的 published 歌曲引用。仅需要公开媒体的路由用例调用它。

插入语句的固定字段：`id=randomUUID()`、title/artist 为测试文本、status=`published`、duration_seconds=10、published_at/created_at/updated_at 为固定测试时间；audio/cover 列按 kind 填入 media.id，另一列为 null。封面测试必须引用 cover_media_id。涉及删除媒体和固定过渡 ID 的用例先调整引用，不关闭外键约束。

- [x] **4.2 新增回归测试。** 验证无关联媒体、draft/unlisted/trashed 关联返回 404；存在另一个 published 引用时可读；管理员 Cookie 不绕过；下架后新 Range 请求返回 404；替换后旧媒体不再可读。确认错误发生在 `mediaStore.open` 之前。

```ts
const media = await seedPublishedAudio(context, Buffer.from('0123456789'));
const songId = linkPublishedMedia(context, media, 'audio');
context.db.prepare('UPDATE songs SET status = ? WHERE id = ?').run('unlisted', songId);
const response = await context.app.inject({
  url: `/api/media/${media.id}`,
  headers: {range: 'bytes=2-5'},
});
expect(response.statusCode).toBe(404);
expect(mediaStore.readChunks).toBe(0);
```

- [x] **4.3 实现查询边界。** `media.ts` 查询使用相关 EXISTS，按媒体 kind 匹配歌曲引用并要求 published_at 非空：

```sql
SELECT m.kind, m.storage_key, m.mime_type, m.byte_size
FROM media_objects m
WHERE m.id = ? AND EXISTS (
  SELECT 1 FROM songs s
  WHERE s.status = 'published' AND s.published_at IS NOT NULL
    AND ((m.kind = 'audio' AND s.audio_media_id = m.id)
      OR (m.kind = 'cover' AND s.cover_media_id = m.id))
)
```

保留现有 MIME、ID、Range 处理与 HEAD 流关闭逻辑。

- [x] **4.4 补统一缓存。** app 顶层 onSend 对路径段为 `/api` 的全部响应设置 `Cache-Control: private, no-store`，包括 401/403/404/416/429/500；不把 `/apiary` 当 API。Caddy 外层错误响应在 Task 9 同样处理。无需增加宽泛 CORS 插件。
- [x] **4.5 完成 Range 回归。** 原 200、HEAD、206、416 保留，新增开放结尾/后缀范围、带 Range 的 HEAD、下架与封面，检查正文长度及头一致。运行 `npm run test:server -- server/routes/media.test.ts server/routes/public-library.test.ts server/app.test.ts server/http/range.test.ts`。

## Task 5：上传磁盘保护

**Files:** F02 的 `server/app.ts`、F03、F11、F12。

- [x] **5.1 添加边界与失败路径测试。** 注入磁盘统计，覆盖 79%、80%、89%、90%、统计失败、同时预约两个 200 MiB 音频、取消、类型错误、超限、客户端断开和保存失败。已有数据读与永久删除均不受容量保护阻断。
- [x] **5.2 实现容量对象。** `UploadCapacity` 接收 `dataDir` 与可注入 `statfs`，提供 `acquire(maxBytes): Promise<() => void>`；使用 `statfs` 的 blocks、bavail、bsize 计算非特权可用空间，防止零容量/非法值。磁盘使用率达 90% 或扣除其他预约后不足“本次最大上传量 + 16 MiB 余量 + 磁盘总量的 10%”时拒绝。达到 80% 的警告交由健康状态记录。返回的 release 幂等且不会让预约值为负；所有失败默认拒绝新上传。
- [x] **5.3 接入上传路由。** `registerAdminUploadRoutes` 新增可选 capacity 依赖，buildApp 只在云端提供真实实现。现有 requireAdmin 先执行，随后预约，`try/finally` 包住整个 multipart 处理并 release。audio/cover/LRC 分别按已有 200/10/1 MiB 上限预约；错误使用 `507`、code=`INSUFFICIENT_STORAGE`、可理解的中文信息。该业务错误在 app 错误映射中明确处理，不暴露磁盘路径。
- [x] **5.4 回归。** `npm run test:server -- server/storage/upload-capacity.test.ts server/routes/admin-uploads.test.ts server/media/upload-service.test.ts`。不修改 UploadService 的本地临时路径设计，不把本任务扩成存储重构。

## Task 6：运维配置、一致快照与加密包

**Files:** F13、F14、F15、F21。

- [x] **6.1 固定依赖。** 执行批准后才运行 `npm install --save-exact cos-nodejs-sdk-v5 tar`，检查官方包身份、Node.js 24 兼容性、解析版本与锁文件变化。不要安装名称相近的非官方 COS 包。age 使用 Linux 系统包，安装和版本固定属于 Task 11 远端审批，不在当前 Windows 自动安装。
- [x] **6.2 定义运维配置。** 将第 3 节类型写入 contracts.ts。config.ts 导出 `readBackupConfig(file: string): Promise<BackupConfig>` 与 `validateBackupConfig(value: unknown): BackupConfig`。要求路径绝对、无符号链接；dataDir、workDir、stateDir 彼此不重叠；workDir/stateDir 不在代码目录或数据目录内部；应用地址和 unit 必须等于约定常量；siteOrigin 使用 Task 1 的 HTTPS 验证；bucket/region/prefix 不能为空，prefix 必须为 `phonograph-backups/<UUID>/`。公钥文件必须存在，配置中不得包含 `AGE-SECRET-KEY`。云凭据不在该 JSON 中，另由受限环境提供。
- [x] **6.3 快照函数与清单。** snapshot.ts 导出以下接口：

```ts
export type SnapshotResult = {directory: string; manifest: BackupManifest};
export declare function createSnapshot(input: {
  dataDir: string;
  target: string;
  id: string;
  createdAt: string;
  releaseId: string;
}): Promise<SnapshotResult>;
export declare function verifySnapshot(directory: string): Promise<BackupManifest>;
```

函数实现按固定顺序执行：确认目标不存在 → 以 0700 创建 → 用只读 `DatabaseSync` 打开源数据库 → `await backup(db, targetDatabase)` → 关闭源连接 → 复制标记和所有受控媒体普通文件 → 用 Node createHash('sha256') 逐流计算 → 读取 schema_migrations → 在目标数据库执行 integrity_check、foreign_key_check 与媒体引用检查 → 以 0600 独占写 manifest.json。`backup` 从 `node:sqlite` 导入。对受控路径逐段 lstat，不跟随链接，媒体硬链接也拒绝；打开文件后核对句柄与路径的 inode/设备信息，再读取。不复制 `.env`、日志或任意未知根文件。清单 files 不包含 manifest.json 自身，验证器单独验证清单结构。

只有应用已被 Task 8 停止时才允许生产调用；该函数本身不声称实现跨进程停写。数据库副本不带活跃 WAL，恢复验证直接使用副本。检查 media_objects 中每个 storage_key 对应正式文件且 byte_size 一致；pending_uploads 的临时键也需有对应文件。找不到必需文件时整次快照失败。

- [x] **6.4 快照失败测试。** 用临时库和合成媒体覆盖 WAL 中未 checkpoint 的已提交数据、孤立普通文件、正式引用文件缺失、大小/哈希不符、越界键、符号链接、非空目标、schema 不匹配。确认失败不写源数据。实际数据库应有包含 pending_uploads 与 admin_sessions 的测试记录，不能只用空库。

```ts
const result = await createSnapshot({
  dataDir: context.dataDir,
  target: path.join(testRoot, 'snapshot'),
  id: randomUUID(), createdAt: '2026-09-28T00:00:00.000Z', releaseId: '0'.repeat(40),
});
expect((await verifySnapshot(result.directory)).files.length).toBeGreaterThan(1);
await writeFile(path.join(result.directory, 'media', 'objects', media.storageKey), 'tampered');
await expect(verifySnapshot(result.directory)).rejects.toThrow(/hash|size/i);
```

- [x] **6.5 age 与 tar 流程。** archive.ts 导出 `encryptSnapshot(directory, recipientsFile, output, signal?): Promise<{bytes: number; sha256: string}>` 和 `decryptArchive(archive, identityFile, target, signal?): Promise<void>`。使用 `spawn('age', argv, {shell: false})`；加密 argv 为 `['--encrypt', '--recipients-file', recipientsFile]`，解密为 `['--decrypt', '--identity', identityFile]`。加密将 tar.c 的流接入 age.stdin，再将 stdout 接入 exclusive `wx`、0600 输出文件；同时等待两侧 pipeline 和子进程退出，任一失败销毁管道并终止子进程，不遗留后台加密进程。不使用命令字符串拼接或把私钥内容作为参数。

加密包超过 4 GiB、外部进程非零、磁盘不足或取消时失败；不得把部分文件标为成功。失败文件只按本次生成的确切路径清理。只有输出完整关闭后计算密文 SHA-256。

解密先写专用 0700 暂存目录内的 0600 tar 文件；第一遍用 tar.t 检查所有成员的类型、相对路径、重复项和总声明容量，拒绝链接/设备文件/越界/超限；第二遍用 tar.x 解到另一全新目录，随后 verifySnapshot。最终目标必须不存在，校验成功才交付；私钥错误和篡改包都不得覆盖已有目录。

- [ ] **6.6 测试管道失败与安全提取。** 单元测试注入进程边界，覆盖非零退出、stderr 脱敏、取消、重复路径、`../`、绝对路径、符号链接、硬链接和超大声明长度。Linux 实测另用真实 age 临时测试密钥验证成功/错误密钥/截断包，密钥只存测试临时目录。
- [x] **6.7 回归。** `npm run test:server -- server/ops/config.test.ts server/ops/snapshot.test.ts server/ops/archive.test.ts` 与 `npm run typecheck`。没有真实 age 时只报告单元部分通过，Linux 集成保留 Task 10 未执行。

## Task 7：对象级备份存储与轮换

**Files:** F13 的 contracts.ts、F16。

- [x] **7.1 固定远端接口。** 在 contracts.ts 增加：

```ts
export interface BackupStore {
  readIndex(): Promise<BackupIndex>;
  writeIndex(index: BackupIndex): Promise<void>;
  upload(file: string, receipt: BackupReceipt): Promise<void>;
  head(receipt: BackupReceipt): Promise<{bytes: number}>;
  download(receipt: BackupReceipt, target: string): Promise<void>;
  delete(receipt: BackupReceipt): Promise<void>;
}
```

backup-store.ts 实现官方 SDK 包装，SDK 回调统一转换为 Promise；region、bucket 和 HTTPS endpoint 来自经验证配置与官方区域规则。凭据仅从专用受限环境变量读取，缺失即失败，错误输出只保留自定义错误码及非秘密状态。SDK 仅在运维 CLI 加载，正常播放器启动不连接 COS。

- [x] **7.2 实现单对象上传与确认。** `upload` 使用 putObject，显式 ContentLength、application/octet-stream、私有访问，源流为已加密的文件；`head` 核对长度。恢复下载后用本地 SHA-256 对比 receipt，不使用 ETag 代替完整密文摘要。上传中断留下的本地包可重试同一个随机键；不同备份不用同一个键。
- [x] **7.3 索引初始化及校验。** 专用前缀下固定 `index.json` 保存第 3 节 BackupIndex，不包含歌曲标题、明文目录清单或秘密。生产例行备份遇到索引 404 必须报错，不自动假设空桶；只有 initialize-index 可在已批准的新前缀、确认 404 后写 `{format:1,active:[],pendingDelete:[]}`。其他错误不是“没有对象”。

读取索引时重新验证格式、UUID、时间、大小、哈希、前缀和键的对应关系；不执行索引里任意 URL/路径。active 最多保留 7 个成功记录；pendingDelete 不准无限增长，超过 128 个时停止轮换并告警，保留最后成功集。索引读写仅允许同一服务器通过全局锁运行，不支持多写入者。

- [x] **7.4 精确轮换算法。** 新包 head 确认后，将它加入 active，按时间排序，把超出 7 个的记录加入 pendingDelete，先持久化索引。再逐个删除 pendingDelete 中且不在 active 的确切对象键，最后写回删除后的索引。任何删除或索引写失败保留重试信息；不使用清桶、按目录递归删除、sync 或先删旧包再传新包。每次上传前将新包 receipt 写入本地受限任务日志，崩溃后可按确切键检查完成状态；无法确认的孤立对象报告给用户，不扫描和删除未知对象。
- [x] **7.5 故障测试。** 假 SDK 分别模拟 403、404、超时、部分流失败、长度不符、索引写入失败、删除失败、恶意前缀、旧索引重放和第 8 份备份。必须证明新备份失败不减少旧 active 集，删除失败不会把对象信息遗忘。模拟 SDK 拒绝任何 bucket 级方法调用，测试仍通过。
- [x] **7.6 验证。** `npm run test:server -- server/ops/backup-store.test.ts`。真实权限和计费未开通，不把单元测试称为云端联调成功。

## Task 8：备份状态机、隔离恢复与健康记录

**Files:** F17、F18、F19、F20；F13 contracts.ts 增加下列端口。

```ts
export interface ServiceControl {
  isActive(): Promise<boolean>;
  enterMaintenance(): Promise<void>;
  stop(): Promise<void>;
  start(): Promise<void>;
  waitHealthy(timeoutMs: number): Promise<void>;
  leaveMaintenance(): Promise<void>;
}
export type BackupState = {
  phase: 'idle' | 'snapshot' | 'upload' | 'failed' | 'complete';
  lastSuccessAt: string | null;
  lastErrorCode: string | null;
  applicationRecovered: boolean;
  applicationWasActive: boolean;
};
```

- [x] **8.1 状态机失败测试先行。** 用事件列表假 ServiceControl、假 BackupStore 和注入的 snapshot/encrypt 函数验证顺序与所有异常分支；函数签名为 `runBackup(config, ports): Promise<BackupReceipt>`，ports 完整定义在 backup.ts，包括 service/store、snapshot、encrypt、readState/writeState、now、randomId、diskSpaceCheck，不通过全局对象访问云端。

```ts
export type BackupPorts = {
  service: ServiceControl;
  store: BackupStore;
  snapshot: typeof createSnapshot;
  encrypt: typeof encryptSnapshot;
  readState: () => Promise<BackupState>;
  writeState: (state: BackupState) => Promise<void>;
  now: () => Date;
  randomId: () => string;
  diskSpaceCheck: (config: BackupConfig) => Promise<void>;
};
```

以上类型分别从 contracts.ts、snapshot.ts、archive.ts 导入。生产 CLI 提供实际实现；测试通过同一类型传入替身。

要求事件顺序为 `preflight → maintenance → stop → snapshot → start → healthy → leave-maintenance → encrypt → upload → head → index → prune → complete`。start/healthy 失败时保留维护状态并返回失败，不能继续宣称备份和恢复都成功。原服务就未启动时例行任务退出，不擅自把停机服务启动。

只有成功索引写入后才能更新 lastSuccessAt；后续旧对象删除失败保留 pendingDelete 和 `RETENTION_RETRY` 警告，不能把已可恢复的新备份说成完全没有成功。上传、head 或索引提交失败时则保留原 lastSuccessAt。读取索引发现本机上次确认的最新备份丢失且没有相应任务恢复记录时，按索引异常退出，不自动覆盖远端索引。

```ts
expect(events.indexOf('start')).toBeLessThan(events.indexOf('upload'));
expect(events.indexOf('head')).toBeLessThan(events.indexOf('prune'));
expect(state.lastSuccessAt).toBeNull(); // for an injected upload failure
expect(state.applicationRecovered).toBe(true);
```

- [x] **8.2 实现前置空间和维护约束。** 用源数据实际大小估算最少需要“两份数据大小 + 128 MiB + 磁盘总量 10%”的可用空间，包含 snapshot 和加密输出；不足时不停止服务。维护 snapshot 阶段最多 10 分钟，使用 AbortController 终止本次复制/校验，等待 I/O 全部结束后才重启，不能边复制边恢复写入。状态文件使用同目录临时文件加 rename 原子替换，权限 0600，不含秘密。
- [x] **8.3 固定服务调用。** CLI 的 ServiceControl 使用 `execFile`/`spawn` 参数数组调用固定 `systemctl is-active/stop/start phonograph.service`，shell=false，禁止从配置传入任意命令。stop 后复查 inactive，进程退出超时不能进入 snapshot。健康请求固定回环地址并携带 siteOrigin 的 Host，超时最多 30 秒；公网入口维护标记保留到健康成功。

补偿命令 recover-service 在已释放本次任务锁后读取 root 所有的状态文件，仅当 applicationWasActive=true 且上次任务处在 snapshot/failed、尚未恢复应用时才尝试 start→waitHealthy→leaveMaintenance。任务开始前先持久化原服务状态，禁止凭缺失/损坏状态猜测需要启动。备份期间禁止同时人工停止或切换应用；若需要人工干预，先明确结束备份并检查补偿结果。测试进程被系统强制终止的情况，不能假定 finally 总能运行。
- [ ] **8.4 配置互斥。** systemd 备份单元和手工 runbook 都使用 `/usr/bin/flock --nonblock --conflict-exit-code 75 /run/255-phonograph-backup.lock` 包裹运维命令。同一实例只有一个备份写入者；75 表示已有任务，不标新成功。CLI 帮助明确生产环境不得绕过锁直接执行 backup。测试验证已有锁时不停止应用、不上传、不轮换。
- [x] **8.5 隔离恢复。** restore.ts 导出 `restoreBackup(config, id, identityFile, target, store): Promise<void>`：验证 target 不存在且不在生产数据目录/代码目录中 → 下载 exact receipt 到受限 workDir → 验密文 SHA → age 解密/安全提取 → verifySnapshot → 验证所有媒体引用 → 在恢复数据库事务内 DELETE admin_sessions 和 pending_uploads → 清理恢复副本中对应 tmp 文件 → 关闭数据库并重新生成恢复副本清单 → verifySnapshot → 从新隔离目录交付。新清单重新计算已变更数据库与剩余文件的 hash，并填 restoredFrom 指向原备份编号、密文 SHA 和恢复时间，避免用原清单误报撤销会话后的合法变化。保留完整原始备份及原清单；不得运行种子或迁移掩盖缺失记录。target 已有任意内容时拒绝。
- [ ] **8.6 恢复回归。** 覆盖正确恢复、错误私钥、损坏包、缺文件、恶意 tar、已有 target、同源 target、admin hash 保留而旧 Cookie 无效、事务失败不交付半成品。对原库及原包做前后哈希/记录比较。恢复失败可以保留有明确错误标记的隔离暂存，不删除任何生产目录。
- [x] **8.7 实现 health。** 输出 JSON 字段：checkedAt、applicationOk、diskUsedPercent、backupAgeHours、backupPhase、pendingDeleteCount、backupStoredBytes、estimatedMonthlyCny、warnings。来源为本机健康请求、statfs、状态文件和成功索引；估算 server=45、domain=39/12、storage=bytes 转 GB×地域日单价×30。2026-09-30 适配后成都单价为 0.0033、上海为 0.00393333；固定成本仍为参考值。45/50 元阈值、80/90% 磁盘阈值、备份超 24 小时均生成稳定警告码；这个估算不冒充实际账单。失败时返回非零并写本机状态，不擅自发送消息。
- [x] **8.8 验证。** `npm run test:server -- server/ops/backup.test.ts server/ops/restore.test.ts server/ops/cli.test.ts server/ops/health.test.ts`，再 `npm run typecheck`。确认 CLI 被 import 时不执行副作用，仅在 entryPoint 匹配时运行，测试不请求任何云 API。

## Task 9：服务器配置模板与运维文档

**Files:** F22–F31。

- [x] **9.1 编写 Caddyfile。** 以下为入口核心，加入同文件的脱敏日志块。环境变量由 `/etc/255-phonograph/caddy.env` 注入，缺值必须在部署预检时拒绝：

```caddyfile
{$PHONOGRAPH_DOMAIN} {
    route {
        header Cache-Control "private, no-store"
        basic_auth {
            {$PHONOGRAPH_GATE_USER} {$PHONOGRAPH_GATE_HASH}
        }
        @maintenance file {
            root /run/255-phonograph
            try_files maintenance
        }
        respond @maintenance "服务维护中，请稍后重试" 503
        request_body {
            max_size 220MB
        }
        reverse_proxy 127.0.0.1:3001 {
            header_up -Authorization
            header_up Host {host}
            header_up X-Forwarded-For {remote_host}
            header_up X-Forwarded-Proto https
        }
    }
    log {
        output file /var/log/caddy/phonograph-access.json {
            roll_size 10MiB
            roll_keep 3
            roll_keep_for 72h
        }
        format filter {
            wrap json
            fields {
                request>headers delete
                request>uri delete
                resp_headers delete
                user_id delete
            }
        }
    }
}
```

仅此域名路由可进入应用，无 catch-all 代理。不加 `file_server` 指向媒体、不缓存流、不为音频启用编码转换。220MB 大于 200 MiB 音频加正常 multipart 开销；实际边界通过联调验证。Caddy 校验可能将哈希写入标准输出，工具调用不得把完整 adapt 输出返回聊天；只报告成功或脱敏诊断。

- [ ] **9.2 应用服务与配置模板。** phonograph.env.example 包含 deployment、dataDir、siteOrigin、releaseId、host、port、NODE_ENV，示例域名为 `https://phonograph.invalid`，说明该文件必须替换为实际参数才能部署。生产 service 核心为：

```ini
[Unit]
Description=255 Phonograph application
After=network.target

[Service]
Type=simple
User=phonograph
Group=phonograph
WorkingDirectory=/srv/255-phonograph/current
EnvironmentFile=/etc/255-phonograph/phonograph.env
ExecStart=/opt/255-phonograph/node24/bin/node server-dist/server/index.js
Restart=on-failure
RestartSec=5
TimeoutStopSec=90
KillSignal=SIGTERM
UMask=0077
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/255-phonograph

[Install]
WantedBy=multi-user.target
```

2026-09-30 更新：三个 service 模板均使用 `/opt/255-phonograph/node24/bin/node`，首次初始化和所有手工运维命令同步此路径。经远端安装批准后，将核验过的官方 Node.js 24 发布物安装到专用位置，记录架构、补丁版本和校验值；目录及解析目标由 root 管理、应用用户不可写。不要依赖发行版 Node 22 或交互式 shell 的版本管理器。`current` 可指向 releases 内的已验证版本，数据目录保持真实路径。保护项仍须 Linux 实测。

- [ ] **9.3 备份与检查单元。** backup.service 为 Type=oneshot，读取非秘密配置路径和仅 root 可读的凭据环境文件，ExecStart 用 flock 包住 `node /srv/255-phonograph/current/server-dist/server/ops/cli.js backup --config /etc/255-phonograph/backup.json`；User=root 仅用于停启服务和读取一致快照，配置与已发布代码必须 root 所有且应用用户不可写。UMask=0077、TimeoutStartSec=30min，超时/中断的恢复路径必须测试。备份不自动启动原本停止的应用。

ExecStopPost 以同一个 flock 包裹 `node /srv/255-phonograph/current/server-dist/server/ops/cli.js recover-service --config /etc/255-phonograph/backup.json`，用于超时/异常退出的补偿。仅增加脚本中的 finally 不足以满足此项。Linux 故障注入必须证明补偿能恢复应用，补偿失败时仍保留维护状态与错误记录。

```ini
[Timer]
OnCalendar=*-*-* 05:00:00 Asia/Shanghai
Persistent=false
Unit=phonograph-backup.service

[Install]
WantedBy=timers.target
```

Persistent=false 避免机器恢复时立刻开始未预期维护；错过的备份由 health 标为超时，再由所有者决定补跑。health.timer 使用 OnBootSec=5min、OnUnitActiveSec=15min，health.service 为 oneshot，只调用 health 并记录状态。它们属于服务器系统定时器，不创建 Codex 自动化。

- [ ] **9.4 入口失败限制。** Fail2ban jail 对 `phonograph-access.json` 中状态 401 的真实 remote_ip 计数，findtime=600、maxretry=10、bantime=600，忽略回环地址，作用端口仅 HTTP/HTTPS，不封 SSH；原有媒体 200/206 不匹配。filter 的初始表达式为：

```ini
[Definition]
failregex = ^.*"request":\{[^}]*"remote_ip":"<HOST>"[^}]*\}.*"status":401(?:,|\}).*$
ignoreregex =
datepattern = "ts":{EPOCH}
```

该表达式必须用锁定 Caddy 版本实际产生的脱敏日志验证，不靠外观认定正确。合成 fixtures 包含 IPv4/IPv6、正常 206、应用 403、错误 Basic Auth 401，以及带伪造 remote_ip 文本的转义输入。只允许精确捕获实际 request.remote_ip；如实际字段顺序/日期格式不符，在本文件范围内修正并重跑 fail2ban-regex。生产不启用没有通过此校验的 jail。

- [ ] **9.5 日志和环境权限。** `deploy/journald/phonograph.conf` 用专用新主机的 SystemMaxUse=100M、MaxRetentionSec=7day；不得直接应用到有其他业务的共享主机。`deploy/caddy-service.conf` 增加读取 caddy.env 的 EnvironmentFile，并验证 Caddy 用户能读取维护标记、写独立证书目录与自身日志，不能读曲库/备份/密钥文件。备份配置模板对应第 3 节所有字段，不含实际凭据。
- [x] **9.6 运维文档。** runbook 必须依次包含版本固定、账号/文件权限、只开放 80/443 与受限 SSH、防止断开已有 SSH 的操作顺序、初始化、域名备案后启用 HTTPS、Basic Auth 哈希生成、服务启动、状态检查、手工备份、恢复、版本切换与回滚。首次远端部署前明确实际产物路径和资源表。提供的命令不得包含未声明的 shell 变量或嵌入用户原始字符串；真实值从受限配置读取。
- [x] **9.7 验收文档与忽略。** acceptance 文档逐项对应规格第 10 节，结果初始为“未执行”，并区分自动测试、Linux 联调、家庭浏览器和真实音频。README 链接 runbook；.gitignore 增加 `.verification/`、`*.age`，并说明运行配置永远在仓库外。不用扩大忽略规则隐藏待提交源代码。

## Task 10：本地回归与 Linux 配置联调

**Files:** F29、F30、F32 记录事实；生成目录需遵守第 2 节独立授权。

- [x] **10.1 完成 Windows 工程回归。** 所有功能实现后一次执行：

```powershell
npm run test:run
npm run typecheck
npm run build
git diff --check
git status --short --untracked-files=all
```

记录真实文件数、通过/失败数、运行版本及退出码；不写死交接时的 163/157 数量。首次测试失败先定位原因，不为达到旧数量删除测试。无新改动或失败时不反复跑全量。

- [x] **10.2 审查改动。** 逐条核对本计划文件表，检查无密码/私钥/数据库/媒体/迁移包误入变更，确认永久删除交互和播放器单一音频实例未改变。只报告实际审查覆盖的文件与直接依赖，不声称审计全项目。
- [ ] **10.3 Linux 隔离环境验证。** 在另行获准的 Ubuntu 26.04 环境执行相同自动化检查及生产构建；测试临时数据路径与真实 `/var/lib/255-phonograph` 分开。TMPDIR 使用已批准的仓库外磁盘目录，检查实际挂载和空间，不使用 tmpfs 承载大文件。记录 node、Caddy、age、Fail2ban、systemd 和依赖锁版本。

```sh
node --version
npm run test:run
npm run typecheck
npm run build
caddy version
age --version
systemd-analyze verify deploy/systemd/phonograph.service deploy/systemd/phonograph-backup.service deploy/systemd/phonograph-backup.timer deploy/systemd/phonograph-health.service deploy/systemd/phonograph-health.timer
fail2ban-regex deploy/fail2ban/fixtures/access.jsonl deploy/fail2ban/phonograph.conf
```

systemd 验证在对应可执行文件存在、测试版本路径已准备的环境进行；路径缺失不算单元通过。Caddy 使用隔离的 `.invalid` 站点和合成入口哈希进行 validate，不申请真实证书、不打印完整含凭据配置。

- [ ] **10.4 私人入口联调。** 用隔离数据/端口启动 Caddy 与应用，脚本依次验证无凭据 401、错误凭据 401、正确凭据页面可见、后台仍需应用会话、Origin 拒绝、Range=206、HEAD 无正文、下架后新请求 404、3001 不可被外部接口访问、维护标记在认证后返回 503。客户端凭据从权限受限的临时配置读取，不写进命令行历史和日志。测试日志确认没有 Cookie、Authorization 或密码。
- [ ] **10.5 真加密与恢复测试。** 在临时目录生成测试 age 密钥，运行 snapshot→tar→age→decrypt→verify；错误私钥、截断包和恶意成员必须失败。使用本地假 BackupStore 证明轮换/索引失败恢复，真实 COS 测试仍单列下一任务。
- [ ] **10.6 原地持久化与回滚演练。** 隔离目录创建测试歌曲、密码、媒体，记录 ID/hash；重启应用、重启测试环境、切换两个兼容发布目录后核对相同数据；故意删除测试标记或使用错误目录，服务必须拒绝而非新建空库。恢复备份到另一目录，验证旧会话失效而密码仍有效。这里只测试合成数据，不迁移本地真实曲库。
- [x] **10.7 阶段交付。** 输出“实现已验证/仍需 Linux/仍需真实云端/仍需真实音频”的分项状态。没有实际服务器时任务可以完成本地部分，但 Task 11–12 保持未完成，不请求购买来掩盖未通过的本地检查。

## Task 11：采购、资源与远端部署审批

**Files:** F29、F30、F32 仅在批准后更新实际结果。此任务包含外部状态变化，不能从计划获批自动推断已授权购买或部署。

- [ ] **11.1 先完成可审阅材料。** Task 1–10 的实现、模板、本地验证和已知限制准备完成后，提供实际版本/差异、配置清单和费用单，再请求采购确认。若 Linux 验证必须依赖尚未购买的服务器，明确该例外及尚未通过的 Linux 检查；不得标它们通过。
- [ ] **11.2 核实官方订单。** 2026-09-30 已收到成都二区、锐驰型 2 核 2 GB/40 GB、Ubuntu 26.04、域名 255fm.cn 已购的交接事实。继续核对实际成交和续费金额、购买期限、域名实名/备案资格；同地域 Lighthouse COS 尚未创建，需另行批准。原上海/24.04 选型及 135+39 元预算保留为历史依据。实例自动续费已关闭，不自动加购额外产品。
- [ ] **11.3 用户处理官方手续。** 用户选择实际可注册域名，在官方页面完成实名、备案和付款；不把身份材料复制到仓库或聊天。账号尚未登录或需要验证码时由用户完成。备案期间可准备服务器内部环境，不开域名网站服务绕过备案。
- [ ] **11.4 请求具体远端写入批准。** 提供实际服务器 ID、IP、SSH 主机指纹、代码版本，以及下表路径与动作。用户批准后才能安装软件、创建用户、写配置、放行端口和初始化。不要索取明文密码或私钥聊天粘贴，优先本机受限 SSH key 与确认过的主机指纹。

| 云端目标 | 预期写入与影响 | 验证方式 |
|---|---|---|
| 新购买的专用服务器软件与账号 | Node.js 24、Caddy、age、Fail2ban、phonograph 用户；记录固定版本 | 版本、系统服务和最小权限检查；若非空共享服务器，先重新评估范围。 |
| `/srv/255-phonograph/releases/<真实版本>/`、`/srv/255-phonograph/current` | 上传已验证应用，current 指向版本目录 | 发布包清单/hash、服务启动路径与回滚版本验证。 |
| `/var/lib/255-phonograph/` | 首次生成数据库、标记、过渡记录与运行时示范媒体 | 初始化只接受空目标、复启动保留记录；不是迁移真实曲库。 |
| `/etc/255-phonograph/` | app/backup/Caddy 环境文件、公钥、配置；敏感文件 0600 | 文件所有权、权限、无秘密回显；私钥不落服务器常驻目录。 |
| `/etc/caddy/Caddyfile` 及 Caddy 服务 drop-in | 私人入口、HTTPS、维护与反向代理 | Caddy validate、实际证书、401/503/Range 联调。 |
| `/etc/systemd/system/phonograph*.service`、`/etc/systemd/system/phonograph*.timer` | 安装明确列出的五个单元；启动服务/启用计时器 | systemd-analyze、状态、下一次执行时刻；实际只写 Task 9 列出的文件。 |
| `/etc/fail2ban/filter.d/phonograph.conf`、`/etc/fail2ban/jail.d/phonograph.local` | 全站入口错误尝试保护 | 合成日志匹配、实际可恢复封禁；不误封 SSH。 |
| `/etc/systemd/journald.conf.d/phonograph.conf` | 专用主机日志容量限制 | journal 状态与磁盘占用；共享主机不能直接套用。 |
| `/run/255-phonograph/`、`/run/255-phonograph-backup.lock` | 维护标记和任务锁 | 服务中断补偿、互斥验证；重启后维护策略检查。 |
| `/var/lib/255-phonograph-ops/`、`/var/backups/255-phonograph/` | 本机状态、受限任务日志、快照和加密暂存 | 权限、容量、清理只作用本任务产物。 |
| Caddy 证书目录、`/var/log/caddy/` | 证书续期数据和脱敏日志 | 目录独立持久、可续期、日志无 Cookie/Authorization。 |
| 云防火墙与主机防火墙 | 80/443；SSH 限定批准的运维来源；3001 不对外开放 | 保留已有 SSH 会话，先验证新连接再收紧；外部端口探测。 |
| 指定私有桶下 `phonograph-backups/<批准的 UUID>/` | 新索引、加密备份、精确轮换删除 | 公共访问拒绝、最小权限、成功索引、恢复下载与账单。 |

上表 `<真实版本>`、`<批准的 UUID>` 等仅表示采购后的必填部署参数。远端执行审批时必须替换成确切值与完整文件清单；不能把模式视为无限写入授权。软件安装由官方包管理器管理的系统文件作为单独的安装动作一并列明。

- [ ] **11.5 Linux 上准备发布。** 按获批输入安装并验证环境，从锁文件 `npm ci`，运行 Task 10 检查后生成 Linux 发布产物；不把 Windows 的 node_modules 整体复制过去。构建目录、暂存目录和产生的 node_modules/dist/server-dist 也包含在远端批准范围内。releaseId 只能指向真实代码提交；若代码尚未获准提交，先交付差异并请求提交许可，不能用基线 SHA 冒充新代码版本。
- [ ] **11.6 初始化与域名入口。** 使用明确的首次初始化命令建立空云端环境，随后恢复普通启动，确保初始化开关未留在服务单元里。所有者在已保护的 HTTPS 页面自行设置云端管理密码。备案完成、域名解析及 HTTPS 验证通过后，才交付日常网址；不发布未受保护的临时 IP 地址作为替代入口。
- [ ] **11.7 验证备份对象权限。** 单独批准上传合成加密测试包到指定测试对象键，执行 put/head/get/delete，核实 API、私有权限、下载校验和计费类型，不能从普通 COS SDK 可用推断所有 bucket 功能可用。上传/删除均局限此测试对象。成功后再批准生产前缀初始化及日常备份策略的启用。

## Task 12：真实验收、可选迁移与交付

**Files:** F29、F30、F32；真实验收报告的文件和任何媒体产物另行列明获批。

- [ ] **12.1 单独批准真实文件。** 列出要上传的 MP3/M4A、封面、LRC 的本地绝对路径、大小、目标云端及测试后是否保留；未获批准前不读写现有曲库、不自行找其他媒体替代。用户仍没有文件时标为“真实音频待验收”，允许继续页面与权限检查但不能声称完整可用。
- [ ] **12.2 家庭网页闭环。** 所有者在家通过实际 HTTPS 域名验证入口登录→后台登录→真实上传→保存草稿→发布→首页/音乐馆出现→播放/暂停→拖动前后进度→歌词/频谱/音量→自动下一首→刷新保持暂停→下架后刷新移除。复制旧媒体地址发起新的 GET/Range 应不可读。永久删除只对获准测试歌曲直接点击执行，不恢复确认弹窗。
- [ ] **12.3 三天试运行。** 至少 3 天含晚间家庭网络访问、一次服务器重启、一次重新部署和两次成功定时备份。记录真实数据是否保留、响应与音频体验、内存/磁盘/备份总量和账单预估；不根据 200 Mbps 峰值推断用户速度。健康状态异常可见；外部通知渠道未获指定授权时明确无外部通知能力。
- [ ] **12.4 远端恢复演练。** 对已获批准的真实备份集，另列隔离目标与解密密钥使用方式并取得恢复演练授权；通过下载→密文校验→解密→数据库/媒体核对→新目录启动→密码与播放验证。主生产目录不被覆盖。恢复点与耗时分别记录，不能用“备份上传成功”替代恢复通过。
- [ ] **12.5 可选本地迁移。** 默认不执行。若用户要求，先只读盘点并列出源库、media 目录、目标目录、总量、密码哈希/会话处理、停写窗口、传输费用及回退位置。批准后制作一致快照，上传到新目录，校验稳定 ID/关系/文件 hash，撤销目标旧会话，保持源库和本地文件原样。完成切换后明确唯一可写主库；不实现双向同步。
- [ ] **12.6 发布与数据回滚分别验证。** 仅兼容代码回滚切换 current；涉及 schema/data 的回滚先恢复匹配的代码、数据库和媒体到新目录。真实切换/覆盖之前再次说明会丢失哪个时间点之后的变更并批准。回滚不能移除全站保护或把后台端口临时公开。
- [ ] **12.7 最终交付。** 提供私人访问网址（不包含凭据）、部署版本、实际费用及续费周期、已完成与待完成验收、备份最后成功时间、恢复演练结果、停止/恢复服务方式和回滚点。不输出密钥、密码、实际数据库或媒体包。不把个人云端测试称为公开运营上线。

## 4. 规格覆盖表

| 规格要求 | 实施任务及证据 |
|---|---|
| 基线、已有交互、仅本人访问 | 执行边界、Task 3/9/10/12；永久删除与播放器回归。 |
| 中国内地选型、备案、费用拆分 | Task 11 订单/备案核对，Task 8 估算与 Task 12 实际账单。 |
| Node.js 24、单实例、固定数据目录 | Task 1/2/9，Task 10 Linux 启动与重启验证。 |
| HTTPS、私人入口、管理员保护 | Task 3/9/10，Task 11 实际域名证书及端口检查。 |
| 媒体状态、Range、CORS、缓存 | Task 4/9/10/12，不新增宽泛跨域。 |
| 本地临时路径耦合与存储边界 | Task 5 保留业务上传边界；Task 6–8 仅备份对象操作，不实现媒体适配器。 |
| 一致备份、私有对象存储、7 份保留 | Task 6/7/8/9；索引精确轮换、失败不删最后有效集。 |
| 密钥隔离、恢复撤销会话 | Task 6/8，Task 10 合成恢复与 Task 12 获批真实演练。 |
| 备份中断与容量保护 | Task 5/8/9/10；空间前置检查、超时与 ExecStopPost 补偿。 |
| 初始化/真实迁移分离 | Task 2/11 新云端初始化，Task 12 独立审批迁移。 |
| 试运行、验收及回滚 | Task 10/12，所有未执行项单列。 |
| 写入、采购、资源、数据、Git 审批 | 全局边界与 Task 11–12；计划批准不越过独立审批。 |

## 5. 计划自查与交付规则

计划文件写入阶段只检查路径、规格覆盖、接口名称、任务依赖、命令边界及文档格式，不运行会生成文件的构建或测试。代码片段是实施依据，必须由对应测试和真实工具校验后才能成为可部署代码，不能直接复制后跳过验证。

依赖顺序为 Task 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12。采购手续可以由用户在获准后自行办理，但不自动开始另一个代理或窗口；源码实现由当前会话按任务顺序执行。

完成每个任务时记录：实际改动、失败测试原因、通过结果、规格符合性、仍未执行的 Linux/云端/真实音频检查。提交只是单独审批的可选检查点，不因工作流习惯自动提交，也不在每个小步骤之间反复询问已经获批的同范围操作。

用户审阅本计划后，执行确认应明确批准的任务及其 Files/生成产物范围。建议先批准 Task 1–10 的本地实现与可用环境验证；Task 11 的采购/部署和 Task 12 的真实数据操作按具体资源与文件另行确认。

### 窗口交接规则（用户于 2026-09-29 指定）

- 从用户本次指定规则起累计自动上下文压缩次数；达到 2 轮，或当前阶段结束、准备进入另一阶段，均在当前任务完成后提供可直接粘贴到新窗口的交接提示词。
- 压缩不打断正在执行的已批准任务，也不触发重新调查或重复测试。遇到审批或环境阻塞时明确列出已完成部分、未完成项和阻塞原因，不能以“交接”冒充任务完成。
- 提示词直接在对话交付，不自动新建窗口或文件。包含仓库和实际工作树、分支/HEAD、未提交状态、已批准范围、验证证据、未执行验收、下一步和待审批项，以及本规则。
- 新窗口先只读核验，再从记录继续；不重置、不覆盖、不重建工作树。交接不构成购买、云资源创建、部署、真实数据操作、提交或推送授权。
- 每个新窗口重新计数；本窗口自规则指定时起为 0。若摘要没有可靠保留次数，明确次数未知，以阶段完成条件交接，不猜测计数。

## 6. 官方实现依据

以下资料于 2026-09-28 核对，执行时对实际安装版本再验证；文档说明不替代真实联调结果。

- [Node.js 24 SQLite API](https://nodejs.org/download/release/latest-v24.x/docs/api/sqlite.html)：使用自带 DatabaseSync/backup，不引入额外 SQLite 绑定。
- [SQLite 备份](https://www.sqlite.org/backup.html)：数据库快照与媒体停写的边界。
- [Caddy Basic Authentication](https://caddyserver.com/docs/caddyfile/directives/basic_auth)、[日志过滤](https://caddyserver.com/docs/caddyfile/directives/log)、[请求体限制](https://caddyserver.com/docs/caddyfile/directives/request_body)：入口认证、脱敏及上传配置。
- [Fastify 服务器选项](https://fastify.dev/docs/latest/Reference/Server/)：仅信任受控代理，不信任任意转发头。
- [age 官方仓库](https://github.com/FiloSottile/age)：公钥加密和 recipients/identity 文件参数。
- [腾讯云官方 Node.js COS SDK](https://github.com/tencentyun/cos-nodejs-sdk-v5)、[轻量 COS 能力范围](https://cloud.tencent.cn/document/product/1207/108904)：只依赖受支持的对象操作，不假设存储桶级 API 可用。
- [腾讯云价格](https://cloud.tencent.cn/document/product/1207/73452)、[备份存储计费](https://cloud.tencent.com/document/product/1207/88189)、[备案资源要求](https://cloud.tencent.com/document/product/243/18908/)：采购前复核。

### 2026-09-29 本地实施记录（持续更新）

- Task 1：12 条新增失败断言确认原代码未校验；实现后 config/app 16/16 通过，类型检查通过。
- Task 2：空库、缺库、无效 schema、链接、非空初始化共 5 条失败断言先行；实现后 5/5 通过。初始化后重启保留数据库字节、歌曲 ID、测试密码哈希。入口仅接受独立初始化开关。
- Ruling: 逐级 lstat 检查所有祖先，realpath 校验最终存在路径，采用现有 LocalMediaStore 的边界 — Windows 沙箱对用户目录本身 realpath 返回 EPERM，而对 Temp 与目标路径可用 — 不跳过链接检查；Linux 验证仍待执行。
- Task 3：新增 4 条认证/限流失败测试先行；云端 Host/Origin/Secure Cookie、非回环转发头与限流恢复实现后 auth/app 12/12 通过，类型检查通过。
- Task 4：9 条媒体权限/缓存失败测试先行；实现后媒体/曲库/Range/app 33/33 通过。
- Task 5：8 条容量/路由失败测试先行；实现后容量/上传路由/上传服务 30/30 通过，类型检查通过。仍需补充云端容量注入下中断/保存失败联合验证。
- 所有测试数据均来自测试临时目录。Linux、真实云端与真实音频尚未验证；未采购、部署、提交或推送。
- Task 6：配置/快照 15/15，归档 9/9 通过，类型检查通过。实际依赖固定 COS SDK 3.0.0、tar 7.5.22；依赖下载初次受沙箱网络限制，获工具权限后安装成功。age 真加密未执行。
- Task 7：对象级索引/轮换 5/5 通过；未请求真实云端。
- Task 8：备份/恢复/CLI/健康首次 26/26 通过，类型检查通过。后续补两处故障路径的失败测试并修复，backup/CLI 25/25 通过。
- Ruling: 先独占取得维护标记，再持久化“由本任务负责恢复”的状态，之后才停止应用 — 避免维护标记已存在时误启动/解除他人的维护 — 若恰在取得标记与写状态之间被强杀，会安全保留维护状态，需要人工核对，不猜测恢复。
- Task 9：五个 systemd 单元、Caddy/Fail2ban/journald 模板与两份运维文档已写入。Linux 工具不存在，Fail2ban jail 保持 disabled；未进行服务级验证。
- Task 10 首轮 Windows 全量：客户端 30 文件 163/163，服务端 34 文件 252/252，退出码 0；报告位于忽略目录 .verification/private-cloud/full-tests.log。修复后的最终检查另记。
- 依赖审计：3 项位于原有 Vite/Vitest 开发工具。仅提出 package.json/package-lock.json 同主版本安全修订扩展审批，未擅自更新；新增 COS/tar 未列为受影响。未用 npm audit fix --force。

### 本地阶段交付：2026-09-29

- Task 1–5：本地实现与计划内聚焦测试完成。容量保护补充真实本机 HTTP 断开、取消、类型/大小错误与数据库失败的预约释放验证。
- Task 6–8：运维模块已实现，单元与合成数据集成通过。归档限定未压缩 USTAR，立即拒绝越界/链接/重复/超大成员，限制成员数量；真实 age 加密与私钥、真实 systemd/flock 和 COS 尚未验。未把这些 Linux/云端用例勾选。
- Task 9：全部批准配置文件及运维/验收文档已生成；Caddy、systemd、Fail2ban 和权限联调待 Linux 环境。对应含实测要求的步骤保持未勾选，jail 未启用。
- Task 10 Windows 最终回归：客户端 30 文件 163/163，服务端 34 文件 270/270；npm run build 内类型检查、前端和后端编译全部退出码 0。Node.js 24.16.0。完整日志在 .verification/private-cloud/，不提交。
- 编译产物烟测：隔离临时目录显式初始化、首页、Host 拒绝、音频 206、Secure Cookie、进程重启后歌曲 ID/媒体 SHA/密码 hash 一致、缺标记启动失败且库不变、未知参数拒绝。只使用合成数据；不代表家庭真实播放和拖动验收。
- 差异检查：git diff --check 通过；59 个变更/未跟踪文件（含既有两份文档）均在批准路径表内；没有运行数据产物纳入变更；永久删除前端未改；主仓库仍仅原迁移包未跟踪，HEAD 未变。无暂存、提交、推送。
- Ruling: 按已批准计划“不自动派发子代理”，最终审查由当前实现者逐模块自查 — 遵守用户指定工作流 — 缺少独立视角，不能声称完成独立审计或全项目审计。
- 最终修复证据：维护标记误解除、索引失败未留状态、初始化 schema 仅查表名、Origin 路径规范化绕过、提前取消未关闭管道、时钟回拨误轮换、意外压缩 tar 自动解压、校验错误码不能被状态读取器接受，均以失败测试复现并通过修复后全量回归。
- 6.6/8.4/8.6 中真实 age、系统锁/硬终止与更完整的 Linux 故障联调仍未执行；9.2–9.5 的实际服务/日志/权限校验未执行；10.3–10.6 的 Linux、真实加密和环境重启/版本切换验收未执行。保留复选框未完成，避免以模板或模拟替代。
- 原有 Vite/Vitest 安全更新扩展审批仍待回复，本轮未更改它们；3 项开发依赖公告保留为待处理。它们不是新增 COS/tar 包的公告。没有外部通知渠道。
- Task 11–12 未执行：无采购、云资源、部署、真实数据上传或迁移；没有可交付公网网址。下一步先处理剩余审批与 Linux 验证条件，再逐项进入采购/备案/远端部署关口。

### 2026-09-29 同主版本安全更新（后续获批）

- 用户批准 Vite/Vitest 同主版本更新以及 package.json、package-lock.json、本计划、验收记录和对应验证产物；同时指定上述窗口交接规则。更新至固定 Vite 7.3.6、Vitest 3.2.7，未修改业务实现或测试源文件。
- 用户另行明确批准向 npm 官方注册表 https://registry.npmjs.org 发送依赖名称和版本清单，解除首次联网审计的自动审批阻塞。审计已执行，critical/high 均为 0；moderate 2，均关联 GHSA-82fw-gwwq-j7x9，审计退出码 1。
- 官方公告说明该中危问题不回补 Vitest 3.x；跨主版本更新未获授权。本轮不使用 npm audit fix --force，不将同主版本更新描述为全部漏洞已修复。
- 更新后复验：客户端 30 文件 163/163、服务端 34 文件 270/270；类型检查和构建通过。证据在忽略目录 .verification/private-cloud/security-update-tests.log、security-update-build.log、security-update-audit.json。
- 本轮依赖范围内工作结束，按阶段交接规则提供新窗口提示词。下一阶段先只读评估 Vitest 4.1.11 或以上修复版本的兼容性，列明所需文件与验证方法并取得跨主版本审批；再推进 Linux 验证条件和 Task 11 采购/备案/部署准备，不自动采购或部署。
- 本地/云端/真实音频验收边界不变；未暂存、提交、推送，也未改变主仓库的无关迁移包。

### 2026-09-29 Vitest 4 安全升级（验证结果）

- 用户在审阅只读兼容性评估及完整写入范围后回复“就在这里继续执行”，批准 Vitest 精确升级至 4.1.11，以及 package.json、package-lock.json、vite.config.ts、src/App.test.tsx、src/features/player/PlayerKeyboard.test.tsx、本计划、验收记录和运维手册，共八个文件。
- 生成产物范围为 node_modules/、dist/、server-dist/，以及 .verification/private-cloud/ 下 vitest4-install.log、vitest4-focused-tests.log、vitest4-tests.log、vitest4-build.log、vitest4-audit.json、vitest4-npm-cache/、vitest4-tmp/。npm 缓存和隔离合成测试数据定向到这两个专用子目录，不使用真实曲库。
- 基线复核：实际工作树 E:\codex\hanser\.worktrees\pc-music-player，分支 codex/pc-music-player；本地及远端 main、开发分支均为 000e3344f0f5dfb06e8ce18c689efdc716cd8f8d；59 个变更/未跟踪文件，暂存区为空。交接中的无点工作树路径不存在；原验证报告实际在工作树内 .verification/private-cloud/。
- 预检：官方 4.1.11 元数据支持 Node.js 24.16.0、Vite 7.3.6；@vitest/mocker 固定 4.1.11，修复 GHSA-82fw-gwwq-j7x9。扫描 64 个测试文件，发现两处 Audio 构造器 mock 使用箭头函数，需改为普通函数；vite.config.ts 显式从 vitest/config 导入 defineConfig。实际兼容性以随后测试为准。
- Ruling: 沿用本计划作为执行台账，报告仅用上述已批准目录；保留现有工作树，不自动提交或派发审查代理 — 遵守用户的文件范围、Git 审批和不派发子代理要求 — 本轮只能提供实现者自查，不代表独立或全项目审计。
- 执行顺序：安装固定版本 → 用现有聚焦用例验证构造器不兼容 → 最小测试/配置适配 → 聚焦及全量回归 → 类型检查与生产构建 → npm audit → 文件范围和锁文件自查 → 更新文档。范围外修改重新审批。
- 安装成功：Vitest 与配套 @vitest/mocker 为 4.1.11，Vite 保持 7.3.6；生产依赖锁条目未变化，开发依赖树移除 vite-node、tinypool 等旧依赖。npm install 退出码 0。
- 已有聚焦用例在升级后先复现两处 Audio 箭头 mock 不可构造：38/40 通过、两项失败及两条未处理异常。将两处替身改成普通函数后，4 文件 40/40 通过，保留单音频实例与错误反馈断言；配置入口显式导入测试类型。
- 首次全量客户端 30 文件 163/163 通过；服务端 262/270，8 项失败，另有同一曲库列表用例清理 ENOTEMPTY。仓库内临时目录触发运行数据必须在代码目录外的检查，并出现超时；原始结果完整保留。
- 用户补充批准仓库外测试目录 `C:\Users\Administrator\AppData\Local\Temp\255-phonograph-vitest4-20260929\`，用于本轮合成夹具生成与清理。TEMP/TMP 改到该目录后，原失败涉及的 5 文件 26/26 通过，随后默认并发/超时下完整服务端 34 文件 270/270 通过。未修改服务端源码、测试或路径保护；原仓库内临时目录保留。
- 类型检查和生产构建通过，退出码 0；npm audit 全部级别 0、退出码 0。安装、失败/通过的聚焦及全量测试、构建、审计证据均在上述 vitest4 报告中。最终结果以验收记录最新章节为准，不覆盖历史失败证据。
- Linux、Caddy/systemd/Fail2ban、真实 age、锁与强杀恢复、真实 COS、服务器重启/重新部署、家庭真实音频和三天试运行仍待验收。后续先准备 Linux 验证条件，再单独处理采购/备案和远端部署审批。
- 本阶段完成：按执行前哈希确认仅八个批准仓库文件变化；累计 62 个变更/未跟踪文件，新增差异路径为两份测试和 vite.config.ts。git diff --check 退出码 0，验证产物被忽略；HEAD 未变、暂存区为空，主仓库迁移包保留。无独立审查、提交或外部部署操作。

### 2026-09-29 Linux 条件与采购/备案/远端部署材料准备

- 本轮审批：用户审阅范围后回复“批准执行”，仅批准更新 F29 运维手册、F30 验收记录和 F32 本计划。内容为只读核验结果、公开采购价格、备案准备、Linux 验证关口、待填远端资源清单及已发现的模板参数差异；不修改源码、部署模板或设计规格，不生成测试/构建产物。
- 本窗口只读核实实际工作树 `E:\codex\hanser\.worktrees\pc-music-player`、分支 `codex/pc-music-player`；HEAD 与本次联网取得的远端 main、开发分支 SHA 均为 `000e3344f0f5dfb06e8ce18c689efdc716cd8f8d`。累计 62 项变更（20 修改、42 未跟踪），暂存区为空。首次远端查询的 Windows TLS 凭据错误已通过只读权限重试解决；未 fetch 或修改引用。迁移包保留，无点工作树路径不存在。
- 依赖与报告仅复核已有证据：Node.js 24.16.0、Vite 7.3.6、Vitest/@vitest/mocker 4.1.11；已有最终客户端 163/163、服务端 270/270、构建与 npm audit 全零记录吻合。未重新升级、运行测试、构建或 audit；历史失败证据继续保留。
- Linux 条件：WSL 状态检查返回 50，无当前用户发行版登记；PATH 未找到 Docker、Podman、Caddy、age，常见 Docker/虚拟机安装路径也未发现程序。当前未发现可用的现成 Linux 环境；SSH 客户端可用但无获准目标主机。未安装 WSL、虚拟机、容器或软件。
- Task 9.2 差异说明：历史示例 `TimeoutStopSec=30`，实际 `deploy/systemd/phonograph.service` 为 `TimeoutStopSec=90`。保留历史示例并记录当前模板值，本轮不改模板；Linux 验证按实际文件检查停服、超时、确认进程退出后才快照及补偿。该差异记录不表示运行验证通过。
- Task 11.1 的准备材料已补入[运维手册第 10 节](../../deployment/private-cloud-runbook.md#10-2026-09-29-采购与部署准备补充当前关口)：服务器三个月预估 135 元，域名首年页面显示 33/39 元、继续预留 39 元，备份上海价 0.00393333 元/GB/日；全部备份日均合计 10 GB、30 天无公网恢复下载时约 49.43 元/月。公开报价不代表实际订单；域名、上海库存及镜像仍待账号内核实。
- 备案材料补充个人实名信息一致性、主体省份与服务器地域的区别、资源购买期限、官方材料及核验流程、开站后公安备案。域名候选与备案省份待用户提供；未读取身份材料或提交备案。具体依据和核对日期见运维手册。
- 顺序关口：若以未来购买的专用 Ubuntu 24.04 服务器作为 Linux 验证环境，须先确认采购先于 Linux 验证的例外，再分别批准订单和环境写入。本轮文档批准不授权该执行路径。Linux 工具、仓库外测试目录、缓存、构建、日志、合成数据、临时测试密钥、系统服务和清理范围须列明确切路径后批准。
- 远端清单已按主机身份、真实提交 SHA、发布/数据/配置目录、五个 systemd 单元、Caddy/Fail2ban/journald、端口、运维状态和 COS 对象边界整理。实际 ID/IP/指纹、域名、SHA、桶、测试对象键及生产前缀保持待填；不能用旧基线 SHA 代表当前未提交实现。
- 6.6、8.4、8.6、9.2–9.5、10.3–10.6 和 Task 11–12 的复选框保持不变。11.1 已有可审阅材料草案，但尚未形成实际订单及可执行环境批准单；不将 Task 11 标为完成。真实 COS 对象测试、生产索引/定时备份、真实音频、恢复/迁移、提交和推送仍分别批准。
- 本轮验证方法：只读比较写入前后源码文件 hash 与路径集合，确认变化限于三份文档；检查历史内容保留、文档链接、费用计算、待验收状态和 `git diff --check`。不新建报告文件，不运行会生成产物的测试或构建；实际结果在本窗口交付中说明。

### 2026-09-30 成都与 Ubuntu 26.04 本地适配

#### 当前基线与采购事实

- 实际工作树 `E:\codex\hanser\.worktrees\pc-music-player`，分支 `codex/pc-music-player`，HEAD `3e20be0e6881941bc339dc569392bafaf25fe83a`。本窗口适配前 Git 未列出变更，同时提示全局 ignore 文件读取权限警告；主仓库迁移包保留。开发分支已推送、main 未合并为用户交接事实，本窗口未重新查询远端。
- 用户交接说明：已登录腾讯云页面确认域名 `255fm.cn` 已购、状态正常；拟四川个人备案，尚未提交。实例 `lhins-856nphe0` / `255-phonograph`，成都二区，公网 IP `1.14.111.74`，锐驰型 2 核 2 GB、40 GB SSD、200 Mbps 峰值、无限流量，Ubuntu Server 26.04 LTS 64bit。到期原值 `2026-12-31 11:53:38`，自动续费关闭。
- 本窗口没有重新访问控制台或连接终端。成交/续费金额、域名实名、备案资格、SSH 主机指纹与连接方式仍待核对；未安装、部署、创建桶或处理真实音频。
- Ubuntu 26.04 只读兼容性检查已在交接前完成：没有必须重装的依据，但未通过运行验证；系统仓库 Node 22、默认 `/tmp` 为 tmpfs。实际主机状态仍须未来获准只读检查确认。

#### 批准范围与执行安排

用户在审阅文件、影响、生成物与验证方法后回复“批准”。本次恰好 14 个现有文件：

1. `server/ops/contracts.ts`
2. `server/ops/config.ts`
3. `server/ops/config.test.ts`
4. `server/ops/backup-store.test.ts`
5. `server/ops/health.ts`
6. `server/ops/health.test.ts`
7. `deploy/backup-config.example.json`
8. `deploy/systemd/phonograph.service`
9. `deploy/systemd/phonograph-backup.service`
10. `deploy/systemd/phonograph-health.service`
11. `docs/superpowers/specs/2026-09-28-private-cloud-test-deployment-design.md`
12. 本实施计划
13. `docs/deployment/private-cloud-acceptance.md`
14. `docs/deployment/private-cloud-runbook.md`

批准的工作树内产物为 `dist/`、`server-dist/`、`node_modules/.vite/`、`node_modules/.vite-temp/`；报告目录 `.verification/private-cloud/chengdu-ubuntu26/` 下仅 `focused-red.log`、`focused-tests.log`、`tests.log`、`build.log` 和 `npm-cache/`。仓库外合成夹具目录为 `C:\Users\Administrator\AppData\Local\Temp\255-phonograph-chengdu-ubuntu26-20260930\`，TEMP/TMP 指向这里，测试仅清理本轮生成内容。未批准依赖升级、提交、推送、远端操作或真实曲库操作。

- Ruling: 使用当前会话执行，沿用本计划和已批准报告目录，不创建技能默认工作目录、不派发子代理、不自动提交 — 遵守用户明确范围 — 本轮为实现者自查，不是独立审计。
- 接口预检：BackupConfig 的地域类型由 config 校验后传给 CosBackupStore 和 collectHealth；COS 原实现已经透传地域，不需修改 backup-store.ts。费用查表必须和地域白名单一致；三个 service 与手工命令必须使用相同 Node 路径。
- [x] 新增配置/费用测试并验证预期失败：3 文件 40 项中 35 通过、5 失败。失败为成都直接校验、成都文件加载和三项成都费用/阈值断言；没有用路径或工具错误冒充功能失败。SDK 地域透传原本支持，新增双地域回归在此轮通过。
- [x] 最小适配：类型与校验允许上海/成都，模板默认成都；费用按地域采用上海 `0.00393333`、成都 `0.0033` 元/GB/日；三个 service Node 路径统一为 `/opt/255-phonograph/node24/bin/node`。未安装远端 Node，未改变现有服务保护或 TimeoutStopSec=90。
- [x] 聚焦回归：`npm run test:server -- server/ops/config.test.ts server/ops/backup-store.test.ts server/ops/health.test.ts`，3 文件 40/40、退出码 0。
- [x] 全量回归：`npm run test:run`，客户端 30 文件 163/163、服务端 34 文件 286/286、退出码 0；服务端比基线增加 16 项。Node.js 24.16.0、Vitest 4.1.11，未调整默认并发/超时。
- [x] `npm run build`，客户端/服务端类型检查、Vite 构建、服务端编译均通过，退出码 0。未安装依赖或重跑 audit；2026-09-29 audit 全零仍为历史证据。
- [x] 同步四份文档：记录采购事实来源、当前本地基线、26.04 运行未验状态、Node 安装路径和版本检查、磁盘 TMPDIR/恢复目标父目录要求、成都费用与后续批准关口。保留历史审批、失败和上海选型记录。

费用依据：2026-09-30 只读复核[腾讯云 Lighthouse COS 定价](https://cloud.tencent.com/document/product/1207/88189)。成都 10 GB 合计存储 30 天约 0.99 元；现有服务器 45 元/月和域名 39 元/年参考基数下总估算 49.24 元/月。实际订单金额尚未核对；估算不包含公网恢复下载，不等同账单。

后续仍待单独批准 Ubuntu 26.04 主机只读预检及具体环境写入。Node 24 安装目录、构建和测试目录、软件来源/版本、系统文件、账号、端口、测试密钥等需列确切范围。6.6、8.4、8.6、9.2–9.5、10.3–10.6 及 Task 11–12 的未完成状态保持；采购事实已更新，但不把采购/备案/备份组合任务整体勾选完成。Linux、真实 age/COS、强杀恢复、重启/重新部署、家庭音频和三天试运行继续未验收。

- [x] 本地交付复核：变更集合与批准的 14 文件完全一致；`git diff --check` 通过；四文档 17 个相对链接目标存在。源码和模板自查覆盖地域校验、费用查表、COS 参数测试及统一 Node 路径，没有扩展业务功能。当前 Task 9.2 示例的停服超时同步为实际模板 90 秒，历史差异记录保留。
- [x] 产物边界：报告/构建/工具缓存受既有忽略规则覆盖，package.json 和 package-lock.json 无差异，暂存区为空，HEAD 未变。获准 TEMP/TMP 根目录中仅留工具生成的 node-compile-cache；测试数据库和合成媒体由用例清理，未清理旧轮次目录。主仓库迁移包存在。
- 本地适配阶段结束；本窗口自动压缩累计 0 次。按阶段切换规则在对话提供交接提示，不自动创建窗口。下一阶段先取得目标主机连接方式和可信主机指纹，单独批准远端只读预检，随后再按确切路径审批环境写入；本轮批准不延伸到这些动作。

### 2026-09-30 测试部署准备（当前执行入口）

#### 授权、基线与证据

用户本次明确回复“批准更新四份文档”，仅修改本计划、部署规格、验收记录和运维手册。保留历史段落，更新当前摘要；不修改其余十个适配文件，不生成测试/构建日志或安装产物，不提交、推送、打包、上传或操作服务器。

本次只读核对：工作树仍为 `E:\codex\hanser\.worktrees\pc-music-player`，分支 `codex/pc-music-player`，HEAD `3e20be0e6881941bc339dc569392bafaf25fe83a`，14 个文件修改、暂存区为空。已有日志记载客户端 163/163、服务端 286/286、聚焦 40/40，类型检查和构建通过；本次未重跑。远端推送和 main 未合并仍仅为交接事实，未重新查询远端。

服务器预检及 Node/Caddy 安装已在上一阶段分别批准完成，原证据为用户在腾讯云终端执行后回传，本次通过交接文本接续。Node 24.21.0/npm 11.19.0 使用 `/opt/255-phonograph/node24/bin/`；Caddy 2.11.4 的两个服务保持 masked/inactive。应用未上传，Linux 全量工程和入口配置未验证。详见[验收记录](../../deployment/private-cloud-acceptance.md)及[运维手册第 12 节](../../deployment/private-cloud-runbook.md#12-2026-09-30-服务器准备交接与内部测试操作边界)。

#### A. 审查与固定发布版本

- [ ] 审核当前 14 个修改文件及直接依赖，确认成都/上海校验、费用取价、Node 服务路径、测试断言和文档一致；明确只有实现者自查，不能写为独立审查。
- [ ] 列出确切暂存文件、提交说明和验证结果，单独申请 Git 提交批准；批准后只暂存指定文件并提交。推送需另行批准。
- [ ] 读取提交后的 `git rev-parse HEAD`，记录真实 40 位 SHA 并检查发布范围是否仍有未提交差异。源码包与 `PHONOGRAPH_RELEASE_ID` 必须对应该提交，不能沿用上述适配前 HEAD。

#### B. 源码包内容与上传

候选白名单为 `src/`、`server/`、`shared/`、`public/`、`deploy/`，以及七个根文件：`package.json`、`package-lock.json`、`index.html`、`tsconfig.json`、`tsconfig.server.json`、`vite.config.ts`、`vitest.server.config.ts`。交接统计为 183 个 Git 管理文件、原始约 905486 字节；该数字是历史候选统计，必须按实际发布提交重新枚举。

- [ ] 从获准提交枚举白名单，检查依赖引用与文件类型，排除秘密、数据库、真实媒体、Windows node_modules、构建目录、`.verification` 和迁移包。`public/`、`deploy/` 仍逐项审查，白名单目录名本身不构成内容安全证明。
- [ ] 得到真实 SHA 后，列出本地归档及校验清单的确切绝对文件名、格式、内部路径、影响和验证方法，单独申请生成批准；本次不创建输出目录或归档。
- [ ] 生成后核对包内文件清单、数量和 SHA-256，确认内容来自同一提交。避免把 Git 管理文件的工作区未提交版本混入包中。
- [ ] 单独申请上传，列出该包及校验清单、实例身份和控制台实际落盘路径。腾讯云控制台若只能写入默认上传目录，先确认该目录并纳入批准范围，不擅自移动文件。上传后用户逐条执行校验命令，核对 SHA-256，再审批解包与运行环境。

#### C. Linux 隔离验证路径提案（尚未批准创建）

下表是下一轮环境审批的候选范围。执行前检查路径是否存在、是否含旧数据、祖先是否为符号链接，以及真实挂载和可用空间；遇到冲突先重新选定并审批，不覆盖或清理。

| 确切候选路径 | 用途与预计写入 |
| --- | --- |
| `/var/tmp/255-phonograph-linux-test-20260930/` | 本轮隔离根目录，拟由 ubuntu 用户持有，不作为正式发布目录。 |
| `/var/tmp/255-phonograph-linux-test-20260930/source/` | 解包源码；npm ci 生成 node_modules（含工具缓存）；构建生成 dist、server-dist。 |
| `/var/tmp/255-phonograph-linux-test-20260930/npm-cache/` | npm 下载缓存及 npm 自身日志。 |
| `/var/tmp/255-phonograph-linux-test-20260930/tmp/` | 设置为 TMPDIR，位于源码目录外；单元测试的数据库、媒体、归档和恢复夹具仅在此生成与清理。 |
| `/var/tmp/255-phonograph-linux-test-20260930/logs/` | 拟保存 npm-ci.log、tests.log、build.log、internal-app.log；命令实现需保留真实退出码。 |
| `/var/tmp/255-phonograph-linux-test-20260930/app-data/` | 单独批准后初始化的 SQLite、WAL/SHM、.initialized.json、media/ 和合成示范音频；不用于真实歌曲。 |

源码、缓存、日志、TMPDIR 和 app-data 为同一隔离根下的不同目录；所有测试从 source 执行，因此数据和 TMPDIR 均在代码目录之外。实际上传落盘路径需在上传审批时确定，不假定上传界面支持任意目标。正式 `/srv/255-phonograph/`、`/var/lib/255-phonograph/`、`/etc/255-phonograph/` 和 systemd 单元不在此候选写入范围。

#### D. 获准环境后的工程与内部应用验证

以下是计划步骤，本次不执行。每次向用户只提供一条可复制命令，等待回传后再继续；不自动向浏览器终端输入。

- [ ] 先用 `findmnt`、`df` 核对获准目录确实落在磁盘且有足够空间；确认 2 GiB swap 的实际状态。大文件测试不使用 `/tmp` 或 `/run` 的 tmpfs，不自动改 swap。
- [ ] 在 source 目录设置 PATH 首项为 `/opt/255-phonograph/node24/bin`，设置 TMPDIR 为上表 tmp、npm_config_cache 为上表 npm-cache；分别核对 node/npm 版本、`process.execPath` 与 `require('node:os').tmpdir()`。
- [ ] `npm ci --no-audit --no-fund`：按锁文件安装完整测试和构建依赖。环境审批须包含向 npm 注册表下载依赖、安装生命周期脚本及上述生成物；不升级锁文件，不把此步当作依赖安全审计。
- [ ] `npm run test:run`：预期客户端 163 项、服务端 286 项全部通过；若发布提交改变测试数量，以该提交核对后的数量为准，记录失败与真实退出码。
- [ ] `npm run build`：包含两套类型检查、Vite 前端构建及服务端编译，预期退出码 0。记录 Node 24.21.0 与内存/磁盘实际情况；失败时保留日志，不通过降低路径保护绕过。
- [ ] 单独批准内部应用初始化和进程启动后，使用 `NODE_ENV=production`、`PHONOGRAPH_DEPLOYMENT=private-cloud`、`PHONOGRAPH_SITE_ORIGIN=https://255fm.cn`、真实 `PHONOGRAPH_RELEASE_ID`、上表 app-data 绝对路径和 `PHONOGRAPH_HOST=127.0.0.1`。先确认 3001 未占用；初始化命令会写数据库、标记与合成媒体，不能误当只读验证。
- [ ] 使用获准的显式 Node 路径运行编译入口 `server-dist/server/index.js --initialize-data`；成功退出后普通启动不再带初始化参数。后台进程及日志的启动、停止范围在执行前列明；不安装 phonograph 服务。
- [ ] 从服务器回环地址验证网页、Host 检查、API、合成媒体 GET/HEAD/Range、正常退出和重启数据保留，记录每项结果。涉及测试密码或写接口的夹具也先列入审批，不操作真实密码。Caddy 全程保持 masked，内部 HTTP 不能证明 HTTPS/Secure Cookie/私人入口工作正常。

Linux 配置校验、应用 systemd、真实 age 与 COS、强杀补偿、服务器重启/重新部署、域名 HTTPS 与私人入口、家庭真实音频和三天试运行保留后续关口。安装、配置、服务启停及对应产物范围逐步明确后审批，不因文档完成自动执行。

#### 本次文档检查

只读比较写入前后 Git 管理文件的 SHA-256，检查差异仅为获准四份文档；检查相对链接、当前摘要与历史记录边界，运行 `git diff --check`。检查结果在本轮对话报告，不新建报告文件或重跑工程测试。
