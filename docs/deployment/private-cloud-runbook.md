# 255留音机云端运维与公开初版交接手册

**最新接续：** 第 16 节记录正式界面候选、日常上传发布流程和待批准部署步骤；第 15 节仍是服务器实际公开 Caddy 配置。

当前状态更新于 2026-10-20：ICP 已通过，apex DNS、云防火墙 80/443、Caddy HTTPS 入口已由用户验证，首页可以公开访问；管理员已初始化。公安申请已由用户取消，待初版完善后重新提交。当前主线为丰富网站功能，目标见[初版路线](private-cloud-next-steps.md)和[实施计划](../superpowers/plans/2026-10-20-public-initial-release.md)。本批更新文档与公共页脚，服务器尚未部署这些源码改动。

公开入口的用户回传证据及实际获批配置见第 15 节。仓库 `deploy/Caddyfile`、`caddy.env` 示例及 drop-in 仍按旧私用设计，不直接用于覆盖当前公开入口。第 10–14 节保留当时的证据与审批边界；旧章节中的“未开放”“masked”不代表当前状态。COS 合成正向、GET 拒绝及四项 ACL 拒绝已通过，正式备份/恢复、grant 条件和计费未验收，作为发布配套事项继续保留。

设计依据：[规格](../superpowers/specs/2026-09-28-private-cloud-test-deployment-design.md)、[实施计划](../superpowers/plans/2026-09-28-private-cloud-test-deployment.md)。结果以[验收记录](private-cloud-acceptance.md)为准。

## 1. 采购及部署前输入

- 腾讯云成都二区实例 `lhins-856nphe0`，名称 `255-phonograph`，公网 IP `1.14.111.74`；原采购记录为锐驰型 2 核 2 GB、40 GB SSD、200 Mbps 峰值、无限流量，到期原值 `2026-12-31 11:53:38`、自动续费关闭，当前账单及到期状态未重查。2026-10-16 用户终端确认系统为 Ubuntu 26.04 LTS/x86-64。用途已改为面向粉丝，容量与访问方案需据此复核。
- 域名 `255fm.cn`；四川个人 ICP 已通过，号码 `蜀ICP备2026063099号-1`、备案网站名称“毛怪小站”。页面品牌“255 留音机”，重新申请公安备案时核对名称和实际内容。原公安申请已由用户取消，目前没有公安备案号；ICP 页脚先使用已取得的真实号码。
- 实际为同地域标准 COS 桶 `255-backups-1378821599`，成都 `ap-chengdu`，私有读写、单 AZ；指定合成测试对象已验证清理，不外推为当前全桶为空。原 Lighthouse 选型已被实际资源替代，计划只放加密备份与不含秘密的索引，不承担播放器媒体分发。
- `server/ops/health.ts` 仍使用 Lighthouse 历史费率、服务器 45 元/月和域名 39 元/年的参考基数。这些不是当前成交价或标准 COS 完整计费模型，原 49.24 元/月示例不能作为当前费用结论。标准 COS 还存在请求等计费项；优惠额度适用性尚未核实，恢复下载和所有保留副本均需计入。费用模型适配及当前价格/账单核对须在启用运维定时器前另行完成，本轮不修改健康代码。200 Mbps 峰值不能替代家庭访问实测。
- 采购前记录准确服务器 ID、IP、主机指纹、域名、桶名、独占前缀、续费周期和账单告警设置；不得用示例值填充生产配置。实名材料在服务商官方页面处理。

官方参考（采购前重新核对）：[服务器价格](https://cloud.tencent.cn/document/product/1207/73452)、[域名价格](https://buy.cloud.tencent.com/domain/price?intl=0&source=newDNSPod&type=overview)、[备案资源要求](https://cloud.tencent.com/document/product/243/18908/)、[标准 COS 与轻量对象存储的计费及能力差异](https://cloud.tencent.com/document/product/1207/108904)。原轻量价格仅作历史记录，不套用到新桶。

## 2. 固定版本与本地证据

本地已有验证环境为 Node.js 24.16.0；官方 `cos-nodejs-sdk-v5` 3.0.0、`tar` 7.5.22 均精确锁定。服务器历史交接版本为 Node 24.21.0、npm 11.19.0、Caddy 2.11.4、systemd 259；2026-10-16 再次核对 Node 24.21.0，并安装 age 包 1.2.1-1build1，age 与 age-keygen 均输出 1.2.1。2026-10-19 已取得真实 age 合成文本测试证据。Fail2ban 本轮未检查。2026-09-30 工程检查为客户端 163/163、服务端 294/294、类型检查和构建通过；完整恢复、Caddy 入口、systemd 故障补偿和 Fail2ban 匹配仍待验收。

2026-09-29 已获批完成开发依赖安全更新：Vite 固定 7.3.6，Vitest 及 @vitest/mocker 固定 4.1.11。此前残留的 GHSA-82fw-gwwq-j7x9 已不再出现在当日 npm audit 报告；当日所有级别均为 0、退出码 0，本次没有重跑 audit。当日客户端 163/163、服务端 270/270、类型检查和生产构建通过；2026-09-30 成都适配后服务端为 286/286，客户端仍为 163/163，类型与构建通过。失败和复验历史见[验收记录](private-cloud-acceptance.md)。升级报告使用忽略目录 `.verification/private-cloud/vitest4-*.log` 与 `vitest4-audit.json`，成都适配报告在 `.verification/private-cloud/chengdu-ubuntu26/`，均不提交。

本地服务端验证须将 TEMP/TMP 指向已批准的仓库外隔离目录；2026-09-30 适配使用 `C:\Users\Administrator\AppData\Local\Temp\255-phonograph-chengdu-ubuntu26-20260930\`。此前 Vitest 4 升级目录保留为历史产物，不复用或清理。初始化及运维路径校验会拒绝代码目录内的数据路径，不能为了测试通过关闭这项保护。该本地目录不作为 Linux 部署数据路径。不启用公网 Vite 开发服务器或 Vitest UI；运行服务使用生产构建和 Fastify。

应用发布版本必须对应实际获准提交的 40 位 SHA。历史 Linux 验证源码为 `ad23f3644498dd542357092c1aaca018e5c971d4`；正式进程 cwd 和 current 指向该 SHA 命名的目录，本轮未重新校验发布文件哈希。本轮编辑前本地开发分支 HEAD 为 `871fdd5a8b31d7664b0b2f7ba27ca9db62f8c16a`；仓库模板修改不改变服务器版本，安装配置前重新核对当前发布 SHA。

Ubuntu 26.04 主机预检、Node SQLite 基础检查、Linux 工程及本机应用验证已有用户终端证据，完整上线验收仍未完成。服务模板和本手册统一使用 `/opt/255-phonograph/node24/bin/node`；当前进程实际解释器为 `/opt/255-phonograph/node-v24.21.0-linux-x64/bin/node`。构建时核实 PATH 首项、node 版本、process.execPath 与 npm 所用解释器。phonograph.service 已运行；指定布局/权限的新证据见第 14 节，未读真实曲库或完整环境文件。切勿重复创建服务或初始化数据。

## 3. 帐号、文件和网络边界

以下为目录与权限约定，已实测的子集见第 14 节；未检查的文件不能由父目录权限推断。当前已有正式应用服务，执行前复核必要状态，禁止将已有数据当空目录重复初始化。

| 目录或文件 | 所有者及访问 | 目的 |
| --- | --- | --- |
| `/srv/255-phonograph/releases/<SHA>/`、`current` | root 所有，应用用户只读，current 仅链接已验证发布目录 | 代码和静态构建；不放运行数据。 |
| `/var/lib/255-phonograph/` | phonograph:phonograph，0700 | 数据库、初始化标记、正式和临时媒体；路径及祖先不得是链接。 |
| `/var/backups/255-phonograph/` | root:root，0700 | 快照、密文包、恢复暂存；不对外提供。 |
| `/var/lib/255-phonograph-ops/` | root:root，0700，状态文件 0600 | 备份事务日志和健康结果。 |
| `/etc/255-phonograph/` | root 所有；环境文件和 JSON 0600 | `phonograph.env`、`backup.env`、`backup.json`、`caddy.env`、`age-recipients.txt`。 |
| `/run/255-phonograph/` | root:root，0755，维护文件 0644 | Caddy 只读维护状态；应用不可写。 |
| `/run/255-phonograph-backup.lock` | root 所有 | 所有备份/恢复操作共用 flock。 |
| `/var/lib/caddy/`、`/var/log/caddy/` | caddy 所有，独立持久化 | 证书和脱敏日志；不允许读曲库、运维状态或私钥。 |

使用独立 `phonograph` 系统用户，无交互登录；应用单进程监听 `127.0.0.1:3001`。只开放 80/443；SSH 仅批准的维护来源和密钥登录。变更防火墙时保留当前 SSH 会话，先验证第二个连接可用再收紧；不要关闭唯一管理入口。3001、数据库和备份目录不得向外网开放。

云端写入审批需要把上述 `<SHA>`、资源 ID、桶前缀和所有确切路径补齐，同时列出官方软件安装、账号、五个 systemd 单元、Caddy drop-in、Fail2ban、journald 文件及运行产物。初始化可使用临时 systemd 运行命令，也需在部署审批中列明。

## 4. 构建与首次初始化

获准后在 Linux 发布目录用锁文件 `npm ci`，执行客户端/服务端测试、类型检查和构建；不复制 Windows 的 node_modules。构建成功且审查发布清单后，生产可保留 `dist/`、`server-dist/`、生产依赖和必要 package 文件；不能包含测试临时数据、真实媒体、密钥、数据库、迁移包或 `.verification`。

将 [应用配置模板](../../deploy/phonograph.env.example)的域名和 releaseId 替换为已批准真实值，放 `/etc/255-phonograph/phonograph.env`。`PHONOGRAPH_DATA_DIR` 必须是独立绝对路径，云端 Origin 必须是 HTTPS 默认端口且不带路径、查询或凭据。

仅对不存在或空的目标目录执行一次独立初始化；该命令结束后退出，不监听端口。下面是待批准命令，工作目录和环境由 systemd 明确提供：

```sh
sudo systemd-run --wait --collect --pipe --unit=phonograph-initialize \
  --property=User=phonograph --property=Group=phonograph \
  --property=WorkingDirectory=/srv/255-phonograph/current \
  --property=EnvironmentFile=/etc/255-phonograph/phonograph.env \
  /opt/255-phonograph/node24/bin/node /srv/255-phonograph/current/server-dist/server/index.js --initialize-data
```

初始化生成 schema、过渡记录和运行时示范媒体，并写 `.initialized.json`。半成品或已有数据库一律拒绝覆盖，不能通过删除数据库解决失败。普通 service 不得保留初始化开关；缺失标记、数据库或有效 schema 时必须失败关闭。

## 5. 入口与管理员

当前公开站点采用第 15 节记录的配置：Caddy 反向代理回环 3001，普通首页/音乐馆无需入口密码，后台沿用应用管理员会话。`needsSetup=false` 证明管理员已初始化，不代表已完成真实 HTTPS 后台登录和上传验收。现有密码不重置，数据不重新初始化。

下面保留旧私用模板的用途说明，不能把它当作当前服务器配置或执行指令。若需要恢复全站私人访问，需重新列明配置、影响及批准范围；当前继续公开初版开发。

旧私用 [Caddyfile](../../deploy/Caddyfile) 从 `/etc/255-phonograph/caddy.env` 读取 `PHONOGRAPH_DOMAIN`、`PHONOGRAPH_GATE_USER`、`PHONOGRAPH_GATE_HASH`。域名只含主机名；用户名限定普通字母数字，密码哈希通过 Caddy 交互式 `caddy hash-password` 生成，避免把明文密码写命令参数或聊天。哈希同样不进 Git、报告或终端回传。

Caddy 的 systemd 环境文件由服务管理器读取，不需要给 caddy 用户读取其他秘密文件的权限。[drop-in](../../deploy/caddy-service.conf)要结合官方服务的原有路径保护验证；确保 `/run/255-phonograph` 已获准创建，否则只读路径不存在会阻止 Caddy 启动。

全站 Basic Auth 覆盖首页、静态文件、API、音频 GET/HEAD/Range；后台另需已有管理员会话。退出后台不会清除浏览器入口凭据。撤销入口访问须更换入口凭据，并在新浏览器会话验证。未发布媒体在普通媒体接口中不可读，即便管理员已登录；不新增草稿预览接口。

Caddy 先认证再返回维护 503，移除上游 Authorization，重写真实转发 IP；Fastify 仅信任回环代理，检查 Host 和管理写入 Origin。云端会话带 Secure、HttpOnly、SameSite=Strict。登录/设置/改密每 IP 5 次/分钟、全站 20 次/分钟，限流不影响媒体读取。

本阶段所有响应使用私人不缓存策略，不加 CDN 或跨域允许；音频不整文件缓冲、不压缩变换字节。220MB 入口上限需用应用 200 MiB 音频边界加 multipart 开销实测。

## 6. 备份密钥和对象权限

用户说明公司和家中的电脑均由本人使用，不再因地点推迟开发。生产 age 密钥仍待批准具体生成和保存位置，私钥在服务器之外保管并验证副本。服务器只放公钥 recipients 文件；已有两把服务器测试密钥只用于合成演练，不用于生产。私钥不进项目、聊天或命令行参数。独立恢复时单独批准私钥使用位置与方式。

[备份配置模板](../../deploy/backup-config.example.json)已填入桶 `255-backups-1378821599`、地域 `ap-chengdu`、站点 Origin `https://255fm.cn` 及最近运行版本 `ad23f3644498dd542357092c1aaca018e5c971d4`。安装前复核 releaseId 与 current；不要用仅修改文档的提交 SHA 代替服务器实际运行版本。成都二区不是地域参数，不填 `ap-chengdu-2`。生产配置、正式 recipients 与访问凭据尚未安装，模板中的非空值不代表可以执行备份。

独占对象前缀固定为 `phonograph-backups/e57796e4-d131-4652-880e-a3c0613369c5/`。指定合成测试对象已完成写入和条件清理，正式索引/备份包尚未安装，不必上传空文件夹标记。更换前缀必须同时审查配置、策略与旧索引恢复路径，不能让例行备份自动创建新索引。

[CAM 用户策略模板](../../deploy/cos-backup-policy.example.json)已对应现有策略 `phonograph-backup-prefix`（ID `290399112`，版本 1），并已直接关联 `phonograph-backup`（UIN `100053927521`）。先前只读回读确认用户禁止控制台登录、用户组 0、仅此策略。复用现有资源，不重新创建或覆盖；创建经过与审批偏差见第 14.2 节。模板不含 principal，不能直接作为存储桶策略提交。

| 操作 | 限定资源 | 用途与条件 |
| --- | --- | --- |
| GetObject、HeadObject | 该前缀的 `index.json` 和 `*.tar.age` | 读取索引、检查密文长度、下载已知回执对应密文 |
| PutObject | 同上 | 必须携带 `x-cos-acl: private`；五项 x-cos-grant-* 授权头必须缺省或为空 |
| DeleteObject | 仅该前缀的 `*.tar.age` | 七份轮换所需的旧密文删除；不授予索引删除 |

资源中的 `uid/1378821599` 使用桶 APPID，不是主账号 UIN。没有列桶、桶管理、改 ACL、删除索引、multipart 或其他前缀权限。索引仍可由 PutObject 覆盖以更新成功集，这不是不可变备份；`.tar.age` 通配符限定键名，不能验证内容是否加密，实际上传必须通过 age 加密及校验流程。当前 SDK 仅用四类对象接口，HTTPS 由客户端设置；不需要为控制台显示文件列表额外授予 GetBucket。

策略采用受限 allow，须配合无其他授权的专用子用户；用户组、其他 CAM 策略或资源策略可能另外赋权，因此操作前按需复核有效权限。不要附加全量 COS 策略或允许控制台登录。旧密钥已禁用保留，替换密钥启用并安全保存由用户确认；已用于获批合成实测，不重新生成。后续生成/替换、停用、落盘分别审批；正式 `/etc/255-phonograph/backup.env` 仅含 `PHONOGRAPH_COS_SECRET_ID`、`PHONOGRAPH_COS_SECRET_KEY`，root:root 0600，最近检查时尚未安装。探针已通过隐藏输入临时注入进程环境完成，不向聊天回传值，不放命令行参数，不复制完整应用环境。手工恢复可另准备只读身份。

官方依据：[策略语言与资源路径](https://cloud.tencent.com/document/product/436/18023)、[条件键](https://cloud.tencent.com/document/product/436/71306)、[private ACL 与禁止附加授权头示例](https://cloud.tencent.com/document/product/436/71307)。本地静态检查不能替代 CAM 平台校验和实际权限测试。

先单独批准准确测试对象键、合成密文来源、下载方式、凭据使用及删除范围。第 14.3 节使用现有前缀下的专用测试键，不新增前缀权限，不改变策略；这是名称/数据隔离，不代表身份没有操作正式索引的能力。先验证 put/head/get/delete 和下载 SHA-256，前缀外拒绝与公共访问拒绝另列范围验证。不能把网络错误或任意 403 当权限通过。生产 index.json 不参与这一步；不通过备份命令联调，避免停正式应用。

随后才批准正式公钥安装、生产配置和空索引初始化。已有索引时命令拒绝，例行备份遇到 404 不自动重建。以下是后续生产初始化材料，当前未授权执行：

```sh
sudo /usr/bin/flock --nonblock --conflict-exit-code 75 /run/255-phonograph-backup.lock \
  /opt/255-phonograph/node24/bin/node /srv/255-phonograph/current/server-dist/server/ops/cli.js initialize-index \
  --config /etc/255-phonograph/backup.json
```

上述手工命令执行前，需在权限受限的 root 会话注入获准 COS 环境变量，或通过读取 EnvironmentFile 的临时 systemd 单元运行；命令本身不会自动读取 `backup.env`。不要把密钥展开进命令行。未经批准不运行。

## 7. 日常备份与失败处理

确认路径权限、工具和隔离故障测试后，才安装 [备份单元](../../deploy/systemd/phonograph-backup.service)及 [05:00 定时器](../../deploy/systemd/phonograph-backup.timer)。`Persistent=false`，错过时不会开机立即停服补跑。先经批准手动 `systemctl start phonograph-backup.service` 验证，再启用定时器。

备份先查空间和远端索引，再记录原应用状态、进入维护、停止应用、确认退出、快照；随后恢复服务并确认健康，才加密、上传、核实长度和更新索引。应用原本停止则退出。快照目标 10 分钟内结束，整个服务任务 30 分钟上限；超时/强制终止由 ExecStopPost 在同一 flock 下按可信日志恢复此前运行的服务，不恢复数据库。恢复失败仍保留维护标记。

索引仅保留最近七份成功备份；先持久化新索引，再删除准确的旧对象键。失败上传不能替换旧成功集。删除失败保留 pendingDelete，下次重试。单个密文包最多 4 GiB，超出需要另行调整容量方案；本阶段不使用 multipart。

`state.json` 保存 phase、上次成功时间、服务恢复状态和确切密文回执。崩溃在索引提交之后时按该回执核对；上传阶段失败保留本次密文和回执，下次可重试相同键。丢失本地包、索引重放/缺失、无法确认孤立对象时停止并人工核对，不能扫描或清空桶。保留的失败快照会占空间，清理前列出确切路径和恢复影响，不自动删除其他任务或正式媒体。

维护期间不要同时人工停止/切换应用。需要人工介入时先明确结束备份并验证补偿结果；不要删除状态文件来强行解锁。75 表示锁已被其他任务持有，不代表产生新备份。

健康单元设计为每 15 分钟把 JSON 写入受限 `health.json` 并记入 journal，目前未启用。磁盘 80% 警告、90% 拒绝新上传；备份超 24 小时、服务恢复异常、索引不可读均有警告。容量统计包含 active、pendingDelete 和已知待确认包；预算 45/50 元警告仍基于旧 Lighthouse 模型，不能证明当前标准 COS 费用受控。启用定时器前另行修正并验收费用模型；不因此静默停止备份或缩短七份保留期。没有配置外部通知渠道。

## 8. 隔离恢复与版本回滚

每次恢复先批准备份编号、解密私钥使用方式、全新绝对目标目录、下载流量和保留范围。目标不允许在当前数据、运维或代码目录中，且必须不存在。下载回执校验密文 SHA，安全解密后校验数据库及全部媒体引用；在副本撤销旧会话和待完成上传，再重建清单。原备份、源曲库及密码哈希保留。

```sh
# Replace the literal placeholders only after the concrete restore paths and UUID are approved.
sudo /usr/bin/flock --nonblock --conflict-exit-code 75 /run/255-phonograph-backup.lock \
  /opt/255-phonograph/node24/bin/node /srv/255-phonograph/current/server-dist/server/ops/cli.js restore \
  --config /etc/255-phonograph/backup.json --id APPROVED_BACKUP_UUID \
  --identity-file /APPROVED/EXTERNAL/IDENTITY --target /APPROVED/NEW/RESTORE_DIRECTORY
```

这条命令不会自动切换运行目录。先用 verify 和隔离实例验证记录、权限、密码及播放，再单独审批切换。历史备份可能恢复当时存在、后来永久删除的歌曲；明确恢复点之后哪些变更会丢失，不改现有永久删除交互。

仅代码兼容回滚可切换 `current` 到已验证版本并重启，继续使用同一数据目录；涉及 schema 或数据的回滚须先恢复相配代码、数据库及媒体到新目录，不能用旧代码直接覆盖新结构。回滚不撤销私人入口、不开放 3001。本地真实曲库迁移默认不做；如有需求另行盘点、备份、校验和审批，并确定唯一可写主库。

## 9. Linux 和家庭验收门槛

首先在获准隔离环境运行全量工程检查，以及 `caddy validate`、`systemd-analyze verify`、`fail2ban-regex`；对应可执行文件和路径必须真实存在。Caddy 校验不向聊天输出含哈希的 adapt 结果。合成 Fail2ban 日志预期仅捕获 192.0.2.10、2001:db8::10、192.0.2.13，不能捕获伪造的 192.0.2.99。[jail](../../deploy/fail2ban/phonograph.local)在真实日志校验前保持 disabled。

验证入口 401、合法用户网页、后台第二层权限、跨站拒绝、Range=206、HEAD 空正文、下架后 404、维护 503、3001 外部不可达、日志无凭据。故障注入要覆盖硬终止、锁冲突、空间不足和恢复失败。journald 全局容量模板只适用新专用主机。

真实音频文件尚未提供或批准。MP3/M4A、封面/LRC 上传、取消/断网、播放、前后拖动、恢复进度、自动下一首及家庭网络体验必须补验；不得用合成接口测试标为通过。连续三天试运行含一次服务器重启、重新部署、两次定时备份，以及远端下载解密恢复演练后，才能评价个人测试可用性；不宣称正式公开上线。

## 10. 2026-09-29 采购与部署准备补充（历史关口）

本节补充第 1–3、9 节的当前事实。用户已批准更新本手册、验收记录和实施计划三份文档；授权仅限材料准备，不包含采购、资源创建、安装软件、Linux 测试产物、部署、真实数据操作、提交或推送。未完成的执行输入继续标为待填。

### 10.1 已核实的本地与 Linux 条件

- 实际工作树为 `E:\codex\hanser\.worktrees\pc-music-player`，分支 `codex/pc-music-player`，HEAD 为 `000e3344f0f5dfb06e8ce18c689efdc716cd8f8d`；本窗口以 `git ls-remote` 重新确认远端 main 和开发分支同值。首次沙箱内查询遇到 Windows TLS 凭据错误，只读权限重试成功，没有 fetch 或修改引用。
- 工作树累计 62 项变更：20 个已修改、42 个未跟踪，暂存区为空。主仓库迁移包保留，无点路径 `E:\codex\hanser.worktrees\pc-music-player` 不存在。已有 Vitest 4 验证日志与锁文件吻合，本次只读检查未重跑测试、构建或 audit。
- `wsl --status` 在沙箱内及主机只读复核均返回 50，未发现当前用户的 WSL 发行版登记；PATH 未发现 Docker、Podman、Caddy、age，常见 Docker Desktop、VirtualBox、VMware 安装路径未发现程序。结论限定为“未发现可用的现成 Linux 环境”，不据此断言所有磁盘上均无其他安装。
- Windows SSH 客户端可用，但尚无获准目标服务器。安装 WSL、虚拟机、容器或服务器软件均不在本次文档授权内。
- 参数差异：实施计划 Task 9.2 的历史示例为 `TimeoutStopSec=30`，当前 `deploy/systemd/phonograph.service` 为 `TimeoutStopSec=90`。本次只记录差异，不改模板，也不认定 90 秒已通过实测。Linux 验证须按实际模板检查正常停服、超时、确认进程退出后才快照及备份补偿；需要改变模板时另列范围审批。

### 10.2 待核对订单与费用

以下是 2026-09-29 核对的公开价格和既定选型，不是账号内成交报价。

| 项目 | 待购买范围 | 已核实价格与待确认项 |
| --- | --- | --- |
| 服务器 | 腾讯云上海，Linux 锐驰型 2 核 2 GB、40 GB 系统盘，Ubuntu 24.04，三个月 | 官方内地套餐标价 45 元/月，三个月按 135 元预估；账号内核对上海库存、镜像、实际订单金额及续费价。缺货或变价时重新确认，不自动换区或升配。 |
| 域名 | 用户选定的普通非溢价 `.cn`，一年 | 官方价格页同时展示首年 33/39 元，按 39 元预留，普通续费标价 38 元/年；可注册性、特殊名称和最终结算价格待确认。域名候选待用户提供。 |
| 备份 | 上海私有 Lighthouse COS，标准存储按量计费 | 0.00393333 元/GB/日，公网下行 0.5 元/GB；官方计费表列上行及内网流量免费。实际桶产品、访问链路、对象权限及账单仍待核实。 |

来源：[服务器价格](https://cloud.tencent.com/document/product/1207/73452)、[域名价格](https://buy.cloud.tencent.com/domain/price?type=overview)、[Lighthouse COS 价格](https://cloud.tencent.com/document/product/1207/88189)、[Lighthouse COS 计费项](https://cloud.tencent.com/document/product/1207/80959)。本次 Lighthouse COS 能力对比页读取失败，不能把此前资料或 SDK 单元测试当作本次真实 API 能力验证。

首笔服务器与域名预留 `45 × 3 + 39 = 174` 元，备份另计。以全部备份日均合计 10 GB、30 天且无公网恢复下载估算：`45 + 39 / 12 + 10 × 0.00393333 × 30 ≈ 49.43` 元/月。GB 按产品计费口径换算；七份完整包、轮换期间的新包、待删除及失败遗留对象都需计入，10 GB 不是每份额度。单包仍受现有 4 GiB 上限约束；容量增加或恢复下载会增加费用。

订单只包含上述批准后选定的项目：不开自动续费，不加额外数据盘、商业证书、CDN、安全套餐或付费控制面板。记录首付、续费周期、到期日和费用提醒方式；预算提醒不保证硬停费。

### 10.3 备案材料与顺序

1. 用户提供域名候选及拟个人备案省份，核对实际服务用途、网站名称与当地管局要求。服务器位于上海不代表备案主体必须在上海；本阶段不猜测省份或保证网站名称获准。
2. 用户在腾讯云官方渠道完成账号实名、域名购买及域名实名。个人备案的账号实名、域名所有者及备案主体信息按官方要求保持一致；聊天和仓库只记录完成状态，不收集身份证件、完整住址或视频材料。
3. 备案用中国内地轻量服务器须包年包月购买累计至少三个月，备案期间剩余有效期至少一个月。采购后核对资源资格；若等待导致剩余期不足，续费需另行确认。
4. 按所属省份清单在官方备案流程提交身份材料、网站信息及视频核验，完成要求的短信核验；补充材料和审核期限以实际通知为准。网站内容分类或审批要求存在疑问时，由用户向官方备案渠道确认真实用途，不把“仅本人使用”当作自动豁免。
5. 备案期间仅在另行获准范围准备服务器内部环境；备案成功后再配置域名网站访问，并完成 HTTPS 与两层认证验证。根据腾讯云备案流程，开站后 30 日内办理公安备案，相关材料仍只在官方渠道处理。

依据：[备案限制与省份](https://cloud.tencent.com/document/product/243/18911)、[备案域名](https://cloud.tencent.com/document/product/243/18905)、[备案资源](https://cloud.tencent.com/document/product/243/18908/)、[备案材料](https://cloud.tencent.com/document/product/243/18914)、[备案流程](https://cloud.tencent.com/document/product/243/39038)。具体个人备案省份和域名未定，本节不是已提交或已通过备案的记录。

### 10.4 Linux 验证环境审批材料

如决定使用未来购买的专用 Ubuntu 24.04 服务器完成隔离验证，须先明确接受“采购先于 Linux 验证”的顺序例外，再分别批准采购与环境写入；文档批准不表示已选择或授权该例外。也可由用户提供现成的获准隔离 Linux 环境。两种情况下未执行的检查都保持未完成。

环境批准前须列出：主机身份、系统与工具版本、官方安装来源、代码来源、构建目录、npm 缓存、日志目录、仓库外 TEMP/TMP、合成数据与备份/恢复目录、临时测试密钥路径、服务与端口以及清理范围。所有路径使用该环境的确切绝对路径，不能套用上一轮 Windows 临时目录授权。测试数据与 `/var/lib/255-phonograph` 正式目录分开，禁止弱化现有数据路径保护。

验证范围对应计划 6.6、8.4、8.6、9.2–9.5、10.3–10.6：

- Linux 安装锁文件依赖后运行工程回归和生产构建，记录实际版本；不复制 Windows 的 node_modules。
- 使用真实 `caddy validate`、`systemd-analyze verify`、`fail2ban-regex`，确认工具、服务引用路径和权限实际可用；Fail2ban 通过真实日志匹配前保持禁用。
- 隔离入口验证 401、后台独立会话、Origin、206、HEAD、下架 404、维护 503、3001 外部不可达及日志脱敏；本地测试证书或测试域名配置也须纳入环境写入范围，不自动申请真实域名证书。
- 使用合成夹具和测试 age 密钥验证加密、错误密钥、截断、校验与隔离恢复；真实 flock、强杀、超时和恢复失败需做故障注入。
- 验证环境重启、维护目录重建与服务启动顺序、兼容版本切换及恢复后的记录/hash/密码保持、旧会话撤销。真实 COS、家庭音频和三天试运行继续分别验收。

### 10.5 远端执行前必须补齐的资源与路径

| 范围 | 执行前填写或逐项批准 | 验证方式 |
| --- | --- | --- |
| 主机和连接 | 实例 ID、公网 IP、SSH 主机指纹、维护来源、密钥文件使用方式、操作系统及安装版本 | 通过可信渠道核对指纹；保留现有连接并验证第二条 SSH 连接，再收紧防火墙。 |
| 应用版本和构建 | 经单独批准提交的真实 40 位 SHA；Linux 构建、npm 缓存、日志及产物目录 | 审查发布清单与 hash，排除密钥、数据库、媒体、迁移包和验证目录。当前基线 SHA 不代表未提交的新实现。 |
| 发布和业务数据 | `/srv/255-phonograph/releases/<实际 SHA>/`、`/srv/255-phonograph/current`、`/var/lib/255-phonograph/` | 替换实际 SHA 后批准；仅空目标初始化，重启保留记录，缺库/标记拒绝启动。 |
| 应用与备份配置 | `/etc/255-phonograph/phonograph.env`、`backup.env`、`backup.json`、`caddy.env`、`age-recipients.txt` | 填实际域名、SHA、桶及前缀；核对所有权和权限。密码、云密钥及哈希不进入材料，解密私钥由用户在服务器外保管。 |
| systemd | `/etc/systemd/system/phonograph.service`、`phonograph-backup.service`、`phonograph-backup.timer`、`phonograph-health.service`、`phonograph-health.timer` | 后四项均位于同一目录；逐个批准安装及启停/启用动作，验证配置、状态、停服补偿与下一次执行时间。 |
| 入口与日志 | `/etc/caddy/Caddyfile`；Caddy drop-in 的确切路径待填；`/var/lib/caddy/`、`/var/log/caddy/`；`/etc/systemd/journald.conf.d/phonograph.conf` | 私人入口和证书联调、日志脱敏、容量和最小权限；全局日志模板仅用于新专用主机。 |
| Fail2ban | `/etc/fail2ban/filter.d/phonograph.conf`、`/etc/fail2ban/jail.d/phonograph.local` | 合成与真实日志匹配、封禁及自动解除，不封 SSH。 |
| 运维和网络 | `/run/255-phonograph/`、`/run/255-phonograph-backup.lock`、`/var/lib/255-phonograph-ops/`、`/var/backups/255-phonograph/`；云端与主机防火墙 | 维护标记、互斥、权限、重启和补偿；仅批准的 80/443 及受限 SSH，3001 不开放公网。 |
| COS 与备份 | 实际桶、区域、隔离测试对象键、`phonograph-backups/<实际 UUID>/`、最小权限凭据使用方式、每日 05:00 与七份保留范围 | 先单独批准合成密文 put/head/get/delete；通过后再批准生产索引初始化与定时备份。验证公共访问拒绝、下载校验及实际账单。 |

本表是待填写的审批材料，不是远端写入许可。软件安装涉及的包管理器系统文件、服务账号、所有测试/构建生成物和清理动作也须列入对应环境审批。真实上传、迁移、恢复切换、提交和推送仍分别批准。

## 11. 2026-09-30 成都与 Ubuntu 26.04 执行要求（历史）

### 11.1 事实、授权与保留项

第 1 节采购事实来自用户交接的已登录腾讯云页面读取结果，本窗口没有重新操作控制台或服务器。Ubuntu 26.04 只读检查未发现必须重装的依据，系统仓库 Node 22、默认 `/tmp` 为 tmpfs 的结论仍须结合实际主机核实。尚未连接终端、安装、部署、创建备份桶或提交备案；不标 Linux 通过。

用户已批准本地 14 文件适配及列明产物。现有工作树、分支和主仓库迁移包继续保留；未批准提交、推送和远端操作。SSH 主机指纹、维护来源、登录密钥使用方式、实际安装架构/版本、桶名、对象前缀和真实音频仍待明确。域名和实例已购不构成这些操作的许可。

### 11.2 Linux 临时目录与磁盘检查

- 远端执行审批时列出仓库外测试根目录、TMPDIR、npm 缓存、日志、构建、合成数据、测试密钥与清理路径的确切绝对路径。本轮不创建任何 Linux 路径。
- 在运行大文件测试前，用 `findmnt -T <已批准目录>`、`df -h <已批准目录>` 核实实际挂载、容量和剩余空间；不能仅凭目录名推断是磁盘。默认 `/tmp`、`/run` 或其他 tmpfs 不用于音频边界测试、快照、归档、恢复暂存。
- Linux 设置 `TMPDIR=<已批准的仓库外磁盘目录>`，检查 `node -p "require('node:os').tmpdir()"` 确认生效。不要将临时目录放在代码目录内，也不要弱化初始化/备份的路径保护。
- 生产备份 `workDir` 保持 `/var/backups/255-phonograph`；检查该目录和恢复目标父目录的挂载及空间。`restore.ts` 的下载暂存位于 workDir，恢复和解密暂存位于目标父目录；两处都需批准且能容纳所需副本。
- 保留应用的 `PrivateTmp=true` 等保护项；业务媒体仍使用明确的数据目录。2 GB 内存环境的安装、构建与大文件测试峰值尚未测，不自动增加 swap 或更改内存限制。

### 11.3 Node 和配置工具验收

后续安装批准需包含专用 Node 路径及官方发布物实际版本/架构和校验方式。安装完成后，先执行 `/opt/255-phonograph/node24/bin/node --version`，再在该解释器下验证 `node:sqlite` 的 `DatabaseSync` 和 `backup` API。三个 service 的 ExecStart、备份 ExecStopPost、初始化与手工 CLI 必须解析到同一已验证 Node 24。确切补丁版本在远端准备时固定，本地 24.16.0 通过不代表远端已安装。

Node 路径和发布代码真实存在后，才能运行 `systemd-analyze verify` 并进行服务启动/退出/补偿实测。Caddy validate、Fail2ban 合成及真实日志匹配、age 真加密、flock 与硬终止恢复仍待执行；Fail2ban jail 保持 disabled。模板原有 TimeoutStopSec=90 保留，计划当前示例同步为 90；历史记录中曾出现的 30 秒不能作为实际服务值。

### 11.4 成都费用口径

2026-09-30 复核[腾讯云 Lighthouse COS 定价](https://cloud.tencent.com/document/product/1207/88189)：成都标准存储 `0.0033` 元/GB/日，上海 `0.00393333`，两地公网下行 `0.5` 元/GB。健康检查按配置地域估算全部 active、pendingDelete 和已知未确认对象；服务器与域名继续使用 45 元/月和 39 元/年的参考基数，实际成交与续费金额待核对。

成都全部备份日均合计 10 GB、30 天且无公网下载时，参考总额 `45 + 39 / 12 + 10 × 0.0033 × 30 = 49.24` 元/月。不是每份 10 GB 额度，也不表示已创建桶或产生账单。本地验证结果见[验收记录](private-cloud-acceptance.md)最新章节。

## 12. 2026-09-30 服务器准备交接与内部测试操作边界（历史）

### 12.1 当前事实与操作方式

本节接续用户提供的服务器终端回传记录，本次没有重新连接主机。第 10–11 节中尚未连接或安装的表述为历史状态；当前以本节和验收记录末尾为准。

- 实例 `lhins-856nphe0`，公网 IP `1.14.111.74`；Ubuntu 26.04 LTS、x86_64、systemd 259，登录用户 ubuntu（uid/gid 1000、sudo 组）。SSH ED25519 主机指纹为 `SHA256:i7AXzi986iOpMek5lDe4XGlW18cqfdcjKktmeBpc58A`。
- 当前采用[腾讯云实例终端](https://orcaterm.cloud.tencent.com/terminal?type=lighthouse&instanceId=lhins-856nphe0&region=ap-chengdu&from=lh_console_login_btn)，由用户手工执行和回传结果。每次只提供一条命令，代码框仅含命令；不混入提示符和预期输出。不重试旧浏览器命令，不自动输入；如以后获准恢复自动操作，先确认当前终端状态。
- 不要求在公司电脑保存 SSH 私钥，不收集密码或密钥，不重置管理密码。源码上传使用控制台；实际上传落盘路径在批准上传前确认。
- 预检内存约 1.9 GiB、swap 2 GiB、根分区剩余约 32 GB；`/tmp` 为 tmpfs，`/var/tmp` 在磁盘根分区。大文件测试先复核挂载和空间，并使用仓库外磁盘 TMPDIR。
- 交接显示云防火墙开放 22/80 TCP 和 ICMP、无 443 规则，UFW inactive；80/443 无监听。此记录不表示已经完成 SSH 来源收紧或外部端口验收，不在本次变更防火墙。

### 12.2 已安装 Node 与保留文件

经此前单独批准，已从 Node 官方下载发布物并验证 SHA-256，安装 Node 24.21.0/npm 11.19.0。实际路径 `/opt/255-phonograph/node-v24.21.0-linux-x64/`，固定链接 `/opt/255-phonograph/node24` 指向该路径；程序及路径由 root 管理，普通用户不可修改。

`process.execPath`、SQLite 内存 `SELECT 1` 和 backup API 存在性检查通过。项目尚未在此 Node 补丁版本运行测试。所有初始化、普通启动、备份补偿和健康命令继续使用 `/opt/255-phonograph/node24/bin/node`；npm 构建须显式设置同一 bin 目录为 PATH 首项。

保留 `/var/tmp/255-phonograph-node24-install/` 中的官方安装包、`SHASUMS256.txt` 及验证时可能产生的 npm-cache。本次不重新安装或清理。

### 12.3 Caddy 来源、校验和禁止启动状态

Ubuntu 仓库候选 2.6.2-14 不支持项目 `basic_auth` 写法，上一阶段经单独批准添加官方稳定源并安装已校验包。已写入的系统文件为：

- `/usr/share/keyrings/caddy-stable-archive-keyring.gpg`
- `/etc/apt/sources.list.d/caddy-stable.list`

源地址 `https://dl.cloudsmith.io/public/caddy/stable/deb/debian`，suite `any-version`，component `main`，通过 signed-by 限定上述公钥。主指纹 `6576 0C51 EDEA 2017 CEA2 CA15 155B 6D79 CA56 EA34`；旧子密钥有过期记录，安装时使用的签名子密钥为 `2F5C3BE9886ACD2913299EFBABA1F9B8875A6661`。

交接中的校验证据：

| 文件或步骤 | 已回传结果 |
| --- | --- |
| InRelease | Good signature from Caddy Web Server。 |
| Packages.gz SHA-256 | 9d0444351ae346b5c36684097adfeb718593c052356ac4c02c339e9e3d5cf89a |
| caddy_2.11.4_linux_amd64.deb SHA-256 | c41708ffb4af9bc6d19f7d22a7a034804352a21ecc62e1d3dfe3d58e30b38a3e |
| deb 大小 | 17265372 字节；文件清单、控制信息及 postinst 已检查。 |
| 包状态 | caddy version 为 v2.11.4；dpkg-query 为 install ok installed；dpkg --audit 无输出。 |

postinst 会创建账号并尝试启用/启动服务，因此安装前已 mask `caddy.service`、`caddy-api.service`，再执行本地校验包的 dpkg 安装。最终两者均 masked/inactive；`/etc/systemd/system/caddy.service` 和 `caddy-api.service` 均链接 `/dev/null`，未发现额外 Caddy 开机启动链接。安装时的 preset failed/masked 提示与预先禁止启动有关，包状态另行确认正常。**保持两个 mask，不解除、不启动 Caddy。**

Caddy 账号 uid 999/gid 983、附加组 www-data，home `/var/lib/caddy`，shell `/usr/sbin/nologin`；`/var/lib/caddy` 为 caddy:caddy 0750，`/var/log/caddy` 为 caddy:caddy 0755。最近端口检查 80/443 无监听。

保留 `/var/tmp/255-phonograph-caddy-install/` 中的 `caddy-stable.asc`、`caddy-stable.list`、`gnupg/`、`InRelease`、`Packages.gz`、`caddy_2.11.4_linux_amd64.deb`。该阶段没有运行全局 apt update，仓库元数据通过 curl 下载并逐级验签/校验。本节记录安装历史，不提供重新安装授权。

### 12.4 下一步的审批与验证关口

1. 完成本次四文档更新及检查后，审核现有 14 文件变更；单独批准提交，取得包含适配的真实 40 位 SHA。当前 HEAD 不能代表未提交适配。
2. 按实施计划白名单审查源码包内容，确定本地输出文件后单独批准生成；确定上传文件与实际落盘路径后单独批准控制台上传。不得上传 Windows node_modules、密钥、数据库、真实媒体、验证目录或迁移包。
3. 候选隔离根为 `/var/tmp/255-phonograph-linux-test-20260930/`，source、npm-cache、tmp、logs、app-data 分开。该目录树尚未获准创建；完整写入与清理范围见实施计划末尾。先核实路径和磁盘，再批准安装依赖、测试和构建；不用 `/tmp`，不覆盖旧数据。
4. 在 Node 24.21.0 下先 npm ci，再全量测试和构建；内部应用初始化与启动另列具体配置、端口、合成数据和日志范围。private-cloud 要求 HTTPS origin、真实发布 SHA、明确绝对数据目录，且仅监听回环地址。初始化会生成 SQLite、标记和示范媒体。
5. 内部 HTTP 验证不等于 HTTPS、私人入口或浏览器 Secure Cookie 验收。Caddy 保持 masked，不安装应用服务、不修改 DNS 或防火墙。之后再分别准备真实 Caddy 配置、systemd、age、Fail2ban、COS 与备份恢复；全部联调、家庭体验和三天试运行完成前，不标个人测试可用。

本次授权仅覆盖四份文档，不生成上述候选目录、归档或运行数据。已有安装准备目录、主仓库迁移包及原验证产物保留；清理也必须先列范围审批。

## 13. 2026-10-16 运行状态与接续边界（历史）

### 13.1 正式应用已经存在

用户回传 systemctl/proc/ss 结果确认：phonograph.service 已 loaded、active/running、enabled，以 phonograph 用户运行，Restart=on-failure，最近 MainPID=1538812、NRestarts=0，ActiveEnterTimestamp=2026-10-05 02:17:03 CST。进程 cwd 为 /srv/255-phonograph/releases/ad23f3644498dd542357092c1aaca018e5c971d4，仅监听 127.0.0.1:3001；带 Host:255fm.cn 的 /api/health 返回 200 和 {"ok":true}。

两个 Caddy 服务均 masked/inactive/dead；最近 ss 未见 TCP 80/443 监听。云防火墙规则、DNS、完整配置/数据权限和外部访问本轮没有复核。不得仅凭 enabled 声称重启验收通过，或根据目录名声称重新校验了发布文件。只观察到 phonograph.service 一个匹配单元，未发现该命名范围的备份/健康定时器；这不排除其他机制。

/srv、/var/lib、/var/backups、/var/tmp 均属 /dev/vda3 ext4，最近为 39G 总量、31G 可用。备份暂存、密文与恢复目录共用该空间，应合并估算占用。

### 13.2 age 演练已获批准，尚未通过

age 包 1.2.1-1build1 已安装，二进制版本与权限已验证。安装后应用仍为同一 PID、NRestarts=0，Caddy 保持屏蔽。仅完成工具安装验证，不是完整备份验收。

当时隔离根 /var/tmp/255-phonograph-age-verify-20261016/ 已创建，test-key.txt 已生成，其余测试待执行。2026-10-19 已完成这组测试，最新文件状态见[路线第三节](private-cloud-next-steps.md#三age-隔离演练已完成)。本段保留历史，不再提供重建或重复执行指令。

后续使用合成文本验证真实加解密和哈希一致，再检查错误私钥及截断密文的真实拒绝原因/退出码，保存不含秘密的 verify.log。生产备份私钥在所有者设备保管；当前服务器测试密钥只用于本次隔离演练。尚无真实 COS 上传、下载、解密、恢复和定时备份验收。

### 13.3 备案、公开访问与家中接续

最近备案截图为四川个人首次备案“腾讯云审核中”，不是备案通过；公安联网备案授权完成也不是办结。用户已明确粉丝向免费音频用途，填写“其他、网络音乐”，个人备案适用性与内容授权仍按实际审核/授权结果处理。旧全站私人认证设计需要重新评估；本轮不修改 Caddy 配置或开放入口。

用户已批准四份文档及开发分支提交/推送供家中拉取；Git 同步不搬迁云端服务器或私钥。家中从[部署路线第六节](private-cloud-next-steps.md#六跨电脑同步)同步仓库，再用第七节提示词继续。按用户要求手动操作服务器，一次一条命令，等待实际输出；不自动派发子代理，不读取真实曲库、不重置密码、不清理旧日志，不重跑已完成的安装或初始化。

## 14. 2026-10-19 标准 COS 接入与实测（已完成的合成验证）

### 14.1 已完成的检查（服务器和建桶观察为历史证据）

- age 合成明文/恢复文本各 59 字节，cmp 相同，SHA-256 均为 `24f21c141fff7ffd13499926fdcc49d1380351bb5fed8d3fad3133c373119360`。正确解密通过；错误密钥和截断密文均退出 1，并返回对应原因，输出文件均 0 字节。目录 0700、十个文件 0600、ubuntu:ubuntu，verify.log 已写入并回传。保留全部测试产物。
- systemctl 指向 `/etc/systemd/system/phonograph.service` 和 `/etc/255-phonograph/phonograph.env`，WorkingDirectory 为 current，User/Group 为 phonograph，无 drop-in，StateDirectory 为空。只读取 PHONOGRAPH_DATA_DIR 一项，确认 `/var/lib/255-phonograph`，并非由 StateDirectory 空值推断没有数据目录。
- current 是 root 所有的预期发布链接；发布路径祖先 0755 root:root。数据目录 0700 phonograph:phonograph；配置目录、备份目录、运维状态目录均 0700 root:root；phonograph.env 为 0600 root:root。namei 核对了这些路径及祖先，未检查库内文件或完整环境。
- `/etc/255-phonograph/backup.json`、`backup.env`、`age-recipients.txt` 均不存在。仓库模板更新不改变这一服务器观察。
- 标准 COS 桶创建于 2026-10-19 12:20:14；成都、私有读写、单 AZ，文件列表为空。版本控制、静态网站、全球加速未开启；复制、生命周期、日志存储、CORS 未配置；数据万象未开通。ACL 只见所有者，桶策略为空，关联 CAM 子账号表无结果；未审计账号全部角色/用户组权限。
- 服务端加密只有创建时选择“不加密”的截图，创建后没有重新核对这一项。端点为 `https://255-backups-1378821599.cos.ap-chengdu.myqcloud.com`。CDN 和媒体分发不属于本阶段。

### 14.2 CAM 状态与分阶段授权

此前六文件材料已提交并推送为 `22db7be60e58dacd892cfffccde472584bbc506a`。之后的 CAM 证据比旧文档更新：

- 策略 `phonograph-backup-prefix`，ID `290399112`，版本 1，2026-10-19 14:36:04 创建，内容与模板一致；这项策略创建有对应批准。
- 用户 `phonograph-backup`，UIN `100053927521`，15:08:43 创建；控制台访问已禁止、用户组 0。
- 15:13:38 直接关联唯一上述策略；置换前仅 1 把 API 密钥，15:08:43 创建、已启用，用户答复未保存或不确定。此项为置换前历史状态，最新结果见下文及第 14.4 节。
- 用户确认只完成验证码，没有点击最终“完成”。代理误将向导前面的“下一步”视作纯准备操作，实际已创建用户/密钥并关联策略。这些变更不属于原审批，不能补记为获批；后续不要重复创建或继续旧向导，也不要在未获批时停用/删除密钥。

腾讯云说明 SecretKey 只在创建时可保存，之后不能查询。[官方访问密钥说明](https://cloud.tencent.cn/document/product/598/37140)

随后用户单独批准停用旧密钥（不删除）及自行新建一把替换密钥。旧密钥停用在用户完成微信身份验证后，页面回读为“已禁用”；用户确认新密钥已安全保存、弹窗已关闭，并确认两把密钥为旧禁用、新启用。代理未读取 SecretKey，不记录凭据值，也未取得新密钥的精确创建时间。

截至正向实测阶段，批准分阶段发生：先是独立脚本、测试及三份文档共五文件的本地开发；随后是指定服务器目录和脚本安装、哈希/权限/语法/离线计划检查；再是上述密钥置换；最后是隐藏输入新凭据到临时进程环境及唯一测试对象的一次 COS 上传、读取和删除。该阶段随后另批三份文档及不落盘检查，实际结果见第 14.4 节。后续 GET 拒绝实测、ACL 本地开发及另行获批的安装/执行见第 14.5–14.6 节；其余权限拒绝测试、正式 age 密钥与配置安装、生产索引、停机备份、恢复、定时单元和 Git 提交/推送仍需对应批准。电脑地点不构成开发前置条件；本次批准不自动覆盖重复运行、扩大测试或删除旧密钥。

### 14.3 独立 COS 合成数据探针

工具：[cos-smoke-check.mjs](../../deploy/cos-smoke-check.mjs)；测试：[cos-smoke-check.test.mjs](../../deploy/cos-smoke-check.test.mjs)。直接使用已部署的 COS SDK 3.0.0，不调用生产备份 CLI；无依赖安装、构建或服务控制。默认运行或传 `--plan` 仅打印计划，不加载 SDK、读取凭据或服务器文件。

| 项目 | 准确范围 |
| --- | --- |
| 桶与地域 | `255-backups-1378821599`，`ap-chengdu`，HTTPS |
| 唯一对象键 | `phonograph-backups/e57796e4-d131-4652-880e-a3c0613369c5/cos-smoke-20261019-6fca0dca-24d1-4ac0-8cc8-28e0ce9b3281.tar.age` |
| 合成输入（只读） | `/var/tmp/255-phonograph-age-verify-20261016/plain.txt.age`，本次已核对 259 字节、0600、uid/gid 1000；当前密文哈希见第 14.4 节，不使用明文 SHA-256。 |
| 输入边界 | 真实路径必须仍为上述路径；拒绝链接、非普通文件、权限/长度变化；最大读取 260 字节并要求实际为 259。校验 age 文件头及独立确认的哈希；不读取任何测试私钥。 |
| 已安装服务器目录 | `/var/tmp/255-phonograph-cos-verify-20261019/`，0700 ubuntu:ubuntu；首次创建前确认不存在，接续时保留。 |
| 已安装服务器文件 | 仅上述目录内 `cos-smoke-check.mjs`，0600 ubuntu:ubuntu、10529 字节；本地与服务器 SHA-256 一致，语法及离线计划已通过。 |
| 下载与报告 | 下载写入有 259 字节上限的内存流并计算 SHA-256；报告只写终端 stdout，不生成下载文件或日志文件。 |
| 既有代码读取 | `current` 链接目标必须为 `/srv/255-phonograph/releases/ad23f3644498dd542357092c1aaca018e5c971d4`；从该发布加载 SDK，并校验版本 3.0.0。实际运行使用 Node 24。 |
| 凭据 | 本次已单独批准并使用隐藏输入，将 `PHONOGRAPH_COS_SECRET_ID`、`PHONOGRAPH_COS_SECRET_KEY` 传入临时进程环境；不放命令参数、不回传值、不写 backup.env。后续使用须对应执行批准。 |
| 临时权限 | 无新增策略、用户组或 CAM 权限。既有 GetObject、HeadObject、PutObject、DeleteObject 覆盖该测试键；没有列桶、修改 ACL 或 multipart 操作。 |

该输入是之前验证过的 age 加密合成文本，不是 tar 包。工具仅验证 COS 传输，不能证明正式备份归档、解密、恢复或大文件行为正确。测试键与正式对象共享策略前缀，因此只构成名称和数据隔离；代码固定桶/键/来源，拒绝命令行覆盖这些值，不读取或写入生产 index.json。

执行顺序为 HEAD 确认不存在 → PUT（private ACL、明确长度、`x-cos-forbid-overwrite: true`，无 grant）→ HEAD 校验长度和 ETag → GET（If-Match、流长度上限、SHA-256）→ DELETE → HEAD 确认不存在。缺失必须是带 COS request-id 的 404/NoSuchKey；权限/网络/签名失败均不能当作缺失。禁止覆盖头只在桶版本控制未开启时生效，因此运行前必须只读复核，并显式传入 `--confirm-unversioned-bucket`。任何响应出现版本标识或删除标记都会中止。[COS PUT Object 文档](https://intl.cloud.tencent.com/document/product/436/7749?lang=en)

执行参数形状为 `--execute --source-sha256 <已核对的密文SHA256> --confirm-unversioned-bucket`，参数本身不替代用户批准。安装/执行批准前只展示离线计划，不提供可直接执行云端操作的完整命令。执行环境须禁用 Node 编译缓存，日志、输出重定向、临时凭据文件若要新增，应扩展文件范围重新批准。

失败报告仅包含阶段、固定测试键、长度/哈希、远端状态、白名单错误码、HTTP 状态和符合格式的 request-id，不输出完整 SDK error、message、stack、签名 URL、请求头或凭据。SDK 内部可能重试；PUT 超时、409 或断连后不确定是否已有对象，保留 `unknown`，停止，不自动删除。HEAD/下载失败保留测试对象；删除失败或删除后的 HEAD 不明确，也不会报告清理成功。后续只读核对及精确清理另批，不循环执行或更换键规避错误。

本轮正向四接口测试不覆盖前缀外拒绝、公共访问拒绝、真实 ACL 拒绝条件或账单。这些仍为后续验收项；403 也可能由签名过期、时间偏差等引起，需结合实际错误码和成功请求证据判断。[COS 403 排查](https://cloud.tencent.com/document/product/436/54303)

### 14.4 服务器安装与 COS 正向实测（已通过）

2026-10-19，用户按批准范围逐条执行服务器命令并回传结果。目录/脚本安装、离线检查、密钥置换与临时凭据输入/COS 实测分别获得批准；成功结果不是对更早 CAM 创建偏差的追认。

| 检查项 | 实际结果 |
| --- | --- |
| 执行环境 | Node v24.21.0；current 为 `/srv/255-phonograph/releases/ad23f3644498dd542357092c1aaca018e5c971d4`；该发布的 COS SDK 3.0.0 |
| 合成来源 | `/var/tmp/255-phonograph-age-verify-20261016/plain.txt.age`；真实路径与输入路径相同，普通文件，0600、uid/gid 1000、259 字节 |
| 来源密文 SHA-256 | `49700c92dbe430571fcf13b52c5284cfe09da442b4c49454ca4d24b93d1f325b` |
| 安装目录 | `/var/tmp/255-phonograph-cos-verify-20261019/`；0700 ubuntu:ubuntu |
| 安装脚本 | `cos-smoke-check.mjs`；0600 ubuntu:ubuntu、10529 字节 |
| 脚本 SHA-256 | `911eaadf9a4ad4157f79d90edbfdec5139553e077c2a2a1376bb2c295c87d0c2`；本地、上传后及真实执行前一致 |
| 离线检查 | `node --check` 成功后运行 `--plan`，返回固定桶、对象键及六阶段计划；未发 COS 请求 |
| 桶前置条件 | 执行前浏览器复核 `255-backups-1378821599`，成都、私有读写、版本控制未开启；策略不变，无临时扩权 |
| 执行结果 | `ok: true`、`stage: complete`、`remoteState: absent`；源与下载均 259 字节，下载 SHA-256 与来源一致 |

真实执行通过清空继承环境的独立 Bash 启动；先核对脚本哈希，再以隐藏输入读取用户保存的新凭据。凭据只在子进程变量/环境中使用，不作为命令参数或 shell 历史内容，不写凭据文件；关闭 core dump、禁用 Node 编译缓存，报告仅输出终端。用户回传结果后终端已回到外层提示符，后续会话不能假定仍有这些变量。

成功报告对应第 14.3 节唯一对象键的六阶段完成：首次 HEAD 不存在、PUT private、HEAD 长度和 ETag、GET 长度和 SHA-256、DELETE、最后 HEAD 不存在。完整 JSON 见[验收记录](private-cloud-acceptance.md#2026-10-19-密钥置换服务器探针安装与-cos-正向联调通过)。最后的 `absent` 只证明该测试对象不存在，不能据此宣称全桶为空或所有权限边界均正确。

服务器保留探针目录、脚本及原 age 演练证据；没有写下载文件、探针日志、生产 index.json 或正式备份配置，没有操作生产数据、服务或 Caddy。正式服务状态和三个备份配置文件的存在性未在本次复验，仍标历史观察。

下一步先准备权限拒绝测试的具体对象、拒绝条件及清理范围，再申请执行批准。前缀外访问、公共访问、ACL/grant 拒绝条件、正式 age 密钥、完整备份/解密/恢复、故障补偿及标准 COS 费用验收仍未完成；不自动重跑本次测试或扩大既有策略。

### 14.5 指定路径 GET 拒绝检查（实测通过）

用户批准后逐条执行内存命令，使用同一替换密钥、已部署 SDK 3.0.0 的签名器及原生 HTTPS。只发 4 次 GET，不上传、删除、列桶或改权限，不创建脚本、下载文件或凭据文件。服务器当前链接、Linux/Node 24 和 SDK 版本检查在命令中通过；未读取合成密文或生产配置。

测试名称共同部分为 `cos-deny-20261019-526faf21-8a4f-4335-8e23-c488891d3c3f`：

| 用例 | 对象键 | 实测 |
| --- | --- | --- |
| control-before / control-after | `phonograph-backups/e57796e4-d131-4652-880e-a3c0613369c5/cos-deny-20261019-526faf21-8a4f-4335-8e23-c488891d3c3f.tar.age` | 两次 404 NoSuchKey |
| outside-prefix | `phonograph-deny-check/cos-deny-20261019-526faf21-8a4f-4335-8e23-c488891d3c3f.tar.age` | 403 AccessDenied |
| wrong-suffix | `phonograph-backups/e57796e4-d131-4652-880e-a3c0613369c5/cos-deny-20261019-526faf21-8a4f-4335-8e23-c488891d3c3f.txt` | 403 AccessDenied |

最终 `ok: true`、`mutations: none`、四项 `passed: true`；两项拒绝均具备标准拒绝消息和有效 COS RequestId。前后 404 对照用于区分凭据/签名故障与这两条路径的权限拒绝。只证明这些指定 GET 请求的结果，不外推到对象写删、匿名访问、grant 或全账号授权。完整 JSON 见[验收记录](private-cloud-acceptance.md#2026-10-19-get-拒绝实测通过与-acl-探针本地开发)。

### 14.6 匿名读取及上传 ACL 探针（实测通过）

最初批准新增 [cos-acl-check.mjs](../../deploy/cos-acl-check.mjs)、[cos-acl-check.test.mjs](../../deploy/cos-acl-check.test.mjs) 并更新三份部署文档，共五文件及不落盘本地验证；这项批准不包含服务器或 COS 操作。随后用户单独批准服务器单文件安装及离线检查，完成后再明确回复“确认条件，批准 ACL 实测及条件清理”。一次真实执行已通过；当前仅获批将结果写回三文档。各次批准不互相追溯，也不覆盖重复执行、CAM 变更或 Git 提交/推送。

| 范围 | 固定配置 / 当前结果 |
| --- | --- |
| 桶及地域 | `255-backups-1378821599`，`ap-chengdu`，不增加权限 |
| 唯一新对象键 | `phonograph-backups/e57796e4-d131-4652-880e-a3c0613369c5/cos-acl-20261019-526faf21-8a4f-4335-8e23-c488891d3c3f.tar.age` |
| 只读输入 | `/var/tmp/255-phonograph-age-verify-20261016/plain.txt.age`；259 字节、普通文件、0600、不得是链接 |
| 输入密文 SHA-256 | `49700c92dbe430571fcf13b52c5284cfe09da442b4c49454ca4d24b93d1f325b`；执行参数必须与此固定值一致 |
| 已部署依赖 | Node 24 Linux；current 必须为 `/srv/255-phonograph/releases/ad23f3644498dd542357092c1aaca018e5c971d4`；该发布的 SDK 必须为 3.0.0 |
| 本地脚本 | 15730 字节；SHA-256 `e4ace48c7530557e79b910f3a79efebb6f63a12a0cef1d60846c62af76382f83` |
| 本地测试 | 33/33 通过；包含真实本地 SDK 签名器与内存 HTTPS 替身的衔接，没有真实凭据或网络请求 |
| 服务器文件（已批准/已安装） | `/var/tmp/255-phonograph-cos-verify-20261019/cos-acl-check.mjs`，0600 ubuntu:ubuntu、15730 字节；复用 0700 ubuntu:ubuntu 目录，安装前已确认真实路径一致、目标不存在；上传后哈希、语法和离线计划均通过 |
| 凭据 | 本次用户在独立 Bash 中隐藏输入，经临时子进程环境传入；无 backup.env 或其他凭据文件，值未进入参数、回传结果或文档；结束已返回外层提示符 |

默认调用及 `--plan` 仅打印离线计划；不读取凭据、服务器文件或加载 SDK。实际运行必须同时提供 `--execute --source-sha256 <上述固定哈希> --confirm-unversioned-bucket`，并已单独取得安装、执行及清理批准。此处列出接口不构成执行授权。

流程和判定：

1. 带签名的 GET（Range 0–0）确认 `404 NoSuchKey`；已有对象、缺少 RequestId、NoSuchBucket 或其他错误即停止。存在性与匿名检查遇成功响应立即关闭流，不读取对象正文。
2. PUT private 合成对象，附唯一运行 UUID 元数据及禁止覆盖头，Content-Length/Content-MD5/ACL/标记均参与签名。HEAD 验证标记和长度，带 If-Match 的 GET 在内存核对 259 字节和 SHA-256，再以 HEAD 确认 ETag 未变。
3. 对该已存在对象发送不带签名的 GET，要求 403 AccessDenied、标准拒绝消息和有效 RequestId。核对归属后删除对照对象，并以带签名 GET 的 NoSuchKey 确认不存在。
4. 对同一已确认不存在的键依次尝试遗漏 ACL、default、public-read；每项必须得到明确权限拒绝，且随后带签名 GET 仍为 NoSuchKey。400 参数错误、签名错误或网络失败不计为通过。
5. 正常共 17 次请求。任一异常立即终止后续用例；含有条件恢复时整次最多 21 次。每个 HTTPS 调用最多 30 秒，不自动重试、不跟随重定向；下载上限 259 字节，错误正文上限 8192 字节。

失败时只在本次确实发出 PUT 且未发生冲突或版本异常后，允许一次有条件恢复：以 HEAD 核对本次 UUID、大小和 ETag，再下载校验 SHA-256，最后 HEAD 确认后才能 DELETE；随后必须验证 NoSuchKey。归属不明、哈希/标记不符、版本标记或清理失败时保留并报告，不盲删、不重试 DELETE。意外 public-read 成功可能让这份合成密文短暂公开，测试仍判失败，即使后续已清理。

执行前必须只读复核桶版本从未开启且仍未开启，并确保测试期间无人并发写入此键；HEAD 与 DELETE 之间没有原子条件保护，校验不能消除并发竞态。授权只针对这个合成键，不授权更改策略、对象 ACL 接口、生产 index.json、真实备份/恢复、服务或正式配置。

本阶段不测试 grant 头部，不能宣称全部权限边界完成。private/default/public-read 和省略 ACL 的含义依据 [PUT Object 官方说明](https://cloud.tencent.com/document/product/436/7749)，条件限制依据[条件键说明](https://cloud.tencent.cn/document/product/436/71307)。本次安装、执行与条件清理已分别获批；后续新增请求、重复运行或扩大范围仍须另批。

#### 服务器安装与一次实测结果

安装前用户回传目录为 0700 ubuntu:ubuntu、真实路径一致，目标为 `TARGET_ABSENT`。单独获批后由用户上传，核对脚本 SHA-256 为 `e4ace48c7530557e79b910f3a79efebb6f63a12a0cef1d60846c62af76382f83`，权限 0600、所有者 ubuntu:ubuntu、15730 字节；随后 `node --check` 和 `--plan` 均通过。只安装这一文件，不重新创建目录或安装依赖。

云端执行准备时，桶概览显示私有读写、版本控制未开启，但刷新后的读取连续超时，未取得刷新后的独立状态证据。用户随后确认桶从未开启版本控制、仍未开启，且测试期间独占上述键，并批准一次 ACL 实测及条件清理。此项前提来源为用户确认，不补写成浏览器复核成功。

用户按单条命令执行：清空继承环境、关闭历史与 core dump、先核对脚本哈希，再隐藏输入凭据并通过临时环境启动 Node；禁用编译缓存，没有把凭据放入参数或写入文件。回传 `ok: true`、`mode: execute`、`stage: complete`、`remoteState: absent`；runId 为 `8b7fbf4f-42c9-49cc-92fd-f789060f4208`。

| 本次用例 | 结果 |
| --- | --- |
| anonymous-read | 403 AccessDenied，passed=true |
| acl-omitted | 403 AccessDenied，passed=true |
| acl-default | 403 AccessDenied，passed=true |
| acl-public-read | 403 AccessDenied，passed=true |
| private-fixture-cleanup | deleted-verified，最终指定对象不存在 |

四项拒绝均含有效 COS RequestId，完整原始 JSON 见[最新 ACL 验收记录](private-cloud-acceptance.md#2026-10-19-acl-探针安装与匿名读取上传-acl-拒绝实测通过)。按已核对哈希脚本的成功路径，private 对照上传、归属/长度/下载哈希/ETag 核验、匿名拒绝、对照删除，以及三种 ACL 拒绝后的 NoSuchKey 核验均完成。正常路径设计为 17 次请求；回传 JSON 未单列计数，不额外声称已独立统计。

本次没有触发意外 PUT 成功或丢失响应后的条件恢复，不能据此认定该失败分支完成云端验收。服务器保留两份探针脚本和原 age 证据；下载只在有上限的内存中处理，没有创建下载、日志或凭据文件。没有修改 CAM/桶策略、生产索引、正式备份配置、应用或 Caddy；正式服务状态沿用历史证据。

当时后续项为正式备份 CLI、配置和 age 公钥/凭据交接，以及 grant 条件与费用未验收项。2026-10-20 用户已将开发主线调整为丰富网站功能；这些备份配套项继续保留，在对应批次明确新增文件、数据、停机及清理范围后另批执行。不自动重跑本次测试或删除旧证据。

## 15. 2026-10-20 公网入口已打通与初版开发接续

### 15.1 状态及证据来源

以下来自用户终端输出、云控制台截图和浏览器截图，不是本次代理直接登录服务器的检查：

| 项目 | 结果 |
| --- | --- |
| 应用 | phonograph.service active/running/enabled；带 Host:255fm.cn 的回环 health 和首页请求均返回 200 |
| 配置白名单 | PHONOGRAPH_DEPLOYMENT=private-cloud；PHONOGRAPH_DATA_DIR=/var/lib/255-phonograph；PHONOGRAPH_SITE_ORIGIN=https://255fm.cn |
| 管理员 | 用户获批完成初始设置，最终 `{"needsSetup":false,"authenticated":false}`；密码未回传 |
| DNS | DNSPod 新增 @ / A / 默认 / 1.14.111.74 / TTL 600；resolvectl 从网络返回该 IP |
| 网络 | 云防火墙 TCP 443 已添加；原 TCP 80/22 和 ICMP 保留；UFW inactive，3001 未作为公网规则开放 |
| Caddy | Valid configuration；解除 caddy.service 屏蔽并启用，最终 active/running/enabled；caddy-api 未解除屏蔽 |
| HTTPS | 用户在服务器执行不带 -k 的 curl，https://255fm.cn/api/health 返回 `{"ok":true}`、HTTP 200 |
| 浏览器 | 用户确认首页正常打开并提供截图；真实音频播放及后台操作仍待验证 |
| 备案 | ICP 蜀ICP备2026063099号-1 已通过；公安申请已撤销，待重新提交 |

### 15.2 已获批的服务器变更

用户分别批准管理员初始化、入口配置与服务启动。DNS 和云防火墙由用户自行添加。Caddy 变更范围为：

- 创建备份 `/etc/caddy/Caddyfile.before-255fm-20261020`，修改 `/etc/caddy/Caddyfile`。
- 移除 `/etc/systemd/system/caddy.service` 的屏蔽链接，创建开机启用链接 `/etc/systemd/system/multi-user.target.wants/caddy.service`。
- Caddy 自动证书/状态写入 `/var/lib/caddy/.local/share/caddy/`、`/var/lib/caddy/.config/caddy/`。
- 脚本先备份原配置，用 caddy 用户校验；校验失败时恢复原文件，成功才 unmask、daemon-reload、enable --now。
- 未安装 `/etc/255-phonograph/caddy.env` 或 caddy drop-in，未改应用环境，未更换发布目录。

实际获批安装内容记录如下，供日后对照；本次文档回写不重新部署：

```caddyfile
{
    log default {
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

255fm.cn {
    route {
        header Cache-Control "private, no-store"
        request_body {
            max_size 220MB
        }
        reverse_proxy 127.0.0.1:3001 {
            header_up -Authorization
            header_up -Proxy-Authorization
            header_up -Forwarded
            header_up Host 255fm.cn
            header_up X-Forwarded-For {remote_host}
            header_up X-Forwarded-Host 255fm.cn
            header_up X-Forwarded-Proto https
        }
    }
    handle_errors {
        header Cache-Control "private, no-store"
        respond "请求暂时无法处理" {err.status_code}
    }
}
```

当前配置没有旧模板的全站 Basic Auth、维护标记匹配或 access-log 文件输出；不能假定创建维护标记就会阻止请求。正式备份/恢复与 Fail2ban 验收前需核对这些差异，另批对齐方案。仓库模板本批未修改。

### 15.3 当前开发顺序与发布门槛

主线为丰富首页、音乐馆、播放器、后台功能。本批先落地统一 ICP 页脚，后续按[初版计划](../superpowers/plans/2026-10-20-public-initial-release.md)逐批开发；音乐馆排序、信息展示和筛选反馈为下一批优先评估项。网页能打开不等于内容、全部功能或公安备案已完成。

本地 seed 中三首音频均为 1 秒合成文件；不通过重置线上曲库替换示例。由用户通过后台提供真实素材，验证登录、上传、发布、播放与拖动后再整理首批内容。尚需核对 www 入口、真实设备布局、后台 HTTPS 会话、必要备份恢复和发布回滚。提交、推送、部署及真实数据操作另按明确范围批准。

备案页脚参考[腾讯云悬挂备案号说明](https://cloud.tencent.com/document/product/243/61412)，ICP 链接指向 https://beian.miit.gov.cn/；公安号取得后再添加真实号码、标识和链接。当前申请已撤销，后续要重新提交，不继续等待原申请审核。

## 16. 2026-10-20 正式界面候选版与内容更新

### 16.1 当前版本边界

B“毛怪手帐”已接入正式 React 首页、独立音乐馆、迷你播放器及晚安电台空页面。当前本地 HEAD 仍为 `22db7be60e58dacd892cfffccde472584bbc506a`，候选改动未提交、未推送、未部署；不能用该 HEAD 表示这些新改动已打包发布。`localhost:4697` 是静态样板，`localhost:4701` 是正式生产构建加隔离后端预览，都不是线上入口。

本地隔离数据仅在 `C:/Users/Administrator/AppData/Local/Temp/255-phonograph-public-ui-20261020/preview-data/`。约 62.69 秒合成静音音频、测试封面、歌词、测试账号和分类标签都属于本地验收，不同步到正式服务器。预览监听 127.0.0.1:4701；从家中访问它需要这台电脑，日常使用应访问正式域名。

### 16.2 在家中更新歌曲

1. 打开 `https://255fm.cn/admin`，使用既有网站管理员密码登录；新建歌曲入口为 `/admin/songs/new`。这与腾讯云/服务器登录密码是不同的账号用途。
2. 选择音频文件，填写歌名、歌手；按需上传封面、LRC 或填写歌词，设置分类和标签。
3. 保存草稿后，从歌曲列表发布。草稿不会进入公共曲库；只有已发布歌曲关联的分类和标签才会在前台筛选项出现。
4. 刷新 `https://255fm.cn/music` 查看并播放。已打开页面没有实时推送新曲库的承诺，更新后先刷新。
5. 内容变更直接写入服务器现有应用数据，不需要重新部署代码。需要验收一次真实长音频的完整播放、暂停、拖动、封面/歌词和手机访问后，才记为实际内容流程通过。

### 16.3 候选版发布流程（待批准执行）

本批 26 个获批文件加此前的 `src/components/SiteFooter.tsx`、`src/styles/global.css` 构成 28 个发布相关文件。此前四个 COS 脚本/测试、原始静态样板和本地数据库不纳入本次发布提交。具体清单维护在初版计划最新记录；提交与推送分别确认，固定完整提交 SHA 后再给服务器命令。

下一次服务器操作先只读核对 current 的实际目标、服务的运行用户/工作目录/状态、Node 路径与版本、磁盘余量和目标发布目录是否已存在。不得输出完整环境、凭据或数据库内容。用户最新回传确认服务 active/running，User/Group=phonograph，WorkingDirectory=/srv/255-phonograph/current，数据目录=/var/lib/255-phonograph；current 的历史 SHA 不能替代部署前复核。

获得具体部署批准后，按固定 SHA 创建独立 release 目录、安装锁定依赖并构建，先完成本地健康验证再切换 current 和重启 phonograph.service。审批范围须明确 release 目录、依赖/构建产物、切换链接、短暂服务重启、所需回退步骤与验证命令。保留旧 release 以便故障时切回；不得把初次安装、管理员 setup 或 seed 命令当作更新步骤。

本次候选没有后端、数据库结构、服务配置或依赖变更。沿用 `/var/lib/255-phonograph` 和既有账号/会话机制，不覆盖数据库、媒体或 phonograph.env；Caddy 保持第 15 节实际公开配置，不能直接安装仓库旧模板。发布失败时按已批准的回退范围恢复旧 current 并重启，不自动还原或清空数据库。正式备份/恢复仍待另批验收，不把旧 COS 合成探针当作生产数据保护已完成的证据。

发布后检查 HTTPS health、首页新资源、直接访问 /music 与 /goodnight-radio、后台登录状态，以及用户真实歌曲播放。只有这些通过并记录实际 release SHA，才能报告新版已上线。当前未执行本节服务器变更。
