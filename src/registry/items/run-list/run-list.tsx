"use client";

import { CheckIcon, ChevronDownIcon, CircleAlertIcon, CircleCheckIcon, CircleXIcon, ExternalLinkIcon, RotateCwIcon, SquareIcon, XIcon } from "lucide-react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTab } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

// Stays false until mounted so the server render and the first client render match.
function useSafeReducedMotion() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && !!prefers;
}

export type RunStatus = "running" | "review" | "failed" | "done";

export interface RunListItem {
  id: string;
  title: string;
  agent: string;
  repo?: string;
  status: RunStatus;
  elapsed: number;
  steps: string[];
  outcome?: Exclude<RunStatus, "running">;
}

export interface RunListProps {
  tasks: RunListItem[];
  autoplay?: boolean;
  title?: string;
  onOpen?: (task: RunListItem) => void;
  className?: string;
}

type Filter = "all" | RunStatus;

const order: Record<RunStatus, number> = { review: 0, failed: 1, running: 2, done: 3 };

const statusMeta: Record<RunStatus, { label: string; badge: "info" | "warning" | "error" | "success" }> = {
  running: { label: "Running", badge: "info" },
  review: { label: "Needs review", badge: "warning" },
  failed: { label: "Failed", badge: "error" },
  done: { label: "Done", badge: "success" },
};

const filters: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "running", label: "Running" },
  { value: "review", label: "Review" },
  { value: "failed", label: "Failed" },
  { value: "done", label: "Done" },
];

const outcomeStep: Record<Exclude<RunStatus, "running">, string> = {
  review: "Opened a pull request for review",
  done: "Finished, all checks green",
  failed: "Stopped: tests failed after 3 tries",
};

const emptyCopy: Record<Filter, { title: string; body: string }> = {
  all: { title: "No runs yet", body: "Start an agent and its run shows up here with a live clock." },
  running: { title: "Nothing running", body: "Every agent is idle. New runs appear here as they start." },
  review: { title: "You're all caught up", body: "Nothing is waiting on your review." },
  failed: { title: "No failed runs", body: "Every run finished or is still going." },
  done: { title: "Nothing finished yet", body: "Completed runs land here with their last steps." },
};

const press = "transition-[scale,box-shadow,background-color] duration-150 ease-out active:scale-[0.97]";

const nextOutcome: Exclude<RunStatus, "running">[] = ["review", "done", "failed", "review", "done"];

function clock(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = h ? String(m).padStart(2, "0") : String(m);
  return `${h ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
}

export function RunList({ tasks: initial, autoplay = true, title = "Background agents", onOpen, className }: RunListProps) {
  const reduce = useSafeReducedMotion();
  const listId = useId();
  const [tasks, setTasks] = useState(initial);
  const [filter, setFilter] = useState<Filter>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const openRef = useRef(openId);
  useEffect(() => {
    openRef.current = openId;
  }, [openId]);

  useEffect(() => {
    const tick = setInterval(() => {
      setTasks((ts) => ts.map((t) => (t.status === "running" ? { ...t, elapsed: t.elapsed + 1 } : t)));
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    if (!autoplay) return;
    let turn = 0;
    const loop = setInterval(() => {
      turn++;
      setTasks((ts) => {
        const free = ts.filter((t) => t.id !== openRef.current);
        const running = free.filter((t) => t.status === "running");
        if (running.length >= 2) {
          const pick = running.reduce((a, b) => (b.elapsed > a.elapsed ? b : a));
          const outcome = pick.outcome ?? "done";
          return ts.map((t) =>
            t.id === pick.id ? { ...t, status: outcome, steps: [...t.steps, outcomeStep[outcome]].slice(-4) } : t,
          );
        }
        const idle = free.filter((t) => t.status === "done");
        if (!idle.length) return ts;
        const pick = idle[turn % idle.length];
        return ts.map((t) =>
          t.id === pick.id
            ? {
                ...t,
                status: "running",
                elapsed: 0,
                outcome: nextOutcome[turn % nextOutcome.length],
                steps: ["Picked up a new run", "Reading the repository"],
              }
            : t,
        );
      });
    }, 6500);
    return () => clearInterval(loop);
  }, [autoplay]);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: tasks.length, running: 0, review: 0, failed: 0, done: 0 };
    for (const t of tasks) c[t.status]++;
    return c;
  }, [tasks]);

  const visible = useMemo(
    () =>
      tasks
        .map((t, i) => ({ t, i }))
        .filter(({ t }) => filter === "all" || t.status === filter)
        .sort((a, b) => order[a.t.status] - order[b.t.status] || a.i - b.i)
        .map(({ t }) => t),
    [tasks, filter],
  );

  const act = (id: string, status: RunStatus, step: string) =>
    setTasks((ts) =>
      ts.map((t) =>
        t.id === id
          ? { ...t, status, elapsed: status === "running" ? 0 : t.elapsed, steps: [...t.steps, step].slice(-4) }
          : t,
      ),
    );

  const spring = reduce ? { duration: 0 } : { type: "spring" as const, stiffness: 420, damping: 36, mass: 0.8 };

  return (
    <div className={cn("w-full max-w-[460px] rounded-2xl border bg-card text-card-foreground shadow-xs/5", className)}>
      <div className="flex items-center justify-between gap-3 px-4 pt-4">
        <div>
          <h3 className="font-medium text-sm">{title}</h3>
          <p className="flex items-center gap-1.5 text-muted-foreground text-xs">
            <span
              aria-hidden
              className={cn(
                "size-1.5 rounded-full transition-colors duration-300",
                counts.running ? "bg-info" : "bg-muted-foreground/40",
              )}
            />
            <Rolling value={counts.running} /> running · <Rolling value={counts.review} /> waiting on you
          </p>
        </div>
      </div>

      <div className="px-4 pt-3">
        <FilterTabs
          controls={listId}
          counts={counts}
          onChange={(f) => {
            setFilter(f);
            setOpenId(null);
          }}
          value={filter}
        />
      </div>

      <LayoutGroup>
        <motion.ul className="relative flex flex-col gap-1 p-2" id={listId} layout transition={spring}>
          <AnimatePresence initial={false} mode="popLayout">
            {visible.map((task) => (
              <RunRow
                key={task.id}
                onAct={act}
                onOpen={onOpen}
                onToggle={() => setOpenId((o) => (o === task.id ? null : task.id))}
                open={openId === task.id}
                reduce={!!reduce}
                spring={spring}
                task={task}
              />
            ))}
          </AnimatePresence>
          {visible.length === 0 && (
            <motion.li
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-1 px-6 py-8 text-center"
              initial={{ opacity: 0 }}
              layout
              transition={{ duration: reduce ? 0 : 0.2, ease: "easeOut" }}
            >
              <span className="font-medium text-sm">{emptyCopy[filter].title}</span>
              <span className="text-pretty text-muted-foreground text-xs">{emptyCopy[filter].body}</span>
            </motion.li>
          )}
        </motion.ul>
      </LayoutGroup>
    </div>
  );
}

function RunRow({
  task,
  open,
  onToggle,
  onAct,
  onOpen,
  reduce,
  spring,
}: {
  task: RunListItem;
  open: boolean;
  onToggle: () => void;
  onAct: (id: string, status: RunStatus, step: string) => void;
  onOpen?: (task: RunListItem) => void;
  reduce: boolean;
  spring: object;
}) {
  const meta = statusMeta[task.status];
  const panelId = useId();
  return (
    <motion.li
      animate={{ opacity: 1, scale: 1 }}
      className={cn("rounded-lg transition-colors duration-150", open ? "bg-muted" : "hover:bg-muted/60")}
      exit={{ opacity: 0, scale: 0.96 }}
      initial={{ opacity: 0, scale: 0.96 }}
      layout
      transition={spring}
    >
      <motion.button
        aria-controls={panelId}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-start gap-3 rounded-lg px-2.5 py-2.5 text-left outline-none transition-[scale] duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.985]"
        layout="position"
        onClick={onToggle}
        transition={spring}
        type="button"
      >
        <StatusIcon reduce={reduce} status={task.status} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium text-sm">{task.title}</span>
          <span className="block truncate text-muted-foreground text-xs">
            {task.agent}
            {task.repo && <span className="font-mono"> · {task.repo}</span>}
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          <span
            className={cn(
              "font-mono text-xs tabular-nums",
              task.status === "running" ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {clock(task.elapsed)}
          </span>
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              className="max-sm:hidden"
              exit={{ opacity: 0, y: -4, filter: "blur(2px)" }}
              initial={{ opacity: 0, y: 4, filter: "blur(2px)" }}
              key={task.status}
              transition={{ duration: reduce ? 0 : 0.2, ease: [0.23, 1, 0.32, 1] }}
            >
              <Badge size="sm" variant={meta.badge}>
                {meta.label}
              </Badge>
            </motion.span>
          </AnimatePresence>
        </span>
        <ChevronDownIcon
          aria-hidden
          className={cn(
            "mt-1 size-3.5 shrink-0 text-muted-foreground transition-transform duration-200 ease-out motion-reduce:transition-none",
            open && "rotate-180",
          )}
        />
      </motion.button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            animate={{ height: "auto", opacity: 1 }}
            className="overflow-hidden"
            exit={{ height: 0, opacity: 0 }}
            id={panelId}
            initial={{ height: 0, opacity: 0 }}
            transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 34 }}
          >
            <div className="px-2.5 pb-3 pl-10">
              <ol className="relative flex flex-col gap-1.5 border-border border-l pl-3.5">
                {task.steps.slice(-3).map((step, i, all) => {
                  const last = i === all.length - 1;
                  return (
                    <motion.li
                      animate={{ opacity: 1, x: 0 }}
                      className="relative text-xs"
                      initial={{ opacity: 0, x: reduce ? 0 : -4 }}
                      key={`${step}-${i}`}
                      transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1], delay: reduce ? 0 : 0.04 + i * 0.03 }}
                    >
                      <span
                        className={cn(
                          "absolute top-1.5 -left-[18px] size-1.5 rounded-full ring-2 ring-muted",
                          last && task.status === "running" ? "bg-info" : "bg-muted-foreground/50",
                        )}
                      />
                      <span className={last ? "text-foreground" : "text-muted-foreground"}>{step}</span>
                      {last && task.status === "running" && !reduce && (
                        <span className="ml-1 inline-flex gap-0.5 align-middle">
                          {[0, 1, 2].map((d) => (
                            <motion.span
                              animate={{ opacity: [0.25, 0.9, 0.25] }}
                              className="size-1 rounded-full bg-info"
                              key={d}
                              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut", delay: d * 0.2 }}
                            />
                          ))}
                        </span>
                      )}
                    </motion.li>
                  );
                })}
              </ol>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {task.status === "review" && (
                  <>
                    <Button onClick={() => onAct(task.id, "done", "Approved by you")} className={press} size="xs">
                      <CheckIcon />
                      Approve
                    </Button>
                    <Button
                      onClick={() => onAct(task.id, "failed", "Rejected by you")}
                      className={press} size="xs"
                      variant="destructive-outline"
                    >
                      <XIcon />
                      Reject
                    </Button>
                  </>
                )}
                {task.status === "failed" && (
                  <Button onClick={() => onAct(task.id, "running", "Retrying from the last checkpoint")} className={press} size="xs">
                    <RotateCwIcon />
                    Retry
                  </Button>
                )}
                {task.status === "running" && (
                  <Button onClick={() => onAct(task.id, "failed", "Stopped by you")} className={press} size="xs" variant="outline">
                    <SquareIcon />
                    Stop
                  </Button>
                )}
                <Button onClick={() => onOpen?.(task)} className={press} size="xs" variant="ghost">
                  <ExternalLinkIcon />
                  Open
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
}

function StatusIcon({ status, reduce }: { status: RunStatus; reduce: boolean }) {
  return (
    <span className="relative mt-0.5 flex size-4 shrink-0 items-center justify-center">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
          className="flex"
          exit={{ scale: reduce ? 1 : 0.8, opacity: 0, filter: "blur(2px)" }}
          initial={{ scale: reduce ? 1 : 0.8, opacity: 0, filter: "blur(2px)" }}
          key={status}
          transition={{ duration: reduce ? 0.1 : 0.2, ease: [0.23, 1, 0.32, 1] }}
        >
          {status === "running" && (
            <svg aria-hidden className={cn("size-4 text-info", !reduce && "animate-spin")} viewBox="0 0 16 16">
              <circle cx="8" cy="8" fill="none" opacity="0.2" r="6" stroke="currentColor" strokeWidth="2" />
              <path d="M8 2a6 6 0 0 1 6 6" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
            </svg>
          )}
          {status === "review" && <CircleAlertIcon className="size-4 text-warning" />}
          {status === "failed" && <CircleXIcon className="size-4 text-destructive" />}
          {status === "done" && <CircleCheckIcon className="size-4 text-success" />}
        </motion.span>
      </AnimatePresence>
      <span className="sr-only">{statusMeta[status].label}</span>
    </span>
  );
}

function FilterTabs({
  value,
  onChange,
  counts,
  controls,
}: {
  value: Filter;
  onChange: (f: Filter) => void;
  counts: Record<Filter, number>;
  controls: string;
}) {
  return (
    <Tabs onValueChange={(v) => onChange(v as Filter)} value={value}>
      <TabsList aria-label="Filter tasks" className="w-full" size="sm">
        {filters.map((f) => (
          <TabsTab
            aria-controls={controls}
            className="min-w-0 gap-1 px-1.5 text-xs sm:px-2 sm:text-xs"
            key={f.value}
            value={f.value}
          >
            {f.label}
            <Rolling
              className={cn("transition-colors", f.value === value ? "text-muted-foreground" : "text-muted-foreground/56")}
              value={counts[f.value]}
            />
          </TabsTab>
        ))}
      </TabsList>
    </Tabs>
  );
}

const roll = {
  enter: (d: number) => ({ y: `${d * 100}%`, opacity: 0 }),
  center: { y: "0%", opacity: 1 },
  exit: (d: number) => ({ y: `${-d * 100}%`, opacity: 0 }),
};

function Rolling({ value, className }: { value: number; className?: string }) {
  const reduce = useSafeReducedMotion();
  const prev = useRef(value);
  const dir = reduce ? 0 : value >= prev.current ? 1 : -1;
  useEffect(() => {
    prev.current = value;
  }, [value]);
  return (
    <span className={cn("relative inline-flex overflow-hidden tabular-nums", className)}>
      <AnimatePresence custom={dir} initial={false} mode="popLayout">
        <motion.span
          animate="center"
          custom={dir}
          exit="exit"
          initial="enter"
          key={value}
          transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 30 }}
          variants={roll}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
