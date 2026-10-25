"use client";

import { useMemo, useState } from "react";
import { FunnelChart, type FunnelStage } from "@/components/charts/funnel-chart";
import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control";
import { cn } from "@/lib/utils";

export interface FunnelPeriod {
  id: string;
  label: string;
  stages: FunnelStage[];
}

export interface CheckoutFunnelCardProps {
  title?: string;
  periods: FunnelPeriod[];
  className?: string;
}

const compact = (value: number) => (value >= 10_000 ? `${(value / 1000).toFixed(1)}k` : value.toLocaleString("en-US"));

export function CheckoutFunnelCard({ title = "Checkout funnel", periods, className }: CheckoutFunnelCardProps) {
  const [periodId, setPeriodId] = useState(periods[0]?.id);
  const [hovered, setHovered] = useState<number | null>(null);
  const period = periods.find((p) => p.id === periodId) ?? periods[0];
  const stages = period.stages;

  const { conversion, drop } = useMemo(() => {
    let worst = { from: "", to: "", rate: 0 };
    for (let i = 1; i < stages.length; i++) {
      const rate = 1 - stages[i].value / stages[i - 1].value;
      if (rate > worst.rate) worst = { from: stages[i - 1].label, to: stages[i].label, rate };
    }
    const first = stages[0]?.value ?? 0;
    return { conversion: first ? (stages.at(-1)?.value ?? 0) / first : 0, drop: worst };
  }, [stages]);

  const focus = hovered === null ? null : stages[hovered];
  const previous = hovered ? stages[hovered - 1] : null;

  return (
    <div className={cn("w-[480px] max-w-full rounded-2xl border bg-card p-5 shadow-xs/5", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-muted-foreground text-sm">{title}</p>
          <p className="mt-1 font-semibold text-2xl tabular-nums tracking-tight">
            {(conversion * 100).toFixed(1)}%
            <span className="ml-1.5 font-normal text-muted-foreground text-sm">converted</span>
          </p>
        </div>
        <SegmentedControl aria-label="Period" role="radiogroup" size="sm">
          {periods.map((p) => (
            <SegmentedControlItem
              aria-checked={p.id === period.id}
              className="px-2 text-xs sm:text-xs"
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
      <div className="mt-4">
        <FunnelChart
          color="var(--color-indigo-500)"
          data={stages}
          formatValue={compact}
          gap={3}
          hoveredIndex={hovered}
          layers={3}
          onHoverChange={setHovered}
        />
      </div>
      <p className="mt-3 line-clamp-2 h-8 text-pretty text-muted-foreground text-xs tabular-nums sm:h-4">
        {focus && previous ? (
          <>
            <span className="font-medium text-foreground">{focus.label}</span>:{" "}
            {((focus.value / previous.value) * 100).toFixed(1)}% of {previous.label} ·{" "}
            {(previous.value - focus.value).toLocaleString("en-US")} dropped off
          </>
        ) : (
          <>
            Biggest drop: <span className="font-medium text-foreground">{drop.from}</span> →{" "}
            <span className="font-medium text-foreground">{drop.to}</span>, −{(drop.rate * 100).toFixed(0)}%
          </>
        )}
      </p>
    </div>
  );
}
