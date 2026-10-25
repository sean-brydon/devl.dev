"use client";

import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useInView,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type PlantProgressHue = "sky" | "emerald" | "amber" | "violet" | "rose" | "orange" | "indigo" | "teal";

const hues: Record<PlantProgressHue, string> = {
  sky: "[--pot:var(--color-sky-400)] [--pot-deep:var(--color-sky-600)]",
  emerald: "[--pot:var(--color-emerald-400)] [--pot-deep:var(--color-emerald-600)]",
  amber: "[--pot:var(--color-amber-400)] [--pot-deep:var(--color-amber-600)]",
  violet: "[--pot:var(--color-violet-400)] [--pot-deep:var(--color-violet-600)]",
  rose: "[--pot:var(--color-rose-400)] [--pot-deep:var(--color-rose-600)]",
  orange: "[--pot:var(--color-orange-400)] [--pot-deep:var(--color-orange-600)]",
  indigo: "[--pot:var(--color-indigo-400)] [--pot-deep:var(--color-indigo-600)]",
  teal: "[--pot:var(--color-teal-400)] [--pot-deep:var(--color-teal-600)]",
};

export interface PlantProgressProps {
  value: number;
  label?: string;
  hue?: PlantProgressHue;
  children?: ReactNode;
  className?: string;
}

const W = 320;
const H = 230;
const BASE_X = 160;
const BASE_Y = 178;
const STEM_H = 128;

function stemAt(t: number) {
  return { x: BASE_X + Math.sin(t * Math.PI * 1.6) * 9 * t, y: BASE_Y - t * STEM_H };
}
const STEM_PATH = Array.from({ length: 41 }, (_, i) => {
  const p = stemAt(i / 40);
  return `${i ? "L" : "M"}${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
}).join(" ");

const leaves = [
  { at: 0.16, side: -1, size: 0.8 },
  { at: 0.3, side: 1, size: 0.95 },
  { at: 0.46, side: -1, size: 1.05 },
  { at: 0.62, side: 1, size: 1 },
  { at: 0.78, side: -1, size: 0.85 },
];

const stages = [
  { min: 0, name: "Planted" },
  { min: 15, name: "Sprouting" },
  { min: 45, name: "Growing" },
  { min: 75, name: "Almost there" },
  { min: 100, name: "In bloom" },
];

function leafPath(size: number) {
  const s = size * 22;
  return `M0 0 C ${s * 0.3} ${-s * 0.55} ${s * 0.9} ${-s * 0.62} ${s * 1.25} ${-s * 0.42} C ${s * 0.95} ${-s * 0.05} ${s * 0.45} ${s * 0.12} 0 0 Z`;
}

function Leaf({ side, size, shade }: { side: number; size: number; shade: number }) {
  const s = size * 22;
  return (
    <g transform={`scale(${side} 1)`}>
      <path
        className={shade ? "fill-emerald-600" : "fill-emerald-500"}
        d={leafPath(size)}
      />
      <path
        className="fill-none stroke-white/35"
        d={`M${s * 0.12} ${-s * 0.06} Q ${s * 0.6} ${-s * 0.3} ${s * 1.05} ${-s * 0.38}`}
        strokeLinecap="round"
        strokeWidth={1.25}
      />
    </g>
  );
}

function useCalmMotion() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && !!prefers;
}

export function PlantProgress({ value, label = "Profile setup", hue = "orange", children, className }: PlantProgressProps) {
  const uid = useId().replace(/:/g, "");
  const reduce = useCalmMotion();
  const root = useRef<HTMLDivElement>(null);
  const live = useInView(root) && !reduce;
  const target = Math.min(100, Math.max(0, value));
  const progress = useMotionValue(target);
  const [reached, setReached] = useState(target);

  useEffect(() => {
    if (reduce) {
      progress.set(target);
      return;
    }
    const c = animate(progress, target, { duration: 0.9, ease: [0.23, 1, 0.32, 1] });
    return () => c.stop();
  }, [target, reduce, progress]);

  useMotionValueEvent(progress, "change", (v) => setReached(Math.round(v)));

  const length = useTransform(progress, (v) => 0.06 + (v / 100) * 0.94);
  const tipX = useTransform(length, (l) => stemAt(l).x);
  const tipY = useTransform(length, (l) => stemAt(l).y);
  const bloom = target === 100 && reached >= 97;
  const stage = [...stages].reverse().find((s) => target >= s.min) ?? stages[0];
  const tipT = 0.06 + (reached / 100) * 0.94;

  return (
    <div
      ref={root}
      className={cn(
        "relative w-full max-w-[380px] overflow-hidden rounded-2xl border bg-card p-4 shadow-xs/5 sm:p-6",
        "[--soil:var(--color-amber-900)]",
        hues[hue],
        className,
      )}
    >
      <div
        aria-hidden
        className="dot-grid pointer-events-none absolute inset-0 opacity-50 [mask-image:radial-gradient(closest-side,black,transparent)]"
      />

      <div className="relative flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-muted-foreground text-xs">{label}</p>
          <div className="relative mt-0.5 h-5 overflow-hidden">
            <AnimatePresence initial={false} mode="popLayout">
              <motion.p
                animate={{ opacity: 1, y: 0 }}
                className="font-medium text-foreground text-sm"
                exit={{ opacity: 0, y: reduce ? 0 : -10 }}
                initial={{ opacity: 0, y: reduce ? 0 : 10 }}
                key={stage.name}
                transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
              >
                {stage.name}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
        <span className="font-semibold text-2xl text-foreground tabular-nums tracking-tight">
          {reached}
          <span className="text-base text-muted-foreground">%</span>
        </span>
      </div>

      <div
        aria-label={`${label}: ${Math.round(target)}% – ${stage.name}`}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={Math.round(target)}
        className="relative mx-auto aspect-[32/23] w-full max-w-[320px]"
        role="progressbar"
      >
        <svg aria-hidden className="absolute inset-0 size-full overflow-visible" viewBox={`0 0 ${W} ${H}`}>
          <defs>
            <linearGradient id={`${uid}-pot`} x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor="var(--pot)" />
              <stop offset="1" stopColor="var(--pot-deep)" />
            </linearGradient>
          </defs>

          <motion.circle
            animate={{ opacity: bloom ? 0.5 : 0, scale: bloom ? 1 : 0.8 }}
            className="fill-amber-300/40"
            cx={BASE_X}
            cy={BASE_Y - STEM_H}
            initial={false}
            r={46}
            style={{ filter: "blur(14px)" }}
            transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
          />

          <ellipse className="fill-foreground/8" cx={BASE_X} cy={H - 8} rx={62} ry={6} />

          <motion.g
            animate={live ? { rotate: [-1.2, 1.2, -1.2] } : { rotate: 0 }}
            style={{ originX: `${BASE_X}px`, originY: `${BASE_Y}px`, transformBox: "view-box" }}
            transition={live ? { duration: 5, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY } : { duration: 0.6 }}
          >
            <g className="fill-none stroke-foreground/15" strokeDasharray="2 4" strokeLinecap="round" strokeWidth={1.5}>
              <path d={STEM_PATH} />
              {leaves.map((leaf) => {
                const p = stemAt(leaf.at);
                return (
                  <path
                    d={leafPath(leaf.size)}
                    key={leaf.at}
                    transform={`translate(${p.x.toFixed(2)} ${p.y.toFixed(2)}) scale(${leaf.side} 1)`}
                  />
                );
              })}
              <circle cx={stemAt(1).x} cy={stemAt(1).y - 2} r={14} />
            </g>
            <motion.path
              className="fill-none stroke-emerald-600"
              d={STEM_PATH}
              strokeLinecap="round"
              strokeWidth={5}
              style={{ pathLength: length }}
            />

            {leaves.map((leaf, i) => {
              const p = stemAt(leaf.at);
              const open = tipT >= leaf.at + 0.03;
              return (
                <g key={leaf.at} transform={`translate(${p.x.toFixed(2)} ${p.y.toFixed(2)})`}>
                  <motion.g
                    animate={open ? { scale: 1, rotate: 0, opacity: 1 } : { scale: 0.3, rotate: leaf.side * 40, opacity: 0 }}
                    initial={false}
                    style={{ originX: "0px", originY: "0px", transformBox: "view-box" }}
                    transition={
                      reduce
                        ? { duration: 0.15 }
                        : open
                          ? { type: "spring", stiffness: 260, damping: 15 }
                          : { duration: 0.2, ease: "easeIn" }
                    }
                  >
                    <Leaf shade={i % 2} side={leaf.side} size={leaf.size} />
                  </motion.g>
                </g>
              );
            })}

            <motion.g style={{ x: tipX, y: tipY }}>
              <motion.g
                animate={bloom ? { scale: 0.5, opacity: 0 } : { scale: 1, opacity: 1 }}
                initial={false}
                transition={{ duration: 0.2 }}
              >
                <ellipse className="fill-emerald-400" cx={0} cy={-3} rx={4.5} ry={6} />
              </motion.g>
              <AnimatePresence>
                {bloom && (
                  <motion.g
                    animate={{ scale: 1, rotate: 0, opacity: 1 }}
                    exit={{ scale: 0.6, opacity: 0, transition: { duration: 0.18 } }}
                    initial={reduce ? false : { scale: 0.4, rotate: -40, opacity: 0 }}
                    key="flower"
                    transition={{ type: "spring", stiffness: 220, damping: 14 }}
                  >
                    {Array.from({ length: 6 }, (_, i) => (
                      <ellipse
                        className={i % 2 ? "fill-rose-400" : "fill-rose-300"}
                        cx={0}
                        cy={-11}
                        key={i}
                        rx={7.5}
                        ry={11}
                        transform={`rotate(${i * 60})`}
                      />
                    ))}
                    <circle className="fill-amber-300" r={6.5} />
                    <circle className="fill-amber-500" r={2.5} />
                  </motion.g>
                )}
              </AnimatePresence>
            </motion.g>
          </motion.g>

          <path className="fill-(--soil)" d={`M${BASE_X - 50} ${BASE_Y + 2} Q ${BASE_X} ${BASE_Y - 10} ${BASE_X + 50} ${BASE_Y + 2} Z`} />
          <path d={`M${BASE_X - 46} ${BASE_Y + 10} H${BASE_X + 46} L${BASE_X + 36} ${H - 10} Q ${BASE_X + 35} ${H - 6} ${BASE_X + 30} ${H - 6} H${BASE_X - 30} Q ${BASE_X - 35} ${H - 6} ${BASE_X - 36} ${H - 10} Z`} fill={`url(#${uid}-pot)`} />
          <rect className="fill-(--pot-deep)" height={14} rx={4} width={112} x={BASE_X - 56} y={BASE_Y} />
          <rect className="fill-white/20" height={3} rx={1.5} width={92} x={BASE_X - 46} y={BASE_Y + 3} />

          <AnimatePresence>
            {bloom && !reduce && (
              <motion.g className="fill-amber-400" exit={{ opacity: 0 }} key="sparkles">
                {[-1, 1, -0.6, 0.7].map((d, i) => (
                  <motion.circle
                    animate={{ opacity: [0, 1, 0], cx: BASE_X + d * 44, cy: BASE_Y - STEM_H - 18 + i * 14 }}
                    cx={BASE_X}
                    cy={BASE_Y - STEM_H}
                    initial={{ opacity: 0 }}
                    key={d}
                    r={2.5}
                    transition={{ delay: 0.1 + i * 0.05, duration: 0.8, ease: "easeOut" }}
                  />
                ))}
              </motion.g>
            )}
          </AnimatePresence>
        </svg>
      </div>

      {children && <div className="relative mt-3">{children}</div>}
    </div>
  );
}
