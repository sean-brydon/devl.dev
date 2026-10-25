"use client";

import { animate, motion, useInView, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type EnvelopeHue = "sky" | "emerald" | "amber" | "violet" | "rose" | "orange" | "indigo" | "teal";

const hues: Record<EnvelopeHue, string> = {
  sky: "[--seal:var(--color-sky-600)] [--seal-hi:var(--color-sky-400)] [--seal-lo:var(--color-sky-800)]",
  emerald: "[--seal:var(--color-emerald-600)] [--seal-hi:var(--color-emerald-400)] [--seal-lo:var(--color-emerald-800)]",
  amber: "[--seal:var(--color-amber-600)] [--seal-hi:var(--color-amber-400)] [--seal-lo:var(--color-amber-800)]",
  violet: "[--seal:var(--color-violet-600)] [--seal-hi:var(--color-violet-400)] [--seal-lo:var(--color-violet-800)]",
  rose: "[--seal:var(--color-rose-600)] [--seal-hi:var(--color-rose-400)] [--seal-lo:var(--color-rose-800)]",
  orange: "[--seal:var(--color-orange-600)] [--seal-hi:var(--color-orange-400)] [--seal-lo:var(--color-orange-800)]",
  indigo: "[--seal:var(--color-indigo-600)] [--seal-hi:var(--color-indigo-400)] [--seal-lo:var(--color-indigo-800)]",
  teal: "[--seal:var(--color-teal-600)] [--seal-hi:var(--color-teal-400)] [--seal-lo:var(--color-teal-800)]",
};

type Stage = "sealed" | "unsealed" | "open" | "out";

export interface EnvelopeProps {
  hue?: EnvelopeHue;
  title?: string;
  message?: string;
  from?: string;
  monogram?: string;
  autoPlay?: boolean;
  className?: string;
}

const SW = 400;
const SH = 300;
const EX = 50;
const EY = 124;
const EW = 300;
const EH = 172;
const FLAP_H = 104;

function useFit<T extends HTMLElement>(width: number) {
  const ref = useRef<T>(null);
  const [k, setK] = useState(1);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setK(el.offsetWidth / width);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [width]);
  return [ref, k] as const;
}

const order: Stage[] = ["sealed", "unsealed", "open", "out"];

function dwell(from: Stage, to: Stage) {
  if (from === "unsealed") return 260;
  if (from === "open" && to === "out") return 420;
  if (from === "open" && to === "sealed") return 400;
  return 0;
}

function useCalmMotion() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && !!prefers;
}

export function Envelope({
  hue = "rose",
  title = "You're invited",
  message = "Join us for the Northwind launch on Friday, 6 pm, at the old boathouse.",
  from = "— Ines & the team",
  monogram = "N",
  autoPlay = true,
  className,
}: EnvelopeProps) {
  const reduce = useCalmMotion();
  const root = useRef<HTMLDivElement>(null);
  const inView = useInView(root);
  const [fitRef, k] = useFit<HTMLButtonElement>(SW);
  const liningId = `lining-${useId().replace(/:/g, "")}`;
  const [stage, setStage] = useState<Stage>("sealed");
  const [target, setTarget] = useState<Stage>("sealed");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (stage === target) return;
    const forward = order.indexOf(target) > order.indexOf(stage);
    const next: Stage = forward ? order[order.indexOf(stage) + 1] : stage === "out" ? "open" : "sealed";
    const t = setTimeout(() => setStage(next), reduce ? 0 : dwell(stage, next));
    return () => clearTimeout(t);
  }, [stage, target, reduce]);

  useEffect(() => {
    if (!autoPlay || touched || !inView || stage !== target) return;
    const t = setTimeout(() => setTarget(target === "out" ? "sealed" : "out"), target === "out" ? 3200 : 1800);
    return () => clearTimeout(t);
  }, [autoPlay, touched, inView, stage, target]);

  const click = () => {
    setTouched(true);
    setTarget(target === "out" ? "sealed" : "out");
  };

  const flapOpen = stage === "open" || stage === "out";
  const sealOn = stage === "sealed";
  const letterUp = stage === "out";

  const flap = useMotionValue(0);
  useEffect(() => {
    const c = animate(flap, flapOpen ? 180 : 0, reduce ? { duration: 0 } : { duration: 0.5, ease: [0.65, 0, 0.35, 1] });
    return () => c.stop();
  }, [flapOpen, reduce, flap]);
  const flapZ = useTransform(flap, (r) => (r > 90 ? 1 : 30));
  const flapShade = useTransform(flap, [0, 90, 180], [0, 0.18, 0]);

  return (
    <div
      ref={root}
      className={cn(
        "relative w-full max-w-[460px] overflow-hidden rounded-2xl border bg-card p-4 shadow-xs/5 sm:p-6",
        "[--paper:var(--color-white)] [--paper-2:var(--color-orange-50)] [--paper-3:var(--color-amber-50)] [--paper-edge:var(--color-amber-950)]",
        hues[hue],
        className,
      )}
    >
      <div
        aria-hidden
        className="dot-grid pointer-events-none absolute inset-0 opacity-50 [mask-image:radial-gradient(closest-side,black,transparent)]"
      />
      <button
        aria-label={target === "out" ? "Put the letter away" : `Open the letter: ${title}`}
        className="group/env relative mx-auto block aspect-[4/3] w-full max-w-[400px] cursor-pointer rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={click}
        ref={fitRef}
        type="button"
      >
        <div
          className="absolute top-0 left-0 origin-top-left text-left"
          style={{ height: SH, width: SW, transform: `scale(${k})` }}
        >
          <motion.div
            animate={{ y: flapOpen ? 0 : -52 }}
            className="absolute inset-0"
            initial={false}
            transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 170, damping: 24 }}
          >
          <div
            aria-hidden
            className="absolute rounded-[50%] bg-foreground/15 blur-lg"
            style={{ height: 18, left: EX + 20, top: EY + EH - 6, width: EW - 40 }}
          />

          <div className="absolute" style={{ height: EH, left: EX, perspective: 900, top: EY, width: EW }}>
            <div className="absolute inset-0 overflow-hidden rounded-[10px] bg-(--seal)">
              <div className="absolute inset-0 bg-[repeating-linear-gradient(135deg,rgb(255_255_255/0.2)_0_3px,transparent_3px_10px)]" />
            </div>

            <motion.div
              animate={{ y: letterUp ? -128 : 0 }}
              className="absolute z-10 flex flex-col rounded-[6px] bg-white px-5 pt-4 pb-3 text-neutral-800 shadow-[0_1px_2px_rgb(0_0_0/0.12),0_6px_16px_-6px_rgb(0_0_0/0.2)]"
              initial={false}
              style={{ height: 152, left: 18, top: 12, width: EW - 36 }}
              transition={
                reduce
                  ? { duration: 0 }
                  : letterUp
                    ? { type: "spring", stiffness: 170, damping: 22, mass: 0.9 }
                    : { duration: 0.42, ease: [0.65, 0, 0.35, 1] }
              }
            >
              <div className="flex items-center justify-between">
                <span className="flex size-5 items-center justify-center rounded-full bg-(--seal) font-semibold text-[10px] text-white">
                  {monogram}
                </span>
                <span className="font-mono text-[9px] text-neutral-400 tabular-nums">No. 0428</span>
              </div>
              <p className="mt-2 font-semibold text-[15px] tracking-tight">{title}</p>
              <p className="mt-1 text-[10.5px] text-neutral-500 leading-snug">{message}</p>
              <div className="mt-auto flex items-end justify-between">
                <span className="font-medium text-[10px] text-neutral-600 italic">{from}</span>
                <span className="rounded-full bg-(--seal) px-2 py-0.5 font-medium text-[9px] text-white">RSVP</span>
              </div>
            </motion.div>

            <svg aria-hidden className="absolute inset-0 z-20 overflow-visible" viewBox={`0 0 ${EW} ${EH}`}>
              <path
                className="fill-(--paper-2) stroke-(--paper-edge)"
                strokeOpacity={0.1}
                d={`M0 10 Q0 0 10 0 L${EW / 2} ${FLAP_H - 8} L${EW - 10} 0 Q${EW} 0 ${EW} 10 V${EH - 10} Q${EW} ${EH} ${EW - 10} ${EH} H10 Q0 ${EH} 0 ${EH - 10} Z`}
              />
              <path className="fill-(--paper)" d={`M0 ${EH - 10} L${EW / 2 - 14} ${EH / 2 + 18} Q${EW / 2} ${EH / 2 + 8} ${EW / 2 + 14} ${EH / 2 + 18} L${EW} ${EH - 10} Q${EW} ${EH} ${EW - 10} ${EH} H10 Q0 ${EH} 0 ${EH - 10} Z`} />
              <path
                className="fill-none stroke-(--paper-edge)"
                d={`M2 ${EH - 6} L${EW / 2 - 14} ${EH / 2 + 18} Q${EW / 2} ${EH / 2 + 8} ${EW / 2 + 14} ${EH / 2 + 18} L${EW - 2} ${EH - 6}`}
                strokeOpacity={0.12}
                strokeWidth={1.5}
              />
              <path className="fill-none stroke-(--paper-edge)" d={`M2 4 L${EW / 2} ${FLAP_H - 6} L${EW - 2} 4`} strokeOpacity={0.1} strokeWidth={1.5} />
            </svg>

            <motion.div
              className="absolute inset-x-0 top-0 origin-top [transform-style:preserve-3d]"
              style={{ height: FLAP_H + 4, rotateX: flap, zIndex: flapZ }}
            >
              <svg aria-hidden className="absolute inset-0 overflow-visible drop-shadow-[0_2px_3px_rgb(0_0_0/0.08)] [backface-visibility:hidden]" viewBox={`0 0 ${EW} ${FLAP_H + 4}`}>
                <path
                  className="fill-(--paper) stroke-(--paper-edge)"
                  d={`M10 0 H${EW - 10} Q${EW} 0 ${EW - 6} 6 L${EW / 2 + 16} ${FLAP_H - 6} Q${EW / 2} ${FLAP_H + 4} ${EW / 2 - 16} ${FLAP_H - 6} L6 6 Q0 0 10 0 Z`}
                  strokeOpacity={0.12}
                />
                <path
                  className="fill-none stroke-(--paper-edge)"
                  d={`M6 6 L${EW / 2 - 16} ${FLAP_H - 6} Q${EW / 2} ${FLAP_H + 4} ${EW / 2 + 16} ${FLAP_H - 6} L${EW - 6} 6`}
                  strokeOpacity={0.1}
                  strokeWidth={4}
                  transform="translate(0 1.5)"
                />
                <motion.path
                  className="fill-black"
                  d={`M10 0 H${EW - 10} Q${EW} 0 ${EW - 6} 6 L${EW / 2 + 16} ${FLAP_H - 6} Q${EW / 2} ${FLAP_H + 4} ${EW / 2 - 16} ${FLAP_H - 6} L6 6 Q0 0 10 0 Z`}
                  style={{ fillOpacity: flapShade }}
                />
              </svg>
              <svg
                aria-hidden
                className="absolute inset-0 overflow-visible [backface-visibility:hidden] [transform:rotateX(180deg)]"
                viewBox={`0 0 ${EW} ${FLAP_H + 4}`}
              >
                <defs>
                  <pattern height="10" id={`${liningId}`} patternTransform="rotate(45)" patternUnits="userSpaceOnUse" width="10">
                    <rect className="fill-(--seal)" height="10" width="10" />
                    <rect fill="white" fillOpacity={0.2} height="10" width="3" />
                  </pattern>
                </defs>
                <g transform={`scale(1 -1) translate(0 ${-(FLAP_H + 4)})`}>
                  <path
                    className="fill-(--paper)"
                    d={`M10 0 H${EW - 10} Q${EW} 0 ${EW - 6} 6 L${EW / 2 + 16} ${FLAP_H - 6} Q${EW / 2} ${FLAP_H + 4} ${EW / 2 - 16} ${FLAP_H - 6} L6 6 Q0 0 10 0 Z`}
                  />
                  <path
                    d={`M18 6 H${EW - 18} L${EW / 2 + 12} ${FLAP_H - 14} Q${EW / 2} ${FLAP_H - 6} ${EW / 2 - 12} ${FLAP_H - 14} Z`}
                    fill={`url(#${liningId})`}
                  />
                </g>
              </svg>
            </motion.div>

            <motion.div
              animate={
                sealOn
                  ? { opacity: 1, scale: 1, rotate: 0, y: 0 }
                  : { opacity: 0, scale: reduce ? 1 : 1.3, rotate: reduce ? 0 : -14, y: reduce ? 0 : -10 }
              }
              aria-hidden
              className="absolute z-40 size-[52px]"
              initial={false}
              style={{ left: EW / 2 - 26, top: FLAP_H - 36 }}
              transition={
                reduce
                  ? { duration: 0.15 }
                  : sealOn
                    ? { type: "spring", stiffness: 520, damping: 22, mass: 0.7, delay: 0.42 }
                    : { duration: 0.26, ease: [0.23, 1, 0.32, 1] }
              }
            >
              <svg className="size-full overflow-visible drop-shadow-[0_2px_2px_rgb(0_0_0/0.25)]" viewBox="0 0 46 46">
                <path
                  className="fill-(--seal)"
                  d="M23 1.5c3 0 4.2 2.4 6.6 3.2 2.6.8 5-.7 7 1 2 1.8 1.2 4.3 2.4 6.6 1.2 2.4 3.9 3.4 3.9 6.2 0 2.9-2.4 4-3 6.6-.6 2.7 1.1 4.9-.5 7.1-1.7 2.3-4.4 1.6-6.7 3-2.3 1.4-3 4.2-5.8 4.6-2.8.4-4.2-2-6.8-2.6-2.7-.6-5 1-7.1-.7-2.1-1.8-1.3-4.5-2.6-6.8C9.1 28 6.2 27 5.9 24.2c-.3-2.8 2.2-4.1 2.7-6.8.5-2.6-1.2-5 .4-7.2 1.7-2.2 4.4-1.4 6.8-2.8C18.2 6 19.9 1.5 23 1.5Z"
                />
                <circle className="fill-none stroke-(--seal-lo)" cx="23" cy="23" r="12.5" strokeOpacity={0.5} strokeWidth="1.5" />
                <circle className="fill-(--seal-hi)" cx="18" cy="16" opacity={0.35} r="5" />
                <text
                  className="fill-(--seal-lo) font-semibold"
                  dominantBaseline="central"
                  fontSize="15"
                  textAnchor="middle"
                  x="23"
                  y="23.5"
                >
                  {monogram}
                </text>
              </svg>
            </motion.div>
          </div>
          </motion.div>
        </div>
      </button>
    </div>
  );
}
