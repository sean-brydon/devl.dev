"use client";

import { CheckIcon, CornerDownLeftIcon, HandIcon, MessageSquareIcon, PlayIcon, XIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type FormEvent, useEffect, useId, useReducer, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface BackseatStep {
  id: string;
  title: string;
  detail?: string;
}

export interface BackseatProps {
  steps: BackseatStep[];
  agent?: string;
  goal?: string;
  autoNote?: string;
  loop?: boolean;
  className?: string;
}

interface Item {
  id: string;
  kind: "step" | "note";
  title: string;
  detail?: string;
}

interface State {
  items: Item[];
  active: number;
  typed: number;
  hold: number;
  queue: { id: string; text: string }[];
  paused: boolean;
  finished: boolean;
  run: number;
}

type Action =
  | { type: "tick" }
  | { type: "queue"; text: string }
  | { type: "unqueue"; id: string }
  | { type: "interrupt" }
  | { type: "resume" }
  | { type: "reset"; steps: BackseatStep[] };

let noteSeq = 0;

const press = "transition-[scale,box-shadow,background-color] duration-150 ease-out active:scale-[0.97]";

function init(steps: BackseatStep[], run = 0): State {
  return {
    items: steps.map((s) => ({ id: s.id, kind: "step", title: s.title, detail: s.detail })),
    active: 0,
    typed: 0,
    hold: 0,
    queue: [],
    paused: false,
    finished: false,
    run,
  };
}

function applyQueue(state: State, at: number): Item[] {
  const notes: Item[] = state.queue.map((q) => ({ id: q.id, kind: "note", title: q.text }));
  const items = [...state.items];
  items.splice(at, 0, ...notes);
  return items;
}

function useReducedMotionAfterMount() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && !!prefers;
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "tick": {
      if (state.paused || state.finished) return state;
      const current = state.items[state.active];
      if (!current) return { ...state, finished: true };
      const length = current.detail?.length ?? 0;
      if (state.typed < length) return { ...state, typed: Math.min(length, state.typed + 1) };
      if (state.hold < 22) return { ...state, hold: state.hold + 1 };
      const items = state.queue.length ? applyQueue(state, state.active + 1) : state.items;
      let next = state.active + 1 + state.queue.length;
      while (next < items.length && items[next].kind === "note") next++;
      return {
        ...state,
        items,
        queue: [],
        active: next,
        typed: 0,
        hold: 0,
        finished: next >= items.length,
      };
    }
    case "queue":
      return { ...state, queue: [...state.queue, { id: `note-${state.run}-${++noteSeq}`, text: action.text }] };
    case "unqueue":
      return { ...state, queue: state.queue.filter((q) => q.id !== action.id) };
    case "interrupt":
      return state.finished ? state : { ...state, paused: true };
    case "resume": {
      if (!state.queue.length) return { ...state, paused: false };
      const items = applyQueue(state, state.active);
      return { ...state, items, queue: [], paused: false, active: state.active + state.queue.length, typed: 0, hold: 0 };
    }
    case "reset":
      return init(action.steps, state.run + 1);
  }
}

export function Backseat({
  steps,
  agent = "Agent",
  goal,
  autoNote,
  loop = true,
  className,
}: BackseatProps) {
  const reduce = useReducedMotionAfterMount();
  const [state, dispatch] = useReducer(reducer, steps, (s) => init(s));
  const [draft, setDraft] = useState("");
  const [focused, setFocused] = useState(false);
  const inputId = useId();
  const touched = useRef(false);
  const autoRun = useRef(-1);

  useEffect(() => {
    const id = setInterval(() => dispatch({ type: "tick" }), 40);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!state.finished || !loop) return;
    const id = setTimeout(() => dispatch({ type: "reset", steps }), 4500);
    return () => clearTimeout(id);
  }, [state.finished, loop, steps]);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const focusedRef = useRef(false);
  useEffect(() => {
    focusedRef.current = focused;
  }, [focused]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => {
    if (!autoNote || touched.current || state.active !== 1 || autoRun.current === state.run) return;
    autoRun.current = state.run;
    const gap = reduce ? 0 : 35;
    for (let i = 1; i <= autoNote.length; i++) {
      timers.current.push(
        setTimeout(() => {
          if (touched.current || focusedRef.current) return;
          setDraft(autoNote.slice(0, i));
        }, 400 + i * gap),
      );
    }
    timers.current.push(
      setTimeout(() => {
        if (touched.current || focusedRef.current) return;
        dispatch({ type: "queue", text: autoNote });
        setDraft("");
      }, 800 + autoNote.length * gap),
    );
  }, [autoNote, state.active, state.run, reduce]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    touched.current = true;
    dispatch({ type: "queue", text });
    setDraft("");
  };

  const spring = reduce ? { duration: 0 } : { type: "spring" as const, stiffness: 340, damping: 30 };
  const statusLabel = state.finished ? "Done" : state.paused ? "Interrupted" : "Working";

  return (
    <div className={cn("w-full max-w-[440px] rounded-2xl border bg-card text-card-foreground shadow-xs/5", className)}>
      <div className="flex items-center gap-3 px-4 pt-4">
        <div className="relative flex size-8 shrink-0 items-center justify-center rounded-full bg-primary font-medium text-primary-foreground text-xs">
          {agent.slice(0, 1)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 font-medium text-sm">
            {agent}
            <Badge size="sm" variant={state.finished ? "success" : state.paused ? "warning" : "info"}>
              {statusLabel}
            </Badge>
          </p>
          {goal && <p className="truncate text-muted-foreground text-xs">{goal}</p>}
        </div>
        {state.paused ? (
          <Button className={press} onClick={() => dispatch({ type: "resume" })} size="xs">
            <PlayIcon />
            {state.queue.length ? "Send & resume" : "Resume"}
          </Button>
        ) : (
          <Button
            className={press}
            disabled={state.finished}
            onClick={() => {
              touched.current = true;
              dispatch({ type: "interrupt" });
            }}
            size="xs"
            variant="destructive-outline"
          >
            <HandIcon />
            Interrupt
          </Button>
        )}
      </div>

      <div>
        <ol className="flex flex-col px-3 pt-3 pb-2">
          {state.items.map((item, i) => {
            const status = i < state.active ? "done" : i === state.active && !state.finished ? "active" : "todo";
            if (item.kind === "note") {
              return (
                <motion.li
                  animate={{ height: "auto", opacity: 1, y: 0 }}
                  className="overflow-hidden"
                  initial={{ height: 0, opacity: 0, y: reduce ? 0 : 6 }}
                  key={item.id}
                  transition={spring}
                >
                  <div className="my-0.5 ml-8 flex items-start gap-2 rounded-lg border bg-muted/64 py-1.5 pr-2.5 pl-3 text-sm">
                    <MessageSquareIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1">{item.title}</span>
                    <span className="mt-px flex shrink-0 items-center gap-1 text-muted-foreground text-xs">
                      <CheckIcon className="size-3 text-success" strokeWidth={3} />
                      Applied
                    </span>
                  </div>
                </motion.li>
              );
            }
            const shown = status === "active" ? item.detail?.slice(0, state.typed) : item.detail;
            return (
              <li className="flex items-start gap-3 px-1 py-1.5" key={item.id}>
                <StepIcon paused={state.paused} reduce={!!reduce} status={status} />
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "text-sm transition-colors duration-300",
                      status === "todo" && "text-muted-foreground",
                      status === "done" && "text-muted-foreground line-through decoration-muted-foreground/40",
                    )}
                  >
                    {item.title}
                  </p>
                  <AnimatePresence initial={false}>
                    {status === "active" && item.detail && (
                      <motion.p
                        animate={{ opacity: 1, height: "auto" }}
                        className="overflow-hidden text-muted-foreground text-xs"
                        exit={{ opacity: 0, height: 0 }}
                        initial={{ opacity: 0, height: 0 }}
                        transition={spring}
                      >
                        {shown}
                        {state.paused ? (
                          <span className="ml-1 font-medium text-warning-foreground">paused</span>
                        ) : (
                          <span className="ml-0.5 inline-block h-3 w-px translate-y-0.5 animate-pulse bg-foreground" />
                        )}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="border-t p-3">
          <AnimatePresence initial={false}>
            {state.queue.length > 0 && (
              <motion.div
                animate={{ opacity: 1, height: "auto" }}
                className="overflow-hidden"
                exit={{ opacity: 0, height: 0 }}
                initial={{ opacity: 0, height: 0 }}
                transition={spring}
              >
                <p className="pb-1.5 text-[11px] text-muted-foreground">
                  {state.paused ? "Sends when you resume" : "Joins the plan when the current step ends"}
                </p>
                <ul className="flex flex-col pb-1.5">
                  <AnimatePresence initial={false}>
                    {state.queue.map((q) => (
                      <motion.li
                        animate={{ height: "auto", opacity: 1 }}
                        className="overflow-hidden"
                        exit={{ height: 0, opacity: 0 }}
                        initial={{ height: 0, opacity: 0 }}
                        key={q.id}
                        transition={spring}
                      >
                        <div className="mb-1 flex items-center gap-2 rounded-lg border border-dashed bg-card py-1.5 pr-1.5 pl-3 text-sm">
                          <MessageSquareIcon className="size-3.5 shrink-0 text-muted-foreground" />
                          <span className="min-w-0 flex-1 truncate">{q.text}</span>
                          <button
                            aria-label="Remove note"
                            className="relative flex size-5 cursor-pointer items-center justify-center rounded-md text-muted-foreground outline-none transition-colors duration-150 after:absolute after:-inset-1.5 hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                            onClick={() => {
                              touched.current = true;
                              dispatch({ type: "unqueue", id: q.id });
                            }}
                            type="button"
                          >
                            <XIcon className="size-3" />
                          </button>
                        </div>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
          <form className="flex items-center gap-2" onSubmit={submit}>
            <label className="sr-only" htmlFor={inputId}>
              Note for {agent}
            </label>
            <input
              className="h-8 min-w-0 flex-1 rounded-lg border border-input bg-background px-2.5 text-sm outline-none ring-ring/24 placeholder:text-muted-foreground/72 focus-visible:border-ring focus-visible:ring-[3px] dark:bg-input/32"
              disabled={state.finished}
              id={inputId}
              onBlur={() => setFocused(false)}
              onChange={(e) => {
                touched.current = true;
                setDraft(e.target.value);
              }}
              onFocus={() => setFocused(true)}
              placeholder={state.finished ? "Plan finished" : `Steer ${agent}…`}
              value={draft}
            />
            <Button className={press} disabled={!draft.trim()} size="sm" type="submit" variant="outline">
              Queue
              <CornerDownLeftIcon />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

function StepIcon({ status, paused, reduce }: { status: "done" | "active" | "todo"; paused: boolean; reduce: boolean }) {
  return (
    <span className="relative mt-0.5 flex size-4 shrink-0 items-center justify-center">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          animate={{ scale: 1, opacity: 1 }}
          className="flex"
          exit={{ scale: reduce ? 1 : 0.8, opacity: 0 }}
          initial={{ scale: reduce ? 1 : 0.8, opacity: 0 }}
          key={status === "active" && paused ? "paused" : status}
          transition={{ duration: reduce ? 0.1 : 0.18, ease: [0.23, 1, 0.32, 1] }}
        >
          {status === "done" && (
            <span className="flex size-4 items-center justify-center rounded-full bg-success text-white">
              <CheckIcon className="size-2.5" strokeWidth={3.5} />
            </span>
          )}
          {status === "active" && paused && <span className="size-3 rounded-sm bg-warning" />}
          {status === "active" && !paused && (
            <svg aria-hidden className={cn("size-4 text-info", !reduce && "animate-spin")} viewBox="0 0 16 16">
              <circle cx="8" cy="8" fill="none" opacity="0.2" r="6" stroke="currentColor" strokeWidth="2" />
              <path d="M8 2a6 6 0 0 1 6 6" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
            </svg>
          )}
          {status === "todo" && <span className="size-3 rounded-full border-[1.5px] border-muted-foreground/40" />}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
