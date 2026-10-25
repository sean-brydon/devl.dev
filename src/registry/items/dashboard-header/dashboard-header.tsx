"use client";

import { ArrowDownRightIcon, ArrowUpRightIcon, TargetIcon } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { type KeyboardEvent, type PointerEvent, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// Stays false until mounted so the server render and the first client render match.
function useSafeReducedMotion() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && !!prefers;
}

export interface DashboardDay {
  label: string;
  weekday: string;
  revenue: number;
  users: number;
  orders: number;
}

export type DashboardRange = 7 | 30 | 90;

export interface DashboardHeaderProps {
  days?: DashboardDay[];
  title?: string;
  currency?: string;
  dailyGoal?: number;
  defaultRange?: DashboardRange;
  className?: string;
}

type MetricKey = "revenue" | "users" | "orders";

const metrics: { key: MetricKey; label: string; tone: string; mode: "sum" | "avg" }[] = [
  { key: "revenue", label: "Revenue", tone: "text-blue-600 dark:text-blue-400", mode: "sum" },
  { key: "users", label: "Active users", tone: "text-emerald-600 dark:text-emerald-400", mode: "avg" },
  { key: "orders", label: "Orders", tone: "text-amber-500 dark:text-amber-400", mode: "sum" },
];
const revenueTone = metrics[0].tone;
const settle = { type: "spring", stiffness: 300, damping: 34 } as const;

const ranges: { value: DashboardRange; label: string }[] = [
  { value: 7, label: "7D" },
  { value: 30, label: "30D" },
  { value: 90, label: "90D" },
];

export function sampleDashboardDays(count = 180): DashboardDay[] {
  let seed = 20261024;
  const rand = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const end = Date.UTC(2026, 9, 24);
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(end - (count - 1 - i) * 86_400_000);
    const dow = date.getUTCDay();
    const trend = 1 + (i / count) * 0.4;
    const weekend = dow === 0 || dow === 6 ? 0.84 : 1;
    const wave = 1 + 0.1 * Math.sin(i / 9 + 1);
    const revenue = Math.round(1500 * trend * weekend * wave * (0.93 + rand() * 0.14));
    return {
      label: date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
      weekday: date.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }),
      revenue,
      users: Math.round(640 * trend * (weekend * 0.6 + 0.4) * (0.95 + rand() * 0.1)),
      orders: Math.round(revenue / (36 + rand() * 8)),
    };
  });
}

const fallbackDays = sampleDashboardDays();

function Roll({ text, className, instant }: { text: string; className?: string; instant?: boolean }) {
  const reduce = useSafeReducedMotion();
  const chars = text.split("");
  return (
    <span className={cn("inline-flex tabular-nums leading-[1.15em]", className)}>
      <span className="sr-only">{text}</span>
      {chars.map((char, i) => {
        const key = chars.length - i;
        if (!/\d/.test(char)) {
          return (
            <span aria-hidden key={`s${key}`}>
              {char}
            </span>
          );
        }
        return (
          <span aria-hidden className="relative inline-block h-[1.15em] w-[1ch] overflow-hidden" key={`d${key}`}>
            <motion.span
              animate={{ y: `${-Number(char) * 1.15}em` }}
              className="absolute inset-x-0 top-0 flex flex-col"
              initial={false}
              transition={reduce || instant ? { duration: 0 } : settle}
            >
              {Array.from({ length: 10 }, (_, n) => (
                <span className="block h-[1.15em]" key={n}>
                  {n}
                </span>
              ))}
            </motion.span>
          </span>
        );
      })}
    </span>
  );
}

function smoothPath(points: [number, number][]) {
  if (points.length < 2) return "";
  let d = `M${points[0][0]},${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2[0]},${p2[1]}`;
  }
  return d;
}

function toPoints(values: number[], lo: number, hi: number, w: number, h: number, pad = 6): [number, number][] {
  const step = values.length > 1 ? w / (values.length - 1) : 0;
  const span = hi - lo || 1;
  return values.map((v, i) => [i * step, h - pad - ((v - lo) / span) * (h - pad * 2)]);
}

function Sparkline({ values, tone, hover }: { values: number[]; tone: string; hover: number | null }) {
  const gradientId = `spark-${useId().replace(/:/g, "")}`;
  const pts = toPoints(values, Math.min(...values) * 0.9, Math.max(...values) * 1.05, 100, 36, 3);
  const line = smoothPath(pts);
  const at = hover !== null ? pts[hover] : null;
  return (
    <div className={cn("relative h-9 w-full", tone)}>
      <svg aria-hidden className="absolute inset-0 size-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 36">
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity={0.2} />
            <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
          </linearGradient>
        </defs>
        <path d={`${line} L100,36 L0,36 Z`} fill={`url(#${gradientId})`} />
        <path d={line} fill="none" stroke="currentColor" strokeWidth="1.75" vectorEffect="non-scaling-stroke" />
      </svg>
      {at && (
        <span
          className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card bg-current"
          style={{ left: `${at[0]}%`, top: `${(at[1] / 36) * 100}%` }}
        />
      )}
    </div>
  );
}

export function DashboardHeader({
  days = fallbackDays,
  title = "Overview",
  currency = "$",
  dailyGoal = 2000,
  defaultRange = 30,
  className,
}: DashboardHeaderProps) {
  const reduce = useSafeReducedMotion();
  const uid = useId().replace(/:/g, "");
  const [range, setRange] = useState<DashboardRange>(defaultRange);
  const [hover, setHover] = useState<number | null>(null);
  const plotRef = useRef<HTMLDivElement>(null);

  const span = Math.min(range, Math.floor(days.length / 2));
  const current = days.slice(-span);
  const previous = days.slice(-span * 2, -span);
  const money = (n: number) => `${currency}${Math.round(n).toLocaleString("en-US")}`;
  const plain = (n: number) => Math.round(n).toLocaleString("en-US");
  const fmt = (key: MetricKey, n: number) => (key === "revenue" ? money(n) : plain(n));
  const total = (list: DashboardDay[], key: MetricKey, mode: "sum" | "avg") => {
    const sum = list.reduce((acc, d) => acc + d[key], 0);
    return mode === "avg" ? sum / Math.max(1, list.length) : sum;
  };

  const W = 600;
  const H = 240;
  const cur = current.map((d) => d.revenue);
  const prev = previous.map((d) => d.revenue);
  const rawMax = Math.max(...cur, ...prev);
  const rawMin = Math.min(...cur, ...prev);
  const rawTick = Math.max(1, rawMax - rawMin) / 3;
  const magnitude = 10 ** Math.floor(Math.log10(rawTick));
  const tick = [1, 2, 5, 10].map((n) => n * magnitude).find((n) => n >= rawTick) ?? rawTick;
  const lo = Math.max(0, Math.floor((rawMin - tick * 0.5) / tick) * tick);
  const max = Math.ceil((rawMax + tick * 0.15) / tick) * tick;
  const yOf = (v: number) => H - 8 - ((v - lo) / (max - lo || 1)) * (H - 16);
  const curPts = toPoints(cur, lo, max, W, H, 8);
  const prevPts = toPoints(prev, lo, max, W, H, 8);
  const curLine = smoothPath(curPts);
  const prevLine = smoothPath(prevPts);
  const gridValues: number[] = [];
  for (let v = lo + tick; v <= max + 1; v += tick) gridValues.push(v);

  const hovered = hover !== null ? current[hover] : null;
  const hoveredPrev = hover !== null ? previous[hover] : null;

  const pick = (event: PointerEvent<HTMLDivElement>) => {
    const rect = plotRef.current?.getBoundingClientRect();
    if (!rect) return;
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    setHover(Math.round(ratio * (current.length - 1)));
  };

  const onPlotKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      const delta = event.key === "ArrowRight" ? 1 : -1;
      setHover((h) => Math.min(current.length - 1, Math.max(0, (h ?? (delta > 0 ? -1 : current.length)) + delta)));
    } else if (event.key === "Escape") {
      setHover(null);
    }
  };

  const revenueTotal = total(current, "revenue", "sum");
  const goal = dailyGoal * current.length;
  const progress = Math.min(1, revenueTotal / goal);
  const best = current.reduce((a, b) => (b.revenue > a.revenue ? b : a), current[0]);
  const avg = revenueTotal / current.length;
  const lastWeek = current.slice(-7).reduce((a, d) => a + d.revenue, 0) / Math.min(7, current.length);

  const xLabels = [0, 0.25, 0.5, 0.75, 1].map((f) => current[Math.round(f * (current.length - 1))]?.label ?? "");

  return (
    <section className={cn("mx-auto w-full max-w-[1100px] space-y-4", className)}>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-semibold text-xl tracking-tight">{title}</h2>
          <p className="text-muted-foreground text-sm">
            {current[0]?.label} – {current[current.length - 1]?.label} vs previous {span} days
          </p>
        </div>
        <div aria-label="Range" className="inline-flex rounded-full border bg-muted p-1" role="radiogroup">
          {ranges.map((r) => {
            const active = r.value === range;
            return (
              <button
                aria-checked={active}
                className={cn(
                  "relative h-7 cursor-pointer rounded-full px-3.5 font-medium text-xs outline-none transition-colors duration-150 after:absolute after:-inset-y-1 after:inset-x-0 after:content-[''] focus-visible:ring-2 focus-visible:ring-ring",
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
                key={r.value}
                onClick={() => {
                  setRange(r.value);
                  setHover(null);
                }}
                role="radio"
                type="button"
              >
                {active && (
                  <motion.span
                    className="absolute inset-0 rounded-full bg-background shadow-xs/5 dark:bg-accent"
                    layoutId={`${uid}-range`}
                    transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 44 }}
                  />
                )}
                <span className="relative tabular-nums">{r.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        {metrics.map((m) => {
          const value = total(current, m.key, m.mode);
          const before = total(previous, m.key, m.mode);
          const change = before ? (value - before) / before : 0;
          const up = change >= 0;
          const shown = hovered ? hovered[m.key] : value;
          return (
            <article className="rounded-2xl border bg-card p-4 shadow-xs/5" key={m.key}>
              <div className="flex items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 text-muted-foreground text-sm">
                  <span className={cn("size-2 rounded-full bg-current", m.tone)} />
                  {m.label}
                </h3>
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium text-xs tabular-nums",
                    up ? "bg-success/10 text-success-foreground" : "bg-destructive/10 text-destructive-foreground",
                  )}
                >
                  {up ? <ArrowUpRightIcon className="size-3" /> : <ArrowDownRightIcon className="size-3" />}
                  {Math.abs(change * 100).toFixed(1)}%
                </span>
              </div>
              <div className="mt-2 font-semibold text-2xl tracking-tight">
                <Roll instant={hover !== null} text={fmt(m.key, shown)} />
              </div>
              <p className="mt-0.5 h-4 text-muted-foreground text-xs">
                {hovered
                  ? `${hovered.weekday}, ${hovered.label}`
                  : m.mode === "avg"
                    ? `Daily average, last ${span} days`
                    : `Total, last ${span} days`}
              </p>
              <div className="mt-3">
                <Sparkline hover={hover} tone={m.tone} values={current.map((d) => d[m.key])} />
              </div>
            </article>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-2xl border bg-card p-4 shadow-xs/5 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-medium text-sm">Revenue, this period vs last</h3>
            <div className="flex items-center gap-4 text-muted-foreground text-xs">
              <span className="flex items-center gap-1.5">
                <span className={cn("h-0.5 w-3.5 rounded-full bg-current", revenueTone)} />
                This period
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 border-muted-foreground/60 border-t-2 border-dashed" />
                Last period
              </span>
            </div>
          </div>

          <div className="relative mt-4 ps-10">
            <div className="pointer-events-none absolute inset-y-0 left-0 w-10">
              {gridValues.map((v) => (
                <span
                  className="absolute left-0 -translate-y-1/2 text-[0.6875rem] text-muted-foreground tabular-nums"
                  key={v}
                  style={{ top: `${(yOf(v) / H) * 100}%` }}
                >
                  {v >= 1000 ? `${(v / 1000).toFixed(1).replace(/\.0$/, "")}k` : Math.round(v)}
                </span>
              ))}
            </div>
            <div
              aria-label="Revenue chart. Use arrow keys to inspect days."
              className="relative h-56 cursor-crosshair touch-pan-y rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onBlur={() => setHover(null)}
              onKeyDown={onPlotKey}
              onPointerDown={pick}
              onPointerLeave={() => setHover(null)}
              onPointerMove={pick}
              ref={plotRef}
              role="img"
              tabIndex={0}
            >
              <svg aria-hidden className={cn("absolute inset-0 size-full overflow-visible", revenueTone)} preserveAspectRatio="none" viewBox={`0 0 ${W} ${H}`}>
                <defs>
                  <clipPath id={`${uid}-reveal`}>
                    <motion.rect
                      animate={{ width: W + 4 }}
                      height={H + 8}
                      initial={{ width: reduce ? W + 4 : 0 }}
                      transition={{ duration: reduce ? 0 : 0.7, ease: [0.23, 1, 0.32, 1] }}
                      x={-2}
                      y={-4}
                    />
                  </clipPath>
                  <linearGradient id={`${uid}-area`} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="currentColor" stopOpacity={0.16} />
                    <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
                  </linearGradient>
                </defs>
                {gridValues.map((v) => {
                  const y = yOf(v);
                  return (
                    <line
                      className="stroke-border"
                      key={v}
                      strokeDasharray="2 4"
                      vectorEffect="non-scaling-stroke"
                      x1={0}
                      x2={W}
                      y1={y}
                      y2={y}
                    />
                  );
                })}
                <motion.path
                  animate={{ opacity: 1 }}
                  className="stroke-muted-foreground/50"
                  d={prevLine}
                  fill="none"
                  initial={{ opacity: 0 }}
                  key={`prev-${span}`}
                  strokeDasharray="4 5"
                  strokeWidth="1.5"
                  transition={{ duration: reduce ? 0 : 0.2, ease: "easeOut" }}
                  vectorEffect="non-scaling-stroke"
                />
                <g clipPath={`url(#${uid}-reveal)`}>
                  <motion.g
                    animate={{ opacity: 1 }}
                    initial={{ opacity: 0 }}
                    key={`cur-${span}`}
                    transition={{ duration: reduce ? 0 : 0.2, ease: "easeOut" }}
                  >
                    <path d={`${curLine} L${W},${H} L0,${H} Z`} fill={`url(#${uid}-area)`} />
                    <path
                      d={curLine}
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeWidth="2.25"
                      vectorEffect="non-scaling-stroke"
                    />
                  </motion.g>
                </g>
              </svg>

              {hover !== null && hovered && (
                <>
                  <span
                    className="pointer-events-none absolute inset-y-0 w-px bg-foreground/16"
                    style={{ left: `${(curPts[hover][0] / W) * 100}%` }}
                  />
                  {hoveredPrev && (
                    <span
                      className="pointer-events-none absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card bg-muted-foreground"
                      style={{ left: `${(prevPts[hover][0] / W) * 100}%`, top: `${(prevPts[hover][1] / H) * 100}%` }}
                    />
                  )}
                  <span
                    className={cn("pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2", revenueTone)}
                    style={{ left: `${(curPts[hover][0] / W) * 100}%`, top: `${(curPts[hover][1] / H) * 100}%` }}
                  >
                    <motion.span
                      animate={{ scale: 1, opacity: 1 }}
                      className="block size-full rounded-full border-2 border-card bg-current"
                      initial={{ scale: reduce ? 1 : 0.6, opacity: 0 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                    />
                  </span>
                  <div
                    className={cn(
                      "pointer-events-none absolute top-2 z-10 w-44 rounded-xl border bg-popover p-3 text-xs shadow-xs/5",
                      hover > current.length / 2 ? "-translate-x-[calc(100%+12px)]" : "translate-x-3",
                    )}
                    style={{ left: `${(curPts[hover][0] / W) * 100}%` }}
                  >
                    <p className="font-medium">
                      {hovered.weekday}, {hovered.label}
                    </p>
                    <dl className="mt-2 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <dt className="flex items-center gap-1.5 text-muted-foreground">
                          <span className={cn("size-1.5 rounded-full bg-current", revenueTone)} />
                          This period
                        </dt>
                        <dd className="font-medium tabular-nums">{money(hovered.revenue)}</dd>
                      </div>
                      {hoveredPrev && (
                        <div className="flex items-center justify-between gap-2">
                          <dt className="flex items-center gap-1.5 text-muted-foreground">
                            <span className="size-1.5 rounded-full bg-muted-foreground" />
                            {hoveredPrev.label}
                          </dt>
                          <dd className="tabular-nums">{money(hoveredPrev.revenue)}</dd>
                        </div>
                      )}
                      <div className="flex items-center justify-between gap-2 border-t pt-1">
                        <dt className="text-muted-foreground">Orders</dt>
                        <dd className="tabular-nums">{plain(hovered.orders)}</dd>
                      </div>
                    </dl>
                  </div>
                </>
              )}
            </div>
            <div className="mt-2 flex justify-between text-[0.6875rem] text-muted-foreground tabular-nums">
              {xLabels.map((label, i) => (
                <span key={`${label}-${i}`}>{label}</span>
              ))}
            </div>
          </div>
        </article>

        <article className="flex flex-col rounded-2xl border bg-card p-4 shadow-xs/5">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-blue-500/12 text-blue-600 dark:text-blue-400">
              <TargetIcon className="size-4" />
            </span>
            <h3 className="font-medium text-sm">Focus: revenue goal</h3>
          </div>
          <div className="mt-4 flex items-center gap-5">
            <div className="relative size-28 shrink-0">
              <svg aria-hidden className={cn("size-full -rotate-90", revenueTone)} viewBox="0 0 100 100">
                <circle className="stroke-muted" cx="50" cy="50" fill="none" r="42" strokeWidth="10" />
                <motion.circle
                  animate={{ pathLength: progress }}
                  cx="50"
                  cy="50"
                  fill="none"
                  initial={false}
                  r="42"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="10"
                  transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 120, damping: 22 }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-semibold text-xl tracking-tight">
                  <Roll text={`${Math.round(progress * 100)}%`} />
                </span>
                <span className="text-[0.6875rem] text-muted-foreground">of goal</span>
              </div>
            </div>
            <div className="min-w-0 text-sm">
              <p className="text-muted-foreground text-xs">Earned</p>
              <p className="font-semibold">
                <Roll text={money(revenueTotal)} />
              </p>
              <p className="mt-2 text-muted-foreground text-xs">Goal</p>
              <p className="font-medium text-muted-foreground">
                <Roll text={money(goal)} />
              </p>
            </div>
          </div>
          <dl className="mt-auto space-y-2 border-t pt-4 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Best day</dt>
              <dd className="font-medium tabular-nums">
                {best?.label} · <Roll text={money(best?.revenue ?? 0)} />
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Average per day</dt>
              <dd className="font-medium">
                <Roll text={money(avg)} />
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Last 7 days pace</dt>
              <dd
                className={cn(
                  "font-medium",
                  lastWeek >= dailyGoal ? "text-success-foreground" : "text-warning-foreground",
                )}
              >
                <Roll text={money(lastWeek)} />
                <span className="text-muted-foreground text-xs"> /day</span>
              </dd>
            </div>
          </dl>
        </article>
      </div>
    </section>
  );
}
