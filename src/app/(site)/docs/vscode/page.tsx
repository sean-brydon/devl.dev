import type { Metadata } from "next";
import { Code, DocsPage, Step, Steps } from "@/components/docs";

export const metadata: Metadata = {
  title: "VS Code",
  description: "Connect devl to GitHub Copilot in VS Code: add the devl MCP server in .vscode/mcp.json and use it from agent mode.",
  alternates: { canonical: "/docs/vscode" },
};

export default function VsCodePage() {
  return (
    <DocsPage lead="Add devl to VS Code's MCP servers so Copilot's agent mode can search devl and read any piece's source." title="VS Code">
      <section>
        <Steps>
          <Step n={1} title="Add the devl MCP server">
            <p>
              Create <code>.vscode/mcp.json</code> in your project:
            </p>
            <Code label=".vscode/mcp.json">{`{
  "servers": {
    "devl": {
      "type": "http",
      "url": "https://devl.dev/mcp"
    }
  }
}`}</Code>
          </Step>
          <Step n={2} title="Add the skill as instructions">
            <Code>{"mkdir -p .github && curl -fsSL https://devl.dev/skill/SKILL.md >> .github/copilot-instructions.md"}</Code>
            <p>Copilot reads this file for every chat in the project.</p>
          </Step>
          <Step n={3} title="Use it">
            <p>Open Copilot Chat in agent mode, check devl is enabled in the tools picker, and ask it to search devl.</p>
          </Step>
        </Steps>
      </section>
    </DocsPage>
  );
}
