"use client";

import { ArrowRightIcon, CheckIcon, PlaneTakeoffIcon } from "lucide-react";
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from "motion/react";
import { type CSSProperties, Fragment, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type DepartureStatus = "boarding" | "running" | "delayed" | "landed" | "needs-you";

export interface Departure {
  id: string;
  agent: string;
  task: string;
  gate: string;
  eta: string;
  status: DepartureStatus;
  remark?: string;
  connectingTo?: string;
  question?: string;
}

export interface DeparturesProps {
  departures: Departure[];
  title?: string;
  time?: string;
  onApprove?: (id: string) => void;
  className?: string;
}

const statusMeta: Record<DepartureStatus, { label: string; text: string }> = {
  boarding: { label: "Boarding", text: "text-info-foreground" },
  running: { label: "Running", text: "text-success-foreground" },
  delayed: { label: "Delayed", text: "text-destructive-foreground" },
  landed: { label: "Landed", text: "text-muted-foreground" },
  "needs-you": { label: "Needs you", text: "text-warning-foreground" },
};

const DRUM = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:.-#/";
const FLIP_MS = 62;
const RIPPLE_MS = 12;
const MAX_TURNS = 4;

const W = { eta: 5, agent: 6, task: 14, gate: 5, status: 9 } as const;
const START = { status: 0, eta: 1, agent: 3, task: 5, gate: 9 } as const;

function route(from: string, to: string) {
  const a = DRUM.indexOf(from);
  const b = DRUM.indexOf(to);
  if (from === to) return [];
  if (a < 0 || b < 0) return [to];
  const n = Math.min((b - a + DRUM.length) % DRUM.length, MAX_TURNS);
  return Array.from({ length: n }, (_, i) => DRUM[(b - n + 1 + i + DRUM.length) % DRUM.length]);
}

function Half({ c, top, tone }: { c: string; top?: boolean; tone?: string }) {
  return (
    <span className={cn("absolute inset-x-0 h-1/2 overflow-hidden bg-(--flap)", top ? "top-0 rounded-t-[3px]" : "bottom-0 rounded-b-[3px]", tone)}>
      <span className={cn("absolute inset-x-0 h-[18px] text-center leading-[18px]", top ? "top-0" : "bottom-0")}>{c === " " ? "\u00a0" : c}</span>
    </span>
  );
}

function Flap({ char, tone, delay }: { char: string; tone: string; delay: number }) {
  const reduce = useReducedMotion();
  const [s, setS] = useState({ cur: char, prev: char, tone, prevTone: tone, n: 0 });
  const cur = useRef({ char, tone });

  useEffect(() => {
    const seq = reduce ? [] : route(cur.current.char, char);
    if (!seq.length) {
      cur.current = { char, tone };
      setS((p) => (p.cur === char && p.tone === tone ? p : { cur: char, prev: char, tone, prevTone: tone, n: p.n }));
      return;
    }
    let i = 0;
    let t = 0;
    const flip = () => {
      const prev = cur.current;
      const next = { char: seq[i++], tone };
      cur.current = next;
      setS((p) => ({ cur: next.char, prev: prev.char, tone, prevTone: prev.tone, n: p.n + 1 }));
      if (i < seq.length) t = window.setTimeout(flip, FLIP_MS);
    };
    t = window.setTimeout(flip, delay);
    return () => window.clearTimeout(t);
  }, [char, tone, delay, reduce]);

  return (
    <span aria-hidden className="relative h-[18px] w-3 shrink-0 [perspective:80px]">
      <Half c={s.cur} tone={s.tone} top />
      <Half c={s.n ? s.prev : s.cur} tone={s.n ? s.prevTone : s.tone} />
      {s.n > 0 && !reduce && (
        <Fragment key={s.n}>
          <motion.span animate={{ rotateX: -90 }} className="absolute inset-0" initial={{ rotateX: 0 }} transition={{ duration: 0.055, ease: [0.55, 0, 1, 0.45] }}>
            <Half c={s.prev} tone={s.prevTone} top />
            <motion.span animate={{ opacity: 0.28 }} className="absolute inset-x-0 top-0 h-1/2 rounded-t-[3px] bg-black" initial={{ opacity: 0 }} transition={{ duration: 0.055, ease: "easeIn" }} />
          </motion.span>
          <motion.span animate={{ rotateX: 0 }} className="absolute inset-0" initial={{ rotateX: 90 }} transition={{ delay: 0.05, duration: 0.11, ease: [0.3, 1.45, 0.55, 1] }}>
            <Half c={s.cur} tone={s.tone} />
            <motion.span animate={{ opacity: 0 }} className="absolute inset-x-0 bottom-0 h-1/2 rounded-b-[3px] bg-black" initial={{ opacity: 0.22 }} transition={{ delay: 0.05, duration: 0.11, ease: "easeOut" }} />
          </motion.span>
        </Fragment>
      )}
      <span className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-card/80" />
    </span>
  );
}

function Word({ text, size, start, tone, className }: { text: string; size: number; start: number; tone: string; className?: string }) {
  const chars = text.toUpperCase().padEnd(size).slice(0, size).split("");
  return (
    <span className={cn("flex gap-px", className)}>
      {chars.map((c, i) => (
        <Flap char={c} delay={(start + i) * RIPPLE_MS} key={i} tone={tone} />
      ))}
    </span>
  );
}

const ease = [0.23, 1, 0.32, 1] as const;
const rowGrid =
  "grid grid-cols-[auto_1fr_auto] gap-x-3 [grid-template-areas:'eta_agent_status'_'task_task_gate'_'rm_rm_rm'] @min-[560px]:grid-cols-[auto_auto_1fr_auto_auto] @min-[560px]:[grid-template-areas:'eta_agent_task_gate_status'_'._rm_rm_rm_rm']";

function Remark({ d, onApprove }: { d: Departure; onApprove?: (id: string) => void }) {
  const key = d.status === "needs-you" ? `q:${d.question}` : d.connectingTo ? `c:${d.connectingTo}:${d.remark}` : `r:${d.remark}`;
  return (
    <div className="flex min-h-7 items-center gap-2 font-normal font-sans text-muted-foreground text-xs [grid-area:rm]">
      <AnimatePresence initial={false} mode="wait">
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="flex min-w-0 flex-1 items-center gap-1.5"
          exit={{ opacity: 0, y: -2, transition: { duration: 0.09, ease: "easeOut" } }}
          initial={{ opacity: 0, y: 3 }}
          key={key}
          transition={{ duration: 0.2, ease }}
        >
          {d.status === "needs-you" ? (
            <span className="truncate font-medium text-foreground">{d.question}</span>
          ) : d.connectingTo ? (
            <>
              <ArrowRightIcon aria-hidden className="size-3.5 shrink-0 text-info-foreground" />
              <span className="truncate">
                Connecting to <span className="font-medium text-foreground">{d.connectingTo}</span>
                {d.remark && <span> · {d.remark}</span>}
              </span>
            </>
          ) : (
            <span className="truncate">{d.remark}</span>
          )}
        </motion.div>
      </AnimatePresence>
      <AnimatePresence initial={false}>
        {d.status === "needs-you" && onApprove && (
          <motion.div
            animate={{ opacity: 1, scale: 1 }}
            className="shrink-0"
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.12 } }}
            initial={{ opacity: 0, scale: 0.95 }}
            style={{ transformOrigin: "right center" }}
            transition={{ duration: 0.18, ease }}
          >
            <Button aria-label={`Approve ${d.agent}: ${d.question ?? d.task}`} className="transition-[scale,box-shadow] duration-150 ease-out active:scale-[0.97]" onClick={() => onApprove(d.id)} size="xs">
              <CheckIcon />
              Approve
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Departures({ departures, title = "Departures", time, onApprove, className }: DeparturesProps) {
  const counts = { flying: 0, waiting: 0 };
  for (const d of departures) {
    if (d.status === "running" || d.status === "boarding" || d.status === "delayed") counts.flying++;
    if (d.status === "needs-you") counts.waiting++;
  }

  return (
    <MotionConfig reducedMotion="user">
      <section
        aria-label={title}
        className={cn("@container w-full max-w-150 rounded-2xl border bg-card text-card-foreground shadow-xs/5", className)}
        style={{ "--flap": "color-mix(in srgb, var(--color-card) 92%, var(--color-foreground))" } as CSSProperties}
      >
        <header className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <div className="min-w-0">
            <h3 className="flex items-center gap-2 font-medium text-sm">
              <PlaneTakeoffIcon aria-hidden className="size-4 text-muted-foreground" />
              <span className="truncate">{title}</span>
            </h3>
            <p className="mt-0.5 text-muted-foreground text-xs tabular-nums">
              {counts.flying} in the air
              {counts.waiting > 0 && (
                <>
                  {" · "}
                  <span className="text-warning-foreground">{counts.waiting} waiting on you</span>
                </>
              )}
            </p>
          </div>
          {time && (
            <div className="flex items-center gap-2">
              <span className="sr-only">Time {time}</span>
              <Word className="font-medium font-mono text-[13px]" size={5} start={0} text={time} tone="text-foreground" />
            </div>
          )}
        </header>

        {departures.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <div className="font-medium text-sm">No departures</div>
            <div className="mt-1 text-muted-foreground text-xs">When an agent picks up work it shows up here.</div>
          </div>
        ) : (
          <div className="px-2 pt-2 pb-2">
            <div aria-hidden className={cn(rowGrid, "hidden px-2 pb-1 font-medium text-[10px] text-muted-foreground uppercase tracking-wider @min-[560px]:grid")}>
              <span className="[grid-area:eta]">Eta</span>
              <span className="[grid-area:agent]">Agent</span>
              <span className="[grid-area:task]">Task</span>
              <span className="[grid-area:gate]">Gate</span>
              <span className="[grid-area:status]">Status</span>
            </div>
            <ol className="flex flex-col gap-0.5">
              {departures.map((d) => {
                const m = statusMeta[d.status];
                const ink = d.status === "landed" ? "text-muted-foreground" : "text-foreground";
                return (
                  <li
                    className={cn(
                      rowGrid,
                      "gap-y-1.5 rounded-xl px-2 pt-2 pb-0.5 font-medium font-mono text-[12px] transition-colors duration-300 ease-out",
                      d.status === "needs-you" ? "bg-warning/8 dark:bg-warning/10" : "bg-transparent",
                    )}
                    key={d.id}
                  >
                    <span className="sr-only">
                      {d.agent}, {d.task}, via {d.gate}, {d.status === "landed" ? "landed" : "due"} {d.eta}, {m.label}.
                    </span>
                    <Word className="[grid-area:eta]" size={W.eta} tone={ink} start={START.eta} text={d.eta} />
                    <Word className="[grid-area:agent]" size={W.agent} tone={ink} start={START.agent} text={d.agent} />
                    <Word className="[grid-area:task]" size={W.task} tone={ink} start={START.task} text={d.task} />
                    <Word className="justify-self-end [grid-area:gate] @min-[560px]:justify-self-start" size={W.gate} tone="text-muted-foreground" start={START.gate} text={d.gate} />
                    <Word className="justify-self-end [grid-area:status]" size={W.status} tone={m.text} start={START.status} text={m.label} />
                    <Remark d={d} onApprove={onApprove} />
                  </li>
                );
              })}
            </ol>
          </div>
        )}
      </section>
    </MotionConfig>
  );
}
