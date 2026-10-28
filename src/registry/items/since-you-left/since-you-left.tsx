"use client";

import { ArrowUpIcon } from "lucide-react";
import { animate, type MotionValue, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { Tabs, TabsList, TabsTab } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export interface SinceYouLeftPeriod {
  id: string;
  label: string;
  caption?: string;
}

export interface SinceYouLeftMetric {
  id: string;
  label: string;
  good?: "up" | "down";
  format?: (value: number) => string;
  series: Record<string, number[]>;
}

export interface SinceYouLeftProps {
  title?: string;
  periods: SinceYouLeftPeriod[];
  metrics: SinceYouLeftMetric[];
  defaultPeriod?: string;
  flatBelow?: number;
  className?: string;
}

const SAMPLES = 16;
const plain = (v: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(v);

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

function Face({ n, turn }: { n: number; turn: MotionValue<number> }) {
  const y = useTransform(turn, (t) => {
    let offset = (((n - t) % 10) + 10) % 10;
    if (offset > 5) offset -= 10;
    return `${offset * 100}%`;
  });
  return (
    <motion.span className="absolute inset-x-0 top-0 block h-[1.15em] text-center leading-[1.15em]" style={{ y }}>
      {n}
    </motion.span>
  );
}

function Wheel({ digit, instant, delay }: { digit: number; instant: boolean; delay: number }) {
  const reduce = useReducedMotion();
  const turn = useMotionValue(digit);
  const target = useRef(digit);
  useEffect(() => {
    let step = digit - (((target.current % 10) + 10) % 10);
    if (step > 5) step -= 10;
    else if (step < -5) step += 10;
    target.current += step;
    if (reduce || instant) turn.jump(target.current);
    else if (step !== 0 || (!turn.isAnimating() && turn.get() !== target.current))
      animate(turn, target.current, { type: "spring", stiffness: 280, damping: 34, delay });
  }, [digit, instant, delay, reduce, turn]);
  useEffect(() => () => turn.stop(), [turn]);
  return (
    <span className="relative inline-block h-[1.15em] overflow-hidden [mask-image:linear-gradient(transparent,black_20%,black_80%,transparent)]">
      <span className="invisible block leading-[1.15em]">0</span>
      {DIGITS.map((n) => (
        <Face key={n} n={n} turn={turn} />
      ))}
    </span>
  );
}

function Roll({
  text,
  className,
  instant = false,
  delay = 0,
}: {
  text: string;
  className?: string;
  instant?: boolean;
  delay?: number;
}) {
  let place = 0;
  let other = 0;
  const glyphs = [...text]
    .reverse()
    .map((char) => {
      const isDigit = char >= "0" && char <= "9";
      return { char, isDigit, key: isDigit ? `d${place++}` : `s${other++}${char}` };
    })
    .reverse();
  return (
    <span className={cn("inline-flex whitespace-nowrap tabular-nums leading-none", className)}>
      <span className="sr-only">{text}</span>
      <span aria-hidden className="inline-flex">
        {glyphs.map((g) =>
          g.isDigit ? (
            <Wheel delay={delay} digit={Number(g.char)} instant={instant} key={g.key} />
          ) : (
            <span className="inline-block h-[1.15em] leading-[1.15em]" key={g.key}>
              {g.char === " " ? " " : g.char}
            </span>
          ),
        )}
      </span>
    </span>
  );
}

function resample(values: number[], n = SAMPLES) {
  if (values.length === 0) return Array(n).fill(0);
  if (values.length === 1) return Array(n).fill(values[0]);
  return Array.from({ length: n }, (_, i) => {
    const t = (i / (n - 1)) * (values.length - 1);
    const i1 = Math.min(values.length - 2, Math.floor(t));
    const u = t - i1;
    const p0 = values[Math.max(0, i1 - 1)];
    const p1 = values[i1];
    const p2 = values[i1 + 1];
    const p3 = values[Math.min(values.length - 1, i1 + 2)];
    return (
      0.5 *
      (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u * u * u)
    );
  });
}

function paths(values: number[], w: number, h: number) {
  const pts = resample(values);
  const lo = Math.min(...pts);
  const hi = Math.max(...pts);
  const mid = (lo + hi) / 2;
  const span = Math.max(hi - lo, Math.abs(mid) * 0.12) || 1;
  const min = mid - span / 2;
  const xy = pts.map((v, i) => [(i / (pts.length - 1)) * w, h - 2 - ((v - min) / span) * (h - 4)] as const);
  let line = `M${xy[0][0].toFixed(2)},${xy[0][1].toFixed(2)}`;
  for (let i = 1; i < xy.length; i++) {
    const [x0, y0] = xy[i - 1];
    const [x1, y1] = xy[i];
    const [xp, yp] = xy[i - 2] ?? xy[i - 1];
    const [xn, yn] = xy[i + 1] ?? xy[i];
    const c1x = x0 + (x1 - xp) / 6;
    const c1y = y0 + (y1 - yp) / 6;
    const c2x = x1 - (xn - x0) / 6;
    const c2y = y1 - (yn - y0) / 6;
    line += ` C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${x1.toFixed(2)},${y1.toFixed(2)}`;
  }
  const area = `${line} L${w},${h} L0,${h} Z`;
  const end = xy[xy.length - 1];
  return { line, area, end };
}

type Mood = "good" | "bad" | "flat";

const moodText: Record<Mood, string> = {
  good: "text-success-foreground",
  bad: "text-destructive-foreground",
  flat: "text-muted-foreground",
};
const moodBg: Record<Mood, string> = {
  good: "bg-success/10",
  bad: "bg-destructive/10",
  flat: "bg-muted",
};
const moodStroke: Record<Mood, string> = {
  good: "var(--color-success)",
  bad: "var(--color-destructive)",
  flat: "var(--color-muted-foreground)",
};

function MetricRow({
  metric,
  periodId,
  flatBelow,
  index,
}: {
  metric: SinceYouLeftMetric;
  periodId: string;
  flatBelow: number;
  index: number;
}) {
  const reduce = useReducedMotion();
  const gradientId = `change-${useId().replace(/:/g, "")}`;
  const values = metric.series[periodId] ?? [];
  const first = values[0] ?? 0;
  const last = values[values.length - 1] ?? 0;
  const delta = first ? (last - first) / Math.abs(first) : 0;
  const direction = Math.abs(delta) < flatBelow ? "flat" : delta > 0 ? "up" : "down";
  const mood: Mood = direction === "flat" ? "flat" : direction === (metric.good ?? "up") ? "good" : "bad";
  const format = metric.format ?? plain;

  const W = 72;
  const H = 26;
  const { line, area, end } = paths(values, W, H);
  const spring = reduce ? { duration: 0 } : ({ type: "spring", duration: 0.5, bounce: 0 } as const);
  const rotate = direction === "up" ? 0 : direction === "down" ? 180 : 90;
  const sign = delta > 0 ? "+" : delta < 0 ? "−" : "";
  const deltaText = `${sign}${Math.abs(delta * 100).toFixed(1)}%`;
  const words = `${metric.label}: ${format(last)}, ${direction === "flat" ? "about the same" : `${direction} ${deltaText.replace("−", "")}`} from ${format(first)}`;

  return (
    <motion.li
      animate={{ opacity: 1, y: 0 }}
      aria-label={words}
      className="group/row grid grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-2 rounded-xl px-2 py-2 transition-colors hover:bg-accent @sm:gap-3"
      initial={{ opacity: 0, y: 6 }}
      transition={reduce ? { duration: 0 } : { type: "spring", duration: 0.4, bounce: 0, delay: Math.min(index, 8) * 0.03 }}
    >
      <span aria-hidden className="truncate text-muted-foreground text-sm">
        {metric.label}
      </span>
      <svg aria-hidden className="h-6.5 w-12 overflow-visible @sm:w-18" viewBox={`0 0 ${W} ${H}`}>
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" style={{ stopColor: moodStroke[mood], stopOpacity: 0.22 }} />
            <stop offset="100%" style={{ stopColor: moodStroke[mood], stopOpacity: 0 }} />
          </linearGradient>
        </defs>
        <motion.path animate={{ d: area }} fill={`url(#${gradientId})`} initial={false} transition={spring} />
        <motion.path
          animate={{ d: line, stroke: moodStroke[mood] }}
          fill="none"
          initial={false}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          transition={spring}
        />
        <motion.circle
          animate={{ cx: end[0], cy: end[1], fill: moodStroke[mood] }}
          className="opacity-0 transition-opacity group-hover/row:opacity-100"
          initial={false}
          r={2.5}
          transition={spring}
        />
      </svg>
      <Roll className="min-w-12 justify-end font-medium text-sm @sm:min-w-14" delay={Math.min(index, 8) * 0.03} text={format(last)} />
      <span
        aria-hidden
        className={cn(
          "inline-flex min-w-19 items-center justify-end gap-1 rounded-full py-0.5 ps-1 pe-2 font-medium text-xs transition-colors duration-300",
          moodBg[mood],
          moodText[mood],
        )}
      >
        <motion.span
          animate={{ rotate }}
          className="inline-flex"
          initial={false}
          transition={reduce ? { duration: 0 } : { type: "spring", duration: 0.4, bounce: 0 }}
        >
          <ArrowUpIcon className="size-3.5" strokeWidth={2.5} />
        </motion.span>
        <Roll delay={Math.min(index, 8) * 0.03} text={deltaText} />
      </span>
    </motion.li>
  );
}

export function SinceYouLeft({
  title = "What changed",
  periods,
  metrics,
  defaultPeriod,
  flatBelow = 0.005,
  className,
}: SinceYouLeftProps) {
  const [periodId, setPeriodId] = useState(defaultPeriod ?? periods[0]?.id);
  const period = periods.find((p) => p.id === periodId) ?? periods[0];

  const tally = { good: 0, bad: 0, flat: 0 };
  for (const m of metrics) {
    const v = m.series[period.id] ?? [];
    const first = v[0] ?? 0;
    const delta = first ? ((v[v.length - 1] ?? 0) - first) / Math.abs(first) : 0;
    if (Math.abs(delta) < flatBelow) tally.flat++;
    else if ((delta > 0 ? "up" : "down") === (m.good ?? "up")) tally.good++;
    else tally.bad++;
  }

  return (
    <section
      aria-label={title}
      className={cn("flex w-full max-w-[26rem] flex-col gap-3 rounded-2xl border bg-card p-3 text-card-foreground shadow-xs/5", className)}
    >
      <header className="flex flex-col gap-3 px-2 pt-1">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
          <div className="flex min-w-0 flex-col gap-0.5">
            <h3 className="text-balance font-medium text-sm">{title}</h3>
            <p className="text-muted-foreground text-xs">{period.caption ?? period.label}</p>
          </div>
          <p aria-live="polite" className="flex items-center gap-2.5 pt-0.5 text-xs">
            <span className="inline-flex items-center gap-1 text-success-foreground">
              <span className="size-1.5 rounded-full bg-success" />
              <Roll text={String(tally.good)} />
              <span className="text-muted-foreground">better</span>
            </span>
            <span className="inline-flex items-center gap-1 text-destructive-foreground">
              <span className="size-1.5 rounded-full bg-destructive" />
              <Roll text={String(tally.bad)} />
              <span className="text-muted-foreground">worse</span>
            </span>
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <span className="size-1.5 rounded-full bg-muted-foreground/60" />
              <Roll text={String(tally.flat)} />
              <span className="text-muted-foreground">flat</span>
            </span>
          </p>
        </div>
        <Tabs onValueChange={(v) => setPeriodId(String(v))} value={period.id}>
          <TabsList className="w-full text-muted-foreground" size="sm">
            {periods.map((p) => (
              <TabsTab className="text-xs sm:text-xs" key={p.id} value={p.id}>
                {p.label}
              </TabsTab>
            ))}
          </TabsList>
        </Tabs>
      </header>
      <ul className="@container flex flex-col">
        {metrics.map((m, i) => (
          <MetricRow flatBelow={flatBelow} index={i} key={m.id} metric={m} periodId={period.id} />
        ))}
      </ul>
    </section>
  );
}
