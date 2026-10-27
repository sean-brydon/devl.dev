import type { Metadata } from "next";
import { Code, DocsPage, Step, Steps } from "@/components/docs";

export const metadata: Metadata = {
  title: "Codex",
  description: "Connect devl to OpenAI Codex: add the devl MCP server with one command and point Codex at the devl skill from AGENTS.md.",
  alternates: { canonical: "/docs/codex" },
};

export default function CodexPage() {
  return (
    <DocsPage lead="Give Codex the devl catalogue with one command, then tell it how to use devl from your AGENTS.md." title="Codex">
      <section>
        <Steps>
          <Step n={1} title="Add the devl MCP server">
            <Code>codex mcp add devl --url https://devl.dev/mcp</Code>
            <p>
              This writes the server into <code>~/.codex/config.toml</code>. You can also add it by hand:
            </p>
            <Code label="~/.codex/config.toml">{`[mcp_servers.devl]
url = "https://devl.dev/mcp"`}</Code>
          </Step>
          <Step n={2} title="Point AGENTS.md at the skill">
            <p>Add a line to your project's AGENTS.md so Codex reads the devl skill before building UI:</p>
            <Code label="AGENTS.md">{`## UI
When building or restyling React UI, read https://devl.dev/skill/SKILL.md and use the devl MCP server to find pieces before writing new ones.`}</Code>
          </Step>
          <Step n={3} title="Check it">
            <Code>codex mcp list</Code>
            <p>
              <code>devl</code> should be listed. Start a session and ask Codex to search devl.
            </p>
          </Step>
        </Steps>
      </section>
    </DocsPage>
  );
}
