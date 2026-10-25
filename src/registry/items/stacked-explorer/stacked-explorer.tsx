"use client";

import {
  AnimatePresence,
  animate,
  type MotionValue,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface ExplorerMeasure {
  id: string;
  label: string;
  format?: Intl.NumberFormatOptions;
}

export interface ExplorerSlice {
  id: string;
  label: string;
  series: string[];
}

export interface ExplorerData {
  periods: string[];
  measures: ExplorerMeasure[];
  slices: ExplorerSlice[];
  values: Record<string, Record<string, number[][]>>;
}

export interface StackedExplorerProps {
  title?: string;
  data?: ExplorerData;
  defaultMeasure?: string;
  defaultSlice?: string;
  locale?: string;
  className?: string;
}

const COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];
const HEIGHT = 176;
const AXIS = 36;
const PAD_TOP = 8;
const PAD_BOTTOM = 20;
const GAP = 2;
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
  let placeFromRight = 0;
  let other = 0;
  const glyphs = [...text]
    .reverse()
    .map((char) => {
      const isDigit = char >= "0" && char <= "9";
      return { char, isDigit, key: isDigit ? `d${placeFromRight++}` : `s${other++}${char}` };
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

function mulberry(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildDefaultData(): ExplorerData {
  const rand = mulberry(7);
  const periods = ["Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"];
  const measures: ExplorerMeasure[] = [
    { id: "revenue", label: "Revenue", format: { style: "currency", currency: "USD", notation: "compact", minimumFractionDigits: 0, maximumFractionDigits: 1 } },
    { id: "orders", label: "Orders", format: { maximumFractionDigits: 0 } },
    { id: "customers", label: "Customers", format: { maximumFractionDigits: 0 } },
  ];
  const slices: ExplorerSlice[] = [
    { id: "region", label: "Region", series: ["Americas", "Europe", "Asia Pacific", "Africa"] },
    { id: "plan", label: "Plan", series: ["Starter", "Pro", "Team", "Enterprise"] },
    { id: "channel", label: "Channel", series: ["Direct", "Partners", "Marketplace"] },
  ];
  const bases: Record<string, number> = { revenue: 182000, orders: 2400, customers: 860 };
  const values: ExplorerData["values"] = {};
  for (const m of measures) {
    const totals = periods.map((_, i) => bases[m.id] * (1 + i * 0.045) * (0.88 + rand() * 0.24));
    values[m.id] = {};
    for (const s of slices) {
      const weights = s.series.map((_, k) => (s.series.length - k) * (0.7 + rand() * 0.6));
      values[m.id][s.id] = s.series.map((_, k) =>
        periods.map((_, i) => {
          const drift = weights.map((w, j) => w * (1 + Math.sin(i / 2.4 + j * 1.7) * 0.22));
          const sum = drift.reduce((a, b) => a + b, 0);
          return Math.round((totals[i] * drift[k]) / sum);
        }),
      );
    }
  }
  return { periods, measures, slices, values };
}

const defaultData = buildDefaultData();

// Formatted by hand so server and browser ICU data always agree.
function compact(v: number) {
  const units: [number, string][] = [
    [1e9, "B"],
    [1e6, "M"],
    [1e3, "K"],
  ];
  for (const [size, suffix] of units) {
    if (Math.abs(v) >= size) return `${Number((v / size).toFixed(1))}${suffix}`;
  }
  return String(Math.round(v));
}

function niceStep(raw: number) {
  const pow = 10 ** Math.floor(Math.log10(raw));
  const unit = raw / pow;
  return (unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 2.5 ? 2.5 : unit <= 5 ? 5 : 10) * pow;
}

export function StackedExplorer({
  title = "Breakdown",
  data = defaultData,
  defaultMeasure,
  defaultSlice,
  locale = "en-US",
  className,
}: StackedExplorerProps) {
  const reduce = useReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(460);
  const [measureId, setMeasureId] = useState(defaultMeasure ?? data.measures[0].id);
  const [sliceId, setSliceId] = useState(defaultSlice ?? data.slices[0].id);
  const [column, setColumn] = useState<number | null>(null);
  const [seriesHover, setSeriesHover] = useState<number | null>(null);
  const [scrubbing, setScrubbing] = useState(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(240, entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const measure = data.measures.find((m) => m.id === measureId) ?? data.measures[0];
  const slice = data.slices.find((s) => s.id === sliceId) ?? data.slices[0];
  const rows = data.values[measure.id]?.[slice.id] ?? [];
  const periods = data.periods;
  const fmt = useMemo(() => new Intl.NumberFormat(locale, measure.format), [locale, measure.format]);
  const axisPrefix = measure.format?.style === "currency" ? (fmt.formatToParts(0).find((p) => p.type === "currency")?.value ?? "") : "";
  const axisLabel = (v: number) => `${axisPrefix}${compact(v)}`;

  const stackTotals = periods.map((_, p) => rows.reduce((sum, r) => sum + (r[p] ?? 0), 0));
  const rawMax = Math.max(1, ...stackTotals);
  const step = niceStep(rawMax / 3);
  const max = Math.ceil(rawMax / step) * step;
  const plotW = width - AXIS;
  const plotH = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const slot = plotW / periods.length;
  const barW = Math.min(28, slot * 0.62);
  const labelEvery = slot < 34 ? 2 : 1;
  const scale = (v: number) => (v / max) * plotH;
  const baseY = PAD_TOP + plotH;
  const grid = Array.from({ length: Math.round(max / step) + 1 }, (_, i) => i * step);
  const spring = reduce ? { duration: 0 } : { type: "spring" as const, stiffness: 220, damping: 30 };

  const seriesTotals = rows.map((r) => r.reduce((a, b) => a + b, 0));
  const grand = seriesTotals.reduce((a, b) => a + b, 0);
  const shown = column === null ? seriesTotals : rows.map((r) => r[column] ?? 0);
  const shownTotal = shown.reduce((a, b) => a + b, 0);

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const n = periods.length;
    setScrubbing(true);
    if (e.key === "ArrowRight") setColumn((c) => Math.min(n - 1, (c ?? -1) + 1));
    else if (e.key === "ArrowLeft") setColumn((c) => Math.max(0, (c ?? n) - 1));
    else if (e.key === "Escape") setColumn(null);
    else return;
    e.preventDefault();
  }

  const tipX = column === null ? 0 : AXIS + slot * column + slot / 2;
  const flip = tipX > width * 0.55;

  return (
    <div className={cn("w-full max-w-[540px] rounded-2xl border bg-card p-5 text-card-foreground shadow-xs/5", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <span className="text-muted-foreground text-sm">
            {title} · {measure.label} by {slice.label.toLowerCase()}
          </span>
          <Roll className="font-semibold text-3xl tracking-tight" instant={scrubbing} text={fmt.format(column === null ? grand : shownTotal)} />
          <span className="text-muted-foreground text-xs">
            {column === null ? `${periods[0]} – ${periods[periods.length - 1]}` : periods[column]}
          </span>
        </div>
        <div className="flex gap-2">
          <Select
            items={data.measures.map((m) => ({ value: m.id, label: m.label }))}
            onValueChange={(v) => {
              if (!v) return;
              setScrubbing(false);
              setMeasureId(String(v));
            }}
            value={measure.id}
          >
            <SelectTrigger aria-label="Measure" className="w-auto min-w-28" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectPopup>
              {data.measures.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
          <Select
            items={data.slices.map((s) => ({ value: s.id, label: `By ${s.label.toLowerCase()}` }))}
            onValueChange={(v) => {
              if (!v) return;
              setScrubbing(false);
              setSliceId(String(v));
              setSeriesHover(null);
            }}
            value={slice.id}
          >
            <SelectTrigger aria-label="Slice" className="w-auto min-w-32" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectPopup>
              {data.slices.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  By {s.label.toLowerCase()}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
        </div>
      </div>

      <div
        aria-label={`${measure.label} by ${slice.label}, stacked by month. Use the arrow keys to inspect a month.`}
        className="relative mt-4 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onBlur={() => setColumn(null)}
        onKeyDown={onKeyDown}
        onPointerLeave={() => {
          setColumn(null);
          setSeriesHover(null);
        }}
        ref={wrapRef}
        role="application"
        tabIndex={0}
      >
        <svg aria-hidden className="block overflow-visible" height={HEIGHT} width={width}>
          {grid.map((v) => (
            <motion.g animate={{ y: baseY - scale(v), opacity: 1 }} initial={{ y: baseY - scale(v), opacity: 0 }} key={v} transition={spring}>
              <line className="stroke-border" strokeDasharray={v === 0 ? undefined : "2 4"} x1={AXIS} x2={width} y1={0} y2={0} />
              <text className="fill-muted-foreground text-[10px] tabular-nums" dominantBaseline="middle" x={0} y={0}>
                {axisLabel(v)}
              </text>
            </motion.g>
          ))}

          {periods.map((label, p) => {
            const x = AXIS + slot * p + (slot - barW) / 2;
            let acc = 0;
            const dim = column !== null && column !== p;
            return (
              <g key={label}>
                <motion.g animate={{ opacity: dim ? 0.35 : 1 }} transition={{ duration: reduce ? 0 : 0.18 }}>
                  <AnimatePresence initial={false}>
                    {rows.map((r, s) => {
                      const h = scale(r[p] ?? 0);
                      const y = baseY - acc - h;
                      acc += h;
                      const segH = Math.max(0, h - GAP);
                      const faded = seriesHover !== null && seriesHover !== s;
                      return (
                        <motion.rect
                          animate={{ y, height: segH, opacity: faded ? 0.22 : 1 }}
                          exit={{ height: 0, opacity: 0, transition: { duration: reduce ? 0 : 0.18, ease: "easeOut" } }}
                          fill={COLORS[s % COLORS.length]}
                          height={segH}
                          initial={{ y: baseY, height: 0 }}
                          key={s}
                          rx={3}
                          transition={{ ...spring, delay: reduce ? 0 : p * 0.012 + s * 0.02 }}
                          width={barW}
                          x={x}
                          y={0}
                        />
                      );
                    })}
                  </AnimatePresence>
                </motion.g>
                <text
                  className={cn(
                    "fill-muted-foreground text-[10px] transition-colors",
                    column === p && "fill-foreground",
                    p % labelEvery !== 0 && column !== p && "opacity-0",
                  )}
                  textAnchor="middle"
                  x={AXIS + slot * p + slot / 2}
                  y={HEIGHT - 4}
                >
                  {label}
                </text>
                <rect
                  fill="transparent"
                  height={plotH + PAD_TOP}
                  onPointerEnter={() => {
                    setScrubbing(true);
                    setColumn(p);
                  }}
                  onPointerLeave={() => setSeriesHover(null)}
                  onPointerMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const fromBottom = rect.bottom - e.clientY;
                    let sum = 0;
                    let hit: number | null = null;
                    rows.forEach((r, s) => {
                      const h = scale(r[p] ?? 0);
                      if (hit === null && fromBottom >= sum && fromBottom < sum + h) hit = s;
                      sum += h;
                    });
                    setSeriesHover(hit);
                  }}
                  width={slot}
                  x={AXIS + slot * p}
                  y={0}
                />
              </g>
            );
          })}
        </svg>

        <AnimatePresence>
          {column !== null && (
            <motion.div
              animate={{ opacity: 1, scale: 1, x: flip ? tipX - barW / 2 - 10 : tipX + barW / 2 + 10 }}
              className={cn(
                "pointer-events-none absolute top-0 left-0 z-10 min-w-40 rounded-xl border bg-popover p-2.5 text-popover-foreground text-xs shadow-md/5 transition-[translate] duration-200 ease-out",
                flip && "-translate-x-full",
              )}
              exit={{ opacity: 0, scale: 0.96, transition: { duration: reduce ? 0 : 0.1 } }}
              initial={{ opacity: 0, scale: 0.96, x: flip ? tipX - barW / 2 - 10 : tipX + barW / 2 + 10 }}
              style={{ originX: flip ? 1 : 0, originY: 0 }}
              transition={spring}
            >
              <div className="mb-1.5 flex items-center justify-between gap-3 font-medium">
                <span>{periods[column]}</span>
                <span className="tabular-nums">{fmt.format(stackTotals[column])}</span>
              </div>
              <div className="flex flex-col gap-1">
                {[...rows.keys()].reverse().map((s) => (
                  <div
                    className={cn(
                      "flex items-center gap-2 transition-opacity",
                      seriesHover !== null && seriesHover !== s && "opacity-40",
                    )}
                    key={s}
                  >
                    <span className="size-2 rounded-[3px]" style={{ background: COLORS[s % COLORS.length] }} />
                    <span className="text-muted-foreground">{slice.series[s]}</span>
                    <span className="ms-auto font-medium tabular-nums">{fmt.format(rows[s][column] ?? 0)}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <table className="mt-4 w-full text-sm">
        <caption className="sr-only">
          {measure.label} by {slice.label}
          {column === null ? "" : `, ${periods[column]}`}
        </caption>
        <thead>
          <tr className="border-b text-muted-foreground text-xs">
            <th className="h-8 px-2 text-left font-medium" scope="col">
              {slice.label}
            </th>
            <th className="h-8 px-2 text-right font-medium" scope="col">
              {column === null ? "Total" : periods[column]}
            </th>
            <th className="h-8 w-28 px-2 text-right font-medium sm:w-32" scope="col">
              Share
            </th>
          </tr>
        </thead>
        <tbody>
          <AnimatePresence initial={false}>
            {[...rows.keys()].reverse().map((s) => {
              const share = shownTotal ? shown[s] / shownTotal : 0;
              const lit = seriesHover === s;
              const faded = seriesHover !== null && !lit;
              return (
                <motion.tr
                  animate={{ opacity: faded ? 0.45 : 1 }}
                  className={cn(
                    "relative border-b outline-none transition-colors last:border-0 focus-visible:bg-accent focus-visible:outline-2 focus-visible:outline-ring focus-visible:-outline-offset-2",
                    lit && "bg-accent",
                  )}
                  exit={{ opacity: 0 }}
                  initial={{ opacity: 0 }}
                  key={s}
                  onBlur={() => setSeriesHover(null)}
                  onFocus={() => setSeriesHover(s)}
                  onPointerEnter={() => setSeriesHover(s)}
                  onPointerLeave={() => setSeriesHover(null)}
                  tabIndex={0}
                  transition={{ duration: reduce ? 0 : 0.18 }}
                >
                  <td className="h-9 px-2">
                    <span className="flex items-center gap-2">
                      <motion.span
                        animate={{ scale: lit ? 1.35 : 1 }}
                        className="size-2.5 rounded-[3px]"
                        style={{ background: COLORS[s % COLORS.length] }}
                        transition={reduce ? { duration: 0 } : { type: "spring", duration: 0.25, bounce: 0 }}
                      />
                      <span className={cn("whitespace-nowrap", lit && "font-medium")}>{slice.series[s]}</span>
                    </span>
                  </td>
                  <td className="h-9 px-2 text-right">
                    <Roll className="justify-end" instant={scrubbing} text={fmt.format(shown[s] ?? 0)} />
                  </td>
                  <td className="h-9 px-2">
                    <span className="flex items-center justify-end gap-2">
                      <span className="h-1.5 w-10 overflow-hidden rounded-full bg-muted sm:w-16">
                        <motion.span
                          animate={{ clipPath: `inset(0px ${(100 - share * 100).toFixed(2)}% 0px 0px round 999px)` }}
                          className="block size-full"
                          initial={false}
                          style={{ background: COLORS[s % COLORS.length] }}
                          transition={scrubbing ? { duration: reduce ? 0 : 0.12, ease: "easeOut" } : spring}
                        />
                      </span>
                      <span className="w-11 text-right text-muted-foreground text-xs tabular-nums">{(share * 100).toFixed(1)}%</span>
                    </span>
                  </td>
                </motion.tr>
              );
            })}
          </AnimatePresence>
        </tbody>
      </table>
    </div>
  );
}
