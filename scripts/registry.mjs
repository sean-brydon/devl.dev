// Builds the registry from src/registry/items/<slug>/{meta.json,<slug>.tsx,demo.tsx}:
// the site index, highlighted code for the Code tab (public/code), raw sources (public/raw) and shadcn install files (public/r).
// Code stays out of the server bundle: the Code tab fetches its file only when opened.
import { mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { codeToHtml } from "shiki";

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

await rm(path.join(outDir, "code"), { recursive: true, force: true });
for (const dir of [outDir, publicDir, codeDir, rawDir]) await mkdir(dir, { recursive: true });
const depsOf = new Map();
const llms = [];

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

  if (meta.source) {
    const upstream = meta.upstream ?? slug;
    llms.push(`- [${meta.name}](${site}/components/${slug}): ${meta.description} Install: \`npx shadcn@latest add https://ui.bklit.com/r/${upstream}.json\` (by bklit, MIT).`);
    continue;
  }

  await put(path.join(rawDir, `${slug}.tsx`), source);

  const kindPath = { component: "components", block: "blocks", screen: "screens", motion: "motion", illustration: "illustrations" }[meta.kind];
  llms.push(`- [${meta.name}](${site}/${kindPath}/${slug}): ${meta.description} Install: \`npx shadcn@latest add ${site}/r/${slug}.json\` · Raw: ${site}/raw/${slug}.tsx${deps.length ? ` · npm: ${deps.join(", ")}` : ""}${ui.length ? ` · coss ui: ${ui.join(", ")}` : ""}`);

  await put(
    path.join(publicDir, `${slug}.json`),
    JSON.stringify(
      {
        $schema: "https://ui.shadcn.com/schema/registry-item.json",
        name: slug,
        type: ["component", "motion", "illustration"].includes(meta.kind) ? "registry:component" : "registry:block",
        title: meta.name,
        description: meta.description,
        dependencies: deps,
        registryDependencies: [
          ...(usesUtils ? ["utils"] : []),
          ...ui.map((name) => `https://coss.com/ui/r/${name}.json`),
        ],
        files: [{ path: `registry/devl/${slug}.tsx`, type: "registry:component", content: source }],
      },
      null,
      2,
    ),
  );
}

const index = items.map(({ slug, meta }) => ({
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
  ...(depsOf.get(slug).deps.length ? { dependencies: depsOf.get(slug).deps } : {}),
  ...(depsOf.get(slug).ui.length ? { uiDependencies: depsOf.get(slug).ui } : {}),
}));

await put(
  path.join(outDir, "index.ts"),
  `// Generated by scripts/registry.mjs. Do not edit.\nimport type { RegistryItem } from "@/registry/types";\n\nexport const generatedItems: RegistryItem[] = ${JSON.stringify(index, null, 2)};\n`,
);

await put(
  path.join(outDir, "demos.tsx"),
  `// Generated by scripts/registry.mjs. Do not edit.\n"use client";\n\nimport dynamic from "next/dynamic";\nimport type { ComponentType } from "react";\n\nexport const demos: Record<string, ComponentType> = {\n${items
    .map(({ slug }) => `  ${JSON.stringify(slug)}: dynamic(() => import("@/registry/items/${slug}/demo")),`)
    .join("\n")}\n};\n`,
);

await put(
  path.join(root, "public/llms.txt"),
  `# devl\n\n> Hand-built React components on coss ui (Base UI + Tailwind v4). Install any item with the shadcn CLI, or fetch its raw source.\n\n## How to install\n\n1. Prefer the registry: \`npx shadcn@latest add <registry url>\`. It installs the file plus its npm and coss ui dependencies.\n2. If the project doesn't use shadcn, fetch the raw .tsx, save it as components/<slug>.tsx, install the listed npm packages, and add the listed coss ui components from https://coss.com/ui (or adapt imports of @/components/ui/* to your own kit). \`cn\` is clsx + tailwind-merge.\n\n## Items\n\n${llms.join("\n")}\n`,
);

const own = items.filter((i) => !i.meta.source);
const keep = [
  [codeDir, new Set(items.map((i) => `${i.slug}.json`))],
  [publicDir, new Set(own.map((i) => `${i.slug}.json`))],
  [rawDir, new Set(own.map((i) => `${i.slug}.tsx`))],
];
for (const [dir, live] of keep) {
  for (const file of await readdir(dir)) {
    if (!live.has(file)) await rm(path.join(dir, file), { force: true });
  }
}

for (const p of problems) console.warn(`registry: skipped ${p}`);
console.log(`registry: ${items.length} items`);
