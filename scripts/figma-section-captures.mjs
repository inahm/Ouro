import { chromium } from "playwright";

const base = process.argv[2] || "http://127.0.0.1:9888/index.html?figmaCapture=1";

const jobs = [
  ["736aaa71-bcc9-4993-a7ef-8cf648039958", "header.scroll-intro-header-strip"],
  ["c792ca80-6fb7-4010-a3a1-0e9e63636a93", "#stage"],
  ["fb145bb2-c4dc-426f-bd46-8310e9b85c38", "#site-meta-panel"],
  ["23457f92-c521-4cd5-8b52-66ba270a8e92", "#studio"],
  ["b76f7c5a-c8cf-4840-a9d9-d930cfac2d95", "#projects"],
  ["cfeb86ee-6edc-44a8-9a38-711aa9991998", "#scroll-intro-below-after-cards"],
  ["fe07186a-eb0c-464b-aaf0-4e6c84339c95", ".kim-team-section"],
  ["29133dea-efa9-4162-86cf-66adda5c3dd3", "footer"],
];

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
const capRes = await ctx.request.get(
  "https://mcp.figma.com/mcp/html-to-design/capture.js",
);
const capJs = await capRes.text();

for (const [captureId, selector] of jobs) {
  const page = await ctx.newPage();
  const endpoint = `https://mcp.figma.com/mcp/capture/${captureId}/submit`;
  await page.goto(base, { waitUntil: "load", timeout: 120000 });
  await page.evaluate((s) => {
    const el = document.createElement("script");
    el.textContent = s;
    document.head.appendChild(el);
  }, capJs);
  await page.waitForTimeout(3500);
  const out = await page.evaluate(
    ({ captureId, endpoint, selector }) =>
      window.figma?.captureForDesign?.({ captureId, endpoint, selector }),
    { captureId, endpoint, selector },
  );
  console.log(captureId, selector, JSON.stringify(out ?? null));
  await page.close();
  await new Promise((r) => setTimeout(r, 2500));
}

await browser.close();
