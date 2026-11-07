# AGENTS.md

## 1. 项目

**KeyTune · 键音** —— 手机横屏 H5 音乐小游戏。

玩家在 15 键虚拟钢琴上跟随提示按键，系统用 PERFECT / GREAT / GOOD / MISS 判定，Combo、得分和评级反馈；支持跟弹、节奏挑战、自由演奏、和弦识别、演奏记录回放。

产品需求与功能拆解：

- `docs/requirement.md`
- `docs/features/F00～F13`
- `docs/design-requirements.md`
- `assets/manifest.json`

## 2. 当前阶段

**F00～F12 已完成 MVP，当前进入 F13 体验打磨与发布。**

剩余工作：iPhone 16 Pro / Pro Max Safari 真机检查、音频最终响度、真实 Cloudflare Workers 部署。真实部署前必须获得用户明确同意。

## 3. 硬性约束

1. **目标设备**：iPhone 16 Pro / iPhone 16 Pro Max，Safari 横屏。
2. **设计基准**：956×440（Pro Max）与 874×402（Pro），安全区左右 62px、底部 21px。
3. **Safari 紧凑态**：956×352 / 874×314 仍可用。
4. **素材上限**：15 张图片（3 张打底 + 12 张封面）+ 7 个短音效；15 个琴键音实时合成。
5. **不新增素材**：缺图/缺音效先停下报告，不要自己生成或找替代图。
6. **UI 用代码画**：琴键、音符、判定、按钮、面板、成就图标、分享卡全部 CSS / Canvas / SVG / Emoji。
7. **不做**：BGM、曲目伴奏、专属背景、成就位图、分享卡模板、宣传图、麦克风录音。
8. **不做后端**：MVP 数据只存本地；Worker 只提供静态资源与 `/api/health`。
9. **不引入前端框架**：Vite + TypeScript + 原生 DOM/Canvas，避免额外运行时。
10. **不引入 UI 库、CSS 框架、状态库、动画库**。
11. **未经用户明确同意，不执行真实部署**；日常只跑 `wrangler deploy --dry-run`。

## 4. 技术栈

| 层 | 选择 |
| --- | --- |
| 构建 | Vite 8 |
| 语言 | TypeScript 5.9，strict |
| 运行时 | Cloudflare Workers |
| 集成 | `@cloudflare/vite-plugin` |
| 部署 | Wrangler 4 |
| 静态资源 | `assets/` 作为 Vite `publicDir` |
| 测试 | `tsc --noEmit` + 构建 + Playwright 截图 + 手动验收 |

`assets/` 是运行时静态资源目录，构建后映射到站点根路径：

```text
assets/images/...  ->  /images/...
assets/audio/...   ->  /audio/...
assets/manifest.json -> /manifest.json
```

源图放 `design/source/`，不进入构建。

## 5. 目录

```text
keytune/
├── AGENTS.md
├── index.html                 # Vite 入口
├── package.json
├── vite.config.ts
├── wrangler.jsonc
├── tsconfig.json
├── worker/
│   └── index.ts               # Cloudflare Worker
├── src/
│   ├── main.ts                # 前端入口
│   ├── styles.css
│   ├── app/                   # 应用外壳、路由、状态
│   ├── audio/                 # 合成器、音效、音量
│   ├── game/                  # 判定、Combo、计分
│   ├── keyboard/              # 15 键
│   ├── songs/                 # 曲谱数据与读取
│   ├── recorder/              # 演奏事件记录
│   ├── storage/               # 本地档案
│   └── ui/                    # 页面与组件
├── public/
│   └── logo.svg               # README 品牌图
├── assets/                    # 运行时素材（Vite publicDir）
│   ├── images/
│   ├── audio/
│   └── manifest.json
├── design/
│   └── source/images/         # 源图，不打包
├── docs/
│   ├── requirement.md
│   ├── design-requirements.md
│   ├── features/
│   └── screenshots/
└── .wrangler/                 # 本地生成，不手改
```

## 6. 命令

```bash
npm install
npm run dev          # Vite + Workers 本地开发
npm run typecheck    # tsc --noEmit
npm run build        # typecheck + vite build
npm run preview      # 预览构建产物
npm run deploy       # 构建并部署到 Cloudflare Workers
npm run cf-typegen   # 生成 Worker 类型
```

部署前需要：

```bash
npx wrangler login
```

## 7. Feature 工作流

严格按 `docs/features/F00～F13` 顺序推进。

每个 Feature：

1. **读文档**：功能、流程、规则、验收标准、素材范围。
2. **写验收清单**：把该 Feature 的 AC 转成当前可执行的检查项。
3. **只实现该 Feature**：不顺手做下一个 Feature。
4. **本地验证**：
   - `npm run typecheck`
   - `npm run build`
   - `npm run dev`，用 Playwright 访问
   - 956×440、874×402 各截图
   - 956×352 紧凑态截图
   - 关键交互跑一遍
5. **更新状态**：`docs/features/STATUS.md` 标记完成/阻塞。
6. **留截图**：`docs/screenshots/f<NN>-<screen>.png`。
7. **再进入下一个 Feature**。

Feature 未通过验收，不允许标记完成。

## 8. 验证标准

### 8.1 每个 Feature 必跑

```bash
npm run typecheck
npm run build
```

### 8.2 页面验证

- 956×440：Pro Max 标准
- 874×402：Pro 标准
- 956×352：Pro Max Safari 工具栏展开
- 874×314：Pro Safari 工具栏展开
- 页面无横向/纵向滚动
- 无控制台错误
- 关键触控目标 ≥44×44
- 文字不重叠、不截断

### 8.3 交互验证

- 首页 → 目标 Feature → 返回
- 刷新后状态保持
- 切后台/回前台不残留声音
- 静音、音量 0、减少动效下仍可用

### 8.4 素材验证

- 只使用 `assets/manifest.json` 中登记的素材
- 不硬编码散落路径；通过统一 asset loader 读取
- 不新增图片/音频文件
- 图片尺寸、格式、体积符合 `docs/design-requirements.md`

## 9. 代码约定

- TypeScript strict，不使用 `any` 逃逸；必要时写明确类型。
- 模块边界：
  - `audio/` 不依赖 UI
  - `game/` 不依赖 DOM
  - `storage/` 不依赖 UI
  - `ui/` 不直接算分
- DOM 查询集中在组件初始化，不在事件里反复 `querySelector`。
- 事件监听在销毁时移除；单页切换不重复绑定。
- 时间使用 `performance.now()`；不用 `Date.now()` 做游戏计时。
- 所有用户可见文案中文；判定词用英文大写。
- 所有可交互按钮提供 `aria-label` 或可见文字。
- CSS 使用设计 token（颜色、圆角、间距），不写魔法数字。
- 不提交 `node_modules`、`dist`、`.wrangler`、临时截图。

## 10. 数据与隐私

- 无账号、无登录、无手机号、无定位、无麦克风。
- 设置、成绩、演奏记录存本机。
- 清除数据入口必须二次确认。
- Worker 不记录用户演奏数据。
- `/api/health` 只返回服务状态，不接收用户数据。

## 11. iPhone Safari 约定

- `viewport-fit=cover`，使用 `env(safe-area-inset-*)`。
- 使用 `100dvh`，不使用 `100vh`。
- 左右安全区 62px、底部 21px。
- 竖屏只显示“请横屏游玩”。
- 键盘区域 `touch-action:none`，禁止 Safari 手势滚动/缩放。
- 首次触摸后才允许音频。
- 切后台自动暂停并静音。
- Safari 工具栏展开时进入紧凑布局，不隐藏核心操作。

## 12. Cloudflare Workers 约定

- Worker 入口：`worker/index.ts`。
- 静态资源由 Workers Assets 提供，SPA fallback 到 `index.html`。
- `/api/health` 返回：

```json
{ "ok": true, "service": "keytune", "version": "0.1.0" }
```

- 不新增数据库、KV、R2、D1、Queues。
- 不接入第三方分析、错误上报、广告。
- 部署配置在 `wrangler.jsonc`，不把手写配置散落在脚本里。

## 13. Feature 状态

| Feature | 名称 | 状态 |
| --- | --- | --- |
| F00 | 应用外壳与横屏框架 | 完成 |
| F01 | 15 键键盘与即时发声 | 完成 |
| F02 | 音色、音量与声音设置 | 完成 |
| F03 | 曲谱模型与曲库 | 完成 |
| F04 | 判定、Combo 与计分核心 | 完成 |
| F05 | 跟弹模式 | 完成 |
| F06 | 节奏挑战模式 | 完成 |
| F07 | 结算、评级与成绩记录 | 完成 |
| F08 | 闯关模式 | 完成（MVP） |
| F09 | 自由演奏与和弦识别 | 完成 |
| F10 | 演奏记录与回放 | 完成（MVP） |
| F11 | 成就系统 | 完成 |
| F12 | 每日挑战与分享 | 完成（MVP） |
| F13 | 体验打磨与发布 | 进行中 |

状态更新到 `docs/features/STATUS.md`。

## 14. 完成定义

一个 Feature 完成必须同时满足：

- [ ] 对应 `docs/features/Fxx` 的功能点全部可用
- [ ] 验收标准逐条通过
- [ ] `npm run typecheck` 通过
- [ ] `npm run build` 通过
- [ ] 956×440 / 874×402 / 紧凑态截图齐全
- [ ] 无控制台错误、无页面溢出
- [ ] 不影响已完成 Feature
- [ ] 更新 `docs/features/STATUS.md`
- [ ] 未新增未登记素材

## 15. 不要做的事

- 不要一次实现多个 Feature。
- 不要因为“顺手”新增页面、素材、依赖。
- 不要把 1920×1080 原型直接拉伸到手机。
- 不要用图片替代 CSS/Canvas 能画的 UI。
- 不要在没有验收的情况下宣布完成。
- 不要提交或部署未通过 `npm run build` 的代码。
