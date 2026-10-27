"use client";

import { AnimatePresence, LayoutGroup, MotionConfig, motion, useReducedMotion } from "motion/react";
import {
  ArrowUpIcon,
  CalendarIcon,
  CheckIcon,
  CircleDashedIcon,
  FileTextIcon,
  GaugeIcon,
  HandIcon,
  LoaderCircleIcon,
  MegaphoneIcon,
  MessageSquareQuoteIcon,
  RotateCcwIcon,
  SendIcon,
  SparklesIcon,
  UsersIcon,
  WalletIcon,
  WorkflowIcon,
} from "lucide-react";
import { type ComponentType, type KeyboardEvent, type ReactNode, useEffect, useId, useReducer, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
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
  seq: number;
  waiting: boolean;
  done: boolean;
}

const tone: Record<AgentTone, { dot: string; soft: string; stroke: string }> = {
  orange: { dot: "bg-orange-500", soft: "bg-orange-500/14 text-orange-700 dark:text-orange-300", stroke: "stroke-orange-500" },
  teal: { dot: "bg-teal-500", soft: "bg-teal-500/14 text-teal-700 dark:text-teal-300", stroke: "stroke-teal-500" },
  violet: { dot: "bg-violet-500", soft: "bg-violet-500/16 text-violet-700 dark:text-violet-300", stroke: "stroke-violet-500" },
  rose: { dot: "bg-rose-500", soft: "bg-rose-500/14 text-rose-700 dark:text-rose-300", stroke: "stroke-rose-500" },
  info: { dot: "bg-info", soft: "bg-info/14 text-info-foreground", stroke: "stroke-info" },
};

const fieldIcons: Record<string, ComponentType<{ className?: string }>> = {
  date: CalendarIcon,
  audience: UsersIcon,
  budget: WalletIcon,
  metric: GaugeIcon,
  tone: MessageSquareQuoteIcon,
  channels: MegaphoneIcon,
};

const defaultAgents: SubAgent[] = [
  { id: "scout", name: "Scout", role: "Research", tone: "teal", actions: ["Reading 12 agency launch posts", "Comparing 4 calendar tools", "Summarising what worked"], result: "3 launch patterns from 12 posts" },
  { id: "ledger", name: "Ledger", role: "Budget", tone: "violet", actions: ["Splitting $40k across channels", "Checking cost-per-trial benchmarks", "Drafting the budget table"], result: "Budget table, $18 per trial" },
  { id: "quill", name: "Quill", role: "Copy", tone: "orange", actions: ["Drafting six taglines", "Writing launch email v1", "Needs channels to finish"], result: "6 taglines and launch email v1" },
  { id: "iris", name: "Iris", role: "Design", tone: "info", actions: ["Sizing assets per channel", "Pulling a warm palette", "Exporting the moodboard"], result: "14 assets sized for 2 channels" },
];

const defaultFields: BriefField[] = [
  { key: "project", label: "Project", kind: "text", placeholder: "Untitled launch" },
  { key: "date", label: "Launch date", kind: "text", placeholder: "Empty" },
  { key: "audience", label: "Audience", kind: "chips" },
  { key: "budget", label: "Budget", kind: "text", placeholder: "Empty" },
  { key: "goal", label: "Goal", kind: "textarea", placeholder: "One sentence on why this matters" },
  { key: "metric", label: "Target", kind: "text", placeholder: "Empty" },
  { key: "tone", label: "Voice", kind: "text", placeholder: "Empty" },
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

const ease = [0.23, 1, 0.32, 1] as const;

function initial(fields: BriefField[], agents: SubAgent[]): State {
  return {
    msgs: [],
    fields: Object.fromEntries(fields.map((f) => [f.key, { value: f.kind === "chips" ? [] : "" }])),
    agents: Object.fromEntries(agents.map((a) => [a.id, { status: "queued" as Status, progress: 0, step: 0 }])),
    cue: 0,
    seq: 0,
    waiting: false,
    done: false,
  };
}

function apply(state: State, cue: Cue): State {
  const seq = state.seq + 1;
  const id = `m${seq}`;
  if ("user" in cue) {
    return { ...state, seq, msgs: [...state.msgs, { id, role: "user", text: cue.user, shown: cue.user.length }] };
  }
  if ("agent" in cue) {
    const msg: Msg = { id, role: "agent", text: cue.agent, shown: 0, spawned: cue.spawned, updated: cue.updated, ask: cue.ask };
    return { ...state, seq, msgs: [...state.msgs, msg], waiting: Boolean(cue.ask) };
  }
  if ("fill" in cue) {
    const fields = { ...state.fields };
    for (const [k, v] of Object.entries(cue.fill)) {
      fields[k] = Array.isArray(v)
        ? { value: v, by: "agent", flash: seq }
        : { value: "", target: v, by: "agent", flash: seq };
    }
    return { ...state, seq, fields };
  }
  const agents = { ...state.agents };
  for (const aid of cue.start) agents[aid] = { ...agents[aid], status: "working" };
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
        seq: state.seq + 2,
        msgs: [
          ...state.msgs,
          { id: `m${state.seq + 1}`, role: "user", text: action.text, shown: action.text.length },
          {
            id: `m${state.seq + 2}`,
            role: "agent",
            text: "Noted. I'll pass that to the helpers so they pick it up on their next pass.",
            shown: 0,
          },
        ],
      };
    case "channels": {
      const agents = { ...state.agents };
      if (agents.quill?.status === "waiting") agents.quill = { ...agents.quill, status: "working" };
      const text = action.picks.join(", ");
      const seq = state.seq + 1;
      return {
        ...state,
        seq,
        waiting: false,
        done: true,
        agents,
        msgs: [...state.msgs, { id: `m${seq}`, role: "user", text, shown: text.length }],
        fields: { ...state.fields, channels: { value: action.picks, by: "agent", flash: seq } },
      };
    }
    case "reset":
      return initial(action.fields, action.agents);
  }
}

function statusLabel(s: AgentState, a: SubAgent) {
  if (s.status === "done") return a.result ?? "Finished";
  if (s.status === "queued") return "Queued";
  return a.actions[s.step];
}

function AgentMark({ agent, state, size = "md" }: { agent: SubAgent; state: AgentState; size?: "sm" | "md" }) {
  const reduce = useReducedMotion();
  const t = tone[agent.tone];
  const sm = size === "sm";
  return (
    <span className={cn("relative shrink-0", sm ? "size-6" : "size-8")}>
      {!sm && (
        <svg aria-hidden className="absolute inset-0 size-8 -rotate-90" viewBox="0 0 32 32">
          <circle className="stroke-border" cx="16" cy="16" fill="none" r="15" strokeWidth="1.5" />
          <motion.circle
            animate={{ pathLength: state.status === "queued" ? 0 : state.progress / 100 }}
            className={cn("transition-colors duration-300", state.status === "done" ? "stroke-success" : state.status === "waiting" ? "stroke-warning" : t.stroke)}
            cx="16"
            cy="16"
            fill="none"
            initial={false}
            r="15"
            strokeLinecap="round"
            strokeWidth="1.5"
            transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 120, damping: 24 }}
          />
        </svg>
      )}
      <span
        className={cn(
          "absolute flex items-center justify-center rounded-full font-semibold",
          sm ? "inset-0 text-[10px]" : "inset-[4px] text-[11px]",
          t.soft,
        )}
      >
        {agent.name[0]}
      </span>
      <AnimatePresence>
        {!sm && state.status === "done" && (
          <motion.span
            animate={{ opacity: 1, scale: 1 }}
            className="absolute -right-0.5 -bottom-0.5 flex size-3.5 items-center justify-center rounded-full bg-success text-white ring-2 ring-background"
            initial={{ opacity: 0, scale: 0.6 }}
            transition={{ type: "spring", stiffness: 500, damping: 28 }}
          >
            <CheckIcon className="size-2.5" strokeWidth={3} />
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

function AgentPanel({ agents, state }: { agents: SubAgent[]; state: State }) {
  const active = agents.filter((a) => state.agents[a.id]?.status !== "queued" || state.msgs.some((m) => m.spawned?.includes(a.id)));
  const working = agents.filter((a) => state.agents[a.id]?.status === "working").length;
  const waiting = agents.filter((a) => state.agents[a.id]?.status === "waiting").length;
  const done = active.length > 0 && active.every((a) => state.agents[a.id]?.status === "done");
  const summary = working ? `${working} working` : waiting ? `${waiting} needs you` : done ? `All ${active.length} done` : active.length ? "Idle" : "None yet";
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-11 shrink-0 items-center gap-2 px-4">
        <span className="font-medium">Helpers</span>
        <span className="ms-auto flex items-center gap-1.5 text-muted-foreground text-xs tabular-nums" aria-live="polite">
          <span
            className={cn(
              "size-1.5 rounded-full transition-colors",
              working ? "animate-pulse bg-info motion-reduce:animate-none" : waiting ? "bg-warning" : done ? "bg-success" : "bg-muted-foreground/40",
            )}
          />
          {summary}
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {active.length === 0 ? (
          <div className="mx-2 mt-1 flex flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-8 text-center text-muted-foreground text-xs">
            <CircleDashedIcon className="size-4" />
            Helpers show up here as work is handed out.
          </div>
        ) : (
          <ul className="flex flex-col">
            <AnimatePresence initial={false}>
              {active.map((a) => {
                const s = state.agents[a.id];
                return (
                  <motion.li
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-3 rounded-lg px-2 py-2.5"
                    initial={{ opacity: 0, y: 6 }}
                    key={a.id}
                    layout="position"
                    transition={{ duration: 0.24, ease }}
                  >
                    <AgentMark agent={a} state={s} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-medium">{a.name}</span>
                        <span className="truncate text-muted-foreground text-xs">{a.role}</span>
                        <span
                          className={cn(
                            "ms-auto shrink-0 text-xs tabular-nums",
                            s.status === "waiting" ? "font-medium text-warning-foreground" : "text-muted-foreground",
                          )}
                        >
                          {s.status === "waiting" ? "Needs you" : s.status === "done" ? "Done" : s.status === "queued" ? "" : `${s.progress}%`}
                        </span>
                      </div>
                      <div className={cn("relative mt-0.5 h-4 overflow-hidden text-xs", s.status === "done" ? "text-foreground/80" : "text-muted-foreground")}>
                        <AnimatePresence initial={false} mode="popLayout">
                          <motion.span
                            animate={{ y: 0, opacity: 1 }}
                            className="block truncate"
                            exit={{ y: -10, opacity: 0 }}
                            initial={{ y: 10, opacity: 0 }}
                            key={s.status === "done" ? "done" : s.step}
                            transition={{ duration: 0.22, ease }}
                          >
                            {statusLabel(s, a)}
                          </motion.span>
                        </AnimatePresence>
                      </div>
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

function Flash({ seq }: { seq?: number }) {
  const mounted = useRef(seq);
  return (
    <AnimatePresence>
      {seq && seq !== mounted.current ? (
        <motion.span
          animate={{ opacity: 0 }}
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-md bg-info/14"
          initial={{ opacity: 1 }}
          key={seq}
          transition={{ duration: 1.4, ease: "easeOut" }}
        />
      ) : null}
    </AnimatePresence>
  );
}

function Provenance({ by, agentName }: { by?: "agent" | "you"; agentName: string }) {
  if (by !== "agent") return null;
  return (
    <span className="ms-auto inline-flex shrink-0 items-center text-info" title={`Filled by ${agentName}`}>
      <SparklesIcon aria-hidden className="size-3" />
      <span className="sr-only">Filled by {agentName}</span>
    </span>
  );
}

function BriefDoc({
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
  const pct = filled / fields.length;
  const head = fields.find((f) => f.kind === "text");
  const props = fields.filter((f) => f !== head && f.kind !== "textarea");
  const sections = fields.filter((f) => f.kind === "textarea");
  const headState = head ? state.fields[head.key] : undefined;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-11 shrink-0 items-center gap-2 px-5">
        <FileTextIcon className="size-4 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate font-medium">{title}</span>
        <span className="text-muted-foreground text-xs tabular-nums">
          {filled} of {fields.length}
        </span>
        <span className="h-1 w-12 overflow-hidden rounded-full bg-muted">
          <motion.span
            animate={{ scaleX: pct }}
            className={cn("block h-full origin-left rounded-full transition-colors duration-300", pct === 1 ? "bg-success" : "bg-foreground")}
            initial={false}
            transition={{ type: "spring", stiffness: 160, damping: 26 }}
          />
        </span>
      </div>
      <form className="min-h-0 flex-1 overflow-y-auto px-5 pt-3 pb-6" onSubmit={(e) => e.preventDefault()}>
        {head && (
          <div className="relative -mx-2">
            <label className="sr-only" htmlFor={`${id}-${head.key}`}>
              {head.label}
            </label>
            <input
              className="h-10 w-full rounded-md bg-transparent px-2 font-semibold text-xl tracking-tight outline-none transition-colors placeholder:text-muted-foreground/56 hover:bg-accent/50 focus-visible:bg-accent/60"
              id={`${id}-${head.key}`}
              onChange={(e) => onEdit(head.key, e.target.value)}
              placeholder={head.placeholder}
              value={(headState?.value as string) ?? ""}
            />
            <Flash seq={headState?.flash} />
          </div>
        )}
        <p className="mt-1 text-pretty text-muted-foreground text-xs">
          {agentName} fills this in as you talk. Anything you edit stays yours.
        </p>

        <dl className="mt-5 flex flex-col gap-0.5">
          {props.map((f) => {
            const s = state.fields[f.key] ?? { value: "" };
            const fid = `${id}-${f.key}`;
            const Icon = fieldIcons[f.key] ?? CircleDashedIcon;
            return (
              <div className="grid min-h-8 grid-cols-[6.25rem_minmax(0,1fr)] items-start gap-1.5 @md:grid-cols-[7rem_minmax(0,1fr)]" key={f.key}>
                <dt className="flex h-8 items-center gap-2 text-muted-foreground">
                  <Icon className={cn("size-3.5 shrink-0 transition-colors duration-300", s.by === "agent" && "text-info")} />
                  <label className="truncate" htmlFor={fid}>
                    {f.label}
                  </label>
                  {s.by === "agent" && <span className="sr-only">, filled by {agentName}</span>}
                </dt>
                <dd className="relative">
                  {f.kind === "chips" ? (
                    <ChipsField
                      id={fid}
                      onChange={(v) => onEdit(f.key, v)}
                      placeholder={f.key === "channels" ? "Waiting on your pick" : "Add and press Enter"}
                      value={Array.isArray(s.value) ? s.value : []}
                    />
                  ) : (
                    <div className="flex h-8 items-center gap-2 rounded-md px-2 transition-colors focus-within:bg-accent/60 hover:bg-accent/50">
                      <input
                        className="h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground/56"
                        id={fid}
                        onChange={(e) => onEdit(f.key, e.target.value)}
                        placeholder={f.placeholder ?? "Empty"}
                        value={s.value as string}
                      />
                    </div>
                  )}
                  <Flash seq={s.flash} />
                </dd>
              </div>
            );
          })}
        </dl>

        {sections.map((f) => {
          const s = state.fields[f.key] ?? { value: "" };
          const fid = `${id}-${f.key}`;
          return (
            <div className="mt-5 border-t pt-4" key={f.key}>
              <div className="flex items-center gap-2">
                <label className="font-medium text-xs" htmlFor={fid}>
                  {f.label}
                </label>
                <Provenance agentName={agentName} by={s.by} />
              </div>
              <div className="relative -mx-2 mt-1">
                <textarea
                  className="field-sizing-content min-h-16 w-full resize-none rounded-md bg-transparent px-2 py-1.5 leading-relaxed outline-none transition-colors placeholder:text-muted-foreground/56 hover:bg-accent/50 focus-visible:bg-accent/60"
                  id={fid}
                  onChange={(e) => onEdit(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  value={s.value as string}
                />
                <Flash seq={s.flash} />
              </div>
            </div>
          );
        })}
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
      if (!value.includes(draft.trim())) onChange([...value, draft.trim()]);
      setDraft("");
    } else if (e.key === "Backspace" && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };
  return (
    <div className="flex min-h-8 flex-wrap items-center gap-1 rounded-md px-1.5 py-1 transition-colors focus-within:bg-accent/60 hover:bg-accent/50">
      <AnimatePresence initial={false} mode="popLayout">
        {value.map((v) => (
          <motion.span
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex h-6 items-center gap-0.5 rounded-md border bg-background ps-2 pe-0.5 text-xs shadow-xs/5 dark:bg-input/40"
            exit={{ opacity: 0, scale: 0.9 }}
            initial={{ opacity: 0, scale: 0.9 }}
            key={v}
            layout
            transition={{ type: "spring", stiffness: 500, damping: 34 }}
          >
            {v}
            <button
              aria-label={`Remove ${v}`}
              className="relative flex size-4 cursor-pointer items-center justify-center rounded text-muted-foreground outline-none after:absolute after:-inset-1.5 hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => onChange(value.filter((x) => x !== v))}
              type="button"
            >
              ×
            </button>
          </motion.span>
        ))}
      </AnimatePresence>
      <input
        className="h-6 min-w-12 flex-1 bg-transparent px-0.5 text-base outline-none placeholder:text-muted-foreground/56 sm:text-sm"
        id={id}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={value.length ? "" : placeholder}
        value={draft}
      />
    </div>
  );
}

function ActivityRows({
  msg,
  agents,
  state,
  briefTitle,
  onOpen,
}: {
  msg: Msg;
  agents: SubAgent[];
  state: State;
  briefTitle: string;
  onOpen: (pane: "brief" | "agents") => void;
}) {
  const rows: { key: string; pane: "brief" | "agents"; icon: ReactNode; label: ReactNode; meta: ReactNode }[] = [];
  if (msg.updated) {
    rows.push({
      key: "brief",
      pane: "brief",
      icon: <FileTextIcon className="size-3.5 text-muted-foreground" />,
      label: (
        <>
          Filled {msg.updated} {msg.updated === 1 ? "field" : "fields"} in <span className="font-medium text-foreground">{briefTitle}</span>
        </>
      ),
      meta: <SparklesIcon className="size-3 text-info" />,
    });
  }
  for (const sid of msg.spawned ?? []) {
    const a = agents.find((x) => x.id === sid);
    const s = state.agents[sid];
    if (!a || !s) continue;
    rows.push({
      key: sid,
      pane: "agents",
      icon: <AgentMark agent={a} size="sm" state={s} />,
      label: (
        <>
          Asked <span className="font-medium text-foreground">{a.name}</span> to help with {a.role.toLowerCase()}
        </>
      ),
      meta:
        s.status === "done" ? (
          <span className="inline-flex items-center gap-1 text-success-foreground">
            <CheckIcon className="size-3" />
            Done
          </span>
        ) : s.status === "waiting" ? (
          <span className="inline-flex items-center gap-1 text-warning-foreground">
            <HandIcon className="size-3" />
            Needs you
          </span>
        ) : s.status === "working" ? (
          <span className="inline-flex items-center gap-1 tabular-nums">
            <LoaderCircleIcon className="size-3 animate-spin motion-reduce:animate-none" />
            {s.progress}%
          </span>
        ) : (
          "Queued"
        ),
    });
  }
  if (!rows.length) return null;
  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-xl border bg-card shadow-xs/5"
      initial={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.22, ease }}
    >
      {rows.map((r) => (
        <button
          className="flex h-9 w-full cursor-pointer items-center gap-2.5 border-b px-3 text-start text-muted-foreground text-xs outline-none transition-colors last:border-b-0 hover:bg-accent/50 focus-visible:bg-accent/60"
          key={r.key}
          onClick={() => onOpen(r.pane)}
          type="button"
        >
          <span className="flex size-6 shrink-0 items-center justify-center">{r.icon}</span>
          <span className="min-w-0 flex-1 truncate">{r.label}</span>
          <span className="shrink-0 text-muted-foreground">{r.meta}</span>
        </button>
      ))}
    </motion.div>
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
  const active = agents.filter((a) => state.agents[a.id]?.status !== "queued");
  const project = state.fields.project?.value;
  const threadTitle = state.fields.project?.target ?? (typeof project === "string" && project ? project : "New plan");

  const openPane = (p: "brief" | "agents") => (mode === "narrow" ? setPane(p) : mode === "mid" ? setSide(p) : undefined);

  const status = needsYou
    ? { dot: "bg-warning", text: "Waiting on you" }
    : anyWorking
      ? { dot: "bg-info animate-pulse motion-reduce:animate-none", text: `${anyWorking} ${anyWorking === 1 ? "helper" : "helpers"} working` }
      : allDone
        ? { dot: "bg-success", text: handedOff ? "Handed off to #launch-orbit" : "Brief complete" }
        : { dot: "bg-muted-foreground/40", text: "Listening" };

  const chat = (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-[40rem] flex-col gap-6 px-4 py-6 @3xl:px-8">
          {state.msgs.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
              <LoaderCircleIcon className="size-4 animate-spin motion-reduce:animate-none" />
              Starting a session…
            </div>
          )}
          <AnimatePresence initial={false}>
            {state.msgs.map((m) => (
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className={cn("flex", m.role === "user" ? "justify-end" : "gap-3")}
                initial={{ opacity: 0, y: 6 }}
                key={m.id}
                transition={{ duration: 0.26, ease }}
              >
                {m.role === "agent" && (
                  <span className="mt-px flex size-6 shrink-0 items-center justify-center rounded-md bg-foreground text-background">
                    <WorkflowIcon className="size-3.5" />
                  </span>
                )}
                {m.role === "user" ? (
                  <div className="max-w-[85%] rounded-2xl bg-muted px-3.5 py-2 leading-relaxed">{m.text}</div>
                ) : (
                  <div className="flex min-w-0 flex-1 flex-col gap-3">
                    <p className="text-pretty leading-relaxed">
                      {m.text.slice(0, m.shown)}
                      {m.shown < m.text.length && (
                        <span className="ms-0.5 inline-block h-3.5 w-1.5 translate-y-0.5 animate-pulse rounded-sm bg-foreground/50 motion-reduce:animate-none" />
                      )}
                    </p>
                    {m.shown >= m.text.length && (
                      <ActivityRows agents={agents} briefTitle={briefTitle} msg={m} onOpen={openPane} state={state} />
                    )}
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      <div className="px-4 pb-4 @3xl:px-8">
        <div className="mx-auto max-w-[40rem]">
          <div className="rounded-2xl border bg-card shadow-xs/5 transition-shadow focus-within:border-ring/64 focus-within:ring-[3px] focus-within:ring-ring/16">
            <AnimatePresence initial={false}>
              {asking && (
                <motion.div
                  animate={{ opacity: 1, height: "auto" }}
                  className="overflow-hidden"
                  exit={{ opacity: 0, height: 0 }}
                  initial={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.24, ease }}
                >
                  <div className="border-b px-3 pt-3 pb-3">
                    <div className="mb-2 flex items-center gap-2 text-muted-foreground text-xs">
                      <MegaphoneIcon className="size-3.5" />
                      Pick the channels to commit to
                      <span className="ms-auto tabular-nums">{picks.length ? `${picks.length} selected` : "Any number"}</span>
                    </div>
                    <div aria-label="Pick channels" className="flex flex-wrap items-center gap-1.5" role="group">
                      {channelOptions.map((c) => {
                        const on = picks.includes(c);
                        return (
                          <button
                            aria-pressed={on}
                            className={cn(
                              "inline-flex h-7 cursor-pointer items-center gap-1 rounded-full border px-2.5 text-xs outline-none transition-[background-color,color,border-color,scale] duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]",
                              on ? "border-foreground bg-foreground text-background" : "bg-background hover:bg-accent dark:bg-input/32",
                            )}
                            key={c}
                            onClick={() => setPicks((p) => (on ? p.filter((x) => x !== c) : [...p, c]))}
                            type="button"
                          >
                            {on && <CheckIcon className="size-3" />}
                            {c}
                          </button>
                        );
                      })}
                      <Button className="ms-auto" disabled={!picks.length} onClick={sendChannels} size="xs">
                        Use {picks.length ? picks.length : ""}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <form
              className="flex items-end gap-2 p-2"
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
            >
              <label className="sr-only" htmlFor={`${group}-msg`}>
                Message {agentName}
              </label>
              <textarea
                className="field-sizing-content max-h-28 min-h-8 flex-1 resize-none bg-transparent px-2 py-1.5 text-base outline-none placeholder:text-muted-foreground/72 sm:text-sm"
                id={`${group}-msg`}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder={asking ? "Or type the channels…" : `Reply to ${agentName}…`}
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
    </div>
  );

  const brief = (
    <BriefDoc
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
              <motion.span className="absolute inset-0 rounded-md bg-background shadow-xs/5 dark:bg-input" layoutId="seg" transition={{ type: "spring", stiffness: 500, damping: 38 }} />
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
        <header className="flex h-12 shrink-0 items-center gap-3 border-b px-4">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-foreground text-background">
              <WorkflowIcon className="size-3.5" />
            </span>
            <span className="hidden shrink-0 text-muted-foreground @md:inline">{agentName}</span>
            <span className="hidden text-muted-foreground/48 @md:inline">/</span>
            <span className="truncate font-medium">{threadTitle}</span>
            <span className="ms-1 hidden shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-muted-foreground text-xs @lg:inline-flex" aria-live="polite">
              <span className={cn("size-1.5 rounded-full", status.dot)} />
              {status.text}
            </span>
          </div>
          {active.length > 0 && (
            <button
              aria-label={`${active.length} helpers`}
              className="hidden cursor-pointer items-center -space-x-1.5 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring @md:flex"
              onClick={() => openPane("agents")}
              type="button"
            >
              <AnimatePresence initial={false}>
                {active.map((a) => (
                  <motion.span
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex rounded-full ring-2 ring-background"
                    initial={{ opacity: 0, scale: 0.9 }}
                    key={a.id}
                    transition={{ duration: 0.2, ease }}
                  >
                    <AgentMark agent={a} size="sm" state={state.agents[a.id]} />
                  </motion.span>
                ))}
              </AnimatePresence>
            </button>
          )}
          <AnimatePresence initial={false}>
            {allDone && (
              <motion.div
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                initial={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, ease }}
              >
                <Button
                  disabled={handedOff}
                  onClick={() => setHandedOff(true)}
                  size="sm"
                  variant={handedOff ? "outline" : "default"}
                >
                  {handedOff ? <CheckIcon /> : <SendIcon />}
                  {handedOff ? "Handed off" : "Hand off"}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
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
                { id: "agents", label: "Helpers", badge: needsYou || anyWorking },
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
              <section aria-label="Helpers" className="w-60 shrink-0 border-s bg-muted/32 dark:bg-muted/16">
                {panel}
              </section>
              <section aria-label="Brief" className="w-[25rem] shrink-0 border-s">
                {brief}
              </section>
            </>
          )}

          {mode === "mid" && (
            <section aria-label="Brief and helpers" className="flex w-[22rem] shrink-0 flex-col border-s">
              <div className="px-4 pt-3">
                {segmented(
                  [
                    { id: "brief", label: "Brief" },
                    { id: "agents", label: "Helpers", badge: needsYou || anyWorking },
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
