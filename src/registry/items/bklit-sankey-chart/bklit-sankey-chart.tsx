"use client";

import {
  SankeyChart,
  type SankeyLinkDatum,
  SankeyLink,
  SankeyNode,
  type SankeyNodeDatum,
  SankeyTooltip,
} from "@/components/charts/sankey";
import { TooltipContent } from "@/components/charts/tooltip";
import { cn } from "@/lib/utils";

export interface ChannelFlowNode extends SankeyNodeDatum {
  color: string;
  swatch: string;
}

export interface ChannelFlowSankeyCardProps {
  title?: string;
  period?: string;
  nodes: ChannelFlowNode[];
  links: SankeyLinkDatum[];
  goal?: string;
  className?: string;
}

const whole = new Intl.NumberFormat("en-US");

type LaidOutNode = SankeyNodeDatum & { value?: number };

function asNode(node: unknown): LaidOutNode | undefined {
  return typeof node === "object" && node !== null ? (node as LaidOutNode) : undefined;
}

function share(part: number, whole: number) {
  return whole > 0 ? `${((part / whole) * 100).toFixed(1)}%` : "—";
}

export function ChannelFlowSankeyCard({
  title = "Where customers come from",
  period = "October",
  nodes,
  links,
  goal = "Paid",
  className,
}: ChannelFlowSankeyCardProps) {
  const colorOf = (node: SankeyNodeDatum) => (node.color as string | undefined) ?? "var(--muted-foreground)";
  const visits = links.reduce((sum, l) => sum + l.value, 0);
  const goalIndex = nodes.findIndex((n) => n.name === goal);
  const won = links.filter((l) => l.target === goalIndex).reduce((sum, l) => sum + l.value, 0);
  const outcomes = nodes.filter((n) => n.category !== "source");

  return (
    <div className={cn("w-[520px] max-w-full rounded-2xl border bg-card p-5 shadow-xs/5", className)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-sm">{title}</p>
          <p className="mt-1 font-semibold text-2xl tabular-nums tracking-tight">
            {((won / visits) * 100).toFixed(1)}%
          </p>
          <p className="mt-1 text-muted-foreground text-xs tabular-nums">
            of {whole.format(visits)} sessions became {goal.toLowerCase()}
          </p>
        </div>
        <p className="shrink-0 text-muted-foreground text-xs">{period}</p>
      </div>
      <div className="mt-4">
        <SankeyChart
          aspectRatio="16 / 10"
          data={{ nodes, links }}
          margin={{ top: 6, right: 92, bottom: 6, left: 92 }}
          nodePadding={16}
          nodeWidth={10}
        >
          <SankeyLink fadedOpacity={0.08} getNodeColor={colorOf} strokeOpacity={0.32} />
          <SankeyNode getNodeColor={colorOf} lineCap={3} />
          <SankeyTooltip
            linkContent={({ link }) => {
              const source = asNode(link.source);
              const target = asNode(link.target);
              return (
                <TooltipContent
                  rows={[
                    {
                      color: target ? colorOf(target) : "transparent",
                      label: "Sessions",
                      value: whole.format(link.value),
                    },
                    {
                      color: "transparent",
                      label: `Of ${source?.name ?? "source"}`,
                      value: share(link.value, source?.value ?? 0),
                    },
                  ]}
                  title={`${source?.name ?? ""} → ${target?.name ?? ""}`}
                />
              );
            }}
            nodeContent={({ node }) => (
              <TooltipContent
                rows={[
                  { color: colorOf(node), label: "Sessions", value: whole.format(node.value ?? 0) },
                  { color: "transparent", label: "Of all traffic", value: share(node.value ?? 0, visits) },
                ]}
                title={node.name}
              />
            )}
          />
        </SankeyChart>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground text-xs">
        {outcomes.map((n) => (
          <span className="flex items-center gap-1.5" key={n.name}>
            <span className={cn("size-2 rounded-[calc(var(--radius)*0.3)]", n.swatch)} />
            {n.name}
          </span>
        ))}
      </div>
    </div>
  );
}
