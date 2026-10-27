"use client";

import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  BellIcon,
  CheckIcon,
  CopyIcon,
  CreditCardIcon,
  DownloadIcon,
  EllipsisIcon,
  EyeIcon,
  EyeOffIcon,
  KeyRoundIcon,
  MailIcon,
  PaletteIcon,
  PlusIcon,
  SettingsIcon,
  ShieldIcon,
  Trash2Icon,
  UserIcon,
  UsersIcon,
} from "lucide-react";
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { Menu, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

function useReducedMotionAfterMount() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && Boolean(prefers);
}

export type SettingsSectionId =
  | "profile"
  | "appearance"
  | "notifications"
  | "security"
  | "general"
  | "members"
  | "billing"
  | "developer";

export type SettingsTab = "workspace" | "members" | "keys" | "billing";
export type MemberRole = "owner" | "admin" | "member" | "viewer";
export type KeyScope = "read" | "write" | "admin";

export interface SettingsMember {
  id: string;
  name: string;
  email: string;
  role: MemberRole;
  lastActive: string;
  invited?: boolean;
}

export interface SettingsApiKey {
  id: string;
  name: string;
  secret: string;
  scope: KeyScope;
  created: string;
  lastUsed: string;
}

export interface SettingsUsage {
  label: string;
  used: number;
  limit: number;
  projected?: number;
  unit?: string;
}

export interface SettingsInvoice {
  id: string;
  date: string;
  amount: number;
  status: "paid" | "due" | "failed";
}

export interface SettingsPlan {
  id: string;
  name: string;
  price: number;
  blurb: string;
}

export interface SettingsCard {
  brand?: string;
  last4: string;
  expires: string;
  holder: string;
  email?: string;
}

export interface SettingsAndPlansProps {
  className?: string;
  defaultTab?: SettingsTab;
  workspace?: { name: string; slug: string; region: string };
  members?: SettingsMember[];
  apiKeys?: SettingsApiKey[];
  plans?: SettingsPlan[];
  currentPlan?: string;
  renewsOn?: string;
  usage?: SettingsUsage[];
  invoices?: SettingsInvoice[];
  card?: SettingsCard;
  cycleDaysLeft?: number;
  overagePer1k?: number;
  domain?: string;
  onNavigate?: (section: SettingsSectionId) => void;
}

const spring = { type: "spring", stiffness: 420, damping: 40 } as const;
const easeOut = [0.23, 1, 0.32, 1] as const;
const press = "transition-[scale,background-color,box-shadow] duration-150 ease-out motion-safe:active:scale-[0.97]";

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

const tabForNav: Partial<Record<SettingsSectionId, SettingsTab>> = {
  general: "workspace",
  members: "members",
  billing: "billing",
  developer: "keys",
};

const navForTab: Record<SettingsTab, SettingsSectionId> = {
  workspace: "general",
  members: "members",
  billing: "billing",
  keys: "developer",
};

const tabOrder: SettingsTab[] = ["workspace", "members", "keys", "billing"];

const tabCopy: Record<SettingsTab, { title: string; description: string }> = {
  workspace: { title: "General", description: "Your workspace's name, address and where its data lives." },
  members: { title: "Members", description: "Who can get in, and what they can touch." },
  keys: { title: "API keys", description: "Secret keys for scripts, CI and server-side calls." },
  billing: { title: "Billing", description: "Your plan, this cycle's usage, how you pay and past invoices." },
};

const regions = [
  { value: "us-east", label: "US East · Virginia" },
  { value: "eu-central", label: "EU Central · Frankfurt" },
  { value: "ap-northeast", label: "AP Northeast · Tokyo" },
];

const roleItems: { value: MemberRole; label: string; hint: string }[] = [
  { value: "owner", label: "Owner", hint: "Billing and deleting the workspace" },
  { value: "admin", label: "Admin", hint: "Members, keys and settings" },
  { value: "member", label: "Member", hint: "Create and edit projects" },
  { value: "viewer", label: "Viewer", hint: "Read-only access" },
];

const scopeItems: { value: KeyScope; label: string; hint: string }[] = [
  { value: "read", label: "Read", hint: "List and fetch" },
  { value: "write", label: "Read & write", hint: "Create runs, edit data" },
  { value: "admin", label: "Admin", hint: "Everything, incl. members" },
];

const defaultMembers: SettingsMember[] = [
  { id: "m1", name: "Ada Lindqvist", email: "ada@ridgeline.app", role: "owner", lastActive: "Now" },
  { id: "m2", name: "Theo Marsh", email: "theo@ridgeline.app", role: "admin", lastActive: "12 min ago" },
  { id: "m3", name: "Priya Raman", email: "priya@ridgeline.app", role: "member", lastActive: "2 h ago" },
  { id: "m4", name: "Jonah Feld", email: "jonah@ridgeline.app", role: "member", lastActive: "Yesterday" },
  { id: "m5", name: "Sara Whitlock", email: "sara@ridgeline.app", role: "viewer", lastActive: "4 days ago" },
];

const defaultKeys: SettingsApiKey[] = [
  { id: "k1", name: "Production server", secret: "rl_test_7Hq2vN9xRmT4bW8cYp3sKd1f", scope: "write", created: "Aug 02", lastUsed: "3 min ago" },
  { id: "k2", name: "CI deploys", secret: "rl_test_Zt5uA0eJ6gLq9rXn2VbM8hC4", scope: "read", created: "Sep 18", lastUsed: "1 h ago" },
  { id: "k3", name: "Analytics export", secret: "rl_test_Pw3kS7yD1oF5iQ0zU6aE9jB2", scope: "read", created: "Oct 01", lastUsed: "Never" },
];

const defaultPlans: SettingsPlan[] = [
  { id: "starter", name: "Starter", price: 0, blurb: "3 seats, 2k runs" },
  { id: "team", name: "Team", price: 24, blurb: "10 seats, 25k runs" },
  { id: "scale", name: "Scale", price: 59, blurb: "Unlimited seats, 250k runs, SSO" },
];

const defaultUsage: SettingsUsage[] = [
  { label: "Agent runs", used: 18420, limit: 25000, projected: 26300 },
  { label: "Seats", used: 5, limit: 10 },
  { label: "Storage", used: 43.6, limit: 50, unit: "GB" },
];

const defaultInvoices: SettingsInvoice[] = [
  { id: "INV-2026-0010", date: "Oct 14, 2026", amount: 120, status: "due" },
  { id: "INV-2026-0009", date: "Sep 14, 2026", amount: 120, status: "paid" },
  { id: "INV-2026-0008", date: "Aug 14, 2026", amount: 96, status: "failed" },
  { id: "INV-2026-0007", date: "Jul 14, 2026", amount: 96, status: "paid" },
];

const avatarHues = [
  "from-violet-400 to-indigo-500",
  "from-sky-300 to-blue-500",
  "from-teal-300 to-emerald-500",
  "from-amber-300 to-orange-500",
  "from-rose-300 to-pink-500",
  "from-indigo-400 to-violet-700",
];

const invoiceBadge: Record<SettingsInvoice["status"], { label: string; variant: "success" | "warning" | "error" }> = {
  paid: { label: "Paid", variant: "success" },
  due: { label: "Due", variant: "warning" },
  failed: { label: "Failed", variant: "error" },
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function mask(secret: string) {
  return `${secret.slice(0, 8)}…${secret.slice(-4)}`;
}

function makeSecret() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz0123456789";
  let out = "rl_test_";
  for (let i = 0; i < 24; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

const formatInt = (n: number) => Math.round(n).toLocaleString("en-US");
const formatMoney = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const formatCents = (n: number) => `$${n.toFixed(2)}`;

function RollingNumber({ value, format = formatInt }: { value: number; format?: (n: number) => string }) {
  const reduce = useReducedMotionAfterMount();
  const mv = useMotionValue(value);
  const text = useTransform(mv, format);
  useEffect(() => {
    if (reduce) {
      mv.set(value);
      return;
    }
    const controls = animate(mv, value, { duration: 0.45, ease: easeOut });
    return () => controls.stop();
  }, [value, reduce, mv]);
  return <motion.span className="tabular-nums">{text}</motion.span>;
}

function Collapse({ show, children }: { show: boolean; children: ReactNode }) {
  const reduce = useReducedMotionAfterMount();
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          animate={{ height: "auto", opacity: 1 }}
          className="overflow-hidden"
          exit={{ height: 0, opacity: 0 }}
          initial={{ height: 0, opacity: 0 }}
          transition={reduce ? { duration: 0 } : spring}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Swap({ id, children, className }: { id: string; children: ReactNode; className?: string }) {
  const reduce = useReducedMotionAfterMount();
  return (
    <AnimatePresence initial={false} mode="popLayout">
      <motion.span
        animate={{ opacity: 1, y: 0 }}
        className={cn("block", className)}
        exit={{ opacity: 0, y: reduce ? 0 : -3 }}
        initial={{ opacity: 0, y: reduce ? 0 : 3 }}
        key={id}
        transition={{ duration: 0.16, ease: easeOut }}
      >
        {children}
      </motion.span>
    </AnimatePresence>
  );
}

function Section({
  title,
  description,
  action,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="mt-10">
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-medium text-sm">{title}</h2>
          {description && <p className="mt-0.5 text-pretty text-muted-foreground text-sm">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Rows({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mt-3 divide-y overflow-hidden rounded-xl border bg-card", className)}>{children}</div>;
}

function Row({
  label,
  help,
  htmlFor,
  children,
  wide,
}: {
  label: ReactNode;
  help?: ReactNode;
  htmlFor?: string;
  children?: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5 px-4 py-3.5">
      <div className="min-w-0 flex-1 basis-44">
        {htmlFor ? (
          <Label className="font-medium text-sm" htmlFor={htmlFor}>
            {label}
          </Label>
        ) : (
          <p className="font-medium text-sm">{label}</p>
        )}
        {help && <div className="mt-0.5 text-pretty text-muted-foreground text-xs">{help}</div>}
      </div>
      {children && <div className={cn("flex shrink-0 items-center gap-2", wide && "w-full sm:w-64")}>{children}</div>}
    </div>
  );
}

function TableHeadRow({ className, children }: { className: string; children: ReactNode }) {
  return (
    <div className={cn("hidden items-center gap-4 bg-muted/30 px-4 py-2 font-medium text-muted-foreground text-xs sm:grid", className)}>
      {children}
    </div>
  );
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

type WorkspaceDraft = { name: string; slug: string; region: string };

function workspaceErrors(draft: WorkspaceDraft) {
  return {
    name: draft.name.trim() ? null : "Give your workspace a name.",
    slug: /^[a-z0-9](?:[a-z0-9-]{1,30})[a-z0-9]$/.test(draft.slug) ? null : "Use 3–32 letters, numbers or dashes.",
  };
}

function FieldError({ id, children }: { id: string; children: string | null }) {
  return (
    <Collapse show={Boolean(children)}>
      <p className="pt-1.5 text-destructive-foreground text-xs" id={id}>
        {children}
      </p>
    </Collapse>
  );
}

function WorkspaceMark({ name, className }: { name: string; className?: string }) {
  const reduce = useReducedMotionAfterMount();
  const text = initials(name || "?");
  return (
    <span className={cn("relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-foreground font-semibold text-background text-xs", className)}>
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reduce ? 0 : -8 }}
          initial={{ opacity: 0, y: reduce ? 0 : 8 }}
          key={text}
          transition={{ duration: 0.18, ease: easeOut }}
        >
          {text}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function WorkspacePanel({
  draft,
  setDraft,
  savedSlug,
  domain,
}: {
  draft: WorkspaceDraft;
  setDraft: (fn: (d: WorkspaceDraft) => WorkspaceDraft) => void;
  savedSlug: string;
  domain: string;
}) {
  const [prefs, setPrefs] = useState({ agents: true, sso: false, digest: true });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [scheduled, setScheduled] = useState(false);
  const errors = workspaceErrors(draft);
  const ids = useId();

  return (
    <>
      <Section description="Shown in the switcher, in emails and on shared links." title="Workspace">
        <Rows>
          <Row help="Square image, at least 128px. Initials until you add one." label="Logo">
            <WorkspaceMark name={draft.name} />
            <Button className={press} size="sm" variant="outline">
              Upload
            </Button>
          </Row>
          <Row htmlFor={`${ids}-name`} label="Name" wide>
            <div className="w-full">
              <Input
                aria-describedby={errors.name ? `${ids}-name-error` : undefined}
                aria-invalid={Boolean(errors.name) || undefined}
                id={`${ids}-name`}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                value={draft.name}
              />
              <FieldError id={`${ids}-name-error`}>{errors.name}</FieldError>
            </div>
          </Row>
          <Row help="Changing it breaks links people have saved." htmlFor={`${ids}-slug`} label="URL" wide>
            <div className="w-full">
              <InputGroup>
                <InputGroupAddon>
                  <InputGroupText>{domain}/</InputGroupText>
                </InputGroupAddon>
                <InputGroupInput
                  aria-describedby={errors.slug ? `${ids}-slug-error` : undefined}
                  aria-invalid={Boolean(errors.slug) || undefined}
                  id={`${ids}-slug`}
                  onChange={(e) => setDraft((d) => ({ ...d, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") }))}
                  value={draft.slug}
                />
              </InputGroup>
              <FieldError id={`${ids}-slug-error`}>{errors.slug}</FieldError>
            </div>
          </Row>
          <Row help="Moving copies your data and takes about an hour." label="Data region" wide>
            <Select items={regions} onValueChange={(v) => v && setDraft((d) => ({ ...d, region: v as string }))} value={draft.region}>
              <SelectTrigger aria-label="Data region" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectPopup>
                {regions.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectPopup>
            </Select>
          </Row>
        </Rows>
      </Section>

      <Section description="Defaults that apply to everyone in the workspace." title="Preferences">
        <Rows>
          {(
            [
              ["agents", "Members can create agents", "Otherwise only admins can publish new agents."],
              ["sso", "Require single sign-on", "Everyone signs in through your identity provider."],
              ["digest", "Weekly digest", "A Monday summary of runs, spend and failures."],
            ] as const
          ).map(([key, label, hint]) => (
            <label className="flex cursor-pointer items-center gap-4 px-4 py-3.5" key={key}>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="font-medium text-sm">{label}</span>
                <span className="text-pretty text-muted-foreground text-xs">{hint}</span>
              </span>
              <Switch checked={prefs[key]} onCheckedChange={(v) => setPrefs((p) => ({ ...p, [key]: v }))} />
            </label>
          ))}
        </Rows>
      </Section>

      <Section title="Danger zone">
        <Rows className="border-destructive/24">
          <Row
            help={
              <Swap id={scheduled ? "scheduled" : "idle"}>
                {scheduled ? (
                  <span className="text-destructive-foreground">Scheduled for Nov 3. Everyone keeps access until then.</span>
                ) : (
                  "Removes projects, runs and keys after a 7-day grace period."
                )}
              </Swap>
            }
            label="Delete workspace"
          >
            {scheduled ? (
              <Button className={press} onClick={() => setScheduled(false)} size="sm" variant="outline">
                Cancel deletion
              </Button>
            ) : (
              <Button
                className={press}
                onClick={() => {
                  setTyped("");
                  setConfirmOpen(true);
                }}
                size="sm"
                variant="destructive-outline"
              >
                Delete…
              </Button>
            )}
          </Row>
        </Rows>
      </Section>

      <AlertDialog onOpenChange={setConfirmOpen} open={confirmOpen}>
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {draft.name || "this workspace"}?</AlertDialogTitle>
            <AlertDialogDescription>
              Projects, runs and API keys are removed after 7 days. You can cancel any time before then.
            </AlertDialogDescription>
            <div className="mt-2 flex flex-col gap-2">
              <Label htmlFor={`${ids}-confirm`}>
                Type <span className="font-mono">{savedSlug}</span> to confirm
              </Label>
              <Input autoComplete="off" className="font-mono" id={`${ids}-confirm`} onChange={(e) => setTyped(e.target.value)} value={typed} />
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="ghost" />}>Cancel</AlertDialogClose>
            <AlertDialogClose
              disabled={typed !== savedSlug}
              render={<Button disabled={typed !== savedSlug} onClick={() => setScheduled(true)} variant="destructive" />}
            >
              Delete workspace
            </AlertDialogClose>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </>
  );
}

function RoleSelect({ member, onRole }: { member: SettingsMember; onRole: (id: string, role: MemberRole) => void }) {
  if (member.role === "owner") return <span className="inline-flex h-7 items-center px-2.5 text-muted-foreground text-sm">Owner</span>;
  return (
    <Select
      items={roleItems.slice(1).map((r) => ({ value: r.value, label: r.label }))}
      onValueChange={(v) => v && onRole(member.id, v as MemberRole)}
      value={member.role}
    >
      <SelectTrigger aria-label={`Role for ${member.name}`} className="w-32 min-w-0" size="sm">
        <SelectValue />
      </SelectTrigger>
      <SelectPopup alignItemWithTrigger={false} className="w-60">
        {roleItems.slice(1).map((r) => (
          <SelectItem className="items-start py-1.5 [&>span:first-child]:mt-0.5" key={r.value} value={r.value}>
            <span className="flex flex-col">
              <span className="font-medium">{r.label}</span>
              <span className="text-muted-foreground text-xs">{r.hint}</span>
            </span>
          </SelectItem>
        ))}
      </SelectPopup>
    </Select>
  );
}

const memberGrid = "sm:grid-cols-[minmax(0,1fr)_8rem_6.5rem_2rem]";

function MembersPanel({ initial, seatLimit }: { initial: SettingsMember[]; seatLimit: number }) {
  const [members, setMembers] = useState(() => initial.map((m, i) => ({ ...m, hue: avatarHues[i % avatarHues.length] })));
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MemberRole>("member");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [removing, setRemoving] = useState<SettingsMember | null>(null);
  const reduce = useReducedMotionAfterMount();
  const hintId = useId();
  const full = members.length >= seatLimit;

  useEffect(() => {
    if (!sending) return;
    const address = sending;
    const t = setTimeout(() => {
      const name = address
        .split("@")[0]
        .split(/[._-]/)
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(" ");
      setMembers((m) => [
        ...m,
        { id: `m-${address}`, name, email: address, role, lastActive: "Invite sent", invited: true, hue: avatarHues[m.length % avatarHues.length] },
      ]);
      setSending(null);
      setNotice(`Invite sent to ${address}.`);
      setEmail("");
    }, 700);
    return () => clearTimeout(t);
  }, [sending, role]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 2600);
    return () => clearTimeout(t);
  }, [notice]);

  const invite = () => {
    const address = email.trim().toLowerCase();
    if (!address) return setError("Enter an email address to send an invite.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(address)) return setError("That doesn't look like a full email address.");
    if (members.some((m) => m.email.toLowerCase() === address)) return setError(`${address} is already in this workspace.`);
    if (full) return setError(`All ${seatLimit} seats are in use. Remove someone or upgrade to add more.`);
    setError(null);
    setNotice(null);
    setSending(address);
  };

  const hint = error
    ? { key: `e-${error}`, tone: "text-destructive-foreground", text: error }
    : notice
      ? { key: `n-${notice}`, tone: "text-success-foreground", text: notice }
      : { key: "idle", tone: "text-muted-foreground", text: "Invites expire after 7 days. Resend them from the list." };

  const setRoleFor = (id: string, next: MemberRole) => setMembers((all) => all.map((x) => (x.id === id ? { ...x, role: next } : x)));

  return (
    <>
      <Section
        description={
          <>
            <span className="tabular-nums">
              <RollingNumber value={members.length} /> of {seatLimit}
            </span>{" "}
            seats used.
          </>
        }
        title="Invite people"
      >
        <Rows>
          <form
            className="flex flex-col gap-2 p-3 sm:flex-row"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              invite();
            }}
          >
            <Input
              aria-describedby={hintId}
              aria-invalid={Boolean(error) || undefined}
              aria-label="Email address"
              className="flex-1"
              disabled={Boolean(sending)}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError(null);
              }}
              placeholder="name@company.com"
              type="email"
              value={email}
            />
            <div className="flex gap-2">
              <Select
                items={roleItems.slice(1).map((r) => ({ value: r.value, label: r.label }))}
                onValueChange={(v) => v && setRole(v as MemberRole)}
                value={role}
              >
                <SelectTrigger aria-label="Role for invite" className="w-28 min-w-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectPopup>
                  {roleItems.slice(1).map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
              <Button className={cn(press, "flex-1 sm:flex-none")} loading={Boolean(sending)} type="submit">
                <MailIcon />
                Invite
              </Button>
            </div>
          </form>
        </Rows>
        <div aria-live="polite" className="mt-2 min-h-4 px-1 text-xs" id={hintId}>
          <Swap className={cn("text-pretty", hint.tone)} id={hint.key}>
            {hint.text}
          </Swap>
        </div>
      </Section>

      <Section description={`${members.length} people, including pending invites.`} title="Members">
        <Rows>
          <TableHeadRow className={memberGrid}>
            <span>Member</span>
            <span>Role</span>
            <span>Last active</span>
            <span className="sr-only">Actions</span>
          </TableHeadRow>
          <AnimatePresence initial={false}>
            {members.map((m) => (
              <motion.div
                animate={{ opacity: 1, height: "auto" }}
                className="overflow-hidden"
                exit={{ opacity: 0, height: 0 }}
                initial={reduce ? false : { opacity: 0, height: 0 }}
                key={m.id}
                transition={reduce ? { duration: 0 } : spring}
              >
                <div className={cn("grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-4 py-3 sm:gap-x-4", memberGrid)}>
                  <div className="col-start-1 row-start-1 flex min-w-0 items-center gap-3">
                    <Avatar className="size-8">
                      <AvatarFallback className={cn("bg-gradient-to-br font-medium text-white text-xs", m.hue)}>{initials(m.name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="flex min-w-0 items-center gap-2 font-medium text-sm">
                        <span className="truncate">{m.name}</span>
                        {m.invited && (
                          <Badge size="sm" variant="info">
                            Invited
                          </Badge>
                        )}
                      </p>
                      <p className="truncate text-muted-foreground text-xs">{m.email}</p>
                    </div>
                  </div>
                  <div className="col-start-1 row-start-2 ps-11 sm:col-start-2 sm:row-start-1 sm:ps-0">
                    <RoleSelect member={m} onRole={setRoleFor} />
                  </div>
                  <span className="col-start-2 row-start-2 truncate text-right text-muted-foreground text-xs sm:col-start-3 sm:row-start-1 sm:text-left sm:text-sm">
                    {m.lastActive}
                  </span>
                  <div className="col-start-2 row-start-1 flex justify-end sm:col-start-4">
                    {m.role === "owner" ? (
                      <span aria-hidden className="size-8 sm:size-7" />
                    ) : (
                      <Menu>
                        <MenuTrigger render={<Button aria-label={`Actions for ${m.name}`} size="icon-sm" variant="ghost" />}>
                          <EllipsisIcon />
                        </MenuTrigger>
                        <MenuPopup align="end">
                          {m.invited && <MenuItem onClick={() => setNotice(`Invite resent to ${m.email}.`)}>Resend invite</MenuItem>}
                          <MenuItem
                            onClick={() => {
                              navigator.clipboard?.writeText(m.email).catch(() => {});
                              setNotice(`Copied ${m.email}.`);
                            }}
                          >
                            <CopyIcon />
                            Copy email
                          </MenuItem>
                          <MenuSeparator />
                          <MenuItem onClick={() => setRemoving(m)} variant="destructive">
                            <Trash2Icon />
                            {m.invited ? "Revoke invite" : "Remove from workspace"}
                          </MenuItem>
                        </MenuPopup>
                      </Menu>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </Rows>
      </Section>

      <AlertDialog onOpenChange={(open) => !open && setRemoving(null)} open={Boolean(removing)}>
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>{removing?.invited ? `Revoke the invite for ${removing.email}?` : `Remove ${removing?.name}?`}</AlertDialogTitle>
            <AlertDialogDescription>
              {removing?.invited
                ? "The link in their email stops working straight away."
                : "They lose access straight away and their seat frees up. Projects they made stay put."}
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
                    setNotice(target.invited ? `Invite for ${target.email} revoked.` : `${target.name} removed.`);
                  }}
                  variant="destructive"
                />
              }
            >
              {removing?.invited ? "Revoke invite" : "Remove"}
            </AlertDialogClose>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </>
  );
}

const keyGrid = "sm:grid-cols-[minmax(0,1fr)_6.5rem_6.5rem_2rem]";

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);
  return (
    <Button
      className={cn(press, "min-w-21")}
      onClick={() => {
        navigator.clipboard?.writeText(text).catch(() => {});
        setCopied(true);
      }}
      size="sm"
      variant="outline"
    >
      <Swap className="inline-flex" id={copied ? "y" : "n"}>
        {copied ? <CheckIcon className="size-3.5 text-success-foreground" /> : <CopyIcon className="size-3.5" />}
      </Swap>
      {copied ? "Copied" : label}
    </Button>
  );
}

function KeysPanel({ initial }: { initial: SettingsApiKey[] }) {
  const [keys, setKeys] = useState(initial);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [scope, setScope] = useState<KeyScope>("read");
  const [fresh, setFresh] = useState<SettingsApiKey | null>(null);
  const [revealed, setRevealed] = useState<string[]>([]);
  const [revoking, setRevoking] = useState<SettingsApiKey | null>(null);
  const reduce = useReducedMotionAfterMount();
  const ids = useId();

  const create = () => {
    if (!name.trim()) return;
    const key: SettingsApiKey = {
      id: `k-${keys.length}-${name.trim()}`,
      name: name.trim(),
      secret: makeSecret(),
      scope,
      created: "Just now",
      lastUsed: "Never",
    };
    setFresh(key);
    setKeys((k) => [key, ...k]);
    setCreating(false);
    setName("");
    setScope("read");
  };

  return (
    <>
      <Section
        action={
          <Button className={press} disabled={creating || Boolean(fresh)} onClick={() => setCreating(true)} size="sm">
            <PlusIcon />
            Create key
          </Button>
        }
        description="Keys act as the workspace. Keep them out of client-side code."
        title="Secret keys"
      >
        <Rows>
          <Collapse show={creating}>
            <form
              className="flex flex-col gap-4 bg-muted/30 p-4"
              onKeyDown={(e) => e.key === "Escape" && setCreating(false)}
              onSubmit={(e) => {
                e.preventDefault();
                create();
              }}
            >
              <div className="flex flex-col gap-2">
                <Label htmlFor={`${ids}-name`}>Name</Label>
                <Input autoFocus id={`${ids}-name`} onChange={(e) => setName(e.target.value)} placeholder="e.g. Staging worker" value={name} />
              </div>
              <div className="flex flex-col gap-2">
                <span className="font-medium text-sm" id={`${ids}-scope`}>
                  Scope
                </span>
                <div aria-labelledby={`${ids}-scope`} className="grid gap-2 sm:grid-cols-3" role="radiogroup">
                  {scopeItems.map((s) => {
                    const on = scope === s.value;
                    return (
                      <button
                        aria-checked={on}
                        className={cn(
                          "relative flex cursor-pointer flex-col items-start gap-0.5 rounded-lg border bg-background px-3 py-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          press,
                          !on && "hover:bg-accent/60",
                        )}
                        key={s.value}
                        onClick={() => setScope(s.value)}
                        role="radio"
                        type="button"
                      >
                        {on && (
                          <motion.span
                            className="absolute -inset-px rounded-lg border-2 border-foreground"
                            layoutId={`${ids}-ring`}
                            transition={reduce ? { duration: 0 } : spring}
                          />
                        )}
                        <span className="font-medium text-sm">{s.label}</span>
                        <span className="text-muted-foreground text-xs">{s.hint}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button className={press} onClick={() => setCreating(false)} size="sm" variant="ghost">
                  Cancel
                </Button>
                <Button className={press} disabled={!name.trim()} size="sm" type="submit">
                  Create key
                </Button>
              </div>
            </form>
          </Collapse>
          <Collapse show={Boolean(fresh)}>
            {fresh && (
              <div className="flex flex-col gap-3 bg-success/6 p-4">
                <p className="flex items-start gap-2 text-sm">
                  <CheckIcon className="mt-0.5 size-4 shrink-0 text-success-foreground" />
                  <span className="text-pretty">
                    <span className="font-medium">{fresh.name}</span> is ready. Copy it now: you won't see it again.
                  </span>
                </p>
                <div className="flex items-center gap-2 rounded-lg border bg-background p-1 ps-3">
                  <code className="min-w-0 flex-1 truncate font-mono text-xs">{fresh.secret}</code>
                  <CopyButton text={fresh.secret} />
                </div>
                <Button className={cn(press, "self-end")} onClick={() => setFresh(null)} size="sm">
                  I've saved it
                </Button>
              </div>
            )}
          </Collapse>
          <TableHeadRow className={keyGrid}>
            <span>Name</span>
            <span>Scope</span>
            <span>Last used</span>
            <span className="sr-only">Actions</span>
          </TableHeadRow>
          <AnimatePresence initial={false}>
            {keys.map((k) => {
              const show = revealed.includes(k.id) && k.id !== fresh?.id;
              return (
                <motion.div
                  animate={{ opacity: 1, height: "auto" }}
                  className="overflow-hidden"
                  exit={{ opacity: 0, height: 0 }}
                  initial={reduce ? false : { opacity: 0, height: 0 }}
                  key={k.id}
                  transition={reduce ? { duration: 0 } : spring}
                >
                  <div className={cn("grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 px-4 py-3 sm:gap-x-4", keyGrid)}>
                    <div className="col-start-1 row-start-1 min-w-0">
                      <p className="truncate font-medium text-sm">{k.name}</p>
                      <code className="block truncate font-mono text-muted-foreground text-xs">{show ? k.secret : mask(k.secret)}</code>
                    </div>
                    <div className="col-start-1 row-start-2 flex items-center gap-2 sm:col-start-2 sm:row-start-1">
                      <Badge size="sm" variant={k.scope === "admin" ? "warning" : k.scope === "write" ? "info" : "secondary"}>
                        {scopeItems.find((s) => s.value === k.scope)?.label}
                      </Badge>
                      <span className="text-muted-foreground text-xs sm:hidden">
                        {/^never$/i.test(k.lastUsed) ? "Never used" : `Used ${k.lastUsed}`}
                      </span>
                    </div>
                    <span className="hidden truncate text-muted-foreground text-sm sm:col-start-3 sm:row-start-1 sm:block">{k.lastUsed}</span>
                    <div className="col-start-2 row-start-1 flex justify-end sm:col-start-4">
                      <Menu>
                        <MenuTrigger render={<Button aria-label={`Actions for ${k.name}`} size="icon-sm" variant="ghost" />}>
                          <EllipsisIcon />
                        </MenuTrigger>
                        <MenuPopup align="end">
                          <MenuItem
                            disabled={k.id === fresh?.id}
                            onClick={() => setRevealed((r) => (r.includes(k.id) ? r.filter((x) => x !== k.id) : [...r, k.id]))}
                          >
                            {show ? <EyeOffIcon /> : <EyeIcon />}
                            {show ? "Hide key" : "Reveal key"}
                          </MenuItem>
                          <MenuItem onClick={() => navigator.clipboard?.writeText(k.secret).catch(() => {})}>
                            <CopyIcon />
                            Copy key
                          </MenuItem>
                          <MenuSeparator />
                          <MenuItem onClick={() => setRevoking(k)} variant="destructive">
                            <Trash2Icon />
                            Revoke
                          </MenuItem>
                        </MenuPopup>
                      </Menu>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {keys.length === 0 && (
            <div className="flex flex-col items-center gap-1 px-4 py-10 text-center">
              <KeyRoundIcon className="size-4 text-muted-foreground" />
              <p className="font-medium text-sm">No keys yet</p>
              <p className="text-muted-foreground text-xs">Create one for your server or CI.</p>
            </div>
          )}
        </Rows>
      </Section>

      <AlertDialog onOpenChange={(open) => !open && setRevoking(null)} open={Boolean(revoking)}>
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke {revoking?.name}?</AlertDialogTitle>
            <AlertDialogDescription>Anything still using this key starts getting 401s immediately. This can't be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="ghost" />}>Keep key</AlertDialogClose>
            <AlertDialogClose
              render={
                <Button
                  onClick={() => {
                    if (!revoking) return;
                    const target = revoking;
                    setKeys((all) => all.filter((x) => x.id !== target.id));
                    if (fresh?.id === target.id) setFresh(null);
                  }}
                  variant="destructive"
                />
              }
            >
              Revoke key
            </AlertDialogClose>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </>
  );
}

function UsageRow({ item, shown }: { item: SettingsUsage; shown: boolean }) {
  const reduce = useReducedMotionAfterMount();
  const pct = Math.min(100, (item.used / item.limit) * 100);
  const projPct = item.projected ? Math.min(100, (item.projected / item.limit) * 100) : 0;
  const over = (item.projected ?? 0) > item.limit;
  const fmt = item.unit ? (n: number) => n.toFixed(1) : formatInt;
  const fill = { duration: reduce ? 0 : 0.6, ease: easeOut };
  return (
    <div className="flex flex-col gap-2.5 px-4 py-3.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-medium text-sm">{item.label}</span>
        <span className="text-sm tabular-nums">
          <RollingNumber format={fmt} value={shown ? item.used : 0} />
          <span className="text-muted-foreground">
            {" "}
            / {item.limit.toLocaleString("en-US")}
            {item.unit ? ` ${item.unit}` : ""}
          </span>
        </span>
      </div>
      <div
        aria-label={item.label}
        aria-valuemax={item.limit}
        aria-valuemin={0}
        aria-valuenow={item.used}
        className="relative h-1.5 overflow-hidden rounded-full bg-muted"
        role="meter"
      >
        {projPct > pct && (
          <motion.div
            animate={{ scaleX: shown ? 1 : 0 }}
            className={cn("absolute inset-y-0 left-0 origin-left rounded-full", over ? "bg-warning/32" : "bg-foreground/12")}
            initial={false}
            style={{ width: `${projPct}%` }}
            transition={{ ...fill, delay: reduce ? 0 : 0.15 }}
          />
        )}
        <motion.div
          animate={{ scaleX: shown ? 1 : 0 }}
          className={cn("absolute inset-y-0 left-0 origin-left rounded-full", pct >= 85 ? "bg-warning" : "bg-foreground")}
          initial={false}
          style={{ width: `${pct}%` }}
          transition={fill}
        />
      </div>
    </div>
  );
}

function BillingPanel({
  active,
  plans,
  current,
  renewsOn,
  seats,
  usage,
  invoices: initialInvoices,
  card,
  daysLeft,
  overagePer1k,
}: {
  active: boolean;
  plans: SettingsPlan[];
  current: string;
  renewsOn: string;
  seats: number;
  usage: SettingsUsage[];
  invoices: SettingsInvoice[];
  card: SettingsCard;
  daysLeft: number;
  overagePer1k: number;
}) {
  const [planId, setPlanId] = useState(current);
  const [picking, setPicking] = useState(false);
  const [choice, setChoice] = useState(current);
  const [switching, setSwitching] = useState(false);
  const [invoices, setInvoices] = useState(initialInvoices);
  const [retrying, setRetrying] = useState(false);
  const [recovered, setRecovered] = useState<SettingsInvoice | null>(null);
  const [hasOpened, setHasOpened] = useState(active);
  const reduce = useReducedMotionAfterMount();
  const pickerId = useId();
  const plan = plans.find((p) => p.id === planId) ?? plans[0];
  const failed = invoices.find((i) => i.status === "failed");
  const runs = usage.find((u) => u.projected !== undefined);
  const overRuns = runs?.projected ? Math.max(0, runs.projected - runs.limit) : 0;

  useEffect(() => {
    if (active) setHasOpened(true);
  }, [active]);

  useEffect(() => {
    if (!switching) return;
    const t = setTimeout(() => {
      setPlanId(choice);
      setSwitching(false);
      setPicking(false);
    }, 650);
    return () => clearTimeout(t);
  }, [switching, choice]);

  useEffect(() => {
    if (!retrying || !failed) return;
    const t = setTimeout(() => {
      setInvoices((all) => all.map((i) => (i.id === failed.id ? { ...i, status: "paid" } : i)));
      setRecovered(failed);
      setRetrying(false);
    }, 900);
    return () => clearTimeout(t);
  }, [retrying, failed]);

  useEffect(() => {
    if (!recovered) return;
    const t = setTimeout(() => setRecovered(null), 2800);
    return () => clearTimeout(t);
  }, [recovered]);

  const banner = failed ? { key: "failed" as const, invoice: failed } : recovered ? { key: "recovered" as const, invoice: recovered } : null;

  return (
    <>
      <Collapse show={Boolean(banner)}>
        {banner && (
          <div className="pt-8">
            <Alert variant={banner.key === "failed" ? "error" : "success"}>
              {banner.key === "failed" ? <AlertTriangleIcon /> : <CheckIcon />}
              <AlertTitle>
                {banner.key === "failed" ? `The ${banner.invoice.date.replace(/, \d{4}$/, "")} payment didn't go through` : "Payment received"}
              </AlertTitle>
              <AlertDescription>
                <p className="text-pretty">
                  {banner.key === "failed" ? (
                    <>
                      <span className="tabular-nums">{formatCents(banner.invoice.amount)}</span> on the card ending{" "}
                      <span className="tabular-nums">{card.last4}</span> was declined.
                    </>
                  ) : (
                    <>
                      <span className="font-mono">{banner.invoice.id}</span> is paid. A receipt is on its way to {card.email ?? "your billing email"}.
                    </>
                  )}
                </p>
              </AlertDescription>
              {banner.key === "failed" && (
                <AlertAction>
                  <Button className={press} loading={retrying} onClick={() => setRetrying(true)} size="sm" variant="outline">
                    Retry payment
                  </Button>
                </AlertAction>
              )}
            </Alert>
          </div>
        )}
      </Collapse>

      <Section title="Plan">
        <Rows>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4">
            <div className="min-w-0 flex-1 basis-44">
              <p className="flex items-center gap-2">
                <span className="font-semibold text-base tracking-tight">{plan.name}</span>
                <Badge size="sm" variant="secondary">
                  Current
                </Badge>
              </p>
              <p className="mt-0.5 text-muted-foreground text-xs">
                <RollingNumber format={formatMoney} value={plan.price} /> per seat / month · {plan.blurb}
              </p>
            </div>
            {!picking && (
              <Button
                className={press}
                onClick={() => {
                  setChoice(plans[Math.min(plans.length - 1, plans.findIndex((p) => p.id === planId) + 1)].id);
                  setPicking(true);
                }}
                size="sm"
                variant="outline"
              >
                Change plan
              </Button>
            )}
          </div>
          <Collapse show={picking}>
            <div className="flex flex-col gap-3 bg-muted/30 p-4">
              <div aria-label="Choose a plan" className="grid gap-2 sm:grid-cols-3" role="radiogroup">
                {plans.map((p) => {
                  const on = choice === p.id;
                  return (
                    <button
                      aria-checked={on}
                      className={cn(
                        "relative flex cursor-pointer flex-col items-start gap-1 rounded-lg border bg-background p-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        press,
                        !on && "hover:bg-accent/60",
                      )}
                      key={p.id}
                      onClick={() => setChoice(p.id)}
                      role="radio"
                      type="button"
                    >
                      {on && (
                        <motion.span
                          className="absolute -inset-px rounded-lg border-2 border-foreground"
                          layoutId={`${pickerId}-ring`}
                          transition={reduce ? { duration: 0 } : spring}
                        />
                      )}
                      <span className="flex w-full items-center justify-between gap-2 font-medium text-sm">
                        {p.name}
                        {p.id === planId && <span className="font-normal text-muted-foreground text-xs">Current</span>}
                      </span>
                      <span className="font-medium text-sm tabular-nums">
                        ${p.price}
                        <span className="font-normal text-muted-foreground text-xs"> / seat</span>
                      </span>
                      <span className="text-pretty text-muted-foreground text-xs">{p.blurb}</span>
                    </button>
                  );
                })}
              </div>
              <div className="flex justify-end gap-2">
                <Button className={press} disabled={switching} onClick={() => setPicking(false)} size="sm" variant="ghost">
                  Cancel
                </Button>
                <Button className={cn(press, "min-w-32")} disabled={choice === planId} loading={switching} onClick={() => setSwitching(true)} size="sm">
                  Switch to {plans.find((p) => p.id === choice)?.name}
                </Button>
              </div>
            </div>
          </Collapse>
          <Row
            help={
              <>
                {seats} seats × <RollingNumber format={formatMoney} value={plan.price} />, charged {renewsOn}
              </>
            }
            label="Next invoice"
          >
            <span className="font-medium text-sm">
              <RollingNumber format={formatCents} value={plan.price * seats} />
            </span>
          </Row>
        </Rows>
      </Section>

      <Section
        description={
          <>
            Resets {renewsOn}, <span className="tabular-nums">{daysLeft}</span> days from now.
          </>
        }
        title="Usage this cycle"
      >
        <Rows>
          {usage.map((u) => (
            <UsageRow item={u} key={u.label} shown={hasOpened || reduce} />
          ))}
          {runs?.projected !== undefined && (
            <div className="grid grid-cols-2 divide-x bg-muted/30">
              <div className="px-4 py-3">
                <p className="text-muted-foreground text-xs">Projected by {renewsOn}</p>
                <p className="mt-0.5 font-medium text-sm tabular-nums">
                  {formatInt(runs.projected)} <span className="font-normal text-muted-foreground text-xs">runs</span>
                </p>
              </div>
              <div className="px-4 py-3">
                <p className="text-muted-foreground text-xs">Estimated overage</p>
                <p className={cn("mt-0.5 font-medium text-sm tabular-nums", overRuns > 0 && "text-warning-foreground")}>
                  {formatCents((overRuns / 1000) * overagePer1k)}
                  <span className="font-normal text-muted-foreground text-xs"> at ${overagePer1k} / 1k</span>
                </p>
              </div>
            </div>
          )}
        </Rows>
      </Section>

      <Section title="Payment method">
        <Rows>
          <div className="flex items-center gap-3 px-4 py-3.5">
            <span className="flex h-8 w-11 shrink-0 items-center justify-center rounded-md border bg-muted/50">
              <CreditCardIcon className="size-4 text-muted-foreground" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-sm">
                {card.brand ?? "Card"} ending <span className="tabular-nums">{card.last4}</span>
              </p>
              <p className="truncate text-muted-foreground text-xs">
                Expires <span className="tabular-nums">{card.expires}</span> · {card.holder}
              </p>
            </div>
            <Button className={press} size="sm" variant="outline">
              Replace
            </Button>
          </div>
          {card.email && (
            <Row help={card.email} label="Billing email">
              <Button className={press} size="sm" variant="outline">
                Edit
              </Button>
            </Row>
          )}
        </Rows>
      </Section>

      <Section description={card.email ? `Sent to ${card.email} when they're issued.` : undefined} title="Invoices">
        <Rows>
          <TableHeadRow className="sm:grid-cols-[minmax(0,1fr)_7rem_4.5rem_5rem_2rem]">
            <span>Invoice</span>
            <span>Date</span>
            <span>Status</span>
            <span className="text-right">Amount</span>
            <span className="sr-only">Download</span>
          </TableHeadRow>
          {invoices.length === 0 && (
            <p className="px-4 py-10 text-center text-muted-foreground text-xs">No invoices yet. The first one arrives on {renewsOn}.</p>
          )}
          {invoices.map((inv) => (
            <div
              className="grid grid-cols-[minmax(0,1fr)_auto_auto_2rem] items-center gap-3 px-4 py-2.5 sm:grid-cols-[minmax(0,1fr)_7rem_4.5rem_5rem_2rem] sm:gap-4"
              key={inv.id}
            >
              <div className="min-w-0">
                <p className="truncate font-mono text-xs">{inv.id}</p>
                <p className="truncate text-muted-foreground text-xs sm:hidden">{inv.date}</p>
              </div>
              <span className="hidden text-muted-foreground text-sm sm:block">{inv.date}</span>
              <span>
                <Swap id={inv.status}>
                  <Badge variant={invoiceBadge[inv.status].variant}>{invoiceBadge[inv.status].label}</Badge>
                </Swap>
              </span>
              <span className="text-right text-sm tabular-nums">{formatCents(inv.amount)}</span>
              <Button aria-label={`Download ${inv.id}`} size="icon-sm" variant="ghost">
                <DownloadIcon />
              </Button>
            </div>
          ))}
        </Rows>
      </Section>
    </>
  );
}

export function SettingsAndPlans({
  className,
  defaultTab = "workspace",
  workspace = { name: "Ridgeline", slug: "ridgeline", region: "eu-central" },
  members = defaultMembers,
  apiKeys = defaultKeys,
  plans = defaultPlans,
  currentPlan = "team",
  renewsOn = "Nov 14",
  usage = defaultUsage,
  invoices = defaultInvoices,
  cycleDaysLeft = 18,
  overagePer1k = 4,
  card = { brand: "Visa", last4: "4417", expires: "09/28", holder: "Ada Lindqvist", email: "billing@ridgeline.app" },
  domain = "ridgeline.app",
  onNavigate,
}: SettingsAndPlansProps) {
  const [tab, setTab] = useState<SettingsTab>(defaultTab);
  const [saved, setSaved] = useState(workspace);
  const [draft, setDraft] = useState(workspace);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotionAfterMount();
  const seatLimit = usage.find((u) => u.label === "Seats")?.limit ?? 10;
  const copy = tabCopy[tab];
  const errors = workspaceErrors(draft);
  const blocker = errors.name ?? errors.slug;
  const dirty = draft.name !== saved.name || draft.slug !== saved.slug || draft.region !== saved.region;
  const barVisible = tab === "workspace" && (dirty || justSaved);

  useEffect(() => {
    if (!saving) return;
    const t = setTimeout(() => {
      setSaving(false);
      setSaved(draft);
      setJustSaved(true);
    }, 600);
    return () => clearTimeout(t);
  }, [saving, draft]);

  useEffect(() => {
    if (!justSaved) return;
    const t = setTimeout(() => setJustSaved(false), 1600);
    return () => clearTimeout(t);
  }, [justSaved]);

  const select = (id: SettingsSectionId) => {
    onNavigate?.(id);
    const next = tabForNav[id];
    if (!next || next === tab) return;
    setTab(next);
    scrollRef.current?.parentElement?.scrollTo({ top: 0 });
  };

  return (
    <RidgelineShell active={navForTab[tab]} className={className} onNavigate={select}>
      <div className="relative flex min-h-full flex-col" ref={scrollRef}>
        <div className="mx-auto w-full max-w-2xl flex-1 px-6 pt-10 pb-24 md:px-10">
          <Swap id={tab}>
            <h1 className="text-balance font-semibold text-2xl tracking-tight">{copy.title}</h1>
            <p className="mt-1 text-pretty text-muted-foreground text-sm">{copy.description}</p>
          </Swap>
          {tabOrder.map((t) => (
            <motion.div
              animate={tab === t ? { opacity: 1, y: 0 } : { opacity: 0, y: reduce ? 0 : 6 }}
              className={cn(tab !== t && "hidden")}
              initial={false}
              key={t}
              role="region"
              aria-label={tabCopy[t].title}
              transition={{ duration: 0.2, ease: easeOut }}
            >
              {t === "workspace" && <WorkspacePanel domain={domain} draft={draft} savedSlug={saved.slug} setDraft={setDraft} />}
              {t === "members" && <MembersPanel initial={members} seatLimit={seatLimit} />}
              {t === "keys" && <KeysPanel initial={apiKeys} />}
              {t === "billing" && (
                <BillingPanel
                  active={tab === "billing"}
                  card={card}
                  current={currentPlan}
                  daysLeft={cycleDaysLeft}
                  invoices={invoices}
                  overagePer1k={overagePer1k}
                  plans={plans}
                  renewsOn={renewsOn}
                  seats={members.length}
                  usage={usage}
                />
              )}
            </motion.div>
          ))}
        </div>
        <AnimatePresence>
          {barVisible && (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="pointer-events-none sticky bottom-4 z-20 -mt-16 flex justify-center px-4 md:px-6"
              exit={{ opacity: 0, y: reduce ? 0 : 16 }}
              initial={{ opacity: 0, y: reduce ? 0 : 24 }}
              transition={reduce ? { duration: 0.15 } : { type: "spring", stiffness: 480, damping: 34 }}
            >
              <div className="pointer-events-auto flex min-h-12 w-full max-w-xl items-center gap-2 rounded-xl border bg-popover py-2 ps-4 pe-2 shadow-lg/5">
                <AnimatePresence initial={false} mode="popLayout">
                  {justSaved && !dirty ? (
                    <motion.span
                      animate={{ opacity: 1, y: 0 }}
                      aria-live="polite"
                      className="flex min-h-8 flex-1 items-center gap-2 font-medium text-sm"
                      exit={{ opacity: 0, y: reduce ? 0 : -6 }}
                      initial={{ opacity: 0, y: reduce ? 0 : 6 }}
                      key="saved"
                      transition={{ duration: 0.18, ease: easeOut }}
                    >
                      <CheckIcon className="size-4 text-success-foreground" />
                      Workspace saved
                    </motion.span>
                  ) : (
                    <motion.div
                      animate={{ opacity: 1, y: 0 }}
                      className="flex min-w-0 flex-1 items-center gap-2"
                      exit={{ opacity: 0, y: reduce ? 0 : -6 }}
                      initial={{ opacity: 0, y: reduce ? 0 : 6 }}
                      key="dirty"
                      transition={{ duration: 0.18, ease: easeOut }}
                    >
                      <span aria-live="polite" className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate font-medium text-sm">
                          <span className="sm:hidden">Unsaved changes</span>
                          <span className="hidden sm:inline">You have unsaved changes</span>
                        </span>
                        {blocker && !saving && <span className="truncate text-warning-foreground text-xs">{blocker}</span>}
                      </span>
                      <Button className={press} disabled={saving} onClick={() => setDraft(saved)} size="sm" variant="ghost">
                        Discard
                      </Button>
                      <Button className={cn(press, "min-w-14")} disabled={Boolean(blocker)} loading={saving} onClick={() => setSaving(true)} size="sm">
                        Save
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </RidgelineShell>
  );
}
