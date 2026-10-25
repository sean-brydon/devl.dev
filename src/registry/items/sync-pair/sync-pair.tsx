"use client";

import {
  motion,
  type MotionValue,
  useAnimationFrame,
  useInView,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type SyncPairHue = "sky" | "emerald" | "amber" | "violet" | "rose" | "orange" | "indigo" | "teal";

const hues: Record<SyncPairHue, string> = {
  sky: "[--hue:var(--color-sky-500)]",
  emerald: "[--hue:var(--color-emerald-500)]",
  amber: "[--hue:var(--color-amber-500)]",
  violet: "[--hue:var(--color-violet-500)]",
  rose: "[--hue:var(--color-rose-500)]",
  orange: "[--hue:var(--color-orange-500)]",
  indigo: "[--hue:var(--color-indigo-500)]",
  teal: "[--hue:var(--color-teal-500)]",
};

export interface SyncPairProps {
  title?: string;
  description?: string;
  laptopLabel?: string;
  phoneLabel?: string;
  hue?: SyncPairHue;
  className?: string;
}

type Pt = [number, number];
type Slot = "a" | "b" | "ca" | "cb";
type Phase = "idle" | "toPhone" | "toLaptop" | "conflict" | "merging" | "merged";

const W = 400;
const H = 146;
const FROM: Pt = [108, 58];
const TO: Pt = [320, 50];
const OX = -12;
const CTRL: Pt = [202, -8];
const APEX = 0.5;
const DOC = 1.35;
const LOOP = 11;
const RESET = 10.3;
const SETTLED = 9.4;

const at = {
  typeA: 0.1,
  sendA: 0.7,
  landA: 1.6,
  typeB: 2.5,
  sendB: 3.1,
  landB: 4,
  typeC: 4.9,
  rise: 5.5,
  meet: 6.3,
  merged: 6.8,
  split: 7.5,
  land: 8.4,
};

const slots: Slot[] = ["a", "b", "ca", "cb"];
const fromLaptop: Record<Slot, boolean> = { a: true, b: false, ca: true, cb: false };

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const seg = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const ease = (v: number) => (v < 0.5 ? 4 * v * v * v : 1 - (-2 * v + 2) ** 3 / 2);

function arc(t: number): Pt {
  const u = 1 - t;
  return [u * u * FROM[0] + 2 * u * t * CTRL[0] + t * t * TO[0], u * u * FROM[1] + 2 * u * t * CTRL[1] + t * t * TO[1]];
}

type Flight = { p: number; dx: number; show: number };

function edgeFade(p: number, from: number, to: number) {
  const n = (p - from) / (to - from);
  return clamp01(Math.min(n, 1 - n) * 8);
}

function flightA(t: number): Flight {
  if (t >= at.sendA && t < at.landA) {
    const p = ease(seg(t, at.sendA, at.landA));
    return { p, dx: 0, show: edgeFade(p, 0, 1) };
  }
  if (t >= at.rise && t < at.merged) {
    const p = APEX * ease(seg(t, at.rise, at.meet));
    const dx = -22 * (1 - ease(seg(t, at.meet, at.merged)));
    return { p, dx, show: Math.min(clamp01(p * 8 / APEX), 1 - seg(t, at.merged - 0.2, at.merged)) };
  }
  if (t >= at.split && t < at.land) {
    const p = APEX * (1 - ease(seg(t, at.split, at.land)));
    return { p, dx: 0, show: clamp01((p / APEX) * 8) };
  }
  return { p: 0, dx: 0, show: 0 };
}

function flightB(t: number): Flight {
  if (t >= at.sendB && t < at.landB) {
    const p = 1 - ease(seg(t, at.sendB, at.landB));
    return { p, dx: 0, show: edgeFade(p, 0, 1) };
  }
  if (t >= at.rise && t < at.merged) {
    const p = 1 - APEX * ease(seg(t, at.rise, at.meet));
    const dx = 22 * (1 - ease(seg(t, at.meet, at.merged)));
    return { p, dx, show: Math.min(clamp01(((1 - p) * 8) / APEX), 1 - seg(t, at.merged - 0.2, at.merged)) };
  }
  if (t >= at.split && t < at.land) {
    const p = APEX + APEX * ease(seg(t, at.split, at.land));
    return { p, dx: 0, show: clamp01(((1 - p) / APEX) * 8) };
  }
  return { p: 1, dx: 0, show: 0 };
}

function snapshot(t: number) {
  const reset = t >= RESET;
  const laptop: Record<Slot, "off" | "typing" | "on"> = {
    a: reset ? "off" : t >= at.typeA ? "typing" : "off",
    b: reset ? "off" : t >= at.landB ? "on" : "off",
    ca: reset ? "off" : t >= at.typeC ? "typing" : "off",
    cb: reset ? "off" : t >= at.land ? "on" : "off",
  };
  const phone: Record<Slot, "off" | "typing" | "on"> = {
    a: reset ? "off" : t >= at.landA ? "on" : "off",
    b: reset ? "off" : t >= at.typeB ? "typing" : "off",
    ca: reset ? "off" : t >= at.land ? "on" : "off",
    cb: reset ? "off" : t >= at.typeC ? "typing" : "off",
  };
  let phase: Phase = "idle";
  if (!reset) {
    if (t >= at.sendA && t < at.landA) phase = "toPhone";
    else if (t >= at.sendB && t < at.landB) phase = "toLaptop";
    else if (t >= at.typeC && t < at.meet) phase = "conflict";
    else if (t >= at.meet && t < at.land) phase = "merging";
    else if (t >= at.land) phase = "merged";
  }
  const landedLaptop = t >= at.land && !reset ? 2 : t >= at.landB && !reset ? 1 : 0;
  const landedPhone = t >= at.land && !reset ? 2 : t >= at.landA && !reset ? 1 : 0;
  return { laptop, phone, phase, landedLaptop, landedPhone, mergedDoc: t >= at.merged && t < at.split && !reset, mergedCopies: t >= at.split };
}

const status: Record<Phase, { label: string; dot: string }> = {
  idle: { label: "Up to date", dot: "bg-success" },
  toPhone: { label: "Syncing to phone", dot: "bg-info" },
  toLaptop: { label: "Syncing to laptop", dot: "bg-info" },
  conflict: { label: "2 versions found", dot: "bg-warning" },
  merging: { label: "Merging changes", dot: "bg-info" },
  merged: { label: "Merged · both edits kept", dot: "bg-success" },
};

function useCalmMotion() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && !!prefers;
}

function Doc({ stripes }: { stripes: ("hue" | "amber")[] }) {
  return (
    <g transform={`scale(${DOC})`}>
      <path className="fill-card stroke-foreground/20" d="M-13 -16 H6 L13 -9 V16 H-13 Z" strokeLinejoin="round" strokeWidth={1.2} />
      <path className="fill-foreground/10" d="M6 -16 V-9 H13 Z" />
      <rect className="fill-foreground/35" height={3} rx={1.5} width={12} x={-9} y={-11} />
      <rect className="fill-foreground/15" height={2.5} rx={1.25} width={17} x={-9} y={-4} />
      {stripes.map((s, i) => (
        <rect
          className={s === "hue" ? "fill-(--hue)" : "fill-amber-500"}
          height={2.5}
          key={s}
          rx={1.25}
          width={i === 0 ? 16 : 12}
          x={-9}
          y={2 + i * 5}
        />
      ))}
    </g>
  );
}

function Flier({ clock, flight, stripes }: { clock: MotionValue<number>; flight: (t: number) => Flight; stripes: ("hue" | "amber")[] }) {
  const x = useTransform(clock, (t) => {
    const f = flight(t);
    return arc(f.p)[0] + f.dx;
  });
  const y = useTransform(clock, (t) => arc(flight(t).p)[1]);
  const opacity = useTransform(clock, (t) => flight(t).show);
  const scale = useTransform(clock, (t) => 0.78 + 0.22 * Math.sin(Math.PI * flight(t).p));
  const rotate = useTransform(clock, (t) => {
    const f = flight(t);
    return Math.cos(Math.PI * f.p) * -6;
  });
  return (
    <motion.g style={{ opacity, rotate, scale, x, y }}>
      <Doc stripes={stripes} />
    </motion.g>
  );
}

function Lines({
  x,
  ys,
  widths,
  height,
  states,
}: {
  x: number;
  ys: number[];
  widths: number[];
  height: number;
  states: Record<Slot, "off" | "typing" | "on">;
}) {
  return (
    <>
      {slots.map((slot, i) => {
        const state = states[slot];
        return (
          <rect
            className={cn(
              fromLaptop[slot] ? "fill-(--hue)" : "fill-amber-500",
              "origin-left [transform-box:fill-box] transition-[scale,opacity] ease-out",
              state === "off" ? "scale-x-0 opacity-0 duration-300" : "scale-x-100 opacity-100",
              state === "typing" ? "duration-[600ms]" : state === "on" ? "duration-300" : "",
            )}
            height={height}
            key={slot}
            rx={height / 2}
            width={widths[i]}
            x={x}
            y={ys[i]}
          />
        );
      })}
    </>
  );
}

export function SyncPair({
  title = "Always in sync",
  description = "Edits hop between your devices in seconds. If two land at once, we keep both.",
  laptopLabel = "Laptop",
  phoneLabel = "Phone",
  hue = "sky",
  className,
}: SyncPairProps) {
  const reduce = useCalmMotion();
  const root = useRef<HTMLDivElement>(null);
  const inView = useInView(root);
  const live = useRef(false);
  live.current = inView && !reduce;

  const clock = useMotionValue(0);
  useAnimationFrame((_, delta) => {
    if (!live.current) return;
    clock.set((clock.get() + Math.min(delta, 64) / 1000) % LOOP);
  });
  useEffect(() => {
    if (reduce) clock.set(SETTLED);
  }, [reduce, clock]);

  const [snap, setSnap] = useState(() => snapshot(0));
  const key = useRef("");
  useMotionValueEvent(clock, "change", (t) => {
    const next = snapshot(t);
    const k = JSON.stringify(next);
    if (k === key.current) return;
    key.current = k;
    setSnap(next);
  });

  const apex = arc(APEX);
  const s = status[snap.phase];
  const copies: ("hue" | "amber")[] = ["hue", "amber"];

  return (
    <div
      ref={root}
      className={cn(
        "relative w-full max-w-[440px] overflow-hidden rounded-2xl border bg-card p-4 shadow-xs/5 sm:p-6",
        "[--bezel:var(--color-neutral-800)] [--deck:var(--color-neutral-300)] dark:[--bezel:var(--color-neutral-700)] dark:[--deck:var(--color-neutral-600)]",
        hues[hue],
        className,
      )}
    >
      <div
        aria-hidden
        className="dot-grid pointer-events-none absolute inset-0 opacity-50 [mask-image:radial-gradient(closest-side,black,transparent)]"
      />

      <div className="relative mx-auto mb-3 flex w-fit items-center gap-1.5 rounded-full border bg-popover py-1 pr-2.5 pl-2 text-xs shadow-xs/5">
        <span className={cn("size-2 rounded-full transition-colors duration-300", s.dot)} />
        <span className="font-medium text-foreground">
          {s.label}
        </span>
      </div>

      <div
        aria-label={`A document syncing between ${laptopLabel} and ${phoneLabel}`}
        className="relative mx-auto aspect-[400/146] w-full max-w-[400px]"
        role="img"
      >
        <svg aria-hidden className="absolute inset-0 size-full overflow-visible" viewBox={`${OX} 0 ${W} ${H}`}>
          <path
            className="fill-none stroke-foreground/15"
            d={`M${FROM[0]} ${FROM[1]} Q${CTRL[0]} ${CTRL[1]} ${TO[0]} ${TO[1]}`}
            strokeDasharray="2 5"
            strokeLinecap="round"
            strokeWidth={1.5}
          />

          <g>
            <rect className="fill-(--bezel)" height={84} rx={9} width={132} x={42} y={48} />
            <rect className="fill-background" height={72} rx={4} width={120} x={48} y={54} />
            <motion.rect
              animate={snap.landedLaptop > 0 && !reduce ? { opacity: [0, 0.9, 0] } : { opacity: 0 }}
              className="fill-none stroke-(--hue)"
              height={72}
              key={`flash-l-${snap.landedLaptop}`}
              rx={4}
              strokeWidth={2}
              transition={{ duration: 0.6, ease: "easeOut" }}
              width={120}
              x={48}
              y={54}
            />
            <rect className="fill-foreground/40" height={5} rx={2.5} width={40} x={58} y={63} />
            <rect className="fill-foreground/12" height={4} rx={2} width={92} x={58} y={74} />
            <rect className="fill-foreground/12" height={4} rx={2} width={74} x={58} y={82} />
            <Lines height={4} states={snap.laptop} widths={[86, 62, 94, 70]} x={58} ys={[92, 100, 108, 116]} />
            <path className="fill-(--deck)" d="M28 132 H188 V135 Q188 140 182 140 H34 Q28 140 28 135 Z" />
            <rect className="fill-foreground/15" height={3} rx={1.5} width={26} x={95} y={132} />
          </g>

          <g transform="translate(24 0)">
            <rect className="fill-(--bezel)" height={96} rx={12} width={52} x={270} y={44} />
            <rect className="fill-background" height={90} rx={9} width={46} x={273} y={47} />
            <motion.rect
              animate={snap.landedPhone > 0 && !reduce ? { opacity: [0, 0.9, 0] } : { opacity: 0 }}
              className="fill-none stroke-amber-500"
              height={90}
              key={`flash-p-${snap.landedPhone}`}
              rx={9}
              strokeWidth={2}
              transition={{ duration: 0.6, ease: "easeOut" }}
              width={46}
              x={273}
              y={47}
            />
            <rect className="fill-(--bezel)" height={4} rx={2} width={14} x={289} y={51} />
            <rect className="fill-foreground/40" height={4} rx={2} width={22} x={279} y={63} />
            <rect className="fill-foreground/12" height={3.5} rx={1.75} width={34} x={279} y={72} />
            <rect className="fill-foreground/12" height={3.5} rx={1.75} width={27} x={279} y={79} />
            <Lines height={3.5} states={snap.phone} widths={[32, 24, 34, 26]} x={279} ys={[88, 95, 102, 109]} />
            <rect className="fill-foreground/20" height={2.5} rx={1.25} width={18} x={287} y={130} />
          </g>

          <Flier clock={clock} flight={flightA} stripes={snap.mergedCopies ? copies : ["hue"]} />
          <Flier clock={clock} flight={flightB} stripes={snap.mergedCopies ? copies : ["amber"]} />

          <motion.g
            animate={snap.mergedDoc ? { opacity: 1, scale: 1 } : { opacity: 0, scale: reduce ? 1 : 0.95 }}
            initial={false}
            style={{ originX: `${apex[0]}px`, originY: `${apex[1]}px`, transformBox: "view-box" }}
            transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
          >
            <g transform={`translate(${apex[0]} ${apex[1]})`}>
              <Doc stripes={copies} />
            </g>
            <motion.g
              animate={snap.mergedDoc ? { opacity: 1, scale: 1 } : { opacity: 0, scale: reduce ? 1 : 0.6 }}
              initial={false}
              style={{ originX: `${apex[0] + 13 * DOC}px`, originY: `${apex[1] + 15 * DOC}px`, transformBox: "view-box" }}
              transition={reduce ? { duration: 0.15 } : { type: "spring", stiffness: 520, damping: 22, delay: snap.mergedDoc ? 0.12 : 0 }}
            >
              <circle className="fill-emerald-500 stroke-card" cx={apex[0] + 13 * DOC} cy={apex[1] + 15 * DOC} r={8} strokeWidth={2} />
              <path
                className="fill-none stroke-white"
                d={`M${apex[0] + 13 * DOC - 3.6} ${apex[1] + 15 * DOC} l2.6 2.6 l4.4 -4.8`}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
              />
            </motion.g>
          </motion.g>

        </svg>
      </div>

      <div aria-hidden className="relative mx-auto h-4 w-full max-w-[400px] text-muted-foreground text-xs">
        {[
          { label: laptopLabel, x: 108, dot: "bg-(--hue)" },
          { label: phoneLabel, x: 320, dot: "bg-amber-500" },
        ].map((d) => (
          <span className="absolute top-0 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap" key={d.x} style={{ left: `${((d.x - OX) / W) * 100}%` }}>
            <span className={cn("size-1.5 rounded-full", d.dot)} />
            {d.label}
          </span>
        ))}
      </div>

      <div className="relative mt-3 text-center">
        <p className="text-balance font-medium text-foreground text-sm">{title}</p>
        <p className="mx-auto mt-1 max-w-[36ch] text-pretty text-muted-foreground text-xs">{description}</p>
      </div>
    </div>
  );
}
