#!/usr/bin/env node
/**
 * Award-style screen recording at 628×353: Projects strip + open first card (Nota).
 *
 * Uses the real site: `#projects-nav-link` skips the hero story and jumps to #projects
 * (see hero-intro.js projects-nav-link handler).
 *
 * Output: recordings/projects-cards-628x353.webm
 */
import { chromium } from "playwright";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const W = 628;
const H = 353;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(path.join(__dirname, ".."));
const RECORDINGS = path.join(ROOT, "recordings");
const OUT = path.join(RECORDINGS, "projects-cards-628x353.webm");

const MIME = {
  ".html": "text/html;charset=utf-8",
  ".js": "application/javascript;charset=utf-8",
  ".mjs": "application/javascript;charset=utf-8",
  ".css": "text/css;charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".mp4": "video/mp4",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
};

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function bindPortZero() {
  return new Promise((resolve, reject) => {
    const s = http.createServer();
    s.listen(0, "127.0.0.1", () => {
      const addr = s.address();
      const p = typeof addr === "object" && addr ? addr.port : 0;
      s.close(() => resolve(p));
    });
    s.on("error", reject);
  });
}

function safePathUnderRoot(root, urlPath) {
  const rel = path.normalize(urlPath.replace(/^\/+/, ""));
  if (rel.startsWith("..") || path.isAbsolute(rel)) return null;
  const abs = path.resolve(root, rel);
  const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep;
  if (abs !== root && !abs.startsWith(rootWithSep)) return null;
  return abs;
}

function serve(repoRoot, port) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        const pathname = new URL(req.url || "/", "http://127.0.0.1").pathname;
        let rel = decodeURIComponent(pathname);
        if (rel === "/" || rel === "") rel = "index.html";
        else rel = rel.replace(/^\//, "");
        const abs = safePathUnderRoot(repoRoot, rel);
        if (!abs) {
          res.writeHead(403);
          res.end();
          return;
        }
        fs.readFile(abs, (err, data) => {
          if (err) {
            res.writeHead(404);
            res.end();
            return;
          }
          const ext = path.extname(abs).toLowerCase();
          res.setHeader(
            "Content-Type",
            MIME[ext] || "application/octet-stream",
          );
          res.end(data);
        });
      } catch (_) {
        res.writeHead(500);
        res.end();
      }
    });
    server.listen(port, "127.0.0.1", () => resolve(server));
    server.on("error", reject);
  });
}

async function main() {
  await fs.promises.mkdir(RECORDINGS, { recursive: true });

  const port = await bindPortZero();
  const server = await serve(ROOT, port);
  const baseUrl = `http://127.0.0.1:${port}/index.html`;

  const browser = await chromium.launch({ headless: true });

  /** @type {import('playwright').BrowserContext | null} */
  let context = null;
  try {
    context = await browser.newContext({
      viewport: { width: W, height: H },
      deviceScaleFactor: 1,
      reducedMotion: "no-preference",
      recordVideo: {
        dir: RECORDINGS,
        size: { width: W, height: H },
      },
    });

    const page = await context.newPage();
    const video = page.video();
    if (!video) throw new Error("Expected context recordVideo enabled");

    await page.goto(baseUrl, {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });

    await page.waitForSelector("#hero-hl.revealed", { timeout: 20000 });
    await sleep(400);

    await page.locator("#projects-nav-link").click();

    await page.waitForFunction(() =>
      document.documentElement.classList.contains("scroll-intro-scrollable"),
    );
    await page.waitForSelector("#projects .hcard", { timeout: 20000 });
    await sleep(1400);

    const firstDiscover = page
      .locator("#projects article.hcard")
      .first()
      .locator(".hcard-discover");
    await firstDiscover.click();

    await page.waitForSelector("#projects .hcard--expanded", {
      timeout: 15000,
    });
    await sleep(600);

    await page.locator("#hcard-detail-nota").first().scrollIntoViewIfNeeded();
    await sleep(2800);

    await page.close();
    await video.saveAs(OUT);

    await context.close();
    context = null;

    console.log("Wrote", OUT);
  } finally {
    if (context) await context.close().catch(() => {});
    await browser.close();
    await new Promise((r) => server.close(() => r()));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
