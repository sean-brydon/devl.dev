"use client";

import { useState } from "react";
import { Ring } from "@/components/charts/ring";
import { RingChart } from "@/components/charts/ring-chart";
import { cn } from "@/lib/utils";

export interface QuarterTarget {
  label: string;
  value: number;
  target: number;
  color: string;
  swatch: string;
}

export interface QuarterTargetsRingCardProps {
  title?: string;
  quarter?: string;
  daysLeft?: number;
  targets: QuarterTarget[];
  className?: string;
}

function money(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2).replace(/\.?0+$/, "")}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return `$${value}`;
}

export function QuarterTargetsRingCard({
  title = "Revenue targets",
  quarter = "Q4 2026",
  daysLeft,
  targets,
  className,
}: QuarterTargetsRingCardProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const data = targets.map((t) => ({ label: t.label, value: t.value, maxValue: t.target, color: t.color }));
  const overall = targets.reduce((sum, t) => sum + t.value, 0) / targets.reduce((sum, t) => sum + t.target, 0);
  const focus = hovered === null ? null : targets[hovered];
  const focusPct = focus ? focus.value / focus.target : overall;

  return (
    <div className={cn("w-[460px] max-w-full rounded-2xl border bg-card p-5 shadow-xs/5", className)}>
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-muted-foreground text-sm">{title}</p>
        <p className="text-muted-foreground text-xs">
          {quarter}
          {daysLeft !== undefined && ` · ${daysLeft} days left`}
        </p>
      </div>
      <div className="mt-4 flex flex-col items-center gap-6 sm:flex-row">
        <div className="relative shrink-0">
          <RingChart
            baseInnerRadius={46}
            data={data}
            endAngle={Math.PI * 2}
            hoveredIndex={hovered}
            onHoverChange={setHovered}
            ringGap={5}
            size={184}
            startAngle={0}
            strokeWidth={12}
          >
            {data.map((d, i) => (
              <Ring index={i} key={d.label} />
            ))}
          </RingChart>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center leading-none">
            <span className="font-semibold text-xl tabular-nums">{Math.round(focusPct * 100)}%</span>
            <span className="mt-1 text-muted-foreground text-xs">{focus ? focus.label : "of target"}</span>
          </div>
        </div>
        <ul className="w-full min-w-0 flex-1 space-y-1">
          {targets.map((t, i) => {
            const pct = t.value / t.target;
            return (
              <li key={t.label}>
                <button
                  className={cn(
                    "w-full rounded-lg px-2 py-1.5 text-left transition-opacity duration-150 focus-visible:outline-2 focus-visible:outline-ring",
                    hovered !== null && hovered !== i && "opacity-45",
                  )}
                  onBlur={() => setHovered(null)}
                  onFocus={() => setHovered(i)}
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                  type="button"
                >
                  <span className="flex items-center gap-2 text-sm">
                    <span className={cn("size-2.5 shrink-0 rounded-full", t.swatch)} />
                    <span className="flex-1 truncate">{t.label}</span>
                    <span className="font-medium text-xs tabular-nums">{Math.round(pct * 100)}%</span>
                  </span>
                  <span className="mt-0.5 block pl-[18px] text-muted-foreground text-xs tabular-nums">
                    {money(t.value)} of {money(t.target)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
