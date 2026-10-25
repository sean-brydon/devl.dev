"use client";

import { ChevronDownIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useId, useState } from "react";
import { cn } from "@/lib/utils";

export interface LaunchTask {
  id: string;
  label: string;
  hint?: string;
  done?: boolean;
}

export interface LaunchGroup {
  id: string;
  title: string;
  tasks: LaunchTask[];
}

export interface LaunchListProps {
  title?: string;
  description?: string;
  groups: LaunchGroup[];
  defaultOpen?: string[];
  onToggleTask?: (taskId: string, done: boolean) => void;
  className?: string;
}

const spring = { type: "spring", stiffness: 380, damping: 32 } as const;

function Ring({ value, total }: { value: number; total: number }) {
  const reduce = useReducedMotion();
  const r = 15;
  const c = 2 * Math.PI * r;
  const pct = total ? value / total : 0;
  return (
    <div className="relative size-11 shrink-0">
      <svg aria-hidden className="-rotate-90 size-full" viewBox="0 0 36 36">
        <circle className="stroke-muted" cx="18" cy="18" fill="none" r={r} strokeWidth="3.5" />
        <motion.circle
          animate={{ strokeDashoffset: c * (1 - pct) }}
          className={pct === 1 ? "stroke-success" : "stroke-primary"}
          cx="18"
          cy="18"
          fill="none"
          initial={false}
          r={r}
          strokeDasharray={c}
          strokeLinecap="round"
          strokeWidth="3.5"
          transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 120, damping: 20 }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-medium text-[11px] tabular-nums">
        {Math.round(pct * 100)}%
      </span>
    </div>
  );
}

function TaskCheck({ done }: { done: boolean }) {
  const reduce = useReducedMotion();
  return (
    <motion.span
      animate={done && !reduce ? { scale: [1, 1.12, 1] } : { scale: 1 }}
      className={cn(
        "flex size-[18px] shrink-0 items-center justify-center rounded-full border-[1.5px] transition-[background-color,border-color,scale] duration-150 ease-out group-active/task:scale-90",
        done ? "border-success bg-success text-white" : "border-muted-foreground/40 bg-background group-hover/task:border-foreground/50",
      )}
      transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
    >
      <svg aria-hidden className="size-3" fill="none" viewBox="0 0 16 16">
        <motion.path
          animate={{ pathLength: done ? 1 : 0, opacity: done ? 1 : 0 }}
          d="M3.5 8.5l3 3 6-7"
          initial={false}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2.4}
          transition={reduce ? { duration: 0 } : { duration: 0.28, delay: done ? 0.08 : 0, ease: "easeOut" }}
        />
      </svg>
    </motion.span>
  );
}

export function LaunchList({
  title = "Get set up",
  description,
  groups: initial,
  defaultOpen,
  onToggleTask,
  className,
}: LaunchListProps) {
  const reduce = useReducedMotion();
  const baseId = useId();
  const [groups, setGroups] = useState(initial);
  const [open, setOpen] = useState<string[]>(
    () => defaultOpen ?? [initial.find((g) => g.tasks.some((t) => !t.done))?.id ?? initial[0]?.id].filter(Boolean),
  );

  const all = groups.flatMap((g) => g.tasks);
  const done = all.filter((t) => t.done).length;

  const toggle = (taskId: string) => {
    const next = !all.find((t) => t.id === taskId)?.done;
    setGroups((gs) =>
      gs.map((g) => ({ ...g, tasks: g.tasks.map((t) => (t.id === taskId ? { ...t, done: next } : t)) })),
    );
    onToggleTask?.(taskId, next);
  };

  return (
    <section
      aria-label={title}
      className={cn("w-full max-w-[400px] overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-xs/5", className)}
    >
      <header className="flex items-center gap-3 border-b p-4">
        <Ring total={all.length} value={done} />
        <div className="min-w-0 flex-1">
          <h2 className="font-medium text-sm">{title}</h2>
          <p className="text-muted-foreground text-xs">
            {description ?? (
              <>
                <span className="tabular-nums">
                  {done} of {all.length}
                </span>{" "}
                done{done === all.length ? " – nice work" : ""}
              </>
            )}
          </p>
        </div>
      </header>
      <div className="divide-y">
        {groups.map((g) => {
          const isOpen = open.includes(g.id);
          const gDone = g.tasks.filter((t) => t.done).length;
          const complete = gDone === g.tasks.length;
          const panelId = `${baseId}-${g.id}`;
          return (
            <div key={g.id}>
              <button
                aria-controls={panelId}
                aria-expanded={isOpen}
                className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left outline-none transition-colors hover:bg-accent/50 focus-visible:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                onClick={() => setOpen((o) => (o.includes(g.id) ? o.filter((x) => x !== g.id) : [...o, g.id]))}
                type="button"
              >
                <span className="flex-1 font-medium text-sm">{g.title}</span>
                <span
                  className={cn(
                    "rounded-full px-1.5 py-px font-medium text-[11px] tabular-nums transition-colors",
                    complete ? "bg-success/12 text-success-foreground" : "bg-muted text-muted-foreground",
                  )}
                >
                  {gDone}/{g.tasks.length}
                </span>
                <motion.span
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  className="text-muted-foreground"
                  transition={reduce ? { duration: 0 } : spring}
                >
                  <ChevronDownIcon className="size-4" />
                </motion.span>
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    animate={{ height: "auto", opacity: 1 }}
                    className="overflow-hidden"
                    exit={{ height: 0, opacity: 0 }}
                    id={panelId}
                    initial={{ height: 0, opacity: 0 }}
                    transition={reduce ? { duration: 0 } : { ...spring, opacity: { duration: 0.18 } }}
                  >
                    <ul className="space-y-0.5 px-2 pb-2">
                      {g.tasks.map((t) => (
                        <li key={t.id}>
                          <button
                            aria-pressed={!!t.done}
                            className="group/task flex w-full cursor-pointer items-start gap-3 rounded-lg px-2 py-2 text-left outline-none transition-colors hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring"
                            onClick={() => toggle(t.id)}
                            type="button"
                          >
                            <span className="flex h-5 items-center">
                              <TaskCheck done={!!t.done} />
                            </span>
                            <span className="min-w-0 flex-1 text-sm leading-5">
                              <span className="relative inline-block text-sm leading-5">
                                <span
                                  className={cn(
                                    "transition-colors duration-300",
                                    t.done ? "text-muted-foreground" : "text-foreground",
                                  )}
                                >
                                  {t.label}
                                </span>
                                <motion.span
                                  animate={{ scaleX: t.done ? 1 : 0 }}
                                  aria-hidden
                                  className="absolute top-1/2 right-0 left-0 h-px origin-left bg-muted-foreground"
                                  initial={false}
                                  transition={
                                    reduce ? { duration: 0 } : { duration: 0.3, delay: t.done ? 0.15 : 0, ease: "easeOut" }
                                  }
                                />
                              </span>
                              {t.hint && <span className="block text-muted-foreground text-xs">{t.hint}</span>}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </section>
  );
}
