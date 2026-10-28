// Builds the registry from src/registry/items/<slug>/{meta.json,<slug>.tsx,demo.tsx}:
// the site index, highlighted code for the Code tab (public/code), raw sources (public/raw) and shadcn install files (public/r).
// Code stays out of the server bundle: the Code tab fetches its file only when opened.
import { mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { codeToHtml } from "shiki";
import { propsOf } from "./props.mjs";

const root = path.resolve(import.meta.dirname, "..");
const itemsDir = path.join(root, "src/registry/items");
const outDir = path.join(root, "src/registry/__generated__");
const publicDir = path.join(root, "public/r");
const codeDir = path.join(root, "public/code");
const rawDir = path.join(root, "public/raw");
const site = "https://devl.dev";
const kinds = ["component", "block", "screen", "motion", "illustration"];
const builtins = new Set(["react", "react-dom", "next"]);

const slugs = (await readdir(itemsDir, { withFileTypes: true }))
  .filter((d) => d.isDirectory() && !d.name.startsWith("_"))
  .map((d) => d.name)
  .sort();

const items = [];
const problems = [];

for (const slug of slugs) {
  const dir = path.join(itemsDir, slug);
  let meta;
  try {
    meta = JSON.parse(await readFile(path.join(dir, "meta.json"), "utf8"));
  } catch {
    problems.push(`${slug}: missing or invalid meta.json`);
    continue;
  }
  const files = await readdir(dir);
  if (!files.includes(`${slug}.tsx`) || !files.includes("demo.tsx")) {
    problems.push(`${slug}: needs ${slug}.tsx and demo.tsx`);
    continue;
  }
  if (!kinds.includes(meta.kind)) {
    problems.push(`${slug}: kind must be one of ${kinds.join(", ")}`);
    continue;
  }
  const source = await readFile(path.join(dir, `${slug}.tsx`), "utf8");
  const demo = await readFile(path.join(dir, "demo.tsx"), "utf8");
  items.push({ slug, meta, source, demo });
}

function importsOf(code) {
  return [...code.matchAll(/from\s+["']([^"']+)["']/g)].map((m) => m[1]);
}

function packageName(spec) {
  return spec.startsWith("@") ? spec.split("/").slice(0, 2).join("/") : spec.split("/")[0];
}

async function highlight(code) {
  return codeToHtml(code, {
    lang: "tsx",
    themes: { light: "github-light", dark: "github-dark-default" },
    defaultColor: false,
  });
}

// Agents run this concurrently while the dev server watches: write atomically and only on change.
async function put(file, content) {
  const prev = await readFile(file, "utf8").catch(() => null);
  if (prev === content) return;
  const tmp = `${file}.${process.pid}.tmp`;
  await writeFile(tmp, content);
  await rename(tmp, file);
}

// Last commit that touched each item (the sitemap's lastmod) and the first (the changelog). Items not committed yet have neither.
const updatedOf = new Map();
const addedOf = new Map();
try {
  const log = execFileSync("git", ["log", "--format=@%cs", "--name-only", "--", "src/registry/items"], { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  let date = "";
  for (const line of log.split("\n")) {
    if (line.startsWith("@")) date = line.slice(1);
    const slug = /^src\/registry\/items\/([^/]+)\//.exec(line)?.[1];
    if (slug && !updatedOf.has(slug)) updatedOf.set(slug, date);
    if (slug) addedOf.set(slug, date);
  }
} catch {}

const kindPaths = { component: "components", block: "blocks", screen: "screens", motion: "motion", illustration: "illustrations" };
const kindTitles = { component: "Components", block: "Blocks", screen: "Screens", motion: "Motion", illustration: "Illustrations" };

await rm(path.join(outDir, "code"), { recursive: true, force: true });
for (const dir of [outDir, publicDir, codeDir, rawDir, ...Object.values(kindPaths).map((p) => path.join(root, "public", p))]) {
  await mkdir(dir, { recursive: true });
}
const depsOf = new Map();
const llms = Object.fromEntries(kinds.map((kind) => [kind, []]));
const full = [];
const registryIndex = [];

const propsBySlug = {};
const cell = (text) => text.replaceAll("|", "\\|").replaceAll("\n", " ");

function propsMarkdown(api) {
  if (!api?.props.length && !api?.extends.length) return [];
  const described = api.props.some((p) => p.description);
  const rows = api.props.map(
    (p) => `| \`${p.name}\`${p.required ? "" : "?"} | \`${cell(p.type)}\` | ${p.default ? `\`${cell(p.default)}\`` : ""} |${described ? ` ${cell(p.description ?? "")} |` : ""}`,
  );
  return [
    "",
    "## Props",
    "",
    ...(rows.length ? [described ? "| Prop | Type | Default | Description |" : "| Prop | Type | Default |", described ? "| --- | --- | --- | --- |" : "| --- | --- | --- |", ...rows] : []),
    ...(api.extends.length ? ["", `Also accepts: ${api.extends.map((e) => `\`${e}\``).join(", ")}.`] : []),
  ];
}

// One Markdown page per item at /<kind>/<slug>.md: what it is, how to install it, a usage example and the full source.
function itemMarkdown({ slug, meta, source, usage, deps, ui, install, raw, api }) {
  const page = `${site}/${kindPaths[meta.kind]}/${slug}`;
  return [
    `# ${meta.name}`,
    "",
    `> ${meta.description}`,
    "",
    `- Page: ${page}`,
    `- Kind: ${meta.kind} · ${meta.category ?? "General"}`,
    `- Install: \`${install}\``,
    ...(raw ? [`- Raw source: ${raw}`] : []),
    ...(deps.length ? [`- npm: ${deps.join(", ")}`] : []),
    ...(ui.length ? [`- coss ui: ${ui.join(", ")}`] : []),
    ...(meta.source ? ["- By bklit (MIT): https://ui.bklit.com"] : ["- License: MIT. The coss ui components it uses (https://coss.com/ui) are AGPL-3.0."]),
    "",
    "## Usage",
    "",
    "```tsx",
    usage.trim(),
    "```",
    ...propsMarkdown(api),
    ...(source ? ["", `## Source: components/${slug}.tsx`, "", "```tsx", source.trim(), "```"] : []),
    "",
  ].join("\n");
}

for (const { slug, meta, source, demo } of items) {
  const imports = importsOf(source);
  const ui = [...new Set(imports.filter((s) => s.startsWith("@/components/ui/")).map((s) => s.split("/").pop()))];
  const deps = [
    ...new Set(imports.filter((s) => !s.startsWith(".") && !s.startsWith("@/")).map(packageName)),
  ].filter((d) => !builtins.has(d));
  const usesUtils = imports.includes("@/lib/utils");

  const demoForUsers = demo.replaceAll(`@/registry/items/${slug}/${slug}`, `@/components/${slug}`);
  depsOf.set(slug, { deps, ui });
  await put(
    path.join(codeDir, `${slug}.json`),
    JSON.stringify({
      files: [
        { name: `${slug}.tsx`, code: source, html: await highlight(source) },
        { name: "demo.tsx", code: demoForUsers, html: await highlight(demoForUsers) },
      ],
    }),
  );

  const kindPath = kindPaths[meta.kind];
  const page = `${site}/${kindPath}/${slug}`;
  const install = meta.source
    ? `npx shadcn@latest add https://ui.bklit.com/r/${meta.upstream ?? slug}.json`
    : `npx shadcn@latest add ${site}/r/${slug}.json`;
  const raw = meta.source ? null : `${site}/raw/${slug}.tsx`;
  const component = source.match(/export function ([A-Z]\w*)/)?.[1];
  const api = meta.source ? null : propsOf(source, component);
  if (api) propsBySlug[slug] = api;
  const markdown = { slug, meta, usage: demoForUsers, deps, ui, install, raw, api };
  await put(path.join(root, "public", kindPath, `${slug}.md`), itemMarkdown({ ...markdown, source: meta.source ? null : source }));
  full.push(itemMarkdown({ ...markdown, source: null }).replace(/^# /, "### "));

  if (meta.source) {
    llms[meta.kind].push(`- [${meta.name}](${page}): ${meta.description} Install: \`${install}\` (by bklit, MIT). Markdown: ${page}.md`);
    continue;
  }

  await put(path.join(rawDir, `${slug}.tsx`), source);

  llms[meta.kind].push(`- [${meta.name}](${page}): ${meta.description} Install: \`${install}\` · Markdown with source: ${page}.md${deps.length ? ` · npm: ${deps.join(", ")}` : ""}${ui.length ? ` · coss ui: ${ui.join(", ")}` : ""}`);

  const entry = {
    name: slug,
    type: ["component", "motion", "illustration"].includes(meta.kind) ? "registry:component" : "registry:block",
    title: meta.name,
    description: meta.description,
    categories: [meta.kind, meta.category],
    dependencies: deps,
    registryDependencies: [
      ...(usesUtils ? ["utils"] : []),
      ...ui.map((name) => `https://coss.com/ui/r/${name}.json`),
    ],
    files: [{ path: `registry/devl/${slug}.tsx`, type: "registry:component" }],
  };
  registryIndex.push(entry);
  await put(
    path.join(publicDir, `${slug}.json`),
    JSON.stringify(
      { $schema: "https://ui.shadcn.com/schema/registry-item.json", ...entry, files: [{ ...entry.files[0], content: source }] },
      null,
      2,
    ),
  );
}

// The registry index lets the shadcn CLI and MCP list and search devl under a namespace: "@devl": "https://devl.dev/r/{name}.json".
await put(
  path.join(publicDir, "registry.json"),
  JSON.stringify({ $schema: "https://ui.shadcn.com/schema/registry.json", name: "devl", homepage: site, items: registryIndex }, null, 2),
);

const index = items.map(({ slug, meta, source }) => ({
  slug,
  name: meta.name,
  description: meta.description,
  kind: meta.kind,
  category: meta.category ?? "General",
  ...(meta.isNew ? { isNew: true } : {}),
  ...(meta.featured ? { featured: true } : {}),
  ...(meta.no ? { no: meta.no } : {}),
  ...(meta.keywords?.length ? { keywords: meta.keywords } : {}),
  ...(meta.source ? { source: meta.source, upstream: meta.upstream ?? slug } : {}),
  ...(meta.poweredBy ? { poweredBy: meta.poweredBy } : {}),
  ...(meta.shoutout ? { shoutout: meta.shoutout } : {}),
  ...(source.match(/export function ([A-Z]\w*)/) ? { component: source.match(/export function ([A-Z]\w*)/)[1] } : {}),
  ...(existsSync(path.join(root, "public/og", `${slug}.jpg`)) ? { og: true } : {}),
  ...(updatedOf.has(slug) ? { updated: updatedOf.get(slug) } : {}),
  ...(addedOf.has(slug) ? { added: addedOf.get(slug) } : {}),
  ...(depsOf.get(slug).deps.length ? { dependencies: depsOf.get(slug).deps } : {}),
  ...(depsOf.get(slug).ui.length ? { uiDependencies: depsOf.get(slug).ui } : {}),
}));

await put(
  path.join(outDir, "index.ts"),
  `// Generated by scripts/registry.mjs. Do not edit.\nimport type { RegistryItem } from "@/registry/types";\n\nexport const generatedItems: RegistryItem[] = ${JSON.stringify(index, null, 2)};\n`,
);

await put(
  path.join(outDir, "props.ts"),
  `// Generated by scripts/registry.mjs from each item's TypeScript. Do not edit.\nimport type { ItemProps } from "@/registry/types";\n\nexport const itemProps: Record<string, ItemProps> = ${JSON.stringify(propsBySlug, null, 2)};\n`,
);

await put(
  path.join(outDir, "demos.tsx"),
  `// Generated by scripts/registry.mjs. Do not edit.\n"use client";\n\nimport dynamic from "next/dynamic";\nimport type { ComponentType } from "react";\n\nexport const demos: Record<string, ComponentType> = {\n${items
    .map(({ slug }) => `  ${JSON.stringify(slug)}: dynamic(() => import("@/registry/items/${slug}/demo")),`)
    .join("\n")}\n};\n`,
);

const intro = `# devl

> devl (https://devl.dev) is a free, open-source catalogue of ${items.length} React components, blocks, screens, motion pieces and illustrations built on coss ui (Base UI + Tailwind CSS v4). Every item is one TypeScript file: install it with the shadcn CLI, or read its source and adapt it. Use devl when building or restyling React or Next.js UI, to start from a working piece or borrow its patterns.

## How to install

1. Set up coss ui once: \`npx shadcn@latest init @coss/style\`.
2. Add an item: \`npx shadcn@latest add https://devl.dev/r/<slug>.json\`. It installs components/<slug>.tsx plus its npm and coss ui dependencies. With \`"@devl": "https://devl.dev/r/{name}.json"\` in components.json's registries, \`npx shadcn@latest add @devl/<slug>\` works too.
3. Import the named export (PascalCase of the slug, e.g. \`LiquidSlider\` from \`@/components/liquid-slider\`). Every prop has a typed default.
4. Without shadcn: fetch https://devl.dev/raw/<slug>.tsx, save it as components/<slug>.tsx, install the listed npm packages, and add the listed coss ui components from https://coss.com/ui (or point the @/components/ui/* imports at your own kit). \`cn\` is clsx + tailwind-merge.

## For agents

- [MCP server](https://devl.dev/docs/mcp): Streamable HTTP at https://devl.dev/mcp, no auth. Tools: search_items, get_item, list_categories, suggest_for.
- [Agent skill](https://devl.dev/skill/SKILL.md): a SKILL.md that teaches an agent when and how to use devl. Setup: https://devl.dev/docs/skill
- [Markdown pages](https://devl.dev/components/liquid-slider.md): add .md to any item page (or send Accept: text/markdown) for its description, install command, usage example and full source.
- [llms-full.txt](https://devl.dev/llms-full.txt): every item with its usage example, in one file.
- [shadcn registry index](https://devl.dev/r/registry.json): every installable item in shadcn's registry format.

## Docs

- [Getting started](https://devl.dev/docs): install with the shadcn CLI, the @devl namespace, using devl without shadcn.
- [Claude Code](https://devl.dev/docs/claude), [Codex](https://devl.dev/docs/codex), [Cursor](https://devl.dev/docs/cursor), [VS Code](https://devl.dev/docs/vscode): connect the MCP server and skill to each editor.
- Theming: every preview has a theme panel (colour, radius, spacing, font) that exports CSS variables or a shadcn theme item.
`;
const sections = kinds.map((kind) => `## ${kindTitles[kind]}\n\n${llms[kind].join("\n")}`).join("\n\n");

await put(path.join(root, "public/llms.txt"), `${intro}\n${sections}\n`);
await put(
  path.join(root, "public/llms-full.txt"),
  `${intro}\n## Items\n\nEach item's full source is at its Markdown page (the page URL plus .md) or https://devl.dev/raw/<slug>.tsx.\n\n${full.join("\n")}`,
);

const own = items.filter((i) => !i.meta.source);
const keep = [
  [codeDir, new Set(items.map((i) => `${i.slug}.json`))],
  [publicDir, new Set([...own.map((i) => `${i.slug}.json`), "registry.json"])],
  [rawDir, new Set(own.map((i) => `${i.slug}.tsx`))],
  ...kinds.map((kind) => [
    path.join(root, "public", kindPaths[kind]),
    new Set(items.filter((i) => i.meta.kind === kind).map((i) => `${i.slug}.md`)),
  ]),
];
for (const [dir, live] of keep) {
  for (const file of await readdir(dir)) {
    if (!live.has(file)) await rm(path.join(dir, file), { force: true });
  }
}

for (const p of problems) console.warn(`registry: skipped ${p}`);
console.log(`registry: ${items.length} items`);
