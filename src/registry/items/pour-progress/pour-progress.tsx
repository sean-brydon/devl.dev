"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type PourProgressVariant = "round" | "bar";

export interface PourProgressProps {
  value: number;
  max?: number;
  variant?: PourProgressVariant;
  size?: number;
  thickness?: number;
  label?: string;
  showValue?: boolean;
  formatValue?: (percent: number) => string;
  fillOnMount?: boolean;
  delay?: number;
  className?: string;
}

type Phase = "idle" | "falling" | "pouring" | "ending";

interface Sim {
  level: number;
  vel: number;
  target: number;
  slosh: number;
  ripple: number;
  t: number;
  phase: Phase;
  head: number;
  vHead: number;
  tail: number;
  vTail: number;
  celebrated: boolean;
}

interface Geometry {
  width: number;
  height: number;
  top: number;
  bottom: number;
  amp: number;
  stream: number;
  spout: number;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), hi);
const percentFormat = (p: number) => `${p}%`;

function useSafeReducedMotion() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && !!prefers;
}

function surfaceOf(g: Geometry, level: number) {
  return g.bottom + g.amp - level * (g.bottom - g.top + g.amp * 2);
}

function wavePath(g: Geometry, y0: number, tilt: number, ripple: number, t: number, offset: number) {
  const n = Math.max(10, Math.ceil(g.width / 3));
  const k1 = (Math.PI * 2) / Math.max(g.width * 0.9, 26);
  const k2 = (Math.PI * 2) / Math.max(g.width * 0.45, 14);
  let d = `M0 ${g.height}`;
  for (let i = 0; i <= n; i++) {
    const x = (g.width * i) / n;
    const u = (x - g.width / 2) / (g.width / 2);
    const y =
      y0 +
      tilt * Math.sin((u * Math.PI) / 2) +
      ripple * (0.6 * Math.sin(k1 * x - t * 5.5 + offset) + 0.4 * Math.sin(k2 * x + t * 3.7 + offset * 1.3));
    d += ` L${x.toFixed(2)} ${y.toFixed(2)}`;
  }
  return `${d} L${g.width} ${g.height} Z`;
}

function streamPath(g: Geometry, from: number, to: number, footed: boolean) {
  if (to - from < 0.5) return "";
  const x = g.spout;
  const w = g.stream;
  const foot = footed ? w * 1.3 : w * 0.38;
  return [
    `M${x - w / 2} ${from}`,
    `L${x + w / 2} ${from}`,
    `L${x + w * 0.38} ${to - 1.5}`,
    `Q${x + w * 0.5} ${to + 0.5} ${x + foot} ${to + 1.5}`,
    `L${x - foot} ${to + 1.5}`,
    `Q${x - w * 0.5} ${to + 0.5} ${x - w * 0.38} ${to - 1.5}`,
    "Z",
  ].join(" ");
}

export function PourProgress({
  value,
  max = 100,
  variant = "round",
  size,
  thickness = 28,
  label = "Progress",
  showValue,
  formatValue = percentFormat,
  fillOnMount = true,
  delay = 0,
  className,
}: PourProgressProps) {
  const uid = useId().replace(/:/g, "");
  const reduce = useSafeReducedMotion();
  const round = variant === "round";
  const height = size ?? 120;
  const width = round ? height : thickness;
  const inset = round ? Math.max(3, height * 0.045) : Math.max(2.5, width * 0.12);
  const geometry: Geometry = {
    width,
    height,
    top: inset,
    bottom: height - inset,
    amp: round ? height * 0.034 : Math.min(width * 0.16, 4),
    stream: round ? Math.max(2.5, height * 0.026) : Math.max(2, width * 0.13),
    spout: round ? width * 0.63 : width / 2,
  };
  const geo = useRef(geometry);
  geo.current = geometry;

  const target = clamp(max > 0 ? value / max : 0, 0, 1);
  const initial = fillOnMount ? 0 : target;
  const showLabel = showValue ?? round;
  const format = useRef(formatValue);
  format.current = formatValue;

  const sim = useRef<Sim>({
    level: initial,
    vel: 0,
    target: initial,
    slosh: 0,
    ripple: 0,
    t: 0,
    phase: "idle",
    head: 0,
    vHead: 0,
    tail: 0,
    vTail: 0,
    celebrated: initial >= 1,
  });
  const front = useRef<SVGPathElement>(null);
  const back = useRef<SVGPathElement>(null);
  const clip = useRef<SVGPathElement>(null);
  const stream = useRef<SVGPathElement>(null);
  const labels = useRef<(SVGTextElement | null)[]>([]);
  const raf = useRef(0);
  const started = useRef(false);
  const startAt = useRef<number | null>(null);
  const [celebrations, setCelebrations] = useState(0);

  const draw = () => {
    const s = sim.current;
    const g = geo.current;
    const surface = surfaceOf(g, s.level);
    const sway = s.slosh * Math.cos(s.t * Math.PI * 2.6);
    const d = wavePath(g, surface, sway, s.ripple, s.t, 0);
    front.current?.setAttribute("d", d);
    clip.current?.setAttribute("d", d);
    back.current?.setAttribute("d", wavePath(g, surface - s.ripple * 0.35, -sway * 0.8, s.ripple * 1.1, s.t, 1.9));
    const pourTop = g.top - 4;
    const streamD =
      s.phase === "idle"
        ? ""
        : s.phase === "falling"
          ? streamPath(g, pourTop, s.head, false)
          : streamPath(g, s.phase === "ending" ? s.tail : pourTop, surface, true);
    stream.current?.setAttribute("d", streamD);
    const shown = Math.abs(s.target - s.level) < 0.004 ? s.target : s.level;
    const text = format.current(Math.round(shown * 100));
    for (const el of labels.current) if (el && el.textContent !== text) el.textContent = text;
  };

  const step = (dt: number) => {
    const s = sim.current;
    const g = geo.current;
    const gravity = g.height * 22;
    const pourTop = g.top - 4;
    s.t += dt;
    if (s.phase === "idle" && s.target > s.level + 0.002) {
      s.phase = "falling";
      s.head = pourTop;
      s.vHead = g.height * 1.5;
    }
    if (s.phase === "ending" && s.target > s.level + 0.006) s.phase = "pouring";
    if (s.phase === "falling") {
      s.vHead += gravity * dt;
      s.head += s.vHead * dt;
      if (s.head >= surfaceOf(g, s.level)) {
        s.phase = "pouring";
        s.slosh = Math.max(s.slosh, g.amp * 0.6);
        s.ripple = Math.max(s.ripple, g.amp * 0.6);
      }
    }
    if (s.phase === "pouring" || s.phase === "ending" || s.target < s.level) {
      const w = 5;
      s.vel += (w * w * (s.target - s.level) - 2 * w * s.vel) * dt;
      s.level += s.vel * dt;
      s.slosh = Math.max(s.slosh, Math.min(g.amp, Math.abs(s.vel) * g.amp * 1.6));
    }
    if (s.phase === "pouring") {
      s.ripple = Math.max(s.ripple, g.amp * 0.4);
      if (s.target - s.level < 0.004) {
        s.phase = "ending";
        s.tail = pourTop;
        s.vTail = g.height * 0.5;
      }
    }
    if (s.phase === "ending") {
      s.vTail += gravity * dt;
      s.tail += s.vTail * dt;
      if (s.tail >= surfaceOf(g, s.level)) s.phase = "idle";
    }
    s.slosh *= Math.exp(-dt * 1.9);
    s.ripple *= Math.exp(-dt * 2.6);
    if (s.target < 0.999) s.celebrated = false;
    if (s.phase === "idle" && s.target >= 0.999 && s.level > 0.99 && !s.celebrated) {
      s.celebrated = true;
      s.ripple = g.amp;
      setCelebrations((c) => c + 1);
    }
    const settled =
      s.phase === "idle" &&
      Math.abs(s.target - s.level) < 0.0005 &&
      Math.abs(s.vel) < 0.001 &&
      s.slosh < 0.04 &&
      s.ripple < 0.04;
    if (settled) {
      s.level = s.target;
      s.vel = 0;
      s.slosh = 0;
      s.ripple = 0;
    }
    return !settled;
  };

  const kick = () => {
    if (raf.current) return;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      const busy = step(dt);
      draw();
      raf.current = busy ? requestAnimationFrame(tick) : 0;
    };
    raf.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    const s = sim.current;
    if (reduce) {
      cancelAnimationFrame(raf.current);
      raf.current = 0;
      const wasFull = s.level >= 0.999;
      Object.assign(s, { target, level: target, vel: 0, phase: "idle", slosh: 0, ripple: 0 });
      draw();
      if (target >= 0.999 && !wasFull && started.current) setCelebrations((c) => c + 1);
      started.current = true;
      return;
    }
    const apply = () => {
      s.target = target;
      if (target < s.level - 0.001) s.slosh = Math.max(s.slosh, geo.current.amp * 0.5);
      kick();
    };
    startAt.current ??= performance.now() + delay;
    const wait = startAt.current - performance.now();
    if (wait <= 0) {
      apply();
      return;
    }
    const timer = setTimeout(apply, wait);
    return () => clearTimeout(timer);
  }, [target, reduce]);

  useEffect(
    () => () => {
      cancelAnimationFrame(raf.current);
      raf.current = 0;
    },
    [],
  );

  const g = geometry;
  const flat = wavePath(g, surfaceOf(g, initial), 0, 0, 0, 0);
  const vesselClip = `pour-vessel-${uid}`;
  const liquidClip = `pour-liquid-${uid}`;
  const innerRx = (width - inset * 2) / 2;
  const initialText = formatValue(Math.round(initial * 100));

  return (
    <div
      aria-label={label}
      aria-valuemax={max}
      aria-valuemin={0}
      aria-valuenow={Math.round(clamp(value, 0, max))}
      aria-valuetext={formatValue(Math.round(target * 100))}
      className={cn("relative inline-block shrink-0 text-sky-600 dark:text-sky-400", className)}
      role="progressbar"
      style={{ width, height }}
    >
      {celebrations > 0 && (
        <motion.span
          animate={
            reduce
              ? { opacity: [0, 0.5, 0] }
              : { opacity: [0.55, 0], scaleX: [1, round ? 1.22 : 1.6], scaleY: [1, round ? 1.22 : 1.08] }
          }
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full border-2 border-current"
          key={celebrations}
          transition={{ duration: reduce ? 0.6 : 0.7, ease: [0.23, 1, 0.32, 1] }}
        />
      )}
      <svg aria-hidden className="block overflow-visible" height={height} viewBox={`0 0 ${width} ${height}`} width={width}>
        <defs>
          <clipPath id={vesselClip}>
            {round ? (
              <circle cx={width / 2} cy={height / 2} r={width / 2 - inset} />
            ) : (
              <rect height={height - inset * 2} rx={innerRx} width={width - inset * 2} x={inset} y={inset} />
            )}
          </clipPath>
          <clipPath id={liquidClip}>
            <path d={flat} ref={clip} />
          </clipPath>
        </defs>
        {round ? (
          <circle className="fill-muted stroke-border" cx={width / 2} cy={height / 2} r={width / 2 - 0.5} />
        ) : (
          <rect className="fill-muted stroke-border" height={height - 1} rx={width / 2 - 0.5} width={width - 1} x={0.5} y={0.5} />
        )}
        <g clipPath={`url(#${vesselClip})`}>
          <path className="fill-current opacity-35" d={flat} ref={back} />
          <path className="fill-current" d={flat} ref={front} />
          <path className="fill-current" d="" ref={stream} />
        </g>
        {showLabel && (
          <>
            <text
              className="fill-foreground font-semibold tabular-nums"
              dominantBaseline="central"
              ref={(el) => {
                labels.current[0] = el;
              }}
              style={{ fontSize: height * 0.19 }}
              textAnchor="middle"
              x={width / 2}
              y={height / 2}
            >
              {initialText}
            </text>
            <g clipPath={`url(#${vesselClip})`}>
              <text
                className="fill-background font-semibold tabular-nums"
                clipPath={`url(#${liquidClip})`}
                dominantBaseline="central"
                ref={(el) => {
                  labels.current[1] = el;
                }}
                style={{ fontSize: height * 0.19 }}
                textAnchor="middle"
                x={width / 2}
                y={height / 2}
              >
                {initialText}
              </text>
            </g>
          </>
        )}
      </svg>
    </div>
  );
}
