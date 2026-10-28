// A stateless MCP server over Streamable HTTP (JSON responses, no sessions) that lets agents search and read the catalogue.
import { categoriesOf, getItem, installCommand, itemHref, items, kinds, type ItemKind, type RegistryItem } from "@/lib/registry";
import { itemProps } from "@/registry/__generated__/props";
import { readAsset } from "@/server/platform";

const site = "https://devl.dev";
const versions = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"];
const kindValues = kinds.map((kind) => kind.value);

type Json = Record<string, unknown>;
interface RpcRequest {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Json;
}

const instructions = `devl (${site}) is a free, open-source catalogue of ${items.length} React components, blocks, screens, motion pieces and illustrations built on coss ui (Base UI + Tailwind CSS). Every item is one TypeScript file installed with the shadcn CLI.
Use search_items or suggest_for to find pieces, get_item to read one (source, install command, dependencies), and list_categories to browse. Install with the command get_item returns; the project needs coss ui first (npx shadcn@latest init @coss/style). Base UI uses a render prop, not asChild. Adapt pieces freely: they are meant to be owned and changed.`;

const tools = [
  {
    name: "search_items",
    title: "Search devl",
    description: "Search devl's components, blocks, screens, motion and illustrations by keywords. Returns names, slugs, descriptions, page links and install commands.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Keywords, e.g. 'otp input', 'pricing toggle', 'settings page'." },
        kind: { type: "string", enum: kindValues, description: "Limit to one kind." },
        category: { type: "string", description: "Limit to one category, e.g. 'Liquid' or 'Auth'." },
        limit: { type: "number", description: "Max results (default 10, max 30)." },
      },
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: "get_item",
    title: "Get a devl item",
    description: "Get one devl item by slug: description, install command, npm and coss ui dependencies, a usage snippet, and the full TypeScript source.",
    inputSchema: {
      type: "object",
      properties: {
        slug: { type: "string", description: "The item slug, e.g. 'liquid-slider'." },
        includeSource: { type: "boolean", description: "Include the full source (default true)." },
      },
      required: ["slug"],
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: "list_categories",
    title: "List devl categories",
    description: "List devl's kinds and categories with item counts and a few example items in each, to browse what exists.",
    inputSchema: { type: "object", properties: { kind: { type: "string", enum: kindValues, description: "Only this kind." } } },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: "suggest_for",
    title: "Suggest devl pieces for a brief",
    description: "Describe what you are building (a screen, a feature, a product) and get the devl pieces worth starting from or borrowing ideas from, grouped by kind.",
    inputSchema: {
      type: "object",
      properties: { brief: { type: "string", description: "What you are building, e.g. 'onboarding for a B2B analytics app with team invites'." } },
      required: ["brief"],
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
];

const stop = new Set(["a", "an", "and", "the", "for", "with", "of", "to", "in", "on", "my", "i", "we", "app", "page", "ui", "component", "components", "react", "build", "building", "that", "some", "need", "area", "section", "feature", "product", "saas", "like", "simple", "nice", "good"]);

function tokens(text: string) {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 1 && !stop.has(token));
}

function score(item: RegistryItem, words: string[]) {
  const fields: [string, number][] = [
    [item.name.toLowerCase(), 6],
    [item.slug, 5],
    [(item.keywords ?? []).join(" ").toLowerCase(), 4],
    [item.category.toLowerCase(), 3],
    [item.description.toLowerCase(), 1],
  ];
  let total = 0;
  const hits: string[] = [];
  for (const word of words) {
    const stem = word.length > 4 ? word.replace(/(ing|es|s)$/, "") : word;
    let best = 0;
    for (const [field, weight] of fields) if (field.includes(stem)) best = Math.max(best, weight);
    if (best) hits.push(word);
    total += best;
  }
  return { total: total * hits.length, hits };
}

function line(item: RegistryItem) {
  return `- **${item.name}** (\`${item.slug}\`, ${item.kind}, ${item.category}): ${item.description}\n  ${site}${itemHref(item)} · \`${installCommand(item)}\``;
}

function search(args: Json) {
  const query = String(args.query ?? "");
  const kind = kindValues.includes(args.kind as ItemKind) ? (args.kind as ItemKind) : undefined;
  const category = typeof args.category === "string" ? args.category.toLowerCase() : undefined;
  const limit = Math.min(Math.max(Number(args.limit) || 10, 1), 30);
  const words = tokens(query);
  const pool = items.filter((item) => (!kind || item.kind === kind) && (!category || item.category.toLowerCase() === category));
  const ranked = words.length
    ? pool
        .map((item) => ({ item, ...score(item, words) }))
        .filter((entry) => entry.total > 0)
        .sort((a, b) => b.total - a.total || a.item.name.localeCompare(b.item.name))
        .map((entry) => entry.item)
    : pool;
  if (ranked.length === 0) return `No devl items match "${query}". Try broader words, or list_categories to browse.`;
  return `${ranked.length} match${ranked.length === 1 ? "" : "es"}${ranked.length > limit ? `, showing ${limit}` : ""}:\n\n${ranked.slice(0, limit).map(line).join("\n")}`;
}

async function describe(args: Json, origin: string) {
  const item = getItem(String(args.slug ?? "").trim());
  if (!item) return { text: `No devl item with slug "${args.slug}". Use search_items to find one.`, error: true };
  const parts = [
    `# ${item.name}`,
    item.description,
    `Kind: ${item.kind} · Category: ${item.category} · Page: ${site}${itemHref(item)} · Preview: ${site}/preview/${item.slug}`,
    `## Install\n\n\`\`\`bash\n${installCommand(item)}\n\`\`\`\nNeeds coss ui set up first: \`npx shadcn@latest init @coss/style\`.`,
  ];
  if (item.dependencies?.length) parts.push(`npm dependencies: ${item.dependencies.join(", ")}`);
  if (item.uiDependencies?.length) parts.push(`coss ui components used: ${item.uiDependencies.join(", ")}`);
  if (item.component && item.source !== "bklit") {
    parts.push(`## Use it\n\n\`\`\`tsx\nimport { ${item.component} } from "@/components/${item.slug}";\n\nexport default function Page() {\n  return <${item.component} />;\n}\n\`\`\`\nEvery prop has a typed default.`);
  }
  const api = item.source ? undefined : itemProps[item.slug];
  if (api && (api.props.length || api.extends.length)) {
    const rows = api.props.map((p) => `- \`${p.name}${p.required ? "" : "?"}: ${p.type}\`${p.default ? ` (default \`${p.default}\`)` : ""}${p.description ? `: ${p.description}` : ""}`);
    parts.push(`## Props\n\n${rows.join("\n")}${api.extends.length ? `\n\nAlso accepts ${api.extends.join(", ")}.` : ""}`);
  }
  if (args.includeSource !== false && item.source !== "bklit") {
    const source = await readAsset(`/raw/${item.slug}.tsx`, origin);
    parts.push(source ? `## Source (${item.slug}.tsx)\n\n\`\`\`tsx\n${source}\n\`\`\`` : `Source: ${site}/raw/${item.slug}.tsx`);
  }
  if (item.source === "bklit") parts.push("This chart comes from the bklit chart library (MIT); the install command pulls it from bklit's registry.");
  return { text: parts.join("\n\n"), error: false };
}

function browse(args: Json) {
  const only = kindValues.includes(args.kind as ItemKind) ? [args.kind as ItemKind] : kindValues;
  return only
    .map((kind) => {
      const label = kinds.find((k) => k.value === kind)?.label ?? kind;
      const rows = categoriesOf(kind).map((category) => {
        const examples = items.filter((item) => item.kind === kind && item.category === category.name).slice(0, 3).map((item) => item.name);
        return `- ${category.name} (${category.count}): ${examples.join(", ")}`;
      });
      return `## ${label}\n${rows.join("\n")}`;
    })
    .join("\n\n");
}

function suggest(args: Json) {
  const brief = String(args.brief ?? "");
  const words = tokens(brief);
  if (words.length === 0) return "Describe what you are building, e.g. 'a settings area for a SaaS app with team roles and API keys'.";
  const ranked = items.map((item) => ({ item, ...score(item, words) })).filter((entry) => entry.total >= 4);
  const groups = kindValues
    .map((kind) => {
      const picks = ranked
        .filter((entry) => entry.item.kind === kind)
        .sort((a, b) => b.total - a.total)
        .slice(0, kind === "component" ? 6 : 4);
      if (picks.length === 0) return null;
      const label = kinds.find((k) => k.value === kind)?.label ?? kind;
      return `## ${label}\n${picks.map((entry) => `${line(entry.item)}\n  matches: ${entry.hits.join(", ")}`).join("\n")}`;
    })
    .filter(Boolean);
  if (groups.length === 0) return `Nothing in devl matches "${brief}" directly. Try list_categories to browse.`;
  return `devl pieces for "${brief}". Start from a screen or block if one fits, then pull in components; use get_item to read the source and borrow patterns.\n\n${groups.join("\n\n")}`;
}

async function call(name: string, args: Json, origin: string) {
  if (name === "search_items") return { text: search(args), error: false };
  if (name === "get_item") return describe(args, origin);
  if (name === "list_categories") return { text: browse(args), error: false };
  if (name === "suggest_for") return { text: suggest(args), error: false };
  return null;
}

async function respond(message: RpcRequest, origin: string): Promise<Json | null> {
  const { id, method, params = {} } = message;
  if (id === undefined || id === null) return null;
  const ok = (result: Json) => ({ jsonrpc: "2.0", id, result });
  const fail = (code: number, text: string) => ({ jsonrpc: "2.0", id, error: { code, message: text } });
  switch (method) {
    case "initialize": {
      const asked = String(params.protocolVersion ?? "");
      return ok({
        protocolVersion: versions.includes(asked) ? asked : versions[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "devl", title: "devl", version: "1.0.0", websiteUrl: site },
        instructions,
      });
    }
    case "ping":
      return ok({});
    case "tools/list":
      return ok({ tools });
    case "tools/call": {
      const result = await call(String(params.name ?? ""), (params.arguments as Json) ?? {}, origin);
      if (!result) return fail(-32602, `Unknown tool: ${params.name}`);
      return ok({ content: [{ type: "text", text: result.text }], isError: result.error });
    }
    default:
      return fail(-32601, `Method not found: ${method}`);
  }
}

/** Handles one Streamable HTTP POST body: a single JSON-RPC message or a batch. */
export async function handleMcp(body: unknown, origin: string): Promise<Json | Json[] | null> {
  if (Array.isArray(body)) {
    const replies = (await Promise.all(body.map((message) => respond(message as RpcRequest, origin)))).filter((reply): reply is Json => reply !== null);
    return replies.length ? replies : null;
  }
  return respond(body as RpcRequest, origin);
}
