"use client";

import { LockIcon, LockOpenIcon, ScanLineIcon, ShieldXIcon } from "lucide-react";
import {
  AnimatePresence,
  animate as animateValue,
  motion,
  useAnimate,
  useInView,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type ShieldLockHue = "sky" | "emerald" | "amber" | "violet" | "rose" | "orange" | "indigo" | "teal";

const hues: Record<ShieldLockHue, string> = {
  sky: "[--hue-hi:var(--color-sky-400)] [--hue:var(--color-sky-500)] [--hue-lo:var(--color-sky-600)] [--hue-deep:var(--color-sky-800)]",
  emerald:
    "[--hue-hi:var(--color-emerald-400)] [--hue:var(--color-emerald-500)] [--hue-lo:var(--color-emerald-600)] [--hue-deep:var(--color-emerald-800)]",
  amber:
    "[--hue-hi:var(--color-amber-400)] [--hue:var(--color-amber-500)] [--hue-lo:var(--color-amber-600)] [--hue-deep:var(--color-amber-800)]",
  violet:
    "[--hue-hi:var(--color-violet-400)] [--hue:var(--color-violet-500)] [--hue-lo:var(--color-violet-600)] [--hue-deep:var(--color-violet-800)]",
  rose: "[--hue-hi:var(--color-rose-400)] [--hue:var(--color-rose-500)] [--hue-lo:var(--color-rose-600)] [--hue-deep:var(--color-rose-800)]",
  orange:
    "[--hue-hi:var(--color-orange-400)] [--hue:var(--color-orange-500)] [--hue-lo:var(--color-orange-600)] [--hue-deep:var(--color-orange-800)]",
  indigo:
    "[--hue-hi:var(--color-indigo-400)] [--hue:var(--color-indigo-500)] [--hue-lo:var(--color-indigo-600)] [--hue-deep:var(--color-indigo-800)]",
  teal: "[--hue-hi:var(--color-teal-400)] [--hue:var(--color-teal-500)] [--hue-lo:var(--color-teal-600)] [--hue-deep:var(--color-teal-800)]",
};

export type ShieldLockStatus = "open" | "scanning" | "locked" | "denied";

export interface ShieldLockProps {
  status?: ShieldLockStatus;
  onRequest?: (next: "locked" | "open") => void;
  hue?: ShieldLockHue;
  labels?: Partial<Record<ShieldLockStatus, string>>;
  className?: string;
}

const defaultLabels: Record<ShieldLockStatus, string> = {
  open: "Vault unlocked",
  scanning: "Checking passkey…",
  locked: "Vault locked",
  denied: "Passkey not recognised",
};

const icons = { open: LockOpenIcon, scanning: ScanLineIcon, locked: LockIcon, denied: ShieldXIcon };

const script: { status: ShieldLockStatus; ms: number }[] = [
  { status: "open", ms: 1400 },
  { status: "scanning", ms: 1300 },
  { status: "locked", ms: 2800 },
  { status: "open", ms: 1400 },
  { status: "scanning", ms: 1300 },
  { status: "denied", ms: 1700 },
];

const W = 400;
const H = 300;
const SHIELD =
  "M200 34 C 230 50 262 58 292 58 V 146 C 292 206 254 246 200 270 C 146 246 108 206 108 146 V 58 C 138 58 170 50 200 34 Z";
const INNER =
  "M200 52 C 226 65 254 72 278 72 V 146 C 278 197 246 231 200 252 C 154 231 122 197 122 146 V 72 C 146 72 174 65 200 52 Z";

const WAVE = `M0 0 ${"q12.5 -5 25 0 q12.5 5 25 0 ".repeat(9)}V 320 H 0 Z`;

const levels: Record<ShieldLockStatus, number> = { open: 0.2, scanning: 0.86, locked: 0.92, denied: 0.2 };

function Padlock({
  shut,
  denied,
  reduce,
  round,
  tone,
}: { shut: boolean; denied: boolean; reduce: boolean; round: number; tone: "dry" | "wet" }) {
  const wet = tone === "wet";
  return (
    <motion.g
      animate={shut && !reduce ? { scale: [1, 0.95, 1.02, 1] } : { scale: 1 }}
      key={`lock-${round}`}
      style={{ originX: "200px", originY: "170px", transformBox: "view-box" }}
      transition={{ delay: 0.1, duration: 0.42, ease: [0.23, 1, 0.32, 1] }}
    >
      <motion.path
        animate={{ y: shut ? 0 : -13 }}
        className={cn("fill-none", wet ? "stroke-white" : "stroke-(--hue)")}
        d="M182 156 V 134 a 18 18 0 0 1 36 0 V 156"
        initial={false}
        strokeLinecap="round"
        strokeWidth={9}
        transition={
          reduce
            ? { duration: 0 }
            : shut
              ? { type: "spring", stiffness: 900, damping: 26, mass: 0.6 }
              : { type: "spring", stiffness: 260, damping: 22 }
        }
      />
      {wet && <rect className="fill-black/15" height={52} rx={12} width={72} x={164} y={153} />}
      <rect className={wet ? "fill-white" : "fill-(--hue)"} height={52} rx={12} width={72} x={164} y={150} />
      <g
        className={cn(
          "transition-[fill] duration-300",
          wet ? (denied ? "fill-destructive" : "fill-(--hue-deep)") : "fill-(--shell)",
        )}
      >
        <circle cx={200} cy={171} r={7} />
        <rect height={16} rx={2.5} width={5} x={197.5} y={172} />
      </g>
    </motion.g>
  );
}

function useCalmMotion() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && !!prefers;
}

export function ShieldLock({ status, onRequest, hue = "sky", labels, className }: ShieldLockProps) {
  const uid = useId().replace(/:/g, "");
  const reduce = useCalmMotion();
  const copy = { ...defaultLabels, ...labels };
  const [demo, setDemo] = useState(status === undefined);
  const [step, setStep] = useState(0);
  const [local, setLocal] = useState<ShieldLockStatus>("open");
  const current: ShieldLockStatus = status ?? (demo ? script[step].status : local);
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const [round, setRound] = useState(0);
  const prev = useRef(current);
  const root = useRef<HTMLDivElement>(null);
  const inView = useInView(root);
  const live = inView && !reduce;
  const level = useMotionValue(levels[current]);
  const surface = useTransform(level, (l) => 262 - l * 222);

  useEffect(() => {
    const target = levels[current];
    if (reduce) {
      level.set(target);
      return;
    }
    const c =
      current === "scanning"
        ? animateValue(level, target, { duration: 1.2, ease: [0.65, 0, 0.35, 1] })
        : current === "denied"
          ? animateValue(level, target, { delay: 0.35, duration: 0.9, ease: [0.65, 0, 0.35, 1] })
          : animateValue(level, target, { type: "spring", stiffness: 140, damping: 20 });
    return () => c.stop();
  }, [current, reduce, level]);

  useEffect(() => {
    if (!demo || status !== undefined || !inView) return;
    const t = setTimeout(() => setStep((s) => (s + 1) % script.length), script[step].ms);
    return () => clearTimeout(t);
  }, [demo, status, step, inView]);

  useEffect(() => {
    if (demo || status !== undefined || local !== "scanning") return;
    const t = setTimeout(() => setLocal("locked"), 1300);
    return () => clearTimeout(t);
  }, [demo, status, local]);

  useEffect(() => {
    if (prev.current === current) return;
    prev.current = current;
    if (current === "locked" || current === "denied") setRound((r) => r + 1);
    if (current === "denied" && !reduce && scope.current) {
      animate(scope.current, { x: [0, -9, 8, -6, 4, -2, 0] }, { duration: 0.5, ease: "easeOut" });
    }
  }, [current, reduce, animate, scope]);

  const click = () => {
    const next = current === "locked" ? "open" : "locked";
    onRequest?.(next);
    if (status !== undefined) return;
    setDemo(false);
    setLocal(next === "locked" ? "scanning" : "open");
  };

  const shut = current === "locked";
  const denied = current === "denied";
  const Icon = icons[current];

  return (
    <div
      ref={root}
      className={cn(
        "relative w-full max-w-[440px] overflow-hidden rounded-2xl border bg-card p-4 shadow-xs/5 sm:p-6",
        "[--rim:color-mix(in_oklab,var(--hue)_30%,var(--color-card))] [--shell:color-mix(in_oklab,var(--hue)_10%,var(--color-card))]",
        hues[hue],
        className,
      )}
    >
      <div
        aria-hidden
        className="dot-grid pointer-events-none absolute inset-0 opacity-50 [mask-image:radial-gradient(closest-side,black,transparent)]"
      />

      <button
        aria-label={shut ? "Unlock the vault" : "Lock the vault"}
        className="group/shield relative mx-auto block aspect-[4/3] w-full max-w-[400px] cursor-pointer rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={click}
        type="button"
      >
        <motion.div
          animate={{ opacity: shut ? 0.32 : 0.16, scale: shut ? 1.08 : 1 }}
          aria-hidden
          className={cn(
            "absolute top-1/2 left-1/2 size-1/2 -translate-1/2 rounded-full blur-3xl transition-colors duration-300",
            denied ? "bg-destructive" : "bg-(--hue)",
          )}
          initial={false}
          transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
        />
        <div className="absolute inset-0 transition-transform duration-150 ease-out group-active/shield:scale-[0.98]" ref={scope}>
          <svg aria-hidden className="absolute inset-0 size-full overflow-visible" viewBox={`0 0 ${W} ${H}`}>
            <defs>
              <linearGradient id={`${uid}-body`} x1="0" x2="0.4" y1="0" y2="1">
                <stop offset="0" stopColor="var(--hue-hi)" />
                <stop offset="1" stopColor="var(--hue-lo)" />
              </linearGradient>
              <clipPath id={`${uid}-inner`}>
                <path d={INNER} />
              </clipPath>
              <mask height={H} id={`${uid}-wet`} maskUnits="userSpaceOnUse" width={W} x={0} y={0}>
                <motion.g style={{ y: surface }}>
                  <motion.path
                    animate={live ? { x: [0, -50] } : { x: 0 }}
                    className="fill-white"
                    d={WAVE}
                    initial={false}
                    transition={live ? { duration: 2.2, ease: "linear", repeat: Number.POSITIVE_INFINITY } : { duration: 0 }}
                  />
                </motion.g>
              </mask>
            </defs>

            <AnimatePresence>
              {shut && !reduce && (
                <motion.g key={`ring-${round}`}>
                  {[0, 1].map((r) => (
                    <motion.path
                      animate={{ opacity: [0, 0.5, 0], scale: [1, 1.22] }}
                      className="fill-none stroke-(--hue)"
                      d={SHIELD}
                      initial={{ opacity: 0, scale: 1 }}
                      key={r}
                      strokeWidth={1.5}
                      style={{ originX: "50%", originY: "50%" }}
                      transition={{ delay: 0.12 + r * 0.22, duration: 1.1, ease: [0.23, 1, 0.32, 1] }}
                    />
                  ))}
                </motion.g>
              )}
            </AnimatePresence>

            <path className="fill-black/10" d={SHIELD} transform="translate(0 6)" />
            <path className="fill-(--shell) stroke-(--rim)" d={SHIELD} strokeWidth={1.5} />

            <g clipPath={`url(#${uid}-inner)`}>
              <motion.g style={{ y: surface }}>
                <motion.path
                  animate={live ? { x: [-50, 0] } : { x: -25 }}
                  className={cn("opacity-45 transition-[fill] duration-300", denied ? "fill-destructive" : "fill-(--hue-hi)")}
                  d={WAVE}
                  initial={false}
                  transition={live ? { duration: 3.2, ease: "linear", repeat: Number.POSITIVE_INFINITY } : { duration: 0 }}
                />
                <motion.path
                  animate={live ? { x: [0, -50] } : { x: 0 }}
                  d={WAVE}
                  fill={`url(#${uid}-body)`}
                  initial={false}
                  transition={live ? { duration: 2.2, ease: "linear", repeat: Number.POSITIVE_INFINITY } : { duration: 0 }}
                />
                <motion.path
                  animate={{ opacity: denied ? 0.9 : 0, ...(live ? { x: [0, -50] } : { x: 0 }) }}
                  className="fill-destructive"
                  d={WAVE}
                  initial={false}
                  transition={{
                    opacity: { duration: denied ? 0.12 : 0.3 },
                    x: live ? { duration: 2.2, ease: "linear", repeat: Number.POSITIVE_INFINITY } : { duration: 0 },
                  }}
                />
              </motion.g>
            </g>
            <path className="fill-white/10 dark:fill-white/[0.05]" d="M200 34 C 170 50 138 58 108 58 V 146 C 108 206 146 246 200 270 Z" />

            <Padlock denied={denied} reduce={reduce} round={round} shut={shut} tone="dry" />
            <g mask={`url(#${uid}-wet)`}>
              <Padlock denied={denied} reduce={reduce} round={round} shut={shut} tone="wet" />
            </g>

            <AnimatePresence>
              {shut && !reduce && (
                <motion.g className="stroke-(--hue)" key={`spark-${round}`} strokeLinecap="round" strokeWidth={2.5}>
                  {[-60, -25, 25, 60].map((a) => {
                    const rad = ((a - 90) * Math.PI) / 180;
                    const x = 200 + Math.cos(rad) * 52;
                    const y = 126 + Math.sin(rad) * 30;
                    return (
                      <motion.line
                        animate={{ opacity: [0, 1, 0], pathLength: [0, 1, 1], x: [0, Math.cos(rad) * 8], y: [0, Math.sin(rad) * 8] }}
                        exit={{ opacity: 0 }}
                        initial={{ opacity: 0 }}
                        key={a}
                        transition={{ delay: 0.08, duration: 0.45, ease: "easeOut" }}
                        x1={x}
                        x2={x + Math.cos(rad) * 9}
                        y1={y}
                        y2={y + Math.sin(rad) * 9}
                      />
                    );
                  })}
                </motion.g>
              )}
            </AnimatePresence>
          </svg>
        </div>
      </button>

      <div aria-live="polite" className="relative mt-1 flex h-6 items-center justify-center">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.div
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            className={cn(
              "flex items-center gap-1.5 font-medium text-sm",
              denied ? "text-destructive-foreground" : shut ? "text-foreground" : "text-muted-foreground",
            )}
            exit={{ opacity: 0, y: reduce ? 0 : -6, filter: reduce ? "blur(0px)" : "blur(2px)" }}
            initial={{ opacity: 0, y: reduce ? 0 : 6, filter: reduce ? "blur(0px)" : "blur(2px)" }}
            key={current}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          >
            <Icon aria-hidden className="size-4" />
            {copy[current]}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
