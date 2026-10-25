"use client";

import {
  type AnimationPlaybackControls,
  animate,
  motion,
  type MotionValue,
  useInView,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import { type PointerEvent, useCallback, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type DeskBotHue = "sky" | "emerald" | "amber" | "violet" | "rose" | "orange" | "indigo" | "teal";

const hues: Record<DeskBotHue, string> = {
  sky: "[--hue-hi:var(--color-sky-300)] [--hue:var(--color-sky-400)] [--hue-deep:var(--color-sky-600)] [--ink:var(--color-sky-950)] [--glow:var(--color-sky-200)]",
  emerald:
    "[--hue-hi:var(--color-emerald-300)] [--hue:var(--color-emerald-400)] [--hue-deep:var(--color-emerald-600)] [--ink:var(--color-emerald-950)] [--glow:var(--color-emerald-200)]",
  amber:
    "[--hue-hi:var(--color-amber-300)] [--hue:var(--color-amber-400)] [--hue-deep:var(--color-amber-600)] [--ink:var(--color-amber-950)] [--glow:var(--color-amber-200)]",
  violet:
    "[--hue-hi:var(--color-violet-300)] [--hue:var(--color-violet-400)] [--hue-deep:var(--color-violet-600)] [--ink:var(--color-violet-950)] [--glow:var(--color-violet-200)]",
  rose: "[--hue-hi:var(--color-rose-300)] [--hue:var(--color-rose-400)] [--hue-deep:var(--color-rose-600)] [--ink:var(--color-rose-950)] [--glow:var(--color-rose-200)]",
  orange:
    "[--hue-hi:var(--color-orange-300)] [--hue:var(--color-orange-400)] [--hue-deep:var(--color-orange-600)] [--ink:var(--color-orange-950)] [--glow:var(--color-orange-200)]",
  indigo:
    "[--hue-hi:var(--color-indigo-300)] [--hue:var(--color-indigo-400)] [--hue-deep:var(--color-indigo-600)] [--ink:var(--color-indigo-950)] [--glow:var(--color-indigo-200)]",
  teal: "[--hue-hi:var(--color-teal-300)] [--hue:var(--color-teal-400)] [--hue-deep:var(--color-teal-600)] [--ink:var(--color-teal-950)] [--glow:var(--color-teal-200)]",
};

export interface DeskBotProps {
  name?: string;
  hue?: DeskBotHue;
  idleAfter?: number;
  onWake?: () => void;
  onDoze?: () => void;
  className?: string;
}

const VB = { x: 20, y: 28, w: 360, h: 212 };
const FACE = { x: 200, y: 140 };

const zs = [
  { size: 13, x: 270, y: 82, delay: 0 },
  { size: 17, x: 286, y: 64, delay: 0.9 },
  { size: 22, x: 304, y: 44, delay: 1.8 },
];

const steam = [
  { x: 76, delay: 0 },
  { x: 86, delay: 1.3 },
];

function useCalmMotion() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && !!prefers;
}

function useBlink(active: boolean) {
  const open = useMotionValue(1);
  useEffect(() => {
    if (!active) {
      open.set(1);
      return;
    }
    let timer: ReturnType<typeof setTimeout>;
    let blink: AnimationPlaybackControls | undefined;
    const schedule = () => {
      timer = setTimeout(
        () => {
          const twice = Math.random() < 0.22;
          blink = animate(open, twice ? [1, 0.08, 1, 0.08, 1] : [1, 0.08, 1], {
            duration: twice ? 0.4 : 0.19,
            ease: "easeInOut",
            times: twice ? [0, 0.18, 0.5, 0.68, 1] : [0, 0.38, 1],
          });
          schedule();
        },
        2000 + Math.random() * 4200,
      );
    };
    schedule();
    return () => {
      clearTimeout(timer);
      blink?.stop();
    };
  }, [active, open]);
  return open;
}

function Eye({
  cx,
  near,
  scaleY,
}: {
  cx: number;
  near: boolean;
  scaleY: MotionValue<number>;
}) {
  return (
    <motion.g
      animate={{ scale: near ? 1.12 : 1 }}
      initial={false}
      style={{ originX: `${cx}px`, originY: `${FACE.y}px`, transformBox: "view-box" }}
      transition={{ type: "spring", stiffness: 420, damping: 22 }}
    >
      <motion.rect
        className="fill-(--glow)"
        height={26}
        rx={8}
        style={{ originX: `${cx}px`, originY: `${FACE.y}px`, scaleY, transformBox: "view-box" }}
        width={16}
        x={cx - 8}
        y={FACE.y - 13}
      />
    </motion.g>
  );
}

export function DeskBot({ name = "Pip", hue = "sky", idleAfter = 6000, onWake, onDoze, className }: DeskBotProps) {
  const uid = useId().replace(/:/g, "");
  const reduce = useCalmMotion();
  const root = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const inView = useInView(root);
  const live = inView && !reduce;

  const [dozing, setDozing] = useState(false);
  const [near, setNear] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [cheer, setCheer] = useState(0);

  const gazeX = useMotionValue(0);
  const gazeY = useMotionValue(0);
  const lookX = useSpring(gazeX, { stiffness: 260, damping: 26, mass: 0.6 });
  const lookY = useSpring(gazeY, { stiffness: 260, damping: 26, mass: 0.6 });
  const eyesX = useTransform(lookX, (v) => v * 13);
  const eyesY = useTransform(lookY, (v) => v * 8);
  const headTilt = useTransform(lookX, (v) => v * 4);
  const headShift = useTransform(lookX, (v) => v * 3);

  const lid = useBlink(live && !dozing);
  const pop = useMotionValue(1);
  const jolt = useMotionValue(0);
  const eyeScale = useTransform([lid, pop] as const, ([l, p]: number[]) => l * p);

  const idle = useRef<ReturnType<typeof setTimeout>>(undefined);
  const cheerTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const callbacks = useRef({ onWake, onDoze });

  useEffect(() => {
    callbacks.current = { onWake, onDoze };
  });

  const stir = useCallback(() => {
    clearTimeout(idle.current);
    idle.current = setTimeout(() => {
      setDozing(true);
      setNear(false);
      callbacks.current.onDoze?.();
    }, idleAfter);
  }, [idleAfter]);

  useEffect(() => {
    if (dozing || !inView) {
      clearTimeout(idle.current);
      return;
    }
    stir();
    return () => clearTimeout(idle.current);
  }, [dozing, inView, stir]);

  useEffect(() => () => clearTimeout(cheerTimer.current), []);

  useEffect(() => {
    if (dozing) {
      gazeX.set(0);
      gazeY.set(0.55);
      return;
    }
    if (!live || tracking) return;
    let timer: ReturnType<typeof setTimeout>;
    const look = () => {
      const centre = Math.random() < 0.35;
      gazeX.set(centre ? 0 : (Math.random() * 2 - 1) * 0.85);
      gazeY.set(centre ? 0 : (Math.random() * 2 - 1) * 0.55);
      timer = setTimeout(look, 1400 + Math.random() * 2400);
    };
    timer = setTimeout(look, 700);
    return () => clearTimeout(timer);
  }, [live, tracking, dozing, gazeX, gazeY]);

  useEffect(() => {
    if (!reduce) return;
    gazeX.set(0);
    gazeY.set(dozing ? 0.55 : 0);
  }, [reduce, dozing, gazeX, gazeY]);

  const follow = (e: PointerEvent<HTMLDivElement>) => {
    if (dozing) return;
    stir();
    if (e.pointerType === "touch" || reduce) return;
    const box = svg.current?.getBoundingClientRect();
    if (!box?.width) return;
    const unit = box.width / VB.w;
    const dx = (e.clientX - box.left) / unit + VB.x - FACE.x;
    const dy = (e.clientY - box.top) / unit + VB.y - FACE.y;
    const reach = Math.hypot(dx, dy, 80);
    gazeX.set(dx / reach);
    gazeY.set(dy / reach);
    setTracking(true);
    setNear(Math.hypot(dx, dy) < 150);
  };

  const release = () => {
    setTracking(false);
    setNear(false);
    gazeX.set(0);
    gazeY.set(0);
  };

  const poke = () => {
    stir();
    if (dozing) {
      setDozing(false);
      callbacks.current.onWake?.();
      if (!reduce) {
        animate(pop, [0.2, 1.18, 1], { duration: 0.45, ease: [0.23, 1, 0.32, 1], times: [0, 0.55, 1] });
        animate(jolt, [0, -10, 0], { duration: 0.45, ease: [0.23, 1, 0.32, 1], times: [0, 0.4, 1] });
      }
      return;
    }
    setCheer((c) => c + 1);
    clearTimeout(cheerTimer.current);
    cheerTimer.current = setTimeout(() => setCheer(0), 1100);
    if (!reduce) animate(jolt, [0, -6, 0], { duration: 0.36, ease: [0.23, 1, 0.32, 1], times: [0, 0.4, 1] });
  };

  const happy = cheer > 0 && !dozing;
  const eyes = dozing ? "closed" : happy ? "happy" : "open";
  const perked = (near || happy) && !dozing;
  const settle = { duration: reduce ? 0 : 1.1, ease: [0.65, 0, 0.35, 1] as const };

  return (
    <div
      ref={root}
      className={cn(
        "relative w-full max-w-[420px] overflow-hidden rounded-2xl border bg-card p-4 shadow-xs/5 sm:p-6",
        hues[hue],
        className,
      )}
      onPointerLeave={release}
      onPointerMove={follow}
    >
      <div
        aria-hidden
        className="dot-grid pointer-events-none absolute inset-0 opacity-50 [mask-image:radial-gradient(closest-side,black,transparent)]"
      />
      <button
        aria-label={dozing ? `${name} is asleep. Wake ${name} up` : `Give ${name} a pat`}
        className="relative mx-auto block aspect-[90/53] w-full max-w-[380px] cursor-pointer rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onBlur={() => setNear(false)}
        onClick={poke}
        onFocus={(e) => e.currentTarget.matches(":focus-visible") && !dozing && setNear(true)}
        type="button"
      >
        <svg aria-hidden className="absolute inset-0 size-full overflow-visible" ref={svg} viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`}>
          <defs>
            <linearGradient id={`${uid}-shell`} x1="0.15" x2="0.85" y1="0" y2="1">
              <stop offset="0" stopColor="var(--hue-hi)" />
              <stop offset="1" stopColor="var(--hue)" />
            </linearGradient>
          </defs>

          <line className="stroke-foreground/10" strokeLinecap="round" strokeWidth={1.5} x1={36} x2={364} y1={229} y2={229} />
          <motion.ellipse
            animate={live && !dozing ? { rx: [64, 60, 64] } : { rx: 64 }}
            className="fill-foreground/8"
            cx={200}
            cy={229}
            ry={5}
            transition={live && !dozing ? { duration: 3.2, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY } : { duration: 0.6 }}
          />

          <g>
            <rect className="fill-card stroke-foreground/25" height={30} rx={6} strokeWidth={1.5} width={30} x={62} y={198} />
            <path className="fill-none stroke-foreground/25" d="M92 206 h4 a7 7 0 0 1 0 14 h-4" strokeWidth={1.5} />
            <rect className="fill-(--hue)" height={5} width={28.5} x={62.75} y={208} />
            {live &&
              steam.map((s) => (
                <motion.path
                  animate={{ opacity: [0, 0.7, 0], y: [4, -6, -14] }}
                  className="fill-none stroke-foreground/20"
                  d={`M${s.x} 190 q -4 -5 0 -10 q 4 -5 0 -10`}
                  initial={{ opacity: 0 }}
                  key={s.x}
                  strokeLinecap="round"
                  strokeWidth={2}
                  transition={{ delay: s.delay, duration: 2.6, ease: "easeOut", repeat: Number.POSITIVE_INFINITY }}
                />
              ))}
          </g>

          <g>
            <rect className="fill-card stroke-foreground/25" height={12} rx={3} strokeWidth={1.5} width={58} x={296} y={216} />
            <rect className="fill-(--hue-hi)" height={12} rx={3} width={52} x={302} y={204} />
            <line className="stroke-black/10" strokeWidth={1.5} x1={310} x2={346} y1={210} y2={210} />
            <line className="stroke-foreground/15" strokeWidth={1.5} x1={302} x2={348} y1={222} y2={222} />
          </g>

          <motion.g
            animate={live ? (dozing ? { y: [3, 5, 3] } : { y: [0, -2, 0] }) : { y: dozing ? 3 : 0 }}
            transition={
              live ? { duration: dozing ? 3.8 : 2.8, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY } : { duration: 0.6 }
            }
          >
            <rect className="fill-(--hue-deep)" height={24} rx={10} width={72} x={164} y={205} />
            <rect className="fill-white/20" height={3} rx={1.5} width={52} x={174} y={209} />
            <rect className="fill-(--hue-deep)" height={18} width={20} x={190} y={192} />

            <motion.g style={{ y: jolt }}>
              <motion.g
                style={{ rotate: headTilt, x: headShift, originX: "200px", originY: "200px", transformBox: "view-box" }}
              >
                <motion.g
                  animate={
                    happy && !reduce
                      ? { rotate: [0, -16, 12, -6, 0], y: -9 }
                      : perked
                        ? { rotate: 0, y: -9 }
                        : dozing
                          ? { rotate: 26, y: 3 }
                          : { rotate: 0, y: 0 }
                  }
                  initial={false}
                  style={{ originX: "200px", originY: "96px", transformBox: "view-box" }}
                  transition={
                    reduce
                      ? { duration: 0 }
                      : happy
                        ? { duration: 0.6, ease: "easeOut" }
                        : dozing
                          ? settle
                          : { type: "spring", stiffness: 480, damping: 13 }
                  }
                >
                  <line className="stroke-(--hue-deep)" strokeLinecap="round" strokeWidth={4} x1={200} x2={200} y1={100} y2={60} />
                  <circle className="fill-(--hue-deep)" cx={200} cy={56} r={8} />
                  <motion.circle
                    animate={{ opacity: perked ? 1 : 0 }}
                    className="fill-amber-300"
                    cx={200}
                    cy={56}
                    initial={false}
                    r={8}
                    transition={{ duration: 0.2 }}
                  />
                  <motion.circle
                    animate={perked && live ? { opacity: [0.5, 0], scale: [1, 1.9] } : { opacity: 0, scale: 1 }}
                    className="fill-amber-300/40"
                    cx={200}
                    cy={56}
                    r={8}
                    style={{ originX: "200px", originY: "56px", transformBox: "view-box" }}
                    transition={perked && live ? { duration: 1.2, ease: "easeOut", repeat: Number.POSITIVE_INFINITY } : { duration: 0.2 }}
                  />
                  <circle className="fill-white/50" cx={197} cy={53} r={2.2} />
                </motion.g>

                <rect className="fill-(--hue-deep)" height={40} rx={6} width={16} x={114} y={124} />
                <rect className="fill-(--hue-deep)" height={40} rx={6} width={16} x={270} y={124} />
                <rect fill={`url(#${uid}-shell)`} height={118} rx={36} width={152} x={124} y={84} />
                <path className="fill-none stroke-white/45" d="M146 110 q6 -14 24 -18" strokeLinecap="round" strokeWidth={5} />
                <rect className="fill-(--ink)" height={78} rx={24} width={116} x={142} y={102} />
                <path className="fill-white/[0.06]" d="M166 102 h40 l-30 78 h-10 a24 24 0 0 1 -24 -24 v-30 a24 24 0 0 1 24 -24 Z" />

                <motion.g
                  animate={{ opacity: perked ? 0.85 : dozing ? 0.35 : 0.55 }}
                  className="fill-rose-400"
                  initial={false}
                  transition={{ duration: 0.3 }}
                >
                  <ellipse cx={162} cy={160} rx={8} ry={4.5} />
                  <ellipse cx={238} cy={160} rx={8} ry={4.5} />
                </motion.g>

                <motion.g className="[filter:drop-shadow(0_0_5px_var(--glow))]" style={{ x: eyesX, y: eyesY }}>
                  <motion.g
                    animate={{ opacity: eyes === "open" ? 1 : 0 }}
                    initial={false}
                    transition={{ duration: eyes === "closed" ? 0.5 : 0.12 }}
                  >
                    <Eye cx={178} near={perked} scaleY={eyeScale} />
                    <Eye cx={222} near={perked} scaleY={eyeScale} />
                  </motion.g>
                  <motion.g
                    animate={{ opacity: eyes === "happy" ? 1 : 0 }}
                    className="fill-none stroke-(--glow)"
                    initial={false}
                    strokeLinecap="round"
                    strokeWidth={4.5}
                    transition={{ duration: 0.12 }}
                  >
                    <path d="M169 145 q9 -12 18 0" />
                    <path d="M213 145 q9 -12 18 0" />
                  </motion.g>
                </motion.g>

                <motion.g
                  animate={{ opacity: eyes === "closed" ? 1 : 0 }}
                  className="fill-none stroke-(--glow)"
                  initial={false}
                  strokeLinecap="round"
                  strokeWidth={4}
                  transition={{ duration: eyes === "closed" ? 0.6 : 0.12, delay: eyes === "closed" && !reduce ? 0.25 : 0 }}
                >
                  <path d="M170 146 q8 6 16 0" />
                  <path d="M214 146 q8 6 16 0" />
                </motion.g>

                <motion.path
                  animate={{
                    d: dozing ? "M195 165 q5 0 10 0" : perked ? "M191 162 q9 10 18 0" : "M194 163 q6 6 12 0",
                  }}
                  className="fill-none stroke-(--glow)"
                  initial={false}
                  strokeLinecap="round"
                  strokeWidth={3}
                  transition={{ duration: reduce ? 0 : 0.25, ease: "easeOut" }}
                />
              </motion.g>
            </motion.g>
          </motion.g>

          {dozing &&
            zs.map((z) => (
              <motion.text
                animate={
                  live
                    ? { opacity: [0, 1, 1, 0], x: [0, 6, 10, 14], y: [6, -4, -12, -20] }
                    : { opacity: 1, x: 0, y: 0 }
                }
                className="fill-(--hue-deep) font-semibold dark:fill-(--hue-hi)"
                fontSize={z.size}
                initial={{ opacity: 0 }}
                key={z.x}
                transition={
                  live
                    ? { delay: 0.6 + z.delay, duration: 2.7, ease: "easeOut", repeat: Number.POSITIVE_INFINITY, times: [0, 0.25, 0.7, 1] }
                    : { duration: 0.3 }
                }
                x={z.x}
                y={z.y}
              >
                z
              </motion.text>
            ))}
        </svg>
      </button>

      <div className="relative mt-3 text-center" aria-live="polite">
        <p className="text-balance font-medium text-foreground text-sm">
          {dozing ? `${name} dozed off` : `${name} is keeping you company`}
        </p>
        <p className="mx-auto mt-1 min-h-8 max-w-[34ch] text-pretty text-muted-foreground text-xs">
          {dozing ? `You stepped away for a bit. Give ${name} a tap to wake it.` : `Nothing needs you right now. Step away and ${name} will nap.`}
        </p>
      </div>
    </div>
  );
}
