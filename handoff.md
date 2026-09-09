# Handoff — agent-world-landing

更新时间：2026-09-09

## 项目概况
Agent World 落地页：游戏化的多智能体编排工作台（Agent 是厂房、token 是电力、产出沿管道流转）。
Astro 7 静态站点（`output: 'static'`），中英双语（`/` 英文默认，`/zh/` 中文），React 19 island
承载可交互沙盒，`@bay/landing-ui` 提供品牌返链与 GitHub Star 组件，design token 集中在
`src/styles/global.css` 的 `@layer tokens`。

- 线上：`https://agent-world.bayjf.com`（English）· `https://agent-world.bayjf.com/zh/`（简体中文）
- Pages 项目：`agent-world-landing`（域名 `agent-world-landing.pages.dev`）
- 产品仓库：`https://github.com/bayernjf/agent-world`

## 当前状态（分支 dev，与 origin/dev 同步，工作区干净）
最近提交：
- `8898a1c` docs(landing): bump prefab template count from 19 to 33
- `0da107a` docs(landing): refresh copy to match current product state
- `519f995` feat: add privacy policy and terms pages in both languages
- `43f3e4d` feat: add a brand mark and point the JSON-LD Organization logo at it
- `7b87f83` build: shoot the og:image previews during the build again

## 注意点
- Cloudflare Pages **Production branch 是 `main`**，日常开发在 `dev`：`dev` 只会产出 preview 部署，
  必须把 `dev` 合进 `main` 才发生产。构建命令 `npx playwright install chromium && npm run build`，
  输出目录 `dist`，环境变量 `NODE_VERSION = 22`、`PLAYWRIGHT_BROWSERS_PATH = 0`。
- `npm run build` 内含 `node scripts/shot.mjs`，构建时用 Playwright 截图产出预览 / OG 图；
  `public/preview.png` 与 `public/og/` 不在版本库里，属于构建产物。
- 换域名时要同步改 `src/consts.ts` 的 `SITE_URL` 和 `public/robots.txt` 里的 Sitemap 地址。
- 需要 Node >= 22.12（Astro 7 会拒绝 20.x），开发服务器端口见 `.claude/launch.json`。

## 下一步
1. 把 `dev` 合入 `main`，触发生产部署并验证双语首页、隐私/条款页、OG 图可访问。
2. 落地页文案随产品迭代同步（模板数量等数字型文案易过期，改产品时回来核对）。
3. 与 hub 站 bayjf 的产品卡片封面保持一致（引用的是构建产出的 preview.png）。
