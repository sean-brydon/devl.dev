"use client";

import {
  type AnimationPlaybackControls,
  animate,
  AnimatePresence,
  motion,
  type MotionValue,
  useInView,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import { type PointerEvent, type RefObject, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type NightOwlHue = "violet" | "indigo" | "sky" | "teal" | "amber" | "orange" | "rose" | "emerald";
export type NightOwlMode = "auto" | "awake" | "sleepy";

const hues: Record<NightOwlHue, string> = {
  violet:
    "[--hue-hi:var(--color-violet-300)] [--hue:var(--color-violet-400)] [--hue-deep:var(--color-violet-600)] [--soft:var(--color-violet-100)] [--ink:var(--color-violet-950)]",
  indigo:
    "[--hue-hi:var(--color-indigo-300)] [--hue:var(--color-indigo-400)] [--hue-deep:var(--color-indigo-600)] [--soft:var(--color-indigo-100)] [--ink:var(--color-indigo-950)]",
  sky: "[--hue-hi:var(--color-sky-300)] [--hue:var(--color-sky-400)] [--hue-deep:var(--color-sky-600)] [--soft:var(--color-sky-100)] [--ink:var(--color-sky-950)]",
  teal: "[--hue-hi:var(--color-teal-300)] [--hue:var(--color-teal-400)] [--hue-deep:var(--color-teal-600)] [--soft:var(--color-teal-100)] [--ink:var(--color-teal-950)]",
  amber:
    "[--hue-hi:var(--color-amber-300)] [--hue:var(--color-amber-400)] [--hue-deep:var(--color-amber-600)] [--soft:var(--color-amber-100)] [--ink:var(--color-amber-950)]",
  orange:
    "[--hue-hi:var(--color-orange-300)] [--hue:var(--color-orange-400)] [--hue-deep:var(--color-orange-600)] [--soft:var(--color-orange-100)] [--ink:var(--color-orange-950)]",
  rose: "[--hue-hi:var(--color-rose-300)] [--hue:var(--color-rose-400)] [--hue-deep:var(--color-rose-600)] [--soft:var(--color-rose-100)] [--ink:var(--color-rose-950)]",
  emerald:
    "[--hue-hi:var(--color-emerald-300)] [--hue:var(--color-emerald-400)] [--hue-deep:var(--color-emerald-600)] [--soft:var(--color-emerald-100)] [--ink:var(--color-emerald-950)]",
};

export interface NightOwlProps {
  name?: string;
  hue?: NightOwlHue;
  mode?: NightOwlMode;
  awakeTitle?: string;
  awakeDescription?: string;
  sleepyTitle?: string;
  sleepyDescription?: string;
  onHoot?: () => void;
  className?: string;
}

const VB = { x: 20, y: 24, w: 360, h: 212 };
const FACE = { x: 200, y: 130 };
const EYE_R = 16;
const LID = 36;

const stars = [
  { x: 70, y: 58, s: 1, delay: 0 },
  { x: 112, y: 96, s: 0.65, delay: 1.1 },
  { x: 254, y: 46, s: 0.7, delay: 0.5 },
  { x: 290, y: 112, s: 0.8, delay: 1.7 },
  { x: 356, y: 128, s: 0.6, delay: 0.8 },
  { x: 48, y: 136, s: 0.55, delay: 2.2 },
];

const zs = [
  { size: 12, x: 260, y: 96, delay: 0 },
  { size: 16, x: 272, y: 80, delay: 0.9 },
  { size: 20, x: 282, y: 64, delay: 1.8 },
];

const chevrons = [
  [188, 168],
  [212, 168],
  [176, 182],
  [200, 182],
  [224, 182],
  [188, 196],
  [212, 196],
];

const STAR = "M0 -6 Q1 -1 6 0 Q1 1 0 6 Q-1 1 -6 0 Q-1 -1 0 -6 Z";

function useCalmMotion() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && !!prefers;
}

function useBlink(active: boolean, slow: boolean) {
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
          const twice = !slow && Math.random() < 0.2;
          blink = animate(open, twice ? [1, 0, 1, 0, 1] : [1, 0, 1], {
            duration: slow ? 0.9 : twice ? 0.42 : 0.2,
            ease: "easeInOut",
            times: twice ? [0, 0.18, 0.5, 0.68, 1] : slow ? [0, 0.45, 1] : [0, 0.38, 1],
          });
          schedule();
        },
        slow ? 3200 + Math.random() * 3000 : 2400 + Math.random() * 3600,
      );
    };
    schedule();
    return () => {
      clearTimeout(timer);
      blink?.stop();
    };
  }, [active, slow, open]);
  return open;
}

function useDarkAncestor(ref: RefObject<HTMLElement | null>) {
  const [dark, setDark] = useState<boolean | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => setDark(!!el.closest(".dark"));
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributeFilter: ["class"], attributes: true });
    observer.observe(document.body, { attributeFilter: ["class"], attributes: true });
    return () => observer.disconnect();
  }, [ref]);
  return dark;
}

function Eye({
  cx,
  uid,
  lookX,
  lookY,
  cover,
}: {
  cx: number;
  uid: string;
  lookX: MotionValue<number>;
  lookY: MotionValue<number>;
  cover: MotionValue<number>;
}) {
  const id = `${uid}-eye-${cx}`;
  return (
    <g>
      <clipPath id={id}>
        <circle cx={cx} cy={FACE.y} r={EYE_R} />
      </clipPath>
      <circle className="fill-white" cx={cx} cy={FACE.y} r={EYE_R} />
      <g clipPath={`url(#${id})`}>
        <motion.g style={{ x: lookX, y: lookY }}>
          <circle className="fill-(--ink)" cx={cx} cy={FACE.y} r={8.5} />
          <circle className="fill-white" cx={cx - 3} cy={FACE.y - 3.2} r={2.6} />
        </motion.g>
        <motion.g style={{ y: cover }}>
          <path
            className="fill-(--hue)"
            d={`M${cx - EYE_R - 2} ${FACE.y - EYE_R - LID} H${cx + EYE_R + 2} V${FACE.y - EYE_R} Q${cx} ${FACE.y - EYE_R + 7} ${cx - EYE_R - 2} ${FACE.y - EYE_R} Z`}
          />
          <path
            className="fill-none stroke-(--hue-deep)"
            d={`M${cx - EYE_R - 2} ${FACE.y - EYE_R} Q${cx} ${FACE.y - EYE_R + 7} ${cx + EYE_R + 2} ${FACE.y - EYE_R}`}
            strokeLinecap="round"
            strokeWidth={2.5}
          />
        </motion.g>
      </g>
    </g>
  );
}

export function NightOwl({
  name = "Ollie",
  hue = "violet",
  mode = "auto",
  awakeTitle = "Working late?",
  awakeDescription = "The night shift is better with company.",
  sleepyTitle,
  sleepyDescription = "Owls nap through the day. Switch to dark mode to wake him.",
  onHoot,
  className,
}: NightOwlProps) {
  const uid = useId().replace(/:/g, "");
  const reduce = useCalmMotion();
  const root = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const inView = useInView(root);
  const live = inView && !reduce;
  const dark = useDarkAncestor(root);
  const awake = mode === "awake" || (mode === "auto" && dark !== false);
  const [tracking, setTracking] = useState(false);
  const [hoot, setHoot] = useState(0);
  const [startled, setStartled] = useState(false);
  const alert = awake || startled;

  const gazeX = useMotionValue(0);
  const gazeY = useMotionValue(0);
  const lookX = useSpring(gazeX, { stiffness: 200, damping: 24, mass: 0.7 });
  const lookY = useSpring(gazeY, { stiffness: 200, damping: 24, mass: 0.7 });
  const pupilX = useTransform(lookX, (v) => v * 6.5);
  const pupilY = useTransform(lookY, (v) => v * 5.5);

  const tilt = useMotionValue(0);
  const droop = useMotionValue(0);
  const headRotate = useTransform([tilt, lookX] as const, ([t, l]: number[]) => t + l * 5);
  const heaviness = useMotionValue(0);
  const open = useBlink(live, !alert);
  const cover = useTransform([heaviness, open] as const, ([h, o]: number[]) => (h + (1 - h) * (1 - o)) * (EYE_R * 2 + 2));
  const puff = useMotionValue(1);
  const first = useRef(true);
  const startleTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(startleTimer.current), []);

  useEffect(() => {
    if (mode === "auto" && dark === null) return;
    const target = alert ? 0 : 0.58;
    if (first.current || reduce) {
      first.current = false;
      heaviness.set(target);
      droop.set(alert ? 0 : 1);
      return;
    }
    const lids = animate(heaviness, target, { duration: alert ? 0.35 : 1.4, ease: [0.65, 0, 0.35, 1] });
    const head = animate(droop, alert ? 0 : 1, { duration: alert ? 0.4 : 1.6, ease: [0.65, 0, 0.35, 1] });
    return () => {
      lids.stop();
      head.stop();
    };
  }, [alert, dark, mode, reduce, heaviness, droop]);

  useEffect(() => {
    if (!live || !awake) {
      animate(tilt, 0, { duration: 0.8, ease: [0.65, 0, 0.35, 1] });
      return;
    }
    let timer: ReturnType<typeof setTimeout>;
    let move: AnimationPlaybackControls | undefined;
    const curious = () => {
      const side = Math.random() < 0.5 ? -1 : 1;
      move = animate(tilt, side * (9 + Math.random() * 6), { duration: 1.1, ease: [0.65, 0, 0.35, 1] });
      timer = setTimeout(() => {
        move = animate(tilt, 0, { duration: 0.9, ease: [0.65, 0, 0.35, 1] });
        timer = setTimeout(curious, 3200 + Math.random() * 3600);
      }, 1500 + Math.random() * 900);
    };
    timer = setTimeout(curious, 2200);
    return () => {
      clearTimeout(timer);
      move?.stop();
    };
  }, [live, awake, tilt]);

  useEffect(() => {
    if (!live || tracking) {
      if (!live) {
        gazeX.set(0);
        gazeY.set(0);
      }
      return;
    }
    let timer: ReturnType<typeof setTimeout>;
    const look = () => {
      const centre = Math.random() < 0.4;
      gazeX.set(centre ? 0 : (Math.random() * 2 - 1) * 0.8);
      gazeY.set(centre ? 0 : (Math.random() * 2 - 1) * 0.5);
      timer = setTimeout(look, awake ? 1500 + Math.random() * 2500 : 3000 + Math.random() * 3000);
    };
    timer = setTimeout(look, 900);
    return () => clearTimeout(timer);
  }, [live, tracking, awake, gazeX, gazeY]);

  const follow = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "touch" || reduce) return;
    const box = svg.current?.getBoundingClientRect();
    if (!box?.width) return;
    const unit = box.width / VB.w;
    const dx = (e.clientX - box.left) / unit + VB.x - FACE.x;
    const dy = (e.clientY - box.top) / unit + VB.y - FACE.y;
    const reach = Math.hypot(dx, dy, 70);
    gazeX.set(dx / reach);
    gazeY.set(dy / reach);
    setTracking(true);
  };

  const release = () => {
    setTracking(false);
    gazeX.set(0);
    gazeY.set(0);
  };

  const hootNow = () => {
    setHoot((h) => h + 1);
    setStartled(true);
    clearTimeout(startleTimer.current);
    startleTimer.current = setTimeout(() => setStartled(false), 1800);
    onHoot?.();
    if (!reduce) animate(puff, [1, 1.06, 0.98, 1], { duration: 0.55, ease: "easeOut", times: [0, 0.35, 0.7, 1] });
  };

  const headY = useTransform(droop, (d) => d * 4);
  const headDroop = useTransform([headRotate, droop] as const, ([r, d]: number[]) => r + d * 7);
  const sky = (night: boolean) =>
    mode === "auto" ? (night ? "opacity-0 dark:opacity-100" : "opacity-100 dark:opacity-0") : night === awake ? "opacity-100" : "opacity-0";
  const title = awake ? awakeTitle : (sleepyTitle ?? `${name} is fast asleep`);
  const description = awake ? awakeDescription : sleepyDescription;

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
        aria-label={`${name} the owl, ${awake ? "wide awake" : "asleep"}. Give a hoot`}
        className="relative mx-auto block aspect-[90/53] w-full max-w-[380px] cursor-pointer rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={hootNow}
        type="button"
      >
        <svg aria-hidden className="absolute inset-0 size-full overflow-visible" ref={svg} viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`}>
          <defs>
            <mask id={`${uid}-moon`}>
              <rect fill="white" height={60} width={60} x={306} y={28} />
              <circle cx={345} cy={50} fill="black" r={17} />
            </mask>
          </defs>

          <g className={cn("transition-opacity duration-700", sky(true))}>
            <circle className="fill-amber-200" cx={336} cy={58} mask={`url(#${uid}-moon)`} r={20} />
            {stars.map((s) => (
              <g key={`${s.x}-${s.y}`} transform={`translate(${s.x} ${s.y}) scale(${s.s})`}>
                <motion.path
                  animate={live ? { opacity: [1, 0.3, 1], scale: [1, 0.7, 1] } : { opacity: 1, scale: 1 }}
                  className="fill-amber-200"
                  d={STAR}
                  transition={live ? { delay: s.delay, duration: 2.6, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY } : { duration: 0.3 }}
                />
              </g>
            ))}
          </g>

          <g className={cn("transition-opacity duration-700", sky(false))}>
            <motion.g
              animate={live ? { rotate: 360 } : { rotate: 0 }}
              className="stroke-amber-400"
              strokeLinecap="round"
              strokeWidth={3}
              style={{ originX: "336px", originY: "58px", transformBox: "view-box" }}
              transition={live ? { duration: 40, ease: "linear", repeat: Number.POSITIVE_INFINITY } : { duration: 0 }}
            >
              {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
                <line key={a} transform={`rotate(${a} 336 58)`} x1={336} x2={336} y1={35} y2={30} />
              ))}
            </motion.g>
            <circle className="fill-amber-300" cx={336} cy={58} r={15} />
            <path className="fill-foreground/[0.06]" d="M280 106 a10 10 0 0 1 18 -6 a12 12 0 0 1 22 4 a8 8 0 0 1 2 16 h-40 a7 7 0 0 1 -2 -14 Z" />
          </g>

          <path
            className="fill-none stroke-amber-900/85 dark:stroke-amber-800"
            d="M28 218 Q 200 197 372 223"
            strokeLinecap="round"
            strokeWidth={10}
          />
          <path className="fill-none stroke-amber-900/85 dark:stroke-amber-800" d="M300 211 q 14 -14 34 -18" strokeLinecap="round" strokeWidth={5} />
          <path className="fill-none stroke-amber-900/85 dark:stroke-amber-800" d="M88 210 q -8 -12 -24 -18" strokeLinecap="round" strokeWidth={5} />
          <g className="fill-emerald-500 dark:fill-emerald-400">
            <ellipse cx={340} cy={190} rx={11} ry={5.5} transform="rotate(-20 340 190)" />
            <ellipse cx={318} cy={196} rx={9} ry={4.5} transform="rotate(-50 318 196)" />
            <ellipse cx={58} cy={190} rx={11} ry={5.5} transform="rotate(25 58 190)" />
            <ellipse cx={76} cy={196} rx={8} ry={4} transform="rotate(60 76 196)" />
          </g>

          <motion.g style={{ originX: "200px", originY: "208px", scale: puff, transformBox: "view-box" }}>
            <motion.g
              animate={live ? { scaleY: [1, 1.018, 1] } : { scaleY: 1 }}
              style={{ originX: "200px", originY: "208px", transformBox: "view-box" }}
              transition={live ? { duration: awake ? 3.2 : 4.6, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY } : { duration: 0.4 }}
            >
              <motion.g style={{ rotate: headDroop, y: headY, originX: "200px", originY: "150px", transformBox: "view-box" }}>
                <path className="fill-(--hue) stroke-(--hue)" d="M160 112 L150 78 L184 98 Z" strokeLinejoin="round" strokeWidth={6} />
                <path className="fill-(--hue) stroke-(--hue)" d="M240 112 L250 78 L216 98 Z" strokeLinejoin="round" strokeWidth={6} />
              </motion.g>

              <path
                className="fill-(--hue)"
                d="M200 90 C 238 90 256 116 256 150 C 256 186 234 210 200 210 C 166 210 144 186 144 150 C 144 116 162 90 200 90 Z"
              />
              <path className="fill-none stroke-white/30" d="M160 116 q8 -16 24 -20" strokeLinecap="round" strokeWidth={5} />
              <ellipse className="fill-(--soft)" cx={200} cy={180} rx={34} ry={27} />
              <g className="fill-none stroke-(--hue)/60" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}>
                {chevrons.map(([x, y]) => (
                  <path d={`M${x - 4} ${y - 2} L${x} ${y + 2} L${x + 4} ${y - 2}`} key={`${x}-${y}`} />
                ))}
              </g>

              <motion.g
                animate={hoot > 0 && !reduce ? { rotate: [0, -16, 0, -10, 0] } : { rotate: 0 }}
                key={`wl-${hoot}`}
                style={{ originX: "156px", originY: "140px", transformBox: "view-box" }}
                transition={{ duration: 0.55, ease: "easeOut" }}
              >
                <ellipse className="fill-(--hue-deep)" cx={154} cy={166} rx={12} ry={29} transform="rotate(12 154 166)" />
              </motion.g>
              <motion.g
                animate={hoot > 0 && !reduce ? { rotate: [0, 16, 0, 10, 0] } : { rotate: 0 }}
                key={`wr-${hoot}`}
                style={{ originX: "244px", originY: "140px", transformBox: "view-box" }}
                transition={{ duration: 0.55, ease: "easeOut" }}
              >
                <ellipse className="fill-(--hue-deep)" cx={246} cy={166} rx={12} ry={29} transform="rotate(-12 246 166)" />
              </motion.g>

              <motion.g style={{ rotate: headDroop, y: headY, originX: "200px", originY: "150px", transformBox: "view-box" }}>
                <circle className="fill-(--soft)" cx={180} cy={FACE.y} r={24} />
                <circle className="fill-(--soft)" cx={220} cy={FACE.y} r={24} />
                <Eye cover={cover} cx={180} lookX={pupilX} lookY={pupilY} uid={uid} />
                <Eye cover={cover} cx={220} lookX={pupilX} lookY={pupilY} uid={uid} />
                <path className="fill-amber-400 stroke-amber-400" d="M200 140 L207 149 L200 159 L193 149 Z" strokeLinejoin="round" strokeWidth={2} />
                <path className="fill-white/40" d="M200 141.5 L204.5 148 L200 148 Z" />
              </motion.g>
            </motion.g>
          </motion.g>

          <g className="fill-amber-400">
            {[-1, 1].map((side) =>
              [-6, 0, 6].map((dx) => <circle cx={200 + side * 16 + dx} cy={208} key={`${side}-${dx}`} r={3.6} />),
            )}
          </g>

          <AnimatePresence>
            {hoot > 0 && startled && (
              <motion.text
                animate={reduce ? { opacity: 1 } : { opacity: [0, 1, 1, 0], y: [0, -8, -14, -22] }}
                className="fill-(--hue-deep) font-semibold dark:fill-(--hue-hi)"
                exit={{ opacity: 0 }}
                fontSize={15}
                initial={{ opacity: 0 }}
                key={`hoo-${hoot}`}
                transition={reduce ? { duration: 0.2 } : { duration: 1.4, ease: "easeOut", times: [0, 0.2, 0.6, 1] }}
                textAnchor="end"
                x={142}
                y={112}
              >
                hoo!
              </motion.text>
            )}
          </AnimatePresence>

          {!alert &&
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
                    ? { delay: 1 + z.delay, duration: 2.7, ease: "easeOut", repeat: Number.POSITIVE_INFINITY, times: [0, 0.25, 0.7, 1] }
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
        <p className="text-balance font-medium text-foreground text-sm">{title}</p>
        <p className="mx-auto mt-1 min-h-8 max-w-[34ch] text-pretty text-muted-foreground text-xs">{description}</p>
      </div>
    </div>
  );
}
