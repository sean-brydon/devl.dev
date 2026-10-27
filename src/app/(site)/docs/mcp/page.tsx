import type { Metadata } from "next";
import Link from "next/link";
import { Code, DocsPage } from "@/components/docs";

export const metadata: Metadata = {
  title: "MCP server",
  description: "Connect your AI agent to devl's free MCP server to search the catalogue, read any piece's source and get suggestions for what you're building.",
  alternates: { canonical: "/docs/mcp" },
};

const tools = [
  ["search_items", "Search components, blocks, screens, motion and illustrations by keywords, kind or category."],
  ["get_item", "Read one piece: install command, dependencies, a usage snippet and the full source."],
  ["list_categories", "Browse every kind and category with counts and examples."],
  ["suggest_for", "Describe what you're building and get the pieces worth starting from, grouped by kind."],
];

const clients = [
  ["Claude", "/docs/claude"],
  ["Codex", "/docs/codex"],
  ["Cursor", "/docs/cursor"],
  ["VS Code", "/docs/vscode"],
];

export default function McpPage() {
  return (
    <DocsPage
      lead="One URL gives your agent the whole devl catalogue: search it, read the source of any piece and get suggestions for the screen you're building. Free, no account, no keys."
      title="MCP server"
    >
      <section>
        <h2>The endpoint</h2>
        <p>devl serves the Model Context Protocol over Streamable HTTP. Every client uses the same URL:</p>
        <Code>https://devl.dev/mcp</Code>
        <p>In Claude Code, for example, that's one command:</p>
        <Code>claude mcp add --transport http devl https://devl.dev/mcp</Code>
      </section>

      <section>
        <h2>Tools</h2>
        <div className="overflow-hidden rounded-xl border">
          {tools.map(([name, text]) => (
            <div className="flex flex-col gap-1 border-b px-4 py-3 last:border-b-0 sm:flex-row sm:gap-4" key={name}>
              <code className="shrink-0 font-mono text-[13px] sm:w-36">{name}</code>
              <span className="text-muted-foreground text-sm">{text}</span>
            </div>
          ))}
        </div>
        <p>Everything is read-only. The server never writes to your project; your agent installs pieces with the shadcn CLI as usual.</p>
      </section>

      <section>
        <h2>Set it up in your agent</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {clients.map(([name, href]) => (
            <Link className="rounded-xl border bg-card px-4 py-3 font-medium text-sm transition-colors hover:border-foreground/15" href={href} key={href}>
              {name} →
            </Link>
          ))}
        </div>
        <p>
          Any other MCP client works too: add a remote (Streamable HTTP) server named <code>devl</code> with the URL above. Pair it with the{" "}
          <Link className="text-foreground underline underline-offset-4" href="/docs/skill">agent skill</Link> so your agent knows when to reach for devl.
        </p>
      </section>

      <section>
        <h2>Try asking</h2>
        <ul className="flex list-disc flex-col gap-2 ps-5 text-muted-foreground">
          <li>"Find a devl component for a one-time code input and add it to the sign-in page."</li>
          <li>"I'm building settings for a SaaS app with team roles and API keys. What in devl should I start from?"</li>
          <li>"Read devl's Liquid Switch and use the same goo technique on our toggle."</li>
        </ul>
      </section>
    </DocsPage>
  );
}
