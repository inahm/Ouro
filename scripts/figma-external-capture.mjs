/**
 * Capture a live URL into Figma via MCP html-to-design (inject capture.js).
 * Production omits capture.js; Playwright + CSP bypass is required per Figma MCP docs.
 *
 * Ouro production CSS omits html.figma-capture-mode — without it #stage stays position:fixed
 * and covers #scroll-intro-continuation. We inject that block from this repo's assets/site.css
 * plus unlock DOM so hero → studio → cards → kim → footer all lay out for capture.
 * Production HTML often omits #figma-capture-second-slice — we synthesize it and run
 * assets/figma-capture-layout.js so the particle second act + third-act headlines match repo captures.
 *
 * Important: await POST /submit — not captureForDesign()'s return value — or Playwright hangs.
 *
 * Usage: node scripts/figma-external-capture.mjs <captureId> [pageUrl] [repoRootForSiteCss]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const captureId = process.argv[2];
const pageUrl = process.argv[3] ?? "https://www.ouro-labs.com/";
const repoRoot =
  process.argv[4] ?? path.dirname(path.dirname(fileURLToPath(import.meta.url)));

if (!captureId) {
  console.error(
    "Usage: node scripts/figma-external-capture.mjs <captureId> [pageUrl] [repoRootForSiteCss]",
  );
  process.exit(1);
}

/** Pull figma capture layout rules from repo (production deploy may not ship them yet). */
function loadFigmaCaptureModeCss(siteCssPath) {
  const full = fs.readFileSync(siteCssPath, "utf8");
  const start = full.indexOf("/* ── Figma html-to-design");
  if (start === -1) throw new Error(`No figma capture block in ${siteCssPath}`);
  const key = "html.figma-capture-mode #third-act-sound-btn";
  const k = full.indexOf(key);
  if (k === -1) throw new Error("Could not find end of figma capture block");
  const end = full.indexOf("}", k) + 1;
  return full.slice(start, end);
}

/** Horizontal card strip uses overflow-x:auto — expand for capture so all panels appear. */
const CAPTURE_STRIP_CSS = `
html.figma-capture-mode #scroll-intro-continuation {
  overflow-x: visible !important;
}
html.figma-capture-mode .scroll-intro-continuation .hscroll-frame {
  overflow-x: visible !important;
}
html.figma-capture-mode .scroll-intro-continuation .hscroll-track {
  overflow-x: visible !important;
  overflow-y: visible !important;
  height: auto !important;
  min-height: clamp(720px, 78vh, 900px);
  width: max-content !important;
  max-width: none !important;
}
`;

/**
 * Footer starts opacity:0 until hero-intro adds class .in via IntersectionObserver.
 * Capture often runs before that fires — force visible state for html-to-design.
 * (site.css: .scroll-intro-continuation footer vs footer.in)
 */
const CAPTURE_FOOTER_CSS = `
html.figma-capture-mode .scroll-intro-continuation footer {
  opacity: 1 !important;
  transform: translateY(0) !important;
  transition: none !important;
}
`;

const endpoint = `https://mcp.figma.com/mcp/capture/${captureId}/submit`;

const siteCssPath = path.join(repoRoot, "assets", "site.css");
const injectedCss =
  loadFigmaCaptureModeCss(siteCssPath) +
  "\n" +
  CAPTURE_STRIP_CSS.trim() +
  "\n" +
  CAPTURE_FOOTER_CSS.trim() +
  "\n";

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  const cdp = await context.newCDPSession(page);
  await cdp.send("Page.enable");
  await cdp.send("Page.setBypassCSP", { enabled: true });

  const submitWait = page.waitForResponse(
    (res) =>
      res.url().includes(`/mcp/capture/${captureId}/submit`) &&
      res.request().method() === "POST",
    { timeout: 600_000 },
  );

  console.error("[figma-external] goto", pageUrl);
  await page.goto(pageUrl, { waitUntil: "load", timeout: 120_000 });
  await page.waitForTimeout(4000);

  await page.addStyleTag({ content: injectedCss });

  await page.evaluate(() => {
    /*
     * Production HTML omits #figma-capture-second-slice; figma-capture-mode CSS only
     * reflows particles when they're inside .figma-capture-second-slice__stack — otherwise
     * #second-hl-particles-wrap stays position:fixed and the orange particle / second headline
     * column never appears between hero and third act.
     */
    function ensureFigmaSecondSlice() {
      if (document.getElementById("figma-capture-second-slice")) return;
      var third = document.getElementById("third-act");
      var wrap = document.getElementById("second-hl-particles-wrap");
      if (!third || !wrap) return;
      var slice = document.createElement("div");
      slice.id = "figma-capture-second-slice";
      slice.className = "figma-capture-second-slice";
      slice.setAttribute("aria-hidden", "false");
      var stack = document.createElement("div");
      stack.id = "figma-capture-second-slice-stack";
      stack.className = "figma-capture-second-slice__stack";
      var hlLayer = document.createElement("div");
      hlLayer.className = "figma-capture-second-slice__hl";
      var mask = document.createElement("div");
      mask.className = "hero-hl-mask figma-capture-second-mask";
      var h2 = document.createElement("h2");
      h2.id = "figma-capture-second-hl";
      h2.className = "hero-hl hero-hl--second-block";
      mask.appendChild(h2);
      hlLayer.appendChild(mask);
      stack.appendChild(hlLayer);
      slice.appendChild(stack);
      third.parentNode.insertBefore(slice, third);
      stack.insertBefore(wrap, hlLayer);
    }

    ensureFigmaSecondSlice();

    document.documentElement.classList.add("figma-capture-mode");

    var sliceEl = document.getElementById("figma-capture-second-slice");
    if (sliceEl) {
      sliceEl.removeAttribute("hidden");
      sliceEl.setAttribute("aria-hidden", "false");
    }

    var cont = document.getElementById("scroll-intro-continuation");
    cont?.removeAttribute("hidden");
    document.querySelector(".kim-team-section")?.removeAttribute("hidden");
    var foot = cont && cont.querySelector("footer");
    if (foot) foot.classList.add("in");

    window.dispatchEvent(new Event("resize"));
  });

  const layoutJsPath = path.join(repoRoot, "assets", "figma-capture-layout.js");
  await page.addScriptTag({ path: layoutJsPath });
  await page.waitForTimeout(1200);

  await page.evaluate(() => {
    window.scrollTo(0, document.documentElement.scrollHeight);
  });
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(400);

  const jsRes = await context.request.get("https://mcp.figma.com/mcp/html-to-design/capture.js");
  if (!jsRes.ok()) throw new Error(`capture.js HTTP ${jsRes.status()}`);
  const jsText = await jsRes.text();
  await page.evaluate((s) => {
    const el = document.createElement("script");
    el.textContent = s;
    document.head.appendChild(el);
  }, jsText);
  await page.waitForTimeout(1500);

  const hasApi = await page.evaluate(() => typeof window.figma?.captureForDesign === "function");
  if (!hasApi) throw new Error("captureForDesign missing after injection");

  console.error("[figma-external] firing capture (await POST only)…");
  await page.evaluate(
    ({ captureId: id, endpoint: ep }) => {
      window.figma.captureForDesign({
        captureId: id,
        endpoint: ep,
        selector: "body",
      });
    },
    { captureId, endpoint },
  );

  const res = await submitWait;
  console.error("[figma-external] submit response", res.status(), res.url());
} finally {
  await browser.close();
}
