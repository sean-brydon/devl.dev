// Install and agent events written to Workers Analytics Engine (dataset devl_events) from worker.ts.
// No IPs, no cookies, no full user agents: only what was fetched, a coarse client family, the country and the referrer's host.
// Imported by worker.ts, which is bundled outside the Next build, so this file uses no path aliases or imports.

export type EventName = "install" | "raw" | "llms" | "skill" | "mcp" | "markdown" | "agent" | "referral";

/**
 * One data point per event. Column order is the SQL schema, so append new columns rather than reorder:
 * index1 = event; blob1 = event, blob2 = subject (slug, file or MCP method/tool), blob3 = detail (get_item slug, MCP client name),
 * blob4 = client family, blob5 = country, blob6 = referrer host; double1 = 1, double2 = HTTP status.
 */
export interface DataPoint {
  indexes: string[];
  blobs: string[];
  doubles: number[];
}

export interface EventsDataset {
  writeDataPoint(point: DataPoint): void;
}

export interface TrackedAsset {
  event: "install" | "raw" | "llms" | "skill" | "markdown";
  subject: string;
}

/** The static files worth counting. Each needs a matching `assets.run_worker_first` pattern in wrangler.jsonc. */
export function trackedAsset(pathname: string): TrackedAsset | null {
  let match = /^\/r\/([\w-]+)\.json$/.exec(pathname);
  if (match) return { event: "install", subject: match[1] };
  match = /^\/raw\/([\w-]+)\.tsx$/.exec(pathname);
  if (match) return { event: "raw", subject: match[1] };
  if (pathname === "/llms.txt" || pathname === "/llms-full.txt") return { event: "llms", subject: pathname.slice(1) };
  match = /^\/(?:components|blocks|screens|motion|illustrations)\/([\w-]+)\.md$/.exec(pathname);
  if (match) return { event: "markdown", subject: match[1] };
  match = /^\/skill\/([\w.-]+)$/.exec(pathname);
  if (match) return { event: "skill", subject: match[1] };
  return null;
}

// Order matters: the AI vendors' own agents first, split by job (training crawler, search index, fetch on a user's behalf).
const clients: [RegExp, string][] = [
  [/shadcn/i, "shadcn"],
  [/ChatGPT-User/i, "chatgpt-user"],
  [/OAI-SearchBot/i, "oai-searchbot"],
  [/GPTBot/i, "gptbot"],
  [/Claude-User/i, "claude-user"],
  [/Claude-SearchBot/i, "claude-searchbot"],
  [/ClaudeBot/i, "claudebot"],
  [/Perplexity-User/i, "perplexity-user"],
  [/PerplexityBot/i, "perplexitybot"],
  [/claude|anthropic/i, "claude"],
  [/cursor/i, "cursor"],
  [/openai|chatgpt|codex/i, "openai"],
  [/perplexity/i, "perplexity"],
  [/Google-CloudVertexBot|Gemini/i, "gemini"],
  [/Applebot/i, "applebot"],
  [/Googlebot/i, "googlebot"],
  [/bingbot/i, "bingbot"],
  [/bot|crawl|spider|slurp|preview|facebookexternalhit|embedly|headless|lighthouse/i, "bot"],
  [/curl|wget/i, "curl"],
  [/python|httpx|aiohttp/i, "python"],
  [/\b(node|undici|axios|got|bun|deno)\b/i, "node"],
  [/mozilla/i, "browser"],
];

const agentClients = new Set([
  "chatgpt-user",
  "oai-searchbot",
  "gptbot",
  "claude-user",
  "claude-searchbot",
  "claudebot",
  "perplexity-user",
  "perplexitybot",
  "claude",
  "cursor",
  "openai",
  "perplexity",
  "gemini",
]);

/** AI crawlers and agents, the families worth counting on plain page views. */
export function isAgentClient(family: string) {
  return agentClients.has(family);
}

const assistantHosts = /(^|\.)(chatgpt\.com|chat\.openai\.com|perplexity\.ai|claude\.ai|gemini\.google\.com|copilot\.microsoft\.com|chat\.mistral\.ai|phind\.com|you\.com|kagi\.com|deepseek\.com|grok\.com)$/i;

/** The referrer's host when a visit came from an AI assistant's answer, otherwise "". */
export function assistantReferrer(request: Request) {
  const host = referrerOf(request);
  return assistantHosts.test(host) ? host : "";
}

/** A coarse family for the user agent, never the string itself. */
export function clientOf(userAgent: string | null) {
  if (!userAgent) return "none";
  for (const [pattern, name] of clients) if (pattern.test(userAgent)) return name;
  return "other";
}

function referrerOf(request: Request) {
  const referrer = request.headers.get("referer");
  if (!referrer) return "";
  try {
    return new URL(referrer).hostname;
  } catch {
    return "";
  }
}

const clip = (value: unknown, length = 64) => (typeof value === "string" ? value.slice(0, length) : "");

export function writeEvent(dataset: EventsDataset | undefined, request: Request, status: number, event: EventName, subject: string, detail = "") {
  if (!dataset) return;
  try {
    const country = (request as { cf?: { country?: unknown } }).cf?.country;
    dataset.writeDataPoint({
      indexes: [event],
      blobs: [event, clip(subject), clip(detail), clientOf(request.headers.get("user-agent")), clip(country, 2), clip(referrerOf(request), 120)],
      doubles: [1, status],
    });
  } catch {
    // Analytics must never break a response.
  }
}

interface RpcMessage {
  method?: unknown;
  params?: { name?: unknown; arguments?: { slug?: unknown }; clientInfo?: { name?: unknown } };
}

/** One event per JSON-RPC message: the method, or the tool name for tools/call. Free-text arguments (queries, briefs) are not kept. */
export function writeMcpEvents(dataset: EventsDataset | undefined, request: Request, status: number, body: string) {
  if (!dataset) return;
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return;
  }
  for (const message of (Array.isArray(parsed) ? parsed : [parsed]).slice(0, 20) as RpcMessage[]) {
    if (!message || typeof message.method !== "string" || message.method.startsWith("notifications/")) continue;
    const params = message.params ?? {};
    if (message.method === "tools/call") writeEvent(dataset, request, status, "mcp", clip(params.name) || "unknown", clip(params.arguments?.slug));
    else writeEvent(dataset, request, status, "mcp", message.method, message.method === "initialize" ? clip(params.clientInfo?.name) : "");
  }
}
