// Wraps the OpenNext worker: one canonical origin (https://devl.dev), real 404 status codes, and install/agent analytics.
// Next streams pages (cacheComponents), so notFound() can only render the not-found page with a 200;
// pages for slugs that don't exist get their status fixed here instead. Kept out of tsconfig: it imports build output.
import { default as handler } from "./.open-next/worker.js";
import { generatedItems } from "./src/registry/__generated__/index";
import { assistantReferrer, clientOf, type EventsDataset, isAgentClient, searchMiss, trackedAsset, writeEvent, writeMcpEvents } from "./src/server/events";

export { BucketCachePurge, DOQueueHandler, DOShardedTagCache } from "./.open-next/worker.js";

const HOST = "devl.dev";
const sections: Record<string, string> = {
  component: "components",
  block: "blocks",
  screen: "screens",
  motion: "motion",
  illustration: "illustrations",
};
const slugs = new Set(generatedItems.map((item) => item.slug));
const itemPaths = new Set(generatedItems.map((item) => `/${sections[item.kind]}/${item.slug}`));
const topLevel = new Set([...Object.values(sections), "docs", "advertise", "admin", "sponsor-stats", "mcp", "privacy", "changelog"]);

// No Next route serves HTML at a dotted path (/llms-full.txt, /x.md, /.well-known/...), so an HTML 200 there is the not-found page.
function isMissing(pathname: string, contentType: string) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.some((part) => part.includes("."))) return contentType.includes("text/html");
  if (parts.length === 0) return false;
  const [first, second] = parts;
  if (first === "preview") return parts.length !== 2 || !slugs.has(second);
  if (Object.values(sections).includes(first)) return parts.length > 2 || (parts.length === 2 && !itemPaths.has(pathname));
  if (parts.length === 1) return !topLevel.has(first);
  return false;
}

interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  EVENTS?: EventsDataset;
}

interface Context {
  waitUntil(promise: Promise<unknown>): void;
}

export default {
  async fetch(request: Request, env: Env, ctx: Context): Promise<Response> {
    const url = new URL(request.url);
    const canonicalHost = url.hostname === HOST || url.hostname === `www.${HOST}`;
    if (canonicalHost && (url.hostname !== HOST || url.protocol === "http:")) {
      url.hostname = HOST;
      url.protocol = "https:";
      return Response.redirect(url.toString(), 301);
    }
    // These paths run the worker first (assets.run_worker_first) only so they can be counted; a miss falls through to Next's 404.
    const asset = request.method === "GET" || request.method === "HEAD" ? trackedAsset(url.pathname) : null;
    if (asset) {
      const served = await env.ASSETS.fetch(request);
      if (served.status !== 404) {
        if (request.method === "GET") writeEvent(env.EVENTS, request, served.status, asset.event, asset.subject);
        return served;
      }
    }
    if (request.method === "POST" && url.pathname === "/api/search-miss") {
      const query = searchMiss((await request.text().catch(() => "")).slice(0, 200));
      if (query) writeEvent(env.EVENTS, request, 200, "search", query);
      return new Response(null, { status: 204 });
    }
    const isItemPage = itemPaths.has(url.pathname);
    // Agents that ask for Markdown get the item's .md page (description, install, usage, source) instead of the HTML.
    if (isItemPage && request.method === "GET" && /text\/markdown/i.test(request.headers.get("accept") ?? "")) {
      const markdown = await env.ASSETS.fetch(new Request(new URL(`${url.pathname}.md`, url), request));
      if (markdown.ok) {
        writeEvent(env.EVENTS, request, 200, "markdown", url.pathname.split("/").pop() ?? "");
        const headers = new Headers(markdown.headers);
        headers.set("content-type", "text/markdown; charset=utf-8");
        headers.set("vary", "accept");
        return new Response(markdown.body, { status: 200, headers });
      }
    }
    const mcpBody = request.method === "POST" && url.pathname === "/mcp" ? request.clone().text().catch(() => "") : null;
    const response: Response = await handler.fetch(request, env, ctx);
    if (mcpBody) ctx.waitUntil(mcpBody.then((body) => writeMcpEvents(env.EVENTS, request, response.status, body)));
    const contentType = response.headers.get("content-type") ?? "";
    if (response.status === 200 && isMissing(decodeURIComponent(url.pathname), contentType)) {
      return new Response(response.body, { status: 404, statusText: "Not Found", headers: response.headers });
    }
    if (request.method === "GET" && response.status === 200 && contentType.includes("text/html") && !request.headers.has("rsc")) {
      const family = clientOf(request.headers.get("user-agent"));
      const assistant = isAgentClient(family) ? "" : assistantReferrer(request);
      if (isAgentClient(family)) writeEvent(env.EVENTS, request, 200, "agent", url.pathname);
      else if (assistant) writeEvent(env.EVENTS, request, 200, "referral", assistant, url.pathname);
    }
    if (isItemPage && response.status === 200) {
      const headers = new Headers(response.headers);
      headers.append("vary", "accept");
      headers.append("link", `<https://${HOST}${url.pathname}.md>; rel="alternate"; type="text/markdown"`);
      return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
    }
    return response;
  },
};
