"use client";

import {
  ArrowDownRightIcon,
  ArrowUpRightIcon,
  BackpackIcon,
  ChartColumnIcon,
  ChartLineIcon,
  CoffeeIcon,
  HeadphonesIcon,
  type LucideIcon,
  ShirtIcon,
  WatchIcon,
} from "lucide-react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type SalesMetric = "revenue" | "orders" | "aov" | "customers";

export interface SalesMonth {
  month: string;
  revenue: number;
  orders: number;
  customers: number;
}

export interface SalesProduct {
  name: string;
  category: string;
  icon: LucideIcon;
  revenue: number;
  units: number;
}

export interface SalesChannel {
  name: string;
  revenueShare: number;
  orderShare: number;
}

export interface SalesYear {
  label: string;
  months: SalesMonth[];
  products: SalesProduct[];
  channels: SalesChannel[];
}

export interface SalesOverviewProps {
  years?: SalesYear[];
  title?: string;
  currency?: string;
  className?: string;
}

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function sampleYear(label: string, scale: number, seed: number): SalesYear {
  let s = seed;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  const months = monthNames.map((month, i) => {
    const season = 1 + 0.18 * Math.sin((i - 2) / 1.9) + (i >= 10 ? 0.35 : 0);
    const orders = Math.round(1180 * scale * season * (0.88 + rand() * 0.24));
    return {
      month,
      orders,
      revenue: Math.round(orders * (52 + rand() * 9)),
      customers: Math.round(orders * (0.42 + rand() * 0.08)),
    };
  });
  return {
    label,
    months,
    products: [
      { name: "Trail Shell Jacket", category: "Outerwear", icon: ShirtIcon, revenue: Math.round(184_000 * scale), units: Math.round(1310 * scale) },
      { name: "Daypack 22L", category: "Bags", icon: BackpackIcon, revenue: Math.round(126_500 * scale), units: Math.round(1890 * scale) },
      { name: "Field Watch", category: "Accessories", icon: WatchIcon, revenue: Math.round(142_300 * scale), units: Math.round(620 * scale) },
      { name: "Studio Headphones", category: "Audio", icon: HeadphonesIcon, revenue: Math.round(98_400 * scale), units: Math.round(740 * scale) },
      { name: "Camp Mug Set", category: "Kitchen", icon: CoffeeIcon, revenue: Math.round(41_200 * scale), units: Math.round(2210 * scale) },
    ],
    channels: [
      { name: "Direct", revenueShare: 0.34, orderShare: 0.29 },
      { name: "Organic search", revenueShare: 0.27, orderShare: 0.31 },
      { name: "Paid social", revenueShare: 0.18, orderShare: 0.2 },
      { name: "Email", revenueShare: 0.13, orderShare: 0.12 },
      { name: "Referral", revenueShare: 0.08, orderShare: 0.08 },
    ],
  };
}

const fallbackYears = [sampleYear("2026", 1.18, 4242), sampleYear("2025", 1, 1717)];

const metricInfo: Record<SalesMetric, { label: string; hint: string }> = {
  revenue: { label: "Revenue", hint: "Gross sales" },
  orders: { label: "Orders", hint: "Completed checkouts" },
  aov: { label: "Avg. order", hint: "Revenue per order" },
  customers: { label: "Customers", hint: "First-time buyers" },
};

const channelTones = [
  "bg-blue-500 dark:bg-blue-400",
  "bg-emerald-500 dark:bg-emerald-400",
  "bg-amber-500 dark:bg-amber-400",
  "bg-violet-500 dark:bg-violet-400",
  "bg-rose-500 dark:bg-rose-400",
];
const accent = "text-blue-600 dark:text-blue-400";
const settle = { type: "spring", stiffness: 300, damping: 34 } as const;

function Roll({ text, className }: { text: string; className?: string }) {
  const reduce = useReducedMotion();
  const chars = text.split("");
  return (
    <span className={cn("inline-flex align-top tabular-nums leading-[1.15em]", className)}>
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
              transition={reduce ? { duration: 0 } : settle}
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

function niceStep(value: number) {
  const exp = 10 ** Math.floor(Math.log10(Math.max(1, value)));
  const f = value / exp;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nice * exp;
}

function compact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1).replace(/\.0$/, "")}k`;
  return `${Math.round(n)}`;
}

export function SalesOverview({
  years = fallbackYears,
  title = "Sales overview",
  currency = "$",
  className,
}: SalesOverviewProps) {
  const uid = useId().replace(/:/g, "");
  const reduce = useReducedMotion();
  const [yearIndex, setYearIndex] = useState(0);
  const [metric, setMetric] = useState<SalesMetric>("revenue");
  const [mode, setMode] = useState<"line" | "bars">("line");
  const [hover, setHover] = useState<number | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 640, height: 260 });
  const width = size.width;
  const lastSize = useRef(size);
  const resized = lastSize.current !== size;
  useEffect(() => {
    lastSize.current = size;
  });

  useEffect(() => {
    const el = chartRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) =>
      setSize({ width: entry.contentRect.width, height: Math.max(220, entry.contentRect.height) }),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const year = years[yearIndex];
  const prior = years[yearIndex + 1];

  const monthValue = (m: SalesMonth, key: SalesMetric) =>
    key === "aov" ? m.revenue / Math.max(1, m.orders) : m[key];
  const totalOf = (y: SalesYear | undefined, key: SalesMetric) => {
    if (!y) return 0;
    const rev = y.months.reduce((a, m) => a + m.revenue, 0);
    const ord = y.months.reduce((a, m) => a + m.orders, 0);
    if (key === "aov") return rev / Math.max(1, ord);
    if (key === "revenue") return rev;
    if (key === "orders") return ord;
    return y.months.reduce((a, m) => a + m.customers, 0);
  };
  const format = (key: SalesMetric, n: number) => {
    if (key === "revenue") return `${currency}${Math.round(n).toLocaleString("en-US")}`;
    if (key === "aov") return `${currency}${n.toFixed(2)}`;
    return Math.round(n).toLocaleString("en-US");
  };

  const H = size.height;
  const padL = 40;
  const padB = 26;
  const padT = 12;
  const plotW = Math.max(120, width - padL);
  const plotH = H - padB - padT;
  const values = year.months.map((m) => monthValue(m, metric));
  const tickStep = niceStep((Math.max(...values) * 1.08) / 5);
  const top = Math.ceil((Math.max(...values) * 1.08) / tickStep) * tickStep;
  const slot = plotW / values.length;
  const xAt = (i: number) => padL + slot * i + slot / 2;
  const yAt = (v: number) => padT + plotH - (v / top) * plotH;
  const linePath = values.map((v, i) => `${i ? "L" : "M"}${xAt(i).toFixed(1)},${yAt(v).toFixed(1)}`).join(" ");
  const ticks = Array.from({ length: Math.round(top / tickStep) + 1 }, (_, i) => i * tickStep);
  const areaPath = `${linePath} L${xAt(values.length - 1).toFixed(1)},${yAt(0)} L${xAt(0).toFixed(1)},${yAt(0)} Z`;
  const barW = Math.min(36, slot * 0.56);

  const productValue = (p: SalesProduct) => (metric === "orders" || metric === "customers" ? p.units : p.revenue);
  const products = [...year.products].sort((a, b) => productValue(b) - productValue(a));
  const topProduct = products[0] ? productValue(products[0]) : 1;
  const channelMetricTotal = totalOf(year, metric === "aov" ? "revenue" : metric);
  const shareOf = (c: SalesChannel) => (metric === "orders" || metric === "customers" ? c.orderShare : c.revenueShare);

  const spring = reduce ? { duration: 0 } : ({ type: "spring", stiffness: 380, damping: 38 } as const);
  const morph = resized ? { duration: 0 } : spring;

  return (
    <LayoutGroup id={uid}>
      <section className={cn("mx-auto w-full max-w-[1100px] space-y-4", className)}>
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-semibold text-xl tracking-tight">{title}</h2>
            <p className="text-muted-foreground text-sm">
              January – December {year.label}
              {prior ? ` · compared with ${prior.label}` : ""}
            </p>
          </div>
          {years.length > 1 && (
            <div aria-label="Year" className="inline-flex rounded-full border bg-muted p-1" role="radiogroup">
              {years.map((y, i) => (
                <button
                  aria-checked={i === yearIndex}
                  className={cn(
                    "relative h-7 cursor-pointer rounded-full px-3.5 font-medium text-xs tabular-nums outline-none transition-colors duration-150 after:absolute after:-inset-y-1 after:inset-x-0 after:content-[''] focus-visible:ring-2 focus-visible:ring-ring",
                    i === yearIndex ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                  key={y.label}
                  onClick={() => setYearIndex(i)}
                  role="radio"
                  type="button"
                >
                  {i === yearIndex && (
                    <motion.span
                      className="absolute inset-0 rounded-full bg-background shadow-xs/5 dark:bg-accent"
                      layoutId="year-pill"
                      transition={spring}
                    />
                  )}
                  <span className="relative">{y.label}</span>
                </button>
              ))}
            </div>
          )}
        </header>

        <div aria-label="Metric" className="grid grid-cols-2 gap-3 lg:grid-cols-4" role="radiogroup">
          {(Object.keys(metricInfo) as SalesMetric[]).map((key) => {
            const value = totalOf(year, key);
            const before = totalOf(prior, key);
            const change = before ? (value - before) / before : 0;
            const up = change >= 0;
            const active = metric === key;
            return (
              <button
                aria-checked={active}
                className={cn(
                  "group relative flex cursor-pointer flex-col justify-start rounded-2xl border bg-card p-4 text-start shadow-xs/5 outline-none transition-[border-color,transform] duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98] motion-reduce:active:scale-100",
                  active ? "border-transparent" : "hover:border-foreground/16",
                )}
                key={key}
                onClick={() => {
                  setMetric(key);
                  setHover(null);
                }}
                role="radio"
                type="button"
              >
                {active && (
                  <motion.span
                    aria-hidden
                    className="absolute -inset-px rounded-2xl border border-blue-500/80 bg-blue-500/[0.04] ring-4 ring-blue-500/10 dark:border-blue-400/80 dark:bg-blue-400/[0.06] dark:ring-blue-400/10"
                    layoutId="metric-outline"
                    transition={spring}
                  />
                )}
                <span className="relative block">
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground text-sm">{metricInfo[key].label}</span>
                    {prior && (
                      <span
                        className={cn(
                          "inline-flex items-center gap-0.5 font-medium text-xs tabular-nums",
                          up ? "text-success-foreground" : "text-destructive-foreground",
                        )}
                      >
                        {up ? <ArrowUpRightIcon className="size-3" /> : <ArrowDownRightIcon className="size-3" />}
                        {Math.abs(change * 100).toFixed(1)}%
                      </span>
                    )}
                  </span>
                  <span className="mt-1.5 block font-semibold text-xl tracking-tight sm:text-2xl">
                    <Roll text={format(key, value)} />
                  </span>
                  <span className="mt-0.5 block text-muted-foreground text-xs">{metricInfo[key].hint}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <article className="flex flex-col rounded-2xl border bg-card p-4 shadow-xs/5 lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-medium text-sm">{metricInfo[metric].label} by month</h3>
                <p className="text-muted-foreground text-xs">
                  {hover !== null
                    ? `${year.months[hover].month} ${year.label}: ${format(metric, values[hover])}`
                    : `Peak in ${year.months[values.indexOf(Math.max(...values))].month}`}
                </p>
              </div>
              <div aria-label="Chart style" className="inline-flex rounded-lg border bg-muted p-0.5" role="radiogroup">
                {(
                  [
                    { value: "line", label: "Line", icon: ChartLineIcon },
                    { value: "bars", label: "Bars", icon: ChartColumnIcon },
                  ] as const
                ).map((opt) => (
                  <button
                    aria-checked={mode === opt.value}
                    aria-label={opt.label}
                    className={cn(
                      "relative inline-flex size-7 cursor-pointer items-center justify-center rounded-md outline-none transition-colors duration-150 after:absolute after:-inset-0.5 after:content-[''] focus-visible:ring-2 focus-visible:ring-ring",
                      mode === opt.value ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                    )}
                    key={opt.value}
                    onClick={() => setMode(opt.value)}
                    role="radio"
                    type="button"
                  >
                    {mode === opt.value && (
                      <motion.span
                        className="absolute inset-0 rounded-md bg-background shadow-xs/5 dark:bg-accent"
                        layoutId="mode-pill"
                        transition={spring}
                      />
                    )}
                    <opt.icon className="relative size-4" />
                  </button>
                ))}
              </div>
            </div>

            <div className="relative mt-4 h-[260px] lg:h-auto lg:min-h-[260px] lg:flex-1" ref={chartRef}>
              <svg aria-hidden className={cn("absolute inset-0 overflow-visible", accent)} height={H} width={width}>
                {ticks.map((t) => (
                  <g key={t}>
                    <line
                      className={t === 0 ? "stroke-border" : "stroke-border/70"}
                      strokeDasharray={t === 0 ? undefined : "2 4"}
                      x1={padL}
                      x2={width}
                      y1={yAt(t)}
                      y2={yAt(t)}
                    />
                    <text className="fill-muted-foreground text-[0.6875rem] tabular-nums" dominantBaseline="middle" x={0} y={yAt(t)}>
                      {metric === "revenue" || metric === "aov" ? currency : ""}
                      {compact(t)}
                    </text>
                  </g>
                ))}
                {year.months.map((m, i) => (
                  <text
                    className={cn(
                      "text-[0.6875rem] transition-colors",
                      hover === i ? "fill-foreground font-medium" : "fill-muted-foreground",
                    )}
                    key={m.month}
                    textAnchor="middle"
                    x={xAt(i)}
                    y={H - 6}
                  >
                    {slot < 34 ? m.month[0] : m.month}
                  </text>
                ))}

                {hover !== null && (
                  <rect
                    className="fill-muted/70"
                    height={plotH}
                    rx={8}
                    width={slot - 4}
                    x={padL + slot * hover + 2}
                    y={padT}
                  />
                )}

                <AnimatePresence initial={false}>
                  {mode === "bars" ? (
                    <motion.g animate={{ opacity: 1 }} exit={{ opacity: 0 }} initial={{ opacity: 1 }} key="bars">
                      {values.map((v, i) => (
                        <motion.rect
                          animate={{ y: yAt(v), height: Math.max(2, yAt(0) - yAt(v)) }}
                          className={cn(
                            "fill-current transition-opacity duration-150",
                            hover !== null && hover !== i && "opacity-40",
                          )}
                          initial={{ y: yAt(0), height: 0 }}
                          key={year.months[i].month}
                          rx={Math.min(6, barW / 3)}
                          transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 320, damping: 34, delay: i * 0.02 }}
                          width={barW}
                          x={xAt(i) - barW / 2}
                        />
                      ))}
                    </motion.g>
                  ) : (
                    <motion.g animate={{ opacity: 1 }} exit={{ opacity: 0 }} initial={{ opacity: 0 }} key="line">
                      <defs>
                        <linearGradient id={`${uid}-area`} x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="currentColor" stopOpacity={0.14} />
                          <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <motion.path
                        animate={{ d: areaPath }}
                        fill={`url(#${uid}-area)`}
                        initial={{ d: areaPath }}
                        transition={morph}
                      />
                      <motion.path
                        animate={{ d: linePath }}
                        className="stroke-current"
                        fill="none"
                        initial={{ d: linePath }}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.25}
                        transition={morph}
                      />
                      {values.map((v, i) => (
                        <motion.circle
                          animate={{ cy: yAt(v), r: hover === i ? 5.5 : 3.5 }}
                          className="fill-card stroke-current"
                          cx={xAt(i)}
                          initial={{ cy: yAt(0), r: 3.5 }}
                          key={year.months[i].month}
                          strokeWidth={2}
                          transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 320, damping: 34, delay: i * 0.02 }}
                        />
                      ))}
                    </motion.g>
                  )}
                </AnimatePresence>
              </svg>

              <div className="absolute inset-y-0 right-0 flex" style={{ left: padL }}>
                {year.months.map((m, i) => (
                  <button
                    aria-label={`${m.month}: ${format(metric, values[i])}`}
                    className="h-full flex-1 cursor-default outline-none focus-visible:rounded-lg focus-visible:ring-2 focus-visible:ring-ring"
                    key={m.month}
                    onBlur={() => setHover(null)}
                    onFocus={() => setHover(i)}
                    onPointerEnter={() => setHover(i)}
                    onPointerLeave={() => setHover((h) => (h === i ? null : h))}
                    type="button"
                  />
                ))}
              </div>

              <AnimatePresence>
                {hover !== null && (
                  <motion.div
                    animate={{ opacity: 1 }}
                    className={cn(
                      "pointer-events-none absolute z-10 w-40 rounded-xl border bg-popover p-2.5 text-xs shadow-xs/5",
                      hover > 6 ? "-translate-x-[calc(100%+14px)]" : "translate-x-3.5",
                    )}
                    exit={{ opacity: 0 }}
                    initial={{ opacity: 0 }}
                    style={{ left: xAt(hover), top: Math.max(0, Math.min(yAt(values[hover]) - 30, H - 110)) }}
                    transition={{ duration: 0.12, ease: "easeOut" }}
                  >
                    <p className="font-medium">
                      {year.months[hover].month} {year.label}
                    </p>
                    <p className="mt-1 font-semibold text-sm tabular-nums">{format(metric, values[hover])}</p>
                    {prior && (
                      <p className="mt-0.5 text-muted-foreground tabular-nums">
                        {prior.label}: {format(metric, monthValue(prior.months[hover], metric))}
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </article>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <article className="rounded-2xl border bg-card p-4 shadow-xs/5">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-sm">Top products</h3>
                <span className="text-muted-foreground text-xs">
                  by {metric === "orders" || metric === "customers" ? "units" : "revenue"}
                </span>
              </div>
              <ol className="mt-3 space-y-2.5">
                {products.map((p, i) => {
                  const value = productValue(p);
                  return (
                    <motion.li className="flex items-center gap-3" key={p.name} layout="position" transition={spring}>
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground/80">
                        <p.icon className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2 text-sm">
                          <span className="truncate font-medium">{p.name}</span>
                          <span className="flex shrink-0 tabular-nums">
                            {metric === "orders" || metric === "customers" ? (
                              <Roll text={value.toLocaleString("en-US")} />
                            ) : (
                              <Roll text={`${currency}${compact(value)}`} />
                            )}
                          </span>
                        </span>
                        <span className="mt-1 block h-1 overflow-hidden rounded-full bg-muted">
                          <motion.span
                            animate={{ scaleX: value / topProduct }}
                            className={cn(
                              "block h-full origin-left rounded-full",
                              i === 0 ? "bg-blue-500 dark:bg-blue-400" : "bg-foreground/24",
                            )}
                            initial={false}
                            transition={spring}
                          />
                        </span>
                      </span>
                    </motion.li>
                  );
                })}
              </ol>
            </article>

            <article className="rounded-2xl border bg-card p-4 shadow-xs/5">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-sm">Channels</h3>
                <span className="text-muted-foreground text-xs">share of {metricInfo[metric === "aov" ? "revenue" : metric].label.toLowerCase()}</span>
              </div>
              <div className="mt-3 flex h-2.5 gap-0.5 overflow-hidden rounded-full">
                {year.channels.map((c, i) => (
                  <motion.span
                    animate={{ flexGrow: shareOf(c) }}
                    className={cn("h-full basis-0 first:rounded-s-full last:rounded-e-full", channelTones[i % channelTones.length])}
                    initial={false}
                    key={c.name}
                    transition={spring}
                  />
                ))}
              </div>
              <ul className="mt-3 space-y-2 text-sm">
                {year.channels.map((c, i) => (
                  <li className="flex items-center gap-2" key={c.name}>
                    <span className={cn("size-2 rounded-full", channelTones[i % channelTones.length])} />
                    <span className="flex-1 truncate">{c.name}</span>
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {metric === "revenue" || metric === "aov" ? currency : ""}
                      {compact(shareOf(c) * channelMetricTotal)}
                    </span>
                    <span className="flex w-10 justify-end font-medium tabular-nums">
                      <Roll text={`${Math.round(shareOf(c) * 100)}%`} />
                    </span>
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </div>
      </section>
    </LayoutGroup>
  );
}
