"use client";

import {
  ArrowDownRightIcon,
  ArrowUpRightIcon,
  ChartSplineIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClipboardIcon,
  DownloadIcon,
  HandshakeIcon,
  HouseIcon,
  type LucideIcon,
  MegaphoneIcon,
  PackageIcon,
  SettingsIcon,
  ShoppingBagIcon,
  TagIcon,
  TruckIcon,
  UsersIcon,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion, useSpring, useTransform } from "motion/react";
import {
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  type RefObject,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Menu, MenuItem, MenuPopup, MenuTrigger } from "@/components/ui/menu";
import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control";
import { Tooltip, TooltipPopup, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type RangeKey = "7d" | "30d" | "90d" | "12m";
export type MomentKind = "promo" | "pricing" | "partner" | "incident";

export interface RevenueDay {
  date: string;
  byChannel: Record<string, number>;
}

export interface RevenueChannel {
  key: string;
  label: string;
}

export interface RevenueMoment {
  id: string;
  date: string;
  endDate?: string;
  kind: MomentKind;
  title: string;
  short?: string;
  phrase?: string;
  note: string;
  channel?: string;
  weight?: number;
}

export interface RevenueStoryProps {
  days?: RevenueDay[];
  channels?: RevenueChannel[];
  moments?: RevenueMoment[];
  store?: { name: string; plan: string };
  user?: { name: string; email: string };
  defaultRange?: RangeKey;
  onRangeChange?: (range: RangeKey) => void;
  onNavigate?: (label: string) => void;
  className?: string;
}

const DAY = 86_400_000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const pad2 = (n: number) => String(n).padStart(2, "0");
function parseDay(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}
function isoOf(t: number) {
  const d = new Date(t);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}
function dayLabel(t: number, year?: number) {
  const d = new Date(t);
  const base = `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
  return year !== undefined && d.getUTCFullYear() !== year ? `${base}, ${d.getUTCFullYear()}` : base;
}
const yearOf = (t: number) => new Date(t).getUTCFullYear();

function mulberry32(seed: number) {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SAMPLE_CHANNELS: RevenueChannel[] = [
  { key: "store", label: "Online store" },
  { key: "wholesale", label: "Wholesale" },
  { key: "market", label: "Marketplaces" },
  { key: "social", label: "Social shop" },
];

const SAMPLE_MOMENTS: RevenueMoment[] = [
  {
    id: "spring-sale",
    date: "2025-04-24",
    endDate: "2025-04-28",
    kind: "promo",
    title: "Spring sale",
    phrase: "the spring sale",
    note: "20% off throws and bedding for five days, sent to the full list.",
    weight: 2,
  },
  {
    id: "marketplace-fees",
    date: "2025-06-02",
    kind: "pricing",
    channel: "market",
    title: "Marketplace fees went up",
    short: "Marketplace fees",
    note: "Listing fees rose to 9.5%, so marketplace prices went up to cover them.",
    weight: 2,
  },
  {
    id: "autumn-launch",
    date: "2025-09-23",
    endDate: "2025-09-29",
    kind: "promo",
    title: "Autumn collection launch",
    short: "Autumn launch",
    phrase: "the autumn launch",
    note: "Twelve new pieces in walnut and wool, launched with a lookbook email.",
    weight: 1,
  },
  {
    id: "starter-price",
    date: "2025-11-18",
    kind: "pricing",
    channel: "store",
    title: "Price change on Starter Set",
    short: "Starter Set price",
    note: "The Starter Set went from $68 to $58 to make it an easier first order.",
    weight: 2,
  },
  {
    id: "black-friday",
    date: "2025-11-28",
    endDate: "2025-12-01",
    kind: "promo",
    title: "Black Friday sale",
    short: "Black Friday",
    phrase: "the Black Friday sale",
    note: "25% off sitewide through Cyber Monday. Marketplaces ran the same discount.",
    weight: 3,
  },
  {
    id: "wholesale-partner",
    date: "2025-12-02",
    kind: "partner",
    channel: "wholesale",
    title: "Wholesale partner onboarded",
    short: "Wholesale partner",
    note: "Juniper & Pine took 14 lines for their four shops. The first order shipped on Dec 3.",
    weight: 3,
  },
  {
    id: "shipping-delay",
    date: "2025-12-08",
    endDate: "2025-12-10",
    kind: "incident",
    title: "Shipping delay",
    phrase: "the shipping delay",
    note: "A carrier backlog pushed delivery estimates to 6–8 days and checkout conversion fell.",
    weight: 3,
  },
  {
    id: "gift-guide",
    date: "2025-12-11",
    endDate: "2025-12-12",
    kind: "promo",
    title: "Gift guide email",
    short: "Gift guide",
    phrase: "the gift guide email",
    note: "The holiday gift guide went to 41,200 subscribers on Thursday morning.",
    weight: 2,
  },
];

const SAMPLE_EFFECTS: { from: string; to: string; on: string[]; by: number[] }[] = [
  { from: "2024-11-29", to: "2024-12-02", on: ["store", "market", "social"], by: [1.55, 1.28, 1.22, 1.38] },
  { from: "2025-04-24", to: "2025-04-28", on: ["store", "social"], by: [1.34, 1.26, 1.22, 1.2, 1.14] },
  { from: "2025-06-02", to: "2025-12-12", on: ["market"], by: [0.84] },
  { from: "2025-09-23", to: "2025-09-29", on: ["store"], by: [1.26, 1.18, 1.14, 1.1, 1.08, 1.06, 1.04] },
  { from: "2025-11-18", to: "2025-12-12", on: ["store"], by: [1.04] },
  { from: "2025-11-28", to: "2025-12-01", on: ["store", "market", "social"], by: [1.85, 1.42, 1.32, 1.56] },
  { from: "2025-12-02", to: "2025-12-12", on: ["wholesale"], by: [1.3, 3.6, 2.3] },
  { from: "2025-12-08", to: "2025-12-10", on: ["store", "market"], by: [0.72, 0.6, 0.78] },
  { from: "2025-12-11", to: "2025-12-12", on: ["store", "social"], by: [1.26, 1.12] },
];

function sampleDays(): RevenueDay[] {
  const rand = mulberry32(1128);
  const end = Date.UTC(2025, 11, 12);
  const count = 728;
  const season = [0.84, 0.82, 0.9, 0.95, 0.97, 0.93, 0.9, 0.92, 0.98, 1.02, 1.03, 1.06];
  const week = [1.03, 0.94, 0.96, 0.98, 1.0, 1.04, 1.07];
  const out: RevenueDay[] = [];
  for (let i = 0; i < count; i++) {
    const t = end - (count - 1 - i) * DAY;
    const date = isoOf(t);
    const d = new Date(t);
    const p = i / (count - 1);
    const level = 5400 * (1 + 0.36 * p) * season[d.getUTCMonth()] * week[d.getUTCDay()];
    const shares: Record<string, number> = {
      store: 0.5 - 0.03 * p,
      wholesale: 0.14,
      market: 0.28 - 0.05 * p,
      social: 0.08 + 0.07 * p,
    };
    const byChannel: Record<string, number> = {};
    for (const key of Object.keys(shares)) {
      let boost = 1;
      for (const e of SAMPLE_EFFECTS) {
        if (date < e.from || date > e.to || !e.on.includes(key)) continue;
        const offset = Math.round((t - parseDay(e.from)) / DAY);
        boost *= e.by[Math.min(offset, e.by.length - 1)];
      }
      const spread = key === "wholesale" ? 0.5 : 0.14;
      byChannel[key] = Math.round(level * shares[key] * boost * (1 + (rand() - 0.5) * spread));
    }
    out.push({ date, byChannel });
  }
  return out;
}

const SAMPLE_DAYS = sampleDays();

const RANGES: { value: RangeKey; label: string; long: string; buckets: number; step: number }[] = [
  { value: "7d", label: "7d", long: "Last 7 days", buckets: 7, step: 1 },
  { value: "30d", label: "30d", long: "Last 30 days", buckets: 30, step: 1 },
  { value: "90d", label: "90d", long: "Last 90 days", buckets: 90, step: 1 },
  { value: "12m", label: "12m", long: "Last 12 months", buckets: 52, step: 7 },
];

const KINDS: Record<MomentKind, { label: string; icon: LucideIcon; dot: string; band: string; stem: string; soft: string }> = {
  promo: {
    label: "Promotion",
    icon: MegaphoneIcon,
    dot: "fill-violet-500 dark:fill-violet-400",
    band: "fill-violet-500/8 dark:fill-violet-400/7",
    stem: "stroke-violet-500/50 dark:stroke-violet-400/50",
    soft: "bg-violet-500/12 text-violet-700 dark:bg-violet-400/15 dark:text-violet-300",
  },
  pricing: {
    label: "Pricing",
    icon: TagIcon,
    dot: "fill-sky-500 dark:fill-sky-400",
    band: "fill-sky-500/8 dark:fill-sky-400/7",
    stem: "stroke-sky-500/50 dark:stroke-sky-400/50",
    soft: "bg-sky-500/12 text-sky-700 dark:bg-sky-400/15 dark:text-sky-300",
  },
  partner: {
    label: "Partner",
    icon: HandshakeIcon,
    dot: "fill-teal-500 dark:fill-teal-400",
    band: "fill-teal-500/8 dark:fill-teal-400/7",
    stem: "stroke-teal-500/50 dark:stroke-teal-400/50",
    soft: "bg-teal-500/12 text-teal-700 dark:bg-teal-400/15 dark:text-teal-300",
  },
  incident: {
    label: "Incident",
    icon: TruckIcon,
    dot: "fill-amber-500 dark:fill-amber-400",
    band: "fill-amber-500/10 dark:fill-amber-400/7",
    stem: "stroke-amber-500/60 dark:stroke-amber-400/60",
    soft: "bg-amber-500/14 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300",
  },
};

const SHADES = ["bg-foreground", "bg-foreground/55", "bg-foreground/32", "bg-foreground/16"];

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const money = (n: number) => usd.format(Math.round(n));
function compact(n: number) {
  const a = Math.abs(n);
  if (a >= 1e6) return `$${(a / 1e6).toFixed(2)}M`;
  if (a >= 1e3) return `$${(a / 1e3).toFixed(1)}k`;
  return `$${Math.round(a)}`;
}
const signed = (n: number) => `${n < 0 ? "−" : "+"}${compact(n)}`;
const percent = (n: number) => `${n < 0 ? "−" : "+"}${Math.abs(n * 100).toFixed(0)}%`;
const tone = (n: number) => (n < 0 ? "text-destructive-foreground" : "text-success-foreground");
function axisMoney(v: number) {
  if (v >= 1e6) return `$${+(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${+(v / 1e3).toFixed(1)}k`;
  return `$${v}`;
}
const totalOf = (day: RevenueDay) => Object.values(day.byChannel).reduce((a, b) => a + b, 0);

const ease = [0.23, 1, 0.32, 1] as const;
const pressable = "transition-[color,background-color,scale] duration-150 ease-out active:scale-[0.97]";

function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

function useReducedMotionAfterMount() {
  const prefers = useReducedMotion();
  return useMounted() && Boolean(prefers);
}

function useElementSize<T extends HTMLElement>(): [RefObject<T | null>, { width: number; height: number }] {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setSize({ width: el.clientWidth, height: el.clientHeight });
    const ro = new ResizeObserver(([entry]) =>
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height }),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size];
}

function useTextWidth(ref: RefObject<HTMLElement | null>, ready: boolean) {
  const [measure, setMeasure] = useState<((text: string, weight: number) => number) | null>(null);
  useEffect(() => {
    if (!ready || !ref.current) return;
    const ctx = document.createElement("canvas").getContext("2d");
    const family = getComputedStyle(ref.current).fontFamily;
    if (!ctx) return;
    setMeasure(() => (text: string, weight: number) => {
      ctx.font = `${weight} 12px ${family}`;
      return ctx.measureText(text).width;
    });
  }, [ready, ref]);
  return measure;
}

interface Bucket {
  t: number;
  value: number;
  prev: number | null;
  prevT: number;
}

interface Impact {
  change: number;
  text: string;
}

interface PlacedMoment extends RevenueMoment {
  i0: number;
  i1: number;
  impact: Impact | null;
}

interface ChannelRow {
  key: string;
  label: string;
  total: number;
  prev: number;
}

interface Model {
  range: RangeKey;
  step: number;
  buckets: Bucket[];
  start: number;
  end: number;
  prevStart: number | null;
  prevEnd: number | null;
  total: number;
  prevTotal: number | null;
  channels: ChannelRow[];
  moments: PlacedMoment[];
}

function impactOf(m: RevenueMoment, days: RevenueDay[], index: Map<string, number>, channels: RevenueChannel[]): Impact | null {
  const a = index.get(m.date);
  if (a === undefined) return null;
  if (m.channel) {
    const w = Math.min(14, days.length - a, a);
    if (w < 1) return null;
    let after = 0;
    let before = 0;
    for (let k = 0; k < w; k++) {
      after += days[a + k].byChannel[m.channel] ?? 0;
      before += days[a - w + k].byChannel[m.channel] ?? 0;
    }
    if (!before) return null;
    const label = channels.find((c) => c.key === m.channel)?.label ?? m.channel;
    return {
      change: after / before - 1,
      text: `${label} has averaged ${compact(after / w)} a day since, up from ${compact(before / w)}.`,
    };
  }
  const b = Math.min(index.get(m.endDate ?? m.date) ?? a, days.length - 1);
  const len = b - a + 1;
  if (a - len < 0) return null;
  let cur = 0;
  let prev = 0;
  for (let k = 0; k < len; k++) {
    cur += totalOf(days[a + k]);
    prev += totalOf(days[a - len + k]);
  }
  if (!prev) return null;
  const span = len === 1 ? "that day" : `over ${len} days`;
  const before = len === 1 ? "the day before" : `the ${len} days before`;
  return { change: cur / prev - 1, text: `${compact(cur)} ${span}, against ${compact(prev)} ${before}.` };
}

function buildModel(
  days: RevenueDay[],
  channels: RevenueChannel[],
  moments: RevenueMoment[],
  index: Map<string, number>,
  impacts: Map<string, Impact | null>,
  range: RangeKey,
): Model {
  const spec = RANGES.find((r) => r.value === range) ?? RANGES[1];
  const step = spec.step;
  const n = Math.max(1, Math.min(spec.buckets, Math.floor(days.length / step)));
  const span = n * step;
  const endIdx = days.length;
  const startIdx = Math.max(0, endIdx - span);
  const prevIdx = startIdx - span;
  const sumDays = (from: number, to: number) => {
    let s = 0;
    for (let k = from; k < to; k++) s += totalOf(days[k]);
    return s;
  };
  const buckets: Bucket[] = Array.from({ length: n }, (_, b) => {
    const s = startIdx + b * step;
    const t = parseDay(days[s].date);
    return {
      t,
      value: sumDays(s, s + step),
      prev: prevIdx >= 0 ? sumDays(s - span, s - span + step) : null,
      prevT: t - span * DAY,
    };
  });
  const rows = channels.map((c) => {
    let total = 0;
    let prev = 0;
    for (let k = startIdx; k < endIdx; k++) total += days[k].byChannel[c.key] ?? 0;
    if (prevIdx >= 0) for (let k = prevIdx; k < startIdx; k++) prev += days[k].byChannel[c.key] ?? 0;
    return { key: c.key, label: c.label, total, prev };
  });
  const placed: PlacedMoment[] = [];
  for (const m of moments) {
    const a = index.get(m.date);
    if (a === undefined) continue;
    const b = index.get(m.endDate ?? m.date) ?? a;
    if (b < startIdx || a >= endIdx) continue;
    placed.push({
      ...m,
      i0: Math.floor((Math.max(a, startIdx) - startIdx) / step),
      i1: Math.floor((Math.min(b, endIdx - 1) - startIdx) / step),
      impact: impacts.get(m.id) ?? null,
    });
  }
  placed.sort((x, y) => x.i0 - y.i0);
  const total = buckets.reduce((s, b) => s + b.value, 0);
  return {
    range,
    step,
    buckets,
    start: parseDay(days[startIdx].date),
    end: parseDay(days[endIdx - 1].date),
    prevStart: prevIdx >= 0 ? parseDay(days[prevIdx].date) : null,
    prevEnd: prevIdx >= 0 ? parseDay(days[startIdx - 1].date) : null,
    total,
    prevTotal: prevIdx >= 0 ? buckets.reduce((s, b) => s + (b.prev ?? 0), 0) : null,
    channels: rows,
    moments: placed,
  };
}

function bucketLabel(model: Model, t: number, long = false) {
  if (model.step === 7) return `${long ? "Week of " : "week of "}${dayLabel(t, yearOf(model.end))}`;
  const label = dayLabel(t, yearOf(model.end));
  return long ? `${WEEKDAYS[new Date(t).getUTCDay()]}, ${label}` : label;
}

function momentDates(m: RevenueMoment) {
  const a = parseDay(m.date);
  if (!m.endDate || m.endDate === m.date) return dayLabel(a);
  return `${dayLabel(a)} – ${dayLabel(parseDay(m.endDate))}`;
}

function momentAt(model: Model, i: number) {
  return model.moments
    .filter((m) => m.phrase && i >= m.i0 && i <= m.i1)
    .sort((a, b) => (b.weight ?? 1) - (a.weight ?? 1))[0];
}

function tangents(ys: number[]) {
  const n = ys.length;
  const m = new Array<number>(n).fill(0);
  if (n < 2) return m;
  const d = ys.slice(1).map((y, i) => y - ys[i]);
  m[0] = d[0];
  m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / d[i];
    const b = m[i + 1] / d[i];
    const s = a * a + b * b;
    if (s > 9) {
      const k = 3 / Math.sqrt(s);
      m[i] = k * a * d[i];
      m[i + 1] = k * b * d[i];
    }
  }
  return m;
}

const SAMPLES = 271;

function resample(values: number[]): { at: number; v: number }[] {
  const n = values.length;
  if (n < 2) return Array.from({ length: SAMPLES }, () => ({ at: 0, v: values[0] ?? 0 }));
  const m = tangents(values);
  const total = SAMPLES - 1;
  const out: { at: number; v: number }[] = [];
  for (let j = 0; j < n - 1; j++) {
    const sub = Math.floor(((j + 1) * total) / (n - 1)) - Math.floor((j * total) / (n - 1));
    for (let k = 0; k < sub; k++) {
      const u = k / sub;
      const u2 = u * u;
      const u3 = u2 * u;
      out.push({
        at: j + u,
        v: (2 * u3 - 3 * u2 + 1) * values[j] + (u3 - 2 * u2 + u) * m[j] + (-2 * u3 + 3 * u2) * values[j + 1] + (u3 - u2) * m[j + 1],
      });
    }
  }
  out.push({ at: n - 1, v: values[n - 1] });
  return out;
}

function niceTicks(max: number) {
  const raw = Math.max(max, 1) / 4;
  const exp = 10 ** Math.floor(Math.log10(raw));
  const f = raw / exp;
  const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * exp;
  const count = Math.ceil(max / step);
  return Array.from({ length: count + 1 }, (_, k) => k * step);
}

function axisTicks(model: Model, plotW: number) {
  const n = model.buckets.length;
  const room = Math.max(3, Math.floor(plotW / 72));
  if (model.step === 7) {
    const starts = model.buckets
      .map((b, i) => ({ i, m: new Date(b.t).getUTCMonth() }))
      .filter((b, k, all) => k > 0 && b.m !== all[k - 1].m)
      .map((b) => b.i);
    const every = Math.max(1, Math.ceil(starts.length / room));
    return starts.filter((_, k) => (starts.length - 1 - k) % every === 0);
  }
  const every = Math.max(1, Math.ceil((n - 1) / (room - 1)));
  const out: number[] = [];
  for (let i = n - 1; i >= 0; i -= every) out.unshift(i);
  return out;
}

function placeChips(
  items: { id: string; x: number; weight: number; full: number }[],
  left: number,
  right: number,
  rows: number,
  labels: boolean,
) {
  const taken: [number, number][][] = Array.from({ length: rows }, () => []);
  const out = new Map<string, { left: number; row: number; compact: boolean }>();
  const order = [...items].sort((a, b) => b.weight - a.weight || a.x - b.x);
  for (const item of order) {
    const widths = labels ? [item.full, 24] : [24];
    let done = false;
    for (const w of widths) {
      for (let row = 0; row < rows && !done; row++) {
        const l = Math.min(Math.max(item.x - w / 2, left), right - w);
        if (taken[row].every(([a, b]) => l + w + 6 <= a || l >= b + 6)) {
          taken[row].push([l, l + w]);
          out.set(item.id, { left: l, row, compact: w === 24 });
          done = true;
        }
      }
      if (done) break;
    }
  }
  return out;
}

function Rolling({ value, format, className }: { value: number; format: (n: number) => string; className?: string }) {
  const reduce = useReducedMotionAfterMount();
  const spring = useSpring(value, { stiffness: 240, damping: 34 });
  const text = useTransform(spring, (v) => format(v));
  useEffect(() => {
    if (reduce) spring.jump(value);
    else spring.set(value);
  }, [value, reduce, spring]);
  return <motion.span className={cn("tabular-nums", className)}>{text}</motion.span>;
}

function RangeSwitch({ value, onChange }: { value: RangeKey; onChange: (v: RangeKey) => void }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const index = Math.max(
    0,
    RANGES.findIndex((r) => r.value === value),
  );
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, number> = {
      ArrowRight: index + 1,
      ArrowDown: index + 1,
      ArrowLeft: index - 1,
      ArrowUp: index - 1,
      Home: 0,
      End: RANGES.length - 1,
    };
    if (!(e.key in moves)) return;
    e.preventDefault();
    const next = (moves[e.key] + RANGES.length) % RANGES.length;
    onChange(RANGES[next].value);
    refs.current[next]?.focus();
  };
  return (
    <SegmentedControl aria-label="Date range" onKeyDown={onKeyDown} role="radiogroup" size="sm">
      {RANGES.map((r, i) => {
        const checked = r.value === value;
        return (
          <SegmentedControlItem
            aria-checked={checked}
            aria-label={r.long}
            className="min-w-11 px-2.5 text-muted-foreground text-xs tabular-nums focus-visible:ring-2 focus-visible:ring-ring"
            data-checked={checked ? "" : undefined}
            key={r.value}
            onClick={() => onChange(r.value)}
            ref={(el: HTMLButtonElement | null) => {
              refs.current[i] = el;
            }}
            role="radio"
            tabIndex={checked ? 0 : -1}
          >
            {r.label}
          </SegmentedControlItem>
        );
      })}
    </SegmentedControl>
  );
}

function Highlight({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("font-semibold text-foreground", className)}>{children}</span>;
}

function Summary({ model }: { model: Model }) {
  const change = model.prevTotal === null ? null : model.total - model.prevTotal;
  const gains = model.channels.map((c) => ({ label: c.label, delta: c.total - c.prev }));
  const lead = change === null ? null : [...gains].sort((a, b) => (change >= 0 ? b.delta - a.delta : a.delta - b.delta))[0];
  const most = lead && change ? lead.delta / change >= 0.5 : false;
  const unit = model.step === 7 ? "week" : "day";
  const values = model.buckets.map((b) => b.value);
  const best = values.indexOf(Math.max(...values));
  const worst = values.indexOf(Math.min(...values));
  const bestMoment = momentAt(model, best);
  const worstMoment = momentAt(model, worst);
  const when = (i: number) => (model.step === 7 ? `the ${bucketLabel(model, model.buckets[i].t)}` : bucketLabel(model, model.buckets[i].t));

  return (
    <div className="min-w-0 @3xl:min-h-24">
      <p className="max-w-[46rem] text-balance font-heading text-[22px] text-muted-foreground leading-[1.3] tracking-[-0.015em] @3xl:text-[27px] @3xl:leading-[1.25]">
        <Highlight>
          <Rolling format={money} value={model.total} />
        </Highlight>{" "}
        this period
        {change !== null && lead ? (
          <>
            ,{" "}
            <Highlight className={tone(change)}>
              {change < 0 ? "down" : "up"} <Rolling format={compact} value={Math.abs(change)} />
            </Highlight>{" "}
            on the last one — {most ? (change < 0 ? "mostly from" : "most of it from") : "led by"}{" "}
            <Highlight>{lead.label}</Highlight>.
          </>
        ) : (
          "."
        )}
      </p>
      <p className="mt-2 text-pretty text-muted-foreground text-sm">
        Best {unit} was <span className="font-medium text-foreground">{when(best)}</span> at{" "}
        <span className="font-medium text-foreground tabular-nums">{compact(values[best])}</span>
        {bestMoment ? `, during ${bestMoment.phrase}` : ""}. Slowest was{" "}
        <span className="font-medium text-foreground">{when(worst)}</span> at{" "}
        <span className="font-medium text-foreground tabular-nums">{compact(values[worst])}</span>
        {worstMoment ? `, during ${worstMoment.phrase}` : ""}.
      </p>
    </div>
  );
}

interface MomentHandlers {
  openId: string | null;
  pinnedId: string | null;
  onHover: (id: string | null) => void;
  onFocus: (id: string | null) => void;
  onToggle: (id: string) => void;
}

function KindIcon({ kind, className }: { kind: MomentKind; className?: string }) {
  const k = KINDS[kind];
  return (
    <span aria-hidden className={cn("flex shrink-0 items-center justify-center rounded-full", k.soft, className)}>
      <k.icon className="size-[0.7rem]" strokeWidth={2.25} />
    </span>
  );
}

function StoryChart({ model, handlers, cardId }: { model: Model; handlers: MomentHandlers; cardId: string }) {
  const mounted = useMounted();
  const reduce = useReducedMotionAfterMount();
  const clipId = `reveal-${useId().replace(/:/g, "")}`;
  const fadeId = `fade-${useId().replace(/:/g, "")}`;
  const [surfaceRef, size] = useElementSize<HTMLDivElement>();
  const ready = mounted && size.width > 0 && size.height > 0;
  const measure = useTextWidth(surfaceRef, ready);
  const [scrub, setScrub] = useState<{ range: RangeKey; i: number } | null>(null);
  const [focused, setFocused] = useState(false);

  const { buckets } = model;
  const n = buckets.length;
  const width = size.width;
  const height = size.height;
  const wide = width >= 560;
  const rows = wide ? 2 : 1;
  const pad = { l: 44, r: 12, t: wide ? 74 : 44, b: 28 };
  const plotW = Math.max(1, width - pad.l - pad.r);
  const base = Math.max(pad.t + 1, height - pad.b);
  const plotH = base - pad.t;
  const values = useMemo(() => buckets.map((b) => b.value), [buckets]);
  const prevValues = useMemo(() => (buckets.every((b) => b.prev !== null) ? buckets.map((b) => b.prev ?? 0) : null), [buckets]);
  const ticks = niceTicks(Math.max(...values, ...(prevValues ?? [0])) * 1.04);
  const top = ticks[ticks.length - 1] || 1;
  const x = (i: number) => pad.l + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const y = (v: number) => base - (v / top) * plotH;
  const morph = reduce ? { duration: 0 } : ({ type: "spring", visualDuration: 0.38, bounce: 0 } as const);

  const samples = useMemo(() => resample(values), [values]);
  const prevSamples = useMemo(() => (prevValues ? resample(prevValues) : null), [prevValues]);
  const toPath = (pts: { at: number; v: number }[]) =>
    pts.map((p, k) => `${k ? "L" : "M"}${x(p.at).toFixed(1)},${y(p.v).toFixed(1)}`).join("");
  const line = toPath(samples);
  const area = `${line}L${x(n - 1).toFixed(1)},${base}L${x(0).toFixed(1)},${base}Z`;
  const prevLine = prevSamples ? toPath(prevSamples) : null;

  const open = model.moments.find((m) => m.id === handlers.openId) ?? null;
  const scrubIndex = scrub && scrub.range === model.range ? Math.min(scrub.i, n - 1) : null;
  const active = scrubIndex ?? open?.i0 ?? n - 1;
  const showCrosshair = scrubIndex !== null || open !== null;
  const bucket = buckets[active];
  const delta = bucket.prev ? bucket.value / bucket.prev - 1 : null;
  const here = model.moments.filter((m) => active >= m.i0 && active <= m.i1);
  const label = bucketLabel(model, bucket.t, true);
  const prevLabel = model.step === 7 ? bucketLabel(model, bucket.prevT) : dayLabel(bucket.prevT, yearOf(model.end));
  const widest = money(Math.max(...values)).length;

  const chipText = (m: PlacedMoment) => ({ label: m.short ?? m.title, delta: m.impact ? percent(m.impact.change) : "" });
  const placement = useMemo(() => {
    if (!ready) return new Map<string, { left: number; row: number; compact: boolean }>();
    const items = model.moments.map((m) => {
      const t = chipText(m);
      const textW = measure ? measure(t.label, 500) + measure(t.delta, 400) : (t.label.length + t.delta.length) * 6.6;
      return { id: m.id, x: x(m.i0), weight: m.weight ?? 1, full: Math.ceil(textW + 46) };
    });
    return placeChips(items, pad.l - 10, width - 2, rows, wide);
  }, [ready, model, measure, width, rows, wide]);

  const xTicks = ready ? axisTicks(model, plotW) : [];
  const valueText = `${label}: ${money(bucket.value)}${delta !== null ? `, ${delta < 0 ? "down" : "up"} ${Math.abs(delta * 100).toFixed(0)}% on ${prevLabel}` : ""}`;

  const indexAt = (e: PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const scale = rect.width / (width || 1);
    const px = (e.clientX - rect.left) / (scale || 1);
    return Math.min(n - 1, Math.max(0, Math.round(((px - pad.l) / plotW) * (n - 1))));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const jump = e.shiftKey ? 7 : 1;
    const moves: Record<string, number> = {
      ArrowRight: active + jump,
      ArrowUp: active + jump,
      ArrowLeft: active - jump,
      ArrowDown: active - jump,
      PageUp: active + 7,
      PageDown: active - 7,
      Home: 0,
      End: n - 1,
    };
    if (e.key === "Escape") {
      setScrub(null);
      return;
    }
    if (!(e.key in moves)) return;
    e.preventDefault();
    setScrub({ range: model.range, i: Math.min(n - 1, Math.max(0, moves[e.key])) });
  };

  const cardW = wide ? 248 : Math.max(0, width - 8);
  const cardX = open ? x(open.i0) : 0;
  const cardRight = cardX + 14 + cardW <= width - 4;
  const cardLeft = wide ? (cardRight ? cardX + 14 : Math.max(4, cardX - 14 - cardW)) : 4;
  const cardTop = pad.t + 2;

  return (
    <section aria-label="Revenue chart" className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <div className="flex h-5 min-w-0 items-center gap-2 text-muted-foreground text-xs">
            <span className="shrink-0 tabular-nums">{showCrosshair || focused ? label : `Latest · ${label}`}</span>
            {here[0] && (
              <span className={cn("inline-flex h-5 min-w-0 items-center gap-1 rounded-full ps-0.5 pe-2 font-medium", KINDS[here[0].kind].soft)}>
                <KindIcon className="size-4 bg-transparent" kind={here[0].kind} />
                <span className="truncate">{here[0].title}</span>
              </span>
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span
              className="font-heading font-semibold text-[28px] leading-none tracking-[-0.02em] tabular-nums"
              style={{ minWidth: `${widest * 0.6}em` }}
            >
              {money(bucket.value)}
            </span>
            {delta !== null && bucket.prev !== null && (
              <span className="inline-flex items-center gap-1 text-xs tabular-nums">
                <span className={cn("inline-flex items-center gap-0.5 font-medium", tone(delta))}>
                  {delta < 0 ? <ArrowDownRightIcon aria-hidden className="size-3.5" /> : <ArrowUpRightIcon aria-hidden className="size-3.5" />}
                  {percent(delta)}
                </span>
                <span className="text-muted-foreground">
                  vs {prevLabel} · {money(bucket.prev)}
                </span>
              </span>
            )}
          </div>
        </div>
        <div aria-hidden className="flex items-center gap-4 pb-0.5 text-muted-foreground text-xs">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded-full bg-foreground" />
            This period
          </span>
          {prevValues && (
            <span className="inline-flex items-center gap-1.5">
              <svg className="h-0.5 w-4 overflow-visible" viewBox="0 0 16 2">
                <line className="stroke-muted-foreground/70" strokeDasharray="3 3" strokeWidth={1.5} x1={0} x2={16} y1={1} y2={1} />
              </svg>
              Previous period
            </span>
          )}
        </div>
      </div>

      <div
        className="relative mt-3 h-[300px] min-h-0 w-full @4xl:h-auto @4xl:min-h-[260px] @4xl:flex-1"
        onKeyDown={(e) => {
          if (e.key === "Escape" && handlers.pinnedId) handlers.onToggle(handlers.pinnedId);
        }}
      >
        <div
          aria-label="Scrub revenue"
          aria-valuemax={n - 1}
          aria-valuemin={0}
          aria-valuenow={active}
          aria-valuetext={valueText}
          className="absolute inset-0 cursor-crosshair touch-pan-y rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onBlur={() => {
            setFocused(false);
            setScrub(null);
          }}
          onFocus={() => setFocused(true)}
          onKeyDown={onKeyDown}
          onPointerDown={(e) => {
            if (handlers.pinnedId) handlers.onToggle(handlers.pinnedId);
            setScrub({ range: model.range, i: indexAt(e) });
          }}
          onPointerLeave={() => setScrub(null)}
          onPointerMove={(e) => setScrub({ range: model.range, i: indexAt(e) })}
          ref={surfaceRef}
          role="slider"
          tabIndex={0}
        >
          {ready && (
            <svg aria-hidden className="absolute inset-0 overflow-visible" height={height} width={width}>
              <defs>
                <clipPath id={clipId}>
                  <motion.rect
                    animate={{ width: width + 8 }}
                    height={height + 8}
                    initial={{ width: reduce ? width + 8 : 0 }}
                    transition={reduce ? { duration: 0 } : { duration: 0.7, ease }}
                    x={-4}
                    y={-4}
                  />
                </clipPath>
                <linearGradient id={fadeId} x1="0" x2="0" y1="0" y2="1">
                  <stop className="[stop-color:var(--color-foreground)]" offset="0%" stopOpacity={0.09} />
                  <stop className="[stop-color:var(--color-foreground)]" offset="100%" stopOpacity={0} />
                </linearGradient>
              </defs>

              {model.moments
                .filter((m) => m.endDate && m.endDate !== m.date)
                .map((m) => {
                  const half = n > 1 ? plotW / (n - 1) / 2 : plotW / 2;
                  const left = Math.max(pad.l, x(m.i0) - half);
                  const right = Math.min(pad.l + plotW, x(m.i1) + half);
                  return (
                    <motion.rect
                      animate={{ x: left, width: Math.max(2, right - left), opacity: 1 }}
                      className={KINDS[m.kind].band}
                      height={plotH}
                      initial={{ x: left, width: Math.max(2, right - left), opacity: 0 }}
                      key={`band-${m.id}`}
                      rx={4}
                      transition={{ x: morph, width: morph, opacity: { duration: 0.2 } }}
                      y={pad.t}
                    />
                  );
                })}

              {ticks.map((v, k) => (
                <motion.g animate={{ y: y(v) }} initial={false} key={`tick-${k}`} transition={morph}>
                  <line
                    className={k === 0 ? "stroke-border" : "stroke-border/70"}
                    strokeDasharray={k === 0 ? undefined : "2 4"}
                    x1={pad.l}
                    x2={width - pad.r}
                    y1={0}
                    y2={0}
                  />
                  <text className="fill-muted-foreground text-[10px] tabular-nums" dominantBaseline="middle" textAnchor="end" x={pad.l - 10} y={0}>
                    {axisMoney(v)}
                  </text>
                </motion.g>
              ))}

              {xTicks.map((i) => {
                const px = x(i);
                const anchor = i === n - 1 && n > 1 ? "end" : px - 24 < pad.l ? "start" : "middle";
                const t = buckets[i].t;
                return (
                  <motion.text
                    animate={{ opacity: 1 }}
                    className="fill-muted-foreground text-[10px] tabular-nums"
                    initial={{ opacity: 0 }}
                    key={`${model.range}-${i}`}
                    textAnchor={anchor}
                    transition={{ duration: reduce ? 0 : 0.18 }}
                    x={px}
                    y={height - 8}
                  >
                    {model.step === 7 ? MONTHS[new Date(t + 6 * DAY).getUTCMonth()] : dayLabel(t)}
                  </motion.text>
                );
              })}

              <g clipPath={`url(#${clipId})`}>
                {prevLine && (
                  <motion.path
                    animate={{ d: prevLine }}
                    className="fill-none stroke-muted-foreground/55"
                    initial={false}
                    strokeDasharray="3 4"
                    strokeLinecap="round"
                    strokeWidth={1.5}
                    transition={morph}
                  />
                )}
                <motion.path animate={{ d: area }} fill={`url(#${fadeId})`} initial={false} transition={morph} />
                <motion.path
                  animate={{ d: line }}
                  className="fill-none stroke-foreground"
                  initial={false}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  transition={morph}
                />
              </g>

              {model.moments.map((m) => {
                const spot = placement.get(m.id);
                const cx = x(m.i0);
                const cy = y(values[m.i0]);
                const settle = { duration: reduce ? 0 : 0.2, delay: reduce ? 0 : 0.36 };
                return (
                  <motion.g animate={{ opacity: 1 }} initial={{ opacity: 0 }} key={`mark-${model.range}-${m.id}`} transition={settle}>
                    {spot && <line className={KINDS[m.kind].stem} strokeDasharray="2 3" x1={cx} x2={cx} y1={spot.row * 30 + 28} y2={cy - 7} />}
                    <circle className={cn("stroke-background", KINDS[m.kind].dot)} cx={cx} cy={cy} r={spot ? 4.5 : 3.5} strokeWidth={2} />
                  </motion.g>
                );
              })}

              {showCrosshair ? (
                <g>
                  <line className="stroke-foreground/25" x1={x(active)} x2={x(active)} y1={pad.t - 4} y2={base} />
                  {prevValues && (
                    <circle className="fill-background stroke-muted-foreground" cx={x(active)} cy={y(prevValues[active])} r={3} strokeWidth={1.5} />
                  )}
                  <circle className="fill-foreground stroke-background" cx={x(active)} cy={y(values[active])} r={4.5} strokeWidth={2} />
                </g>
              ) : (
                <motion.circle
                  animate={{ opacity: 1 }}
                  className="fill-foreground stroke-background"
                  cx={x(n - 1)}
                  cy={y(values[n - 1])}
                  initial={{ opacity: 0 }}
                  key={`end-${model.range}`}
                  r={4}
                  strokeWidth={2}
                  transition={{ duration: reduce ? 0 : 0.2, delay: reduce ? 0 : 0.36 }}
                />
              )}
            </svg>
          )}
        </div>

        <AnimatePresence initial={!reduce}>
          {ready &&
            model.moments.map((m) => {
              const spot = placement.get(m.id);
              if (!spot) return null;
              const text = chipText(m);
              const isOpen = handlers.openId === m.id;
              return (
                <motion.button
                  animate={{ x: spot.left, y: spot.row * 30 + 4, opacity: 1, scale: 1 }}
                  aria-controls={isOpen ? cardId : undefined}
                  aria-expanded={isOpen}
                  aria-label={`Chart note: ${m.title}, ${momentDates(m)}`}
                  className={cn(
                    "absolute top-0 left-0 z-10 inline-flex h-6 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border bg-background text-xs shadow-xs/5 outline-none before:absolute before:-inset-x-1 before:-inset-y-1 focus-visible:ring-2 focus-visible:ring-ring",
                    "transition-[background-color,border-color,scale] duration-150 ease-out active:scale-[0.97] [@media(hover:hover)]:hover:bg-accent",
                    spot.compact ? "w-6 justify-center" : "ps-[3px] pe-2",
                    isOpen && "border-foreground/25 bg-accent",
                  )}
                  exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.12 } }}
                  initial={{ x: spot.left, y: spot.row * 30 + 4, opacity: 0, scale: 0.95 }}
                  key={m.id}
                  onBlur={() => handlers.onFocus(null)}
                  onClick={() => handlers.onToggle(m.id)}
                  onFocus={() => handlers.onFocus(m.id)}
                  onPointerEnter={(e) => e.pointerType === "mouse" && handlers.onHover(m.id)}
                  onPointerLeave={() => handlers.onHover(null)}
                  transition={{
                    x: morph,
                    y: morph,
                    opacity: { duration: 0.18, delay: reduce ? 0 : 0.45 },
                    scale: { duration: 0.18, ease, delay: reduce ? 0 : 0.45 },
                  }}
                  type="button"
                >
                  <KindIcon className="size-4" kind={m.kind} />
                  {!spot.compact && (
                    <>
                      <span className="font-medium">{text.label}</span>
                      {text.delta && <span className="text-muted-foreground tabular-nums">{text.delta}</span>}
                    </>
                  )}
                </motion.button>
              );
            })}
        </AnimatePresence>

        <AnimatePresence>
          {ready && open && (
            <motion.div
              animate={{ opacity: 1, scale: 1, x: cardLeft, y: cardTop }}
              className="pointer-events-none absolute top-0 left-0 z-20 rounded-xl border bg-popover p-3 text-popover-foreground shadow-lg/5"
              exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.12 } }}
              id={cardId}
              initial={{ opacity: 0, scale: 0.97, x: cardLeft, y: cardTop }}
              key="note"
              role="note"
              style={{ width: cardW, originX: wide ? (cardRight ? 0 : 1) : 0.5, originY: 0 }}
              transition={reduce ? { duration: 0 } : { duration: 0.16, ease, x: { type: "spring", visualDuration: 0.2, bounce: 0 } }}
            >
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <KindIcon className="size-5" kind={open.kind} />
                <span>{KINDS[open.kind].label}</span>
                <span aria-hidden>·</span>
                <span className="tabular-nums">{momentDates(open)}</span>
              </div>
              <p className="mt-2 font-medium text-sm">{open.title}</p>
              <p className="mt-1 text-pretty text-muted-foreground text-xs leading-relaxed">{open.note}</p>
              {open.impact && (
                <div className="mt-2.5 flex items-start justify-between gap-3 border-t pt-2.5 text-xs">
                  <span className="text-pretty text-muted-foreground">{open.impact.text}</span>
                  <span className={cn("shrink-0 font-medium tabular-nums", tone(open.impact.change))}>{percent(open.impact.change)}</span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

function Breakdown({ model }: { model: Model }) {
  const titleId = useId();
  const reduce = useReducedMotionAfterMount();
  const [hover, setHover] = useState<string | null>(null);
  const ranked = [...model.channels].sort((a, b) => b.total - a.total);
  const total = ranked.reduce((s, c) => s + c.total, 0) || 1;
  const hasPrev = model.prevTotal !== null;
  return (
    <section aria-labelledby={titleId} className="min-w-0">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-medium text-sm" id={titleId}>
          Where it came from
        </h2>
        {hasPrev && <span className="text-muted-foreground text-xs">vs last period</span>}
      </div>
      <div
        aria-label={`Share of revenue: ${ranked.map((c) => `${c.label} ${Math.round((c.total / total) * 100)}%`).join(", ")}`}
        className="mt-3 flex h-2.5 gap-[3px]"
        role="img"
      >
        {ranked.map((c, i) => (
          <div
            className={cn(
              "h-full min-w-1 basis-0 rounded-full transition-[flex-grow,opacity] duration-300 ease-out motion-reduce:transition-none",
              SHADES[i % SHADES.length],
              hover && hover !== c.key && "opacity-30",
            )}
            key={c.key}
            style={{ flexGrow: c.total }}
          />
        ))}
      </div>
      <ol className="-mx-2 mt-2 flex flex-col">
        {ranked.map((c, i) => {
          const change = c.total - c.prev;
          return (
            <motion.li
              className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 rounded-lg px-2 py-1 transition-colors duration-150 [@media(hover:hover)]:hover:bg-accent/60"
              key={c.key}
              layout={reduce ? false : "position"}
              onPointerEnter={(e) => e.pointerType === "mouse" && setHover(c.key)}
              onPointerLeave={() => setHover(null)}
              transition={{ type: "spring", visualDuration: 0.3, bounce: 0 }}
            >
              <span aria-hidden className={cn("size-2.5 rounded-full transition-colors duration-300", SHADES[i % SHADES.length])} />
              <div className="min-w-0">
                <div className="truncate">{c.label}</div>
                <div className="text-muted-foreground text-xs tabular-nums">{Math.round((c.total / total) * 100)}% of revenue</div>
              </div>
              <div className="text-right">
                <Rolling className="font-medium" format={compact} value={c.total} />
                {hasPrev && (
                  <div className={cn("text-xs tabular-nums", tone(change))}>
                    {signed(change)} · {c.prev ? percent(change / c.prev) : "new"}
                  </div>
                )}
              </div>
            </motion.li>
          );
        })}
      </ol>
    </section>
  );
}

function MomentList({ model, handlers, cardId }: { model: Model; handlers: MomentHandlers; cardId: string }) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className="flex min-h-0 min-w-0 flex-col">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-medium text-sm" id={titleId}>
          Moments
        </h2>
        <span className="text-muted-foreground text-xs tabular-nums">
          {model.moments.length ? `${model.moments.length} in this period` : "None logged"}
        </span>
      </div>
      {model.moments.length ? (
        <ul className="-mx-2.5 mt-1.5 flex min-h-0 flex-col overflow-y-auto p-0.5 pb-3 [mask-image:linear-gradient(to_bottom,black_calc(100%-1.25rem),transparent)] [scrollbar-width:thin]">
          {model.moments.map((m) => {
            const isOpen = handlers.openId === m.id;
            return (
              <li key={m.id}>
                <button
                  aria-controls={isOpen ? cardId : undefined}
                  aria-expanded={isOpen}
                  className={cn(
                    "grid w-full cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 rounded-lg px-2 py-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring [@media(hover:hover)]:hover:bg-accent/60",
                    pressable,
                    isOpen && "bg-accent [@media(hover:hover)]:hover:bg-accent",
                  )}
                  onBlur={() => handlers.onFocus(null)}
                  onClick={() => handlers.onToggle(m.id)}
                  onFocus={() => handlers.onFocus(m.id)}
                  onPointerEnter={(e) => e.pointerType === "mouse" && handlers.onHover(m.id)}
                  onPointerLeave={() => handlers.onHover(null)}
                  type="button"
                >
                  <KindIcon className="size-6 [&_svg]:size-3" kind={m.kind} />
                  <span className="min-w-0">
                    <span className="block truncate">{m.title}</span>
                    <span className="block text-muted-foreground text-xs tabular-nums">{momentDates(m)}</span>
                  </span>
                  {m.impact && <span className={cn("text-xs tabular-nums", tone(m.impact.change))}>{percent(m.impact.change)}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-2 text-pretty text-muted-foreground text-xs">Nothing happened worth pinning in this range. Add a moment to see it on the line.</p>
      )}
    </section>
  );
}

const NAV: { label: string; icon: LucideIcon }[] = [
  { label: "Home", icon: HouseIcon },
  { label: "Orders", icon: ShoppingBagIcon },
  { label: "Products", icon: PackageIcon },
  { label: "Customers", icon: UsersIcon },
  { label: "Revenue", icon: ChartSplineIcon },
];

function RailButton({ label, active, icon: Icon, onClick }: { label: string; active?: boolean; icon: LucideIcon; onClick?: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            aria-current={active ? "page" : undefined}
            aria-label={label}
            className={cn(
              "flex size-9 cursor-pointer items-center justify-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring",
              pressable,
              active ? "bg-accent text-foreground" : "text-muted-foreground [@media(hover:hover)]:hover:bg-accent/60 [@media(hover:hover)]:hover:text-foreground",
            )}
            onClick={onClick}
            type="button"
          />
        }
      >
        <Icon aria-hidden className="size-4" />
      </TooltipTrigger>
      <TooltipPopup side="right">{label}</TooltipPopup>
    </Tooltip>
  );
}

function SectionEmpty({ label, icon: Icon, onBack }: { label: string; icon: LucideIcon; onBack: () => void }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col p-4 @3xl:p-7">
      <Empty className="flex-1 rounded-2xl border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Icon />
          </EmptyMedia>
          <EmptyTitle className="font-semibold text-base">{label} opens in its own view</EmptyTitle>
          <EmptyDescription className="text-pretty">This preview only includes the revenue story.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button className={pressable} onClick={onBack} size="sm" variant="outline">
            Back to revenue
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  );
}

export function RevenueStory({
  days = SAMPLE_DAYS,
  channels = SAMPLE_CHANNELS,
  moments = SAMPLE_MOMENTS,
  store = { name: "Fernwood Goods", plan: "Growth plan" },
  user = { name: "Ines Moreau", email: "ines@fernwood.shop" },
  defaultRange = "30d",
  onRangeChange,
  onNavigate,
  className,
}: RevenueStoryProps) {
  const cardId = useId();
  const [range, setRange] = useState<RangeKey>(defaultRange);
  const [nav, setNav] = useState("Revenue");
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const dayIndex = useMemo(() => new Map(days.map((d, i) => [d.date, i])), [days]);
  const impacts = useMemo(
    () => new Map(moments.map((m) => [m.id, impactOf(m, days, dayIndex, channels)])),
    [moments, days, dayIndex, channels],
  );
  const model = useMemo(() => buildModel(days, channels, moments, dayIndex, impacts, range), [days, channels, moments, dayIndex, impacts, range]);
  const openId = hoverId ?? focusId ?? pinnedId;

  useEffect(() => {
    if (!status) return;
    const timer = window.setTimeout(() => setStatus(null), 2200);
    return () => window.clearTimeout(timer);
  }, [status]);

  const handlers: MomentHandlers = {
    openId: model.moments.some((m) => m.id === openId) ? openId : null,
    pinnedId,
    onHover: setHoverId,
    onFocus: setFocusId,
    onToggle: (id) => setPinnedId((p) => (p === id ? null : id)),
  };

  const changeRange = (next: RangeKey) => {
    setRange(next);
    setPinnedId(null);
    onRangeChange?.(next);
  };

  const go = (label: string) => {
    setNav(label);
    onNavigate?.(label);
  };

  const summaryText = () => {
    const change = model.prevTotal === null ? null : model.total - model.prevTotal;
    const period = `${dayLabel(model.start)} – ${dayLabel(model.end)}, ${yearOf(model.end)}`;
    return `${store.name} revenue, ${period}: ${money(model.total)}${change === null ? "" : `, ${change < 0 ? "down" : "up"} ${compact(change)} on the previous period`}.`;
  };

  const downloadCsv = () => {
    const header = model.step === 7 ? "week_starting,revenue,previous" : "date,revenue,previous";
    const lines = model.buckets.map((b) => `${isoOf(b.t)},${Math.round(b.value)},${b.prev === null ? "" : Math.round(b.prev)}`);
    const url = URL.createObjectURL(new Blob([[header, ...lines].join("\n")], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `revenue-${model.range}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setStatus("CSV downloaded");
  };

  const copySummary = () => {
    navigator.clipboard?.writeText(summaryText()).then(
      () => setStatus("Summary copied"),
      () => setStatus("Couldn't copy"),
    );
  };

  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2);
  const section = NAV.find((item) => item.label === nav) ?? NAV[4];
  const rangeLong = RANGES.find((r) => r.value === range)?.long ?? "";

  return (
    <TooltipProvider>
      <div className={cn("@container relative isolate flex h-[760px] w-full overflow-hidden bg-background text-foreground text-sm", className)}>
        <aside aria-label="App" className="hidden w-14 shrink-0 flex-col items-center gap-1 border-r bg-muted/40 py-3 @3xl:flex">
          <span
            aria-label={store.name}
            className="mb-3 flex size-8 items-center justify-center rounded-lg bg-primary font-heading font-semibold text-primary-foreground text-sm"
            role="img"
          >
            {store.name[0]}
          </span>
          <nav aria-label="Main" className="flex flex-col gap-1">
            {NAV.map((item) => (
              <RailButton active={item.label === nav} icon={item.icon} key={item.label} label={item.label} onClick={() => go(item.label)} />
            ))}
          </nav>
          <div className="mt-auto flex flex-col items-center gap-2">
            <RailButton icon={SettingsIcon} label="Settings" />
            <Avatar aria-label={user.name} className="size-7">
              <AvatarFallback className="text-[11px]">{initials}</AvatarFallback>
            </Avatar>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-12 shrink-0 items-center gap-3 border-b px-4 @3xl:px-7">
            <span
              aria-hidden
              className="flex size-6 items-center justify-center rounded-md bg-primary font-heading font-semibold text-primary-foreground text-xs @3xl:hidden"
            >
              {store.name[0]}
            </span>
            <nav aria-label="Breadcrumb" className="flex min-w-0 flex-1 items-center gap-1.5 text-sm">
              <span className="hidden truncate text-muted-foreground @md:inline">{store.name}</span>
              <ChevronRightIcon aria-hidden className="hidden size-3.5 shrink-0 text-muted-foreground/70 @md:block" />
              <span aria-current="page" className="truncate font-medium">
                {section.label}
              </span>
            </nav>
            <span aria-live="polite" className="hidden text-muted-foreground text-xs @2xl:inline">
              {status ?? "Updated 2 min ago"}
            </span>
            {section.label === "Revenue" && (
              <Menu>
                <MenuTrigger render={<Button className={pressable} size="sm" variant="outline" />}>
                  <DownloadIcon />
                  Export
                  <ChevronDownIcon className="-me-0.5 opacity-60" />
                </MenuTrigger>
                <MenuPopup align="end" className="min-w-48">
                  <MenuItem onClick={copySummary}>
                    <ClipboardIcon />
                    Copy summary
                  </MenuItem>
                  <MenuItem onClick={downloadCsv}>
                    <DownloadIcon />
                    Download CSV
                  </MenuItem>
                </MenuPopup>
              </Menu>
            )}
          </header>

          {section.label !== "Revenue" ? (
            <SectionEmpty icon={section.icon} label={section.label} onBack={() => go("Revenue")} />
          ) : (
            <main className="min-h-0 flex-1 overflow-y-auto">
              <div className="@container mx-auto flex min-h-full max-w-[1280px] flex-col @5xl:h-full gap-5 px-4 pt-5 pb-6 @3xl:px-7 @3xl:pt-6">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
                    <p className="text-muted-foreground text-xs tabular-nums">
                      <span className="font-medium text-foreground">{rangeLong}</span> · {dayLabel(model.start, yearOf(model.end))} – {dayLabel(model.end)}
                      {model.prevStart !== null && model.prevEnd !== null && (
                        <span className="hidden @md:inline">
                          {" "}
                          vs {dayLabel(model.prevStart, yearOf(model.end))} – {dayLabel(model.prevEnd, yearOf(model.end))}
                        </span>
                      )}
                    </p>
                    <RangeSwitch onChange={changeRange} value={range} />
                  </div>
                  <Summary model={model} />
                </div>

                <div className="grid min-h-0 flex-1 grid-cols-1 gap-x-7 gap-y-8 @4xl:grid-cols-[minmax(0,1fr)_20rem] @4xl:grid-rows-[minmax(0,1fr)]">
                  <StoryChart cardId={cardId} handlers={handlers} model={model} />
                  <div className="flex min-h-0 min-w-0 flex-col gap-5 border-t pt-6 @4xl:border-t-0 @4xl:border-l @4xl:pt-0 @4xl:ps-7">
                    <Breakdown model={model} />
                    <MomentList cardId={cardId} handlers={handlers} model={model} />
                  </div>
                </div>
              </div>
            </main>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
