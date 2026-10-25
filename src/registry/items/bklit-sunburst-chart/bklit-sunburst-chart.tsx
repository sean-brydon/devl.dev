"use client";

import { ChevronRightIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { buildArcs } from "@/components/charts/sunburst";
import { SunburstChart, type SunburstNode } from "@/components/charts/sunburst-chart";
import { SunburstCenter } from "@/components/charts/sunburst-center";
import { SunburstSegment } from "@/components/charts/sunburst-segment";
import { cn } from "@/lib/utils";

export interface CostSunburstCardProps {
  title?: string;
  period?: string;
  data: SunburstNode;
  palette?: string[];
  className?: string;
}

const defaultPalette = [
  "var(--color-indigo-500)",
  "var(--color-sky-400)",
  "var(--color-teal-400)",
  "var(--color-amber-400)",
  "var(--color-rose-400)",
];

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function CostSunburstCard({
  title = "Cloud costs",
  period = "October",
  data,
  palette = defaultPalette,
  className,
}: CostSunburstCardProps) {
  const { arcs, focusById, rootId, total } = useMemo(() => buildArcs(data), [data]);
  const [focusId, setFocusId] = useState(rootId);
  const [hovered, setHovered] = useState<number | null>(null);

  const trail = useMemo(() => {
    const chain = [];
    let current = focusById.get(focusId);
    while (current) {
      chain.unshift(current);
      current = current.parentId ? focusById.get(current.parentId) : undefined;
    }
    return chain;
  }, [focusById, focusId]);

  const teams = arcs.filter((a) => a.depth === 1);
  const colors = useMemo(() => {
    const seen = new Map<string, number>();
    return arcs.map((arc) => {
      const base = palette[arc.categoryIndex % palette.length];
      if (arc.depth <= 1) return base;
      const sibling = seen.get(arc.parentId ?? "") ?? 0;
      seen.set(arc.parentId ?? "", sibling + 1);
      return `color-mix(in oklab, ${base} ${Math.max(45, 100 - sibling * 22)}%, var(--card))`;
    });
  }, [arcs, palette]);
  const services =
    focusId === rootId
      ? null
      : arcs.flatMap((arc, i) => (arc.parentId === focusId ? [{ arc, color: colors[i] }] : []));
  const focusArc = arcs.find((a) => a.id === focusId);
  const focusValue = focusArc ? focusArc.value : total;
  const hoveredArc = hovered === null ? null : arcs[hovered];
  const readout = hoveredArc ?? { value: focusValue };
  const hoveredParent = hoveredArc?.parentId ? focusById.get(hoveredArc.parentId) : undefined;
  const hoveredPath =
    hoveredParent && hoveredParent.depth > 0 ? `${hoveredParent.name} › ${hoveredArc?.name}` : hoveredArc?.name;

  return (
    <div className={cn("w-[420px] max-w-full rounded-2xl border bg-card p-5 shadow-xs/5", className)}>
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-muted-foreground text-sm">{title}</p>
        <p className="text-muted-foreground text-xs">{period}</p>
      </div>
      <p className="mt-1 font-semibold text-2xl tabular-nums tracking-tight">{usd.format(readout.value)}</p>
      {hoveredArc ? (
        <p className="mt-1 flex h-7 items-center truncate text-muted-foreground text-sm tabular-nums">
          <span className="truncate font-medium text-foreground">{hoveredPath}</span>
          <span className="ml-1.5 shrink-0">{((hoveredArc.value / total) * 100).toFixed(1)}% of total</span>
        </p>
      ) : (
        <nav aria-label="Breakdown path" className="-ml-1.5 mt-1 flex h-7 min-w-0 items-center gap-0.5 text-sm">
          {trail.map((step, i) => {
            const current = i === trail.length - 1;
            return (
              <span className="flex min-w-0 items-center gap-0.5" key={step.id}>
                {i > 0 && <ChevronRightIcon aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />}
                <button
                  aria-current={current ? "page" : undefined}
                  className={cn(
                    "truncate rounded-md px-1.5 py-0.5 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-ring",
                    current
                      ? "font-medium text-foreground"
                      : "text-muted-foreground [@media(hover:hover)]:hover:bg-accent [@media(hover:hover)]:hover:text-foreground",
                  )}
                  disabled={current}
                  onClick={() => setFocusId(step.id)}
                  type="button"
                >
                  {step.depth === 0 ? "All teams" : step.name}
                </button>
              </span>
            );
          })}
        </nav>
      )}
      <div className="mx-auto mt-2 aspect-square w-full max-w-[280px]">
        <SunburstChart
          data={data}
          focusId={focusId}
          hoveredIndex={hovered}
          hoverPop={6}
          onFocusChange={setFocusId}
          onHoverChange={setHovered}
        >
          {arcs.map((arc, i) => (
            <SunburstSegment color={colors[i]} index={arc.arcIndex} key={arc.id} />
          ))}
          <SunburstCenter className="fill-card stroke-border" />
        </SunburstChart>
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-0.5">
        {services
          ? services.map(({ arc, color }) => (
              <span className="flex h-7 items-center gap-1.5 px-1 text-muted-foreground text-xs" key={arc.id}>
                <span className="size-2 rounded-full" style={{ background: color }} />
                {arc.name}
              </span>
            ))
          : teams.map((team) => (
              <button
                className="flex h-7 items-center gap-1.5 rounded-lg px-1.5 text-muted-foreground text-xs transition-[color,background-color,scale] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-ring active:scale-[0.97] [@media(hover:hover)]:hover:bg-accent [@media(hover:hover)]:hover:text-foreground"
                key={team.id}
                onClick={() => setFocusId(team.id)}
                type="button"
              >
                <span
                  className="size-2 rounded-full"
                  style={{ background: palette[team.categoryIndex % palette.length] }}
                />
                {team.name}
              </button>
            ))}
      </div>
    </div>
  );
}
