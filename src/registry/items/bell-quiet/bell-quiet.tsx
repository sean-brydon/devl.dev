"use client";

import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type BellQuietHue = "sky" | "emerald" | "amber" | "violet" | "rose" | "orange" | "indigo" | "teal";

const hues: Record<BellQuietHue, string> = {
  sky: "[--hue-hi:var(--color-sky-300)] [--hue:var(--color-sky-500)] [--hue-deep:var(--color-sky-700)]",
  emerald: "[--hue-hi:var(--color-emerald-300)] [--hue:var(--color-emerald-500)] [--hue-deep:var(--color-emerald-700)]",
  amber: "[--hue-hi:var(--color-amber-300)] [--hue:var(--color-amber-500)] [--hue-deep:var(--color-amber-700)]",
  violet: "[--hue-hi:var(--color-violet-300)] [--hue:var(--color-violet-500)] [--hue-deep:var(--color-violet-700)]",
  rose: "[--hue-hi:var(--color-rose-300)] [--hue:var(--color-rose-500)] [--hue-deep:var(--color-rose-700)]",
  orange: "[--hue-hi:var(--color-orange-300)] [--hue:var(--color-orange-500)] [--hue-deep:var(--color-orange-700)]",
  indigo: "[--hue-hi:var(--color-indigo-300)] [--hue:var(--color-indigo-500)] [--hue-deep:var(--color-indigo-700)]",
  teal: "[--hue-hi:var(--color-teal-300)] [--hue:var(--color-teal-500)] [--hue-deep:var(--color-teal-700)]",
};

export interface BellQuietProps {
  title?: string;
  description?: string;
  hue?: BellQuietHue;
  className?: string;
}

const W = 400;
const H = 210;
const CX = 200;
const TOP = 40;

const zs = [
  { size: 13, x: 246, y: 74, delay: 0 },
  { size: 17, x: 262, y: 56, delay: 0.9 },
  { size: 22, x: 282, y: 36, delay: 1.8 },
];

const BELL = `M${CX} ${TOP + 10} C ${CX - 30} ${TOP + 10} ${CX - 46} ${TOP + 34} ${CX - 46} ${TOP + 62} V ${TOP + 86} C ${CX - 46} ${TOP + 96} ${CX - 52} ${TOP + 102} ${CX - 60} ${TOP + 108} H ${CX + 60} C ${CX + 52} ${TOP + 102} ${CX + 46} ${TOP + 96} ${CX + 46} ${TOP + 86} V ${TOP + 62} C ${CX + 46} ${TOP + 34} ${CX + 30} ${TOP + 10} ${CX} ${TOP + 10} Z`;

function useCalmMotion() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && !!prefers;
}

export function BellQuiet({
  title = "You're all caught up",
  description = "No new notifications. We'll ring when something needs you.",
  hue = "amber",
  className,
}: BellQuietProps) {
  const uid = useId().replace(/:/g, "");
  const reduce = useCalmMotion();
  const root = useRef<HTMLDivElement>(null);
  const live = useInView(root) && !reduce;
  const [ring, setRing] = useState(0);
  const [awake, setAwake] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const poke = () => {
    if (awake) return;
    setRing((r) => r + 1);
    setAwake(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setAwake(false), 1500);
  };

  const swing = { duration: 0.9, ease: "easeOut" as const, times: [0, 0.14, 0.32, 0.5, 0.68, 0.84, 1] };

  return (
    <div
      ref={root}
      className={cn(
        "relative w-full max-w-[420px] overflow-hidden rounded-2xl border bg-card p-4 shadow-xs/5 sm:p-6",
        hues[hue],
        className,
      )}
    >
      <div
        aria-hidden
        className="dot-grid pointer-events-none absolute inset-0 opacity-50 [mask-image:radial-gradient(closest-side,black,transparent)]"
      />
      <button
        aria-label="No notifications. Give the bell a ring"
        className="relative mx-auto block aspect-[40/21] w-full max-w-[380px] cursor-pointer rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={poke}
        onFocus={(e) => e.currentTarget.matches(":focus-visible") && poke()}
        onPointerEnter={(e) => e.pointerType === "mouse" && poke()}
        type="button"
      >
        <svg aria-hidden className="absolute inset-0 size-full overflow-visible" viewBox={`0 0 ${W} ${H}`}>
          <defs>
            <linearGradient id={`${uid}-bell`} x1="0.2" x2="0.8" y1="0" y2="1">
              <stop offset="0" stopColor="var(--hue-hi)" />
              <stop offset="0.55" stopColor="var(--hue)" />
              <stop offset="1" stopColor="var(--hue-deep)" />
            </linearGradient>
          </defs>

          <motion.ellipse
            animate={live ? { rx: [46, 50, 46], opacity: [1, 0.75, 1] } : { rx: 46, opacity: 1 }}
            className="fill-foreground/8"
            cx={CX}
            cy={TOP + 150}
            rx={46}
            ry={6}
            transition={live ? { duration: 3.4, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY } : { duration: 0.4 }}
          />

          <AnimatePresence>
            {awake && !reduce && (
              <motion.g className="fill-none stroke-(--hue)" exit={{ opacity: 0 }} key={`waves-${ring}`} strokeLinecap="round" strokeWidth={3}>
                {[-1, 1].map((side) =>
                  [0, 1].map((n) => (
                    <motion.path
                      animate={{ opacity: [0, 1, 0], x: [0, side * 6] }}
                      d={
                        side < 0
                          ? `M${CX - 70 - n * 12} ${TOP + 40 - n * 6} q -10 ${22 + n * 6} 0 ${44 + n * 12}`
                          : `M${CX + 70 + n * 12} ${TOP + 40 - n * 6} q 10 ${22 + n * 6} 0 ${44 + n * 12}`
                      }
                      initial={{ opacity: 0 }}
                      key={`${side}-${n}`}
                      transition={{ delay: 0.05 + n * 0.1, duration: 0.6, ease: "easeOut" }}
                    />
                  )),
                )}
              </motion.g>
            )}
          </AnimatePresence>

          <motion.g
            animate={live ? { scale: [1, 1.025, 1] } : { scale: 1 }}
            style={{ originX: `${CX}px`, originY: `${TOP + 120}px`, transformBox: "view-box" }}
            transition={live ? { duration: 3.4, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY } : { duration: 0.4 }}
          >
            <motion.g
              animate={ring > 0 && !reduce ? { rotate: [0, 16, -13, 9, -5, 2, 0] } : { rotate: 0 }}
              key={`swing-${ring}`}
              style={{ originX: `${CX}px`, originY: `${TOP + 2}px`, transformBox: "view-box" }}
              transition={swing}
            >
              <motion.g
                animate={ring > 0 && !reduce ? { rotate: [0, -10, 14, -9, 5, -2, 0] } : { rotate: 0 }}
                style={{ originX: `${CX}px`, originY: `${TOP + 60}px`, transformBox: "view-box" }}
                transition={{ ...swing, delay: 0.06 }}
              >
                <circle className="fill-(--hue-deep)" cx={CX} cy={TOP + 120} r={11} />
              </motion.g>
              <circle className="fill-(--hue-deep)" cx={CX} cy={TOP + 4} r={8} />
              <path d={BELL} fill={`url(#${uid}-bell)`} />
              <path
                className="fill-white/20"
                d={`M${CX - 30} ${TOP + 26} C ${CX - 38} ${TOP + 36} ${CX - 40} ${TOP + 50} ${CX - 40} ${TOP + 62} V ${TOP + 84} C ${CX - 40} ${TOP + 88} ${CX - 34} ${TOP + 88} ${CX - 34} ${TOP + 84} V ${TOP + 62} C ${CX - 34} ${TOP + 48} ${CX - 30} ${TOP + 36} ${CX - 24} ${TOP + 28} Z`}
              />
              <rect className="fill-(--hue-deep)" height={14} rx={7} width={136} x={CX - 68} y={TOP + 102} />
              <rect className="fill-white/15" height={3} rx={1.5} width={110} x={CX - 55} y={TOP + 105} />

              <g className="fill-none stroke-white" strokeLinecap="round" strokeWidth={4}>
                <motion.path
                  animate={{ opacity: awake ? 0 : 1 }}
                  d={`M${CX - 26} ${TOP + 66} q 8 7 16 0`}
                  initial={false}
                  transition={{ duration: 0.12 }}
                />
                <motion.path
                  animate={{ opacity: awake ? 0 : 1 }}
                  d={`M${CX + 10} ${TOP + 66} q 8 7 16 0`}
                  initial={false}
                  transition={{ duration: 0.12 }}
                />
              </g>
              <motion.g
                animate={{ opacity: awake ? 1 : 0, scaleY: awake ? 1 : 0.3 }}
                className="fill-white"
                initial={false}
                style={{ originX: "50%", originY: "50%" }}
                transition={{ duration: 0.14, ease: "easeOut" }}
              >
                <circle cx={CX - 18} cy={TOP + 66} r={5.5} />
                <circle cx={CX + 18} cy={TOP + 66} r={5.5} />
              </motion.g>
            </motion.g>
          </motion.g>
        </svg>

        {live &&
          zs.map((z) => (
            <motion.span
              animate={awake ? { opacity: 0, scale: 0.6 } : { opacity: [0, 1, 1, 0], x: [0, 6, 10, 14], y: [6, -4, -12, -20] }}
              aria-hidden
              className="absolute font-semibold text-(--hue-deep) leading-none dark:text-(--hue-hi)"
              key={z.x}
              style={{ fontSize: z.size, left: `${(z.x / W) * 100}%`, top: `${(z.y / H) * 100}%` }}
              transition={
                awake
                  ? { duration: 0.15 }
                  : { delay: z.delay, duration: 2.7, ease: "easeOut", repeat: Number.POSITIVE_INFINITY, times: [0, 0.25, 0.7, 1] }
              }
            >
              z
            </motion.span>
          ))}
      </button>

      <div className="relative mt-3 text-center">
        <p className="text-balance font-medium text-foreground text-sm">{title}</p>
        <p className="mx-auto mt-1 max-w-[32ch] text-pretty text-muted-foreground text-xs">{description}</p>
      </div>
    </div>
  );
}
