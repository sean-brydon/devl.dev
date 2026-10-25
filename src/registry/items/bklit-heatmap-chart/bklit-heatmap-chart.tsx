"use client";

import { useMemo } from "react";
import {
  HeatmapCells,
  HeatmapChart,
  type HeatmapColumn,
  HeatmapInteractionBoundary,
  HeatmapInteractionProvider,
  type HeatmapLevelColors,
  HeatmapLegend,
  HeatmapTooltip,
  HeatmapXAxis,
  HeatmapYAxis,
  levelStylesFromColors,
} from "@/components/charts/heatmap";
import { cn } from "@/lib/utils";

export interface DeployHeatmapCardProps {
  title?: string;
  weeks: HeatmapColumn[];
  className?: string;
}

const mix = (amount: number) => `color-mix(in oklab, var(--color-indigo-500) ${amount}%, var(--chart-scale-mix))`;

const levels: HeatmapLevelColors = ["var(--chart-scale-01)", mix(38), mix(60), mix(80), "var(--color-indigo-500)"];

const legendStyles = levelStylesFromColors(levels);

const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function stats(weeks: HeatmapColumn[]) {
  const days = weeks.flatMap((w) => w.bins);
  const byWeekday = weekdays.map((_, i) =>
    days.filter((d) => d.date.getDay() === i).reduce((sum, d) => sum + d.count, 0),
  );
  const workdays = days.filter((d) => d.date.getDay() !== 0 && d.date.getDay() !== 6);
  return {
    total: days.reduce((sum, d) => sum + d.count, 0),
    activeDays: days.filter((d) => d.count > 0).length,
    busiest: weekdays[byWeekday.indexOf(Math.max(...byWeekday))],
    perWorkday: workdays.length ? workdays.reduce((sum, d) => sum + d.count, 0) / workdays.length : 0,
  };
}

export function DeployHeatmapCard({ title = "Production deploys", weeks, className }: DeployHeatmapCardProps) {
  const summary = useMemo(() => stats(weeks), [weeks]);

  return (
    <div className={cn("w-[480px] max-w-full rounded-2xl border bg-card p-5 shadow-xs/5", className)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-sm">{title}</p>
          <p className="mt-1 font-semibold text-2xl tabular-nums tracking-tight">
            {summary.total.toLocaleString("en-US")}
            <span className="ml-1.5 font-normal text-muted-foreground text-sm">in {weeks.length} weeks</span>
          </p>
        </div>
        <dl className="grid grid-cols-[auto_auto] gap-x-3 gap-y-1 text-right text-xs">
          <dt className="text-muted-foreground">Per workday</dt>
          <dd className="font-medium tabular-nums">{summary.perWorkday.toFixed(1)}</dd>
          <dt className="text-muted-foreground">Busiest</dt>
          <dd className="font-medium">{summary.busiest}</dd>
        </dl>
      </div>
      <HeatmapInteractionProvider>
        <HeatmapInteractionBoundary className="mt-4 flex flex-col gap-3">
          <HeatmapChart
            data={weeks}
            gap={3}
            layout="fluid"
            levelColors={levels}
            margin={{ left: 32, right: 0, top: 22 }}
          >
            <HeatmapCells cornerRadius={3} inactiveOpacity={0.35} />
            <HeatmapXAxis />
            <HeatmapYAxis />
            <HeatmapTooltip formatLabel={(count) => (count === 1 ? "1 deploy" : `${count} deploys`)} />
          </HeatmapChart>
          <div className="flex items-center justify-between gap-4">
            <p className="whitespace-nowrap text-muted-foreground text-xs tabular-nums">
              {summary.activeDays} active days
            </p>
            <HeatmapLegend cornerRadius={3} gap={3} levelStyles={legendStyles} />
          </div>
        </HeatmapInteractionBoundary>
      </HeatmapInteractionProvider>
    </div>
  );
}
