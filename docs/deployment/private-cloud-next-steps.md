# 255 留音机：初版功能路线与跨电脑接续

**Git 同步范围（2026-10-21）：** 用户已授权将这四份进度/部署文档提交并推送至 codex/pc-music-player；实际完成结果以 Git 命令和远端 SHA 核对为准。本次仅文档同步，线上功能版本继续为 f2b6892，不触发重新部署；四个 COS 文件不纳入提交。

**最新进展（2026-10-21）：** 正式网站已切换至 f2b6892，用户回传 DEPLOY_OK；代理独立 HTTPS 核对首页、音乐馆、晚安电台、后台入口及新版资源通过。真实歌曲上传、完整播放和家庭网络仍待用户验收；以本文末尾记录为准。

更新日期：2026-10-21。

**最新协作规则：** 按本轮用户提供的 AGENTS.md：任何文件写入先列准确文件、改动、影响和验证方式，获得明确批准后执行；范围扩大重新批准。提交、推送、部署及外部状态变更各自确认。本批正式 React 接入的 26 个文件及指定构建/缓存/隔离数据路径已经批准。不自动派发子代理。此前简单事项自主审批属于历史规则，不作为本轮扩大范围的授权。

**当前阶段：B“毛怪手帐”正式 React 界面已上线；首页、独立音乐馆、晚安电台和迷你播放器使用正式服务。下一步由用户上传/发布真实歌曲，验证完整播放与家中访问。晚安电台仍为读书视频空页面，每日一签保留禁用占位。ICP 已通过，公安申请已取消、需重新提交；内部目标仍为 11 月 10 日初版。**

已推送并上线的固定版本为 `f2b6892a1616421c62ce4faeeb4ee62315870636`；28 个发布文件已获批提交、推送和部署。原静态样板与四个未提交 COS 脚本/测试保留。三份部署文档和阶段计划纳入本次独立文档提交，运行版本保持 f2b6892；完整部署证据见本文末尾和验收记录最新章节。

## 一、用途与设计边界

网站面向 hanser 粉丝，免费提供直播语音片段和直播翻唱音频的浏览、在线播放；当前先丰富网页版功能。公开首页已由用户确认能访问，音乐馆已有代码实现，管理后台使用独立管理员会话。原私用规格及仓库 `deploy/Caddyfile` 仍包含全站 Basic Auth，与当前服务器获批安装的公开配置不同，不能直接覆盖；实际配置见运维手册第 15 节。APP、账号注册、评论、用户上传和晚安电台完整发布系统属于后续候选，未自动纳入本批。晚安电台已明确为用户的读书视频企划，首页入口进入独立站内页面，承载后续上传的视频。本批已将企划介绍、空状态和进入/返回交互接入正式页面；视频上传、真实播放及后台接入另列范围批准。

四川个人 ICP 已通过：`蜀ICP备2026063099号-1`，备案网站名“毛怪小站”、域名 `255fm.cn`，页面品牌“255 留音机”。公安申请曾提交，随后用户明确取消，当前没有公安备案号。重新申请时按实际功能与内容填写并核对备案名称和展示信息。首批真实音频由用户提供可使用的素材，不把免费服务等同于内容授权。

## 二、当前状态与证据

截至 2026-10-21，以下表格合并当前状态；服务器发布结果来自用户终端 DEPLOY_OK，公网 11 项只读 HTTPS GET 来自代理独立复核，本地测试单独列明。尚无上线后真实歌曲完整播放或家庭网络验收。旧章节保留当时的时间语境，不能把历史 SHA、待批准或未部署描述当作当前状态；本次进度整理不重跑服务器或 COS 操作。

| 项目 | 最近确认结果 | 证据边界 |
| --- | --- | --- |
| 仓库 | [GitHub](https://github.com/hanser-05-V/255-Phonograph)，`codex/pc-music-player`；已提交、推送并上线 `f2b6892a1616421c62ce4faeeb4ee62315870636` | 28 个发布文件已提交上线；四份进度/部署文档纳入本次文档提交，四个 COS 脚本/测试继续保留未提交。 |
| ICP / 公安备案 | ICP `蜀ICP备2026063099号-1` 已通过；公安申请已取消、待重新提交 | 来自用户截图与撤销说明；没有公安备案号。 |
| 主机 | 腾讯云成都 `lhins-856nphe0`，`1.14.111.74`；Ubuntu 26.04 LTS、x86-64、内核 7.0.0-30-generic | 登录用户 ubuntu，主机名 VM-0-4-ubuntu。 |
| Node | `/opt/255-phonograph/node24/bin/node`，24.21.0 | 2026-10-19 用户只读预检回传 `v24.21.0`；COS SDK 为 3.0.0。 |
| 正式应用 | 2026-10-21 已切换至 f2b6892，phonograph.service 重启后 active，进程工作目录及回环 health 验证通过 | 用户回传 DEPLOY_OK；监听 127.0.0.1:3001，沿用 phonograph 用户和既有数据。开机自启来自历史证据，整机重启未验收。 |
| 管理员 | 2026-10-21 匿名状态接口返回 needsSetup=false、authenticated=false | 管理员保持已初始化，匿名未登录属正常结果；上线后实际登录、上传和发布仍待用户操作，不重置密码或重新初始化。 |
| 服务配置 | FragmentPath `/etc/systemd/system/phonograph.service`，无 DropInPaths；WorkingDirectory `/srv/255-phonograph/current` | User/Group 均为 phonograph；EnvironmentFiles 指向 phonograph.env，StateDirectory 为空。 |
| current 与正式数据 | current 指向 `/srv/255-phonograph/releases/f2b6892a1616421c62ce4faeeb4ee62315870636`；数据目录仍为 `/var/lib/255-phonograph` | 用户 DEPLOY_OK/CURRENT 输出确认；没有读取完整环境或真实曲库来补验。 |
| 目录权限 | 新 release 为 root:root，顶层 0755；安装核验已确认树内所有者及无组/其他用户写权限 | 数据目录 0700 phonograph:phonograph、运维目录 0700 root:root 沿用历史观察；不宣称本次重查全部系统路径。 |
| 环境与备份配置 | 仅同步 PHONOGRAPH_RELEASE_ID；原配置备份为 phonograph.env.before-f2b6892（root:root 0600） | 成功切换命令验证其余配置字节及原配置权限保留。正式 backup.json、backup.env、age 公钥配置仍未安装，不与本次环境文件备份混淆。 |
| DNS / 防火墙 | apex A 记录指向 1.14.111.74，TTL 600；云防火墙允许 TCP 80/443，UFW inactive | 用户命令及截图；www 未配置，未开放公网 3001。 |
| 公网入口 | 2026-10-21 HTTPS health、匿名后台状态、四个页面入口及五个资源均返回 200 | 代理独立只读检查通过，新资源 SHA-256 与本地候选一致；内置浏览器读取超时，真实交互、www 和家庭访问另验。Caddy 未改动。 |
| 网站功能 / 内容 | B 样式首页、独立音乐馆、迷你播放器和统一 ICP 页脚已上线；晚安电台为空页面，每日一签禁用预留 | 本地约 62.69 秒合成 MP3 上传/发布/播放已通过；真实歌曲完整流程仍待用户验收，本地三首 seed 是 1 秒示例。 |
| 运维单元 | `phonograph*` 只列出应用服务 | 未发现该范围的备份/健康单元或定时器，不排除其他机制。 |
| 磁盘 | 2026-10-21 部署前 /srv 所在文件系统可用 30.27 GiB | 来自用户只读预检；不是部署后实时余量。同一文件系统的多个路径不能相加可用空间。 |
| age | 包 1.2.1-1build1；age 与 age-keygen 均 1.2.1 | 合成文本测试通过，具体见第三节；不是生产备份验收。 |
| COS | 标准 COS：`255-backups-1378821599`，成都 `ap-chengdu`，私有读写、单 AZ | 正向、指定 GET 拒绝和本次匿名读取/上传 ACL 拒绝均通过；本次版本状态前提由用户确认。`absent` 只针对测试键，不代表全桶审计。 |
| CAM 用户 | `phonograph-backup`，UIN `100053927521`，详情路径 `/cam/user/27682809`；2026-10-19 15:08:43 创建 | 先前浏览器回读：控制台访问已禁止、用户组 0、仅直接关联下列策略。 |
| CAM 策略 | `phonograph-backup-prefix`，ID `290399112`，版本 1；14:36:04 创建，15:13:38 关联用户 | 既有页面回读为仅直接关联这一策略，内容与模板一致；指定对象正向请求、GET 路径拒绝及匿名读取/三种 ACL 上传拒绝已通过。本次未更改或重新审计全部权限；grant 条件未验收。 |
| CAM 密钥 | 旧密钥（15:08:43 创建）已禁用、未删除；用户确认现有两把，替换密钥已启用并安全保存 | 旧密钥禁用由页面回读，新密钥保存及状态由用户确认。未读取 SecretKey；临时输入后的请求成功，未记录凭据值或推测新密钥创建时间。 |

历史 Linux 验证：2026-09-30 的源码 `ad23f36` 在 Node 24.21.0 下通过客户端 163/163、服务端 294/294、类型检查及构建，以及隔离合成数据 HTTP、GET/HEAD/Range、错误 Host 拒绝、应用正常停止重启后哈希一致。历史测试进程停止不表示现在的正式应用停止；HTTP 测试不替代真实设备播放验收。

详见[验收记录](private-cloud-acceptance.md)、[运维手册](private-cloud-runbook.md)及[公开初版实施计划](../superpowers/plans/2026-10-20-public-initial-release.md)。

## 当前主线：丰富网站功能，完成公开初版

| 目标时间 | 阶段工作 | 可交付结果 |
| --- | --- | --- |
| 10月20—23日 | B 样式正式接入、提交推送、上线已于 10月21日完成；转入真实歌曲上传和公开使用验收 | 固定版本 f2b6892 已上线；下一项为真实音频保存草稿→发布→音乐馆播放 |
| 10月24—31日 | 根据真实使用反馈修正音乐馆/播放器问题，按既定方向继续统一完整播放器和其他功能 | 桌面、手机及家庭网络核心播放流程通过，界面暂按用户已确认样式保持 |
| 11月1—7日 | 按统一样式完善其他功能、后台体验和各状态，最后打磨细节；必要备份恢复验证 | 电脑和手机核心流程可用，数据可恢复 |
| 11月8—10日 | 初版冻结、内容验收、发布验证 | 真实内容可访问播放，主要流程无阻断问题 |
| 争取11月12日前 | 重新提交公安备案 | 预留补充材料时间，审核结果以主管部门反馈为准 |

以上是内部目标，不替代备案期限认定。视觉方向、正式 React 接入及本次上线已经完成；下一步先验收用户真实音频，再按具体反馈完善已有功能。每日一签保留“功能筹备中”禁用入口，晚安电台暂不开发视频后台。已有队列、歌词、频谱和恢复行为继续复用，不重复搭建。

本批页脚显示 ICP 号并链接工信部，覆盖首页、音乐馆及曲库加载/错误/空状态，给固定播放器留出空间。公安号取得后再按真实号码添加。真实内容准备、www 入口和生产备份验收配合功能推进；既有 COS 合成测试保持结论，不重复执行或继续以权限探针作为当前主线。

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

age 结果只证明这些小型合成输入的加解密行为；COS 传输现已另行通过，见第四节。完整备份、数据库/媒体恢复和故障补偿仍未验证。用户已说明公司和家中的电脑均由本人使用，不再以地点为推进前置条件；正式 age 私钥生成、保存位置和副本验证仍须批准，服务器只接收正式公钥，测试私钥不升级为生产私钥。

## 四、标准 COS 接入与正向实测

### 已核对的资源

- 桶：`255-backups-1378821599`；地域：`ap-chengdu`；端点：`https://255-backups-1378821599.cos.ap-chengdu.myqcloud.com`。
- 私有读写；单 AZ；版本控制未开启；复制、生命周期、日志存储、CORS 均未配置；静态网站及全球加速未开启，数据万象未开通。
- 建桶后的 ACL 页面只列主账号所有者，桶策略列表为空，当时关联 CAM 子账号表未找到策略。这是 CAM 用户创建前的观察；后续用户已有直接关联策略，不能用旧桶页面结果判断用户权限。没有审计整个账号的用户组、角色和全部策略。
- 服务端加密仅有创建时选择“不加密”的截图，创建后未重新核对该项。本次仅上传已验证的 age 合成密文，校验后已删除；正式备份加密和恢复仍待验收。
- 标准 COS 的计费项与轻量对象存储不同；轻量控制台展示的免费额度未核实适用于这个桶。当前 `server/ops/health.ts` 仍使用 Lighthouse 历史费率和服务器/域名参考价，不能用于当前实际账单判断；在启用健康/备份定时器前另行修正并验收。[官方产品对比](https://cloud.tencent.com/document/product/1207/108904)

### 本地接入材料

[备份配置](../../deploy/backup-config.example.json)与[CAM 用户策略](../../deploy/cos-backup-policy.example.json)采用同一独占前缀：

`phonograph-backups/e57796e4-d131-4652-880e-a3c0613369c5/`

前缀内已分别完成正向探针和 ACL 私有对照对象的写入、读取和删除；没有在控制台创建文件夹，也没有写入生产索引或备份包。策略只用于专用 CAM 子用户关联，不是桶策略；权限覆盖索引和 `.tar.age` 对象，删除只覆盖后者。上传要求 private ACL，额外授权头必须缺省或为空，具体限制见运维手册第 6 节。

备份配置示例中的 releaseId 属于此前 COS 预检时的 ad23f36 历史记录；当前线上版本已经是 f2b6892，后续真正配置生产备份时须核对当时 current。正式 age 公钥及服务器备份配置尚未安装，之前临时注入 COS 凭据不等于生产备份配置就绪，不直接运行备份或初始化索引。

### CAM 创建经过与已批准的密钥置换

原审批只覆盖策略创建。向导在最终审阅页之前已经产生云端变更：15:08:43 创建用户及密钥，15:13:38 关联策略。用户确认只完成验证码、未点击最终“完成”；代理误把前面的“下一步”视为纯准备操作。记录这一事实，不把已发生变更补记为已批准，也不再次推进旧创建向导。后续停用、替换或删除密钥均需具体批准。

腾讯云说明 SecretKey 只在创建时提供保存机会，后续不能查询。[访问密钥管理说明](https://cloud.tencent.cn/document/product/598/37140)

随后用户明确批准停用 15:08:43 创建的旧密钥（保留、不删除），并自行创建一把替换密钥。旧密钥停用经过用户微信验证，页面已回读“已禁用”；用户确认“新密钥已保存，弹窗已关闭”，随后确认两把密钥为旧禁用、新启用，并批准临时凭据输入及一次 COS 测试。代理未读取 SecretKey；只记录元数据和操作结果，不把这次批准追溯用于之前的创建偏差。

### COS 联调工具与服务器实测

[独立脚本](../../deploy/cos-smoke-check.mjs)默认输出离线计划；[测试](../../deploy/cos-smoke-check.test.mjs)使用 Node 自带测试器和内存中的 COS 替身。本地测试不读取服务器文件、不使用真实凭据、不请求 COS。

- 唯一目标对象：`phonograph-backups/e57796e4-d131-4652-880e-a3c0613369c5/cos-smoke-20261019-6fca0dca-24d1-4ac0-8cc8-28e0ce9b3281.tar.age`。
- 只读来源：`/var/tmp/255-phonograph-age-verify-20261016/plain.txt.age`，已核对为普通文件、非链接，259 字节、0600、uid/gid 1000。密文 SHA-256 为 `49700c92dbe430571fcf13b52c5284cfe09da442b4c49454ca4d24b93d1f325b`，不同于第三节的明文哈希。
- 下载仅进入有长度上限的内存流；不写下载文件，不重复 age 加解密测试。该输入是加密合成文本，不是 tar 备份；后缀只用于匹配现有策略，不构成恢复验收。
- 上传要求 private ACL、禁止覆盖；先 HEAD 确认不存在，再上传、HEAD 校验长度、GET 校验 SHA-256、删除，最后 HEAD 确认不存在。遇到已有对象、异常、版本标记或不确定状态就失败；不自动清理失败后可能存在的对象。
- 使用现有四项对象权限，无临时策略变更。测试键位于既有前缀，是名称和数据隔离，不是额外的权限隔离；不操作 `index.json`。后续已完成指定前缀外/错误后缀 GET 拒绝及匿名读取/三种上传 ACL 拒绝；ACL 脚本已分别获批安装和执行，见下节。
- 已安装 `/var/tmp/255-phonograph-cos-verify-20261019/`（0700 ubuntu:ubuntu）及其中 `cos-smoke-check.mjs`（0600 ubuntu:ubuntu，10529 字节）。本地与服务器脚本 SHA-256 均为 `911eaadf9a4ad4157f79d90edbfdec5139553e077c2a2a1376bb2c295c87d0c2`；`node --check` 和 `--plan` 已通过。
- 用户以清空继承环境的独立 Bash 和隐藏输入将新凭据传给探针，没有将密钥放进命令参数、shell 历史或 backup.env。禁用 Node 编译缓存，报告仅输出终端；执行结束已回到外层提示符，不复用旧会话凭据。
- 真实执行返回 `ok: true`、`stage: complete`、`remoteState: absent`；源与下载均为 259 字节，SHA-256 与上述密文哈希一致。六阶段完成，指定测试对象已确认不存在。完整结果见[验收记录](private-cloud-acceptance.md#2026-10-19-密钥置换服务器探针安装与-cos-正向联调通过)，安装与执行边界见[手册第 14.4 节](private-cloud-runbook.md#144-服务器安装与-cos-正向实测已通过)。

### GET、匿名读取与上传 ACL 拒绝实测

用户已执行只读内存命令并回传 `ok: true`、`mutations: none`，四项全部通过：前后允许路径对照均为 `404 NoSuchKey`；前缀外路径和同前缀的 `.txt` 路径均为 `403 AccessDenied`，带有效 COS RequestId 和标准拒绝消息。没有创建测试对象或服务器文件。结果仅覆盖这些 GET 请求，不代表 PUT、DELETE、匿名访问或全部策略边界已验收。完整路径和原始 JSON 见[GET 验收记录](private-cloud-acceptance.md#2026-10-19-get-拒绝实测通过与-acl-探针本地开发)。

[ACL 脚本](../../deploy/cos-acl-check.mjs)和[离线测试](../../deploy/cos-acl-check.test.mjs)此前本地 33/33 通过；随后服务器安装、离线检查和一次真实执行已分别获批并完成：

- 固定新对象键：`phonograph-backups/e57796e4-d131-4652-880e-a3c0613369c5/cos-acl-20261019-526faf21-8a4f-4335-8e23-c488891d3c3f.tar.age`；与先前正向对象和 GET 对照对象不同，不使用生产 index.json。
- 复用既有 259 字节 age 合成密文和已确认 SHA-256，不生成密钥或读取生产数据。
- 先创建 private 对照对象，验证标记/大小/哈希/ETag，再验证该已存在对象的匿名 GET 被拒绝；确认归属后删除。随后依次尝试遗漏 ACL、default、public-read，均要求明确 AccessDenied，并以带签名的 GET 确认 NoSuchKey。
- 正常 17 次请求；任一异常停止后续测试。意外 PUT 成功或响应丢失时，最多额外核验本次对象并清理，整次最多 21 次请求。已有对象、409/412 冲突、版本标记或归属不明时不盲删，不重试 DELETE。
- 每次运行生成独立元数据标记；删除前核对标记、259 字节、SHA-256 及前后 ETag。测试期间必须独占该键；这些检查不能使检查与删除成为原子操作。
- 脚本 15730 字节，SHA-256 `e4ace48c7530557e79b910f3a79efebb6f63a12a0cef1d60846c62af76382f83`；默认/--plan 离线，不访问服务器或 COS；33/33 本地测试及两文件语法检查通过。
- 已安装 `/var/tmp/255-phonograph-cos-verify-20261019/cos-acl-check.mjs`（0600 ubuntu:ubuntu，15730 字节），复用已存在的 0700 ubuntu:ubuntu 目录；服务器哈希与本地一致，`node --check` 和 `--plan` 通过。安装与执行审批分开，详见[手册第 14.6 节](private-cloud-runbook.md#146-匿名读取及上传-acl-探针实测通过)。

- 用户确认前提并批准一次实测及条件清理后，以隐藏输入和临时子进程环境提供替换凭据，回传 `ok: true`、`stage: complete`、`remoteState: absent`。运行 ID 为 `8b7fbf4f-42c9-49cc-92fd-f789060f4208`；anonymous-read、acl-omitted、acl-default、acl-public-read 四项均为 `403 AccessDenied`，带有效 RequestId。
- 清理记录仅有 `private-fixture-cleanup: deleted-verified`，没有触发意外写入后的条件恢复；四项通过不能视为该恢复分支已被云端实测。完整 JSON 见[最新 ACL 验收记录](private-cloud-acceptance.md#2026-10-19-acl-探针安装与匿名读取上传-acl-拒绝实测通过)。没有公开上传成功或对象遗留的报告；不将结果外推为全桶、全部策略或正式备份验收。

### 后续备份子路线（保留验收项，非当前开发主线）

1. ACL 安装和实测已完成，保留服务器脚本及原 age 证据，不自动重跑。备份子任务开始时先只读核对现有 CLI、配置模板与正式 age 公钥/凭据交接要求，列出完整演练的文件、数据和停机范围后另批。功能开发继续按上方路线推进，Git 提交/推送另批。
2. 复用现有 CAM 用户、策略、已保存的替换密钥和服务器探针，不重复创建、置换或重跑正向测试。旧密钥保持禁用并保留，删除须另批。
3. 单独整理尚未验收的 grant 条件和标准 COS 费用估算差异。若开展新的 grant 拒绝测试，先明确合法请求形式、唯一合成键、接收主体和清理范围，再申请批准；不因本次四项通过而跳过这些边界，也不擅自放宽策略。
4. 在所有者选定设备完成正式 age 私钥保管和副本验证，再分别批准正式公钥、backup.json、backup.env 安装及生产空索引初始化；已有索引时停止核对，不删除或重建。临时使用凭据不表示正式配置已安装。
5. 批准停机窗口和备份范围，验证完整备份、下载、解密及全新目录恢复；保留现有 age 合成证据和 COS 探针，不将测试私钥用于生产。
6. 再验证 flock 冲突、硬终止补偿和服务恢复；完成标准 COS 费用估算适配及验收后，才准备定时器启用。
7. apex DNS/HTTPS 和首页访问已通过用户验证；剩余 www、真实音频与设备体验、整机重启/回滚及试运行分别补齐，不重复搭建已完成的入口。

## 五、服务器保留位置

| 项目 | 位置 |
| --- | --- |
| 正式发布目录 | `/srv/255-phonograph/releases/f2b6892a1616421c62ce4faeeb4ee62315870636`；current 已指向此目录 |
| 保留的旧 release | `/srv/255-phonograph/releases/ad23f3644498dd542357092c1aaca018e5c971d4`；不删除，实际故障回退尚未演练 |
| 本次构建与配置备份 | `/var/tmp/255-phonograph-deploy-f2b6892/`；`/etc/255-phonograph/phonograph.env.before-f2b6892` |
| 正式数据 | `/var/lib/255-phonograph`；未读取曲库内容 |
| 历史 ad23f36 源码包 | `/home/ubuntu/255-phonograph-ad23f36/`；保留证据，不作为当前 release |
| 历史 ad23f36 隔离根 | `/var/tmp/255-phonograph-linux-test-ad23f36/`，保留 source、app-data、logs、tmp、npm-cache |
| Linux 旧隔离根 | `/var/tmp/255-phonograph-linux-test-20260930/`，保留首轮失败证据 |
| age 隔离根 | `/var/tmp/255-phonograph-age-verify-20261016/`，十个文件保留 |
| COS 探针 | `/var/tmp/255-phonograph-cos-verify-20261019/` 下 `cos-smoke-check.mjs` 和 `cos-acl-check.mjs`，均为 0600 ubuntu:ubuntu；目录 0700，无下载或探针日志文件 |
| age 缓存包 | `/var/cache/apt/archives/age_1.2.1-1build1_amd64.deb` |

历史 PID 不用于直接 kill。换电脑不会搬迁服务器或继承旧终端环境，不因此重新安装、上传或初始化。真实曲库、密码和旧证据不自动读取、重置或清理。

## 六、跨电脑同步

已推送并上线的代码基线为 `f2b6892a1616421c62ce4faeeb4ee62315870636`。四份进度文档纳入本次后续文档提交；家中电脑继续开发前须拉取并核对远端分支，不能假定自动同步。四个 COS 文件仍未提交。在家上传歌曲直接使用正式后台，不需要同步源码；继续开发时，在另一台电脑的实际项目目录先只读检查：

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

## 七、给另一台电脑 Codex 的接续提示词

```text
继续开发 255-Phonograph，沿用已确认的 B“毛怪手帐”风格，界面暂时保持，后续按用户具体反馈调整。
先只读核对 codex/pc-music-player 分支与未提交改动，并阅读：
- docs/deployment/private-cloud-next-steps.md 的当前状态
- docs/superpowers/plans/2026-10-20-public-initial-release.md 的当前阶段进度
- docs/deployment/private-cloud-acceptance.md 的最新章节
- docs/deployment/private-cloud-runbook.md 当前发布信息和第 15 节实际 Caddy 配置
仓库：https://github.com/hanser-05-V/255-Phonograph.git

截至 2026-10-21 的已确认事实：
1. 代码已提交、推送且正式网站已上线 f2b6892a1616421c62ce4faeeb4ee62315870636。
   current=/srv/255-phonograph/releases/f2b6892a1616421c62ce4faeeb4ee62315870636。
   用户已回传 DEPLOY_OK；代理独立 HTTPS 11 项 GET 通过，页面和品牌资源匹配该版本。
   不因旧章节的“未发布”描述而重复部署，不把 localhost:4697 静态样板当作线上网站。
2. B 样式首页、独立 /music、迷你播放器、统一 ICP 页脚已正式接入。
   /goodnight-radio 是读书视频企划的独立空页面，视频上传/真实播放/后台尚未实现；
   每日一签仅禁用占位，暂缓开发。共享播放状态、歌词、频谱和恢复等既有行为继续复用。
3. 当前下一步是用户真实歌曲验收：后台登录→上传音频及按需封面/LRC→保存草稿→歌曲列表发布，
   刷新 /music 验证完整播放、拖动、切歌、跨页/刷新恢复，并检查桌面、手机和家庭网络。
   本地约 62.69 秒合成音频的验收已通过，不能替代真实素材和正式环境验收。
4. 管理员已初始化，匿名状态 needsSetup=false、authenticated=false；沿用既有密码。
   正式数据目录 /var/lib/255-phonograph，不重置密码、清空曲库或重新初始化。
   上传/发布内容不需要重新部署代码；目前没有新增真实上传结果回传。
5. ICP 蜀ICP备2026063099号-1 已通过；公安申请已取消，后续重新提交，不是等待审核。
   目标仍为 11月10日前公开初版，预留重提与补充材料时间；www、生产备份恢复等仍待验收。
6. DNS/HTTPS/Caddy 已打通，Caddy 实装配置见手册第15节，仓库模板仍含旧私用设置，不直接覆盖。
   旧 release ad23f36、配置备份 phonograph.env.before-f2b6892 和构建证据均保留。
   本次发布未触发真实故障回退，不把内存模拟当作服务器回退演练。
7. age/COS 合成探针已完成，保留历史结果与脚本，不重跑、不创建云资源、不读取或回传秘密。
   四个 COS 脚本/测试仍未提交；四份进度文档纳入后续文档提交，跨电脑须拉取并核对差异。
   原视觉样板是本地被忽略文件，不假定能随 Git 同步。

保留现有修改，不 reset、不清理、不覆盖。按用户最新 AGENTS.md，在任何文件写入前列明准确文件、
改动、影响及验证方式并获得明确批准；已有批准只覆盖原范围，扩大范围再次确认。
提交、推送、部署、云资源和真实数据操作分别确认；不自动派发子代理。
服务器操作沿用用户手动执行，一次一条命令并等待实际输出；当前不需要重复部署。
```

### 2026-10-20 补充：音乐馆保持独立页面

用户指出本地样板的音乐馆入口错误地滚动到首页下方，并批准 compare.html、PRODUCT.md、本文和初版计划四文件修正。现已补齐 `#music` 独立音乐馆样板，沿用 B 风格，复用封面兜底、迷你播放器和 ICP 页脚；主导航、首页“逛逛音乐馆”“全部歌曲”及晚安电台入口均进入该视图。正式 React 的 `/music` 页面本来就存在，下一阶段接入新样式时继续保留独立路由与共享播放器。

样板的分类、标签及歌曲信息均明确标为示例，不读取或修改线上内容。现有正式接口只公开被已发布歌曲使用的分类和标签；后台单独创建标签不会使其出现在前台。该规则本批仅核对，不修改。真实音频上传、发布与完整播放继续单独验收。当前改动没有提交、推送或部署。

### 2026-10-20 最新：正式候选版与下一次发布

1. 本地正式预览为 `http://localhost:4701/`，使用生产构建与仓库外隔离数据；4697 仍是静态样板。正式 `/music` 和 `/goodnight-radio` 为独立路由，切页不重建播放器。
2. 已完成 168 项客户端、38 项服务端上传/歌曲/媒体/曲库测试、前后端类型检查与构建。隔离合成 MP3 上传、草稿不可见、发布后歌曲及关联标签可见、媒体 Range 和浏览器播放已验证。
3. 已检查 320/390 手机、768 平板、1280 桌面布局；修正旧样式覆盖、手机按钮挤压和页脚留白。Taste 检查通过项与限制见验收记录。
4. 下一步先批准提交 28 个发布相关文件（本批 26 文件，加此前 SiteFooter.tsx、global.css），推送目标仍为 origin/codex/pc-music-player；四个 COS 文件和静态样板不随本次提交。得到固定提交 SHA 后再核对服务器并列准确部署范围。
5. 内容更新无需部署：在 https://255fm.cn/admin 登录，上传音频，保存草稿并发布，然后刷新 /music。只建标签或只存草稿不会公开显示；封面和歌词可按需上传。新 UI 部署成功后沿用原曲库和账号，不初始化或覆盖数据。
6. 尚未验收：此次线上部署、用户真实歌曲完整播放/拖动、家庭网络和真实手机体验、生产备份恢复。未提交、未推送、未部署；当前浏览器测试均为本地隔离合成数据。

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
