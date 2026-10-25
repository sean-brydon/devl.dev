import { cn } from "@/lib/utils";

export interface SparkDay {
  day: string;
  impressions: number;
  clicks: number;
}

/** Impressions as bars, clicks as brand ticks on top; one column per day of the fortnight. */
export function Sparkline({ days, className, label, stretch = false }: { days: SparkDay[]; className?: string; label: string; stretch?: boolean }) {
  const max = Math.max(1, ...days.map((d) => d.impressions));
  const maxClicks = Math.max(1, ...days.map((d) => d.clicks));
  const w = 6;
  const gap = 2;
  const h = 28;
  return (
    <svg aria-label={label} className={cn("overflow-visible", className)} preserveAspectRatio={stretch ? "none" : undefined} role="img" viewBox={`0 0 ${days.length * (w + gap) - gap} ${h}`}>
      {days.map((d, i) => {
        const bar = Math.max(1, (d.impressions / max) * h);
        const tick = d.clicks > 0 ? Math.max(2, (d.clicks / maxClicks) * (h * 0.6)) : 0;
        return (
          <g key={d.day}>
            <title>{`${d.day}: ${d.impressions} impressions, ${d.clicks} clicks`}</title>
            <rect className="fill-foreground/12" height={bar} rx={1.5} width={w} x={i * (w + gap)} y={h - bar} />
            {tick > 0 && <rect className="fill-brand-ink" height={tick} rx={1.5} width={w} x={i * (w + gap)} y={h - tick} />}
          </g>
        );
      })}
    </svg>
  );
}

export function formatCtr(ctr: number) {
  return `${(ctr * 100).toFixed(ctr > 0 && ctr < 0.01 ? 2 : 1)}%`;
}
