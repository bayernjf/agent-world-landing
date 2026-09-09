# 部署 — agent-world-landing

更新时间：2026-09-09

## 站点信息
- Pages 项目：`agent-world-landing`（已连接 GitHub 仓库 `bayernjf/agent-world-landing`）
- 域名：`agent-world-landing.pages.dev` + 自定义域名 `agent-world.bayjf.com`
  （DNS 需一条 `CNAME agent-world → agent-world-landing.pages.dev`，Proxied）
- 技术栈：Astro 7（SSG）+ React 19 island（可交互沙盒）+ `@bay/landing-ui` + `@astrojs/sitemap`
- Node：`>=22.12.0`；包管理器 npm

## 构建
```bash
npm install
npm run build     # astro build && node scripts/shot.mjs
npm run preview
```

## Cloudflare Pages 配置（与 work-learn-landing 一致）
| 配置项 | 值 |
|---|---|
| Production branch | `main` |
| Build command | `npx playwright install chromium && npm run build` |
| Build output directory | `dist` |
| Environment variables | `NODE_VERSION = 22`、`PLAYWRIGHT_BROWSERS_PATH = 0` |

**分支策略**：日常开发在 `dev`，推送 `main` 才会构建发布；`dev` 等其他分支只产出 preview 部署。

## 发布后验证
1. 英文首页（`/`）与中文首页（`/zh/`）可访问，React 沙盒 island 正常加载。
2. 隐私政策与条款页（双语）可访问。
3. `robots.txt`、`sitemap.xml` 可访问且域名一致。
4. OG 图 / 预览图（构建时截出）可访问。

## 改域名时的同步点
- `src/consts.ts` 的 `SITE_URL`
- `public/robots.txt` 里的 Sitemap 地址
