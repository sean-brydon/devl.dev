"use client";

import { useMemo, useState } from "react";
import { Grid } from "@/components/charts/grid";
import { Line, LineChart } from "@/components/charts/line-chart";
import { ChartTooltip } from "@/components/charts/tooltip";
import { XAxis } from "@/components/charts/x-axis";
import { YAxis } from "@/components/charts/y-axis";
import { cn } from "@/lib/utils";

export type ActiveUsersWeek = {
  date: Date;
  current: number;
  previous: number;
};

export interface ActiveUsersLineCardProps {
  title?: string;
  weeks: ActiveUsersWeek[];
  currentLabel?: string;
  previousLabel?: string;
  partialLastWeek?: boolean;
  className?: string;
}

const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const whole = new Intl.NumberFormat("en-US");

export function ActiveUsersLineCard({
  title = "Weekly active users",
  weeks,
  currentLabel = "2026",
  previousLabel = "2025",
  partialLastWeek = true,
  className,
}: ActiveUsersLineCardProps) {
  const [showPrevious, setShowPrevious] = useState(true);

  const { latest, growth } = useMemo(() => {
    const complete = partialLastWeek ? weeks.slice(0, -1) : weeks;
    const last = complete.at(-1);
    return {
      latest: last?.current ?? 0,
      growth: last && last.previous > 0 ? (last.current - last.previous) / last.previous : 0,
    };
  }, [weeks, partialLastWeek]);

  const series = [
    {
      key: "current",
      label: currentLabel,
      swatch: "bg-indigo-500",
      color: "var(--color-indigo-500)",
      shown: true,
    },
    {
      key: "previous",
      label: previousLabel,
      swatch: "bg-muted-foreground",
      color: "var(--muted-foreground)",
      shown: showPrevious,
    },
  ];

  return (
    <div className={cn("w-[460px] max-w-full rounded-2xl border bg-card p-5 shadow-xs/5", className)}>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <p className="text-muted-foreground text-sm">{title}</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-semibold text-2xl tabular-nums tracking-tight">{compact.format(latest)}</span>
            <span
              className={cn(
                "font-medium text-xs tabular-nums",
                growth >= 0 ? "text-success-foreground" : "text-destructive-foreground",
              )}
            >
              {growth >= 0 ? "▲" : "▼"} {Math.abs(growth * 100).toFixed(1)}% year over year
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {series.map((s) => (
            <button
              aria-pressed={s.shown}
              className={cn(
                "flex h-7 items-center gap-1.5 rounded-lg px-2 font-medium text-xs transition-[color,background-color,scale] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-ring active:scale-[0.97] disabled:cursor-default [@media(hover:hover)]:hover:bg-accent",
                s.shown ? "text-foreground" : "text-muted-foreground",
              )}
              disabled={s.key === "current"}
              key={s.key}
              onClick={() => setShowPrevious((v) => !v)}
              type="button"
            >
              <span
                className={cn(
                  "size-2 rounded-full transition-opacity duration-150",
                  s.swatch,
                  s.shown ? "opacity-100" : "opacity-30",
                )}
              />
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <div className="-mx-2 mt-4">
        <LineChart aspectRatio="2.2 / 1" data={weeks} margin={{ left: 36, right: 20, top: 12, bottom: 36 }}>
          <Grid horizontal numTicksRows={3} />
          <Line
            dashFromIndex={partialLastWeek ? weeks.length - 2 : undefined}
            dataKey="current"
            fadeEdges={false}
            stroke="var(--color-indigo-500)"
          />
          {showPrevious && (
            <Line
              dataKey="previous"
              fadeEdges={false}
              stroke="var(--muted-foreground)"
              strokeWidth={1.5}
            />
          )}
          <YAxis formatValue={(v) => compact.format(v)} numTicks={3} />
          <XAxis numTicks={5} />
          <ChartTooltip
            rows={(point) =>
              series
                .filter((s) => s.shown)
                .map((s) => ({ color: s.color, label: s.label, value: whole.format(point[s.key] as number) }))
            }
          />
        </LineChart>
      </div>
      {partialLastWeek && (
        <p className="mt-1 flex items-center gap-2 text-muted-foreground text-xs">
          <svg aria-hidden className="text-indigo-500" height="2" width="14">
            <line stroke="currentColor" strokeDasharray="4 2" strokeWidth="2" x1="0" x2="14" y1="1" y2="1" />
          </svg>
          This week, projected
        </p>
      )}
    </div>
  );
}
