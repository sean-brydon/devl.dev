"use client";

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BotIcon,
  CalendarCheckIcon,
  CheckIcon,
  FlameIcon,
  GitBranchIcon,
  LifeBuoyIcon,
  type LucideIcon,
  MailIcon,
  MessagesSquareIcon,
  NotebookPenIcon,
  PenToolIcon,
  PlugIcon,
  PlusIcon,
  RotateCcwIcon,
  SparklesIcon,
  TableIcon,
  TelescopeIcon,
  UserPlusIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type KeyboardEvent, type ReactNode, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";

export type FirstRunTone = "orange" | "teal" | "violet" | "amber" | "rose" | "info" | "success" | "destructive";

export interface FirstRunTool {
  id: string;
  name: string;
  blurb: string;
  icon: LucideIcon;
  tone: FirstRunTone;
}

export interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  tone: FirstRunTone;
  instructions: string;
}

const softTone: Record<FirstRunTone, string> = {
  orange: "bg-orange-500/12 text-orange-700 dark:bg-orange-400/14 dark:text-orange-300",
  teal: "bg-teal-500/12 text-teal-700 dark:bg-teal-400/14 dark:text-teal-300",
  violet: "bg-violet-500/12 text-violet-700 dark:bg-violet-400/14 dark:text-violet-300",
  amber: "bg-amber-500/12 text-amber-700 dark:bg-amber-400/14 dark:text-amber-300",
  rose: "bg-rose-500/12 text-rose-700 dark:bg-rose-400/14 dark:text-rose-300",
  info: "bg-info/12 text-info-foreground",
  success: "bg-success/12 text-success-foreground",
  destructive: "bg-destructive/12 text-destructive-foreground",
};

const solidTone: Record<FirstRunTone, string> = {
  orange: "bg-orange-500",
  teal: "bg-teal-500",
  violet: "bg-violet-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  info: "bg-info",
  success: "bg-success",
  destructive: "bg-destructive",
};

const defaultTools: FirstRunTool[] = [
  { id: "relay", name: "Relay", blurb: "Team chat", icon: MessagesSquareIcon, tone: "info" },
  { id: "forge", name: "Forge", blurb: "Code & reviews", icon: GitBranchIcon, tone: "violet" },
  { id: "postbox", name: "Postbox", blurb: "Shared inbox", icon: MailIcon, tone: "orange" },
  { id: "gridline", name: "Gridline", blurb: "Spreadsheets", icon: TableIcon, tone: "success" },
  { id: "harbor", name: "Harbor Desk", blurb: "Support tickets", icon: LifeBuoyIcon, tone: "teal" },
  { id: "inkwell", name: "Inkwell", blurb: "Design files", icon: PenToolIcon, tone: "rose" },
];

const defaultTemplates: AgentTemplate[] = [
  {
    id: "triage",
    name: "Support triage",
    description: "Tags and drafts first replies",
    icon: LifeBuoyIcon,
    tone: "teal",
    instructions:
      "Read every new ticket. Tag it by product area and urgency, draft a friendly first reply, and escalate anything about billing to a human.",
  },
  {
    id: "research",
    name: "Research analyst",
    description: "Digs up sources, cites them",
    icon: TelescopeIcon,
    tone: "info",
    instructions:
      "When asked a question, search our docs and the web, compare at least three sources and answer with a short summary plus citations.",
  },
  {
    id: "standup",
    name: "Standup writer",
    description: "Daily digest from your tools",
    icon: NotebookPenIcon,
    tone: "orange",
    instructions:
      "Every weekday at 9:00, collect yesterday's merged work and open blockers, then post a three-bullet standup per person in #team.",
  },
  {
    id: "blank",
    name: "Start blank",
    description: "Write your own brief",
    icon: SparklesIcon,
    tone: "amber",
    instructions: "",
  },
];

const defaultUseCases = ["Support", "Engineering", "Sales", "Research", "Operations", "Marketing"];
const defaultSuggestions = ["maya@northwind.io", "theo@northwind.io", "ines@northwind.io"];
const swatches: { tone: FirstRunTone; label: string }[] = [
  { tone: "orange", label: "Orange" },
  { tone: "teal", label: "Teal" },
  { tone: "violet", label: "Violet" },
  { tone: "amber", label: "Amber" },
  { tone: "info", label: "Blue" },
  { tone: "rose", label: "Rose" },
];
const defaultTakenSlugs = ["northwind", "acme", "hearth", "admin"];
const defaultSlots = ["Tue, Oct 28 · 10:00", "Tue, Oct 28 · 14:30", "Wed, Oct 29 · 09:30", "Thu, Oct 30 · 16:00"];
const roleItems = { admin: "Admin", member: "Member", viewer: "Viewer" };
type Role = keyof typeof roleItems;
type ToolStatus = "idle" | "connecting" | "connected";

const spring = { type: "spring", stiffness: 420, damping: 38 } as const;
const easeOut = [0.23, 1, 0.32, 1] as const;
const press = "transition-[box-shadow,transform,background-color] duration-150 ease-out active:scale-[0.97]";
const STEPS = ["Workspace", "Tools", "Team", "Agent"];

function slugify(v: string) {
  return v
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

function initials(v: string) {
  const parts = v.trim().split(/[\s@._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

function useReducedMotionAfterMount() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && !!prefers;
}

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

function Rolling({ value }: { value: number | string }) {
  const reduce = useReducedMotionAfterMount();
  return (
    <span className="relative inline-flex overflow-hidden tabular-nums">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          animate={{ y: 0, opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { y: "-100%", opacity: 0 }}
          initial={reduce ? { opacity: 0 } : { y: "100%", opacity: 0 }}
          key={value}
          transition={spring}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

type StepStatus = "done" | "skipped" | "current" | "upcoming";

function Stepper({
  statuses,
  fill,
  maxReached,
  onJump,
}: {
  statuses: StepStatus[];
  fill: number;
  maxReached: number;
  onJump: (i: number) => void;
}) {
  const ids = useId();
  const reduce = useReducedMotionAfterMount();
  const col = 100 / STEPS.length;
  const t = reduce ? { duration: 0 } : { type: "spring" as const, stiffness: 320, damping: 36 };

  return (
    <div>
      <div className="relative h-8">
        <div
          aria-hidden
          className="absolute top-1/2 h-0.5 -translate-y-1/2 overflow-hidden rounded-full bg-border"
          style={{ left: `${col / 2}%`, right: `${col / 2}%` }}
        >
          <motion.div
            animate={{ scaleX: fill / (STEPS.length - 1) }}
            className="h-full origin-left rounded-full bg-primary"
            initial={false}
            transition={t}
          />
        </div>
        {STEPS.map((s, i) => {
          const st = statuses[i];
          const reachable = i <= maxReached && st !== "current";
          return (
            <button
              aria-current={st === "current" ? "step" : undefined}
              aria-label={`Step ${i + 1}: ${s}${st === "done" ? ", done" : st === "skipped" ? ", skipped" : ""}`}
              className={cn(
                "absolute top-1/2 flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border font-medium text-xs tabular-nums outline-none transition-[background-color,border-color,color,transform] duration-200 ease-out before:absolute before:-inset-1.5 before:rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                reachable ? "cursor-pointer active:scale-[0.94]" : "cursor-default",
                st === "done" && "border-primary bg-primary text-primary-foreground",
                st === "current" && "border-primary bg-background text-foreground",
                st === "skipped" && "border-muted-foreground/40 border-dashed bg-background text-muted-foreground",
                st === "upcoming" && "bg-background text-muted-foreground",
              )}
              disabled={!reachable}
              key={s}
              onClick={() => onJump(i)}
              style={{ left: `${col / 2 + col * i}%` }}
              type="button"
            >
              {st === "current" && (
                <motion.span
                  aria-hidden
                  className="pointer-events-none absolute -inset-[5px] rounded-full bg-primary/10"
                  layoutId={`${ids}-halo`}
                  transition={t}
                />
              )}
              <AnimatePresence initial={false} mode="popLayout">
                {st === "done" ? (
                  <motion.span
                    animate={{ scale: 1, opacity: 1 }}
                    className="relative"
                    exit={{ opacity: 0, transition: { duration: 0.1 } }}
                    initial={reduce ? { opacity: 0 } : { scale: 0.8, opacity: 0 }}
                    key="check"
                    transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                  >
                    <CheckIcon className="size-3.5" strokeWidth={2.75} />
                  </motion.span>
                ) : (
                  <motion.span
                    animate={{ opacity: 1 }}
                    className="relative"
                    exit={{ opacity: 0, transition: { duration: 0.1 } }}
                    initial={{ opacity: 0 }}
                    key="n"
                    transition={{ duration: 0.15 }}
                  >
                    {i + 1}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          );
        })}
      </div>
      <div className="mt-1.5 grid grid-cols-4">
        {STEPS.map((s, i) => (
          <span
            className={cn(
              "truncate text-center text-xs transition-colors duration-200",
              statuses[i] === "current" && "font-medium text-foreground",
              statuses[i] === "done" && "text-foreground",
              (statuses[i] === "skipped" || statuses[i] === "upcoming") && "text-muted-foreground",
            )}
            key={s}
          >
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}

function ProgressRing({ value, total, size = 40 }: { value: number; total: number; size?: number }) {
  const reduce = useReducedMotionAfterMount();
  const r = size / 2 - 3;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg aria-hidden className="-rotate-90" height={size} viewBox={`0 0 ${size} ${size}`} width={size}>
        <circle className="stroke-border" cx={size / 2} cy={size / 2} fill="none" r={r} strokeWidth={4} />
        <motion.circle
          animate={{ strokeDashoffset: c * (1 - value / total) }}
          className="stroke-success"
          cx={size / 2}
          cy={size / 2}
          fill="none"
          initial={false}
          r={r}
          strokeDasharray={c}
          strokeLinecap="round"
          strokeWidth={4}
          transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 220, damping: 32 }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-medium text-xs">
        <Rolling value={value} />
        <span className="text-muted-foreground">/{total}</span>
      </span>
    </div>
  );
}

function CheckDot({ checked }: { checked: boolean }) {
  const reduce = useReducedMotionAfterMount();
  return (
    <motion.span
      animate={checked && !reduce ? { scale: [1, 1.12, 1] } : { scale: 1 }}
      className={cn(
        "relative flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors duration-300",
        checked ? "border-success bg-success text-white" : "border-input bg-background",
      )}
      transition={{ duration: 0.3, times: [0, 0.4, 1], ease: "easeOut" }}
    >
      <svg aria-hidden className="size-3" fill="none" viewBox="0 0 24 24">
        <motion.path
          animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
          d="M5 12.5l4.5 4.5L19 7.5"
          initial={false}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={3.5}
          transition={reduce ? { duration: 0.15 } : { duration: 0.25, delay: checked ? 0.05 : 0, ease: "easeOut" }}
        />
      </svg>
    </motion.span>
  );
}

interface ChecklistItem {
  label: string;
  hint: string;
  done: boolean;
  step: number;
}

function Checklist({ items, onGo }: { items: ChecklistItem[]; onGo: (step: number) => void }) {
  const doneCount = items.filter((i) => i.done).length;
  const listId = useId();

  const list = (
    <ul className="flex flex-col gap-1" id={listId}>
      {items.map((item) => (
        <li key={item.label}>
          <button
            className="flex w-full cursor-pointer items-start gap-2.5 rounded-lg p-2 text-start outline-none transition-[background-color,transform] duration-150 ease-out hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]"
            onClick={() => onGo(item.step)}
            type="button"
          >
            <CheckDot checked={item.done} />
            <span className="min-w-0 flex-1">
              <span
                className={cn(
                  "block font-medium transition-colors",
                  item.done && "text-muted-foreground line-through decoration-muted-foreground/40",
                )}
              >
                {item.label}
              </span>
              <span className="block truncate text-muted-foreground text-xs">{item.hint}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );

  const header = (
    <>
      <ProgressRing total={items.length} value={doneCount} />
      <span className="min-w-0 flex-1 text-start">
        <span className="block font-medium">Getting started</span>
        <span className="block text-muted-foreground text-xs">
          {doneCount === items.length ? "All done, nice work" : `${items.length - doneCount} left to go`}
        </span>
      </span>
    </>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 px-2">{header}</div>
      {list}
    </div>
  );
}

function StepTitle({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-balance font-heading font-semibold text-lg tracking-tight">{title}</h2>
      <p className="text-pretty text-muted-foreground">{sub}</p>
    </div>
  );
}

function FieldLabelText({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label className="mb-1.5 block font-medium text-xs" htmlFor={htmlFor}>
      {children}
    </label>
  );
}

export interface FirstRunProps {
  productName?: string;
  domain?: string;
  defaultWorkspaceName?: string;
  useCases?: string[];
  tools?: FirstRunTool[];
  templates?: AgentTemplate[];
  inviteSuggestions?: string[];
  takenSlugs?: string[];
  walkthroughSlots?: string[];
  connectDelay?: number;
  onFinish?: (summary: { workspace: string; tools: string[]; invites: number; agent: string }) => void;
  className?: string;
}

export function FirstRun({
  productName = "Hearth",
  domain = "hearth.app",
  defaultWorkspaceName = "Northwind Labs",
  useCases = defaultUseCases,
  tools = defaultTools,
  templates = defaultTemplates,
  inviteSuggestions = defaultSuggestions,
  takenSlugs = defaultTakenSlugs,
  walkthroughSlots = defaultSlots,
  connectDelay = 1000,
  onFinish,
  className,
}: FirstRunProps) {
  const reduce = useReducedMotionAfterMount();
  const ids = useId();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [finished, setFinished] = useState(false);
  const [left, setLeft] = useState<number[]>([]);
  const [maxReached, setMaxReached] = useState(0);

  const [name, setName] = useState(defaultWorkspaceName);
  const [slug, setSlug] = useState(slugify(defaultWorkspaceName));
  const [slugEdited, setSlugEdited] = useState(false);
  const [picked, setPicked] = useState<string[]>(["Support"]);
  const [color, setColor] = useState<FirstRunTone>("teal");

  const [toolStatus, setToolStatus] = useState<Record<string, ToolStatus>>({});
  const timers = useRef<number[]>([]);

  const [draft, setDraft] = useState<string[]>([]);
  const [emailText, setEmailText] = useState("");
  const [emailError, setEmailError] = useState("");
  const [shake, setShake] = useState(0);
  const [role, setRole] = useState<Role>("member");
  const [invites, setInvites] = useState<{ email: string; role: Role }[]>([]);

  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [agentName, setAgentName] = useState(templates[0]?.name ?? "My agent");
  const [agentNameEdited, setAgentNameEdited] = useState(false);
  const [instructions, setInstructions] = useState(templates[0]?.instructions ?? "");

  useEffect(() => {
    const list = timers.current;
    return () => list.forEach((t) => window.clearTimeout(t));
  }, []);

  const connectedTools = tools.filter((t) => toolStatus[t.id] === "connected");
  const template = templates.find((t) => t.id === templateId) ?? templates[0];
  const slugTaken = takenSlugs.includes(slug);
  const workspaceValid = !!name.trim() && !!slug && !slugTaken;

  const doneByStep = [
    workspaceValid && (left.includes(0) || finished),
    connectedTools.length > 0,
    invites.length > 0,
    finished,
  ];
  const statuses: StepStatus[] = STEPS.map((_, i) =>
    !finished && i === step ? "current" : doneByStep[i] ? "done" : left.includes(i) ? "skipped" : "upcoming",
  );

  const checklist: ChecklistItem[] = [
    {
      label: "Name your workspace",
      hint: name.trim() ? `${domain}/${slug || "…"}` : "Pick a name and URL",
      done: doneByStep[0],
      step: 0,
    },
    {
      label: "Connect a tool",
      hint: connectedTools.length
        ? connectedTools.map((t) => t.name).join(", ")
        : left.includes(1)
          ? "Skipped for now"
          : `${tools
            .slice(0, 2)
            .map((t) => t.name)
            .join(", ")} and more`,
      done: doneByStep[1],
      step: 1,
    },
    {
      label: "Invite a teammate",
      hint: invites.length
        ? `${invites.length} invite${invites.length > 1 ? "s" : ""} sent`
        : left.includes(2)
          ? "Skipped for now"
          : "Work is better together",
      done: doneByStep[2],
      step: 2,
    },
    {
      label: "Create your first agent",
      hint: finished ? `${agentName} is live` : "Start from a template",
      done: doneByStep[3],
      step: 3,
    },
  ];

  const go = (target: number) => {
    setDir(finished || target > step ? 1 : -1);
    setFinished(false);
    setStep(target);
    setMaxReached((m) => Math.max(m, target));
  };

  const next = () => {
    setLeft((l) => (l.includes(step) ? l : [...l, step]));
    if (step === STEPS.length - 1) {
      setDir(1);
      setFinished(true);
      setMaxReached(STEPS.length - 1);
      onFinish?.({
        workspace: name,
        tools: connectedTools.map((t) => t.name),
        invites: invites.length,
        agent: agentName,
      });
      return;
    }
    go(step + 1);
  };

  const restart = () => {
    setFinished(false);
    setLeft([]);
    setMaxReached(0);
    setToolStatus({});
    setInvites([]);
    setDraft([]);
    setDir(-1);
    setStep(0);
  };

  const onName = (v: string) => {
    setName(v);
    if (!slugEdited) setSlug(slugify(v));
  };

  const toggleTool = (id: string) => {
    const s = toolStatus[id] ?? "idle";
    if (s === "connecting") return;
    if (s === "connected") {
      setToolStatus((m) => ({ ...m, [id]: "idle" }));
      return;
    }
    setToolStatus((m) => ({ ...m, [id]: "connecting" }));
    timers.current.push(window.setTimeout(() => setToolStatus((m) => ({ ...m, [id]: "connected" })), connectDelay));
  };

  const commitEmail = (raw: string) => {
    const v = raw.trim().replace(/,$/, "");
    if (!v) return true;
    if (!isEmail(v)) {
      setEmailError(`“${v}” doesn't look like an email`);
      setShake((n) => n + 1);
      return false;
    }
    setEmailError("");
    setDraft((d) => (d.includes(v) || invites.some((i) => i.email === v) ? d : [...d, v]));
    setEmailText("");
    return true;
  };

  const onEmailKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (["Enter", ",", " ", "Tab"].includes(e.key) && emailText.trim()) {
      e.preventDefault();
      commitEmail(emailText);
    } else if (e.key === "Backspace" && !emailText && draft.length) {
      setDraft((d) => d.slice(0, -1));
    }
  };

  const sendInvites = () => {
    const ok = commitEmail(emailText);
    if (!ok) return;
    const pending = [...draft, ...(isEmail(emailText.trim()) ? [emailText.trim()] : [])];
    if (!pending.length) return;
    setInvites((list) => [
      ...pending.filter((e) => !list.some((i) => i.email === e)).map((email) => ({ email, role })),
      ...list,
    ]);
    setDraft([]);
    setEmailText("");
  };

  const pickTemplate = (t: AgentTemplate) => {
    setTemplateId(t.id);
    setInstructions(t.instructions);
    if (!agentNameEdited) setAgentName(t.id === "blank" ? "My agent" : t.name);
  };

  const canNext = step === 0 ? workspaceValid : step === 3 ? !!agentName.trim() : true;
  const skipping = (step === 1 && !connectedTools.length) || (step === 2 && !invites.length);

  const variants = {
    enter: (d: number) => (reduce ? { opacity: 0 } : { opacity: 0, x: d * 32 }),
    center: { opacity: 1, x: 0 },
    exit: (d: number) => ({ opacity: 0, x: reduce ? 0 : d * -24, transition: { duration: 0.12 } }),
  };

  return (
    <div
      className={cn(
        "@container/screen relative isolate flex h-[760px] w-full overflow-hidden bg-background text-foreground text-sm",
        className,
      )}
    >
      <div className="@container flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3 @2xl:px-8">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <FlameIcon className="size-4" />
            </span>
            <span className="font-medium">{productName}</span>
            <span className="hidden text-muted-foreground @md:inline">/ Set up your workspace</span>
          </div>
          <span className="shrink-0 text-muted-foreground text-xs tabular-nums">
            {finished ? "Setup complete" : `Step ${step + 1} of ${STEPS.length}`}
          </span>
        </header>

        <div className="shrink-0 px-4 pt-5 pb-4 @2xl:px-8">
          <div className="mx-auto max-w-xl">
            <Stepper fill={finished ? STEPS.length - 1 : step} maxReached={maxReached} onJump={go} statuses={statuses} />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          <div className="mx-auto flex max-w-2xl flex-col gap-5 px-4 pt-2 pb-8 @2xl:px-8">
            <AnimatePresence custom={dir} initial={false} mode="wait">
              {finished ? (
                <FinishView
                  agentName={agentName}
                  color={color}
                  invites={invites.length}
                  key="finish"
                  onEdit={go}
                  tools={connectedTools}
                  url={`${domain}/${slug}`}
                  workspace={name}
                />
              ) : (
                <motion.section
                  animate="center"
                  custom={dir}
                  exit="exit"
                  initial="enter"
                  key={step}
                  transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 34 }}
                  variants={variants}
                >
                  {step === 0 && (
                    <>
                      <StepTitle sub="This is where your agents and your team will live." title="Name your workspace" />
                      <div className="flex flex-col gap-5">
                        <div className="flex items-center gap-4">
                          <span
                            className={cn(
                              "flex size-14 shrink-0 items-center justify-center rounded-2xl font-heading font-semibold text-lg text-white tabular-nums transition-colors duration-200 ease-out",
                              solidTone[color],
                            )}
                          >
                            {initials(name)}
                          </span>
                          <div>
                            <p className="mb-2 font-medium text-xs">Workspace colour</p>
                            <div aria-label="Workspace colour" className="-ms-1 flex flex-wrap gap-0.5" role="radiogroup">
                              {swatches.map((sw) => (
                                <button
                                  aria-checked={color === sw.tone}
                                  aria-label={sw.label}
                                  className="relative flex size-8 cursor-pointer items-center justify-center rounded-full outline-none transition-transform duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.92]"
                                  key={sw.tone}
                                  onClick={() => setColor(sw.tone)}
                                  role="radio"
                                  tabIndex={color === sw.tone ? 0 : -1}
                                  onKeyDown={(e) => {
                                    const d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
                                    if (!d) return;
                                    e.preventDefault();
                                    const idx = swatches.findIndex((x) => x.tone === color);
                                    const nextTone = swatches[(idx + d + swatches.length) % swatches.length].tone;
                                    setColor(nextTone);
                                    const btns = e.currentTarget.parentElement?.querySelectorAll("button");
                                    btns?.[(idx + d + swatches.length) % swatches.length]?.focus();
                                  }}
                                  type="button"
                                >
                                  {color === sw.tone && (
                                    <motion.span
                                      className="absolute inset-0.5 rounded-full border-2 border-foreground/70"
                                      layoutId={`${ids}-swatch`}
                                      transition={reduce ? { duration: 0 } : spring}
                                    />
                                  )}
                                  <span className={cn("size-5 rounded-full", solidTone[sw.tone])} />
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div>
                          <FieldLabelText htmlFor={`${ids}-name`}>Workspace name</FieldLabelText>
                          <Input
                            aria-describedby={`${ids}-name-hint`}
                            aria-invalid={!name.trim() || undefined}
                            id={`${ids}-name`}
                            onChange={(e) => onName(e.target.value)}
                            placeholder="Acme Inc."
                            value={name}
                          />
                          <p
                            className={cn("mt-1.5 text-xs", name.trim() ? "text-muted-foreground" : "text-destructive-foreground")}
                            id={`${ids}-name-hint`}
                          >
                            {name.trim() ? "Teammates see this in invites and emails." : "Give your workspace a name to continue."}
                          </p>
                        </div>
                        <div>
                          <FieldLabelText htmlFor={`${ids}-slug`}>Workspace URL</FieldLabelText>
                          <div
                            className={cn(
                              "flex w-full items-center overflow-hidden rounded-lg border border-input bg-background shadow-xs/5 focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/24",
                              (slugTaken || !slug) && "border-destructive/48 focus-within:border-destructive/64 focus-within:ring-destructive/16",
                            )}
                          >
                            <span className="shrink-0 border-e bg-muted px-2.5 py-1.5 text-muted-foreground">
                              {domain}/
                            </span>
                            <input
                              aria-describedby={`${ids}-slug-hint`}
                              aria-invalid={slugTaken || !slug || undefined}
                              className="h-8 min-w-0 flex-1 bg-transparent px-2.5 font-mono text-sm outline-none"
                              id={`${ids}-slug`}
                              onChange={(e) => {
                                setSlugEdited(true);
                                setSlug(slugify(e.target.value));
                              }}
                              value={slug}
                            />
                            <AnimatePresence initial={false} mode="popLayout">
                              {slug && (
                                <motion.span
                                  animate={{ scale: 1, opacity: 1 }}
                                  className={cn(
                                    "me-2.5 flex items-center gap-1 text-xs",
                                    slugTaken ? "text-destructive-foreground" : "text-success-foreground",
                                  )}
                                  exit={{ scale: 0.95, opacity: 0, transition: { duration: 0.1 } }}
                                  initial={reduce ? { opacity: 0 } : { scale: 0.95, opacity: 0 }}
                                  key={slugTaken ? "taken" : "free"}
                                  transition={{ duration: 0.18, ease: easeOut }}
                                >
                                  {slugTaken ? <XIcon className="size-3.5" /> : <CheckIcon className="size-3.5" />}
                                  <span className="hidden @md:inline">{slugTaken ? "Taken" : "Available"}</span>
                                </motion.span>
                              )}
                            </AnimatePresence>
                          </div>
                          <p
                            className={cn("mt-1.5 text-xs", slugTaken || !slug ? "text-destructive-foreground" : "text-muted-foreground")}
                            id={`${ids}-slug-hint`}
                          >
                            {!slug
                              ? "Pick a URL for your workspace."
                              : slugTaken
                                ? `${domain}/${slug} is taken. Try ${slug}-team?`
                                : slugEdited
                                  ? "Lowercase letters, numbers and dashes."
                                  : "Filled in from the name. Edit it if you like."}
                          </p>
                        </div>
                        <div>
                          <p className="mb-2 font-medium text-xs">What will you use {productName} for?</p>
                          <div className="flex flex-wrap gap-1.5">
                            {useCases.map((u) => {
                              const on = picked.includes(u);
                              return (
                                <motion.button
                                  aria-pressed={on}
                                  className={cn(
                                    "flex h-8 cursor-pointer items-center gap-1 rounded-full border px-3 outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring",
                                    on
                                      ? "border-primary bg-primary text-primary-foreground"
                                      : "bg-background text-muted-foreground hover:text-foreground",
                                  )}
                                  key={u}
                                  layout={!reduce}
                                  onClick={() => setPicked((p) => (on ? p.filter((x) => x !== u) : [...p, u]))}
                                  transition={spring}
                                  type="button"
                                  whileTap={reduce ? undefined : { scale: 0.97 }}
                                >
                                  <AnimatePresence initial={false}>
                                    {on && (
                                      <motion.span
                                        animate={{ width: "auto", opacity: 1 }}
                                        className="overflow-hidden"
                                        exit={{ width: 0, opacity: 0 }}
                                        initial={{ width: 0, opacity: 0 }}
                                        transition={spring}
                                      >
                                        <CheckIcon className="size-3.5" />
                                      </motion.span>
                                    )}
                                  </AnimatePresence>
                                  {u}
                                </motion.button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {step === 1 && (
                    <>
                      <StepTitle sub="Agents can read and act in the tools you connect. You can change this later." title="Connect your tools" />
                      <div className="grid grid-cols-1 gap-2.5 @md:grid-cols-2">
                        {tools.map((t, i) => {
                          const s = toolStatus[t.id] ?? "idle";
                          const Icon = t.icon;
                          return (
                            <motion.div
                              animate={{ opacity: 1, y: 0 }}
                              className={cn(
                                "flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors",
                                s === "connected" && "border-success/40",
                              )}
                              initial={reduce ? false : { opacity: 0, y: 6 }}
                              key={t.id}
                              transition={{ duration: 0.22, ease: easeOut, delay: i * 0.03 }}
                            >
                              <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", softTone[t.tone])}>
                                <Icon className="size-4.5" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate font-medium">{t.name}</span>
                                <span className="block truncate text-muted-foreground text-xs">{t.blurb}</span>
                              </span>
                              <button
                                aria-label={s === "connected" ? `Disconnect ${t.name}` : `Connect ${t.name}`}
                                className={cn(
                                  "flex h-8 w-28 shrink-0 cursor-pointer items-center justify-center gap-1 overflow-hidden rounded-full border px-2.5 font-medium text-xs outline-none transition-[background-color,border-color,color,transform] duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97] disabled:cursor-default",
                                  s === "connected"
                                    ? "border-success/32 bg-success/8 text-success-foreground hover:bg-success/14 dark:bg-success/16"
                                    : "bg-background text-foreground hover:bg-accent",
                                )}
                                disabled={s === "connecting"}
                                onClick={() => toggleTool(t.id)}
                                type="button"
                              >
                                {s === "connecting" && <Spinner className="size-3.5" />}
                                {s === "connected" && (
                                  <motion.span
                                    animate={{ scale: 1, opacity: 1 }}
                                    initial={reduce ? { opacity: 0 } : { scale: 0.8, opacity: 0 }}
                                    transition={{ duration: 0.18, ease: easeOut }}
                                  >
                                    <CheckIcon className="size-3.5" strokeWidth={3} />
                                  </motion.span>
                                )}
                                {s === "idle" && <PlusIcon className="size-3.5" />}
                                {s === "connecting" ? "Connecting" : s === "connected" ? "Connected" : "Connect"}
                              </button>
                            </motion.div>
                          );
                        })}
                      </div>
                      <p className="mt-3 text-muted-foreground text-xs tabular-nums">
                        <Rolling value={connectedTools.length} /> of {tools.length} connected · read-only until you grant more
                      </p>
                    </>
                  )}

                  {step === 2 && (
                    <>
                      <StepTitle sub="Invite people now or later. They'll get an email with a link." title="Invite your team" />
                      <div className="flex flex-col gap-2">
                        <FieldLabelText htmlFor={`${ids}-email`}>Email addresses</FieldLabelText>
                        <div className="flex flex-col gap-2 @md:flex-row">
                          <motion.div
                            animate={shake && !reduce ? { x: shake % 2 ? [0, -6, 6, -4, 4, 0] : [0, 6, -6, 4, -4, 0] } : { x: 0 }}
                            className={cn(
                              "flex min-h-9 min-w-0 flex-1 flex-wrap items-center gap-1 rounded-lg border border-input bg-background px-1.5 py-1 shadow-xs/5 focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/24",
                              emailError && "border-destructive/60",
                            )}
                            transition={{ duration: 0.35 }}
                          >
                            <AnimatePresence initial={false} mode="popLayout">
                              {draft.map((d) => (
                                <motion.span
                                  animate={{ scale: 1, opacity: 1 }}
                                  className="flex h-6 items-center gap-1 rounded-full bg-muted ps-2 pe-0.5 text-xs"
                                  exit={{ scale: 0.95, opacity: 0, transition: { duration: 0.1 } }}
                                  initial={reduce ? { opacity: 0 } : { scale: 0.95, opacity: 0 }}
                                  key={d}
                                  layout={!reduce}
                                  transition={{ type: "spring", stiffness: 520, damping: 40 }}
                                >
                                  {d}
                                  <button
                                    aria-label={`Remove ${d}`}
                                    className="relative flex size-5 cursor-pointer items-center justify-center rounded-full text-muted-foreground outline-none transition-colors before:absolute before:-inset-1.5 before:rounded-full hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                                    onClick={() => setDraft((x) => x.filter((y) => y !== d))}
                                    type="button"
                                  >
                                    <XIcon className="size-3" />
                                  </button>
                                </motion.span>
                              ))}
                            </AnimatePresence>
                            <input
                              aria-describedby={emailError ? `${ids}-email-err` : undefined}
                              aria-invalid={!!emailError || undefined}
                              className="h-6 min-w-32 flex-1 bg-transparent px-1 outline-none placeholder:text-muted-foreground/72"
                              id={`${ids}-email`}
                              onBlur={() => emailText.trim() && commitEmail(emailText)}
                              onChange={(e) => {
                                setEmailText(e.target.value);
                                if (emailError) setEmailError("");
                              }}
                              onKeyDown={onEmailKey}
                              placeholder={draft.length ? "Add another" : "name@company.com"}
                              value={emailText}
                            />
                          </motion.div>
                          <div className="flex gap-2">
                            <Select items={roleItems} onValueChange={(v) => v && setRole(v as Role)} value={role}>
                              <SelectTrigger aria-label="Role" className="w-28">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectPopup>
                                {Object.entries(roleItems).map(([v, l]) => (
                                  <SelectItem key={v} value={v}>
                                    {l}
                                  </SelectItem>
                                ))}
                              </SelectPopup>
                            </Select>
                            <Button
                              className={cn("flex-1 @md:flex-none", press)}
                              disabled={!draft.length && !emailText.trim()}
                              onClick={sendInvites}
                            >
                              <UserPlusIcon />
                              Invite
                            </Button>
                          </div>
                        </div>
                        <p
                          className={cn("text-xs", emailError ? "text-destructive-foreground" : "text-muted-foreground")}
                          id={`${ids}-email-err`}
                        >
                          {emailError || "Press Enter or comma to add each address."}
                        </p>
                      </div>

                      {inviteSuggestions.some((s) => !invites.some((i) => i.email === s) && !draft.includes(s)) && (
                        <div className="mt-4">
                          <p className="mb-2 font-medium text-xs">Suggested from your domain</p>
                          <div className="flex flex-wrap gap-1.5">
                            {inviteSuggestions
                              .filter((s) => !invites.some((i) => i.email === s) && !draft.includes(s))
                              .map((s) => (
                                <button
                                  className="flex h-8 cursor-pointer items-center gap-1.5 rounded-full border border-dashed ps-1.5 pe-3 text-xs outline-none transition-[background-color,transform] duration-150 ease-out hover:border-solid hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]"
                                  key={s}
                                  onClick={() => setDraft((d) => [...d, s])}
                                  type="button"
                                >
                                  <Avatar className="size-5 text-[9px]">
                                    <AvatarFallback>{initials(s)}</AvatarFallback>
                                  </Avatar>
                                  {s}
                                  <PlusIcon className="size-3 text-muted-foreground" />
                                </button>
                              ))}
                          </div>
                        </div>
                      )}

                      <div className="mt-5 rounded-xl border">
                        <div className="flex items-center justify-between border-b px-3 py-2">
                          <span className="font-medium text-xs">Pending invites</span>
                          <span className="text-muted-foreground text-xs">
                            <Rolling value={invites.length} />
                          </span>
                        </div>
                        <ul className="divide-y">
                          <AnimatePresence initial={false}>
                            {invites.length === 0 && (
                              <motion.li
                                animate={{ opacity: 1 }}
                                className="px-3 py-6 text-center text-muted-foreground text-xs"
                                exit={{ opacity: 0, height: 0, paddingTop: 0, paddingBottom: 0 }}
                                initial={{ opacity: 0 }}
                                key="empty"
                              >
                                No invites yet. You can always do this later.
                              </motion.li>
                            )}
                            {invites.map((inv) => (
                              <motion.li
                                animate={{ opacity: 1, height: "auto" }}
                                className="overflow-hidden"
                                exit={{ opacity: 0, height: 0 }}
                                initial={reduce ? false : { opacity: 0, height: 0 }}
                                key={inv.email}
                                transition={spring}
                              >
                                <div className="flex items-center gap-2.5 py-2 ps-3 pe-2">
                                  <Avatar className="size-7 text-[11px]">
                                    <AvatarFallback>{initials(inv.email)}</AvatarFallback>
                                  </Avatar>
                                  <span className="min-w-0 flex-1">
                                    <span className="block truncate">{inv.email}</span>
                                    <span className="block text-muted-foreground text-xs">Invite sent · pending</span>
                                  </span>
                                  <Badge variant="outline">{roleItems[inv.role]}</Badge>
                                  <Button
                                    aria-label={`Cancel invite for ${inv.email}`}
                                    onClick={() => setInvites((l) => l.filter((x) => x.email !== inv.email))}
                                    className={press}
                                    size="icon-sm"
                                    variant="ghost"
                                  >
                                    <XIcon />
                                  </Button>
                                </div>
                              </motion.li>
                            ))}
                          </AnimatePresence>
                        </ul>
                      </div>
                    </>
                  )}

                  {step === 3 && template && (
                    <>
                      <StepTitle sub="Pick a starting point. You can tune everything after." title="Create your first agent" />
                      <div className="grid grid-cols-1 gap-5 @xl:grid-cols-[1fr_15rem]">
                        <div className="flex min-w-0 flex-col gap-4">
                          <div aria-label="Template" className="grid grid-cols-2 gap-2" role="radiogroup">
                            {templates.map((t) => {
                              const on = t.id === templateId;
                              const Icon = t.icon;
                              return (
                                <button
                                  aria-checked={on}
                                  className="relative flex cursor-pointer flex-col items-start gap-2 rounded-xl border bg-card p-3 text-start outline-none transition-[background-color,transform] duration-150 ease-out hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]"
                                  key={t.id}
                                  onClick={() => pickTemplate(t)}
                                  role="radio"
                                  type="button"
                                >
                                  {on && (
                                    <motion.span
                                      className="absolute -inset-px rounded-xl border-2 border-primary"
                                      layoutId={`${ids}-template`}
                                      transition={reduce ? { duration: 0 } : spring}
                                    />
                                  )}
                                  <span className={cn("relative flex size-8 items-center justify-center rounded-lg", softTone[t.tone])}>
                                    <Icon className="size-4" />
                                  </span>
                                  <span className="relative min-w-0">
                                    <span className="block font-medium leading-tight">{t.name}</span>
                                    <span className="block text-muted-foreground text-xs leading-snug">{t.description}</span>
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                          <div>
                            <FieldLabelText htmlFor={`${ids}-agent`}>Agent name</FieldLabelText>
                            <Input
                              id={`${ids}-agent`}
                              onChange={(e) => {
                                setAgentNameEdited(true);
                                setAgentName(e.target.value);
                              }}
                              aria-describedby={`${ids}-agent-hint`}
                              aria-invalid={!agentName.trim() || undefined}
                              value={agentName}
                            />
                            <p
                              className={cn("mt-1.5 text-xs", agentName.trim() ? "text-muted-foreground" : "text-destructive-foreground")}
                              id={`${ids}-agent-hint`}
                            >
                              {agentName.trim() ? "Shown when it posts or replies. You can rename it later." : "Your agent needs a name."}
                            </p>
                          </div>
                          <div>
                            <FieldLabelText htmlFor={`${ids}-instr`}>Instructions</FieldLabelText>
                            <Textarea
                              id={`${ids}-instr`}
                              onChange={(e) => setInstructions(e.target.value)}
                              placeholder="Describe what this agent should do, in plain words."
                              value={instructions}
                            />
                          </div>
                        </div>

                        <div className="@xl:sticky @xl:top-0 @xl:self-start">
                          <p className="mb-1.5 font-medium text-xs">Preview</p>
                          <div className="rounded-2xl border bg-card p-4 shadow-xs/5">
                            <div className="flex items-center gap-2.5">
                              <AnimatePresence initial={false} mode="popLayout">
                                <motion.span
                                  animate={{ scale: 1, opacity: 1 }}
                                  className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", softTone[template.tone])}
                                  exit={{ scale: 0.95, opacity: 0, transition: { duration: 0.1 } }}
                                  initial={reduce ? { opacity: 0 } : { scale: 0.95, opacity: 0 }}
                                  key={template.id}
                                  transition={{ duration: 0.2, ease: easeOut }}
                                >
                                  <BotIcon className="size-5" />
                                </motion.span>
                              </AnimatePresence>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate font-medium">{agentName || "Untitled agent"}</span>
                                <span className="block truncate text-muted-foreground text-xs">in {name || "your workspace"}</span>
                              </span>
                              <Badge variant="warning">Draft</Badge>
                            </div>
                            <p className="mt-3 line-clamp-4 text-muted-foreground text-xs leading-relaxed">
                              {instructions || "No instructions yet."}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-1">
                              {connectedTools.length ? (
                                connectedTools.map((t) => {
                                  const Icon = t.icon;
                                  return (
                                    <span className="flex h-6 items-center gap-1 rounded-full bg-muted px-2 text-xs" key={t.id}>
                                      <Icon className="size-3" />
                                      {t.name}
                                    </span>
                                  );
                                })
                              ) : (
                                <span className="text-muted-foreground text-xs">No tools connected yet</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </motion.section>
              )}
            </AnimatePresence>
          </div>
        </div>

        <footer className="flex h-14 shrink-0 items-center gap-2 border-t bg-background px-4 @2xl:px-8">
          {finished ? (
            <Button className={press} onClick={restart} variant="ghost">
              <RotateCcwIcon />
              Start over
            </Button>
          ) : (
            <Button className={press} disabled={step === 0} onClick={() => go(step - 1)} variant="ghost">
              <ArrowLeftIcon />
              Back
            </Button>
          )}
          <div className="ms-auto">
            {finished ? (
              <Button className={cn("min-w-32", press)}>
                Open workspace
                <ArrowRightIcon />
              </Button>
            ) : (
              <Button
                className={cn("min-w-32", press)}
                disabled={!canNext}
                onClick={next}
                variant={skipping ? "outline" : "default"}
              >
                {step === STEPS.length - 1 ? "Create agent" : skipping ? "Skip for now" : "Continue"}
                {step === STEPS.length - 1 ? <SparklesIcon /> : <ArrowRightIcon />}
              </Button>
            )}
          </div>
        </footer>
      </div>

      <aside className="hidden w-64 shrink-0 flex-col gap-4 border-s bg-muted/40 p-4 @3xl/screen:flex">
        <Checklist items={checklist} onGo={go} />
        <WalkthroughCard slots={walkthroughSlots} />
      </aside>
    </div>
  );
}

function WalkthroughCard({ slots }: { slots: string[] }) {
  const ids = useId();
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState(slots[0] ?? "");
  const [booked, setBooked] = useState<string | null>(null);

  return (
    <div className="mt-auto rounded-2xl border bg-card p-2 shadow-xs/5">
      <div className="flex items-start gap-2.5 px-1.5 pt-1.5 pb-2.5">
        <span
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-lg transition-colors duration-200",
            booked ? "bg-success/12 text-success-foreground" : "bg-muted text-muted-foreground",
          )}
        >
          {booked ? <CalendarCheckIcon className="size-4" /> : <LifeBuoyIcon className="size-4" />}
        </span>
        <div className="min-w-0">
          <p className="font-medium text-xs">{booked ? "Walkthrough booked" : "Need a hand?"}</p>
          <p className="mt-0.5 text-pretty text-muted-foreground text-xs tabular-nums">
            {booked ? `${booked}. We'll send a calendar invite.` : "Set up your first agents with us on a 15 minute call."}
          </p>
        </div>
      </div>
      <Popover onOpenChange={setOpen} open={open}>
        <PopoverTrigger render={<Button className={cn("w-full", press)} size="sm" variant="outline" />}>
          {booked ? "Change time" : "Book a walkthrough"}
        </PopoverTrigger>
        <PopoverPopup align="end" className="w-64" side="top" sideOffset={6}>
          <p className="font-medium text-sm" id={`${ids}-title`}>
            Pick a time
          </p>
          <p className="mt-0.5 text-muted-foreground text-xs">15 min video call, in your time zone</p>
          <div aria-labelledby={`${ids}-title`} className="mt-3 flex flex-col gap-1" role="radiogroup">
            {slots.map((slot) => {
              const on = slot === choice;
              return (
                <button
                  aria-checked={on}
                  className={cn(
                    "flex h-8 cursor-pointer items-center justify-between rounded-md border px-2.5 text-start text-xs tabular-nums outline-none transition-[background-color,border-color,transform] duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]",
                    on ? "border-border bg-accent font-medium" : "border-transparent hover:bg-accent/60",
                  )}
                  key={slot}
                  onClick={() => setChoice(slot)}
                  role="radio"
                  type="button"
                >
                  {slot}
                  {on && <CheckIcon className="size-3.5" />}
                </button>
              );
            })}
          </div>
          <Button
            className={cn("mt-3 w-full", press)}
            onClick={() => {
              setBooked(choice);
              setOpen(false);
            }}
            size="sm"
          >
            {booked === choice ? "Keep this time" : "Book call"}
          </Button>
        </PopoverPopup>
      </Popover>
    </div>
  );
}

function FinishView({
  workspace,
  url,
  color,
  tools,
  invites,
  agentName,
  onEdit,
}: {
  workspace: string;
  url: string;
  color: FirstRunTone;
  tools: FirstRunTool[];
  invites: number;
  agentName: string;
  onEdit: (step: number) => void;
}) {
  const reduce = useReducedMotionAfterMount();
  const rows: { step: number; label: string; value: ReactNode; icon: ReactNode; empty?: boolean }[] = [
    {
      step: 0,
      label: "Workspace",
      icon: (
        <span className={cn("flex size-8 items-center justify-center rounded-lg font-semibold text-[11px] text-white", solidTone[color])}>
          {initials(workspace)}
        </span>
      ),
      value: (
        <>
          <span className="block truncate font-medium">{workspace || "Your workspace"}</span>
          <span className="block truncate font-mono text-muted-foreground text-xs">{url}</span>
        </>
      ),
    },
    {
      step: 1,
      label: "Tools",
      empty: !tools.length,
      icon: (
        <span className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <PlugIcon className="size-4" />
        </span>
      ),
      value: (
        <>
          <span className="block truncate font-medium tabular-nums">
            {tools.length ? `${tools.length} connected` : "No tools yet"}
          </span>
          <span className="block truncate text-muted-foreground text-xs">
            {tools.length ? tools.map((t) => t.name).join(", ") : "Agents work best with at least one"}
          </span>
        </>
      ),
    },
    {
      step: 2,
      label: "Team",
      empty: !invites,
      icon: (
        <span className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <UsersIcon className="size-4" />
        </span>
      ),
      value: (
        <>
          <span className="block truncate font-medium tabular-nums">
            {invites ? `${invites} invite${invites > 1 ? "s" : ""} pending` : "Just you for now"}
          </span>
          <span className="block truncate text-muted-foreground text-xs">
            {invites ? "They'll get an email with a link" : "Invite people any time from Settings"}
          </span>
        </>
      ),
    },
    {
      step: 3,
      label: "Agent",
      icon: (
        <span className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <BotIcon className="size-4" />
        </span>
      ),
      value: (
        <>
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate font-medium">{agentName}</span>
            <Badge className="shrink-0" variant="success">
              Live
            </Badge>
          </span>
          <span className="block truncate text-muted-foreground text-xs">Picks up its first task in a moment</span>
        </>
      ),
    },
  ];

  return (
    <motion.section
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto flex w-full max-w-md flex-col items-center pt-4 text-center"
      exit={{ opacity: 0, transition: { duration: 0.12 } }}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
      transition={{ duration: 0.25, ease: easeOut }}
    >
      <div className="relative flex size-12 items-center justify-center">
        {!reduce && (
          <motion.span
            animate={{ scale: 1.9, opacity: 0 }}
            aria-hidden
            className="absolute inset-0 rounded-full border border-success/50"
            initial={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3, ease: easeOut }}
          />
        )}
        <motion.span
          animate={{ scale: 1, opacity: 1 }}
          className="flex size-12 items-center justify-center rounded-full bg-success/12 text-success-foreground"
          initial={reduce ? false : { scale: 0.9, opacity: 0 }}
          transition={{ duration: 0.25, ease: easeOut }}
        >
          <svg aria-hidden className="size-6" fill="none" viewBox="0 0 24 24">
            <motion.path
              animate={{ pathLength: 1 }}
              d="M5 12.5l4.5 4.5L19 7.5"
              initial={reduce ? false : { pathLength: 0 }}
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              transition={{ duration: 0.3, delay: 0.12, ease: "easeOut" }}
            />
          </svg>
        </motion.span>
      </div>
      <h2 className="mt-4 text-balance font-heading font-semibold text-lg tracking-tight">
        {workspace || "Your workspace"} is ready
      </h2>
      <p className="mt-1 text-pretty text-muted-foreground">Here's what you set up. You can change any of it later.</p>

      <ul className="mt-6 w-full divide-y rounded-xl border bg-card text-start">
        {rows.map((r, i) => (
          <motion.li
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 py-2.5 ps-3 pe-2"
            initial={reduce ? false : { opacity: 0, y: 4 }}
            key={r.label}
            transition={{ duration: 0.22, ease: easeOut, delay: 0.12 + i * 0.035 }}
          >
            <span className="shrink-0">{r.icon}</span>
            <span className="min-w-0 flex-1">{r.value}</span>
            {r.empty ? (
              <Button aria-label={`Add ${r.label.toLowerCase()}`} className={press} onClick={() => onEdit(r.step)} size="sm" variant="outline">
                <PlusIcon />
                Add
              </Button>
            ) : (
              <Button aria-label={`Edit ${r.label.toLowerCase()}`} className={press} onClick={() => onEdit(r.step)} size="sm" variant="ghost">
                Edit
              </Button>
            )}
          </motion.li>
        ))}
      </ul>

    </motion.section>
  );
}
