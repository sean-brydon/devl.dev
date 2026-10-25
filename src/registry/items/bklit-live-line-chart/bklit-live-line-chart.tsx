"use client";

import { curveMonotoneX } from "@visx/curve";
import { PauseIcon, PlayIcon } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { useMemo, useState } from "react";
import { LiveLine } from "@/components/charts/live-line";
import { type LiveLinePoint, LiveLineChart } from "@/components/charts/live-line-chart";
import { LiveXAxis } from "@/components/charts/live-x-axis";
import { LiveYAxis } from "@/components/charts/live-y-axis";
import { ChartTooltip, TooltipContent } from "@/components/charts/tooltip";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface LiveTrafficCardProps {
  title?: string;
  endpoint?: string;
  points: LiveLinePoint[];
  window?: number;
  unit?: string;
  className?: string;
}

const whole = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const LINE = "var(--color-indigo-500)";
const lineColors = { up: LINE, down: LINE, flat: LINE };

export function LiveTrafficCard({
  title = "Requests per second",
  endpoint = "api.halcyon.dev",
  points,
  window = 40,
  unit = "req/s",
  className,
}: LiveTrafficCardProps) {
  const [frozen, setFrozen] = useState<LiveLinePoint[] | null>(null);
  const reduceMotion = useReducedMotion();
  const paused = frozen !== null;
  const shown = frozen ?? points;
  const latest = shown.at(-1)?.value ?? 0;

  const { peak, average } = useMemo(() => {
    const now = shown.at(-1)?.time ?? 0;
    const inWindow = shown.filter((p) => p.time >= now - window);
    if (inWindow.length === 0) return { peak: 0, average: 0 };
    return {
      peak: Math.max(...inWindow.map((p) => p.value)),
      average: inWindow.reduce((sum, p) => sum + p.value, 0) / inWindow.length,
    };
  }, [shown, window]);

  return (
    <div className={cn("w-[460px] max-w-full rounded-2xl border bg-card p-5 shadow-xs/5", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 whitespace-nowrap text-muted-foreground text-sm">
            <span className="relative flex size-2">
              {!paused && (
                <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500 opacity-60 motion-reduce:hidden" />
              )}
              <span
                className={cn("relative size-2 rounded-full", paused ? "bg-muted-foreground/50" : "bg-emerald-500")}
              />
            </span>
            {title}
          </div>
          <p className="mt-1 font-semibold text-2xl tabular-nums tracking-tight">
            {whole.format(latest)}
            <span className="ml-1 font-normal text-muted-foreground text-sm">{unit}</span>
          </p>
          <p className="mt-1 truncate text-muted-foreground text-xs tabular-nums">
            <span className="font-mono">{endpoint}</span> · peak {whole.format(peak)} · avg {whole.format(average)}
          </p>
        </div>
        <div className="shrink-0">
          <Button
            aria-label={paused ? "Resume stream" : "Pause stream"}
            onClick={() => setFrozen(paused ? null : points)}
            size="sm"
            variant="outline"
          >
            {paused ? <PlayIcon /> : <PauseIcon />}
            {paused ? "Resume" : "Pause"}
          </Button>
        </div>
      </div>
      <div className="-mx-2 mt-3 [&_.overflow-hidden_.font-mono]:inline-block [&_.overflow-hidden_.font-mono]:-translate-y-1/2">
        <LiveLineChart
          data={shown}
          lerpSpeed={reduceMotion ? 1 : 0.08}
          margin={{ top: 16, right: 56, bottom: 36, left: 44 }}
          paused={paused}
          style={{ height: 200 }}
          value={latest}
          window={window}
        >
          <LiveLine
            curve={curveMonotoneX}
            dataKey="value"
            formatValue={(v) => whole.format(v)}
            momentumColors={lineColors}
            stroke={LINE}
          />
          <LiveXAxis numTicks={4} />
          <ChartTooltip
            content={({ point }) => (
              <TooltipContent
                rows={[{ color: LINE, label: "Requests", value: `${whole.format(point.value as number)} ${unit}` }]}
              />
            )}
            showDatePill={false}
          />
          <LiveYAxis formatValue={(v) => whole.format(v)} minGap={28} position="left" />
        </LiveLineChart>
      </div>
    </div>
  );
}
