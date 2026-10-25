"use client";

import { TrendingUpIcon } from "lucide-react";
import { animate, motion, useInView, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type GrowthChartHue = "sky" | "emerald" | "amber" | "violet" | "rose" | "orange" | "indigo" | "teal";

const hues: Record<GrowthChartHue, string> = {
  sky: "[--hue-hi:var(--color-sky-400)] [--hue:var(--color-sky-500)] [--hue-deep:var(--color-sky-600)]",
  emerald: "[--hue-hi:var(--color-emerald-400)] [--hue:var(--color-emerald-500)] [--hue-deep:var(--color-emerald-600)]",
  amber: "[--hue-hi:var(--color-amber-400)] [--hue:var(--color-amber-500)] [--hue-deep:var(--color-amber-600)]",
  violet: "[--hue-hi:var(--color-violet-400)] [--hue:var(--color-violet-500)] [--hue-deep:var(--color-violet-600)]",
  rose: "[--hue-hi:var(--color-rose-400)] [--hue:var(--color-rose-500)] [--hue-deep:var(--color-rose-600)]",
  orange: "[--hue-hi:var(--color-orange-400)] [--hue:var(--color-orange-500)] [--hue-deep:var(--color-orange-600)]",
  indigo: "[--hue-hi:var(--color-indigo-400)] [--hue:var(--color-indigo-500)] [--hue-deep:var(--color-indigo-600)]",
  teal: "[--hue-hi:var(--color-teal-400)] [--hue:var(--color-teal-500)] [--hue-deep:var(--color-teal-600)]",
};

export interface GrowthChartPoint {
  label: string;
  value: number;
}

export interface GrowthChartProps {
  data?: GrowthChartPoint[];
  title?: string;
  format?: (value: number) => string;
  hue?: GrowthChartHue;
  loop?: boolean;
  className?: string;
}

const defaultData: GrowthChartPoint[] = [
  { label: "Jan", value: 18400 },
  { label: "Feb", value: 22900 },
  { label: "Mar", value: 21300 },
  { label: "Apr", value: 29800 },
  { label: "May", value: 34900 },
  { label: "Jun", value: 48200 },
];

const W = 400;
const H = 210;
const BASE = 180;
const TOP = 46;
const LEFT = 28;
const RIGHT = 372;

const grow = { type: "spring", stiffness: 220, damping: 20 } as const;
const R = 7;

function useCalmMotion() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && !!prefers;
}

function flagPath(x: number, y: number, phase: 0 | 1) {
  const top = y - 40;
  const k = phase ? 1 : -1;
  return `M${x} ${top} C ${x + 10} ${top - 3 * k} ${x + 18} ${top + 3 * k} ${x + 28} ${top + 1} L ${x + 26} ${top + 11} L ${x + 28} ${top + 21} C ${x + 18} ${top + 23 + 3 * k} ${x + 10} ${top + 17 - 3 * k} ${x} ${top + 20} Z`;
}

export function GrowthChart({
  data = defaultData,
  title = "Record month",
  format = (v) => `$${Math.round(v).toLocaleString("en-US")}`,
  hue = "emerald",
  loop = true,
  className,
}: GrowthChartProps) {
  const uid = useId().replace(/:/g, "");
  const reduce = useCalmMotion();
  const root = useRef<HTMLDivElement>(null);
  const inView = useInView(root);
  const [grown, setGrown] = useState(0);
  const [planted, setPlanted] = useState(false);

  const max = Math.max(...data.map((d) => d.value));
  const step = (RIGHT - LEFT) / data.length;
  const barW = Math.min(34, step * 0.56);
  const pts = data.map((d, i) => ({
    x: LEFT + step * i + step / 2,
    y: BASE - (d.value / max) * (BASE - TOP),
  }));
  const last = pts[pts.length - 1];
  const prev = data[data.length - 2]?.value ?? data[0].value;
  const change = Math.round(((data[data.length - 1].value - prev) / prev) * 100);

  const dataKey = data.map((d) => `${d.label}:${d.value}`).join("|");
  const figure = useMotionValue(0);
  const figureText = useTransform(figure, (v) => format(v));
  const bx = useMotionValue(pts[0].x);
  const by = useMotionValue(TOP - 24);
  const ballOpacity = useMotionValue(0);
  const squash = useMotionValue(1);
  const stretch = useTransform(squash, (v) => 2 - v);

  useEffect(() => {
    const finish = () => {
      setGrown(data.length);
      setPlanted(true);
      figure.set(data[data.length - 1].value);
      bx.set(last.x);
      by.set(last.y - R);
      ballOpacity.set(1);
    };
    if (reduce) {
      finish();
      return;
    }
    if (!inView) return;
    let alive = true;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const stops: { stop: () => void }[] = [];
    const wait = (ms: number) => new Promise<void>((r) => timers.push(setTimeout(r, ms)));
    const run = <T extends { stop: () => void }>(c: T) => {
      stops.push(c);
      return c;
    };
    const hop = (x0: number, y0: number, x1: number, y1: number, duration: number) => {
      const c = 2 * (Math.min(y0, y1) - 26) - (y0 + y1) / 2;
      return run(
        animate(0, 1, {
          duration,
          ease: "linear",
          onUpdate: (t) => {
            bx.set(x0 + (x1 - x0) * t);
            by.set((1 - t) ** 2 * y0 + 2 * (1 - t) * t * c + t ** 2 * y1);
          },
        }),
      );
    };

    (async () => {
      while (alive) {
        setGrown(0);
        setPlanted(false);
        figure.set(0);
        bx.set(pts[0].x);
        by.set(TOP - 30);
        squash.set(1);
        run(animate(ballOpacity, 1, { duration: 0.25 }));
        await wait(450);
        if (!alive) return;
        for (let i = 0; i < pts.length; i++) {
          const from = i === 0 ? { x: pts[0].x, y: TOP - 30 } : { x: pts[i - 1].x, y: pts[i - 1].y - R };
          setGrown(i + 1);
          await hop(from.x, from.y, pts[i].x, pts[i].y - R, i === 0 ? 0.5 : 0.42);
          if (!alive) return;
          run(animate(squash, [1, 0.72, 1], { duration: 0.24, ease: [0.23, 1, 0.32, 1] }));
          run(animate(figure, data[i].value, { duration: 0.35, ease: [0.23, 1, 0.32, 1] }));
          await wait(i === pts.length - 1 ? 120 : 60);
          if (!alive) return;
        }
        setPlanted(true);
        if (!loop) return;
        await wait(4400);
        if (!alive) return;
        setPlanted(false);
        setGrown(0);
        run(animate(ballOpacity, 0, { duration: 0.25 }));
        await wait(700);
      }
    })();

    return () => {
      alive = false;
      for (const t of timers) clearTimeout(t);
      for (const x of stops) x.stop();
    };
  }, [reduce, inView, loop, dataKey]);

  return (
    <div
      ref={root}
      className={cn(
        "relative w-full max-w-[440px] overflow-hidden rounded-2xl border bg-card p-4 shadow-xs/5 sm:p-6",
        hues[hue],
        className,
      )}
    >
      <div
        aria-hidden
        className="dot-grid pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(closest-side,black,transparent)]"
      />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-muted-foreground text-xs">{title}</p>
          <motion.p className="mt-0.5 font-semibold text-2xl text-foreground tabular-nums tracking-tight">{figureText}</motion.p>
        </div>
        <motion.span
          animate={{ opacity: planted ? 1 : 0, y: planted ? 0 : 4, filter: planted ? "blur(0px)" : "blur(2px)" }}
          className="mt-1 inline-flex items-center gap-1 rounded-full bg-success/12 px-2 py-0.5 font-medium text-success-foreground text-xs tabular-nums"
          initial={false}
          transition={{ duration: reduce ? 0 : 0.25, delay: planted && !reduce ? 0.3 : 0 }}
        >
          <TrendingUpIcon aria-hidden className="size-3.5" />+{change}%
        </motion.span>
      </div>

      <div className="relative mx-auto mt-2 aspect-[40/21] w-full">
        <svg
          aria-label={`${title}: ${data.map((d) => `${d.label} ${format(d.value)}`).join(", ")}`}
          className="absolute inset-0 size-full overflow-visible"
          role="img"
          viewBox={`0 0 ${W} ${H}`}
        >
          <defs>
            <linearGradient id={`${uid}-bar`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="var(--hue-hi)" />
              <stop offset="1" stopColor="var(--hue-deep)" />
            </linearGradient>
          </defs>

          {[0.25, 0.5, 0.75].map((f) => (
            <line
              className="stroke-foreground/8"
              key={f}
              strokeDasharray="3 5"
              x1={LEFT}
              x2={RIGHT}
              y1={BASE - f * (BASE - TOP)}
              y2={BASE - f * (BASE - TOP)}
            />
          ))}
          <line className="stroke-foreground/15" strokeLinecap="round" strokeWidth={1.5} x1={LEFT} x2={RIGHT} y1={BASE} y2={BASE} />

          {pts.map((p, i) => {
            const on = i < grown;
            return (
              <motion.rect
                animate={{ scaleY: on ? 1 : 0.06 }}
                fill={`url(#${uid}-bar)`}
                height={BASE - p.y}
                initial={false}
                key={data[i].label}
                opacity={i === pts.length - 1 ? 1 : 0.28 + (i / (pts.length - 1)) * 0.42}
                rx={6}
                style={{ originY: 1 }}
                transition={reduce ? { duration: 0 } : on ? grow : { duration: 0.35, ease: [0.65, 0, 0.35, 1] }}
                width={barW}
                x={p.x - barW / 2}
                y={p.y}
              />
            );
          })}

          <motion.line
            animate={{ pathLength: planted ? 1 : 0, opacity: planted ? 1 : 0 }}
            className="stroke-foreground/70"
            initial={false}
            strokeLinecap="round"
            strokeWidth={2}
            transition={reduce ? { duration: 0 } : { duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            x1={last.x}
            x2={last.x}
            y1={last.y - 2 * R}
            y2={last.y - 40}
          />
          <motion.g
            animate={{ scaleX: planted ? 1 : 0.2, opacity: planted ? 1 : 0 }}
            initial={false}
            style={{ originX: 0 }}
            transition={reduce ? { duration: 0 } : planted ? { delay: 0.18, type: "spring", stiffness: 380, damping: 20 } : { duration: 0.2 }}
          >
            <motion.path
              animate={reduce || !planted || !inView ? undefined : { d: [flagPath(last.x, last.y, 0), flagPath(last.x, last.y, 1), flagPath(last.x, last.y, 0)] }}
              className="fill-(--hue)"
              d={flagPath(last.x, last.y, 0)}
              transition={{ delay: 0.5, duration: 2.2, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY }}
            />
          </motion.g>
          {!reduce &&
            [0, 1, 2, 3, 4, 5].map((n) => {
              const a = (-150 + n * 24) * (Math.PI / 180);
              return (
                <motion.circle
                  animate={planted ? { opacity: [0, 1, 0], cx: [last.x, last.x + Math.cos(a) * 26], cy: [last.y - 38, last.y - 38 + Math.sin(a) * 22] } : { opacity: 0 }}
                  className={n % 2 ? "fill-amber-400" : "fill-(--hue)"}
                  cx={last.x}
                  cy={last.y - 38}
                  initial={false}
                  key={n}
                  r={2.5}
                  transition={planted ? { delay: 0.2, duration: 0.6, ease: "easeOut" } : { duration: 0.1 }}
                />
              );
            })}

          <motion.g style={{ opacity: ballOpacity, x: bx, y: by }}>
            <motion.circle
              className="fill-foreground"
              cx={0}
              cy={0}
              r={R}
              style={{ originY: `${R}px`, scaleX: stretch, scaleY: squash }}
            />
            <circle className="fill-background/40" cx={-2.2} cy={-2.4} r={2} />
          </motion.g>

          {pts.map((p, i) => (
            <text
              className={cn("fill-muted-foreground", i === pts.length - 1 && "fill-foreground font-medium")}
              fontSize={11}
              key={data[i].label}
              textAnchor="middle"
              x={p.x}
              y={BASE + 18}
            >
              {data[i].label}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}
