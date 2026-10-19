# 私人云端测试验收记录

建档日期：2026-09-29；当前汇总更新于 2026-10-19。此文件区分本地代码证据、服务器观察及尚未完成的验收。

最新证据见末尾“2026-10-19 age 完成、正式路径与标准 COS 接入准备”及[部署路线与接续提示词](private-cloud-next-steps.md)。age 合成数据加解密与两个拒绝测试通过，指定正式路径及权限已核对，标准 COS 私有桶已创建且为空；专用凭据、真实对象联调、生产备份和恢复尚未完成。备案和正式应用运行状态沿用 2026-10-16 最近证据，未据此宣称本轮复验。服务器证据来自用户终端回传，COS 来自截图及授权浏览器只读检查。本轮只修改六个本地文件，没有连接服务器。

| 范围 | 当前状态 | 证据/仍需完成 |
| --- | --- | --- |
| 基线 | 既有源码验证保留，本轮准备配置和交接 | 编辑前工作树干净，HEAD 为 871fdd5a8b31d7664b0b2f7ba27ca9db62f8c16a；提交前 ls-remote 已核对远端同为该 SHA；新材料的提交和推送结果以 Git 记录为准。历史 Linux 验证及最近 current 指向的版本为 ad23f3644498dd542357092c1aaca018e5c971d4；未重验发布文件哈希。 |
| 云端配置 | 聚焦测试通过 | 非法 Origin、host、相对路径和 SHA 拒绝；本地模式保持。 |
| 初始化/启动保护 | 聚焦测试通过 | 缺库/标记/schema 拒绝；不覆盖非空目录，重启保留合成数据。 |
| 管理保护 | 聚焦测试通过 | Host、Origin、Secure Cookie、转发头与限速恢复。真实 HTTPS/Caddy 尚未测。 |
| 媒体权限 | 聚焦测试通过 | 孤立、草稿、下架、回收站、共享引用、替换、管理员不绕过。 |
| Range/缓存 | 聚焦测试通过 | 200/206/416/HEAD、后缀/开放结尾、API private no-store。 |
| 上传容量 | 自动测试通过 | 磁盘阈值、并发预约、鉴权先行、类型/超限/数据库保存失败释放；真实本机连接中断与取消也已验证。 |
| 快照 | 聚焦测试通过 | WAL 记录、数据库引用、文件哈希、缺失文件、硬链接和目标保护。 |
| 归档 | 单元测试通过 | 真 tar 和可替换 age 进程边界；恶意路径/重复/链接拒绝。不是 age 真加密验收。 |
| 对象存储 | 历史单元测试通过；真实桶已创建 | 标准 COS 桶 255-backups-1378821599，ap-chengdu、私有读写、单 AZ，文件列表为空。真实对象上传/下载/删除仍未测试；不把桶创建当作备份通过。 |
| 备份编排/恢复 | 聚焦测试通过 | 先恢复服务再上传，失败不删旧备份；隔离恢复撤销旧会话，保留原库和密码哈希。 |
| 本地服务端回归、类型和构建 | 历史通过；本轮不重跑 | 2026-09-30 Node 24.16.0/Vitest 4.1.11：最终聚焦 23/23、服务端 34 文件 294/294；测试额外类型检查及后续参数化修正见历史章节。客户端此前本地及 Linux 均为 163/163；本轮仅配置/文档静态验证。 |
| 依赖安全审计 | 历史 npm audit 通过；本轮未重跑 | 2026-09-29 npm audit 全部级别均 0，退出码 0。本轮未变更依赖或锁文件，不代表本轮新增审计证据。 |
| 服务器预检及 Node 安装 | 交接记录已完成 | Ubuntu 26.04/x86_64/systemd 259；Node 24.21.0、npm 11.19.0，SQLite 内存查询与 backup API 检查通过。详见末尾证据。 |
| Linux 工程回归 | 新版全部通过 | Node 24.21.0/npm 11.19.0、ubuntu 用户：客户端 30 文件 163/163，服务端 34 文件 294/294，ExitCode=0；两套类型检查、Vite 前端构建和服务端编译全部通过，ExitCode=0。首轮失败记录保留。 |
| 服务器本机 HTTP | 历史合成 HTTP 通过；正式服务健康检查通过 | 2026-10-16 带 Host:255fm.cn 请求 127.0.0.1:3001/api/health 返回 200、{"ok":true}。首页、静态资源、曲库、媒体 Range 和错误 Host 等仍引用 2026-09-30 合成测试证据，未视为本轮全部重验。 |
| Caddy/systemd/Fail2ban | 应用服务已运行；入口与故障验收未完成 | phonograph.service 为 active/running/enabled、User=phonograph、Restart=on-failure；两项 Caddy 服务均 masked/inactive。Fail2ban 本轮未检查；此前未安装的记录不作为新检查结果。 |
| age 真加密/错误私钥/截断 | 合成数据演练通过 | 59 字节明文和恢复文本 cmp/SHA-256 一致；错误密钥及截断密文均按预期退出 1，输出 0 字节；目录 0700、十个文件 0600，verify.log 已回传。不是生产备份验收。 |
| 备份硬终止、锁、开机恢复 | 未执行 | 需真实 systemd/flock 故障注入。 |
| 云资源/备案/HTTPS/外部端口 | 备案已提交，腾讯云审核中；公网入口未验收 | 255fm.cn，成都实例 lhins-856nphe0，四川个人备案，服务内容“其他、网络音乐”。沿用最近截图和端口观察，无备案通过新证据；云防火墙、DNS/HTTPS 和公开访问方案仍待验收。 |
| 真实 COS 权限/计费 | 桶权限已查看；程序权限和账单未验证 | ACL 私有、桶策略为空、关联子账号表无结果，但未审计全部账号权限。旧 Lighthouse 健康估算不适用于当前实际账单；本轮准备受限 CAM 模板，尚未应用。 |
| 正式路径/权限 | 指定路径核对通过 | dataDir=/var/lib/255-phonograph，0700 phonograph:phonograph；配置/备份/运维目录 0700 root:root，应用环境文件 0600；三个备份配置文件不存在。未读真实曲库、完整环境或逐个库内文件。 |
| 真实 MP3/M4A/封面/LRC 上传 | 未执行 | 用户暂无已批准文件；不得使用现有曲库补验。 |
| 家庭网页播放和拖动 | 未执行 | 首播、暂停、往返拖动、歌词/频谱、下一首、刷新恢复且暂停。 |
| 页面尺寸 | 未执行 | 390×844、1280×720、1920×1080 后台/播放器。 |
| 持久化及回滚 | 本地既有验证及云端应用重启通过 | 云端独立数据目录初始化后正常停止并重启，曲库和三段音频 SHA-256 不变；测试结束再次正常停止。整台服务器重启、正式重新部署、版本切换和回滚仍待验收；云端本轮未验证 HTTPS/Secure Cookie。 |
| 三天试运行/两次定时备份 | 未执行 | 含家庭晚间网络、实际内存/磁盘/费用和恢复耗时。 |

本地真实数据库、媒体、管理密码没有被读取/修改来补验。永久删除保持列表点击直接执行，不恢复二次确认。当前没有经过验收的对外访问网址可以交付；本轮仅准备本地接入模板与文档。

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

## 2026-10-19 age 完成、正式路径与标准 COS 接入准备

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
