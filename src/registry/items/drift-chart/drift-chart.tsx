"use client";

import { CheckIcon } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface DriftStep {
  id: string;
  label: string;
  planned: number;
  actual?: number;
  done?: boolean;
}

export interface DriftChartProps {
  title: string;
  agent?: string;
  steps: DriftStep[];
  unit?: string;
  tickEvery?: number;
  className?: string;
}

type Laid = DriftStep & { start: number; ghost: number; bar: number; state: "done" | "running" | "todo" };

function layout(steps: DriftStep[]) {
  let cursor = 0;
  const rows: Laid[] = steps.map((step) => {
    const start = cursor;
    const state: Laid["state"] = step.done ? "done" : step.actual !== undefined ? "running" : "todo";
    const bar = step.actual ?? 0;
    const span = state === "done" ? bar : state === "running" ? Math.max(bar, step.planned) : step.planned;
    cursor += span;
    return { ...step, start, ghost: step.planned, bar, state };
  });
  return { rows, expected: cursor };
}

function useReducedMotionAfterMount() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && !!prefers;
}

const BAR_Y = 4;
const BAR_H = 20;
const RADIUS = 6;

function barPath(x: number, w: number, left: number, right: number, y = BAR_Y, h = BAR_H) {
  const width = Math.max(0, w);
  const rl = Math.min(left, width / 2, h / 2);
  const rr = Math.min(right, width / 2, h / 2);
  const f = (n: number) => n.toFixed(2);
  return [
    `M${f(x + rl)},${f(y)}`,
    `H${f(x + width - rr)}`,
    `A${f(rr)},${f(rr)} 0 0 1 ${f(x + width)},${f(y + rr)}`,
    `V${f(y + h - rr)}`,
    `A${f(rr)},${f(rr)} 0 0 1 ${f(x + width - rr)},${f(y + h)}`,
    `H${f(x + rl)}`,
    `A${f(rl)},${f(rl)} 0 0 1 ${f(x)},${f(y + h - rl)}`,
    `V${f(y + rl)}`,
    `A${f(rl)},${f(rl)} 0 0 1 ${f(x + rl)},${f(y)}`,
    "Z",
  ].join(" ");
}

export function DriftChart({ title, agent, steps, unit = "m", tickEvery = 5, className }: DriftChartProps) {
  const reduce = useReducedMotionAfterMount();
  const axisRef = useRef<HTMLDivElement>(null);
  const [trackW, setTrackW] = useState(0);

  useLayoutEffect(() => {
    const el = axisRef.current;
    if (!el) return;
    setTrackW(el.offsetWidth);
    const ro = new ResizeObserver(([entry]) => setTrackW(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { rows, expected } = layout(steps);
  const planned = steps.reduce((s, x) => s + x.planned, 0);
  const max = Math.max(planned, expected) * 1.08;
  const px = (t: number) => (t / max) * trackW;
  const over = expected - planned;
  const late = over > 0.05;
  const doneCount = rows.filter((r) => r.state === "done").length;
  const running = rows.find((r) => r.state === "running");
  const finished = doneCount === rows.length;
  const spring = reduce ? { duration: 0 } : { type: "spring" as const, stiffness: 170, damping: 26 };
  const ticks = Array.from({ length: Math.floor(max / tickEvery) + 1 }, (_, i) => i * tickEvery);
  const fmt = (t: number) => `${Math.round(t)}${unit}`;

  return (
    <div className={cn("flex w-[520px] max-w-full flex-col gap-4 rounded-2xl border bg-card p-4 text-card-foreground shadow-xs/5", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="truncate font-medium text-sm">{title}</span>
          <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
            <span className="relative flex size-1.5">
              {!finished && !reduce && <span className="absolute inset-0 animate-ping rounded-full bg-info/60" />}
              <span className={cn("relative size-1.5 rounded-full", finished ? "bg-success" : "bg-info")} />
            </span>
            {agent && <span className="font-mono">{agent}</span>}
            {agent && <span aria-hidden>·</span>}
            <span aria-live="polite" className="truncate">
              {finished ? "Finished" : running ? running.label : "Queued"}
            </span>
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-4 text-xs">
          <div className="flex flex-col items-end gap-1">
            <span className="text-muted-foreground">Planned</span>
            <span className="font-medium text-sm tabular-nums">{fmt(planned)}</span>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-muted-foreground">{finished ? "Took" : "Expected"}</span>
            <span className={cn("font-medium text-sm tabular-nums transition-colors duration-300", late ? "text-warning-foreground" : "text-foreground")}>
              {fmt(expected)}
            </span>
          </div>
        </div>
      </div>

      <div className="relative flex flex-col gap-1.5">
        {rows.map((row) => {
          const overrun = row.bar > row.ghost;
          const x = px(row.start);
          return (
            <div className="flex h-7 items-center gap-3" key={row.id}>
              <div className="flex w-28 shrink-0 items-center gap-1.5 text-xs sm:w-32">
                <span
                  className={cn(
                    "flex size-3.5 shrink-0 items-center justify-center rounded-full border transition-colors",
                    row.state === "done" && (overrun ? "border-transparent bg-warning text-white" : "border-transparent bg-success text-white"),
                    row.state === "running" && "border-info",
                    row.state === "todo" && "border-input",
                  )}
                >
                  {row.state === "done" && <CheckIcon className="size-2.5" strokeWidth={3} />}
                  {row.state === "running" && <span className="size-1.5 rounded-full bg-info" />}
                </span>
                <span className={cn("truncate", row.state === "todo" ? "text-muted-foreground" : "text-foreground")} title={row.label}>
                  {row.label}
                </span>
              </div>
              <div className="relative h-full flex-1">
                {trackW > 0 && (
                  <>
                    <svg aria-hidden className="absolute inset-0 size-full overflow-visible">
                      <motion.path
                        animate={{ d: barPath(x + 0.5, px(row.ghost) - 1, RADIUS, RADIUS, BAR_Y + 0.5, BAR_H - 1) }}
                        className="fill-none stroke-muted-foreground/40"
                        initial={false}
                        strokeDasharray="3 3"
                        transition={spring}
                      />
                      <motion.path
                        animate={{ d: barPath(x, px(Math.min(row.bar, row.ghost)), RADIUS, overrun ? 0 : RADIUS) }}
                        className="fill-teal-500 dark:fill-teal-400"
                        initial={false}
                        transition={spring}
                      />
                      <motion.path
                        animate={{
                          d: barPath(x + px(row.ghost), px(Math.max(row.bar - row.ghost, 0)), 0, RADIUS),
                          opacity: overrun ? 1 : 0,
                        }}
                        className="fill-warning"
                        initial={false}
                        transition={spring}
                      />
                    </svg>
                    {row.state !== "todo" && row.bar > 0 && (
                      <motion.span
                        animate={{ x: px(row.start + (row.state === "done" ? Math.max(row.bar, row.ghost) : row.bar)) }}
                        className={cn(
                          "absolute top-1/2 left-0 ms-1.5 -translate-y-1/2 whitespace-nowrap font-medium text-[10px] tabular-nums",
                          overrun ? "text-warning-foreground" : "text-muted-foreground",
                        )}
                        initial={false}
                        transition={spring}
                      >
                        {overrun ? `+${Math.round((row.bar - row.ghost) * 10) / 10}${unit}` : fmt(row.bar)}
                      </motion.span>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}

        {trackW > 0 && (
          <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 left-31 sm:left-35">
            <motion.span
              animate={{ x: px(planned) }}
              className="absolute -top-1 -bottom-1 left-0 w-px border-foreground/40 border-l border-dashed"
              initial={false}
              transition={spring}
            />
            <motion.span
              animate={{ x: px(expected), opacity: late ? 1 : 0 }}
              className="absolute -top-1 -bottom-1 left-0 w-0.5 -translate-x-1/2 rounded-full bg-warning"
              initial={false}
              transition={spring}
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="w-28 shrink-0 sm:w-32" />
        <div className="relative h-4 flex-1 text-[10px] text-muted-foreground tabular-nums" ref={axisRef}>
          {trackW > 0 &&
            ticks.map((t, i) => (
              <motion.span
                animate={{ x: px(t) }}
                className={cn("absolute left-0", i > 0 && "-translate-x-1/2")}
                initial={false}
                key={t}
                transition={spring}
              >
                {t}
                {unit}
              </motion.span>
            ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t pt-3 text-muted-foreground text-xs">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-4 rounded-[calc(var(--radius)*0.3)] border border-muted-foreground/50 border-dashed" />
          Plan
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-4 rounded-[calc(var(--radius)*0.3)] bg-teal-500 dark:bg-teal-400" />
          Actual
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-4 rounded-[calc(var(--radius)*0.3)] bg-warning" />
          Overrun
        </span>
        <span className={cn("ms-auto tabular-nums transition-colors duration-300", late && "text-warning-foreground")}>
          {late ? (
            <>
              Finish pushed <span className="font-medium">+{Math.round(over)}{unit}</span>
            </>
          ) : (
            "On plan"
          )}
        </span>
      </div>
    </div>
  );
}
