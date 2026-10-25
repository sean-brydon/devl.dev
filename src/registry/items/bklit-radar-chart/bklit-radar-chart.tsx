"use client";

import { useState } from "react";
import { RadarArea } from "@/components/charts/radar-area";
import { RadarAxis } from "@/components/charts/radar-axis";
import { RadarChart } from "@/components/charts/radar-chart";
import type { RadarMetric } from "@/components/charts/radar-context";
import { RadarGrid } from "@/components/charts/radar-grid";
import { RadarLabels } from "@/components/charts/radar-labels";
import { cn } from "@/lib/utils";

export interface EvalModel {
  name: string;
  color: string;
  swatch: string;
  scores: Record<string, number>;
}

export interface ModelEvalRadarCardProps {
  title?: string;
  subtitle?: string;
  metrics: RadarMetric[];
  models: EvalModel[];
  className?: string;
}

export function ModelEvalRadarCard({
  title = "Model evals",
  subtitle,
  metrics,
  models,
  className,
}: ModelEvalRadarCardProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const data = models.map((m) => ({ label: m.name, color: m.color, values: m.scores }));
  const focus = hovered === null ? null : models[hovered];
  const average = (m: EvalModel) =>
    Math.round(metrics.reduce((sum, k) => sum + (m.scores[k.key] ?? 0), 0) / metrics.length);

  return (
    <div className={cn("w-[420px] max-w-full rounded-2xl border bg-card p-5 shadow-xs/5", className)}>
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-muted-foreground text-sm">{title}</p>
        {subtitle && <p className="text-right text-muted-foreground text-xs">{subtitle}</p>}
      </div>
      <div className="-ml-2 mt-2 flex flex-wrap gap-x-1">
        {models.map((m, i) => (
          <button
            className={cn(
              "flex h-7 items-center gap-2 rounded-lg px-2 text-xs transition-opacity duration-150 focus-visible:outline-2 focus-visible:outline-ring",
              hovered !== null && hovered !== i && "opacity-45",
            )}
            key={m.name}
            onBlur={() => setHovered(null)}
            onClick={() => setHovered(i)}
            onFocus={() => setHovered(i)}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            type="button"
          >
            <span className={cn("size-2 rounded-full", m.swatch)} />
            <span className="font-medium">{m.name}</span>
            <span className="text-muted-foreground tabular-nums">avg {average(m)}</span>
          </button>
        ))}
      </div>
      <div className="mx-auto mt-1 aspect-square w-full max-w-[300px]">
        <RadarChart
          data={data}
          hoveredIndex={hovered}
          levels={4}
          margin={44}
          metrics={metrics}
          onHoverChange={setHovered}
        >
          <RadarGrid showLabels={false} stroke="var(--muted-foreground)" strokeOpacity={0.3} />
          <RadarAxis stroke="var(--muted-foreground)" strokeOpacity={0.3} />
          <RadarLabels fontSize={11} offset={18} />
          {data.map((d, i) => (
            <RadarArea className="transform-none!" index={i} key={d.label} />
          ))}
        </RadarChart>
      </div>
      <p className="line-clamp-2 h-8 text-balance text-center text-muted-foreground text-xs tabular-nums">
        {focus
          ? metrics.map((k) => `${k.label} ${focus.scores[k.key]}`).join(" · ")
          : "Hover or tap a model to see its scores"}
      </p>
    </div>
  );
}
