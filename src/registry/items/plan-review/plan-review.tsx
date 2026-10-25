"use client";

import { CheckIcon, GripVerticalIcon, PencilIcon, PlayIcon, PlusIcon, RotateCcwIcon, SquareIcon, XIcon } from "lucide-react";
import { AnimatePresence, motion, Reorder, useDragControls, useReducedMotion } from "motion/react";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface PlanStep {
  id: string;
  label: string;
  tool?: string;
  duration?: number;
  failOnce?: boolean;
  error?: string;
}

export interface PlanReviewProps {
  steps: PlanStep[];
  title?: string;
  agent?: string;
  onRun?: (steps: PlanStep[]) => void;
  className?: string;
}

type Phase = "review" | "running" | "failed" | "done";
type StepStatus = "pending" | "running" | "done" | "failed";

let nextId = 0;

const press = "transition-[scale,box-shadow,background-color] duration-150 ease-out active:scale-[0.97]";

function secs(ms: number) {
  return `${(ms / 1000).toFixed(1)}s`;
}

export function PlanReview({ steps: initial, title = "Plan", agent = "Agent", onRun, className }: PlanReviewProps) {
  const reduce = useReducedMotion();
  const [steps, setSteps] = useState(initial);
  const [phase, setPhase] = useState<Phase>("review");
  const [cursor, setCursor] = useState(0);
  const [status, setStatus] = useState<Record<string, StepStatus>>({});
  const [times, setTimes] = useState<Record<string, number>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const failedBefore = useRef(new Set<string>());

  useEffect(() => {
    if (phase !== "running") return;
    const step = steps[cursor];
    if (!step) return;
    const duration = step.duration ?? 1800;
    const started = performance.now();
    setStatus((s) => ({ ...s, [step.id]: "running" }));
    const timer = setInterval(() => {
      const ms = performance.now() - started;
      const willFail = step.failOnce && !failedBefore.current.has(step.id);
      const end = willFail ? duration * 0.6 : duration;
      if (ms < end) {
        setTimes((t) => ({ ...t, [step.id]: ms }));
        return;
      }
      clearInterval(timer);
      setTimes((t) => ({ ...t, [step.id]: end }));
      if (willFail) {
        failedBefore.current.add(step.id);
        setStatus((s) => ({ ...s, [step.id]: "failed" }));
        setPhase("failed");
        return;
      }
      setStatus((s) => ({ ...s, [step.id]: "done" }));
      if (cursor + 1 >= steps.length) setPhase("done");
      else setCursor(cursor + 1);
    }, 50);
    return () => clearInterval(timer);
  }, [phase, cursor, steps]);

  const run = () => {
    setEditing(null);
    setStatus({});
    setTimes({});
    failedBefore.current.clear();
    setCursor(0);
    setPhase("running");
    onRun?.(steps);
  };

  const retryFrom = (index: number) => {
    const rest = steps.slice(index).map((s) => s.id);
    setStatus((s) => Object.fromEntries(Object.entries(s).filter(([id]) => !rest.includes(id))));
    setTimes((t) => Object.fromEntries(Object.entries(t).filter(([id]) => !rest.includes(id))));
    setCursor(index);
    setPhase("running");
  };

  const backToReview = () => {
    setPhase("review");
    setStatus({});
    setTimes({});
    failedBefore.current.clear();
  };

  const move = (index: number, by: number) => {
    const to = index + by;
    if (to < 0 || to >= steps.length) return;
    setSteps((s) => {
      const next = [...s];
      const [item] = next.splice(index, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  const add = () => {
    const id = `new-${++nextId}`;
    setSteps((s) => [...s, { id, label: "", duration: 1800 }]);
    setEditing(id);
  };

  const rename = (id: string, label: string) => {
    setEditing(null);
    setSteps((s) => {
      const trimmed = label.trim();
      if (!trimmed) return s.filter((x) => x.id !== id || x.label);
      return s.map((x) => (x.id === id ? { ...x, label: trimmed } : x));
    });
  };

  const doneCount = steps.filter((s) => status[s.id] === "done").length;
  const total = Object.values(times).reduce((a, b) => a + b, 0);
  const estimate = steps.reduce((a, s) => a + (s.duration ?? 1800), 0);
  const failedIndex = steps.findIndex((s) => status[s.id] === "failed");
  const editable = phase === "review";
  const spring = reduce ? { duration: 0 } : { type: "spring" as const, stiffness: 420, damping: 34 };

  return (
    <div className={cn("w-full max-w-[440px] rounded-2xl border bg-card text-card-foreground shadow-xs/5", className)}>
      <div className="px-4 pt-4">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-medium text-sm">{title}</h3>
          <span className="text-muted-foreground text-xs tabular-nums">
            {phase === "review" && `${steps.length} steps · ~${Math.round(estimate / 1000)}s`}
            {phase === "running" && `Step ${cursor + 1} of ${steps.length} · ${secs(total)}`}
            {phase === "failed" && `Stopped at step ${failedIndex + 1}`}
            {phase === "done" && `Done in ${secs(total)}`}
          </span>
        </div>
        <p className="min-h-8 text-pretty text-muted-foreground text-xs sm:min-h-4">
          {phase === "review" && `${agent} runs these top to bottom. Edit them before you start.`}
          {phase === "running" && `${agent} is working through the plan.`}
          {phase === "failed" && `${agent} stopped. Retry from the failed step, or edit the plan.`}
          {phase === "done" && `${agent} finished every step.`}
        </p>
        <div
          aria-label="Steps done"
          aria-valuemax={steps.length}
          aria-valuemin={0}
          aria-valuenow={doneCount}
          className="mt-3 h-1 overflow-hidden rounded-full bg-muted"
          role="progressbar"
        >
          <motion.div
            animate={{ x: `${(steps.length ? doneCount / steps.length : 0) * 100 - 100}%` }}
            className={cn(
              "h-full rounded-full transition-colors duration-200",
              phase === "failed" ? "bg-destructive" : "bg-primary",
            )}
            initial={false}
            transition={spring}
          />
        </div>
      </div>

      <Reorder.Group
        as="ol"
        axis="y"
        className="relative flex flex-col p-2"
        onReorder={setSteps}
        values={steps}
      >
        {steps.length === 0 && (
          <li className="flex flex-col items-center gap-1 px-6 py-8 text-center">
            <span className="font-medium text-sm">No steps yet</span>
            <span className="text-pretty text-muted-foreground text-xs">Add a step to tell {agent} what to do first.</span>
          </li>
        )}
        <AnimatePresence initial={false}>
          {steps.map((step, index) => (
            <PlanRow
              editable={editable}
              editing={editing === step.id}
              index={index}
              isLast={index === steps.length - 1}
              key={step.id}
              ms={times[step.id]}
              onEdit={() => setEditing(step.id)}
              onMove={(by) => move(index, by)}
              onRemove={() => setSteps((s) => s.filter((x) => x.id !== step.id))}
              onRename={(label) => rename(step.id, label)}
              onRetry={() => retryFrom(index)}
              reduce={!!reduce}
              status={status[step.id] ?? "pending"}
              step={step}
            />
          ))}
        </AnimatePresence>
      </Reorder.Group>

      <div className="flex items-center justify-between gap-2 border-t px-3 py-2.5">
        {editable ? (
          <Button className={press} onClick={add} size="sm" variant="ghost">
            <PlusIcon />
            Add step
          </Button>
        ) : (
          <Button className={press} onClick={backToReview} size="sm" variant="ghost">
            {phase === "running" ? <SquareIcon /> : <PencilIcon />}
            {phase === "running" ? "Stop" : "Edit plan"}
          </Button>
        )}
        <AnimatePresence initial={false} mode="popLayout">
          {(phase === "review" || phase === "done") && (
            <motion.span
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              className="origin-right"
              exit={{ opacity: 0, scale: reduce ? 1 : 0.95, filter: "blur(2px)" }}
              initial={{ opacity: 0, scale: reduce ? 1 : 0.95, filter: "blur(2px)" }}
              key={phase}
              transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
            >
              <Button className={press} disabled={!steps.length} onClick={run} size="sm">
                {phase === "done" ? <RotateCcwIcon /> : <PlayIcon />}
                {phase === "done" ? "Run again" : "Run plan"}
              </Button>
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function PlanRow({
  step,
  index,
  isLast,
  status,
  ms,
  editable,
  editing,
  onEdit,
  onRename,
  onRemove,
  onMove,
  onRetry,
  reduce,
}: {
  step: PlanStep;
  index: number;
  isLast: boolean;
  status: StepStatus;
  ms?: number;
  editable: boolean;
  editing: boolean;
  onEdit: () => void;
  onRename: (label: string) => void;
  onRemove: () => void;
  onMove: (by: number) => void;
  onRetry: () => void;
  reduce: boolean;
}) {
  const controls = useDragControls();
  const [draft, setDraft] = useState(step.label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setDraft(step.label);
      requestAnimationFrame(() => inputRef.current?.select());
    }
  }, [editing, step.label]);

  const onHandleKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      onMove(e.key === "ArrowUp" ? -1 : 1);
    }
  };

  return (
    <Reorder.Item
      animate={{ opacity: 1, height: "auto" }}
      as="li"
      className="relative list-none rounded-lg bg-card"
      dragControls={controls}
      dragListener={false}
      exit={{ opacity: 0, height: 0 }}
      initial={{ opacity: 0, height: 0 }}
      transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 36 }}
      value={step}
      whileDrag={{ scale: 1.02, boxShadow: "0 8px 24px -12px rgb(0 0 0 / 0.25)", zIndex: 10 }}
    >
      <div className="group/row flex items-start gap-2.5 rounded-lg px-1.5 py-1.5 transition-colors duration-150 hover:bg-muted/50">
        {editable ? (
          <button
            aria-label={`Move step ${index + 1}. Drag, or press up and down arrows.`}
            className="relative mt-1 flex h-6 w-4 shrink-0 cursor-grab touch-none items-center justify-center rounded text-muted-foreground/60 outline-none transition-colors duration-150 after:absolute after:-inset-x-2 after:-inset-y-1 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
            onKeyDown={onHandleKey}
            onPointerDown={(e) => controls.start(e)}
            type="button"
          >
            <GripVerticalIcon className="size-3.5" />
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}

        <span className="relative flex flex-col items-center self-stretch">
          <StepDot index={index} reduce={reduce} status={status} />
          {!isLast && (
            <span className="relative mt-1 w-px flex-1 overflow-hidden bg-border">
              <motion.span
                animate={{ scaleY: status === "done" ? 1 : 0 }}
                className="absolute inset-0 origin-top bg-primary"
                initial={false}
                transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 200, damping: 30 }}
              />
            </span>
          )}
        </span>

        <div className="min-w-0 flex-1 pb-1.5">
          {editing ? (
            <input
              aria-label={`Step ${index + 1}`}
              className="h-7 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none ring-ring/24 focus-visible:border-ring focus-visible:ring-[3px]"
              onBlur={() => onRename(draft)}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onRename(draft);
                if (e.key === "Escape") onRename(step.label);
              }}
              placeholder="Describe the step"
              ref={inputRef}
              value={draft}
            />
          ) : editable ? (
            <button
              className="block w-full cursor-text rounded-md pt-1 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={onEdit}
              title="Click to rename"
              type="button"
            >
              {step.label}
            </button>
          ) : (
            <p
              className={cn(
                "pt-1 text-sm transition-colors",
                status === "pending" && "text-muted-foreground",
                status === "failed" && "text-destructive-foreground",
              )}
            >
              {step.label}
            </p>
          )}
          {step.tool && !editing && (
            <span className="block font-mono text-[11px] text-muted-foreground leading-5">{step.tool}</span>
          )}
          <AnimatePresence initial={false}>
            {status === "failed" && (
              <motion.div
                animate={{ opacity: 1, height: "auto" }}
                className="overflow-hidden"
                exit={{ opacity: 0, height: 0 }}
                initial={{ opacity: 0, height: 0 }}
                transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 32 }}
              >
                <div className="mt-2 rounded-lg bg-destructive/8 px-2.5 py-2 dark:bg-destructive/16">
                  <p className="font-mono text-destructive-foreground text-xs">{step.error ?? "Step failed"}</p>
                  <Button className={cn("mt-2", press)} onClick={onRetry} size="xs" variant="outline">
                    <RotateCcwIcon />
                    Retry from here
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <span className="mt-1 flex h-6 shrink-0 items-center">
          {editable ? (
            <button
              aria-label={`Remove step ${index + 1}`}
              className="relative flex size-6 cursor-pointer items-center justify-center rounded-md text-muted-foreground opacity-0 outline-none transition-[opacity,background-color,color] duration-150 after:absolute after:-inset-1 hover:bg-accent hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring group-hover/row:opacity-100 pointer-coarse:opacity-100"
              onClick={onRemove}
              type="button"
            >
              <XIcon className="size-3.5" />
            </button>
          ) : (
            ms !== undefined && (
              <span
                className={cn(
                  "font-mono text-xs tabular-nums",
                  status === "running" ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {secs(ms)}
              </span>
            )
          )}
        </span>
      </div>
    </Reorder.Item>
  );
}

function StepDot({ index, status, reduce }: { index: number; status: StepStatus; reduce: boolean }) {
  return (
    <span
      className={cn(
        "relative mt-1 flex size-6 shrink-0 items-center justify-center rounded-full border font-medium text-[11px] tabular-nums transition-colors duration-200",
        status === "pending" && "border-border bg-background text-muted-foreground",
        status === "running" && "border-info/40 bg-info/10 text-info-foreground",
        status === "done" && "border-primary bg-primary text-primary-foreground",
        status === "failed" && "border-destructive bg-destructive text-white",
      )}
    >
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          animate={{ scale: 1, opacity: 1 }}
          className="flex"
          exit={{ scale: reduce ? 1 : 0.8, opacity: 0 }}
          initial={{ scale: reduce ? 1 : 0.8, opacity: 0 }}
          key={status === "pending" ? `n${index}` : status}
          transition={{ duration: reduce ? 0.1 : 0.18, ease: [0.23, 1, 0.32, 1] }}
        >
          {status === "pending" && index + 1}
          {status === "running" && (
            <svg aria-hidden className={cn("size-3.5", !reduce && "animate-spin")} viewBox="0 0 16 16">
              <circle cx="8" cy="8" fill="none" opacity="0.25" r="6" stroke="currentColor" strokeWidth="2.5" />
              <path d="M8 2a6 6 0 0 1 6 6" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.5" />
            </svg>
          )}
          {status === "done" && <CheckIcon className="size-3.5" strokeWidth={3} />}
          {status === "failed" && <XIcon className="size-3.5" strokeWidth={3} />}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
