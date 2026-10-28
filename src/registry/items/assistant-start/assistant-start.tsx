"use client";

import { AnimatePresence, LayoutGroup, MotionConfig, motion, useReducedMotion } from "motion/react";
import {
  ArrowLeftIcon,
  ArrowUpIcon,
  ArrowUpRightIcon,
  BotIcon,
  CalendarDaysIcon,
  CheckIcon,
  CodeXmlIcon,
  CopyIcon,
  EllipsisIcon,
  FeatherIcon,
  FileSpreadsheetIcon,
  GlobeIcon,
  HardDriveIcon,
  HouseIcon,
  LibraryIcon,
  LoaderCircleIcon,
  LogOutIcon,
  type LucideIcon,
  MailIcon,
  MenuIcon,
  NotebookPenIcon,
  PanelsTopLeftIcon,
  PaperclipIcon,
  PlusIcon,
  ReceiptTextIcon,
  RotateCcwIcon,
  SearchIcon,
  SquareIcon,
  SettingsIcon,
  SparklesIcon,
  SquareKanbanIcon,
  SquarePenIcon,
  TelescopeIcon,
  ThumbsUpIcon,
  XIcon,
} from "lucide-react";
import {
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Kbd } from "@/components/ui/kbd";
import { Menu, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type AssistantTone = "orange" | "teal" | "violet" | "amber" | "info" | "success" | "warning";

export interface AssistantChat {
  id: string;
  title: string;
  time: string;
  projectId?: string;
}

export interface AssistantProject {
  id: string;
  name: string;
  tone: AssistantTone;
}

export interface AssistantApp {
  id: string;
  name: string;
  detail: string;
  icon: LucideIcon;
  tone: AssistantTone;
  connected: boolean;
}

export interface AssistantSuggestion {
  id: string;
  title: string;
  description: string;
  prompt: string;
  icon: LucideIcon;
  tone: AssistantTone;
}

export interface AssistantTool {
  id: string;
  label: string;
  icon: LucideIcon;
}

export interface AssistantModel {
  value: string;
  label: string;
}

export interface AssistantStartProps {
  productName?: string;
  userName?: string;
  userInitials?: string;
  plan?: string;
  greeting?: string;
  chats?: AssistantChat[];
  projects?: AssistantProject[];
  apps?: AssistantApp[];
  suggestions?: AssistantSuggestion[];
  tools?: AssistantTool[];
  models?: AssistantModel[];
  placeholders?: string[];
  className?: string;
}

const tileTone: Record<AssistantTone, string> = {
  orange: "bg-orange-500/12 text-orange-700 dark:bg-orange-400/14 dark:text-orange-300",
  teal: "bg-teal-500/12 text-teal-700 dark:bg-teal-400/14 dark:text-teal-300",
  violet: "bg-violet-500/12 text-violet-700 dark:bg-violet-400/14 dark:text-violet-300",
  amber: "bg-amber-500/12 text-amber-700 dark:bg-amber-400/14 dark:text-amber-300",
  info: "bg-info/12 text-info-foreground",
  success: "bg-success/12 text-success-foreground",
  warning: "bg-warning/16 text-warning-foreground",
};

const dotTone: Record<AssistantTone, string> = {
  orange: "bg-orange-500",
  teal: "bg-teal-500",
  violet: "bg-violet-500",
  amber: "bg-amber-500",
  info: "bg-info",
  success: "bg-success",
  warning: "bg-warning",
};

const easeOut = [0.23, 1, 0.32, 1] as const;
const spring = { type: "spring", duration: 0.3, bounce: 0 } as const;
const softSpring = { type: "spring", duration: 0.4, bounce: 0 } as const;
const fade = { duration: 0.2, ease: easeOut } as const;

const defaultProjects: AssistantProject[] = [
  { id: "launch", name: "Aurora launch", tone: "orange" },
  { id: "renewals", name: "Q3 renewals", tone: "teal" },
  { id: "hiring", name: "Design hiring", tone: "info" },
];

const defaultChats: AssistantChat[] = [
  { id: "c1", title: "Summarise the pricing page feedback", time: "2m", projectId: "launch" },
  { id: "c2", title: "Which renewals slip past October?", time: "1h", projectId: "renewals" },
  { id: "c3", title: "Draft the Aurora press note", time: "3h", projectId: "launch" },
  { id: "c4", title: "Portfolio review rubric for juniors", time: "Yesterday", projectId: "hiring" },
  { id: "c5", title: "Rewrite onboarding email in a warmer tone", time: "Mon" },
  { id: "c6", title: "Compare churn by plan tier", time: "Sep 28", projectId: "renewals" },
];

const defaultApps: AssistantApp[] = [
  { id: "mail", name: "Postbox", detail: "1,204 threads", icon: MailIcon, tone: "info", connected: true },
  { id: "cal", name: "Daybook", detail: "This week", icon: CalendarDaysIcon, tone: "orange", connected: true },
  { id: "drive", name: "Vault", detail: "382 files", icon: HardDriveIcon, tone: "teal", connected: true },
  { id: "tracker", name: "Linewise", detail: "64 open issues", icon: SquareKanbanIcon, tone: "amber", connected: true },
  { id: "ledger", name: "Tally", detail: "Not connected", icon: ReceiptTextIcon, tone: "success", connected: false },
];

const defaultSuggestions: AssistantSuggestion[] = [
  {
    id: "s1",
    title: "Catch me up on this week",
    description: "Threads, meetings and decisions you missed",
    prompt: "Catch me up on everything that happened this week across mail and calendar, grouped by project.",
    icon: NotebookPenIcon,
    tone: "orange",
  },
  {
    id: "s2",
    title: "Find renewals at risk",
    description: "Cross-check the tracker with recent emails",
    prompt: "Which Q3 renewals look at risk? Cross-check open issues in Linewise with the latest customer emails.",
    icon: TelescopeIcon,
    tone: "teal",
  },
  {
    id: "s3",
    title: "Brief from a spreadsheet",
    description: "Upload a CSV and get a one-page summary",
    prompt: "Turn the attached spreadsheet into a one-page brief with the three numbers leadership should care about.",
    icon: FileSpreadsheetIcon,
    tone: "info",
  },
  {
    id: "s4",
    title: "Prototype a landing hero",
    description: "Open a canvas with copy and layout ideas",
    prompt: "Sketch three hero sections for the Aurora launch page, each with a headline, subline and CTA.",
    icon: PanelsTopLeftIcon,
    tone: "amber",
  },
];

const defaultTools: AssistantTool[] = [
  { id: "web", label: "Search", icon: GlobeIcon },
  { id: "research", label: "Deep research", icon: TelescopeIcon },
  { id: "code", label: "Code", icon: CodeXmlIcon },
  { id: "canvas", label: "Canvas", icon: PanelsTopLeftIcon },
];

const defaultModels: AssistantModel[] = [
  { value: "wren-pro", label: "Wren 3 Pro" },
  { value: "wren-flash", label: "Wren 3 Flash" },
  { value: "wren-reason", label: "Wren 3 Reason" },
];

const defaultPlaceholders = [
  "Ask anything, or @mention an app…",
  "Plan my Thursday around the launch review",
  "What did customers say about the new pricing?",
  "Draft a reply to the Halcyon contract thread",
];

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  full?: string;
  steps?: string[];
  stopped?: boolean;
}

function buildReply(apps: AssistantApp[], files: string[], tools: string[]): { text: string; steps: string[] } {
  const steps: string[] = [];
  for (const app of apps) steps.push(`Read ${app.name} · ${app.detail.toLowerCase()}`);
  if (tools.includes("web")) steps.push("Searched the web · 6 sources");
  if (tools.includes("research")) steps.push("Ran deep research · 4 passes");
  for (const file of files) steps.push(`Opened ${file}`);
  if (steps.length === 0) steps.push("Thought for 3 seconds");
  const sources = [...apps.map((a) => a.name), ...files];
  const from =
    sources.length === 0
      ? ""
      : ` from ${sources.length === 1 ? sources[0] : `${sources.slice(0, -1).join(", ")} and ${sources.at(-1)}`}`;
  const text = [
    `Here's a first pass${from}.`,
    "Three things stand out. The Halcyon and Brightwater threads both mention the October price change, so I'd treat those as one conversation. The launch review moved to Thursday, which leaves a single day to land the press note. And two open Linewise issues are blocking the same customer, which is worth a direct reply rather than a ticket update.",
    "Want me to draft the replies, block time on Thursday, or turn this into a checklist for the team?",
  ].join("\n\n");
  return { text, steps };
}

function OrbFilter({ id, blur }: { id: string; blur: number }) {
  return (
    <svg aria-hidden className="absolute size-0">
      <filter colorInterpolationFilters="sRGB" height="300%" id={id} width="300%" x="-100%" y="-100%">
        <feGaussianBlur in="SourceGraphic" result="shape-blur" stdDeviation={blur} />
        <feColorMatrix in="shape-blur" result="shape" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -11" />
        <feGaussianBlur in="SourceGraphic" result="tint-blur" stdDeviation={blur * 1.6} />
        <feColorMatrix in="tint-blur" result="tint" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 60 0" />
        <feComposite in="tint" in2="shape" operator="in" />
      </filter>
    </svg>
  );
}

function GooOrb({ className, busy = false, size = 48 }: { className?: string; busy?: boolean; size?: number }) {
  const id = `orb-${useId().replace(/:/g, "")}`;
  const reduce = useReducedMotion();
  const k = size / 48;
  const loop = (duration: number, x: number[], y: number[]) =>
    reduce
      ? undefined
      : {
          x: x.map((v) => v * k),
          y: y.map((v) => v * k),
          transition: { duration, repeat: Infinity, ease: "easeInOut" as const },
        };
  const blob = "absolute rounded-full";
  return (
    <span aria-hidden className={cn("relative inline-block shrink-0", className)} style={{ width: size, height: size }}>
      <OrbFilter blur={3.5 * k} id={id} />
      <span className="absolute inset-0" style={{ filter: `url(#${id})` }}>
        <span className={cn(blob, "inset-[12%] bg-info")} />
        <motion.span
          animate={loop(busy ? 3 : 7, [0, 5, 3, -1, 0], [0, 2, 6, 3, 0])}
          className={cn(blob, "top-[20%] left-[20%] size-[38%] bg-success")}
        />
        <motion.span
          animate={loop(busy ? 3.4 : 8, [0, -4, -6, -1, 0], [0, -5, -1, 2, 0])}
          className={cn(blob, "right-[22%] bottom-[22%] size-[34%] bg-info-foreground")}
        />
        <motion.span
          animate={busy ? loop(2.2, [0, 13, 0], [0, -13, 0]) : loop(6, [0, 2, 0], [0, -2, 0])}
          className={cn(blob, "top-[28%] right-[28%] size-[26%] bg-info")}
        />
      </span>
    </span>
  );
}

function SendButton({
  disabled,
  streaming,
  onSend,
  onStop,
}: {
  disabled: boolean;
  streaming: boolean;
  onSend: () => void;
  onStop: () => void;
}) {
  return (
    <Button
      aria-label={streaming ? "Stop generating" : "Send message"}
      className="rounded-full transition-[box-shadow,scale,opacity] duration-150 ease-out active:scale-[0.97] sm:size-8"
      disabled={!streaming && disabled}
      onClick={streaming ? onStop : onSend}
      size="icon-sm"
    >
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          animate={{ opacity: 1, scale: 1 }}
          className="flex"
          exit={{ opacity: 0, scale: 0.95 }}
          initial={{ opacity: 0, scale: 0.95 }}
          key={streaming ? "stop" : "send"}
          transition={fade}
        >
          {streaming ? <SquareIcon className="size-3 fill-current" /> : <ArrowUpIcon />}
        </motion.span>
      </AnimatePresence>
    </Button>
  );
}

interface PromptBoxProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  streaming: boolean;
  onStop: () => void;
  tools: AssistantTool[];
  activeTools: string[];
  onToggleTool: (id: string) => void;
  context: AssistantApp[];
  onRemoveContext: (id: string) => void;
  files: string[];
  onAttach: () => void;
  onRemoveFile: (name: string) => void;
  models: AssistantModel[];
  model: string;
  onModel: (v: string) => void;
  placeholders: string[];
  compact?: boolean;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
}

function PromptBox({
  value,
  onChange,
  onSubmit,
  streaming,
  onStop,
  tools,
  activeTools,
  onToggleTool,
  context,
  onRemoveContext,
  files,
  onAttach,
  onRemoveFile,
  models,
  model,
  onModel,
  placeholders,
  compact,
  textareaRef,
}: PromptBoxProps) {
  const reduce = useReducedMotion();
  const [ph, setPh] = useState(0);
  const inputId = useId();

  useEffect(() => {
    if (reduce || value || placeholders.length < 2) return;
    const t = setInterval(() => setPh((p) => (p + 1) % placeholders.length), 3200);
    return () => clearInterval(t);
  }, [reduce, value, placeholders.length]);

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (value.trim()) onSubmit();
    }
  };

  const chips = [
    ...context.map((app) => ({ key: `app-${app.id}`, label: app.name, icon: app.icon, tone: app.tone, remove: () => onRemoveContext(app.id) })),
    ...files.map((f) => ({ key: `file-${f}`, label: f, icon: FileSpreadsheetIcon, tone: "success" as AssistantTone, remove: () => onRemoveFile(f) })),
  ];

  return (
    <motion.div
      className="@container relative rounded-2xl border bg-card shadow-xs/5 transition-[border-color,box-shadow] focus-within:border-ring/64 focus-within:ring-[3px] focus-within:ring-ring/16"
      layoutId="assistant-prompt"
      transition={softSpring}
    >
      <AnimatePresence initial={false}>
        {chips.length > 0 && (
          <motion.div
            animate={{ height: "auto", opacity: 1 }}
            className="overflow-hidden"
            exit={{ height: 0, opacity: 0 }}
            initial={{ height: 0, opacity: 0 }}
            transition={spring}
          >
            <div className="flex flex-wrap gap-1.5 px-3 pt-3">
              <AnimatePresence mode="popLayout" initial={false}>
                {chips.map((c) => (
                  <motion.span
                    animate={{ opacity: 1, scale: 1 }}
                    className="inline-flex h-6 items-center gap-1.5 rounded-full border bg-background ps-0.5 pe-1 text-xs"
                    exit={{ opacity: 0, scale: 0.95 }}
                    initial={{ opacity: 0, scale: 0.95 }}
                    key={c.key}
                    layout
                    transition={spring}
                  >
                    <span className={cn("flex size-5 items-center justify-center rounded-full", tileTone[c.tone])}>
                      <c.icon className="size-3" />
                    </span>
                    <span className="max-w-36 truncate font-medium">{c.label}</span>
                    <button
                      aria-label={`Remove ${c.label}`}
                      className="relative flex size-4 cursor-pointer items-center justify-center rounded-full text-muted-foreground outline-none after:absolute after:-inset-2 hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={c.remove}
                      type="button"
                    >
                      <XIcon className="size-3" />
                    </button>
                  </motion.span>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative">
        <label className="sr-only" htmlFor={inputId}>
          Message
        </label>
        <textarea
          className={cn(
            "field-sizing-content block max-h-44 w-full resize-none bg-transparent px-4 pt-3.5 text-foreground text-sm/6 outline-none",
            compact ? "min-h-12" : "min-h-22",
          )}
          id={inputId}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          ref={textareaRef}
          rows={1}
          value={value}
        />
        {!value && (
          <div aria-hidden className="pointer-events-none absolute inset-x-4 top-3.5 overflow-hidden text-muted-foreground/72 text-sm/6">
            <AnimatePresence initial={false} mode="wait">
              <motion.span
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                className="block truncate"
                exit={{ opacity: 0, y: -6, filter: "blur(2px)" }}
                initial={{ opacity: 0, y: 6, filter: "blur(2px)" }}
                key={ph}
                transition={fade}
              >
                {placeholders[ph] ?? ""}
              </motion.span>
            </AnimatePresence>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 p-2 ps-2.5">
        <Tooltip>
          <TooltipTrigger
            render={<Button aria-label="Attach a file" className="sm:size-8" onClick={onAttach} size="icon-sm" variant="ghost" />}
          >
            <PaperclipIcon />
          </TooltipTrigger>
          <TooltipPopup>Attach a file</TooltipPopup>
        </Tooltip>
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto [scrollbar-width:none]">
          {tools.map((t) => {
            const on = activeTools.includes(t.id);
            return (
              <motion.button
                aria-label={t.label}
                aria-pressed={on}
                className={cn(
                  "inline-flex h-8 min-w-8 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-full border px-2 font-medium @lg:px-2.5 text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                  on
                    ? "border-info/32 bg-info/10 text-info-foreground"
                    : "border-transparent text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
                key={t.id}
                layout
                onClick={() => onToggleTool(t.id)}
                transition={spring}
                type="button"
                whileTap={{ scale: 0.97 }}
              >
                <t.icon className="size-3.5 shrink-0" />
                <span className="hidden @lg:inline">{t.label}</span>
              </motion.button>
            );
          })}
        </div>
        <Select items={models} onValueChange={(v) => v && onModel(v as string)} value={model}>
          <SelectTrigger
            aria-label="Model"
            className="w-auto min-w-0 shrink-0 border-transparent bg-transparent text-sm shadow-none before:hidden hover:bg-accent dark:bg-transparent"
            size="sm"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectPopup align="end">
            {models.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>
        <SendButton disabled={!value.trim()} onSend={onSubmit} onStop={onStop} streaming={streaming} />
      </div>
    </motion.div>
  );
}

interface SidebarBodyProps {
  productName: string;
  userName: string;
  userInitials: string;
  plan: string;
  chats: AssistantChat[];
  projects: AssistantProject[];
  activeChat: string | null;
  onOpenChat: (chat: AssistantChat) => void;
  onNewChat: () => void;
  onClose?: () => void;
}

function SidebarBody({
  productName,
  userName,
  userInitials,
  plan,
  chats,
  projects,
  activeChat,
  onOpenChat,
  onNewChat,
  onClose,
}: SidebarBodyProps) {
  const [query, setQuery] = useState("");
  const [project, setProject] = useState<string | null>(null);
  const [nav, setNav] = useState("home");
  const groupId = useId();

  const visible = chats.filter(
    (c) => (!project || c.projectId === project) && c.title.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const navItems = [
    { id: "home", label: "Home", icon: HouseIcon },
    { id: "agents", label: "Agents", icon: BotIcon },
    { id: "library", label: "Library", icon: LibraryIcon },
  ];

  return (
    <LayoutGroup id={groupId}>
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex items-center gap-2 px-3 pt-3 pb-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <FeatherIcon className="size-4" />
          </span>
          <span className="font-heading font-semibold">{productName}</span>
          {onClose ? (
            <Button aria-label="Close sidebar" className="ms-auto sm:size-8" onClick={onClose} size="icon-sm" variant="ghost">
              <XIcon />
            </Button>
          ) : (
            <Badge className="ms-auto" variant="outline">
              {plan}
            </Badge>
          )}
        </div>

        <div className="flex flex-col gap-2 px-3 pb-2">
          <Button className="justify-start" onClick={onNewChat} variant="outline">
            <SquarePenIcon />
            New chat
            <Kbd className="ms-auto dark:text-foreground">⌘ N</Kbd>
          </Button>
          <InputGroup>
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
            <InputGroupInput
              aria-label="Search chats"
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search chats"
              size="sm"
              value={query}
            />
          </InputGroup>
        </div>

        <nav aria-label="Main" className="flex flex-col gap-0.5 px-2 py-1">
          {navItems.map((n) => (
            <button
              aria-current={nav === n.id ? "page" : undefined}
              className={cn(
                "relative flex h-8 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring",
                nav === n.id ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
              key={n.id}
              onClick={() => setNav(n.id)}
              type="button"
            >
              {nav === n.id && (
                <motion.span className="absolute inset-0 -z-0 rounded-lg bg-accent" layoutId="nav-pill" transition={spring} />
              )}
              <n.icon className="relative size-4" />
              <span className="relative">{n.label}</span>
            </button>
          ))}
        </nav>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
          <div className="flex items-center justify-between px-2.5 pt-4 pb-1.5">
            <span className="font-medium text-muted-foreground text-xs">Projects</span>
            <Button aria-label="New project" className="after:absolute after:-inset-1" size="icon-xs" variant="ghost">
              <PlusIcon />
            </Button>
          </div>
          <div className="flex flex-col gap-0.5">
            {projects.map((p) => {
              const on = project === p.id;
              return (
                <button
                  aria-pressed={on}
                  className={cn(
                    "relative flex h-8 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    on ? "text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                  )}
                  key={p.id}
                  onClick={() => setProject(on ? null : p.id)}
                  type="button"
                >
                  {on && <motion.span className="absolute inset-0 rounded-lg bg-accent" layoutId="project-pill" transition={spring} />}
                  <motion.span
                    animate={{ scale: on ? 1.35 : 1 }}
                    className={cn("relative size-2 rounded-full", dotTone[p.tone])}
                    transition={spring}
                  />
                  <span className="relative truncate">{p.name}</span>
                  <span className="relative ms-auto text-muted-foreground text-xs tabular-nums">
                    {chats.filter((c) => c.projectId === p.id).length}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between px-2.5 pt-4 pb-1.5">
            <span className="font-medium text-muted-foreground text-xs">
              {project ? projects.find((p) => p.id === project)?.name : "Recent"}
            </span>
            {project && (
              <button
                className="relative -my-1 cursor-pointer rounded-md px-1.5 py-1 text-muted-foreground text-xs outline-none after:absolute after:-inset-y-1 after:inset-x-0 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => setProject(null)}
                type="button"
              >
                Show all
              </button>
            )}
          </div>
          <ul className="flex flex-col gap-0.5">
            <AnimatePresence initial={false} mode="popLayout">
              {visible.map((c) => (
                <motion.li
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -6 }}
                  initial={{ opacity: 0, x: -6 }}
                  key={c.id}
                  layout
                  transition={spring}
                >
                  <button
                    aria-current={activeChat === c.id ? "true" : undefined}
                    className={cn(
                      "group/chat flex h-8 w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      activeChat === c.id ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                    )}
                    onClick={() => onOpenChat(c)}
                    type="button"
                  >
                    <span className="min-w-0 flex-1 truncate">{c.title}</span>
                    <span className="shrink-0 text-muted-foreground text-xs tabular-nums">{c.time}</span>
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
            {visible.length === 0 && <li className="px-2.5 py-2 text-muted-foreground text-xs">No chats match.</li>}
          </ul>
        </div>

        <div className="flex items-center gap-2.5 border-t p-3">
          <Avatar className="size-8">
            <AvatarFallback className="bg-teal-500/12 text-teal-700 dark:bg-teal-400/14 dark:text-teal-300 text-xs">{userInitials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium">{userName}</div>
            <div className="truncate text-muted-foreground text-xs">Northlight Studio</div>
          </div>
          <Menu>
            <MenuTrigger render={<Button aria-label="Account menu" className="sm:size-8" size="icon-sm" variant="ghost" />}>
              <EllipsisIcon />
            </MenuTrigger>
            <MenuPopup align="end" side="top">
              <MenuItem>
                <SettingsIcon />
                Settings
              </MenuItem>
              <MenuItem>
                <SparklesIcon />
                Upgrade plan
              </MenuItem>
              <MenuSeparator />
              <MenuItem>
                <LogOutIcon />
                Sign out
              </MenuItem>
            </MenuPopup>
          </Menu>
        </div>
      </div>
    </LayoutGroup>
  );
}

function FadeScroller({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const max = el.scrollWidth - el.clientWidth;
      setEdges({ start: el.scrollLeft > 1, end: el.scrollLeft < max - 1 });
    };
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    for (const child of el.children) observer.observe(child);
    return () => {
      el.removeEventListener("scroll", measure);
      observer.disconnect();
    };
  }, []);

  return (
    <div
      className={cn("overflow-x-auto [scrollbar-width:none]", className)}
      ref={ref}
      style={{
        maskImage: `linear-gradient(to right, ${edges.start ? "transparent, black 1.5rem" : "black, black"}, ${edges.end ? "black calc(100% - 1.5rem), transparent" : "black, black"})`,
      }}
    >
      {children}
    </div>
  );
}

function AppPill({
  app,
  selected,
  connecting,
  onClick,
}: {
  app: AssistantApp;
  selected: boolean;
  connecting: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      aria-pressed={app.connected ? selected : undefined}
      className={cn(
        "inline-flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border ps-1 pe-2.5 font-medium text-xs outline-none transition-[background-color,border-color,color] duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring",
        selected
          ? "border-info/40 bg-info/10 text-info-foreground"
          : app.connected
            ? "border-border bg-background text-foreground/80 hover:border-input hover:text-foreground"
            : "border-dashed bg-transparent text-muted-foreground hover:bg-background hover:text-foreground",
      )}
      layout
      onClick={onClick}
      transition={spring}
      type="button"
      whileTap={{ scale: 0.97 }}
    >
      <span className={cn("relative flex size-5 items-center justify-center rounded-full", tileTone[app.tone], !app.connected && !connecting && "opacity-64")}>
        <AnimatePresence initial={false} mode="popLayout">
          {connecting ? (
            <motion.span animate={{ opacity: 1 }} className="flex" exit={{ opacity: 0 }} initial={{ opacity: 0 }} key="spin">
              <LoaderCircleIcon className="size-3 animate-spin" />
            </motion.span>
          ) : selected ? (
            <motion.span
              animate={{ opacity: 1, scale: 1 }}
              className="flex"
              exit={{ opacity: 0, scale: 0.9 }}
              initial={{ opacity: 0, scale: 0.9 }}
              key="on"
              transition={spring}
            >
              <CheckIcon className="size-3" strokeWidth={3} />
            </motion.span>
          ) : (
            <motion.span animate={{ opacity: 1 }} className="flex" exit={{ opacity: 0 }} initial={{ opacity: 0 }} key="icon">
              <app.icon className="size-3" />
            </motion.span>
          )}
        </AnimatePresence>
      </span>
      {connecting ? "Connecting…" : app.name}
      {!app.connected && !connecting && <PlusIcon className="-me-0.5 size-3" />}
    </motion.button>
  );
}

export function AssistantStart({
  productName = "Wren",
  userName = "Mara Okafor",
  userInitials = "MO",
  plan = "Pro",
  greeting = "Good afternoon",
  chats: chatsProp = defaultChats,
  projects = defaultProjects,
  apps: appsProp = defaultApps,
  suggestions = defaultSuggestions,
  tools = defaultTools,
  models = defaultModels,
  placeholders = defaultPlaceholders,
  className,
}: AssistantStartProps) {
  const reduce = useReducedMotion();
  const mainGroup = useId();
  const [drawer, setDrawer] = useState(false);
  const [chats, setChats] = useState(chatsProp);
  const [apps, setApps] = useState(appsProp);
  const [prompt, setPrompt] = useState("");
  const [activeTools, setActiveTools] = useState<string[]>(["web"]);
  const [contextIds, setContextIds] = useState<string[]>([]);
  const [files, setFiles] = useState<string[]>([]);
  const [model, setModel] = useState(models[0]?.value ?? "");
  const [connecting, setConnecting] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [stream, setStream] = useState<{ id: string; words: number } | null>(null);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typeTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const connectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const context = useMemo(() => apps.filter((a) => contextIds.includes(a.id)), [apps, contextIds]);
  const firstName = userName.split(" ")[0];

  useEffect(() => {
    if (drawer) drawerRef.current?.focus();
  }, [drawer]);

  useEffect(
    () => () => {
      if (typeTimer.current) clearInterval(typeTimer.current);
      if (connectTimer.current) clearTimeout(connectTimer.current);
    },
    [],
  );

  const streamingMessage = stream ? messages.find((m) => m.id === stream.id) : undefined;
  const totalWords = streamingMessage ? streamingMessage.text.split(" ").length : 0;

  useEffect(() => {
    if (!stream) return;
    if (stream.words >= totalWords) {
      setStream(null);
      return;
    }
    const t = setTimeout(
      () => setStream((s) => (s ? { ...s, words: s.words + (reduce ? totalWords : 2) } : s)),
      stream.words === 0 ? 900 : 45,
    );
    return () => clearTimeout(t);
  }, [stream, totalWords, reduce]);

  useEffect(() => {
    if (!messages.length) return;
    const el = scrollRef.current;
    if (!el) return;
    const raf = requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
    return () => cancelAnimationFrame(raf);
  }, [stream, messages]);

  const ask = (text: string, chatId?: string) => {
    const reply = buildReply(context, files, activeTools);
    const now = Date.now().toString(36);
    const assistantId = `a-${now}`;
    const pair: Message[] = [
      { id: `u-${now}`, role: "user", text },
      { id: assistantId, role: "assistant", text: reply.text, full: reply.text, steps: reply.steps },
    ];
    setMessages((m) => (chatId ? pair : [...m, ...pair]));
    setStream({ id: assistantId, words: 0 });
    if (chatId) {
      setActiveChat(chatId);
    } else if (messages.length === 0) {
      const id = `new-${now}`;
      const title = text.length > 48 ? `${text.slice(0, 46).trimEnd()}…` : text;
      setChats((c) => [{ id, title, time: "now" }, ...c]);
      setActiveChat(id);
    }
  };

  const submit = () => {
    const text = prompt.trim();
    if (!text || stream) return;
    if (typeTimer.current) clearInterval(typeTimer.current);
    setPrompt("");
    ask(text);
  };

  const stop = () => {
    if (!stream) return;
    const { id, words } = stream;
    setMessages((ms) =>
      ms.map((m) => {
        if (m.id !== id) return m;
        const kept = m.text.split(" ").slice(0, words).join(" ").replace(/[\s,.;:]+$/, "");
        return { ...m, text: kept ? `${kept}…` : "", stopped: true };
      }),
    );
    setStream(null);
  };

  const regenerate = (id: string) => {
    if (stream) return;
    setMessages((ms) => ms.map((m) => (m.id === id ? { ...m, text: m.full ?? m.text, stopped: false } : m)));
    setStream({ id, words: 0 });
  };

  const newChat = () => {
    setMessages([]);
    setStream(null);
    setActiveChat(null);
    setPrompt("");
    setDrawer(false);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const openChat = (chat: AssistantChat) => {
    setDrawer(false);
    ask(chat.title, chat.id);
  };

  const fillPrompt = (text: string) => {
    if (typeTimer.current) clearInterval(typeTimer.current);
    textareaRef.current?.focus();
    if (reduce) {
      setPrompt(text);
      return;
    }
    let i = 0;
    typeTimer.current = setInterval(() => {
      i = Math.min(text.length, i + 6);
      setPrompt(text.slice(0, i));
      if (i >= text.length && typeTimer.current) clearInterval(typeTimer.current);
    }, 16);
  };

  const onAppClick = (app: AssistantApp) => {
    if (connecting) return;
    if (!app.connected) {
      setConnecting(app.id);
      connectTimer.current = setTimeout(() => {
        setApps((all) => all.map((a) => (a.id === app.id ? { ...a, connected: true, detail: "Last 90 days" } : a)));
        setContextIds((ids) => [...ids, app.id]);
        setConnecting(null);
      }, 1400);
      return;
    }
    setContextIds((ids) => (ids.includes(app.id) ? ids.filter((x) => x !== app.id) : [...ids, app.id]));
  };

  const promptBox = (compact: boolean) => (
    <PromptBox
      activeTools={activeTools}
      compact={compact}
      context={context}
      files={files}
      model={model}
      models={models}
      onAttach={() =>
        setFiles((f) => (f.includes("q3-renewals.csv") ? [...f, `notes-${f.length}.pdf`] : [...f, "q3-renewals.csv"]))
      }
      onChange={(v) => {
        if (typeTimer.current) clearInterval(typeTimer.current);
        setPrompt(v);
      }}
      onModel={setModel}
      onRemoveContext={(id) => setContextIds((ids) => ids.filter((x) => x !== id))}
      onRemoveFile={(name) => setFiles((f) => f.filter((x) => x !== name))}
      onStop={stop}
      onSubmit={submit}
      streaming={stream !== null}
      onToggleTool={(id) => setActiveTools((t) => (t.includes(id) ? t.filter((x) => x !== id) : [...t, id]))}
      placeholders={compact ? ["Reply to Wren…"] : placeholders}
      textareaRef={textareaRef}
      tools={tools}
      value={prompt}
    />
  );

  const sidebarProps: SidebarBodyProps = {
    productName,
    userName,
    userInitials,
    plan,
    chats,
    projects,
    activeChat,
    onOpenChat: openChat,
    onNewChat: newChat,
  };

  const inChat = messages.length > 0;
  const chatTitle = chats.find((c) => c.id === activeChat)?.title ?? "New chat";

  return (
    <MotionConfig reducedMotion="user">
      <div
        className={cn(
          "@container relative isolate flex h-[760px] w-full overflow-hidden bg-background text-foreground text-sm",
          className,
        )}
        onKeyDown={(e) => {
          if (e.key === "Escape" && drawer) setDrawer(false);
        }}
      >
        <aside className="hidden w-64 shrink-0 border-e bg-muted/40 @3xl:block">
          <SidebarBody {...sidebarProps} />
        </aside>

        <AnimatePresence>
          {drawer && (
            <>
              <motion.div
                animate={{ opacity: 1 }}
                aria-hidden
                className="absolute inset-0 z-40 bg-black/32 @3xl:hidden"
                exit={{ opacity: 0 }}
                initial={{ opacity: 0 }}
                onClick={() => setDrawer(false)}
              />
              <motion.div
                animate={{ x: 0 }}
                aria-label="Navigation"
                aria-modal="true"
                className="absolute inset-y-0 left-0 z-50 w-72 max-w-[85%] border-e bg-background shadow-xs/5 outline-none @3xl:hidden"
                exit={{ x: "-104%" }}
                initial={{ x: "-104%" }}
                ref={drawerRef}
                role="dialog"
                tabIndex={-1}
                transition={spring}
              >
                <SidebarBody {...sidebarProps} onClose={() => setDrawer(false)} />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <LayoutGroup id={mainGroup}>
          <main className="flex min-w-0 flex-1 flex-col">
            <header className="flex h-12 shrink-0 items-center gap-2 border-b px-2 @3xl:hidden">
              <Button aria-label="Open sidebar" className="sm:size-8" onClick={() => setDrawer(true)} size="icon-sm" variant="ghost">
                <MenuIcon />
              </Button>
              <span className="flex items-center gap-1.5 font-heading font-semibold">
                <FeatherIcon className="size-4" />
                {productName}
              </span>
              <Button aria-label="New chat" className="ms-auto sm:size-8" onClick={newChat} size="icon-sm" variant="ghost">
                <SquarePenIcon />
              </Button>
            </header>

            {inChat ? (
              <>
                <div className="flex h-12 shrink-0 items-center gap-2 border-b px-3 @3xl:px-5">
                  <Button aria-label="Back to home" className="sm:size-8" onClick={newChat} size="icon-sm" variant="ghost">
                    <ArrowLeftIcon />
                  </Button>
                  <span className="min-w-0 flex-1 truncate font-medium">{chatTitle}</span>
                  <Badge className="hidden @md:inline-flex" variant="outline">
                    {models.find((m) => m.value === model)?.label}
                  </Badge>
                </div>
                <motion.div className="min-h-0 flex-1 overflow-y-auto" layoutScroll ref={scrollRef}>
                  <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6 @3xl:px-8">
                    {messages.map((m) =>
                      m.role === "user" ? (
                        <motion.div
                          animate={{ opacity: 1, y: 0 }}
                          className="ms-auto max-w-[85%] text-pretty rounded-2xl rounded-br-md bg-muted px-4 py-2.5"
                          initial={{ opacity: 0, y: 8 }}
                          key={m.id}
                          transition={softSpring}
                        >
                          {m.text}
                        </motion.div>
                      ) : (
                        <AssistantMessage
                          key={m.id}
                          message={m}
                          onRegenerate={stream ? undefined : () => regenerate(m.id)}
                          productName={productName}
                          words={stream?.id === m.id ? stream.words : undefined}
                        />
                      ),
                    )}
                  </div>
                </motion.div>
                <div className="mx-auto w-full max-w-2xl shrink-0 px-3 @3xl:px-8">{promptBox(true)}</div>
                <p className="shrink-0 px-4 py-2.5 text-center text-muted-foreground text-xs">
                  {productName} can make mistakes. Check what matters.
                </p>
              </>
            ) : (
              <motion.div className="flex min-h-0 flex-1 flex-col overflow-y-auto" layoutScroll>
                <div className="m-auto flex w-full max-w-2xl flex-col px-4 py-10 @3xl:px-8">
                  <motion.div
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8 flex flex-col items-center gap-5 text-center"
                    initial={{ opacity: 0, y: 8 }}
                    transition={softSpring}
                  >
                    <GooOrb size={48} />
                    <h1 className="text-balance font-medium text-2xl tracking-tight @3xl:text-[1.875rem] @3xl:leading-tight">
                      {greeting}, {firstName}
                    </h1>
                  </motion.div>

                  <div className="relative z-10">{promptBox(false)}</div>

                  <div className="-mt-3 rounded-b-2xl border border-t-0 bg-muted/48 px-3 pt-5.5 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="shrink-0 text-muted-foreground text-xs">Context</span>
                      <FadeScroller className="-my-1 flex min-w-0 flex-1 items-center gap-1.5 py-1">
                        {apps.map((a) => (
                          <AppPill
                            app={a}
                            connecting={connecting === a.id}
                            key={a.id}
                            onClick={() => onAppClick(a)}
                            selected={contextIds.includes(a.id)}
                          />
                        ))}
                        <button
                          className="inline-flex h-7 shrink-0 cursor-pointer items-center gap-1 rounded-full px-2 text-muted-foreground text-xs outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                          type="button"
                        >
                          40+ apps
                          <ArrowUpRightIcon className="size-3" />
                        </button>
                      </FadeScroller>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap justify-center gap-2">
                    {suggestions.map((s, i) => (
                      <motion.button
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-full border bg-background px-3 text-muted-foreground text-xs outline-none transition-[background-color,border-color,color] duration-150 ease-out hover:border-input hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring @3xl:text-sm"
                        initial={{ opacity: 0, y: 6 }}
                        key={s.id}
                        onClick={() => fillPrompt(s.prompt)}
                        title={s.description}
                        transition={{ ...softSpring, delay: 0.04 + 0.03 * Math.min(i, 6) }}
                        type="button"
                        whileTap={{ scale: 0.97 }}
                      >
                        <s.icon className={cn("size-3.5 shrink-0 rounded-sm", tileTone[s.tone], "bg-transparent dark:bg-transparent")} />
                        {s.title}
                      </motion.button>
                    ))}
                  </div>
                </div>
                <p className="mt-auto shrink-0 px-4 py-2.5 text-center text-muted-foreground text-xs">
                  {productName} can make mistakes. Check what matters.
                </p>
              </motion.div>
            )}
          </main>
        </LayoutGroup>
      </div>
    </MotionConfig>
  );
}

function AssistantMessage({
  message,
  productName,
  words,
  onRegenerate,
}: {
  message: Message;
  productName: string;
  words?: number;
  onRegenerate?: () => void;
}) {
  const streaming = words !== undefined;
  const all = message.text.split(" ");
  const shown = streaming ? all.slice(0, words).join(" ") : message.text;
  const thinking = streaming && words === 0;
  const paragraphs = shown.split("\n\n").filter((p) => p.trim());
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1400);
    return () => clearTimeout(t);
  }, [copied]);

  const action = "text-muted-foreground transition-[scale,background-color,color] duration-150 ease-out active:scale-[0.97] sm:size-8";

  return (
    <motion.div animate={{ opacity: 1 }} className="flex gap-3" initial={{ opacity: 0 }} transition={fade}>
      <GooOrb busy={streaming} className="mt-px" size={28} />
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex h-7 items-center gap-2">
          <span className="font-medium">{productName}</span>
          <AnimatePresence initial={false}>
            {thinking && (
              <motion.span
                animate={{ opacity: 1 }}
                className="text-muted-foreground text-xs"
                exit={{ opacity: 0 }}
                initial={{ opacity: 0 }}
                transition={fade}
              >
                Thinking…
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        {message.steps && (
          <ul aria-label="Steps" className="mb-3 flex flex-wrap gap-1.5">
            {message.steps.map((s, i) => (
              <motion.li
                animate={{ opacity: 1, scale: 1 }}
                className="inline-flex h-6 items-center gap-1.5 rounded-full border bg-card px-2 text-muted-foreground text-xs"
                initial={{ opacity: 0, scale: 0.95 }}
                key={s}
                transition={{ ...fade, delay: 0.04 * Math.min(i, 5) }}
              >
                {thinking ? (
                  <LoaderCircleIcon className="size-3 animate-spin" />
                ) : (
                  <CheckIcon className="size-3 text-success-foreground" />
                )}
                {s}
              </motion.li>
            ))}
          </ul>
        )}
        <div aria-live="polite" className="flex flex-col gap-3 text-pretty text-sm/6">
          {paragraphs.map((p, i) => (
            <p key={`${message.id}-${i}`}>
              {p}
              {streaming && !thinking && i === paragraphs.length - 1 && (
                <motion.span
                  animate={{ opacity: [1, 0.25, 1] }}
                  aria-hidden
                  className="ms-0.5 inline-block h-4 w-1.5 translate-y-0.5 rounded-full bg-foreground/60"
                  transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
                />
              )}
            </p>
          ))}
        </div>
        {message.stopped && (
          <p className="mt-2 text-muted-foreground text-xs">
            {paragraphs.length ? "Stopped early." : "Stopped before replying."}
          </p>
        )}
        {!streaming && (
          <motion.div animate={{ opacity: 1 }} className="mt-2 -ms-1.5 flex gap-0.5" initial={{ opacity: 0 }} transition={fade}>
            <Button
              aria-label={copied ? "Copied" : "Copy reply"}
              className={action}
              disabled={!paragraphs.length}
              onClick={() => {
                navigator.clipboard?.writeText(message.text).catch(() => {});
                setCopied(true);
              }}
              size="icon-sm"
              variant="ghost"
            >
              {copied ? <CheckIcon /> : <CopyIcon />}
            </Button>
            <Button
              aria-label="Good reply"
              aria-pressed={liked}
              className={cn(action, liked && "text-info-foreground")}
              onClick={() => setLiked((v) => !v)}
              size="icon-sm"
              variant="ghost"
            >
              <ThumbsUpIcon className={cn(liked && "fill-current/20")} />
            </Button>
            <Button
              aria-label="Regenerate"
              className={action}
              disabled={!onRegenerate}
              onClick={onRegenerate}
              size="icon-sm"
              variant="ghost"
            >
              <RotateCcwIcon />
            </Button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
