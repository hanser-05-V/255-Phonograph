# 云端部署与公开初版验收记录

**Git 同步范围（2026-10-21）：** 用户已授权将这四份进度/部署文档提交并推送至 codex/pc-music-player；实际完成结果以 Git 命令和远端 SHA 核对为准。本次仅文档同步，线上功能版本继续为 f2b6892，不触发重新部署；四个 COS 文件不纳入提交。

**最新进展（2026-10-21）：** 正式网站已切换至 f2b6892，用户回传 DEPLOY_OK；代理独立 HTTPS 核对首页、音乐馆、晚安电台、后台入口及新版资源通过。真实歌曲上传、完整播放和家庭网络仍待用户验收；以本文末尾记录为准。

**最新批次：** 见文末“2026-10-21 新版部署成功与公网只读复核”；新版已上线，真实歌曲上传/完整播放及家庭网络仍待用户验收。

建档日期：2026-09-29；当前汇总更新于 2026-10-21。此文件区分本地代码证据、服务器观察及尚未完成的验收。

最新状态：2026-10-21 正式 B 界面已上线 f2b6892，服务器切换证据由用户终端回传，代理另完成 11 项只读公网 HTTPS 核验。ICP 已通过，公安申请已取消、待重新提交。下表是当前验收总览；其后按日期保留历史记录。真实音频上传、完整播放、上线后浏览器交互和家庭网络仍待用户验收，不能用本地合成数据或静态资源一致性代替。

| 范围 | 当前状态 | 证据/仍需完成 |
| --- | --- | --- |
| 基线 | 线上功能版本为 f2b6892a1616421c62ce4faeeb4ee62315870636；后续文档提交不改变 current | 28 个发布文件已提交上线；四份进度文档纳入本次文档提交，四个 COS 文件保留未提交；实际分支 HEAD 以 Git 查询为准，旧 ad23f36 release 保留。 |
| 云端配置 | 聚焦测试通过 | 非法 Origin、host、相对路径和 SHA 拒绝；本地模式保持。 |
| 初始化/启动保护 | 聚焦测试通过 | 缺库/标记/schema 拒绝；不覆盖非空目录，重启保留合成数据。 |
| 管理保护 | 线上管理员保持已初始化；匿名状态接口复核通过 | 2026-10-21 独立 GET 返回 needsSetup=false、authenticated=false；上线后实际登录、Cookie 和上传仍待验收，不重复初始化。 |
| 媒体权限 | 聚焦测试通过 | 孤立、草稿、下架、回收站、共享引用、替换、管理员不绕过。 |
| Range/缓存 | 聚焦测试通过 | 200/206/416/HEAD、后缀/开放结尾、API private no-store。 |
| 上传容量 | 自动测试通过 | 磁盘阈值、并发预约、鉴权先行、类型/超限/数据库保存失败释放；真实本机连接中断与取消也已验证。 |
| 快照 | 聚焦测试通过 | WAL 记录、数据库引用、文件哈希、缺失文件、硬链接和目标保护。 |
| 归档 | 单元测试通过 | 真 tar 和可替换 age 进程边界；恶意路径/重复/链接拒绝。不是 age 真加密验收。 |
| 对象存储 | 独立探针本地 27/27；真实 COS 正向联调通过 | 已在指定私有测试键完成 HEAD/PUT/HEAD/GET/DELETE/HEAD；源与下载 259 字节、SHA-256 一致，最终 complete/absent。仅合成密文传输，不是正式备份恢复验收。 |
| 备份编排/恢复 | 聚焦测试通过 | 先恢复服务再上传，失败不删旧备份；隔离恢复撤销旧会话，保留原库和密码哈希。 |
| 工程验证 | 候选版客户端 30 文件 168/168、前后端类型检查与构建通过 | 本地相关服务端 4 文件 38/38；服务器本次运行客户端 168 项。服务端全量 294 项及 COS/ACL 数量属于历史证据，本批未重跑全量服务端。 |
| 依赖安全审计 | 历史 npm audit 通过；本轮未重跑 | 2026-09-29 npm audit 全部级别均 0，退出码 0。本轮未变更依赖或锁文件，不代表本轮新增审计证据。 |
| 服务器预检及 Node 安装 | 交接记录已完成 | Ubuntu 26.04/x86_64/systemd 259；Node 24.21.0、npm 11.19.0，SQLite 内存查询与 backup API 检查通过。详见末尾证据。 |
| Linux 工程回归 | f2b6892 的客户端 168/168、类型检查及生产构建通过 | 2026-10-21 用户回传：Node 24.21.0、Vitest 4.1.11，30 文件，33.82 秒；Vite 92 modules，index-CHkginCq.css / index-DjUfLE4I.js。旧版 163/294 项结果仅作历史。 |
| 服务器本机 HTTP | 新 release 重启后工作目录和回环 health 核验通过 | 用户回传 DEPLOY_OK；生产真实媒体 Range/完整播放尚未重验，不能外推为全部 API 验收。 |
| Caddy/systemd/Fail2ban | 应用与 caddy.service active/running/enabled | Caddy 配置校验通过，caddy-api 未解除屏蔽；Fail2ban、整机重启和故障恢复尚未验收。 |
| age 真加密/错误私钥/截断 | 合成数据演练通过 | 59 字节明文和恢复文本 cmp/SHA-256 一致；错误密钥及截断密文均按预期退出 1，输出 0 字节；目录 0700、十个文件 0600，verify.log 已回传。不是生产备份验收。 |
| 备份硬终止、锁、开机恢复 | 未执行 | 需真实 systemd/flock 故障注入。 |
| 备案 | ICP 蜀ICP备2026063099号-1 已通过；公安申请已取消 | 用户截图/说明。网站备案名毛怪小站，待按初版实际内容重新提交公安备案，没有公安号。 |
| DNS/HTTPS/公网 | 独立 11 项 HTTPS GET 均 200，四个页面和五个资源与候选 SHA-256 一致 | 首页、/music、/goodnight-radio、/admin 和 ICP 页脚代码已发布；内置浏览器读取超时，生产交互、www 与家庭网络仍待验收。 |
| 真实 COS 权限/计费 | 指定对象正向请求、GET 前缀/后缀拒绝、匿名读取及三种 ACL 上传拒绝通过 | ACL 脚本已获批安装及实测，四项 403 AccessDenied，private-fixture-cleanup=deleted-verified，最终 complete/absent；grant 条件、全部账号权限和账单未验收。旧密钥禁用保留，替换密钥由用户安全保存；旧 Lighthouse 估算不适用于当前账单。 |
| 正式路径/权限 | f2b6892 安装内容、所有者/权限及 current 切换验证通过 | 正式数据目录沿用 /var/lib/255-phonograph，仅同步环境中的版本标识并备份旧配置；未读取真实曲库或完整环境，未安装生产备份配置。 |
| 真实 MP3/M4A/封面/LRC 上传 | 待用户验收 | 尚无上线后的真实文件上传/发布结果回传；不擅用现有曲库或示例代替。 |
| 真实网页播放和拖动 | 待验收 | 用户已能打开首页，但当前初始曲目为短示例；真实首播、暂停、往返拖动、歌词/频谱、下一首和刷新恢复仍需实际操作。 |
| 页面尺寸 | 本地 B 界面 320×740、390×844、768×1024、1280×900 已检查 | 公共页面无横向溢出，备案页脚留白及迷你播放器已验；正式环境和真实手机、后台布局仍需实际复核。 |
| 持久化及回滚 | 本次正式版本切换与服务重启已成功 | 正式数据沿用既有目录；未做真实曲库前后哈希验收，未触发实际故障回退。内存回退模拟通过不代表真实服务器回退、整机重启或后台会话已验收。 |
| 三天试运行/两次定时备份 | 未执行 | 含家庭晚间网络、实际内存/磁盘/费用和恢复耗时。 |

本次公网复核没有通过管理操作写入真实歌曲、媒体或密码；服务启动沿用既有流程。正式代码发布已经完成，真实内容、功能完善、数据恢复与公安备案仍按各自清单推进。以下历史章节中的待发布、旧版本和测试数量按当时语境保留。

## 本地证据和审查范围

忽略目录 `.verification/private-cloud/` 中保存 `full-tests.log`、`build.log` 和 `compiled-smoke.log`；仅含自动化运行结果，不含真实凭据、数据库或媒体。该目录不提交。

最终核对 59 个变更/未跟踪文件（含先前获批的两份设计文档），均在批准范围。主仓库仅原有迁移包未跟踪，HEAD 未变，开发工作树没有暂存或提交内容。本次审查覆盖本轮变更及其直接依赖，未重新审计整个项目；由实现者自查，按计划未自动派发子代理，不视为独立审查。

复查后增加并通过的故障用例：原有维护标记保护、索引前置失败记录、时钟回拨拒绝轮换、取消时关闭归档管道、拒绝额外压缩归档、快照校验失败状态可被下一次任务读取。Linux 服务、入口配置与真实云端缺少运行证据，仍是部署前关口。

执行调整已记入实施计划：台账沿用已批准计划文件；路径检查采用逐级 lstat 与最终 realpath；取得维护标记后、停服前持久化恢复责任。如果任务恰在取得维护标记与记录责任之间被强杀，会保留维护状态等待人工核对，不自动解除未知维护。

## 2026-09-29 开发依赖安全更新复验

用户已批准 package.json、package-lock.json、原实施计划与本验收记录的更新，以及对应验证产物。更新后客户端 30 文件 163/163、服务端 34 文件 270/270；全量测试、类型检查与构建退出码均为 0，使用 Node.js 24.16.0。依赖清单与锁文件固定版本一致。业务代码和测试源文件本次未修改。

报告在忽略目录 `.verification/private-cloud/`：`security-update-tests.log`、`security-update-build.log`、`security-update-audit.json`。联网审计首次被自动审批拦截，用户随后明确批准向 https://registry.npmjs.org 发送依赖名称/版本清单；重试成功取得审计结果。无源代码、媒体、数据库或密钥作为审计负载发送。

当时剩余的 [GHSA-82fw-gwwq-j7x9](https://github.com/vitest-dev/vitest/security/advisories/GHSA-82fw-gwwq-j7x9) 为开发服务器 mock 路径越界读取；官方说明 3.x 不再维护且无该修复计划，4.1.11 为修复版本之一。npm 当时自动建议 5.0.2，但该轮只获批同主版本更新，没有执行跨主版本升级或强制修复。未开启测试 UI 或向公网开放开发服务器。本节保留同主版本更新的历史结果，当前依赖状态以后面的跨主版本升级章节为准。

没有提交、推送、采购、部署或真实数据操作。此前 Linux、真实加密、COS、真实上传/播放/拖动和家庭访问等未验收项保持未完成。

## 2026-09-29 Vitest 4.1.11 跨主版本升级复验（最新）

用户审阅文件、影响和验证范围后批准继续执行。修改 package.json、package-lock.json、vite.config.ts、src/App.test.tsx、src/features/player/PlayerKeyboard.test.tsx、实施计划、本验收记录及运维手册，共八个文件。业务实现、服务端测试、永久删除交互及真实曲库均未修改。

- 安装固定 Vitest 4.1.11，配套 @vitest/mocker 为 4.1.11；Vite 7.3.6、jsdom 26.1.0、Node.js 24.16.0 保持。使用官方注册表，安装退出码 0；未执行 npm audit fix --force。锁文件生产依赖条目保持原样，变化限于 Vitest 开发依赖树。
- 升级后先运行现有 App、PlayerKeyboard、PlayerProvider、Spectrum 测试：38/40 通过，两处箭头函数 Audio mock 报不是构造器，同时产生两条未处理异常。只改为普通函数并保留原有断言后，4 文件 40/40 通过、退出码 0；vite.config.ts 显式从 vitest/config 导入 defineConfig。
- 首次全量客户端 30 文件 163/163 通过；服务端 34 文件中 262/270 通过、8 项失败，涉及配置、初始化路径、恢复、schema 检查和曲库列表。原因记录包含测试临时目录位于代码目录而被安全检查拒绝，以及超时、清理 ENOTEMPTY；不把该轮称为通过。
- 用户随后单独批准 `C:\Users\Administrator\AppData\Local\Temp\255-phonograph-vitest4-20260929\`，仅生成/清理本轮隔离测试夹具。将 TEMP/TMP 定向到该仓库外目录后，原失败涉及的 5 文件 26/26 通过，完整服务端 34 文件 270/270 通过、退出码 0。未调整默认并发或超时，也未弱化路径检查。仓库内原临时目录保留，不清理其他任务数据。
- npm run build 内客户端/服务端类型检查、Vite 前端构建、服务端编译全部通过，退出码 0。
- 在已有依赖清单联网审计授权下执行 npm audit：info/low/moderate/high/critical 均 0，退出码 0。GHSA-82fw-gwwq-j7x9 不再出现在本次报告；该结论限定为当前锁文件与本次公告数据库检查。

证据位于忽略目录 `.verification/private-cloud/`：`vitest4-install.log`、`vitest4-focused-tests.log`、`vitest4-tests.log`、`vitest4-build.log`、`vitest4-audit.json`。失败和通过结果在同一相应日志中分段保留；npm 缓存使用 `vitest4-npm-cache/`，仓库内临时产物使用 `vitest4-tmp/`，均不提交。

本轮仅实现者自查，未派发独立审查。没有提交、推送、采购、云资源创建、部署或真实数据操作；Linux、真实 age/COS、服务器重启与重新部署、真实音频及家庭体验、三天试运行仍未验收。

最终按执行前文件哈希核对，本轮只修改批准的八个仓库文件；工作树累计 62 个变更/未跟踪文件，比原有 59 个增加两份测试及 vite.config.ts。git diff --check 退出码 0，暂存区为空，HEAD 仍为 000e3344f0f5dfb06e8ce18c689efdc716cd8f8d。验证产物均被忽略，主仓库仅保留原有未跟踪迁移包。

## 2026-09-29 Linux 条件只读核验与采购材料准备

用户审阅三文件范围、影响及验证方法后回复“批准执行”。本轮仅更新本验收记录、运维手册和实施计划；不包含源码、部署模板、运行产物、采购或远端操作。本节记录材料准备状态；上节仍为最新一次实际工程测试和依赖 audit 结果。

| 检查项 | 本次结果与边界 |
| --- | --- |
| 工作树与 Git 基线 | 实际工作树 `E:\codex\hanser\.worktrees\pc-music-player`，分支 `codex/pc-music-player`；HEAD 为 `000e3344f0f5dfb06e8ce18c689efdc716cd8f8d`。62 项变更（20 修改、42 未跟踪），暂存区为空；主仓库迁移包保留，无点路径不存在。 |
| 远端引用 | 本窗口 `git ls-remote` 确认远端 main 和开发分支均为上述 SHA。首次沙箱内 Windows TLS 凭据错误经只读权限重试解决；未 fetch、提交或推送。 |
| 既有验证证据 | 读取锁文件和 Vitest 4 日志确认版本及最终客户端 163/163、服务端 270/270、构建和 audit 全零记录一致；保留首次失败日志。本轮未重跑测试、构建或联网 audit，不把已有结果记为新执行。 |
| Linux 条件 | WSL 状态检查返回 50，未发现当前用户发行版登记；PATH 无 Docker、Podman、Caddy、age，常见 Docker/虚拟机安装路径未发现程序。未发现可用的现成 Linux 环境；未安装或启动环境。SSH 客户端可用，目标服务器尚未提供。 |
| 模板与计划差异 | Task 9.2 历史示例 `TimeoutStopSec=30`，实际 `deploy/systemd/phonograph.service` 为 `90`。仅记录，不改模板；实际停服、超时、快照前进程退出和补偿仍待 Linux 验证。 |
| 采购材料 | 公开价格核对及费用计算已整理到运维手册第 10 节。服务器三个月预估 135 元、域名一年预留 39 元，首笔约 174 元另计备份；全部备份日均合计 10 GB、30 天无公网恢复下载时约 49.43 元/月。未核对账号内订单或库存。 |
| 备案与执行输入 | 域名候选、个人备案省份、实际订单、实例 ID/IP/指纹、发布 SHA、桶与前缀均待填。实名/备案由用户在官方渠道完成，材料不进入仓库或聊天。未提交备案。 |
| 环境顺序 | 使用未来服务器先做 Linux 隔离验证属于待确认的顺序例外；本次文档批准不包含采购或环境写入。现有 Linux、真实 age、flock/强杀恢复、COS、重启/重新部署、家庭真实音频及三天试运行均保持未完成。 |

本次交付为[运维手册第 10 节](private-cloud-runbook.md#10-2026-09-29-采购与部署准备补充历史关口)及实施计划追加记录。文档检查限于三文件差异、历史内容保留、相对链接、金额和跨文档状态一致性；不新增测试/构建报告，不视为独立审计或部署验收。永久删除行为、真实曲库、密码及原测试临时目录均不在本轮修改范围。

## 2026-09-30 成都与 Ubuntu 26.04 本地适配（最新）

用户审阅 14 个现有文件、生成产物、影响与验证范围后回复“批准”。本轮只在现有开发工作树执行本地适配；没有提交、推送、远端连接/安装/部署、桶创建或真实数据操作。

采购事实来自用户交接的腾讯云页面读取结果：域名 `255fm.cn` 已购、控制台正常，拟四川个人备案、尚未提交；实例 `lhins-856nphe0` / `255-phonograph`，成都二区，`1.14.111.74`，锐驰型 2 核 2 GB、40 GB SSD、200 Mbps 峰值、无限流量，Ubuntu Server 26.04 LTS 64bit。到期原值 `2026-12-31 11:53:38`，自动续费关闭。成交金额、实名及备案资格仍待核对，本窗口未重新读取控制台。

| 验证 | 本轮证据 |
| --- | --- |
| 基线 | 分支和 HEAD 与交接一致；适配前 Git 未列出变更，但有全局 ignore 文件权限警告；主仓库迁移包保留。开发分支推送及 main 未合并为交接事实。 |
| 先失败测试 | 配置、对象存储、健康三文件共 40 项：35 通过、5 项按预期失败，分别暴露成都直接校验/文件加载和三项费用计算问题。日志 focused-red.log 保留。 |
| 聚焦适配 | 40/40、退出码 0。上海兼容、成都允许、其他地域/可用区/空值/错误类型拒绝；索引和密文对象操作透传地域；按地域计价并核对 17/18 GB 预算边界。 |
| 全量测试 | npm run test:run 退出码 0；客户端 30 文件 163/163，服务端 34 文件 286/286。新增 16 项服务端测试。 |
| 类型与构建 | npm run build 中两套类型检查、Vite 构建和服务端编译全部退出码 0；Node.js 24.16.0、Vitest 4.1.11。 |
| 模板 | 三个 service 和手工命令统一到 /opt/255-phonograph/node24/bin/node，备份默认 ap-chengdu；仅本地模板检查，尚未通过 systemd 实测。TimeoutStopSec=90 和 Fail2ban disabled 保留。 |
| Ubuntu 26.04 | 沿用交接的只读结论：没有必须重装的依据，但未运行验证。补充 Node 24 官方发布物、真实挂载检查、仓库外磁盘 TMPDIR、备份及恢复目标父目录要求。 |
| 费用 | 存储按成都/上海分别计算；成都合计 10 GB、30 天存储 0.99 元，沿用参考固定成本时总估算 49.24 元。实际账单未验证。 |
| 依赖 | package.json 和 package-lock.json 未修改，未安装或升级依赖，本轮未重跑 audit。 |

四份报告保存在忽略目录 `.verification/private-cloud/chengdu-ubuntu26/`：`focused-red.log`、`focused-tests.log`、`tests.log`、`build.log`；npm 缓存同目录 `npm-cache/`。构建输出 `dist/`、`server-dist/`，工具缓存限于 `node_modules/.vite/` 和 `.vite-temp/`。TEMP/TMP 使用获准仓库外目录 `C:\Users\Administrator\AppData\Local\Temp\255-phonograph-chengdu-ubuntu26-20260930\`；只生成并清理本轮合成夹具，没有使用真实曲库。

本轮由实现者自查，没有独立审查。Linux 工程回归、Caddy/systemd/Fail2ban、真实 age/COS、flock/强杀补偿、服务器重启/重新部署、家庭真实音频、页面尺寸及三天试运行均待验收。当前没有可交付的私人访问网址。

最终范围核对：恰好 14 个批准文件修改，未新增未跟踪源码；`git diff --check` 通过，四份文档 17 个相对链接目标存在。暂存区为空，HEAD 仍为 `3e20be0e6881941bc339dc569392bafaf25fe83a`；构建、报告及缓存被忽略，依赖清单和锁文件未变化，主仓库迁移包保留。Git 的全局 ignore 读取权限与换行提示已记录，不修改全局配置。获准测试临时目录仅留 node-compile-cache，测试数据库/合成媒体已由用例清理。

## 2026-09-30 服务器准备交接与测试部署准备（历史）

本节服务器证据来自用户交接文本，原始操作由用户在腾讯云终端手工执行后回传；本次没有重新连接服务器、复测软件或联网验证安装包。历史章节中的“尚未连接/安装”保留为当时状态。用户本次只批准更新四份文档。

| 项目 | 交接证据及限制 |
| --- | --- |
| 主机 | lhins-856nphe0 / 1.14.111.74，Ubuntu 26.04 LTS、x86_64、systemd 259；ubuntu uid/gid 1000，属于 sudo 组。 |
| 容量和挂载 | 内存约 1.9 GiB，预检可用约 1.5 GiB；swap 2 GiB。根分区约 39 GB、剩余约 32 GB；/tmp 为约 982 MB tmpfs，/var/tmp 在磁盘根分区。执行前重新检查动态数值。 |
| 服务和网络 | systemctl --failed 无失败服务，UFW inactive；云防火墙 22/TCP、80/TCP 向全部 IPv4 放行，ICMP 放行，尚无 443 规则。最近 ss 检查 80/443 无监听；尚未完成公网隔离验收。 |
| SSH 主机指纹 | ED25519：SHA256:i7AXzi986iOpMek5lDe4XGlW18cqfdcjKktmeBpc58A。作为交接记录保存，本次未现场重新核验。 |
| Node | 官方安装包经 SHA-256 校验后安装 Node 24.21.0/npm 11.19.0；/opt/255-phonograph/node24 指向 node-v24.21.0-linux-x64，root 管理、普通用户不可写。process.execPath、SQLite 内存 SELECT 1 和 backup API 存在性检查通过；项目全量测试尚未运行。 |
| Caddy 来源 | Ubuntu 候选 2.6.2-14 不支持项目 basic_auth 写法，后经单独批准使用官方稳定源。公钥、InRelease 签名、Packages.gz 和 deb 逐级检查记录见手册第 12 节；不是本次重新下载所得。 |
| Caddy 安装 | version 为 v2.11.4，dpkg-query 为 install ok installed；dpkg --audit 无输出。安装前已 mask 两个服务，安装时 preset/masked 提示与该安排一致。 |
| Caddy 禁止启动 | caddy.service、caddy-api.service 均 LoadState=masked、ActiveState=inactive、UnitFileState=masked；两个 /etc/systemd/system 链接指向 /dev/null，未发现额外 Caddy 开机启动链接。继续保持此状态。 |
| Caddy 账号目录 | uid 999/gid 983、附加组 www-data，home /var/lib/caddy、shell /usr/sbin/nologin；/var/lib/caddy 为 caddy:caddy 0750，/var/log/caddy 为 caddy:caddy 0755。 |
| 保留产物 | /var/tmp/255-phonograph-node24-install/、/var/tmp/255-phonograph-caddy-install/ 保留，不自动清理。本次没有新增服务器产物。 |

本次本地只读核对确认仍为 14 个修改文件、暂存区为空、HEAD `3e20be0e6881941bc339dc569392bafaf25fe83a`。已有 `.verification/private-cloud/chengdu-ubuntu26/` 日志与客户端 163/163、服务端 286/286、聚焦 40/40、类型检查及构建通过记录一致；本次未重跑工程检查或 audit。当前基线 SHA 不包含未提交适配。

应用尚未上传，phonograph 应用用户、部署服务和正式数据尚未创建；age、Fail2ban 未安装，COS 桶、备份凭据及真实 age 密钥未创建。DNS、HTTPS、私人入口、Linux 全量工程与 Caddy 配置校验、应用 systemd、备份恢复、强杀补偿、服务器重启/重新部署、家庭真实音频及三天试运行全部保持未验收。没有可交付的私人播放器网址。

本次文档更新只补齐事实与下一步审批方案，不将安装成功写为部署成功。具体候选隔离路径和分步安排见[实施计划](../superpowers/plans/2026-09-28-private-cloud-test-deployment.md)末尾；提交、源码包生成、上传和远端环境写入分别申请。

## 2026-09-30 Linux 首轮测试与状态权限测试修正（历史）

### 发布包与用户回传的 Linux 证据

- 用户分别批准 14 文件提交、三个本地发布文件生成、上传 `/home/ubuntu`，以及创建隔离目录、解包、安装依赖、测试和构建。提交为 `984162e2a0257b63f75a3908395d8e63e6df5187`，未推送；包内 183 文件、源码总计 905486 字节，逐字节与提交 blob 一致。首次内存打包检查发现 Git 自动转换 CRLF，后仅在该打包命令关闭转换并固定 tar 权限为文件 0644/目录 0755，没有修改 Git 全局配置。
- 上传文件为 `/home/ubuntu/255-phonograph-984162e-source.tar.gz`（205633 字节）、`release-manifest.json`（43322 字节）、`SHA256SUMS`（191 字节）；后两者同在 `/home/ubuntu/`。用户回传的三个 SHA-256 均与本地一致，依次为 `fa187b614e2f9176bd4449caaabf66e928393aad7689fbc0bf7a6240129e8127`、`b6d53803bb3bd96ce1a018d86fa69fc4015726c41a6c7db77f6fa07e676aec3c`、`c36190e07f8bc3963bdc55de113c27a8dea34b2bde79f3546a604fe2c562a1f8`。本地文件保留于 `.verification/private-cloud/releases/984162e2a0257b63f75a3908395d8e63e6df5187/`。
- 只读检查显示 `/var/tmp` 在 `/dev/vda3`、ext4，剩余约 32 GB，祖先无符号链接；测试根目录最初不存在。获批创建 `/var/tmp/255-phonograph-linux-test-20260930/`，owner ubuntu:ubuntu、0700；源码解包至 source，183 文件哈希及版本检查通过。npm-cache、tmp、logs 子目录已创建，app-data 未创建。
- source 下的解释器确认为 `/opt/255-phonograph/node-v24.21.0-linux-x64/bin/node`，Node v24.21.0、npm 11.19.0。TMPDIR 为隔离根下 tmp，npm_config_cache 为 npm-cache，NODE_DISABLE_COMPILE_CACHE 为 1。复制终端提示符导致的 command not found 和中断回显已通过实际目录、环境及哈希检查区分，没有把它们当作校验通过。
- `npm ci --registry=https://registry.npmjs.org --no-audit --no-fund` 安装 335 个包，约 30 秒；记录 whatwg-encoding 弃用及 esbuild 安装脚本未被 allowScripts 覆盖的提示。没有升级 npm、修改依赖清单或执行 audit；后续客户端测试已经实际运行。日志为隔离根下 `logs/npm-ci.log`。
- `npm run test:run` 使用 pipefail 和 tee 保存 `logs/tests.log`：客户端 30 文件 163/163、31.90 秒；服务端 32 文件通过、2 文件失败，284/286、17.92 秒，最终退出码 1。失败为 cli.test.ts 的状态写入后读取，以及 snapshot.test.ts 的快照错误状态读取，均报 `INVALID_BACKUP_STATE`。日志保留，服务器构建及内部应用初始化/启动尚未执行。

### 根因、修正和本地验证

`readBackupState` 在 Linux 要求状态文件 uid=0，且组/其他用户权限位均为零；生产备份和健康服务本就以 root 运行。两个测试却用 ubuntu（uid 1000）创建文件并期望读取成功。Windows 不执行这项 POSIX 检查，造成此前测试假设未暴露。只读内存诊断确认 Linux uid1000/0600 在读取 JSON 前即被拒绝，uid0/0600 可读、uid0/0644 拒绝；这不是 Node、SQLite 或真实备份数据损坏的证据。

用户批准本轮修改 cli.test.ts、snapshot.test.ts、本验收记录及实施计划，连同指定本地验证产物。生产代码、依赖及部署模板不修改，不使用 sudo 运行全套测试，也不跳过失败项。

- cli.test.ts 保留真实文件创建、原子写入、路径检查和 JSON 读取；只对明确夹具路径模拟 uid/权限，平台模拟仅包围状态读取并在 finally 恢复。模拟权限保留文件类型位。Linux 原生环境还检查实际写入没有组/其他用户权限，普通用户文件确实被拒绝。合法状态和坏 JSON 字段都在受信任的模拟元数据下测试。
- 增加 8 个用例：root/0600 接受，非 root/0600 拒绝，以及组/其他用户的读、写、执行六种权限分别拒绝；合法失败状态包含真实的 `FILE_HASH_OR_SIZE_MISMATCH` 错误码。
- snapshot.test.ts 保留 WAL、媒体哈希、源文件不变和错误状态原子持久化，新增准确错误码及完整 JSON 断言；权限读取由上述 CLI 用例覆盖，避免快照测试依赖测试进程的 root 身份。
- 本地 Node 24.16.0、Vitest 4.1.11：先以 Linux/uid1000 模拟复现原断言失败，15 项中 14 通过、1 失败，退出码 1。新夹具首次误覆盖文件类型位，聚焦 21/23；修正仅替换权限位后最终 23/23、退出码 0。失败及通过日志均保留。
- 完整服务端回归 34 文件、294/294，退出码 0。随后执行与 package.json build 等价的客户端类型检查、服务端类型检查、Vite 构建及服务端编译，四步均退出码 0；未安装依赖、重跑客户端测试或 audit。
- 额外把这两份服务端测试纳入 TypeScript 检查时，在 cli.test.ts 原有末尾非法参数的 `it.each` 用例发现两条 TS2345：数组行被展开为参数，而回调将首项当成整个参数数组。用 HEAD 原文在内存中重新建立程序后得到完全相同诊断，本次权限修正未新增诊断。常规 tsconfig.server.json 排除了测试文件，因此常规构建通过不代表该额外检查通过；此既有参数化用例问题不在本次权限修正范围，尚未修改。

日志为 `.verification/private-cloud/linux-state-permissions/` 下 `focused-before.log`、`focused-after.log`、`server-tests.log`、`build.log`；测试夹具仅使用获准的 `C:\Users\Administrator\AppData\Local\Temp\255-phonograph-linux-state-permissions-20260930\`。构建与工具缓存沿用 `dist/`、`server-dist/`、`node_modules/.vite/`、`node_modules/.vite-temp/`。没有生成新发布包、修改服务器源码或覆盖首轮失败日志。

本次只完成本地测试修正与验证，Linux 修正版本复验仍待新提交、打包和上传各自审批；真实 Caddy/systemd/age/COS、强杀恢复、重启/重新部署、家庭音频及三天试运行保持未验收。Caddy 保持禁止启动，无可交付播放器网址。

### 参数化用例追加修正（已单独批准）

用户随后回复“批准修正参数化用例”，将 cli.test.ts 末尾非法参数用例及本验收记录、实施计划纳入追加修改范围，复用原验证日志和临时目录。上节关于两条类型诊断“尚未修改”的叙述保留为发现时状态，当前已解决。

- 原始 `it.each` 把每个参数数组展开成多个回调参数，回调却只取第一项；空数组行因此传入 undefined。将断言先收紧为 `INVALID_ARGUMENTS` 后，定向运行原 8 项用例得到 7 通过、1 失败，另 11 项未被此次筛选执行。失败明确显示空参数收到 TypeError，证实原宽泛 `toThrow()` 会把无关异常当成正确拒绝；退出码 1，日志追加到 focused-before.log。
- 最小修正为把每个参数数组包装成 `{args}`，回调解构后将完整数组交给真实 parseArguments，保留 8 项原始输入并检查明确的 `INVALID_ARGUMENTS` 错误。没有修改生产解析器或权限逻辑，也没有增减用例数。
- 最终两文件聚焦 23/23、完整服务端 34 文件 294/294，均退出码 0；将两份修改测试文件显式纳入 TypeScript 检查后零诊断、退出码 0。结果追加到 focused-after.log、server-tests.log 和 build.log，历史失败保留。
- 本次只改变测试和文档，常规构建沿用上一阶段已通过结果，没有重跑客户端或构建。snapshot.test.ts 的前一阶段修正保持不变；累计仍为两份测试、两份文档未提交。尚未生成新源码包、上传或在 Linux 复验。

## 2026-09-30 新版 Linux 复验、本机访问与交接（历史）

### 修正提交与发布来源

用户随后批准四文件提交、三个新版发布文件生成，以及新版隔离目录、解包、依赖安装和测试构建；上传由用户在终端工具中完成。修正提交为 `ad23f3644498dd542357092c1aaca018e5c971d4`，提交说明为 `test: fix Linux backup state fixtures and CLI argument cases`。Linux 权限修正及参数化用例修正均已包含，生产权限检查没有放宽。

本地发布目录为 `E:\codex\hanser\.worktrees\pc-music-player\.verification\private-cloud\releases\ad23f3644498dd542357092c1aaca018e5c971d4\`；服务器上传目录为 `/home/ubuntu/255-phonograph-ad23f36/`。三个文件的本地/远端 SHA-256 全部一致：

| 文件 | 字节数 | SHA-256 |
| --- | ---: | --- |
| 255-phonograph-ad23f36-source.tar.gz | 206440 | 35e7ae4f921ea86427f90e8c977543266b08a39869ad42fe40a2a437729b6ba1 |
| release-manifest.json | 43322 | 54651087f01547776168af2bddfa5bc47825fa29669b0c0519a238efd1a5d2d8 |
| SHA256SUMS | 191 | 4ac5341b549f19546c2fed9f43ceb25fab54cd20007135c1f1c3632248f7c788 |

源码包包含 183 个普通文件、源码总计 908514 字节；本地逐文件与提交 blob 比对，远端解包后再次按清单核对字节数、哈希和完整提交号。目录前缀 source/，文件 0644/目录 0755；不含真实媒体、数据库、凭据、node_modules 或构建目录。旧 984162e 包及旧隔离目录全部保留。

### Linux 工程验证

- 隔离根为 `/var/tmp/255-phonograph-linux-test-ad23f36/`，ubuntu:ubuntu、0700；source、npm-cache、tmp、logs 均在其下。预检 /var/tmp 位于 /dev/vda3 ext4，39 GB 总量、31 GB 可用，这是当时数值。
- 专用解释器为 `/opt/255-phonograph/node24/bin/node`，实际指向 node-v24.21.0-linux-x64/bin/node。Node 24.21.0、npm 11.19.0；TMPDIR 和 npm_config_cache 分别指向隔离根下 tmp 与 npm-cache，NODE_DISABLE_COMPILE_CACHE=1。
- `npm ci --registry=https://registry.npmjs.org --no-audit --no-fund`：335 包、17 秒、ExitCode=0。记录 whatwg-encoding 弃用及 esbuild 0.28.2 安装脚本未被 allowScripts 覆盖的提示；没有批准全部脚本、升级 npm 或更改锁文件，后续测试和构建实际通过。
- `npm run test:run`：客户端 30 文件 163/163（31.43 秒），服务端 34 文件 294/294（17.62 秒），ExitCode=0。cli.test.ts 19 项、snapshot.test.ts 4 项通过，首轮两个失败均已消除。
- `npm run build`：前后端类型检查、Vite 7.3.6 构建和服务端编译通过，ExitCode=0；88 模块，index.html 400 字节、JS 290810 字节、CSS 30468 字节。未重跑依赖审计。

### 初始化、HTTP 与应用重启

用户明确批准“初始化测试数据及本机启动验证”，范围为独立 app-data、初始化/运行/测试日志、ubuntu 用户本机进程的启动、正常停止及重启；没有授权正式部署或开放公网入口。

配置：NODE_ENV=production、PHONOGRAPH_DEPLOYMENT=private-cloud、PHONOGRAPH_SITE_ORIGIN=https://255fm.cn、PHONOGRAPH_RELEASE_ID=ad23f3644498dd542357092c1aaca018e5c971d4、PHONOGRAPH_DATA_DIR=/var/tmp/255-phonograph-linux-test-ad23f36/app-data、PHONOGRAPH_HOST=127.0.0.1、PHONOGRAPH_PORT=3001。前端目录为 source/dist；数据目录位于源码外。环境变量仅设置在当时的 shell，换终端后需重新核对，不假定持久化。

| 验证项 | 用户回传结果 |
| --- | --- |
| 显式初始化 | 编译入口加 --initialize-data，umask 077，ExitCode=0；标记 format=1，SQLite integrity_check=ok，songs 和 media_objects 各 3 条。 |
| 进程与监听 | 首次 PID 101336，ubuntu 用户，仅 127.0.0.1:3001；app.log 无启动错误。 |
| 健康/首页 | 正确 Host 为 255fm.cn；/api/health 为 200、{"ok":true}，首页为 200、标题“255留音机”。 |
| 静态资源 | /assets/index-DWw1wVwh.js 和 /assets/index-CIXkhDM0.css 的 HEAD 均为 200，类型及大小正确。 |
| 曲库 | /api/library 为 200，返回 night-walk、volcano-planet、first-light 三首合成测试歌曲。 |
| 音频 | night-walk 的 /api/media/2d4d6f30-a89b-405e-847b-ca84d8bd274d：GET 200，响应类型 audio/wav，下载 16044 字节；HEAD 200/content-length=16044；Range bytes=0-15 返回 206、content-range=bytes 0-15/16044、下载 16 字节。 |
| Host 检查 | Host: invalid.example 返回 421、INVALID_HOST。此检查不等同于私人访问认证。 |
| 正常停止与重启 | PID 101336 收到 SIGTERM 后 wait=0，3001 释放。未再初始化，直接启动新 PID 104012；曲库完整 JSON 与重启前一致，三段媒体文件哈希均不变。 |
| 最终状态 | PID 104012 再次 SIGTERM/wait=0，ss 只显示表头，3001 已无监听。两个 PID 是历史记录，后续不能据此直接杀进程。 |

重启前后媒体内容证据：

| app-data/media/objects/ 下文件 | SHA-256 |
| --- | --- |
| c9655626-43fd-4ffb-ae44-84ca3e972e90 | 4339ce5d174e615d7764ad11a90414250eadac6328fbc5539b0e5833eac000dd |
| fb7f9aab-a33b-4449-bbc3-e13f61cf55c8 | e34479a9c76707d641f0f636969f5219f2870825f960792862bf89a6f6f365e8 |
| e0ed5e49-4804-4220-adea-c5a6be21bd22 | aab43de6d7e0077a9f191ee7240fca971ed7aacdaba6788c562ef1299b54dae3 |

服务器日志位于隔离根下 logs/：npm-ci.log、tests.log、build.log、initialize.log、app.log、smoke-test.log。原始输出通过用户终端回传核对；部分退出码仅在终端回显，不能声称日志记录了所有退出码。HTTP 与媒体哈希结果追加在 smoke-test.log；进程停止结果由本会话回传证明。本地未另存这些服务器日志，不将原始产物提交 GitHub。

### 当前结论与剩余关口

Linux 工程及本机服务验证通过；测试进程已停止，服务器测试数据和日志保留。Caddy 最近核验为 masked/inactive，本轮没有改动或启动它；没有创建正式应用用户/systemd 服务、正式数据目录、DNS/HTTPS 或私人入口。

距离正常使用还需：正式部署布局与权限、应用 systemd 启停/开机启动，Caddy 配置校验与私人认证入口、域名/DNS/备案及 HTTPS，Fail2ban 等既定入口措施，age/COS 真实备份和恢复、强杀补偿，整机重启/重新部署，以及用户批准的真实音频、家庭浏览器播放和三天试运行。本轮只验证合成音频 HTTP；没有实际浏览器播放、真实 HTTPS/Secure Cookie 或管理员密码测试，不能说只剩备案。

用户要求把当前进度和改动推送 GitHub，以便家中电脑继续开发。本轮仅更新本验收记录和实施计划；前序源码提交随开发分支一并推送，main 不改。接续方式见[计划末尾的家中电脑接续说明](../superpowers/plans/2026-09-28-private-cloud-test-deployment.md#家中电脑接续说明)。

## 2026-10-16 备案、正式服务与 age 演练交接（最新）

### 记录来源与本轮授权

用户要求更新 GitHub 供家中电脑继续开发，审阅范围后明确批准：本验收记录、部署路线、实施计划和运维手册四份文档，以及开发分支的提交/推送。本轮不修改源码、部署模板或服务器。下列服务器结果是本会话中用户手工执行后回传的证据；备案状态来自截图，不收录身份资料、手机号、订单号、验证码或私钥内容。

### 用途及备案

- 用途明确为 hanser 粉丝向非官方网站，整理直播语音切片和翻唱歌曲，提供浏览/在线播放，不涉及收费服务。原设计为所有者私用，公开访问与管理权限方案还需确认，不能把旧全站私人认证方案视为公开站方案已完成。
- 用户确认四川个人备案，域名 255fm.cn；填写时选中“其他、网络音乐”。最近截图显示首次备案已提交、腾讯云审核中，其后提交管局、短信核验和管局通过均无完成证据。公安联网备案授权已完成不代表实际备案办结。
- 未确认最终网站名称、个人主体对该内容的审核结论或音频授权情况；按真实用途向官方审核方说明，不写成已通过或已取得全部授权。

### 正式服务及资源观察

| 检查 | 用户回传结果 |
| --- | --- |
| hostnamectl / Node | Ubuntu 26.04 LTS、x86-64、内核 7.0.0-30-generic；固定 Node 入口输出 v24.21.0。 |
| ss / proc | 127.0.0.1:3001 的进程 PID 1538812；cwd 为 /srv/255-phonograph/releases/ad23f3644498dd542357092c1aaca018e5c971d4，exe 为 /opt/255-phonograph/node-v24.21.0-linux-x64/bin/node；cgroup 为 /system.slice/phonograph.service。 |
| systemctl show | LoadState=loaded，ActiveState=active，SubState=running，UnitFileState=enabled，User=phonograph，Restart=on-failure，NRestarts=0；ActiveEnterTimestamp=2026-10-05 02:17:03 CST。 |
| health | 带 Host:255fm.cn 请求 http://127.0.0.1:3001/api/health，HTTP 200、JSON {"ok":true}、cache-control: private, no-store。 |
| Caddy | caddy.service、caddy-api.service 均 masked、inactive/dead，PID 0；本轮未启用。 |
| 项目单元 | list-unit-files 'phonograph*' 仅列出 phonograph.service，尚无该命名范围的备份/健康定时单元证据。 |
| 磁盘 | /srv、/var/lib、/var/backups、/var/tmp 同在 /dev/vda3 ext4：39G 总量、6.7G 已用、31G 可用、18%；不是四块独立磁盘。 |

正式用户和服务已存在，不能按旧文档重复创建；本轮没有核对完整正式数据布局/权限、配置内容或发布文件哈希，也没有实测服务启停、故障自动恢复、整机重启或回滚。enabled 和 NRestarts=0 不替代这些验证。旧测试包、合成数据与日志继续保留；历史 PID 不供直接 kill 使用。

### age 安装和当前断点

安装前 age 不存在，APT 候选版本为 1.2.1-1build1，来源为腾讯云 Ubuntu resolute/universe 镜像。模拟安装结果为仅增加 age、0 升级、0 移除。获批后下载 /var/cache/apt/archives/age_1.2.1-1build1_amd64.deb，检查包内容和 control 元数据；额外发现的 /usr/share/lintian/overrides/age 及必要父目录已补充批准。control 列表仅含 control 与 md5sums，没有维护脚本。

随后以 NEEDRESTART_MODE=l、禁止下载/升级/移除及不安装推荐包的命令完成安装；实际输出为 Setting up age (1.2.1-1build1)，man-db 触发器执行，未提示需要服务重启。dpkg-query 显示 install ok installed；/usr/bin/age 与 /usr/bin/age-keygen 的 --version 均为 1.2.1。两个二进制权限 755 root:root，lintian 文件权限 644 root:root。安装后应用仍为 PID 1538812、NRestarts=0，两个 Caddy 服务仍 inactive/dead/masked。

用户另行批准 /var/tmp/255-phonograph-age-verify-20261016/ 及十个指定文件，最新列表见[路线第三节](private-cloud-next-steps.md#三age-隔离演练已完成)。当时 mkdir -m 700 成功，test-key.txt 已生成，未读取私钥；下述断点是 2026-10-16 历史，已被 2026-10-19 新结果覆盖。

**最后已完成动作：生成 test-key.txt。下一条待执行动作：生成 wrong-key.txt；命令已给出，尚无执行结果。** 换电脑先只读检查两文件存在状态；不要重建已有密钥。合成文本、公钥文件、密文、恢复结果、截断副本和 verify.log 尚待生成。正确解密/哈希一致、错误私钥拒绝和截断密文拒绝均保持未验证，不能把安装成功当作加密或备份恢复验收通过。

### 后续及同步验证范围

先接续已批准的 age 演练，再逐项推进真实备份/COS/恢复、正式服务剩余验收、面向粉丝的访问方案、备案后入口与设备测试。实际执行须遵守原有具体批准范围；本次 Git 同步授权不扩展为服务器部署授权。用户手动执行服务器命令时，一次一条、等待输出；不重复初始化，不读取真实曲库、不重置密码、不自动清理证据或派发子代理。

本次文档验证检查四文件差异、相对链接、敏感内容、暂存范围和远端提交号；不因文档同步重跑工程测试或构建。推送结果由命令输出及远端核验确定。家中拉取步骤与接续提示词以[部署路线](private-cloud-next-steps.md)为入口。

## 2026-10-19 age 完成、正式路径与标准 COS 接入准备（CAM 创建前的历史）

### age 真实工具的合成测试证据

来源为用户逐条终端回传，目录 `/var/tmp/255-phonograph-age-verify-20261016/`。

| 检查 | 实际结果 |
| --- | --- |
| 正确密钥 | 明文和恢复文件各 59 字节，cmp 相同，SHA-256 均为 `24f21c141fff7ffd13499926fdcc49d1380351bb5fed8d3fad3133c373119360` |
| 错误密钥 | 退出码 1；no identity matched any of the recipients；输出 0 字节 |
| 截断密文 | 原密文 259 字节，截断后 258 字节；退出码 1；failed to decrypt and authenticate payload chunk；输出 0 字节 |
| 权限 | 目录 0700 ubuntu:ubuntu；九个测试文件均 0600 ubuntu:ubuntu |
| 结果记录 | verify.log 后续生成并读回，0600 ubuntu:ubuntu，记录日期 2026-10-19，总计十个文件 |

这是小型合成数据验证；未对生产曲库、完整备份包或大文件认证失败输出行为作结论。一次性私钥内容未展示，所有测试文件保留。生产私钥尚未创建，用户当前在公司电脑，家中受控设备生成保管和副本验证仍待执行。

### 正式服务路径预检证据

systemctl show：FragmentPath=/etc/systemd/system/phonograph.service，DropInPaths 为空，EnvironmentFiles=/etc/255-phonograph/phonograph.env，WorkingDirectory=/srv/255-phonograph/current，User/Group=phonograph，StateDirectory 为空。只读筛选得到 `PHONOGRAPH_DATA_DIR=/var/lib/255-phonograph`，没有输出完整环境或凭据。

stat/namei：current 为 0777 root:root 符号链接，目标是 ad23f3644498dd542357092c1aaca018e5c971d4 发布目录，代码路径祖先为 0755 root:root；数据目录 0700 phonograph:phonograph；/etc/255-phonograph、/var/backups/255-phonograph、/var/lib/255-phonograph-ops 均 0700 root:root。phonograph.env 为 0600 root:root。上述数据/配置/备份/状态目录及其祖先没有发现链接；current 是预期例外。

/etc/255-phonograph 下 backup.json、backup.env、age-recipients.txt 的 stat 明确返回不存在。没有初始化或读取真实数据，没有检查发布文件哈希、正式服务启停/强杀或整机重启。

### 标准 COS 控制台证据

用户批准浏览器操作并选定 255-backups 名称；轻量控制台先报实名错误，随后用户在标准 COS 控制台完成创建。最新截图和授权只读检查确认：

- 桶名 `255-backups-1378821599`，成都 `ap-chengdu`，创建时间 2026-10-19 12:20:14；私有读写、单 AZ。
- 文件列表根目录无筛选显示共 0 个文件。未用延迟统计概览替代文件列表判断。
- 版本控制、静态网站、全球加速未开启；复制、生命周期、日志存储、CORS 未配置；数据万象未开通。自定义源站域名 0，未配置 CDN 加速域名。
- ACL 只显示主账号所有者，桶策略列表为空，关联 CAM 子账号表无结果；未查看全账号的全部角色、用户组和策略，不能证明没有其他有效访问路径。
- 服务端加密只有创建界面选择“不加密”的截图，创建后未再检查；不把上传前 age 加密计划写为既有对象加密证据。

没有真实 put/head/get/delete、访问密钥创建、完整备份、恢复或定时器启用。该资源为标准 COS；轻量控制台免费额度是否适用未核实，未新增套餐采购或设置账单告警。标准 COS 与轻量对象存储的计费项目区别见[官方文档](https://cloud.tencent.com/document/product/1207/108904)。

### 本轮六文件本地材料及边界

用户明确批准四份交接文档、backup-config.example.json 和新增 cos-backup-policy.example.json 的本地修改及静态验证。本轮编辑前 HEAD 为 871fdd5a8b31d7664b0b2f7ba27ca9db62f8c16a，工作树干净。模板已填已知桶、地域、域名与最近运行 SHA，并选定逻辑前缀 `phonograph-backups/e57796e4-d131-4652-880e-a3c0613369c5/`；该路径尚未写入对象。

CAM 模板仅用于专用用户关联：GetObject/HeadObject/PutObject 覆盖该前缀的 index.json 和 *.tar.age，DeleteObject 仅覆盖密文后缀；PutObject 要求 private ACL 且附加授权头缺省/为空。没有授予列桶、修改 ACL 或整桶权限；索引仍可更新覆盖。模板未提交给 CAM，静态结果不替代平台校验或真实权限验收。

现有 health.ts 仍用 Lighthouse 费率及参考固定成本，本轮没有修改该代码；启用健康/备份定时器前须另行完成标准 COS 费用核对与适配。未重跑工程测试或构建，不生成测试目录/缓存，不修改业务源码。本地材料批准原先不含 Git 提交/推送；静态验证完成后用户已另行批准提交并推送这六个文件。凭据与云端操作仍未获本轮授权。

### 本地静态验证结果

- 两份 JSON 成功解析；顶层字段、COS 字段、实际桶/地域/APPID、UUIDv4 前缀、观察到的发布 SHA、Origin 和五个 Linux 路径与材料一致。只读对照 config.ts 和 backup-store.ts，没有在 Windows 运行 Linux 配置加载或使用 CLI 触发实际访问。
- 策略本地许可矩阵 27/27 通过，包括索引/密文正常读写、密文删除、索引删除拒绝、前缀外与其他桶拒绝、明文后缀拒绝、列桶/改 ACL/multipart 拒绝、缺省/公开 ACL 拒绝及五种附加授权头的空/非空边界。仅模拟本模板的 allow 和条件逻辑，不能证明 CAM 实际解析、生效或账号没有其他授权。
- 首轮校验命令因 PowerShell 数组表达式优先级把两个期望资源拼成一项，触发 exact resource scope 失败。只读诊断显示原期望数组长度 1、加括号后长度 2，与文件资源完全一致；修正内存校验命令后通过，未为消除校验错误放宽模板权限。
- 四文档相对文件链接 41 个、锚点 7 个均存在；旧章节标题改标“历史”后修正了两处关联锚点引用。本轮六文件中未命中真实私钥、AKID 凭据或冲突标记特征。该扫描不是全仓库秘密审计。
- `git diff --check` 通过；status 为五个已跟踪修改和一个新增策略，恰好六文件；暂存区为空。diff --stat 不包含未跟踪文件，新增策略另经 JSON、权限矩阵及内容检查。
- Git 提示全局 ignore 文件无访问权限及 LF/CRLF 转换；未修改全局配置，不影响此次检查退出码。上述静态检查阶段尚未提交或推送，没有生成额外验证脚本/报告；本节记录结果，原始工具输出保留在会话。

## 2026-10-19 CAM 实际状态与独立 COS 探针本地开发

本节记录密钥置换、服务器安装及真实 COS 测试之前的历史状态和当时审批边界。后续批准及结果见末尾最新章节，不把这里的“尚未安装/运行”作为当前待办，也不改写早期 CAM 创建偏差。

### CAM 已发生变更及授权边界

用户提供已创建策略结果，之后浏览器只读核验用户、权限和密钥元数据：

| 项目 | 回读结果 |
| --- | --- |
| 自定义策略 | phonograph-backup-prefix，ID 290399112，版本 1；2026-10-19 14:36:04 创建，内容与 deploy/cos-backup-policy.example.json 一致 |
| 专用用户 | phonograph-backup，UIN 100053927521，详情路径 /cam/user/27682809；15:08:43 创建 |
| 控制台/用户组 | 控制台访问已禁止；用户组 0；登录密码、下次登录重置密码、上次登录信息均为 `-` |
| 权限关联 | 仅上述自定义策略，直接关联；关联时间 15:13:38 |
| API 密钥 | 共 1 把，15:08:43 创建、已启用；未读取或保存秘密值，未停用、替换或删除 |
| 保存状态 | 用户答复“还未保存或不确定”；安全交接仍未完成 |

策略创建获得了单独批准；用户/密钥创建和策略关联不在原审批内。用户明确表示只完成验证码、没有点击最终“完成”。代理误把向导此前的“下一步”当成纯准备，实际云端变更已在最终审阅页之前发生。该偏差已向用户说明；记录实际状态，不将其改写为已获批，不重复创建或继续旧向导。密钥后续处理须重新列明具体动作申请批准。

以上元数据不能证明 COS API 实际可用或账户不存在其他有效授权，也不证明用户持有可用的 SecretKey。后续先确认安全保存或批准凭据置换，不在聊天、截图、日志、Git 中传递凭据。当前桶内未执行本项目的对象测试；旧“关联子账号表无结果”属于创建用户前的观察。

### 获批本地开发范围

基线 `22db7be60e58dacd892cfffccde472584bbc506a`，分支 codex/pc-music-player。用户明确批准新增 [cos-smoke-check.mjs](../../deploy/cos-smoke-check.mjs)、[cos-smoke-check.test.mjs](../../deploy/cos-smoke-check.test.mjs)，并修改部署路线、运维手册、本文，共五文件；包含无云端访问、无额外文件/缓存的本地验证。没有 Git 提交/推送、服务器写入、凭据或 COS 操作批准。

探针默认仅预览，固定一个 `cos-smoke-20261019-6fca0dca-24d1-4ac0-8cc8-28e0ce9b3281.tar.age` 测试键，位于现有备份前缀；不新增权限。实际执行需独立批准，并确认桶版本控制未开启、既有合成密文 SHA-256、发布路径及 SDK 版本。来源只允许既有 age 演练的 plain.txt.age（259 字节）；下载使用有上限的内存流，不写下载文件，不读取生产数据或测试私钥，不操作 index.json 或服务。

用户名、密钥和策略的真实状态已写回当前交接入口。用户已说明两台电脑均由本人使用，已去掉“必须等回家才能推进”的地点限制；正式 age 私钥具体生成/保存位置和服务器公钥安装仍待批准，未创建正式密钥。

### 本地验证及尚未验证内容

- Node 24.16.0 下，`node --test deploy/cos-smoke-check.test.mjs` 为 27/27 通过；`node --check deploy/cos-smoke-check.mjs` 通过。禁用了 Node 编译缓存，使用内存 COS 替身，没有真实访问凭据、网络请求、下载文件或测试报告文件。
- 测试覆盖默认离线计划、参数/路径限制、源文件只读和读取上限、源哈希核对、禁止覆盖/private ACL、完整往返、同名对象保留、403/签名/网络/404 区分、上传状态不确定、HEAD 长度、下载长度/哈希、版本标识、删除失败/未删干净和错误输出脱敏。
- 对照官方 HEAD Object 响应示例发现 request-id 使用 Base64 风格字符；新增回归测试复现原先仅接受十六进制字符会拒绝有效缺失响应的问题，修正后全部通过，并保留异常 header 不回显的测试。[HEAD Object 文档](https://cloud.tencent.com/document/product/436/7745)
- 五文件静态检查通过；三份文档的 35 个相对文件链接及 6 个锚点有效，固定测试键与现有策略范围一致。五文件未命中真实私钥、AKID 凭据、冲突标记或行尾空白特征；这不是全仓库秘密审计。`git diff --check` 通过，状态仅三份文档修改和两个新增脚本，未暂存、提交或推送。
- 这不是 CAM/COS 实测，也不是正式备份包验收。加密合成文本不含 tar 归档，不能据此声称归档恢复通过；前缀外拒绝、公共访问拒绝、真实 ACL 条件及计费仍待单独验证。
- 当时服务器尚未安装或运行探针，当前密文 SHA-256 尚待回传；这些后续已完成，见最新实测章节。探针文件、唯一测试键及边界见[手册第 14.3 节](private-cloud-runbook.md#143-独立-cos-合成数据探针)。

## 2026-10-19 密钥置换、服务器探针安装与 COS 正向联调通过

### 授权和凭据交接

1. 用户先批准仅创建/安装 `/var/tmp/255-phonograph-cos-verify-20261019/` 及其中 `cos-smoke-check.mjs`，并做哈希、权限、语法和离线计划检查；这项批准不包含真实 COS 请求。
2. 用户随后批准停用 15:08:43 创建的旧密钥（保留、不删除），并手动创建一把替换密钥。旧密钥停用经过用户微信扫码验证，页面回读“已禁用”；用户确认新密钥已安全保存、弹窗已关闭，并确认两把密钥为旧禁用、新启用。新密钥创建时间没有独立回读，不编造该时间；代理未读取 SecretKey，也不记录凭据值。
3. 明确唯一对象键、259 字节合成来源、现有权限、内存下载及删除范围后，用户再次确认批准一次 COS 测试及临时凭据输入。服务器通过清空继承环境的独立 Bash，以隐藏输入将凭据传给探针；没有通过命令参数、shell 历史、聊天或 Git 传递凭据，没有安装 backup.env。
4. 测试完成后用户批准只更新部署路线、运维手册和本文，并做不落盘检查；不包含 Git 提交/推送或新的服务器、CAM、COS 操作。此后审批不追认早期用户/密钥创建及策略关联的偏差。

### 安装、环境与前置检查

| 项目 | 用户回传或浏览器核对结果 |
| --- | --- |
| Node | `/opt/255-phonograph/node24/bin/node`；v24.21.0 |
| current / SDK | `/srv/255-phonograph/releases/ad23f3644498dd542357092c1aaca018e5c971d4`；该发布内 COS SDK 3.0.0 |
| 来源 | `/var/tmp/255-phonograph-age-verify-20261016/plain.txt.age`；realpath 同路径，普通文件，0600、uid/gid 1000、259 字节 |
| 来源密文 SHA-256 | `49700c92dbe430571fcf13b52c5284cfe09da442b4c49454ca4d24b93d1f325b` |
| 测试目录 | 预检为 ENOENT，随后用户获批创建；0700 ubuntu:ubuntu，stat 大小 4096 字节 |
| 安装文件 | `/var/tmp/255-phonograph-cos-verify-20261019/cos-smoke-check.mjs`；浏览器确认上传成功，终端核对 0600 ubuntu:ubuntu、10529 字节 |
| 脚本 SHA-256 | `911eaadf9a4ad4157f79d90edbfdec5139553e077c2a2a1376bb2c295c87d0c2`；本地与服务器一致，真实执行前再次显示 OK |
| 离线检查 | 禁用 Node 编译缓存并清空 NODE_OPTIONS；`node --check` 成功后 `--plan` 输出六阶段固定计划，未触发 COS 请求 |
| 桶前置条件 | 执行前浏览器核对成都 `ap-chengdu`、私有读写、版本控制未开启；未修改版本设置或权限策略 |

服务器命令由用户逐条执行并回传，代理没有自动输入密钥或执行服务器命令。安装来源为已完成本地 27/27 测试的同一脚本；本次没有重新安装 age、依赖或重做加解密测试。真实运行采用 `env -i` 的独立非交互 Bash，关闭 core dump、禁用 Node 编译缓存，结束时退出子进程并回到外层提示符；不假定后续终端保有凭据。

### 真实 COS 执行结果

桶：`255-backups-1378821599`。唯一测试键及最终报告如下，来自用户真实终端回传：

```json
{
  "ok": true,
  "mode": "execute",
  "objectKey": "phonograph-backups/e57796e4-d131-4652-880e-a3c0613369c5/cos-smoke-20261019-6fca0dca-24d1-4ac0-8cc8-28e0ce9b3281.tar.age",
  "stage": "complete",
  "remoteState": "absent",
  "sourceSha256": "49700c92dbe430571fcf13b52c5284cfe09da442b4c49454ca4d24b93d1f325b",
  "sourceBytes": 259,
  "downloadBytes": 259,
  "downloadSha256": "49700c92dbe430571fcf13b52c5284cfe09da442b4c49454ca4d24b93d1f325b"
}
```

按此固定哈希脚本的执行顺序，成功报告意味着首次 HEAD 确认缺失、PUT 使用 private ACL/禁止覆盖头、HEAD 长度与 ETag 校验、GET 长度和 SHA-256 校验、DELETE、删除后 HEAD 确认缺失均完成。源和下载均 259 字节，哈希一致；最终 `remoteState: absent` 只证明该测试键已不存在，不表示其他对象、整个账号或桶的访问权限全部通过审计。

### 保留内容与未验收范围

- 服务器只保留本次探针目录和脚本及原 age 演练证据；下载仅进入有长度上限的内存流，报告仅到终端，未写下载或探针日志文件。
- 本次未读取真实数据库/曲库/完整环境，未写生产 index.json、backup.json、backup.env 或 age-recipients.txt，未操作应用服务、Caddy 或公网入口；这些生产路径和服务的当前状态没有因本次成功而被重新认证。
- 合成输入是 age 加密文本，不含 tar 归档；此次成功不能替代正式 age 私钥保管、完整备份、下载解密、恢复、故障补偿、锁/定时器或大文件验收。
- 仍待设计并单独批准前缀外访问、公共访问及 ACL/grant 条件的拒绝测试；没有新增权限，也没有实测这些拒绝分支。费用、账单及标准 COS 健康估算适配尚未完成。
- 后续保持旧密钥禁用并保留，不自动删除或重复置换，不自动重跑已通过的正向探针。下一步先明确拒绝测试的对象、预期结果、写删及清理范围，再申请执行批准。

## 2026-10-19 GET 拒绝实测通过与 ACL 探针本地开发

本节保留 GET 实测和 ACL 本地开发阶段的证据及当时审批边界；后续另批的服务器安装与云端执行结果见[下一节](#2026-10-19-acl-探针安装与匿名读取上传-acl-拒绝实测通过)，不将后来批准追溯到本节。

### 四项只读 GET 的真实回传

用户批准后自行在服务器执行内存命令，以隐藏输入提供替换密钥。命令只发出四次带签名 GET：允许路径前后对照、前缀外路径、错误后缀路径；没有对象写删、权限变更或服务器文件创建。Linux/Node 24、current 发布路径和 SDK 3.0.0 检查通过，未读取真实数据或完整环境。

最终原始 JSON 已逐项核对路径、状态、错误码和 RequestId：

```json
{
  "ok": true,
  "mode": "read-only-denial-check",
  "mutations": "none",
  "results": [
    {
      "test": "control-before",
      "objectKey": "phonograph-backups/e57796e4-d131-4652-880e-a3c0613369c5/cos-deny-20261019-526faf21-8a4f-4335-8e23-c488891d3c3f.tar.age",
      "passed": true,
      "statusCode": 404,
      "requestId": "NmFkNWU2NTdfNWI3M2JlMDlfMTIwOWFfNzhlOTliZg==",
      "code": "NoSuchKey",
      "denialMessage": false
    },
    {
      "test": "outside-prefix",
      "objectKey": "phonograph-deny-check/cos-deny-20261019-526faf21-8a4f-4335-8e23-c488891d3c3f.tar.age",
      "passed": true,
      "statusCode": 403,
      "requestId": "NmFkNWU2NThfNjI3M2JlMDlfMTJjOWJfNzYyNDZlNg==",
      "code": "AccessDenied",
      "denialMessage": true
    },
    {
      "test": "wrong-suffix",
      "objectKey": "phonograph-backups/e57796e4-d131-4652-880e-a3c0613369c5/cos-deny-20261019-526faf21-8a4f-4335-8e23-c488891d3c3f.txt",
      "passed": true,
      "statusCode": 403,
      "requestId": "NmFkNWU2NThfOGMwZTNlMGJfMTQ5NV8xYThiMGM1Mg==",
      "code": "AccessDenied",
      "denialMessage": true
    },
    {
      "test": "control-after",
      "objectKey": "phonograph-backups/e57796e4-d131-4652-880e-a3c0613369c5/cos-deny-20261019-526faf21-8a4f-4335-8e23-c488891d3c3f.tar.age",
      "passed": true,
      "statusCode": 404,
      "requestId": "NmFkNWU2NThfZTMyMTYzNjRfYjlkM19mYjMyYTc5",
      "code": "NoSuchKey",
      "denialMessage": false
    }
  ]
}
```

前后 NoSuchKey 对照加两项明确 AccessDenied 仅证明本次指定 GET 请求的读取限制。没有据此推断写入/删除限制、匿名访问、grant 条件或其他授权均已通过，也没有重跑已完成的正向上传测试。回传中的重复命令回显不作为额外执行证据，以上四项为最终 JSON 的结果；未观察或记录任何凭据值。

### 新 ACL 脚本的本地交付范围

用户明确批准新增 `deploy/cos-acl-check.mjs`、`deploy/cos-acl-check.test.mjs` 并更新本部署三文档，共五文件及无额外文件的本地验证。批准不包含服务器安装、COS 请求、CAM/密钥变更或 Git 提交推送。本地新增两文件，当前累计七文件未提交；原正向探针及测试保持不变。

- 新脚本默认仅打印离线计划；固定键 `phonograph-backups/e57796e4-d131-4652-880e-a3c0613369c5/cos-acl-20261019-526faf21-8a4f-4335-8e23-c488891d3c3f.tar.age`，复用既有 259 字节合成密文，所需临时权限为无。
- 后续计划验证已存在 private 合成对象的匿名读取拒绝，再测试遗漏 ACL、default 和 public-read 的上传拒绝。正常 17 次、含异常恢复最多 21 次 HTTPS 请求；关闭重试和重定向，结果只打印安全字段。
- 出现意外写入或丢失 PUT 响应时，只在本次标记、大小、SHA-256 和前后 ETag 全部匹配后才允许删除；不确定则保留并报告。已有对象、409/412 冲突、版本异常不盲删；清理失败不重试 DELETE。运行时必须独占测试键，不能将 HEAD 检查视为原子删除保护。
- public-read 意外成功可能短暂公开这份合成密文；此时测试仍失败，并仅按上述条件尝试清理。grant 头部不在本阶段，仍待独立设计验证。
- 尚未安装服务器文件；唯一拟新增路径、权限、前置条件及后续分阶段审批见[手册第 14.6 节](private-cloud-runbook.md#146-匿名读取及上传-acl-探针实测通过)。未写生产 index.json、backup.json、backup.env 或 age-recipients.txt，未操作服务。

### 本地验证证据

先建立失败测试，确认缺少实现时断言失败；实现后针对响应守卫提前终止的情况修正测试预期，并补充真实 SDK 签名器与内存 HTTPS 替身的衔接验证。Node v24.16.0 下新脚本测试 **33/33 通过**，两文件 `node --check` 及 `--plan` 通过；禁用编译缓存、清空 NODE_OPTIONS/NODE_V8_COVERAGE，不写测试报告、下载或缓存文件。使用合成单元数据和虚构凭据，没有网络请求。

| 本地文件 | 字节数 | SHA-256 |
| --- | --- | --- |
| deploy/cos-acl-check.mjs | 15730 | `e4ace48c7530557e79b910f3a79efebb6f63a12a0cef1d60846c62af76382f83` |
| deploy/cos-acl-check.test.mjs | 22658 | `1500a732644aeae21d05c93b43d5ceb01553890818e5d33903971b9989a5b709` |

本地模拟覆盖匿名读取意外成功、三种不合规 ACL 意外成功、PUT 响应丢失、不同运行标记、长度/哈希/ETag 不符、版本标记、409 冲突、并发外来对象、清理失败、无效签名和错误拒绝码、输出脱敏、响应长度上限及无自动重试。截至本地开发阶段尚未执行真实云端 ACL 测试；后来另批的云端结果见下一节，本地通过本身不能替代云端验收。

## 2026-10-19 ACL 探针安装与匿名读取、上传 ACL 拒绝实测通过

### 分阶段批准和证据来源

本地开发结束后，用户先回传 `/var/tmp/255-phonograph-cos-verify-20261019/` 为 0700 ubuntu:ubuntu、真实路径一致、`cos-acl-check.mjs` 目标不存在。列明唯一文件、影响和检查方式后，用户批准仅安装及离线检查，再自行上传。该批准没有授权 COS 请求。

服务器回传脚本哈希检查 `OK`，文件为 0600 ubuntu:ubuntu、15730 字节，SHA-256 与本地 `e4ace48c7530557e79b910f3a79efebb6f63a12a0cef1d60846c62af76382f83` 一致。目录仍为 0700 ubuntu:ubuntu；`node --check` 成功后打印完整 `--plan`，固定桶、键、259 字节来源、哈希、17/21 请求上限和清理约束均与批准范围一致。没有重复创建目录或覆盖既有文件。

云端执行前，桶概览曾显示私有读写、版本控制未开启；刷新后的浏览器读取连续超时，代理明确说明未完成刷新后的实时复核。用户随后回复“确认条件，批准 ACL 实测及条件清理”，确认桶从未开启且仍未开启版本控制、测试期间独占指定键，并同意该键的一次请求及有条件清理。该前提按用户确认记录，不写成浏览器独立验证，也不扩大为账号权限审计。

用户执行独立 `env -i` Bash 命令，关闭历史和 core dump，先校验脚本哈希，再隐藏输入 SecretId/SecretKey，仅通过临时进程环境提供凭据。Node 编译缓存关闭，未生成凭据或输出文件；终端回传最终 JSON 后返回外层提示符。未观察或记录任何凭据值。

### 一次实测的原始结果

```json
{
  "ok": true,
  "mode": "execute",
  "objectKey": "phonograph-backups/e57796e4-d131-4652-880e-a3c0613369c5/cos-acl-20261019-526faf21-8a4f-4335-8e23-c488891d3c3f.tar.age",
  "runId": "8b7fbf4f-42c9-49cc-92fd-f789060f4208",
  "stage": "complete",
  "remoteState": "absent",
  "results": [
    {
      "test": "anonymous-read",
      "passed": true,
      "statusCode": 403,
      "code": "AccessDenied",
      "requestId": "NmFkNWYyOGZfYTNhOTYzNjRfYjkyYl9mODM2NDEz"
    },
    {
      "test": "acl-omitted",
      "passed": true,
      "statusCode": 403,
      "code": "AccessDenied",
      "requestId": "NmFkNWYyOGZfMTgyMDYzNjRfMjM3OV8xNTQ2ZmRlMg=="
    },
    {
      "test": "acl-default",
      "passed": true,
      "statusCode": 403,
      "code": "AccessDenied",
      "requestId": "NmFkNWYyOGZfZDc4ZjM1MGJfNTk1Y183Y2ZlMDVm"
    },
    {
      "test": "acl-public-read",
      "passed": true,
      "statusCode": 403,
      "code": "AccessDenied",
      "requestId": "NmFkNWYyOGZfMjU2ZGJlMDlfMTJiOTJfNzgyZTA1Mg=="
    }
  ],
  "cleanup": [
    {
      "stage": "private-fixture-cleanup",
      "outcome": "deleted-verified"
    }
  ],
  "sourceBytes": 259,
  "sourceSha256": "49700c92dbe430571fcf13b52c5284cfe09da442b4c49454ca4d24b93d1f325b"
}
```

### 结论、清理和保留边界

- 本次 anonymous-read、acl-omitted、acl-default、acl-public-read 四项均通过，HTTP 为 403、错误码 AccessDenied，并有有效 COS RequestId。已核对哈希的脚本同时要求标准拒绝消息，不能把任意 403、参数或网络错误算作通过。
- 按固定脚本的成功路径，带签名 GET 首次确认 NoSuchKey，private 对照上传后完成运行标记/长度/下载 SHA-256/前后 ETag 核验，再验证匿名读取拒绝；删除对照后，三种 ACL 上传拒绝后均核验 NoSuchKey。合成源为 259 字节，SHA-256 与既有密文一致。正常成功路径为 17 次请求；JSON 没有独立请求计数，不补造计数日志。
- 唯一清理记录为 `private-fixture-cleanup: deleted-verified`，最终 `remoteState: absent` 只证明上述固定测试键不存在，不证明全桶为空。没有触发意外上传/响应丢失的条件恢复；该异常分支只具有此前本地模拟证据，本次不升级为云端通过。
- 没有新增 CAM 权限、用户组或密钥，没有改桶策略或对象 ACL 接口；本次 public-read 请求被拒绝，没有公共上传成功的回传。没有写生产 index.json、backup.json、backup.env 或 age-recipients.txt，没有操作真实数据库、曲库、应用服务、Caddy 或公网入口。
- 服务器保留原 age 演练目录，以及 `/var/tmp/255-phonograph-cos-verify-20261019/` 下两份脚本。没有下载、探针日志或凭据文件；不自动清理这些保留证据或重复运行已通过测试。源是 age 加密合成文本，`.tar.age` 后缀仅匹配策略，不构成 tar 归档恢复验收。
- 生产 age 密钥保管、正式配置、完整备份/解密/恢复、grant 条件、故障补偿/锁/定时器和标准 COS 计费仍待对应批准及验收；本次四项拒绝不等于所有有效授权已审计。

### 本次文档回写范围

用户随后明确批准仅更新 `docs/deployment/private-cloud-next-steps.md`、`docs/deployment/private-cloud-runbook.md`、本文及不落盘一致性检查。只更新当前摘要、审批来源、安装证据、结果与后续范围，保留历史阶段和 CAM 创建偏差；不修改四个探针/测试文件，不再次访问服务器或 COS，不提交或推送。检查原始 JSON 一致性、文档链接/锚点、脚本哈希引用及 `git diff --check`；历史 27/27、33/33 测试不冒充本轮重跑。

## 2026-10-20 公网接通与初版功能开发

### 用户确认的线上进展

- ICP 已通过，网站备案号 `蜀ICP备2026063099号-1`，备案名称“毛怪小站”。公安“新办网站”申请曾提交给古蔺县网安大队，用户随后明确取消。当前应重新准备申请，没有待审申请或已取得公安号的新证据。
- phonograph.service 用户输出为 active/running/enabled；回环 `/api/health` 返回 `{"ok":true}`、200，回环首页 HEAD 返回 text/html、200。
- 管理员状态从 needsSetup=true 经获批设置变为 `{"needsSetup":false,"authenticated":false}`。密码未提供给代理；这不是后台浏览器登录或上传成功的证据。
- DNSPod @ A 记录指向 `1.14.111.74`，默认线路、TTL 600；resolvectl 返回同一地址。云防火墙增加 HTTPS TCP 443，原 TCP 80/22 与 ICMP 保留，UFW inactive。
- 用户获批执行 Caddy 配置备份、校验、解除单个服务屏蔽及开机启动；回传 `Valid configuration`、caddy.service active/running/enabled。实际配置和路径见[运维手册第15节](private-cloud-runbook.md#15-2026-10-20-公网入口已打通与初版开发接续)；caddy-api 未解除屏蔽。
- 用户在服务器运行正常证书校验的 HTTPS curl：`https://255fm.cn/api/health` 返回 `{"ok":true}`、HTTP 200，随后提供浏览器首页截图并确认“能正常打开了”。代理没有独立完成公网浏览器复验。
- 本地代码 `server/db/seed-transition-songs.ts` 中三首初始音频均使用 `durationSeconds: 1` 的合成 WAV。用户看到的短音频与该实现相符；本批没有读取线上音频或数据库，不把它诊断为已确认的播放器截断故障。

### 本批授权与实际改动

用户批准列明的八文件、本地客户端测试/类型检查/构建，并强调“现在的阶段计划是丰富网站的功能”：

1. 更新三份部署文档当前摘要、入口证据与接续路线，保留历史 COS/age 结果和审批记录。
2. 新增 `docs/superpowers/plans/2026-10-20-public-initial-release.md`，将功能完善列为主线，给出初版目标和后续候选优先级。
3. 新增 `src/components/SiteFooter.tsx`，链接 `https://beian.miit.gov.cn/` 并显示真实 ICP 号，不生成公安号。
4. 修改 `src/features/library/PublicApp.tsx`、`src/styles/global.css`，在正常/加载/错误/空曲库状态统一显示页脚，将固定播放器留白移到页脚下方，桌面 208px、小屏 260px。
5. 调整 `src/App.test.tsx` 的已有集成用例，检查页脚各状态、公共路由切换保持单个播放器、后台独立。

批准的生成路径为工作树 `dist/`、`server-dist/`、`node_modules/.vite/`、`node_modules/.vite-temp/`。使用已有依赖，没有安装新包、修改锁文件、提交推送或服务器发布。

### 本地验证

环境 Node.js 24.16.0、Vitest 4.1.11、Vite 7.3.6。本批保留以下实际输出结论：

| 验证 | 结果 |
| --- | --- |
| App 新断言、实现前 | 7 failed / 6 passed；七项均因找不到“网站备案信息”页脚而失败，退出码 1 |
| 页脚实现后 App 聚焦 | 13/13 通过，退出码 0 |
| 全量客户端 | 30 文件、163/163 通过，退出码 0 |
| 前后端 TypeScript noEmit | 两项均退出码 0 |
| Vite 生产构建 | 89 modules；生成 index.html、index-CCX4vO0i.css、index-U4_LiL0y.js，退出码 0 |
| 服务端 TypeScript 编译 | 退出码 0，仅生成 server-dist，不运行服务 |
| 工作区检查 | git diff --check 无空白错误；共本批八文件和原有四个 COS 文件未提交，四个脚本/测试 SHA-256 均保持原值 |

服务端 294/294、COS 正向 27/27、ACL 33/33 仍是历史验证，不冒充本批重跑。Git 输出含既有 LF/CRLF 转换和用户全局 ignore 无读取权限提示，未通过改配置隐藏这些提示。

### 结论与剩余验收

本批完成本地阶段/路线更新及公共 ICP 页脚，初版整体仍在开发。仅作实现者自查，未进行独立审查。页脚真实浏览器的手机/桌面布局、底部遮挡与外链点击尚未实测；自动化 DOM/CSS 检查不能替代这些体验验收。

下一批聚焦音乐馆功能完善，先只读核对排序、时长/版本展示和筛选反馈，再提交具体文件范围。后台真实素材上传、完整播放/拖动、www 入口、数据恢复、线上部署与公安重新申请继续跟踪。本批未读取真实数据库、上传音频、变更云资源或发布到服务器。

## 2026-10-20 正式 B 界面接入与隔离上传播放验收

### 授权及实现范围

用户批准列明的 26 个组件、素材、测试和文档文件，生成范围为 dist/、server-dist/、node_modules/.vite/、node_modules/.vite-temp/ 和仓库外 `C:/Users/Administrator/AppData/Local/Temp/255-phonograph-public-ui-20261020/`。本轮按用户最新 AGENTS.md 执行精确写入审批；未扩大为提交、推送、线上部署、云资源或真实数据操作。原四个 COS 文件及静态样板保留。

- 正式首页、独立 /music、迷你播放器和 /goodnight-radio 接入 B 风格；人物图片原样复制，SVG viewBox 选择裁切，不重绘原图。实际上传封面优先，缺失/失败时统一图片兜底。
- 现有 LibraryProvider、PlayerProvider、管理后台及接口不重做；首页保留后端三个分区与真实听歌统计，音乐馆显示真实时长和分类标签，筛选参数可由 URL 恢复，迷你播放器增加已有队列的展示入口。
- 每日一签仍禁用；晚安电台是用户的读书企划，只有介绍与视频空状态。完整播放器维持既有功能与暗色视觉，修复 320px 窄屏按钮挤压。统一 ICP 页脚保持。

### 自动化与实际 HTTP 证据

| 验证 | 本批结果 |
| --- | --- |
| 新断言实现前 | 四文件 6 failed / 25 passed，对应路由、队列、兜底、导航和 URL 筛选缺失 |
| 聚焦实现后 | 四文件 31/31，通过 |
| 全量客户端 | 30 文件、168/168，通过 |
| 服务端上传、歌曲、媒体、公共曲库测试 | 四文件、38/38，通过；不是全量服务端重跑 |
| 前后端 TypeScript noEmit | 均退出码 0 |
| 生产构建与服务端编译 | 均退出码 0；最终前端 92 modules，CSS index-CHkginCq.css，JS index-DjUfLE4I.js |
| 隔离生产服务 | 127.0.0.1:4701，NODE_ENV=production，使用本批 dist/server-dist 和独立数据目录 |
| 实际上传流程 | 合成静音 MP3 62.69387755 秒与 PNG 上传成功，草稿/未使用标签不公开，发布后歌曲、关联分类和标签可见 |
| 媒体接口 | 音频 Range bytes=0-127 返回 206、128 字节；封面 200 image/png；LRC 200 且内容匹配 |

本地测试歌名为“本地验收 · 静音测试（非真实歌曲）”，媒体与临时随机密码没有传入正式服务器。随机密码未输出或保存到文档。浏览器实际播放能推进至 20 秒以上、显示约 1:02 的时长，拖动、暂停、跨页、展开/收起与刷新后的进度恢复已检查。此证据不等于完整真实歌曲播放或线上上传验收。

### Impeccable / Taste 实页复核

沿用用户确认的视觉方向，采用浏览器 DOM、内存截图和实际交互检查；未运行上游 inspect.mjs，未保存截图/报告文件，未派发独立审查代理。

- 首页、音乐馆、晚安电台使用实际组件和接口；独立页面导航、刷新直达、浏览器前进/后退正常，跨页继续使用相同播放实例。真实测试封面与缺封面的统一兜底同时可见。
- 歌名、分类和标签可组合筛选；零结果有明确清除入口，清除后焦点返回输入框。播放队列可打开、播放曲目、Escape 关闭；自动化断言覆盖焦点回到队列按钮。
- 320×740、390×844 手机、768×1024 平板、1280×900 桌面已检查，公共页面无横向溢出。手机完整播放器按钮调整为分行，音量滑杆保留。
- 页面滚动到底部时，ICP 链接距播放器装饰在实测 320/768/1280 尺寸分别约 83/47/38px；页脚只有一处、迷你播放器只有一处。未实际跳转打开工信部外站，不把链接存在等同于外站可用性验收。
- 八组首页文字/实色背景对比度最低 5.02:1；导航、输入占位及歌曲说明的旧暗色 CSS 覆盖已修正。不是全站可访问性认证。浏览器捕获日志未见 warn/error。
- 加载、错误、空曲库及图片失败状态由本轮客户端回归覆盖；真实浏览器检查了空推荐分区、筛选零结果和晚安电台空状态，未在浏览器逐一注入所有网络故障。

### 交付边界

本地已具备正式页面候选，未提交、未推送、未部署。线上仍是先前版本；后台已登录的新建歌曲表单来自用户截图，用户真实音频尚未在本批验收。下一步需固定候选提交 SHA，获得推送与部署批准并重新只读核对服务器；保持现有管理员、数据目录与公开 Caddy 配置。真实长音频完整播放、家中网络、生产备份恢复及公开初版整体交付仍未完成。

## 2026-10-21 部署预检已通过，尚未切换线上版本

- 已获用户明确批准部署候选 `f2b6892a1616421c62ce4faeeb4ee62315870636`、失败回退及三份部署文档/初版计划更新；该候选已提交并推送，GitHub 分支 SHA 已核对。文档后续提交、推送另行确认。
- 用户回传：current=/srv/255-phonograph/releases/ad23f3644498dd542357092c1aaca018e5c971d4；服务 active/running，User/Group=phonograph，WorkingDirectory=/srv/255-phonograph/current，FragmentPath=/etc/systemd/system/phonograph.service。
- Node v24.21.0，/srv 所在文件系统可用 30.27 GiB，git 可用；新 release、部署工作目录、配置备份/临时文件及切换临时链接均不存在。
- 白名单配置：NODE_ENV=production，PHONOGRAPH_DEPLOYMENT=private-cloud，HOST=127.0.0.1，PORT=3001，DATA_DIR=/var/lib/255-phonograph，SITE_ORIGIN=https://255fm.cn，RELEASE_ID=ad23f3644498dd542357092c1aaca018e5c971d4。没有回传完整环境或凭据。
- 下一步在 /var/tmp/255-phonograph-deploy-f2b6892/ 下获取固定提交、安装锁定依赖、运行 Linux 客户端测试和构建；暂不切换 current 或重启应用。只在收到成功输出后推进安装与切换。
- 本段为用户终端回传证据与已批准的执行边界；尚无新版 Linux 构建或上线成功证据，不把推送 GitHub 写成已更新正式网站。

### 2026-10-21 Linux 构建通过，待安装正式 release

用户执行已批准临时目录内的固定提交下载/构建命令，回传 Vitest 4.1.11：30 文件、168/168 通过，耗时 33.82 秒；npm run build 的前后端 noEmit、Vite 与服务端编译均成功。Vite 7.3.6 处理 92 modules，生成 index-CHkginCq.css（56.86 kB）与 index-DjUfLE4I.js（297.11 kB），与本地验收版资源名一致。最终输出 BUILD_READY f2b6892a1616421c62ce4faeeb4ee62315870636；脚本尾部已检查 current 仍指向 ad23f36。

下一条获批范围内命令将只安装 release：从 source 复制 dist、server-dist、node_modules、package.json、package-lock.json，排除 .vite/.vite-temp 测试缓存；设置 root 所有、应用只读，核对复制内容，然后以 phonograph 用户对无数据库、无监听端口的应用实例做三个页面、五个资源和 health 的内存请求验证。该验证不访问正式数据库，不等于正式服务已重启或上线。安装命令的 Bash 与嵌入 Node 程序已在本地做语法检查，均退出码 0；尚未收到服务器 INSTALL_READY。

### 2026-10-21 发布目录已存在，待完整核验和切换

用户回传 sudo stat：/srv/255-phonograph/releases/f2b6892a1616421c62ce4faeeb4ee62315870636 为 directory，root:root，755。这只证明顶层目录存在及其权限；没有收到 STATIC_PROBE_OK、INSTALL_READY 或 DEPLOY_OK，不将其记为安装完成或已上线。不重跑要求目标目录不存在的安装命令，也不覆盖或清理该目录。

下一条命令继续使用此前已批准的服务器范围：先确认 current 及既有服务仍运行 ad23f36、源提交为 f2b6892，再逐项比对已安装的 dist/server-dist/node_modules 和两份 package 文件，检查所有者/权限、以 phonograph 用户验证资源可读及应用模块可导入。配置只核对公开白名单，不打印完整环境。任何核验失败都在切换前停止。

通过后将旧配置备份为 phonograph.env.before-f2b6892（root:root 0600），仅替换 PHONOGRAPH_RELEASE_ID，保留其余字节和原配置所有者/权限；经获批临时文件与临时链接原子替换配置/current，重启 phonograph.service。核对 MainPID 的实际工作目录、回环 health，再以正常证书校验访问公网 HTTPS health、三个页面与五个资源，并逐字节比对候选产物。切换后的异常或可捕获中断触发恢复旧配置/current、重启并检查旧版；回退失败必须明确输出 ROLLBACK_FAILED。该机制不承诺断电或不可捕获终止下的自动恢复。

命令在本地仅做 Python/Bash 语法检查和内存模拟：成功路径、切换前停止、配置/链接/重启/就绪/HTTPS/中断六类回退触发，以及回退失败报告均通过；六种 LF/CRLF 与引号组合的版本标识替换检查确认其他字节保持不变。没有执行服务器命令，没有创建本地脚本文件。尚待用户回传真实 DEPLOY_OK 或 STOPPED/ROLLBACK 输出；D4/D5 不提前勾选，真实上传播放仍另验。数据库、媒体、管理员、Caddy 和四个 COS 文件均不在本次新增修改范围内。

### 2026-10-21 新版部署成功与公网只读复核

用户回传安装/切换命令的实际输出：

    INSTALL_VERIFIED: candidate files, permissions and application module passed
    DEPLOY_OK f2b6892a1616421c62ce4faeeb4ee62315870636
    HTTPS_OK: health, 3 pages, 5 assets
    CURRENT: /srv/255-phonograph/releases/f2b6892a1616421c62ce4faeeb4ee62315870636

这份输出确认命令完成安装内容比对、配置备份与版本标识更新、current 切换、服务重启、进程工作目录/回环健康以及公网资源校验。该成功路径未触发回退，不将本次记为真实服务器故障回退演练。旧 release、配置备份和构建证据保留；未清理数据库、媒体或旧部署文件。

代理另从本机执行 11 项只读 HTTPS GET（正常证书校验、未登录、未保存下载文件），全部 HTTP 200：

| 检查 | 实际结果 |
| --- | --- |
| /api/health | ok=true |
| /api/admin/auth/status | needsSetup=false，authenticated=false；匿名请求的正常登录状态，不需要重新初始化管理员 |
| /、/music、/goodnight-radio、/admin | HTML 与本地 f2b6892 生产构建 SHA-256 一致 |
| index-CHkginCq.css、index-DjUfLE4I.js | 与本地候选逐项 SHA-256 一致 |
| hanser-main.png、hanser-chibi.png、fallback-cover.svg | 与本地候选逐项 SHA-256 一致 |

本次内置浏览器读取超时，未取得上线后的新渲染画面；HTTP 文件一致性不能替代生产浏览器交互、实际管理员登录或真实长音频完整播放验收。手机布局继续沿用上一批本地浏览器证据，家中网络尚待用户确认。

日常使用：访问 https://255fm.cn/；上传入口 https://255fm.cn/admin/songs/new，使用既有网站管理员密码。上传音频并填写信息，保存草稿后在歌曲列表发布，再刷新 https://255fm.cn/music 查看并播放；仅上传/保存草稿不会进入公共曲库。内容更新不需要重新部署代码，后续界面/功能代码变更仍按独立审批发布。localhost:4697 为旧静态样板，不能用于判断线上版本。

三份部署文档和阶段计划已在本地回写上述证据，尚未提交或推送这次文档改动；四个未提交 COS 文件继续保留。当前部署任务完成，后续真实内容验收、视频功能、每日一签、备份恢复及公开初版整体交付不提前记为完成。

### 2026-10-21 项目进度整理

按用户“更新项目进度”请求，在既有四文档批准范围内统一当前摘要、状态表、阶段待办和跨电脑接续信息：f2b6892 已上线，部署完成；下一项为真实音频上传/发布/完整播放与正式设备验收。纠正仍将旧 SHA 或待发布写为当前状态的概览，保留按日期记录的历史证据。此次只是文档整理，没有新增运行、测试或内容验收证据；没有改业务代码、提交、推送、重部署或操作真实歌曲。
