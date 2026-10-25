"use client";

import { AnimatePresence, LayoutGroup, MotionConfig, motion, useReducedMotion } from "motion/react";
import {
  ArrowUpIcon,
  CheckIcon,
  CircleDashedIcon,
  HandIcon,
  LoaderCircleIcon,
  RotateCcwIcon,
  SendIcon,
  SparklesIcon,
  WorkflowIcon,
} from "lucide-react";
import { type KeyboardEvent, type ReactNode, useEffect, useId, useReducer, useRef, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type AgentTone = "orange" | "teal" | "violet" | "info" | "rose";

export interface SubAgent {
  id: string;
  name: string;
  role: string;
  tone: AgentTone;
  actions: string[];
  result?: string;
}

export interface BriefField {
  key: string;
  label: string;
  kind: "text" | "textarea" | "chips";
  placeholder?: string;
}

export interface ConductorProps {
  agentName?: string;
  briefTitle?: string;
  fields?: BriefField[];
  agents?: SubAgent[];
  channelOptions?: string[];
  autoPlay?: boolean;
  className?: string;
}

type Status = "queued" | "working" | "waiting" | "done";

interface Msg {
  id: string;
  role: "user" | "agent";
  text: string;
  shown: number;
  spawned?: string[];
  updated?: number;
  ask?: boolean;
}

interface FieldState {
  value: string | string[];
  target?: string;
  by?: "agent" | "you";
  flash?: number;
}

interface AgentState {
  status: Status;
  progress: number;
  step: number;
}

interface State {
  msgs: Msg[];
  fields: Record<string, FieldState>;
  agents: Record<string, AgentState>;
  cue: number;
  waiting: boolean;
  done: boolean;
}

const tone: Record<AgentTone, { dot: string; soft: string; bar: string; ring: string }> = {
  "orange": { dot: "bg-orange-500", soft: "bg-orange-500/14 text-orange-600 dark:text-orange-400", bar: "bg-orange-500", ring: "ring-orange-500/40" },
  "teal": { dot: "bg-teal-500", soft: "bg-teal-500/14 text-teal-600 dark:text-teal-400", bar: "bg-teal-500", ring: "ring-teal-500/40" },
  "violet": { dot: "bg-violet-500", soft: "bg-violet-500/18 text-violet-600 dark:text-violet-400", bar: "bg-violet-500", ring: "ring-violet-500/40" },
  "rose": { dot: "bg-rose-500", soft: "bg-rose-500/14 text-rose-600 dark:text-rose-400", bar: "bg-rose-500", ring: "ring-rose-500/40" },
  info: { dot: "bg-info", soft: "bg-info/14 text-info-foreground", bar: "bg-info", ring: "ring-info/40" },
};

const defaultAgents: SubAgent[] = [
  { id: "scout", name: "Scout", role: "Research", tone: "teal", actions: ["Reading 12 agency launch posts", "Comparing 4 calendar tools", "Summarising what worked"], result: "3 launch patterns from 12 posts" },
  { id: "ledger", name: "Ledger", role: "Budget", tone: "violet", actions: ["Splitting $40k across channels", "Checking cost-per-trial benchmarks", "Drafting the budget table"], result: "Budget table · $18 per trial" },
  { id: "quill", name: "Quill", role: "Copy", tone: "orange", actions: ["Drafting six taglines", "Writing launch email v1", "Needs channels to finish"], result: "6 taglines and launch email v1" },
  { id: "iris", name: "Iris", role: "Design", tone: "info", actions: ["Sizing assets per channel", "Pulling a warm palette", "Exporting the moodboard"], result: "14 assets sized for 2 channels" },
];

const defaultFields: BriefField[] = [
  { key: "project", label: "Project", kind: "text", placeholder: "What are we launching?" },
  { key: "date", label: "Launch date", kind: "text", placeholder: "When" },
  { key: "audience", label: "Audience", kind: "chips" },
  { key: "budget", label: "Budget", kind: "text", placeholder: "$" },
  { key: "goal", label: "Goal", kind: "textarea", placeholder: "One sentence on why this matters" },
  { key: "metric", label: "Success metric", kind: "text", placeholder: "How we'll know" },
  { key: "tone", label: "Voice", kind: "text", placeholder: "How it should sound" },
  { key: "channels", label: "Channels", kind: "chips" },
];

const defaultChannels = ["Newsletter", "Product Hunt", "LinkedIn", "Partner agencies", "Podcasts"];

type Cue =
  | { wait: number; user: string }
  | { wait: number; agent: string; spawned?: string[]; updated?: number; ask?: boolean }
  | { wait: number; fill: Record<string, string | string[]> }
  | { wait: number; start: string[] };

const script: Cue[] = [
  { wait: 500, user: "We're launching Orbit Calendar on Nov 18. Need a launch plan aimed at small agencies, budget around $40k." },
  { wait: 900, agent: "On it. I've opened a brief and filled in what you gave me. Scout is reading how similar tools launched, and Ledger is sketching a budget split.", spawned: ["scout", "ledger"], updated: 4 },
  { wait: 200, fill: { project: "Orbit Calendar launch", date: "Nov 18, 2026", audience: ["Small agencies", "Freelance studios"], budget: "$40,000" } },
  { wait: 300, start: ["scout", "ledger"] },
  { wait: 4200, user: "Main goal is 2,000 trial signups in the first month. Keep it warm, not salesy." },
  { wait: 900, agent: "Got it. Goal, metric and voice are in. Quill is drafting taglines in that tone.", spawned: ["quill"], updated: 3 },
  { wait: 200, fill: { goal: "Get small agencies to try Orbit Calendar as the one planner the whole team shares.", metric: "2,000 trial signups in 30 days", tone: "Warm and plain-spoken, no hype" } },
  { wait: 300, start: ["quill"] },
  { wait: 4800, agent: "Scout found that agency tools do best through partner referrals and a short newsletter run. Which channels should we commit to?", ask: true },
];

const finish: Cue[] = [
  { wait: 700, agent: "Perfect. Channels are set, Iris is sizing assets for each, and Quill can finish the copy. The brief is complete whenever you are.", spawned: ["iris"], updated: 1 },
  { wait: 200, start: ["iris"] },
];

type Action =
  | { type: "cue"; cue: Cue }
  | { type: "tick"; agents: SubAgent[] }
  | { type: "type" }
  | { type: "edit"; key: string; value: string | string[] }
  | { type: "say"; text: string }
  | { type: "channels"; picks: string[] }
  | { type: "reset"; fields: BriefField[]; agents: SubAgent[] };

let uid = 0;
const nextId = () => `m${++uid}`;

function initial(fields: BriefField[], agents: SubAgent[]): State {
  return {
    msgs: [],
    fields: Object.fromEntries(fields.map((f) => [f.key, { value: f.kind === "chips" ? [] : "" }])),
    agents: Object.fromEntries(agents.map((a) => [a.id, { status: "queued" as Status, progress: 0, step: 0 }])),
    cue: 0,
    waiting: false,
    done: false,
  };
}

function apply(state: State, cue: Cue): State {
  if ("user" in cue) {
    return { ...state, msgs: [...state.msgs, { id: nextId(), role: "user", text: cue.user, shown: cue.user.length }] };
  }
  if ("agent" in cue) {
    const msg: Msg = { id: nextId(), role: "agent", text: cue.agent, shown: 0, spawned: cue.spawned, updated: cue.updated, ask: cue.ask };
    return { ...state, msgs: [...state.msgs, msg], waiting: Boolean(cue.ask) };
  }
  if ("fill" in cue) {
    const fields = { ...state.fields };
    for (const [k, v] of Object.entries(cue.fill)) {
      fields[k] = Array.isArray(v)
        ? { value: v, by: "agent", flash: Date.now() }
        : { value: "", target: v, by: "agent", flash: Date.now() };
    }
    return { ...state, fields };
  }
  const agents = { ...state.agents };
  for (const id of cue.start) agents[id] = { ...agents[id], status: "working" };
  return { ...state, agents };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "cue":
      return { ...apply(state, action.cue), cue: state.cue + 1 };
    case "type": {
      let changed = false;
      const msgs = state.msgs.map((m) => {
        if (m.shown >= m.text.length) return m;
        changed = true;
        return { ...m, shown: Math.min(m.text.length, m.shown + 3) };
      });
      const fields = { ...state.fields };
      for (const [k, f] of Object.entries(fields)) {
        if (f.target && typeof f.value === "string" && f.value.length < f.target.length) {
          changed = true;
          fields[k] = { ...f, value: f.target.slice(0, f.value.length + 2) };
        }
      }
      return changed ? { ...state, msgs, fields } : state;
    }
    case "tick": {
      let changed = false;
      const agents = { ...state.agents };
      for (const a of action.agents) {
        const s = agents[a.id];
        if (!s || s.status !== "working") continue;
        changed = true;
        const progress = Math.min(100, s.progress + 3 + ((s.progress * 7 + a.id.length) % 5));
        const step = Math.min(a.actions.length - 1, Math.floor((progress / 100) * a.actions.length));
        const needsChannels = a.id === "quill" && (state.fields.channels?.value as string[]).length === 0;
        if (needsChannels && progress >= 78) {
          agents[a.id] = { status: "waiting", progress: 78, step: a.actions.length - 1 };
        } else {
          agents[a.id] = { status: progress >= 100 ? "done" : "working", progress, step };
        }
      }
      return changed ? { ...state, agents } : state;
    }
    case "edit":
      return { ...state, fields: { ...state.fields, [action.key]: { value: action.value, by: "you" } } };
    case "say":
      return {
        ...state,
        msgs: [
          ...state.msgs,
          { id: nextId(), role: "user", text: action.text, shown: action.text.length },
          {
            id: nextId(),
            role: "agent",
            text: "Noted. I've added that to the brief notes so the agents pick it up on their next pass.",
            shown: 0,
          },
        ],
      };
    case "channels": {
      const agents = { ...state.agents };
      if (agents.quill?.status === "waiting") agents.quill = { ...agents.quill, status: "working" };
      return {
        ...state,
        waiting: false,
        done: true,
        agents,
        msgs: [...state.msgs, { id: nextId(), role: "user", text: action.picks.join(", "), shown: action.picks.join(", ").length }],
        fields: { ...state.fields, channels: { value: action.picks, by: "agent", flash: Date.now() } },
      };
    }
    case "reset":
      return initial(action.fields, action.agents);
  }
}

function AgentPanel({ agents, state }: { agents: SubAgent[]; state: State }) {
  const reduce = useReducedMotion();
  const active = agents.filter((a) => state.agents[a.id]?.status !== "queued" || state.msgs.some((m) => m.spawned?.includes(a.id)));
  const working = agents.filter((a) => state.agents[a.id]?.status === "working").length;
  const waiting = agents.filter((a) => state.agents[a.id]?.status === "waiting").length;
  const done = active.length > 0 && active.every((a) => state.agents[a.id]?.status === "done");
  const summary = working ? `${working} working` : waiting ? `${waiting} needs you` : done ? `All ${active.length} done` : active.length ? "Idle" : "None yet";
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-12 shrink-0 items-center gap-2 px-4">
        <WorkflowIcon className="size-4 text-muted-foreground" />
        <span className="font-medium">Agents</span>
        <span className="ms-auto flex items-center gap-1.5 text-muted-foreground text-xs tabular-nums">
          <span
            className={cn(
              "size-1.5 rounded-full transition-colors",
              working ? "animate-pulse bg-info motion-reduce:animate-none" : waiting ? "bg-warning" : done ? "bg-success" : "bg-muted-foreground/40",
            )}
          />
          {summary}
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        {active.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-6 text-center text-muted-foreground text-xs">
            <CircleDashedIcon className="size-5" />
            Agents appear here as the conductor hands out work.
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            <AnimatePresence initial={false}>
              {active.map((a) => {
                const s = state.agents[a.id];
                const t = tone[a.tone];
                return (
                  <motion.li
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className="rounded-xl border bg-card p-3"
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    key={a.id}
                    layout
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="relative">
                        <Avatar className="size-7">
                          <AvatarFallback className={cn("font-semibold text-[11px]", t.soft)}>{a.name[0]}</AvatarFallback>
                        </Avatar>
                        {s.status === "working" && !reduce && (
                          <motion.span
                            animate={{ scale: [1, 1.5], opacity: [0.6, 0] }}
                            className={cn("absolute inset-0 rounded-full ring-2", t.ring)}
                            transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
                          />
                        )}
                      </span>
                      <div className="min-w-0 flex-1 leading-tight">
                        <div className="font-medium">{a.name}</div>
                        <div className="text-muted-foreground text-xs">{a.role}</div>
                      </div>
                      <StatusPill status={s.status} />
                    </div>
                    <div className="mt-3 h-1 overflow-hidden rounded-full bg-muted">
                      <motion.div
                        animate={{ scaleX: s.progress / 100 }}
                        className={cn("h-full origin-left rounded-full transition-colors duration-300", s.status === "done" ? "bg-success" : t.bar)}
                        initial={false}
                        transition={{ type: "spring", stiffness: 120, damping: 24 }}
                      />
                    </div>
                    <div className={cn("relative mt-2 h-4 overflow-hidden text-xs", s.status === "done" ? "text-foreground/80" : "text-muted-foreground")}>
                      <AnimatePresence initial={false} mode="popLayout">
                        <motion.span
                          animate={{ y: 0, opacity: 1 }}
                          className="block truncate"
                          exit={{ y: -12, opacity: 0 }}
                          initial={{ y: 12, opacity: 0 }}
                          key={s.status === "done" ? "done" : s.step}
                          transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
                        >
                          {s.status === "done"
                            ? (a.result ?? "Finished")
                            : s.status === "queued"
                              ? "Queued"
                              : a.actions[s.step]}
                        </motion.span>
                      </AnimatePresence>
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: Status }) {
  const map: Record<Status, { label: string; variant: "outline" | "info" | "warning" | "success"; icon?: ReactNode }> = {
    queued: { label: "Queued", variant: "outline" },
    working: { label: "Working", variant: "info", icon: <LoaderCircleIcon className="size-3 animate-spin motion-reduce:animate-none" /> },
    waiting: { label: "Needs you", variant: "warning", icon: <HandIcon className="size-3" /> },
    done: { label: "Done", variant: "success", icon: <CheckIcon className="size-3" /> },
  };
  const m = map[status];
  return (
    <Badge className="gap-1" variant={m.variant}>
      {m.icon}
      {m.label}
    </Badge>
  );
}

function BriefForm({
  title,
  fields,
  state,
  onEdit,
  agentName,
}: {
  title: string;
  fields: BriefField[];
  state: State;
  onEdit: (key: string, value: string | string[]) => void;
  agentName: string;
}) {
  const id = useId();
  const filled = fields.filter((f) => {
    const v = state.fields[f.key]?.value;
    return Array.isArray(v) ? v.length > 0 : Boolean(v);
  }).length;
  const pct = Math.round((filled / fields.length) * 100);
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-12 shrink-0 items-center gap-3 px-4">
        <span className="min-w-0 flex-1 truncate font-medium">{title}</span>
        <span className="text-muted-foreground text-xs tabular-nums">
          {filled}/{fields.length}
        </span>
        <span className="relative size-5">
          <svg aria-hidden className="size-5 -rotate-90" viewBox="0 0 20 20">
            <circle className="stroke-muted" cx="10" cy="10" fill="none" r="8" strokeWidth="3" />
            <motion.circle
              animate={{ pathLength: pct / 100 }}
              className={cn(pct === 100 ? "stroke-success" : "stroke-foreground")}
              cx="10"
              cy="10"
              fill="none"
              initial={false}
              r="8"
              strokeLinecap="round"
              strokeWidth="3"
              transition={{ type: "spring", stiffness: 140, damping: 22 }}
            />
          </svg>
        </span>
      </div>
      <form className="min-h-0 flex-1 overflow-y-auto px-4 pb-4" onSubmit={(e) => e.preventDefault()}>
        <p className="mb-4 text-pretty text-muted-foreground text-xs">{agentName} fills this in as you talk. Your edits stay yours.</p>
        <div className="flex flex-col gap-3.5">
          {fields.map((f) => {
            const s = state.fields[f.key] ?? { value: "" };
            const fid = `${id}-${f.key}`;
            const typing = Boolean(s.target && typeof s.value === "string" && s.value.length < s.target.length);
            return (
              <div className="relative" key={f.key}>
                <div className="mb-1.5 flex items-center gap-1.5">
                  <label className="font-medium text-xs" htmlFor={fid}>
                    {f.label}
                  </label>
                  <AnimatePresence>
                    {s.by && (
                      <motion.span
                        animate={{ opacity: 1, x: 0 }}
                        className="ms-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground"
                        exit={{ opacity: 0 }}
                        initial={{ opacity: 0, x: 4 }}
                        key={s.by}
                        transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                      >
                        {s.by === "agent" ? <SparklesIcon className="size-3 text-info" /> : null}
                        {s.by === "agent" ? agentName : "Edited by you"}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
                <motion.div
                  animate={s.flash && Date.now() - s.flash < 1000 ? { boxShadow: ["0 0 0 0px var(--color-info)", "0 0 0 3px color-mix(in srgb, var(--color-info) 24%, transparent)", "0 0 0 0px transparent"] } : {}}
                  className="rounded-lg"
                  key={s.flash ?? 0}
                  transition={{ duration: 0.9, ease: "easeOut" }}
                >
                  {f.kind === "chips" ? (
                    <ChipsField
                      id={fid}
                      onChange={(v) => onEdit(f.key, v)}
                      placeholder={f.key === "channels" ? "Waiting on your pick" : "Add and press Enter"}
                      value={Array.isArray(s.value) ? s.value : []}
                    />
                  ) : f.kind === "textarea" ? (
                    <Textarea
                      className={cn("[&_textarea]:resize-none", typing && "caret-info")}
                      id={fid}
                      onChange={(e) => onEdit(f.key, e.target.value)}
                      placeholder={f.placeholder}
                      rows={2}
                      size="sm"
                      value={s.value as string}
                    />
                  ) : (
                    <Input
                      id={fid}
                      onChange={(e) => onEdit(f.key, e.target.value)}
                      placeholder={f.placeholder}
                      size="sm"
                      value={s.value as string}
                    />
                  )}
                </motion.div>
              </div>
            );
          })}
        </div>
      </form>
    </div>
  );
}

function ChipsField({
  id,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  value: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState("");
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && draft.trim()) {
      e.preventDefault();
      onChange([...value, draft.trim()]);
      setDraft("");
    } else if (e.key === "Backspace" && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };
  return (
    <div className="flex min-h-8.5 flex-wrap items-center gap-1 rounded-lg border border-input bg-background px-1 py-[3px] shadow-xs/5 sm:min-h-7 focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/24 dark:bg-input/32">
      <AnimatePresence initial={false} mode="popLayout">
        {value.map((v) => (
          <motion.span
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex h-6 items-center gap-0.5 rounded-md bg-muted ps-2 pe-0.5 text-xs sm:h-5"
            exit={{ opacity: 0, scale: 0.8 }}
            initial={{ opacity: 0, scale: 0.8 }}
            key={v}
            layout
            transition={{ type: "spring", stiffness: 500, damping: 32 }}
          >
            {v}
            <button
              aria-label={`Remove ${v}`}
              className="relative flex size-4 cursor-pointer items-center justify-center rounded text-muted-foreground outline-none after:absolute after:-inset-2 hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => onChange(value.filter((x) => x !== v))}
              type="button"
            >
              ×
            </button>
          </motion.span>
        ))}
      </AnimatePresence>
      <input
        className="h-6 min-w-10 flex-1 bg-transparent px-1.5 text-base outline-none placeholder:text-muted-foreground/72 sm:h-5 sm:text-sm"
        id={id}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={value.length ? "" : placeholder}
        value={draft}
      />
    </div>
  );
}

export function Conductor({
  agentName = "Conductor",
  briefTitle = "Launch brief",
  fields = defaultFields,
  agents = defaultAgents,
  channelOptions = defaultChannels,
  autoPlay = true,
  className,
}: ConductorProps) {
  const [state, dispatch] = useReducer(reducer, undefined, () => initial(fields, agents));
  const [picks, setPicks] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [mode, setMode] = useState<"narrow" | "mid" | "wide">("wide");
  const [pane, setPane] = useState<"chat" | "brief" | "agents">("chat");
  const [side, setSide] = useState<"brief" | "agents">("brief");
  const [finishing, setFinishing] = useState(-1);
  const [handedOff, setHandedOff] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const group = useId();

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const w = e.contentRect.width;
      setMode(w < 768 ? "narrow" : w < 1100 ? "mid" : "wide");
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!autoPlay || state.cue >= script.length) return;
    const t = setTimeout(() => dispatch({ type: "cue", cue: script[state.cue] }), reduce ? 150 : script[state.cue].wait);
    return () => clearTimeout(t);
  }, [autoPlay, state.cue, reduce]);

  useEffect(() => {
    if (finishing < 0 || finishing >= finish.length) return;
    const t = setTimeout(() => {
      dispatch({ type: "cue", cue: finish[finishing] });
      setFinishing((f) => f + 1);
    }, finish[finishing].wait);
    return () => clearTimeout(t);
  }, [finishing]);

  const streaming = state.msgs.some((m) => m.shown < m.text.length) || Object.values(state.fields).some((f) => f.target && typeof f.value === "string" && f.value.length < f.target.length);
  useEffect(() => {
    if (!streaming) return;
    const t = setInterval(() => dispatch({ type: "type" }), reduce ? 5 : 28);
    return () => clearInterval(t);
  }, [streaming, reduce]);

  const working = Object.values(state.agents).some((a) => a.status === "working");
  useEffect(() => {
    if (!working) return;
    const t = setInterval(() => dispatch({ type: "tick", agents }), 420);
    return () => clearInterval(t);
  }, [working, agents]);

  const lastAgent = [...state.msgs].reverse().find((m) => m.role === "agent");
  const asking = Boolean(state.waiting && lastAgent?.ask && lastAgent.shown >= lastAgent.text.length);

  const msgCount = state.msgs.length;
  const lastShown = state.msgs.at(-1)?.shown ?? 0;
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const toBottom = () => el.scrollTo({ top: el.scrollHeight, behavior: reduce ? "auto" : "smooth" });
    toBottom();
    // The channel picker grows the footer; follow it so the question stays in view.
    const t = setTimeout(toBottom, 260);
    return () => clearTimeout(t);
  }, [msgCount, lastShown, asking, reduce]);

  const reset = () => {
    dispatch({ type: "reset", fields, agents });
    setPicks([]);
    setFinishing(-1);
    setHandedOff(false);
  };

  const sendChannels = () => {
    if (!picks.length) return;
    dispatch({ type: "channels", picks });
    setPicks([]);
    setFinishing(0);
  };

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    if (asking) {
      dispatch({ type: "channels", picks: text.split(/,|\band\b/).map((x) => x.trim()).filter(Boolean) });
      setPicks([]);
      setFinishing(0);
    } else {
      dispatch({ type: "say", text });
    }
    setDraft("");
  };

  const allDone = state.done && Object.values(state.agents).every((a) => a.status === "done" || a.status === "queued") && !working;
  const anyWorking = Object.values(state.agents).filter((a) => a.status === "working").length;
  const needsYou = Object.values(state.agents).some((a) => a.status === "waiting");

  const chat = (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-2xl flex-col gap-5 px-4 py-6 @3xl:px-6">
          {state.msgs.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
              <LoaderCircleIcon className="size-5 animate-spin motion-reduce:animate-none" />
              Starting a session…
            </div>
          )}
          <AnimatePresence initial={false}>
            {state.msgs.map((m) => (
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className={cn("flex gap-3", m.role === "user" && "justify-end")}
                initial={{ opacity: 0, y: 8 }}
                key={m.id}
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              >
                {m.role === "agent" && (
                  <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
                    <WorkflowIcon className="size-3.5" />
                  </span>
                )}
                <div className={cn("flex min-w-0 flex-col gap-2", m.role === "user" ? "max-w-[82%] items-end" : "flex-1")}>
                  <div
                    className={cn(
                      "leading-relaxed",
                      m.role === "user" && "rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-primary-foreground",
                    )}
                  >
                    {m.text.slice(0, m.shown)}
                    {m.shown < m.text.length && (
                      <span className="ms-0.5 inline-block h-3.5 w-1.5 translate-y-0.5 animate-pulse rounded-sm bg-foreground/60 motion-reduce:animate-none" />
                    )}
                  </div>
                  {m.role === "agent" && m.shown >= m.text.length && (m.spawned?.length || m.updated) && (
                    <motion.div animate={{ opacity: 1, y: 0 }} className="flex flex-wrap gap-1.5" initial={{ opacity: 0, y: 4 }}>
                      {m.updated ? (
                        <button
                          className="inline-flex h-6 cursor-pointer items-center gap-1.5 rounded-full border bg-card px-2 text-muted-foreground text-xs outline-none transition-[color,scale] duration-150 ease-out hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97] dark:bg-muted/40"
                          onClick={() => (mode === "narrow" ? setPane("brief") : setSide("brief"))}
                          type="button"
                        >
                          <SparklesIcon className="size-3 text-info" />
                          Updated {m.updated} {m.updated === 1 ? "field" : "fields"}
                        </button>
                      ) : null}
                      {m.spawned?.map((sid) => {
                        const a = agents.find((x) => x.id === sid);
                        if (!a) return null;
                        return (
                          <button
                            className="inline-flex h-6 cursor-pointer items-center gap-1.5 rounded-full border bg-card px-2 text-muted-foreground text-xs outline-none transition-[color,scale] duration-150 ease-out hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97] dark:bg-muted/40"
                            key={sid}
                            onClick={() => (mode === "narrow" ? setPane("agents") : setSide("agents"))}
                            type="button"
                          >
                            <span className={cn("size-1.5 rounded-full", tone[a.tone].dot)} />
                            Started {a.name}
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      <div className="px-4 pb-4 @3xl:px-6">
        <div className="mx-auto max-w-2xl">
          <AnimatePresence initial={false}>
            {asking && (
              <motion.div
                animate={{ opacity: 1, height: "auto" }}
                className="overflow-hidden"
                exit={{ opacity: 0, height: 0 }}
                initial={{ opacity: 0, height: 0 }}
              >
                <div className="flex flex-wrap items-center gap-1.5 pb-2.5" role="group" aria-label="Pick channels">
                  {channelOptions.map((c) => {
                    const on = picks.includes(c);
                    return (
                      <motion.button
                        aria-pressed={on}
                        className={cn(
                          "inline-flex h-7 cursor-pointer items-center gap-1 rounded-full border px-2.5 text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                          on ? "border-foreground bg-foreground text-background" : "bg-card hover:bg-accent",
                        )}
                        key={c}
                        layout
                        onClick={() => setPicks((p) => (on ? p.filter((x) => x !== c) : [...p, c]))}
                        type="button"
                        whileTap={{ scale: 0.97 }}
                      >
                        {on && <CheckIcon className="size-3" />}
                        {c}
                      </motion.button>
                    );
                  })}
                  <Button className="ms-auto" disabled={!picks.length} onClick={sendChannels} size="xs">
                    <SendIcon />
                    Use {picks.length || ""}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <form
            className="flex items-end gap-2 rounded-2xl border bg-card p-2 shadow-xs/5 transition-shadow focus-within:border-ring/64 focus-within:ring-[3px] focus-within:ring-ring/16"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <label className="sr-only" htmlFor={`${group}-msg`}>
              Message {agentName}
            </label>
            <textarea
              className="field-sizing-content max-h-28 min-h-8 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground/72"
              id={`${group}-msg`}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder={asking ? "Or type the channels…" : `Talk to ${agentName}…`}
              rows={1}
              value={draft}
            />
            <Button aria-label="Send" className="rounded-full" disabled={!draft.trim()} size="icon-sm" type="submit">
              <ArrowUpIcon />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );

  const brief = (
    <BriefForm
      agentName={agentName}
      fields={fields}
      onEdit={(key, value) => dispatch({ type: "edit", key, value })}
      state={state}
      title={briefTitle}
    />
  );
  const panel = <AgentPanel agents={agents} state={state} />;

  const segmented = (options: { id: string; label: string; badge?: number | boolean }[], value: string, onChange: (v: string) => void, layoutKey: string) => (
    <LayoutGroup id={`${group}-${layoutKey}`}>
      <div className="flex rounded-lg bg-muted p-0.5" role="tablist">
        {options.map((o) => (
          <button
            aria-selected={value === o.id}
            className={cn(
              "relative flex h-7 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md px-3 font-medium text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring",
              value === o.id ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
            key={o.id}
            onClick={() => onChange(o.id)}
            role="tab"
            type="button"
          >
            {value === o.id && (
              <motion.span className="absolute inset-0 rounded-md bg-background shadow-sm/5 dark:bg-input" layoutId="seg" transition={{ type: "spring", stiffness: 500, damping: 36 }} />
            )}
            <span className="relative">{o.label}</span>
            {typeof o.badge === "number" && o.badge > 0 && (
              <span className="relative rounded-full bg-info/14 px-1.5 text-[10px] text-info-foreground tabular-nums">{o.badge}</span>
            )}
            {o.badge === true && <span className="relative size-1.5 rounded-full bg-warning" />}
          </button>
        ))}
      </div>
    </LayoutGroup>
  );

  return (
    <MotionConfig reducedMotion="user">
      <div
        className={cn(
          "@container relative flex h-[760px] w-full flex-col overflow-hidden bg-background text-foreground text-sm",
          className,
        )}
        ref={rootRef}
      >
        <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4">
          <span className="relative flex size-8 items-center justify-center rounded-full bg-foreground text-background">
            <WorkflowIcon className="size-4" />
            {anyWorking > 0 && (
              <span className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full bg-info ring-2 ring-background" />
            )}
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="font-medium">{agentName}</div>
            <div className="truncate text-muted-foreground text-xs" aria-live="polite">
              {needsYou
                ? "Waiting on one answer from you"
                : anyWorking
                  ? `Orchestrating ${anyWorking} ${anyWorking === 1 ? "agent" : "agents"}`
                  : allDone
                    ? handedOff
                      ? "Brief handed off to #launch-orbit"
                      : "Brief complete"
                    : "Listening"}
            </div>
          </div>
          {allDone && (
            <motion.div
              animate={{ opacity: 1, scale: 1 }}
              initial={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            >
              <Button
                className="hidden @md:inline-flex"
                disabled={handedOff}
                onClick={() => setHandedOff(true)}
                size="sm"
                variant={handedOff ? "outline" : "default"}
              >
                {handedOff ? <CheckIcon /> : <SendIcon />}
                {handedOff ? "Handed off" : "Hand off brief"}
              </Button>
            </motion.div>
          )}
          <Button aria-label="Replay conversation" onClick={reset} size="icon-sm" variant="ghost">
            <RotateCcwIcon />
          </Button>
        </header>

        {mode === "narrow" && (
          <div className="border-b px-4 py-2">
            {segmented(
              [
                { id: "chat", label: "Chat" },
                { id: "brief", label: "Brief" },
                { id: "agents", label: "Agents", badge: needsYou || anyWorking },
              ],
              pane,
              (v) => setPane(v as typeof pane),
              "pane",
            )}
          </div>
        )}

        <div className="flex min-h-0 flex-1">
          {(mode !== "narrow" || pane === "chat") && <section aria-label="Conversation" className="min-w-0 flex-1">{chat}</section>}

          {mode === "wide" && (
            <>
              <section aria-label="Agents" className="w-72 shrink-0 border-s bg-muted/40 dark:bg-muted/24">
                {panel}
              </section>
              <section aria-label="Brief" className="w-[22rem] shrink-0 border-s">
                {brief}
              </section>
            </>
          )}

          {mode === "mid" && (
            <section aria-label="Brief and agents" className="flex w-[22rem] shrink-0 flex-col border-s">
              <div className="px-4 pt-3">
                {segmented(
                  [
                    { id: "brief", label: "Brief" },
                    { id: "agents", label: "Agents", badge: needsYou || anyWorking },
                  ],
                  side,
                  (v) => setSide(v as typeof side),
                  "side",
                )}
              </div>
              <div className="min-h-0 flex-1">{side === "brief" ? brief : panel}</div>
            </section>
          )}

          {mode === "narrow" && pane === "brief" && <section className="min-w-0 flex-1">{brief}</section>}
          {mode === "narrow" && pane === "agents" && <section className="min-w-0 flex-1">{panel}</section>}
        </div>
      </div>
    </MotionConfig>
  );
}
