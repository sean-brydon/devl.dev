"use client";

import { AnimatePresence, LayoutGroup, MotionConfig, motion } from "motion/react";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  ChevronsUpDownIcon,
  CircleDashedIcon,
  CircleDotIcon,
  CircleIcon,
  FilterIcon,
  HouseIcon,
  InboxIcon,
  KeyboardIcon,
  LayersIcon,
  LogOutIcon,
  type LucideIcon,
  MenuIcon,
  PanelLeftIcon,
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
  SettingsIcon,
  SignalHighIcon,
  SignalLowIcon,
  SignalMediumIcon,
  SquarePenIcon,
  UserRoundIcon,
  XIcon,
} from "lucide-react";
import { type KeyboardEvent, type ReactElement, type ReactNode, useEffect, useId, useRef, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import {
  Menu,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuPopup,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuShortcut,
  MenuTrigger,
} from "@/components/ui/menu";
import { Tooltip, TooltipPopup, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type HairlineTone = "orange" | "teal" | "cyan" | "violet" | "rose" | "info" | "success" | "warning";

export interface HairlineWorkspace {
  id: string;
  name: string;
  initial: string;
  tone: HairlineTone;
}

export interface HairlineNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  count?: number;
}

export interface HairlineProject {
  id: string;
  name: string;
  tone: HairlineTone;
  prefix?: string;
  open?: number;
}

export interface HairlineIssue {
  id: string;
  title: string;
  status: "progress" | "todo" | "backlog";
  priority: "high" | "medium" | "low";
  label?: { name: string; tone: HairlineTone };
  assignee: string;
  due?: string;
  project?: string;
  unread?: boolean;
}

export interface HairlineShellProps {
  workspaces?: HairlineWorkspace[];
  nav?: HairlineNavItem[];
  projects?: HairlineProject[];
  issues?: HairlineIssue[];
  user?: { name: string; initials: string };
  defaultCollapsed?: boolean;
  children?: ReactNode;
  className?: string;
}

const swatch: Record<HairlineTone, string> = {
  "orange": "bg-orange-500",
  "teal": "bg-teal-500",
  "cyan": "bg-cyan-500",
  "violet": "bg-violet-500",
  "rose": "bg-rose-500",
  info: "bg-info",
  success: "bg-success",
  warning: "bg-warning",
};

const text: Record<HairlineTone, string> = {
  "orange": "text-orange-600 dark:text-orange-400",
  "teal": "text-teal-600 dark:text-teal-400",
  "cyan": "text-cyan-600 dark:text-cyan-400",
  "violet": "text-violet-600 dark:text-violet-400",
  "rose": "text-rose-600 dark:text-rose-400",
  info: "text-info-foreground",
  success: "text-success-foreground",
  warning: "text-warning-foreground",
};

const spring = { type: "spring", stiffness: 500, damping: 40 } as const;

const defaultWorkspaces: HairlineWorkspace[] = [
  { id: "northwind", name: "Northwind", initial: "N", tone: "info" },
  { id: "pilot", name: "Pilot Studio", initial: "P", tone: "teal" },
];

const defaultNav: HairlineNavItem[] = [
  { id: "home", label: "Home", icon: HouseIcon },
  { id: "inbox", label: "Inbox", icon: InboxIcon, count: 4 },
  { id: "mine", label: "My issues", icon: CircleDotIcon },
  { id: "views", label: "Views", icon: LayersIcon },
];

const defaultProjects: HairlineProject[] = [
  { id: "billing", name: "Billing v2", tone: "teal", prefix: "BIL" },
  { id: "atlas", name: "Atlas redesign", tone: "orange", prefix: "ATL" },
  { id: "mobile", name: "Mobile beta", tone: "info", prefix: "MOB" },
  { id: "growth", name: "Growth", tone: "violet", prefix: "GRO" },
  { id: "infra", name: "Infra", tone: "rose", prefix: "INF" },
];

const defaultIssues: HairlineIssue[] = [
  { id: "BIL-142", title: "Prorate seat changes mid-cycle", status: "progress", priority: "high", label: { name: "Pricing", tone: "orange" }, assignee: "IM", due: "Oct 28" },
  { id: "BIL-139", title: "Retry failed card charges with backoff", status: "progress", priority: "high", label: { name: "Payments", tone: "teal" }, assignee: "KT", due: "Oct 30" },
  { id: "BIL-151", title: "Invoice PDF uses workspace logo", status: "progress", priority: "medium", assignee: "RL" },
  { id: "BIL-128", title: "Usage meter rounds to two decimals", status: "progress", priority: "low", label: { name: "Bug", tone: "warning" }, assignee: "TB", due: "Nov 2" },
  { id: "BIL-155", title: "Tax ID field for EU workspaces", status: "todo", priority: "high", label: { name: "Compliance", tone: "info" }, assignee: "IM", due: "Nov 6", unread: true },
  { id: "BIL-157", title: "Show next invoice estimate on plan page", status: "todo", priority: "medium", label: { name: "Pricing", tone: "orange" }, assignee: "RL" },
  { id: "BIL-160", title: "Webhook for subscription.paused", status: "todo", priority: "medium", label: { name: "API", tone: "violet" }, assignee: "KT" },
  { id: "BIL-161", title: "Downgrade flow keeps annual discount", status: "todo", priority: "low", assignee: "TB", due: "Nov 9" },
  { id: "BIL-163", title: "Copy pass on failed payment emails", status: "todo", priority: "low", assignee: "RL" },
  { id: "BIL-118", title: "Credit notes for partial refunds", status: "backlog", priority: "medium", label: { name: "Payments", tone: "teal" }, assignee: "KT" },
  { id: "BIL-121", title: "Multi-currency price books", status: "backlog", priority: "low", label: { name: "Pricing", tone: "orange" }, assignee: "IM" },
  { id: "BIL-124", title: "Export invoices as CSV", status: "backlog", priority: "low", assignee: "TB" },
  { id: "ATL-212", title: "Collapse sidebar to an icon rail", status: "progress", priority: "high", label: { name: "Design", tone: "violet" }, assignee: "IM", due: "Oct 29", project: "atlas", unread: true },
  { id: "ATL-208", title: "Breadcrumb overflow on narrow screens", status: "progress", priority: "medium", label: { name: "Bug", tone: "warning" }, assignee: "RL", project: "atlas" },
  { id: "ATL-219", title: "Keyboard map for navigation", status: "todo", priority: "medium", assignee: "KT", project: "atlas" },
  { id: "ATL-224", title: "Empty states for project pages", status: "todo", priority: "low", label: { name: "Design", tone: "violet" }, assignee: "TB", project: "atlas" },
  { id: "ATL-190", title: "Audit icon sizes in the sidebar", status: "backlog", priority: "low", assignee: "KT", project: "atlas" },
  { id: "MOB-88", title: "Push notifications for mentions only", status: "progress", priority: "high", label: { name: "API", tone: "violet" }, assignee: "KT", due: "Nov 4", project: "mobile" },
  { id: "MOB-91", title: "Offline drafts survive app restarts", status: "todo", priority: "medium", assignee: "IM", project: "mobile", unread: true },
  { id: "MOB-95", title: "Deep links open the right workspace", status: "todo", priority: "low", assignee: "RL", project: "mobile" },
  { id: "MOB-73", title: "Haptics on swipe actions", status: "backlog", priority: "low", assignee: "TB", project: "mobile" },
  { id: "GRO-31", title: "Guided first project checklist", status: "progress", priority: "medium", label: { name: "Onboarding", tone: "teal" }, assignee: "IM", project: "growth" },
  { id: "GRO-34", title: "Test invite email subject lines", status: "todo", priority: "low", assignee: "RL", project: "growth" },
  { id: "GRO-22", title: "Drop company size from signup", status: "backlog", priority: "low", assignee: "KT", project: "growth" },
  { id: "INF-57", title: "Alert on p95 latency, not p50", status: "progress", priority: "high", label: { name: "Reliability", tone: "rose" }, assignee: "TB", due: "Oct 31", project: "infra" },
  { id: "INF-61", title: "Runbook for the failover drill", status: "todo", priority: "medium", assignee: "IM", project: "infra", unread: true },
];

const people: Record<string, string> = {
  IM: "bg-teal-500/16 text-teal-600 dark:text-teal-400",
  KT: "bg-info/16 text-info-foreground",
  RL: "bg-orange-500/16 text-orange-600 dark:text-orange-400",
  TB: "bg-violet-500/20 text-violet-600 dark:text-violet-400",
};

const groups = [
  { id: "progress", label: "In progress", icon: CircleDotIcon, tone: "text-warning-foreground" },
  { id: "todo", label: "Todo", icon: CircleIcon, tone: "text-muted-foreground" },
  { id: "backlog", label: "Backlog", icon: CircleDashedIcon, tone: "text-muted-foreground/72" },
] as const;

const priorityIcon = { high: SignalHighIcon, medium: SignalMediumIcon, low: SignalLowIcon };

function RailTip({ collapsed, label, children }: { collapsed: boolean; label: ReactNode; children: ReactElement }) {
  return (
    <Tooltip disabled={!collapsed}>
      <TooltipTrigger render={children} />
      <TooltipPopup side="right" sideOffset={8}>
        {label}
      </TooltipPopup>
    </Tooltip>
  );
}

interface SidebarProps {
  collapsed: boolean;
  workspaces: HairlineWorkspace[];
  nav: HairlineNavItem[];
  projects: HairlineProject[];
  user: { name: string; initials: string };
  active: string;
  onNavigate: (id: string) => void;
  onToggle?: () => void;
  onClose?: () => void;
  onNew?: () => void;
}

function HairlineSidebar({ collapsed, workspaces, nav, projects, user, active, onNavigate, onToggle, onClose, onNew }: SidebarProps) {
  const [workspace, setWorkspace] = useState(workspaces[0]?.id ?? "");
  const [open, setOpen] = useState(true);
  const ws = workspaces.find((w) => w.id === workspace) ?? workspaces[0];
  const group = useId();
  const fade = cn("transition-opacity duration-150", collapsed && "pointer-events-none opacity-0");
  const row =
    "group/row relative flex h-8 w-full cursor-pointer items-center gap-2 overflow-hidden rounded-md px-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset";

  const item = (id: string, label: string, icon: ReactNode, trailing?: ReactNode) => {
    const on = active === id;
    return (
      <RailTip collapsed={collapsed} key={id} label={label}>
        <button
          aria-current={on ? "page" : undefined}
          aria-label={collapsed ? label : undefined}
          className={cn(row, on ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground")}
          onClick={() => onNavigate(id)}
          type="button"
        >
          {on && (
            <motion.span
              className="absolute top-1.5 bottom-1.5 left-0 w-0.5 rounded-full bg-foreground"
              layoutId="hairline-active"
              transition={spring}
            />
          )}
          {icon}
          <span className={cn("min-w-0 flex-1 truncate", fade)}>{label}</span>
          {trailing && <span className={fade}>{trailing}</span>}
        </button>
      </RailTip>
    );
  };

  return (
    <LayoutGroup id={group}>
      <div className="flex h-full min-h-0 flex-col whitespace-nowrap">
        <div className="flex h-11 shrink-0 items-center gap-1 border-b px-1.5">
          <Menu>
            <MenuTrigger
              aria-label={`Workspace: ${ws.name}`}
              className="flex h-8 min-w-0 flex-1 cursor-pointer items-center gap-2 overflow-hidden rounded-md px-2 text-left outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring data-popup-open:bg-accent"
            >
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-[5px] font-semibold text-[11px] text-white",
                  swatch[ws.tone],
                )}
              >
                {ws.initial}
              </span>
              <span className={cn("min-w-0 truncate font-medium", fade)}>{ws.name}</span>
              <ChevronDownIcon className={cn("size-3.5 shrink-0 text-muted-foreground", fade)} />
            </MenuTrigger>
            <MenuPopup align="start" className="w-56">
              <MenuGroup>
                <MenuGroupLabel>Switch workspace</MenuGroupLabel>
                <MenuRadioGroup onValueChange={(v) => setWorkspace(v as string)} value={workspace}>
                  {workspaces.map((w) => (
                    <MenuRadioItem key={w.id} value={w.id}>
                      {w.name}
                    </MenuRadioItem>
                  ))}
                </MenuRadioGroup>
              </MenuGroup>
              <MenuSeparator />
              <MenuItem>
                <PlusIcon />
                New workspace
              </MenuItem>
            </MenuPopup>
          </Menu>
          {onClose ? (
            <Button aria-label="Close navigation" onClick={onClose} size="icon-sm" variant="ghost">
              <XIcon />
            </Button>
          ) : (
            <Button onClick={onNew} aria-label="New issue" className={cn(collapsed && "hidden")} size="icon-sm" variant="ghost">
              <SquarePenIcon />
            </Button>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-1.5 py-2 [scrollbar-width:thin]">
          <div className="flex flex-col gap-px">
            {item(
              "search",
              "Search",
              <SearchIcon className="size-4 shrink-0" />,
              <Kbd className="h-4.5 min-w-4.5 text-[10px]">/</Kbd>,
            )}
            {nav.map((n) =>
              item(
                n.id,
                n.label,
                <span className="relative shrink-0">
                  <n.icon className="size-4" />
                  {collapsed && n.count ? (
                    <span className="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-info ring-2 ring-background" />
                  ) : null}
                </span>,
                n.count ? <span className="text-muted-foreground text-xs tabular-nums">{n.count}</span> : undefined,
              ),
            )}
          </div>

          <div className="relative mt-4 mb-1 flex h-6 items-center px-2.5">
            <button
              aria-expanded={open}
              className={cn(
                "flex cursor-pointer items-center gap-1 rounded text-muted-foreground text-xs outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
                fade,
              )}
              onClick={() => setOpen((o) => !o)}
              tabIndex={collapsed ? -1 : 0}
              type="button"
            >
              Projects
              <ChevronRightIcon className={cn("size-3 transition-transform duration-200", open && "rotate-90")} />
            </button>
            {collapsed && <span className="absolute inset-x-3 top-1/2 h-px bg-border" />}
          </div>
          <AnimatePresence initial={false}>
            {(open || collapsed) && (
              <motion.div
                animate={{ height: "auto", opacity: 1 }}
                className="flex flex-col gap-px overflow-hidden"
                exit={{ height: 0, opacity: 0 }}
                initial={{ height: 0, opacity: 0 }}
                transition={spring}
              >
                {projects.map((p) =>
                  item(
                    p.id,
                    p.name,
                    <span className="flex size-4 shrink-0 items-center justify-center">
                      <span className={cn("size-2.5 rounded-[3px]", swatch[p.tone])} />
                    </span>,
                    <span className="text-muted-foreground/72 text-xs tabular-nums">{p.open}</span>,
                  ),
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex h-10 shrink-0 items-center gap-1 border-t px-1.5">
          <Menu>
            <MenuTrigger
              aria-label={`Account: ${user.name}`}
              className="flex h-7 min-w-0 flex-1 cursor-pointer items-center gap-2 overflow-hidden rounded-md px-2 text-left outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring data-popup-open:bg-accent"
            >
              <Avatar className="size-5 shrink-0">
                <AvatarFallback className={cn("text-[9px]", people[user.initials] ?? "bg-muted")}>{user.initials}</AvatarFallback>
              </Avatar>
              <span className={cn("min-w-0 flex-1 truncate", fade)}>{user.name}</span>
              <ChevronsUpDownIcon className={cn("size-3.5 shrink-0 text-muted-foreground", fade)} />
            </MenuTrigger>
            <MenuPopup align="start" className="w-52" side="top">
              <MenuItem>
                <UserRoundIcon />
                Profile
              </MenuItem>
              <MenuItem>
                <SettingsIcon />
                Settings
                <MenuShortcut>G S</MenuShortcut>
              </MenuItem>
              <MenuItem>
                <KeyboardIcon />
                Shortcuts
                <MenuShortcut>?</MenuShortcut>
              </MenuItem>
              <MenuSeparator />
              <MenuItem>
                <LogOutIcon />
                Log out
              </MenuItem>
            </MenuPopup>
          </Menu>
          {onToggle && (
            <RailTip
              collapsed
              label={
                <span className="flex items-center gap-1.5">
                  {collapsed ? "Expand" : "Collapse"}
                  <Kbd className="h-4.5 min-w-4.5 text-[10px]">[</Kbd>
                </span>
              }
            >
              <Button
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                className={cn(collapsed && "hidden")}
                onClick={onToggle}
                size="icon-sm"
                variant="ghost"
              >
                <PanelLeftIcon />
              </Button>
            </RailTip>
          )}
        </div>
      </div>
    </LayoutGroup>
  );
}

function IssueList({ issues, fresh, onAdd }: { issues: HairlineIssue[]; fresh: string | null; onAdd: (status: HairlineIssue["status"]) => void }) {
  const [closed, setClosed] = useState<string[]>([]);
  const [focus, setFocus] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const issuesRef = useRef(issues);
  issuesRef.current = issues;

  useEffect(() => {
    if (!fresh) return;
    const status = issuesRef.current.find((i) => i.id === fresh)?.status;
    setClosed((c) => c.filter((g) => g !== status));
    setFocus(fresh);
    const raf = requestAnimationFrame(() =>
      listRef.current?.querySelector<HTMLButtonElement>(`[data-issue="${fresh}"]`)?.focus(),
    );
    return () => cancelAnimationFrame(raf);
  }, [fresh]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowDown", "ArrowUp", "j", "k"].includes(e.key)) return;
    const rows = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>("[data-issue]") ?? []);
    const i = rows.indexOf(document.activeElement as HTMLButtonElement);
    const next = e.key === "ArrowDown" || e.key === "j" ? Math.min(rows.length - 1, i + 1) : Math.max(0, i - 1);
    rows[next]?.focus();
    setFocus(rows[next]?.dataset.issue ?? null);
    e.preventDefault();
  };

  return (
    <div className="min-w-0" onKeyDown={onKeyDown} ref={listRef}>
      {groups.map((g) => {
        const rows = issues.filter((i) => i.status === g.id);
        if (rows.length === 0) return null;
        const isOpen = !closed.includes(g.id);
        return (
          <section key={g.id}>
            <div className="sticky top-0 z-10 flex h-9 items-center border-b bg-muted/72 pe-2 backdrop-blur-sm dark:bg-muted">
              <button
                aria-expanded={isOpen}
                className="flex h-full min-w-0 flex-1 cursor-pointer items-center gap-2 ps-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset @3xl:ps-5"
                onClick={() => setClosed((c) => (isOpen ? [...c, g.id] : c.filter((x) => x !== g.id)))}
                type="button"
              >
                <ChevronRightIcon
                  className={cn("size-3.5 text-muted-foreground transition-transform duration-200 ease-out", isOpen && "rotate-90")}
                />
                <g.icon className={cn("size-3.5", g.tone)} />
                <span className="font-medium">{g.label}</span>
                <span className="text-muted-foreground text-xs tabular-nums">{rows.length}</span>
              </button>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button aria-label={`New issue in ${g.label}`} onClick={() => onAdd(g.id)} size="icon-sm" variant="ghost" />
                  }
                >
                  <PlusIcon />
                </TooltipTrigger>
                <TooltipPopup>New issue in {g.label}</TooltipPopup>
              </Tooltip>
            </div>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.ul
                  animate={{ height: "auto" }}
                  className="overflow-hidden"
                  exit={{ height: 0 }}
                  initial={{ height: 0 }}
                  transition={spring}
                >
                  <AnimatePresence initial={false}>
                    {rows.map((issue) => {
                      const P = priorityIcon[issue.priority];
                      return (
                        <motion.li
                          animate={{ height: "auto", opacity: 1 }}
                          className="border-b last:border-b-0"
                          initial={{ height: 0, opacity: 0 }}
                          key={issue.id}
                          transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                        >
                          <button
                            className={cn(
                              "group/issue relative flex h-10 w-full cursor-pointer items-center gap-3 px-4 text-left outline-none transition-colors duration-150 hover:bg-accent/60 focus-visible:bg-accent @3xl:h-9 @3xl:px-5",
                              focus === issue.id && "bg-accent",
                            )}
                            data-issue={issue.id}
                            onClick={() => setFocus(issue.id)}
                            onFocus={() => setFocus(issue.id)}
                            type="button"
                          >
                            {focus === issue.id && <span aria-hidden className="absolute inset-y-0 left-0 w-0.5 bg-foreground" />}
                            <P
                              aria-label={`${issue.priority} priority`}
                              className={cn(
                                "size-3.5 shrink-0",
                                issue.priority === "high" ? "text-foreground" : "text-muted-foreground",
                              )}
                            />
                            <span className="hidden w-16 shrink-0 font-mono text-muted-foreground text-xs @md:block">
                              {issue.id}
                            </span>
                            <g.icon className={cn("size-3.5 shrink-0", g.tone)} />
                            <span className="min-w-0 flex-1 truncate">
                              {issue.title}
                            </span>
                            {issue.label && (
                              <span className="hidden h-5 shrink-0 items-center gap-1.5 rounded-full border px-2 text-muted-foreground text-xs @2xl:inline-flex">
                                <span className={cn("size-1.5 rounded-full", swatch[issue.label.tone])} />
                                {issue.label.name}
                              </span>
                            )}
                            <span className="hidden w-12 shrink-0 text-right text-muted-foreground text-xs tabular-nums @xl:block">
                              {issue.due ?? ""}
                            </span>
                            <Avatar className="size-5 shrink-0">
                              <AvatarFallback className={cn("text-[9px]", people[issue.assignee] ?? "bg-muted")}>
                                {issue.assignee}
                              </AvatarFallback>
                            </Avatar>
                          </button>
                        </motion.li>
                      );
                    })}
                  </AnimatePresence>
                </motion.ul>
              )}
            </AnimatePresence>
          </section>
        );
      })}
    </div>
  );
}

function EmptyPane({ icon: Icon, title, body, action }: { icon: LucideIcon; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-16 text-center">
      <span className="flex size-10 items-center justify-center rounded-xl border bg-card text-muted-foreground shadow-xs/5">
        <Icon className="size-5" />
      </span>
      <p className="mt-4 font-medium">{title}</p>
      <p className="mt-1 max-w-xs text-pretty text-muted-foreground text-xs">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function HairlineShell({
  workspaces = defaultWorkspaces,
  nav = defaultNav,
  projects = defaultProjects,
  issues = defaultIssues,
  user = { name: "Ines Moreau", initials: "IM" },
  defaultCollapsed = false,
  children,
  className,
}: HairlineShellProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [drawer, setDrawer] = useState(false);
  const [active, setActive] = useState(projects[0]?.id ?? "home");
  const [view, setView] = useState<"list" | "board">("list");
  const drawerRef = useRef<HTMLDivElement>(null);
  const viewGroup = useId();

  useEffect(() => {
    if (drawer) drawerRef.current?.focus();
  }, [drawer]);

  const [items, setItems] = useState(issues);
  const [fresh, setFresh] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const project = projects.find((p) => p.id === active);
  const navItem = nav.find((n) => n.id === active);
  const title = project?.name ?? navItem?.label ?? "Search";
  const scope = (i: HairlineIssue) => i.project ?? projects[0]?.id;
  const q = query.trim().toLowerCase();
  const visible = items.filter((i) => {
    if (project) return scope(i) === project.id;
    if (active === "mine") return i.assignee === user.initials;
    if (active === "inbox") return i.unread;
    if (active === "views") return false;
    if (active === "search") return !q || i.title.toLowerCase().includes(q) || i.id.toLowerCase().includes(q);
    return true;
  });
  const inProgress = visible.filter((i) => i.status === "progress").length;
  const counted = projects.map((p) => ({ ...p, open: p.open ?? items.filter((i) => scope(i) === p.id).length }));
  const navCounted = nav.map((n) => (n.id === "inbox" && n.count === undefined ? { ...n, count: items.filter((i) => i.unread).length } : n));

  useEffect(() => {
    if (!fresh) return;
    const t = setTimeout(() => setFresh(null), 600);
    return () => clearTimeout(t);
  }, [fresh]);

  const addIssue = (status: HairlineIssue["status"] = "todo") => {
    const target = project ?? projects[0];
    if (!target) return;
    const prefix = target.prefix ?? target.name.slice(0, 3).toUpperCase();
    const top = Math.max(0, ...items.filter((i) => i.id.startsWith(`${prefix}-`)).map((i) => Number(i.id.split("-")[1]) || 0));
    const id = `${prefix}-${top + 1}`;
    setItems((xs) => [{ id, title: "Untitled issue", status, priority: "medium", assignee: user.initials, project: target.id }, ...xs]);
    setActive(target.id);
    setFresh(id);
  };

  const sidebar = {
    workspaces,
    nav: navCounted,
    projects: counted,
    user,
    active,
    onNavigate: (id: string) => {
      setActive(id);
      setDrawer(false);
    },
    onNew: () => addIssue(),
  };

  return (
    <MotionConfig reducedMotion="user">
      <TooltipProvider delay={400}>
      <div
        className={cn(
          "@container relative isolate flex h-[760px] w-full overflow-hidden bg-background text-foreground text-sm",
          className,
        )}
        onKeyDown={(e) => {
          if (e.key === "Escape" && drawer) setDrawer(false);
          if (e.target instanceof HTMLInputElement) return;
          if (e.key === "[") setCollapsed((c) => !c);
          if (e.key === "/") {
            e.preventDefault();
            setActive("search");
          }
        }}
      >
        <motion.aside
          animate={{ width: collapsed ? 48 : 232 }}
          aria-label="Sidebar"
          className="hidden shrink-0 overflow-hidden border-e @3xl:block"
          initial={false}
          transition={spring}
        >
          <HairlineSidebar {...sidebar} collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
        </motion.aside>

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
                className="absolute inset-y-0 left-0 z-50 w-64 max-w-[85%] border-e bg-background outline-none @3xl:hidden"
                exit={{ x: "-100%" }}
                initial={{ x: "-100%" }}
                ref={drawerRef}
                role="dialog"
                tabIndex={-1}
                transition={spring}
              >
                <HairlineSidebar {...sidebar} collapsed={false} onClose={() => setDrawer(false)} />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <main className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-11 shrink-0 items-center gap-2 border-b px-2 @3xl:px-3">
            <Button
              aria-label="Open navigation"
              className="@3xl:hidden"
              onClick={() => setDrawer(true)}
              size="icon-sm"
              variant="ghost"
            >
              <MenuIcon />
            </Button>
            {collapsed && (
              <Button
                aria-label="Expand sidebar"
                className="hidden @3xl:inline-flex"
                onClick={() => setCollapsed(false)}
                size="icon-sm"
                variant="ghost"
              >
                <PanelLeftIcon />
              </Button>
            )}
            <nav aria-label="Breadcrumb" className="flex min-w-0 flex-1 items-center gap-1 ps-1">
              <span className="hidden text-muted-foreground @md:inline">Northwind</span>
              <ChevronRightIcon aria-hidden className="hidden size-3.5 text-muted-foreground/60 @md:inline" />
              <span className="flex min-w-0 items-center gap-1.5">
                {project && <span className={cn("size-2 shrink-0 rounded-[3px]", swatch[project.tone])} />}
                <AnimatePresence initial={false} mode="popLayout">
                  <motion.span
                    animate={{ opacity: 1, filter: "blur(0px)" }}
                    aria-current="page"
                    className="truncate font-medium"
                    exit={{ opacity: 0, filter: "blur(2px)" }}
                    initial={{ opacity: 0, filter: "blur(2px)" }}
                    key={title}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                  >
                    {title}
                  </motion.span>
                </AnimatePresence>
              </span>
              {project && (
                <>
                  <ChevronRightIcon aria-hidden className="hidden size-3.5 text-muted-foreground/60 @lg:inline" />
                  <span className="hidden text-muted-foreground @lg:inline">Issues</span>
                </>
              )}
            </nav>

            <LayoutGroup id={viewGroup}>
              <div className="hidden items-center rounded-md border p-0.5 @lg:flex" role="radiogroup" aria-label="Layout">
                {(["list", "board"] as const).map((v) => (
                  <button
                    aria-checked={view === v}
                    className={cn(
                      "relative h-6 cursor-pointer rounded-[5px] px-2 text-xs capitalize outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      view === v ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                    )}
                    key={v}
                    onClick={() => setView(v)}
                    role="radio"
                    type="button"
                  >
                    {view === v && (
                      <motion.span className="absolute inset-0 rounded-[5px] bg-accent" layoutId="hairline-view" transition={spring} />
                    )}
                    <span className="relative">{v}</span>
                  </button>
                ))}
              </div>
            </LayoutGroup>
            <Button aria-label="Filter" size="icon-sm" variant="ghost">
              <FilterIcon />
            </Button>
            <Button aria-label="New issue" onClick={() => addIssue()} size="sm">
              <PlusIcon />
              <span className="hidden @md:inline">New issue</span>
            </Button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {children ?? (
              <>
                {active === "search" && (
                  <div className="sticky top-0 z-20 flex h-11 items-center gap-2 border-b bg-background px-4 @3xl:px-5">
                    <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
                    <input
                      aria-label="Search issues"
                      autoFocus
                      className="h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search by title or ID"
                      value={query}
                    />
                    {query && (
                      <Button aria-label="Clear search" onClick={() => setQuery("")} size="icon-xs" variant="ghost">
                        <XIcon />
                      </Button>
                    )}
                  </div>
                )}
                {active === "views" ? (
                  <EmptyPane
                    action={
                      <Button size="sm" variant="outline">
                        <PlusIcon />
                        New view
                      </Button>
                    }
                    body="Save a filter, like high priority bugs due this week, and it will live here."
                    icon={LayersIcon}
                    title="No saved views yet"
                  />
                ) : visible.length === 0 ? (
                  active === "search" ? (
                    <EmptyPane body="Try a shorter word, or an ID like BIL-142." icon={SearchIcon} title={`Nothing matches “${query.trim()}”`} />
                  ) : active === "inbox" ? (
                    <EmptyPane body="Mentions and assignments land here." icon={InboxIcon} title="You're all caught up" />
                  ) : (
                    <EmptyPane
                      action={
                        <Button onClick={() => addIssue()} size="sm" variant="outline">
                          <PlusIcon />
                          New issue
                        </Button>
                      }
                      body="Issues you create or are assigned will show up here."
                      icon={CircleDashedIcon}
                      title="No issues yet"
                    />
                  )
                ) : view === "list" ? (
                  <IssueList fresh={fresh} issues={visible} onAdd={addIssue} />
                ) : (
                  <IssueBoard issues={visible} />
                )}
              </>
            )}
          </div>

          <footer className="flex h-10 shrink-0 items-center gap-3 border-t px-4 text-muted-foreground text-xs @3xl:px-5">
            <span className="tabular-nums">
              {visible.length} {visible.length === 1 ? "issue" : "issues"} · {inProgress} in progress
            </span>
            <span className="ms-auto flex items-center gap-1.5">
              <span className="relative flex size-1.5">
                  <span className="relative size-1.5 rounded-full bg-success" />
              </span>
              Synced
              <RefreshCwIcon className="hidden size-3 @md:inline" />
            </span>
            <span className="hidden items-center gap-1 @2xl:flex">
              <Kbd className="h-4.5 min-w-4.5 text-[10px]">J</Kbd>
              <Kbd className="h-4.5 min-w-4.5 text-[10px]">K</Kbd>
              to move
              <Kbd className="ms-2 h-4.5 min-w-4.5 text-[10px]">[</Kbd>
              sidebar
            </span>
          </footer>
        </main>
      </div>
    </TooltipProvider>
    </MotionConfig>
  );
}

function IssueBoard({ issues }: { issues: HairlineIssue[] }) {
  return (
    <div className="grid min-h-full grid-cols-1 divide-y @lg:grid-cols-3 @lg:divide-x @lg:divide-y-0">
      {groups.map((g) => {
        const rows = issues.filter((i) => i.status === g.id);
        return (
          <div className="flex flex-col gap-1.5 p-2" key={g.id}>
            <div className="flex h-8 items-center gap-2 px-2">
              <g.icon className={cn("size-3.5", g.tone)} />
              <span className="font-medium">{g.label}</span>
              <span className="text-muted-foreground text-xs tabular-nums">{rows.length}</span>
            </div>
            {rows.map((issue, i) => {
              const P = priorityIcon[issue.priority];
              return (
                <motion.button
                  animate={{ opacity: 1, y: 0 }}
                  className="flex cursor-pointer flex-col gap-2 rounded-lg border bg-card p-2.5 text-left outline-none transition-[background-color,scale] duration-150 ease-out hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]"
                  initial={{ opacity: 0, y: 6 }}
                  key={issue.id}
                  transition={{ ...spring, delay: i * 0.025 }}
                  type="button"
                >
                  <span className="flex items-center gap-2 text-muted-foreground text-xs">
                    <span className="font-mono">{issue.id}</span>
                    <Avatar className="ms-auto size-4.5">
                      <AvatarFallback className={cn("text-[8px]", people[issue.assignee] ?? "bg-muted")}>
                        {issue.assignee}
                      </AvatarFallback>
                    </Avatar>
                  </span>
                  <span className="line-clamp-2 leading-snug">{issue.title}</span>
                  <span className="flex items-center gap-2 text-muted-foreground text-xs">
                    <P className="size-3.5" />
                    {issue.label && (
                      <span className="inline-flex items-center gap-1">
                        <span className={cn("size-1.5 rounded-full", swatch[issue.label.tone])} />
                        {issue.label.name}
                      </span>
                    )}
                    {issue.due && <span className="ms-auto tabular-nums">{issue.due}</span>}
                  </span>
                </motion.button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
