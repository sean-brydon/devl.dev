import { type ChannelFlowNode, ChannelFlowSankeyCard } from "@/registry/items/bklit-sankey-chart/bklit-sankey-chart";

const channel = { category: "source" as const, color: "var(--color-indigo-500)", swatch: "bg-indigo-500" };

const nodes: ChannelFlowNode[] = [
  { name: "Search", ...channel },
  { name: "Social", ...channel },
  { name: "Referral", ...channel },
  { name: "Direct", ...channel },
  { name: "Paid", category: "outcome", color: "var(--color-emerald-500)", swatch: "bg-emerald-500" },
  { name: "Trial ended", category: "outcome", color: "var(--color-sky-400)", swatch: "bg-sky-400" },
  { name: "Bounced", category: "outcome", color: "var(--color-stone-400)", swatch: "bg-stone-400" },
];

const links = [
  { source: 0, target: 4, value: 620 },
  { source: 0, target: 5, value: 1220 },
  { source: 0, target: 6, value: 2960 },
  { source: 1, target: 4, value: 140 },
  { source: 1, target: 5, value: 480 },
  { source: 1, target: 6, value: 2180 },
  { source: 2, target: 4, value: 410 },
  { source: 2, target: 5, value: 500 },
  { source: 2, target: 6, value: 540 },
  { source: 3, target: 4, value: 290 },
  { source: 3, target: 5, value: 840 },
  { source: 3, target: 6, value: 1470 },
];

export default function BklitSankeyChartDemo() {
  return <ChannelFlowSankeyCard links={links} nodes={nodes} />;
}
