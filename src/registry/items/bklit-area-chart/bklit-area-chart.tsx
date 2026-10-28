"use client";

import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart } from "@/components/charts/area-chart";
import { useChartHover } from "@/components/charts/chart-context";
import { Grid } from "@/components/charts/grid";
import { ChartTooltip, TooltipContent } from "@/components/charts/tooltip";
import { XAxis } from "@/components/charts/x-axis";
import { YAxis } from "@/components/charts/y-axis";
import { Badge } from "@/components/ui/badge";
import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control";
import { cn } from "@/lib/utils";

export type RevenuePoint = {
  date: Date;
  revenue: number;
  orders: number;
};

export interface RevenuePeriod {
  id: string;
  label: string;
  days: number;
}

export interface RevenueAreaCardProps {
  title?: string;
  series: RevenuePoint[];
  periods?: RevenuePeriod[];
  defaultPeriod?: string;
  currency?: string;
  className?: string;
}

const defaultPeriods: RevenuePeriod[] = [
  { id: "7d", label: "7D", days: 7 },
  { id: "30d", label: "30D", days: 30 },
  { id: "90d", label: "90D", days: 90 },
];

const dayFmt = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" });

function HoverReadout({ onChange }: { onChange: (point: RevenuePoint | null) => void }) {
  const { tooltipData } = useChartHover();
  const point = (tooltipData?.point as RevenuePoint | undefined) ?? null;
  useEffect(() => onChange(point), [point, onChange]);
  return null;
}

function axisMoney(value: number) {
  return value >= 1000 ? `$${value / 1000}K` : `$${value}`;
}

function sum(points: RevenuePoint[]) {
  return points.reduce((total, p) => total + p.revenue, 0);
}

export function RevenueAreaCard({
  title = "Net revenue",
  series,
  periods = defaultPeriods,
  defaultPeriod = "30d",
  currency = "USD",
  className,
}: RevenueAreaCardProps) {
  const [periodId, setPeriodId] = useState(defaultPeriod);
  const [hovered, setHovered] = useState<RevenuePoint | null>(null);
  const period = periods.find((p) => p.id === periodId) ?? periods[0];

  const money = useMemo(
    () => new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }),
    [currency],
  );

  const { current, change } = useMemo(() => {
    const current = series.slice(-period.days);
    const previous = series.slice(-period.days * 2, -period.days);
    const prevTotal = sum(previous);
    return {
      current,
      change: prevTotal > 0 ? (sum(current) - prevTotal) / prevTotal : null,
    };
  }, [series, period.days]);

  const total = sum(current);
  const up = change !== null && change >= 0;

  return (
    <div className={cn("w-[440px] max-w-full rounded-2xl border bg-card p-5 shadow-xs/5", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-muted-foreground text-sm">{title}</p>
          <p className="mt-1 font-semibold text-2xl tabular-nums tracking-tight">
            {money.format(hovered ? hovered.revenue : total)}
          </p>
        </div>
        <SegmentedControl aria-label="Period" role="radiogroup" size="sm">
          {periods.map((p) => (
            <SegmentedControlItem
              aria-checked={p.id === period.id}
              className="px-2 text-xs sm:text-xs text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              data-checked={p.id === period.id ? "" : undefined}
              key={p.id}
              onClick={() => setPeriodId(p.id)}
              role="radio"
            >
              {p.label}
            </SegmentedControlItem>
          ))}
        </SegmentedControl>
      </div>
      <div className="mt-1.5 flex h-5 items-center gap-2 text-xs">
        {hovered ? (
          <span className="text-muted-foreground tabular-nums">{dayFmt.format(hovered.date)}</span>
        ) : (
          <>
            {change !== null && (
              <Badge variant={up ? "success" : "error"}>
                <span className="tabular-nums">
                  {up ? "+" : ""}
                  {(change * 100).toFixed(1)}%
                </span>
              </Badge>
            )}
            <span className="text-muted-foreground">vs prior {period.days} days</span>
          </>
        )}
      </div>
      <div className="-mx-2 mt-3">
        <AreaChart aspectRatio="2.2 / 1" data={current} margin={{ left: 40, right: 20, top: 12, bottom: 36 }}>
          <Grid horizontal numTicksRows={3} />
          <Area dataKey="revenue" fill="var(--color-indigo-500)" fillOpacity={0.32} strokeWidth={2} />
          <YAxis formatValue={axisMoney} numTicks={3} />
          <XAxis numTicks={4} />
          <ChartTooltip
            content={({ point }) => (
              <TooltipContent
                rows={[
                  {
                    color: "var(--color-indigo-500)",
                    label: "Revenue",
                    value: money.format(point.revenue as number),
                  },
                  {
                    color: "transparent",
                    label: "Orders",
                    value: (point.orders as number).toLocaleString("en-US"),
                  },
                  {
                    color: "transparent",
                    label: "Avg. order",
                    value: money.format((point.revenue as number) / (point.orders as number)),
                  },
                ]}
              />
            )}
          />
          <HoverReadout onChange={setHovered} />
        </AreaChart>
      </div>
    </div>
  );
}
