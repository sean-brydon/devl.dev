"use client";

import { useState } from "react";
import { AreaSparkline, BarSparkline, LineSparkline } from "@/components/charts/sparkline";
import { cn } from "@/lib/utils";

export type KpiPoint = {
  label: string;
  value: number;
};

export interface Kpi {
  id: string;
  name: string;
  kind: "line" | "area" | "bar";
  points: KpiPoint[];
  format: (value: number) => string;
  lowerIsBetter?: boolean;
}

export interface KpiSparklineGridProps {
  kpis: Kpi[];
  caption?: string;
  className?: string;
}

function KpiTile({ kpi }: { kpi: Kpi }) {
  const [hovered, setHovered] = useState<KpiPoint | null>(null);
  const first = kpi.points[0]?.value ?? 0;
  const last = kpi.points.at(-1)?.value ?? 0;
  const weekAgo = kpi.points.at(-8)?.value ?? first;
  const change = weekAgo ? (last - weekAgo) / weekAgo : 0;
  const good = kpi.lowerIsBetter ? change <= 0 : change >= 0;
  const color = good ? "var(--color-emerald-500)" : "var(--color-rose-500)";
  const shown = hovered ?? kpi.points.at(-1);

  const shared = {
    "aria-label": `${kpi.name}, ${kpi.format(first)} to ${kpi.format(last)}`,
    color,
    data: kpi.points,
    dataKey: "value" as const,
    height: 40,
    onHoverChange: (_: number | null, datum: KpiPoint | null) => setHovered(datum),
  };

  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-xl bg-muted/50 p-3.5">
      <div className="flex items-start justify-between gap-2">
        <p className="truncate text-muted-foreground text-xs">{kpi.name}</p>
        <span
          className={cn(
            "font-medium text-[11px] tabular-nums",
            good ? "text-success-foreground" : "text-destructive-foreground",
          )}
        >
          {change >= 0 ? "+" : "−"}
          {Math.abs(change * 100).toFixed(1)}%
        </span>
      </div>
      <div>
        <p className="font-semibold text-lg tabular-nums leading-none tracking-tight">
          {shown ? kpi.format(shown.value) : "—"}
        </p>
        <p className="mt-1 h-4 text-muted-foreground text-xs">{hovered ? hovered.label : "Today"}</p>
      </div>
      {kpi.kind === "area" && <AreaSparkline {...shared} fillOpacity={0.3} />}
      {kpi.kind === "line" && <LineSparkline {...shared} endDot />}
      {kpi.kind === "bar" && <BarSparkline {...shared} barGap={2} barRadius={1.5} />}
    </div>
  );
}

export function KpiSparklineGrid({
  kpis,
  caption = "Last 14 days · change vs last week",
  className,
}: KpiSparklineGridProps) {
  return (
    <div className={cn("w-[460px] max-w-full rounded-2xl border bg-card p-4 shadow-xs/5", className)}>
      <div className="flex items-baseline justify-between gap-4 px-1 pb-3">
        <p className="font-medium text-sm">Overview</p>
        <p className="truncate text-muted-foreground text-xs">{caption}</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {kpis.map((kpi) => (
          <KpiTile key={kpi.id} kpi={kpi} />
        ))}
      </div>
    </div>
  );
}
