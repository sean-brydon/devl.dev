"use client";

import { AlertTriangleIcon, OctagonAlertIcon, RotateCcwIcon } from "lucide-react";
import { motion, useReducedMotion, useSpring, useTransform } from "motion/react";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Tooltip, TooltipPopup, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface QuotaPart {
  label: string;
  value: number;
}

export interface QuotaRingProps {
  label: string;
  used: number;
  limit: number;
  unit?: string;
  breakdown?: QuotaPart[];
  resetsAt?: Date | string | number;
  warnAt?: number;
  criticalAt?: number;
  locale?: string;
  className?: string;
}

type Level = "ok" | "warn" | "critical";

const LEVEL: Record<Level, { stroke: string; text: string }> = {
  ok: { stroke: "stroke-foreground/80", text: "text-foreground" },
  warn: { stroke: "stroke-warning", text: "text-warning-foreground" },
  critical: { stroke: "stroke-destructive", text: "text-destructive-foreground" },
};
const SIZE = 40;
const STROKE = 4;
const R = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * R;

function useNow(active: boolean, every = 1000) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), every);
    return () => clearInterval(id);
  }, [active, every]);
  return now;
}

function until(target: number, now: number, withSeconds: boolean) {
  const s = Math.max(0, Math.floor((target - now) / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (!withSeconds) return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`;
  return d ? `${d}d ${pad(h)}h ${pad(m)}m ${pad(sec)}s` : `${pad(h)}h ${pad(m)}m ${pad(sec)}s`;
}

function Countdown({ target }: { target: number }) {
  const now = useNow(true);
  return <span className="font-medium tabular-nums">{now === null ? "–" : until(target, now, true)}</span>;
}

export function QuotaRing({
  label,
  used,
  limit,
  unit = "",
  breakdown = [],
  resetsAt,
  warnAt = 0.75,
  criticalAt = 0.9,
  locale = "en-US",
  className,
}: QuotaRingProps) {
  const reduce = useReducedMotion();
  const ratio = limit > 0 ? used / limit : 0;
  const level: Level = ratio >= criticalAt ? "critical" : ratio >= warnAt ? "warn" : "ok";
  const tone = LEVEL[level];
  const num = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const compact = useMemo(() => new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }), [locale]);
  const target = resetsAt === undefined ? null : new Date(resetsAt).getTime();
  const [pulse, setPulse] = useState(0);
  const lastLevel = useRef(level);
  useEffect(() => {
    if (lastLevel.current !== level && level !== "ok") setPulse((p) => p + 1);
    lastLevel.current = level;
  }, [level]);

  const progress = useSpring(0, { stiffness: 120, damping: 20 });
  useEffect(() => {
    const v = Math.min(1, ratio);
    if (reduce) progress.jump(v);
    else progress.set(v);
  }, [ratio, reduce, progress]);
  const dash = useTransform(progress, (p) => `${(p * CIRC).toFixed(2)} ${CIRC.toFixed(2)}`);
  const pct = Math.round(ratio * 100);
  const u = unit ? ` ${unit}` : "";

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            aria-label={`${label}: ${num.format(used)} of ${num.format(limit)}${u}, ${pct}% used${level !== "ok" ? `, ${level === "warn" ? "nearing" : "at"} limit` : ""}`}
            className={cn(
              "group/quota flex min-w-0 cursor-default items-center gap-2.5 rounded-xl p-2 pe-2.5 text-left outline-none transition-[background-color,scale] duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97] [@media(hover:hover)]:hover:bg-accent",
              className,
            )}
            type="button"
          />
        }
      >
        <motion.span
          animate={pulse === 0 || reduce ? { scale: 1 } : { scale: [1, 1.1, 1] }}
          className="relative flex shrink-0 items-center justify-center"
          key={pulse}
          style={{ width: SIZE, height: SIZE }}
          transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
        >
          <svg aria-hidden className="-rotate-90" height={SIZE} width={SIZE}>
            <circle className="fill-none stroke-foreground/10" cx={SIZE / 2} cy={SIZE / 2} r={R} strokeWidth={STROKE} />
            {[warnAt, criticalAt].map((t) => (
              <line
                className="stroke-card"
                key={t}
                strokeWidth={1.5}
                transform={`rotate(${t * 360} ${SIZE / 2} ${SIZE / 2})`}
                x1={SIZE - STROKE - 0.5}
                x2={SIZE + 0.5}
                y1={SIZE / 2}
                y2={SIZE / 2}
              />
            ))}
            <motion.circle
              className={cn("fill-none transition-[stroke] duration-300", tone.stroke)}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R}
              strokeDasharray={dash}
              strokeLinecap="round"
              strokeWidth={STROKE}
            />
          </svg>
          <span className={cn("absolute font-medium text-[10px] tabular-nums transition-colors duration-300", tone.text)}>
            {pct > 999 ? "999+" : pct}
          </span>
        </motion.span>
        <span className="flex min-w-0 flex-col">
          <span className="flex items-center gap-1 text-muted-foreground text-xs">
            <span className="truncate">{label}</span>
            {level === "warn" ? <AlertTriangleIcon className="size-3 shrink-0 text-warning" /> : null}
            {level === "critical" ? <OctagonAlertIcon className="size-3 shrink-0 text-destructive" /> : null}
          </span>
          <span className="truncate font-medium text-sm tabular-nums">
            {compact.format(used)}
            <span className="font-normal text-muted-foreground">
              {" "}
              / {compact.format(limit)}
              {unit ? <span className="text-xs"> {unit}</span> : null}
            </span>
          </span>
        </span>
      </TooltipTrigger>
      <TooltipPopup className="w-60" side="top" sideOffset={6}>
        <div className="flex flex-col gap-2 py-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-medium">{label}</span>
            <span className={cn("font-medium tabular-nums", tone.text)}>{pct}%</span>
          </div>
          <div className="text-muted-foreground tabular-nums">
            {num.format(used)} of {num.format(limit)}
            {u} used
            {used > limit ? ` · ${num.format(used - limit)}${u} over` : ` · ${num.format(limit - used)}${u} left`}
          </div>
          {breakdown.length ? (
            <div className="flex flex-col gap-1.5 border-t pt-2">
              {breakdown.map((p) => (
                <div className="flex flex-col gap-1" key={p.label}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-muted-foreground">{p.label}</span>
                    <span className="tabular-nums">
                      {num.format(p.value)}
                      {u}
                    </span>
                  </div>
                  <span className="relative h-1 overflow-hidden rounded-full bg-foreground/8">
                    <span
                      className="absolute inset-y-0 left-0 rounded-full bg-foreground/50"
                      style={{ width: `${Math.min(100, (p.value / (limit || 1)) * 100)}%` }}
                    />
                  </span>
                </div>
              ))}
            </div>
          ) : null}
          {target !== null ? (
            <div className="flex items-center gap-1.5 border-t pt-2 text-muted-foreground">
              <RotateCcwIcon className="size-3" />
              <span>
                Resets in <Countdown target={target} />
              </span>
            </div>
          ) : null}
        </div>
      </TooltipPopup>
    </Tooltip>
  );
}

export function QuotaRingGroup({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <TooltipProvider closeDelay={80} delay={350}>
      <div className={cn("flex flex-wrap gap-1", className)}>{children}</div>
    </TooltipProvider>
  );
}
