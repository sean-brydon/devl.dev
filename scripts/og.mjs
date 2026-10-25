// Renders the site's Open Graph card to public/og.png (1200x630) with the live item counts: node scripts/og.mjs
// Static on purpose: Chrome renders the real goo filter, and the Worker bundle stays small.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";

const root = path.resolve(import.meta.dirname, "..");
const index = await readFile(path.join(root, "src/registry/__generated__/index.ts"), "utf8");
const items = JSON.parse(index.slice(index.indexOf("= [") + 2, index.lastIndexOf("]") + 1));
const count = (kind) => items.filter((i) => i.kind === kind).length;
const stats = [
  [count("component"), "components"],
  [count("block") + count("screen"), "blocks & screens"],
  [count("motion") + count("illustration"), "motion & art"],
];

const brand = "oklch(0.9 0.19 124)";
const ink = "oklch(0.27 0.06 130)";

const html = `<!doctype html>
<html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Geist+Mono:wght@500&display=block" rel="stylesheet">
<style>
  * { margin: 0; box-sizing: border-box; }
  body { width: 1200px; height: 630px; overflow: hidden; background: #0b0b0c; color: #fafafa; font-family: Inter, sans-serif; position: relative; }
  .grid { position: absolute; inset: 0; background-image: radial-gradient(rgb(255 255 255 / 0.07) 1px, transparent 1px); background-size: 22px 22px; mask-image: linear-gradient(90deg, #000 30%, transparent 95%); }
  .glow { position: absolute; right: -120px; top: 40px; width: 720px; height: 620px; background: radial-gradient(closest-side, ${brand.replace(")", " / 0.16)")}, transparent); }
  svg.goo { position: absolute; right: 0; top: 0; }
  .copy { position: absolute; left: 72px; top: 64px; width: 640px; display: flex; flex-direction: column; height: 502px; }
  .logo { display: flex; align-items: center; gap: 14px; font-weight: 600; font-size: 34px; letter-spacing: -0.02em; }
  h1 { margin-top: 44px; font-size: 66px; line-height: 1.02; font-weight: 600; letter-spacing: -0.035em; text-wrap: balance; }
  h1 em { font-style: normal; color: ${brand}; }
  p { margin-top: 22px; font-size: 25px; line-height: 1.4; color: rgb(255 255 255 / 0.62); text-wrap: pretty; }
  .stats { margin-top: auto; display: flex; gap: 40px; align-items: flex-end; }
  .stat b { display: block; font-size: 44px; font-weight: 600; letter-spacing: -0.03em; font-variant-numeric: tabular-nums; }
  .stat span { font-size: 17px; color: rgb(255 255 255 / 0.55); }
  .free { margin-left: 4px; align-self: center; padding: 9px 18px; border-radius: 999px; background: ${brand}; color: ${ink}; font-weight: 700; font-size: 19px; letter-spacing: -0.01em; }
  .cmd { position: absolute; right: 64px; bottom: 56px; font-family: "Geist Mono", monospace; font-size: 17px; color: rgb(255 255 255 / 0.78); background: rgb(11 11 12 / 0.72); border: 1px solid rgb(255 255 255 / 0.12); border-radius: 999px; padding: 11px 20px; backdrop-filter: blur(8px); }
  .cmd i { font-style: normal; color: ${brand}; }
</style></head>
<body>
  <div class="grid"></div>
  <div class="glow"></div>
  <svg class="goo" width="600" height="630" viewBox="0 0 600 630">
    <filter id="goo" x="-30%" y="-30%" width="160%" height="160%" color-interpolation-filters="sRGB">
      <feGaussianBlur stdDeviation="16" />
      <feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 26 -11" />
    </filter>
    <g fill="${brand}" filter="url(#goo)">
      <circle cx="330" cy="330" r="168" />
      <circle cx="470" cy="150" r="86" />
      <circle cx="520" cy="420" r="44" />
      <circle cx="400" cy="230" r="40" />
      <circle cx="205" cy="520" r="30" />
      <circle cx="250" cy="472" r="16" />
      <circle cx="560" cy="62" r="24" />
    </g>
    <path d="M285 288 L240 332 L285 376 M375 288 L420 332 L375 376" fill="none" stroke="${ink}" stroke-width="20" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
  <div class="copy">
    <div class="logo">
      <svg width="46" height="46" viewBox="0 0 28 28"><filter id="lg" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="1.6" /><feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -10" /></filter><g fill="${brand}" filter="url(#lg)"><circle cx="11.5" cy="15.5" r="9" /><circle cx="21" cy="7.5" r="4.5" /><circle cx="22.5" cy="19.5" r="2.4" /></g><path d="M9.5 12.5 7 15.5l2.5 3M13.5 12.5l2.5 3-2.5 3" fill="none" stroke="${ink}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" /></svg>
      devl
    </div>
    <h1>Components with a little <em>goo</em> in them.</h1>
    <p>Hand-built on coss ui. Copy the source or install with one command.</p>
    <div class="stats">
      ${stats.map(([n, label]) => `<div class="stat"><b>${n}</b><span>${label}</span></div>`).join("")}
      <div class="free">Free</div>
    </div>
  </div>
  <div class="cmd">npx shadcn add <i>devl.dev</i>/r/…</div>
</body></html>`;

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.setContent(html, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
const out = path.join(root, "public/og.png");
await page.screenshot({ path: out });
await browser.close();
console.log(`og: ${out} (${items.length} items)`);
