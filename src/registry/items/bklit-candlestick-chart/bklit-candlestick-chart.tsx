"use client";

import { useMemo, useState } from "react";
import { Candlestick } from "@/components/charts/candlestick";
import { CandlestickChart, type OHLCDataPoint } from "@/components/charts/candlestick-chart";
import { Grid } from "@/components/charts/grid";
import { ChartTooltip } from "@/components/charts/tooltip";
import { XAxis } from "@/components/charts/x-axis";
import { YAxis } from "@/components/charts/y-axis";
import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control";
import { cn } from "@/lib/utils";

export interface PriceRange {
  id: string;
  label: string;
  sessions: number;
  span: string;
}

export interface TickerCandlestickCardProps {
  symbol: string;
  company: string;
  candles: OHLCDataPoint[];
  ranges?: PriceRange[];
  defaultRange?: string;
  className?: string;
}

const defaultRanges: PriceRange[] = [
  { id: "1m", label: "1M", sessions: 21, span: "past month" },
  { id: "3m", label: "3M", sessions: 63, span: "past 3 months" },
];

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
const UP = "var(--chart-positive)";
const DOWN = "var(--chart-negative)";

export function TickerCandlestickCard({
  symbol,
  company,
  candles,
  ranges = defaultRanges,
  defaultRange = "1m",
  className,
}: TickerCandlestickCardProps) {
  const [rangeId, setRangeId] = useState(defaultRange);
  const range = ranges.find((r) => r.id === rangeId) ?? ranges[0];
  const visible = useMemo(() => candles.slice(-range.sessions), [candles, range.sessions]);

  const first = visible[0];
  const last = visible.at(-1);
  const change = first && last ? last.close - first.open : 0;
  const pct = first ? change / first.open : 0;
  const up = change >= 0;

  return (
    <div className={cn("w-[460px] max-w-full rounded-2xl border bg-card p-5 shadow-xs/5", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="flex items-baseline gap-2 text-sm">
            <span className="font-medium font-mono">{symbol}</span>
            <span className="truncate text-muted-foreground">{company}</span>
          </p>
          <p className="mt-1 font-semibold text-2xl tabular-nums tracking-tight">{usd.format(last?.close ?? 0)}</p>
          <p
            className={cn(
              "mt-1 font-medium text-xs tabular-nums",
              up ? "text-success-foreground" : "text-destructive-foreground",
            )}
          >
            {up ? "+" : "−"}
            {usd.format(Math.abs(change))} ({up ? "+" : "−"}
            {Math.abs(pct * 100).toFixed(2)}%)
            <span className="ml-1.5 font-normal text-muted-foreground">{range.span}</span>
          </p>
        </div>
        <SegmentedControl aria-label="Range" role="radiogroup" size="sm">
          {ranges.map((r) => (
            <SegmentedControlItem
              aria-checked={r.id === range.id}
              className="px-2 text-xs sm:text-xs"
              data-checked={r.id === range.id ? "" : undefined}
              key={r.id}
              onClick={() => setRangeId(r.id)}
              role="radio"
            >
              {r.label}
            </SegmentedControlItem>
          ))}
        </SegmentedControl>
      </div>
      <div className="-mx-2 mt-4">
        <CandlestickChart
          aspectRatio="2 / 1"
          candleGap={range.sessions > 30 ? 0.3 : 0.4}
          data={visible}
          margin={{ left: 16, right: 52, top: 12, bottom: 36 }}
        >
          <Grid horizontal numTicksRows={4} />
          <Candlestick negativeFill={DOWN} positiveFill={UP} />
          <XAxis numTicks={4} />
          <YAxis formatValue={(v) => `$${v.toFixed(0)}`} numTicks={4} orientation="right" />
          <ChartTooltip
            showDots={false}
            indicatorColor={(point) => ((point.close as number) >= (point.open as number) ? UP : DOWN)}
            rows={(point) => {
              const color = (point.close as number) >= (point.open as number) ? UP : DOWN;
              return [
                { color, label: "Open", value: usd.format(point.open as number) },
                { color: "transparent", label: "High", value: usd.format(point.high as number) },
                { color: "transparent", label: "Low", value: usd.format(point.low as number) },
                { color: "transparent", label: "Close", value: usd.format(point.close as number) },
              ];
            }}
          />
        </CandlestickChart>
      </div>
    </div>
  );
}
