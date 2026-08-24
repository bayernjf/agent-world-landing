import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { chromium } from "playwright";

const DIST = "dist";
// the shots are committed to the repo, so the cloud build never needs chromium
const OUT = "public";
// 5173 is a popular dev port; a stray tab on it would silently break the build
const PORT = 5183;
const VIEWPORT = { width: 1280, height: 800 };

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".json": "application/json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

async function resolveFile(pathname) {
  const rel = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, "");
  for (const candidate of [rel, join(rel, "index.html"), `${rel}.html`]) {
    const file = join(DIST, candidate);
    try {
      if ((await stat(file)).isFile()) return file;
    } catch {}
  }
  return null;
}

const server = createServer(async (req, res) => {
  const { pathname } = new URL(req.url, "http://localhost");
  const file = await resolveFile(pathname);
  if (!file) {
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("not found");
    return;
  }
  res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
  res.end(await readFile(file));
});

const targets = [
  { out: "preview-en.png", url: "/" },
  { out: "preview-zh.png", url: "/zh/" },
].filter((t) => existsSync(join(DIST, t.url === "/" ? "index.html" : `${t.url}index.html`)));

if (!targets.length) {
  console.log("[shot] no built pages found, run `npm run build` first");
  process.exit(1);
}

await new Promise((resolve) => server.listen(PORT, resolve));

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 2 });

for (const target of targets) {
  await page.goto(`http://localhost:${PORT}${target.url}`, { waitUntil: "load" });
  // the hero reveal and the island hydration both animate in
  await page.waitForTimeout(3000);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
  await page.screenshot({
    path: join(OUT, target.out),
    clip: { x: 0, y: 0, ...VIEWPORT },
    animations: "disabled",
    caret: "hide",
  });
  console.log(`[shot] ${join(OUT, target.out)}`);
}

await browser.close();
server.close();
