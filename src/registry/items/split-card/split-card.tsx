"use client";

import { ArrowUpRightIcon } from "lucide-react";
import { animate, type MotionValue, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Tabs, TabsList, TabsTab } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export interface SplitPart {
  id: string;
  label: string;
  value: number;
}

export interface SplitPeriod {
  id: string;
  label: string;
  parts: SplitPart[];
  previousTotal?: number;
}

export interface SplitCardProps {
  title?: string;
  periods: SplitPeriod[];
  defaultPeriod?: string;
  format?: (value: number) => string;
  good?: "up" | "down";
  maxRows?: number;
  className?: string;
}

const COLORS = ["var(--color-chart-1)", "var(--color-chart-2)", "var(--color-chart-3)", "var(--color-chart-4)", "var(--color-chart-5)"];
const defaultFormat = (v: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(v);
const GAP_PX = 3;

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

export function SplitCard({
  title = "Breakdown",
  periods,
  defaultPeriod,
  format = defaultFormat,
  good = "up",
  maxRows = 5,
  className,
}: SplitCardProps) {
  const reduce = useReducedMotion();
  const [periodId, setPeriodId] = useState(defaultPeriod ?? periods[0]?.id);
  const [hovered, setHovered] = useState<string | null>(null);
  const period = periods.find((p) => p.id === periodId) ?? periods[0];

  const colorIndex = new Map<string, number>();
  for (const p of periods) for (const part of p.parts) if (!colorIndex.has(part.id)) colorIndex.set(part.id, colorIndex.size);
  const colorOf = (id: string) => (id === "__other" ? "var(--color-muted-foreground)" : COLORS[(colorIndex.get(id) ?? 0) % COLORS.length]);

  const total = period.parts.reduce((sum, p) => sum + p.value, 0);
  const ranked = [...period.parts].sort((a, b) => b.value - a.value);
  const inBarOrder = [...period.parts].sort((a, b) => (colorIndex.get(a.id) ?? 0) - (colorIndex.get(b.id) ?? 0));
  const rows =
    ranked.length > maxRows
      ? [
          ...ranked.slice(0, maxRows - 1),
          { id: "__other", label: "Other", value: ranked.slice(maxRows - 1).reduce((s, p) => s + p.value, 0) },
        ]
      : ranked;
  const change = period.previousTotal ? (total - period.previousTotal) / period.previousTotal : null;
  const up = (change ?? 0) >= 0;
  const better = up === (good === "up");

  const glide = reduce ? { duration: 0 } : ({ type: "spring", duration: 0.45, bounce: 0 } as const);

  let acc = 0;
  const segments = inBarOrder.map((part, i) => {
    const start = total ? (acc / total) * 100 : 0;
    acc += part.value;
    const end = total ? (acc / total) * 100 : 0;
    return { part, start, end, first: i === 0, last: i === inBarOrder.length - 1 };
  });

  return (
    <section
      aria-label={title}
      className={cn("flex w-full max-w-[22rem] flex-col gap-4 rounded-2xl border bg-card p-4 text-card-foreground shadow-xs/5", className)}
    >
      <header className="flex items-center justify-between gap-3">
        <h3 className="font-medium text-sm">{title}</h3>
        <Tabs onValueChange={(v) => setPeriodId(String(v))} value={period.id}>
          <TabsList aria-label={`${title} period`} size="sm">
            {periods.map((p) => (
              <TabsTab className="px-2 text-xs tabular-nums text-muted-foreground sm:text-xs" key={p.id} value={p.id}>
                {p.label}
              </TabsTab>
            ))}
          </TabsList>
        </Tabs>
      </header>

      <div className="flex items-end justify-between gap-3">
        <Roll className="font-semibold text-3xl tracking-tight" text={format(total)} />
        {change !== null && (
          <span
            className={cn(
              "mb-0.5 inline-flex items-center gap-0.5 rounded-full py-0.5 ps-1 pe-1.5 font-medium text-xs transition-colors duration-300",
              better ? "bg-success/10 text-success-foreground" : "bg-destructive/10 text-destructive-foreground",
            )}
          >
            <motion.span animate={{ rotate: up ? 0 : 90 }} className="inline-flex" initial={false} transition={glide}>
              <ArrowUpRightIcon className="size-3.5" />
            </motion.span>
            <span className="sr-only">{up ? "up" : "down"}</span>
            <Roll text={`${Math.abs(change * 100).toFixed(1)}%`} />
          </span>
        )}
      </div>

      <div aria-hidden className="relative h-2.5">
        {segments.map(({ part, start, end, first, last }) => {
          const folded = !rows.some((r) => r.id === part.id);
          const lit = !hovered || hovered === part.id || (hovered === "__other" && folded);
          const l = first ? 0 : GAP_PX / 2;
          const r = last ? 0 : GAP_PX / 2;
          return (
            <motion.div
              animate={{
                clipPath: `inset(0px calc(${(100 - end).toFixed(3)}% + ${r}px) 0px calc(${start.toFixed(3)}% + ${l}px) round 999px)`,
                opacity: lit ? 1 : 0.25,
              }}
              className="absolute inset-0"
              initial={false}
              key={part.id}
              style={{ backgroundColor: colorOf(part.id) }}
              transition={glide}
            />
          );
        })}
      </div>

      <div className="-mx-1.5 flex">
        <ol aria-hidden className="flex w-5 shrink-0 flex-col ps-1.5 text-muted-foreground text-xs tabular-nums">
          {rows.map((row, i) => (
            <li className="flex h-8 items-center" key={i}>
              {i + 1}
            </li>
          ))}
        </ol>
        <ol className="flex min-w-0 flex-1 flex-col">
          {rows.map((row) => {
            const share = total ? row.value / total : 0;
            return (
              <motion.li
                className="flex h-8 cursor-default items-center gap-2.5 rounded-lg px-1.5 text-sm transition-colors hover:bg-accent"
                key={row.id}
                layout={reduce ? false : "position"}
                onPointerEnter={() => setHovered(row.id)}
                onPointerLeave={() => setHovered(null)}
                transition={glide}
              >
                <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: colorOf(row.id) }} />
                <span className="min-w-0 flex-1 truncate">{row.label}</span>
                <Roll className="font-medium" text={format(row.value)} />
                <span className="w-9 text-right text-muted-foreground text-xs tabular-nums">{Math.round(share * 100)}%</span>
              </motion.li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
