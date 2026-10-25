"use client";

import { ArrowDownRightIcon, ArrowUpRightIcon } from "lucide-react";
import {
  AnimatePresence,
  animate,
  type MotionValue,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { type KeyboardEvent, type PointerEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import { Tabs, TabsList, TabsTab } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export interface MetricSeries {
  name: string;
  color?: string;
}

export interface MetricPoint {
  label: string;
  values: number[];
}

export interface MetricRange {
  id: string;
  label: string;
  caption?: string;
  points: MetricPoint[];
}

export interface MetricCardProps {
  title?: string;
  series?: MetricSeries[];
  ranges?: MetricRange[];
  defaultRange?: string;
  format?: Intl.NumberFormatOptions;
  locale?: string;
  className?: string;
}

const CHART_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];
const HEIGHT = 168;
const PAD_TOP = 10;
const PAD_BOTTOM = 22;
const AXIS = 34;
const SAMPLES = 180;

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
  // Key places from the right so existing digits keep their wheel when the number grows.
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

function sampleCurve(values: number[], count: number) {
  const n = values.length;
  if (n === 1) return Array.from({ length: count }, () => values[0]);
  const at = (i: number) => values[Math.max(0, Math.min(n - 1, i))];
  return Array.from({ length: count }, (_, k) => {
    const u = (k / (count - 1)) * (n - 1);
    const i = Math.min(n - 2, Math.floor(u));
    const s = u - i;
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    return (
      0.5 *
      (2 * p1 +
        (-p0 + p2) * s +
        (2 * p0 - 5 * p1 + 4 * p2 - p3) * s * s +
        (-p0 + 3 * p1 - 3 * p2 + p3) * s * s * s)
    );
  });
}

function mulberry(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeRange(id: string, label: string, caption: string, count: number, stepDays: number, seed: number) {
  const rand = mulberry(seed);
  const end = Date.UTC(2026, 9, 23);
  const bases = [3200, 1900, 900];
  return {
    id,
    label,
    caption,
    points: Array.from({ length: count }, (_, i) => {
      const date = new Date(end - (count - 1 - i) * stepDays * 86400000);
      const trend = 1 + (i / count) * 0.35;
      return {
        label: date.toLocaleDateString("en-US", {
          month: "short",
          day: stepDays >= 28 ? undefined : "numeric",
          timeZone: "UTC",
        }),
        values: bases.map((b, s) =>
          Math.round(b * trend * (0.86 + rand() * 0.28) * (1 + 0.12 * Math.sin(i / (1.6 + s)))),
        ),
      };
    }),
  };
}

const defaultSeries: MetricSeries[] = [{ name: "Organic" }, { name: "Paid" }, { name: "Referral" }];
const defaultRanges: MetricRange[] = [
  makeRange("7d", "7D", "Last 7 days", 7, 1, 11),
  makeRange("30d", "30D", "Last 30 days", 30, 1, 23),
  makeRange("90d", "90D", "Last 90 days", 13, 7, 37),
  makeRange("12m", "12M", "Last 12 months", 12, 30.4, 51),
];

export function MetricCard({
  title = "Active users",
  series = defaultSeries,
  ranges = defaultRanges,
  defaultRange,
  format = { maximumFractionDigits: 0 },
  locale = "en-US",
  className,
}: MetricCardProps) {
  const reduce = useReducedMotion();
  const uid = useId().replace(/:/g, "");
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(420);
  const [rangeId, setRangeId] = useState(defaultRange ?? ranges[1]?.id ?? ranges[0].id);
  const [hidden, setHidden] = useState<Set<number>>(() => new Set());
  const [active, setActive] = useState<number | null>(null);
  const [announce, setAnnounce] = useState("");
  const [scrubbing, setScrubbing] = useState(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(200, entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const range = ranges.find((r) => r.id === rangeId) ?? ranges[0];
  const points = range.points;
  const n = points.length;
  const fmt = useMemo(() => new Intl.NumberFormat(locale, format), [locale, format]);
  const axisFmt = useMemo(
    () => new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }),
    [locale],
  );

  const visible = series.map((_, i) => !hidden.has(i));
  const plotW = width - AXIS;
  const plotH = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const rawMax = Math.max(1, ...points.flatMap((p) => p.values.filter((_, i) => visible[i])));
  const step = niceStep(rawMax / 3);
  const max = Math.ceil((rawMax * 1.08) / step) * step;
  const xAt = (i: number) => AXIS + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const yAt = (v: number) => PAD_TOP + plotH - (Math.max(0, Math.min(max, v)) / max) * plotH;

  const paths = series.map((_, s) => {
    const ys = sampleCurve(
      points.map((p) => p.values[s] ?? 0),
      SAMPLES,
    );
    const line = ys
      .map((v, k) => `${k ? "L" : "M"}${(AXIS + (k / (SAMPLES - 1)) * plotW).toFixed(2)} ${yAt(v).toFixed(2)}`)
      .join(" ");
    return { line, area: `${line} L${(AXIS + plotW).toFixed(2)} ${PAD_TOP + plotH} L${AXIS} ${PAD_TOP + plotH} Z` };
  });

  const focusIndex = active ?? n - 1;
  const total = (i: number) => points[i].values.reduce((sum, v, s) => sum + (visible[s] ? v : 0), 0);
  const headline = total(focusIndex);
  const first = total(0);
  const delta = first ? (headline - first) / first : 0;
  const up = delta >= 0;
  const gridValues = Array.from({ length: Math.round(max / step) + 1 }, (_, i) => i * step);
  const xLabels = n > 2 ? [0, Math.floor((n - 1) / 2), n - 1] : points.map((_, i) => i);
  const spring = reduce ? { duration: 0 } : { type: "spring" as const, stiffness: 260, damping: 30 };

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - AXIS;
    setScrubbing(true);
    setActive(Math.max(0, Math.min(n - 1, Math.round((x / plotW) * (n - 1)))));
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    let next: number | null = null;
    if (e.key === "ArrowRight") next = Math.min(n - 1, (active ?? -1) + 1);
    else if (e.key === "ArrowLeft") next = Math.max(0, (active ?? n) - 1);
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = n - 1;
    else if (e.key === "Escape") {
      setActive(null);
      return;
    } else return;
    e.preventDefault();
    setScrubbing(true);
    setActive(next);
    const p = points[next];
    setAnnounce(
      `${p.label}: ${series
        .map((s, i) => (visible[i] ? `${s.name} ${fmt.format(p.values[i] ?? 0)}` : null))
        .filter(Boolean)
        .join(", ")}`,
    );
  }

  const tipLeft = active === null ? 0 : xAt(active);
  const flip = tipLeft > width * 0.58;

  return (
    <div className={cn("w-full max-w-[480px] rounded-2xl border bg-card p-5 text-card-foreground shadow-xs/5", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="text-muted-foreground text-sm">{title}</span>
          <Roll className="font-semibold text-3xl tracking-tight" instant={scrubbing} text={fmt.format(headline)} />
          <div className="flex items-center gap-2 text-xs">
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium tabular-nums",
                up ? "bg-success/10 text-success-foreground" : "bg-destructive/10 text-destructive-foreground",
              )}
            >
              {up ? <ArrowUpRightIcon className="size-3" /> : <ArrowDownRightIcon className="size-3" />}
              <Roll instant={scrubbing} text={`${(Math.abs(delta) * 100).toFixed(1)}%`} />
            </span>
            <AnimatePresence initial={false} mode="popLayout">
              <motion.span
                animate={{ opacity: 1, y: 0 }}
                className="text-muted-foreground"
                exit={{ opacity: 0, y: -4 }}
                initial={{ opacity: 0, y: 4 }}
                key={range.id}
                transition={{ duration: reduce || scrubbing ? 0 : 0.15, ease: "easeOut" }}
              >
                {active === null ? (range.caption ?? range.label) : `${points[active].label} vs ${points[0].label}`}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>
        <Tabs
          onValueChange={(v) => {
            setScrubbing(false);
            setRangeId(String(v));
            setActive(null);
          }}
          value={rangeId}
        >
          <TabsList aria-label="Range">
            {ranges.map((r) => (
              <TabsTab className="px-2 text-xs tabular-nums sm:text-xs" key={r.id} value={r.id}>
                {r.label}
              </TabsTab>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div
        aria-label={`${title} chart. Use the arrow keys to inspect points.`}
        className="relative mt-4 cursor-crosshair touch-pan-y rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onBlur={() => {
          setActive(null);
          setScrubbing(false);
        }}
        onKeyDown={onKeyDown}
        onPointerLeave={() => {
          setActive(null);
        }}
        onPointerMove={onPointerMove}
        ref={wrapRef}
        role="application"
        tabIndex={0}
      >
        <svg aria-hidden className="block overflow-visible" height={HEIGHT} width={width}>
          <defs>
            {series.map((s, i) => (
              <linearGradient id={`${uid}-fill-${i}`} key={s.name} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" style={{ stopColor: s.color ?? CHART_COLORS[i % 5], stopOpacity: 0.22 }} />
                <stop offset="100%" style={{ stopColor: s.color ?? CHART_COLORS[i % 5], stopOpacity: 0 }} />
              </linearGradient>
            ))}
          </defs>

          {gridValues.map((v) => (
            <motion.g animate={{ y: yAt(v), opacity: 1 }} initial={{ y: yAt(v), opacity: 0 }} key={v} transition={spring}>
              <line className="stroke-border" strokeDasharray={v === 0 ? undefined : "2 4"} x1={AXIS} x2={width} y1={0} y2={0} />
              <text className="fill-muted-foreground text-[10px] tabular-nums" dominantBaseline="middle" x={0} y={0}>
                {axisFmt.format(v)}
              </text>
            </motion.g>
          ))}

          {xLabels.map((i, k) => (
            <text
              className="fill-muted-foreground text-[10px]"
              key={`${range.id}-${i}`}
              textAnchor={k === 0 ? "start" : k === xLabels.length - 1 ? "end" : "middle"}
              x={xAt(i)}
              y={HEIGHT - 4}
            >
              {points[i].label}
            </text>
          ))}

          {series.map((s, i) => (
            <motion.path
              animate={{ d: paths[i].area, opacity: visible[i] && i === 0 ? 1 : 0 }}
              d={paths[i].area}
              fill={`url(#${uid}-fill-${i})`}
              initial={false}
              key={`area-${s.name}`}
              transition={spring}
            />
          ))}
          {series.map((s, i) => (
            <motion.path
              animate={{ d: paths[i].line, opacity: visible[i] ? 1 : 0, pathLength: 1 }}
              d={paths[i].line}
              fill="none"
              initial={{ pathLength: 0 }}
              key={`line-${s.name}`}
              stroke={s.color ?? CHART_COLORS[i % 5]}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={i === 0 ? 2 : 1.5}
              transition={{ ...spring, pathLength: reduce ? { duration: 0 } : { duration: 0.6, ease: [0.23, 1, 0.32, 1] } }}
            />
          ))}

          <AnimatePresence>
            {active !== null && (
              <motion.g
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                initial={{ opacity: 0 }}
                transition={{ duration: reduce ? 0 : 0.12 }}
              >
                <motion.line
                  animate={{ x1: xAt(active), x2: xAt(active) }}
                  className="stroke-foreground/25"
                  initial={false}
                  strokeDasharray="3 3"
                  transition={spring}
                  x1={xAt(active)}
                  x2={xAt(active)}
                  y1={PAD_TOP - 4}
                  y2={PAD_TOP + plotH}
                />
                {series.map((s, i) =>
                  visible[i] ? (
                    <motion.circle
                      animate={{ cx: xAt(active), cy: yAt(points[active].values[i] ?? 0) }}
                      className="stroke-card"
                      cx={xAt(active)}
                      cy={yAt(points[active].values[i] ?? 0)}
                      fill={s.color ?? CHART_COLORS[i % 5]}
                      initial={false}
                      key={s.name}
                      r={4}
                      strokeWidth={2}
                      transition={spring}
                    />
                  ) : null,
                )}
              </motion.g>
            )}
          </AnimatePresence>
        </svg>

        <AnimatePresence>
          {active !== null && (
            <motion.div
              animate={{ opacity: 1, scale: 1, x: flip ? tipLeft - 12 : tipLeft + 12 }}
              className={cn(
                "pointer-events-none absolute top-0 left-0 z-10 min-w-36 rounded-xl border bg-popover p-2.5 text-popover-foreground text-xs shadow-md/5 transition-[translate] duration-200 ease-out",
                flip && "-translate-x-full",
              )}
              exit={{ opacity: 0, scale: 0.96, transition: { duration: reduce ? 0 : 0.1 } }}
              initial={{ opacity: 0, scale: 0.96, x: flip ? tipLeft - 12 : tipLeft + 12 }}
              style={{ originX: flip ? 1 : 0, originY: 0 }}
              transition={spring}
            >
              <div className="mb-1.5 font-medium">{points[active].label}</div>
              <div className="flex flex-col gap-1">
                {series.map((s, i) =>
                  visible[i] ? (
                    <div className="flex items-center gap-2" key={s.name}>
                      <span className="size-2 rounded-full" style={{ background: s.color ?? CHART_COLORS[i % 5] }} />
                      <span className="text-muted-foreground">{s.name}</span>
                      <span className="ms-auto font-medium tabular-nums">{fmt.format(points[active].values[i] ?? 0)}</span>
                    </div>
                  ) : null,
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <span aria-live="polite" className="sr-only">
          {announce}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {series.map((s, i) => (
          <button
            aria-pressed={visible[i]}
            className={cn(
              "relative inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-full border px-2.5 text-xs outline-none transition-[opacity,background-color,transform] duration-150 ease-out after:absolute after:-inset-y-0.5 after:inset-x-0 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring motion-safe:active:scale-[0.97]",
              !visible[i] && "opacity-50",
            )}
            key={s.name}
            onClick={() => {
              setScrubbing(false);
              setHidden((prev) => {
                const next = new Set(prev);
                if (next.has(i)) next.delete(i);
                else if (next.size < series.length - 1) next.add(i);
                return next;
              });
            }}
            type="button"
          >
            <motion.span
              animate={{ scale: visible[i] ? 1 : 0.5 }}
              className="size-2 rounded-full"
              style={{ background: s.color ?? CHART_COLORS[i % 5] }}
              transition={reduce ? { duration: 0 } : { type: "spring", duration: 0.25, bounce: 0 }}
            />
            {s.name}
          </button>
        ))}
      </div>
    </div>
  );
}

function niceStep(raw: number) {
  const pow = 10 ** Math.floor(Math.log10(raw));
  const unit = raw / pow;
  return (unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 2.5 ? 2.5 : unit <= 5 ? 5 : 10) * pow;
}
