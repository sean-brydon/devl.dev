"use client";

import {
  type AnimationPlaybackControls,
  animate,
  type MotionValue,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type LaunchPadHue = "sky" | "emerald" | "amber" | "violet" | "rose" | "orange" | "indigo" | "teal";

const hues: Record<LaunchPadHue, string> = {
  sky: "[--hue:var(--color-sky-500)] [--hue-soft:var(--color-sky-200)] [--hue-deep:var(--color-sky-700)]",
  emerald:
    "[--hue:var(--color-emerald-500)] [--hue-soft:var(--color-emerald-200)] [--hue-deep:var(--color-emerald-700)]",
  amber: "[--hue:var(--color-amber-500)] [--hue-soft:var(--color-amber-200)] [--hue-deep:var(--color-amber-700)]",
  violet: "[--hue:var(--color-violet-500)] [--hue-soft:var(--color-violet-200)] [--hue-deep:var(--color-violet-700)]",
  rose: "[--hue:var(--color-rose-500)] [--hue-soft:var(--color-rose-200)] [--hue-deep:var(--color-rose-700)]",
  orange: "[--hue:var(--color-orange-500)] [--hue-soft:var(--color-orange-200)] [--hue-deep:var(--color-orange-700)]",
  indigo: "[--hue:var(--color-indigo-500)] [--hue-soft:var(--color-indigo-200)] [--hue-deep:var(--color-indigo-700)]",
  teal: "[--hue:var(--color-teal-500)] [--hue-soft:var(--color-teal-200)] [--hue-deep:var(--color-teal-700)]",
};

type Phase = "ready" | "ignition" | "liftoff" | "landing" | "landed";

const phaseCopy: Record<Phase, string> = {
  ready: "Ready",
  ignition: "Ignition",
  liftoff: "Liftoff",
  landing: "Landing",
  landed: "Landed",
};

export interface LaunchPadProps {
  hue?: LaunchPadHue;
  name?: string;
  onLaunch?: () => void;
  onLanded?: () => void;
  className?: string;
}

const CX = 220;
const PAD_Y = 236;
const GROUND_Y = 262;
const FLIGHT = 360;

const smoke = [
  { dx: -1, spread: 74, lift: 14, r: 15, delay: 0 },
  { dx: 1, spread: 78, lift: 12, r: 16, delay: 0.02 },
  { dx: -1, spread: 42, lift: 22, r: 19, delay: 0.05 },
  { dx: 1, spread: 46, lift: 20, r: 18, delay: 0.06 },
  { dx: -1, spread: 14, lift: 8, r: 20, delay: 0.08 },
  { dx: 1, spread: 16, lift: 10, r: 19, delay: 0.1 },
  { dx: -1, spread: 58, lift: 18, r: 17, delay: 0.03 },
  { dx: 1, spread: 30, lift: 16, r: 17, delay: 0.07 },
];

const steam = [
  { x: CX - 46, delay: 0 },
  { x: CX - 46, delay: 1.4 },
  { x: CX + 46, delay: 0.7 },
  { x: CX + 46, delay: 2.1 },
];

function SmokeCloud({
  progress,
  size,
  dx,
  spread,
  lift,
  r,
  delay,
}: (typeof smoke)[number] & { progress: MotionValue<number>; size: MotionValue<number> }) {
  const local = useTransform(progress, (p) => Math.min(1, Math.max(0, (p - delay) / (1 - delay))));
  const x = useTransform([local, size] as const, ([p, s]: number[]) => CX + dx * spread * s * (1 - (1 - p) ** 3));
  const y = useTransform([local, size] as const, ([p, s]: number[]) => GROUND_Y - 6 - lift * s * p);
  // Fades by shrinking, not opacity, so the goo threshold pinches clouds off cleanly instead of fringing.
  const scale = useTransform([local, size] as const, ([p, s]: number[]) => {
    const grow = 0.4 + p * 0.8;
    const fade = p < 0.06 ? p / 0.06 : p > 0.7 ? Math.max(0, 1 - (p - 0.7) / 0.3) : 1;
    return grow * fade * (0.55 + s * 0.45);
  });
  return <motion.circle className="fill-(--smoke)" cx={0} cy={0} r={r} style={{ scale, x, y }} />;
}

function useCalmMotion() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && !!prefers;
}

export function LaunchPad({ hue = "sky", name = "Kestrel-1", onLaunch, onLanded, className }: LaunchPadProps) {
  const uid = useId().replace(/:/g, "");
  const reduce = useCalmMotion();
  const root = useRef<HTMLDivElement>(null);
  const inView = useInView(root);
  const live = inView && !reduce;
  const [phase, setPhase] = useState<Phase>("ready");

  const y = useMotionValue(0);
  const shake = useMotionValue(0);
  const flame = useMotionValue(0);
  const arm = useMotionValue(0);
  const puff = useMotionValue(0);
  const puffSize = useMotionValue(1);
  const trailOpacity = useMotionValue(0);
  const trailSpread = useMotionValue(1);
  const squash = useMotionValue(1);

  const trailScale = useTransform(y, (v) => Math.min(1, Math.max(0, -v / FLIGHT)));
  const flameOpacity = useTransform(flame, [0, 0.15, 1], [0, 1, 1]);
  const smokeOpacity = useTransform(puff, [0, 0.45, 0.95], [1, 1, 0]);
  const glow = useTransform([flame, y] as const, ([f, v]: number[]) => f * Math.max(0, 1 + v / 110));

  const busy = phase !== "ready";
  const run = useRef(0);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const controls = useRef<AnimationPlaybackControls[]>([]);

  useEffect(() => {
    const pending = timers.current;
    const running = controls.current;
    return () => {
      run.current++;
      for (const t of pending) clearTimeout(t);
      for (const c of running) c.stop();
    };
  }, []);

  const wait = (ms: number) =>
    new Promise<void>((resolve) => {
      const t = setTimeout(() => {
        timers.current.delete(t);
        resolve();
      }, ms);
      timers.current.add(t);
    });

  const play = (c: AnimationPlaybackControls) => {
    controls.current.push(c);
    return c;
  };

  const launch = async () => {
    if (busy) return;
    const id = ++run.current;
    const alive = () => run.current === id;
    controls.current = [];
    onLaunch?.();
    setPhase("ignition");

    if (reduce) {
      await wait(500);
      if (!alive()) return;
      setPhase("liftoff");
      await wait(900);
      if (!alive()) return;
      setPhase("landed");
      onLanded?.();
      await wait(1400);
      if (alive()) setPhase("ready");
      return;
    }

    play(animate(arm, -42, { duration: 0.4, ease: [0.23, 1, 0.32, 1] }));
    play(animate(flame, 1, { duration: 0.3, ease: "easeOut" }));
    play(animate(shake, [0, -1.2, 1.2, -1, 1, -0.8, 0.8, -0.4, 0], { duration: 0.65, ease: "linear" }));
    puffSize.set(1);
    puff.set(0);
    play(animate(puff, 1, { duration: 2.4, ease: [0.2, 0.7, 0.3, 1] }));
    trailOpacity.set(1);
    trailSpread.set(1);
    await wait(600);
    if (!alive()) return;

    setPhase("liftoff");
    await play(animate(y, -FLIGHT - 60, { duration: 1.45, ease: [0.6, 0, 0.9, 0.35] }));
    if (!alive()) return;
    play(animate(trailOpacity, 0, { duration: 1.1, ease: "easeOut" }));
    play(animate(trailSpread, 2.2, { duration: 1.1, ease: "easeOut" }));
    await wait(700);
    if (!alive()) return;

    setPhase("landing");
    const down = play(animate(y, 0, { duration: 1.7, ease: [0.15, 0.6, 0.25, 1] }));
    const throttle = setTimeout(() => play(animate(flame, 0.55, { duration: 0.5 })), 900);
    timers.current.add(throttle);
    await down;
    if (!alive()) return;
    play(animate(flame, 0, { duration: 0.2, ease: "easeOut" }));
    play(animate(squash, [1, 0.94, 1], { duration: 0.35, ease: [0.23, 1, 0.32, 1] }));
    puffSize.set(0.45);
    puff.set(0);
    play(animate(puff, 1, { duration: 1.4, ease: [0.2, 0.7, 0.3, 1] }));
    setPhase("landed");
    onLanded?.();
    await wait(450);
    if (!alive()) return;
    play(animate(arm, 0, { duration: 0.6, ease: [0.65, 0, 0.35, 1] }));
    await wait(1100);
    if (alive()) setPhase("ready");
  };

  const statusTone =
    phase === "ready" || phase === "landed" ? "bg-success" : phase === "ignition" ? "bg-warning" : "bg-(--hue)";

  return (
    <div
      ref={root}
      className={cn(
        "relative w-full max-w-[480px] overflow-hidden rounded-2xl border bg-card shadow-xs/5",
        "[--smoke:color-mix(in_oklab,var(--color-foreground)_12%,var(--color-card))] dark:[--smoke:color-mix(in_oklab,var(--color-foreground)_24%,var(--color-card))] [--flame-hot:var(--color-amber-300)] [--flame-glow:var(--color-amber-400)]",
        hues[hue],
        className,
      )}
    >
      <div
        aria-hidden
        className="dot-grid pointer-events-none absolute inset-0 opacity-50 [mask-image:radial-gradient(closest-side,black,transparent)]"
      />

      <div className="pointer-events-none absolute inset-x-4 top-4 z-10 flex items-center justify-between sm:inset-x-5 sm:top-5">
        <div className="flex items-center gap-2 rounded-full border bg-popover/90 py-1 pr-2.5 pl-2 text-xs shadow-xs/5 backdrop-blur-sm">
          <span className="relative flex size-2">
            {phase === "ignition" && !reduce && (
              <span className={cn("absolute inset-0 animate-ping rounded-full opacity-60", statusTone)} />
            )}
            <span className={cn("relative size-2 rounded-full transition-colors duration-300", statusTone)} />
          </span>
          <span className="font-medium text-foreground">{name}</span>
          <span className="inline-block min-w-[3.75rem] text-muted-foreground" aria-live="polite">
            {phaseCopy[phase]}
          </span>
        </div>
        <motion.span
          animate={{ opacity: busy ? 0 : 1 }}
          className="text-muted-foreground text-xs"
          initial={false}
          transition={{ duration: 0.2 }}
        >
          Click to launch
        </motion.span>
      </div>

      <button
        aria-label={busy ? `${name}: ${phaseCopy[phase]}` : `Launch ${name}`}
        aria-disabled={busy}
        className={cn(
          "group/pad relative block aspect-[32/25] w-full cursor-pointer rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
          busy && "cursor-default",
        )}
        onClick={launch}
        type="button"
      >
        <svg aria-hidden className="absolute inset-0 size-full overflow-visible" viewBox={`${CX - 160} 42 320 250`}>
          <defs>
            <linearGradient id={`${uid}-trail`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="var(--flame-hot)" stopOpacity="0.8" />
              <stop offset="0.1" stopColor="var(--smoke)" stopOpacity="0.95" />
              <stop offset="0.75" stopColor="var(--smoke)" stopOpacity="0.85" />
              <stop offset="1" stopColor="var(--smoke)" stopOpacity="0.4" />
            </linearGradient>
            <filter filterUnits="userSpaceOnUse" height={FLIGHT + 200} id={`${uid}-soft`} width={200} x={CX - 100} y={PAD_Y - FLIGHT - 120}>
              <feGaussianBlur stdDeviation="2.5" />
            </filter>
            <filter filterUnits="userSpaceOnUse" height={140} id={`${uid}-goo`} width={320} x={CX - 160} y={PAD_Y - 90}>
              <feGaussianBlur in="SourceGraphic" result="blur" stdDeviation="4" />
              <feColorMatrix in="blur" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -8" />
            </filter>
            <clipPath id={`${uid}-sky`}>
              <rect height={GROUND_Y + 1000} width={800} x={-200} y={-1000} />
            </clipPath>
            <linearGradient id={`${uid}-glass`} x1="0" x2="1" y1="0" y2="1">
              <stop offset="0" stopColor="var(--hue-soft)" />
              <stop offset="1" stopColor="var(--hue)" />
            </linearGradient>
            <radialGradient cx="0.5" cy="0" id={`${uid}-glow`} r="0.8">
              <stop offset="0" stopColor="var(--flame-glow)" stopOpacity="0.35" />
              <stop offset="1" stopColor="var(--flame-glow)" stopOpacity="0" />
            </radialGradient>
          </defs>

          <line className="stroke-foreground/10" strokeLinecap="round" strokeWidth={1.5} x1={CX - 150} x2={CX + 150} y1={GROUND_Y} y2={GROUND_Y} />
          <motion.ellipse
            cx={CX}
            cy={PAD_Y + 2}
            fill={`url(#${uid}-glow)`}
            rx={64}
            ry={22}
            style={{ opacity: glow }}
          />

          <g className="stroke-foreground/25" fill="none" strokeLinecap="round" strokeWidth={1.5}>
            <line x1={138} x2={138} y1={118} y2={GROUND_Y} />
            <line x1={152} x2={152} y1={118} y2={GROUND_Y} />
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <path d={`M138 ${126 + i * 22} L152 ${146 + i * 22} M152 ${126 + i * 22} L138 ${146 + i * 22}`} key={i} strokeWidth={1} />
            ))}
            <line x1={135} x2={155} y1={118} y2={118} />
          </g>
          <circle className="fill-(--hue)" cx={145} cy={113} r={2.5}>
            {live && <animate attributeName="opacity" dur="2.4s" repeatCount="indefinite" values="1;0.25;1" />}
          </circle>
          <motion.g style={{ rotate: arm, originX: "152px", originY: "168px", transformBox: "view-box" }}>
            <rect className="fill-card stroke-foreground/25" height={7} rx={2} strokeWidth={1.5} width={47} x={152} y={164.5} />
            <line className="stroke-foreground/20" strokeWidth={1} x1={160} x2={192} y1={168} y2={168} />
          </motion.g>

          <motion.g filter={`url(#${uid}-soft)`} style={{ opacity: trailOpacity }}>
            <motion.g style={{ originX: `${CX}px`, originY: `${PAD_Y}px`, scaleX: trailSpread, transformBox: "view-box" }}>
              <motion.path
                d={`M${CX - 4} ${PAD_Y - FLIGHT - 60} Q ${CX} ${PAD_Y - FLIGHT - 66} ${CX + 4} ${PAD_Y - FLIGHT - 60} L ${CX + 13} ${PAD_Y} H ${CX - 13} Z`}
                fill={`url(#${uid}-trail)`}
                style={{ originX: "50%", originY: "100%", scaleY: trailScale }}
              />
            </motion.g>
          </motion.g>

          <path
            className="stroke-foreground/25"
            d={`M${CX + 58} ${PAD_Y + 12} H${CX + 84}`}
            fill="none"
            strokeLinecap="round"
            strokeWidth={1.5}
          />
          <g className="stroke-foreground/25" strokeLinecap="round" strokeWidth={1.5}>
            <line x1={CX + 90} x2={CX + 87} y1={PAD_Y + 10} y2={GROUND_Y} />
            <line x1={CX + 112} x2={CX + 115} y1={PAD_Y + 10} y2={GROUND_Y} />
          </g>
          <rect className="fill-card stroke-foreground/25" height={64} rx={13} strokeWidth={1.5} width={26} x={CX + 88} y={PAD_Y - 50} />
          <path className="fill-foreground/[0.05]" d={`M${CX + 107} ${PAD_Y - 49} a12 12 0 0 1 6 11 v38 a12 12 0 0 1 -6 11 Z`} />
          <rect className="fill-(--hue)" height={5} width={24.5} x={CX + 88.75} y={PAD_Y - 24} />
          <line className="stroke-foreground/15" strokeLinecap="round" strokeWidth={1.5} x1={CX + 101} x2={CX + 101} y1={PAD_Y - 58} y2={PAD_Y - 50} />
          <circle className="fill-card stroke-foreground/25" cx={CX + 101} cy={PAD_Y - 60} r={2.5} strokeWidth={1.5} />

          <g clipPath={`url(#${uid}-sky)`}>
          <motion.g style={{ x: shake, y }}>
            <motion.g style={{ originX: `${CX}px`, originY: `${PAD_Y}px`, scaleY: squash, transformBox: "view-box" }}>
              <motion.g style={{ opacity: flameOpacity, originX: `${CX}px`, originY: `${PAD_Y}px`, scale: flame, transformBox: "view-box" }}>
                <motion.g
                  animate={live ? { scaleY: [1, 0.84, 1.08, 0.9, 1], scaleX: [1, 1.06, 0.96, 1.04, 1] } : undefined}
                  style={{ originX: `${CX}px`, originY: `${PAD_Y}px`, transformBox: "view-box" }}
                  transition={{ duration: 0.32, ease: "linear", repeat: Number.POSITIVE_INFINITY }}
                >
                  <path className="fill-orange-400" d={`M${CX - 11} ${PAD_Y + 2} C ${CX - 12} ${PAD_Y + 22}, ${CX - 3} ${PAD_Y + 34}, ${CX} ${PAD_Y + 46} C ${CX + 3} ${PAD_Y + 34}, ${CX + 12} ${PAD_Y + 22}, ${CX + 11} ${PAD_Y + 2} Z`} />
                  <path className="fill-amber-200" d={`M${CX - 6} ${PAD_Y + 2} C ${CX - 6} ${PAD_Y + 14}, ${CX - 2} ${PAD_Y + 20}, ${CX} ${PAD_Y + 28} C ${CX + 2} ${PAD_Y + 20}, ${CX + 6} ${PAD_Y + 14}, ${CX + 6} ${PAD_Y + 2} Z`} />
                </motion.g>
              </motion.g>

              <path className="fill-(--hue)" d={`M${CX - 19} ${PAD_Y - 44} L${CX - 34} ${PAD_Y - 18} L${CX - 34} ${PAD_Y - 2} L${CX - 19} ${PAD_Y - 12} Z`} />
              <path className="fill-(--hue-deep)" d={`M${CX + 19} ${PAD_Y - 44} L${CX + 34} ${PAD_Y - 18} L${CX + 34} ${PAD_Y - 2} L${CX + 19} ${PAD_Y - 12} Z`} />
              <path className="fill-(--hue-deep)" d={`M${CX - 10} ${PAD_Y - 6} L${CX + 10} ${PAD_Y - 6} L${CX + 12} ${PAD_Y + 2} L${CX - 12} ${PAD_Y + 2} Z`} />
              <path
                className="fill-white stroke-black/10"
                d={`M${CX - 19} ${PAD_Y - 6} L${CX - 19} ${PAD_Y - 66} C ${CX - 19} ${PAD_Y - 92}, ${CX - 9} ${PAD_Y - 108}, ${CX} ${PAD_Y - 118} C ${CX + 9} ${PAD_Y - 108}, ${CX + 19} ${PAD_Y - 92}, ${CX + 19} ${PAD_Y - 66} L${CX + 19} ${PAD_Y - 6} Z`}
                strokeWidth={1}
              />
              <path
                className="fill-(--hue)"
                d={`M${CX - 13.5} ${PAD_Y - 92} C ${CX - 10} ${PAD_Y - 102}, ${CX - 5} ${PAD_Y - 111}, ${CX} ${PAD_Y - 118} C ${CX + 5} ${PAD_Y - 111}, ${CX + 10} ${PAD_Y - 102}, ${CX + 13.5} ${PAD_Y - 92} Z`}
              />
              <path
                className="fill-black/[0.07]"
                d={`M${CX + 6} ${PAD_Y - 6} L${CX + 6} ${PAD_Y - 66} C ${CX + 6} ${PAD_Y - 90}, ${CX + 3} ${PAD_Y - 106}, ${CX} ${PAD_Y - 118} C ${CX + 9} ${PAD_Y - 108}, ${CX + 19} ${PAD_Y - 92}, ${CX + 19} ${PAD_Y - 66} L${CX + 19} ${PAD_Y - 6} Z`}
              />
              <rect className="fill-(--hue)" height={4} rx={1} width={38} x={CX - 19} y={PAD_Y - 24} />
              <circle className="fill-(--hue-deep)" cx={CX} cy={PAD_Y - 70} r={10} />
              <circle cx={CX} cy={PAD_Y - 70} fill={`url(#${uid}-glass)`} r={7} />
              <path className="fill-white/70" d={`M${CX - 4.5} ${PAD_Y - 72} a 5 5 0 0 1 4 -3.6 l 0.6 1.6 a 3.4 3.4 0 0 0 -2.8 2.6 Z`} />
            </motion.g>
          </motion.g>
          </g>

          <path className="fill-card stroke-foreground/20" d={`M${CX - 58} ${PAD_Y + 2} h116 l10 ${GROUND_Y - PAD_Y - 2} h-136 Z`} strokeLinejoin="round" strokeWidth={1.5} />
          <line className="stroke-foreground/10" strokeWidth={1} x1={CX - 54} x2={CX + 54} y1={PAD_Y + 9} y2={PAD_Y + 9} />
          {[-1, 1].map((side) => (
            <circle className="fill-(--hue)" cx={CX + side * 48} cy={PAD_Y + 16} key={side} r={2.25}>
              {live && (
                <animate attributeName="opacity" begin={side > 0 ? "1.2s" : "0s"} dur="2.4s" repeatCount="indefinite" values="1;0.3;1" />
              )}
            </circle>
          ))}

          {!reduce && (
            <g clipPath={`url(#${uid}-sky)`}>
              <g filter={`url(#${uid}-goo)`}>
                {live &&
                  steam.map((st) => (
                    <motion.circle
                      animate={busy ? { r: 0 } : { cy: [PAD_Y + 4, PAD_Y - 30], r: [2, 8, 0] }}
                      className="fill-(--smoke)"
                      cx={st.x}
                      cy={PAD_Y + 4}
                      initial={{ r: 0 }}
                      key={`${st.x}-${st.delay}`}
                      transition={
                        busy
                          ? { duration: 0.2 }
                          : { delay: st.delay, duration: 2.8, ease: "easeOut", repeat: Number.POSITIVE_INFINITY, times: [0, 0.45, 1] }
                      }
                    />
                  ))}
              </g>
              <motion.g style={{ opacity: smokeOpacity }}>
                <g filter={`url(#${uid}-goo)`}>
                  {smoke.map((c) => (
                    <SmokeCloud key={`${c.dx}-${c.spread}`} progress={puff} size={puffSize} {...c} />
                  ))}
                </g>
              </motion.g>
            </g>
          )}
        </svg>
      </button>
    </div>
  );
}
