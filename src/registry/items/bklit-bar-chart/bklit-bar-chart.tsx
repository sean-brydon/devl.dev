"use client";

import { useMemo, useState } from "react";
import { Bar } from "@/components/charts/bar";
import { BarChart } from "@/components/charts/bar-chart";
import { BarXAxis } from "@/components/charts/bar-x-axis";
import { useChart } from "@/components/charts/chart-context";
import { Grid } from "@/components/charts/grid";
import { ChartTooltip } from "@/components/charts/tooltip";
import { YAxis } from "@/components/charts/y-axis";
import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control";
import { cn } from "@/lib/utils";

export type SpendMonth = {
  month: string;
  [service: string]: number | string;
};

export interface SpendService {
  key: string;
  label: string;
  color: string;
  swatch: string;
}

export interface CloudSpendBarCardProps {
  title?: string;
  months: SpendMonth[];
  services?: SpendService[];
  budget?: number;
  className?: string;
}

const defaultServices: SpendService[] = [
  { key: "compute", label: "Compute", color: "var(--color-indigo-500)", swatch: "bg-indigo-500" },
  { key: "storage", label: "Storage", color: "var(--color-sky-400)", swatch: "bg-sky-400" },
  { key: "network", label: "Network", color: "var(--color-teal-400)", swatch: "bg-teal-400" },
];

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const usdCompact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

function BudgetLine({ value }: { value: number }) {
  const { yScale, innerWidth, innerHeight } = useChart();
  const y = yScale(value);
  if (y === undefined || y < 0 || y > innerHeight) return null;
  return (
    <g className="pointer-events-none">
      <line
        stroke="var(--muted-foreground)"
        strokeDasharray="4 3"
        strokeOpacity={0.8}
        x1={0}
        x2={innerWidth}
        y1={y}
        y2={y}
      />
      <text
        className="fill-muted-foreground text-[11px]"
        paintOrder="stroke"
        stroke="var(--card)"
        strokeWidth={4}
        textAnchor="end"
        x={innerWidth}
        y={y - 6}
      >
        Budget {usdCompact.format(value)}
      </text>
    </g>
  );
}

export function CloudSpendBarCard({
  title = "Cloud spend",
  months,
  services = defaultServices,
  budget,
  className,
}: CloudSpendBarCardProps) {
  const [layout, setLayout] = useState<"stacked" | "grouped">("stacked");

  const totals = useMemo(
    () => months.map((m) => services.reduce((sum, s) => sum + Number(m[s.key] ?? 0), 0)),
    [months, services],
  );
  const latest = totals.at(-1) ?? 0;

  return (
    <div className={cn("w-[460px] max-w-full rounded-2xl border bg-card p-5 shadow-xs/5", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-muted-foreground text-sm">{title}</p>
          <p className="mt-1 font-semibold text-2xl tabular-nums tracking-tight">{usd.format(latest)}</p>
          <p className="mt-1 text-muted-foreground text-xs tabular-nums">
            {months.at(-1)?.month}
            {budget ? ` · ${Math.round((latest / budget) * 100)}% of budget` : ""}
          </p>
        </div>
        <SegmentedControl aria-label="Bar layout" role="radiogroup" size="sm">
          {(["stacked", "grouped"] as const).map((value) => (
            <SegmentedControlItem
              aria-checked={layout === value}
              className="px-2 text-muted-foreground text-xs capitalize hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring sm:text-xs"
              data-checked={layout === value ? "" : undefined}
              key={value}
              onClick={() => setLayout(value)}
              role="radio"
            >
              {value}
            </SegmentedControlItem>
          ))}
        </SegmentedControl>
      </div>
      <div className="-mx-2 mt-4">
        <BarChart
          aspectRatio="2.1 / 1"
          barGap={layout === "stacked" ? 0.35 : 0.22}
          data={months}
          margin={{ left: 40, right: 12, top: 12, bottom: 32 }}
          stackGap={2}
          stacked={layout === "stacked"}
          xDataKey="month"
        >
          <Grid horizontal numTicksRows={3} />
          <YAxis formatValue={(v) => usdCompact.format(v)} numTicks={3} />
          {services.map((s, i) => (
            <Bar
              dataKey={s.key}
              fill={s.color}
              groupGap={2}
              key={s.key}
              lineCap={layout === "stacked" && i < services.length - 1 ? "butt" : 3}
            />
          ))}
          {budget && layout === "stacked" ? <BudgetLine value={budget} /> : null}
          <BarXAxis />
          <ChartTooltip
            showDots={false}
            rows={(point) => [
              ...services.map((s) => ({ color: s.color, label: s.label, value: usd.format(Number(point[s.key])) })),
              {
                color: "transparent",
                label: "Total",
                value: usd.format(services.reduce((sum, s) => sum + Number(point[s.key]), 0)),
              },
            ]}
          />
        </BarChart>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {services.map((s) => (
          <span className="flex items-center gap-1.5 text-muted-foreground text-xs" key={s.key}>
            <span className={cn("size-2 rounded-[calc(var(--radius)*0.3)]", s.swatch)} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
