// Screenshots every registry preview under contrasting custom themes and checks each one against the devl default:
// node scripts/theme-audit.mjs [slug ...]   (SHOTS_URL picks the server, AUDIT_WORKERS the parallelism)
// Writes .shots/theme/<slug>/<theme>-<mode>.png and .shots/theme/report.json with, per shot: page overflow, text whose contrast
// dropped below 3:1, corners still rounded when the theme radius is 0, and text that newly clips.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";

const root = path.resolve(import.meta.dirname, "..");
const base = process.env.SHOTS_URL ?? "http://localhost:3417";
const workers = Number(process.env.AUDIT_WORKERS ?? 6);
const index = await readFile(path.join(root, "src/registry/__generated__/index.ts"), "utf8");
const all = JSON.parse(index.slice(index.indexOf("= [") + 2, index.lastIndexOf("]") + 1));
const wanted = process.argv.slice(2);
const items = wanted.length ? all.filter((i) => wanted.includes(i.slug)) : all;

const themes = {
  base: null,
  sharp: "blue_263_0_default_geist",
  round: "orange_41_1_comfy_figtree",
  compact: "violet_293_0.375_compact_space-grotesk",
  lime: "lime_124_0.625_default_inter",
};

const desktop = {
  component: { width: 900, height: 700 },
  motion: { width: 900, height: 700 },
  illustration: { width: 900, height: 700 },
  block: { width: 1280, height: 900 },
  screen: { width: 1280, height: 860 },
};
const phone = { width: 390, height: 844 };

function inspect() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const cache = new Map();
  const rgba = (color) => {
    if (cache.has(color)) return cache.get(color);
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = "rgba(0,0,0,0)";
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
    const value = [r, g, b, a / 255];
    cache.set(color, value);
    return value;
  };
  const lum = ([r, g, b]) => {
    const f = (c) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const over = (top, bottom) => {
    const a = top[3];
    return [0, 1, 2].map((i) => top[i] * a + bottom[i] * (1 - a)).concat(1);
  };
  const backdrop = (el) => {
    const layers = [];
    for (let node = el; node && node.nodeType === 1; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.backgroundImage !== "none" && !style.backgroundImage.startsWith("url(")) return null;
      const bg = rgba(style.backgroundColor);
      if (bg[3] > 0) layers.push(bg);
      if (bg[3] >= 0.99) break;
    }
    let color = layers.length && layers.at(-1)[3] >= 0.99 ? layers.pop() : rgba(getComputedStyle(document.body).backgroundColor);
    while (layers.length) color = over(layers.pop(), color);
    return color;
  };
  const describe = (el) => {
    const cls = typeof el.className === "string" ? el.className : (el.getAttribute("class") ?? "");
    return `${el.tagName.toLowerCase()}.${cls.split(/\s+/).slice(0, 8).join(".")}`;
  };
  const visible = (el, rect) => {
    if (rect.width < 2 || rect.height < 2) return false;
    if (rect.bottom < 0 || rect.right < 0 || rect.top > innerHeight * 3 || rect.left > innerWidth) return false;
    for (let node = el; node && node.nodeType === 1; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.visibility === "hidden" || style.display === "none" || Number(style.opacity) < 0.35) return false;
    }
    return true;
  };

  const contrast = [];
  const clipped = [];
  const corners = [];
  const seen = new Set();
  for (const el of document.body.querySelectorAll("*")) {
    if (el.closest("svg") || el.closest("nextjs-portal")) continue;
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    const radius = parseFloat(style.borderTopLeftRadius) || parseFloat(style.borderBottomRightRadius) || parseFloat(style.borderTopRightRadius);
    if (radius > 0.5 && rect.width > 6 && rect.height > 6 && visible(el, rect)) {
      const full = radius >= Math.min(rect.width, rect.height) / 2 - 0.5 || style.borderRadius.includes("%");
      const painted =
        rgba(style.backgroundColor)[3] > 0.05 ||
        parseFloat(style.borderTopWidth) > 0 ||
        style.boxShadow !== "none" ||
        style.backgroundImage !== "none" ||
        el.tagName === "IMG";
      if (!full && painted) corners.push({ el: describe(el), radius: Math.round(radius * 10) / 10, w: Math.round(rect.width), h: Math.round(rect.height) });
    }
    const text = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(" ").trim();
    if (!text || !visible(el, rect)) continue;
    const key = `${el.tagName}:${text.slice(0, 40)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const fg = rgba(style.color);
    const bg = backdrop(el);
    if (bg && fg[3] > 0.5 && Number(style.opacity) > 0.5) {
      const mixed = over(fg, bg);
      const [hi, lo] = [lum(mixed), lum(bg)].sort((a, b) => b - a);
      const ratio = (hi + 0.05) / (lo + 0.05);
      contrast.push({ key, el: describe(el), ratio: Math.round(ratio * 100) / 100 });
    }
    if (el.scrollWidth > el.clientWidth + 1 && style.overflowX !== "visible" && style.overflowX !== "auto" && style.overflowX !== "scroll") {
      clipped.push({ key, el: describe(el) });
    }
  }
  return {
    overflow: document.documentElement.scrollWidth - innerWidth,
    contrast,
    clipped,
    corners,
  };
}

const browser = await chromium.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});

async function shoot(item, theme, mode, viewport, label) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1, colorScheme: mode, reducedMotion: "reduce" });
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message.slice(0, 200)));
  const query = `theme=${mode}${themes[theme] ? `&custom=${themes[theme]}` : ""}`;
  try {
    await page.goto(`${base}/preview/${item.slug}?${query}`, { waitUntil: "networkidle", timeout: 90000 });
  } catch (error) {
    errors.push(`nav: ${error.message.slice(0, 120)}`);
  }
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" }).catch(() => {});
  await page.evaluate(() => document.fonts.ready).catch(() => {});
  await page.waitForTimeout(1800);
  const result = await page.evaluate(inspect).catch((error) => ({ error: error.message }));
  const file = path.join(root, ".shots", "theme", item.slug, `${theme}-${mode}${label ? `-${label}` : ""}.png`);
  await mkdir(path.dirname(file), { recursive: true });
  await page.screenshot({ path: file }).catch(() => {});
  await page.close();
  return { ...result, errors };
}

function compare(baseShot, shot, theme) {
  const issues = [];
  if (!shot || shot.error) return [`inspect failed: ${shot?.error}`];
  if (shot.errors.length) issues.push(`errors: ${shot.errors.join(" | ")}`);
  if (shot.overflow > 0 && !(baseShot?.overflow > 0)) issues.push(`page overflows by ${shot.overflow}px`);
  const before = new Map((baseShot?.contrast ?? []).map((c) => [c.key, c.ratio]));
  for (const c of shot.contrast) {
    const was = before.get(c.key);
    if (was === undefined) continue;
    if (c.ratio < 3 && was >= 3 && c.ratio < was - 0.5) issues.push(`contrast ${was}→${c.ratio} "${c.key}" ${c.el}`);
  }
  const clippedBefore = new Set((baseShot?.clipped ?? []).map((c) => c.key));
  for (const c of shot.clipped) if (!clippedBefore.has(c.key)) issues.push(`clips "${c.key}" ${c.el}`);
  if (theme === "sharp") for (const c of shot.corners) issues.push(`corner ${c.radius}px on ${c.w}x${c.h} ${c.el}`);
  return issues;
}

const reportFile = path.join(root, ".shots", "theme", "report.json");
const report = JSON.parse(await readFile(reportFile, "utf8").catch(() => "{}"));
const jobs = items.map((item) => async () => {
  const vp = desktop[item.kind];
  const shots = {};
  for (const mode of ["light", "dark"]) for (const theme of Object.keys(themes)) shots[`${theme}-${mode}`] = await shoot(item, theme, mode, vp);
  shots["base-light-phone"] = await shoot(item, "base", "light", phone, "phone");
  shots["round-light-phone"] = await shoot(item, "round", "light", phone, "phone");
  const issues = {};
  for (const [key, shot] of Object.entries(shots)) {
    if (key.startsWith("base")) continue;
    const [theme, mode, label] = key.split("-");
    const found = compare(shots[`base-${mode}${label ? `-${label}` : ""}`], shot, theme);
    if (found.length) issues[key] = found;
  }
  report[item.slug] = { kind: item.kind, issues };
  const count = Object.values(issues).flat().length;
  console.log(`${count ? "!!" : "ok"} ${item.slug}${count ? ` (${count})` : ""}`);
  await writeFile(reportFile, JSON.stringify(report, null, 2));
});

let next = 0;
await Promise.all(
  Array.from({ length: Math.min(workers, jobs.length) }, async () => {
    while (next < jobs.length) await jobs[next++]();
  }),
);

await browser.close();
