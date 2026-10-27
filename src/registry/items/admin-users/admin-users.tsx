"use client";

import {
  ArrowDownIcon,
  ArrowUpIcon,
  BuildingIcon,
  CheckIcon,
  ChevronDownIcon,
  CreditCardIcon,
  EllipsisIcon,
  FilterIcon,
  KeyRoundIcon,
  LaptopIcon,
  LogInIcon,
  MailIcon,
  MenuIcon,
  ScrollTextIcon,
  SearchIcon,
  SendIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  ShieldIcon,
  SmartphoneIcon,
  UserCogIcon,
  UserMinusIcon,
  UserPlusIcon,
  UserRoundCheckIcon,
  UserRoundXIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type MouseEvent, type ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import {
  Menu,
  MenuCheckboxItem,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuPopup,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuTrigger,
} from "@/components/ui/menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function useReducedMotionAfterMount() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && Boolean(prefers);
}

export type AdminRole = "owner" | "admin" | "member" | "viewer" | "billing";
export type AdminStatus = "active" | "invited" | "suspended";

export interface AdminActivity {
  kind: "signin" | "role" | "key" | "join" | "invite" | "suspend" | "2fa";
  text: string;
  when: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  status: AdminStatus;
  twoFactor: boolean;
  teams: string[];
  minutesSinceActive: number | null;
  joined: string;
  location?: string;
  activity?: AdminActivity[];
}

export interface AdminUsersProps {
  className?: string;
  orgName?: string;
  seats?: number;
  users?: AdminUser[];
  currentUserId?: string;
}

const spring = { type: "spring", stiffness: 520, damping: 46, mass: 1 } as const;
const easeOut = [0.23, 1, 0.32, 1] as const;
const press = "transition-[color,background-color,box-shadow,scale] duration-150 ease-out active:scale-[0.97]";
const ring = "outline-none focus-visible:ring-2 focus-visible:ring-ring";
const hit = "relative after:absolute after:-inset-3 after:content-['']";
const menuPop =
  "transition-[opacity,scale] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0 data-ending-style:duration-100";
const barSurface =
  "rounded-full bg-primary text-primary-foreground shadow-lg/15 dark:border dark:bg-popover dark:text-popover-foreground dark:shadow-lg/40";
const barButton = cn(
  "flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 outline-none hover:bg-primary-foreground/12 focus-visible:ring-2 focus-visible:ring-primary-foreground/40 data-popup-open:bg-primary-foreground/12 dark:data-popup-open:bg-accent dark:focus-visible:ring-ring dark:hover:bg-accent",
  press,
);

export const adminRoles: { value: AdminRole; label: string; description: string; pill: string }[] = [
  { value: "owner", label: "Owner", description: "Full control, including billing and deleting the org.", pill: "bg-violet-500/10 text-violet-700 dark:bg-violet-400/16 dark:text-violet-300" },
  { value: "admin", label: "Admin", description: "Manage members, settings and integrations.", pill: "bg-sky-500/10 text-sky-700 dark:bg-sky-400/16 dark:text-sky-300" },
  { value: "member", label: "Member", description: "Create and edit projects they're added to.", pill: "bg-muted text-foreground/80" },
  { value: "viewer", label: "Viewer", description: "Read-only access. Free, doesn't use a seat.", pill: "bg-transparent text-muted-foreground ring-1 ring-border ring-inset" },
  { value: "billing", label: "Billing", description: "Invoices and payment methods only.", pill: "bg-amber-500/12 text-amber-800 dark:bg-amber-400/16 dark:text-amber-300" },
];

const statusMeta: Record<AdminStatus, { label: string; dot: string; text: string }> = {
  active: { label: "Active", dot: "bg-success", text: "text-foreground" },
  invited: { label: "Invited", dot: "bg-info", text: "text-info-foreground" },
  suspended: { label: "Suspended", dot: "bg-destructive", text: "text-destructive-foreground" },
};

const avatarTones = [
  "bg-orange-500/16 text-orange-800 dark:bg-orange-400/18 dark:text-orange-200",
  "bg-teal-500/16 text-teal-800 dark:bg-teal-400/18 dark:text-teal-200",
  "bg-violet-500/16 text-violet-800 dark:bg-violet-400/18 dark:text-violet-200",
  "bg-sky-500/16 text-sky-800 dark:bg-sky-400/18 dark:text-sky-200",
  "bg-rose-500/16 text-rose-800 dark:bg-rose-400/18 dark:text-rose-200",
  "bg-amber-500/20 text-amber-900 dark:bg-amber-400/18 dark:text-amber-200",
  "bg-emerald-500/16 text-emerald-800 dark:bg-emerald-400/18 dark:text-emerald-200",
];

const defaultUsers: AdminUser[] = [
  {
    id: "u1",
    name: "Maya Lindgren",
    email: "maya@larkfield.studio",
    role: "owner",
    status: "active",
    twoFactor: true,
    teams: ["Leadership", "Design"],
    minutesSinceActive: 3,
    joined: "Mar 2, 2024",
    location: "Stockholm, SE",
  },
  {
    id: "u2",
    name: "Owen Adeyemi",
    email: "owen@larkfield.studio",
    role: "admin",
    status: "active",
    twoFactor: true,
    teams: ["Engineering", "Platform"],
    minutesSinceActive: 42,
    joined: "Mar 9, 2024",
    location: "Lagos, NG",
    activity: [
      { kind: "signin", text: "Signed in from Lagos, NG on Chrome", when: "42 min ago" },
      { kind: "key", text: "Created API key “CI deploy”", when: "Oct 21" },
      { kind: "role", text: "Role changed from Member to Admin by Maya Lindgren", when: "Oct 2" },
      { kind: "2fa", text: "Turned on two-factor authentication", when: "Mar 10, 2024" },
      { kind: "join", text: "Joined from an invite by Maya Lindgren", when: "Mar 9, 2024" },
    ],
  },
  { id: "u3", name: "Priya Natarajan", email: "priya@larkfield.studio", role: "admin", status: "active", twoFactor: true, teams: ["Design"], minutesSinceActive: 180, joined: "Apr 14, 2024", location: "Bengaluru, IN" },
  { id: "u4", name: "Jonas Weber", email: "jonas@larkfield.studio", role: "member", status: "active", twoFactor: false, teams: ["Engineering"], minutesSinceActive: 1440, joined: "May 3, 2024", location: "Berlin, DE" },
  { id: "u5", name: "Camila Reyes", email: "camila@larkfield.studio", role: "member", status: "active", twoFactor: true, teams: ["Marketing", "Content", "Events"], minutesSinceActive: 300, joined: "Jun 20, 2024", location: "Mexico City, MX" },
  { id: "u6", name: "Theo Laurent", email: "theo@larkfield.studio", role: "billing", status: "active", twoFactor: true, teams: ["Finance"], minutesSinceActive: 4320, joined: "Jul 1, 2024", location: "Lyon, FR" },
  { id: "u7", name: "Hana Sato", email: "hana@larkfield.studio", role: "member", status: "active", twoFactor: true, teams: ["Engineering", "Platform"], minutesSinceActive: 15, joined: "Aug 12, 2024", location: "Osaka, JP" },
  { id: "u8", name: "Dev Malhotra", email: "dev@larkfield.studio", role: "member", status: "suspended", twoFactor: false, teams: ["Engineering"], minutesSinceActive: 64800, joined: "Sep 5, 2024", location: "Toronto, CA" },
  { id: "u9", name: "Rosa Ferreira", email: "rosa.ferreira@gmail.com", role: "viewer", status: "active", twoFactor: false, teams: ["Clients"], minutesSinceActive: 10080, joined: "Jan 18, 2025", location: "Porto, PT" },
  { id: "u10", name: "Sam Okoro", email: "sam@larkfield.studio", role: "member", status: "invited", twoFactor: false, teams: ["Design"], minutesSinceActive: null, joined: "Invited Oct 22" },
  { id: "u11", name: "", email: "lena@northpine.co", role: "viewer", status: "invited", twoFactor: false, teams: [], minutesSinceActive: null, joined: "Invited Oct 15" },
  { id: "u12", name: "Felix Brandt", email: "felix@larkfield.studio", role: "member", status: "active", twoFactor: true, teams: ["Support"], minutesSinceActive: 95, joined: "Feb 7, 2025", location: "Hamburg, DE" },
  { id: "u13", name: "Ama Mensah", email: "ama@larkfield.studio", role: "member", status: "active", twoFactor: false, teams: ["Content"], minutesSinceActive: 2880, joined: "Apr 30, 2025", location: "Accra, GH" },
];

function initials(u: AdminUser) {
  const src = u.name || u.email;
  return src
    .replace(/@.*/, "")
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function hashIndex(s: string, n: number) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % n;
}

function ago(m: number | null) {
  if (m === null) return "Never";
  if (m < 5) return "Just now";
  if (m < 60) return `${m} min ago`;
  if (m < 1440) return `${Math.floor(m / 60)}h ago`;
  if (m < 2880) return "Yesterday";
  return `${Math.floor(m / 1440)}d ago`;
}

const roleMeta = (r: AdminRole) => adminRoles.find((x) => x.value === r) ?? adminRoles[2];

function UserAvatar({ user, size = 8 }: { user: AdminUser; size?: 7 | 8 | 14 }) {
  const sizes = { 7: "[--avatar-size:--spacing(7)]", 8: "[--avatar-size:--spacing(8)]", 14: "[--avatar-size:--spacing(14)]" };
  return (
    <Avatar className={cn(sizes[size], user.status === "suspended" && "opacity-60 grayscale")}>
      <AvatarFallback className={cn("font-semibold", avatarTones[hashIndex(user.email, avatarTones.length)])}>{initials(user)}</AvatarFallback>
    </Avatar>
  );
}

function RolePill({ role }: { role: AdminRole }) {
  const m = roleMeta(role);
  const reduce = useReducedMotionAfterMount();
  return (
    <motion.span
      animate={{ opacity: 1, scale: 1 }}
      className={cn("inline-flex h-6 items-center rounded-full px-2.5 font-medium text-xs", m.pill)}
      initial={reduce ? { opacity: 0.6 } : { opacity: 0.6, scale: 0.95 }}
      key={role}
      transition={{ duration: 0.18, ease: easeOut }}
    >
      {m.label}
    </motion.span>
  );
}

function StatusTag({ user }: { user: AdminUser }) {
  const m = statusMeta[user.status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs", m.text)}>
      <span className={cn("size-1.5 rounded-full", m.dot)} />
      {m.label}
    </span>
  );
}

type Tab = "all" | AdminStatus;
type SortKey = "name" | "minutesSinceActive";

const activityIcon: Record<AdminActivity["kind"], ReactNode> = {
  signin: <LogInIcon />,
  role: <UserCogIcon />,
  key: <KeyRoundIcon />,
  join: <UserRoundCheckIcon />,
  invite: <MailIcon />,
  suspend: <UserRoundXIcon />,
  "2fa": <ShieldCheckIcon />,
};

function activityFor(u: AdminUser): AdminActivity[] {
  if (u.activity) return u.activity;
  if (u.status === "invited") return [{ kind: "invite", text: "Invite sent by Maya Lindgren", when: u.joined.replace("Invited ", "") }];
  const list: AdminActivity[] = [];
  if (u.minutesSinceActive !== null) list.push({ kind: "signin", text: `Signed in from ${u.location ?? "an unknown location"}`, when: ago(u.minutesSinceActive) });
  if (u.status === "suspended") list.push({ kind: "suspend", text: "Suspended by Owen Adeyemi", when: "Sep 30" });
  if (u.twoFactor) list.push({ kind: "2fa", text: "Turned on two-factor authentication", when: u.joined });
  list.push({ kind: "join", text: "Joined from an invite by Maya Lindgren", when: u.joined });
  return list;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function AdminUsers({
  className,
  orgName = "Larkfield Studio",
  seats = 15,
  users: initialUsers = defaultUsers,
  currentUserId = "u1",
}: AdminUsersProps) {
  const reduce = useReducedMotionAfterMount();
  const [users, setUsers] = useState(initialUsers);
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<AdminRole[]>([]);
  const [no2fa, setNo2fa] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "name", dir: 1 });
  const [selected, setSelected] = useState<string[]>([]);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [invite, setInvite] = useState(false);
  const [confirm, setConfirm] = useState<string[] | null>(null);
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);
  const [nav, setNav] = useState(false);
  const [freshIds, setFreshIds] = useState<string[]>([]);
  const counter = useRef(0);
  const drawerRef = useRef<HTMLDivElement>(null);

  const say = (text: string) => {
    counter.current += 1;
    setToast({ id: counter.current, text });
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (detailId) drawerRef.current?.focus();
  }, [detailId]);

  const counts: Record<Tab, number> = {
    all: users.length,
    active: users.filter((u) => u.status === "active").length,
    invited: users.filter((u) => u.status === "invited").length,
    suspended: users.filter((u) => u.status === "suspended").length,
  };
  const seatsUsed = users.filter((u) => u.status !== "suspended" && u.role !== "viewer").length;
  const activeUsers = users.filter((u) => u.status === "active");
  const twoFaPct = activeUsers.length ? Math.round((activeUsers.filter((u) => u.twoFactor).length / activeUsers.length) * 100) : 0;

  const q = query.trim().toLowerCase();
  const rows = users
    .filter(
      (u) =>
        (tab === "all" || u.status === tab) &&
        (roleFilter.length === 0 || roleFilter.includes(u.role)) &&
        (!no2fa || !u.twoFactor) &&
        (!q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.teams.some((t) => t.toLowerCase().includes(q))),
    )
    .sort((a, b) => {
      if (sort.key === "name") return (a.name || a.email).localeCompare(b.name || b.email) * sort.dir;
      const av = a.minutesSinceActive ?? Number.POSITIVE_INFINITY;
      const bv = b.minutesSinceActive ?? Number.POSITIVE_INFINITY;
      return (av - bv) * sort.dir;
    });

  const visibleIds = rows.filter((r) => r.id !== currentUserId).map((r) => r.id);
  const selectedVisible = selected.filter((id) => visibleIds.includes(id));
  const allChecked = visibleIds.length > 0 && selectedVisible.length === visibleIds.length;
  const someChecked = selectedVisible.length > 0 && !allChecked;
  const selectedInvited = users.filter((u) => selectedVisible.includes(u.id) && u.status === "invited");
  const filterCount = roleFilter.length + (no2fa ? 1 : 0);
  const detail = users.find((u) => u.id === detailId) ?? null;
  const me = users.find((u) => u.id === currentUserId);

  const updateMany = (ids: string[], patch: Partial<AdminUser>) => setUsers((all) => all.map((u) => (ids.includes(u.id) ? { ...u, ...patch } : u)));
  const label = (u: AdminUser) => u.name || u.email;

  const remove = (ids: string[]) => {
    const n = ids.length;
    setUsers((all) => all.filter((u) => !ids.includes(u.id)));
    setSelected((s) => s.filter((id) => !ids.includes(id)));
    if (detailId && ids.includes(detailId)) setDetailId(null);
    setConfirm(null);
    say(n === 1 ? "Member removed. Their work stays in the projects." : `${n} members removed`);
  };

  const toggleSort = (key: SortKey) => setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: 1 }));

  const sortHeader = (key: SortKey, text: string, className?: string) => (
    <button
      aria-label={`Sort by ${text}`}
      className={cn("-mx-1 inline-flex cursor-pointer items-center gap-1 rounded px-1 hover:text-foreground", ring, className)}
      onClick={() => toggleSort(key)}
      type="button"
    >
      {text}
      <span className={cn("flex size-3.5 items-center justify-center transition-opacity", sort.key === key ? "opacity-100" : "opacity-0")}>
        {sort.dir === 1 ? <ArrowUpIcon className="size-3" /> : <ArrowDownIcon className="size-3" />}
      </span>
    </button>
  );

  const roleMenu = (u: AdminUser, align: "start" | "end" = "start") =>
    u.role === "owner" || u.id === currentUserId ? (
      <RolePill role={u.role} />
    ) : (
      <Menu>
        <MenuTrigger
          aria-label={`Role for ${label(u)}: ${roleMeta(u.role).label}`}
          className={cn("group/role relative inline-flex cursor-pointer items-center gap-1 rounded-full after:absolute after:-inset-x-1 after:-inset-y-2 after:content-['']", ring)}
          onClick={(e) => e.stopPropagation()}
        >
          <RolePill role={u.role} />
          <ChevronDownIcon className="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover/role:opacity-100 group-data-popup-open/role:opacity-100 pointer-coarse:opacity-100" />
        </MenuTrigger>
        <MenuPopup align={align} className={cn("w-64", menuPop)}>
          <MenuRadioGroup
            onValueChange={(v) => {
              updateMany([u.id], { role: v as AdminRole });
              say(`${label(u)} is now ${roleMeta(v as AdminRole).label === "Admin" ? "an" : "a"} ${roleMeta(v as AdminRole).label.toLowerCase()}`);
            }}
            value={u.role}
          >
            {adminRoles
              .filter((r) => r.value !== "owner")
              .map((r) => (
                <MenuRadioItem key={r.value} value={r.value}>
                  <span className="flex flex-col py-0.5">
                    <span className="font-medium">{r.label}</span>
                    <span className="text-pretty text-muted-foreground text-xs">{r.description}</span>
                  </span>
                </MenuRadioItem>
              ))}
          </MenuRadioGroup>
        </MenuPopup>
      </Menu>
    );

  const rowMenu = (u: AdminUser) =>
    u.id === currentUserId ? (
      <span className="block size-8" />
    ) : (
      <Menu>
        <MenuTrigger
          aria-label={`Actions for ${label(u)}`}
          onClick={(e) => e.stopPropagation()}
          render={<Button className={press} size="icon-sm" variant="ghost" />}
        >
          <EllipsisIcon />
        </MenuTrigger>
        <MenuPopup align="end" className={cn("w-48", menuPop)}>
          <MenuItem onClick={() => setDetailId(u.id)}>
            <UserCogIcon /> View details
          </MenuItem>
          {u.status === "invited" && (
            <MenuItem onClick={() => say(`Invite resent to ${u.email}`)}>
              <SendIcon /> Resend invite
            </MenuItem>
          )}
          {u.status === "active" && u.role !== "owner" && (
            <MenuItem
              onClick={() => {
                updateMany([u.id], { status: "suspended" });
                say(`${label(u)} suspended. Sessions signed out.`);
              }}
            >
              <UserRoundXIcon /> Suspend
            </MenuItem>
          )}
          {u.status === "suspended" && (
            <MenuItem
              onClick={() => {
                updateMany([u.id], { status: "active" });
                say(`${label(u)} reactivated`);
              }}
            >
              <UserRoundCheckIcon /> Reactivate
            </MenuItem>
          )}
          {u.role !== "owner" && (
            <>
              <MenuSeparator />
              <MenuItem onClick={() => setConfirm([u.id])} variant="destructive">
                <UserMinusIcon /> {u.status === "invited" ? "Revoke invite" : "Remove from org"}
              </MenuItem>
            </>
          )}
        </MenuPopup>
      </Menu>
    );

  const teamChips = (u: AdminUser, all = false) =>
    u.teams.length === 0 ? (
      <span className="text-muted-foreground text-xs">No teams</span>
    ) : (
      <span className={cn("flex min-w-0 items-center gap-1", all && "flex-wrap")}>
        {(all ? u.teams : u.teams.slice(0, 2)).map((t) => (
          <span className="truncate rounded-md border px-1.5 py-0.5 text-muted-foreground text-xs" key={t}>
            {t}
          </span>
        ))}
        {!all && u.teams.length > 2 && <span className="text-muted-foreground text-xs tabular-nums">+{u.teams.length - 2}</span>}
      </span>
    );

  const twoFa = (u: AdminUser) =>
    u.status === "invited" ? (
      <span className="text-muted-foreground text-xs">—</span>
    ) : u.twoFactor ? (
      <span className="inline-flex items-center gap-1.5 text-xs">
        <ShieldCheckIcon className="size-3.5 text-success-foreground" /> On
      </span>
    ) : (
      <span className="inline-flex items-center gap-1.5 text-warning-foreground text-xs">
        <ShieldAlertIcon className="size-3.5" /> Off
      </span>
    );

  const rowMotion = (u: AdminUser) => ({
    animate: { opacity: 1, y: 0 },
    exit: reduce ? { opacity: 0, transition: { duration: 0.12 } } : { opacity: 0, x: -16, transition: { duration: 0.16, ease: easeOut } },
    initial: reduce ? false : freshIds.includes(u.id) ? { opacity: 0, y: -6 } : false,
    layout: reduce ? false : ("position" as const),
    transition: spring,
  });

  const listKey = [tab, roleFilter.join(","), no2fa, q, sort.key, sort.dir].join("|");
  const MotionRow = MotionTableRow;

  const navItems = [
    { label: "General", icon: <BuildingIcon /> },
    { label: "Members", icon: <UsersIcon />, active: true, badge: counts.invited },
    { label: "Teams", icon: <UsersIcon /> },
    { label: "Roles", icon: <UserCogIcon /> },
    { label: "Security & SSO", icon: <ShieldIcon /> },
    { label: "Audit log", icon: <ScrollTextIcon /> },
    { label: "Billing", icon: <CreditCardIcon /> },
  ];

  const sidebar = (
    <div className="flex h-full flex-col gap-5 p-3">
      <div className="flex items-center gap-2.5 px-1.5 pt-1">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary font-semibold text-primary-foreground text-xs">
          {orgName
            .split(" ")
            .map((w) => w[0])
            .join("")
            .slice(0, 2)}
        </span>
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-heading font-semibold">{orgName}</span>
          <span className="text-muted-foreground text-xs">Organization settings</span>
        </div>
      </div>
      <nav aria-label="Settings" className="flex flex-col gap-0.5">
        {navItems.map((n) => (
          <button
            aria-current={n.active ? "page" : undefined}
            className={cn(
              "flex h-8 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-left [&_svg]:size-4 [&_svg]:opacity-80",
              ring,
              press,
              n.active ? "bg-accent font-medium text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
            key={n.label}
            type="button"
          >
            {n.icon}
            <span className="flex-1">{n.label}</span>
            {n.badge ? <span className="rounded-full bg-info/12 px-1.5 font-medium text-info-foreground text-xs tabular-nums">{n.badge}</span> : null}
          </button>
        ))}
      </nav>
      {me && (
        <div className="mt-auto flex items-center gap-2.5 rounded-xl border bg-card p-2.5">
          <UserAvatar size={7} user={me} />
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-medium text-xs">{me.name}</span>
            <span className="text-muted-foreground text-xs">{roleMeta(me.role).label}</span>
          </div>
        </div>
      )}
    </div>
  );

  const tabs: { value: Tab; label: string }[] = [
    { value: "all", label: "All" },
    { value: "active", label: "Active" },
    { value: "invited", label: "Invited" },
    { value: "suspended", label: "Suspended" },
  ];

  const empty = (
    <div className="flex flex-col items-center gap-4 px-6 py-14 text-center">
      <span className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        {q ? <SearchIcon className="size-4.5" /> : <FilterIcon className="size-4.5" />}
      </span>
      <div className="flex max-w-72 flex-col gap-1">
        <span className="text-balance font-medium">{q ? `Nobody matches “${query.trim()}”` : tab === "suspended" ? "No suspended members" : "No members match these filters"}</span>
        <span className="text-pretty text-muted-foreground text-xs">{q ? "Search works on names, emails and teams." : "Try removing a filter."}</span>
      </div>
      <Button
        className={press}
        onClick={() => {
          setQuery("");
          setRoleFilter([]);
          setNo2fa(false);
          setTab("all");
        }}
        size="sm"
        variant="outline"
      >
        Show everyone
      </Button>
    </div>
  );

  return (
    <div
      className={cn("@container relative isolate flex h-[760px] w-full overflow-hidden bg-background text-foreground text-sm", className)}
      onKeyDown={(e) => {
        if (e.key !== "Escape") return;
        if (confirm) setConfirm(null);
        else if (invite) setInvite(false);
        else if (detailId) setDetailId(null);
        else if (nav) setNav(false);
      }}
    >
      <aside className="hidden w-60 shrink-0 border-r bg-muted/40 @5xl:block">{sidebar}</aside>

      <AnimatePresence>
        {nav && (
          <>
            <motion.div animate={{ opacity: 1 }} aria-hidden className="absolute inset-0 z-40 bg-black/32 @5xl:hidden" exit={{ opacity: 0 }} initial={{ opacity: 0 }} onClick={() => setNav(false)} transition={{ duration: 0.2, ease: easeOut }} />
            <motion.div
              animate={{ x: 0 }}
              aria-label="Settings navigation"
              aria-modal
              className="absolute inset-y-0 left-0 z-50 w-72 max-w-[85%] border-r bg-background @5xl:hidden"
              exit={{ x: "-100%" }}
              initial={{ x: "-100%" }}
              role="dialog"
              transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 42 }}
            >
              <Button aria-label="Close navigation" className="absolute top-3 right-3" onClick={() => setNav(false)} size="icon-sm" variant="ghost">
                <XIcon />
              </Button>
              {sidebar}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="relative flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-3 @5xl:hidden">
          <Button aria-label="Open navigation" onClick={() => setNav(true)} size="icon-sm" variant="ghost">
            <MenuIcon />
          </Button>
          <span className="truncate font-heading font-semibold">{orgName}</span>
          <span className="text-muted-foreground">/ Members</span>
          <Button aria-label="Invite members" className={cn("ms-auto", press)} onClick={() => setInvite(true)} size="icon-sm">
            <UserPlusIcon />
          </Button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex flex-col gap-5 px-4 pt-5 pb-28 @3xl:px-6 @3xl:pt-6">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <h2 className="text-balance font-heading font-semibold text-xl tracking-tight">Members</h2>
                <p className="text-pretty text-muted-foreground">Manage who can access {orgName} and what they can do.</p>
              </div>
              <Button className={cn("hidden @5xl:inline-flex", press)} onClick={() => setInvite(true)}>
                <UserPlusIcon /> Invite members
              </Button>
            </div>

            <section aria-label="Overview" className="grid grid-cols-3 divide-x overflow-hidden rounded-xl border bg-card">
              <div className="flex min-w-0 flex-col gap-2 p-3 @xl:gap-2.5 @xl:px-4 @xl:py-3.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-muted-foreground text-xs">Seats</span>
                  <span className="hidden text-muted-foreground text-xs tabular-nums @xl:inline">{Math.max(0, seats - seatsUsed)} left</span>
                </div>
                <span className="font-heading font-semibold text-lg tabular-nums">
                  {seatsUsed} <span className="font-normal text-muted-foreground text-sm">of {seats}</span>
                </span>
                <div aria-hidden className="flex h-1.5 gap-px overflow-hidden rounded-full @xl:gap-0.5">
                  {Array.from({ length: seats }, (_, i) => (
                    <motion.span
                      animate={{ opacity: 1 }}
                      className={cn("h-full flex-1 rounded-full transition-colors duration-300", i < seatsUsed ? (seatsUsed / seats > 0.9 ? "bg-warning" : "bg-foreground") : "bg-muted")}
                      initial={false}
                      key={i}
                    />
                  ))}
                </div>
              </div>
              <button
                className={cn("flex min-w-0 cursor-pointer flex-col gap-2 p-3 text-left transition-colors duration-150 @xl:gap-2.5 @xl:px-4 @xl:py-3.5 [@media(hover:hover)]:hover:bg-accent/40", ring, "focus-visible:ring-inset")}
                onClick={() => setTab("invited")}
                type="button"
              >
                <span className="truncate text-muted-foreground text-xs">
                  <span className="@xl:hidden">Invites</span>
                  <span className="hidden @xl:inline">Pending invites</span>
                </span>
                <span className="font-heading font-semibold text-lg tabular-nums">{counts.invited}</span>
                <span className="hidden text-muted-foreground text-xs @xl:block">Invites expire after 14 days</span>
              </button>
              <button
                className={cn("flex min-w-0 cursor-pointer flex-col gap-2 p-3 text-left transition-colors duration-150 @xl:gap-2.5 @xl:px-4 @xl:py-3.5 [@media(hover:hover)]:hover:bg-accent/40", ring, "focus-visible:ring-inset")}
                onClick={() => {
                  setNo2fa(true);
                  setTab("active");
                }}
                type="button"
              >
                <span className="truncate text-muted-foreground text-xs">
                  <span className="@xl:hidden">2FA</span>
                  <span className="hidden @xl:inline">Two-factor coverage</span>
                </span>
                <span className="flex items-center gap-2 font-heading font-semibold text-lg tabular-nums">
                  {twoFaPct}%
                  {twoFaPct < 100 && <ShieldAlertIcon className="size-4 text-warning-foreground" />}
                </span>
                <span className="hidden text-muted-foreground text-xs @xl:block">
                  <span className="tabular-nums">{activeUsers.filter((u) => !u.twoFactor).length}</span> active{" "}
                  {activeUsers.filter((u) => !u.twoFactor).length === 1 ? "member" : "members"} without 2FA
                </span>
              </button>
            </section>

            <div className="flex flex-col gap-3 @4xl:flex-row @4xl:items-center">
              <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] @3xl:-mx-6 @3xl:px-6 @4xl:mx-0 @4xl:px-0">
                <div aria-label="Status" className="relative flex w-fit items-center gap-0.5 rounded-lg bg-muted p-0.5" role="tablist">
                  {tabs.map((t) => (
                    <button
                      aria-selected={tab === t.value}
                      className={cn("relative flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-2.5 font-medium", ring)}
                      key={t.value}
                      onClick={() => {
                        setTab(t.value);
                        setSelected([]);
                      }}
                      role="tab"
                      type="button"
                    >
                      {tab === t.value && (
                        <motion.span className="absolute inset-0 rounded-md bg-background shadow-xs/5 dark:bg-input" layoutId={`${orgName}-tab`} transition={reduce ? { duration: 0 } : spring} />
                      )}
                      <span className={cn("relative transition-colors", tab === t.value ? "text-foreground" : "text-muted-foreground")}>{t.label}</span>
                      <span className="relative text-muted-foreground text-xs tabular-nums">{counts[t.value]}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 @4xl:ms-auto">
                <InputGroup className="@4xl:w-60">
                  <InputGroupAddon>
                    <SearchIcon />
                  </InputGroupAddon>
                  <InputGroupInput aria-label="Search members" onChange={(e) => setQuery(e.target.value)} placeholder="Name, email or team" type="search" value={query} />
                </InputGroup>
                <Menu>
                  <MenuTrigger aria-label={filterCount ? `Filter, ${filterCount} active` : "Filter"} render={<Button className={cn("relative", press)} variant="outline" />}>
                    <FilterIcon />
                    <span className="hidden @md:inline">Filter</span>
                    <AnimatePresence initial={false}>
                      {filterCount > 0 && (
                        <motion.span
                          animate={{ opacity: 1, scale: 1 }}
                          className="absolute -top-1.5 -right-1.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-primary px-1 font-medium text-[10px] text-primary-foreground tabular-nums ring-2 ring-background"
                          exit={{ opacity: 0, scale: 0.95 }}
                          initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.15, ease: easeOut }}
                        >
                          {filterCount}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </MenuTrigger>
                  <MenuPopup align="end" className={cn("w-52", menuPop)}>
                    <MenuGroup>
                      <MenuGroupLabel>Role</MenuGroupLabel>
                      {adminRoles.map((r) => (
                        <MenuCheckboxItem
                          checked={roleFilter.includes(r.value)}
                          key={r.value}
                          onCheckedChange={(on) => setRoleFilter((f) => (on ? [...f, r.value] : f.filter((x) => x !== r.value)))}
                        >
                          {r.label}
                        </MenuCheckboxItem>
                      ))}
                    </MenuGroup>
                    <MenuSeparator />
                    <MenuGroup>
                      <MenuGroupLabel>Security</MenuGroupLabel>
                      <MenuCheckboxItem checked={no2fa} onCheckedChange={(on) => setNo2fa(on)}>
                        Two-factor off
                      </MenuCheckboxItem>
                    </MenuGroup>
                  </MenuPopup>
                </Menu>
              </div>
            </div>

            <AnimatePresence initial={false}>
              {filterCount > 0 && (
                <motion.div
                  animate={{ opacity: 1, height: "auto" }}
                  className="-mt-2 overflow-hidden"
                  exit={{ opacity: 0, height: 0 }}
                  initial={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2, ease: easeOut }}
                >
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    {roleFilter.map((r) => (
                      <button
                        aria-label={`Remove filter: ${roleMeta(r).label}`}
                        className={cn("flex h-7 cursor-pointer items-center gap-1 rounded-full border bg-background ps-2.5 pe-1.5 text-xs hover:bg-accent dark:bg-input/32", ring, press)}
                        key={r}
                        onClick={() => setRoleFilter((f) => f.filter((x) => x !== r))}
                        type="button"
                      >
                        <span className="text-muted-foreground">Role:</span> {roleMeta(r).label}
                        <XIcon className="size-3.5 text-muted-foreground" />
                      </button>
                    ))}
                    {no2fa && (
                      <button
                        aria-label="Remove filter: two-factor off"
                        className={cn("flex h-7 cursor-pointer items-center gap-1 rounded-full border bg-background ps-2.5 pe-1.5 text-xs hover:bg-accent dark:bg-input/32", ring, press)}
                        onClick={() => setNo2fa(false)}
                        type="button"
                      >
                        2FA off
                        <XIcon className="size-3.5 text-muted-foreground" />
                      </button>
                    )}
                    <Button
                      className={press}
                      onClick={() => {
                        setRoleFilter([]);
                        setNo2fa(false);
                      }}
                      size="xs"
                      variant="ghost"
                    >
                      Clear all
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="overflow-hidden rounded-xl border bg-card">
              <div className="@3xl:hidden">
                <div className={cn("flex items-center gap-3 border-b px-4 py-2.5 text-muted-foreground text-xs", rows.length === 0 && "hidden")}>
                  <Checkbox aria-label="Select all visible members" checked={allChecked} className={hit} indeterminate={someChecked} onCheckedChange={(on) => setSelected(on ? visibleIds : [])} />
                  <span className="flex-1 font-medium tabular-nums">{rows.length} members</span>
                  {sortHeader("minutesSinceActive", "Last active")}
                </div>
                <ul className="divide-y">
                  <AnimatePresence initial={false} key={listKey}>
                    {rows.map((u) => {
                      const isSel = selected.includes(u.id);
                      return (
                        <motion.li key={u.id} {...rowMotion(u)} className={cn("flex items-center gap-3 px-4 py-3 transition-colors", isSel && "bg-accent/60")}>
                          {u.id === currentUserId ? (
                            <span className="size-4 shrink-0" />
                          ) : (
                            <Checkbox aria-label={`Select ${label(u)}`} checked={isSel} className={hit} onCheckedChange={(on) => setSelected((s) => (on ? [...s, u.id] : s.filter((x) => x !== u.id)))} />
                          )}
                          <button className={cn("flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-lg text-left", ring)} onClick={() => setDetailId(u.id)} type="button">
                            <UserAvatar user={u} />
                            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                              <span className="flex items-center gap-1.5 truncate font-medium">
                                <span className="truncate">{u.name || u.email}</span>
                                {u.id === currentUserId && <span className="font-normal text-muted-foreground text-xs">you</span>}
                              </span>
                              <span className="flex items-center gap-2 text-muted-foreground text-xs">
                                <StatusTag user={u} />
                                <span aria-hidden>·</span>
                                <span className="truncate tabular-nums">{u.status === "invited" ? u.joined : ago(u.minutesSinceActive)}</span>
                              </span>
                            </span>
                          </button>
                          <RolePill role={u.role} />
                        </motion.li>
                      );
                    })}
                  </AnimatePresence>
                </ul>
              </div>

              <Table className="min-w-[860px] table-fixed" render={<div className="relative hidden w-full overflow-x-auto @3xl:block" />}>
                <TableHeader>
                  <TableRow className="bg-muted/30 text-muted-foreground text-xs not-in-data-[variant=card]:hover:bg-muted/30 dark:not-in-data-[variant=card]:hover:bg-muted/30 [&_th]:h-9 [&_th]:font-medium [&_th]:text-muted-foreground [&_th]:text-xs">
                    <TableHead className="ps-4 has-[[role=checkbox]]:w-auto first:has-[[role=checkbox]]:pe-4">
                      <div className="flex items-center gap-3">
                        <Checkbox aria-label="Select all visible members" checked={allChecked} className={hit} indeterminate={someChecked} onCheckedChange={(on) => setSelected(on ? visibleIds : [])} />
                        {sortHeader("name", "Member")}
                      </div>
                    </TableHead>
                    <TableHead className="w-32">Role</TableHead>
                    <TableHead className="w-28">Status</TableHead>
                    <TableHead className="w-20">2FA</TableHead>
                    <TableHead className="w-44">Teams</TableHead>
                    <TableHead className="w-28">{sortHeader("minutesSinceActive", "Last active")}</TableHead>
                    <TableHead className="w-14 pe-3" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence initial={false} key={listKey}>
                    {rows.map((u) => {
                      const isSel = selected.includes(u.id);
                      return (
                        <MotionRow
                          key={u.id}
                          {...rowMotion(u)}
                          className="group/row cursor-pointer"
                          data-state={isSel ? "selected" : undefined}
                          onClick={(e: MouseEvent) => {
                            if ((e.target as HTMLElement).closest("button, [role=checkbox], [role=menuitem]")) return;
                            setDetailId(u.id);
                          }}
                        >
                          <TableCell className="py-2.5 ps-4 has-[[role=checkbox]]:w-auto first:has-[[role=checkbox]]:pe-4">
                            <div className="flex min-w-0 items-center gap-3">
                              {u.id === currentUserId ? (
                                <span className="size-4 shrink-0" />
                              ) : (
                                <Checkbox aria-label={`Select ${label(u)}`} checked={isSel} className={hit} onCheckedChange={(on) => setSelected((s) => (on ? [...s, u.id] : s.filter((x) => x !== u.id)))} />
                              )}
                              <UserAvatar user={u} />
                              <div className="flex min-w-0 flex-1 flex-col">
                                <button className={cn("flex w-fit max-w-full cursor-pointer items-center gap-1.5 truncate rounded text-left font-medium hover:underline", ring)} onClick={() => setDetailId(u.id)} type="button">
                                  <span className="truncate">{u.name || u.email}</span>
                                  {u.id === currentUserId && <span className="font-normal text-muted-foreground text-xs">you</span>}
                                </button>
                                <span className="truncate text-muted-foreground text-xs">{u.name ? u.email : "Hasn't joined yet"}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{roleMenu(u)}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <StatusTag user={u} />
                              {u.status === "invited" && <span className="text-muted-foreground text-xs">{u.joined.replace("Invited ", "Sent ")}</span>}
                            </div>
                          </TableCell>
                          <TableCell>{twoFa(u)}</TableCell>
                          <TableCell>{teamChips(u)}</TableCell>
                          <TableCell className="text-muted-foreground text-xs tabular-nums">{ago(u.minutesSinceActive)}</TableCell>
                          <TableCell className="pe-3 text-right">{rowMenu(u)}</TableCell>
                        </MotionRow>
                      );
                    })}
                  </AnimatePresence>
                </TableBody>
              </Table>
              {rows.length === 0 && empty}
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-30 flex justify-center px-3">
          <AnimatePresence initial={false} mode="popLayout">
            {selectedVisible.length > 0 && !detail && !invite && !confirm ? (
              <motion.div
                animate={{ y: 0, opacity: 1, scale: 1 }}
                aria-label="Bulk actions"
                className={cn(barSurface, "pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto p-1 [scrollbar-width:none]")}
                exit={{ y: 8, opacity: 0, scale: 0.97, transition: { duration: 0.12, ease: easeOut } }}
                initial={reduce ? { opacity: 0 } : { y: 16, opacity: 0, scale: 0.96 }}
                key="bulk"
                role="toolbar"
                transition={reduce ? { duration: 0.15 } : spring}
              >
                <span className="flex h-8 shrink-0 items-center gap-2 ps-2.5 pe-1.5 font-medium">
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-foreground px-1.5 text-primary text-xs tabular-nums dark:bg-primary dark:text-primary-foreground">
                    {selectedVisible.length}
                  </span>
                  <span className="hidden @md:inline">selected</span>
                </span>
                <span className="h-5 w-px shrink-0 bg-primary-foreground/20 dark:bg-border" />
                <Menu>
                  <MenuTrigger className={barButton}>
                    <UserCogIcon className="size-3.5 opacity-80" /> Role
                  </MenuTrigger>
                  <MenuPopup align="center" className={menuPop} side="top" sideOffset={8}>
                    <MenuGroup>
                      <MenuGroupLabel>Change role to</MenuGroupLabel>
                      {adminRoles
                        .filter((r) => r.value !== "owner")
                        .map((r) => (
                          <MenuItem
                            key={r.value}
                            onClick={() => {
                              const ids = users.filter((u) => selectedVisible.includes(u.id) && u.role !== "owner").map((u) => u.id);
                              updateMany(ids, { role: r.value });
                              say(`${ids.length} ${ids.length === 1 ? "member is" : "members are"} now ${r.label.toLowerCase()}${ids.length === 1 ? "" : "s"}`);
                            }}
                          >
                            {r.label}
                          </MenuItem>
                        ))}
                    </MenuGroup>
                  </MenuPopup>
                </Menu>
                {selectedInvited.length > 0 && (
                  <button className={barButton} onClick={() => say(`${selectedInvited.length} ${selectedInvited.length === 1 ? "invite" : "invites"} resent`)} type="button">
                    <SendIcon className="size-3.5 opacity-80" /> Resend
                  </button>
                )}
                <button
                  className={barButton}
                  onClick={() => {
                    const ids = users.filter((u) => selectedVisible.includes(u.id) && u.status === "active" && u.role !== "owner").map((u) => u.id);
                    updateMany(ids, { status: "suspended" });
                    say(ids.length ? `${ids.length} suspended. Their sessions were signed out.` : "Nobody to suspend in this selection");
                  }}
                  type="button"
                >
                  <UserRoundXIcon className="size-3.5 opacity-80" /> Suspend
                </button>
                <button
                  className={cn(barButton, "hover:bg-destructive hover:text-white dark:hover:bg-destructive dark:hover:text-white")}
                  onClick={() => setConfirm(selectedVisible.filter((id) => users.find((u) => u.id === id)?.role !== "owner"))}
                  type="button"
                >
                  <UserMinusIcon className="size-3.5 opacity-80" /> Remove
                </button>
                <button aria-label="Clear selection" className={cn(barButton, "w-8 justify-center px-0")} onClick={() => setSelected([])} type="button">
                  <XIcon className="size-4" />
                </button>
              </motion.div>
            ) : toast ? (
              <motion.div
                animate={{ y: 0, opacity: 1, scale: 1 }}
                className={cn(barSurface, "pointer-events-auto flex max-w-full items-center gap-2 px-4 py-2")}
                exit={{ y: 8, opacity: 0, scale: 0.97, transition: { duration: 0.12, ease: easeOut } }}
                initial={reduce ? { opacity: 0 } : { y: 16, opacity: 0, scale: 0.96 }}
                key={toast.id}
                role="status"
                transition={reduce ? { duration: 0.15 } : spring}
              >
                <CheckIcon className="size-4 shrink-0 opacity-80" />
                <span className="truncate">{toast.text}</span>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

      </div>

      <AnimatePresence>
        {detail && (
          <>
            <motion.div animate={{ opacity: 1 }} aria-hidden className="absolute inset-0 z-40 bg-black/24" exit={{ opacity: 0 }} initial={{ opacity: 0 }} key="scrim" onClick={() => setDetailId(null)} transition={{ duration: 0.2, ease: easeOut }} />
            <motion.aside
              animate={{ x: 0 }}
              aria-label={`${label(detail)} details`}
              aria-modal
              className="absolute inset-y-0 right-0 z-50 flex w-full max-w-[420px] flex-col border-l bg-background shadow-lg/10 outline-none"
              exit={{ x: "100%", transition: { duration: 0.2, ease: easeOut } }}
              initial={{ x: "100%" }}
              key="drawer"
              ref={drawerRef}
              role="dialog"
              tabIndex={-1}
              transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 42 }}
            >
              <div className="flex h-12 shrink-0 items-center justify-between border-b px-4">
                <span className="font-medium text-muted-foreground text-xs">Member details</span>
                <Button aria-label="Close details" className="-me-2" onClick={() => setDetailId(null)} size="icon-sm" variant="ghost">
                  <XIcon />
                </Button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <div className="flex flex-col gap-6 p-5">
                  <div className="flex items-center gap-4">
                    <UserAvatar size={14} user={detail} />
                    <div className="flex min-w-0 flex-col gap-1">
                      <h3 className="truncate font-heading font-semibold text-lg">{detail.name || detail.email}</h3>
                      <span className="truncate text-muted-foreground">{detail.name ? detail.email : "Hasn't joined yet"}</span>
                      <span className="flex items-center gap-2">
                        {roleMenu(detail)}
                        <StatusTag user={detail} />
                      </span>
                    </div>
                  </div>

                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border bg-card p-4 text-xs">
                    <div className="flex flex-col gap-0.5">
                      <dt className="text-muted-foreground">{detail.status === "invited" ? "Invited" : "Joined"}</dt>
                      <dd className="font-medium">{detail.joined.replace("Invited ", "")}</dd>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <dt className="text-muted-foreground">Last active</dt>
                      <dd className="font-medium tabular-nums">{ago(detail.minutesSinceActive)}</dd>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <dt className="text-muted-foreground">Two-factor</dt>
                      <dd>{twoFa(detail)}</dd>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <dt className="text-muted-foreground">Location</dt>
                      <dd className="truncate font-medium">{detail.location ?? "—"}</dd>
                    </div>
                    <div className="col-span-2 flex flex-col gap-1.5">
                      <dt className="text-muted-foreground">Teams</dt>
                      <dd>{teamChips(detail, true)}</dd>
                    </div>
                  </dl>

                  {detail.status === "active" && (
                    <section className="flex flex-col gap-2">
                      <h4 className="font-medium text-muted-foreground text-xs">Signed-in devices</h4>
                      <ul className="divide-y rounded-xl border">
                        {[
                          { icon: <LaptopIcon />, name: "MacBook Pro · Chrome", meta: `${detail.location ?? "Unknown"} · ${ago(detail.minutesSinceActive)}`, current: true },
                          { icon: <SmartphoneIcon />, name: "iPhone · App", meta: `${detail.location ?? "Unknown"} · 3d ago` },
                        ].map((d) => (
                          <li className="flex items-center gap-3 px-3 py-2.5" key={d.name}>
                            <span className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground [&_svg]:size-4">{d.icon}</span>
                            <span className="flex min-w-0 flex-1 flex-col">
                              <span className="truncate font-medium text-xs">{d.name}</span>
                              <span className="truncate text-muted-foreground text-xs tabular-nums">{d.meta}</span>
                            </span>
                            {d.current && <span className="text-success-foreground text-xs">Active now</span>}
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

                  <section className="flex flex-col gap-3">
                    <h4 className="font-medium text-muted-foreground text-xs">Activity</h4>
                    <ol className="relative flex flex-col gap-4">
                      <span aria-hidden className="absolute top-3 bottom-3 left-[13px] w-px bg-border" />
                      {activityFor(detail).map((a, i) => (
                        <motion.li
                          animate={{ opacity: 1, y: 0 }}
                          className="relative flex gap-3"
                          initial={reduce ? false : { opacity: 0, y: 4 }}
                          key={`${a.kind}-${i}`}
                          transition={{ duration: 0.2, ease: easeOut, delay: 0.08 + Math.min(i, 5) * 0.03 }}
                        >
                          <span className="relative flex size-7 shrink-0 items-center justify-center rounded-full border bg-background text-muted-foreground [&_svg]:size-3.5">
                            {activityIcon[a.kind]}
                          </span>
                          <span className="flex min-w-0 flex-col gap-0.5 pt-1">
                            <span className="text-pretty text-xs leading-5">{a.text}</span>
                            <span className="text-muted-foreground text-xs tabular-nums">{a.when}</span>
                          </span>
                        </motion.li>
                      ))}
                    </ol>
                  </section>
                </div>
              </div>
              {detail.role !== "owner" && detail.id !== currentUserId && (
                <div className="flex shrink-0 gap-2 border-t p-4">
                  {detail.status === "invited" ? (
                    <Button className={cn("flex-1", press)} onClick={() => say(`Invite resent to ${detail.email}`)} variant="outline">
                      <SendIcon /> Resend invite
                    </Button>
                  ) : (
                    <Button
                      className={cn("flex-1", press)}
                      onClick={() => {
                        const next = detail.status === "suspended" ? "active" : "suspended";
                        updateMany([detail.id], { status: next });
                        say(next === "suspended" ? `${label(detail)} suspended. Sessions signed out.` : `${label(detail)} reactivated`);
                      }}
                      variant="outline"
                    >
                      {detail.status === "suspended" ? <UserRoundCheckIcon /> : <UserRoundXIcon />}
                      {detail.status === "suspended" ? "Reactivate" : "Suspend"}
                    </Button>
                  )}
                  <Button className={cn("flex-1", press)} onClick={() => setConfirm([detail.id])} variant="destructive-outline">
                    <UserMinusIcon /> {detail.status === "invited" ? "Revoke" : "Remove"}
                  </Button>
                </div>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirm && (
          <ConfirmRemove
            names={users.filter((u) => confirm.includes(u.id)).map(label)}
            onCancel={() => setConfirm(null)}
            onConfirm={() => remove(confirm)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {invite && (
          <InviteDialog
            onClose={() => setInvite(false)}
            onSend={(emails, role) => {
              const added: AdminUser[] = emails.map((email, i) => ({
                id: `inv-${Date.now()}-${i}`,
                name: "",
                email,
                role,
                status: "invited",
                twoFactor: false,
                teams: [],
                minutesSinceActive: null,
                joined: "Invited just now",
              }));
              setUsers((all) => [...added, ...all]);
              setFreshIds(added.map((a) => a.id));
              setTab("all");
              setQuery("");
              setRoleFilter([]);
              setNo2fa(false);
              setSort({ key: "minutesSinceActive", dir: -1 });
              setInvite(false);
              say(`${emails.length} ${emails.length === 1 ? "invite" : "invites"} sent`);
            }}
            existing={users.map((u) => u.email.toLowerCase())}
            seatsLeft={seats - seatsUsed}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

const MotionTableRow = motion.create(TableRow);

function ConfirmRemove({ names, onCancel, onConfirm }: { names: string[]; onCancel: () => void; onConfirm: () => void }) {
  const reduce = useReducedMotionAfterMount();
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => cancelRef.current?.focus(), []);
  const n = names.length;
  return (
    <>
      <motion.div animate={{ opacity: 1 }} aria-hidden className="absolute inset-0 z-[60] bg-black/32" exit={{ opacity: 0 }} initial={{ opacity: 0 }} onClick={onCancel} transition={{ duration: 0.18 }} />
      <motion.div
        animate={{ opacity: 1, scale: 1, y: 0 }}
        aria-describedby="au-confirm-body"
        aria-labelledby="au-confirm-title"
        className="absolute inset-x-4 top-1/2 z-[70] mx-auto flex max-w-sm -translate-y-1/2 flex-col gap-4 rounded-2xl border bg-popover p-5 text-popover-foreground shadow-lg/10"
        exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.12 } }}
        initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
        role="alertdialog"
        transition={{ duration: 0.2, ease: easeOut }}
      >
        <div className="flex flex-col gap-1.5">
          <h3 className="text-balance font-heading font-semibold text-base" id="au-confirm-title">
            Remove {n === 1 ? names[0] : `${n} members`}?
          </h3>
          <p className="text-pretty text-muted-foreground" id="au-confirm-body">
            {n === 1 ? "They" : "They all"} lose access right away and {n === 1 ? "their seat is" : "their seats are"} freed. Projects and comments they made stay put.
          </p>
        </div>
        <div className="flex justify-end gap-2">
          <Button className={press} onClick={onCancel} ref={cancelRef} variant="outline">
            Cancel
          </Button>
          <Button className={press} onClick={onConfirm} variant="destructive">
            Remove
          </Button>
        </div>
      </motion.div>
    </>
  );
}

function InviteDialog({
  onClose,
  onSend,
  seatsLeft,
  existing,
}: {
  onClose: () => void;
  onSend: (emails: string[], role: AdminRole) => void;
  seatsLeft: number;
  existing: string[];
}) {
  const reduce = useReducedMotionAfterMount();
  const [emails, setEmails] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [role, setRole] = useState<AdminRole>("member");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => inputRef.current?.focus(), []);

  const commit = (raw: string) => {
    const parts = raw.split(/[\s,;]+/).map((p) => p.trim().toLowerCase()).filter(Boolean);
    if (!parts.length) return;
    setEmails((e) => [...e, ...parts.filter((p) => !e.includes(p))]);
    setDraft("");
  };

  const problem = (e: string) => (!EMAIL.test(e) ? "format" : existing.includes(e) ? "taken" : null);
  const invalid = emails.filter((e) => problem(e) === "format");
  const taken = emails.filter((e) => problem(e) === "taken");
  const blocked = invalid.length + taken.length;
  const validCount = emails.length - blocked;
  const usesSeats = role !== "viewer";
  const overSeats = usesSeats && validCount > seatsLeft;
  const canSend = emails.length > 0 && blocked === 0 && !overSeats;

  return (
    <>
      <motion.div animate={{ opacity: 1 }} aria-hidden className="absolute inset-0 z-[60] bg-black/32" exit={{ opacity: 0 }} initial={{ opacity: 0 }} onClick={onClose} transition={{ duration: 0.18 }} />
      <motion.div
        animate={{ opacity: 1, scale: 1, y: 0 }}
        aria-labelledby="au-invite-title"
        aria-modal
        className="absolute inset-x-3 bottom-3 z-[70] mx-auto flex max-w-lg flex-col gap-5 rounded-2xl border bg-popover p-5 text-popover-foreground shadow-lg/10 @2xl:top-20 @2xl:bottom-auto"
        exit={{ opacity: 0, y: 8, scale: 0.98, transition: { duration: 0.14, ease: easeOut } }}
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
        role="dialog"
        transition={{ duration: 0.22, ease: easeOut }}
      >
        <div className="flex items-start gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <h3 className="font-heading font-semibold text-base" id="au-invite-title">
              Invite members
            </h3>
            <p className="text-pretty text-muted-foreground text-xs">They'll get an email with a link that works for 14 days.</p>
          </div>
          <Button aria-label="Close" className="-me-2 -mt-1" onClick={onClose} size="icon-sm" variant="ghost">
            <XIcon />
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          <label className="font-medium text-xs" htmlFor="au-invite-input">
            Email addresses
          </label>
          <div
            className="flex min-h-10 cursor-text flex-wrap items-center gap-1.5 rounded-lg border border-input bg-background p-1.5 shadow-xs/5 transition-shadow has-focus-visible:border-ring has-focus-visible:ring-[3px] has-focus-visible:ring-ring/24 dark:bg-input/32"
            onClick={() => inputRef.current?.focus()}
          >
            <AnimatePresence initial={false}>
              {emails.map((e) => {
                const bad = problem(e) !== null;
                return (
                  <motion.span
                    animate={{ opacity: 1, scale: 1 }}
                    className={cn(
                      "flex h-7 items-center gap-1 rounded-md ps-2 pe-1 text-xs",
                      bad ? "bg-destructive/10 text-destructive-foreground ring-1 ring-destructive/30 ring-inset" : "bg-muted text-foreground",
                    )}
                    exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.1 } }}
                    initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
                    key={e}
                    layout={reduce ? false : "position"}
                    transition={{ duration: 0.15, ease: easeOut }}
                  >
                    {e}
                    <button
                      aria-label={`Remove ${e}`}
                      className={cn("flex size-5 cursor-pointer items-center justify-center rounded hover:bg-foreground/10", ring)}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        setEmails((all) => all.filter((x) => x !== e));
                      }}
                      type="button"
                    >
                      <XIcon className="size-3" />
                    </button>
                  </motion.span>
                );
              })}
            </AnimatePresence>
            <input
              aria-describedby="au-invite-help"
              className="h-7 min-w-36 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground/72"
              id="au-invite-input"
              onBlur={() => {
                commit(draft);
              }}
              onChange={(e) => {
                const v = e.target.value;
                if (/[,;\s]$/.test(v)) commit(v);
                else setDraft(v);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (draft.trim()) commit(draft);
                  else if (canSend) onSend(emails, role);
                } else if (e.key === "Backspace" && !draft && emails.length) {
                  setEmails((all) => all.slice(0, -1));
                }
              }}
              onPaste={(e) => {
                e.preventDefault();
                commit(e.clipboardData.getData("text"));
              }}
              placeholder={emails.length ? "Add another" : "name@company.com"}
              ref={inputRef}
              value={draft}
            />
          </div>
          <span className={cn("text-xs", blocked ? "text-destructive-foreground" : "text-muted-foreground")} id="au-invite-help">
            {invalid.length
              ? `${invalid.length === 1 ? `“${invalid[0]}” doesn't look like an email` : `${invalid.length} addresses don't look right`}. Remove or fix ${invalid.length === 1 ? "it" : "them"}.`
              : taken.length
                ? `${taken.length === 1 ? `${taken[0]} is` : `${taken.length} addresses are`} already a member or invited.`
                : "Separate addresses with commas or paste a list."}
          </span>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 font-medium text-xs">Role</legend>
          <div className="grid grid-cols-1 gap-2 @lg:grid-cols-3" role="radiogroup">
            {adminRoles
              .filter((r) => r.value === "admin" || r.value === "member" || r.value === "viewer")
              .map((r) => {
                const on = role === r.value;
                return (
                  <button
                    aria-checked={on}
                    className={cn(
                      "relative flex cursor-pointer flex-col gap-1 rounded-xl border p-3 text-left",
                      ring,
                      press,
                      "active:scale-[0.98]",
                      on ? "border-foreground/40 bg-accent/60" : "hover:bg-accent/40",
                    )}
                    key={r.value}
                    onClick={() => setRole(r.value)}
                    role="radio"
                    type="button"
                  >
                    <span className="flex items-center justify-between font-medium">
                      {r.label}
                      <span className={cn("flex size-4 items-center justify-center rounded-full border transition-colors", on ? "border-primary bg-primary text-primary-foreground" : "border-input")}>
                        {on && <CheckIcon className="size-2.5" strokeWidth={3} />}
                      </span>
                    </span>
                    <span className="text-pretty text-muted-foreground text-xs leading-4">{r.description}</span>
                  </button>
                );
              })}
          </div>
        </fieldset>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className={cn("text-xs tabular-nums", overSeats ? "text-destructive-foreground" : "text-muted-foreground")}>
            {usesSeats ? (overSeats ? `Only ${seatsLeft} seats left. Add seats or invite as viewers.` : validCount ? `Uses ${validCount} of ${seatsLeft} remaining ${seatsLeft === 1 ? "seat" : "seats"}` : `${seatsLeft} ${seatsLeft === 1 ? "seat" : "seats"} left`) : "Viewers are free"}
          </span>
          <div className="flex gap-2">
            <Button className={press} onClick={onClose} variant="ghost">
              Cancel
            </Button>
            <Button className={press} disabled={!canSend} onClick={() => onSend(emails, role)}>
              <SendIcon /> Send {validCount > 1 ? `${validCount} invites` : "invite"}
            </Button>
          </div>
        </div>
      </motion.div>
    </>
  );
}
