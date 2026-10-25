"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const TONES = {
  destructive: "[--drip:var(--color-destructive)] text-white",
  primary: "[--drip:var(--color-primary)] text-primary-foreground",
  info: "[--drip:var(--color-info)] text-white",
  success: "[--drip:var(--color-success)] text-white",
} as const;

const H = 18;
const PAD = 14;

const roll = {
  enter: (d: number) => ({ y: d * 9, opacity: 0 }),
  center: { y: 0, opacity: 1 },
  exit: (d: number) => ({ y: -d * 9, opacity: 0 }),
};
// Same keys as `roll` so the server and a reduced-motion client render identical styles.
const fade = { enter: { y: 0, opacity: 0 }, center: { y: 0, opacity: 1 }, exit: { y: 0, opacity: 0 } };

type Splash = { id: number; kind: "drip" | "split" };

export interface DripBadgeProps {
  count: number;
  max?: number;
  tone?: keyof typeof TONES;
  children: ReactNode;
  showZero?: boolean;
  className?: string;
}

export function DripBadge({ count, max = 99, tone = "destructive", children, showZero = false, className }: DripBadgeProps) {
  const reduce = useReducedMotion();
  const filterId = `drip-badge-${useId().replace(/:/g, "")}`;
  const previous = useRef(count);
  const nextId = useRef(0);
  const [splashes, setSplashes] = useState<Splash[]>([]);
  const [shown, setShown] = useState(count);
  const [direction, setDirection] = useState<1 | -1>(1);
  if (count !== shown) {
    setShown(count);
    setDirection(count > shown ? 1 : -1);
  }

  useEffect(() => {
    const before = previous.current;
    previous.current = count;
    if (count === before) return;
    if (reduce || (count === 0 && !showZero) || (before === 0 && !showZero)) return;
    const splash: Splash = { id: nextId.current++, kind: count > before ? "drip" : "split" };
    setSplashes((s) => [...s.slice(-2), splash]);
  }, [count, reduce, showZero]);

  const visible = count > 0 || showZero;
  const label = count > max ? `${max}+` : String(count);
  const width = Math.max(H, Math.round(label.length * 6.6 + 10));

  return (
    <span className={cn("relative inline-flex", className)}>
      {children}
      <span aria-live="polite" className="sr-only">
        {count === 0 ? "No unread notifications" : `${count} unread`}
      </span>
      <span
        aria-hidden
        className={cn("pointer-events-none absolute", TONES[tone])}
        style={{ top: -6 - PAD, left: `calc(100% - ${12 + PAD}px)`, width: 48 + PAD * 2, height: H + PAD * 2 + 22 }}
      >
        <svg className="absolute size-0">
          <filter colorInterpolationFilters="sRGB" height="100%" id={filterId} width="100%" x="0" y="0">
            <feGaussianBlur in="SourceGraphic" result="blur" stdDeviation="2.6" />
            <feColorMatrix in="blur" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -10" />
          </filter>
        </svg>
        <span className="absolute inset-0" style={{ filter: `url(#${filterId})` }}>
          <AnimatePresence initial={false}>
            {visible && (
              <motion.span
                animate={{ scale: 1, opacity: 1, width }}
                className="absolute rounded-full bg-(--drip)"
                exit={{ scale: 0.5, opacity: 0 }}
                initial={{ scale: 0.5, opacity: 0, width }}
                key="pill"
                style={{ left: PAD, top: PAD, height: H, originX: 0.5 }}
                transition={{ type: "spring", stiffness: 520, damping: 30 }}
              />
            )}
          </AnimatePresence>
          {splashes.map((splash) =>
            splash.kind === "drip" ? (
              <motion.span
                animate={{ y: [0, 6, 15, 32], scale: [0.6, 1, 0.92, 0.7], opacity: [1, 1, 1, 0] }}
                className="absolute rounded-full bg-(--drip)"
                key={splash.id}
                onAnimationComplete={() => setSplashes((s) => s.filter((x) => x.id !== splash.id))}
                style={{ left: PAD + width / 2 - 4, top: PAD + H - 9, width: 8, height: 8 }}
                transition={{ duration: 0.7, times: [0, 0.3, 0.55, 1], ease: ["easeOut", "easeIn", "easeIn"] }}
              />
            ) : (
              <motion.span
                animate={{ x: [0, 9, 20], scale: [1, 0.85, 0.2], opacity: [1, 1, 0] }}
                className="absolute rounded-full bg-(--drip)"
                key={splash.id}
                onAnimationComplete={() => setSplashes((s) => s.filter((x) => x.id !== splash.id))}
                style={{ left: PAD + width - 12, top: PAD + (H - 12) / 2, width: 12, height: 12 }}
                transition={{ duration: 0.5, times: [0, 0.4, 1], ease: ["easeOut", "easeIn"] }}
              />
            ),
          )}
        </span>
        <AnimatePresence initial={false}>
          {visible && (
            <motion.span
              animate={{ opacity: 1, scale: 1, width }}
              className="absolute flex items-center justify-center overflow-hidden font-semibold text-[11px] tabular-nums leading-none"
              exit={{ opacity: 0, scale: 0.5 }}
              initial={{ opacity: 0, scale: 0.5, width }}
              key="label"
              style={{ left: PAD, top: PAD, height: H }}
              transition={{ type: "spring", stiffness: 520, damping: 30 }}
            >
              <AnimatePresence custom={direction} initial={false} mode="popLayout">
                <motion.span
                  animate="center"
                  custom={direction}
                  exit="exit"
                  initial="enter"
                  key={label}
                  variants={reduce ? fade : roll}
                  transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
                >
                  {label}
                </motion.span>
              </AnimatePresence>
            </motion.span>
          )}
        </AnimatePresence>
      </span>
    </span>
  );
}
