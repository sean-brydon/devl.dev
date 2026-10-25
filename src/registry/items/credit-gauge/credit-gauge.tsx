"use client";

import { ArrowUpRightIcon, SparklesIcon } from "lucide-react";
import {
  AnimatePresence,
  animate,
  type MotionValue,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface CreditCategory {
  id: string;
  label: string;
  used: number;
}

export interface CreditGaugeProps {
  title?: string;
  plan?: string;
  categories: CreditCategory[];
  limit: number;
  warnAt?: number;
  daily: number[];
  daysInPeriod?: number;
  periodStart?: Date;
  unit?: string;
  onUpgrade?: () => void;
  className?: string;
}

const COLORS = ["var(--color-chart-1)", "var(--color-chart-2)", "var(--color-chart-3)", "var(--color-chart-4)", "var(--color-chart-5)"];
const int = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

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

type Level = "calm" | "busy" | "near" | "over";

function levelFor(ratio: number, warnAt: number): Level {
  if (ratio >= 1) return "over";
  if (ratio >= warnAt) return "near";
  if (ratio >= 0.6) return "busy";
  return "calm";
}

const LABELS: Record<Level, string> = {
  calm: "Manage plan",
  busy: "Add credits",
  near: "Upgrade plan",
  over: "Upgrade now",
};

function PlanButton({ level, onClick }: { level: Level; onClick?: () => void }) {
  const reduce = useReducedMotion();
  const label = LABELS[level];
  const variant = level === "over" ? "destructive" : level === "near" ? "default" : "outline";

  return (
    <Button
      className="min-w-[8.25rem] overflow-hidden transition-[box-shadow,transform,background-color,border-color,color] duration-150 ease-out motion-safe:active:scale-[0.97]"
      onClick={onClick}
      size="sm"
      variant={variant}
    >
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-1.5"
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -10 }}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
          key={label}
          transition={{ type: "spring", duration: 0.3, bounce: 0 }}
        >
          {level === "near" || level === "over" ? <SparklesIcon /> : null}
          {label}
          {level === "calm" ? <ArrowUpRightIcon /> : null}
        </motion.span>
      </AnimatePresence>
    </Button>
  );
}

export function CreditGauge({
  title = "AI credits",
  plan = "Pro",
  categories,
  limit,
  warnAt = 0.8,
  daily,
  daysInPeriod = 30,
  periodStart,
  unit = "credits",
  onUpgrade,
  className,
}: CreditGaugeProps) {
  const reduce = useReducedMotion();
  const [hoverDay, setHoverDay] = useState<number | null>(null);
  const [hoverCat, setHoverCat] = useState<string | null>(null);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
  }, []);

  const total = categories.reduce((sum, c) => sum + c.used, 0);
  const ratio = total / limit;
  const level = levelFor(ratio, warnAt);
  const scale = Math.max(limit, total) * 1.04;
  const limitPos = (limit / scale) * 100;
  const warnPos = ((limit * warnAt) / scale) * 100;

  const daysLeft = Math.max(0, daysInPeriod - daily.length);
  const recent = daily.slice(-7);
  const pace = recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : 0;
  const daysToLimit = pace > 0 ? Math.ceil((limit - total) / pace) : Number.POSITIVE_INFINITY;
  const status =
    level === "over"
      ? `${int.format(total - limit)} ${unit} over your limit`
      : daysToLimit <= daysLeft
        ? `Hits the limit in ~${daysToLimit} day${daysToLimit === 1 ? "" : "s"}`
        : `On pace · resets in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`;

  const spring = reduce ? { duration: 0 } : ({ type: "spring", duration: 0.5, bounce: 0 } as const);

  let acc = 0;
  const segments = categories.map((c, i) => {
    const start = (acc / scale) * 100;
    acc += c.used;
    const end = (acc / scale) * 100;
    return { ...c, start, end, color: COLORS[i % COLORS.length] };
  });

  const W = 340;
  const H = 52;
  const gap = 2;
  const barW = (W - gap * (daysInPeriod - 1)) / daysInPeriod;
  const budget = limit / daysInPeriod;
  const peak = Math.max(budget * 1.6, ...daily);
  const yFor = (v: number) => H - (v / peak) * (H - 4);
  const dayLabel = (i: number) => {
    if (!periodStart) return `Day ${i + 1}`;
    const d = new Date(periodStart);
    d.setDate(d.getDate() + i);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };
  const lastDay = daily.length - 1;
  const focusDay = hoverDay !== null && hoverDay <= lastDay ? hoverDay : lastDay;

  function onDaysKey(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "ArrowLeft") setHoverDay(Math.max(0, focusDay - 1));
    else if (e.key === "ArrowRight") setHoverDay(Math.min(lastDay, focusDay + 1));
    else if (e.key === "Home") setHoverDay(0);
    else if (e.key === "End" || e.key === "Escape") setHoverDay(null);
    else return;
    e.preventDefault();
  }

  return (
    <section
      aria-label={`${title} usage`}
      className={cn("flex w-full max-w-sm flex-col gap-5 rounded-2xl border bg-card p-5 text-card-foreground shadow-xs/5", className)}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
            <SparklesIcon className="size-3.5" />
            {title}
          </span>
          <div className="flex items-baseline gap-1.5">
            <Roll className="font-semibold text-3xl tracking-tight" text={int.format(total)} />
            <span className="text-muted-foreground text-sm tabular-nums">/ {int.format(limit)}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Badge variant="outline">{plan}</Badge>
          <span
            className={cn(
              "font-medium text-sm tabular-nums transition-colors duration-300",
              level === "over" ? "text-destructive-foreground" : level === "near" ? "text-warning-foreground" : "text-muted-foreground",
            )}
          >
            <Roll text={`${Math.round(ratio * 100)}%`} />
          </span>
        </div>
      </header>

      <div className="flex flex-col gap-2">
        <div
          aria-label={`${int.format(total)} of ${int.format(limit)} ${unit} used`}
          aria-valuemax={limit}
          aria-valuemin={0}
          aria-valuenow={Math.min(total, limit)}
          className="relative h-3 overflow-x-clip"
          role="meter"
        >
          <div className="absolute inset-0 overflow-hidden rounded-full bg-muted">
            {segments.map((s, i) => (
              <motion.div
                animate={{
                  clipPath: `inset(0px calc(${(100 - s.end).toFixed(3)}% + 0px) 0px calc(${s.start.toFixed(3)}% + ${i ? 2 : 0}px))`,
                  opacity: hoverCat && hoverCat !== s.id ? 0.3 : 1,
                }}
                className="absolute inset-0"
                initial={false}
                key={s.id}
                style={{ backgroundColor: s.color }}
                transition={spring}
              />
            ))}
            <motion.div
              animate={{ clipPath: `inset(0px 0px 0px ${limitPos.toFixed(3)}%)`, opacity: level === "over" ? 1 : 0 }}
              aria-hidden
              className="absolute inset-0"
              initial={false}
              style={{
                backgroundImage:
                  "repeating-linear-gradient(135deg, color-mix(in srgb, var(--color-destructive) 70%, transparent) 0 3px, transparent 3px 6px)",
              }}
              transition={spring}
            />
          </div>
          <motion.div animate={{ x: `${warnPos}%` }} aria-hidden className="pointer-events-none absolute inset-0" initial={false} transition={spring}>
            <span className="absolute -inset-y-1 left-0 w-px bg-warning" />
          </motion.div>
          <motion.div animate={{ x: `${limitPos}%` }} aria-hidden className="pointer-events-none absolute inset-0" initial={false} transition={spring}>
            <span className="absolute -inset-y-1.5 left-0 w-0.5 -translate-x-1/2 rounded-full bg-foreground" />
          </motion.div>
        </div>
        <div aria-hidden className="relative h-4 overflow-x-clip text-[10px] text-muted-foreground tabular-nums">
          <motion.div animate={{ x: `${warnPos}%` }} className="absolute inset-0" initial={false} transition={spring}>
            <span className="absolute left-0 -translate-x-1/2">{Math.round(warnAt * 100)}%</span>
          </motion.div>
          <motion.div animate={{ x: `${limitPos}%` }} className="absolute inset-0" initial={false} transition={spring}>
            <span className="absolute left-0 -translate-x-1/2 font-medium text-foreground">Limit</span>
          </motion.div>
        </div>

        <ul className="-mx-1 grid grid-cols-2 gap-x-3">
          {segments.map((s) => (
            <li key={s.id}>
              <button
                className="flex h-7 w-full cursor-default items-center gap-2 rounded-md px-1 text-left text-xs outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                onBlur={() => setHoverCat(null)}
                onFocus={() => setHoverCat(s.id)}
                onPointerEnter={() => setHoverCat(s.id)}
                onPointerLeave={() => setHoverCat(null)}
                type="button"
              >
                <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="truncate text-muted-foreground">{s.label}</span>
                <span className="ms-auto font-medium text-foreground tabular-nums">{int.format(s.used)}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div
        aria-label={`Daily ${unit}. Use the arrow keys to step through days.`}
        className="flex flex-col gap-2 rounded-xl bg-muted/60 p-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onBlur={() => setHoverDay(null)}
        onKeyDown={onDaysKey}
        role="group"
        tabIndex={0}
      >
        <div className="flex items-baseline justify-between text-xs">
          <span className="text-muted-foreground">{dayLabel(focusDay)}</span>
          <span className="font-medium tabular-nums">
            {int.format(daily[focusDay] ?? 0)} <span className="font-normal text-muted-foreground">{unit}</span>
          </span>
        </div>
        <svg
          aria-hidden
          className="h-13 w-full overflow-visible"
          onPointerLeave={() => setHoverDay(null)}
          preserveAspectRatio="none"
          viewBox={`0 0 ${W} ${H}`}
        >
          {Array.from({ length: daysInPeriod }, (_, i) => {
            const v = daily[i];
            const x = i * (barW + gap);
            if (v === undefined) {
              return <rect className="fill-muted-foreground/15" height={2} key={i} rx={1} width={barW} x={x} y={H - 2} />;
            }
            const over = v > budget * 1.25;
            const active = i === focusDay;
            return (
              <g key={i} onPointerEnter={() => setHoverDay(i)}>
                <rect fill="transparent" height={H} width={barW + gap} x={x - gap / 2} y={0} />
                <motion.rect
                  animate={{ y: yFor(v), height: H - yFor(v) }}
                  initial={mounted.current ? { y: H, height: 0 } : false}
                  rx={1.5}
                  style={{
                    fill: over ? "var(--color-warning)" : active ? "var(--color-foreground)" : "var(--color-muted-foreground)",
                    opacity: active || over ? 1 : 0.35,
                  }}
                  transition={spring}
                  width={barW}
                  x={x}
                />
              </g>
            );
          })}
          <line
            className="stroke-foreground/40"
            strokeDasharray="3 3"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
            x1={0}
            x2={W}
            y1={yFor(budget)}
            y2={yFor(budget)}
          />
        </svg>
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>{dayLabel(0)}</span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 border-foreground/40 border-t border-dashed" />
            daily budget {int.format(budget)}
          </span>
        </div>
      </div>

      <footer className="flex items-center justify-between gap-3">
        <p
          aria-live="polite"
          className={cn(
            "text-pretty text-xs transition-colors duration-300",
            level === "over" ? "text-destructive-foreground" : level === "near" ? "text-warning-foreground" : "text-muted-foreground",
          )}
        >
          {status}
        </p>
        <PlanButton level={level} onClick={onUpgrade} />
      </footer>
    </section>
  );
}
