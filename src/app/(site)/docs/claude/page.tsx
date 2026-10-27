import type { Metadata } from "next";
import { Code, DocsPage, Step, Steps } from "@/components/docs";

export const metadata: Metadata = {
  title: "Claude",
  description: "Connect devl to Claude Code and Claude Desktop: add the devl MCP server, install the devl skill, and build UI from devl by chatting.",
  alternates: { canonical: "/docs/claude" },
};

export default function ClaudePage() {
  return (
    <DocsPage lead="Set devl up in Claude once, then build UI from the whole catalogue by chatting. Claude Code and Claude Desktop use the same server." title="Claude">
      <section>
        <h2>Claude Code</h2>
        <Steps>
          <Step n={1} title="Add the devl MCP server">
            <p>From your project root:</p>
            <Code>claude mcp add --transport http devl https://devl.dev/mcp</Code>
            <p>
              Add <code>--scope user</code> to have it in every project. There's no sign-in: devl is free and the server is read-only.
            </p>
          </Step>
          <Step n={2} title="Install the devl skill">
            <Code>{"mkdir -p .claude/skills/devl && curl -fsSL https://devl.dev/skill/SKILL.md -o .claude/skills/devl/SKILL.md"}</Code>
            <p>The skill tells Claude when to reach for devl, how to install pieces and how to borrow devl's patterns.</p>
          </Step>
          <Step n={3} title="Check the connection">
            <Code>claude mcp list</Code>
            <p>
              <code>devl</code> should show as connected. Inside a session, <code>/mcp</code> lists its four tools.
            </p>
          </Step>
        </Steps>
      </section>

      <section>
        <h2>Claude Desktop and claude.ai</h2>
        <Steps>
          <Step n={1} title="Add a custom connector">
            <p>
              Open Settings → Connectors (on claude.ai, Customize → Connectors), click Add custom connector, name it <code>devl</code> and use this URL:
            </p>
            <Code>https://devl.dev/mcp</Code>
          </Step>
          <Step n={2} title="Turn it on in a chat">
            <p>Enable devl from the tools menu in a conversation, then ask for what you want to build.</p>
          </Step>
        </Steps>
      </section>

      <section>
        <h2>Try asking</h2>
        <ul className="flex list-disc flex-col gap-2 ps-5 text-muted-foreground">
          <li>"Use devl to build our sign-in page: find the closest screen and adapt it to our brand."</li>
          <li>"Search devl for a pricing toggle with some motion and add it to the pricing section."</li>
          <li>"What devl pieces would you use for an onboarding checklist? Show me two options."</li>
        </ul>
      </section>
    </DocsPage>
  );
}
