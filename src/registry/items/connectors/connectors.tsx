"use client";

import {
  ActivityIcon,
  BugIcon,
  CheckIcon,
  CircleAlertIcon,
  DatabaseIcon,
  EllipsisIcon,
  FileTextIcon,
  GitBranchIcon,
  type LucideIcon,
  LifeBuoyIcon,
  LayoutGridIcon,
  MailIcon,
  MegaphoneIcon,
  MessagesSquareIcon,
  PaletteIcon,
  PenToolIcon,
  PiggyBankIcon,
  PlugIcon,
  ReceiptIcon,
  RocketIcon,
  RotateCwIcon,
  SearchIcon,
  SearchXIcon,
  Settings2Icon,
  ShieldCheckIcon,
  SparklesIcon,
  TableIcon,
  UnplugIcon,
  VideoIcon,
  XIcon,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type KeyboardEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { Menu, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";

// Stays false until mounted so the server render and the first client render match.
function useSafeReducedMotion() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && !!prefers;
}

export type AppTone = "orange" | "teal" | "violet" | "amber" | "rose" | "info" | "success" | "warning";

export interface ConnectorApp {
  id: string;
  name: string;
  blurb: string;
  description: string;
  category: string;
  icon: LucideIcon;
  tone: AppTone;
  tag?: "Popular" | "New" | "Beta";
  installs: number;
  addedDaysAgo: number;
  connected?: boolean;
  authError?: string;
  permissions: string[];
}

const toneClass: Record<AppTone, string> = {
  orange: "bg-orange-500/12 text-orange-700 dark:bg-orange-400/14 dark:text-orange-300",
  teal: "bg-teal-500/12 text-teal-700 dark:bg-teal-400/14 dark:text-teal-300",
  violet: "bg-violet-500/12 text-violet-700 dark:bg-violet-400/14 dark:text-violet-300",
  amber: "bg-amber-500/12 text-amber-700 dark:bg-amber-400/14 dark:text-amber-300",
  rose: "bg-rose-500/12 text-rose-700 dark:bg-rose-400/14 dark:text-rose-300",
  info: "bg-info/12 text-info-foreground",
  success: "bg-success/12 text-success-foreground",
  warning: "bg-warning/14 text-warning-foreground",
};

const tagVariant = { Popular: "info", New: "success", Beta: "warning" } as const;

const defaultApps: ConnectorApp[] = [
  {
    id: "relay",
    name: "Relay",
    blurb: "Team chat with threads and huddles.",
    description: "Post agent summaries to channels, reply in threads and turn messages into tasks without leaving chat.",
    category: "Communication",
    icon: MessagesSquareIcon,
    tone: "info",
    tag: "Popular",
    installs: 48200,
    addedDaysAgo: 400,
    connected: true,
    permissions: ["Read public channels", "Post messages as the app", "Read user profiles"],
  },
  {
    id: "postbox",
    name: "Postbox",
    blurb: "Shared inboxes for the whole team.",
    description: "Triage shared inboxes, draft replies with your agents and sync labels both ways.",
    category: "Communication",
    icon: MailIcon,
    tone: "orange",
    installs: 21900,
    addedDaysAgo: 210,
    permissions: ["Read and label conversations", "Create drafts", "Send on your behalf"],
  },
  {
    id: "huddle",
    name: "Huddle",
    blurb: "Video calls with live transcripts.",
    description: "Pull transcripts into your workspace after every call and let agents write the follow-up.",
    category: "Communication",
    icon: VideoIcon,
    tone: "rose",
    tag: "New",
    installs: 3400,
    addedDaysAgo: 9,
    permissions: ["Read meeting transcripts", "Read calendar events"],
  },
  {
    id: "forge",
    name: "Forge",
    blurb: "Git hosting, reviews and pipelines.",
    description: "Link pull requests to tasks, summarise diffs and post review checklists automatically.",
    category: "Developer",
    icon: GitBranchIcon,
    tone: "violet",
    tag: "Popular",
    installs: 39100,
    addedDaysAgo: 520,
    connected: true,
    permissions: ["Read repositories", "Comment on pull requests", "Read pipeline status"],
  },
  {
    id: "tracer",
    name: "Tracer",
    blurb: "Error tracking that groups the noise.",
    description: "Open an incident when a new error spikes and hand the stack trace to a debugging agent.",
    category: "Developer",
    icon: BugIcon,
    tone: "rose",
    installs: 12800,
    addedDaysAgo: 160,
    permissions: ["Read issues and events", "Resolve issues"],
  },
  {
    id: "launchpad",
    name: "Launchpad",
    blurb: "Preview deploys for every branch.",
    description: "Get a preview link on every branch and let agents check it before you merge.",
    category: "Developer",
    icon: RocketIcon,
    tone: "teal",
    tag: "Beta",
    installs: 1900,
    addedDaysAgo: 21,
    permissions: ["Read deployments", "Trigger redeploys"],
  },
  {
    id: "tally",
    name: "Tally",
    blurb: "Invoices that chase themselves.",
    description: "Draft invoices from closed deals and send polite reminders when they slip past due.",
    category: "Finance",
    icon: ReceiptIcon,
    tone: "success",
    installs: 8700,
    addedDaysAgo: 300,
    permissions: ["Read customers", "Create and send invoices"],
  },
  {
    id: "coffer",
    name: "Coffer",
    blurb: "Expense cards and receipt matching.",
    description: "Match receipts to card spend and flag anything that breaks policy.",
    category: "Finance",
    icon: PiggyBankIcon,
    tone: "amber",
    tag: "New",
    installs: 2600,
    addedDaysAgo: 14,
    permissions: ["Read transactions", "Upload receipts"],
  },
  {
    id: "inkwell",
    name: "Inkwell",
    blurb: "Collaborative design files.",
    description: "Attach frames to specs, collect feedback and export assets straight into tasks.",
    category: "Design",
    icon: PenToolIcon,
    tone: "orange",
    tag: "Popular",
    installs: 30500,
    addedDaysAgo: 610,
    permissions: ["Read files and comments", "Export images"],
  },
  {
    id: "swatch",
    name: "Swatch",
    blurb: "One home for brand assets.",
    description: "Keep logos, colours and type in one place so agents always use the current brand.",
    category: "Design",
    icon: PaletteIcon,
    tone: "amber",
    installs: 5200,
    addedDaysAgo: 240,
    permissions: ["Read brand libraries"],
  },
  {
    id: "silo",
    name: "Silo",
    blurb: "Warehouse sync on a schedule.",
    description: "Query your warehouse in plain language and schedule exports into reports.",
    category: "Data",
    icon: DatabaseIcon,
    tone: "violet",
    tag: "Popular",
    installs: 17400,
    addedDaysAgo: 450,
    authError: "The service account is missing the warehouse reader role.",
    permissions: ["Run read-only queries", "Read schemas"],
  },
  {
    id: "gridline",
    name: "Gridline",
    blurb: "Spreadsheets your agents can edit.",
    description: "Read ranges, append rows and keep a sheet in sync with any table in your workspace.",
    category: "Data",
    icon: TableIcon,
    tone: "success",
    installs: 26100,
    addedDaysAgo: 380,
    connected: true,
    permissions: ["Read and edit sheets", "Create new sheets"],
  },
  {
    id: "beacon",
    name: "Beacon",
    blurb: "Product analytics and funnels.",
    description: "Ask why a funnel dropped and get a chart back, with the events that explain it.",
    category: "Data",
    icon: ActivityIcon,
    tone: "info",
    installs: 9800,
    addedDaysAgo: 120,
    permissions: ["Read events and cohorts"],
  },
  {
    id: "harbor",
    name: "Harbor Desk",
    blurb: "Support tickets with SLAs.",
    description: "Let a triage agent tag, prioritise and draft first replies on every new ticket.",
    category: "Support",
    icon: LifeBuoyIcon,
    tone: "teal",
    tag: "Popular",
    installs: 14300,
    addedDaysAgo: 330,
    permissions: ["Read tickets", "Add internal notes", "Change ticket status"],
  },
  {
    id: "murmur",
    name: "Murmur",
    blurb: "Public feedback boards and voting.",
    description: "Cluster feature requests by theme and post a weekly digest to your team.",
    category: "Support",
    icon: MegaphoneIcon,
    tone: "warning",
    tag: "Beta",
    installs: 1200,
    addedDaysAgo: 30,
    permissions: ["Read posts and votes", "Change post status"],
  },
  {
    id: "lumen",
    name: "Lumen Search",
    blurb: "Semantic search over every doc.",
    description: "Index your docs and wikis so agents can cite the exact paragraph they used.",
    category: "AI",
    icon: SparklesIcon,
    tone: "amber",
    tag: "New",
    installs: 6100,
    addedDaysAgo: 5,
    permissions: ["Read indexed documents", "Create embeddings"],
  },
  {
    id: "scribe",
    name: "Scribe",
    blurb: "Meeting notes that write themselves.",
    description: "Turn any recording into notes, decisions and owners, then file them where they belong.",
    category: "AI",
    icon: FileTextIcon,
    tone: "orange",
    installs: 11200,
    addedDaysAgo: 190,
    permissions: ["Read recordings", "Create documents"],
  },
];

type Status = "idle" | "connecting" | "connected" | "error";
type Filter = "all" | "connected" | "available";
type Sort = "popular" | "name" | "newest";

const sortItems = { popular: "Most popular", name: "Name A–Z", newest: "Newest" };
const filters: Filter[] = ["all", "connected", "available"];

const easeOut = [0.23, 1, 0.32, 1] as const;
const quick = { duration: 0.18, ease: easeOut };
const glide = { type: "spring", duration: 0.3, bounce: 0 } as const;
const drawer = { duration: 0.28, ease: [0.32, 0.72, 0, 1] } as const;

const press = "transition-[scale,box-shadow,background-color,color] duration-150 ease-out active:scale-[0.97]";

function formatInstalls(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n);
}

function RollingNumber({ value }: { value: number }) {
  const reduce = useSafeReducedMotion();
  return (
    <span className="relative inline-flex overflow-hidden tabular-nums">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          animate={{ y: 0, opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { y: "-100%", opacity: 0 }}
          initial={reduce ? { opacity: 0 } : { y: "100%", opacity: 0 }}
          key={value}
          transition={quick}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function useSwap() {
  const reduce = useSafeReducedMotion();
  return reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, scale: 0.96, filter: "blur(2px)" },
        animate: { opacity: 1, scale: 1, filter: "blur(0px)" },
        exit: { opacity: 0, scale: 0.96, filter: "blur(2px)" },
      };
}

const menuMotion =
  "min-w-40 transition-[scale,opacity] duration-150 ease-out data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 motion-reduce:data-ending-style:scale-100 motion-reduce:data-starting-style:scale-100";

function ConnectButton({
  status,
  name,
  onConnect,
  onCancel,
  onDisconnect,
  onConfigure,
}: {
  status: Status;
  name: string;
  onConnect: () => void;
  onCancel: () => void;
  onDisconnect: () => void;
  onConfigure: () => void;
}) {
  const variants = useSwap();
  const connected = status === "connected";
  const triggerRef = useRef<HTMLButtonElement>(null);
  const keepFocus = useRef(false);

  useEffect(() => {
    if (connected && keepFocus.current) triggerRef.current?.focus();
    if (status !== "connecting") keepFocus.current = false;
  }, [connected, status]);

  return (
    <div className="flex h-8 min-w-24 items-center justify-end">
      <AnimatePresence initial={false} mode="popLayout">
        {connected ? (
          <motion.div
            animate="animate"
            className="flex items-center gap-0.5"
            exit="exit"
            initial="initial"
            key="connected"
            transition={quick}
            variants={variants}
          >
            <span className="inline-flex items-center gap-1.5 font-medium text-success-foreground text-xs">
              <span className="flex size-4 items-center justify-center rounded-full bg-success/16">
                <CheckIcon className="size-3" />
              </span>
              Connected
            </span>
            <Menu>
              <MenuTrigger
                render={
                  <Button
                    aria-label={`${name} options`}
                    className={cn("size-8 text-muted-foreground hover:text-foreground sm:size-8", press)}
                    ref={triggerRef}
                    size="icon"
                    variant="ghost"
                  />
                }
              >
                <EllipsisIcon />
              </MenuTrigger>
              <MenuPopup align="end" className={menuMotion}>
                <MenuItem onClick={onConfigure}>
                  <Settings2Icon />
                  Configure
                </MenuItem>
                <MenuSeparator />
                <MenuItem onClick={onDisconnect} variant="destructive">
                  <UnplugIcon />
                  Disconnect
                </MenuItem>
              </MenuPopup>
            </Menu>
          </motion.div>
        ) : (
          <motion.div animate="animate" exit="exit" initial="initial" key="action" transition={quick} variants={variants}>
            <Button
              aria-label={
                status === "connecting" ? `Cancel connecting ${name}` : status === "error" ? `Retry connecting ${name}` : `Connect ${name}`
              }
              className={cn("group/connect h-8 min-w-24 text-xs sm:h-8 sm:text-xs", press)}
              onClick={(e) => {
                if (status === "connecting") return onCancel();
                keepFocus.current = e.currentTarget === document.activeElement;
                onConnect();
              }}
              variant="outline"
            >
              <span className="relative flex size-3.5 items-center justify-center">
                {status === "connecting" ? (
                  <>
                    <Spinner className="size-3.5 transition-opacity duration-150 group-hover/connect:opacity-0 group-focus-visible/connect:opacity-0" />
                    <XIcon className="absolute size-3.5 opacity-0 transition-opacity duration-150 group-hover/connect:opacity-80 group-focus-visible/connect:opacity-80" />
                  </>
                ) : status === "error" ? (
                  <RotateCwIcon className="size-3.5" />
                ) : (
                  <PlugIcon className="size-3.5" />
                )}
              </span>
              {status === "connecting" ? "Cancel" : status === "error" ? "Retry" : "Connect"}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export interface ConnectorsProps {
  apps?: ConnectorApp[];
  title?: string;
  connectDelay?: number;
  className?: string;
}

export function Connectors({
  apps = defaultApps,
  title = "Integrations",
  connectDelay = 1400,
  className,
}: ConnectorsProps) {
  const uid = useId();
  const reduce = useSafeReducedMotion();
  const [status, setStatus] = useState<Record<string, Status>>(() =>
    Object.fromEntries(apps.map((a) => [a.id, a.connected ? "connected" : "idle"])),
  );
  const [category, setCategory] = useState("All");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("popular");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [requested, setRequested] = useState<string[]>([]);
  const timers = useRef(new Map<string, number>());
  const failedOnce = useRef(new Set<string>());
  const searchRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const map = timers.current;
    return () => map.forEach((t) => window.clearTimeout(t));
  }, []);

  useEffect(() => {
    if (openId) panelRef.current?.focus();
  }, [openId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  }, [category, filter]);

  const clearTimer = (id: string) => {
    const t = timers.current.get(id);
    if (t) window.clearTimeout(t);
    timers.current.delete(id);
  };

  const connect = (id: string) => {
    clearTimer(id);
    setStatus((s) => ({ ...s, [id]: "connecting" }));
    const app = apps.find((a) => a.id === id);
    const fail = Boolean(app?.authError) && !failedOnce.current.has(id);
    timers.current.set(
      id,
      window.setTimeout(() => {
        timers.current.delete(id);
        if (fail) failedOnce.current.add(id);
        setStatus((s) => ({ ...s, [id]: fail ? "error" : "connected" }));
      }, connectDelay),
    );
  };
  const reset = (id: string) => {
    clearTimer(id);
    setStatus((s) => ({ ...s, [id]: "idle" }));
  };

  const categories = useMemo(() => {
    const names = Array.from(new Set(apps.map((a) => a.category)));
    return [
      { name: "All", count: apps.length },
      ...names.map((name) => ({ name, count: apps.filter((a) => a.category === name).length })),
    ];
  }, [apps]);

  const connectedCount = Object.values(status).filter((s) => s === "connected").length;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return apps
      .filter((a) => category === "All" || a.category === category)
      .filter((a) => {
        if (filter === "connected") return status[a.id] === "connected";
        if (filter === "available") return status[a.id] !== "connected";
        return true;
      })
      .filter((a) => !q || `${a.name} ${a.blurb} ${a.category}`.toLowerCase().includes(q))
      .sort((a, b) =>
        sort === "name"
          ? a.name.localeCompare(b.name)
          : sort === "newest"
            ? a.addedDaysAgo - b.addedDaysAgo
            : b.installs - a.installs,
      );
  }, [apps, category, filter, query, sort, status]);

  const sections = useMemo(() => {
    if (sort !== "popular" || category !== "All" || query.trim()) return [{ title: null as string | null, apps: visible }];
    return categories
      .slice(1)
      .map((c) => ({ title: c.name as string | null, apps: visible.filter((a) => a.category === c.name) }))
      .filter((g) => g.apps.length > 0);
  }, [visible, sort, category, query, categories]);

  const open = apps.find((a) => a.id === openId) ?? null;

  const onRootKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      searchRef.current?.focus();
      searchRef.current?.select();
    }
  };

  const resetFilters = () => {
    setQuery("");
    setCategory("All");
    setFilter("all");
  };

  return (
    <div
      className={cn(
        "@container/screen relative isolate flex h-[760px] w-full overflow-hidden bg-background text-foreground text-sm",
        className,
      )}
      onKeyDown={onRootKeyDown}
    >
      <aside className="hidden w-56 shrink-0 flex-col gap-1 border-e bg-muted/40 p-3 @3xl/screen:flex">
        <div className="flex items-center gap-2 px-2 pt-1 pb-4">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <LayoutGridIcon className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium">Northwind</p>
            <p className="truncate text-muted-foreground text-xs">Workspace settings</p>
          </div>
        </div>
        <p className="px-2 pb-1 font-medium text-muted-foreground text-xs">Categories</p>
        <nav aria-label="Categories" className="flex flex-col gap-0.5">
          {categories.map((c) => {
            const active = c.name === category;
            return (
              <button
                aria-current={active ? "true" : undefined}
                className={cn(
                  "relative flex h-8 cursor-pointer items-center justify-between rounded-lg px-2.5 text-start outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring",
                  active ? "font-medium text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                )}
                key={c.name}
                onClick={() => setCategory(c.name)}
                type="button"
              >
                {active && (
                  <motion.span
                    className="absolute inset-0 -z-10 rounded-lg border bg-card shadow-xs/5"
                    layoutId={`${uid}-rail`}
                    transition={reduce ? { duration: 0 } : glide}
                  />
                )}
                <span>{c.name}</span>
                <span className="text-muted-foreground text-xs tabular-nums">{c.count}</span>
              </button>
            );
          })}
        </nav>
        <div className="mt-auto rounded-xl border bg-card p-3">
          <div className="flex items-center gap-2 font-medium text-xs">
            <ShieldCheckIcon className="size-4 text-success-foreground" />
            Reviewed apps only
          </div>
          <p className="mt-1 text-pretty text-muted-foreground text-xs">
            Every app here passed a security review. Admins approve new connections.
          </p>
        </div>
      </aside>

      <div className="@container relative flex min-w-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto" ref={scrollRef}>
          <header className="sticky top-0 z-10 border-b bg-background/85 backdrop-blur-md">
            <div className="flex flex-col gap-3 px-4 pt-4 pb-3 @2xl:px-6">
              <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
                <div className="min-w-0">
                  <h2 className="text-balance font-heading font-semibold text-lg tracking-tight">{title}</h2>
                  <p className="text-muted-foreground text-xs">
                    <RollingNumber value={visible.length} /> apps ·{" "}
                    <RollingNumber value={connectedCount} /> connected
                  </p>
                </div>
                <div className="relative w-full @xl:w-72">
                  <SearchIcon className="pointer-events-none absolute start-2.5 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    aria-label="Search apps"
                    className="[&_input]:ps-8 [&_input]:pe-12"
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search apps"
                    ref={searchRef}
                    type="search"
                    value={query}
                  />
                  <span className="absolute end-1.5 top-1/2 -translate-y-1/2">
                    {query ? (
                      <Button
                        aria-label="Clear search"
                        className={cn("size-7 rounded-full text-muted-foreground sm:size-7", press)}
                        onClick={() => {
                          setQuery("");
                          searchRef.current?.focus();
                        }}
                        size="icon-sm"
                        variant="ghost"
                      >
                        <XIcon className="size-3.5" />
                      </Button>
                    ) : (
                      <Kbd className="me-0.5">⌘K</Kbd>
                    )}
                  </span>
                </div>
              </div>

              <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 py-0.5 [scrollbar-width:none] @3xl/screen:hidden">
                {categories.map((c) => {
                  const active = c.name === category;
                  return (
                    <button
                      aria-pressed={active}
                      className={cn(
                        "relative flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        press,
                        active ? "border-transparent text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                      )}
                      key={c.name}
                      onClick={() => setCategory(c.name)}
                      type="button"
                    >
                      {active && (
                        <motion.span
                          className="absolute -inset-px -z-10 rounded-full bg-primary"
                          layoutId={`${uid}-chip`}
                          transition={reduce ? { duration: 0 } : glide}
                        />
                      )}
                      {c.name}
                      <span className={cn("tabular-nums", active ? "opacity-70" : "opacity-60")}>{c.count}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between gap-2">
                <div
                  aria-label="Connection filter"
                  className="flex rounded-lg bg-muted p-0.5"
                  onKeyDown={(e) => {
                    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
                    if (!step) return;
                    e.preventDefault();
                    const next = filters[(filters.indexOf(filter) + step + filters.length) % filters.length];
                    setFilter(next);
                    e.currentTarget.querySelector<HTMLButtonElement>(`[data-value="${next}"]`)?.focus();
                  }}
                  role="radiogroup"
                >
                  {filters.map((f) => (
                    <button
                      aria-checked={filter === f}
                      className={cn(
                        "relative h-7 cursor-pointer rounded-md px-2.5 font-medium text-xs capitalize outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring",
                        filter === f ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                      )}
                      data-value={f}
                      key={f}
                      onClick={() => setFilter(f)}
                      role="radio"
                      tabIndex={filter === f ? 0 : -1}
                      type="button"
                    >
                      {filter === f && (
                        <motion.span
                          className="absolute inset-0 -z-10 rounded-md bg-background shadow-xs/5 dark:bg-input"
                          layoutId={`${uid}-filter`}
                          transition={reduce ? { duration: 0 } : glide}
                        />
                      )}
                      {f}
                    </button>
                  ))}
                </div>
                <Select items={sortItems} onValueChange={(v) => v && setSort(v as Sort)} value={sort}>
                  <SelectTrigger aria-label="Sort apps" className="w-auto min-w-36 text-sm" size="sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectPopup>
                    {Object.entries(sortItems).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectPopup>
                </Select>
              </div>
            </div>
          </header>

          <div className="p-4 @2xl:p-6">
            {visible.length === 0 ? (
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center rounded-2xl border border-dashed bg-muted/24 px-6 py-14 text-center"
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
                transition={quick}
              >
                <div aria-hidden className="relative mb-5 h-14 w-32">
                  <span className="absolute start-0 top-3 flex size-10 -rotate-8 items-center justify-center rounded-xl border bg-card text-muted-foreground/60 shadow-xs/5">
                    <MailIcon className="size-4" />
                  </span>
                  <span className="absolute end-0 top-3 flex size-10 rotate-8 items-center justify-center rounded-xl border bg-card text-muted-foreground/60 shadow-xs/5">
                    <DatabaseIcon className="size-4" />
                  </span>
                  <span className="absolute start-1/2 top-0 flex size-12 -translate-x-1/2 items-center justify-center rounded-xl border bg-card text-foreground shadow-sm/5">
                    <SearchXIcon className="size-5" />
                  </span>
                </div>
                <p className="text-balance font-medium">
                  {query ? (
                    <>
                      No apps match <span className="text-foreground">“{query.trim()}”</span>
                    </>
                  ) : filter === "connected" ? (
                    "Nothing connected here yet"
                  ) : (
                    "Every app here is connected"
                  )}
                </p>
                <p className="mt-1 max-w-72 text-pretty text-muted-foreground text-xs">
                  {query
                    ? "Try another name or category. Missing an app your team uses? Ask us to add it."
                    : "Try another category, or browse the full directory."}
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  <Button className={press} onClick={resetFilters} size="sm" variant="outline">
                    Clear filters
                  </Button>
                  {query && (
                    requested.includes(query.trim().toLowerCase()) ? (
                      <Button aria-live="polite" disabled size="sm" variant="ghost">
                        <CheckIcon />
                        Requested · we'll email you
                      </Button>
                    ) : (
                      <Button
                        className={press}
                        onClick={() => setRequested((r) => [...r, query.trim().toLowerCase()])}
                        size="sm"
                        variant="ghost"
                      >
                        <MegaphoneIcon />
                        Request “{query.trim().slice(0, 18)}”
                      </Button>
                    )
                  )}
                </div>
              </motion.div>
            ) : (
              <div className="flex flex-col gap-8">
                {sections.map((section) => (
                  <section aria-label={section.title ?? "Apps"} key={section.title ?? "all"}>
                    {section.title && (
                      <h3 className="mb-2.5 flex items-baseline gap-2 font-medium text-sm">
                        {section.title}
                        <span className="font-normal text-muted-foreground text-xs tabular-nums">{section.apps.length}</span>
                      </h3>
                    )}
                    <motion.ul className="grid grid-cols-1 gap-2.5 @2xl:grid-cols-2" layout={!reduce} transition={glide}>
                      <AnimatePresence initial={false} mode="popLayout">
                        {section.apps.map((app) => (
                          <AppCard
                            app={app}
                            key={app.id}
                            onCancel={() => reset(app.id)}
                            onConnect={() => connect(app.id)}
                            onDisconnect={() => reset(app.id)}
                            onOpen={() => setOpenId(app.id)}
                            reduce={reduce}
                            status={status[app.id] ?? "idle"}
                          />
                        ))}
                      </AnimatePresence>
                    </motion.ul>
                  </section>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              animate={{ opacity: 1 }}
              aria-hidden
              className="absolute inset-0 z-20 bg-black/32"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              onClick={() => setOpenId(null)}
              transition={{ duration: 0.2, ease: easeOut }}
            />
            <motion.div
              animate={{ x: 0 }}
              aria-label={`${open.name} details`}
              aria-modal="true"
              className="absolute inset-y-0 end-0 z-30 flex w-full flex-col border-s bg-card outline-none @md:w-[400px] @md:rounded-s-2xl"
              exit={reduce ? { opacity: 0 } : { x: "100%" }}
              initial={reduce ? { opacity: 0 } : { x: "100%" }}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.stopPropagation();
                  setOpenId(null);
                }
              }}
              ref={panelRef}
              role="dialog"
              tabIndex={-1}
              transition={drawer}
            >
              <DetailPanel
                app={open}
                onCancel={() => reset(open.id)}
                onClose={() => setOpenId(null)}
                onConnect={() => connect(open.id)}
                onDisconnect={() => reset(open.id)}
                status={status[open.id] ?? "idle"}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function AppCard({
  app,
  status: s,
  reduce,
  onOpen,
  onConnect,
  onCancel,
  onDisconnect,
}: {
  app: ConnectorApp;
  status: Status;
  reduce: boolean;
  onOpen: () => void;
  onConnect: () => void;
  onCancel: () => void;
  onDisconnect: () => void;
}) {
  const Icon = app.icon;
  return (
    <motion.li
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "group relative flex items-start gap-3 rounded-xl border bg-card p-3.5 transition-[border-color,background-color,scale] duration-150 ease-out has-[[data-card-trigger]:active]:scale-[0.985] [@media(hover:hover)]:hover:border-foreground/16",
        s === "error" && "border-destructive/24",
      )}
      exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
      layout={!reduce}
      transition={quick}
    >
      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", toneClass[app.tone])}>
        <Icon className="size-4.5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex h-5 items-center gap-1.5">
          <button
            className="truncate text-start font-medium outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-ring"
            data-card-trigger
            onClick={onOpen}
            type="button"
          >
            {app.name}
          </button>
          {app.tag && (
            <Badge size="sm" variant={tagVariant[app.tag]}>
              {app.tag}
            </Badge>
          )}
        </div>
        <AnimatePresence initial={false} mode="popLayout">
          {s === "error" ? (
            <motion.p
              animate={{ opacity: 1, y: 0 }}
              className="mt-0.5 flex min-w-0 items-center gap-1.5 text-destructive-foreground text-xs"
              exit={{ opacity: 0 }}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 3 }}
              key="error"
              role="status"
              transition={quick}
            >
              <CircleAlertIcon className="size-3.5 shrink-0" />
              <span className="truncate">Authorization failed. Retry to try again.</span>
            </motion.p>
          ) : (
            <motion.p
              animate={{ opacity: 1 }}
              className="mt-0.5 line-clamp-2 text-pretty text-muted-foreground text-xs @2xl:line-clamp-1"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              key="blurb"
              transition={quick}
            >
              {app.blurb}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
      <div className="relative z-[1] -my-0.5 shrink-0">
        <ConnectButton
          name={app.name}
          onCancel={onCancel}
          onConfigure={onOpen}
          onConnect={onConnect}
          onDisconnect={onDisconnect}
          status={s}
        />
      </div>
    </motion.li>
  );
}

const statusCopy: Record<Status, { title: string; dot: string }> = {
  idle: { title: "Not connected", dot: "bg-muted-foreground/40" },
  connecting: { title: "Authorizing…", dot: "bg-info" },
  connected: { title: "Connected", dot: "bg-success" },
  error: { title: "Authorization failed", dot: "bg-destructive" },
};

function DetailPanel({
  app,
  status,
  onConnect,
  onCancel,
  onDisconnect,
  onClose,
}: {
  app: ConnectorApp;
  status: Status;
  onConnect: () => void;
  onCancel: () => void;
  onDisconnect: () => void;
  onClose: () => void;
}) {
  const Icon = app.icon;
  const reduce = useSafeReducedMotion();
  const [options, setOptions] = useState({ sync: true, notify: true, agents: false });
  const optionList = [
    { key: "sync" as const, label: "Sync every 15 minutes", hint: "Keep records fresh in the background." },
    { key: "notify" as const, label: "Notify on errors", hint: "Post to #ops when a sync fails." },
    { key: "agents" as const, label: "Allow agents to write", hint: "Agents can create and edit records." },
  ];
  const subtitle =
    status === "connected"
      ? "Synced just now · by you"
      : status === "connecting"
        ? `Approve in the ${app.name} window`
        : status === "error"
          ? (app.authError ?? `${app.name} didn’t grant access. Try again.`)
          : "An admin approves new connections";
  const action = status === "connected" ? "Disconnect" : status === "connecting" ? "Cancel" : status === "error" ? "Retry" : "Connect";

  return (
    <>
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <p className="font-medium text-muted-foreground text-xs">App details</p>
        <Button aria-label="Close details" className={press} onClick={onClose} size="icon" variant="ghost">
          <XIcon />
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3"
          initial={reduce ? false : { opacity: 0, y: 6 }}
          transition={{ ...quick, delay: 0.06 }}
        >
          <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-xl", toneClass[app.tone])}>
            <Icon className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h3 className="truncate font-heading font-semibold text-base">{app.name}</h3>
              {app.tag && (
                <Badge size="sm" variant={tagVariant[app.tag]}>
                  {app.tag}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground text-xs tabular-nums">
              {app.category} · {formatInstalls(app.installs)} workspaces
            </p>
          </div>
        </motion.div>

        <p className="mt-4 text-pretty text-muted-foreground">{app.description}</p>

        <div
          className={cn(
            "mt-4 flex min-h-14 items-center gap-3 rounded-xl border py-2 ps-3 pe-2 transition-colors duration-200",
            status === "error" ? "border-destructive/24 bg-destructive/4" : "bg-background",
          )}
          role="status"
        >
          <AnimatePresence initial={false} mode="popLayout">
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="flex min-w-0 flex-1 items-center gap-2.5"
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 4 }}
              key={status}
              transition={quick}
            >
              <span className={cn("relative flex size-2 shrink-0 rounded-full", statusCopy[status].dot)}>
                {status === "connecting" && !reduce && (
                  <span className="absolute inset-0 animate-ping rounded-full bg-info/60" />
                )}
              </span>
              <span className="min-w-0">
                <span className="block font-medium text-sm">{statusCopy[status].title}</span>
                <span className="block text-pretty text-muted-foreground text-xs">{subtitle}</span>
              </span>
            </motion.div>
          </AnimatePresence>
          <Button
            className={cn("min-w-30 text-sm", press)}
            onClick={() => {
              if (status === "connected") onDisconnect();
              else if (status === "connecting") onCancel();
              else onConnect();
            }}
            variant={status === "connected" ? "destructive-outline" : status === "connecting" ? "outline" : "default"}
          >
            <span className="relative flex size-4 items-center justify-center">
              {status === "connected" ? (
                <UnplugIcon />
              ) : status === "connecting" ? (
                <Spinner className="size-3.5" />
              ) : status === "error" ? (
                <RotateCwIcon />
              ) : (
                <PlugIcon />
              )}
            </span>
            {action}
          </Button>
        </div>

        <section className="mt-6">
          <h4 className="mb-2 font-medium text-xs">This app will be able to</h4>
          <ul className="flex flex-col gap-1.5 rounded-xl border bg-background p-3">
            {app.permissions.map((p, i) => (
              <motion.li
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2"
                initial={reduce ? false : { opacity: 0, x: 6 }}
                key={p}
                transition={{ ...quick, delay: 0.08 + i * 0.03 }}
              >
                <span className="flex size-4 items-center justify-center rounded-full bg-success/16 text-success-foreground">
                  <CheckIcon className="size-3" />
                </span>
                {p}
              </motion.li>
            ))}
          </ul>
        </section>

        <section className="mt-6">
          <h4 className="mb-2 font-medium text-xs">Settings</h4>
          <div
            className={cn(
              "flex flex-col divide-y rounded-xl border transition-opacity duration-200",
              status !== "connected" && "opacity-56",
            )}
          >
            {optionList.map((o) => (
              <label className="flex cursor-pointer items-center justify-between gap-3 p-3" key={o.key}>
                <span className="min-w-0">
                  <span className="block font-medium">{o.label}</span>
                  <span className="block text-muted-foreground text-xs">{o.hint}</span>
                </span>
                <Switch
                  checked={options[o.key]}
                  disabled={status !== "connected"}
                  onCheckedChange={(v) => setOptions((s) => ({ ...s, [o.key]: v }))}
                />
              </label>
            ))}
          </div>
          {status !== "connected" && (
            <p className="mt-2 text-muted-foreground text-xs">Connect {app.name} to change its settings.</p>
          )}
        </section>
      </div>
    </>
  );
}
