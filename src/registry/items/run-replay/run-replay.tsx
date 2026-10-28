"use client";

import {
  AnimatePresence,
  MotionConfig,
  motion,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import {
  BanIcon,
  BotIcon,
  BracesIcon,
  CheckIcon,
  ChevronDownIcon,
  CopyIcon,
  DatabaseIcon,
  EllipsisIcon,
  FileTextIcon,
  HandIcon,
  LinkIcon,
  ListChecksIcon,
  type LucideIcon,
  MinusIcon,
  PauseIcon,
  PlayIcon,
  RotateCcwIcon,
  SearchIcon,
  SendIcon,
  ShieldAlertIcon,
  SparklesIcon,
  SquareTerminalIcon,
  TriangleAlertIcon,
  XIcon,
} from "lucide-react";
import { useEffect, useId, useMemo, useReducer, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Menu, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTab } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export type RunToolKind = "db" | "search" | "code" | "doc" | "send" | "task";

export interface RunToolCall {
  name: string;
  kind: RunToolKind;
  args: Record<string, string | number | boolean>;
  result: string;
  ms: number;
  tokens: number;
  failsOnce?: string;
}

export interface RunStep {
  title: string;
  tools?: RunToolCall[];
  thought?: string;
  reveal?: "accounts" | "email";
  approval?: { title: string; description: string; tool: RunToolCall };
  fail?: string;
}

export interface RunAccount {
  company: string;
  contact: string;
  email: string;
  score: number;
  arr: string;
}

export interface RunEmail {
  to: string;
  subject: string;
  highlights: string[];
  body: string;
}

export interface RunReplayProps {
  agentName?: string;
  runId?: string;
  task?: string;
  model?: string;
  steps?: RunStep[];
  accounts?: RunAccount[];
  email?: RunEmail;
  autoApproveAfter?: number;
  speed?: number;
  className?: string;
}

type StepStatus = "pending" | "running" | "done" | "waiting" | "skipped" | "failed";

type LogEntry =
  | {
      kind: "tool";
      id: string;
      step: number;
      call: RunToolCall;
      status: "running" | "done" | "denied" | "failed";
      result?: string;
      retry?: boolean;
      at: number;
      end?: number;
    }
  | { kind: "thought"; id: string; step: number; text: string; at: number }
  | { kind: "approval"; id: string; step: number; status: "waiting" | "approved" | "denied"; count: number; at: number };

type Ev =
  | { k: "step"; i: number; s: StepStatus; d: number }
  | { k: "tool"; id: string; step: number; call: RunToolCall; d: number; retry?: boolean }
  | { k: "toolDone"; id: string; d: number }
  | { k: "toolFail"; id: string; message: string; d: number }
  | { k: "halt"; id: string; step: number; message: string; d: number }
  | { k: "denied"; id: string; step: number; call: RunToolCall; d: number }
  | { k: "thought"; id: string; step: number; text: string; d: number }
  | { k: "row"; d: number }
  | { k: "words"; n: number; d: number }
  | { k: "approval"; id: string; step: number; d: number }
  | { k: "finish"; d: number };

interface RunState {
  cursor: number;
  steps: StepStatus[];
  log: LogEntry[];
  tokens: number;
  rows: number;
  words: number;
  awaiting: { id: string; step: number } | null;
  finished: boolean;
  cancelled: boolean;
  decision: { approve: boolean; count: number } | null;
  failure: { id: string; step: number; message: string } | null;
  retried: boolean;
}

type Action =
  | { type: "ev"; ev: Ev; at: number }
  | { type: "decide"; approve: boolean; count: number }
  | { type: "cancel" }
  | { type: "retry" }
  | { type: "reset"; steps: number };

const easeOut = [0.23, 1, 0.32, 1] as const;
const spring = { type: "spring", duration: 0.3, bounce: 0 } as const;
const enter = { duration: 0.2, ease: easeOut } as const;
const press = "transition-[transform,box-shadow,background-color] duration-150 ease-out active:scale-[0.97]";

const toolMeta: Record<RunToolKind, { icon: LucideIcon; text: string; bar: string }> = {
  db: { icon: DatabaseIcon, text: "text-teal-600 dark:text-teal-400", bar: "bg-teal-500" },
  search: { icon: SearchIcon, text: "text-info-foreground", bar: "bg-info" },
  code: { icon: SquareTerminalIcon, text: "text-amber-600 dark:text-amber-400", bar: "bg-amber-500" },
  doc: { icon: FileTextIcon, text: "text-orange-600 dark:text-orange-400", bar: "bg-orange-500" },
  send: { icon: SendIcon, text: "text-violet-600 dark:text-violet-400", bar: "bg-violet-500" },
  task: { icon: ListChecksIcon, text: "text-success-foreground", bar: "bg-success" },
};

const defaultAccounts: RunAccount[] = [
  { company: "Halcyon Freight", contact: "Ines Duarte", email: "ines@halcyon.example", score: 0.86, arr: "$84k" },
  { company: "Brightwater Labs", contact: "Theo Marsh", email: "theo@brightwater.example", score: 0.81, arr: "$62k" },
  { company: "Copperline", contact: "Ana Petrov", email: "ana@copperline.example", score: 0.77, arr: "$45k" },
  { company: "Northgate Health", contact: "Sam Okoro", email: "sam@northgate.example", score: 0.72, arr: "$120k" },
  { company: "Juniper & Vale", contact: "Lena Fischer", email: "lena@junipervale.example", score: 0.69, arr: "$38k" },
  { company: "Orbit Supply", contact: "Kai Tanaka", email: "kai@orbitsupply.example", score: 0.67, arr: "$29k" },
  { company: "Mosswood", contact: "Priya Nair", email: "priya@mosswood.example", score: 0.65, arr: "$51k" },
  { company: "Tidewell", contact: "Owen Price", email: "owen@tidewell.example", score: 0.64, arr: "$33k" },
  { company: "Larkspur Media", contact: "Rosa Lind", email: "rosa@larkspur.example", score: 0.63, arr: "$26k" },
  { company: "Fieldnote", contact: "Ben Adler", email: "ben@fieldnote.example", score: 0.62, arr: "$41k" },
  { company: "Cinder Robotics", contact: "Mei Chen", email: "mei@cinder.example", score: 0.61, arr: "$97k" },
  { company: "Paloma Travel", contact: "Luis Ortega", email: "luis@paloma.example", score: 0.6, arr: "$22k" },
];

const defaultSteps: RunStep[] = [
  {
    title: "Pull renewals due in 90 days",
    tools: [
      {
        name: "crm.search_accounts",
        kind: "db",
        args: { renews_within: "90d", segment: "mid-market" },
        result: "41 accounts",
        ms: 1100,
        tokens: 820,
      },
    ],
    thought: "41 is too many to personalise well. Narrowing with support signals first.",
  },
  {
    title: "Read recent support threads",
    tools: [
      { name: "helpdesk.list_threads", kind: "search", args: { accounts: 41, since: "30d" }, result: "128 threads", ms: 1300, tokens: 2400 },
      {
        name: "helpdesk.sentiment",
        kind: "search",
        args: { threads: 128 },
        result: "19 accounts trending negative",
        ms: 1100,
        tokens: 1900,
        failsOnce: "429 Too Many Requests · retrying in 2s",
      },
    ],
  },
  {
    title: "Score churn risk",
    tools: [
      { name: "python.run", kind: "code", args: { script: "score_churn.py", accounts: 19 }, result: "12 accounts ≥ 0.60", ms: 1500, tokens: 1300 },
    ],
    reveal: "accounts",
    thought: "Halcyon and Brightwater both raised the September double charge. Leading with the billing fix.",
  },
  {
    title: "Draft personalised outreach",
    tools: [
      { name: "docs.create_draft", kind: "doc", args: { template: "renewal-check-in", accounts: 12 }, result: "12 drafts", ms: 900, tokens: 3100 },
    ],
    reveal: "email",
  },
  {
    title: "Send emails via Postbox",
    approval: {
      title: "Send renewal emails?",
      description: "Renewal Scout wants to send from maya@relay.example. Untick anyone you'd rather call.",
      tool: { name: "postbox.send_batch", kind: "send", args: { from: "maya@relay.example", template: "renewal-check-in" }, result: "{n} sent · 0 bounced", ms: 1400, tokens: 400 },
    },
  },
  {
    title: "Log follow-ups in CRM",
    tools: [
      { name: "crm.create_tasks", kind: "task", args: { owner: "maya", due: "+3d" }, result: "Follow-ups due Friday", ms: 900, tokens: 600 },
    ],
  },
];

const defaultEmail: RunEmail = {
  to: "Ines Duarte <ines@halcyon.example>",
  subject: "Your September invoice, and your renewal",
  highlights: ["Sep double charge", "Renews Nov 14", "Route planning ask"],
  body: "Hi Ines,\n\nThanks for flagging the double charge on your September invoice. You were right, and the fix ships with the October billing run. I've credited the difference to your account, so there's nothing more to do on your side.\n\nBefore your renewal on November 14, I'd love 20 minutes to walk through the new route-planning limits your dispatch team asked about. Would Tuesday or Thursday afternoon work?\n\nBest,\nMaya",
};

function buildEvents(
  steps: RunStep[],
  rows: number,
  words: number,
  decision: RunState["decision"],
  retried: boolean,
): Ev[] {
  const ev: Ev[] = [];
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    ev.push({ k: "step", i, s: "running", d: i === 0 ? 700 : 450 });
    const tools = step.tools ?? [];
    for (let j = 0; j < tools.length; j++) {
      const call = tools[j];
      const id = `${i}-${j}`;
      ev.push({ k: "tool", id, step: i, call, d: 380 });
      if (call.failsOnce) {
        ev.push({ k: "toolFail", id, message: call.failsOnce, d: Math.round(call.ms * 0.6) });
        ev.push({ k: "tool", id: `${id}-r`, step: i, call, d: 2000, retry: true });
        ev.push({ k: "toolDone", id: `${id}-r`, d: call.ms });
      } else if (step.fail && j === tools.length - 1) {
        ev.push({ k: "halt", id, step: i, message: step.fail, d: Math.round(call.ms * 0.8) });
        if (!retried) return ev;
        ev.push({ k: "tool", id: `${id}-r`, step: i, call, d: 450, retry: true });
        ev.push({ k: "toolDone", id: `${id}-r`, d: call.ms });
      } else {
        ev.push({ k: "toolDone", id, d: call.ms });
      }
    }
    if (step.reveal === "accounts") for (let r = 0; r < rows; r++) ev.push({ k: "row", d: r === 0 ? 300 : 140 });
    if (step.reveal === "email") for (let w = 0; w < words; w += 3) ev.push({ k: "words", n: 3, d: w === 0 ? 400 : 55 });
    if (step.thought) ev.push({ k: "thought", id: `t-${i}`, step: i, text: step.thought, d: 650 });
    if (step.approval) {
      ev.push({ k: "approval", id: `ap-${i}`, step: i, d: 600 });
      if (!decision) return ev;
      const id = `${i}-send`;
      if (decision.approve) {
        const call = { ...step.approval.tool, result: step.approval.tool.result.replace("{n}", String(decision.count)) };
        ev.push({ k: "tool", id, step: i, call, d: 350 });
        ev.push({ k: "toolDone", id, d: call.ms });
      } else {
        ev.push({ k: "denied", id, step: i, call: step.approval.tool, d: 300 });
      }
      ev.push({ k: "step", i, s: decision.approve ? "done" : "skipped", d: 350 });
      continue;
    }
    ev.push({ k: "step", i, s: "done", d: 350 });
  }
  ev.push({ k: "finish", d: 500 });
  return ev;
}

function initState(steps: number): RunState {
  return {
    cursor: 0,
    steps: Array.from({ length: steps }, () => "pending" as StepStatus),
    log: [],
    tokens: 0,
    rows: 0,
    words: 0,
    awaiting: null,
    finished: false,
    cancelled: false,
    decision: null,
    failure: null,
    retried: false,
  };
}

function reducer(state: RunState, action: Action): RunState {
  if (action.type === "reset") return initState(action.steps);
  if (action.type === "cancel") {
    return {
      ...state,
      finished: true,
      cancelled: true,
      awaiting: null,
      failure: null,
      steps: state.steps.map((s) => (s === "running" || s === "waiting" || s === "failed" ? "skipped" : s)),
      log: state.log.map((e) =>
        e.kind === "tool" && e.status === "running"
          ? { ...e, status: "denied", result: "Cancelled" }
          : e.kind === "approval" && e.status === "waiting"
            ? { ...e, status: "denied" }
            : e,
      ),
    };
  }
  if (action.type === "retry") {
    const f = state.failure;
    if (!f) return state;
    return {
      ...state,
      failure: null,
      retried: true,
      steps: state.steps.map((s, i) => (i === f.step ? "running" : s)),
    };
  }
  if (action.type === "decide") {
    const aw = state.awaiting;
    if (!aw) return state;
    return {
      ...state,
      awaiting: null,
      decision: { approve: action.approve, count: action.count },
      steps: state.steps.map((s, i) => (i === aw.step ? "running" : s)),
      log: state.log.map((e) =>
        e.kind === "approval" && e.id === aw.id ? { ...e, status: action.approve ? "approved" : "denied", count: action.count } : e,
      ),
    };
  }
  const ev = action.ev;
  const at = action.at;
  const next = { ...state, cursor: state.cursor + 1 };
  switch (ev.k) {
    case "step":
      next.steps = state.steps.map((s, i) => (i === ev.i ? ev.s : s));
      break;
    case "tool":
      next.log = [...state.log, { kind: "tool", id: ev.id, step: ev.step, call: ev.call, status: "running", retry: ev.retry, at }];
      break;
    case "toolFail":
      next.log = state.log.map((e) => (e.kind === "tool" && e.id === ev.id ? { ...e, status: "failed", result: ev.message, end: at } : e));
      break;
    case "halt":
      next.log = state.log.map((e) => (e.kind === "tool" && e.id === ev.id ? { ...e, status: "failed", result: ev.message, end: at } : e));
      next.failure = { id: ev.id, step: ev.step, message: ev.message };
      next.steps = state.steps.map((s, i) => (i === ev.step ? "failed" : s));
      break;
    case "toolDone": {
      const entry = state.log.find((e) => e.id === ev.id);
      next.log = state.log.map((e) => (e.kind === "tool" && e.id === ev.id ? { ...e, status: "done", result: e.call.result, end: at } : e));
      next.tokens = state.tokens + (entry?.kind === "tool" ? entry.call.tokens : 0);
      break;
    }
    case "denied":
      next.log = [...state.log, { kind: "tool", id: ev.id, step: ev.step, call: ev.call, status: "denied", result: "Denied by reviewer", at, end: at }];
      break;
    case "thought":
      next.log = [...state.log, { kind: "thought", id: ev.id, step: ev.step, text: ev.text, at }];
      next.tokens = state.tokens + 180;
      break;
    case "row":
      next.rows = state.rows + 1;
      break;
    case "words":
      next.words = state.words + ev.n;
      next.tokens = state.tokens + 14;
      break;
    case "approval":
      next.awaiting = { id: ev.id, step: ev.step };
      next.steps = state.steps.map((s, i) => (i === ev.step ? "waiting" : s));
      next.log = [...state.log, { kind: "approval", id: ev.id, step: ev.step, status: "waiting", count: 0, at }];
      break;
    case "finish":
      next.finished = true;
      break;
  }
  return next;
}

type Tone = "info" | "warning" | "success" | "muted" | "destructive";
const toneBg: Record<Tone, string> = {
  destructive: "bg-destructive",
  info: "bg-info",
  warning: "bg-warning",
  success: "bg-success",
  muted: "bg-muted-foreground",
};

function LiveDot({ tone, live }: { tone: Tone; live: boolean }) {
  return (
    <span aria-hidden className="relative inline-flex size-4 shrink-0 items-center justify-center">
      {live && (
        <motion.span
          animate={{ scale: [1, 2.2], opacity: [0.45, 0] }}
          className={cn("absolute size-2 rounded-full", toneBg[tone])}
          key={tone}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
        />
      )}
      <span className={cn("relative size-2 rounded-full transition-colors duration-300", toneBg[tone])} />
    </span>
  );
}

function Rolling({ value, format }: { value: number; format: (n: number) => string }) {
  const reduce = useReducedMotion();
  const mv = useSpring(value, { stiffness: 120, damping: 22 });
  useEffect(() => {
    if (reduce) mv.jump(value);
    else mv.set(value);
  }, [value, reduce, mv]);
  const text = useTransform(mv, format);
  return <motion.span className="tabular-nums">{text}</motion.span>;
}

const nodeIn = { opacity: 0, scale: 0.9 };
const nodeShown = { opacity: 1, scale: 1 };

function StepNode({ status }: { status: StepStatus }) {
  const solid = "flex size-5 items-center justify-center rounded-full";
  return (
    <span className="relative z-10 flex size-5 shrink-0 items-center justify-center bg-background">
      <AnimatePresence initial={false} mode="popLayout">
        {status === "done" ? (
          <motion.span animate={nodeShown} className={cn(solid, "bg-success text-white")} exit={nodeIn} initial={nodeIn} key="done" transition={enter}>
            <CheckIcon className="size-3" strokeWidth={3} />
          </motion.span>
        ) : status === "running" ? (
          <motion.span animate={nodeShown} className="relative size-5" exit={nodeIn} initial={nodeIn} key="run" transition={enter}>
            <span className="absolute inset-0 rounded-full border-2 border-info/24" />
            <svg aria-hidden className="absolute inset-0 size-5 animate-spin text-info motion-reduce:animate-none" viewBox="0 0 20 20">
              <circle cx="10" cy="10" fill="none" r="8" stroke="currentColor" strokeDasharray="14 60" strokeLinecap="round" strokeWidth="2.5" />
            </svg>
          </motion.span>
        ) : status === "waiting" ? (
          <motion.span animate={nodeShown} className={cn(solid, "relative bg-warning text-white")} exit={nodeIn} initial={nodeIn} key="wait" transition={enter}>
            <motion.span
              animate={{ scale: [1, 1.8], opacity: [0.5, 0] }}
              className="absolute inset-0 rounded-full bg-warning"
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
            />
            <HandIcon className="relative size-3" strokeWidth={2.5} />
          </motion.span>
        ) : status === "failed" ? (
          <motion.span animate={nodeShown} className={cn(solid, "bg-destructive text-white")} exit={nodeIn} initial={nodeIn} key="fail" transition={enter}>
            <XIcon className="size-3" strokeWidth={3} />
          </motion.span>
        ) : status === "skipped" ? (
          <motion.span animate={nodeShown} className={cn(solid, "bg-muted text-muted-foreground")} exit={nodeIn} initial={nodeIn} key="skip" transition={enter}>
            <MinusIcon className="size-3" strokeWidth={3} />
          </motion.span>
        ) : (
          <motion.span animate={nodeShown} className="size-5 rounded-full border-2 border-input border-dashed" exit={nodeIn} initial={nodeIn} key="pending" transition={enter} />
        )}
      </AnimatePresence>
    </span>
  );
}

function formatArgs(args: RunToolCall["args"]) {
  return Object.entries(args)
    .map(([k, v]) => `${k}: ${typeof v === "string" ? `"${v}"` : String(v)}`)
    .join(", ");
}

const secs = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

function Waterfall({ start, ms, total, tone, live }: { start: number; ms: number; total: number; tone: string; live: boolean }) {
  return (
    <span aria-hidden className="relative block h-1.5 w-28 overflow-hidden rounded-full bg-muted">
      <motion.span
        animate={{ scaleX: 1, opacity: live ? [0.5, 1, 0.5] : 1 }}
        className={cn("absolute inset-y-0 block min-w-0.5 origin-left rounded-full", tone)}
        initial={{ scaleX: 0 }}
        style={{ left: `${(start / total) * 100}%`, width: `${Math.max((ms / total) * 100, 2)}%` }}
        transition={live ? { scaleX: spring, opacity: { duration: 1.2, repeat: Infinity, ease: "easeInOut" } } : spring}
      />
    </span>
  );
}

function ToolEntry({ entry, total }: { entry: Extract<LogEntry, { kind: "tool" }>; total: number }) {
  const [open, setOpen] = useState(false);
  const meta = toolMeta[entry.call.kind];
  const panelId = useId();
  const failed = entry.status === "failed" || entry.status === "denied";
  const span = entry.end !== undefined ? Math.max(entry.end - entry.at, 1) : entry.call.ms;
  return (
    <div className={cn("rounded-lg transition-colors duration-150", open && "bg-muted/48")}>
      <button
        aria-controls={panelId}
        aria-expanded={open}
        className="grid w-full cursor-pointer grid-cols-[2.5rem_1rem_minmax(0,1fr)_auto] items-start gap-x-3 rounded-lg px-2 py-2 text-left outline-none transition-colors duration-150 hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => setOpen((o) => !o)}
        type="button"
      >
        <time className="pt-px text-right font-mono text-[11px] text-muted-foreground tabular-nums">{secs(entry.at)}</time>
        <meta.icon className={cn("mt-px size-4", failed ? "text-destructive-foreground" : meta.text)} />
        <span className="min-w-0">
          <span className="flex items-center gap-2">
            <span className={cn("truncate font-medium font-mono text-xs", failed && "text-destructive-foreground")}>{entry.call.name}</span>
            {entry.retry && <span className="shrink-0 rounded bg-muted px-1.5 text-[11px] text-muted-foreground">retry</span>}
          </span>
          <span className="mt-0.5 block truncate font-mono text-[11px] text-muted-foreground">{formatArgs(entry.call.args)}</span>
          <AnimatePresence initial={false}>
            {entry.result && (
              <motion.span
                animate={{ opacity: 1, height: "auto" }}
                className="block overflow-hidden"
                initial={{ opacity: 0, height: 0 }}
                transition={spring}
              >
                <span className={cn("mt-1 block text-xs", failed ? "text-destructive-foreground" : "text-foreground")}>{entry.result}</span>
              </motion.span>
            )}
          </AnimatePresence>
        </span>
        <span className="flex items-center gap-3 pt-px">
          <span className="hidden @md:block">
            <Waterfall live={entry.status === "running"} ms={span} start={entry.at} tone={failed ? "bg-destructive" : meta.bar} total={total} />
          </span>
          <span className="flex w-14 items-center justify-end gap-1 text-muted-foreground text-xs tabular-nums">
            <AnimatePresence initial={false} mode="popLayout">
              {entry.status === "running" ? (
                <motion.span animate={{ opacity: 1 }} className="flex items-center gap-1.5" exit={{ opacity: 0 }} initial={{ opacity: 0 }} key="r" transition={enter}>
                  <span className="size-1.5 animate-pulse rounded-full bg-info motion-reduce:animate-none" />
                  running
                </motion.span>
              ) : entry.status === "denied" ? (
                <motion.span animate={{ opacity: 1 }} className="flex items-center gap-1 text-destructive-foreground" initial={{ opacity: 0 }} key="x" transition={enter}>
                  <BanIcon className="size-3" />
                  blocked
                </motion.span>
              ) : entry.status === "failed" ? (
                <motion.span animate={{ opacity: 1 }} className="flex items-center gap-1 text-destructive-foreground" initial={{ opacity: 0 }} key="f" transition={enter}>
                  <TriangleAlertIcon className="size-3" />
                  failed
                </motion.span>
              ) : (
                <motion.span animate={{ opacity: 1 }} initial={{ opacity: 0 }} key="d" transition={enter}>
                  {secs(entry.call.ms)}
                </motion.span>
              )}
            </AnimatePresence>
          </span>
          <ChevronDownIcon className={cn("size-3.5 shrink-0 text-muted-foreground transition-transform duration-200", open && "rotate-180")} />
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            animate={{ height: "auto", opacity: 1 }}
            className="overflow-hidden"
            exit={{ height: 0, opacity: 0 }}
            id={panelId}
            initial={{ height: 0, opacity: 0 }}
            transition={spring}
          >
            <div className="ms-[4.75rem] me-2 mb-2 grid gap-2 rounded-lg border bg-background p-3 font-mono text-xs dark:bg-input/24">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <BracesIcon className="size-3" />
                arguments
              </div>
              <pre className="overflow-x-auto whitespace-pre text-foreground">{JSON.stringify(entry.call.args, null, 2)}</pre>
              <div className="flex flex-wrap gap-x-4 gap-y-1 border-t pt-2 text-muted-foreground">
                <span>{entry.call.tokens.toLocaleString("en-US")} tokens</span>
                <span>{entry.call.ms} ms</span>
                <span>started at {secs(entry.at)}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CountdownRing({ value, total }: { value: number; total: number }) {
  const c = 2 * Math.PI * 9;
  return (
    <span className="relative flex size-7 shrink-0 items-center justify-center">
      <svg aria-hidden className="absolute inset-0 -rotate-90" viewBox="0 0 24 24">
        <circle className="stroke-warning/20" cx="12" cy="12" fill="none" r="9" strokeWidth="2.5" />
        <motion.circle
          animate={{ strokeDashoffset: c * (1 - value / total) }}
          className="stroke-warning"
          cx="12"
          cy="12"
          fill="none"
          r="9"
          strokeDasharray={c}
          strokeLinecap="round"
          strokeWidth="2.5"
          transition={{ duration: 0.9, ease: "linear" }}
        />
      </svg>
      <span className="font-medium text-[10px] tabular-nums">{value}</span>
    </span>
  );
}

function ApprovalCard({
  approval,
  accounts,
  selected,
  onToggle,
  countdown,
  autoTotal,
  onApprove,
  onDeny,
}: {
  approval: NonNullable<RunStep["approval"]>;
  accounts: RunAccount[];
  selected: string[];
  onToggle: (email: string) => void;
  countdown: number | null;
  autoTotal: number;
  onApprove: () => void;
  onDeny: () => void;
}) {
  const [all, setAll] = useState(false);
  const shown = all ? accounts : accounts.slice(0, 4);
  return (
    <motion.section
      animate={{ opacity: 1, y: 0, scale: 1 }}
      aria-label="Approval needed"
      className="mx-4 mt-4 shrink-0 rounded-2xl border border-warning/40 bg-warning/6 p-4"
      exit={{ opacity: 0, y: -6, scale: 0.98 }}
      initial={{ opacity: 0, y: -6, scale: 0.98 }}
      layout
      transition={{ ...enter, layout: spring }}
    >
      <div className="flex items-start gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-warning/16 text-warning-foreground">
          <ShieldAlertIcon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-balance font-medium">
            {approval.title} <span className="text-muted-foreground tabular-nums">({selected.length})</span>
          </h3>
          <p className="mt-0.5 text-pretty text-muted-foreground text-xs">{approval.description}</p>
        </div>
        {countdown !== null && <CountdownRing total={autoTotal} value={countdown} />}
      </div>

      <ul className="mt-3 grid max-h-52 gap-1 overflow-y-auto @md:grid-cols-2">
        <AnimatePresence initial={false}>
          {shown.map((a) => {
            const on = selected.includes(a.email);
            return (
              <motion.li
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                initial={{ opacity: 0, height: 0 }}
                key={a.email}
                transition={spring}
              >
                <label
                  className={cn(
                    "flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-warning/8",
                    !on && "opacity-56",
                  )}
                >
                  <Checkbox checked={on} onCheckedChange={() => onToggle(a.email)} />
                  <span className="min-w-0 flex-1">
                    <span className={cn("block truncate font-medium text-xs", !on && "line-through")}>{a.contact}</span>
                    <span className="block truncate text-muted-foreground text-xs">{a.company}</span>
                  </span>
                  <span className="text-muted-foreground text-xs tabular-nums">{a.score.toFixed(2)}</span>
                </label>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
      {accounts.length > 4 && (
        <button
          className="mt-1 inline-flex h-8 cursor-pointer items-center rounded-md px-2 text-muted-foreground text-xs underline-offset-2 outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => setAll((v) => !v)}
          type="button"
        >
          {all ? "Show fewer" : `Show all ${accounts.length}`}
        </button>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button className={press} disabled={selected.length === 0} onClick={onApprove} size="sm">
          <SendIcon />
          <span>
            Approve &amp; send <span className="tabular-nums">{selected.length}</span>
          </span>
        </Button>
        <Button className={press} onClick={onDeny} size="sm" variant="outline">
          Deny
        </Button>
        <span className="text-pretty text-muted-foreground text-xs tabular-nums">
          {countdown !== null ? `Demo auto-approves in ${countdown}s · any change pauses it` : "Waiting for you"}
        </span>
      </div>
    </motion.section>
  );
}

function FailureCard({
  step,
  stepTitle,
  toolName,
  message,
  onRetry,
  onCancel,
}: {
  step: number;
  stepTitle: string;
  toolName?: string;
  message: string;
  onRetry: () => void;
  onCancel: () => void;
}) {
  return (
    <motion.section
      animate={{ opacity: 1, y: 0, scale: 1 }}
      aria-label="Run failed"
      className="mx-4 mt-4 shrink-0 rounded-2xl border border-destructive/32 bg-destructive/4 p-4"
      exit={{ opacity: 0, y: -6, scale: 0.98 }}
      initial={{ opacity: 0, y: -6, scale: 0.98 }}
      layout
      role="alert"
      transition={{ ...enter, layout: spring }}
    >
      <div className="flex items-start gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-destructive/12 text-destructive-foreground">
          <TriangleAlertIcon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-balance font-medium">
            Step {step + 1} failed: {stepTitle}
          </h3>
          <p className="mt-0.5 text-pretty text-muted-foreground text-xs">
            {toolName && <span className="font-mono">{toolName}</span>}
            {toolName && " failed: "}
            <span className="text-destructive-foreground">{message}</span>. Nothing after this step has run.
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 ps-11">
        <Button className={press} onClick={onRetry} size="sm">
          <RotateCcwIcon />
          Retry step
        </Button>
        <Button className={press} onClick={onCancel} size="sm" variant="outline">
          Cancel run
        </Button>
      </div>
    </motion.section>
  );
}

function ActivityLog({ log, steps, total }: { log: LogEntry[]; steps: RunStep[]; total: number }) {
  return (
    <ol className="flex flex-col">
      <AnimatePresence initial={false}>
        {log.map((e, i) => {
          const first = i === 0 || log[i - 1].step !== e.step;
          return (
            <motion.li
              animate={{ opacity: 1, y: 0 }}
              initial={{ opacity: 0, y: 4 }}
              key={e.id}
              layout="position"
              transition={{ ...enter, layout: spring }}
            >
              {first && (
                <div className={cn("flex items-center gap-2 px-2 pb-1 text-muted-foreground text-xs", i === 0 ? "pt-0" : "pt-4")}>
                  <span className="flex size-4 items-center justify-center rounded bg-muted font-medium text-[10px] tabular-nums">{e.step + 1}</span>
                  <span className="truncate font-medium">{steps[e.step]?.title}</span>
                </div>
              )}
              {e.kind === "tool" ? (
                <ToolEntry entry={e} total={total} />
              ) : (
                <div className="grid grid-cols-[2.5rem_1rem_minmax(0,1fr)] items-start gap-x-3 px-2 py-2 text-xs">
                  <time className="pt-px text-right font-mono text-[11px] text-muted-foreground tabular-nums">{secs(e.at)}</time>
                  {e.kind === "thought" ? (
                    <>
                      <SparklesIcon className="mt-px size-4 text-muted-foreground" />
                      <span className="text-pretty text-muted-foreground italic leading-relaxed">{e.text}</span>
                    </>
                  ) : (
                    <>
                      {e.status === "waiting" ? (
                        <HandIcon className="mt-px size-4 text-warning-foreground" />
                      ) : e.status === "approved" ? (
                        <CheckIcon className="mt-px size-4 text-success-foreground" />
                      ) : (
                        <BanIcon className="mt-px size-4 text-destructive-foreground" />
                      )}
                      <span
                        className={cn(
                          "pt-px",
                          e.status === "waiting" && "font-medium text-warning-foreground",
                          e.status === "approved" && "text-foreground",
                          e.status === "denied" && "text-destructive-foreground",
                        )}
                      >
                        {e.status === "waiting"
                          ? "Paused for your approval"
                          : e.status === "approved"
                            ? `Approved by you · ${e.count} recipients`
                            : "Denied by you · nothing sent"}
                      </span>
                    </>
                  )}
                </div>
              )}
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ol>
  );
}

function TraceStrip({
  log,
  total,
  head,
  next,
  duration,
}: {
  log: LogEntry[];
  total: number;
  head: number;
  next: number;
  duration: number;
}) {
  const reduce = useReducedMotion();
  const tools = log.filter((e) => e.kind === "tool") as Extract<LogEntry, { kind: "tool" }>[];
  const marks = log.filter((e) => e.kind !== "tool");
  const target = Math.min(next / total, 1);
  return (
    <div className="flex items-center gap-3 border-b px-4 py-2.5">
      <span className="hidden w-14 shrink-0 font-medium text-muted-foreground text-xs @md:block">Timeline</span>
      <div className="relative h-5 min-w-0 flex-1">
        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border" />
        <motion.div
          animate={{ scaleX: target }}
          className="absolute inset-y-0 left-0 w-full origin-left rounded-sm bg-foreground/[0.04] dark:bg-foreground/[0.06]"
          initial={false}
          transition={reduce ? { duration: 0 } : { duration, ease: "linear" }}
        />
        {tools.map((e) => {
          const meta = toolMeta[e.call.kind];
          const failed = e.status === "failed" || e.status === "denied";
          const span = e.end !== undefined ? Math.max(e.end - e.at, 1) : e.call.ms;
          return (
            <motion.span
              animate={{ opacity: 1, scaleY: 1 }}
              className={cn("absolute top-1/2 h-2.5 -translate-y-1/2 rounded-[calc(var(--radius)*0.3)]", failed ? "bg-destructive" : meta.bar, e.status === "running" && "animate-pulse motion-reduce:animate-none")}
              initial={{ opacity: 0, scaleY: 0.4 }}
              key={e.id}
              style={{ left: `${(e.at / total) * 100}%`, width: `max(3px, ${(span / total) * 100}%)` }}
              title={`${e.call.name} · ${secs(span)}`}
              transition={enter}
            />
          );
        })}
        {marks.map((e) => (
          <span
            className={cn(
              "absolute top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full",
              e.kind === "approval" ? "bg-warning" : "bg-muted-foreground/56",
            )}
            key={e.id}
            style={{ left: `${(e.at / total) * 100}%` }}
          />
        ))}
        <motion.div
          animate={{ x: `${target * 100}%` }}
          aria-hidden
          className="pointer-events-none absolute inset-0"
          initial={false}
          transition={reduce ? { duration: 0 } : { duration, ease: "linear" }}
        >
          <span className="absolute inset-y-0 left-0 w-px bg-foreground/48" />
        </motion.div>
      </div>
      <span className="shrink-0 whitespace-nowrap text-right font-mono text-[11px] text-muted-foreground tabular-nums">
        {secs(head)} / {secs(total)}
      </span>
    </div>
  );
}

function DraftOutput({
  accounts,
  email,
  rows,
  words,
  sendState,
}: {
  accounts: RunAccount[];
  email: RunEmail;
  rows: number;
  words: number;
  sendState: "drafting" | "ready" | "sent" | "held";
}) {
  const allWords = email.body.split(" ");
  const streaming = words > 0 && words < allWords.length;
  const visibleRows = accounts.slice(0, Math.min(rows, 5));
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1400);
    return () => clearTimeout(t);
  }, [copied]);

  const badge = {
    drafting: <Badge variant="info">Drafting</Badge>,
    ready: <Badge variant="warning">Ready for review</Badge>,
    sent: <Badge variant="success">Sent</Badge>,
    held: <Badge variant="secondary">Kept as draft</Badge>,
  }[sendState];

  return (
    <div className="rounded-2xl border bg-card">
      <div className="flex items-center gap-3 border-b p-4">
        <span className="flex size-8 items-center justify-center rounded-lg bg-orange-500/12 text-orange-700 dark:bg-orange-400/14 dark:text-orange-300">
          <FileTextIcon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium">Q3 renewal outreach</div>
          <div className="text-muted-foreground text-xs tabular-nums">{rows > 0 ? `${accounts.length} accounts · draft 1 of ${accounts.length}` : "Waiting for data"}</div>
        </div>
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            initial={{ scale: 0.95, opacity: 0 }}
            key={sendState}
            transition={enter}
          >
            {badge}
          </motion.span>
        </AnimatePresence>
      </div>

      <div className="p-4">
        <h4 className="mb-2 font-medium text-muted-foreground text-xs">Flagged accounts</h4>
        <div className="rounded-xl border">
          {rows === 0
            ? [0, 1, 2].map((i) => (
                <div className="flex items-center gap-3 border-b px-3 py-2.5 last:border-0" key={i}>
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="ms-auto h-1.5 w-16 rounded-full" />
                  <Skeleton className="h-3 w-8" />
                </div>
              ))
            : (
              <AnimatePresence initial={false}>
                {visibleRows.map((a) => (
                  <motion.div
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-3 border-b px-3 py-2 last:border-0"
                    initial={{ opacity: 0, x: -6 }}
                    key={a.email}
                    transition={enter}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-xs">{a.company}</span>
                      <span className="block truncate text-muted-foreground text-xs">{a.contact}</span>
                    </span>
                    <span className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                      <motion.span
                        animate={{ scaleX: a.score }}
                        className={cn("block h-full origin-left rounded-full", a.score >= 0.75 ? "bg-destructive" : "bg-warning")}
                        initial={{ scaleX: 0 }}
                        transition={{ ...spring, delay: 0.1 }}
                      />
                    </span>
                    <span className="w-8 text-right font-medium text-xs tabular-nums">{a.score.toFixed(2)}</span>
                    <span className="hidden w-11 text-right text-muted-foreground text-xs tabular-nums @md:block">{a.arr}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          {rows >= 5 && accounts.length > 5 && (
            <div className="px-3 py-2 text-muted-foreground text-xs">+{accounts.length - 5} more</div>
          )}
        </div>

        <h4 className="mt-5 mb-2 font-medium text-muted-foreground text-xs">Email draft</h4>
        <div className="rounded-xl border p-3">
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 border-b pb-2.5 text-xs">
            <dt className="text-muted-foreground">To</dt>
            <dd className="truncate">{words > 0 ? email.to : <Skeleton className="mt-0.5 h-3 w-40" />}</dd>
            <dt className="text-muted-foreground">Subject</dt>
            <dd className="truncate font-medium">{words > 0 ? email.subject : <Skeleton className="mt-0.5 h-3 w-52" />}</dd>
          </dl>
          <div className="mt-2.5 flex min-h-6 flex-wrap gap-1">
            {words === 0
              ? email.highlights.map((h) => <Skeleton className="h-6 w-24 rounded-full" key={h} />)
              : email.highlights.map((h, i) => (
                <motion.span
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-full bg-info/10 px-2 py-0.5 text-info-foreground text-xs"
                  initial={{ opacity: 0, scale: 0.95 }}
                  key={h}
                  transition={{ ...enter, delay: 0.03 * i }}
                >
                  {h}
                </motion.span>
              ))}
          </div>
          <div className="mt-2.5 min-h-24 whitespace-pre-line text-sm/6">
            {words === 0 ? (
              <div className="flex flex-col gap-2 pt-1">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-11/12" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            ) : (
              <>
                {allWords.slice(0, words).join(" ")}
                {streaming && (
                  <motion.span
                    animate={{ opacity: [1, 0.2, 1] }}
                    className="ms-0.5 inline-block h-4 w-1.5 translate-y-0.5 rounded-full bg-foreground/60"
                    transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
                  />
                )}
              </>
            )}
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <Button
            disabled={words < allWords.length}
            onClick={() => {
              navigator.clipboard?.writeText(email.body).catch(() => {});
              setCopied(true);
            }}
            className={cn(press, "min-w-22")}
            size="sm"
            variant="outline"
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button className={press} disabled={words < allWords.length} size="sm" variant="ghost">
            Open all {accounts.length} drafts
          </Button>
        </div>
      </div>
    </div>
  );
}

export function RunReplay({
  agentName = "Renewal Scout",
  runId = "run_8f3k21",
  task = "Find Q3 renewals at risk and draft outreach for each account owner.",
  model = "relay-2-large",
  steps = defaultSteps,
  accounts = defaultAccounts,
  email = defaultEmail,
  autoApproveAfter = 12,
  speed = 1,
  className,
}: RunReplayProps) {
  const [state, dispatch] = useReducer(reducer, steps.length, initState);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [tab, setTab] = useState<"activity" | "draft">("activity");
  const [selected, setSelected] = useState<string[]>(() => accounts.map((a) => a.email));
  const [countdown, setCountdown] = useState<number | null>(null);
  const [seenDraft, setSeenDraft] = useState(0);
  const [planOpen, setPlanOpen] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const tabsId = useId();

  const wordCount = useMemo(() => email.body.split(" ").length, [email.body]);
  const rowCount = Math.min(accounts.length, 5);
  const events = useMemo(
    () => buildEvents(steps, rowCount, wordCount, state.decision, state.retried),
    [steps, rowCount, wordCount, state.decision, state.retried],
  );

  const offsets = useMemo(() => {
    let t = 0;
    return events.map((e) => (t += e.d));
  }, [events]);
  const total = useMemo(
    () => buildEvents(steps, rowCount, wordCount, { approve: true, count: accounts.length }, true).reduce((n, e) => n + e.d, 0),
    [steps, rowCount, wordCount, accounts.length],
  );

  const halted = state.failure !== null;

  useEffect(() => {
    if (paused || state.awaiting || state.finished || halted) return;
    const ev = events[state.cursor];
    if (!ev) return;
    const t = setTimeout(() => dispatch({ type: "ev", ev, at: offsets[state.cursor] }), ev.d / speed);
    return () => clearTimeout(t);
  }, [events, offsets, state.cursor, state.awaiting, state.finished, halted, paused, speed]);

  useEffect(() => {
    if (paused || state.finished || halted) return;
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [paused, state.finished, halted]);

  useEffect(() => {
    if (state.awaiting && autoApproveAfter > 0) setCountdown(autoApproveAfter);
    if (!state.awaiting) setCountdown(null);
  }, [state.awaiting, autoApproveAfter]);

  useEffect(() => {
    if (countdown === null || paused) return;
    if (countdown <= 0) {
      dispatch({ type: "decide", approve: true, count: selected.length });
      return;
    }
    const t = setTimeout(() => setCountdown((c) => (c === null ? c : c - 1)), 1000);
    return () => clearTimeout(t);
  }, [countdown, paused, selected.length]);

  useEffect(() => {
    const el = logRef.current;
    if (!el || el.scrollHeight <= el.clientHeight) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [state.log.length, state.awaiting, halted]);

  useEffect(() => {
    if (tab === "draft") setSeenDraft(state.rows + state.words);
  }, [tab, state.rows, state.words]);

  const replay = () => {
    dispatch({ type: "reset", steps: steps.length });
    setElapsed(0);
    setPaused(false);
    setSelected(accounts.map((a) => a.email));
  };

  const approvalStep = state.awaiting ? steps[state.awaiting.step]?.approval : undefined;
  const doneCount = state.steps.filter((s) => s === "done" || s === "skipped").length;
  const toolCalls = state.log.filter((e) => e.kind === "tool").length;
  const liveStep = state.steps.findIndex((s) => s === "running" || s === "waiting" || s === "failed");
  const lastTouched = state.steps.findLastIndex((s) => s !== "pending");
  const activeStep = liveStep >= 0 ? liveStep : Math.max(lastTouched, 0);
  const failedStep = state.failure ? steps[state.failure.step] : undefined;
  const failedCall = state.failure ? state.log.find((e) => e.id === state.failure?.id) : undefined;

  const status: { label: string; tone: Tone; live: boolean } = state.cancelled
    ? { label: "Cancelled", tone: "muted", live: false }
    : halted
      ? { label: "Failed", tone: "destructive", live: false }
    : state.finished
      ? { label: "Completed", tone: "success", live: false }
      : state.awaiting
        ? { label: "Needs approval", tone: "warning", live: true }
        : paused
          ? { label: "Paused", tone: "muted", live: false }
          : { label: "Running", tone: "info", live: true };
  const cancel = () => dispatch({ type: "cancel" });

  const emailStep = steps.findIndex((s) => s.approval);
  const sendState: "drafting" | "ready" | "sent" | "held" =
    state.decision?.approve && state.steps[emailStep] === "done"
      ? "sent"
      : state.decision && !state.decision.approve
        ? "held"
        : state.words >= wordCount
          ? "ready"
          : "drafting";

  const head = state.cursor > 0 ? (offsets[state.cursor - 1] ?? 0) : 0;
  const moving = !paused && !state.awaiting && !state.finished && !halted && state.cursor < events.length;

  const draftFresh = tab !== "draft" && state.rows + state.words > seenDraft;
  const mmss = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;

  return (
    <MotionConfig reducedMotion="user">
      <div
        className={cn(
          "@container relative isolate flex h-[760px] w-full flex-col overflow-hidden bg-background text-foreground text-sm",
          className,
        )}
      >
        <header className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b px-4 py-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-card text-foreground shadow-xs/5">
            <BotIcon className="size-4" />
          </span>
          <div className="min-w-48 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="truncate font-medium">{agentName}</h2>
              <span className="hidden truncate rounded-md bg-muted px-1.5 font-mono text-[11px] text-muted-foreground @md:inline">{runId}</span>
            </div>
            <p className="truncate text-muted-foreground text-xs">{task}</p>
          </div>
          <div className="ms-auto flex items-center gap-2">
            <span
              aria-live="polite"
              className="inline-flex h-7 items-center gap-1.5 rounded-full border bg-card ps-2 pe-2.5 font-medium text-xs"
            >
              <LiveDot live={status.live} tone={status.tone} />
              <AnimatePresence initial={false} mode="wait">
                <motion.span
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  initial={{ opacity: 0, y: 6 }}
                  key={status.label}
                  transition={enter}
                >
                  {status.label}
                </motion.span>
              </AnimatePresence>
            </span>
            <time className="w-10 text-center text-muted-foreground text-xs tabular-nums">{mmss}</time>
            {state.finished ? (
              <Button className={press} onClick={replay} size="sm" variant="outline">
                <RotateCcwIcon />
                Replay
              </Button>
            ) : (
              <Button
                aria-label={paused ? "Resume run" : "Pause run"}
                className={press}
                disabled={halted}
                onClick={() => setPaused((p) => !p)}
                size="icon-sm"
                variant="outline"
              >
                {paused ? <PlayIcon /> : <PauseIcon />}
              </Button>
            )}
            <Menu>
              <MenuTrigger render={<Button aria-label="Run options" className={press} size="icon-sm" variant="ghost" />}>
                <EllipsisIcon />
              </MenuTrigger>
              <MenuPopup align="end">
                <MenuItem>
                  <LinkIcon />
                  Copy run link
                </MenuItem>
                <MenuItem>
                  <BracesIcon />
                  Export trace as JSON
                </MenuItem>
                <MenuSeparator />
                <MenuItem disabled={state.finished} onClick={cancel} variant="destructive">
                  <BanIcon />
                  Cancel run
                </MenuItem>
              </MenuPopup>
            </Menu>
          </div>
        </header>

        <TraceStrip
          duration={moving ? (events[state.cursor]?.d ?? 0) / speed / 1000 : 0.2}
          head={head}
          log={state.log}
          next={moving ? (offsets[state.cursor] ?? head) : head}
          total={total}
        />

        <div className="grid min-h-0 flex-1 auto-rows-max grid-cols-[minmax(0,1fr)] overflow-y-auto @3xl:auto-rows-auto @3xl:grid-cols-[17.5rem_minmax(0,1fr)] @3xl:overflow-hidden @6xl:grid-cols-[17.5rem_minmax(0,1fr)_minmax(0,26rem)]">
          <aside className="flex flex-col gap-4 border-b p-4 @3xl:overflow-y-auto @3xl:border-e @3xl:border-b-0">
            <div>
              <div className="mb-2 flex items-baseline justify-between">
                <h3 className="font-medium">Plan</h3>
                <span className="text-muted-foreground text-xs tabular-nums">
                  {doneCount} of {steps.length}
                </span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-muted">
                <motion.div
                  animate={{ scaleX: doneCount / steps.length }}
                  className="h-full origin-left rounded-full bg-success"
                  initial={false}
                  transition={spring}
                />
              </div>
            </div>
            <ol className="flex flex-col">
              {steps.map((s, i) => {
                const st = state.steps[i];
                const calls = state.log.filter((e) => e.kind === "tool" && e.step === i) as Extract<LogEntry, { kind: "tool" }>[];
                const secs = calls.reduce((n, c) => n + (c.status === "done" ? c.call.ms : 0), 0) / 1000;
                const last = i === steps.length - 1;
                const collapsed = !planOpen && i !== activeStep;
                return (
                  <li
                    className={cn("relative gap-3 pb-4 last:pb-0 @3xl:flex", collapsed ? "hidden" : "flex", !planOpen && "@max-3xl:pb-0")}
                    key={s.title}
                  >
                    {!last && (
                      <span
                        aria-hidden
                        className={cn("absolute top-6 bottom-1 left-[9px] w-0.5 overflow-hidden rounded-full bg-border", !planOpen && "hidden @3xl:block")}
                      >
                        <motion.span
                          animate={{ scaleY: st === "done" || st === "skipped" ? 1 : 0 }}
                          className="block h-full origin-top bg-success"
                          initial={false}
                          transition={spring}
                        />
                      </span>
                    )}
                    <StepNode status={st} />
                    <div className="min-w-0 flex-1">
                      <div
                        className={cn(
                          "font-medium transition-colors",
                          st === "pending" && "text-muted-foreground",
                          st === "skipped" && "text-muted-foreground line-through",
                          st === "failed" && "text-destructive-foreground",
                        )}
                      >
                        {s.title}
                      </div>
                      <div className="text-muted-foreground text-xs tabular-nums">
                        {st === "running"
                          ? calls.length > 0
                            ? `Calling ${calls.at(-1)?.call.name}`
                            : "Thinking…"
                          : st === "waiting"
                            ? "Waiting for your approval"
                            : st === "failed"
                              ? "Failed · waiting for retry"
                            : st === "done"
                              ? calls.length
                                ? `${calls.length} tool call${calls.length > 1 ? "s" : ""} · ${secs.toFixed(1)}s`
                                : "Done"
                              : st === "skipped"
                                ? "Skipped"
                                : s.approval
                                  ? "Needs approval"
                                  : "Queued"}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
            <button
              aria-expanded={planOpen}
              className="-my-2 -ms-2 flex h-8 cursor-pointer items-center gap-1 self-start rounded-md px-2 text-muted-foreground text-xs outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring @3xl:hidden"
              onClick={() => setPlanOpen((o) => !o)}
              type="button"
            >
              {planOpen ? "Show current step" : `Show all ${steps.length} steps`}
              <ChevronDownIcon className={cn("size-3.5 transition-transform", planOpen && "rotate-180")} />
            </button>
            <dl className="grid grid-cols-3 gap-x-3 gap-y-1.5 border-t pt-3 text-xs @3xl:mt-auto @3xl:grid-cols-1">
              {[
                { label: "Tokens", node: <Rolling format={(n) => Math.round(n).toLocaleString("en-US")} value={state.tokens} /> },
                { label: "Cost", node: <Rolling format={(n) => `$${((n / 1000) * 0.006).toFixed(3)}`} value={state.tokens} /> },
                { label: "Tool calls", node: <Rolling format={(n) => String(Math.round(n))} value={toolCalls} /> },
                { label: "Model", node: <span className="font-mono text-[11px]">{model}</span> },
              ].map((s) => (
                <div className={cn("flex min-w-0 flex-col gap-0.5 @3xl:flex-row @3xl:justify-between", s.label === "Model" && "hidden @3xl:flex")} key={s.label}>
                  <dt className="text-muted-foreground">{s.label}</dt>
                  <dd className="truncate font-medium tabular-nums">{s.node}</dd>
                </div>
              ))}
            </dl>
          </aside>

          <section className="flex min-h-0 flex-col @3xl:overflow-hidden" aria-label="Run activity">
            <Tabs className="shrink-0 px-4 pt-4 @6xl:hidden" onValueChange={(v) => setTab(v as "activity" | "draft")} value={tab}>
              <TabsList>
                <TabsTab aria-controls={`${tabsId}-activity`} value="activity">
                  Activity
                  <span className="text-muted-foreground text-xs tabular-nums">{state.log.length}</span>
                </TabsTab>
                <TabsTab aria-controls={`${tabsId}-draft`} value="draft">
                  Draft
                  <AnimatePresence>
                    {draftFresh && (
                      <motion.span
                        animate={{ opacity: 1, scale: 1 }}
                        aria-label="new"
                        className="size-1.5 rounded-full bg-info"
                        exit={{ opacity: 0, scale: 0.9 }}
                        initial={{ opacity: 0, scale: 0.9 }}
                        transition={enter}
                      />
                    )}
                  </AnimatePresence>
                </TabsTab>
              </TabsList>
            </Tabs>

            <AnimatePresence initial={false}>
              {approvalStep && (
                <ApprovalCard
                  accounts={accounts}
                  approval={approvalStep}
                  autoTotal={autoApproveAfter}
                  countdown={countdown}
                  key="approval"
                  onApprove={() => dispatch({ type: "decide", approve: true, count: selected.length })}
                  onDeny={() => dispatch({ type: "decide", approve: false, count: 0 })}
                  onToggle={(email) => {
                    setCountdown(null);
                    setSelected((s) => (s.includes(email) ? s.filter((x) => x !== email) : [...s, email]));
                  }}
                  selected={selected}
                />
              )}
              {state.failure && failedStep && (
                <FailureCard
                  key="failure"
                  message={state.failure.message}
                  onCancel={cancel}
                  onRetry={() => dispatch({ type: "retry" })}
                  step={state.failure.step}
                  stepTitle={failedStep.title}
                  toolName={failedCall?.kind === "tool" ? failedCall.call.name : undefined}
                />
              )}
            </AnimatePresence>
            <div
              className={cn(
                "flex min-h-0 flex-1 flex-col gap-3 p-4 @3xl:overflow-y-auto",
                approvalStep || halted
                  ? "@3xl:[mask-image:linear-gradient(to_bottom,transparent_0.75rem,black_2.75rem)]"
                  : "@3xl:[mask-image:linear-gradient(to_bottom,transparent,black_1.25rem)]",
              )}
              ref={logRef}
            >
              <div
                className={cn(tab === "activity" ? "block" : "hidden", "@6xl:block")}
                id={`${tabsId}-activity`}
                role="tabpanel"
              >
                <h3 className="mb-2 hidden font-medium @6xl:block">Activity</h3>
                {state.log.length === 0 ? (
                  <div className="flex items-center gap-2 px-1 py-2 text-muted-foreground text-xs">
                    <span className="size-1.5 animate-pulse rounded-full bg-info motion-reduce:animate-none" />
                    Reading the task…
                  </div>
                ) : (
                  <ActivityLog log={state.log} steps={steps} total={total} />
                )}
              </div>
              <div className={cn(tab === "draft" ? "block" : "hidden", "@6xl:hidden")} id={`${tabsId}-draft`} role="tabpanel">
                <DraftOutput accounts={accounts} email={email} rows={state.rows} sendState={sendState} words={state.words} />
              </div>
            </div>
          </section>

          <section aria-label="Draft output" className="hidden border-s p-4 @6xl:block @6xl:overflow-y-auto">
            <h3 className="mb-2 font-medium">Output</h3>
            <DraftOutput accounts={accounts} email={email} rows={state.rows} sendState={sendState} words={state.words} />
          </section>
        </div>
      </div>
    </MotionConfig>
  );
}
