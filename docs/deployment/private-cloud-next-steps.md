# 255 留音机：后续部署路线与家中电脑接续

更新日期：2026-10-19。

**当前阶段：age 合成数据加解密及两个拒绝测试通过；正式数据目录和指定路径权限已核对；成都标准 COS 私有桶已创建并检查为空。下一步是专用访问权限与隔离对象联调，生产备份和恢复尚未执行。**

本轮用户批准本地修改六个文件：本文、验收记录、运维手册、既有实施计划、`deploy/backup-config.example.json` 和新增的 `deploy/cos-backup-policy.example.json`，以及不落盘的静态验证。本地验证完成后，用户批准将这六个文件提交并推送到 origin/codex/pc-music-player，包含必要 Git 记录；云端权限、密钥创建与部署不在授权内。推送结果以实际 Git 输出及远端 SHA 核验为准，家中拉取后确认已包含本次接入材料。

## 一、用途与设计边界

网站面向 hanser 粉丝，免费提供直播语音片段和直播翻唱音频的浏览、在线播放；当前先完成网站，APP 留待以后。原规格及 Caddy 模板仍按所有者私用、全站私人认证设计，公开访问、后台权限和流量保护尚需确认与实施。配置模板中的 `https://255fm.cn` 是应用使用的站点 Origin，不代表已经开放 HTTPS。

四川个人首次备案已经提交，最近截图仍是腾讯云审核中，服务内容勾选“其他、网络音乐”；没有备案通过或内容授权的新证据。审核方询问时按实际用途说明，不把免费服务等同于已获得音频使用授权。

## 二、当前状态与证据

服务器证据来自用户终端回传，备案来自用户截图；COS 来自截图和授权后的浏览器只读检查。本轮文件修改没有连接服务器。状态可能变化，接续时只读复核所需项目，不重复初始化。

| 项目 | 最近确认结果 | 证据边界 |
| --- | --- | --- |
| 仓库 | [GitHub](https://github.com/hanser-05-V/255-Phonograph)，`codex/pc-music-player`；本轮编辑前 HEAD `871fdd5a8b31d7664b0b2f7ba27ca9db62f8c16a`，工作树干净 | 提交前已用 ls-remote 确认远端同为该 SHA；本次接入材料的提交号以完成后的 Git 记录为准。 |
| 备案 | 四川个人、`255fm.cn`，腾讯云审核中 | 既有截图，非本轮重新查询；未取得 ICP 号。 |
| 主机 | 腾讯云成都 `lhins-856nphe0`，`1.14.111.74`；Ubuntu 26.04 LTS、x86-64、内核 7.0.0-30-generic | 登录用户 ubuntu，主机名 VM-0-4-ubuntu。 |
| Node | `/opt/255-phonograph/node24/bin/node`，24.21.0 | 实际解释器 `/opt/255-phonograph/node-v24.21.0-linux-x64/bin/node`。 |
| 正式应用 | phonograph.service 为 active/running/enabled，用户 phonograph，Restart=on-failure；本机 health 返回 200、`{"ok":true}` | 2026-10-16 最近运行状态：PID 1538812、NRestarts=0；监听 127.0.0.1:3001。不是整机重启验收。 |
| 服务配置 | FragmentPath `/etc/systemd/system/phonograph.service`，无 DropInPaths；WorkingDirectory `/srv/255-phonograph/current` | User/Group 均为 phonograph；EnvironmentFiles 指向 phonograph.env，StateDirectory 为空。 |
| current 与正式数据 | current 指向 `/srv/255-phonograph/releases/ad23f3644498dd542357092c1aaca018e5c971d4`；`PHONOGRAPH_DATA_DIR=/var/lib/255-phonograph` | 仅按白名单读取这一项环境变量；未读曲库或完整环境文件，未重验发布文件哈希。 |
| 目录权限 | 数据目录 0700 phonograph:phonograph；`/etc/255-phonograph`、`/var/backups/255-phonograph`、`/var/lib/255-phonograph-ops` 均 0700 root:root | namei 已核对所列路径和祖先；current 为预期链接，代码目录及祖先为 0755 root:root。 |
| 环境与备份配置 | phonograph.env 为 0600 root:root；backup.json、backup.env、age-recipients.txt 均不存在 | 位于 `/etc/255-phonograph/`；仓库模板尚未安装到这些路径。 |
| 公网入口 | caddy.service、caddy-api.service 均 masked/inactive；最近未见 80/443 监听 | 沿用 2026-10-16 观察；防火墙、DNS、HTTPS 未验收。 |
| 运维单元 | `phonograph*` 只列出应用服务 | 未发现该范围的备份/健康单元或定时器，不排除其他机制。 |
| 磁盘 | /srv、/var/lib、/var/backups、/var/tmp 同属 /dev/vda3，39G 总量、31G 可用 | 2026-10-16 观察；四个路径不能相加可用空间。 |
| age | 包 1.2.1-1build1；age 与 age-keygen 均 1.2.1 | 合成文本测试通过，具体见第三节；不是生产备份验收。 |
| COS | 标准 COS：`255-backups-1378821599`，成都 `ap-chengdu`，私有读写、单 AZ | 创建时间 2026-10-19 12:20:14；文件列表显示共 0 个文件。不是轻量对象存储桶。 |

历史 Linux 验证：2026-09-30 的源码 `ad23f36` 在 Node 24.21.0 下通过客户端 163/163、服务端 294/294、类型检查及构建，以及隔离合成数据 HTTP、GET/HEAD/Range、错误 Host 拒绝、应用正常停止重启后哈希一致。历史测试进程停止不表示现在的正式应用停止；HTTP 测试不替代真实设备播放验收。

详见[验收记录](private-cloud-acceptance.md)、[运维手册](private-cloud-runbook.md)及[实施计划最新章节](../superpowers/plans/2026-09-28-private-cloud-test-deployment.md)。

## 三、age 隔离演练已完成

保留根目录 `/var/tmp/255-phonograph-age-verify-20261016/`，实际权限 0700、所有者 ubuntu:ubuntu；下列十个文件均已创建，权限 0600、所有者 ubuntu:ubuntu。仅使用一次性测试密钥与合成文本，不重建密钥、不展示私钥、不清理产物。

| 文件 | 已回传结果 |
| --- | --- |
| test-key.txt、wrong-key.txt | 各 189 字节，两把一次性私钥已生成 |
| test-recipient.txt | 63 字节，正确密钥的公钥 |
| plain.txt、restored.txt | 各 59 字节；cmp 相同，SHA-256 相同 |
| plain.txt.age | 259 字节，真实 age 加密结果 |
| truncated.age | 258 字节，截掉最后 1 字节的测试副本 |
| wrong-key-output.txt | 0 字节；错误密钥解密退出码 1，错误为 no identity matched any of the recipients |
| truncated-output.txt | 0 字节；截断密文解密退出码 1，错误为 failed to decrypt and authenticate payload chunk |
| verify.log | 已生成并读回，记录上述结果、权限及证据日期 2026-10-19；不含私钥 |

明文和正确恢复文本的 SHA-256：`24f21c141fff7ffd13499926fdcc49d1380351bb5fed8d3fad3133c373119360`。

只证明这些小型合成输入的结果；完整备份、数据库/媒体恢复、COS 传输、故障补偿仍未验证。目前使用公司电脑，生产 age 私钥留待家中受控设备生成、保管并验证副本，服务器只接收正式公钥。测试私钥不升级为生产私钥。

## 四、下一步：标准 COS 接入

### 已核对的资源

- 桶：`255-backups-1378821599`；地域：`ap-chengdu`；端点：`https://255-backups-1378821599.cos.ap-chengdu.myqcloud.com`。
- 私有读写；单 AZ；版本控制未开启；复制、生命周期、日志存储、CORS 均未配置；静态网站及全球加速未开启，数据万象未开通。
- ACL 页面只列主账号所有者，桶策略列表为空，关联 CAM 子账号表未找到策略。没有审计整个账号的用户组、角色和全部策略，不能据此断言不存在其他访问途径。
- 服务端加密仅有创建时选择“不加密”的截图，创建后未重新核对该项。计划采用上传前 age 加密；不能把计划写成已上传数据已加密。
- 标准 COS 的计费项与轻量对象存储不同；轻量控制台展示的免费额度未核实适用于这个桶。当前 `server/ops/health.ts` 仍使用 Lighthouse 历史费率和服务器/域名参考价，不能用于当前实际账单判断；在启用健康/备份定时器前另行修正并验收。[官方产品对比](https://cloud.tencent.com/document/product/1207/108904)

### 本地接入材料

[备份配置](../../deploy/backup-config.example.json)与[CAM 用户策略](../../deploy/cos-backup-policy.example.json)采用同一独占前缀：

`phonograph-backups/e57796e4-d131-4652-880e-a3c0613369c5/`

前缀是本轮为接入选定的逻辑对象路径，尚无对象写入，也未在控制台创建文件夹。策略只能附加给专用 CAM 子用户；不是直接粘贴到桶策略页的配置。权限覆盖索引和 `.tar.age` 对象，删除只覆盖后者；上传要求 private ACL，额外授权头必须缺省或为空。具体权限和限制见运维手册第 6 节。

配置中的 releaseId 是最近观察到的运行版本 `ad23f3644498dd542357092c1aaca018e5c971d4`，部署前应复核 current；后续发布了新代码则用实际运行的发布 SHA。模板目前不具备已验证的生产公钥/凭据，不直接运行备份或初始化索引。

### 执行顺序

1. 六文件静态验证已通过，提交和推送已获批准；核对推送结果后，家中拉取更新。
2. 只读检查 CAM 是否已有合适的专用程序访问子用户；确定用户名、策略名及完整权限后，再批准创建或绑定。避免附加全量 COS 权限、额外用户组或控制台登录权限。
3. 单独批准凭据的安全落盘路径和方式；SecretId/SecretKey 不进入聊天、Git 或命令行参数。服务器仅保存 root:root 0600 的 backup.env；当前不创建。
4. 在另行列明并批准的临时对象键上，用合成密文验证 put/head/get/delete、长度与 SHA-256，以及前缀外操作拒绝。隔离前缀及权限变更另列，不借用生产 index.json，也不把 .tar.age 后缀当作加密证明。
5. 在家中完成生产密钥保管和副本验证后，再批准公钥安装、backup.json、生产空索引初始化。已有索引时停止核对，不删除或重建。
6. 批准明确的停机窗口和备份范围，验证完整备份、下载、解密及全新目录恢复；再验证 flock 冲突、硬终止补偿和服务恢复。费用估算适配完成后，才准备定时器启用。
7. 同步推进备案、公开访问方案；满足条件并单独批准后做 DNS/HTTPS/外部入口、真实音频与家庭设备验收、整机重启/回滚及三天试运行。

## 五、服务器保留位置

| 项目 | 位置 |
| --- | --- |
| 正式发布目录 | `/srv/255-phonograph/releases/ad23f3644498dd542357092c1aaca018e5c971d4` |
| 正式数据 | `/var/lib/255-phonograph`；未读取曲库内容 |
| 新版源码包 | `/home/ubuntu/255-phonograph-ad23f36/` |
| Linux 新版隔离根 | `/var/tmp/255-phonograph-linux-test-ad23f36/`，保留 source、app-data、logs、tmp、npm-cache |
| Linux 旧隔离根 | `/var/tmp/255-phonograph-linux-test-20260930/`，保留首轮失败证据 |
| age 隔离根 | `/var/tmp/255-phonograph-age-verify-20261016/`，十个文件保留 |
| age 缓存包 | `/var/cache/apt/archives/age_1.2.1-1build1_amd64.deb` |

历史 PID 不用于直接 kill。换电脑不会搬迁服务器或继承旧终端环境，不因此重新安装、上传或初始化。真实曲库、密码和旧证据不自动读取、重置或清理。

## 六、家中电脑同步

本轮六文件的提交和推送已获批准；先确认实际推送成功及远端提交号，本地编辑完成不等于 GitHub 已更新。在家中实际项目工作树只读检查：

```bash
git status --short --branch
git worktree list
```

若工作区干净且已在 `codex/pc-music-player`：

```bash
git pull --ff-only origin codex/pc-music-player
git log -3 --oneline
```

若在其他分支，先 fetch，确认目标分支未被其他 worktree 占用，再切换并快进拉取：

```bash
git fetch origin
git switch codex/pc-music-player
git pull --ff-only origin codex/pc-music-player
```

目标分支已被占用则进入对应 worktree；有未提交修改或快进失败时先保留并检查差异，不强制 reset 或 push。若尚无仓库，在批准的父目录克隆：

```bash
git clone --branch codex/pc-music-player https://github.com/hanser-05-V/255-Phonograph.git
cd 255-Phonograph
git log -3 --oneline
```

Git 同步代码、锁文件、模板及文档，服务器数据、私钥、访问凭据、媒体和原始日志不随 Git 传输。家中开发用 Node.js 24；依赖安装、测试和构建遵循当地工作区写入审批规则。公司路径 `E:\codex\hanser\.worktrees\pc-music-player` 只供定位。

## 七、给家中 Codex 的接续提示词

```text
继续开发 255-Phonograph。先只读核对 codex/pc-music-player 分支，
读取 docs/deployment/private-cloud-next-steps.md、验收记录、
运维手册和实施计划的最新章节。
仓库：https://github.com/hanser-05-V/255-Phonograph.git

2026-10-19 最新交接：
1. 网站面向 hanser 粉丝免费提供直播切片和翻唱音频。
   四川个人备案最近证据仍为腾讯云审核中；公开访问方案尚未实施。
2. 正式 phonograph.service 已运行，Node 24.21.0，回环 3001 健康检查通过。
   current 指向 ad23f3644498dd542357092c1aaca018e5c971d4 发布目录。
   正式数据 /var/lib/255-phonograph 为 0700 phonograph:phonograph；
   /etc/255-phonograph、/var/backups/255-phonograph、
   /var/lib/255-phonograph-ops 均为 0700 root:root。
   两项 Caddy 服务仍 masked；整机重启等验收未完成。
3. age 1.2.1 合成文本的正向解密、错误密钥和截断拒绝测试已通过，
   /var/tmp/255-phonograph-age-verify-20261016/ 十个文件和日志保留。
   不重复生成测试密钥，不把一次性测试密钥用于生产。
4. 标准 COS 桶 255-backups-1378821599 已创建，ap-chengdu、单 AZ、
   私有读写，最近文件列表为空。桶创建不等于备份验收通过。
   已在本地模板选定前缀 phonograph-backups/e57796e4-d131-4652-880e-a3c0613369c5/，
   尚未应用 CAM 策略、创建访问凭据或写入对象。
5. /etc/255-phonograph 下 backup.json、backup.env、age-recipients.txt 尚不存在。
   下一步先核对专用 CAM 子用户及权限，再分别批准凭据和隔离 COS 联调。
   生产 age 私钥在家中受控设备生成保管，服务器只放公钥。
   旧 health.ts 费用估算针对 Lighthouse，启用定时器前需适配标准 COS。

检查本轮六文件修改是否已经提交和推送，不把本地批准当成云端部署授权。
新文件或扩展范围先列目标、变化、影响和验证方法，获批后写入；
提交、推送、云端授权、真实数据备份和部署分别需要对应批准。
我手动执行服务器命令，一次只给一条不带提示符的命令并等待输出。
不自动派发子代理，不读取真实曲库、不重置密码、不清理旧证据，
不重新初始化、不自动解除 Caddy 屏蔽。
先说明当前断点，再从仍未完成的下一项只读检查开始。
```
