"use client";

import { RotateCcwIcon } from "lucide-react";
import { AnimatePresence, MotionConfig, motion, useReducedMotion, useSpring } from "motion/react";
import { type KeyboardEvent, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type SwarmTaskStatus = "queued" | "running" | "retrying" | "done" | "failed";

export interface SwarmProps {
  title?: string;
  tasks?: number;
  workers?: number;
  failureRate?: number;
  maxAttempts?: number;
  costPerSecond?: number;
  taskLabel?: (index: number) => string;
  errors?: string[];
  loop?: boolean;
  timeScale?: number;
  className?: string;
}

interface Task {
  status: SwarmTaskStatus;
  progress: number;
  attempt: number;
  worker: number | null;
  duration: number;
  spent: number;
  cost: number;
  error: string | null;
  wakeAt: number;
  poison: boolean;
}

const label: Record<SwarmTaskStatus, string> = { queued: "Queued", running: "Filling", retrying: "Retrying", done: "Done", failed: "Failed" };
const badge: Record<SwarmTaskStatus, "secondary" | "info" | "warning" | "success" | "error"> = {
  queued: "secondary",
  running: "info",
  retrying: "warning",
  done: "success",
  failed: "error",
};

const defaultErrors = ["429 · rate limited", "timeout after 30s", "502 from embeddings API", "malformed chunk"];

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fresh(n: number, r: () => number, poisonRate: number): Task[] {
  return Array.from({ length: n }, () => ({
    poison: r() < poisonRate,
    status: "queued",
    progress: 0,
    attempt: 0,
    worker: null,
    duration: 0,
    spent: 0,
    cost: 0,
    error: null,
    wakeAt: 0,
  }));
}

function fmtTime(s: number) {
  const v = Math.max(0, Math.round(s));
  if (v < 60) return `${v}s`;
  return `${Math.floor(v / 60)}m ${String(v % 60).padStart(2, "0")}s`;
}

function Rolling({ value, format }: { value: number; format: (n: number) => string }) {
  const reduce = useReducedMotion();
  const spring = useSpring(value, { stiffness: 120, damping: 22 });
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (reduce) spring.jump(value);
    else spring.set(value);
  }, [value, reduce, spring]);
  useEffect(
    () =>
      spring.on("change", (v) => {
        if (ref.current) ref.current.textContent = format(v);
      }),
    [spring, format],
  );
  return <span ref={ref}>{format(value)}</span>;
}

const fmtInt = (n: number) => String(Math.round(n));
const fmtCost = (n: number) => `$${n.toFixed(2)}`;
const ease = [0.23, 1, 0.32, 1] as const;
const fade = { duration: 0.16, ease };
const press = "transition-[box-shadow,scale] duration-150 ease-out active:scale-[0.97]";

const HEX = "50,0 100,28.87 100,86.6 50,115.47 0,86.6 0,28.87";
const HEX_CLIP = "polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)";
const CRACK = "M50 6 L46 34 L58 48 L44 66 L54 84 L48 110 M58 48 L80 56 M44 66 L24 72";
const MAX_ROWS = 6;

interface Cell {
  index: number;
  from: number;
  to: number;
  status: SwarmTaskStatus;
  fill: number;
  done: number;
  attempt: number;
  worker: number | null;
  spent: number;
  cost: number;
  error: string | null;
}

function summarise(list: Task[], index: number, from: number, to: number): Cell {
  let fill = 0;
  let done = 0;
  let failed = 0;
  let retrying = 0;
  let running = 0;
  let attempt = 0;
  let worker: number | null = null;
  let spent = 0;
  let cost = 0;
  let error: string | null = null;
  for (let t = from; t < to; t++) {
    const k = list[t];
    if (k.status === "done") {
      fill += 1;
      done++;
    } else if (k.status === "running") {
      fill += k.progress;
      running++;
      worker = k.worker;
    } else if (k.status === "retrying") {
      fill += 0.25;
      retrying++;
    } else if (k.status === "failed") failed++;
    attempt = Math.max(attempt, k.attempt);
    spent += k.spent;
    cost += k.cost;
    if (k.error && (k.status === "failed" || k.status === "retrying" || !error)) error = k.error;
  }
  const size = to - from;
  const status: SwarmTaskStatus = failed ? "failed" : retrying ? "retrying" : running ? "running" : done === size ? "done" : done ? "running" : "queued";
  return { index, from, to, status, fill: fill / size, done, attempt, worker, spent, cost, error };
}

function HiveCell({ cell, size, h, selected, onSelect, focusable, labelText }: {
  cell: Cell;
  size: number;
  h: number;
  selected: boolean;
  onSelect: () => void;
  focusable: boolean;
  labelText: string;
}) {
  const reduce = useReducedMotion();
  const s = cell.status;
  const failed = s === "failed";
  return (
    <button
      aria-label={labelText}
      className="group absolute top-0 left-0 cursor-default outline-none"
      data-cell
      onFocus={onSelect}
      onPointerEnter={(e) => e.pointerType === "mouse" && onSelect()}
      style={{ width: size, height: h }}
      tabIndex={focusable ? 0 : -1}
      type="button"
    >
      <motion.span
        animate={{ scale: 1 }}
        className="absolute inset-0"
        initial={s === "done" && !reduce ? { scale: 1.08 } : false}
        key={s === "done" ? "capped" : "open"}
        transition={{ type: "spring", stiffness: 500, damping: 22 }}
      >
      <span className={cn("absolute inset-0 transition-colors duration-300", failed ? "bg-destructive/16" : "bg-foreground/[0.07]")} style={{ clipPath: HEX_CLIP }}>
        <span
          className={cn(
            "absolute inset-0 transition-[transform,background-color] ease-linear",
            s === "done" ? "bg-linear-to-b from-amber-300 to-amber-400 duration-200" : "bg-amber-500 duration-150",
            failed && "duration-500 ease-out",
          )}
          style={{ transform: `translateY(${(1 - (failed ? cell.fill * 0.6 : cell.fill)) * 100}%)` }}
        >
          <span className={cn("absolute inset-x-0 top-0 h-[2px] bg-amber-300 transition-opacity duration-150", (cell.fill === 0 || s === "done") && "opacity-0")} />
        </span>
        {s === "retrying" && !reduce && (
          <motion.span
            animate={{ x: ["-120%", "120%"] }}
            className="absolute inset-y-0 w-full bg-[linear-gradient(100deg,transparent_25%,color-mix(in_srgb,var(--color-white)_55%,transparent)_50%,transparent_75%)]"
            initial={{ x: "-120%" }}
            transition={{ duration: 1.1, ease: "linear", repeat: Number.POSITIVE_INFINITY, repeatDelay: 0.2 }}
          />
        )}
      </span>
      <svg aria-hidden className="pointer-events-none absolute inset-0 size-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 115.47">
        {failed && (
          <motion.path
            animate={{ pathLength: 1, opacity: 1 }}
            className="stroke-destructive"
            d={CRACK}
            fill="none"
            initial={reduce ? false : { pathLength: 0, opacity: 0.4 }}
            strokeLinecap="round"
            strokeLinejoin="round"
            transition={{ duration: 0.28, ease }}
            vectorEffect="non-scaling-stroke"
            style={{ strokeWidth: 1.5 }}
          />
        )}
        {s === "retrying" && <polygon className="fill-none stroke-warning" points={HEX} strokeWidth={1.25} vectorEffect="non-scaling-stroke" />}
        <polygon
          className={cn("fill-none stroke-ring opacity-0 transition-opacity duration-100 group-focus-visible:opacity-100")}
          points={HEX}
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
        <polygon className={cn("fill-none stroke-foreground/40 opacity-0 transition-opacity duration-100", selected && "opacity-100")} points={HEX} strokeWidth={1.25} vectorEffect="non-scaling-stroke" />
      </svg>
      </motion.span>
    </button>
  );
}

export function Swarm({
  title = "Re-embed help center",
  tasks = 60,
  workers = 8,
  failureRate = 0.07,
  maxAttempts = 3,
  costPerSecond = 0.00024,
  taskLabel = (i) => `chunk-${String(i + 1).padStart(3, "0")}`,
  errors = defaultErrors,
  loop = true,
  timeScale = 8,
  className,
}: SwarmProps) {
  const [initial] = useState(() => fresh(tasks, rng(3), failureRate / 3));
  const random = useRef(rng(7));
  const list = useRef<Task[]>(initial);
  const run = useRef(1);
  const finishedAt = useRef<number | null>(null);
  const hovering = useRef(false);
  const [, setVersion] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const [focusIndex, setFocusIndex] = useState(0);
  const hive = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const el = hive.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const reset = useCallback(() => {
    run.current += 1;
    random.current = rng(7 + run.current * 31);
    list.current = fresh(tasks, random.current, failureRate / 3);
    finishedAt.current = null;
  }, [tasks, failureRate]);

  const retryFailed = () => {
    for (const c of list.current) {
      if (c.status === "failed") Object.assign(c, { status: "queued", progress: 0, attempt: 0, error: null, worker: null, poison: random.current() < 0.4 });
    }
    finishedAt.current = null;
    setVersion((v) => v + 1);
  };

  useEffect(() => {
    if (list.current.length !== tasks) list.current = fresh(tasks, random.current, failureRate / 3);
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      const dt = Math.min(now - last, 250);
      last = now;
      const all = list.current;
      const r = random.current;
      const busy = new Set<number>();

      for (const c of all) {
        if (c.status !== "running") continue;
        c.progress = Math.min(1, c.progress + dt / c.duration);
        c.spent += dt;
        c.cost += (dt / 1000) * timeScale * costPerSecond;
        if (c.progress >= 1) {
          if (c.poison || r() < failureRate) {
            c.error = errors[Math.floor(r() * errors.length)] ?? "failed";
            if (c.attempt < maxAttempts) {
              c.status = "retrying";
              c.progress = 0;
              c.wakeAt = now + 1100 + c.attempt * 500;
            } else c.status = "failed";
          } else c.status = "done";
        } else if (c.worker !== null) busy.add(c.worker);
      }

      let free = workers - busy.size;
      const start = (c: Task) => {
        let w = 0;
        while (busy.has(w)) w++;
        busy.add(w);
        Object.assign(c, { status: "running", progress: 0, attempt: c.attempt + 1, worker: w, duration: 900 + r() * 1400 });
        free--;
      };
      for (const c of all) {
        if (free <= 0) break;
        if (c.status === "retrying" && now >= c.wakeAt) start(c);
      }
      for (const c of all) {
        if (free <= 0) break;
        if (c.status === "queued") start(c);
      }

      const settled = all.every((c) => c.status === "done" || c.status === "failed");
      if (settled && finishedAt.current === null) finishedAt.current = now;
      if (loop && settled && finishedAt.current !== null && now - finishedAt.current > 5000 && !hovering.current) reset();
      setVersion((v) => v + 1);
    }, 100);
    return () => window.clearInterval(id);
  }, [tasks, workers, failureRate, maxAttempts, costPerSecond, errors, loop, timeScale, reset]);

  const size = width && width < 400 ? 40 : 36;
  const gap = 3;
  const h = size * 1.1547;
  const step = size + gap;
  const cols = Math.max(3, Math.floor((width - step / 2 + gap) / step));
  const perCell = Math.max(1, Math.ceil(tasks / (cols * MAX_ROWS)));
  const count = Math.ceil(tasks / perCell);
  const usedCols = Math.min(cols, count);
  const rows = Math.ceil(count / usedCols);
  const rowStep = h * 0.75 + gap * 0.866;
  const hiveW = usedCols * step - gap + (rows > 1 ? step / 2 : 0);
  const hiveH = rows ? (rows - 1) * rowStep + h : 0;
  const offsetX = Math.max(0, (width - hiveW) / 2);
  const pos = (i: number) => {
    const row = Math.floor(i / usedCols);
    const col = i % usedCols;
    return { x: offsetX + col * step + (row % 2 ? step / 2 : 0), y: row * rowStep };
  };

  const all = list.current;
  const cells: Cell[] = [];
  for (let i = 0; i < count; i++) cells.push(summarise(all, i, i * perCell, Math.min(tasks, (i + 1) * perCell)));

  const counts = { queued: 0, running: 0, retrying: 0, done: 0, failed: 0 } as Record<SwarmTaskStatus, number>;
  let cost = 0;
  let doneMs = 0;
  let remaining = 0;
  for (const c of all) {
    counts[c.status]++;
    cost += c.cost;
    if (c.status === "done") doneMs += c.spent;
    if (c.status === "queued" || c.status === "retrying") remaining += 1;
    if (c.status === "running") remaining += 1 - c.progress;
  }
  const avg = counts.done ? doneMs / counts.done : 1600;
  const eta = ((remaining * avg) / workers / 1000) * timeScale;
  const settled = counts.done + counts.failed === tasks;

  const cellName = (c: Cell) => (c.to - c.from === 1 ? taskLabel(c.from) : `${taskLabel(c.from)}–${taskLabel(c.to - 1).replace(/^\D+/, "")}`);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: usedCols, ArrowUp: -usedCols, Home: -focusIndex, End: count - 1 - focusIndex };
    const d = moves[e.key];
    if (d === undefined) return;
    e.preventDefault();
    const next = Math.max(0, Math.min(count - 1, focusIndex + d));
    setFocusIndex(next);
    hive.current?.querySelectorAll<HTMLElement>("[data-cell]")[next]?.focus();
  };

  const sel = active !== null && active < count ? cells[active] : null;
  const selPos = sel ? pos(sel.index) : null;
  const below = sel ? Math.floor(sel.index / usedCols) < rows / 2 : true;

  if (tasks === 0) {
    return (
      <div className={cn("w-full max-w-[480px] rounded-2xl border bg-card p-4 text-card-foreground shadow-xs/5", className)}>
        <div className="truncate font-medium text-sm">{title}</div>
        <div className="mt-4 flex h-40 flex-col items-center justify-center gap-1 rounded-xl border border-dashed text-center">
          <div className="font-medium text-sm">An empty hive</div>
          <div className="text-muted-foreground text-xs">Split a job into tasks and the cells fill in here.</div>
        </div>
      </div>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className={cn("w-full max-w-[480px] rounded-2xl border bg-card p-4 text-card-foreground shadow-xs/5", className)}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate font-medium text-sm">{title}</div>
            <div className="text-muted-foreground text-xs tabular-nums">
              {tasks} tasks · {workers} workers{perCell > 1 ? ` · ${perCell} per cell` : ""}
            </div>
          </div>
          <AnimatePresence initial={false} mode="wait">
            <motion.div animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} initial={{ opacity: 0, scale: 0.95 }} key={settled ? "done" : "run"} transition={fade}>
              {settled ? (
                <Badge variant={counts.failed ? "warning" : "success"}>{counts.failed ? `Finished · ${counts.failed} failed` : "Finished"}</Badge>
              ) : (
                <Badge variant="secondary">
                  <span className="relative mr-0.5 flex size-1.5">
                    <span className="absolute inset-0 animate-ping rounded-full bg-amber-400 opacity-60 motion-reduce:hidden" />
                    <span className="relative size-1.5 rounded-full bg-amber-400" />
                  </span>
                  Run #{run.current}
                </Badge>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <dl className="mt-4 grid grid-cols-4 gap-2">
          {[
            {
              k: "Done",
              v: (
                <>
                  <Rolling format={fmtInt} value={counts.done} />
                  <span className="text-muted-foreground">/{tasks}</span>
                </>
              ),
            },
            { k: "Failed", v: <span className={cn(counts.failed > 0 && "text-destructive-foreground")}><Rolling format={fmtInt} value={counts.failed} /></span> },
            { k: "Cost", v: <Rolling format={fmtCost} value={cost} /> },
            { k: "Time left", v: settled ? "—" : <Rolling format={fmtTime} value={eta} /> },
          ].map((s) => (
            <div className="min-w-0 rounded-xl bg-muted px-2.5 py-2" key={s.k}>
              <dt className="truncate text-muted-foreground text-xs">{s.k}</dt>
              <dd className="mt-0.5 truncate font-medium font-mono text-sm tabular-nums">{s.v}</dd>
            </div>
          ))}
        </dl>

        <div
          aria-label={`${title}: ${counts.done} of ${tasks} tasks done${counts.failed ? `, ${counts.failed} failed` : ""}`}
          className="relative mt-5"
          onKeyDown={onKeyDown}
          onPointerEnter={() => {
            hovering.current = true;
          }}
          onPointerLeave={() => {
            hovering.current = false;
            setActive(null);
          }}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) setActive(null);
          }}
          ref={hive}
          role="group"
          style={{ height: width ? hiveH : 6 * (36 * 1.1547 * 0.75 + 2.6) + 36 * 1.1547 * 0.25 }}
        >
          {width > 0 &&
            cells.map((c) => {
              const p = pos(c.index);
              return (
                <div className="absolute top-0 left-0" key={c.index} style={{ transform: `translate(${p.x}px, ${p.y}px)` }}>
                  <HiveCell
                    cell={c}
                    focusable={c.index === focusIndex}
                    h={h}
                    labelText={`${cellName(c)}: ${label[c.status]}${c.to - c.from > 1 ? `, ${c.done} of ${c.to - c.from} done` : ""}${c.attempt > 1 ? `, attempt ${c.attempt}` : ""}`}
                    onSelect={() => {
                      setActive(c.index);
                      setFocusIndex(c.index);
                    }}
                    selected={active === c.index}
                    size={size}
                  />
                </div>
              );
            })}

          <AnimatePresence>
            {sel && selPos && (
              <motion.div
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="pointer-events-none absolute z-10 w-60 rounded-xl border bg-popover px-3 py-2.5 text-popover-foreground text-xs shadow-md/5"
                exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.1 } }}
                initial={{ opacity: 0, y: below ? -4 : 4, scale: 0.97 }}
                style={{
                  transformOrigin: below ? "top center" : "bottom center",
                  left: Math.min(Math.max(0, selPos.x + size / 2 - 120), Math.max(0, width - 240)),
                  ...(below ? { top: selPos.y + h + 6 } : { bottom: hiveH - selPos.y + 6 }),
                }}
                transition={fade}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium font-mono">{cellName(sel)}</span>
                  <Badge variant={badge[sel.status]}>{label[sel.status]}</Badge>
                </div>
                <div className="mt-1.5 flex items-center gap-1.5 whitespace-nowrap font-mono text-muted-foreground tabular-nums">
                  {sel.attempt ? (
                    <>
                      {sel.to - sel.from > 1 && (
                        <>
                          <span>
                            {sel.done}/{sel.to - sel.from} done
                          </span>
                          <span aria-hidden>·</span>
                        </>
                      )}
                      {sel.worker !== null && (
                        <>
                          <span>w{sel.worker + 1}</span>
                          <span aria-hidden>·</span>
                        </>
                      )}
                      <span>
                        try {sel.attempt}/{maxAttempts}
                      </span>
                      <span aria-hidden>·</span>
                      <span>{((sel.spent / 1000) * timeScale).toFixed(1)}s</span>
                      <span aria-hidden>·</span>
                      <span>${sel.cost.toFixed(3)}</span>
                    </>
                  ) : (
                    <span className="font-sans">Waiting for a free worker</span>
                  )}
                </div>
                {sel.error && sel.status !== "done" && (
                  <div className={cn("mt-2 truncate border-t pt-2 font-mono", sel.status === "failed" ? "text-destructive-foreground" : "text-warning-foreground")}>{sel.error}</div>
                )}
                {sel.error && sel.status === "done" && <div className="mt-2 truncate border-t pt-2 text-muted-foreground">Recovered after {sel.error}</div>}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-5 flex min-h-8 items-center justify-between gap-3">
          <ul className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground text-xs">
            {(
              [
                ["running", "bg-amber-500"],
                ["retrying", "bg-warning/30 ring-1 ring-warning ring-inset"],
                ["done", "bg-linear-to-b from-amber-300 to-amber-400"],
                ["failed", "bg-destructive/40"],
              ] as const
            ).map(([s, swatch]) => (
              <li className="flex items-center gap-1.5 tabular-nums" key={s}>
                <span className={cn("h-2.5 w-[9px]", swatch)} style={{ clipPath: HEX_CLIP }} />
                {label[s]}
                <span className="font-mono text-foreground">{counts[s]}</span>
              </li>
            ))}
          </ul>
          {settled && (
            <Button
              className={press}
              onClick={() => {
                if (counts.failed) retryFailed();
                else {
                  reset();
                  setVersion((v) => v + 1);
                }
              }}
              size="sm"
              variant="outline"
            >
              <RotateCcwIcon />
              {counts.failed ? `Retry ${counts.failed}` : "Run again"}
            </Button>
          )}
        </div>
      </div>
    </MotionConfig>
  );
}
