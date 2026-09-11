# Handoff — agent-world-landing

更新时间：2026-09-11

## 项目概况
Agent World 落地页：游戏化的多智能体编排工作台（Agent 是厂房、token 是电力、产出沿管道流转）。
Astro 7 静态站点（`output: 'static'`），中英双语（`/` 英文默认，`/zh/` 中文），React 19 island
承载可交互沙盒，`@bay/landing-ui` 提供品牌返链与 GitHub Star 组件，design token 集中在
`src/styles/global.css` 的 `@layer tokens`。

- 线上：`https://agent-world.bayjf.com`（English）· `https://agent-world.bayjf.com/zh/`（简体中文）
- Pages 项目：`agent-world-landing`（域名 `agent-world-landing.pages.dev`）
- 产品仓库：`https://github.com/bayernjf/agent-world`

## 当前状态（分支 dev，HEAD = `eb109fd` 与 origin/dev 同步；工作区有 6 个文件未提交）
最近提交：
- `eb109fd` docs: add handoff
- `7bb3446` docs: add git commit message convention
- `f83fe6d` docs: add DEPLOYMENT

### 2026-09-11 按 agent-world 产品最新状态对齐文案（未提交）
逐项核对产品仓库（README / handoff / CHANGELOG / docs/examples.md，状态截至 2026-09-11，
产品 v0.3）后修改，改动文件：`src/i18n/ui.ts`、`src/components/{Hero,Cta,SkillCards}.astro`、
`public/llms.txt`、`public/llms-en.txt`。

- **P0 技能卡口径**：Hero 指标「24 张技能卡」改为真实的「29 种节点类型」（key 由
  `hero.meta.cards` 更名 `hero.meta.nodes`）；`skills.sub` 明确区分——科技树 24 张是
  **游戏化展示卡**，产品实际内置 **11 张技能卡、四种 kind**（tool / prompt-module /
  output-contract / judge）且支持自建。科技树组件本身（6 分支 × 4 层）不动。
- **P0 状态徽标**：`ALPHA · 内测招募中` → `v0.3 · 内测招募中`（对齐真实版本号，保留内测
  漏斗）。**待 owner 确认**：产品仓库零「内测/beta」记录，若实际没有批次计划，CTA 整块
  要改成「开源可用 / 立即体验」导向。
- **P1 MCP 双向**：hero.sub 补「通过 MCP 接入外部工具」；CTA 新增 `cta.list4`——既能消费
  外部 MCP server，也能把自身暴露为 MCP Server（15 个工具）。
- **P1 广度数字**：hero.sub 补 29 种节点；`cta.list2` 写明 6 类连接器（文件/链接/表单/SQL
  数据库/商品库）+ 5 种触发器（webhook、cron 等）；`cta.list1` 补「11 大分类」。
- **P2**：新增 `cta.list5`（按调用计量 + 预算硬熔断）；`control.sub` 关联真实的跨产线
  运营工作台（fleet health / 最近运行 / 成本汇总）；meta.description 双语同步更新。
- **GEO**：`llms.txt` / `llms-en.txt` 重写——新增「节点、连接器与触发器」「MCP 双向接入」
  两节；沙盒显式标注为独立于产品的演示；技能卡按真实体系校准；补返工回路是一等结构、
  事件流单一事实源、成本硬上限等差异点。

验证：`npm run check` 28 文件 0 error/warning/hint；`npm run build` 7 页 + 双语 OG 截图成功；
回读 dist HTML 确认新文案命中、`ALPHA` 与旧「24」指标零残留；Playwright 区块截图核对
Hero / CTA（现 5 条）/ 技能树副标题 / 控制面板排版无溢出。

## 数字型文案对账清单（产品迭代后优先核对，易过期）
| 落地页表述 | 产品事实来源（agent-world 仓库） |
| --- | --- |
| 33 条模板 / 11 大分类 | `docs/examples.md`、`packages/core/src/templates.ts` |
| 29 种节点（5 AI 生成 + 24 通用/编排） | README Feature map、handoff Current state |
| 11 张内置技能卡 / 四种 kind | CHANGELOG、`docs/design-skill.md` |
| 6 类连接器 / 5 种触发器 | README Feature map |
| MCP server 15 个工具 / 三版协议 | README、`docs/design-mcp-server.md` |

## 注意点
- Cloudflare Pages **Production branch 是 `main`**，日常开发在 `dev`：`dev` 只会产出 preview 部署，
  必须把 `dev` 合进 `main` 才发生产。构建命令 `npx playwright install chromium && npm run build`，
  输出目录 `dist`，环境变量 `NODE_VERSION = 22`、`PLAYWRIGHT_BROWSERS_PATH = 0`。
- `npm run build` 内含 `node scripts/shot.mjs`，构建时用 Playwright 截图产出预览 / OG 图；
  `public/preview.png` 与 `public/og/` 不在版本库里，属于构建产物。
- 所有文案必须走 `src/i18n/ui.ts` 且中英双语同时改；组件里不允许硬编码文案。
- 换域名时要同步改 `src/consts.ts` 的 `SITE_URL` 和 `public/robots.txt` 里的 Sitemap 地址。
- 需要 Node >= 22.12（Astro 7 会拒绝 20.x），开发服务器端口见 `.claude/launch.json`。

## 下一步
1. owner 确认内测定位：保留 closed beta 漏斗，还是改为开源可用导向（影响徽标、CTA 与两份 llms）。
2. 按 `git-commit-message.md` 规范提交本次 6 个文件（建议 `docs(landing): align copy with product v0.3 — node count, MCP, skill cards, llms`），再走 dev → main 部署并验证双语首页与 OG 图。
3. 落地页文案随产品迭代同步，改产品时按上面的对账清单回来核对数字。
4. 与 hub 站 bayjf 的产品卡片封面保持一致（引用的是构建产出的 preview.png）。
