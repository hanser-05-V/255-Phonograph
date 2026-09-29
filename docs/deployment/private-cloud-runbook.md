# 255留音机个人云端测试运维手册

本手册为待部署操作材料。当前没有服务器、实际域名或云端凭据；不得直接把模板复制到公网主机后宣称部署完成。采购、资源创建、安装软件、写云端文件、启用定时任务、真实媒体上传/迁移、恢复切换、Git 提交和推送均需对应批准。

设计依据：[规格](../superpowers/specs/2026-09-28-private-cloud-test-deployment-design.md)、[实施计划](../superpowers/plans/2026-09-28-private-cloud-test-deployment.md)。结果以[验收记录](private-cloud-acceptance.md)为准。

## 1. 采购及部署前输入

- 腾讯云上海轻量应用服务器锐驰型，2 核 2 GB、40 GB 系统盘、Ubuntu 24.04；仅本人访问。官方标价参考 45 元/月，备案资源期限要求须在下单时再核实。
- 普通非溢价 `.cn` 域名，参考首年 39 元、续费 38 元；先核实可注册域名、实名和备案。域名未备案完成前不开放域名网站服务。
- 同地域私有 Lighthouse COS，仅放加密备份，不承担播放器媒体分发。不假设具有普通 COS 的存储桶列表、生命周期等接口。
- 估算服务器三个月 135 元，域名首年 39 元，初期约 174 元，另计备份。上海存储参考 0.00393333 元/GB/日；所有备份合计 10 GB 时约 1.18 元/月，合计约 49.43 元/月。七份各 10 GB 是 70 GB，不能按 10 GB 算。公网恢复下载参考 0.5 元/GB；请求、上行与同地域链路是否单列费用以最终产品计费页和订单为准。免费额度、活动价、200 Mbps 峰值均不是长期费用或家庭访问速度保证。
- 采购前记录准确服务器 ID、IP、主机指纹、域名、桶名、独占前缀、续费周期和账单告警设置；不得用示例值填充生产配置。实名材料在服务商官方页面处理。

官方参考（采购前重新核对）：[服务器价格](https://cloud.tencent.cn/document/product/1207/73452)、[域名价格](https://buy.cloud.tencent.com/domain/price?intl=0&source=newDNSPod&type=overview)、[备份存储计费](https://cloud.tencent.com/document/product/1207/88189)、[备案资源要求](https://cloud.tencent.com/document/product/243/18908/)、[Lighthouse COS 能力](https://cloud.tencent.cn/document/product/1207/108904)。

## 2. 固定版本与本地证据

执行环境 Node.js 24.16.0；新增官方 `cos-nodejs-sdk-v5` 3.0.0、`tar` 7.5.22 均精确锁定。Linux 的 Node.js 24 修订版、Caddy、age、Fail2ban、systemd 版本尚未选定和验证，部署前记录实际版本及官方安装来源。当前 `age` 真加密、Caddy 私人入口、systemd 故障补偿和 Fail2ban 匹配均不能由 Windows 单元测试替代。

2026-09-29 已获批完成开发依赖安全更新：Vite 固定 7.3.6，Vitest 及 @vitest/mocker 固定 4.1.11。同主版本更新后残留的 GHSA-82fw-gwwq-j7x9 已不再出现在最新 npm audit 报告；本次所有级别均为 0、退出码 0。这是当前依赖公告检查结果，不代表全项目安全审计。客户端 163/163、服务端 270/270、类型检查和生产构建通过；首次服务端临时目录配置失败及获批纠正后的复验记录见[验收记录最新章节](private-cloud-acceptance.md)。报告使用忽略目录 `.verification/private-cloud/vitest4-*.log` 与 `vitest4-audit.json`，不提交。

本地服务端验证须将 TEMP/TMP 指向已批准的仓库外隔离目录；本轮为 `C:\Users\Administrator\AppData\Local\Temp\255-phonograph-vitest4-20260929\`。初始化及运维路径校验会拒绝代码目录内的数据路径，不能为了测试通过关闭这项保护。该本地目录不作为 Linux 部署数据路径。不启用公网 Vite 开发服务器或 Vitest UI；运行服务使用生产构建和 Fastify。

应用发布版本必须对应实际获准提交的 40 位 SHA。不能把旧交接 SHA 填入新代码配置；本轮尚未提交或推送。

## 3. 帐号、文件和网络边界

仅适用于新建专用服务器。已有其他业务的服务器必须重新评估。

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
  /usr/bin/node /srv/255-phonograph/current/server-dist/server/index.js --initialize-data
```

初始化生成 schema、过渡记录和运行时示范媒体，并写 `.initialized.json`。半成品或已有数据库一律拒绝覆盖，不能通过删除数据库解决失败。普通 service 不得保留初始化开关；缺失标记、数据库或有效 schema 时必须失败关闭。

## 5. 入口与管理员

备案完成后设置域名解析及 HTTPS。使用 [Caddyfile](../../deploy/Caddyfile)，从 `/etc/255-phonograph/caddy.env` 读取 `PHONOGRAPH_DOMAIN`、`PHONOGRAPH_GATE_USER`、`PHONOGRAPH_GATE_HASH`。域名只含主机名；用户名限定普通字母数字，密码哈希通过 Caddy 交互式 `caddy hash-password` 生成，避免把明文密码写命令参数或聊天。哈希同样不进 Git、报告或终端回传。

Caddy 的 systemd 环境文件由服务管理器读取，不需要给 caddy 用户读取其他秘密文件的权限。[drop-in](../../deploy/caddy-service.conf)要结合官方服务的原有路径保护验证；确保 `/run/255-phonograph` 已获准创建，否则只读路径不存在会阻止 Caddy 启动。

全站 Basic Auth 覆盖首页、静态文件、API、音频 GET/HEAD/Range；后台另需已有管理员会话。退出后台不会清除浏览器入口凭据。撤销入口访问须更换入口凭据，并在新浏览器会话验证。未发布媒体在普通媒体接口中不可读，即便管理员已登录；不新增草稿预览接口。

Caddy 先认证再返回维护 503，移除上游 Authorization，重写真实转发 IP；Fastify 仅信任回环代理，检查 Host 和管理写入 Origin。云端会话带 Secure、HttpOnly、SameSite=Strict。登录/设置/改密每 IP 5 次/分钟、全站 20 次/分钟，限流不影响媒体读取。

本阶段所有响应使用私人不缓存策略，不加 CDN 或跨域允许；音频不整文件缓冲、不压缩变换字节。220MB 入口上限需用应用 200 MiB 音频边界加 multipart 开销实测。

## 6. 备份密钥和对象权限

在所有者控制的设备上创建 age 密钥；私钥保管在服务器之外并验证有可用副本。服务器只放 age 公钥 recipients 文件。不得把私钥或含私钥的文件复制进项目。独立恢复时经单独批准使用私钥文件路径，不在参数中放私钥内容。

[备份配置模板](../../deploy/backup-config.example.json)填入实际桶、`ap-shanghai`、`phonograph-backups/<独占 UUID>/`、实际 SHA 和域名。空示例值故意不能通过验证。运维环境 `/etc/255-phonograph/backup.env` 仅包含 `PHONOGRAPH_COS_SECRET_ID`、`PHONOGRAPH_COS_SECRET_KEY`，root:root 0600；曲库备份不包含它们。为指定前缀授予最小对象 put/head/get/delete 权限；手工恢复可使用独立只读凭据。禁止公共读写、网页托管和浏览器 CORS。

先单独批准隔离对象 put/head/get/delete 联调，核实 Lighthouse COS 的实际 API 和权限。再批准生产前缀空索引初始化；已有索引时命令拒绝，例行备份遇到 404 不自动创建空索引。

```sh
sudo /usr/bin/flock --nonblock --conflict-exit-code 75 /run/255-phonograph-backup.lock \
  /usr/bin/node /srv/255-phonograph/current/server-dist/server/ops/cli.js initialize-index \
  --config /etc/255-phonograph/backup.json
```

上述手工命令执行前，需在权限受限的 root 会话注入获准 COS 环境变量，或通过读取 EnvironmentFile 的临时 systemd 单元运行；命令本身不会自动读取 `backup.env`。不要把密钥展开进命令行。未经批准不运行。

## 7. 日常备份与失败处理

确认路径权限、工具和隔离故障测试后，才安装 [备份单元](../../deploy/systemd/phonograph-backup.service)及 [05:00 定时器](../../deploy/systemd/phonograph-backup.timer)。`Persistent=false`，错过时不会开机立即停服补跑。先经批准手动 `systemctl start phonograph-backup.service` 验证，再启用定时器。

备份先查空间和远端索引，再记录原应用状态、进入维护、停止应用、确认退出、快照；随后恢复服务并确认健康，才加密、上传、核实长度和更新索引。应用原本停止则退出。快照目标 10 分钟内结束，整个服务任务 30 分钟上限；超时/强制终止由 ExecStopPost 在同一 flock 下按可信日志恢复此前运行的服务，不恢复数据库。恢复失败仍保留维护标记。

索引仅保留最近七份成功备份；先持久化新索引，再删除准确的旧对象键。失败上传不能替换旧成功集。删除失败保留 pendingDelete，下次重试。单个密文包最多 4 GiB，超出需要另行调整容量方案；本阶段不使用 multipart。

`state.json` 保存 phase、上次成功时间、服务恢复状态和确切密文回执。崩溃在索引提交之后时按该回执核对；上传阶段失败保留本次密文和回执，下次可重试相同键。丢失本地包、索引重放/缺失、无法确认孤立对象时停止并人工核对，不能扫描或清空桶。保留的失败快照会占空间，清理前列出确切路径和恢复影响，不自动删除其他任务或正式媒体。

维护期间不要同时人工停止/切换应用。需要人工介入时先明确结束备份并验证补偿结果；不要删除状态文件来强行解锁。75 表示锁已被其他任务持有，不代表产生新备份。

健康单元每 15 分钟把 JSON 写入受限 `health.json` 并记入 journal。磁盘 80% 警告、90% 拒绝新上传；备份超 24 小时、服务恢复异常、索引不可读、预算 45/50 元阈值均有警告码。估算包含 active、pendingDelete 和已知待确认包，不等同实际账单。没有配置外部通知渠道，不会主动发邮件或消息。BUDGET_WATCH 是费用接近预算的提示，当前固定成本可能使它持续存在。

## 8. 隔离恢复与版本回滚

每次恢复先批准备份编号、解密私钥使用方式、全新绝对目标目录、下载流量和保留范围。目标不允许在当前数据、运维或代码目录中，且必须不存在。下载回执校验密文 SHA，安全解密后校验数据库及全部媒体引用；在副本撤销旧会话和待完成上传，再重建清单。原备份、源曲库及密码哈希保留。

```sh
# Replace the literal placeholders only after the concrete restore paths and UUID are approved.
sudo /usr/bin/flock --nonblock --conflict-exit-code 75 /run/255-phonograph-backup.lock \
  /usr/bin/node /srv/255-phonograph/current/server-dist/server/ops/cli.js restore \
  --config /etc/255-phonograph/backup.json --id APPROVED_BACKUP_UUID \
  --identity-file /APPROVED/EXTERNAL/IDENTITY --target /APPROVED/NEW/RESTORE_DIRECTORY
```

这条命令不会自动切换运行目录。先用 verify 和隔离实例验证记录、权限、密码及播放，再单独审批切换。历史备份可能恢复当时存在、后来永久删除的歌曲；明确恢复点之后哪些变更会丢失，不改现有永久删除交互。

仅代码兼容回滚可切换 `current` 到已验证版本并重启，继续使用同一数据目录；涉及 schema 或数据的回滚须先恢复相配代码、数据库及媒体到新目录，不能用旧代码直接覆盖新结构。回滚不撤销私人入口、不开放 3001。本地真实曲库迁移默认不做；如有需求另行盘点、备份、校验和审批，并确定唯一可写主库。

## 9. Linux 和家庭验收门槛

首先在获准隔离环境运行全量工程检查，以及 `caddy validate`、`systemd-analyze verify`、`fail2ban-regex`；对应可执行文件和路径必须真实存在。Caddy 校验不向聊天输出含哈希的 adapt 结果。合成 Fail2ban 日志预期仅捕获 192.0.2.10、2001:db8::10、192.0.2.13，不能捕获伪造的 192.0.2.99。[jail](../../deploy/fail2ban/phonograph.local)在真实日志校验前保持 disabled。

验证入口 401、合法用户网页、后台第二层权限、跨站拒绝、Range=206、HEAD 空正文、下架后 404、维护 503、3001 外部不可达、日志无凭据。故障注入要覆盖硬终止、锁冲突、空间不足和恢复失败。journald 全局容量模板只适用新专用主机。

真实音频文件尚未提供或批准。MP3/M4A、封面/LRC 上传、取消/断网、播放、前后拖动、恢复进度、自动下一首及家庭网络体验必须补验；不得用合成接口测试标为通过。连续三天试运行含一次服务器重启、重新部署、两次定时备份，以及远端下载解密恢复演练后，才能评价个人测试可用性；不宣称正式公开上线。

## 10. 2026-09-29 采购与部署准备补充（当前关口）

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
