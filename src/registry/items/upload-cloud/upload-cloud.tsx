"use client";

import { CheckIcon } from "lucide-react";
import { animate, motion, useInView, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type UploadCloudHue = "sky" | "emerald" | "amber" | "violet" | "rose" | "orange" | "indigo" | "teal";

const hues: Record<UploadCloudHue, string> = {
  sky: "[--hue-hi:var(--color-sky-400)] [--hue:var(--color-sky-500)] [--hue-lo:var(--color-sky-600)]",
  emerald: "[--hue-hi:var(--color-emerald-400)] [--hue:var(--color-emerald-500)] [--hue-lo:var(--color-emerald-600)]",
  amber: "[--hue-hi:var(--color-amber-400)] [--hue:var(--color-amber-500)] [--hue-lo:var(--color-amber-600)]",
  violet: "[--hue-hi:var(--color-violet-400)] [--hue:var(--color-violet-500)] [--hue-lo:var(--color-violet-600)]",
  rose: "[--hue-hi:var(--color-rose-400)] [--hue:var(--color-rose-500)] [--hue-lo:var(--color-rose-600)]",
  orange: "[--hue-hi:var(--color-orange-400)] [--hue:var(--color-orange-500)] [--hue-lo:var(--color-orange-600)]",
  indigo: "[--hue-hi:var(--color-indigo-400)] [--hue:var(--color-indigo-500)] [--hue-lo:var(--color-indigo-600)]",
  teal: "[--hue-hi:var(--color-teal-400)] [--hue:var(--color-teal-500)] [--hue-lo:var(--color-teal-600)]",
};

type Phase = "idle" | "dropping" | "uploading" | "done";

export interface UploadCloudProps {
  title?: string;
  description?: string;
  fileName?: string;
  fileSize?: string;
  fileType?: string;
  hue?: UploadCloudHue;
  className?: string;
}

const W = 400;
const H = 240;
const CX = 200;
const CY = 96;
const FILE_Y = 162;
const TENDRIL_REST = CY + 22;
const RING_R = 25;
const RING_C = 2 * Math.PI * RING_R;

const puffs = [
  { cx: CX - 46, cy: CY + 8, r: 36, d: 3.4 },
  { cx: CX + 2, cy: CY - 20, r: 50, d: 4.2 },
  { cx: CX + 52, cy: CY + 6, r: 34, d: 3.8 },
];

function Puff({ cx, cy, r, d, live, i }: (typeof puffs)[number] & { live: boolean; i: number }) {
  return (
    <motion.circle
      animate={live ? { cy: [cy, cy - 2.5, cy + 1.5, cy], r: [r, r + 2, r - 1, r] } : { cy, r }}
      cx={cx}
      cy={cy}
      initial={false}
      r={r}
      transition={live ? { delay: i * 0.6, duration: d, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY } : { duration: 0.3 }}
    />
  );
}

function useCalmMotion() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && !!prefers;
}

export function UploadCloud({
  title = "Drop files to upload",
  description = "PDF, PNG or CSV, up to 25 MB each.",
  fileName = "q3-brief.pdf",
  fileSize = "2.4 MB",
  fileType = "PDF",
  hue = "sky",
  className,
}: UploadCloudProps) {
  const uid = useId().replace(/:/g, "");
  const reduce = useCalmMotion();
  const root = useRef<HTMLDivElement>(null);
  const inView = useInView(root);
  const live = inView && !reduce;
  const [phase, setPhase] = useState<Phase>("idle");
  const fileY = useMotionValue(0);
  const fileOpacity = useMotionValue(1);
  const tendril = useMotionValue(TENDRIL_REST);
  const progress = useMotionValue(0);
  const gulp = useMotionValue(1);
  const dash = useTransform(progress, (p) => RING_C * (1 - p));
  const percent = useTransform(progress, (p) => `${Math.round(p * 100)}%`);

  useEffect(() => {
    if (reduce) {
      progress.set(1);
      fileOpacity.set(0);
      setPhase("done");
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

    (async () => {
      while (alive) {
        setPhase("idle");
        fileY.set(8);
        tendril.set(TENDRIL_REST);
        progress.set(0);
        run(animate(fileY, 0, { duration: 0.4, ease: [0.23, 1, 0.32, 1] }));
        run(animate(fileOpacity, 1, { duration: 0.3 }));
        await wait(1600);
        if (!alive) return;
        setPhase("dropping");
        await run(animate(tendril, FILE_Y + 6, { duration: 0.42, ease: [0.23, 1, 0.32, 1] }));
        if (!alive) return;
        run(animate(tendril, TENDRIL_REST, { duration: 0.55, ease: [0.65, 0, 0.35, 1] }));
        await run(animate(fileY, -94, { duration: 0.55, ease: [0.65, 0, 0.35, 1] }));
        if (!alive) return;
        fileOpacity.set(0);
        run(animate(gulp, [1, 1.045, 0.99, 1], { duration: 0.5, ease: [0.23, 1, 0.32, 1] }));
        setPhase("uploading");
        await run(animate(progress, [0, 0.42, 0.48, 1], { duration: 2.1, ease: "easeInOut", times: [0, 0.35, 0.55, 1] }));
        if (!alive) return;
        setPhase("done");
        run(animate(gulp, [1, 1.035, 1], { duration: 0.45, ease: [0.23, 1, 0.32, 1] }));
        await wait(2400);
      }
    })();

    return () => {
      alive = false;
      for (const t of timers) clearTimeout(t);
      for (const s of stops) s.stop();
    };
  }, [reduce, inView, fileY, fileOpacity, tendril, progress, gulp]);

  const busy = phase === "uploading";
  const done = phase === "done";

  return (
    <div
      ref={root}
      className={cn(
        "relative w-full max-w-[440px] overflow-hidden rounded-2xl border bg-card p-3 shadow-xs/5 sm:p-4",
        hues[hue],
        className,
      )}
    >
      <div className="relative overflow-hidden rounded-xl border border-foreground/15 border-dashed px-3 pt-3 pb-4 sm:px-5 sm:pb-5">
        <div
          aria-hidden
          className="dot-grid pointer-events-none absolute inset-0 opacity-50 [mask-image:radial-gradient(closest-side,black,transparent)]"
        />
        <div className="relative mx-auto aspect-[40/24] w-full max-w-[400px]">
          <svg aria-hidden className="absolute inset-0 size-full overflow-visible" viewBox={`0 0 ${W} ${H}`}>
            <defs>
              <linearGradient gradientUnits="userSpaceOnUse" id={`${uid}-cloud`} x1={CX - 60} x2={CX + 70} y1={CY - 70} y2={CY + 60}>
                <stop offset="0" stopColor="var(--hue-hi)" />
                <stop offset="1" stopColor="var(--hue-lo)" />
              </linearGradient>
              <filter filterUnits="userSpaceOnUse" height={H} id={`${uid}-goo`} width={W} x={0} y={0}>
                <feGaussianBlur in="SourceGraphic" result="blur" stdDeviation="7" />
                <feColorMatrix in="blur" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9" />
              </filter>
            </defs>

            <motion.ellipse
              animate={{ opacity: phase === "idle" ? 1 : 0 }}
              className="fill-foreground/8"
              cx={CX}
              cy={FILE_Y + 66}
              initial={false}
              rx={24}
              ry={3.5}
              transition={{ duration: 0.25 }}
            />
            <motion.g
              animate={live && phase === "idle" ? { y: [0, -3, 0] } : { y: 0 }}
              transition={live && phase === "idle" ? { duration: 2.4, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY } : { duration: 0.2 }}
            >
              <motion.g style={{ opacity: fileOpacity, y: fileY }}>
                <g transform={`translate(${CX - 22} ${FILE_Y})`}>
                  <path className="fill-white stroke-black/10" d="M6 0 H30 L44 14 V52 a6 6 0 0 1 -6 6 H6 a6 6 0 0 1 -6 -6 V6 a6 6 0 0 1 6 -6 Z" />
                  <path className="fill-black/10" d="M30 0 V10 a4 4 0 0 0 4 4 H44 Z" />
                  <rect className="fill-rose-500" height={11} rx={3} width={24} x={-4} y={30} />
                  <text className="fill-white font-semibold" fontSize={7} textAnchor="middle" x={8} y={38}>
                    {fileType}
                  </text>
                  <rect className="fill-black/10" height={3} rx={1.5} width={18} x={24} y={34} />
                  <rect className="fill-black/10" height={3} rx={1.5} width={30} x={8} y={45} />
                </g>
              </motion.g>
            </motion.g>

            <motion.g style={{ originX: `${CX}px`, originY: `${CY + 50}px`, scale: gulp, transformBox: "view-box" }}>
              <g fill={`url(#${uid}-cloud)`} filter={`url(#${uid}-goo)`}>
                {puffs.map((p, i) => (
                  <Puff i={i} key={p.cx} live={live} {...p} />
                ))}
                <rect height={44} rx={22} width={176} x={CX - 88} y={CY + 6} />
                <motion.circle cx={CX} cy={tendril} r={17} />
              </g>
              <circle className="fill-white/15" cx={CX - 12} cy={CY - 46} r={18} />
            </motion.g>

            <motion.g
              animate={phase === "idle" || phase === "dropping" ? { opacity: 1, y: live ? [0, -4, 0] : 0 } : { opacity: 0, y: -10 }}
              className="stroke-white"
              fill="none"
              initial={false}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={5}
              transition={
                (phase === "idle" || phase === "dropping") && live
                  ? { opacity: { duration: 0.25 }, y: { duration: 1.6, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY } }
                  : { duration: 0.2, ease: "easeOut" }
              }
            >
              <path d={`M${CX} ${CY + 12} V${CY - 18}`} />
              <path d={`M${CX - 13} ${CY - 6} L${CX} ${CY - 19} L${CX + 13} ${CY - 6}`} />
            </motion.g>

            <motion.g
              animate={{ opacity: busy || done ? 1 : 0, scale: busy || done ? 1 : 0.9 }}
              initial={false}
              style={{ originX: `${CX}px`, originY: `${CY - 3}px`, transformBox: "view-box" }}
              transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            >
              <circle className="fill-none stroke-white/25" cx={CX} cy={CY - 3} r={RING_R} strokeWidth={5} />
              <motion.circle
                className="fill-none stroke-white"
                cx={CX}
                cy={CY - 3}
                r={RING_R}
                strokeDasharray={RING_C}
                strokeLinecap="round"
                strokeWidth={5}
                style={{ strokeDashoffset: dash }}
                transform={`rotate(-90 ${CX} ${CY - 3})`}
              />
              <motion.circle
                animate={{ scale: done ? 1 : 0.6, opacity: done ? 1 : 0 }}
                className="fill-white"
                cx={CX}
                cy={CY - 3}
                initial={false}
                r={RING_R + 2.5}
                style={{ originX: "50%", originY: "50%" }}
                transition={done ? { type: "spring", stiffness: 420, damping: 22 } : { duration: 0.2 }}
              />
              <motion.path
                animate={{ pathLength: done ? 1 : 0, opacity: done ? 1 : 0 }}
                className="fill-none stroke-(--hue)"
                d={`M${CX - 11} ${CY - 2} l7.5 7.5 l14 -15`}
                initial={false}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={5}
                transition={done ? { delay: 0.12, duration: 0.3, ease: [0.23, 1, 0.32, 1] } : { duration: 0.15 }}
              />
            </motion.g>
          </svg>

          <motion.span
            animate={{ opacity: busy ? 1 : 0 }}
            aria-hidden
            className="absolute -translate-x-1/2 -translate-y-1/2 font-semibold text-[11px] text-white tabular-nums"
            initial={false}
            style={{ left: `${(CX / W) * 100}%`, top: `${((CY - 3) / H) * 100}%` }}
            transition={{ duration: 0.2 }}
          >
            {percent}
          </motion.span>
          <div
            aria-live="polite"
            className="absolute inset-x-0 flex -translate-y-1/2 justify-center text-xs"
            style={{ top: `${((FILE_Y + 29) / H) * 100}%` }}
          >
            <motion.div
              animate={{ opacity: busy || done ? 1 : 0, y: busy || done ? 0 : 4 }}
              className="flex items-center gap-2 rounded-full border bg-popover py-0.5 pr-2.5 pl-1 shadow-xs/5"
              initial={false}
              transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
            >
              <span className="rounded-full bg-rose-500/12 px-1.5 py-px font-semibold text-[10px] text-rose-600 dark:text-rose-400">
                {fileType}
              </span>
              <span className="font-medium text-foreground">{fileName}</span>
              <span className="relative inline-flex w-[4.5rem] justify-end text-muted-foreground tabular-nums">
                <motion.span animate={{ opacity: done ? 0 : 1 }} initial={false} transition={{ duration: 0.15 }}>
                  {fileSize}
                </motion.span>
                <motion.span
                  animate={{ opacity: done ? 1 : 0, filter: done ? "blur(0px)" : "blur(2px)" }}
                  className="absolute inset-y-0 right-0 flex items-center gap-1 font-medium text-success-foreground"
                  initial={false}
                  transition={{ duration: 0.2 }}
                >
                  <CheckIcon className="size-3" strokeWidth={2.5} />
                  Uploaded
                </motion.span>
              </span>
            </motion.div>
          </div>
        </div>

        <div className="relative mt-3 text-center">
          <p className="text-balance font-medium text-foreground text-sm">{title}</p>
          <p className="mx-auto mt-1 max-w-[30ch] text-pretty text-muted-foreground text-xs">{description}</p>
        </div>
      </div>
    </div>
  );
}
