# 255留音机

255留音机是一个面向 Hanser 粉丝的音乐与故事收藏工具。当前仓库包含 PC 网页播放器原型：页面底部的迷你播放器可展开为沉浸式唱片播放器，并共用播放、切歌、进度、音量、静音、歌词和频谱状态。

## 本地运行

需要 Node.js 24 和 npm。进入项目目录后运行：

```powershell
npm install
npm run dev
```

`npm run dev` 会同时启动 Vite 网页和 Fastify 本地服务；Vite 会在终端中显示访问地址，并把 `/api` 请求代理到 `127.0.0.1:3001`。

本地正式运行前先构建双端，再启动服务：

```powershell
npm run build
npm start
```

服务端默认把数据库和媒体目录放在项目之外：Windows 使用 `%LOCALAPPDATA%\255-phonograph`，其他环境使用用户目录下的 `.255-phonograph`。需要测试隔离时可设置 `PHONOGRAPH_DATA_DIR`；可公开的配置键见 `.env.example`。

完成修改后可运行：

```powershell
npm run test:run
npm run typecheck
```

`npm run test:run` 依次执行客户端与服务端测试，`npm run typecheck` 检查双端 TypeScript。`npm run build` 会先检查类型，再将网页输出到 `dist/`、服务端输出到 `server-dist/`。

## 曲目数据

播放器接收 `Track[]`。每条曲目支持以下精确字段：

| 字段 | 类型 | 必填 | 用途 |
| --- | --- | --- | --- |
| `id` | `string` | 是 | 曲目唯一标识 |
| `title` | `string` | 是 | 曲目标题 |
| `artist` | `string` | 是 | 艺术家或来源名称 |
| `audioUrl` | `string` | 是 | 可由浏览器播放的音频地址 |
| `coverUrl` | `string` | 否 | 唱片封面和迷你播放器封面地址 |
| `backgroundUrl` | `string` | 否 | 沉浸式播放器背景地址；省略时回退到 `coverUrl` |
| `lyricsUrl` | `string` | 否 | LRC 歌词文件地址 |

类型定义位于 `src/features/player/types.ts`，演示曲目位于 `src/features/player/demo-tracks.ts`。当前演示音频和歌词由代码即时生成，不依赖仓库中的媒体文件。

## 媒体与生成文件

真实 MP3/WAV 音频、图片、视频、渲染或构建输出，以及 `node_modules` 均保留在 Git 之外，不提交到仓库。接入真实内容时，请使用本地或外部媒体地址，并继续遵守相应素材的授权与版权要求。

