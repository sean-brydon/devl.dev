# Distribution

Where devl is listed so AI agents and the people using them find it, and how to keep each listing current. The site side (llms.txt, llms-full.txt, Markdown pages, the MCP server, the skill, `/privacy`) ships with the code. Everything here is done once by the owner, under the owner's accounts.

| Listing | What it gets devl | Status |
| --- | --- | --- |
| Official MCP Registry | Discovery in clients that read the registry (VS Code, Glama, PulseMCP and others mirror it) | To do |
| Smithery, mcp.so | The two biggest MCP directories people browse | To do |
| Claude Connectors Directory | One-click connect in Claude and Claude Code | To do |
| Cursor MCP directory | One-click install in Cursor | To do |
| shadcn registry directory | `@devl` in `npx shadcn search` and shadcn's MCP server | Listed, health score stale |
| Context7 | devl docs inside agents that use Context7 | To do |
| GitHub repo metadata | Search, topics pages, and what crawlers read first | To do |

## Official MCP Registry

`server.json` at the repo root describes the remote server. Bump `version` whenever the tools change.

```bash
brew install mcp-publisher
mcp-publisher login github     # the io.github.sean-brydon/* namespace needs this GitHub account
mcp-publisher publish          # reads ./server.json
```

Check it: `curl "https://registry.modelcontextprotocol.io/v0.1/servers?search=io.github.sean-brydon/devl"`.

Glama and PulseMCP pick it up from the registry within a few days.

## Smithery and mcp.so

- **Smithery:** smithery.ai → Publish server → "Remote / URL", URL `https://devl.dev/mcp`. No auth, no config schema.
- **mcp.so:** mcp.so/submit, with the repo URL and `https://devl.dev/mcp`.

Short description for both:

> Search and read 270+ free React components, blocks and screens built on coss ui and shadcn. Four read-only tools: search_items, get_item, list_categories, suggest_for. No sign-in.

## Claude Connectors Directory

Submit through Anthropic's remote MCP server form (linked from the Claude docs page "Remote MCP servers" → directory). It asks for:

- Server URL: `https://devl.dev/mcp` (Streamable HTTP, no auth)
- Privacy policy: `https://devl.dev/privacy`
- Docs: `https://devl.dev/docs/mcp` and `https://devl.dev/docs/claude`
- Tools: all four have titles and `readOnlyHint: true` (`src/server/mcp.ts`)
- Support contact: the privacy page currently points at GitHub issues. Add an email there if the form wants one.

## Cursor MCP directory

The docs already have an "Add to Cursor" deeplink (`/docs/cursor`). For the directory listing, submit at cursor.com/mcp with the same URL, name `devl` and the short description above.

## shadcn registry directory

devl is already in shadcn's directory (`apps/v4/registry/directory.json` in shadcn-ui/ui) as `@devl`, but its health score still counts old downtime. Check the entry first; if the URL or description is out of date, open a PR that changes only devl's entry:

```json
{
  "name": "@devl",
  "homepage": "https://devl.dev",
  "url": "https://devl.dev/r/{name}.json",
  "description": "Free React components, blocks and screens on coss ui: liquid controls, AI and agent UI, auth, settings and empty states."
}
```

PR title: `registry: update @devl`. The index the CLI reads is live at `https://devl.dev/r/registry.json`.

## Context7

context7.com → Add library. Submit the GitHub repo, or `https://devl.dev/llms-full.txt` as an llms.txt source (it has every item with its usage example). Then ask for it in an agent: "use context7 to find a devl sign-in screen".

## GitHub repo metadata

```bash
gh repo edit sean-brydon/devl.dev \
  --description "Free React components, blocks and screens on coss ui. Install with the shadcn CLI, or let your agent find them over MCP." \
  --homepage "https://devl.dev" \
  --add-topic react,nextjs,tailwindcss,shadcn,shadcn-ui,coss-ui,base-ui,components,ui-components,motion,mcp-server,llms-txt
```

## Check that agents can read devl

```bash
curl -s https://devl.dev/llms.txt | head -30
curl -s -H "Accept: text/markdown" https://devl.dev/screens/sign-in | head -20
curl -s -o /dev/null -w "%{http_code}\n" https://devl.dev/.well-known/nothing   # 404
curl -s https://devl.dev/mcp -H "content-type: application/json" -H "accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | head -c 300
```

Agent page views and visits from AI assistants show on `/admin/stats` (events `agent`, `referral` and `markdown`; see ANALYTICS.md).
