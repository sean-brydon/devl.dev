// Screenshots of the theme customiser for docs and PRs: node scripts/theme-showcase.mjs <outDir>
// Opens the library with the panel open under a few presets, in light and dark. SHOTS_URL picks the server.
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";

const base = process.env.SHOTS_URL ?? "http://localhost:3417";
const out = path.resolve(process.argv[2] ?? ".shots/showcase");
await mkdir(out, { recursive: true });

const browser = await chromium.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});

const shots = [
  { name: "panel-blueprint-light", mode: "light", preset: "Blueprint", url: "/components" },
  { name: "panel-marmalade-dark", mode: "dark", preset: "Marmalade", url: "/components" },
  { name: "panel-grape-light-screens", mode: "light", preset: "Grape soda", url: "/screens" },
  { name: "panel-lime-dark-blocks", mode: "dark", preset: "Lime goo", url: "/blocks" },
];

for (const shot of shots) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, colorScheme: shot.mode });
  await page.goto(`${base}${shot.url}`, { waitUntil: "networkidle", timeout: 90000 });
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  await page.evaluate(() => window.scrollTo(0, 520));
  await page.getByRole("button", { name: "Customise the preview theme" }).first().click();
  await page.getByRole("button", { name: shot.preset }).click();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(out, `${shot.name}.jpg`), type: "jpeg", quality: 78 });
  await page.close();
}

const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: "light" });
await phone.goto(`${base}/components`, { waitUntil: "networkidle", timeout: 90000 });
await phone.addStyleTag({ content: "nextjs-portal{display:none!important}" });
await phone.getByRole("button", { name: "Customise the preview theme" }).first().click();
await phone.getByRole("button", { name: "Fern" }).click();
await phone.waitForTimeout(2000);
await phone.screenshot({ path: path.join(out, "panel-fern-phone.jpg"), type: "jpeg", quality: 78 });
await browser.close();
