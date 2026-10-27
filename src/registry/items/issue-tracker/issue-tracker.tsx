"use client";

import { AnimatePresence, LayoutGroup, MotionConfig, motion } from "motion/react";
import {
  ArrowLeftIcon,
  CheckIcon,
  ChevronDownIcon,
  CircleDotIcon,
  CopyIcon,
  CornerDownLeftIcon,
  ArchiveIcon,
  CalendarIcon,
  LayersIcon,
  ListFilterIcon,
  type LucideIcon,
  MenuIcon,
  PlusIcon,
  SearchIcon,
  TagIcon,
  Trash2Icon,
  UserRoundIcon,
  XIcon,
} from "lucide-react";
import {
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";

export type IssueStatus = "backlog" | "todo" | "in_progress" | "in_review" | "done";
export type IssuePriority = 0 | 1 | 2 | 3 | 4;
export type IssueTone = "blue" | "orange" | "teal" | "violet" | "rose" | "amber" | "emerald" | "sky";

export interface IssuePerson {
  id: string;
  name: string;
  tone: IssueTone;
}

export interface IssueLabel {
  id: string;
  name: string;
  tone: IssueTone;
}

export interface IssueActivity {
  who: string;
  text: string;
  when: string;
  comment?: boolean;
}

export interface Issue {
  id: string;
  title: string;
  status: IssueStatus;
  priority: IssuePriority;
  assignee?: string;
  labels?: string[];
  estimate?: number;
  due?: string;
  created: string;
  description?: string[];
  subtasks?: { title: string; done: boolean }[];
  activity?: IssueActivity[];
}

export interface IssueTrackerProps {
  team?: { name: string; key: string };
  me?: string;
  people?: IssuePerson[];
  labels?: IssueLabel[];
  issues?: Issue[];
  className?: string;
}

const avatarTone: Record<IssueTone, string> = {
  blue: "bg-blue-500/14 text-blue-700 dark:text-blue-300",
  orange: "bg-orange-500/14 text-orange-700 dark:text-orange-300",
  teal: "bg-teal-500/16 text-teal-700 dark:text-teal-300",
  violet: "bg-violet-500/16 text-violet-700 dark:text-violet-300",
  rose: "bg-rose-500/14 text-rose-700 dark:text-rose-300",
  amber: "bg-amber-500/18 text-amber-700 dark:text-amber-300",
  emerald: "bg-emerald-500/16 text-emerald-700 dark:text-emerald-300",
  sky: "bg-sky-500/16 text-sky-700 dark:text-sky-300",
};

const dotTone: Record<IssueTone, string> = {
  blue: "bg-blue-500",
  orange: "bg-orange-500",
  teal: "bg-teal-500",
  violet: "bg-violet-500",
  rose: "bg-rose-500",
  amber: "bg-amber-500",
  emerald: "bg-emerald-500",
  sky: "bg-sky-500",
};

const ease = [0.23, 1, 0.32, 1] as const;
const glide = { type: "spring", stiffness: 500, damping: 44 } as const;

const groupTone: Record<IssueStatus, string> = {
  backlog: "from-muted/80 to-muted/80 dark:from-muted/60 dark:to-muted/60",
  todo: "from-muted/80 to-muted/80 dark:from-muted/60 dark:to-muted/60",
  in_progress: "from-amber-500/6 to-amber-500/6 dark:from-amber-400/7 dark:to-amber-400/7",
  in_review: "from-emerald-500/6 to-emerald-500/6 dark:from-emerald-400/7 dark:to-emerald-400/7",
  done: "from-blue-500/6 to-blue-500/6 dark:from-blue-400/7 dark:to-blue-400/7",
};

const STATUSES: { id: IssueStatus; label: string }[] = [
  { id: "in_progress", label: "In Progress" },
  { id: "in_review", label: "In Review" },
  { id: "todo", label: "Todo" },
  { id: "backlog", label: "Backlog" },
  { id: "done", label: "Done" },
];
const statusLabel = (s: IssueStatus) => STATUSES.find((x) => x.id === s)?.label ?? s;

const PRIORITIES: { id: IssuePriority; label: string }[] = [
  { id: 1, label: "Urgent" },
  { id: 2, label: "High" },
  { id: 3, label: "Medium" },
  { id: 4, label: "Low" },
  { id: 0, label: "No priority" },
];
const priorityLabel = (p: IssuePriority) => PRIORITIES.find((x) => x.id === p)?.label ?? "";

const initials = (name: string) =>
  name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

function StatusIcon({ status, className }: { status: IssueStatus; className?: string }) {
  const c = cn("size-3.5 shrink-0", className);
  if (status === "backlog")
    return (
      <svg aria-hidden className={cn(c, "text-muted-foreground")} viewBox="0 0 14 14">
        <circle cx="7" cy="7" fill="none" r="5.5" stroke="currentColor" strokeDasharray="2.2 1.8" strokeWidth="1.5" />
      </svg>
    );
  if (status === "todo")
    return (
      <svg aria-hidden className={cn(c, "text-muted-foreground")} viewBox="0 0 14 14">
        <circle cx="7" cy="7" fill="none" r="5.5" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  if (status === "in_progress")
    return (
      <svg aria-hidden className={cn(c, "text-amber-500")} viewBox="0 0 14 14">
        <circle cx="7" cy="7" fill="none" r="5.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M7 3.5 A3.5 3.5 0 0 1 7 10.5 Z" fill="currentColor" />
      </svg>
    );
  if (status === "in_review")
    return (
      <svg aria-hidden className={cn(c, "text-emerald-500")} viewBox="0 0 14 14">
        <circle cx="7" cy="7" fill="none" r="5.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M7 3.5 A3.5 3.5 0 1 1 3.5 7 L7 7 Z" fill="currentColor" />
      </svg>
    );
  return (
    <svg aria-hidden className={cn(c, "text-blue-500")} viewBox="0 0 14 14">
      <circle cx="7" cy="7" fill="currentColor" r="6.25" />
      <path d="M4.4 7.2 6.2 9 9.7 5.3" fill="none" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
    </svg>
  );
}

function PriorityIcon({ priority, className }: { priority: IssuePriority; className?: string }) {
  if (priority === 1)
    return (
      <span
        aria-hidden
        className={cn("flex size-3.5 shrink-0 items-center justify-center rounded-[3px] bg-orange-500 font-bold text-[10px] text-white leading-none", className)}
      >
        !
      </span>
    );
  if (priority === 0)
    return (
      <svg aria-hidden className={cn("size-3.5 shrink-0 text-muted-foreground", className)} viewBox="0 0 14 14">
        {[2.5, 6, 9.5].map((x) => (
          <rect fill="currentColor" height="1.5" key={x} opacity="0.7" rx="0.75" width="2" x={x} y="6.25" />
        ))}
      </svg>
    );
  const filled = 5 - priority;
  return (
    <svg aria-hidden className={cn("size-3.5 shrink-0 text-foreground/80", className)} viewBox="0 0 14 14">
      {[0, 1, 2].map((i) => (
        <rect
          fill="currentColor"
          height={4 + i * 3}
          key={i}
          opacity={i < filled ? 1 : 0.22}
          rx="1"
          width="3"
          x={1.5 + i * 4}
          y={11.5 - (4 + i * 3)}
        />
      ))}
    </svg>
  );
}

function PersonAvatar({ person, size = "size-5" }: { person?: IssuePerson; size?: string }) {
  if (!person)
    return (
      <span className={cn("flex shrink-0 items-center justify-center rounded-full border border-muted-foreground/50 border-dashed text-muted-foreground", size)}>
        <UserRoundIcon className="size-2.5" />
      </span>
    );
  return (
    <Avatar className={size}>
      <AvatarFallback className={cn("font-medium text-[9px]", avatarTone[person.tone])}>{initials(person.name)}</AvatarFallback>
    </Avatar>
  );
}

const defaultPeople: IssuePerson[] = [
  { id: "maya", name: "Maya Okafor", tone: "teal" },
  { id: "sam", name: "Sam Whitfield", tone: "amber" },
  { id: "jonas", name: "Jonas Weber", tone: "blue" },
  { id: "leo", name: "Leo Marchetti", tone: "rose" },
  { id: "ana", name: "Ana Sousa", tone: "orange" },
  { id: "priya", name: "Priya Raman", tone: "violet" },
];

const defaultLabels: IssueLabel[] = [
  { id: "bug", name: "Bug", tone: "rose" },
  { id: "feature", name: "Feature", tone: "violet" },
  { id: "infra", name: "Infra", tone: "sky" },
  { id: "perf", name: "Performance", tone: "amber" },
  { id: "docs", name: "Docs", tone: "emerald" },
];

const defaultIssues: Issue[] = [
  {
    id: "PLT-231",
    title: "Poison messages stall the webhook consumer",
    status: "in_progress",
    priority: 1,
    assignee: "sam",
    labels: ["bug", "infra"],
    estimate: 3,
    due: "Oct 24",
    created: "Oct 21",
    description: [
      "A single malformed payload blocks the consumer for its partition. Retries keep it at the head of the queue, so deliveries behind it wait until the message expires.",
      "Move messages that fail three times to a dead-letter queue and keep the consumer moving. Surface them in the delivery dashboard with a one-click replay.",
    ],
    subtasks: [
      { title: "Dead-letter queue with 7-day retention", done: true },
      { title: "Skip after 3 failed attempts", done: true },
      { title: "Replay from the dashboard", done: false },
    ],
    activity: [
      { who: "jonas", text: "created the issue", when: "Oct 21" },
      { who: "jonas", text: "set priority to Urgent", when: "Oct 21" },
      { who: "sam", text: "Reproduced with a truncated JSON body from a customer integration. Patch is up behind a flag.", when: "Oct 22", comment: true },
    ],
  },
  { id: "PLT-224", title: "Replay tool for missed webhook deliveries", status: "in_progress", priority: 2, assignee: "jonas", labels: ["feature"], estimate: 5, due: "Oct 30", created: "Oct 19" },
  { id: "PLT-215", title: "Move job scheduler to the new queue", status: "in_progress", priority: 3, assignee: "maya", labels: ["infra"], estimate: 8, created: "Oct 12" },
  { id: "PLT-218", title: "Rate limit headers missing on 429 responses", status: "in_review", priority: 3, assignee: "leo", labels: ["bug"], estimate: 1, created: "Oct 17" },
  { id: "PLT-198", title: "Flaky test: delivery ordering under load", status: "in_review", priority: 4, assignee: "sam", labels: ["bug"], estimate: 2, created: "Oct 9" },
  { id: "PLT-212", title: "p95 latency regression on /v2/events", status: "todo", priority: 1, assignee: "ana", labels: ["perf", "bug"], estimate: 3, due: "Oct 25", created: "Oct 20" },
  { id: "PLT-229", title: "Alert when consumer lag exceeds 2 minutes", status: "todo", priority: 2, assignee: "sam", labels: ["infra"], estimate: 2, created: "Oct 22" },
  { id: "PLT-209", title: "Rotate signing secrets without downtime", status: "todo", priority: 3, labels: ["feature"], estimate: 5, created: "Oct 15" },
  { id: "PLT-205", title: "Document retry semantics for webhooks", status: "todo", priority: 4, assignee: "priya", labels: ["docs"], estimate: 1, created: "Oct 14" },
  { id: "PLT-196", title: "Per-endpoint delivery dashboard", status: "backlog", priority: 3, assignee: "priya", labels: ["feature"], created: "Oct 8" },
  { id: "PLT-201", title: "Deprecate the v1 events endpoint", status: "backlog", priority: 4, labels: ["docs"], created: "Oct 11" },
  { id: "PLT-185", title: "Batch webhook deliveries per endpoint", status: "backlog", priority: 0, labels: ["perf"], created: "Oct 2" },
  { id: "PLT-190", title: "Upgrade Postgres to 17", status: "done", priority: 2, assignee: "leo", labels: ["infra"], estimate: 5, created: "Oct 3" },
  { id: "PLT-188", title: "Add jitter to retry backoff", status: "done", priority: 3, assignee: "sam", labels: ["infra"], estimate: 1, created: "Oct 1" },
];

type PaletteMode = "root" | "status" | "priority" | "assignee" | "label";

interface Command {
  id: string;
  label: string;
  group: string;
  icon: ReactNode;
  hint?: string;
  checked?: boolean;
  keepOpen?: boolean;
  run: () => void;
}

function Palette({
  mode,
  commands,
  target,
  onClose,
  onBack,
}: {
  mode: PaletteMode;
  commands: Command[];
  target: string;
  onClose: () => void;
  onBack: () => void;
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const q = query.trim().toLowerCase();
  const filtered = commands.filter((c) => !q || c.label.toLowerCase().includes(q) || c.group.toLowerCase().includes(q));
  const groups = Array.from(new Set(filtered.map((c) => c.group)));

  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  useEffect(() => {
    setActive(0);
    setQuery("");
  }, [mode]);
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`);
    if (el && listRef.current) {
      const box = listRef.current;
      if (el.offsetTop < box.scrollTop) box.scrollTop = el.offsetTop - 4;
      else if (el.offsetTop + el.offsetHeight > box.scrollTop + box.clientHeight) box.scrollTop = el.offsetTop + el.offsetHeight - box.clientHeight + 4;
    }
  }, [active]);

  const placeholder: Record<PaletteMode, string> = {
    root: "Type a command or search…",
    status: "Change status…",
    priority: "Set priority…",
    assignee: "Assign to…",
    label: "Add or remove labels…",
  };

  return (
    <motion.div
      animate={{ opacity: 1 }}
      className="absolute inset-0 z-50 flex items-start justify-center bg-black/24 px-3 pt-16 @3xl:pt-24"
      exit={{ opacity: 0 }}
      initial={{ opacity: 0 }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      transition={{ duration: 0.12 }}
    >
      <motion.div
        animate={{ opacity: 1, scale: 1 }}
        aria-label="Command menu"
        aria-modal="true"
        className="flex max-h-[420px] w-full max-w-lg origin-top flex-col overflow-hidden rounded-2xl border bg-popover shadow-lg/10"
        exit={{ opacity: 0, scale: 0.98 }}
        initial={{ opacity: 0, scale: 0.98 }}
        role="dialog"
        transition={{ duration: 0.14, ease }}
      >
        <div className="flex items-center gap-2 px-3 pt-3">
          <span className="max-w-full truncate rounded-md bg-muted px-1.5 py-0.5 font-medium font-mono text-[11px] text-muted-foreground">{target}</span>
        </div>
        <div className="flex items-center gap-2 border-b px-3">
          <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
          <input
            aria-activedescendant={filtered[active] ? `cmd-${filtered[active].id}` : undefined}
            aria-controls="cmd-list"
            aria-expanded
            aria-label={placeholder[mode]}
            className="h-12 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(filtered.length - 1, a + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(0, a - 1));
              } else if (e.key === "Enter") {
                e.preventDefault();
                const c = filtered[active];
                if (c) {
                  c.run();
                  if (!c.keepOpen) onClose();
                }
              } else if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              } else if (e.key === "Backspace" && !query && mode !== "root") {
                e.preventDefault();
                onBack();
              }
            }}
            placeholder={placeholder[mode]}
            ref={inputRef}
            role="combobox"
            value={query}
          />
          <Kbd>Esc</Kbd>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-1.5 [scrollbar-width:thin]" id="cmd-list" ref={listRef} role="listbox">
          {filtered.length === 0 && <div className="px-3 py-8 text-center text-muted-foreground text-sm">No commands match “{query}”</div>}
          {groups.map((g) => (
            <div className="mb-1" key={g} role="group" aria-label={g}>
              <div className="px-2.5 pt-2 pb-1 font-medium text-muted-foreground text-xs">{g}</div>
              {filtered
                .filter((c) => c.group === g)
                .map((c) => {
                  const i = filtered.indexOf(c);
                  return (
                    <div
                      aria-selected={i === active}
                      className={cn(
                        "flex h-9 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-sm",
                        i === active ? "bg-accent text-foreground" : "text-foreground/90",
                      )}
                      data-index={i}
                      id={`cmd-${c.id}`}
                      key={c.id}
                      onClick={() => {
                        c.run();
                        if (!c.keepOpen) onClose();
                      }}
                      onMouseMove={() => setActive(i)}
                      role="option"
                    >
                      <span className="flex size-4 items-center justify-center text-muted-foreground">{c.icon}</span>
                      <span className="flex-1 truncate">{c.label}</span>
                      {c.checked && <CheckIcon className="size-4 text-foreground" />}
                      {c.hint && <Kbd>{c.hint}</Kbd>}
                    </div>
                  );
                })}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 border-t px-3 py-2 text-muted-foreground text-xs">
          <span className="flex items-center gap-1">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd> navigate
          </span>
          <span className="flex items-center gap-1">
            <Kbd>
              <CornerDownLeftIcon />
            </Kbd>{" "}
            select
          </span>
          {mode !== "root" && (
            <span className="ms-auto flex items-center gap-1">
              <Kbd>⌫</Kbd> back
            </span>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function Property({ label, onClick, children }: { label: string; onClick?: () => void; children: ReactNode }) {
  return (
    <div className="flex min-h-8 items-center gap-2">
      <span className="w-20 shrink-0 text-muted-foreground text-xs">{label}</span>
      <button
        className="-ms-2 flex h-8 min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-lg px-2 text-left outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
        onClick={onClick}
        type="button"
      >
        {children}
      </button>
    </div>
  );
}

type IssueView = "mine" | "active" | "backlog" | "all";

const navItems: { id: IssueView; label: string; title: string; icon: LucideIcon }[] = [
  { id: "mine", label: "My issues", title: "My issues", icon: CircleDotIcon },
  { id: "active", label: "Active", title: "Active issues", icon: LayersIcon },
  { id: "backlog", label: "Backlog", title: "Backlog", icon: ArchiveIcon },
  { id: "all", label: "All issues", title: "All issues", icon: ListFilterIcon },
];

const inView = (view: IssueView, i: Issue, me: string) =>
  view === "mine" ? i.assignee === me : view === "active" ? i.status !== "backlog" : view === "backlog" ? i.status === "backlog" : true;

export function IssueTracker({
  team = { name: "Platform", key: "PLT" },
  me = "maya",
  people = defaultPeople,
  labels = defaultLabels,
  issues: initialIssues = defaultIssues,
  className,
}: IssueTrackerProps) {
  const [issues, setIssues] = useState(initialIssues);
  const [cursor, setCursor] = useState(initialIssues[0]?.id ?? "");
  const [picked, setPicked] = useState<Set<string>>(() => new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [palette, setPalette] = useState<{ mode: PaletteMode; ids: string[] } | null>(null);
  const [collapsed, setCollapsed] = useState<Set<IssueStatus>>(() => new Set());
  const [query, setQuery] = useState("");
  const [view, setView] = useState<IssueView>("active");
  const [searchOpen, setSearchOpen] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [comment, setComment] = useState("");
  const [toast, setToast] = useState<{ key: number; text: string } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const mobileSearchRef = useRef<HTMLInputElement>(null);
  const focusSearch = () =>
    requestAnimationFrame(() => (searchRef.current?.offsetParent ? searchRef.current : mobileSearchRef.current)?.focus());
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const rowRefs = useRef(new Map<string, HTMLElement>());
  const detailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(id);
  }, [toast]);

  const person = (id?: string) => people.find((p) => p.id === id);
  const label = (id: string) => labels.find((l) => l.id === id);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return issues.filter(
      (i) => inView(view, i, me) && (!q || i.title.toLowerCase().includes(q) || i.id.toLowerCase().includes(q)),
    );
  }, [issues, query, view, me]);

  const groups = STATUSES.map((s) => ({
    ...s,
    items: filtered.filter((i) => i.status === s.id).sort((a, b) => (a.priority || 9) - (b.priority || 9)),
  })).filter((g) => g.items.length > 0);

  const flat = groups.flatMap((g) => (collapsed.has(g.id) ? [] : g.items));
  const open = issues.find((i) => i.id === openId) ?? null;

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset when another issue opens
  useEffect(() => {
    if (detailRef.current) detailRef.current.scrollTop = 0;
  }, [openId]);

  const focusRow = (id: string) => {
    setCursor(id);
    const el = rowRefs.current.get(id);
    const box = listRef.current;
    if (el && box) {
      el.focus({ preventScroll: true });
      const top = el.offsetTop - 36;
      const bottom = el.offsetTop + el.offsetHeight;
      if (top < box.scrollTop) box.scrollTop = top;
      else if (bottom > box.scrollTop + box.clientHeight) box.scrollTop = bottom - box.clientHeight + 8;
    }
  };

  const move = (d: number) => {
    if (!flat.length) return;
    const i = flat.findIndex((x) => x.id === cursor);
    const next = flat[Math.max(0, Math.min(flat.length - 1, (i < 0 ? 0 : i + d)))];
    if (!next) return;
    focusRow(next.id);
    if (openId) setOpenId(next.id);
  };

  const targets = () => (picked.size ? Array.from(picked) : cursor ? [cursor] : []);
  const describe = (ids: string[]) => (ids.length === 1 ? ids[0] : `${ids.length} issues`);

  const update = (ids: string[], fn: (i: Issue) => Partial<Issue>, log?: (i: Issue) => string) =>
    setIssues((all) =>
      all.map((i) => {
        if (!ids.includes(i.id)) return i;
        const p = fn(i);
        const entry = log?.(i);
        return { ...i, ...p, activity: entry ? [...(i.activity ?? []), { who: me, text: entry, when: "just now" }] : i.activity };
      }),
    );

  const setStatus = (ids: string[], status: IssueStatus) => {
    update(ids, () => ({ status }), () => `moved to ${statusLabel(status)}`);
    if (status === "done" && collapsed.has("done")) setToast({ key: Date.now(), text: `${describe(ids)} marked done` });
  };
  const setPriority = (ids: string[], priority: IssuePriority) => update(ids, () => ({ priority }), () => `set priority to ${priorityLabel(priority)}`);
  const setAssignee = (ids: string[], assignee?: string) =>
    update(ids, () => ({ assignee }), () => (assignee ? `assigned ${person(assignee)?.name.split(" ")[0]}` : "removed the assignee"));
  const toggleLabel = (ids: string[], lid: string) => {
    const allHave = ids.every((id) => issues.find((i) => i.id === id)?.labels?.includes(lid));
    update(ids, (i) => ({ labels: allHave ? (i.labels ?? []).filter((l) => l !== lid) : Array.from(new Set([...(i.labels ?? []), lid])) }));
  };

  const createIssue = (status: IssueStatus = view === "backlog" ? "backlog" : "todo") => {
    const n = Math.max(0, ...issues.map((i) => Number(i.id.split("-")[1]) || 0)) + 1;
    const id = `${team.key}-${n}`;
    setIssues((all) => [
      { id, title: "", status, priority: 0, assignee: me, created: "Today", activity: [{ who: me, text: "created the issue", when: "just now" }] },
      ...all,
    ]);
    setQuery("");
    setCollapsed((c) => {
      const next = new Set(c);
      next.delete(status);
      return next;
    });
    setCursor(id);
    setOpenId(id);
    requestAnimationFrame(() => titleRef.current?.focus());
  };

  const remove = (ids: string[]) => {
    setIssues((all) => all.filter((i) => !ids.includes(i.id)));
    setPicked(new Set());
    if (openId && ids.includes(openId)) setOpenId(null);
    setToast({ key: Date.now(), text: `Deleted ${describe(ids)}` });
    rootRef.current?.focus({ preventScroll: true });
  };

  const commandsFor = (mode: PaletteMode, ids: string[]): Command[] => {
    const one = ids.length === 1 ? issues.find((i) => i.id === ids[0]) : undefined;
    if (mode === "status")
      return STATUSES.map((s) => ({
        id: `s-${s.id}`,
        label: s.label,
        group: "Status",
        icon: <StatusIcon status={s.id} />,
        checked: one?.status === s.id,
        run: () => setStatus(ids, s.id),
      }));
    if (mode === "priority")
      return PRIORITIES.map((p) => ({
        id: `p-${p.id}`,
        label: p.label,
        group: "Priority",
        icon: <PriorityIcon priority={p.id} />,
        hint: String(p.id),
        checked: one?.priority === p.id,
        run: () => setPriority(ids, p.id),
      }));
    if (mode === "assignee")
      return [
        ...people.map((p) => ({
          id: `a-${p.id}`,
          label: p.id === me ? `${p.name} (you)` : p.name,
          group: "Assignee",
          icon: <PersonAvatar person={p} size="size-4" />,
          checked: one?.assignee === p.id,
          run: () => setAssignee(ids, p.id),
        })),
        { id: "a-none", label: "No assignee", group: "Assignee", icon: <PersonAvatar size="size-4" />, checked: one ? !one.assignee : false, run: () => setAssignee(ids, undefined) },
      ];
    if (mode === "label")
      return labels.map((l) => ({
        id: `l-${l.id}`,
        label: l.name,
        group: "Labels",
        icon: <span className={cn("size-2 rounded-full", dotTone[l.tone])} />,
        checked: ids.every((id) => issues.find((i) => i.id === id)?.labels?.includes(l.id)),
        keepOpen: true,
        run: () => toggleLabel(ids, l.id),
      }));
    const has = ids.length > 0;
    return [
      ...(has
        ? [
            { id: "c-status", label: "Change status…", group: "Issue", icon: <StatusIcon status="in_progress" />, hint: "S", keepOpen: true, run: () => setPalette({ mode: "status", ids }) },
            { id: "c-priority", label: "Set priority…", group: "Issue", icon: <PriorityIcon priority={2} />, hint: "P", keepOpen: true, run: () => setPalette({ mode: "priority", ids }) },
            { id: "c-assign", label: "Assign to…", group: "Issue", icon: <UserRoundIcon className="size-4" />, hint: "A", keepOpen: true, run: () => setPalette({ mode: "assignee", ids }) },
            { id: "c-label", label: "Add label…", group: "Issue", icon: <TagIcon className="size-4" />, hint: "L", keepOpen: true, run: () => setPalette({ mode: "label", ids }) },
            { id: "c-me", label: "Assign to me", group: "Issue", icon: <PersonAvatar person={person(me)} size="size-4" />, hint: "I", run: () => setAssignee(ids, me) },
            {
              id: "c-copy",
              label: ids.length === 1 ? `Copy ${ids[0]}` : "Copy IDs",
              group: "Issue",
              icon: <CopyIcon className="size-4" />,
              run: () => {
                navigator.clipboard?.writeText(ids.join(", ")).catch(() => {});
                setToast({ key: Date.now(), text: `Copied ${describe(ids)}` });
              },
            },
            { id: "c-delete", label: ids.length === 1 ? "Delete issue" : `Delete ${ids.length} issues`, group: "Issue", icon: <Trash2Icon className="size-4" />, run: () => remove(ids) },
          ]
        : []),
      { id: "c-new", label: "Create new issue", group: "Workspace", icon: <PlusIcon className="size-4" />, hint: "C", run: () => createIssue() },
      ...navItems
        .filter((n) => n.id !== view)
        .map((n) => ({ id: `v-${n.id}`, label: `Go to ${n.label}`, group: "Views", icon: <n.icon className="size-4" />, run: () => goView(n.id) })),
      {
        id: "c-done",
        label: collapsed.has("done") ? "Show completed issues" : "Hide completed issues",
        group: "Workspace",
        icon: <StatusIcon status="done" />,
        run: () =>
          setCollapsed((c) => {
            const next = new Set(c);
            if (next.has("done")) next.delete("done");
            else next.add("done");
            return next;
          }),
      },
    ];
  };

  const goView = (v: IssueView) => {
    setView(v);
    setPicked(new Set());
    setDrawer(false);
    listRef.current?.scrollTo({ top: 0 });
    if (v === "backlog")
      setCollapsed((c) => {
        const next = new Set(c);
        next.delete("backlog");
        return next;
      });
  };

  const closePalette = () => {
    setPalette(null);
    requestAnimationFrame(() => {
      const el = rowRefs.current.get(cursor);
      (el ?? rootRef.current)?.focus({ preventScroll: true });
    });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (palette) return;
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      setPalette({ mode: "root", ids: targets() });
      return;
    }
    const t = e.target as HTMLElement;
    if (t.tagName === "INPUT" || t.tagName === "TEXTAREA") {
      if (e.key === "Escape") {
        t.blur();
        rootRef.current?.focus({ preventScroll: true });
      }
      return;
    }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k === "j" || e.key === "ArrowDown") {
      e.preventDefault();
      move(1);
    } else if (k === "k" || e.key === "ArrowUp") {
      e.preventDefault();
      move(-1);
    } else if (e.key === "Enter" || k === "o") {
      e.preventDefault();
      if (cursor) setOpenId(cursor);
    } else if (e.key === "Escape") {
      if (drawer) setDrawer(false);
      else if (openId) {
        setOpenId(null);
        focusRow(cursor);
      } else if (picked.size) setPicked(new Set());
    } else if (k === "x" && cursor) {
      e.preventDefault();
      setPicked((p) => {
        const next = new Set(p);
        if (next.has(cursor)) next.delete(cursor);
        else next.add(cursor);
        return next;
      });
    } else if (k === "s" || k === "p" || k === "a" || k === "l") {
      e.preventDefault();
      const ids = targets();
      if (ids.length) setPalette({ mode: ({ s: "status", p: "priority", a: "assignee", l: "label" } as const)[k], ids });
    } else if (k === "i") {
      const ids = targets();
      if (ids.length) setAssignee(ids, me);
    } else if (["0", "1", "2", "3", "4"].includes(e.key)) {
      const ids = targets();
      if (ids.length) setPriority(ids, Number(e.key) as IssuePriority);
    } else if (k === "c") {
      e.preventDefault();
      createIssue();
    } else if (e.key === "/") {
      e.preventDefault();
      setSearchOpen(true);
      focusSearch();
    }
  };

  const sidebar = (onClose?: () => void) => (
    <div className="flex h-full flex-col px-2 pt-3 pb-3">
      <div className="flex items-center gap-2 px-1.5 pb-3">
        <span className="flex size-7 items-center justify-center rounded-lg bg-sky-600 font-semibold text-[11px] text-white">{team.key.slice(0, 2)}</span>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate font-medium">Kestrel</div>
          <div className="truncate text-muted-foreground text-xs">{team.name} team</div>
        </div>
        {onClose && (
          <Button aria-label="Close navigation" onClick={onClose} size="icon-sm" variant="ghost">
            <XIcon />
          </Button>
        )}
      </div>
      <button
        className="mb-3 flex h-8 w-full cursor-pointer items-center gap-2 rounded-lg border bg-background px-2.5 text-muted-foreground shadow-xs/5 outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring dark:bg-input/32"
        onClick={() => {
          onClose?.();
          setPalette({ mode: "root", ids: targets() });
        }}
        type="button"
      >
        <SearchIcon className="size-4" />
        <span className="flex-1 text-left">Command</span>
        <Kbd>⌘K</Kbd>
      </button>
      <nav aria-label="Views" className="flex flex-col gap-0.5">
        {navItems.map((n) => {
          const on = n.id === view;
          const count = issues.filter((i) => inView(n.id, i, me) && i.status !== "done").length;
          return (
            <button
              aria-current={on ? "page" : undefined}
              className={cn(
                "group/nav relative flex h-8 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-left text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ring",
                on ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
              key={n.id}
              onClick={() => goView(n.id)}
              type="button"
            >
              {on ? (
                <motion.span
                  className="absolute inset-0 rounded-lg bg-accent"
                  layoutId={onClose ? "issue-nav-drawer" : "issue-nav"}
                  transition={{ type: "spring", stiffness: 520, damping: 42 }}
                />
              ) : (
                <span className="absolute inset-0 rounded-lg transition-colors group-hover/nav:bg-accent/60" />
              )}
              <n.icon className="relative size-4" />
              <span className="relative flex-1 font-medium">{n.label}</span>
              <span className="relative text-muted-foreground text-xs tabular-nums">{count}</span>
            </button>
          );
        })}
      </nav>
      <div className="mt-6 px-2.5 font-medium text-muted-foreground text-xs">Cycle 42 · ends Oct 30</div>
      <div className="mx-2.5 mt-2">
        <div className="flex h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-blue-500" style={{ width: `${(issues.filter((i) => i.status === "done").length / Math.max(1, issues.length)) * 100}%` }} />
          <div className="h-full bg-emerald-500" style={{ width: `${(issues.filter((i) => i.status === "in_review").length / Math.max(1, issues.length)) * 100}%` }} />
          <div className="h-full bg-amber-500" style={{ width: `${(issues.filter((i) => i.status === "in_progress").length / Math.max(1, issues.length)) * 100}%` }} />
        </div>
        <div className="mt-2 flex justify-between text-muted-foreground text-xs tabular-nums">
          <span>
            {issues.filter((i) => i.status === "done").length} of {issues.length} done
          </span>
          <span>6 days left</span>
        </div>
      </div>
      <div className="mt-auto flex flex-col gap-1.5 px-2.5 text-muted-foreground text-xs">
        {[
          ["J K", "move"],
          ["S P A L", "set fields"],
          ["X", "select"],
          ["⌘K", "everything else"],
        ].map(([k, v]) => (
          <div className="flex items-center gap-1.5" key={k}>
            {k.split(" ").map((x) => (
              <Kbd key={x}>{x}</Kbd>
            ))}
            <span className="truncate">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <MotionConfig reducedMotion="user">
      <div
        className={cn("@container relative isolate flex h-[760px] w-full overflow-hidden bg-sidebar text-foreground text-sm outline-none", className)}
        onKeyDown={onKeyDown}
        ref={rootRef}
        tabIndex={-1}
      >
        <aside aria-label="Navigation" className="hidden w-56 shrink-0 @5xl:block">
          {sidebar()}
        </aside>

        <AnimatePresence>
          {drawer && (
            <>
              <motion.div
                animate={{ opacity: 1 }}
                aria-hidden
                className="absolute inset-0 z-40 bg-black/32 @5xl:hidden"
                exit={{ opacity: 0 }}
                initial={{ opacity: 0 }}
                onClick={() => setDrawer(false)}
              />
              <motion.div
                animate={{ x: 0 }}
                aria-label="Navigation"
                aria-modal="true"
                className="absolute inset-y-2 left-2 z-50 w-[248px] max-w-[calc(100%-3rem)] overflow-hidden rounded-2xl border bg-sidebar shadow-lg/10 @5xl:hidden"
                exit={{ x: "-110%" }}
                initial={{ x: "-110%" }}
                role="dialog"
                transition={{ type: "spring", stiffness: 420, damping: 40 }}
              >
                {sidebar(() => setDrawer(false))}
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <main className="relative flex min-w-0 flex-1 overflow-hidden bg-background @5xl:my-2 @5xl:me-2 @5xl:rounded-2xl @5xl:border @5xl:shadow-xs/5">
          <section aria-label="Issues" className="flex min-w-0 flex-1 flex-col">
            <header className="flex h-13 shrink-0 items-center gap-2 border-b px-3 @lg:px-4">
              <Button aria-label="Open navigation" className="@5xl:hidden" onClick={() => setDrawer(true)} size="icon-sm" variant="ghost">
                <MenuIcon />
              </Button>
              <h2 className="font-semibold">{navItems.find((n) => n.id === view)?.title}</h2>
              <span className="text-muted-foreground text-xs tabular-nums">{filtered.filter((i) => i.status !== "done").length}</span>
              <div className="ms-auto flex items-center gap-1.5">
                <Button
                  aria-label="Filter issues"
                  aria-pressed={searchOpen}
                  className="@2xl:hidden"
                  onClick={() => {
                    setSearchOpen((v) => !v);
                    if (!searchOpen) focusSearch();
                    else setQuery("");
                  }}
                  size="icon-sm"
                  variant="ghost"
                >
                  <SearchIcon />
                </Button>
                <label className="hidden h-8 w-52 items-center gap-2 rounded-lg border bg-background px-2.5 text-muted-foreground shadow-xs/5 transition-shadow focus-within:border-ring/60 focus-within:ring-3 focus-within:ring-ring/16 @2xl:flex dark:bg-input/32">
                  <SearchIcon className="size-3.5 shrink-0" />
                  <input
                    aria-label="Filter issues"
                    className="min-w-0 flex-1 bg-transparent text-foreground text-sm outline-none placeholder:text-muted-foreground"
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowDown" || e.key === "Enter") {
                        e.preventDefault();
                        if (flat[0]) focusRow(flat[0].id);
                      }
                      if (e.key === "Escape") {
                        setQuery("");
                        setSearchOpen(false);
                      }
                    }}
                    placeholder="Filter by title or ID"
                    ref={searchRef}
                    value={query}
                  />
                  {query ? (
                    <button
                      aria-label="Clear filter"
                      className="-me-1.5 flex size-6 cursor-pointer items-center justify-center rounded-md outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => setQuery("")}
                      type="button"
                    >
                      <XIcon className="size-3.5" />
                    </button>
                  ) : (
                    <Kbd>/</Kbd>
                  )}
                </label>
                <Button className="transition-[box-shadow,scale] duration-150 ease-out active:scale-[0.97]" onClick={() => createIssue()} size="sm">
                  <PlusIcon />
                  <span className="hidden @md:inline">New issue</span>
                </Button>
              </div>
            </header>

            {searchOpen && (
              <div className="flex h-11 shrink-0 items-center gap-2 border-b px-4 @2xl:hidden">
                <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
                <input
                  aria-label="Filter issues by title or ID"
                  className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      (e.target as HTMLInputElement).blur();
                    }
                    if (e.key === "Escape") {
                      setQuery("");
                      setSearchOpen(false);
                    }
                  }}
                  placeholder="Filter by title or ID"
                  ref={mobileSearchRef}
                  value={query}
                />
                <Button
                  aria-label="Close filter"
                  onClick={() => {
                    setQuery("");
                    setSearchOpen(false);
                  }}
                  size="icon-xs"
                  variant="ghost"
                >
                  <XIcon />
                </Button>
              </div>
            )}

            <AnimatePresence initial={false}>
              {picked.size > 0 && (
                <motion.div
                  animate={{ height: 44, opacity: 1 }}
                  className="flex shrink-0 items-center gap-2 overflow-hidden border-b bg-muted/50 px-3 @lg:px-4"
                  exit={{ height: 0, opacity: 0 }}
                  initial={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18, ease }}
                >
                  <span className="font-medium tabular-nums">{picked.size} selected</span>
                  <div className="ms-auto flex items-center gap-1">
                    <Button onClick={() => setPalette({ mode: "status", ids: Array.from(picked) })} size="xs" variant="outline">
                      <StatusIcon status="in_progress" /> Status
                    </Button>
                    <Button className="hidden @md:inline-flex" onClick={() => setPalette({ mode: "priority", ids: Array.from(picked) })} size="xs" variant="outline">
                      <PriorityIcon priority={2} /> Priority
                    </Button>
                    <Button onClick={() => setPalette({ mode: "assignee", ids: Array.from(picked) })} size="xs" variant="outline">
                      <UserRoundIcon /> Assign
                    </Button>
                    <Button aria-label="Clear selection" onClick={() => setPicked(new Set())} size="icon-xs" variant="ghost">
                      <XIcon />
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin]" ref={listRef}>
              {groups.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                  <span className="flex size-10 items-center justify-center rounded-xl border bg-card text-muted-foreground shadow-xs/5">
                    <SearchIcon className="size-5" />
                  </span>
                  <p className="mt-3 font-medium">{query ? "No issues match" : "Nothing here"}</p>
                  <p className="mt-1 text-muted-foreground text-xs">
                    {query ? `Nothing in ${navItems.find((n) => n.id === view)?.label} mentions “${query}”.` : "Press C to create an issue."}
                  </p>
                </div>
              ) : (
                <LayoutGroup id={`issues-${view}-${query}`} key={`${view}-${query}`}>
                  {groups.map((g) => {
                    const isCollapsed = collapsed.has(g.id);
                    return (
                      <div key={g.id} role="rowgroup">
                        <div className={cn("sticky top-0 z-10 flex h-9 items-center gap-2 border-b bg-background bg-linear-to-r ps-3 pe-2 @lg:ps-4", groupTone[g.id])}>
                          <button
                            aria-expanded={!isCollapsed}
                            className="flex cursor-pointer items-center gap-2 rounded outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            onClick={() =>
                              setCollapsed((c) => {
                                const next = new Set(c);
                                if (next.has(g.id)) next.delete(g.id);
                                else next.add(g.id);
                                return next;
                              })
                            }
                            type="button"
                          >
                            <ChevronDownIcon className={cn("size-3.5 text-muted-foreground transition-transform duration-200", isCollapsed && "-rotate-90")} />
                            <StatusIcon status={g.id} />
                            <span className="font-medium text-[13px]">{g.label}</span>
                            <span className="text-muted-foreground text-xs tabular-nums">{g.items.length}</span>
                          </button>
                          {g.id !== "done" && (
                            <Button aria-label={`New issue in ${g.label}`} className="ms-auto" onClick={() => createIssue(g.id)} size="icon-xs" variant="ghost">
                              <PlusIcon />
                            </Button>
                          )}
                        </div>
                        {!isCollapsed && (
                          <ul>
                            <AnimatePresence initial={false}>
                              {g.items.map((issue) => {
                                const isCursor = issue.id === cursor;
                                const isPicked = picked.has(issue.id);
                                const a = person(issue.assignee);
                                return (
                                  <motion.li
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    initial={{ opacity: 0 }}
                                    key={issue.id}
                                    layout="position"
                                    layoutId={issue.id}
                                    transition={{ layout: glide, opacity: { duration: 0.15 } }}
                                  >
                                    <div
                                      aria-label={`${issue.id} ${issue.title || "Untitled issue"}`}
                                      aria-selected={isPicked}
                                      className={cn(
                                        "group/row relative flex h-10 cursor-pointer items-center gap-2.5 border-b border-border/60 ps-3 pe-3 outline-none @lg:ps-4",
                                        isCursor ? "bg-accent" : "hover:bg-accent/50",
                                        isPicked && "bg-info/8 hover:bg-info/10",
                                        issue.id === openId && "bg-accent",
                                      )}
                                      onClick={() => {
                                        setCursor(issue.id);
                                        setOpenId(issue.id);
                                      }}
                                      onFocus={() => setCursor(issue.id)}
                                      ref={(el) => {
                                        if (el) rowRefs.current.set(issue.id, el);
                                        else rowRefs.current.delete(issue.id);
                                      }}
                                      role="row"
                                      tabIndex={isCursor ? 0 : -1}
                                    >
                                      {isCursor && <span className="absolute inset-y-0 left-0 w-0.5 bg-foreground/70" />}
                                      <button
                                        aria-label={isPicked ? "Deselect" : "Select"}
                                        aria-pressed={isPicked}
                                        className={cn(
                                          "-ms-1 hidden size-5 shrink-0 cursor-pointer items-center justify-center rounded border outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-ring @lg:flex",
                                          isPicked ? "border-info bg-info text-white" : "border-muted-foreground/40 opacity-0 group-hover/row:opacity-100",
                                        )}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setPicked((p) => {
                                            const next = new Set(p);
                                            if (next.has(issue.id)) next.delete(issue.id);
                                            else next.add(issue.id);
                                            return next;
                                          });
                                        }}
                                        tabIndex={-1}
                                        type="button"
                                      >
                                        {isPicked && <CheckIcon className="size-3" strokeWidth={3} />}
                                      </button>
                                      <span title={priorityLabel(issue.priority)}>
                                        <PriorityIcon priority={issue.priority} />
                                      </span>
                                      <span className="hidden w-16 shrink-0 font-mono text-muted-foreground text-xs @xl:block">{issue.id}</span>
                                      <span title={statusLabel(issue.status)}>
                                        <StatusIcon status={issue.status} />
                                      </span>
                                      <span className={cn("min-w-0 flex-1 truncate font-medium text-[13px]", !issue.title && "font-normal text-muted-foreground italic", issue.status === "done" && "text-muted-foreground")}>
                                        {issue.title || "Untitled issue"}
                                      </span>
                                      <span className="hidden shrink-0 items-center gap-1 @3xl:flex">
                                        {issue.labels?.map((lid) => {
                                          const l = label(lid);
                                          return l ? (
                                            <span className="inline-flex h-5 items-center gap-1 rounded-full border px-1.5 text-[11px] text-muted-foreground" key={lid}>
                                              <span className={cn("size-1.5 rounded-full", dotTone[l.tone])} />
                                              {l.name}
                                            </span>
                                          ) : null;
                                        })}
                                      </span>
                                      {issue.due && (
                                        <span
                                          className={cn(
                                            "hidden h-5 shrink-0 items-center gap-1 rounded-full border px-1.5 text-[11px] tabular-nums @2xl:inline-flex",
                                            issue.priority === 1 && issue.status !== "done" ? "border-destructive/30 text-destructive-foreground" : "text-muted-foreground",
                                          )}
                                        >
                                          <CalendarIcon className="size-3" />
                                          {issue.due}
                                        </span>
                                      )}
                                      <span className="hidden w-12 shrink-0 text-right text-muted-foreground text-xs tabular-nums @xl:block">{issue.created}</span>
                                      <span title={a?.name ?? "Unassigned"}>
                                        <PersonAvatar person={a} />
                                      </span>
                                    </div>
                                  </motion.li>
                                );
                              })}
                            </AnimatePresence>
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </LayoutGroup>
              )}
            </div>
          </section>

          <AnimatePresence>
            {open && (
              <motion.aside
                animate={{ x: 0, opacity: 1 }}
                aria-label={`${open.id} details`}
                className="absolute inset-0 z-30 flex flex-col bg-background @4xl:static @4xl:z-auto @4xl:w-[400px] @4xl:shrink-0 @4xl:border-s @6xl:w-[440px]"
                exit={{ x: 32, opacity: 0 }}
                initial={{ x: 32, opacity: 0 }}
                key="detail"
                transition={{ duration: 0.2, ease }}
              >
                <header className="flex h-13 shrink-0 items-center gap-2 border-b px-3">
                  <Button aria-label="Back to issues" className="@4xl:hidden" onClick={() => setOpenId(null)} size="icon-sm" variant="ghost">
                    <ArrowLeftIcon />
                  </Button>
                  <span className="font-mono text-muted-foreground text-xs">{open.id}</span>
                  <div className="ms-auto flex items-center gap-1">
                    <span className="me-1 hidden text-muted-foreground text-xs @4xl:inline">
                      <Kbd>J</Kbd> <Kbd>K</Kbd>
                    </span>
                    <Button aria-label="More actions" onClick={() => setPalette({ mode: "root", ids: [open.id] })} size="xs" variant="outline">
                      <Kbd className="h-4 bg-transparent px-0">⌘K</Kbd>
                    </Button>
                    <Button aria-label="Close details" onClick={() => setOpenId(null)} size="icon-sm" variant="ghost">
                      <XIcon />
                    </Button>
                  </div>
                </header>
                <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin]" ref={detailRef}>
                  <div className="flex flex-col gap-5 p-4">
                    <textarea
                      aria-label="Issue title"
                      className="w-full resize-none bg-transparent font-heading font-semibold text-lg leading-snug tracking-tight outline-none placeholder:text-muted-foreground/60 [field-sizing:content]"
                      onBlur={() => !open.title.trim() && update([open.id], () => ({ title: "Untitled issue" }))}
                      onChange={(e) => update([open.id], () => ({ title: e.target.value.replace(/\n/g, "") }))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          (e.target as HTMLTextAreaElement).blur();
                          focusRow(open.id);
                        }
                      }}
                      placeholder="Issue title"
                      ref={titleRef}
                      rows={1}
                      value={open.title}
                    />

                    <div className="flex flex-col gap-0.5 rounded-xl border bg-card p-2 ps-3">
                      <Property label="Status" onClick={() => setPalette({ mode: "status", ids: [open.id] })}>
                        <StatusIcon status={open.status} />
                        {statusLabel(open.status)}
                        <Kbd className="ms-auto">S</Kbd>
                      </Property>
                      <Property label="Priority" onClick={() => setPalette({ mode: "priority", ids: [open.id] })}>
                        <PriorityIcon priority={open.priority} />
                        {priorityLabel(open.priority)}
                        <Kbd className="ms-auto">P</Kbd>
                      </Property>
                      <Property label="Assignee" onClick={() => setPalette({ mode: "assignee", ids: [open.id] })}>
                        <PersonAvatar person={person(open.assignee)} />
                        <span className={cn(!open.assignee && "text-muted-foreground")}>{person(open.assignee)?.name ?? "Unassigned"}</span>
                        <Kbd className="ms-auto">A</Kbd>
                      </Property>
                      <Property label="Labels" onClick={() => setPalette({ mode: "label", ids: [open.id] })}>
                        <span className="flex min-w-0 flex-1 flex-wrap gap-1">
                          {open.labels?.length ? (
                            open.labels.map((lid) => {
                              const l = label(lid);
                              return l ? (
                                <span className="inline-flex h-5 items-center gap-1 rounded-full border px-1.5 text-[11px]" key={lid}>
                                  <span className={cn("size-1.5 rounded-full", dotTone[l.tone])} />
                                  {l.name}
                                </span>
                              ) : null;
                            })
                          ) : (
                            <span className="text-muted-foreground">Add label</span>
                          )}
                        </span>
                        <Kbd className="ms-auto">L</Kbd>
                      </Property>
                      <div className="flex min-h-8 items-center gap-2">
                        <span className="w-20 shrink-0 text-muted-foreground text-xs">Estimate</span>
                        <span className="tabular-nums">{open.estimate ? `${open.estimate} ${open.estimate === 1 ? "point" : "points"}` : "—"}</span>
                        {open.due && <span className="ms-auto pe-2 text-muted-foreground text-xs tabular-nums">Due {open.due}</span>}
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 text-pretty leading-6">
                      {open.description?.length ? (
                        open.description.map((p) => <p key={p}>{p}</p>)
                      ) : (
                        <p className="text-muted-foreground">No description yet. Add context, links and acceptance criteria here.</p>
                      )}
                    </div>

                    {open.subtasks && (
                      <div>
                        <div className="mb-1.5 flex items-center gap-2 text-muted-foreground text-xs">
                          <span className="font-medium">Sub-issues</span>
                          <span className="tabular-nums">
                            {open.subtasks.filter((s) => s.done).length}/{open.subtasks.length}
                          </span>
                        </div>
                        <ul className="flex flex-col">
                          {open.subtasks.map((s, i) => (
                            <li key={s.title}>
                              <button
                                className="flex h-8 w-full cursor-pointer items-center gap-2.5 rounded-lg px-1.5 text-left outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                                onClick={() =>
                                  update([open.id], (iss) => ({
                                    subtasks: iss.subtasks?.map((x, j) => (j === i ? { ...x, done: !x.done } : x)),
                                  }))
                                }
                                type="button"
                              >
                                <StatusIcon status={s.done ? "done" : "todo"} />
                                <span className={cn(s.done && "text-muted-foreground line-through decoration-muted-foreground/50")}>{s.title}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div>
                      <div className="mb-2 font-medium text-muted-foreground text-xs">Activity</div>
                      <ol className="relative flex flex-col gap-3 before:absolute before:top-2 before:bottom-2 before:left-[9px] before:w-px before:bg-border">
                        {(open.activity ?? [{ who: open.assignee ?? "jonas", text: "created the issue", when: open.created }]).map((a, i) => {
                          const p = person(a.who);
                          return a.comment ? (
                            <li className="relative flex gap-2.5" key={i}>
                              <PersonAvatar person={p} />
                              <div className="min-w-0 flex-1 rounded-xl border bg-card px-3 py-2">
                                <div className="flex items-baseline gap-2 text-xs">
                                  <span className="font-medium">{p?.name}</span>
                                  <span className="text-muted-foreground">{a.when}</span>
                                </div>
                                <p className="mt-1 text-pretty leading-6">{a.text}</p>
                              </div>
                            </li>
                          ) : (
                            <motion.li
                              animate={{ opacity: 1, y: 0 }}
                              className="relative flex items-center gap-2.5 text-muted-foreground text-xs"
                              initial={a.when === "just now" ? { opacity: 0, y: 4 } : false}
                              key={i}
                              transition={{ duration: 0.2, ease }}
                            >
                              <span className="flex size-5 items-center justify-center rounded-full bg-background ring-1 ring-border">
                                <span className="size-1.5 rounded-full bg-muted-foreground/60" />
                              </span>
                              <span>
                                <span className="font-medium text-foreground">{a.who === me ? "You" : p?.name.split(" ")[0]}</span> {a.text}
                              </span>
                              <span className="ms-auto tabular-nums">{a.when}</span>
                            </motion.li>
                          );
                        })}
                      </ol>
                    </div>
                  </div>
                </div>
                <div className="shrink-0 border-t p-3">
                  <div className="flex items-end gap-2 rounded-xl border bg-card p-1.5 ps-3 shadow-xs/5 transition-shadow focus-within:border-ring/60 focus-within:ring-3 focus-within:ring-ring/16">
                    <textarea
                      aria-label="Leave a comment"
                      className="max-h-28 min-h-8 flex-1 resize-none bg-transparent py-1.5 text-sm leading-5 outline-none placeholder:text-muted-foreground/70 [field-sizing:content]"
                      onChange={(e) => setComment(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && comment.trim()) {
                          e.preventDefault();
                          update([open.id], (i) => ({ activity: [...(i.activity ?? []), { who: me, text: comment.trim(), when: "just now", comment: true }] }));
                          setComment("");
                        }
                      }}
                      placeholder="Leave a comment…"
                      rows={1}
                      value={comment}
                    />
                    <Button
                      disabled={!comment.trim()}
                      onClick={() => {
                        update([open.id], (i) => ({ activity: [...(i.activity ?? []), { who: me, text: comment.trim(), when: "just now", comment: true }] }));
                        setComment("");
                      }}
                      size="sm"
                      variant={comment.trim() ? "default" : "ghost"}
                    >
                      Comment
                    </Button>
                  </div>
                </div>
              </motion.aside>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {palette && (
              <Palette
                commands={commandsFor(palette.mode, palette.ids)}
                mode={palette.mode}
                onBack={() => setPalette({ mode: "root", ids: palette.ids })}
                onClose={closePalette}
                target={palette.ids.length ? describe(palette.ids) : `${team.name} team`}
              />
            )}
          </AnimatePresence>

          <div aria-live="polite" className="pointer-events-none absolute inset-x-0 bottom-4 z-40 flex justify-center px-4">
            <AnimatePresence mode="popLayout">
              {toast && (
                <motion.div
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="flex h-9 items-center rounded-full border bg-popover px-4 text-sm shadow-lg/10"
                  exit={{ opacity: 0, y: 6, scale: 0.98 }}
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  key={toast.key}
                  transition={{ duration: 0.2, ease }}
                >
                  {toast.text}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>
    </MotionConfig>
  );
}
