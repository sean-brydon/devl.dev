"use client";

import { XIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type KeyboardEvent, type PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { Tabs, TabsList, TabsTab } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export interface LatencyHistogramProps {
  title?: string;
  caption?: string;
  bins?: number[];
  binSize?: number;
  percentiles?: number[];
  defaultRange?: [number, number] | null;
  onRangeChange?: (range: [number, number] | null) => void;
  defaultScale?: HistogramScale;
  locale?: string;
  className?: string;
}

export type HistogramScale = "linear" | "log";

const H = 168;
const TOP = 30;
const BOTTOM = 22;
const MARKER = [
  { line: "stroke-muted-foreground", chip: "bg-muted text-foreground", dot: "bg-muted-foreground" },
  { line: "stroke-warning", chip: "bg-warning/12 text-warning-foreground dark:bg-warning/16", dot: "bg-warning" },
  { line: "stroke-destructive", chip: "bg-destructive/10 text-destructive-foreground dark:bg-destructive/16", dot: "bg-destructive" },
];

function mulberry(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sampleBins(count = 50, size = 30) {
  const rand = mulberry(9);
  const logn = (x: number, mu: number, sigma: number) =>
    Math.exp(-((Math.log(x) - mu) ** 2) / (2 * sigma * sigma)) / (x * sigma * Math.sqrt(2 * Math.PI));
  return Array.from({ length: count }, (_, i) => {
    const x = (i + 0.5) * size;
    const density = 0.9 * logn(x, Math.log(190), 0.42) + 0.1 * logn(x, Math.log(880), 0.18);
    return Math.round(48000 * density * size * (0.9 + rand() * 0.2));
  });
}

const defaultBins = sampleBins();

export function LatencyHistogram({
  title = "Request latency",
  caption = "POST /v1/checkout · last hour",
  bins = defaultBins,
  binSize = 30,
  percentiles = [0.5, 0.95, 0.99],
  defaultRange = null,
  onRangeChange,
  defaultScale = "linear",
  locale = "en-US",
  className,
}: LatencyHistogramProps) {
  const reduce = useReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(440);
  const [hover, setHover] = useState<number | null>(null);
  const [range, setRange] = useState<[number, number] | null>(() =>
    defaultRange ? [Math.floor(defaultRange[0] / binSize), Math.ceil(defaultRange[1] / binSize) - 1] : null,
  );
  const drag = useRef<{ mode: "new" | "lo" | "hi" | "move"; anchor: number; origin: [number, number] } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [scale, setScale] = useState<HistogramScale>(defaultScale);
  const num = useMemo(() => new Intl.NumberFormat(locale), [locale]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(240, entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const n = bins.length;
  const total = bins.reduce((a, b) => a + b, 0);
  const peak = Math.max(...bins, 1);
  const pitch = width / n;
  const barW = Math.max(1, pitch - 2);
  const plotH = H - TOP - BOTTOM;
  const xOf = (ms: number) => (ms / (n * binSize)) * width;
  const ms = (v: number) => (v >= 1000 ? `${Number((v / 1000).toFixed(2))}s` : `${Math.round(v)}ms`);

  const marks = useMemo(() => {
    let acc = 0;
    const cum = bins.map((b) => (acc += b));
    return percentiles.map((p) => {
      const goal = p * total;
      const i = cum.findIndex((c) => c >= goal);
      const before = i > 0 ? cum[i - 1] : 0;
      const within = bins[i] ? (goal - before) / bins[i] : 0;
      return { p, value: (i + within) * binSize };
    });
  }, [bins, percentiles, total, binSize]);

  const sel = range ? [Math.min(range[0], range[1]), Math.max(range[0], range[1])] : null;
  const selCount = sel ? bins.slice(sel[0], sel[1] + 1).reduce((a, b) => a + b, 0) : 0;

  function commit(next: [number, number] | null) {
    setRange(next);
    if (onRangeChange) {
      if (!next) onRangeChange(null);
      else {
        const lo = Math.min(next[0], next[1]);
        const hi = Math.max(next[0], next[1]);
        onRangeChange([lo * binSize, (hi + 1) * binSize]);
      }
    }
  }

  const binAt = (clientX: number) => {
    const r = wrapRef.current!.getBoundingClientRect();
    return Math.max(0, Math.min(n - 1, Math.floor(((clientX - r.left) / r.width) * n)));
  };

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    const i = binAt(e.clientX);
    const target = (e.target as Element).closest("[data-handle]")?.getAttribute("data-handle");
    e.currentTarget.setPointerCapture(e.pointerId);
    if (sel && target === "lo") drag.current = { mode: "lo", anchor: sel[1], origin: [sel[0], sel[1]] };
    else if (sel && target === "hi") drag.current = { mode: "hi", anchor: sel[0], origin: [sel[0], sel[1]] };
    else if (sel && i >= sel[0] && i <= sel[1] && target === "body") drag.current = { mode: "move", anchor: i, origin: [sel[0], sel[1]] };
    else {
      drag.current = { mode: "new", anchor: i, origin: [i, i] };
      setRange([i, i]);
    }
    setDragging(true);
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const i = binAt(e.clientX);
    setHover(i);
    const d = drag.current;
    if (!d) return;
    if (d.mode === "move") {
      const span = d.origin[1] - d.origin[0];
      const lo = Math.max(0, Math.min(n - 1 - span, d.origin[0] + i - d.anchor));
      setRange([lo, lo + span]);
    } else setRange([d.anchor, i]);
  }

  function onPointerUp() {
    const d = drag.current;
    drag.current = null;
    setDragging(false);
    if (!d) return;
    if (d.mode === "new" && range && range[0] === range[1]) {
      commit(null);
      return;
    }
    commit(range);
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const cur = hover ?? Math.round(marks[0]?.value / binSize) ?? 0;
    if (e.key === "Escape") {
      commit(null);
      return;
    }
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!step && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const next = e.key === "Home" ? 0 : e.key === "End" ? n - 1 : Math.max(0, Math.min(n - 1, cur + step));
    if (e.shiftKey) {
      const anchor = range ? range[0] : cur;
      commit([anchor, next]);
    }
    setHover(next);
  }

  const yOf = (v: number) =>
    scale === "log" ? Math.log10(1 + v) / Math.log10(1 + peak) : v / peak;
  const mag = 10 ** Math.floor(Math.log10(peak / 2));
  const gridStep = [1, 2, 5, 10].map((k) => k * mag).find((v) => peak / v <= 3.2) ?? mag * 10;
  const grid = (
    scale === "log"
      ? [10, 100, 1000, 10000, 100000]
      : Array.from({ length: Math.floor(peak / gridStep) }, (_, k) => (k + 1) * gridStep)
  ).filter((g) => g < peak * 0.96);
  const tickStep = width < 380 ? 500 : 250;
  const ticks = Array.from({ length: Math.floor((n * binSize) / tickStep) + 1 }, (_, i) => i * tickStep);
  const markRows = marks.map((m, i) => {
    const prev = marks[i - 1];
    return prev && xOf(m.value) - xOf(prev.value) < 78 ? 1 : 0;
  });
  for (let i = 1; i < markRows.length; i++) if (markRows[i] === 1 && markRows[i - 1] === 1) markRows[i] = 0;

  const tipBin = hover !== null && !dragging ? hover : null;
  const tipX = tipBin === null ? 0 : tipBin * pitch + pitch / 2;
  const tipAlign = tipX < 80 ? "start" : tipX > width - 80 ? "end" : "center";

  return (
    <section
      aria-label={title}
      className={cn("w-full max-w-[520px] rounded-2xl border bg-card p-5 text-card-foreground shadow-xs/5", className)}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h3 className="font-medium text-sm">{title}</h3>
          <p className="text-pretty text-muted-foreground text-xs">
            <span className="tabular-nums">{num.format(total)}</span> requests · {caption}
          </p>
        </div>
        <Tabs onValueChange={(v) => setScale(v as HistogramScale)} value={scale}>
          <TabsList aria-label="Count scale" className="text-muted-foreground">
            <TabsTab className="px-2 text-xs sm:text-xs" value="linear">
              Linear
            </TabsTab>
            <TabsTab className="px-2 text-xs sm:text-xs" value="log">
              Log
            </TabsTab>
          </TabsList>
        </Tabs>
      </header>

      <dl className="mt-4 grid grid-cols-3 gap-2">
        {marks.map((m, i) => (
          <div className="flex flex-col gap-0.5 rounded-xl bg-muted/60 px-3 py-2 dark:bg-muted" key={m.p}>
            <dt className="flex items-center gap-1.5 text-muted-foreground text-xs">
              <span className={cn("h-2.5 w-0.5 rounded-full", MARKER[i % 3].dot)} />p{Math.round(m.p * 100)}
            </dt>
            <dd className="font-semibold text-base tabular-nums tracking-tight">{ms(m.value)}</dd>
          </div>
        ))}
      </dl>

      <div
        aria-label={`${title} histogram. Arrow keys move, Shift plus arrows select a range, Escape clears.`}
        className={cn(
          "relative mt-4 touch-none select-none rounded-md outline-none ring-offset-4 ring-offset-card focus-visible:ring-2 focus-visible:ring-ring",
          dragging ? "cursor-ew-resize" : "cursor-crosshair",
        )}
        onBlur={() => setHover(null)}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerLeave={() => !drag.current && setHover(null)}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        ref={wrapRef}
        role="application"
        tabIndex={0}
      >
        <svg aria-hidden className="block overflow-visible" height={H} width={width}>
          {grid.map((g) => {
            const y = TOP + plotH - yOf(g) * plotH;
            return (
              <g key={g}>
                <line className="stroke-border" strokeDasharray="2 4" x1={0} x2={width} y1={y} y2={y} />
                <text
                  className="fill-muted-foreground stroke-card text-[10px] tabular-nums"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  style={{ paintOrder: "stroke" }}
                  textAnchor="end"
                  x={width}
                  y={y - 3}
                >
                  {g >= 1000 ? `${g / 1000}k` : g}
                </text>
              </g>
            );
          })}
          <line className="stroke-border" x1={0} x2={width} y1={TOP + plotH} y2={TOP + plotH} />
          {bins.map((b, i) => {
            const h = Math.round(Math.max(b ? 2 : 0, yOf(b) * plotH) * 10) / 10;
            const inSel = sel ? i >= sel[0] && i <= sel[1] : true;
            const hot = hover === i && !dragging;
            return (
              <motion.rect
                animate={{ scaleY: 1, height: h, attrY: TOP + plotH - h }}
                className={cn(
                  sel ? (inSel ? "fill-info" : "fill-foreground/12") : hot ? "fill-foreground/70" : "fill-foreground/35",
                  sel && inSel && hot && "fill-info/80",
                )}
                initial={{ scaleY: 0, height: h, attrY: TOP + plotH - h }}
                key={i}
                rx={Math.min(2, barW / 2)}
                style={{ originY: 1, transformBox: "fill-box" }}
                transition={
                  reduce
                    ? { duration: 0 }
                    : {
                        scaleY: { type: "spring", stiffness: 260, damping: 30, delay: Math.min(0.35, i * 0.006) },
                        default: { type: "spring", stiffness: 380, damping: 38 },
                      }
                }
                width={barW}
                x={i * pitch + 1}
              />
            );
          })}

          {sel ? (
            <g>
              <rect
                className="fill-info/8 stroke-info/40"
                data-handle="body"
                height={plotH + 6}
                rx={4}
                strokeDasharray="3 3"
                width={(sel[1] - sel[0] + 1) * pitch}
                x={sel[0] * pitch}
                y={TOP - 3}
              />
              {(["lo", "hi"] as const).map((h) => {
                const x = h === "lo" ? sel[0] * pitch : (sel[1] + 1) * pitch;
                return (
                  <g className="cursor-ew-resize" data-handle={h} key={h}>
                    <rect className="fill-transparent" height={plotH + 6} width={24} x={x - 12} y={TOP - 3} />
                    <rect className="fill-info" height={plotH + 6} rx={1} width={2} x={x - 1} y={TOP - 3} />
                    <rect className="fill-card stroke-info" height={18} rx={3} strokeWidth={1.5} width={8} x={x - 4} y={TOP + plotH / 2 - 9} />
                  </g>
                );
              })}
            </g>
          ) : null}

          {marks.map((m, i) => {
            const x = xOf(m.value);
            return (
              <line
                className={cn("pointer-events-none", MARKER[i % 3].line)}
                key={m.p}
                strokeDasharray="2 3"
                strokeWidth={1.25}
                x1={x}
                x2={x}
                y1={markRows[i] ? 28 : 16}
                y2={TOP + plotH}
              />
            );
          })}

          {ticks.map((t, k) => (
            <text
              className="fill-muted-foreground text-[10px] tabular-nums"
              key={t}
              textAnchor={k === 0 ? "start" : t === n * binSize ? "end" : "middle"}
              x={xOf(t)}
              y={H - 4}
            >
              {ms(t)}
            </text>
          ))}
        </svg>

        {marks.map((m, i) => (
          <span
            className={cn(
              "pointer-events-none absolute -translate-x-1/2 rounded-full px-1.5 font-medium text-[10px] tabular-nums leading-4",
              MARKER[i % 3].chip,
            )}
            key={m.p}
            style={{ left: Math.max(24, Math.min(width - 24, xOf(m.value))), top: markRows[i] ? 12 : 0 }}
          >
            p{Math.round(m.p * 100)}
          </span>
        ))}

        <AnimatePresence>
          {tipBin !== null ? (
            <motion.div
              animate={{ opacity: 1 }}
              className={cn(
                "pointer-events-none absolute z-10 whitespace-nowrap rounded-lg border bg-popover px-2.5 py-1.5 text-popover-foreground text-xs shadow-md/5",
                tipAlign === "center" && "-translate-x-1/2",
                tipAlign === "end" && "-translate-x-full",
              )}
              exit={{ opacity: 0, transition: { duration: 0.08 } }}
              initial={{ opacity: 0 }}
              style={{ left: tipAlign === "start" ? tipX - pitch / 2 : tipAlign === "end" ? tipX + pitch / 2 : tipX, top: TOP + 4 }}
              transition={{ duration: reduce ? 0 : 0.12 }}
            >
              <span className="text-muted-foreground tabular-nums">
                {ms(tipBin * binSize)}–{ms((tipBin + 1) * binSize)}
              </span>{" "}
              <span className="font-medium tabular-nums">{num.format(bins[tipBin])}</span>
              <span className="text-muted-foreground"> req</span>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <div className="mt-3 flex h-7 items-center justify-between gap-3 text-xs">
        <AnimatePresence initial={false} mode="wait">
          {sel && sel[1] > sel[0] ? (
            <motion.p
              animate={{ opacity: 1, y: 0 }}
              className="min-w-0 truncate tabular-nums"
              exit={{ opacity: 0, y: reduce ? 0 : -3 }}
              initial={{ opacity: 0, y: reduce ? 0 : 3 }}
              key="sel"
              transition={{ duration: 0.15 }}
            >
              <span className="font-medium">
                {ms(sel[0] * binSize)}–{ms((sel[1] + 1) * binSize)}
              </span>
              <span className="text-muted-foreground">
                {" "}
                · {num.format(selCount)} requests · {((selCount / (total || 1)) * 100).toFixed(1)}%
              </span>
            </motion.p>
          ) : (
            <motion.p
              animate={{ opacity: 1, y: 0 }}
              className="truncate text-muted-foreground"
              exit={{ opacity: 0, y: reduce ? 0 : -3 }}
              initial={{ opacity: 0, y: reduce ? 0 : 3 }}
              key="hint"
              transition={{ duration: 0.15 }}
            >
              Drag across the chart to select a range
            </motion.p>
          )}
        </AnimatePresence>
        {sel && sel[1] > sel[0] ? (
          <button
            className="inline-flex h-7 shrink-0 cursor-pointer items-center gap-1 rounded-md px-2 text-muted-foreground outline-none transition-[color,background-color,scale] duration-150 ease-out hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]"
            onClick={() => commit(null)}
            type="button"
          >
            <XIcon className="size-3.5" />
            Clear
          </button>
        ) : null}
      </div>
    </section>
  );
}
