"use client";

import { ArrowDownIcon, ArrowUpIcon, ChevronsUpDownIcon } from "lucide-react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { type KeyboardEvent, type PointerEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type RowStatus = "healthy" | "slow" | "failing";

export interface SparklineRow {
  id: string;
  name: string;
  tag?: string;
  series: number[];
  previous: number;
  status: RowStatus;
}

export type SortKey = "name" | "value" | "delta" | "status";

export interface SparklineTableProps {
  title?: string;
  caption?: string;
  rows?: SparklineRow[];
  unit?: string;
  lowerIsBetter?: boolean;
  pointLabels?: string[];
  defaultSort?: { key: SortKey; dir: "asc" | "desc" };
  locale?: string;
  className?: string;
}

const STATUS: Record<RowStatus, { label: string; dot: string; text: string; stroke: string; rank: number }> = {
  healthy: { label: "Healthy", dot: "bg-success", text: "text-muted-foreground", stroke: "var(--color-muted-foreground)", rank: 0 },
  slow: { label: "Slow", dot: "bg-warning", text: "text-warning-foreground", stroke: "var(--color-warning)", rank: 1 },
  failing: { label: "Erroring", dot: "bg-destructive", text: "text-destructive-foreground", stroke: "var(--color-destructive)", rank: 2 },
};

function mulberry(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function walk(seed: number, base: number, drift: number, spike?: number) {
  const rand = mulberry(seed);
  return Array.from({ length: 24 }, (_, i) => {
    const daily = 1 + 0.18 * Math.sin(((i - 6) / 24) * Math.PI * 2);
    const trend = 1 + (drift * i) / 23;
    const bump = spike !== undefined && i >= spike ? 1.6 + (i - spike) * 0.12 : 1;
    return Math.round(base * daily * trend * bump * (0.92 + rand() * 0.16));
  });
}

const defaultRows: SparklineRow[] = [
  { id: "orders", tag: "GET", name: "/v1/orders", series: walk(3, 142, -0.08), previous: 112, status: "healthy" },
  { id: "checkout", tag: "POST", name: "/v1/checkout", series: walk(5, 310, 0.05, 19), previous: 318, status: "failing" },
  { id: "search", tag: "GET", name: "/v1/search", series: walk(8, 420, 0.32), previous: 401, status: "slow" },
  { id: "token", tag: "POST", name: "/v1/auth/token", series: walk(13, 88, -0.02), previous: 74, status: "healthy" },
  { id: "catalog", tag: "GET", name: "/v1/catalog/items", series: walk(21, 196, 0.02), previous: 188, status: "healthy" },
  { id: "webhooks", tag: "POST", name: "/v1/webhooks/deliver", series: walk(34, 640, 0.18), previous: 702, status: "slow" },
];
const defaultLabels = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}:00`);

function Sparkline({
  row,
  labels,
  unit,
  fmt,
}: {
  row: SparklineRow;
  labels: string[];
  unit: string;
  fmt: Intl.NumberFormat;
}) {
  const uid = useId().replace(/:/g, "");
  const reduce = useReducedMotion();
  const [hover, setHover] = useState<number | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(88);
  const H = 28;
  useEffect(() => {
    const parent = boxRef.current?.parentElement;
    if (!parent) return;
    const ro = new ResizeObserver(([entry]) => setW(Math.max(40, Math.round(entry.contentRect.width))));
    ro.observe(parent);
    return () => ro.disconnect();
  }, []);
  const s = row.series;
  const min = Math.min(...s);
  const max = Math.max(...s);
  const x = (i: number) => (i / (s.length - 1)) * (W - 4) + 2;
  const y = (v: number) => H - 3 - ((v - min) / (max - min || 1)) * (H - 6);
  const line = s.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const stroke = STATUS[row.status].stroke;
  const at = hover ?? s.length - 1;

  function onMove(e: PointerEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    setHover(Math.max(0, Math.min(s.length - 1, Math.round(((e.clientX - r.left - 2) / (W - 4)) * (s.length - 1)))));
  }
  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    const cur = hover ?? s.length - 1;
    const next = e.key === "ArrowLeft" ? cur - 1 : e.key === "ArrowRight" ? cur + 1 : e.key === "Home" ? 0 : e.key === "End" ? s.length - 1 : null;
    if (e.key === "Escape") return setHover(null);
    if (next === null) return;
    e.preventDefault();
    setHover(Math.max(0, Math.min(s.length - 1, next)));
  }

  return (
    <div
      aria-label={`${row.name} trend, ${fmt.format(min)} to ${fmt.format(max)} ${unit}. Arrow keys to inspect.`}
      className="relative -my-1 cursor-crosshair rounded-md py-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onBlur={() => setHover(null)}
      onFocus={(e) => e.currentTarget.matches(":focus-visible") && setHover(s.length - 1)}
      onKeyDown={onKey}
      onPointerLeave={() => setHover(null)}
      onPointerMove={onMove}
      ref={boxRef}
      role="img"
      style={{ width: W }}
      tabIndex={0}
    >
      <svg aria-hidden className="block overflow-visible" height={H} width={W}>
        <defs>
          <linearGradient id={`${uid}-a`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" style={{ stopColor: stroke, stopOpacity: 0.18 }} />
            <stop offset="100%" style={{ stopColor: stroke, stopOpacity: 0 }} />
          </linearGradient>
        </defs>
        <path d={`${line} L${x(s.length - 1)} ${H} L${x(0)} ${H} Z`} fill={`url(#${uid}-a)`} />
        <motion.path
          animate={{ pathLength: 1 }}
          d={line}
          fill="none"
          initial={{ pathLength: 0 }}
          stroke={stroke}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          transition={{ duration: reduce ? 0 : 0.7, ease: [0.23, 1, 0.32, 1] }}
        />
        {hover !== null ? <line className="stroke-foreground/20" x1={x(at)} x2={x(at)} y1={0} y2={H} /> : null}
        <circle className="stroke-card" cx={x(at)} cy={y(s[at])} fill={stroke} r={hover !== null ? 3 : 2.25} strokeWidth={1.5} />
      </svg>
      <AnimatePresence>
        {hover !== null ? (
          <motion.div
            animate={{ opacity: 1 }}
            className="pointer-events-none absolute bottom-full z-20 mb-1 -translate-x-1/2 whitespace-nowrap rounded-md border bg-popover px-2 py-1 text-popover-foreground text-xs shadow-md/5"
            exit={{ opacity: 0, transition: { duration: 0.08 } }}
            initial={{ opacity: 0 }}
            style={{ left: x(at) }}
            transition={{ duration: reduce ? 0 : 0.12 }}
          >
            <span className="text-muted-foreground">{labels[at] ?? `#${at + 1}`}</span>{" "}
            <span className="font-medium tabular-nums">
              {fmt.format(s[at])}
              {unit ? ` ${unit}` : ""}
            </span>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function SparklineTable({
  title = "Endpoints",
  caption = "p95 latency, last 24 hours",
  rows = defaultRows,
  unit = "ms",
  lowerIsBetter = true,
  pointLabels = defaultLabels,
  defaultSort = { key: "status", dir: "desc" },
  locale = "en-US",
  className,
}: SparklineTableProps) {
  const reduce = useReducedMotion();
  const [sort, setSort] = useState(defaultSort);
  const fmt = useMemo(() => new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }), [locale]);

  const enriched = rows.map((r) => {
    const value = r.series[r.series.length - 1] ?? 0;
    return { ...r, value, delta: r.previous ? (value - r.previous) / r.previous : 0 };
  });
  const sorted = [...enriched].sort((a, b) => {
    const sign = sort.dir === "asc" ? 1 : -1;
    if (sort.key === "name") return a.name.localeCompare(b.name) * sign;
    if (sort.key === "status") return (STATUS[a.status].rank - STATUS[b.status].rank || a.value - b.value) * sign;
    return (a[sort.key] - b[sort.key]) * sign;
  });
  const counts = rows.reduce<Record<RowStatus, number>>(
    (acc, r) => {
      acc[r.status] += 1;
      return acc;
    },
    { healthy: 0, slow: 0, failing: 0 },
  );

  function toggle(key: SortKey) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "name" ? "asc" : "desc" }));
  }

  const head = (key: SortKey | null, label: string, align: "start" | "end" = "start", extra?: string) => {
    const on = key !== null && sort.key === key;
    return (
      <div
        aria-sort={on ? (sort.dir === "asc" ? "ascending" : "descending") : key ? "none" : undefined}
        className={cn("flex", align === "end" ? "justify-end" : "justify-start", extra)}
        role="columnheader"
      >
        {key ? (
          <button
            className={cn(
              "-mx-1.5 inline-flex h-7 cursor-pointer items-center gap-1 rounded-md px-1.5 outline-none transition-colors duration-150 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
              on && "text-foreground",
            )}
            onClick={() => toggle(key)}
            type="button"
          >
            {label}
            {on ? (
              sort.dir === "asc" ? (
                <ArrowUpIcon className="size-3" />
              ) : (
                <ArrowDownIcon className="size-3" />
              )
            ) : (
              <ChevronsUpDownIcon className="size-3 opacity-50" />
            )}
          </button>
        ) : (
          <span className="inline-flex h-7 items-center">{label}</span>
        )}
      </div>
    );
  };

  const cols =
    "grid grid-cols-[minmax(0,1fr)_52px_60px] items-center gap-x-2.5 @min-[30rem]:grid-cols-[minmax(0,1fr)_88px_64px_64px_80px] @min-[30rem]:gap-x-3";

  return (
    <section
      aria-label={title}
      className={cn("@container w-full max-w-[600px] rounded-2xl border bg-card p-5 text-card-foreground shadow-xs/5", className)}
    >
      <header className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h3 className="font-medium text-sm">{title}</h3>
          <p className="text-muted-foreground text-xs">{caption}</p>
        </div>
        <div className="flex items-center gap-3 text-muted-foreground text-xs tabular-nums">
          {(["failing", "slow", "healthy"] as RowStatus[]).map((s) =>
            counts[s] ? (
              <span className="inline-flex items-center gap-1.5" key={s}>
                <span className={cn("size-1.5 rounded-full", STATUS[s].dot)} />
                {counts[s]} {STATUS[s].label.toLowerCase()}
              </span>
            ) : null,
          )}
        </div>
      </header>

      <div className="mt-4 text-xs" role="table">
        <div className={cn(cols, "mb-1 border-b pb-1.5 text-muted-foreground")} role="row">
          {head("name", "Endpoint")}
          {head(null, "Trend")}
          {head("value", "p95", "end")}
          {head("delta", "Δ 24h", "end", "hidden @min-[30rem]:flex")}
          {head("status", "Status", "start", "hidden @min-[30rem]:flex")}
        </div>
        <LayoutGroup>
          <div role="rowgroup">
            {sorted.length === 0 ? (
              <p className="py-6 text-center text-muted-foreground">Nothing reported in this window yet.</p>
            ) : null}
            {sorted.map((r) => {
              const good = lowerIsBetter ? r.delta < 0 : r.delta > 0;
              const flat = Math.abs(r.delta) < 0.005;
              const deltaTone = flat ? "text-muted-foreground" : good ? "text-success-foreground" : "text-destructive-foreground";
              const delta = (
                <span className="inline-flex items-center gap-0.5">
                  {flat ? null : r.delta > 0 ? <ArrowUpIcon className="size-3" /> : <ArrowDownIcon className="size-3" />}
                  {Math.abs(r.delta * 100).toFixed(1)}%
                </span>
              );
              return (
                <motion.div
                  className={cn(cols, "relative -mx-2 h-11 rounded-lg px-2 transition-colors duration-150 hover:bg-accent/60")}
                  key={r.id}
                  layout="position"
                  role="row"
                  transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 40 }}
                >
                  <div className="flex min-w-0 items-center gap-2" role="cell">
                    <span
                      aria-hidden
                      className={cn("size-1.5 shrink-0 rounded-full @min-[30rem]:hidden", STATUS[r.status].dot)}
                    />
                    {r.tag ? (
                      <span className="hidden w-9 shrink-0 font-medium font-mono text-[10px] text-muted-foreground @min-[30rem]:inline">
                        {r.tag}
                      </span>
                    ) : null}
                    <span className="truncate font-mono text-foreground">{r.name}</span>
                  </div>
                  <div role="cell">
                    <Sparkline fmt={fmt} labels={pointLabels} row={r} unit={unit} />
                  </div>
                  <div className="flex flex-col items-end text-right tabular-nums" role="cell">
                    <span className="font-medium text-foreground">
                      {fmt.format(r.value)}
                      <span className="ms-0.5 font-normal text-muted-foreground">{unit}</span>
                    </span>
                    <span className={cn("@min-[30rem]:hidden", deltaTone)}>{delta}</span>
                  </div>
                  <div className={cn("hidden justify-end tabular-nums @min-[30rem]:flex", deltaTone)} role="cell">
                    {delta}
                  </div>
                  <div className={cn("hidden items-center gap-1.5 @min-[30rem]:flex", STATUS[r.status].text)} role="cell">
                    <span className={cn("size-1.5 rounded-full", STATUS[r.status].dot)} />
                    {STATUS[r.status].label}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </LayoutGroup>
      </div>
    </section>
  );
}
