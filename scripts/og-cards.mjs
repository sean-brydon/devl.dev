// Renders a 1200x630 Open Graph card per item to public/og/<slug>.jpg from its live dark-mode preview.
// node scripts/og-cards.mjs [slug ...] [--force]   (OG_URL=http://localhost:3417 for unreleased items; default https://devl.dev)
// Then run pnpm registry so item pages point at their card.
import { existsSync } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";

const root = path.resolve(import.meta.dirname, "..");
const base = process.env.OG_URL ?? "https://devl.dev";
const outDir = path.join(root, "public/og");
const index = await readFile(path.join(root, "src/registry/__generated__/index.ts"), "utf8");
const all = JSON.parse(index.slice(index.indexOf("= [") + 2, index.lastIndexOf("]") + 1));
const args = process.argv.slice(2);
const force = args.includes("--force");
const wanted = args.filter((a) => !a.startsWith("--"));
const items = all.filter((i) => (wanted.length ? wanted.includes(i.slug) : force || !existsSync(path.join(outDir, `${i.slug}.jpg`))));

const brand = "oklch(0.9 0.19 124)";
const ink = "oklch(0.27 0.06 130)";
const wide = new Set(["block", "screen"]);
const viewports = {
  component: { width: 900, height: 700 },
  motion: { width: 900, height: 700 },
  illustration: { width: 900, height: 700 },
  block: { width: 1280, height: 860 },
  screen: { width: 1280, height: 860 },
};
const kindLabel = { component: "Component", block: "Block", screen: "Screen", motion: "Motion", illustration: "Illustration" };
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const logo = `<svg width="40" height="40" viewBox="0 0 28 28"><filter id="lg" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="1.6" /><feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -10" /></filter><g fill="${brand}" filter="url(#lg)"><circle cx="11.5" cy="15.5" r="9" /><circle cx="21" cy="7.5" r="4.5" /><circle cx="22.5" cy="19.5" r="2.4" /></g><path d="M9.5 12.5 7 15.5l2.5 3M13.5 12.5l2.5 3-2.5 3" fill="none" stroke="${ink}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" /></svg>`;

const card = (item, shot, stage, fit, width) => `<!doctype html>
<html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Geist+Mono:wght@500&display=block" rel="stylesheet">
<style>
  * { margin: 0; box-sizing: border-box; }
  body { width: 1200px; height: 630px; overflow: hidden; background: #0b0b0c; color: #fafafa; font-family: Inter, sans-serif; position: relative; }
  .grid { position: absolute; inset: 0; background-image: radial-gradient(rgb(255 255 255 / 0.07) 1px, transparent 1px); background-size: 22px 22px; mask-image: linear-gradient(90deg, #000 20%, transparent 60%); }
  .copy { position: absolute; left: 64px; top: 60px; bottom: 56px; width: 380px; display: flex; flex-direction: column; }
  .logo { display: flex; align-items: center; gap: 12px; font-weight: 600; font-size: 30px; letter-spacing: -0.02em; }
  .kind { margin-top: 52px; font-family: "Geist Mono", monospace; font-size: 16px; letter-spacing: 0.04em; text-transform: uppercase; color: rgb(255 255 255 / 0.5); }
  .kind b { font-weight: 500; color: ${brand}; }
  h1 { margin-top: 14px; font-size: ${item.name.length > 18 ? 50 : 60}px; line-height: 1.02; font-weight: 600; letter-spacing: -0.035em; text-wrap: balance; }
  p { margin-top: 20px; font-size: 20px; line-height: 1.45; color: rgb(255 255 255 / 0.6); display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; text-wrap: pretty; }
  .foot { margin-top: auto; display: flex; align-items: center; gap: 14px; font-size: 18px; color: rgb(255 255 255 / 0.55); }
  .free { padding: 7px 15px; border-radius: 999px; background: ${brand}; color: ${ink}; font-weight: 700; font-size: 17px; }
  .frame { position: absolute; left: 488px; top: 56px; width: 760px; height: 640px; border-radius: 26px; overflow: hidden; background: radial-gradient(70% 60% at 50% 0%, rgb(255 255 255 / 0.06), transparent 75%) ${stage}; box-shadow: 0 0 0 1.5px rgb(255 255 255 / 0.12), 0 30px 70px rgb(0 0 0 / 0.55); }
  .frame img { position: absolute; }
  .frame.wide img { left: 0; top: 0; width: 900px; }
  .frame.fit { display: flex; align-items: center; justify-content: center; padding-bottom: 66px; }
  .frame.fit img { position: static; max-width: 720px; max-height: 560px; height: auto; object-fit: contain; mask-image: linear-gradient(90deg, transparent, #000 36px, #000 calc(100% - 36px), transparent), linear-gradient(transparent, #000 36px, #000 calc(100% - 36px), transparent); mask-composite: intersect; }
</style></head>
<body>
  <div class="grid"></div>
  <div class="copy">
    <div class="logo">${logo}devl</div>
    <div class="kind"><b>${kindLabel[item.kind]}</b> · ${esc(item.category)}${item.no ? ` · No. ${String(item.no).padStart(3, "0")}` : ""}</div>
    <h1>${esc(item.name)}</h1>
    <p>${esc(item.description)}</p>
    <div class="foot"><span class="free">Free</span>devl.dev</div>
  </div>
  <div class="frame ${fit ? "fit" : "wide"}"><img style="${fit ? `width: ${Math.round(width)}px` : ""}" src="data:image/png;base64,${shot.toString("base64")}"></div>
</body></html>`;

async function render(browser, item) {
  const wideKind = wide.has(item.kind);
  const page = await browser.newPage({ viewport: viewports[item.kind], deviceScaleFactor: wideKind ? 1.5 : 2, colorScheme: "dark" });
  await page.goto(`${base}/preview/${item.slug}?theme=dark`, { waitUntil: "networkidle", timeout: 60000 });
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; } .dark .stage-surface { background: var(--card) !important; }" });
  const target = page.locator("main > *").first();
  await page.waitForTimeout(2500);
  const stage = await page.evaluate(() => {
    const main = getComputedStyle(document.querySelector("main")).backgroundColor;
    return main === "rgba(0, 0, 0, 0)" ? getComputedStyle(document.body).backgroundColor : main;
  });
  const box = await target.boundingBox();
  const fit = !wideKind || (item.kind === "block" && box && box.height < 520);
  const pad = 40;
  const clip = box && { x: Math.max(0, box.x - pad), y: Math.max(0, box.y - pad), width: box.width + pad * 2, height: box.height + pad * 2 };
  const shot = fit && clip ? await page.screenshot({ clip }) : await page.screenshot();
  await page.setViewportSize({ width: 1200, height: 630 });
  await page.setContent(card(item, shot, stage, fit, clip ? clip.width * Math.min(wideKind ? 1.5 : 2, 700 / clip.width, 540 / clip.height) : 720), { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(outDir, `${item.slug}.jpg`), type: "jpeg", quality: 84, scale: "css" });
  await page.close();
}

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ channel: "chrome" });
const queue = [...items];
let done = 0;
await Promise.all(
  Array.from({ length: 4 }, async () => {
    for (let item = queue.shift(); item; item = queue.shift()) {
      try {
        await render(browser, item);
        done++;
      } catch (error) {
        console.error(`og-cards: ${item.slug} failed: ${error.message.split("\n")[0]}`);
      }
    }
  }),
);
await browser.close();
console.log(`og-cards: ${done}/${items.length} cards in public/og`);
