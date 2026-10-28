// Contact sheets from scripts/theme-audit.mjs output: node scripts/theme-sheets.mjs [perSheet] [slug ...]
// Writes .shots/theme/sheets/<mode>-NN.png (or SHEETS_DIR, as .jpg when SHEETS_JPEG is set), one row per item: base, sharp, round, compact, lime.
import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";

const root = path.resolve(import.meta.dirname, "..");
const dir = path.join(root, ".shots", "theme");
const [per = "6", ...wanted] = process.argv.slice(2);
const perSheet = Number(per);
const themes = ["base", "sharp", "round", "compact", "lime"];
const slugs = (wanted.length ? wanted : await readdir(dir)).filter((s) => s !== "sheets" && !s.endsWith(".json") && !s.endsWith(".html")).sort();
const outDir = path.resolve(process.env.SHEETS_DIR ?? path.join(dir, "sheets"));
const jpeg = Boolean(process.env.SHEETS_JPEG);
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1640, height: 400 }, deviceScaleFactor: 1 });

for (const mode of ["light", "dark"]) {
  for (let i = 0; i < slugs.length; i += perSheet) {
    const chunk = slugs.slice(i, i + perSheet);
    const rows = chunk
      .map(
        (slug) =>
          `<div class="row"><div class="name">${slug}</div>${themes
            .map((t) => `<figure><img src="${slug}/${t}-${mode}.png"><figcaption>${t}</figcaption></figure>`)
            .join("")}</div>`,
      )
      .join("");
    const html = `<!doctype html><style>body{margin:0;background:#777;font:12px ui-monospace,monospace;color:#fff}
.row{display:flex;gap:6px;padding:6px;align-items:flex-start;border-bottom:2px solid #444}.name{width:110px;word-break:break-all;font-weight:bold}
figure{margin:0;width:300px}img{width:300px;display:block}figcaption{opacity:.8}</style>${rows}`;
    const file = path.join(dir, `sheet.html`);
    await writeFile(file, html);
    await page.goto(`file://${file}`);
    await page.waitForLoadState("load");
    const out = path.join(outDir, `${mode}-${String(i / perSheet + 1).padStart(2, "0")}.${jpeg ? "jpg" : "png"}`);
    await page.screenshot({ path: out, fullPage: true, ...(jpeg ? { type: "jpeg", quality: 72 } : {}) });
  }
}
await browser.close();
