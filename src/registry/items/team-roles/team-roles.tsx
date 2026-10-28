"use client";

import {
  ArrowLeftIcon,
  BellIcon,
  CheckIcon,
  CopyIcon,
  CreditCardIcon,
  EllipsisIcon,
  KeyRoundIcon,
  LockIcon,
  MailIcon,
  PaletteIcon,
  PlusIcon,
  RotateCcwIcon,
  SettingsIcon,
  ShieldIcon,
  UserIcon,
  UserMinusIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type CSSProperties, type FormEvent, Fragment, type ReactNode, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Menu, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@/components/ui/select";

export type SettingsSectionId =
  | "profile"
  | "appearance"
  | "notifications"
  | "security"
  | "general"
  | "members"
  | "billing"
  | "developer";

export type TeamHue = "amber" | "rose" | "violet" | "teal" | "sky" | "emerald" | "indigo" | "orange";

export interface TeamPermission {
  id: string;
  label: string;
}

export interface TeamPermissionArea {
  id: string;
  name: string;
  permissions: TeamPermission[];
}

export interface TeamRole {
  id: string;
  name: string;
  description: string;
  locked?: boolean;
  from?: string;
  grants: string[];
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  roleId: string;
  hue: TeamHue;
  lastActive: string;
}

export interface TeamInvite {
  id: string;
  email: string;
  roleId: string;
  invitedBy: string;
  sent: string;
}

export interface TeamRolesProps {
  className?: string;
  areas?: TeamPermissionArea[];
  roles?: TeamRole[];
  members?: TeamMember[];
  invites?: TeamInvite[];
  currentUserId?: string;
  onNavigate?: (section: SettingsSectionId) => void;
}

const easeOut = [0.23, 1, 0.32, 1] as const;
const spring = { type: "spring", stiffness: 500, damping: 40 } as const;
const press = "transition-[color,background-color,box-shadow,scale] duration-150 ease-out active:scale-[0.97]";

const avatarHues: Record<TeamHue, string> = {
  amber: "from-amber-300 to-orange-500",
  rose: "from-rose-300 to-pink-500",
  violet: "from-violet-400 to-indigo-500",
  teal: "from-teal-300 to-emerald-500",
  sky: "from-sky-300 to-blue-500",
  emerald: "from-emerald-300 to-teal-600",
  indigo: "from-indigo-400 to-violet-700",
  orange: "from-orange-300 to-red-500",
};

const navGroups: { label: string; items: { id: SettingsSectionId; label: string; icon: ReactNode }[] }[] = [
  {
    label: "Account",
    items: [
      { id: "profile", label: "Profile", icon: <UserIcon /> },
      { id: "appearance", label: "Appearance", icon: <PaletteIcon /> },
      { id: "notifications", label: "Notifications", icon: <BellIcon /> },
      { id: "security", label: "Security", icon: <ShieldIcon /> },
    ],
  },
  {
    label: "Workspace",
    items: [
      { id: "general", label: "General", icon: <SettingsIcon /> },
      { id: "members", label: "Members & roles", icon: <UsersIcon /> },
      { id: "billing", label: "Billing", icon: <CreditCardIcon /> },
    ],
  },
  {
    label: "Developer",
    items: [{ id: "developer", label: "API keys & webhooks", icon: <KeyRoundIcon /> }],
  },
];

const defaultAreas: TeamPermissionArea[] = [
  {
    id: "projects",
    name: "Projects",
    permissions: [
      { id: "projects.view", label: "View projects" },
      { id: "projects.edit", label: "Create and edit projects" },
      { id: "projects.delete", label: "Delete projects" },
      { id: "projects.access", label: "Manage project access" },
    ],
  },
  {
    id: "billing",
    name: "Billing",
    permissions: [
      { id: "billing.view", label: "View invoices and usage" },
      { id: "billing.manage", label: "Change plan and payment" },
    ],
  },
  {
    id: "members",
    name: "Members",
    permissions: [
      { id: "members.invite", label: "Invite people" },
      { id: "members.roles", label: "Change roles" },
      { id: "members.remove", label: "Remove people" },
    ],
  },
  {
    id: "settings",
    name: "Settings",
    permissions: [
      { id: "settings.edit", label: "Edit workspace settings" },
      { id: "settings.keys", label: "Manage API keys" },
      { id: "settings.audit", label: "Export the audit log" },
    ],
  },
];

const allPermissionIds = defaultAreas.flatMap((a) => a.permissions.map((p) => p.id));

const defaultRoles: TeamRole[] = [
  { id: "viewer", name: "Viewer", description: "Can look around, can’t change anything", grants: ["projects.view", "billing.view"] },
  {
    id: "member",
    name: "Member",
    description: "Creates and ships projects",
    grants: ["projects.view", "projects.edit", "members.invite", "settings.keys"],
  },
  {
    id: "admin",
    name: "Admin",
    description: "Everything except the plan and payment",
    grants: allPermissionIds.filter((id) => id !== "billing.manage"),
  },
  { id: "owner", name: "Owner", description: "Full control of the workspace", locked: true, grants: allPermissionIds },
];

const defaultMembers: TeamMember[] = [
  { id: "m1", name: "Ada Lindqvist", email: "ada@ridgeline.app", roleId: "owner", hue: "violet", lastActive: "Now" },
  { id: "m2", name: "Theo Marsh", email: "theo@ridgeline.app", roleId: "admin", hue: "sky", lastActive: "12 min ago" },
  { id: "m3", name: "Priya Raman", email: "priya@ridgeline.app", roleId: "admin", hue: "teal", lastActive: "2 hours ago" },
  { id: "m4", name: "Jonah Feld", email: "jonah@ridgeline.app", roleId: "member", hue: "amber", lastActive: "Yesterday" },
  { id: "m5", name: "Inès Duarte", email: "ines@ridgeline.app", roleId: "member", hue: "rose", lastActive: "3 hours ago" },
  { id: "m6", name: "Kofi Mensah", email: "kofi@ridgeline.app", roleId: "member", hue: "emerald", lastActive: "4 days ago" },
  { id: "m7", name: "Sara Whitlock", email: "sara@ridgeline.app", roleId: "viewer", hue: "orange", lastActive: "Last week" },
  { id: "m8", name: "Ren Takahashi", email: "ren@pinefold.co", roleId: "viewer", hue: "indigo", lastActive: "2 weeks ago" },
];

const defaultInvites: TeamInvite[] = [
  { id: "i1", email: "lucas@ridgeline.app", roleId: "member", invitedBy: "Theo", sent: "2 days ago" },
  { id: "i2", email: "nadia@ordinal.studio", roleId: "viewer", invitedBy: "Ada", sent: "6 days ago" },
];

function useReducedMotionAfterMount() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && Boolean(prefers);
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

function sameGrants(a: string[], b: string[]) {
  return a.length === b.length && a.every((g) => b.includes(g));
}

function RidgelineShell({
  active,
  onNavigate,
  children,
  className,
}: {
  active: SettingsSectionId;
  onNavigate?: (section: SettingsSectionId) => void;
  children: ReactNode;
  className?: string;
}) {
  const pillsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scroller = pillsRef.current;
    const el = scroller?.querySelector<HTMLElement>(`[data-section="${active}"]`);
    if (!scroller || !el || scroller.scrollWidth <= scroller.clientWidth) return;
    scroller.scrollLeft = el.offsetLeft - 16;
  }, [active]);

  return (
    <div className={cn("flex h-[760px] w-full bg-background text-foreground", className)}>
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-muted/30 px-3 py-4 md:flex">
        <button
          className="flex h-8 cursor-pointer items-center gap-2 rounded-md px-2 text-muted-foreground text-sm outline-none transition-colors hover:bg-accent/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          type="button"
        >
          <ArrowLeftIcon className="size-4" />
          Back to Ridgeline
        </button>
        <nav aria-label="Settings" className="flex flex-col">
          {navGroups.map((group) => (
            <div className="flex flex-col" key={group.label}>
              <span className="px-2 pt-5 pb-1.5 font-medium text-muted-foreground text-xs">{group.label}</span>
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const current = item.id === active;
                  return (
                    <button
                      aria-current={current ? "page" : undefined}
                      className={cn(
                        "flex h-8 cursor-pointer items-center gap-2 rounded-md px-2 text-left text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground",
                        current ? "bg-accent font-medium text-foreground" : "text-foreground/80 hover:bg-accent/60",
                      )}
                      key={item.id}
                      onClick={() => onNavigate?.(item.id)}
                      type="button"
                    >
                      {item.icon}
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="mt-auto flex items-center gap-2.5 px-2 pt-4">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-foreground font-medium text-[11px] text-background">
            AL
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-medium text-sm">Ada Lindqvist</span>
            <span className="truncate text-muted-foreground text-xs">ada@ridgeline.app</span>
          </span>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="md:hidden">
          <div className="flex h-12 items-center gap-2 border-b px-4">
            <button
              aria-label="Back to Ridgeline"
              className="-ms-1.5 flex size-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring"
              type="button"
            >
              <ArrowLeftIcon className="size-4" />
            </button>
            <span className="font-medium text-sm">Settings</span>
          </div>
          <nav
            aria-label="Settings"
            className="overflow-x-auto border-b px-4 py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            ref={pillsRef}
          >
            <div className="flex w-max gap-1.5">
              {navGroups.flatMap((g) => g.items).map((item) => {
                const current = item.id === active;
                return (
                  <button
                    aria-current={current ? "page" : undefined}
                    className={cn(
                      "flex h-7 cursor-pointer items-center rounded-full px-3 text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                      current
                        ? "bg-foreground font-medium text-background"
                        : "bg-muted text-muted-foreground hover:text-foreground",
                    )}
                    data-section={item.id}
                    key={item.id}
                    onClick={() => onNavigate?.(item.id)}
                    type="button"
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </nav>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function PersonAvatar({ name, hue }: { name: string; hue: TeamHue }) {
  return (
    <Avatar className="size-8">
      <AvatarFallback className={cn("bg-gradient-to-br font-medium text-white text-xs", avatarHues[hue])}>{initials(name)}</AvatarFallback>
    </Avatar>
  );
}

function RoleSelect({
  roles,
  value,
  onChange,
  label,
  className,
}: {
  roles: TeamRole[];
  value: string;
  onChange: (id: string) => void;
  label: string;
  className?: string;
}) {
  const options = roles.filter((r) => !r.locked);
  const items = options.map((r) => ({ value: r.id, label: r.name }));
  return (
    <Select items={items} onValueChange={(v) => v && onChange(v as string)} value={value}>
      <SelectTrigger aria-label={label} className={cn("w-32 min-w-0", className)} size="sm">
        <SelectValue />
      </SelectTrigger>
      <SelectPopup alignItemWithTrigger={false} className="w-64">
        {options.map((r) => (
          <SelectItem className="items-start py-1.5 [&>span:first-child]:mt-0.5" key={r.id} value={r.id}>
            <span className="flex flex-col">
              <span className="font-medium">{r.name}</span>
              <span className="text-muted-foreground text-xs">{r.description}</span>
            </span>
          </SelectItem>
        ))}
      </SelectPopup>
    </Select>
  );
}

function CheckCell({
  checked,
  locked,
  changed,
  label,
  reduce,
  onToggle,
}: {
  checked: boolean;
  locked?: boolean;
  changed?: boolean;
  label: string;
  reduce: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      aria-checked={checked}
      aria-label={label}
      className="group/cell flex size-9 items-center justify-center rounded-md outline-none disabled:cursor-not-allowed"
      disabled={locked}
      onClick={onToggle}
      role="checkbox"
      type="button"
    >
      <span
        className={cn(
          "relative flex size-[18px] items-center justify-center rounded-[calc(var(--radius)*0.5)] border transition-[background-color,border-color,scale] duration-150 ease-out group-focus-visible/cell:ring-2 group-focus-visible/cell:ring-ring group-focus-visible/cell:ring-offset-1 group-focus-visible/cell:ring-offset-card group-active/cell:scale-90",
          checked ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background group-hover/cell:border-foreground/40 dark:bg-input/32",
          locked && "opacity-40",
        )}
      >
        <svg aria-hidden className="size-3" fill="none" viewBox="0 0 24 24">
          <motion.path
            animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
            d="M5 12.5 10 17.5 19 7"
            initial={false}
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={3.5}
            transition={reduce ? { duration: 0 } : { duration: 0.18, ease: easeOut }}
          />
        </svg>
        {changed && <span className="absolute -top-1 -right-1 size-1.5 rounded-full bg-warning ring-2 ring-card" />}
      </span>
    </button>
  );
}

function RollingCount({ value, reduce }: { value: number; reduce: boolean }) {
  return (
    <span className="relative inline-flex overflow-hidden tabular-nums">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          animate={{ y: 0, opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { y: -8, opacity: 0 }}
          initial={reduce ? { opacity: 0 } : { y: 8, opacity: 0 }}
          key={value}
          transition={{ duration: 0.18, ease: easeOut }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function PermissionMatrix({
  areas,
  roles,
  draft,
  saved,
  counts,
  reduce,
  onToggle,
  onRename,
  onRemove,
}: {
  areas: TeamPermissionArea[];
  roles: TeamRole[];
  draft: Record<string, string[]>;
  saved: Record<string, string[]>;
  counts: Record<string, number>;
  reduce: boolean;
  onToggle: (roleId: string, permissionId: string) => void;
  onRename: (roleId: string, name: string) => void;
  onRemove: (roleId: string) => void;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const gridStyle = { "--cols": roles.length } as CSSProperties;
  const grid = "grid grid-cols-[minmax(7.5rem,1fr)_repeat(var(--cols),3.5rem)] sm:grid-cols-[minmax(11rem,1fr)_repeat(var(--cols),4.75rem)]";
  const colBg = (id: string) => (hover === id ? "bg-accent/50" : "");

  return (
    <div className="mt-3 overflow-hidden rounded-xl border bg-card">
      <div className="overflow-x-auto [scrollbar-width:thin]" onMouseLeave={() => setHover(null)}>
        <div className="min-w-fit" role="table">
          <div className={cn(grid, "border-b")} role="row" style={gridStyle}>
            <div className="sticky left-0 z-10 flex items-end bg-card px-4 pb-2.5 font-medium text-muted-foreground text-xs" role="columnheader">
              Permission
            </div>
            {roles.map((r) => {
              const changed = !sameGrants(draft[r.id] ?? [], saved[r.id] ?? []);
              const count = counts[r.id] ?? 0;
              return (
                <motion.div
                  animate={{ opacity: 1 }}
                  className={cn("flex flex-col items-center justify-end gap-0.5 px-1 pt-3 pb-2.5 text-center transition-colors duration-150", colBg(r.id))}
                  initial={false}
                  key={r.id}
                  onMouseEnter={() => setHover(r.id)}
                  role="columnheader"
                >
                  {r.from ? (
                    <input
                      aria-label="Custom role name"
                      className="w-full min-w-0 rounded-sm bg-transparent text-center font-medium text-xs underline decoration-dotted decoration-muted-foreground/60 underline-offset-4 outline-none focus-visible:no-underline focus-visible:ring-2 focus-visible:ring-ring"
                      onBlur={(e) => !e.target.value.trim() && onRename(r.id, "Custom")}
                      onChange={(e) => onRename(r.id, e.target.value)}
                      value={r.name}
                    />
                  ) : (
                    <span className="flex items-center gap-1 font-medium text-xs">
                      {r.locked && <LockIcon aria-label="Locked" className="size-3 text-muted-foreground" />}
                      {r.name}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    {changed && <span aria-label="Unsaved changes" className="size-1.5 rounded-full bg-warning" role="img" />}
                    <RollingCount reduce={reduce} value={count} /> {count === 1 ? "person" : "people"}
                  </span>
                </motion.div>
              );
            })}
          </div>
          {areas.map((area) => (
            <Fragment key={area.id}>
              <div className={cn(grid, "border-b")} role="row" style={gridStyle}>
                <div className="sticky left-0 z-10 bg-card px-4 pt-3.5 pb-1 font-medium text-muted-foreground text-xs" role="rowheader">
                  {area.name}
                </div>
                {roles.map((r) => (
                  <div className={cn("transition-colors duration-150", colBg(r.id))} key={r.id} onMouseEnter={() => setHover(r.id)} role="cell" />
                ))}
              </div>
              {area.permissions.map((p) => (
                <div className={cn(grid, "border-b last:border-b-0")} key={p.id} role="row" style={gridStyle}>
                  <div className="sticky left-0 z-10 flex items-center bg-card py-1.5 ps-4 pe-2 text-sm leading-snug" role="rowheader">
                    {p.label}
                  </div>
                  {roles.map((r) => {
                    const on = (draft[r.id] ?? []).includes(p.id);
                    const diverges = r.from ? on !== (draft[r.from] ?? []).includes(p.id) : false;
                    return (
                      <div
                        className={cn("flex items-center justify-center transition-colors duration-150", colBg(r.id))}
                        key={r.id}
                        onMouseEnter={() => setHover(r.id)}
                        role="cell"
                      >
                        <CheckCell
                          changed={diverges}
                          checked={on}
                          label={`${r.name}: ${p.label}`}
                          locked={r.locked}
                          onToggle={() => onToggle(r.id, p.id)}
                          reduce={reduce}
                        />
                      </div>
                    );
                  })}
                </div>
              ))}
            </Fragment>
          ))}
          {roles.some((r) => r.from) && (
            <div className={cn(grid, "border-t")} role="row" style={gridStyle}>
              <div className="sticky left-0 z-10 bg-card" role="cell" />
              {roles.map((r) => (
                <div className={cn("flex justify-center py-1.5 transition-colors duration-150", colBg(r.id))} key={r.id} onMouseEnter={() => setHover(r.id)} role="cell">
                  {r.from && (
                    <Button aria-label={`Remove ${r.name} role`} className={press} onClick={() => onRemove(r.id)} size="icon-xs" variant="ghost">
                      <XIcon />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function TeamRoles({
  className,
  areas = defaultAreas,
  roles: initialRoles = defaultRoles,
  members: initialMembers = defaultMembers,
  invites: initialInvites = defaultInvites,
  currentUserId = "m1",
  onNavigate,
}: TeamRolesProps) {
  const reduce = useReducedMotionAfterMount();
  const id = useId();
  const [roles, setRoles] = useState(initialRoles);
  const [saved, setSaved] = useState<Record<string, string[]>>(() => Object.fromEntries(initialRoles.map((r) => [r.id, r.grants])));
  const [draft, setDraft] = useState<Record<string, string[]>>(saved);
  const [members, setMembers] = useState(initialMembers);
  const [invites, setInvites] = useState(initialInvites);
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [resent, setResent] = useState<string[]>([]);
  const [removing, setRemoving] = useState<TeamMember | null>(null);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [notice, setNotice] = useState<{ key: number; text: ReactNode; undo?: () => void } | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const counter = useRef(0);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  useEffect(() => () => {
    if (savedTimer.current) clearTimeout(savedTimer.current);
  }, []);

  const say = (text: ReactNode, undo?: () => void) => {
    counter.current += 1;
    setNotice({ key: counter.current, text, undo });
  };

  const counts = Object.fromEntries(roles.map((r) => [r.id, members.filter((m) => m.roleId === r.id).length]));
  const changedRoles = roles.filter((r) => !sameGrants(draft[r.id] ?? [], saved[r.id] ?? []));
  const affected = changedRoles.reduce((n, r) => n + (counts[r.id] ?? 0), 0);
  const customRole = roles.find((r) => r.from);

  const sendInvite = (e: FormEvent) => {
    e.preventDefault();
    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setInviteError("Enter a full email address, like name@company.com.");
      return;
    }
    if (invites.some((i) => i.email === value) || members.some((m) => m.email === value)) {
      setInviteError("That person is already here or invited.");
      return;
    }
    counter.current += 1;
    setInvites((all) => [{ id: `new-${counter.current}`, email: value, roleId: inviteRole, invitedBy: "Ada", sent: "just now" }, ...all]);
    setEmail("");
    say(
      <>
        Invite sent to <span className="font-medium">{value}</span>
      </>,
    );
  };

  const toggle = (roleId: string, permissionId: string) =>
    setDraft((d) => {
      const current = d[roleId] ?? [];
      return { ...d, [roleId]: current.includes(permissionId) ? current.filter((p) => p !== permissionId) : [...current, permissionId] };
    });

  const addCustom = () => {
    counter.current += 1;
    const rid = `custom-${counter.current}`;
    const grants = [...(draft.member ?? [])];
    setRoles((all) => {
      const ownerIndex = all.findIndex((r) => r.locked);
      const next = [...all];
      next.splice(ownerIndex < 0 ? all.length : ownerIndex, 0, {
        id: rid,
        name: "Contractor",
        description: "Custom, based on Member",
        from: "member",
        grants,
      });
      return next;
    });
    setSaved((s) => ({ ...s, [rid]: grants }));
    setDraft((d) => ({ ...d, [rid]: grants }));
  };

  const removeCustom = (rid: string) => {
    const role = roles.find((r) => r.id === rid);
    const fallback = role?.from ?? "viewer";
    const before = { roles, members, invites, saved, draft };
    setRoles((all) => all.filter((r) => r.id !== rid));
    setMembers((all) => all.map((m) => (m.roleId === rid ? { ...m, roleId: fallback } : m)));
    setInvites((all) => all.map((i) => (i.roleId === rid ? { ...i, roleId: fallback } : i)));
    setSaved(({ [rid]: _, ...rest }) => rest);
    setDraft(({ [rid]: _, ...rest }) => rest);
    say(
      <>
        <span className="font-medium">{role?.name}</span> role removed
      </>,
      () => {
        setRoles(before.roles);
        setMembers(before.members);
        setInvites(before.invites);
        setSaved(before.saved);
        setDraft(before.draft);
      },
    );
  };

  const save = () => {
    setSaved(draft);
    setRoles((all) => all.map((r) => ({ ...r, grants: draft[r.id] ?? r.grants })));
    setJustSaved(true);
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setJustSaved(false), 1600);
  };

  const fade = reduce ? { duration: 0 } : { duration: 0.22, ease: easeOut };
  const bar = changedRoles.length > 0 ? "dirty" : justSaved ? "saved" : null;
  const roleName = (rid: string) => roles.find((r) => r.id === rid)?.name ?? "Viewer";

  return (
    <RidgelineShell active="members" className={className} onNavigate={onNavigate}>
          <div className="mx-auto w-full max-w-2xl px-6 py-10 md:px-10">
            <h1 className="font-semibold text-2xl tracking-tight">Members & roles</h1>
            <p className="mt-1 text-muted-foreground text-sm">Invite people to Ridgeline and decide what each role can do.</p>

            <section className="mt-10">
              <h2 className="font-medium text-sm">Invite people</h2>
              <p className="text-muted-foreground text-sm">They’ll get an email with a link that works for 7 days.</p>
              <form className="mt-3 flex flex-col gap-2 rounded-xl border bg-card p-3 sm:flex-row sm:items-start" onSubmit={sendInvite}>
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <Input
                    aria-describedby={inviteError ? `${id}-invite-error` : undefined}
                    aria-invalid={inviteError ? true : undefined}
                    aria-label="Email address"
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setInviteError(null);
                    }}
                    placeholder="name@company.com"
                    type="email"
                    value={email}
                  />
                  {inviteError && (
                    <p className="px-0.5 text-destructive-foreground text-xs" id={`${id}-invite-error`}>
                      {inviteError}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <RoleSelect className="flex-1 sm:w-32 sm:flex-none" label="Role for new invite" onChange={setInviteRole} roles={roles} value={inviteRole} />
                  <Button className={press} disabled={!email.trim()} type="submit">
                    Invite
                  </Button>
                </div>
              </form>
            </section>

            <section className="mt-10">
              <h2 className="font-medium text-sm">Members</h2>
              <p className="text-muted-foreground text-sm">{plural(members.length, "person", "people")} in Ridgeline.</p>
              <div className="mt-3 overflow-hidden rounded-xl border bg-card">
                <div className="hidden grid-cols-[minmax(0,1fr)_8rem_6.5rem_2rem] items-center gap-4 border-b px-4 py-2.5 font-medium text-muted-foreground text-xs sm:grid">
                  <span>Name</span>
                  <span>Role</span>
                  <span>Last active</span>
                  <span className="sr-only">Actions</span>
                </div>
                <ul>
                  <AnimatePresence initial={false}>
                    {members.map((m) => {
                      const role = roles.find((r) => r.id === m.roleId);
                      const you = m.id === currentUserId;
                      return (
                        <motion.li
                          animate={{ opacity: 1, height: "auto" }}
                          className="overflow-hidden border-b last:border-b-0"
                          exit={{ opacity: 0, height: 0 }}
                          initial={{ opacity: 0, height: 0 }}
                          key={m.id}
                          transition={fade}
                        >
                          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_8rem_6.5rem_2rem]">
                            <div className="flex min-w-0 items-center gap-3">
                              <PersonAvatar hue={m.hue} name={m.name} />
                              <div className="min-w-0">
                                <p className="truncate font-medium text-sm">
                                  {m.name}
                                  {you && <span className="font-normal text-muted-foreground"> (you)</span>}
                                </p>
                                <p className="truncate text-muted-foreground text-xs">{m.email}</p>
                              </div>
                            </div>
                            <div className="col-start-1 row-start-2 flex items-center gap-3 ps-11 sm:col-start-auto sm:row-start-auto sm:ps-0">
                              {role?.locked ? (
                                <span className="flex h-8 items-center gap-1.5 px-0.5 text-sm sm:h-7">
                                  {role.name}
                                  <LockIcon className="size-3 text-muted-foreground" />
                                </span>
                              ) : (
                                <RoleSelect
                                  className="w-32"
                                  label={`Role for ${m.name}`}
                                  onChange={(rid) => setMembers((all) => all.map((x) => (x.id === m.id ? { ...x, roleId: rid } : x)))}
                                  roles={roles}
                                  value={m.roleId}
                                />
                              )}
                              <span className="text-muted-foreground text-xs sm:hidden">{m.lastActive}</span>
                            </div>
                            <span className="hidden text-muted-foreground text-sm sm:block">
                              {m.lastActive === "Now" ? (
                                <span className="inline-flex items-center gap-1.5">
                                  <span className="size-1.5 rounded-full bg-success" />
                                  Now
                                </span>
                              ) : (
                                m.lastActive
                              )}
                            </span>
                            <Menu>
                              <MenuTrigger
                                render={
                                  <Button
                                    aria-label={`Actions for ${m.name}`}
                                    className={cn("col-start-2 row-start-1 justify-self-end sm:col-start-auto sm:row-start-auto", press)}
                                    size="icon-sm"
                                    variant="ghost"
                                  />
                                }
                              >
                                <EllipsisIcon />
                              </MenuTrigger>
                              <MenuPopup align="end" className="w-52">
                                <MenuItem onClick={() => navigator.clipboard?.writeText(m.email).catch(() => {})}>
                                  <CopyIcon />
                                  Copy email
                                </MenuItem>
                                <MenuSeparator />
                                <MenuItem
                                  disabled={role?.locked || you}
                                  onClick={() => {
                                    setRemoving(m);
                                    setRemoveOpen(true);
                                  }}
                                  variant="destructive"
                                >
                                  <UserMinusIcon />
                                  {role?.locked ? "Owner can’t be removed" : "Remove from workspace"}
                                </MenuItem>
                              </MenuPopup>
                            </Menu>
                          </div>
                        </motion.li>
                      );
                    })}
                  </AnimatePresence>
                </ul>
              </div>

              <h3 className="mt-6 flex items-center gap-1.5 font-medium text-muted-foreground text-xs">
                Pending invites
                <span className="tabular-nums">{invites.length}</span>
              </h3>
              <div className="mt-2 overflow-hidden rounded-xl border bg-card">
                <ul>
                  <AnimatePresence initial={false}>
                    {invites.map((inv) => {
                      const wasResent = resent.includes(inv.id);
                      return (
                        <motion.li
                          animate={{ opacity: 1, height: "auto" }}
                          className="overflow-hidden border-b last:border-b-0"
                          exit={{ opacity: 0, height: 0 }}
                          initial={{ opacity: 0, height: 0 }}
                          key={inv.id}
                          transition={fade}
                        >
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                            <div className="flex min-w-0 flex-1 basis-56 items-center gap-3">
                              <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-dashed text-muted-foreground">
                                <MailIcon className="size-3.5" />
                              </span>
                              <div className="min-w-0">
                                <p className="truncate font-medium text-sm">{inv.email}</p>
                                <p className="truncate text-muted-foreground text-xs">
                                  {roleName(inv.roleId)} · {wasResent ? "resent just now" : `invited by ${inv.invitedBy} ${inv.sent}`}
                                </p>
                              </div>
                            </div>
                            <div className="ms-11 flex items-center gap-1.5 sm:ms-auto">
                              <Button
                                className={cn("min-w-[5.5rem]", press)}
                                disabled={wasResent}
                                onClick={() => setResent((r) => [...r, inv.id])}
                                size="sm"
                                variant="outline"
                              >
                                <AnimatePresence initial={false} mode="popLayout">
                                  <motion.span
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="flex items-center gap-1.5"
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    key={wasResent ? "done" : "idle"}
                                    transition={{ duration: 0.15, ease: easeOut }}
                                  >
                                    {wasResent && <CheckIcon className="size-3.5" />}
                                    {wasResent ? "Resent" : "Resend"}
                                  </motion.span>
                                </AnimatePresence>
                              </Button>
                              <Button
                                className={press}
                                onClick={() => {
                                  const before = invites;
                                  setInvites((all) => all.filter((x) => x.id !== inv.id));
                                  say(
                                    <>
                                      Invite for <span className="font-medium">{inv.email}</span> revoked
                                    </>,
                                    () => setInvites(before),
                                  );
                                }}
                                size="sm"
                                variant="ghost"
                              >
                                Revoke
                              </Button>
                            </div>
                          </div>
                        </motion.li>
                      );
                    })}
                  </AnimatePresence>
                </ul>
                {invites.length === 0 && <p className="px-4 py-6 text-center text-muted-foreground text-sm">No invites waiting.</p>}
              </div>
            </section>

            <section className="mt-10">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
                <div className="min-w-0">
                  <h2 className="font-medium text-sm">Roles</h2>
                  <p className="text-pretty text-muted-foreground text-sm">What each role can do. Owners can always do everything.</p>
                </div>
                <Button className={cn("shrink-0 self-start sm:self-auto", press)} disabled={Boolean(customRole)} onClick={addCustom} size="sm" variant="outline">
                  <CopyIcon />
                  Duplicate Member
                </Button>
              </div>
              <PermissionMatrix
                areas={areas}
                counts={counts}
                draft={draft}
                onRemove={removeCustom}
                onRename={(rid, name) => setRoles((all) => all.map((r) => (r.id === rid ? { ...r, name } : r)))}
                onToggle={toggle}
                reduce={reduce}
                roles={roles}
                saved={saved}
              />
              <p className="mt-2 text-pretty text-muted-foreground text-xs">
                {customRole ? (
                  <>
                    <span className="me-1 inline-block size-1.5 -translate-y-px rounded-full bg-warning align-middle" />
                    marks where {customRole.name} differs from Member. Click its name to rename it.
                  </>
                ) : (
                  "Need something in between? Duplicate Member and adjust it."
                )}
              </p>
            </section>

            <div className="sticky bottom-4 z-20 mt-6 flex justify-center">
              <AnimatePresence initial={false} mode="popLayout">
                {bar ? (
                  <motion.div
                    animate={{ opacity: 1, y: 0 }}
                    className="flex w-full items-center gap-3 rounded-xl border bg-popover py-2 ps-4 pe-2 shadow-lg/5"
                    exit={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
                    initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
                    role="status"
                    transition={reduce ? { duration: 0 } : spring}
                  >
                    {bar === "dirty" ? (
                      <>
                        <p className="min-w-0 flex-1 truncate text-sm">
                          <span className="sm:hidden">Unsaved changes</span>
                          <span className="hidden sm:inline">You have unsaved changes</span>
                          <span className="hidden text-muted-foreground sm:inline">
                            {" "}
                            · {affected === 0 ? "no one has these roles yet" : `affects ${plural(affected, "person", "people")}`}
                          </span>
                        </p>
                        <Button className={press} onClick={() => setDraft(saved)} size="sm" variant="ghost">
                          Discard
                        </Button>
                        <Button className={press} onClick={save} size="sm">
                          Save
                        </Button>
                      </>
                    ) : (
                      <p className="flex h-8 items-center gap-2 text-sm sm:h-7">
                        <CheckIcon className="size-4 text-success-foreground" />
                        Roles saved
                      </p>
                    )}
                  </motion.div>
                ) : notice ? (
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className="flex max-w-full items-center gap-3 rounded-xl border bg-popover py-1.5 ps-3.5 pe-1.5 text-sm shadow-lg/5"
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
                key={notice.key}
                role="status"
                transition={{ duration: 0.2, ease: easeOut }}
              >
                <p className="min-w-0 truncate">{notice.text}</p>
                {notice.undo ? (
                  <Button
                    className={press}
                    onClick={() => {
                      notice.undo?.();
                      setNotice(null);
                    }}
                    size="sm"
                    variant="ghost"
                  >
                    <RotateCcwIcon />
                    Undo
                  </Button>
                ) : (
                  <CheckIcon className="me-2 size-4 shrink-0 text-success-foreground" />
                )}
              </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </div>

      <AlertDialog onOpenChange={setRemoveOpen} open={removeOpen}>
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {removing?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              They lose access to Ridgeline straight away. Projects they created stay where they are.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="ghost" />}>Cancel</AlertDialogClose>
            <AlertDialogClose
              render={
                <Button
                  onClick={() => {
                    if (!removing) return;
                    const target = removing;
                    setMembers((all) => all.filter((x) => x.id !== target.id));
                    say(
                      <>
                        <span className="font-medium">{target.name}</span> removed
                      </>,
                    );
                  }}
                  variant="destructive"
                />
              }
            >
              Remove
            </AlertDialogClose>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </RidgelineShell>
  );
}
