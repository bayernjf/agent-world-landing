# Agent World — Landing

游戏化的多智能体编排工作台落地页。每个 Agent 是一座厂房，token 是电力，产出沿管道流转。

- 线上：https://agent-world.bayjf.com （English）· https://agent-world.bayjf.com/zh/ （简体中文）
- 产品仓库：https://github.com/bayernjf/agent-world

## 技术栈

- [Astro 7](https://astro.build) 静态站点，`output: 'static'`
- React 19 island（`client:idle`）承载可交互沙盒
- 原生 CSS，design token 集中在 `src/styles/global.css` 的 `@layer tokens`
- `@bay/landing-ui` 提供品牌链接与 GitHub Star 组件
- 双语路由由 Astro i18n 提供：`/` 英文（默认，无前缀）、`/zh/` 中文

## 本地开发

需要 Node 22.12+（`node -v` 确认；Astro 7 会拒绝 20.x）。

```bash
npm install
npm run dev
```

开发服务器默认跑在 3016 端口（见 `.claude/launch.json`）。

## 构建

```bash
npm run build
```

其他脚本：

```bash
npm run preview   # 预览 dist
npm run check     # astro check 类型检查
npm run shot      # 重新生成 og:image 预览图（需要先 build）
```

### og:image 预览图

`public/preview-en.png` 与 `public/preview-zh.png` 是提交进仓库的，云端构建不参与生成——
否则每次构建都要下载一个 chromium。改了首屏视觉之后手动重生一次并提交：

```bash
npx playwright install chromium   # 只需第一次
npm run build && npm run shot
```

`scripts/shot.mjs` 会在 `dist/` 上起静态服务，用 Playwright 截 1280×800@2x 首屏，写回 `public/`。

## 目录结构

```
public/            favicon、robots.txt、llms.txt / llms-en.txt、og:image 预览图
scripts/shot.mjs   本地重新生成 og:image
src/consts.ts      站点级常量（域名、社交、og 图路径）
src/i18n/          ui.ts 文案字典 + index.ts 语言工具
src/layouts/       Layout.astro（head、reveal 脚本、CRT 层）
src/components/    SEO、Hud、Hero、FactoryMap、ControlPanel、Pipeline、
                   Sandbox（+ React island）、SkillCards、Cta、Footer
src/pages/         index.astro（en）、zh/index.astro、404.astro
src/styles/        global.css
```

## 部署到 Cloudflare Pages（Git 集成）

1. 代码推到 GitHub 仓库 `bayernjf/agent-world-landing`。
2. Cloudflare Dashboard → 侧边栏 **Compute (Workers)** / Workers & Pages → Create →
   切到 **Pages** 页签 → Connect to Git，选中该仓库。
   Cloudflare 已把 Pages 并入 Workers，新建入口比较隐蔽；如果面板里找不到 Pages 页签，
   就走 Workers + Static Assets（同样连 Git，构建产物目录填 `dist`，效果一致）。
3. 构建配置：
   - Framework preset：`Astro`
   - Build command：`npm run build`
   - Build output directory：`dist`
   - Environment variable：`NODE_VERSION = 22`
4. Save and Deploy。

Cloudflare 构建 `main` 分支，日常开发在 `dev` 分支进行，合并到 `main` 才会发版。

自定义域名：项目 → Custom domains → 添加 `agent-world.bayjf.com`，按提示配置 CNAME。
换域名时要同步改 `src/consts.ts` 的 `SITE_URL` 和 `public/robots.txt` 里的 Sitemap 地址。

## SEO

- 每种语言独立的 title / description，取自 `src/i18n/ui.ts` 的 `meta.*`
- canonical + 三条 hreflang（自身、另一语言、x-default）
- Open Graph + Twitter `summary_large_image`，og:image 用构建时截图
- JSON-LD `@graph`：Organization / WebSite / SoftwareApplication
- `@astrojs/sitemap` 生成带 hreflang 互指的 sitemap
- `prefetch` 全站预取，`inlineStylesheets: 'auto'`

## GEO（生成式引擎优化）

- `public/robots.txt` 显式放行 GPTBot、ClaudeBot、PerplexityBot、CCBot 等 AI 爬虫
- `public/llms.txt`（中文）与 `public/llms-en.txt`（英文）用 markdown 自述产品定义、
  核心隐喻、七种厂房、五道工位、技能科技树与差异点，供答案引擎直接引用
