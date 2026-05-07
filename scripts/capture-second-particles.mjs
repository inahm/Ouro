#!/usr/bin/env node
/**
 * Serves this repo statically, drives hero → second act, screenshots
 * #second-hl-particles-canvas (dots only — no headline in crop).
 *
 * Pointer “push” in hero-intro.js scales with mouse speed computed *per RAF*
 * from the previous frame (`spMouse.spd`). Playwright mouse.move interpolates
 * many steps by default, which washes out per-frame delta — use { steps: 1 }
 * and wide jumps so dots visibly scatter before capture.
 *
 * Output: assets/second-hl-particles-mid-motion.png
 */
import { chromium } from "playwright";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(path.join(__dirname, ".."));

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
  const outfile = path.join(
    ROOT,
    "assets",
    "second-hl-particles-mid-motion.png",
  );
  const port = await bindPortZero();
  const server = await serve(ROOT, port);
  const baseUrl = `http://127.0.0.1:${port}/index.html`;

  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
      reducedMotion: "no-preference",
    });
    const page = await context.newPage();
    await page.goto(baseUrl, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    await page.waitForSelector("#hero-hl.revealed", { timeout: 20000 });
    await page.click("body", { position: { x: 8, y: 8 } });
    await sleep(500);

    await page.mouse.move(720, 450);
    for (let i = 0; i < 40; i++) {
      await page.mouse.wheel(0, 400);
      await sleep(35);
      if (
        (await page.locator(".second-hl-particles-wrap--visible").count()) > 0
      )
        break;
    }

    await page.waitForSelector(".second-hl-particles-wrap--visible", {
      timeout: 20000,
    });
    await sleep(780);

    const cx = 720;
    const cy = 450;
    /** Instant jumps ({ steps: 1 }) so each new frame sees a large spMouse delta. */
    for (let sweep = 0; sweep < 3; sweep++) {
      await page.mouse.move(cx - 290, cy - 120, { steps: 1 });
      await sleep(32);
      for (let j = 0; j < 14; j++) {
        await page.mouse.move(
          cx + ((j % 2) * 2 - 1) * 290,
          cy + (((j >> 1) % 3) - 1) * 95,
          {
            steps: 1,
          },
        );
        await sleep(32);
      }
      await page.mouse.move(cx + 120, cy + 90, { steps: 1 });
      await sleep(32);
      await page.mouse.move(cx - 260, cy - 160, { steps: 1 });
      await sleep(32);
      await page.mouse.move(cx, cy, { steps: 1 });
      await sleep(48);
    }
    await sleep(120);

    await page.locator("#second-hl-particles-canvas").screenshot({
      path: outfile,
      type: "png",
    });
    console.log("Wrote", outfile);
  } finally {
    await browser.close();
    await new Promise((r) => server.close(() => r()));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
