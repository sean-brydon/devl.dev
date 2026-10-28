// Accessibility scan of registry previews: node scripts/a11y.mjs [slug ...]
// Runs axe-core (WCAG 2 A/AA) in light and dark, then tabs through each preview and flags focus stops with no visible focus style.
// Writes .shots/a11y/<slug>.json per item (the axe violations with targets, and unstyled focus stops), plus .shots/a11y.json for a full run.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";

const root = path.resolve(import.meta.dirname, "..");
const base = process.env.SHOTS_URL ?? "http://localhost:3417";
const index = await readFile(path.join(root, "src/registry/__generated__/index.ts"), "utf8");
const all = JSON.parse(index.slice(index.indexOf("= [") + 2, index.lastIndexOf("]") + 1));
const wanted = process.argv.slice(2);
const items = wanted.length ? all.filter((i) => wanted.includes(i.slug)) : all;
const axe = await (await fetch("https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.2/axe.min.js")).text();

const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
const report = {};

async function scan(item, theme) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, colorScheme: theme, reducedMotion: "reduce" });
  try {
    await page.goto(`${base}/preview/${item.slug}?theme=${theme}`, { waitUntil: "networkidle", timeout: 60000 });
    await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
    await page.waitForTimeout(1200);
    await page.addScriptTag({ content: axe });
    const violations = await page.evaluate(async () => {
      const result = await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] }, resultTypes: ["violations"] });
      return result.violations.map((v) => ({
        rule: v.id,
        impact: v.impact,
        help: v.help,
        targets: v.nodes.slice(0, 6).map((n) => ({ target: n.target.join(" "), summary: n.failureSummary?.split("\n").slice(0, 3).join(" ") })),
        count: v.nodes.length,
      }));
    });
    let focus = [];
    if (theme === "light") {
      focus = await page.evaluate(async () => {
        const style = (el) => {
          const s = getComputedStyle(el);
          return [s.outlineStyle, s.outlineWidth, s.outlineColor, s.boxShadow, s.borderColor, s.backgroundColor, s.textDecorationLine].join("|");
        };
        const focusable = [...document.querySelectorAll("a[href],button,input,select,textarea,[tabindex]:not([tabindex='-1']),[role=slider],[role=switch],[role=tab]")].filter(
          (el) => !el.hasAttribute("disabled") && el.getClientRects().length,
        );
        const bad = [];
        for (const el of focusable.slice(0, 40)) {
          const before = style(el);
          el.focus({ focusVisible: true });
          await new Promise((r) => requestAnimationFrame(() => r()));
          if (document.activeElement !== el) continue;
          const matches = el.matches(":focus-visible");
          const after = style(el);
          if (matches && before === after) bad.push((el.getAttribute("aria-label") || el.textContent || el.tagName).trim().slice(0, 40) || el.tagName);
          el.blur();
        }
        return bad;
      });
    }
    return { violations, focus };
  } catch (error) {
    return { error: String(error).slice(0, 200), violations: [], focus: [] };
  } finally {
    await page.close();
  }
}

const queue = [...items];
await Promise.all(
  Array.from({ length: 6 }, async () => {
    while (queue.length) {
      const item = queue.shift();
      const light = await scan(item, "light");
      const dark = await scan(item, "dark");
      report[item.slug] = { kind: item.kind, light: light.violations, dark: dark.violations, focus: light.focus, error: light.error ?? dark.error };
      const n = light.violations.length + dark.violations.length + light.focus.length;
      console.log(`${n ? "!!" : "ok"} ${item.slug}${n ? ` axe=${light.violations.map((v) => v.rule).concat(dark.violations.map((v) => `dark:${v.rule}`)).join(",")} focus=${light.focus.length}` : ""}`);
    }
  }),
);

await browser.close();
await mkdir(path.join(root, ".shots", "a11y"), { recursive: true });
for (const [slug, entry] of Object.entries(report)) await writeFile(path.join(root, ".shots", "a11y", `${slug}.json`), JSON.stringify(entry, null, 2));
if (!wanted.length) await writeFile(path.join(root, ".shots", "a11y.json"), JSON.stringify(report, null, 2));
