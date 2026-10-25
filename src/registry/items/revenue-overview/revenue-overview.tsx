"use client";

import {
  ArrowDownRightIcon,
  ArrowUpRightIcon,
  BellIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CoffeeIcon,
  DownloadIcon,
  FileChartColumnIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  FlameIcon,
  FootprintsIcon,
  LampIcon,
  LayoutDashboardIcon,
  MailIcon,
  type LucideIcon,
  MenuIcon,
  PackageIcon,
  SettingsIcon,
  ShoppingBagIcon,
  SofaIcon,
  StoreIcon,
  UsersIcon,
  UtensilsCrossedIcon,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion, useSpring, useTransform } from "motion/react";
import {
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Menu, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

function useReducedMotionAfterMount() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && Boolean(prefers);
}

export type RangeKey = "7d" | "30d" | "90d" | "12m";

export interface ChannelSeries {
  key: string;
  label: string;
  values: number[];
}

export interface ProductRow {
  name: string;
  sku: string;
  units: number;
  revenue: number;
  icon?: LucideIcon;
}

export interface RangeData {
  labels: string[];
  channels: ChannelSeries[];
  orders: number[];
  sessions: number[];
  previous: { revenue: number; orders: number; sessions: number };
  regions: { label: string; value: number }[];
  products: ProductRow[];
  weekdays: { label: string; current: number; previous: number }[];
}

export interface RevenueOverviewProps {
  className?: string;
  store?: { name: string; plan: string };
  user?: { name: string; email: string };
  data?: Record<RangeKey, RangeData>;
  defaultRange?: RangeKey;
  activeNav?: string;
  onNavigate?: (label: string) => void;
}

function mulberry32(seed: number) {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WEEKDAY_FACTOR = [0.94, 0.97, 1.0, 1.04, 1.12, 1.2, 0.9];
const SAMPLE_CHANNELS = [
  { key: "store", label: "Online store", base: 4100, drift: 0 },
  { key: "market", label: "Marketplaces", base: 2500, drift: -0.05 },
  { key: "wholesale", label: "Wholesale", base: 1450, drift: 0.02 },
  { key: "social", label: "Social shop", base: 820, drift: 0.35 },
];
const SAMPLE_PRODUCTS: { name: string; sku: string; price: number; weight: number; icon: LucideIcon }[] = [
  { name: "Linen throw blanket", sku: "FW-1042", price: 128, weight: 0.22, icon: SofaIcon },
  { name: "Brass desk lamp", sku: "FW-2210", price: 164, weight: 0.18, icon: LampIcon },
  { name: "Stoneware mug set", sku: "FW-0318", price: 46, weight: 0.14, icon: CoffeeIcon },
  { name: "Walnut serving board", sku: "FW-0907", price: 84, weight: 0.12, icon: UtensilsCrossedIcon },
  { name: "Cedar candle trio", sku: "FW-0551", price: 38, weight: 0.09, icon: FlameIcon },
  { name: "Felted wool slippers", sku: "FW-1630", price: 72, weight: 0.07, icon: FootprintsIcon },
];

function buildRange(range: RangeKey, seed: number, growth: number): RangeData {
  const rand = mulberry32(seed);
  const spec = {
    "7d": { n: 7, mult: 1, step: "day", trend: 0.06 },
    "30d": { n: 30, mult: 1, step: "day", trend: 0.12 },
    "90d": { n: 13, mult: 7, step: "week", trend: 0.2 },
    "12m": { n: 12, mult: 30.4, step: "month", trend: 0.5 },
  }[range];
  const end = new Date(2026, 9, 24);
  const labels: string[] = [];
  const weekdayOf: number[] = [];
  for (let i = 0; i < spec.n; i++) {
    const back = spec.n - 1 - i;
    const d = new Date(end);
    if (spec.step === "day") d.setDate(end.getDate() - back);
    if (spec.step === "week") d.setDate(end.getDate() - back * 7 - 6);
    if (spec.step === "month") d.setMonth(end.getMonth() - back);
    labels.push(spec.step === "month" ? MONTHS[d.getMonth()] : `${MONTHS[d.getMonth()]} ${d.getDate()}`);
    weekdayOf.push((d.getDay() + 6) % 7);
  }
  const channels = SAMPLE_CHANNELS.map((c) => ({
    key: c.key,
    label: c.label,
    values: labels.map((_, i) => {
      const t = spec.n === 1 ? 1 : i / (spec.n - 1);
      const trend = 1 - spec.trend / 2 + spec.trend * t + c.drift * (t - 0.5) * (spec.trend * 2);
      const season = spec.step === "day" ? WEEKDAY_FACTOR[weekdayOf[i]] : 1;
      const holiday = spec.step === "month" && (labels[i] === "Nov" || labels[i] === "Dec") ? 1.28 : 1;
      return c.base * spec.mult * trend * season * holiday * (1 + (rand() - 0.5) * 0.2);
    }),
  }));
  const totals = labels.map((_, i) => channels.reduce((s, c) => s + c.values[i], 0));
  const orders = totals.map((v) => v / (64 + rand() * 9));
  const sessions = orders.map((o, i) => o / (0.027 + rand() * 0.006 + (i / spec.n) * 0.003));
  const revenue = totals.reduce((a, b) => a + b, 0);
  const orderSum = orders.reduce((a, b) => a + b, 0);
  const sessionSum = sessions.reduce((a, b) => a + b, 0);
  const shares = [0.46, 0.27, 0.17, 0.1].map((s) => s * (1 + (rand() - 0.5) * 0.16));
  const shareSum = shares.reduce((a, b) => a + b, 0);
  const days = spec.n * spec.mult;
  return {
    labels,
    channels,
    orders,
    sessions,
    previous: {
      revenue: revenue / (1 + growth),
      orders: orderSum / (1 + growth * 0.8),
      sessions: sessionSum / (1 + growth * 0.55),
    },
    regions: ["North America", "Europe", "Asia Pacific", "Rest of world"].map((label, i) => ({
      label,
      value: (revenue * shares[i]) / shareSum,
    })),
    products: SAMPLE_PRODUCTS.map((p) => {
      const r = revenue * p.weight * (1 + (rand() - 0.5) * 0.24);
      return { name: p.name, sku: p.sku, icon: p.icon, revenue: r, units: Math.round(r / p.price) };
    }).sort((a, b) => b.revenue - a.revenue),
    weekdays: WEEKDAY_LABELS.map((label, w) => {
      const current = (revenue / days) * WEEKDAY_FACTOR[w] * (1 + (rand() - 0.5) * 0.12);
      return { label, current, previous: (current / (1 + growth)) * (1 + (rand() - 0.5) * 0.18) };
    }),
  };
}

const SAMPLE_DATA: Record<RangeKey, RangeData> = {
  "7d": buildRange("7d", 7, 0.084),
  "30d": buildRange("30d", 30, 0.126),
  "90d": buildRange("90d", 90, -0.032),
  "12m": buildRange("12m", 12, 0.312),
};

const RANGES: { value: RangeKey; label: string; long: string }[] = [
  { value: "7d", label: "7d", long: "Last 7 days" },
  { value: "30d", label: "30d", long: "Last 30 days" },
  { value: "90d", label: "90d", long: "Last 90 days" },
  { value: "12m", label: "12m", long: "Last 12 months" },
];

const CHANNEL_COLORS = ["var(--color-chart-1)", "var(--color-chart-2)", "var(--color-chart-3)", "var(--color-chart-4)"];

const usd0 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const fmtMoney = (n: number) => (n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : usd0.format(n));
const fmtCompact = (n: number) =>
  n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(n >= 1e5 ? 0 : 1)}k` : `$${Math.round(n)}`;
const fmtAxis = (n: number) =>
  n >= 1e6 ? `$${+(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `$${+(n / 1e3).toFixed(1)}k` : `$${Math.round(n)}`;
const fmtInt = (n: number) => Math.round(n).toLocaleString("en-US");
const fmtAov = (n: number) => `$${n.toFixed(2)}`;
const fmtConv = (n: number) => `${(n * 100).toFixed(2)}%`;
const fmtShare = (n: number) => `${Math.round(n * 100)}%`;
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

function niceMax(v: number) {
  if (v <= 0) return 1;
  const exp = 10 ** Math.floor(Math.log10(v));
  const f = v / exp;
  return ([1, 1.2, 1.6, 2, 2.4, 3, 4, 5, 6, 8, 10].find((s) => f <= s) ?? 10) * exp;
}

function curve(pts: [number, number][], join: "M" | "L" = "M") {
  if (!pts.length) return "";
  let d = `${join}${pts[0][0].toFixed(2)},${pts[0][1].toFixed(2)}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const xm = (x0 + x1) / 2;
    d += `C${xm.toFixed(2)},${y0.toFixed(2)} ${xm.toFixed(2)},${y1.toFixed(2)} ${x1.toFixed(2)},${y1.toFixed(2)}`;
  }
  return d;
}

function sampleCurve(pts: [number, number][], count: number): [number, number][] {
  if (pts.length === 0) return [];
  if (pts.length === 1) return Array.from({ length: count }, () => pts[0]);
  const x0 = pts[0][0];
  const x1 = pts[pts.length - 1][0];
  const out: [number, number][] = [];
  let seg = 0;
  for (let k = 0; k < count; k++) {
    const X = x0 + ((x1 - x0) * k) / (count - 1);
    while (seg < pts.length - 2 && X > pts[seg + 1][0]) seg++;
    const [ax, ay] = pts[seg];
    const [bx, by] = pts[seg + 1];
    const u = bx === ax ? 0 : Math.min(1, Math.max(0, (X - ax) / (bx - ax)));
    let lo = 0;
    let hi = 1;
    for (let it = 0; it < 18; it++) {
      const t = (lo + hi) / 2;
      if (1.5 * t * (1 - t) + t * t * t < u) lo = t;
      else hi = t;
    }
    const t = (lo + hi) / 2;
    out.push([X, ay + (by - ay) * (3 * t * t - 2 * t * t * t)]);
  }
  return out;
}

const polyline = (pts: [number, number][], join: "M" | "L" = "M") =>
  pts.map(([px, py], i) => `${i === 0 ? join : "L"}${px.toFixed(1)},${py.toFixed(1)}`).join("");

function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setSize({ width: r.width, height: r.height });
    const ro = new ResizeObserver(([entry]) =>
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height }),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

function Rolling({ value, format }: { value: number; format: (n: number) => string }) {
  const reduce = useReducedMotionAfterMount();
  const spring = useSpring(value, { stiffness: 260, damping: 34 });
  const text = useTransform(spring, (v) => format(v));
  useEffect(() => {
    if (reduce) spring.jump(value);
    else spring.set(value);
  }, [value, reduce, spring]);
  return <motion.span className="tabular-nums">{text}</motion.span>;
}

function DeltaChip({ value, className }: { value: number; className?: string }) {
  const up = value >= 0;
  return (
    <Badge className={cn("rounded-full px-1.5 text-xs tabular-nums", className)} variant={up ? "success" : "error"}>
      {up ? <ArrowUpRightIcon aria-hidden /> : <ArrowDownRightIcon aria-hidden />}
      <span className="sr-only">{up ? "up" : "down"}</span>
      {Math.abs(value * 100).toFixed(1)}%
    </Badge>
  );
}

const spring = { type: "spring", stiffness: 700, damping: 54 } as const;
const enter = { duration: 0.2, ease: [0.23, 1, 0.32, 1] } as const;
const pressable = "transition-[color,background-color,box-shadow,scale] duration-150 ease-out active:scale-[0.97]";

function RangeSwitch({ value, onChange }: { value: RangeKey; onChange: (v: RangeKey) => void }) {
  const indicatorId = useId();
  const reduce = useReducedMotionAfterMount();
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = RANGES.findIndex((r) => r.value === value);
    const keys: Record<string, number> = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: RANGES.length - 1 };
    if (!(e.key in keys)) return;
    e.preventDefault();
    const r = RANGES[(keys[e.key] + RANGES.length) % RANGES.length];
    onChange(r.value);
    itemRefs.current[r.value]?.focus();
  };

  return (
    <div
      aria-label="Date range"
      className="relative isolate flex items-center gap-0.5 rounded-lg bg-muted p-0.5"
      onKeyDown={onKeyDown}
      role="radiogroup"
    >
      {RANGES.map((r) => {
        const active = r.value === value;
        return (
          <button
            aria-checked={active}
            aria-label={r.long}
            className={cn(
              "relative h-8 min-w-10 cursor-pointer rounded-md px-2.5 font-medium text-sm tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-xs",
              pressable,
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
            key={r.value}
            onClick={() => onChange(r.value)}
            ref={(el) => {
              itemRefs.current[r.value] = el;
            }}
            role="radio"
            tabIndex={active ? 0 : -1}
            type="button"
          >
            {active && (
              <motion.span
                aria-hidden
                className="absolute inset-0 -z-10 rounded-md bg-background shadow-sm/5 dark:bg-input"
                layoutId={`${indicatorId}-range`}
                transition={reduce ? { duration: 0 } : spring}
              />
            )}
            {r.label}
          </button>
        );
      })}
    </div>
  );
}

function Card({ title, action, children, className }: { title: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("@container flex min-w-0 flex-col rounded-2xl border bg-card p-4 shadow-xs/5", className)}>
      <header className="mb-3 flex min-h-7 flex-wrap items-center justify-between gap-2">
        <h2 className="font-medium text-sm">{title}</h2>
        {action}
      </header>
      {children}
    </section>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const reduce = useReducedMotionAfterMount();
  const clipId = `spark-${useId().replace(/:/g, "")}`;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pts = values.map((v, i) => [
    values.length === 1 ? 50 : (i / (values.length - 1)) * 100,
    28 - ((v - min) / (max - min || 1)) * 24,
  ]) as [number, number][];
  const line = polyline(sampleCurve(pts, 96));
  return (
    <svg aria-hidden className="mt-3 h-9 w-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 32">
      <defs>
        <clipPath id={clipId}>
          <motion.rect
            animate={{ width: 104 }}
            height={40}
            initial={{ width: reduce ? 104 : 0 }}
            transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
            x={-2}
            y={-4}
          />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <motion.path
          animate={{ d: `${line}L100,32L0,32Z` }}
          className="fill-foreground/5"
          initial={false}
          transition={reduce ? { duration: 0 } : spring}
        />
        <motion.path
          animate={{ d: line }}
          className="fill-none stroke-foreground/50"
          initial={false}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          transition={reduce ? { duration: 0 } : spring}
          vectorEffect="non-scaling-stroke"
        />
      </g>
    </svg>
  );
}

function KpiCard({
  label,
  value,
  format,
  delta,
  spark,
}: {
  label: string;
  value: number;
  format: (n: number) => string;
  delta: number;
  spark: number[];
}) {
  return (
    <div className="@container min-w-0 rounded-2xl border bg-card p-4 shadow-xs/5">
      <div className="truncate text-muted-foreground text-xs">{label}</div>
      <div className="mt-1.5 flex flex-col items-start gap-1.5 @[11rem]:flex-row @[11rem]:items-center @[11rem]:justify-between">
        <span className="truncate font-semibold text-lg tracking-tight">
          <Rolling format={format} value={value} />
        </span>
        <DeltaChip value={delta} />
      </div>
      <Sparkline values={spark} />
    </div>
  );
}

const CHART_SAMPLES = 160;

function ChannelChart({ data, range }: { data: RangeData; range: RangeKey }) {
  const reduce = useReducedMotionAfterMount();
  const clipId = `clip-${useId().replace(/:/g, "")}`;
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());
  const [hover, setHover] = useState<number | null>(null);
  const [ref, { width, height }] = useElementSize<HTMLDivElement>();
  const H = Math.max(230, Math.round(height));
  const pad = { l: 40, r: 8, t: 10, b: 24 };
  const n = data.labels.length;
  const plotW = Math.max(0, width - pad.l - pad.r);
  const plotH = H - pad.t - pad.b;
  const channels = data.channels.slice(0, 4);
  const noneOn = channels.every((c) => hidden.has(c.key));
  const morph = reduce ? { duration: 0 } : spring;

  const stacks = useMemo(() => {
    const lower = new Array(n).fill(0) as number[];
    return channels.map((c) => {
      const on = !hidden.has(c.key);
      const lo = [...lower];
      const hi = lo.map((v, i) => v + (on ? c.values[i] : 0));
      for (let i = 0; i < n; i++) lower[i] = hi[i];
      return { lo, hi, on };
    });
  }, [channels, hidden, n]);
  const totals = stacks.length ? stacks[stacks.length - 1].hi : [];
  const fullTotals = data.labels.map((_, i) => sum(channels.map((c) => c.values[i])));
  const max = niceMax(Math.max(...(noneOn ? fullTotals : totals), 1) * 1.04);
  const x = (i: number) => pad.l + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const y = (v: number) => pad.t + (1 - v / max) * plotH;

  const visibleTotal = sum(totals);
  const allTotal = sum(fullTotals);
  const tickCount = width < 420 ? 4 : 6;
  const step = Math.max(1, Math.ceil((n - 1) / (tickCount - 1)));
  const xTicks = data.labels.map((_, i) => i).filter((i) => i % step === 0 && (n - 1 - i >= step / 2 || i === n - 1));
  if (xTicks[xTicks.length - 1] !== n - 1) xTicks.push(n - 1);

  const toggle = (key: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const pick = (clientX: number, el: Element) => {
    if (noneOn) return;
    const rect = el.getBoundingClientRect();
    const px = clientX - rect.left - pad.l;
    setHover(Math.min(n - 1, Math.max(0, Math.round((px / (plotW || 1)) * (n - 1)))));
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (noneOn || (e.key !== "ArrowRight" && e.key !== "ArrowLeft")) return;
    e.preventDefault();
    setHover((h) => {
      const base = h ?? (e.key === "ArrowRight" ? -1 : n);
      return Math.min(n - 1, Math.max(0, base + (e.key === "ArrowRight" ? 1 : -1)));
    });
  };

  const hoverAt = hover !== null && hover < n ? hover : null;
  const tipLeft = hoverAt !== null && x(hoverAt) > width / 2;

  return (
    <Card
      action={
        <div className="flex items-baseline gap-2">
          {!noneOn && visibleTotal < allTotal && (
            <span className="text-muted-foreground text-xs tabular-nums">{fmtShare(visibleTotal / allTotal)} of total</span>
          )}
          <span className="font-semibold text-base tabular-nums">
            <Rolling format={fmtMoney} value={visibleTotal} />
          </span>
        </div>
      }
      className="@4xl:col-span-2"
      title="Revenue by channel"
    >
      <div aria-label="Toggle channels" className="-ms-2 mb-1 flex flex-wrap gap-x-0.5" role="group">
        {channels.map((c, i) => {
          const on = !hidden.has(c.key);
          return (
            <button
              aria-pressed={on}
              className={cn(
                "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg px-2 text-xs outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
                pressable,
                on ? "text-foreground" : "text-muted-foreground/70",
              )}
              key={c.key}
              onClick={() => toggle(c.key)}
              type="button"
            >
              <motion.span
                animate={{ scale: on ? 1 : 0.6, opacity: on ? 1 : 0.45 }}
                className="size-2.5 rounded-[3px]"
                initial={false}
                style={{ background: CHANNEL_COLORS[i] }}
                transition={morph}
              />
              <span className={cn(!on && "line-through decoration-muted-foreground/50")}>{c.label}</span>
              <span className="text-muted-foreground tabular-nums">{fmtCompact(sum(c.values))}</span>
            </button>
          );
        })}
      </div>
      <div
        aria-label="Revenue by channel chart. Use left and right arrow keys to inspect points."
        className="relative min-h-[230px] w-full flex-1 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onBlur={() => setHover(null)}
        onKeyDown={onKey}
        ref={ref}
        role="application"
        tabIndex={0}
      >
        {width > 0 && (
          <svg aria-hidden className="absolute inset-0 overflow-visible" height={H} width={width}>
            <defs>
              <clipPath id={clipId}>
                <motion.rect
                  animate={{ width }}
                  height={H + 8}
                  initial={{ width: reduce ? width : 0 }}
                  transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
                  x={0}
                  y={-4}
                />
              </clipPath>
            </defs>
            {[0, 1, 2, 3, 4].map((k) => {
              const v = (max / 4) * k;
              return (
                <g key={k}>
                  <line
                    className={k === 0 ? "stroke-border" : "stroke-border/60"}
                    strokeDasharray={k === 0 ? undefined : "2 4"}
                    x1={pad.l}
                    x2={width - pad.r}
                    y1={y(v)}
                    y2={y(v)}
                  />
                  <motion.text
                    animate={{ opacity: 1 }}
                    className="fill-muted-foreground text-[10px] tabular-nums"
                    dominantBaseline="middle"
                    initial={{ opacity: 0 }}
                    key={`${max}-${k}`}
                    textAnchor="end"
                    transition={enter}
                    x={pad.l - 8}
                    y={y(v)}
                  >
                    {fmtAxis(v)}
                  </motion.text>
                </g>
              );
            })}
            {xTicks.map((i, k) => (
              <motion.text
                animate={{ opacity: 1 }}
                className="fill-muted-foreground text-[10px]"
                initial={{ opacity: 0 }}
                key={`${range}-${i}`}
                textAnchor={k === 0 && n > 1 ? "start" : i === n - 1 && n > 1 ? "end" : "middle"}
                transition={enter}
                x={x(i)}
                y={H - 6}
              >
                {data.labels[i]}
              </motion.text>
            ))}
            <g clipPath={`url(#${clipId})`}>
              {stacks.map((s, ci) => {
                const top = sampleCurve(s.hi.map((v, i) => [x(i), y(v)]), CHART_SAMPLES);
                const bottom = sampleCurve(s.lo.map((v, i) => [x(i), y(v)]), CHART_SAMPLES).reverse();
                return (
                  <motion.path
                    animate={{ d: `${polyline(top)}${polyline(bottom, "L")}Z`, opacity: s.on ? 1 : 0 }}
                    initial={false}
                    key={`a-${channels[ci].key}`}
                    style={{ fill: CHANNEL_COLORS[ci], fillOpacity: 0.16 }}
                    transition={morph}
                  />
                );
              })}
              {stacks.map((s, ci) => (
                <motion.path
                  animate={{ d: polyline(sampleCurve(s.hi.map((v, i) => [x(i), y(v)]), CHART_SAMPLES)), opacity: s.on ? 1 : 0 }}
                  fill="none"
                  initial={false}
                  key={`l-${channels[ci].key}`}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  style={{ stroke: CHANNEL_COLORS[ci] }}
                  transition={morph}
                />
              ))}
            </g>
            {hoverAt !== null && (
              <g>
                <line className="stroke-foreground/30" x1={x(hoverAt)} x2={x(hoverAt)} y1={pad.t} y2={H - pad.b} />
                {stacks.map((s, ci) =>
                  s.on ? (
                    <circle
                      className="stroke-card"
                      cx={x(hoverAt)}
                      cy={y(s.hi[hoverAt])}
                      key={channels[ci].key}
                      r={4}
                      strokeWidth={2}
                      style={{ fill: CHANNEL_COLORS[ci] }}
                    />
                  ) : null,
                )}
              </g>
            )}
            <rect
              className={noneOn ? undefined : "cursor-crosshair"}
              fill="transparent"
              height={plotH}
              onPointerDown={(e) => pick(e.clientX, e.currentTarget.ownerSVGElement ?? e.currentTarget)}
              onPointerLeave={() => setHover(null)}
              onPointerMove={(e) => pick(e.clientX, e.currentTarget.ownerSVGElement ?? e.currentTarget)}
              width={plotW + 16}
              x={pad.l - 8}
              y={pad.t}
            />
          </svg>
        )}
        <AnimatePresence>
          {noneOn && (
            <motion.div
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-x-0 top-0 flex flex-col items-center justify-center gap-1 text-center"
              exit={{ opacity: 0, scale: 0.97 }}
              initial={{ opacity: 0, scale: 0.97 }}
              style={{ left: pad.l, bottom: pad.b }}
              transition={enter}
            >
              <p className="font-medium text-sm">No channels selected</p>
              <p className="text-pretty text-muted-foreground text-xs">Turn a channel back on to see its revenue.</p>
              <Button className={cn("mt-2 h-8 text-sm sm:h-8", pressable)} onClick={() => setHidden(new Set())} size="sm" variant="outline">
                Show all channels
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {hoverAt !== null && width > 0 && (
            <motion.div
              animate={{ opacity: 1, scale: 1, x: x(hoverAt) + (tipLeft ? -12 : 12) }}
              className="pointer-events-none absolute top-1 left-0 z-10 w-48 rounded-xl border bg-popover p-2.5 text-xs shadow-xs/5"
              exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.12 } }}
              initial={{ opacity: 0, scale: 0.97, x: x(hoverAt) + (tipLeft ? -12 : 12) }}
              style={{ translateX: tipLeft ? "-100%" : "0%", originX: tipLeft ? 1 : 0, originY: 0 }}
              transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 700, damping: 54 }}
            >
              <div className="mb-1.5 font-medium">{data.labels[hoverAt]}</div>
              <ul className="flex flex-col gap-1">
                {channels.map((c, ci) =>
                  hidden.has(c.key) ? null : (
                    <li className="flex items-center gap-2" key={c.key}>
                      <span className="size-2 rounded-[2px]" style={{ background: CHANNEL_COLORS[ci] }} />
                      <span className="flex-1 truncate text-muted-foreground">{c.label}</span>
                      <span className="tabular-nums">{fmtMoney(c.values[hoverAt])}</span>
                    </li>
                  ),
                )}
              </ul>
              <div className="mt-1.5 flex justify-between border-t pt-1.5 font-medium">
                <span>Total</span>
                <span className="tabular-nums">{fmtMoney(totals[hoverAt])}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Card>
  );
}

function ChannelMix({ data }: { data: RangeData }) {
  const reduce = useReducedMotionAfterMount();
  const [active, setActive] = useState<number | null>(null);
  const channels = data.channels.slice(0, 4);
  const values = channels.map((c) => sum(c.values));
  const total = sum(values);
  const r = 46;
  const C = 2 * Math.PI * r;
  const gap = 2.5;
  let acc = 0;
  const segs = values.map((v) => {
    const len = (v / total) * C;
    const seg = { offset: acc, len };
    acc += len;
    return seg;
  });
  const regionMax = Math.max(...data.regions.map((g) => g.value));
  const regionTotal = sum(data.regions.map((g) => g.value));

  return (
    <Card title="Channel mix">
      <div className="flex items-center gap-4">
        <div className="relative size-26 shrink-0 @md:size-32">
          <svg aria-hidden className="size-full -rotate-90" viewBox="0 0 120 120">
            <circle className="stroke-muted" cx={60} cy={60} fill="none" r={r} strokeWidth={14} />
            {segs.map((s, i) => (
              <motion.circle
                animate={{
                  strokeDasharray: `${Math.max(0, s.len - gap)} ${C}`,
                  strokeDashoffset: -s.offset,
                  strokeWidth: active === i ? 18 : 14,
                  opacity: active === null || active === i ? 1 : 0.35,
                }}
                cx={60}
                cy={60}
                fill="none"
                initial={reduce ? false : { strokeDasharray: `0 ${C}`, strokeDashoffset: 0 }}
                key={channels[i].key}
                onPointerEnter={(e) => e.pointerType === "mouse" && setActive(i)}
                onPointerLeave={() => setActive(null)}
                r={r}
                style={{ stroke: CHANNEL_COLORS[i] }}
                transition={spring}
              />
            ))}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-[10px] text-muted-foreground">{active === null ? "Total" : channels[active].label}</span>
            <span className="font-semibold text-sm tabular-nums">
              {active === null ? <Rolling format={fmtCompact} value={total} /> : fmtShare(values[active] / total)}
            </span>
          </div>
        </div>
        <ul className="-me-2 flex min-w-0 flex-1 flex-col">
          {channels.map((c, i) => (
            <li key={c.key}>
              <button
                className={cn(
                  "flex h-8 w-full cursor-default items-center gap-2 rounded-lg px-2 text-left text-xs outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring",
                  active === i && "bg-accent",
                )}
                onBlur={() => setActive(null)}
                onFocus={() => setActive(i)}
                onPointerEnter={(e) => e.pointerType === "mouse" && setActive(i)}
                onPointerLeave={() => setActive(null)}
                type="button"
              >
                <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: CHANNEL_COLORS[i] }} />
                <span className="min-w-0 flex-1 truncate">{c.label}</span>
                <span className="text-muted-foreground tabular-nums">{fmtShare(values[i] / total)}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-4 border-t pt-3">
        <h3 className="mb-2 text-muted-foreground text-xs">By region</h3>
        <ul className="flex flex-col gap-2">
          {data.regions.map((g) => (
            <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 text-xs" key={g.label}>
              <span className="truncate">{g.label}</span>
              <span className="tabular-nums">
                {fmtCompact(g.value)} <span className="text-muted-foreground">· {fmtShare(g.value / regionTotal)}</span>
              </span>
              <div className="col-span-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <motion.div
                  animate={{ width: `${(g.value / regionMax) * 100}%` }}
                  className="h-full rounded-full bg-foreground/70"
                  initial={reduce ? false : { width: 0 }}
                  transition={spring}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

function TopProducts({ data }: { data: RangeData }) {
  const reduce = useReducedMotionAfterMount();
  const top = data.products.slice(0, 6);
  const max = Math.max(...top.map((p) => p.revenue));
  return (
    <Card
      action={
        <Button className={cn("-me-2 h-8 text-muted-foreground text-sm sm:h-8 sm:text-xs", pressable)} size="sm" variant="ghost">
          View all
          <ChevronRightIcon className="-me-0.5" />
        </Button>
      }
      className="@4xl:col-span-2"
      title="Top products"
    >
      <Table className="table-fixed">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-auto ps-0">Product</TableHead>
            <TableHead className="hidden w-20 text-right @md:table-cell">Units</TableHead>
            <TableHead className="w-24 text-right">Revenue</TableHead>
            <TableHead className="hidden w-36 @lg:table-cell">Share</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <AnimatePresence initial={false}>
            {top.map((p, i) => {
              const Icon = p.icon ?? PackageIcon;
              return (
                <motion.tr
                  className="border-b"
                  key={p.sku}
                  layout={!reduce}
                  transition={spring}
                >
                  <TableCell className="ps-0">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <Icon aria-hidden className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="truncate font-medium">{p.name}</div>
                        <div className="mt-1 font-mono text-[11px] text-muted-foreground">
                          #{i + 1} · {p.sku}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-right text-muted-foreground tabular-nums @md:table-cell">
                    <Rolling format={fmtInt} value={p.units} />
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    <Rolling format={fmtCompact} value={p.revenue} />
                  </TableCell>
                  <TableCell className="hidden @lg:table-cell">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <motion.div
                        animate={{ width: `${(p.revenue / max) * 100}%` }}
                        className="h-full rounded-full bg-foreground/70"
                        initial={reduce ? false : { width: 0 }}
                        transition={spring}
                      />
                    </div>
                  </TableCell>
                </motion.tr>
              );
            })}
          </AnimatePresence>
        </TableBody>
      </Table>
    </Card>
  );
}

function barPath(x: number, w: number, top: number, base: number) {
  const h = Math.max(0, base - top);
  const r = Math.min(4, w / 2, h);
  return `M${x},${base}L${x},${top + r}Q${x},${top} ${x + r},${top}L${x + w - r},${top}Q${x + w},${top} ${x + w},${top + r}L${x + w},${base}Z`;
}

function WeeklyTrend({ data }: { data: RangeData }) {
  const reduce = useReducedMotionAfterMount();
  const [ref, { width, height }] = useElementSize<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const H = Math.max(176, Math.round(height));
  const pad = { t: 8, b: 22 };
  const days = data.weekdays;
  const max = Math.max(...days.flatMap((d) => [d.current, d.previous])) * 1.12;
  const slot = width / days.length;
  const bw = Math.min(16, slot * 0.3);
  const base = H - pad.b;
  const y = (v: number) => pad.t + (1 - v / max) * (base - pad.t);
  const best = days.reduce((b, d, i) => (d.current > days[b].current ? i : b), 0);
  const cur = sum(days.map((d) => d.current));
  const prev = sum(days.map((d) => d.previous));

  return (
    <Card action={<DeltaChip value={cur / prev - 1} />} title="Average day">
      <div className="mb-2 flex items-center gap-3 text-muted-foreground text-xs">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px] bg-foreground/80" /> This period
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px] bg-foreground/20" /> Previous
        </span>
      </div>
      <div className="relative min-h-44 w-full flex-1" ref={ref}>
        {width > 0 && (
          <svg aria-label={`Average revenue by weekday; ${days[best].label} is busiest`} className="absolute inset-0" height={H} role="img" width={width}>
            <line className="stroke-border" x1={0} x2={width} y1={base} y2={base} />
            {days.map((d, i) => {
              const cx = slot * i + slot / 2;
              const dim = hover !== null && hover !== i;
              return (
                <g key={d.label} opacity={dim ? 0.45 : 1} style={{ transition: "opacity 150ms" }}>
                  <motion.path
                    animate={{ d: barPath(cx - bw - 1, bw, y(d.previous), base) }}
                    className="fill-foreground/20"
                    initial={reduce ? false : { d: barPath(cx - bw - 1, bw, base, base) }}
                    transition={reduce ? { duration: 0 } : { ...spring, delay: i * 0.025 }}
                  />
                  <motion.path
                    animate={{ d: barPath(cx + 1, bw, y(d.current), base) }}
                    className="fill-foreground/80"
                    initial={reduce ? false : { d: barPath(cx + 1, bw, base, base) }}
                    transition={reduce ? { duration: 0 } : { ...spring, delay: i * 0.025 + 0.02 }}
                  />
                  <text
                    className={cn("text-[10px]", i === best ? "fill-foreground font-medium" : "fill-muted-foreground")}
                    textAnchor="middle"
                    x={cx}
                    y={H - 6}
                  >
                    {d.label}
                  </text>
                  <rect
                    fill="transparent"
                    height={H}
                    onPointerEnter={(e) => e.pointerType === "mouse" && setHover(i)}
                    onPointerLeave={() => setHover(null)}
                    width={slot}
                    x={slot * i}
                    y={0}
                  />
                </g>
              );
            })}
          </svg>
        )}
        <AnimatePresence>
          {hover !== null && width > 0 && (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="pointer-events-none absolute top-0 z-10 w-36 rounded-xl border bg-popover p-2 text-xs shadow-xs/5"
              exit={{ opacity: 0, y: 4 }}
              initial={{ opacity: 0, y: 4 }}
              style={{ left: Math.min(Math.max(0, slot * hover + slot / 2 - 72), width - 144) }}
              transition={{ duration: 0.15 }}
            >
              <div className="mb-1 font-medium">{days[hover].label}</div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">This period</span>
                <span className="tabular-nums">{fmtCompact(days[hover].current)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Previous</span>
                <span className="tabular-nums">{fmtCompact(days[hover].previous)}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <p className="mt-2 text-muted-foreground text-xs">
        <span className="font-medium text-foreground">{days[best].label}</span> is your busiest day, averaging{" "}
        <span className="tabular-nums">{fmtCompact(days[best].current)}</span>.
      </p>
    </Card>
  );
}

const NAV: { label: string; icon: LucideIcon; count?: number }[] = [
  { label: "Overview", icon: LayoutDashboardIcon },
  { label: "Orders", icon: ShoppingBagIcon, count: 18 },
  { label: "Products", icon: PackageIcon },
  { label: "Customers", icon: UsersIcon },
  { label: "Channels", icon: StoreIcon },
  { label: "Reports", icon: FileChartColumnIcon },
];

function SidebarContent({
  store,
  user,
  active,
  onSelect,
}: {
  store: { name: string; plan: string };
  user: { name: string; email: string };
  active: string;
  onSelect: (label: string) => void;
}) {
  const navId = useId();
  const reduce = useReducedMotionAfterMount();
  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2);
  return (
    <div className="flex h-full flex-col gap-4 p-3">
      <div className="flex items-center gap-2.5 px-1.5 pt-1">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <StoreIcon aria-hidden className="size-4" />
        </span>
        <div className="min-w-0">
          <div className="truncate font-medium">{store.name}</div>
          <div className="text-muted-foreground text-xs">{store.plan}</div>
        </div>
      </div>
      <nav aria-label="Main" className="flex flex-col gap-0.5">
        {NAV.map((item) => {
          const on = item.label === active;
          return (
            <button
              aria-current={on ? "page" : undefined}
              className={cn(
                "relative flex h-8 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring",
                pressable,
                on ? "text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
              )}
              key={item.label}
              onClick={() => onSelect(item.label)}
              type="button"
            >
              {on && (
                <motion.span
                  className="absolute inset-0 -z-10 rounded-lg bg-accent"
                  layoutId={`${navId}-nav`}
                  transition={reduce ? { duration: 0 } : spring}
                />
              )}
              <item.icon aria-hidden className="size-4" />
              <span className="flex-1">{item.label}</span>
              {item.count !== undefined && (
                <span className="rounded-full bg-muted px-1.5 font-medium text-[10px] text-muted-foreground tabular-nums">{item.count}</span>
              )}
            </button>
          );
        })}
      </nav>
      <div className="mt-auto flex flex-col gap-3">
        <div className="rounded-xl border bg-card p-3">
          <div className="font-medium text-xs">Holiday forecast ready</div>
          <p className="mt-1 text-muted-foreground text-xs">Projected Nov–Dec revenue is up 22% on last year.</p>
        </div>
        <div className="flex items-center gap-2.5 px-1">
          <Avatar className="size-7">
            <AvatarFallback className="text-[11px]">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium text-xs">{user.name}</div>
            <div className="truncate text-[11px] text-muted-foreground">{user.email}</div>
          </div>
          <Button aria-label="Settings" className={cn("size-8 sm:size-8", pressable)} size="icon-sm" variant="ghost">
            <SettingsIcon />
          </Button>
        </div>
      </div>
    </div>
  );
}

function SectionEmpty({ label, icon: Icon, onBack }: { label: string; icon: LucideIcon; onBack: () => void }) {
  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="flex min-h-0 flex-1 flex-col p-4 @3xl:p-6"
      initial={{ opacity: 0, y: 4 }}
      transition={enter}
    >
      <h1 className="font-heading font-semibold text-xl tracking-tight">{label}</h1>
      <Empty className="mt-4 flex-1 rounded-2xl border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Icon />
          </EmptyMedia>
          <EmptyTitle className="font-semibold text-base">{label} opens in its own view</EmptyTitle>
          <EmptyDescription className="text-pretty">
            This preview only includes the revenue overview.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button className={cn("h-8 text-sm sm:h-8", pressable)} onClick={onBack} size="sm" variant="outline">
            Back to overview
          </Button>
        </EmptyContent>
      </Empty>
    </motion.div>
  );
}

export function RevenueOverview({
  className,
  store = { name: "Fernwood Goods", plan: "Growth plan" },
  user = { name: "Ines Moreau", email: "ines@fernwood.shop" },
  data = SAMPLE_DATA,
  defaultRange = "30d",
  activeNav,
  onNavigate,
}: RevenueOverviewProps) {
  const reduce = useReducedMotionAfterMount();
  const [range, setRange] = useState<RangeKey>(defaultRange);
  const [navState, setNavState] = useState("Overview");
  const nav = activeNav ?? navState;
  const section = NAV.find((item) => item.label === nav) ?? NAV[0];
  const [drawer, setDrawer] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const d = data[range];
  const rangeMeta = RANGES.find((r) => r.value === range) ?? RANGES[1];

  useEffect(() => {
    if (drawer) drawerRef.current?.focus();
  }, [drawer]);

  const kpis = useMemo(() => {
    const totals = d.labels.map((_, i) => sum(d.channels.map((c) => c.values[i])));
    const revenue = sum(totals);
    const orders = sum(d.orders);
    const sessions = sum(d.sessions);
    const p = d.previous;
    return [
      { label: "Revenue", value: revenue, format: fmtMoney, delta: revenue / p.revenue - 1, spark: totals },
      { label: "Orders", value: orders, format: fmtInt, delta: orders / p.orders - 1, spark: d.orders },
      {
        label: "Avg. order value",
        value: revenue / orders,
        format: fmtAov,
        delta: revenue / orders / (p.revenue / p.orders) - 1,
        spark: totals.map((t, i) => t / d.orders[i]),
      },
      {
        label: "Conversion",
        value: orders / sessions,
        format: fmtConv,
        delta: orders / sessions / (p.orders / p.sessions) - 1,
        spark: d.orders.map((o, i) => o / d.sessions[i]),
      },
    ];
  }, [d]);

  const sidebar = (
    <SidebarContent
      active={nav}
      onSelect={(label) => {
        setNavState(label);
        onNavigate?.(label);
        setDrawer(false);
      }}
      store={store}
      user={user}
    />
  );

  return (
    <div
      className={cn(
        "@container relative isolate flex h-[760px] w-full overflow-hidden bg-background text-foreground text-sm",
        className,
      )}
    >
      <aside className="hidden w-60 shrink-0 border-r bg-muted/40 @3xl:block">{sidebar}</aside>

      <AnimatePresence>
        {drawer && (
          <>
            <motion.div
              animate={{ opacity: 1 }}
              className="absolute inset-0 z-40 bg-black/32 @3xl:hidden"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              onClick={() => setDrawer(false)}
            />
            <motion.div
              animate={{ x: 0 }}
              aria-label="Navigation"
              aria-modal="true"
              className="absolute inset-y-0 left-0 z-50 w-64 max-w-[85%] border-r bg-background outline-none @3xl:hidden"
              exit={{ x: "-105%" }}
              initial={{ x: "-105%" }}
              onKeyDown={(e) => e.key === "Escape" && setDrawer(false)}
              ref={drawerRef}
              role="dialog"
              tabIndex={-1}
              transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 42 }}
            >
              {sidebar}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-12 shrink-0 items-center gap-2 border-b px-3 @3xl:hidden">
          <Button aria-expanded={drawer} aria-label="Open navigation" onClick={() => setDrawer(true)} size="icon-sm" variant="ghost">
            <MenuIcon />
          </Button>
          <span className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <StoreIcon aria-hidden className="size-3.5" />
          </span>
          <span className="flex-1 truncate font-medium">{store.name}</span>
          <Button aria-label="Notifications" size="icon-sm" variant="ghost">
            <BellIcon />
          </Button>
        </div>

        {section.label !== "Overview" ? (
          <SectionEmpty
            icon={section.icon}
            label={section.label}
            onBack={() => {
              setNavState("Overview");
              onNavigate?.("Overview");
            }}
          />
        ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="@container mx-auto flex max-w-6xl flex-col gap-4 p-4 @3xl:p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="min-w-0">
                <h1 className="font-heading font-semibold text-xl tracking-tight">Revenue</h1>
                <p className="mt-0.5 text-muted-foreground text-xs">
                  {rangeMeta.long} vs previous period · updated 2 min ago
                </p>
              </div>
              <div className="flex items-center gap-2">
                <RangeSwitch onChange={setRange} value={range} />
                <Menu>
                  <MenuTrigger render={<Button className={cn("h-9 text-sm sm:h-9", pressable)} size="sm" variant="outline" />}>
                    <DownloadIcon />
                    Export
                    <ChevronDownIcon className="-me-0.5 opacity-60" />
                  </MenuTrigger>
                  <MenuPopup align="end" className="min-w-52">
                    <MenuItem>
                      <FileSpreadsheetIcon />
                      Download CSV
                    </MenuItem>
                    <MenuItem>
                      <FileTextIcon />
                      Download PDF report
                    </MenuItem>
                    <MenuSeparator />
                    <MenuItem>
                      <MailIcon />
                      Email weekly digest
                    </MenuItem>
                  </MenuPopup>
                </Menu>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 @3xl:grid-cols-4">
              {kpis.map((k) => (
                <KpiCard delta={k.delta} format={k.format} key={k.label} label={k.label} spark={k.spark} value={k.value} />
              ))}
            </div>

            <div className="grid grid-cols-1 gap-3 @4xl:grid-cols-3">
              <ChannelChart data={d} range={range} />
              <ChannelMix data={d} />
            </div>

            <div className="grid grid-cols-1 gap-3 @4xl:grid-cols-3">
              <TopProducts data={d} />
              <WeeklyTrend data={d} />
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
