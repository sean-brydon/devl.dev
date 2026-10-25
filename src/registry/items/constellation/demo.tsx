import { BookOpenIcon, BotIcon, CodeIcon, DatabaseIcon, GitBranchIcon, GlobeIcon, MessageSquareIcon, SearchCheckIcon, TerminalIcon } from "lucide-react";
import { Constellation, type ConstellationAgent, type ConstellationLink, type ConstellationTool } from "@/registry/items/constellation/constellation";

const agents: ConstellationAgent[] = [
  { id: "planner", name: "Planner", icon: BotIcon, at: [0.5, 0.27] },
  {
    id: "coder",
    name: "Coder",
    icon: CodeIcon,
    at: [0.78, 0.5],
    asks: [
      { tool: "git", action: "push to main" },
      { tool: "shell", action: "rm -rf dist/" },
    ],
  },
  { id: "research", name: "Research", icon: BookOpenIcon, at: [0.22, 0.5] },
  { id: "review", name: "Reviewer", icon: SearchCheckIcon, at: [0.45, 0.76], asks: [{ tool: "slack", action: "post in #release" }] },
];

const tools: ConstellationTool[] = [
  { id: "git", name: "git", icon: GitBranchIcon, at: [0.68, 0.9] },
  { id: "shell", name: "shell", icon: TerminalIcon, at: [0.9, 0.84] },
  { id: "db", name: "postgres", icon: DatabaseIcon, at: [0.79, 0.1] },
  { id: "web", name: "web.search", icon: GlobeIcon, at: [0.15, 0.86] },
  { id: "slack", name: "slack", icon: MessageSquareIcon, at: [0.22, 0.1] },
];

const links: ConstellationLink[] = [
  { agent: "planner", tool: "db" },
  { agent: "planner", tool: "slack" },
  { agent: "coder", tool: "git" },
  { agent: "coder", tool: "shell" },
  { agent: "coder", tool: "db" },
  { agent: "research", tool: "web" },
  { agent: "research", tool: "slack" },
  { agent: "review", tool: "git" },
  { agent: "review", tool: "web" },
  { agent: "review", tool: "slack" },
];

export default function ConstellationDemo() {
  return <Constellation agents={agents} autoApproveAfterMs={7000} links={links} title="Release crew" tools={tools} />;
}
