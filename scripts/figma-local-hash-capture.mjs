/**
 * Local static server + Playwright opens index.html with Figma hash params
 * so capture.js auto-submits (avoids hanging captureForDesign on production).
 *
 * Usage: node scripts/figma-local-hash-capture.mjs <captureId> [repoRoot]
 */
import { spawn } from "node:child_process";
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import path from "node:path";

const captureId = process.argv[2];
const repoRoot = process.argv[3] ?? path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const port = Number(process.env.FIGMA_CAPTURE_PORT ?? 18765);

if (!captureId) {
  console.error("Usage: node scripts/figma-local-hash-capture.mjs <captureId> [repoRoot]");
  process.exit(1);
}

const endpoint = `https://mcp.figma.com/mcp/capture/${captureId}/submit`;
const hash = `#figmacapture=${captureId}&figmaendpoint=${encodeURIComponent(endpoint)}&figmadelay=5000`;

/** Same as figma-external-capture — footer is opacity:0 until IO adds .in */
const FOOTER_VISIBLE_CSS = `
html.figma-capture-mode .scroll-intro-continuation footer {
  opacity: 1 !important;
  transform: translateY(0) !important;
  transition: none !important;
}
`;

const server = spawn("python3", ["-m", "http.server", String(port), "--bind", "127.0.0.1"], {
  cwd: repoRoot,
  stdio: "ignore",
});

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

await sleep(600);
if (server.exitCode !== null) {
  console.error("http.server failed to start");
  process.exit(1);
}

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  page.on("console", (msg) => {
    if (msg.type() === "error") console.error("[browser]", msg.text());
  });
  const url = `http://127.0.0.1:${port}/index.html${hash}`;
  console.error("[figma-local] open", url.replace(captureId, "<id>"));
  const submitWait = page.waitForResponse(
    (res) =>
      res.url().includes(`/mcp/capture/${captureId}/submit`) &&
      res.request().method() === "POST",
    { timeout: 300_000 },
  );
  await page.goto(url, { waitUntil: "load", timeout: 120_000 });
  await page.addStyleTag({ content: FOOTER_VISIBLE_CSS });
  await page.evaluate(() => {
    document.querySelector("#scroll-intro-continuation footer")?.classList.add("in");
  });
  const res = await submitWait;
  console.error("[figma-local] submit response", res.status(), res.url());
} finally {
  await browser.close();
  server.kill("SIGTERM");
  await sleep(200);
}
