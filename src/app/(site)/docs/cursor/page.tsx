import type { Metadata } from "next";
import { Code, DocsPage, Step, Steps } from "@/components/docs";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Cursor",
  description: "Connect devl to Cursor: add the devl MCP server in .cursor/mcp.json and save the devl skill as a project rule.",
  alternates: { canonical: "/docs/cursor" },
};

export default function CursorPage() {
  return (
    <DocsPage lead="Add devl to Cursor's MCP servers and save the skill as a rule, so the agent searches devl before building UI from scratch." title="Cursor">
      <section>
        <div className="flex flex-wrap items-center gap-3">
          <Button className="rounded-full" render={<a href="cursor://anysphere.cursor-deeplink/mcp/install?name=devl&config=eyJ1cmwiOiJodHRwczovL2RldmwuZGV2L21jcCJ9" />}>
            Add to Cursor
          </Button>
        </div>
        <p className="text-muted-foreground">Cursor asks you to confirm, then adds devl to your global MCP servers. Or set it up by hand:</p>
      </section>

      <section>
        <Steps>
          <Step n={1} title="Add the devl MCP server">
            <p>
              Create or edit <code>.cursor/mcp.json</code> in your project (or <code>~/.cursor/mcp.json</code> for every project):
            </p>
            <Code label=".cursor/mcp.json">{`{
  "mcpServers": {
    "devl": {
      "url": "https://devl.dev/mcp"
    }
  }
}`}</Code>
          </Step>
          <Step n={2} title="Save the skill as a rule">
            <Code>{"mkdir -p .cursor/rules && curl -fsSL https://devl.dev/skill/SKILL.md -o .cursor/rules/devl.mdc"}</Code>
            <p>Cursor applies it when the agent works on UI, using the description at the top of the file.</p>
          </Step>
          <Step n={3} title="Check it">
            <p>
              Open Cursor Settings → MCP. <code>devl</code> should show a green dot and four tools.
            </p>
          </Step>
        </Steps>
      </section>
    </DocsPage>
  );
}
