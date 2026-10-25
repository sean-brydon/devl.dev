// Screenshots registry previews for review: node scripts/shots.mjs [slug ...]
// Writes .shots/<slug>/{light,dark}-desktop.png (+ dark-mobile.png, light-reduced.png with reduced motion) and .shots/report.json
// with console errors, page errors and horizontal overflow per shot.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";

const root = path.resolve(import.meta.dirname, "..");
const base = process.env.SHOTS_URL ?? "http://localhost:3417";
const index = await readFile(path.join(root, "src/registry/__generated__/index.ts"), "utf8");
const all = JSON.parse(index.slice(index.indexOf("= [") + 2, index.lastIndexOf("]") + 1));
const wanted = process.argv.slice(2);
const items = wanted.length ? all.filter((i) => wanted.includes(i.slug)) : all;

const desktop = {
  component: { width: 900, height: 700 },
  motion: { width: 900, height: 700 },
  illustration: { width: 900, height: 700 },
  block: { width: 1280, height: 900 },
  screen: { width: 1280, height: 860 },
};

const browser = await chromium.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
const report = {};

async function shoot(item, theme, viewport, label, reducedMotion = "no-preference") {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1, colorScheme: theme, reducedMotion });
  const errors = [];
  page.on("console", (msg) => msg.type() === "error" && errors.push(msg.text().slice(0, 300)));
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message.slice(0, 300)}`));
  const res = await page.goto(`${base}/preview/${item.slug}?theme=${theme}`, { waitUntil: "networkidle", timeout: 60000 }).catch((e) => ({ status: () => `nav: ${e.message}` }));
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" }).catch(() => {});
  await page.waitForTimeout(2500);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth).catch(() => null);
  const file = path.join(root, ".shots", item.slug, `${theme}-${label}.png`);
  await mkdir(path.dirname(file), { recursive: true });
  await page.screenshot({ path: file });
  await page.close();
  return { status: res?.status?.(), errors, overflow };
}

for (const item of items) {
  const vp = desktop[item.kind];
  report[item.slug] = {
    kind: item.kind,
    "light-desktop": await shoot(item, "light", vp, "desktop"),
    "dark-desktop": await shoot(item, "dark", vp, "desktop"),
    "dark-mobile": await shoot(item, "dark", { width: 390, height: 844 }, "mobile"),
    // Catches hydration mismatches from branching render output on useReducedMotion.
    "light-reduced": await shoot(item, "light", vp, "reduced", "reduce"),
  };
  const r = report[item.slug];
  const bad = Object.entries(r).filter(([k, v]) => k !== "kind" && (v.status !== 200 || v.errors.length || v.overflow > 0));
  console.log(`${bad.length ? "!!" : "ok"} ${item.slug}${bad.map(([k, v]) => ` [${k}: ${v.status} errs=${v.errors.length} overflow=${v.overflow}]`).join("")}`);
}

const reportFile = path.join(root, ".shots", "report.json");
const prev = JSON.parse(await readFile(reportFile, "utf8").catch(() => "{}"));
await writeFile(reportFile, JSON.stringify({ ...prev, ...report }, null, 2));
await browser.close();
