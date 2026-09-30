# 私人云端测试验收记录

日期：2026-09-29。此文件区分本地代码证据与未执行验收，不代表已经部署。

当前汇总更新于 2026-09-30，最新证据见末尾“新版 Linux 复验、本机访问与交接”。服务器已完成 ad23f36 版本的全量测试、构建、本机 HTTP 和应用重启验证；测试进程已正常停止，3001 无监听，数据及日志保留。尚未正式部署或提供私人访问网址，剩余工作不只有备案。服务器证据来自用户手工终端回传；下方各历史章节保留当时状态，以本汇总和末尾最新章节为准。

| 范围 | 当前状态 | 证据/仍需完成 |
| --- | --- | --- |
| 基线 | 新版源码已提交、上传并复验 | 服务器验证的源码提交为 ad23f3644498dd542357092c1aaca018e5c971d4，分支 codex/pc-music-player；本次交接文档提交将位于其后。用户已要求将部署适配、测试修正及最新进度推送 GitHub，推送结果以远端核验为准。 |
| 云端配置 | 聚焦测试通过 | 非法 Origin、host、相对路径和 SHA 拒绝；本地模式保持。 |
| 初始化/启动保护 | 聚焦测试通过 | 缺库/标记/schema 拒绝；不覆盖非空目录，重启保留合成数据。 |
| 管理保护 | 聚焦测试通过 | Host、Origin、Secure Cookie、转发头与限速恢复。真实 HTTPS/Caddy 尚未测。 |
| 媒体权限 | 聚焦测试通过 | 孤立、草稿、下架、回收站、共享引用、替换、管理员不绕过。 |
| Range/缓存 | 聚焦测试通过 | 200/206/416/HEAD、后缀/开放结尾、API private no-store。 |
| 上传容量 | 自动测试通过 | 磁盘阈值、并发预约、鉴权先行、类型/超限/数据库保存失败释放；真实本机连接中断与取消也已验证。 |
| 快照 | 聚焦测试通过 | WAL 记录、数据库引用、文件哈希、缺失文件、硬链接和目标保护。 |
| 归档 | 单元测试通过 | 真 tar 和可替换 age 进程边界；恶意路径/重复/链接拒绝。不是 age 真加密验收。 |
| 对象存储 | 单元测试通过 | 上海/成都配置及对象级 API 地域透传通过，成功索引和七份轮换保持；未请求真实 COS。 |
| 备份编排/恢复 | 聚焦测试通过 | 先恢复服务再上传，失败不删旧备份；隔离恢复撤销旧会话，保留原库和密码哈希。 |
| 本地服务端回归、类型和构建 | 本次通过 | Node 24.16.0/Vitest 4.1.11：最终聚焦 23/23、服务端 34 文件 294/294；两份修改测试纳入 TypeScript 检查后零诊断。权限修正后的常规类型检查和前后端构建已通过；后续参数化修正仅改测试，未重跑构建。客户端未改，本次未重跑；此前本地及首轮 Linux 均为 163/163。 |
| 依赖安全审计 | 历史 npm audit 通过；本轮未重跑 | 2026-09-29 npm audit 全部级别均 0，退出码 0。本轮未变更依赖或锁文件，不代表本轮新增审计证据。 |
| 服务器预检及 Node 安装 | 交接记录已完成 | Ubuntu 26.04/x86_64/systemd 259；Node 24.21.0、npm 11.19.0，SQLite 内存查询与 backup API 检查通过。详见末尾证据。 |
| Linux 工程回归 | 新版全部通过 | Node 24.21.0/npm 11.19.0、ubuntu 用户：客户端 30 文件 163/163，服务端 34 文件 294/294，ExitCode=0；两套类型检查、Vite 前端构建和服务端编译全部通过，ExitCode=0。首轮失败记录保留。 |
| 服务器本机 HTTP | 已通过 | 127.0.0.1:3001 的健康接口、首页、JS/CSS HEAD、曲库、音频 GET/HEAD/Range，以及错误 Host 返回 421 已验证；只用三段合成音频，尚非浏览器播放验收。 |
| Caddy/systemd/Fail2ban | 安装准备部分完成；项目配置未验证 | Caddy 2.11.4 已安装，两个 Caddy 服务保持 masked/inactive；应用 systemd 未安装，Fail2ban 未安装，模板 jail 保持禁用。 |
| age 真加密/错误私钥/截断 | 未执行 | 本机无 age，需隔离 Linux 密钥演练。 |
| 备份硬终止、锁、开机恢复 | 未执行 | 需真实 systemd/flock 故障注入。 |
| 云资源/备案/HTTPS/外部端口 | 域名和实例已购；已有端口预检 | 255fm.cn，成都实例 lhins-856nphe0；拟四川个人备案、尚未提交。交接记录云防火墙开放 22/80 TCP 和 ICMP、无 443 规则；80/443 无监听。DNS、HTTPS、私人入口未配置或验证，未创建备份桶或部署应用。 |
| 真实 COS 权限/计费 | 未执行 | 需单独批准指定隔离对象操作。 |
| 真实 MP3/M4A/封面/LRC 上传 | 未执行 | 用户暂无已批准文件；不得使用现有曲库补验。 |
| 家庭网页播放和拖动 | 未执行 | 首播、暂停、往返拖动、歌词/频谱、下一首、刷新恢复且暂停。 |
| 页面尺寸 | 未执行 | 390×844、1280×720、1920×1080 后台/播放器。 |
| 持久化及回滚 | 本地既有验证及云端应用重启通过 | 云端独立数据目录初始化后正常停止并重启，曲库和三段音频 SHA-256 不变；测试结束再次正常停止。整台服务器重启、正式重新部署、版本切换和回滚仍待验收；云端本轮未验证 HTTPS/Secure Cookie。 |
| 三天试运行/两次定时备份 | 未执行 | 含家庭晚间网络、实际内存/磁盘/费用和恢复耗时。 |

本地真实数据库、媒体、管理密码没有被读取/修改来补验。永久删除保持列表点击直接执行，不恢复二次确认。当前没有私人访问网址可以交付。

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

本次交付为[运维手册第 10 节](private-cloud-runbook.md#10-2026-09-29-采购与部署准备补充当前关口)及实施计划追加记录。文档检查限于三文件差异、历史内容保留、相对链接、金额和跨文档状态一致性；不新增测试/构建报告，不视为独立审计或部署验收。永久删除行为、真实曲库、密码及原测试临时目录均不在本轮修改范围。

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

## 2026-09-30 服务器准备交接与测试部署准备（当前）

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

## 2026-09-30 Linux 首轮测试与状态权限测试修正（当前）

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

## 2026-09-30 新版 Linux 复验、本机访问与交接（最新）

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
