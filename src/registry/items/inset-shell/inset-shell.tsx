"use client";

import { AnimatePresence, LayoutGroup, MotionConfig, motion } from "motion/react";
import {
  BellIcon,
  CalendarIcon,
  ChartColumnIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ChevronsUpDownIcon,
  CircleDotIcon,
  FileTextIcon,
  HouseIcon,
  InboxIcon,
  KeyboardIcon,
  LayoutGridIcon,
  LifeBuoyIcon,
  LogOutIcon,
  type LucideIcon,
  MenuIcon,
  PanelLeftIcon,
  PlusIcon,
  SearchIcon,
  SettingsIcon,
  Share2Icon,
  UserRoundIcon,
  XIcon,
} from "lucide-react";
import { type ReactElement, type ReactNode, useEffect, useId, useRef, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
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

export type ShellTone = "orange" | "teal" | "cyan" | "violet" | "rose" | "info" | "success" | "warning";

export interface ShellWorkspace {
  id: string;
  name: string;
  plan: string;
  initials: string;
  tone: ShellTone;
}

export interface ShellNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  count?: number;
}

export interface ShellProject {
  id: string;
  name: string;
  tone: ShellTone;
  open?: number;
}

export interface ShellUser {
  name: string;
  email: string;
  initials: string;
}

export interface InsetShellProps {
  workspaces?: ShellWorkspace[];
  nav?: ShellNavItem[];
  projects?: ShellProject[];
  user?: ShellUser;
  breadcrumbs?: string[];
  defaultCollapsed?: boolean;
  children?: ReactNode;
  className?: string;
}

const dot: Record<ShellTone, string> = {
  "orange": "bg-orange-500",
  "teal": "bg-teal-500",
  "cyan": "bg-cyan-500",
  "violet": "bg-violet-500",
  "rose": "bg-rose-500",
  info: "bg-info",
  success: "bg-success",
  warning: "bg-warning",
};

const soft: Record<ShellTone, string> = {
  orange: "bg-orange-500/14",
  teal: "bg-teal-500/14",
  cyan: "bg-cyan-500/14",
  violet: "bg-violet-500/14",
  rose: "bg-rose-500/14",
  info: "bg-info/14",
  success: "bg-success/14",
  warning: "bg-warning/14",
};

const spring = { type: "spring", stiffness: 420, damping: 36 } as const;
const widthSpring = { type: "spring", stiffness: 380, damping: 38 } as const;

const defaultWorkspaces: ShellWorkspace[] = [
  { id: "northwind", name: "Northwind Labs", plan: "Team", initials: "NL", tone: "info" },
  { id: "fable", name: "Fable & Co", plan: "Free", initials: "FC", tone: "orange" },
  { id: "pilot", name: "Pilot Studio", plan: "Business", initials: "PS", tone: "teal" },
];

const defaultNav: ShellNavItem[] = [
  { id: "home", label: "Home", icon: HouseIcon },
  { id: "inbox", label: "Inbox", icon: InboxIcon, count: 4 },
  { id: "issues", label: "My issues", icon: CircleDotIcon, count: 6 },
  { id: "projects", label: "Projects", icon: LayoutGridIcon },
  { id: "docs", label: "Docs", icon: FileTextIcon },
  { id: "reports", label: "Reports", icon: ChartColumnIcon },
];

const defaultProjects: ShellProject[] = [
  { id: "atlas", name: "Atlas redesign", tone: "orange", open: 24 },
  { id: "billing", name: "Billing v2", tone: "teal", open: 9 },
  { id: "mobile", name: "Mobile beta", tone: "info", open: 17 },
  { id: "growth", name: "Growth experiments", tone: "violet", open: 6 },
  { id: "infra", name: "Infra hardening", tone: "rose", open: 3 },
];

const defaultUser: ShellUser = { name: "Ines Moreau", email: "ines@northwind.dev", initials: "IM" };

function SidebarRow({
  collapsed,
  label,
  tip,
  children,
}: {
  collapsed: boolean;
  label: string;
  tip?: ReactNode;
  children: (props: { "aria-label"?: string }) => ReactNode;
}) {
  return (
    <Tooltip disabled={!collapsed}>
      <TooltipTrigger render={children({ "aria-label": collapsed ? label : undefined }) as ReactElement} />
      <TooltipPopup side="right" sideOffset={10}>
        {tip ?? label}
      </TooltipPopup>
    </Tooltip>
  );
}

function Label({ collapsed, children, className }: { collapsed: boolean; children: ReactNode; className?: string }) {
  return (
    <span
      aria-hidden={collapsed || undefined}
      className={cn(
        "min-w-0 truncate transition-[opacity,translate] duration-200",
        collapsed && "pointer-events-none -translate-x-1 opacity-0",
        className,
      )}
    >
      {children}
    </span>
  );
}

interface SidebarProps {
  collapsed: boolean;
  workspaces: ShellWorkspace[];
  workspace: string;
  onWorkspace: (id: string) => void;
  nav: ShellNavItem[];
  active: string;
  onNavigate: (id: string, label: string) => void;
  projects: ShellProject[];
  user: ShellUser;
  onClose?: () => void;
}

function SidebarBody({
  collapsed,
  workspaces,
  workspace,
  onWorkspace,
  nav,
  active,
  onNavigate,
  projects,
  user,
  onClose,
}: SidebarProps) {
  const [projectsOpen, setProjectsOpen] = useState(true);
  const ws = workspaces.find((w) => w.id === workspace) ?? workspaces[0];
  const pill = useId();
  const row =
    "group/row relative flex h-8 w-full cursor-pointer items-center gap-2.5 overflow-hidden rounded-lg px-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <LayoutGroup id={pill}>
      <div className="flex h-full min-h-0 flex-col whitespace-nowrap">
        <div className="flex items-center gap-1 p-2">
          <Menu>
            <MenuTrigger
              aria-label={`Workspace: ${ws.name}`}
              className="flex h-11 min-w-0 flex-1 cursor-pointer items-center gap-2.5 overflow-hidden rounded-xl px-1.5 text-left outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring data-popup-open:bg-accent"
            >
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-lg font-semibold text-[11px] text-white",
                  dot[ws.tone],
                )}
              >
                {ws.initials}
              </span>
              <span className={cn("flex min-w-0 flex-1 flex-col transition-opacity duration-200", collapsed && "opacity-0")}>
                <span className="truncate font-medium leading-tight">{ws.name}</span>
                <span className="truncate text-muted-foreground text-xs leading-tight">{ws.plan} plan</span>
              </span>
              <ChevronsUpDownIcon className={cn("size-4 shrink-0 text-muted-foreground", collapsed && "opacity-0")} />
            </MenuTrigger>
            <MenuPopup align="start" className="w-60">
              <MenuGroup>
                <MenuGroupLabel>Workspaces</MenuGroupLabel>
                <MenuRadioGroup onValueChange={(v) => onWorkspace(v as string)} value={workspace}>
                  {workspaces.map((w) => (
                    <MenuRadioItem key={w.id} value={w.id}>
                      <span className="flex items-center gap-2">
                        <span className={cn("size-2 rounded-full", dot[w.tone])} />
                        {w.name}
                        <span className="text-muted-foreground text-xs">{w.plan}</span>
                      </span>
                    </MenuRadioItem>
                  ))}
                </MenuRadioGroup>
              </MenuGroup>
              <MenuSeparator />
              <MenuItem>
                <PlusIcon />
                Create workspace
              </MenuItem>
              <MenuItem>
                <SettingsIcon />
                Workspace settings
              </MenuItem>
            </MenuPopup>
          </Menu>
          {onClose && (
            <Button aria-label="Close navigation" onClick={onClose} size="icon-sm" variant="ghost">
              <XIcon />
            </Button>
          )}
        </div>

        <div className="px-2 pb-2">
          <SidebarRow collapsed={collapsed} label="Search" tip={<span>Search <Kbd className="ms-1">⌘K</Kbd></span>}>
            {(a) => (
              <button
                {...a}
                className={cn(
                  row,
                  "border bg-background text-muted-foreground shadow-xs/5 hover:text-foreground dark:bg-input/32",
                  collapsed && "border-transparent bg-transparent shadow-none dark:bg-transparent",
                )}
                type="button"
              >
                <SearchIcon className="size-4 shrink-0" />
                <Label collapsed={collapsed}>Search</Label>
                <Kbd className={cn("ms-auto transition-opacity", collapsed && "opacity-0")}>⌘K</Kbd>
              </button>
            )}
          </SidebarRow>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2 [scrollbar-width:thin]">
          <nav aria-label="Primary" className="flex flex-col gap-0.5">
            {nav.map((n) => {
              const on = active === n.id;
              return (
                <SidebarRow collapsed={collapsed} key={n.id} label={n.label}>
                  {(a) => (
                    <button
                      {...a}
                      aria-current={on ? "page" : undefined}
                      className={cn(row, on ? "text-foreground" : "text-muted-foreground hover:text-foreground")}
                      onClick={() => onNavigate(n.id, n.label)}
                      type="button"
                    >
                      {on && (
                        <motion.span
                          className="absolute inset-0 rounded-lg bg-background shadow-xs/5 ring-1 ring-border dark:bg-accent dark:ring-0"
                          layoutId="shell-nav-pill"
                          transition={spring}
                        />
                      )}
                      {!on && <span className="absolute inset-0 rounded-lg transition-colors group-hover/row:bg-accent" />}
                      <n.icon className="relative size-4 shrink-0" />
                      <Label className="relative font-medium" collapsed={collapsed}>
                        {n.label}
                      </Label>
                      {n.count !== undefined && (
                        <span
                          className={cn(
                            "relative ms-auto rounded-full px-1.5 text-xs tabular-nums transition-opacity",
                            n.id === "inbox" ? "bg-info/12 font-medium text-info-foreground" : "text-muted-foreground",
                            collapsed && "opacity-0",
                          )}
                        >
                          {n.count}
                        </span>
                      )}
                      {collapsed && n.id === "inbox" && (
                        <span className="absolute top-1.5 left-7 size-1.5 rounded-full bg-info ring-2 ring-sidebar" />
                      )}
                    </button>
                  )}
                </SidebarRow>
              );
            })}
          </nav>

          <div className="mt-5">
            <div className="relative flex h-7 items-center px-3">
              <button
                aria-expanded={projectsOpen}
                className={cn(
                  "flex cursor-pointer items-center gap-1 rounded font-medium text-muted-foreground text-xs outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
                  collapsed && "pointer-events-none opacity-0",
                )}
                onClick={() => setProjectsOpen((o) => !o)}
                tabIndex={collapsed ? -1 : 0}
                type="button"
              >
                Projects
                <ChevronDownIcon
                  className={cn("size-3 transition-transform duration-200", !projectsOpen && "-rotate-90")}
                />
              </button>
              {collapsed && <span className="absolute left-4 h-px w-6 bg-border" />}
              <Button
                aria-label="New project"
                className={cn("ms-auto", collapsed && "pointer-events-none opacity-0")}
                size="icon-xs"
                tabIndex={collapsed ? -1 : 0}
                variant="ghost"
              >
                <PlusIcon />
              </Button>
            </div>
            <AnimatePresence initial={false}>
              {(projectsOpen || collapsed) && (
                <motion.ul
                  animate={{ height: "auto", opacity: 1 }}
                  className="flex flex-col gap-0.5 overflow-hidden"
                  exit={{ height: 0, opacity: 0 }}
                  initial={{ height: 0, opacity: 0 }}
                  transition={spring}
                >
                  {projects.map((p) => {
                    const on = active === `project-${p.id}`;
                    return (
                      <li key={p.id}>
                        <SidebarRow collapsed={collapsed} label={p.name}>
                          {(a) => (
                            <button
                              {...a}
                              aria-current={on ? "page" : undefined}
                              className={cn(row, on ? "text-foreground" : "text-muted-foreground hover:text-foreground")}
                              onClick={() => onNavigate(`project-${p.id}`, p.name)}
                              type="button"
                            >
                              {on && (
                                <motion.span
                                  className="absolute inset-0 rounded-lg bg-background shadow-xs/5 ring-1 ring-border dark:bg-accent dark:ring-0"
                                  layoutId="shell-nav-pill"
                                  transition={spring}
                                />
                              )}
                              {!on && (
                                <span className="absolute inset-0 rounded-lg transition-colors group-hover/row:bg-accent" />
                              )}
                              <span className="relative flex size-4 shrink-0 items-center justify-center">
                                <span className={cn("size-2 rounded-full ring-3 ring-current/0", dot[p.tone])} />
                              </span>
                              <Label className="relative" collapsed={collapsed}>
                                {p.name}
                              </Label>
                              {p.open !== undefined && (
                                <span
                                  className={cn(
                                    "relative ms-auto text-muted-foreground/80 text-xs tabular-nums opacity-0 transition-opacity group-hover/row:opacity-100",
                                    on && "opacity-100",
                                    collapsed && "opacity-0!",
                                  )}
                                >
                                  {p.open}
                                </span>
                              )}
                            </button>
                          )}
                        </SidebarRow>
                      </li>
                    );
                  })}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex flex-col gap-0.5 p-2">
          <SidebarRow collapsed={collapsed} label="Help & support">
            {(a) => (
              <button {...a} className={cn(row, "text-muted-foreground hover:bg-accent hover:text-foreground")} type="button">
                <LifeBuoyIcon className="size-4 shrink-0" />
                <Label collapsed={collapsed}>Help &amp; support</Label>
              </button>
            )}
          </SidebarRow>
          <Menu>
            <MenuTrigger
              aria-label={`Account: ${user.name}`}
              className="mt-1 flex h-12 w-full cursor-pointer items-center gap-2.5 overflow-hidden rounded-xl px-1.5 text-left outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring data-popup-open:bg-accent"
            >
              <Avatar className="size-7 shrink-0">
                <AvatarFallback className="bg-teal-500/16 text-[11px] text-teal-600 dark:text-teal-400">{user.initials}</AvatarFallback>
              </Avatar>
              <span className={cn("flex min-w-0 flex-1 flex-col transition-opacity duration-200", collapsed && "opacity-0")}>
                <span className="truncate font-medium leading-tight">{user.name}</span>
                <span className="truncate text-muted-foreground text-xs leading-tight">{user.email}</span>
              </span>
              <ChevronsUpDownIcon className={cn("size-4 shrink-0 text-muted-foreground", collapsed && "opacity-0")} />
            </MenuTrigger>
            <MenuPopup align="start" className="w-56" side="top">
              <div className="flex items-center gap-2.5 px-2 py-1.5">
                <Avatar className="size-8">
                  <AvatarFallback className="bg-teal-500/16 text-teal-600 dark:text-teal-400 text-xs">{user.initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="truncate font-medium text-sm">{user.name}</div>
                  <div className="truncate text-muted-foreground text-xs">{user.email}</div>
                </div>
              </div>
              <MenuSeparator />
              <MenuItem>
                <UserRoundIcon />
                Profile
              </MenuItem>
              <MenuItem>
                <SettingsIcon />
                Preferences
                <MenuShortcut>⌘,</MenuShortcut>
              </MenuItem>
              <MenuItem>
                <KeyboardIcon />
                Shortcuts
                <MenuShortcut>?</MenuShortcut>
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

type Status = "on-track" | "at-risk" | "done";

interface ProjectDetail {
  summary: string;
  status: Status;
  progress: number;
  week: number;
  open: number;
  total: number;
  target: string;
  targetIn: string;
  targetNote: string;
  milestones: { name: string; date: string; done: number }[];
  updates: { who: string; what: string; target: string; to?: string; time: string }[];
}

const people: Record<string, { initials: string; tone: string }> = {
  "Kai Tanaka": { initials: "KT", tone: "bg-blue-500/14 text-blue-700 dark:text-blue-300" },
  "Rosa Lind": { initials: "RL", tone: "bg-orange-500/14 text-orange-700 dark:text-orange-300" },
  "Ines Moreau": { initials: "IM", tone: "bg-teal-500/16 text-teal-700 dark:text-teal-300" },
  "Theo Brandt": { initials: "TB", tone: "bg-violet-500/16 text-violet-700 dark:text-violet-300" },
};

const details: Record<string, ProjectDetail> = {
  atlas: {
    summary: "A calmer navigation model for Orbit: fewer top-level items, projects one click away, and a sidebar that gets out of the way.",
    status: "on-track",
    progress: 68,
    week: 9,
    open: 24,
    total: 76,
    target: "Nov 14",
    targetIn: "in 21 days",
    targetNote: "Beta review with 50 teams",
    milestones: [
      { name: "Research synthesis", date: "Oct 4", done: 100 },
      { name: "Navigation & IA", date: "Oct 22", done: 82 },
      { name: "Component audit", date: "Nov 3", done: 46 },
      { name: "Beta to 50 teams", date: "Nov 14", done: 12 },
    ],
    updates: [
      { who: "Kai Tanaka", what: "moved", target: "Sidebar density pass", to: "In review", time: "12m" },
      { who: "Rosa Lind", what: "commented on", target: "Breadcrumb overflow", time: "48m" },
      { who: "Ines Moreau", what: "closed", target: "Empty states for projects", time: "2h" },
      { who: "Theo Brandt", what: "added", target: "Keyboard map for nav", to: "Backlog", time: "3h" },
    ],
  },
  billing: {
    summary: "Usage-based pricing with prorated seat changes, a clearer invoice and fewer failed renewals.",
    status: "at-risk",
    progress: 41,
    week: 3,
    open: 9,
    total: 22,
    target: "Dec 2",
    targetIn: "in 39 days",
    targetNote: "Migrate the first 200 workspaces",
    milestones: [
      { name: "Pricing model sign-off", date: "Oct 1", done: 100 },
      { name: "Proration engine", date: "Oct 28", done: 64 },
      { name: "Invoice redesign", date: "Nov 12", done: 20 },
      { name: "Staged migration", date: "Dec 2", done: 0 },
    ],
    updates: [
      { who: "Theo Brandt", what: "flagged", target: "Tax rounding for EU", to: "Blocked", time: "25m" },
      { who: "Ines Moreau", what: "moved", target: "Retry failed charges", to: "In progress", time: "1h" },
      { who: "Kai Tanaka", what: "closed", target: "Seat count webhook", time: "4h" },
    ],
  },
  mobile: {
    summary: "A native iOS and Android app for triage on the go: inbox, quick replies and push for mentions.",
    status: "on-track",
    progress: 55,
    week: 6,
    open: 17,
    total: 38,
    target: "Nov 28",
    targetIn: "in 35 days",
    targetNote: "TestFlight to 400 testers",
    milestones: [
      { name: "Navigation shell", date: "Oct 10", done: 100 },
      { name: "Inbox and replies", date: "Nov 1", done: 70 },
      { name: "Push notifications", date: "Nov 18", done: 30 },
      { name: "Public beta", date: "Nov 28", done: 0 },
    ],
    updates: [
      { who: "Rosa Lind", what: "shipped", target: "Swipe to archive", time: "40m" },
      { who: "Kai Tanaka", what: "commented on", target: "Offline drafts", time: "2h" },
      { who: "Theo Brandt", what: "moved", target: "Deep links", to: "In review", time: "5h" },
    ],
  },
  growth: {
    summary: "Small weekly bets on activation: a shorter signup, a guided first project and better invite emails.",
    status: "on-track",
    progress: 30,
    week: 4,
    open: 6,
    total: 14,
    target: "Dec 15",
    targetIn: "in 52 days",
    targetNote: "Lift week-one activation to 45%",
    milestones: [
      { name: "Signup in two steps", date: "Oct 18", done: 100 },
      { name: "Guided first project", date: "Nov 8", done: 35 },
      { name: "Invite email tests", date: "Nov 25", done: 10 },
      { name: "Readout", date: "Dec 15", done: 0 },
    ],
    updates: [
      { who: "Ines Moreau", what: "started", target: "Invite subject line test", time: "1h" },
      { who: "Rosa Lind", what: "closed", target: "Remove company size field", time: "1d" },
    ],
  },
  infra: {
    summary: "Fewer pages at night: faster deploy rollbacks, regional failover for the API and saner alert thresholds.",
    status: "done",
    progress: 92,
    week: 5,
    open: 3,
    total: 41,
    target: "Oct 31",
    targetIn: "in 7 days",
    targetNote: "Failover drill with on-call",
    milestones: [
      { name: "One-click rollback", date: "Sep 20", done: 100 },
      { name: "Alert threshold review", date: "Oct 6", done: 100 },
      { name: "Regional failover", date: "Oct 24", done: 100 },
      { name: "Failover drill", date: "Oct 31", done: 60 },
    ],
    updates: [
      { who: "Kai Tanaka", what: "closed", target: "Failover for eu-west", time: "3h" },
      { who: "Theo Brandt", what: "scheduled", target: "Drill with on-call", to: "Oct 31", time: "6h" },
    ],
  },
};

const statusBadge: Record<Status, { label: string; variant: "success" | "warning" | "info" }> = {
  "on-track": { label: "On track", variant: "success" },
  "at-risk": { label: "At risk", variant: "warning" },
  done: { label: "Wrapping up", variant: "info" },
};

const ease = [0.23, 1, 0.32, 1] as const;

function ProjectOverview({ project }: { project: ShellProject }) {
  const d = details[project.id] ?? details.atlas;
  const [tab, setTab] = useState("overview");
  const tabId = useId();
  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "issues", label: "Issues", count: d.open },
    { id: "docs", label: "Docs", count: d.milestones.length + 3 },
    { id: "activity", label: "Activity" },
  ];
  const badge = statusBadge[d.status];
  const segments = 19;
  const doneSegments = Math.round(((d.total - d.open) / d.total) * segments);
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 @3xl:px-8 @3xl:py-8">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("flex size-6 items-center justify-center rounded-md", soft[project.tone])}>
            <span className={cn("size-2 rounded-full", dot[project.tone])} />
          </span>
          <h1 className="text-balance font-heading font-semibold text-xl tracking-tight">{project.name}</h1>
          <Badge variant={badge.variant}>{badge.label}</Badge>
        </div>
        <p className="max-w-xl text-pretty text-muted-foreground">{d.summary}</p>
      </div>

      <LayoutGroup id={tabId}>
        <div className="-mb-2 flex gap-1 overflow-x-auto border-b [scrollbar-width:none]" role="tablist">
          {tabs.map((t) => (
            <button
              aria-selected={tab === t.id}
              className={cn(
                "relative flex h-9 shrink-0 cursor-pointer items-center gap-1.5 px-2.5 font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring",
                tab === t.id ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
              key={t.id}
              onClick={() => setTab(t.id)}
              role="tab"
              type="button"
            >
              {t.label}
              {t.count !== undefined && <span className="text-muted-foreground text-xs tabular-nums">{t.count}</span>}
              {tab === t.id && (
                <motion.span className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-foreground" layoutId="tab" transition={spring} />
              )}
            </button>
          ))}
        </div>
      </LayoutGroup>

      <div className="grid grid-cols-1 gap-3 @lg:grid-cols-3">
        <div className="rounded-2xl border bg-card p-4">
          <div className="text-muted-foreground text-xs">Progress</div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="font-heading font-semibold text-2xl tabular-nums">{d.progress}%</span>
            <span className="text-success-foreground text-xs tabular-nums">+{d.week} this week</span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
            <motion.div
              animate={{ scaleX: d.progress / 100 }}
              className={cn("h-full origin-left rounded-full", dot[project.tone])}
              initial={{ scaleX: 0 }}
              key={project.id}
              transition={{ duration: 0.6, ease, delay: 0.1 }}
            />
          </div>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <div className="text-muted-foreground text-xs">Open issues</div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="font-heading font-semibold text-2xl tabular-nums">{d.open}</span>
            <span className="text-muted-foreground text-xs tabular-nums">of {d.total}</span>
          </div>
          <div className="mt-3 flex gap-0.5">
            {Array.from({ length: segments }, (_, i) => (
              <span className={cn("h-1.5 flex-1 rounded-full transition-colors duration-300", i < doneSegments ? "bg-foreground/72" : "bg-muted")} key={i} />
            ))}
          </div>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <div className="text-muted-foreground text-xs">Target date</div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="font-heading font-semibold text-2xl tabular-nums">{d.target}</span>
            <span className="text-muted-foreground text-xs tabular-nums">{d.targetIn}</span>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-muted-foreground text-xs">
            <CalendarIcon className="size-3.5" />
            {d.targetNote}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-3 @3xl:grid-cols-[1.1fr_1fr]">
        <section className="rounded-2xl border bg-card">
          <header className="flex items-center justify-between px-4 pt-4 pb-2">
            <h2 className="font-medium">Milestones</h2>
            <Button size="xs" variant="ghost">
              <PlusIcon />
              Add
            </Button>
          </header>
          <ul className="flex flex-col px-2 pb-2">
            {d.milestones.map((m) => (
              <li className="flex items-center gap-3 rounded-lg px-2 py-2.5" key={m.name}>
                <span
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded-full border",
                    m.done === 100 && "border-success bg-success text-white",
                  )}
                >
                  {m.done === 100 && <CheckIcon className="size-2.5" strokeWidth={3} />}
                </span>
                <span className="min-w-0 flex-1 truncate">{m.name}</span>
                <span className="hidden h-1 w-16 overflow-hidden rounded-full bg-muted @md:block">
                  <span
                    className={cn("block h-full origin-left rounded-full", m.done === 100 ? "bg-success" : dot[project.tone])}
                    style={{ transform: `scaleX(${m.done / 100})` }}
                  />
                </span>
                <span className="w-12 text-right text-muted-foreground text-xs tabular-nums">{m.date}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-2xl border bg-card">
          <header className="px-4 pt-4 pb-2">
            <h2 className="font-medium">Latest updates</h2>
          </header>
          <ul className="flex flex-col gap-1 px-4 pb-4">
            {d.updates.map((u) => (
              <li className="flex gap-2.5 py-1.5" key={u.target}>
                <Avatar className="size-6">
                  <AvatarFallback className={cn("text-[10px]", people[u.who]?.tone)}>{people[u.who]?.initials}</AvatarFallback>
                </Avatar>
                <p className="min-w-0 flex-1 text-pretty text-muted-foreground leading-6">
                  <span className="font-medium text-foreground">{u.who}</span> {u.what}{" "}
                  <span className="text-foreground">{u.target}</span>
                  {u.to && (
                    <>
                      {" "}
                      to <span className="text-foreground">{u.to}</span>
                    </>
                  )}
                </p>
                <span className="pt-0.5 text-muted-foreground text-xs tabular-nums">{u.time}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

const inbox = [
  { who: "Kai Tanaka", what: "assigned you", target: "Sidebar density pass", where: "Atlas redesign", time: "12m", unread: true },
  { who: "Rosa Lind", what: "mentioned you on", target: "Breadcrumb overflow", where: "Atlas redesign", time: "48m", unread: true },
  { who: "Theo Brandt", what: "asked for review on", target: "Tax rounding for EU", where: "Billing v2", time: "1h", unread: true },
  { who: "Ines Moreau", what: "replied on", target: "Swipe to archive", where: "Mobile beta", time: "3h", unread: true },
  { who: "Kai Tanaka", what: "closed", target: "Failover for eu-west", where: "Infra hardening", time: "Yesterday", unread: false },
];

const myIssues = [
  { id: "ATL-212", title: "Collapse sidebar to an icon rail", project: "atlas", state: "In progress" },
  { id: "ATL-219", title: "Keyboard map for navigation", project: "atlas", state: "Todo" },
  { id: "BIL-142", title: "Prorate seat changes mid-cycle", project: "billing", state: "In progress" },
  { id: "MOB-88", title: "Push for mentions only", project: "mobile", state: "Todo" },
  { id: "GRO-31", title: "Guided first project checklist", project: "growth", state: "In review" },
  { id: "INF-57", title: "Alert on p95 latency, not p50", project: "infra", state: "Todo" },
];

const docs = [
  { title: "Navigation principles", project: "atlas", edited: "Edited 2h ago by Rosa Lind" },
  { title: "Pricing FAQ for support", project: "billing", edited: "Edited yesterday by Theo Brandt" },
  { title: "Mobile beta test plan", project: "mobile", edited: "Edited Mon by Kai Tanaka" },
  { title: "On-call handbook", project: "infra", edited: "Edited Oct 12 by Ines Moreau" },
];

function NavPage({ id, label, icon: Icon, projects, onOpenProject }: { id: string; label: string; icon: LucideIcon; projects: ShellProject[]; onOpenProject: (p: ShellProject) => void }) {
  const projectBy = (pid: string) => projects.find((p) => p.id === pid);
  const rowCls = "flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left outline-none transition-[background-color,scale] duration-150 ease-out hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.99]";
  const intro: Record<string, string> = {
    home: "Your projects at a glance.",
    inbox: "Mentions, assignments and reviews waiting on you.",
    issues: "Everything assigned to you, across projects.",
    projects: "Every project in this workspace.",
    docs: "Recently edited docs you can open.",
    reports: "Charts and weekly digests for this workspace.",
  };
  let body: ReactNode;
  if (id === "home" || id === "projects") {
    body = (
      <ul className="grid grid-cols-1 gap-3 @lg:grid-cols-2">
        {projects.map((p) => {
          const d = details[p.id];
          return (
            <li key={p.id}>
              <button
                className="flex w-full cursor-pointer flex-col gap-3 rounded-2xl border bg-card p-4 text-left outline-none transition-[border-color,scale] duration-150 ease-out hover:border-foreground/16 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]"
                onClick={() => onOpenProject(p)}
                type="button"
              >
                <span className="flex items-center gap-2">
                  <span className={cn("size-2 rounded-full", dot[p.tone])} />
                  <span className="font-medium">{p.name}</span>
                  {d && <Badge className="ms-auto" variant={statusBadge[d.status].variant}>{statusBadge[d.status].label}</Badge>}
                </span>
                {d && (
                  <>
                    <span className="h-1 overflow-hidden rounded-full bg-muted">
                      <span className={cn("block h-full origin-left rounded-full", dot[p.tone])} style={{ transform: `scaleX(${d.progress / 100})` }} />
                    </span>
                    <span className="flex justify-between text-muted-foreground text-xs tabular-nums">
                      <span>{d.progress}% · {p.open ?? d.open} open</span>
                      <span>Due {d.target}</span>
                    </span>
                  </>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    );
  } else if (id === "inbox") {
    body = (
      <ul className="-mx-3 flex flex-col">
        {inbox.map((n) => (
          <li key={n.target}>
            <button className={rowCls} type="button">
              <Avatar className="size-7">
                <AvatarFallback className={cn("text-[10px]", people[n.who]?.tone)}>{people[n.who]?.initials}</AvatarFallback>
              </Avatar>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-muted-foreground">
                  <span className="font-medium text-foreground">{n.who}</span> {n.what} <span className="text-foreground">{n.target}</span>
                </span>
                <span className="block truncate text-muted-foreground text-xs">{n.where}</span>
              </span>
              <span className="text-muted-foreground text-xs tabular-nums">{n.time}</span>
              <span className={cn("size-1.5 shrink-0 rounded-full", n.unread ? "bg-info" : "bg-transparent")} />
            </button>
          </li>
        ))}
      </ul>
    );
  } else if (id === "issues") {
    body = (
      <ul className="-mx-3 flex flex-col">
        {myIssues.map((i) => {
          const p = projectBy(i.project);
          return (
            <li key={i.id}>
              <button className={rowCls} type="button">
                <span className="w-16 shrink-0 font-mono text-muted-foreground text-xs">{i.id}</span>
                <span className="min-w-0 flex-1 truncate">{i.title}</span>
                {p && (
                  <span className="hidden items-center gap-1.5 text-muted-foreground text-xs @md:flex">
                    <span className={cn("size-1.5 rounded-full", dot[p.tone])} />
                    {p.name}
                  </span>
                )}
                <span className="w-20 text-right text-muted-foreground text-xs">{i.state}</span>
              </button>
            </li>
          );
        })}
      </ul>
    );
  } else if (id === "docs") {
    body = (
      <ul className="-mx-3 flex flex-col">
        {docs.map((doc) => {
          const p = projectBy(doc.project);
          return (
            <li key={doc.title}>
              <button className={rowCls} type="button">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-card text-muted-foreground">
                  <FileTextIcon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{doc.title}</span>
                  <span className="block truncate text-muted-foreground text-xs">{doc.edited}</span>
                </span>
                {p && (
                  <span className="hidden items-center gap-1.5 text-muted-foreground text-xs @md:flex">
                    <span className={cn("size-1.5 rounded-full", dot[p.tone])} />
                    {p.name}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    );
  } else {
    body = (
      <div className="flex flex-col items-center rounded-2xl border border-dashed px-6 py-14 text-center">
        <span className="flex size-10 items-center justify-center rounded-xl border bg-card text-muted-foreground shadow-xs/5">
          <Icon className="size-5" />
        </span>
        <h2 className="mt-4 font-medium">No {label.toLowerCase()} yet</h2>
        <p className="mt-1 max-w-xs text-pretty text-muted-foreground text-xs">
          Start one from a project to track progress over time. It will show up here for the whole workspace.
        </p>
        <Button className="mt-4" size="sm" variant="outline">
          <PlusIcon />
          New report
        </Button>
      </div>
    );
  }
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 py-6 @3xl:px-8 @3xl:py-8">
      <div>
        <h1 className="text-balance font-heading font-semibold text-xl tracking-tight">{label}</h1>
        <p className="mt-1 text-muted-foreground">{intro[id] ?? ""}</p>
      </div>
      {body}
    </div>
  );
}

export function InsetShell({
  workspaces = defaultWorkspaces,
  nav = defaultNav,
  projects = defaultProjects,
  user = defaultUser,
  breadcrumbs,
  defaultCollapsed = false,
  children,
  className,
}: InsetShellProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [drawer, setDrawer] = useState(false);
  const [workspace, setWorkspace] = useState(workspaces[0]?.id ?? "");
  const [active, setActive] = useState(`project-${projects[0]?.id ?? ""}`);
  const [pageTitle, setPageTitle] = useState(projects[0]?.name ?? "Home");
  const drawerRef = useRef<HTMLDivElement>(null);
  const ws = workspaces.find((w) => w.id === workspace) ?? workspaces[0];

  useEffect(() => {
    if (drawer) drawerRef.current?.focus();
  }, [drawer]);

  const trail = breadcrumbs ?? [ws?.name ?? "Orbit", active.startsWith("project-") ? "Projects" : null, pageTitle].filter(
    (x): x is string => Boolean(x),
  );

  const navigate = (id: string, label: string) => {
    setActive(id);
    setPageTitle(label);
    setDrawer(false);
  };

  const currentProject = projects.find((p) => `project-${p.id}` === active);
  const currentNav = nav.find((n) => n.id === active);
  const page = currentProject ? (
    <ProjectOverview project={currentProject} />
  ) : currentNav ? (
    <NavPage
      icon={currentNav.icon}
      id={currentNav.id}
      label={currentNav.label}
      onOpenProject={(p) => navigate(`project-${p.id}`, p.name)}
      projects={projects}
    />
  ) : null;

  const sidebarProps = {
    workspaces,
    workspace,
    onWorkspace: setWorkspace,
    nav,
    active,
    onNavigate: navigate,
    projects,
    user,
  };

  return (
    <MotionConfig reducedMotion="user">
      <TooltipProvider delay={400}>
      <div
        className={cn(
          "@container relative isolate flex h-[760px] w-full overflow-hidden bg-sidebar text-foreground text-sm",
          className,
        )}
        onKeyDown={(e) => {
          if (e.key === "Escape" && drawer) setDrawer(false);
        }}
      >
        <motion.aside
          animate={{ width: collapsed ? 56 : 248 }}
          aria-label="Sidebar"
          className="hidden shrink-0 overflow-hidden @3xl:block"
          initial={false}
          transition={widthSpring}
        >
          <div className="h-full w-full">
            <SidebarBody {...sidebarProps} collapsed={collapsed} />
          </div>
        </motion.aside>

        <AnimatePresence>
          {drawer && (
            <>
              <motion.div
                animate={{ opacity: 1 }}
                aria-hidden
                className="absolute inset-0 z-40 bg-black/32 backdrop-blur-[1px] @3xl:hidden"
                exit={{ opacity: 0 }}
                initial={{ opacity: 0 }}
                onClick={() => setDrawer(false)}
              />
              <motion.div
                animate={{ x: 0 }}
                aria-label="Navigation"
                aria-modal="true"
                className="absolute inset-y-2 left-2 z-50 w-[272px] max-w-[calc(100%-3rem)] overflow-hidden rounded-2xl border bg-sidebar shadow-lg/10 outline-none @3xl:hidden"
                exit={{ x: "-110%" }}
                initial={{ x: "-110%" }}
                ref={drawerRef}
                role="dialog"
                tabIndex={-1}
                transition={spring}
              >
                <SidebarBody {...sidebarProps} collapsed={false} onClose={() => setDrawer(false)} />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <div className="flex min-w-0 flex-1 flex-col @3xl:py-2 @3xl:pe-2">
          <main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background @3xl:rounded-2xl @3xl:border @3xl:shadow-xs/5">
            <header className="flex h-13 shrink-0 items-center gap-2 border-b px-3 @3xl:px-4">
              <Button
                aria-label="Open navigation"
                className="@3xl:hidden"
                onClick={() => setDrawer(true)}
                size="icon-sm"
                variant="ghost"
              >
                <MenuIcon />
              </Button>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      aria-expanded={!collapsed}
                      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                      className="hidden @3xl:inline-flex"
                      onClick={() => setCollapsed((c) => !c)}
                      size="icon-sm"
                      variant="ghost"
                    />
                  }
                >
                  <PanelLeftIcon />
                </TooltipTrigger>
                <TooltipPopup>{collapsed ? "Expand sidebar" : "Collapse sidebar"}</TooltipPopup>
              </Tooltip>
              <span className="h-4 w-px bg-border" />
              <Breadcrumb className="min-w-0 flex-1">
                <BreadcrumbList className="flex-nowrap gap-1.5 sm:gap-1.5">
                  {trail.map((crumb, i) => {
                    const last = i === trail.length - 1;
                    return (
                      <motion.li className={cn("flex min-w-0 items-center gap-1.5", !last && "hidden @md:flex")} key={`${i}-${crumb}`} layout="position">
                        {last ? (
                          <AnimatePresence initial={false} mode="popLayout">
                            <motion.span
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -6 }}
                              initial={{ opacity: 0, y: 6 }}
                              key={crumb}
                              transition={spring}
                            >
                              <BreadcrumbPage className="truncate font-medium">{crumb}</BreadcrumbPage>
                            </motion.span>
                          </AnimatePresence>
                        ) : (
                          <>
                            <BreadcrumbLink className="truncate" href="#" onClick={(e) => e.preventDefault()}>
                              {crumb}
                            </BreadcrumbLink>
                            <ChevronRightIcon aria-hidden className="size-3.5 shrink-0 text-muted-foreground/60" />
                          </>
                        )}
                      </motion.li>
                    );
                  })}
                </BreadcrumbList>
              </Breadcrumb>
              <div className="flex items-center gap-1.5">
                <div className="me-1 hidden -space-x-1 @lg:flex">
                  {[
                    ["KT", "bg-info/16 text-info-foreground"],
                    ["RL", "bg-orange-500/16 text-orange-600 dark:text-orange-400"],
                    ["TB", "bg-violet-500/20 text-violet-600 dark:text-violet-400"],
                  ].map(([i, t]) => (
                    <Avatar className="size-6 bg-background ring-2 ring-background" key={i}>
                      <AvatarFallback className={cn("text-[10px]", t)}>{i}</AvatarFallback>
                    </Avatar>
                  ))}
                </div>
                <Button className="hidden @md:inline-flex" size="sm" variant="outline">
                  <Share2Icon />
                  Share
                </Button>
                <Button aria-label="Notifications" className="relative" size="icon-sm" variant="ghost">
                  <BellIcon />
                  <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-info" />
                </Button>
              </div>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto" key={children ? undefined : active}>
              {children ?? (
                <motion.div animate={{ opacity: 1 }} initial={{ opacity: 0 }} transition={{ duration: 0.15, ease: "easeOut" }}>
                  {page}
                </motion.div>
              )}
            </div>
          </main>
        </div>
      </div>
      </TooltipProvider>
    </MotionConfig>
  );
}
