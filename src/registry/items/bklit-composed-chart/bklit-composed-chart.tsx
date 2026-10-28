"use client";

import { useMemo } from "react";
import { ComposedChart } from "@/components/charts/composed-chart";
import { Grid } from "@/components/charts/grid";
import { Line } from "@/components/charts/line";
import { SeriesBar } from "@/components/charts/series-bar";
import { ChartTooltip } from "@/components/charts/tooltip";
import { XAxis } from "@/components/charts/x-axis";
import { YAxis } from "@/components/charts/y-axis";
import { cn } from "@/lib/utils";

export type OrdersWeek = {
  date: Date;
  orders: number;
};

export interface OrdersTrendCardProps {
  title?: string;
  weeks: OrdersWeek[];
  window?: number;
  className?: string;
}

const whole = new Intl.NumberFormat("en-US");
const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const weekFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

export function OrdersTrendCard({ title = "Orders per week", weeks, window = 4, className }: OrdersTrendCardProps) {
  const data = useMemo(
    () =>
      weeks.map((week, i) => {
        const slice = weeks.slice(Math.max(0, i - window + 1), i + 1);
        return { ...week, average: Math.round(slice.reduce((sum, w) => sum + w.orders, 0) / slice.length) };
      }),
    [weeks, window],
  );

  const last = data.at(-1);
  const best = data.reduce((top, w) => (w.orders > top.orders ? w : top), data[0]);

  return (
    <div className={cn("w-[460px] max-w-full rounded-2xl border bg-card p-5 shadow-xs/5", className)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-sm">{title}</p>
          <p className="mt-1 font-semibold text-2xl tabular-nums tracking-tight">{whole.format(last?.orders ?? 0)}</p>
        </div>
        <dl className="grid grid-cols-[auto_auto] gap-x-3 gap-y-1 text-right text-xs">
          <dt className="text-muted-foreground">{window}-week avg</dt>
          <dd className="font-medium tabular-nums">{whole.format(last?.average ?? 0)}</dd>
          <dt className="text-muted-foreground">Best week</dt>
          <dd className="font-medium tabular-nums">{best ? weekFmt.format(best.date) : "—"}</dd>
        </dl>
      </div>
      <div className="-mx-2 mt-4">
        <ComposedChart
          aspectRatio="2.1 / 1"
          barGap={2}
          data={data}
          margin={{ left: 36, right: 12, top: 12, bottom: 36 }}
          maxBarSize={18}
        >
          <Grid horizontal numTicksRows={3} />
          <YAxis formatValue={(v) => compact.format(v)} numTicks={3} />
          <SeriesBar dataKey="orders" fadedOpacity={0.35} fill="var(--color-indigo-500)" radius={3} />
          <Line dataKey="average" fadeEdges={false} stroke="var(--color-amber-500)" strokeWidth={2} />
          <XAxis numTicks={4} />
          <ChartTooltip
            showCrosshair={false}
            showDots={false}
            rows={(point) => [
              { color: "var(--color-indigo-500)", label: "Orders", value: whole.format(point.orders as number) },
              {
                color: "var(--color-amber-500)",
                label: `${window}-week avg`,
                value: whole.format(point.average as number),
              },
            ]}
          />
        </ComposedChart>
      </div>
      <div className="mt-2 flex gap-4 text-muted-foreground text-xs">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-[calc(var(--radius)*0.3)] bg-indigo-500" />
          Orders
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-3 rounded-full bg-amber-500" />
          Rolling average
        </span>
      </div>
    </div>
  );
}
