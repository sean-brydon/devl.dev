"use client";

import {
  AnimatePresence,
  animate,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type InboxZeroHue = "sky" | "emerald" | "amber" | "violet" | "rose" | "orange" | "indigo" | "teal";

const hues: Record<InboxZeroHue, string> = {
  sky: "[--hue:var(--color-sky-500)] [--hue-deep:var(--color-sky-700)]",
  emerald: "[--hue:var(--color-emerald-500)] [--hue-deep:var(--color-emerald-700)]",
  amber: "[--hue:var(--color-amber-500)] [--hue-deep:var(--color-amber-700)]",
  violet: "[--hue:var(--color-violet-500)] [--hue-deep:var(--color-violet-700)]",
  rose: "[--hue:var(--color-rose-500)] [--hue-deep:var(--color-rose-700)]",
  orange: "[--hue:var(--color-orange-500)] [--hue-deep:var(--color-orange-700)]",
  indigo: "[--hue:var(--color-indigo-500)] [--hue-deep:var(--color-indigo-700)]",
  teal: "[--hue:var(--color-teal-500)] [--hue-deep:var(--color-teal-700)]",
};

type Phase = "waiting" | "sending" | "clear";

export interface InboxZeroProps {
  title?: string;
  description?: string;
  hue?: InboxZeroHue;
  loop?: boolean;
  className?: string;
}

const W = 400;
const H = 240;
const WIN = { x: 132, y: 18, w: 136, h: 120 };
const DESK_Y = 192;
const LIFT_Y = DESK_Y - 52;
const FLIGHT = `M136 ${LIFT_Y} C 150 118 170 112 196 112 C 224 112 232 78 208 70 C 186 63 174 92 196 99 C 216 105 226 76 246 50`;

function Plane() {
  return (
    <g transform="scale(1.35)">
      <path className="fill-(--hue)" d="M-13 -7 L15 0 L-7 0 Z" />
      <path className="fill-(--hue-deep)" d="M-7 0 L15 0 L-13 7 Z" />
      <path className="fill-white/35" d="M-13 -7 L15 0 L-10 -2.5 Z" />
    </g>
  );
}

const sparkles = [
  { x: 112, y: 44, s: 1, d: 0.1 },
  { x: 290, y: 32, s: 0.8, d: 0.35 },
  { x: 300, y: 104, s: 0.6, d: 0.6 },
  { x: 102, y: 118, s: 0.7, d: 0.85 },
  { x: 214, y: 156, s: 0.55, d: 0.5 },
];

function Sparkle({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <path
      d={`M${x} ${y - 9 * s} C ${x + 1.2 * s} ${y - 2 * s} ${x + 2 * s} ${y - 1.2 * s} ${x + 9 * s} ${y} C ${x + 2 * s} ${y + 1.2 * s} ${x + 1.2 * s} ${y + 2 * s} ${x} ${y + 9 * s} C ${x - 1.2 * s} ${y + 2 * s} ${x - 2 * s} ${y + 1.2 * s} ${x - 9 * s} ${y} C ${x - 2 * s} ${y - 1.2 * s} ${x - 1.2 * s} ${y - 2 * s} ${x} ${y - 9 * s} Z`}
    />
  );
}

function Letter() {
  return (
    <g>
      <rect className="fill-white stroke-black/10" height={32} rx={3} width={48} x={-24} y={-16} />
      <path className="fill-none stroke-(--hue)" d="M-22 -13 L0 3 L22 -13" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
    </g>
  );
}

function useCalmMotion() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && !!prefers;
}

export function InboxZero({
  title = "Inbox zero",
  description = "Every thread handled. Go enjoy the afternoon.",
  hue = "rose",
  loop = true,
  className,
}: InboxZeroProps) {
  const uid = useId().replace(/:/g, "");
  const reduce = useCalmMotion();
  const root = useRef<HTMLDivElement>(null);
  const inView = useInView(root);
  const live = inView && !reduce;
  const [phase, setPhase] = useState<Phase>("waiting");
  const [round, setRound] = useState(0);
  const [folded, setFolded] = useState(false);
  const flight = useRef<SVGPathElement>(null);
  const t = useMotionValue(0);
  const trail = useMotionValue(0);
  const at = (p: number) => {
    const el = flight.current;
    if (!el) return { x: 136, y: LIFT_Y };
    return el.getPointAtLength(Math.min(1, Math.max(0, p)) * el.getTotalLength());
  };
  const planeX = useTransform(t, (p) => at(p).x);
  const planeY = useTransform(t, (p) => at(p).y);
  const planeR = useTransform(t, (p) => {
    const a = at(p - 0.01);
    const b = at(p + 0.01);
    return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
  });
  const planeS = useTransform(t, [0, 0.55, 1], [1, 0.9, 0.42]);
  const planeO = useTransform(t, [0, 0.85, 1], [1, 1, 0]);

  useEffect(() => {
    if (reduce) {
      setPhase("clear");
      return;
    }
    if (!inView) return;
    let alive = true;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const stops: { stop: () => void }[] = [];
    const wait = (ms: number) => new Promise<void>((r) => timers.push(setTimeout(r, ms)));
    (async () => {
      let first = true;
      while (alive) {
        t.set(0);
        trail.set(0);
        setFolded(false);
        setPhase("waiting");
        if (!first) setRound((r) => r + 1);
        first = false;
        await wait(1800);
        if (!alive) return;
        setPhase("sending");
        await wait(320);
        if (!alive) return;
        setFolded(true);
        await wait(160);
        if (!alive) return;
        const fly = animate(t, 1, { duration: 1.5, ease: [0.45, 0, 0.35, 1] });
        stops.push(fly, animate(trail, 1, { duration: 0.2 }));
        await fly;
        if (!alive) return;
        setPhase("clear");
        stops.push(animate(trail, 0, { duration: 0.9, ease: "easeOut" }));
        if (!loop) return;
        await wait(4600);
      }
    })();
    return () => {
      alive = false;
      for (const x of timers) clearTimeout(x);
      for (const x of stops) x.stop();
    };
  }, [loop, reduce, inView, t, trail]);

  const clear = phase === "clear";
  const count = phase === "waiting" ? 1 : 0;

  return (
    <div
      ref={root}
      className={cn(
        "relative w-full max-w-[440px] overflow-hidden rounded-2xl border bg-card p-4 shadow-xs/5 sm:p-6",
        "[--tint:color-mix(in_oklab,var(--color-foreground)_5%,var(--color-card))] [--sky-top:var(--color-sky-300)] [--sky-low:var(--color-sky-100)] [--dawn:var(--color-amber-200)] [--dusk-top:var(--color-indigo-400)] [--dusk-low:var(--color-rose-200)]",
        hues[hue],
        className,
      )}
    >
      <div
        aria-hidden
        className="dot-grid pointer-events-none absolute inset-0 opacity-50 [mask-image:radial-gradient(closest-side,black,transparent)]"
      />
      <div className="relative mx-auto aspect-[5/3] w-full max-w-[400px]">
        <svg aria-hidden className="absolute inset-0 size-full overflow-visible" viewBox={`0 0 ${W} ${H}`}>
          <defs>
            <linearGradient id={`${uid}-dusk`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="var(--dusk-top)" />
              <stop offset="1" stopColor="var(--dusk-low)" />
            </linearGradient>
            <mask height={H} id={`${uid}-dash`} maskUnits="userSpaceOnUse" width={W} x={0} y={0}>
              <path className="stroke-white" d={FLIGHT} fill="none" strokeDasharray="4 5" strokeLinecap="round" strokeWidth={4} />
            </mask>
            <linearGradient id={`${uid}-sky`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="var(--sky-top)" />
              <stop offset="1" stopColor="var(--sky-low)" />
            </linearGradient>
            <radialGradient cx="0.5" cy="1" id={`${uid}-dawn`} r="0.9">
              <stop offset="0" stopColor="var(--dawn)" stopOpacity="0.95" />
              <stop offset="1" stopColor="var(--dawn)" stopOpacity="0" />
            </radialGradient>
            <clipPath id={`${uid}-win`}>
              <rect height={WIN.h} rx={12} width={WIN.w} x={WIN.x} y={WIN.y} />
            </clipPath>
          </defs>

          <g clipPath={`url(#${uid}-win)`}>
            <rect fill={`url(#${uid}-dusk)`} height={WIN.h} width={WIN.w} x={WIN.x} y={WIN.y} />
            <motion.rect
              animate={{ opacity: clear ? 1 : 0 }}
              fill={`url(#${uid}-sky)`}
              height={WIN.h}
              initial={false}
              transition={{ duration: clear ? 1.4 : 0.9, ease: "easeOut" }}
              width={WIN.w}
              x={WIN.x}
              y={WIN.y}
            />
            <motion.rect
              animate={{ opacity: clear ? 1 : 0 }}
              fill={`url(#${uid}-dawn)`}
              height={WIN.h}
              initial={false}
              transition={{ duration: 1.2, ease: "easeOut" }}
              width={WIN.w}
              x={WIN.x}
              y={WIN.y}
            />
            <motion.g
              animate={{ y: clear ? 0 : 104 }}
              initial={false}
              transition={clear ? { delay: 0.15, duration: 1.6, ease: [0.22, 1, 0.36, 1] } : { duration: 0.9, ease: [0.65, 0, 0.35, 1] }}
            >
              <motion.g
                animate={live ? { rotate: 360 } : undefined}
                className="stroke-amber-300"
                strokeLinecap="round"
                strokeWidth={3}
                style={{ originX: "200px", originY: "84px", transformBox: "view-box" }}
                transition={{ duration: 24, ease: "linear", repeat: Number.POSITIVE_INFINITY }}
              >
                {Array.from({ length: 10 }, (_, i) => {
                  const a = (i / 10) * Math.PI * 2;
                  return (
                    <line
                      key={i}
                      x1={200 + Math.cos(a) * 30}
                      x2={200 + Math.cos(a) * 38}
                      y1={84 + Math.sin(a) * 30}
                      y2={84 + Math.sin(a) * 38}
                    />
                  );
                })}
              </motion.g>
              <circle className="fill-amber-300" cx={200} cy={84} r={24} />
              <circle className="fill-amber-400" cx={200} cy={84} r={19} />
            </motion.g>
            {[
              { x: WIN.x + 18, y: 46, s: 1, d: 26 },
              { x: WIN.x + 84, y: 70, s: 0.75, d: 34 },
            ].map((c) => (
              <motion.g
                animate={live ? { x: [0, 26, 0] } : undefined}
                className="fill-white"
                key={c.x}
                transition={{ duration: c.d, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY }}
              >
                <ellipse cx={c.x} cy={c.y} rx={16 * c.s} ry={6 * c.s} />
                <circle cx={c.x - 4 * c.s} cy={c.y - 5 * c.s} r={7 * c.s} />
                <circle cx={c.x + 6 * c.s} cy={c.y - 3 * c.s} r={5.5 * c.s} />
              </motion.g>
            ))}
          </g>
          <rect className="fill-none stroke-foreground/20" height={WIN.h} rx={12} strokeWidth={3} width={WIN.w} x={WIN.x} y={WIN.y} />
          <line className="stroke-foreground/12" strokeWidth={3} x1={WIN.x + WIN.w / 2} x2={WIN.x + WIN.w / 2} y1={WIN.y + 2} y2={WIN.y + WIN.h - 2} />
          <rect className="fill-(--tint) stroke-foreground/15" height={7} rx={3.5} width={WIN.w + 20} x={WIN.x - 10} y={WIN.y + WIN.h + 2} />

          <rect className="fill-(--tint) stroke-foreground/15" height={10} rx={4} width={312} x={44} y={DESK_Y} />
          <g className="stroke-foreground/15" strokeLinecap="round" strokeWidth={3}>
            <line x1={70} x2={70} y1={DESK_Y + 10} y2={H - 4} />
            <line x1={330} x2={330} y1={DESK_Y + 10} y2={H - 4} />
          </g>

          <g>
            <path className="fill-emerald-500" d="M322 158 C 310 150 306 138 310 128 C 320 134 324 146 322 158 Z" />
            <path className="fill-emerald-600" d="M326 160 C 326 144 334 134 346 132 C 346 146 338 156 326 160 Z" />
            <path className="fill-emerald-400" d="M324 162 C 316 158 304 160 298 168 C 308 172 318 170 324 162 Z" />
            <path className="fill-orange-300" d="M308 166 H340 L336 192 H312 Z" />
            <rect className="fill-orange-400" height={6} rx={2} width={36} x={306} y={164} />
          </g>

          <g>
            <path className="fill-none stroke-(--hue-deep)" d="M274 172 h4 a8 8 0 0 1 0 16 h-4" strokeWidth={4} />
            <rect className="fill-(--hue)" height={30} rx={5} width={28} x={248} y={162} />
            <rect className="fill-white/25" height={22} rx={2} width={4} x={253} y={166} />
            {live &&
              [0, 1].map((n) => (
                <motion.path
                  animate={{ opacity: [0, 0.8, 0], y: [4, -10] }}
                  className="fill-none stroke-foreground/25"
                  d={`M${256 + n * 10} 154 q -5 -6 0 -12 q 5 -6 0 -12`}
                  key={n}
                  strokeLinecap="round"
                  strokeWidth={2.5}
                  transition={{ delay: n * 1.1, duration: 2.6, ease: "easeOut", repeat: Number.POSITIVE_INFINITY }}
                />
              ))}
          </g>

          <path className="fill-(--tint) stroke-foreground/20" d={`M88 ${DESK_Y - 30} H184 L178 ${DESK_Y} H94 Z`} strokeLinejoin="round" strokeWidth={1.5} />
          <AnimatePresence>
            {!folded && phase !== "clear" && (
              <motion.g
                animate={
                  phase === "sending"
                    ? { x: 136, y: LIFT_Y, rotate: 0, scale: 1, opacity: 1 }
                    : { x: 136, y: DESK_Y - 30, rotate: -4, scale: 1, opacity: 1 }
                }
                exit={{ opacity: 0, scale: 0.7, transition: { duration: 0.16, ease: "easeIn" } }}
                initial={round === 0 ? false : { x: 136, y: DESK_Y - 110, rotate: 10, scale: 1, opacity: 0 }}
                key={`letter-${round}`}
                transition={
                  phase === "sending"
                    ? { duration: 0.3, ease: [0.23, 1, 0.32, 1] }
                    : { type: "spring", stiffness: 320, damping: 24 }
                }
              >
                <Letter />
              </motion.g>
            )}
          </AnimatePresence>
          <path className="fill-(--tint) stroke-foreground/20" d={`M84 ${DESK_Y - 16} H188 L182 ${DESK_Y} H90 Z`} strokeLinejoin="round" strokeWidth={1.5} />
          <rect className="fill-foreground/15" height={3} rx={1.5} width={30} x={121} y={DESK_Y - 9} />

          <path d={FLIGHT} fill="none" ref={flight} stroke="none" />
          <g mask={`url(#${uid}-dash)`}>
            <motion.path
              className="stroke-foreground/30"
              d={FLIGHT}
              fill="none"
              strokeLinecap="round"
              strokeWidth={2}
              style={{ opacity: trail, pathLength: t }}
            />
          </g>
          {folded && phase !== "waiting" && (
            <motion.g style={{ opacity: planeO, rotate: planeR, scale: planeS, x: planeX, y: planeY }}>
              <motion.g animate={{ opacity: 1, scale: 1 }} initial={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.16, ease: "easeOut" }}>
                <Plane />
              </motion.g>
            </motion.g>
          )}

          <g className="fill-amber-400">
            {sparkles.map((sp) => (
              <motion.g
                animate={
                  clear && !reduce
                    ? { opacity: [0, 1, 0.2, 1, 0], scale: [0.6, 1, 0.8, 1, 0.6] }
                    : { opacity: clear ? 1 : 0, scale: 1 }
                }
                initial={false}
                key={sp.x}
                style={{ originX: "50%", originY: "50%" }}
                transition={clear && !reduce ? { delay: 0.6 + sp.d, duration: 2.6, ease: "easeInOut", repeat: 1 } : { duration: 0.3 }}
              >
                <Sparkle s={sp.s} x={sp.x} y={sp.y} />
              </motion.g>
            ))}
          </g>
        </svg>

        <div className="absolute top-0 left-0 flex items-center gap-1.5 rounded-full border bg-popover py-1 pr-1 pl-2.5 text-xs shadow-xs/5">
          <span className="text-muted-foreground">Inbox</span>
          <span
            className={cn(
              "relative flex h-5 min-w-5 items-center justify-center overflow-hidden rounded-full px-1.5 font-medium tabular-nums transition-colors duration-300",
              count > 0 ? "bg-foreground text-background" : "bg-success/15 text-success-foreground",
            )}
          >
            <AnimatePresence initial={false} mode="popLayout">
              <motion.span
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: reduce ? 0 : count > 0 ? 10 : -10, opacity: 0 }}
                initial={{ y: reduce ? 0 : count > 0 ? -10 : 10, opacity: 0 }}
                key={count}
                transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
              >
                {count}
              </motion.span>
            </AnimatePresence>
          </span>
        </div>
      </div>

      <div className="relative mt-3 text-center">
        <p className="text-balance font-medium text-foreground text-sm">{title}</p>
        <p className="mx-auto mt-1 max-w-[32ch] text-pretty text-muted-foreground text-xs">{description}</p>
      </div>
    </div>
  );
}
