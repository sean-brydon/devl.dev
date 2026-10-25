"use client";

import { motion, useReducedMotion, useSpring, useTransform } from "motion/react";
import { type ReactNode, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type GaugeTone = "success" | "warning" | "destructive" | "info";

export interface GaugeBand {
  to: number;
  label: string;
  tone: GaugeTone;
}

export interface RadialGaugeProps {
  value: number;
  min?: number;
  max?: number;
  target?: number;
  bands?: GaugeBand[];
  label?: string;
  unit?: string;
  caption?: string;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
}

const W = 260;
const H = 178;
const CX = W / 2;
const CY = 124;
const R = 92;
const SWEEP = 240;
const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const TRACK = 10;
const CAP = ((TRACK / 2 / R) * 180) / Math.PI;

const TONE: Record<GaugeTone, { stroke: string; text: string; bg: string }> = {
  success: { stroke: "stroke-success", text: "text-success-foreground", bg: "bg-success/10 dark:bg-success/16" },
  warning: { stroke: "stroke-warning", text: "text-warning-foreground", bg: "bg-warning/10 dark:bg-warning/16" },
  destructive: { stroke: "stroke-destructive", text: "text-destructive-foreground", bg: "bg-destructive/10 dark:bg-destructive/16" },
  info: { stroke: "stroke-info", text: "text-info-foreground", bg: "bg-info/10 dark:bg-info/16" },
};

const defaultBands: GaugeBand[] = [
  { to: 70, label: "Healthy", tone: "success" },
  { to: 85, label: "Busy", tone: "warning" },
  { to: 100, label: "Saturated", tone: "destructive" },
];

function RollingNumber({ text, className }: { text: string; className?: string }) {
  const reduce = useReducedMotion();
  let d = 0;
  let o = 0;
  const glyphs = [...text]
    .reverse()
    .map((ch) => {
      const isDigit = ch >= "0" && ch <= "9";
      return { ch, key: isDigit ? `d${d++}` : `s${o++}${ch}`, digit: isDigit ? Number(ch) : null };
    })
    .reverse();
  return (
    <span className={cn("relative inline-flex whitespace-nowrap tabular-nums leading-none", className)}>
      <span className="sr-only">{text}</span>
      <span aria-hidden className="inline-flex [--row:1.15em]">
        {glyphs.map((g) =>
          g.digit === null ? (
            <span className="inline-block h-(--row) leading-(--row)" key={g.key}>
              {g.ch}
            </span>
          ) : (
            <span
              className="relative inline-block h-(--row) overflow-hidden"
              key={g.key}
              style={{ maskImage: "linear-gradient(transparent, black 18%, black 82%, transparent)" }}
            >
              <span className="invisible block leading-(--row)">0</span>
              <motion.span
                animate={{ y: `${-g.digit * 10}%` }}
                className="absolute inset-x-0 top-0 flex flex-col items-center"
                initial={false}
                transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 30 }}
              >
                {DIGITS.map((n) => (
                  <span className="block h-(--row) leading-(--row)" key={n}>
                    {n}
                  </span>
                ))}
              </motion.span>
            </span>
          ),
        )}
      </span>
    </span>
  );
}

const rad = (deg: number) => (deg * Math.PI) / 180;
const round = (n: number) => Math.round(n * 100) / 100;
const pt = (r: number, deg: number) => [round(CX + r * Math.sin(rad(deg))), round(CY - r * Math.cos(rad(deg)))] as const;
function arcPath(r: number, d0: number, d1: number) {
  if (d1 - d0 < 0.01) return "";
  const [x0, y0] = pt(r, d0);
  const [x1, y1] = pt(r, d1);
  return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 ${d1 - d0 > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

export function RadialGauge({
  value,
  min = 0,
  max = 100,
  target,
  bands = defaultBands,
  label = "CPU",
  unit = "%",
  caption,
  action,
  children,
  className,
}: RadialGaugeProps) {
  const reduce = useReducedMotion();
  const [hoverBand, setHoverBand] = useState<number | null>(null);
  const clamp = (v: number) => Math.max(min, Math.min(max, v));
  const deg = (v: number) => -SWEEP / 2 + ((clamp(v) - min) / (max - min || 1)) * SWEEP;

  const spring = useSpring(min, { stiffness: 120, damping: 19, mass: 1 });
  useEffect(() => {
    if (reduce) spring.jump(value);
    else spring.set(value);
  }, [value, reduce, spring]);

  const needle = useTransform(spring, (v) => {
    const a = deg(v);
    const [tx, ty] = pt(R - 18, a);
    const [lx, ly] = pt(3.2, a - 90);
    const [rx, ry] = pt(3.2, a + 90);
    const [bx, by] = pt(12, a + 180);
    return `M${bx.toFixed(2)} ${by.toFixed(2)} L${lx.toFixed(2)} ${ly.toFixed(2)} L${tx.toFixed(2)} ${ty.toFixed(2)} L${rx.toFixed(2)} ${ry.toFixed(2)} Z`;
  });
  const fill = useTransform(spring, (v) => arcPath(R, -SWEEP / 2 + CAP, Math.max(-SWEEP / 2 + CAP + 0.02, deg(v) - CAP)));

  const bandIndex = Math.max(0, bands.findIndex((b) => clamp(value) <= b.to));
  const band = bands[bandIndex] ?? bands[bands.length - 1];
  const tone = TONE[band.tone];
  const ticks = Array.from({ length: 21 }, (_, i) => min + ((max - min) * i) / 20);
  const shown = hoverBand === null ? null : bands[hoverBand];
  const gap = target === undefined ? null : value - target;

  return (
    <section
      aria-label={`${label} gauge`}
      className={cn("w-full max-w-[340px] rounded-2xl border bg-card p-5 text-card-foreground shadow-xs/5", className)}
    >
      <header className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          <h3 className="truncate font-medium text-sm">{label}</h3>
          {caption ? <span className="truncate text-muted-foreground text-xs">{caption}</span> : null}
        </div>
        {action}
      </header>
      <div
        aria-label={label}
        aria-valuemax={max}
        aria-valuemin={min}
        aria-valuenow={Math.round(value)}
        aria-valuetext={`${Math.round(value)}${unit}, ${band.label}${target !== undefined ? `, target ${target}${unit}` : ""}`}
        className="relative mx-auto"
        role="meter"
        style={{ width: W, maxWidth: "100%" }}
      >
        <svg aria-hidden className="block h-auto w-full overflow-visible" viewBox={`0 0 ${W} ${H}`}>
          {bands.map((b, i) => {
            const from = i === 0 ? min : bands[i - 1].to;
            const d0 = deg(from) + (i === 0 ? 0 : 1.2);
            const d1 = deg(b.to) - (i === bands.length - 1 ? 0 : 1.2);
            return (
              <g key={b.label} onPointerEnter={() => setHoverBand(i)} onPointerLeave={() => setHoverBand(null)}>
                <path className="fill-none stroke-transparent" d={arcPath(R + 13, d0, d1)} strokeWidth={14} />
                <path
                  className={cn("fill-none transition-[opacity,stroke-width] duration-150", TONE[b.tone].stroke)}
                  d={arcPath(R + 13, d0, d1)}
                  opacity={hoverBand === null || hoverBand === i ? 0.9 : 0.35}
                  strokeLinecap="butt"
                  strokeWidth={hoverBand === i ? 5 : 3}
                />
              </g>
            );
          })}

          {ticks.map((t, i) => {
            const major = i % 5 === 0;
            const [x0, y0] = pt(R - 12, deg(t));
            const [x1, y1] = pt(R - (major ? 19 : 15), deg(t));
            return (
              <line
                className={major ? "stroke-muted-foreground/60" : "stroke-muted-foreground/25"}
                key={t}
                strokeLinecap="round"
                strokeWidth={major ? 1.5 : 1}
                x1={x0}
                x2={x1}
                y1={y0}
                y2={y1}
              />
            );
          })}
          {ticks
            .filter((_, i) => i % 5 === 0)
            .map((t) => {
              const [x, y] = pt(R - 30, deg(t));
              return (
                <text
                  className="fill-muted-foreground text-[10px] tabular-nums"
                  dominantBaseline="central"
                  key={t}
                  textAnchor="middle"
                  x={x}
                  y={y}
                >
                  {Math.round(t)}
                </text>
              );
            })}

          <path
            className="fill-none stroke-muted"
            d={arcPath(R, -SWEEP / 2 + CAP, SWEEP / 2 - CAP)}
            strokeLinecap="round"
            strokeWidth={TRACK}
          />
          <motion.path
            className={cn("fill-none transition-[stroke] duration-300", tone.stroke)}
            d={fill}
            strokeLinecap="round"
            strokeWidth={TRACK}
          />

          {target !== undefined ? (
            <g>
              {(() => {
                const a = deg(target);
                const [x0, y0] = pt(R - 8, a);
                const [x1, y1] = pt(R + 17, a);
                return (
                  <>
                    <line className="stroke-card" strokeLinecap="round" strokeWidth={5} x1={x0} x2={x1} y1={y0} y2={y1} />
                    <line className="stroke-foreground" strokeLinecap="round" strokeWidth={2} x1={x0} x2={x1} y1={y0} y2={y1} />
                  </>
                );
              })()}
            </g>
          ) : null}

          <motion.path className="fill-foreground" d={needle} />
          <circle className="fill-card stroke-foreground" cx={CX} cy={CY} r={5.5} strokeWidth={2} />
        </svg>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center">
          <div className="flex items-baseline gap-0.5">
            <RollingNumber className="font-semibold text-3xl tracking-tight" text={String(Math.round(value))} />
            <span className="font-medium text-muted-foreground text-sm">{unit}</span>
          </div>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-center gap-2 text-xs">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-medium transition-colors duration-300",
            (shown ? TONE[shown.tone] : tone).bg,
            (shown ? TONE[shown.tone] : tone).text,
          )}
        >
          <span className={cn("size-1.5 rounded-full bg-current")} />
          {shown
            ? `${shown.label} · ${hoverBand === 0 ? min : bands[(hoverBand ?? 1) - 1].to}–${shown.to}${unit}`
            : band.label}
        </span>
        {gap !== null && !shown ? (
          <span className="text-muted-foreground tabular-nums">
            {Math.abs(gap) < 0.5
              ? "On target"
              : `${Math.abs(Math.round(gap))}${unit === "%" ? " pts" : unit} ${gap > 0 ? "over" : "under"} target`}
          </span>
        ) : null}
      </div>

      {children ? <div className="mt-4">{children}</div> : null}
    </section>
  );
}
