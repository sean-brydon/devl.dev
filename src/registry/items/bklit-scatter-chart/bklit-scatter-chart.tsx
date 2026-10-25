"use client";

import { useMemo } from "react";
import { useChart } from "@/components/charts/chart-context";
import { Grid } from "@/components/charts/grid";
import { Scatter, ScatterChart } from "@/components/charts/scatter-chart";
import { ChartTooltip } from "@/components/charts/tooltip";
import { XAxis } from "@/components/charts/x-axis";
import { YAxis } from "@/components/charts/y-axis";
import { cn } from "@/lib/utils";

export type BuildRun = {
  date: Date;
  minutes: number;
  commit: string;
  branch: string;
};

export interface BuildTimesScatterCardProps {
  title?: string;
  runs: BuildRun[];
  targetMinutes?: number;
  className?: string;
}

const FAST = "var(--color-emerald-500)";
const SLOW = "var(--color-rose-500)";
const dayFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

function TargetLine({ minutes }: { minutes: number }) {
  const { yScale, innerWidth, innerHeight } = useChart();
  const y = yScale(minutes);
  if (y === undefined || y < 0 || y > innerHeight) return null;
  return (
    <g className="pointer-events-none">
      <line stroke={SLOW} strokeDasharray="4 3" strokeOpacity={0.6} x1={0} x2={innerWidth} y1={y} y2={y} />
      <text
        className="fill-muted-foreground text-[11px]"
        paintOrder="stroke"
        stroke="var(--card)"
        strokeWidth={4}
        textAnchor="end"
        x={innerWidth}
        y={y - 6}
      >
        Target {minutes}m
      </text>
    </g>
  );
}

function duration(minutes: number) {
  const m = Math.floor(minutes);
  const s = Math.round((minutes - m) * 60);
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

function percentile(sorted: number[], p: number) {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1));
  return sorted[index];
}

export function BuildTimesScatterCard({
  title = "CI build times",
  runs,
  targetMinutes = 8,
  className,
}: BuildTimesScatterCardProps) {
  const stats = useMemo(() => {
    const sorted = runs.map((r) => r.minutes).sort((a, b) => a - b);
    return {
      rows: runs.map((run) => ({
        ...run,
        onTarget: run.minutes <= targetMinutes ? run.minutes : undefined,
        overTarget: run.minutes > targetMinutes ? run.minutes : undefined,
      })),
      p50: percentile(sorted, 0.5),
      p95: percentile(sorted, 0.95),
      overTarget: runs.filter((r) => r.minutes > targetMinutes).length,
    };
  }, [runs, targetMinutes]);

  return (
    <div className={cn("w-[460px] max-w-full rounded-2xl border bg-card p-5 shadow-xs/5", className)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-sm">{title}</p>
          <p className="mt-1 font-semibold text-2xl tabular-nums tracking-tight">{duration(stats.p50)}</p>
          <p className="mt-1 text-muted-foreground text-xs">median across {runs.length} runs</p>
        </div>
        <dl className="grid grid-cols-[auto_auto] gap-x-3 gap-y-1 text-right text-xs">
          <dt className="text-muted-foreground">p95</dt>
          <dd className="font-medium tabular-nums">{duration(stats.p95)}</dd>
          <dt className="text-muted-foreground">Over {targetMinutes}m</dt>
          <dd className="font-medium tabular-nums">{stats.overTarget}</dd>
        </dl>
      </div>
      <div className="-mx-2 mt-4">
        <ScatterChart
          aspectRatio="2 / 1"
          data={stats.rows}
          formatXLabel={(date) => dayFmt.format(date)}
          jitter={{ x: 0.5, seed: 7 }}
          margin={{ left: 36, right: 16, top: 16, bottom: 36 }}
        >
          <Grid horizontal numTicksRows={4} />
          <YAxis formatValue={(v) => `${v}m`} numTicks={4} />
          <TargetLine minutes={targetMinutes} />
          <Scatter dataKey="onTarget" fill={FAST} inactiveOpacity={0.35} radius={3.5} />
          <Scatter dataKey="overTarget" fill={SLOW} inactiveOpacity={0.35} radius={3.5} />
          <XAxis numTicks={5} />
          <ChartTooltip
            rows={(point) => [
              {
                color: (point.minutes as number) > targetMinutes ? SLOW : FAST,
                label: "Duration",
                value: duration(point.minutes as number),
              },
              { color: "transparent", label: "Commit", value: point.commit as string },
              { color: "transparent", label: "Branch", value: point.branch as string },
            ]}
          />
        </ScatterChart>
      </div>
      <div className="mt-2 flex gap-4 text-muted-foreground text-xs">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-emerald-500" />
          Under {targetMinutes}m
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-rose-500" />
          Over {targetMinutes}m
        </span>
      </div>
    </div>
  );
}
