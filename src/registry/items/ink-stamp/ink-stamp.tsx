"use client";

import { AnimatePresence, motion, useAnimate, useReducedMotion } from "motion/react";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useId, useState } from "react";
import { cn } from "@/lib/utils";

export type InkStampTone = "emerald" | "rose" | "sky" | "violet" | "amber";

const tones: Record<InkStampTone, string> = {
  emerald: "text-emerald-600 dark:text-emerald-400",
  rose: "text-rose-600 dark:text-rose-400",
  sky: "text-sky-600 dark:text-sky-400",
  violet: "text-violet-600 dark:text-violet-400",
  amber: "text-amber-600 dark:text-amber-400",
};

const ShakeContext = createContext<(() => void) | null>(null);

function useSafeReducedMotion() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && !!prefers;
}

function hash(value: string) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) h = Math.imul(h ^ value.charCodeAt(i), 16777619);
  return h >>> 0;
}

function random(seed: number) {
  let s = seed || 1;
  return () => {
    s = Math.imul(s ^ (s >>> 15), 2246822507) ^ Math.imul(s ^ (s >>> 13), 3266489909);
    return ((s ^= s >>> 16) >>> 0) / 4294967296;
  };
}

export interface StampSurfaceProps {
  children: ReactNode;
  className?: string;
}

export function StampSurface({ children, className }: StampSurfaceProps) {
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const reduce = useSafeReducedMotion();
  const shake = useCallback(() => {
    if (reduce || !scope.current) return;
    animate(
      scope.current,
      { x: [0, -2.5, 2, -1.2, 0.5, 0], y: [0, 2, -1, 0.5, 0, 0] },
      { duration: 0.3, ease: "easeOut" },
    );
  }, [animate, reduce, scope]);
  return (
    <ShakeContext.Provider value={shake}>
      <div className={cn("relative", className)} ref={scope}>
        {children}
      </div>
    </ShakeContext.Provider>
  );
}

export interface InkStampProps {
  label: string;
  caption?: string;
  tone?: InkStampTone;
  rotate?: number;
  stampKey?: string | number | null;
  onImpact?: () => void;
  className?: string;
}

export function InkStamp({ label, caption, tone = "emerald", rotate = -8, stampKey, onImpact, className }: InkStampProps) {
  const shake = useContext(ShakeContext);
  const reduce = useSafeReducedMotion();
  const filterBase = `ink-stamp-${useId().replace(/:/g, "")}`;
  const impact = useCallback(() => {
    shake?.();
    onImpact?.();
  }, [shake, onImpact]);

  return (
    <div className={cn("pointer-events-none grid select-none", tones[tone], className)} role="status">
      <span className="sr-only">{stampKey == null ? "" : `Stamped ${label}${caption ? `, ${caption}` : ""}`}</span>
      <AnimatePresence initial={false}>
        {stampKey != null && (
          <Impression
            caption={caption}
            filterId={`${filterBase}-${String(stampKey).replace(/[^a-zA-Z0-9-]/g, "")}`}
            key={stampKey}
            label={label}
            onImpact={impact}
            reduce={reduce}
            rotate={rotate}
            seed={hash(`${stampKey}${label}`)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

interface ImpressionProps {
  label: string;
  caption?: string;
  rotate: number;
  seed: number;
  filterId: string;
  reduce: boolean;
  onImpact: () => void;
}

const SLAM = 0.36;

function Impression({ label, caption, rotate, seed, filterId, reduce, onImpact }: ImpressionProps) {
  const [rand] = useState(() => random(seed));
  const [shape] = useState(() => ({
    tilt: rotate + (rand() - 0.5) * 4,
    dx: (rand() - 0.5) * 6,
    dy: (rand() - 0.5) * 4,
    specks: Array.from({ length: 5 }, () => ({
      left: `${rand() * 100}%`,
      top: `${rand() < 0.5 ? -10 - rand() * 14 : 110 + rand() * 14}%`,
      size: 1.5 + rand() * 2.5,
    })),
    warp: Math.floor(rand() * 900),
    grain: Math.floor(rand() * 900),
  }));

  useEffect(() => {
    if (reduce) return;
    const timer = setTimeout(onImpact, SLAM * 1000);
    return () => clearTimeout(timer);
  }, [onImpact, reduce]);

  const ink = reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.2 } }
    : { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.04, delay: SLAM } };

  const face = (
    <div className="relative rounded-lg border-[3px] border-current px-4 pt-2 pb-1.5 text-center">
      <span className="absolute inset-[3px] rounded-[calc(var(--radius)*0.4)] border border-current" />
      <span className="block font-extrabold text-[26px] uppercase leading-none tracking-[0.16em]">{label}</span>
      {caption ? (
        <span className="mt-1 block font-mono font-semibold text-[9px] uppercase tracking-[0.3em]">{caption}</span>
      ) : null}
    </div>
  );

  return (
    <motion.div
      className="relative col-start-1 row-start-1"
      exit={{ opacity: 0, transition: { duration: 0.18 } }}
      style={{ rotate: shape.tilt, x: shape.dx, y: shape.dy }}
    >
      <svg aria-hidden className="absolute size-0">
        <filter height="140%" id={filterId} width="140%" x="-20%" y="-20%">
          <feTurbulence baseFrequency="0.045" numOctaves={2} result="warp" seed={shape.warp} type="fractalNoise" />
          <feDisplacementMap in="SourceGraphic" in2="warp" result="rough" scale={3.5} xChannelSelector="R" yChannelSelector="G" />
          <feTurbulence baseFrequency="0.85" numOctaves={1} result="grain" seed={shape.grain} type="fractalNoise" />
          <feColorMatrix in="grain" result="holes" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -9 0 0 0 6.5" />
          <feTurbulence baseFrequency="0.06" numOctaves={1} result="blots" seed={shape.warp + 7} type="fractalNoise" />
          <feColorMatrix in="blots" result="density" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1.9 0 0 0 0.05" />
          <feComposite in="rough" in2="holes" operator="in" result="inked" />
          <feComposite in="inked" in2="density" operator="in" />
        </filter>
      </svg>

      <motion.div
        aria-hidden
        animate={{ opacity: 0.35, filter: "blur(1.4px)", scale: 1.012 }}
        className="absolute inset-0 mix-blend-multiply dark:mix-blend-screen"
        initial={{ opacity: 0, filter: "blur(0px)", scale: 1 }}
        transition={reduce ? { duration: 0 } : { duration: 1.1, delay: SLAM + 0.05, ease: [0.23, 1, 0.32, 1] }}
      >
        {face}
      </motion.div>

      <motion.div
        {...ink}
        aria-hidden
        className="relative opacity-90 mix-blend-multiply dark:mix-blend-screen"
        style={{ filter: `url(#${filterId})` }}
      >
        {face}
        {shape.specks.map((s) => (
          <span
            className="absolute rounded-full bg-current"
            key={`${s.left}${s.top}`}
            style={{ left: s.left, top: s.top, width: s.size, height: s.size }}
          />
        ))}
      </motion.div>

      {!reduce && <StampBlock />}
    </motion.div>
  );
}

function StampBlock() {
  const times = [0, 0.2, 0.37, 0.52, 0.58, 0.63, 1];
  return (
    <motion.div
      animate={{
        opacity: [0, 1, 1, 1, 1, 1, 0],
        scale: [1.3, 1.18, 1.23, 1, 1, 1, 1.14],
        scaleX: [1, 1, 1, 1, 1.035, 1, 1],
        scaleY: [1, 1, 1, 1, 0.95, 1, 1],
        rotate: [-4, -2, -1.5, 0, 0, 0, 1],
      }}
      aria-hidden
      className="absolute -inset-1.5"
      initial={{ opacity: 0, scale: 1.3 }}
      transition={{ duration: 0.7, times, ease: ["easeOut", "easeInOut", [0.6, 0, 0.9, 0.4], "easeOut", "easeOut", [0.23, 1, 0.32, 1]] }}
    >
      <motion.span
        animate={{
          x: [10, 7, 8, 0, 0, 0, 7],
          y: [16, 11, 12, 1, 1, 1, 11],
          opacity: [0, 0.22, 0.24, 0.5, 0.5, 0.4, 0],
          filter: ["blur(14px)", "blur(10px)", "blur(11px)", "blur(2px)", "blur(2px)", "blur(3px)", "blur(12px)"],
        }}
        className="absolute inset-0 rounded-xl bg-black"
        transition={{ duration: 0.7, times }}
      />
      <span className="absolute inset-0 rounded-xl bg-[color-mix(in_oklab,currentColor_58%,var(--color-neutral-900))] shadow-[inset_0_1px_0_--theme(--color-white/22%),inset_0_-2px_0_--theme(--color-black/30%)]" />
      <span className="absolute inset-x-1.5 -bottom-[3px] h-1 rounded-b-lg bg-current" />
      <span className="absolute top-1/2 left-1/2 aspect-square h-[56%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[color-mix(in_oklab,currentColor_40%,var(--color-neutral-900))] shadow-[inset_0_1px_0_--theme(--color-white/18%),0_2px_4px_--theme(--color-black/30%)]" />
      <span className="absolute top-1/2 left-1/2 aspect-square h-[30%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[color-mix(in_oklab,currentColor_52%,var(--color-neutral-900))] shadow-[inset_0_1px_0_--theme(--color-white/14%)]" />
    </motion.div>
  );
}
