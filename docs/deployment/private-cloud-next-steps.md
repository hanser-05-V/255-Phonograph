# 255 留音机：后续部署路线与家中电脑接续

更新日期：2026-10-16。

**当前阶段：四川个人网站备案已提交，最近截图显示腾讯云审核中；正式应用已由 systemd 运行并通过本机健康检查；age 安装验证完成，隔离加密演练停在第一把测试密钥已生成。**

本轮用户批准更新本文、验收记录、实施计划和运维手册，并提交、推送到 `origin/codex/pc-music-player`。授权限于文档和必要 Git 记录，不包含新的服务器变更。推送是否成功以 Git 输出及远端 SHA 核验为准。

## 一、用途与设计边界

用户已明确：网站用于整理、存放主播 hanser 的直播语音片段及直播翻唱歌曲音频，面向粉丝提供浏览和在线播放，不涉及收费服务。当前先完成网站，APP 留待以后规划。

既有规格、Caddy 模板及部分文档按“仅所有者访问、全站私人认证”设计，与本次明确的用途存在差异。原文件名保留以便历史追踪；公开访问、后台权限、容量与流量限制等方案尚未重新确认或实施，不能直接移除全站认证后宣布上线。本轮没有修改业务代码、部署模板或设计规格。

备案填写时服务内容选择了“其他、网络音乐”。该选择及审核中状态不等于个人主体适用性、内容所需审批或音频使用授权已确认；如审核方询问，应按实际用途说明。不把“不收费”写成已经取得版权或上线许可。

## 二、当前状态与证据

服务器结果来自用户在腾讯云终端执行命令后回传，备案状态来自用户截图；本轮文档同步没有直接登录服务器。以下为最近观察值，换电脑后先只读复核可能变化的状态。

| 项目 | 已确认结果 | 证据边界 |
| --- | --- | --- |
| 仓库与分支 | [GitHub 仓库](https://github.com/hanser-05-V/255-Phonograph)，`codex/pc-music-player` | 同步前本地与远端均为 `0f31a343dea50a64c5b63aff43af1dedde6887ed`；包含本文的提交用 Git 查询，不能沿用旧 SHA 当最新提交。 |
| 备案 | 四川、个人、域名 `255fm.cn`；首次备案已提交，腾讯云审核中 | 尚无腾讯云审核通过、管局通过或 ICP 备案号的证据；公安联网备案“授权完成”不等于备案办结。 |
| 主机 | 腾讯云成都 `lhins-856nphe0`，`1.14.111.74`，登录用户 `ubuntu`；Ubuntu 26.04 LTS、x86-64、内核 7.0.0-30-generic | 主机名 `VM-0-4-ubuntu`。 |
| Node | `/opt/255-phonograph/node24/bin/node`，v24.21.0 | 实际进程解释器为 `/opt/255-phonograph/node-v24.21.0-linux-x64/bin/node`。 |
| 正式应用 | `phonograph.service`：loaded、active/running、enabled；用户 `phonograph`，Restart=on-failure | MainPID=1538812，NRestarts=0，ActiveEnterTimestamp=2026-10-05 02:17:03 CST；enabled 不代表已实测整机重启恢复。 |
| 运行目录 | `/srv/255-phonograph/releases/ad23f3644498dd542357092c1aaca018e5c971d4` | 由进程 cwd 得到；目录名不是本次重新校验源码哈希的证明。正式数据路径、权限及配置尚未完整复核。 |
| 本机访问 | 监听 `127.0.0.1:3001`；带 Host:255fm.cn 请求 `/api/health` 返回 HTTP 200、`{"ok":true}` | 其他 TCP 监听为 SSH 22 和本机 DNS 53；最近 `ss -ltnp` 未见 80/443。未据此完成外部端口或浏览器验收。 |
| Caddy | `caddy.service` 和 `caddy-api.service` 均 masked、inactive/dead | 未解除屏蔽或启动；DNS/HTTPS/公开入口仍未验收。 |
| 项目运维单元 | `systemctl list-unit-files 'phonograph*'` 只列出应用服务 | 未发现该命名范围的备份/健康单元或定时器；不据此断言系统不存在其他备份机制。 |
| 磁盘 | `/srv`、`/var/lib`、`/var/backups`、`/var/tmp` 同属 `/dev/vda3` ext4，39G 总量、6.7G 已用、31G 可用、18% | 是同一文件系统的四个路径，不能相加可用空间。 |
| age | Ubuntu 包 `1.2.1-1build1` 已安装；age、age-keygen 均输出 1.2.1 | 两个二进制 0755 root:root，lintian 文件 0644 root:root；加密/解密与完整备份恢复尚未验证。 |

### 历史 Linux 验证

2026-09-30 在隔离目录验证源码 `ad23f3644498dd542357092c1aaca018e5c971d4`：客户端 163/163、服务端 294/294，类型检查与构建通过；独立合成数据库、本机 HTTP、音频 GET/HEAD/Range、错误 Host 拒绝以及应用正常停止重启后哈希不变均通过。当天测试进程已停止。

这些是历史证据，不是 2026-10-16 重新执行的测试；“3001 无监听、正式服务未安装”只属于旧阶段，已被上表的新观察覆盖。HTTP 测试不等于真实设备播放验收。

详细证据见[验收记录](private-cloud-acceptance.md)；执行记录见[实施计划](../superpowers/plans/2026-09-28-private-cloud-test-deployment.md)，操作材料见[运维手册](private-cloud-runbook.md)。[原设计规格](../superpowers/specs/2026-09-28-private-cloud-test-deployment-design.md)仍为私人访问方案，不作为公开上线的已批准方案。

## 三、当前断点：age 隔离演练

### 已完成

1. 包模拟安装只增加 age；下载后检查包内容及控制信息，随后按批准范围安装。结果为 1 个新包、0 升级、0 移除；安装输出显示无需重启服务。
2. `dpkg-query` 确认包已安装，两个工具的版本及指定文件权限已核对。安装后应用仍是同一 PID、NRestarts=0，两个 Caddy 服务仍 masked/inactive。
3. 用户批准下列隔离目录与文件；创建前确认目录不存在，再以 `mkdir -m 700` 创建成功。
4. 已执行 `age-keygen -o .../test-key.txt`，收到 Public key 输出，第一把一次性测试密钥已生成。文档不保存私钥内容；该文件权限尚未单独回传核验。

### 已批准范围与逐项状态

根目录：`/var/tmp/255-phonograph-age-verify-20261016/`。目录目标权限 0700、所有者 ubuntu；其中所有文件目标权限 0600。仅使用合成文本和一次性测试密钥，保留产物，不清理。

| 相对文件名 | 用途 | 最近状态 |
| --- | --- | --- |
| `test-key.txt` | 正确测试私钥 | 已生成，不重建、不展示内容 |
| `wrong-key.txt` | 错误测试私钥 | 命令已给出，尚无执行结果 |
| `test-recipient.txt` | 从正确私钥导出的公钥 | 待生成 |
| `plain.txt` | 合成测试文本 | 待生成 |
| `plain.txt.age` | 加密结果 | 待生成 |
| `restored.txt` | 正确密钥解密结果 | 待生成 |
| `truncated.age` | 截断的密文副本 | 待生成 |
| `wrong-key-output.txt` | 错误密钥解密可能产生的输出 | 待测试，可能不存在或为空 |
| `truncated-output.txt` | 截断密文解密可能产生的输出 | 待测试，可能不存在或不完整 |
| `verify.log` | 结果、退出码和哈希记录 | 待生成，不记录私钥 |

换电脑后，先只读确认目录及 `test-key.txt`、`wrong-key.txt` 是否存在，避免在用户已自行操作后重复生成。若 `wrong-key.txt` 仍不存在，下一条待执行服务器命令是：

```bash
/usr/bin/age-keygen -o /var/tmp/255-phonograph-age-verify-20261016/wrong-key.txt
```

看到实际输出后，再逐条导出公钥、生成合成文本、加密、正确解密及比对 SHA-256，并验证错误密钥与截断密文被拒绝。失败必须核对实际错误和退出码，不能仅因命令失败就认定通过。创建后续文件时确保权限 0600，例如在该条命令的作用域内使用 umask 077。不得读取或粘贴私钥内容，不创建未列明的脚本文件或额外日志。

现有授权覆盖上述测试，不必对同一范围每一步重复审批；新增文件、清理、真实数据、生产密钥及备份服务操作需另列范围。正式备份私钥应由所有者在自己的设备保管，服务器只存批准的公钥；此处服务器上生成的密钥仅作隔离测试。

## 四、后续顺序

1. **继续现有 age 演练。** 先完成正向解密及两个拒绝用例，再评估正式备份；当前不能标“真实 age 验收通过”。
2. **跟进已提交备案。** 按官方通知接听审核联系、补充材料和完成短信核验，记录每个实际阶段。向审核方如实确认粉丝音频站及“网络音乐”内容的个人备案适用性。参考[首次备案流程](https://cloud.tencent.com/document/product/243/97668)及[四川要求](https://cloud.tencent.com/document/product/243/51725)，执行时核对最新规则。
3. **复核现有正式服务。** 确认源码/构建、current 链接、正式数据路径与权限、环境配置及服务单元；避免重新创建用户、服务或初始化已有数据库。正常启停、故障恢复和整机重启需要各自实际验收及相应操作授权。
4. **建立真实备份恢复。** 另列生产公钥、COS 资源/费用/前缀/凭据、备份与恢复目录、定时单元的批准范围。验证上传、下载、解密和隔离恢复，再验证锁、强杀补偿与定时执行。尚未创建或验证真实 COS。
5. **明确公开访问方案。** 结合面向粉丝的用途确认公开页面和音频范围、后台认证、并发与流量保护及内容授权。按批准范围修改设计/代码/配置；既有私人入口模板不能直接当作最终方案。
6. **满足备案及确认后的上线条件再开放 HTTPS。** 届时批准 DNS、Caddy、网络规则等变化，验证后台权限、Host/Origin、Secure Cookie、日志、维护响应和外部访问。保持 Caddy 当前状态，直到相应启用操作获准。
7. **设备与运行验收。** 使用用户批准的音频验证电脑/手机上传、播放、拖动、歌词与频谱；完成整机重启、重新部署/回滚、三天试运行及至少两次定时备份恢复验证，按官方要求办理备案后续事项。

## 五、服务器保留位置

| 项目 | 位置与边界 |
| --- | --- |
| 正式代码进程目录 | `/srv/255-phonograph/releases/ad23f3644498dd542357092c1aaca018e5c971d4`，当前已观察到；不据此假定数据目录已核验。 |
| 新版源码包 | `/home/ubuntu/255-phonograph-ad23f36/`，历史上传与校验结果保留。 |
| 新版 Linux 隔离根 | `/var/tmp/255-phonograph-linux-test-ad23f36/`，下含 source、app-data、logs、tmp、npm-cache；app-data 已初始化为三首合成歌曲。 |
| 旧隔离根 | `/var/tmp/255-phonograph-linux-test-20260930/`，保留首轮失败日志及旧包相关记录。 |
| age 隔离根 | `/var/tmp/255-phonograph-age-verify-20261016/`，具体状态见第三节。 |
| age 缓存包 | `/var/cache/apt/archives/age_1.2.1-1build1_amd64.deb`，已下载并用于安装；未清理。 |

历史 PID 不能直接用于 kill。新终端不继承旧环境变量；换电脑不会搬迁服务器，也不需要因此重新上传、安装或初始化。已有真实曲库、密码和旧证据不作自动读取、重置或清理。

## 六、家中电脑同步

### 已有仓库

进入家中实际项目工作树，先查看：

```bash
git status --short --branch
git worktree list
```

工作区干净后，若已在 `codex/pc-music-player`，执行：

```bash
git pull --ff-only origin codex/pc-music-player
git log -3 --oneline
```

若在其他分支，先 fetch，再确认开发分支没有被另一个工作树占用后切换：

```bash
git fetch origin
git switch codex/pc-music-player
git pull --ff-only origin codex/pc-music-player
```

若开发分支已被其他工作树占用，就进入那个工作树继续；若存在本地改动、分叉或快进失败，先检查差异并保留工作，不用强制重置或强推处理。

### 尚无仓库

在选定父目录执行：

```bash
git clone --branch codex/pc-music-player https://github.com/hanser-05-V/255-Phonograph.git
cd 255-Phonograph
git log -3 --oneline
```

同步的是源码、锁文件、部署模板和交接文档；服务器文件、私钥、数据库、媒体、依赖目录及原始日志不随 Git 传输。家中开发需 Node.js 24；安装依赖、构建或运行测试产生的文件按当地工作区的审批规则执行。公司路径 `E:\codex\hanser\.worktrees\pc-music-player` 只供识别原工作树，不照搬到家中电脑。

## 七、给家中 Codex 的接续提示词

```text
继续开发 255-Phonograph。先只读核对 codex/pc-music-player 分支和远端，
读取 docs/deployment/private-cloud-next-steps.md，再读验收记录、
实施计划最新章节和运维手册。GitHub 为：
https://github.com/hanser-05-V/255-Phonograph.git

2026-10-16 最新交接：
1. 用途已明确为面向 hanser 粉丝的免费音频网站，
   存放直播语音切片和翻唱歌曲；旧私人访问设计尚未调整为公开方案。
2. 255fm.cn 四川个人首次备案已提交，最近截图为腾讯云审核中。
   服务内容勾选“其他、网络音乐”；未取得备案通过或内容授权结论。
3. phonograph.service 已 active/running/enabled，用户 phonograph，
   Restart=on-failure，最近 PID 1538812、NRestarts=0。
   进程目录 /srv/255-phonograph/releases/ad23f3644498dd542357092c1aaca018e5c971d4，
   Node 24.21.0，监听 127.0.0.1:3001，带 Host:255fm.cn 的 health 返回 200。
   两个 Caddy 服务仍 masked/inactive；正式数据布局和重启恢复尚未完整验收。
4. age 包 1.2.1-1build1 已安装，age 与 age-keygen 版本均为 1.2.1。
   已创建 /var/tmp/255-phonograph-age-verify-20261016/，
   已生成 test-key.txt；wrong-key.txt 命令已给出但尚无执行结果。
   真加密、解密、错误密钥、截断测试及真实 COS/备份恢复均未完成。
5. 先只读检查上述目录和两把测试密钥是否存在，不展示私钥内容。
   然后在文档第三节已批准的具体文件范围内接着做 age 演练；
   已完成步骤不重复，既有批准不需要逐条重问。

所有服务器操作由我手动执行，一次只给一条不带提示符的命令，
收到实际输出再继续。新文件或扩展范围须先列目标、变化、影响和验证方法，
等我明确批准；提交、推送、部署和云资源需要对应授权。
本次文档同步批准不是后续部署总授权。
不自动派发子代理、不读取真实曲库、不重置密码、不清理旧证据，
不重新初始化已有数据、不自动解除 Caddy 屏蔽。
先简述当前断点，再给下一条只读核对命令。
```
