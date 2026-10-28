"use client";

import { CheckIcon, PauseIcon, XIcon } from "lucide-react";
import { AnimatePresence, LayoutGroup, MotionConfig, motion, useReducedMotion } from "motion/react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

function useReducedMotionAfterMount() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && Boolean(prefers);
}

export interface ConveyorProps {
  title?: string;
  jobNames?: string[];
  workers?: number;
  jobsPerSecond?: number;
  rateLimit?: { every: number; for: number } | false;
  failRate?: number;
  warmupSeconds?: number;
  className?: string;
}

interface Job {
  id: number;
  name: string;
  workSeconds: number;
  progress: number;
  error?: string;
}

interface Sample {
  depth: number;
  limited: boolean;
}

const TICK = 100;
const SAMPLE_EVERY = 5;
const SAMPLES = 60;
const errors = ["timeout after 30s", "upstream 502", "invalid input"];

function seededRandom(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const defaultNames = ["resize image", "transcode clip", "embed document", "summarize thread", "extract invoice"];
const defaultLimit = { every: 22, for: 6 };

const spring = { type: "spring", stiffness: 420, damping: 34 } as const;

function Chip({ job, tone = "queued" }: { job: Job; tone?: "queued" | "running" | "done" | "failed" }) {
  return (
    <motion.span
      className={cn(
        "inline-flex h-6 shrink-0 items-center justify-center rounded-md border px-1.5 font-mono text-[11px] tabular-nums",
        tone === "queued" && "border-border bg-background text-muted-foreground",
        tone === "running" && "border-info/30 bg-info/10 text-info-foreground",
        tone === "done" && "border-success/25 bg-success/8 text-success-foreground",
        tone === "failed" && "border-destructive/25 bg-destructive/8 text-destructive-foreground",
      )}
      layoutId={`job-${job.id}`}
      title={job.error ? `${job.name}: ${job.error}` : job.name}
      transition={spring}
    >
      #{job.id}
    </motion.span>
  );
}

function Roll({ value }: { value: number }) {
  return (
    <span className="relative inline-flex h-[1lh] overflow-hidden tabular-nums">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "-100%", opacity: 0 }}
          initial={{ y: "100%", opacity: 0 }}
          key={value}
          transition={spring}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function DepthChart({ samples, max }: { samples: Sample[]; max: number }) {
  const w = 300;
  const h = 48;
  const step = w / (SAMPLES - 1);
  const offset = SAMPLES - samples.length;
  const pts = samples.map((s, i) => [(i + offset) * step, h - 2 - (s.depth / max) * (h - 6)] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = pts.length ? `${line} L${pts[pts.length - 1][0].toFixed(1)} ${h} L${pts[0][0].toFixed(1)} ${h} Z` : "";
  const bands: { x: number; w: number }[] = [];
  samples.forEach((s, i) => {
    if (!s.limited) return;
    const x = (i + offset) * step - step / 2;
    const last = bands[bands.length - 1];
    if (last && Math.abs(last.x + last.w - x) < 0.5) last.w += step;
    else bands.push({ x, w: step });
  });
  const tip = pts[pts.length - 1];
  return (
    <svg aria-hidden className="h-12 w-full overflow-visible" preserveAspectRatio="none" viewBox={`0 0 ${w} ${h}`}>
      {bands.map((b) => (
        <rect className="fill-warning/12" height={h} key={b.x} width={b.w} x={Math.max(b.x, 0)} y={0} />
      ))}
      <line className="stroke-border" x1={0} x2={w} y1={h - 0.5} y2={h - 0.5} />
      {area && <path className="fill-foreground/8" d={area} />}
      {line && (
        <path
          className="stroke-foreground/60"
          d={line}
          fill="none"
          strokeLinejoin="round"
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
        />
      )}
      {tip && (
        <circle className="fill-foreground" cx={tip[0]} cy={tip[1]} r={2.5} vectorEffect="non-scaling-stroke" />
      )}
    </svg>
  );
}

export function Conveyor({
  title = "Job queue",
  jobNames = defaultNames,
  workers: workerCount = 3,
  jobsPerSecond = 1.35,
  rateLimit = defaultLimit,
  failRate = 0.07,
  warmupSeconds = 26,
  className,
}: ConveyorProps) {
  const reduce = useReducedMotionAfterMount();
  const [queue, setQueue] = useState<Job[]>([]);
  const [slots, setSlots] = useState<(Job | null)[]>(() => Array.from({ length: workerCount }, () => null));
  const [done, setDone] = useState<Job[]>([]);
  const [failed, setFailed] = useState<Job[]>([]);
  const [counts, setCounts] = useState({ done: 0, failed: 0 });
  const [samples, setSamples] = useState<Sample[]>([]);
  const [limitLeft, setLimitLeft] = useState(0);

  const sim = useRef({
    t: 0,
    nextId: 481,
    rand: seededRandom(Date.now() % 100000),
    queue: [] as Job[],
    slots: [] as (Job | null)[],
    limitUntil: 0,
    nextLimit: 0,
    ticks: 0,
  });

  const stripRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(7);
  useLayoutEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setFit(Math.max(3, Math.floor((el.clientWidth + 4) / 44) - 1)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const s = sim.current;
    Object.assign(s, { t: 0, ticks: 0, limitUntil: 0, nextId: 481, queue: [] });
    s.slots = Array.from({ length: workerCount }, () => null);
    setSamples([]);
    setDone([]);
    setFailed([]);
    setCounts({ done: 0, failed: 0 });
    s.nextLimit = rateLimit ? rateLimit.every * 0.45 : Number.POSITIVE_INFINITY;
    for (let i = 0; i < 3; i++) {
      s.queue.push({ id: s.nextId++, name: jobNames[i % jobNames.length], workSeconds: 1 + s.rand() * 0.8, progress: 0 });
    }
    setQueue([...s.queue]);

    const tick = () => {
      const dt = TICK / 1000;
      s.t += dt;
      s.ticks += 1;
      const limited = s.t < s.limitUntil;

      if (rateLimit && !limited && s.t >= s.nextLimit) {
        s.limitUntil = s.t + rateLimit.for;
        s.nextLimit = s.t + rateLimit.every;
      }

      if (s.rand() < jobsPerSecond * dt) {
        s.queue.push({
          id: s.nextId++,
          name: jobNames[s.nextId % jobNames.length],
          workSeconds: 1 + s.rand() * 0.8,
          progress: 0,
        });
      }

      const landedDone: Job[] = [];
      const landedFailed: Job[] = [];
      s.slots = s.slots.map((job) => {
        if (!job) return null;
        if (s.t < s.limitUntil) return job;
        const progress = Math.min(job.progress + dt / job.workSeconds, 1);
        if (progress >= 1) {
          if (s.rand() < failRate) landedFailed.push({ ...job, progress: 1, error: errors[job.id % errors.length] });
          else landedDone.push({ ...job, progress: 1 });
          return null;
        }
        return { ...job, progress };
      });

      if (s.t >= s.limitUntil) {
        const free = s.slots.findIndex((x) => x === null);
        const next = s.queue[0];
        if (free !== -1 && next) {
          s.queue = s.queue.slice(1);
          s.slots[free] = next;
        }
      }

      setQueue([...s.queue]);
      setSlots([...s.slots]);
      if (landedDone.length) {
        setDone((d) => [...landedDone, ...d].slice(0, 3));
        setCounts((c) => ({ ...c, done: c.done + landedDone.length }));
      }
      if (landedFailed.length) {
        setFailed((f) => [...landedFailed, ...f].slice(0, 1));
        setCounts((c) => ({ ...c, failed: c.failed + landedFailed.length }));
      }
      setLimitLeft(Math.max(0, Math.ceil(s.limitUntil - s.t)));
      if (s.ticks % SAMPLE_EVERY === 0) {
        const sample = { depth: s.queue.length, limited: s.t < s.limitUntil };
        setSamples((list) => [...list, sample].slice(-SAMPLES));
      }
    };
    for (let i = 0; i < warmupSeconds * (1000 / TICK); i++) tick();
    const iv = setInterval(tick, TICK);
    return () => {
      clearInterval(iv);
      s.queue = [];
    };
    // Restart only when the shape of the simulation changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workerCount, jobsPerSecond, failRate, rateLimit ? rateLimit.every : 0, rateLimit ? rateLimit.for : 0, jobNames.join("|"), warmupSeconds]);

  const limited = limitLeft > 0;
  const max = useMemo(() => Math.max(8, ...samples.map((s) => s.depth)) * 1.15, [samples]);
  const shown = queue.slice(0, fit);
  const hidden = queue.length - shown.length;
  const busy = slots.filter(Boolean).length;

  return (
    <MotionConfig reducedMotion="user">
    <div className={cn("w-full max-w-[460px] rounded-2xl border bg-card shadow-xs/5", className)}>
      <div className="flex items-start justify-between gap-3 px-4 pt-3.5">
        <div className="min-w-0">
          <h3 className="truncate font-medium text-sm">{title}</h3>
          <p className="text-muted-foreground text-xs tabular-nums">
            {busy}/{workerCount} workers busy
          </p>
        </div>
        <AnimatePresence initial={false} mode="wait">
          {limited ? (
            <motion.span
              animate={{ opacity: 1, scale: 1 }}
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-warning/10 px-2 py-0.5 font-medium text-warning-foreground text-xs tabular-nums"
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.1 } }}
              initial={{ opacity: 0, scale: 0.95 }}
              key="limited"
              transition={spring}
            >
              <PauseIcon className="size-3" />
              Rate limited · {limitLeft}s
            </motion.span>
          ) : (
            <motion.span
              animate={{ opacity: 1, scale: 1 }}
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-muted-foreground text-xs"
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.1 } }}
              initial={{ opacity: 0, scale: 0.95 }}
              key="running"
              transition={spring}
            >
              <span className="relative flex size-1.5">
                {!reduce && <span className="absolute inset-0 animate-ping rounded-full bg-success/70" />}
                <span className="relative size-1.5 rounded-full bg-success" />
              </span>
              Processing
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <div className="mx-4 mt-3 rounded-xl border px-3 pt-2.5 pb-2">
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="text-muted-foreground">Backlog</span>
          <AnimatePresence>
            {samples.some((x) => x.limited) && (
              <motion.span
                animate={{ opacity: 1 }}
                className="flex items-center gap-1.5 text-muted-foreground"
                exit={{ opacity: 0 }}
                initial={{ opacity: 0 }}
              >
                <span className="size-2 rounded-[calc(var(--radius)*0.2)] bg-warning/30" />
                Rate limited
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <div className="flex items-end gap-4">
          <p className="w-8 shrink-0 font-medium text-2xl leading-8 tabular-nums">
            <Roll value={queue.length} />
          </p>
          <div className="min-w-0 flex-1">
            <DepthChart max={max} samples={samples} />
          </div>
        </div>
      </div>

      <LayoutGroup>
        <div className="px-4 pt-4">
          <p className="mb-1.5 text-muted-foreground text-xs">Queued</p>
          <div className="relative flex h-6 items-center gap-1" ref={stripRef}>
            <AnimatePresence initial={false} mode="popLayout">
              {shown.map((job) => (
                <motion.span
                  animate={{ opacity: 1, y: 0 }}
                  className="flex"
                  initial={{ opacity: 0, y: -14 }}
                  key={job.id}
                  layout
                  transition={spring}
                >
                  <Chip job={job} />
                </motion.span>
              ))}
              {hidden > 0 && (
                <motion.span
                  animate={{ opacity: 1 }}
                  className="ml-0.5 shrink-0 text-muted-foreground text-xs tabular-nums"
                  initial={{ opacity: 0 }}
                  key="more"
                  layout
                >
                  +{hidden}
                </motion.span>
              )}
              {queue.length === 0 && (
                <motion.span
                  animate={{ opacity: 1 }}
                  className="text-muted-foreground text-xs"
                  initial={{ opacity: 0 }}
                  key="empty"
                >
                  Empty — workers are keeping up
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          <motion.div
            animate={limited || reduce ? { backgroundPositionX: "0px" } : { backgroundPositionX: ["0px", "-10px"] }}
            aria-hidden
            className="mt-1.5 h-1 rounded-full bg-[repeating-linear-gradient(90deg,var(--color-border)_0_6px,transparent_6px_10px)] opacity-80"
            transition={limited || reduce ? { duration: 0.2 } : { duration: 0.6, ease: "linear", repeat: Number.POSITIVE_INFINITY }}
          />
        </div>

        <ul className="space-y-1.5 px-4 pt-3" aria-label="Workers">
          {slots.map((job, i) => (
            <li className="flex items-center gap-2" key={i}>
              <span className="w-5 shrink-0 font-mono text-[10px] text-muted-foreground">w{i + 1}</span>
              <div
                className={cn(
                  "relative flex h-8 min-w-0 flex-1 items-center gap-2 rounded-lg border pr-2.5 pl-1",
                  job ? "bg-background" : "border-dashed bg-transparent",
                )}
              >
                {job && (
                  <span className="absolute inset-0 overflow-hidden rounded-[calc(var(--radius-lg)-1px)]">
                  <motion.span
                    animate={{ scaleX: job.progress }}
                    className={cn(
                      "absolute inset-0 origin-left transition-colors duration-300",
                      limited ? "bg-warning/12" : "bg-info/10",
                    )}
                    initial={false}
                    key={job.id}
                    transition={{ type: "tween", duration: TICK / 1000, ease: "linear" }}
                  />
                  </span>
                )}
                {job ? (
                  <>
                    <span className="relative flex">
                      <Chip job={job} tone="running" />
                    </span>
                    <span className="relative min-w-0 flex-1 truncate text-xs">{job.name}</span>
                    <span
                      className={cn(
                        "relative flex shrink-0 items-center gap-1 font-mono text-[10px] tabular-nums",
                        limited ? "text-warning-foreground" : "text-muted-foreground",
                      )}
                    >
                      {limited && <PauseIcon className="size-3" />}
                      {Math.round(job.progress * 100)}%
                    </span>
                  </>
                ) : (
                  <span className="pl-1.5 text-muted-foreground text-xs">{limited ? "Paused" : "Idle"}</span>
                )}
              </div>
            </li>
          ))}
        </ul>

        <div className="grid grid-cols-2 gap-2 p-4">
          {(
            [
              { key: "done", label: "Done", Icon: CheckIcon, list: done, count: counts.done },
              { key: "failed", label: "Failed", Icon: XIcon, list: failed, count: counts.failed },
            ] as const
          ).map((col) => (
            <div className="min-w-0 rounded-xl bg-muted/60 p-2.5" key={col.key}>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <col.Icon
                    className={cn("size-3", col.key === "done" ? "text-success-foreground" : "text-destructive-foreground")}
                  />
                  {col.label}
                </span>
                <span className="font-medium text-sm">
                  <Roll value={col.count} />
                </span>
              </div>
              <div className="mt-2 flex h-6 gap-1.5">
                {col.list.length === 0 && <span className="text-muted-foreground text-xs leading-6">None yet</span>}
                {col.key === "failed" && col.list[0] ? (
                  <>
                    <Chip job={col.list[0]} key={col.list[0].id} tone="failed" />
                    <span className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground leading-6">
                      {col.list[0].error}
                    </span>
                  </>
                ) : (
                  col.list.map((job) => <Chip job={job} key={job.id} tone={col.key} />)
                )}
              </div>
            </div>
          ))}
        </div>
      </LayoutGroup>
    </div>
    </MotionConfig>
  );
}
