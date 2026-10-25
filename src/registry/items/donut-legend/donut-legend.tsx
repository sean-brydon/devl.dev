"use client";

import { motion, type MotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface DonutSlice {
  id: string;
  label: string;
  value: number;
  color?: string;
  hint?: string;
}

export interface DonutLegendProps {
  title?: string;
  caption?: string;
  slices?: DonutSlice[];
  totalLabel?: string;
  format?: Intl.NumberFormatOptions;
  locale?: string;
  className?: string;
}

const PALETTE = [
  "var(--color-violet-500)",
  "var(--color-rose-600)",
  "var(--color-sky-600)",
  "var(--color-amber-600)",
  "var(--color-emerald-600)",
];
const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const SIZE = 176;
const C = SIZE / 2;
const R_OUT = 84;
const R_IN = 58;

const defaultSlices: DonutSlice[] = [
  { id: "compute", label: "Compute", value: 21480, hint: "38 instances" },
  { id: "database", label: "Database", value: 9875, hint: "4 clusters" },
  { id: "storage", label: "Object storage", value: 7120, hint: "212 TB" },
  { id: "network", label: "Network egress", value: 5310, hint: "64 TB out" },
  { id: "other", label: "Everything else", value: 4425, hint: "Queues, DNS, logs" },
];

function RollingNumber({ text, instant, className }: { text: string; instant?: boolean; className?: string }) {
  const reduce = useReducedMotion();
  let d = 0;
  let o = 0;
  const glyphs = [...text]
    .reverse()
    .map((ch) => {
      const isDigit = ch >= "0" && ch <= "9";
      return { ch, key: isDigit ? `d${d++}` : `s${o++}${ch}`, digit: isDigit ? Number(ch) : null };
    })
    .reverse();
  return (
    <span className={cn("relative inline-flex whitespace-nowrap tabular-nums leading-none", className)}>
      <span className="sr-only">{text}</span>
      <span aria-hidden className="inline-flex [--row:1.15em]">
        {glyphs.map((g) =>
          g.digit === null ? (
            <span className="inline-block h-(--row) leading-(--row)" key={g.key}>
              {g.ch}
            </span>
          ) : (
            <span
              className="relative inline-block h-(--row) overflow-hidden"
              key={g.key}
              style={{ maskImage: "linear-gradient(transparent, black 18%, black 82%, transparent)" }}
            >
              <span className="invisible block leading-(--row)">0</span>
              <motion.span
                animate={{ y: `${-g.digit * 10}%` }}
                className="absolute inset-x-0 top-0 flex flex-col items-center"
                initial={false}
                transition={reduce || instant ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 30 }}
              >
                {DIGITS.map((n) => (
                  <span className="block h-(--row) leading-(--row)" key={n}>
                    {n}
                  </span>
                ))}
              </motion.span>
            </span>
          ),
        )}
      </span>
    </span>
  );
}

function arc(a0: number, a1: number, rOut: number, rIn: number) {
  const sweep = Math.min(Math.PI * 2 - 0.0001, Math.max(0, a1 - a0));
  if (sweep <= 0.0005) return "";
  const end = a0 + sweep;
  const large = sweep > Math.PI ? 1 : 0;
  const p = (r: number, a: number) => `${(C + r * Math.sin(a)).toFixed(3)} ${(C - r * Math.cos(a)).toFixed(3)}`;
  return `M${p(rOut, a0)} A${rOut} ${rOut} 0 ${large} 1 ${p(rOut, end)} L${p(rIn, end)} A${rIn} ${rIn} 0 ${large} 0 ${p(rIn, a0)} Z`;
}

function Slice({
  start,
  end,
  color,
  active,
  dimmed,
  onEnter,
}: {
  start: number;
  end: number;
  color: string;
  active: boolean;
  dimmed: boolean;
  onEnter: () => void;
}) {
  const reduce = useReducedMotion();
  const s = useSpring(0, { stiffness: 140, damping: 22, mass: 0.9 });
  const e = useSpring(0, { stiffness: 140, damping: 22, mass: 0.9 });
  const grow = useSpring(0, { stiffness: 420, damping: 30 });
  useEffect(() => {
    if (reduce) {
      s.jump(start);
      e.jump(end);
    } else {
      s.set(start);
      e.set(end);
    }
  }, [start, end, s, e, reduce]);
  useEffect(() => {
    if (reduce) grow.jump(active ? 1 : 0);
    else grow.set(active ? 1 : 0);
  }, [active, grow, reduce]);
  const d = useTransform([s, e, grow] as MotionValue<number>[], ([a0, a1, g]: number[]) => {
    return arc(a0, a1, R_OUT + g * 6, R_IN - g * 2);
  });
  return (
    <motion.path
      animate={{ opacity: dimmed ? 0.35 : 1 }}
      className="stroke-card"
      d={d}
      strokeLinejoin="round"
      strokeWidth={end - start > Math.PI * 2 - 0.01 ? 0 : 2}
      onPointerEnter={onEnter}
      style={{ fill: color }}
      transition={{ duration: reduce ? 0 : 0.15 }}
    />
  );
}

export function DonutLegend({
  title = "Cloud spend",
  caption = "October, month to date",
  slices = defaultSlices,
  totalLabel = "Total",
  format = { style: "currency", currency: "USD", maximumFractionDigits: 0 },
  locale = "en-US",
  className,
}: DonutLegendProps) {
  const reduce = useReducedMotion();
  const [active, setActive] = useState<string | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());
  const rowRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const fmt = useMemo(() => new Intl.NumberFormat(locale, format), [locale, format]);

  const shown = slices.filter((s) => !hidden.has(s.id));
  const total = shown.reduce((sum, s) => sum + s.value, 0);
  const angles = useMemo(() => {
    let acc = 0;
    return slices.map((s) => {
      const value = hidden.has(s.id) ? 0 : s.value;
      const a0 = (acc / (total || 1)) * Math.PI * 2;
      acc += value;
      return { a0, a1: (acc / (total || 1)) * Math.PI * 2 };
    });
  }, [slices, hidden, total]);

  const current = slices.find((s) => s.id === active && !hidden.has(s.id)) ?? null;
  const shownKey = current?.id ?? "total";
  const lastKey = useRef(shownKey);
  const swapped = lastKey.current !== shownKey;
  useEffect(() => {
    lastKey.current = shownKey;
  }, [shownKey]);
  const share = (v: number) => (total ? (v / total) * 100 : 0);

  function toggle(id: string) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (slices.length - next.size > 1) next.add(id);
      return next;
    });
  }

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, i: number) {
    const next = e.key === "ArrowDown" ? i + 1 : e.key === "ArrowUp" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? slices.length - 1 : null;
    if (next === null) return;
    e.preventDefault();
    rowRefs.current[(next + slices.length) % slices.length]?.focus();
  }

  return (
    <section
      aria-label={title}
      className={cn("@container w-full max-w-[460px] rounded-2xl border bg-card p-5 text-card-foreground shadow-xs/5", className)}
    >
      <header className="flex items-baseline justify-between gap-3">
        <h3 className="font-medium text-sm">{title}</h3>
        <span className="truncate text-muted-foreground text-xs">{caption}</span>
      </header>

      <div className="mt-4 flex flex-col items-center gap-5 @min-[24rem]:flex-row @min-[24rem]:items-center">
        <div className="relative shrink-0" onPointerLeave={() => setActive(null)} style={{ width: SIZE, height: SIZE }}>
          <svg aria-hidden className="overflow-visible" height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE}>
            <circle className="fill-none stroke-muted" cx={C} cy={C} r={(R_OUT + R_IN) / 2} strokeWidth={R_OUT - R_IN} />
            {slices.map((s, i) => (
              <Slice
                active={active === s.id}
                color={s.color ?? PALETTE[i % PALETTE.length]}
                dimmed={active !== null && active !== s.id}
                end={angles[i].a1}
                key={s.id}
                onEnter={() => setActive(s.id)}
                start={angles[i].a0}
              />
            ))}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="h-4 w-28 truncate text-muted-foreground text-xs">{current?.label ?? totalLabel}</span>
            <RollingNumber
              className="mt-1 font-semibold text-xl tracking-tight"
              instant={swapped}
              text={fmt.format(current?.value ?? total)}
            />
            <span className="mt-1 text-muted-foreground text-xs tabular-nums">
              {current ? `${share(current.value).toFixed(1)}% of total` : `${shown.length} of ${slices.length} shown`}
            </span>
          </div>
        </div>

        <ul aria-label={`${title} breakdown`} className="flex w-full min-w-0 flex-col gap-0.5">
          {slices.map((s, i) => {
            const off = hidden.has(s.id);
            const on = active === s.id;
            return (
              <li key={s.id}>
                <button
                  aria-label={`${s.label}: ${fmt.format(s.value)}${off ? ", hidden" : `, ${share(s.value).toFixed(1)}%`}. Press to ${off ? "show" : "hide"}.`}
                  aria-pressed={!off}
                  className={cn(
                    "group/row flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-left outline-none transition-[background-color,opacity,scale] duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]",
                    on && "bg-accent",
                    off && "opacity-45",
                    active !== null && !on && !off && "opacity-60",
                  )}
                  onBlur={() => setActive(null)}
                  onClick={() => toggle(s.id)}
                  onFocus={() => setActive(s.id)}
                  onKeyDown={(e) => onKeyDown(e, i)}
                  onPointerEnter={() => setActive(s.id)}
                  onPointerLeave={() => setActive(null)}
                  ref={(el) => {
                    rowRefs.current[i] = el;
                  }}
                  type="button"
                >
                  <motion.span
                    animate={{ scale: on ? 1.25 : off ? 0.7 : 1 }}
                    className={cn("size-2.5 shrink-0 rounded-full", off && "bg-transparent ring-1 ring-current ring-inset")}
                    style={off ? { color: s.color ?? PALETTE[i % PALETTE.length] } : { background: s.color ?? PALETTE[i % PALETTE.length] }}
                    transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 26 }}
                  />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className={cn("truncate text-sm", off && "line-through decoration-muted-foreground/60")}>{s.label}</span>
                    {s.hint ? <span className="truncate text-muted-foreground text-xs">{s.hint}</span> : null}
                  </span>
                  <span className="flex shrink-0 flex-col items-end">
                    <span className="font-medium text-sm tabular-nums">{fmt.format(s.value)}</span>
                    <span className="text-muted-foreground text-xs tabular-nums">{off ? "hidden" : `${share(s.value).toFixed(1)}%`}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
