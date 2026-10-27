import type { Metadata } from "next";
import Link from "next/link";
import { Code, DocsPage } from "@/components/docs";

export const metadata: Metadata = {
  title: "Agent skill",
  description: "Install the devl skill so your coding agent knows when to reach for devl, how to install pieces, and how to borrow its patterns as inspiration.",
  alternates: { canonical: "/docs/skill" },
};

export default function SkillPage() {
  return (
    <DocsPage
      lead="A short skill file that teaches your agent what devl is, when to use it, how to install pieces the right way, and how to borrow devl's patterns when a design brief is open-ended."
      title="Agent skill"
    >
      <section>
        <h2>Install for Claude Code</h2>
        <p>From your project root (or use <code>~/.claude/skills</code> to have it everywhere):</p>
        <Code>{"mkdir -p .claude/skills/devl && curl -fsSL https://devl.dev/skill/SKILL.md -o .claude/skills/devl/SKILL.md"}</Code>
        <p>Claude picks it up automatically when you build or restyle React UI.</p>
      </section>

      <section>
        <h2>Other agents</h2>
        <p>
          The skill is plain markdown, so it works anywhere an agent reads instructions. Save it as a Cursor rule, point to it from your{" "}
          <code>AGENTS.md</code> for Codex, or paste it into your agent's custom instructions. The per-agent pages show the exact commands.
        </p>
        <Code>https://devl.dev/skill/SKILL.md</Code>
      </section>

      <section>
        <h2>What it teaches</h2>
        <ul className="flex list-disc flex-col gap-2 ps-5 text-muted-foreground">
          <li>What's in devl, and to look for a ready screen or block before building one.</li>
          <li>How to search: the MCP server when it's connected, otherwise llms.txt and the raw source URLs.</li>
          <li>How to install: coss ui once, then the shadcn CLI, then the named export.</li>
          <li>coss ui conventions: Base UI's render prop, theme tokens for light and dark, springs that respect reduced motion.</li>
          <li>How to use devl as inspiration: read a few relevant pieces and borrow layout, interaction details and restraint, without copying demo data.</li>
        </ul>
        <p>
          It works best with the <Link className="text-foreground underline underline-offset-4" href="/docs/mcp">MCP server</Link> connected, so your agent can
          search and read pieces instead of guessing.
        </p>
      </section>
    </DocsPage>
  );
}
