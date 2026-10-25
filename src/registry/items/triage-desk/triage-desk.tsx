"use client";

import { CheckIcon, RotateCcwIcon } from "lucide-react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { type KeyboardEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";

export interface TriageSegment {
  text: string;
  risk?: "high" | "medium";
  note?: string;
}

export interface TriageItem {
  id: string;
  title: string;
  agent: string;
  kind: string;
  risk: number;
  body: TriageSegment[];
}

export type TriageAction = "approve" | "edit" | "reject" | "skip";

export interface TriageDeskProps {
  items: TriageItem[];
  onResolve?: (item: TriageItem, action: Exclude<TriageAction, "skip">, text: string) => void;
  title?: string;
  className?: string;
}

const stamps: Record<TriageAction, { label: string; tone: string }> = {
  approve: { label: "Approved", tone: "border-success text-success-foreground" },
  edit: { label: "Edited", tone: "border-info text-info-foreground" },
  reject: { label: "Rejected", tone: "border-destructive text-destructive-foreground" },
  skip: { label: "Later", tone: "border-muted-foreground text-muted-foreground" },
};

const exits: Record<TriageAction, { x: number; y: number; rotate: number }> = {
  approve: { x: 28, y: -4, rotate: 2 },
  edit: { x: 28, y: -4, rotate: 2 },
  reject: { x: -28, y: -4, rotate: -2 },
  skip: { x: 0, y: -16, rotate: 0 },
};

const press = "transition-[scale,box-shadow,background-color] duration-150 ease-out active:scale-[0.97]";
const easeOut = [0.23, 1, 0.32, 1] as const;

function riskTone(risk: number) {
  if (risk >= 70) return "bg-destructive/12 text-destructive-foreground";
  if (risk >= 40) return "bg-warning/14 text-warning-foreground";
  return "bg-success/12 text-success-foreground";
}

const plain = (item: TriageItem) => item.body.map((s) => s.text).join("");

export function TriageDesk({ items, onResolve, title = "Needs review", className }: TriageDeskProps) {
  const reduce = useReducedMotion();
  const uid = useId();
  const sorted = useMemo(() => [...items].sort((a, b) => b.risk - a.risk), [items]);
  const [queue, setQueue] = useState(sorted);
  const [tally, setTally] = useState({ approved: 0, rejected: 0 });
  const [stamp, setStamp] = useState<TriageAction | null>(null);
  const [leaving, setLeaving] = useState<TriageAction>("skip");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const current = queue[0];

  const act = (action: TriageAction) => {
    if (!current || stamp) return;
    if (action === "edit" && !editing) {
      setDraft(plain(current));
      setEditing(true);
      requestAnimationFrame(() => textRef.current?.focus());
      return;
    }
    const final = editing ? "edit" : action;
    setStamp(final);
    setLeaving(final);
    timer.current = setTimeout(
      () => {
        if (final !== "skip") onResolve?.(current, final, final === "edit" ? draft : plain(current));
        setTally((t) => ({
          approved: t.approved + (final === "approve" || final === "edit" ? 1 : 0),
          rejected: t.rejected + (final === "reject" ? 1 : 0),
        }));
        setQueue((q) => (final === "skip" && q.length > 1 ? [...q.slice(1), q[0]] : q.slice(1)));
        setStamp(null);
        setEditing(false);
        rootRef.current?.focus();
      },
      reduce ? 150 : 420,
    );
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey) {
      if (editing && e.key === "Enter") {
        e.preventDefault();
        act("approve");
      }
      return;
    }
    if (editing) {
      if (e.key === "Escape") {
        e.preventDefault();
        setEditing(false);
        rootRef.current?.focus();
      }
      return;
    }
    const map: Record<string, TriageAction> = { a: "approve", e: "edit", r: "reject", s: "skip" };
    const action = map[e.key.toLowerCase()];
    if (action) {
      e.preventDefault();
      act(action);
    }
  };

  const reload = () => {
    setQueue(sorted);
    setTally({ approved: 0, rejected: 0 });
    requestAnimationFrame(() => rootRef.current?.focus());
  };

  const spring = reduce ? { duration: 0 } : { type: "spring" as const, stiffness: 380, damping: 32 };
  let n = 0;

  return (
    <div
      aria-label="Review queue. Keys: A approve, E edit, R reject, S skip."
      className={cn(
        "group/review w-full max-w-[460px] rounded-2xl border bg-card text-card-foreground shadow-xs/5 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
      onKeyDown={onKeyDown}
      ref={rootRef}
      role="region"
      tabIndex={0}
    >
      <div className="flex items-center justify-between gap-3 px-4 pt-4">
        <h3 className="font-medium text-sm">{title}</h3>
        <p className="text-muted-foreground text-xs tabular-nums">
          {queue.length} left · {tally.approved} approved · {tally.rejected} rejected
        </p>
      </div>

      <LayoutGroup id={uid}>
        <ol aria-label="Queue, highest risk first" className="flex min-h-6 flex-wrap items-center gap-1 px-4 pt-2.5">
          <AnimatePresence initial={false} mode="popLayout">
            {queue.map((item, i) => (
              <motion.li
                animate={{ opacity: 1, scale: 1 }}
                aria-current={i === 0 ? "true" : undefined}
                className={cn(
                  "flex h-6 items-center gap-1.5 rounded-full text-[11px]",
                  i === 0 ? "border bg-muted pr-2 pl-0.5 text-foreground" : "text-muted-foreground",
                )}
                exit={{ opacity: 0, scale: 0.8 }}
                initial={{ opacity: 0, scale: 0.8 }}
                key={item.id}
                layout
                title={`${item.kind} · ${item.title}`}
                transition={spring}
              >
                <motion.span
                  className={cn("rounded-full px-1.5 py-px font-medium font-mono tabular-nums", riskTone(item.risk))}
                  layout="position"
                  transition={spring}
                >
                  {item.risk}
                </motion.span>
                {i === 0 ? (
                  <motion.span className="max-w-32 truncate" layout="position" transition={spring}>
                    {item.kind}
                  </motion.span>
                ) : (
                  <span className="sr-only">{item.kind}</span>
                )}
              </motion.li>
            ))}
          </AnimatePresence>
        </ol>
      </LayoutGroup>

      <div className="relative p-2 pt-3">
        <AnimatePresence custom={leaving} initial={false} mode="popLayout">
          {current ? (
            <motion.article
              animate={{ opacity: 1, x: 0, y: 0, rotate: 0, scale: 1 }}
              className="relative overflow-hidden rounded-lg border bg-background p-4"
              custom={leaving}
              exit={
                reduce
                  ? { opacity: 0, transition: { duration: 0.12 } }
                  : {
                      opacity: 0,
                      ...exits[leaving],
                      transition: { duration: 0.2, ease: easeOut, opacity: { duration: 0.12, ease: "easeOut" } },
                    }
              }
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
              key={current.id}
              transition={reduce ? { duration: 0.12 } : { duration: 0.28, ease: easeOut }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-muted-foreground text-xs">
                    {current.kind} · by {current.agent}
                  </p>
                  <h4 className="mt-0.5 font-medium text-sm">{current.title}</h4>
                </div>
                <span className={cn("shrink-0 rounded-full px-2 py-0.5 font-medium font-mono text-xs tabular-nums", riskTone(current.risk))}>
                  risk {current.risk}
                </span>
              </div>

              {editing ? (
                <textarea
                  aria-label="Edit before approving"
                  className="mt-3 block min-h-28 w-full resize-none rounded-lg border border-input bg-card p-2.5 text-sm leading-relaxed outline-none ring-ring/24 focus-visible:border-ring focus-visible:ring-[3px]"
                  onChange={(e) => setDraft(e.target.value)}
                  ref={textRef}
                  value={draft}
                />
              ) : (
                <>
                  <p className="mt-3 text-sm leading-relaxed">
                    {current.body.map((seg, i) => {
                      if (!seg.risk) return <span key={i}>{seg.text}</span>;
                      n++;
                      return (
                        <mark
                          className={cn(
                            "rounded-[4px] px-0.5 text-foreground underline decoration-2 underline-offset-[3px]",
                            seg.risk === "high"
                              ? "bg-destructive/12 decoration-destructive/70 decoration-wavy"
                              : "bg-warning/16 decoration-warning/80",
                          )}
                          key={i}
                          title={seg.note}
                        >
                          {seg.text}
                          <sup className="ml-0.5 font-medium font-mono text-[9px] text-muted-foreground">{n}</sup>
                        </mark>
                      );
                    })}
                  </p>
                  {current.body.some((s) => s.note) && (
                    <ol className="mt-3 flex flex-col gap-1 border-t border-dashed pt-2.5 text-xs">
                      {current.body
                        .filter((s) => s.risk)
                        .map((s, i) => (
                          <li className="flex items-start gap-2 text-muted-foreground" key={i}>
                            <span
                              className={cn(
                                "mt-1.5 size-1.5 shrink-0 rounded-full",
                                s.risk === "high" ? "bg-destructive" : "bg-warning",
                              )}
                            />
                            <span>
                              <span className="font-mono text-[10px]">{i + 1}</span> {s.note}
                            </span>
                          </li>
                        ))}
                    </ol>
                  )}
                </>
              )}

              <AnimatePresence>
                {stamp && (
                  <motion.div
                    animate={{ opacity: 1, scale: 1, rotate: -10 }}
                    aria-live="assertive"
                    className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/40"
                    initial={reduce ? { opacity: 0, rotate: -10 } : { opacity: 0, scale: 1.25, rotate: -10 }}
                    transition={{ duration: reduce ? 0.1 : 0.16, ease: easeOut }}
                  >
                    <span
                      className={cn(
                        "rounded-lg border-[3px] bg-background/80 px-4 py-1.5 font-bold font-mono text-xl uppercase tracking-[0.2em]",
                        stamps[stamp].tone,
                      )}
                    >
                      {stamps[stamp].label}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.article>
          ) : (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-10 text-center"
              initial={{ opacity: 0, y: reduce ? 0 : 12 }}
              key="empty"
              transition={{ duration: 0.28, ease: easeOut }}
            >
              <span className="flex size-9 items-center justify-center rounded-full bg-success text-white">
                <CheckIcon className="size-4" strokeWidth={3} />
              </span>
              <p className="font-medium text-sm">Queue clear</p>
              <p className="text-muted-foreground text-xs">
                {tally.approved} approved, {tally.rejected} rejected.
              </p>
              <Button className={cn("mt-1", press)} onClick={reload} size="xs" variant="outline">
                <RotateCcwIcon />
                Reload queue
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {current && (
        <div className="flex items-center gap-1.5 border-t px-3 py-2.5">
          {editing ? (
            <>
              <Button
                className={cn("mr-auto", press)}
                onClick={() => {
                  setEditing(false);
                  rootRef.current?.focus();
                }}
                size="sm"
                variant="ghost"
              >
                Cancel
                <Kbd className="max-sm:hidden">Esc</Kbd>
              </Button>
              <Button className={press} onClick={() => act("approve")} size="sm">
                <CheckIcon />
                Save & approve
              </Button>
            </>
          ) : (
            <>
              <ActionButton className="mr-auto" k="S" label="Skip" onClick={() => act("skip")} variant="ghost" />
              <ActionButton k="R" label="Reject" onClick={() => act("reject")} variant="destructive-outline" />
              <ActionButton k="E" label="Edit" onClick={() => act("edit")} />
              <ActionButton k="A" label="Approve" onClick={() => act("approve")} variant="default" />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ActionButton({
  label,
  k,
  onClick,
  variant = "outline",
  className,
}: {
  label: string;
  k: string;
  onClick: () => void;
  variant?: "default" | "outline" | "destructive-outline" | "ghost";
  className?: string;
}) {
  return (
    <Button aria-keyshortcuts={k} className={cn(press, className)} onClick={onClick} size="sm" variant={variant}>
      {label}
      <Kbd
        className={cn(
          "opacity-48 transition-opacity group-focus-within/review:opacity-100 max-sm:hidden",
          variant === "default" && "bg-current/20 text-current",
        )}
      >
        {k}
      </Kbd>
    </Button>
  );
}
