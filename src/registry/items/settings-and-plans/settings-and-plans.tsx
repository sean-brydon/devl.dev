"use client";

import {
  AlertTriangleIcon,
  BuildingIcon,
  CheckIcon,
  CopyIcon,
  CreditCardIcon,
  DownloadIcon,
  EyeIcon,
  EyeOffIcon,
  KeyRoundIcon,
  LifeBuoyIcon,
  MoreHorizontalIcon,
  PlusIcon,
  SparklesIcon,
  Trash2Icon,
  UsersIcon,
  WalletIcon,
} from "lucide-react";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import {
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { Menu, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { Meter, MeterLabel, MeterTrack } from "@/components/ui/meter";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function useReducedMotionAfterMount() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && Boolean(prefers);
}

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
}

const spring = { type: "spring", stiffness: 420, damping: 40 } as const;
const easeOut = [0.23, 1, 0.32, 1] as const;

const tabs: { value: SettingsTab; label: string; icon: ReactNode }[] = [
  { value: "workspace", label: "Workspace", icon: <BuildingIcon /> },
  { value: "members", label: "Members", icon: <UsersIcon /> },
  { value: "keys", label: "API keys", icon: <KeyRoundIcon /> },
  { value: "billing", label: "Billing", icon: <WalletIcon /> },
];

const tabCopy: Record<SettingsTab, { title: string; description: string }> = {
  workspace: { title: "Workspace", description: "Name, address and where your data lives." },
  members: { title: "Members", description: "Who can get in, and what they can touch." },
  keys: { title: "API keys", description: "Secret keys for scripts, CI and server-side calls." },
  billing: { title: "Billing", description: "Plan, usage this cycle, payment method and invoices." },
};

const regions = [
  { value: "us-east", label: "US East · Virginia" },
  { value: "eu-central", label: "EU Central · Frankfurt" },
  { value: "ap-northeast", label: "AP Northeast · Tokyo" },
];

const roleItems: { value: MemberRole; label: string }[] = [
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Admin" },
  { value: "member", label: "Member" },
  { value: "viewer", label: "Viewer" },
];

const scopeItems: { value: KeyScope; label: string; hint: string }[] = [
  { value: "read", label: "Read", hint: "List and fetch" },
  { value: "write", label: "Read & write", hint: "Create runs, edit data" },
  { value: "admin", label: "Admin", hint: "Everything, incl. members" },
];

const defaultMembers: SettingsMember[] = [
  { id: "m1", name: "Ines Okafor", email: "ines@lumenloop.dev", role: "owner", lastActive: "Now" },
  { id: "m2", name: "Tomás Brandt", email: "tomas@lumenloop.dev", role: "admin", lastActive: "12 min ago" },
  { id: "m3", name: "Priya Nandakumar", email: "priya@lumenloop.dev", role: "member", lastActive: "2 h ago" },
  { id: "m4", name: "Wren Halloway", email: "wren@lumenloop.dev", role: "member", lastActive: "Yesterday" },
  { id: "m5", name: "Dmitri Sato", email: "dmitri@lumenloop.dev", role: "viewer", lastActive: "4 days ago" },
];

const defaultKeys: SettingsApiKey[] = [
  {
    id: "k1",
    name: "Production server",
    secret: "lk_live_7Hq2vN9xRmT4bW8cYp3sKd1f",
    scope: "write",
    created: "Aug 02",
    lastUsed: "3 min ago",
  },
  {
    id: "k2",
    name: "GitHub Actions",
    secret: "lk_live_Zt5uA0eJ6gLq9rXn2VbM8hC4",
    scope: "read",
    created: "Sep 18",
    lastUsed: "1 h ago",
  },
  {
    id: "k3",
    name: "Analytics export",
    secret: "lk_live_Pw3kS7yD1oF5iQ0zU6aE9jB2",
    scope: "read",
    created: "Oct 01",
    lastUsed: "Never",
  },
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

const avatarTones = ["bg-orange-500/20 dark:bg-orange-400/20", "bg-teal-500/20 dark:bg-teal-400/20", "bg-amber-500/25 dark:bg-amber-400/20", "bg-info/20", "bg-success/20"];

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function mask(secret: string) {
  return `${secret.slice(0, 8)}${"•".repeat(12)}${secret.slice(-4)}`;
}

function makeSecret() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz0123456789";
  let out = "lk_live_";
  for (let i = 0; i < 24; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

const usedLabel = (when: string) => (/^never$/i.test(when) ? "Never used" : `Last used ${when}`);

const formatInt = (n: number) => Math.round(n).toLocaleString("en-US");
const formatMoney = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

function RollingNumber({ value, format = formatInt }: { value: number; format?: (n: number) => string }) {
  const reduce = useReducedMotionAfterMount();
  const mv = useMotionValue(reduce ? value : 0);
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

function AutoHeight({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | "auto">("auto");
  const reduce = useReducedMotionAfterMount();
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setHeight(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <motion.div
      animate={{ height }}
      className="overflow-hidden"
      initial={false}
      transition={reduce ? { duration: 0 } : { duration: 0.2, ease: easeOut }}
    >
      <div className={className} ref={ref}>
        {children}
      </div>
    </motion.div>
  );
}

function FieldError({ id, children }: { id: string; children: string | null }) {
  const reduce = useReducedMotionAfterMount();
  return (
    <AnimatePresence initial={false}>
      {children && (
        <motion.div
          animate={{ height: "auto", opacity: 1 }}
          className="-mt-2 overflow-hidden"
          exit={{ height: 0, opacity: 0 }}
          initial={{ height: 0, opacity: 0 }}
          transition={reduce ? { duration: 0 } : { duration: 0.18, ease: easeOut }}
        >
          <p className="pt-2 text-destructive-foreground text-xs" id={id}>
            {children}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SectionNav({
  value,
  onChange,
  orientation,
  idPrefix,
}: {
  value: SettingsTab;
  onChange: (tab: SettingsTab) => void;
  orientation: "vertical" | "horizontal";
  idPrefix: string;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotionAfterMount();
  const vertical = orientation === "vertical";

  useEffect(() => {
    if (vertical) return;
    const list = listRef.current;
    const el = list?.querySelector<HTMLElement>(`[data-tab="${value}"]`);
    const scroller = list?.parentElement;
    if (!el || !scroller || scroller.scrollWidth <= scroller.clientWidth) return;
    const box = el.getBoundingClientRect();
    const view = scroller.getBoundingClientRect();
    const behavior = reduce ? "auto" : "smooth";
    if (box.left < view.left + 16) scroller.scrollBy({ left: box.left - view.left - 16, behavior });
    else if (box.right > view.right - 16) scroller.scrollBy({ left: box.right - view.right + 16, behavior });
  }, [value, vertical, reduce]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const keys = vertical ? ["ArrowUp", "ArrowDown"] : ["ArrowLeft", "ArrowRight"];
    if (!keys.includes(e.key) && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const i = tabs.findIndex((t) => t.value === value);
    let next = i;
    if (e.key === keys[0]) next = (i - 1 + tabs.length) % tabs.length;
    if (e.key === keys[1]) next = (i + 1) % tabs.length;
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = tabs.length - 1;
    onChange(tabs[next].value);
    listRef.current?.querySelector<HTMLElement>(`[data-tab="${tabs[next].value}"]`)?.focus();
  };

  const transition = reduce ? { duration: 0 } : { type: "spring" as const, stiffness: 500, damping: 40 };

  return (
    <div
      aria-orientation={orientation}
      className={cn("relative flex", vertical ? "flex-col gap-0.5" : "w-max gap-1")}
      onKeyDown={onKeyDown}
      ref={listRef}
      role="tablist"
    >
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <button
            aria-controls={`${idPrefix}-panel`}
            aria-selected={active}
            className={cn(
              "relative isolate flex shrink-0 cursor-pointer items-center font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring",
              vertical
                ? "h-8 gap-2.5 rounded-lg px-2.5 [&_svg]:size-4 [&_svg]:shrink-0"
                : "h-9 rounded-md px-2.5",
              active
                ? "text-foreground"
                : cn("text-muted-foreground hover:text-foreground", vertical && "hover:bg-accent/60"),
            )}
            data-tab={t.value}
            id={`${idPrefix}-${orientation}-${t.value}`}
            key={t.value}
            onClick={() => onChange(t.value)}
            role="tab"
            tabIndex={active ? 0 : -1}
            type="button"
          >
            {active &&
              (vertical ? (
                <motion.span
                  aria-hidden
                  className="absolute inset-0 -z-10 rounded-lg border bg-background shadow-xs/5"
                  layoutId={`${idPrefix}-nav-pill`}
                  transition={transition}
                />
              ) : (
                <motion.span
                  aria-hidden
                  className="absolute inset-x-2.5 -bottom-[13px] h-0.5 rounded-full bg-foreground"
                  layoutId={`${idPrefix}-nav-line`}
                  transition={transition}
                />
              ))}
            {vertical && <span className={cn(active ? "text-foreground" : "text-muted-foreground/80")}>{t.icon}</span>}
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

function Section({
  title,
  description,
  children,
  footer,
  className,
  bodyClassName,
}: {
  title: string;
  bodyClassName?: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("overflow-hidden rounded-2xl border bg-card shadow-xs/5", className)}>
      <div className="flex flex-col gap-1 px-5 pt-5">
        <h3 className="text-balance font-medium">{title}</h3>
        {description && <p className="text-pretty text-muted-foreground text-xs">{description}</p>}
      </div>
      <div className={cn("p-5", bodyClassName)}>{children}</div>
      {footer && (
        <div className="flex flex-wrap items-center justify-end gap-2 border-t bg-muted/40 px-5 py-3">{footer}</div>
      )}
    </section>
  );
}

function WorkspacePanel({ workspace }: { workspace: { name: string; slug: string; region: string } }) {
  const [saved, setSaved] = useState(workspace);
  const [draft, setDraft] = useState(workspace);
  const [flash, setFlash] = useState(false);
  const [prefs, setPrefs] = useState({ agents: true, sso: false, digest: true });
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const [scheduled, setScheduled] = useState(false);
  const [saving, setSaving] = useState(false);
  const reduce = useReducedMotionAfterMount();
  const dirty = draft.name !== saved.name || draft.slug !== saved.slug || draft.region !== saved.region;
  const nameError = draft.name.trim() ? null : "Give your workspace a name.";
  const slugError = /^[a-z0-9](?:[a-z0-9-]{1,30})[a-z0-9]$/.test(draft.slug)
    ? null
    : "Use 3–32 letters, numbers or dashes.";

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(false), 1800);
    return () => clearTimeout(t);
  }, [flash]);

  useEffect(() => {
    if (!saving) return;
    const t = setTimeout(() => {
      setSaving(false);
      setSaved(draft);
      setFlash(true);
    }, 600);
    return () => clearTimeout(t);
  }, [saving, draft]);

  const status = saving ? null : flash ? "saved" : dirty ? "dirty" : null;

  return (
    <div className="flex flex-col gap-5">
      <Section
        description="Shown in the switcher, emails and shared links."
        footer={
          <>
            <span aria-live="polite" className="me-auto inline-flex min-h-5 items-center text-xs">
              <AnimatePresence initial={false} mode="wait">
                {status && (
                  <motion.span
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "inline-flex items-center gap-1.5",
                      status === "saved" ? "text-success-foreground" : "text-muted-foreground",
                    )}
                    exit={{ opacity: 0, y: reduce ? 0 : -3 }}
                    initial={{ opacity: 0, y: reduce ? 0 : 3 }}
                    key={status}
                    transition={{ duration: 0.16, ease: easeOut }}
                  >
                    {status === "saved" ? (
                      <>
                        <CheckIcon className="size-3.5" />
                        <span className="@md:hidden">Saved</span>
                        <span className="hidden @md:inline">Changes saved</span>
                      </>
                    ) : (
                      <>
                        <span className="size-1.5 rounded-full bg-warning" />
                        <span className="@md:hidden">Unsaved</span>
                        <span className="hidden @md:inline">Unsaved changes</span>
                      </>
                    )}
                  </motion.span>
                )}
              </AnimatePresence>
            </span>
            <Button disabled={!dirty || saving} onClick={() => setDraft(saved)} variant="ghost">
              Reset
            </Button>
            <Button disabled={!dirty || !!nameError || !!slugError} loading={saving} onClick={() => setSaving(true)}>
              Save changes
            </Button>
          </>
        }
        title="General"
      >
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-4">
            <motion.div
              className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-orange-600 font-heading dark:bg-orange-500 font-semibold text-lg text-white"
              key={initials(draft.name || "?")}
              initial={reduce ? false : { scale: 0.96, opacity: 0.6 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.15, ease: easeOut }}
            >
              {initials(draft.name || "?")}
            </motion.div>
            <div className="flex flex-col gap-1">
              <span className="font-medium">Workspace logo</span>
              <span className="text-muted-foreground text-xs">Square image, at least 128px. Initials until then.</span>
            </div>
            <Button className="ms-auto" variant="outline">
              Upload
            </Button>
          </div>
          <div className="grid gap-4 @xl:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="ws-name">Name</Label>
              <Input
                aria-describedby={nameError ? "ws-name-error" : undefined}
                aria-invalid={!!nameError || undefined}
                id="ws-name"
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                value={draft.name}
              />
              <FieldError id="ws-name-error">{nameError}</FieldError>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="ws-slug">URL</Label>
              <InputGroup>
                <InputGroupAddon>
                  <InputGroupText>lumen.app/</InputGroupText>
                </InputGroupAddon>
                <InputGroupInput
                  aria-describedby={slugError ? "ws-slug-error" : undefined}
                  aria-invalid={!!slugError || undefined}
                  id="ws-slug"
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") }))
                  }
                  value={draft.slug}
                />
              </InputGroup>
              <FieldError id="ws-slug-error">{slugError}</FieldError>
            </div>
            <div className="flex flex-col gap-2 @xl:col-span-2">
              <Label>Data region</Label>
              <Select
                items={regions}
                onValueChange={(v) => v && setDraft((d) => ({ ...d, region: v as string }))}
                value={draft.region}
              >
                <SelectTrigger aria-label="Data region">
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
              <p className="text-muted-foreground text-xs">Moving regions copies your data and takes about an hour.</p>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Preferences">
        <div className="flex flex-col divide-y">
          {(
            [
              ["agents", "Members can create agents", "Otherwise only admins can publish new agents."],
              ["sso", "Require single sign-on", "Members sign in through your identity provider."],
              ["digest", "Weekly digest", "A Monday summary of runs, spend and failures."],
            ] as const
          ).map(([key, label, hint]) => (
            <label className="flex cursor-pointer items-center gap-4 py-3 first:pt-0 last:pb-0" key={key}>
              <span className="flex flex-1 flex-col gap-0.5">
                <span className="font-medium">{label}</span>
                <span className="text-muted-foreground text-xs">{hint}</span>
              </span>
              <Switch checked={prefs[key]} onCheckedChange={(v) => setPrefs((p) => ({ ...p, [key]: v }))} />
            </label>
          ))}
        </div>
      </Section>

      <section className="rounded-2xl border border-destructive/30 bg-card p-5">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex size-9 items-center justify-center rounded-xl bg-destructive/10 text-destructive-foreground">
            <AlertTriangleIcon className="size-4" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <h3 className="font-medium">Delete workspace</h3>
            <p className="text-pretty text-muted-foreground text-xs">
              Removes agents, runs and keys after a 7-day grace period. Members lose access straight away.
            </p>
          </div>
          {!confirming && !scheduled && (
            <Button onClick={() => setConfirming(true)} variant="destructive-outline">
              Delete…
            </Button>
          )}
          {scheduled && (
            <Button
              onClick={() => {
                setScheduled(false);
                setTyped("");
              }}
              variant="outline"
            >
              Undo
            </Button>
          )}
        </div>
        <AnimatePresence initial={false}>
          {confirming && (
            <motion.div
              animate={{ height: "auto", opacity: 1 }}
              className="overflow-hidden"
              exit={{ height: 0, opacity: 0 }}
              initial={{ height: 0, opacity: 0 }}
              transition={spring}
            >
              <div className="mt-4 flex flex-col gap-2 rounded-xl bg-destructive/5 p-4">
                <Label htmlFor="ws-confirm">
                  Type <span className="font-mono">{saved.slug}</span> to confirm
                </Label>
                <div className="flex flex-col gap-2 @md:flex-row">
                  <Input
                    autoFocus
                    className="font-mono"
                    id="ws-confirm"
                    onChange={(e) => setTyped(e.target.value)}
                    onKeyDown={(e) => e.key === "Escape" && setConfirming(false)}
                    value={typed}
                  />
                  <div className="flex gap-2">
                    <Button onClick={() => setConfirming(false)} variant="ghost">
                      Cancel
                    </Button>
                    <Button
                      disabled={typed !== saved.slug}
                      onClick={() => {
                        setConfirming(false);
                        setScheduled(true);
                      }}
                      variant="destructive"
                    >
                      Delete workspace
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
          {scheduled && (
            <motion.p
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 text-destructive-foreground text-xs"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0, y: -4 }}
            >
              Deletion scheduled for Oct 31. You can undo until then.
            </motion.p>
          )}
        </AnimatePresence>
      </section>
    </div>
  );
}

const MotionRow = motion.create(TableRow);

function MembersPanel({ initial, seatLimit }: { initial: SettingsMember[]; seatLimit: number }) {
  const [members, setMembers] = useState(initial);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MemberRole>("member");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const reduce = useReducedMotionAfterMount();
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
        { id: `m${Date.now()}`, name, email: address, role, lastActive: "Invite sent", invited: true },
      ]);
      setSending(null);
      setSentTo(address);
      setEmail("");
    }, 700);
    return () => clearTimeout(t);
  }, [sending, role]);

  useEffect(() => {
    if (!sentTo) return;
    const t = setTimeout(() => setSentTo(null), 2600);
    return () => clearTimeout(t);
  }, [sentTo]);

  const invite = () => {
    const address = email.trim().toLowerCase();
    if (!address) return setError("Enter an email address to send an invite.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(address)) return setError("That doesn't look like a full email address.");
    if (members.some((m) => m.email.toLowerCase() === address))
      return setError(`${address} is already in this workspace.`);
    if (full) return setError(`All ${seatLimit} seats are in use. Remove someone or upgrade to add more.`);
    setError(null);
    setSentTo(null);
    setSending(address);
  };

  const hint = error
    ? { key: "error", tone: "text-destructive-foreground", text: error }
    : sentTo
      ? { key: "sent", tone: "text-success-foreground", text: `Invite sent to ${sentTo}.` }
      : { key: "idle", tone: "text-muted-foreground", text: "Invites expire after 7 days. You can resend from the list." };
  const hintId = useId();
  const remove = (id: string) => setMembers((all) => all.filter((x) => x.id !== id));
  const setRoleFor = (id: string, next: MemberRole) =>
    setMembers((all) => all.map((x) => (x.id === id ? { ...x, role: next } : x)));

  return (
    <div className="flex flex-col gap-5">
      <Section
        description={
          <>
            <span className="tabular-nums">
              {members.length} of {seatLimit}
            </span>{" "}
            seats used. Invites count once they're sent.
          </>
        }
        title="Invite people"
      >
        <form
          className="flex flex-col gap-2 @xl:flex-row"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            invite();
          }}
        >
          <Input
            aria-describedby={hintId}
            aria-invalid={!!error || undefined}
            aria-label="Email address"
            className="flex-1"
            disabled={!!sending}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError(null);
            }}
            placeholder="name@company.com"
            type="email"
            value={email}
          />
          <div className="flex gap-2">
            <Select items={roleItems.slice(1)} onValueChange={(v) => v && setRole(v as MemberRole)} value={role}>
              <SelectTrigger aria-label="Role for invite" className="w-32">
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
            <Button className="flex-1 @xl:flex-none" loading={!!sending} type="submit">
              <PlusIcon /> Invite
            </Button>
          </div>
        </form>
        <AutoHeight className="relative pt-2.5">
        <p aria-live="polite" className="relative min-h-4 text-xs" id={hintId}>
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span
              animate={{ opacity: 1, y: 0 }}
              className={cn("block text-pretty", hint.tone)}
              exit={{ opacity: 0, y: reduce ? 0 : -3 }}
              initial={{ opacity: 0, y: reduce ? 0 : 3 }}
              key={hint.key + hint.text}
              transition={{ duration: 0.16, ease: easeOut }}
            >
              {hint.text}
            </motion.span>
          </AnimatePresence>
        </p>
        </AutoHeight>
      </Section>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-xs/5">
        <ul className="divide-y @xl:hidden">
          <AnimatePresence initial={false}>
            {members.map((m, i) => (
              <motion.li
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-2 px-4 py-3"
                exit={{ opacity: 0, x: 24 }}
                initial={reduce ? false : { opacity: 0, y: 10 }}
                key={m.id}
                layout={!reduce}
                transition={spring}
              >
                <div className="flex items-center gap-3">
                  <MemberIdentity index={i} member={m} />
                  <MemberActions member={m} onRemove={remove} />
                </div>
                <div className="flex items-center justify-between gap-3 ps-11">
                  <MemberRoleControl member={m} onRole={setRoleFor} />
                  <span className="truncate text-muted-foreground text-xs">{m.lastActive}</span>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>

        <Table className="hidden @xl:table">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="ps-5">Member</TableHead>
              <TableHead className="w-36">Role</TableHead>
              <TableHead className="hidden w-32 @2xl:table-cell">Last active</TableHead>
              <TableHead className="w-12 pe-5">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence initial={false}>
              {members.map((m, i) => (
                <MotionRow
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 24 }}
                  initial={reduce ? false : { opacity: 0, y: 10 }}
                  key={m.id}
                  layout={!reduce}
                  transition={spring}
                >
                  <TableCell className="ps-5">
                    <div className="flex items-center gap-3">
                      <MemberIdentity index={i} member={m} />
                    </div>
                  </TableCell>
                  <TableCell>
                    <MemberRoleControl member={m} onRole={setRoleFor} />
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground @2xl:table-cell">{m.lastActive}</TableCell>
                  <TableCell className="pe-5 text-right">
                    <MemberActions member={m} onRemove={remove} />
                  </TableCell>
                </MotionRow>
              ))}
            </AnimatePresence>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function MemberIdentity({ member: m, index }: { member: SettingsMember; index: number }) {
  return (
    <>
      <Avatar className="[--avatar-size:--spacing(8)]">
        <AvatarFallback className={avatarTones[index % avatarTones.length]}>{initials(m.name)}</AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex min-w-0 items-center gap-2 font-medium">
          <span className="truncate">{m.name}</span>
          {m.invited && (
            <Badge size="sm" variant="info">
              Invited
            </Badge>
          )}
        </span>
        <span className="truncate text-muted-foreground text-xs">{m.email}</span>
      </div>
    </>
  );
}

function MemberRoleControl({ member: m, onRole }: { member: SettingsMember; onRole: (id: string, role: MemberRole) => void }) {
  const owner = m.role === "owner";
  return (
    <Select
      disabled={owner}
      items={owner ? roleItems.slice(0, 1) : roleItems.slice(1)}
      onValueChange={(v) => v && onRole(m.id, v as MemberRole)}
      value={m.role}
    >
      <SelectTrigger
        aria-label={owner ? `${m.name} is the owner` : `Role for ${m.name}`}
        className="w-28"
      >
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
  );
}

function MemberActions({ member: m, onRemove }: { member: SettingsMember; onRemove: (id: string) => void }) {
  if (m.role === "owner") return <span aria-hidden className="size-9 shrink-0 sm:size-8" />;
  return (
    <Menu>
      <MenuTrigger render={<Button aria-label={`Actions for ${m.name}`} className="shrink-0" size="icon" variant="ghost" />}>
        <MoreHorizontalIcon />
      </MenuTrigger>
      <MenuPopup align="end">
        {m.invited && <MenuItem>Resend invite</MenuItem>}
        <MenuItem onClick={() => navigator.clipboard?.writeText(m.email).catch(() => {})}>Copy email</MenuItem>
        <MenuSeparator />
        <MenuItem onClick={() => onRemove(m.id)} variant="destructive">
          <Trash2Icon /> {m.invited ? "Cancel invite" : "Remove from workspace"}
        </MenuItem>
      </MenuPopup>
    </Menu>
  );
}

function KeysPanel({ initial }: { initial: SettingsApiKey[] }) {
  const [keys, setKeys] = useState(initial);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [scope, setScope] = useState<KeyScope>("read");
  const [fresh, setFresh] = useState<SettingsApiKey | null>(null);
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState<string[]>([]);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const reduce = useReducedMotionAfterMount();
  const scopeId = useId();

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);

  const create = () => {
    if (!name.trim()) return;
    const key: SettingsApiKey = {
      id: `k${Date.now()}`,
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

  const copy = (text: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(true);
  };

  return (
    <div className="flex flex-col gap-5">
      <section className="overflow-hidden rounded-2xl border bg-card shadow-xs/5">
        <div className="flex flex-wrap items-center gap-3 p-5">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h3 className="font-medium">Secret keys</h3>
            <p className="text-muted-foreground text-xs">Keys act as the workspace. Keep them out of client code.</p>
          </div>
          {!creating && !fresh && (
            <Button onClick={() => setCreating(true)}>
              <PlusIcon /> Create key
            </Button>
          )}
        </div>

        <AnimatePresence initial={false} mode="popLayout">
          {creating && (
            <motion.div
              animate={{ height: "auto", opacity: 1 }}
              className="overflow-hidden"
              exit={{ height: 0, opacity: 0 }}
              initial={{ height: 0, opacity: 0 }}
              key="create"
              transition={spring}
            >
              <form
                className="mx-5 mb-5 flex flex-col gap-4 rounded-xl border bg-muted/40 p-4"
                onKeyDown={(e) => e.key === "Escape" && setCreating(false)}
                onSubmit={(e) => {
                  e.preventDefault();
                  create();
                }}
              >
                <div className="flex flex-col gap-2">
                  <Label htmlFor="key-name">Name</Label>
                  <Input
                    autoFocus
                    id="key-name"
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Staging worker"
                    value={name}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <span className="font-medium text-sm" id={scopeId}>
                    Scope
                  </span>
                  <div aria-labelledby={scopeId} className="grid gap-2 @xl:grid-cols-3" role="radiogroup">
                    {scopeItems.map((s) => (
                      <button
                        aria-checked={scope === s.value}
                        className={cn(
                          "relative flex cursor-pointer flex-col items-start gap-0.5 rounded-xl border bg-background px-3 py-2.5 text-left outline-none transition-[background-color,scale] duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring motion-safe:active:scale-[0.98]",
                          scope === s.value ? "border-transparent" : "hover:bg-accent",
                        )}
                        key={s.value}
                        onClick={() => setScope(s.value)}
                        role="radio"
                        type="button"
                      >
                        {scope === s.value && (
                          <motion.span
                            className="absolute -inset-px rounded-xl border-2 border-primary"
                            layoutId={`${scopeId}-ring`}
                            transition={reduce ? { duration: 0 } : spring}
                          />
                        )}
                        <span className="font-medium">{s.label}</span>
                        <span className="text-muted-foreground text-xs">{s.hint}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button onClick={() => setCreating(false)} variant="ghost">
                    Cancel
                  </Button>
                  <Button disabled={!name.trim()} type="submit">
                    Create key
                  </Button>
                </div>
              </form>
            </motion.div>
          )}
          {fresh && (
            <motion.div
              animate={{ height: "auto", opacity: 1 }}
              className="overflow-hidden"
              exit={{ height: 0, opacity: 0 }}
              initial={{ height: 0, opacity: 0 }}
              key="fresh"
              transition={spring}
            >
              <div className="mx-5 mb-5 flex flex-col gap-3 rounded-xl border border-success/30 bg-success/5 p-4">
                <div className="flex items-start gap-2">
                  <SparklesIcon className="mt-0.5 size-4 shrink-0 text-success-foreground" />
                  <p className="text-sm">
                    <span className="font-medium">{fresh.name}</span> is ready. Copy it now: you won't be able to see it
                    again.
                  </p>
                </div>
                <div className="flex items-center gap-2 rounded-lg border bg-background p-1 ps-3">
                  <code className="min-w-0 flex-1 truncate font-mono text-xs">{fresh.secret}</code>
                  <Button className="min-w-24" onClick={() => copy(fresh.secret)} variant="outline">
                    <AnimatePresence initial={false} mode="popLayout">
                      <motion.span
                        animate={{ scale: 1, opacity: 1 }}
                        className="inline-flex"
                        exit={{ scale: 0.8, opacity: 0 }}
                        initial={{ scale: 0.8, opacity: 0 }}
                        key={copied ? "y" : "n"}
                        transition={{ duration: 0.15, ease: easeOut }}
                      >
                        {copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
                      </motion.span>
                    </AnimatePresence>
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
                <Button className="self-end" onClick={() => setFresh(null)}>
                  I've saved it
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <ul className="border-t">
          <AnimatePresence initial={false}>
            {keys.map((k) => {
              const show = revealed.includes(k.id) && k.id !== fresh?.id;
              const confirming = confirmId === k.id;
              return (
                <motion.li
                  animate={{ opacity: 1, height: "auto" }}
                  className="overflow-hidden border-b last:border-b-0"
                  exit={{ opacity: 0, height: 0, x: 40 }}
                  initial={reduce ? false : { opacity: 0, height: 0 }}
                  key={k.id}
                  layout={!reduce}
                  transition={spring}
                >
                  <div className="flex items-start gap-4 px-5 py-3.5">
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <span className="flex min-w-0 items-center gap-2 font-medium">
                        <span className="truncate">{k.name}</span>
                        <Badge
                          size="sm"
                          variant={k.scope === "admin" ? "warning" : k.scope === "write" ? "info" : "secondary"}
                        >
                          {scopeItems.find((s) => s.value === k.scope)?.label}
                        </Badge>
                      </span>
                      <code className="truncate font-mono text-muted-foreground text-xs">
                        {show ? k.secret : mask(k.secret)}
                      </code>
                      <span className="text-muted-foreground text-xs @xl:hidden">
                        Created {k.created} · {usedLabel(k.lastUsed)}
                      </span>
                    </div>
                    <div className="hidden shrink-0 flex-col items-end gap-1.5 pt-0.5 text-muted-foreground text-xs @xl:flex">
                      <span>Created {k.created}</span>
                      <span>{usedLabel(k.lastUsed)}</span>
                    </div>
                    <div className="-me-1.5 flex shrink-0 items-center gap-0.5">
                      <Button
                        aria-label={show ? `Hide ${k.name}` : `Reveal ${k.name}`}
                        aria-pressed={show}
                        disabled={k.id === fresh?.id}
                        onClick={() =>
                          setRevealed((r) => (r.includes(k.id) ? r.filter((x) => x !== k.id) : [...r, k.id]))
                        }
                        size="icon"
                        variant="ghost"
                      >
                        {show ? <EyeOffIcon /> : <EyeIcon />}
                      </Button>
                      <Button
                        aria-label={`Revoke ${k.name}`}
                        onClick={() => setConfirmId(confirming ? null : k.id)}
                        size="icon"
                        variant="ghost"
                      >
                        <Trash2Icon />
                      </Button>
                    </div>
                  </div>
                  <AnimatePresence initial={false}>
                    {confirming && (
                      <motion.div
                        animate={{ height: "auto", opacity: 1 }}
                        className="overflow-hidden"
                        exit={{ height: 0, opacity: 0 }}
                        initial={{ height: 0, opacity: 0 }}
                        transition={spring}
                      >
                        <div className="mx-5 mb-3.5 flex flex-wrap items-center gap-3 rounded-xl bg-destructive/8 px-3 py-2.5">
                          <AlertTriangleIcon className="size-4 shrink-0 text-destructive-foreground" />
                          <span className="min-w-0 flex-1 text-xs">
                            Anything using this key stops working immediately.
                          </span>
                          <Button onClick={() => setConfirmId(null)} variant="ghost">
                            Keep
                          </Button>
                          <Button
                            onClick={() => {
                              setKeys((all) => all.filter((x) => x.id !== k.id));
                              setConfirmId(null);
                              if (fresh?.id === k.id) setFresh(null);
                            }}
                            variant="destructive"
                          >
                            Revoke key
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.li>
              );
            })}
          </AnimatePresence>
          {keys.length === 0 && (
            <li className="px-5 py-10 text-center text-muted-foreground text-xs">No keys yet. Create one above.</li>
          )}
        </ul>
      </section>
    </div>
  );
}

function UsageMeter({ item, shown }: { item: SettingsUsage; shown: boolean }) {
  const reduce = useReducedMotionAfterMount();
  const pct = Math.min(100, (item.used / item.limit) * 100);
  const projPct = item.projected ? Math.min(100, (item.projected / item.limit) * 100) : 0;
  const over = (item.projected ?? 0) > item.limit;
  const tone = pct >= 85 ? "bg-warning" : "bg-primary";
  const fmt = item.unit ? (n: number) => n.toFixed(1) : formatInt;
  const fill = { duration: reduce ? 0 : 0.5, ease: easeOut };
  return (
    <Meter max={item.limit} value={item.used}>
      <div className="flex items-baseline justify-between gap-2">
        <MeterLabel className="font-normal text-muted-foreground text-xs">{item.label}</MeterLabel>
        <span className="text-xs">
          <span className="font-medium">
            <RollingNumber format={fmt} value={shown ? item.used : 0} />
          </span>
          <span className="text-muted-foreground tabular-nums">
            {" "}
            / {item.limit.toLocaleString("en-US")}
            {item.unit ? ` ${item.unit}` : ""}
          </span>
        </span>
      </div>
      <MeterTrack className="relative h-2 rounded-full">
        {projPct > pct && (
          <motion.div
            animate={{ scaleX: shown ? 1 : 0 }}
            className={cn(
              "absolute inset-y-0 left-0 origin-left rounded-full",
              over
                ? "bg-[repeating-linear-gradient(-45deg,var(--color-warning)_0_2px,transparent_2px_5px)] opacity-70"
                : "bg-[repeating-linear-gradient(-45deg,var(--color-muted-foreground)_0_2px,transparent_2px_5px)] opacity-50",
            )}
            initial={false}
            style={{ width: `${projPct}%` }}
            transition={{ ...fill, delay: reduce ? 0 : 0.12 }}
          />
        )}
        <motion.div
          animate={{ scaleX: shown ? 1 : 0 }}
          className={cn("absolute inset-y-0 left-0 origin-left rounded-full", tone)}
          initial={false}
          style={{ width: `${pct}%` }}
          transition={fill}
        />
      </MeterTrack>
    </Meter>
  );
}

const invoiceBadge: Record<SettingsInvoice["status"], { label: string; variant: "success" | "warning" | "error" }> = {
  paid: { label: "Paid", variant: "success" },
  due: { label: "Due", variant: "warning" },
  failed: { label: "Failed", variant: "error" },
};

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
  daysLeft: number;
  overagePer1k: number;
  active: boolean;
  plans: SettingsPlan[];
  current: string;
  renewsOn: string;
  seats: number;
  usage: SettingsUsage[];
  invoices: SettingsInvoice[];
  card: SettingsCard;
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

  const banner = failed
    ? { key: "failed", invoice: failed }
    : recovered
      ? { key: "recovered", invoice: recovered }
      : null;

  return (
    <div className="flex flex-col">
      <AnimatePresence initial={false}>
        {banner && (
          <motion.div
            animate={{ height: "auto", opacity: 1 }}
            className="overflow-hidden"
            exit={{ height: 0, opacity: 0 }}
            initial={{ height: 0, opacity: 0 }}
            key="banner"
            transition={reduce ? { duration: 0 } : spring}
          >
            <AutoHeight className="pb-5">
              <Alert variant={banner.key === "failed" ? "error" : "success"}>
                {banner.key === "failed" ? <AlertTriangleIcon /> : <CheckIcon />}
                <AlertTitle>
                  {banner.key === "failed"
                    ? `The ${banner.invoice.date.replace(/, \d{4}$/, "")} payment didn't go through`
                    : "Payment received"}
                </AlertTitle>
                <AlertDescription>
                  <p className="text-pretty">
                    {banner.key === "failed" ? (
                      <>
                        <span className="tabular-nums">${banner.invoice.amount.toFixed(2)}</span> on the card ending{" "}
                        <span className="tabular-nums">{card.last4}</span> was declined. Retry, or replace the card.
                      </>
                    ) : (
                      <>
                        <span className="font-mono">{banner.invoice.id}</span> is paid. A receipt is on its way to{" "}
                        {card.email ?? "your billing email"}.
                      </>
                    )}
                  </p>
                </AlertDescription>
                {banner.key === "failed" && (
                  <AlertAction>
                    <Button loading={retrying} onClick={() => setRetrying(true)} variant="outline">
                      Retry payment
                    </Button>
                  </AlertAction>
                )}
              </Alert>
            </AutoHeight>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex flex-col gap-5">
        <section className="overflow-hidden rounded-2xl border bg-card shadow-xs/5">
          <div className="flex flex-col gap-4 p-5 @xl:flex-row @xl:items-center">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-muted-foreground text-xs">Current plan</span>
              <span className="flex items-baseline gap-2">
                <span className="text-balance font-heading font-semibold text-2xl">{plan.name}</span>
                <span className="text-muted-foreground">
                  <RollingNumber format={formatMoney} value={plan.price} /> / seat / month
                </span>
              </span>
              <span className="text-muted-foreground text-xs">
                {seats} seats · renews {renewsOn} ·{" "}
                <span className="text-foreground tabular-nums">
                  <RollingNumber format={formatMoney} value={plan.price * seats} />
                </span>{" "}
                next invoice
              </span>
            </div>
            {!picking && (
              <Button
                onClick={() => {
                  setChoice(plans[Math.min(plans.length - 1, plans.findIndex((p) => p.id === planId) + 1)].id);
                  setPicking(true);
                }}
              >
                <SparklesIcon /> Change plan
              </Button>
            )}
          </div>
          <AnimatePresence initial={false}>
            {picking && (
              <motion.div
                animate={{ height: "auto", opacity: 1 }}
                className="overflow-hidden"
                exit={{ height: 0, opacity: 0 }}
                initial={{ height: 0, opacity: 0 }}
                transition={spring}
              >
                <div className="flex flex-col gap-3 border-t bg-muted/40 p-5">
                  <div aria-label="Choose a plan" className="grid gap-2 @2xl:grid-cols-3" role="radiogroup">
                    {plans.map((p) => (
                      <button
                        aria-checked={choice === p.id}
                        className="relative flex cursor-pointer flex-col items-start gap-1 rounded-xl border bg-card p-3 text-left outline-none transition-[scale] duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring motion-safe:active:scale-[0.98]"
                        key={p.id}
                        onClick={() => setChoice(p.id)}
                        role="radio"
                        type="button"
                      >
                        {choice === p.id && (
                          <motion.span
                            className="absolute -inset-px rounded-xl border-2 border-primary"
                            layoutId={`${pickerId}-ring`}
                            transition={reduce ? { duration: 0 } : spring}
                          />
                        )}
                        <span className="flex w-full items-center justify-between gap-2 font-medium">
                          {p.name}
                          {p.id === planId && (
                            <Badge size="sm" variant="secondary">
                              Current
                            </Badge>
                          )}
                        </span>
                        <span className="font-medium tabular-nums">
                          ${p.price}
                          <span className="font-normal text-muted-foreground text-xs"> / seat</span>
                        </span>
                        <span className="text-muted-foreground text-xs">{p.blurb}</span>
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button disabled={switching} onClick={() => setPicking(false)} variant="ghost">
                      Cancel
                    </Button>
                    <Button
                      className="min-w-36"
                      disabled={choice === planId}
                      loading={switching}
                      onClick={() => setSwitching(true)}
                    >
                      Switch to {plans.find((p) => p.id === choice)?.name}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <div className="grid gap-5 @2xl:grid-cols-[1fr_17rem]">
          <Section
            bodyClassName="flex flex-1 flex-col gap-5"
            className="flex flex-col"
            description={
              <>
                Resets {renewsOn} · <span className="tabular-nums">{daysLeft}</span> days left
              </>
            }
            title="Usage this cycle"
          >
            {usage.map((u) => (
              <UsageMeter item={u} key={u.label} shown={hasOpened || !!reduce} />
            ))}
            {runs?.projected !== undefined && (
              <div className="mt-auto grid grid-cols-2 gap-4 border-t pt-4">
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground text-xs">Projected by {renewsOn}</span>
                  <span className="font-medium tabular-nums">
                    {formatInt(runs.projected)} <span className="font-normal text-muted-foreground text-xs">runs</span>
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground text-xs">Estimated overage</span>
                  <span className={cn("font-medium tabular-nums", overRuns > 0 && "text-warning-foreground")}>
                    ${((overRuns / 1000) * overagePer1k).toFixed(2)}
                    <span className="font-normal text-muted-foreground text-xs">
                      {" "}
                      at ${overagePer1k} / 1k runs
                    </span>
                  </span>
                </div>
              </div>
            )}
          </Section>
          <Section title="Payment method">
            <div className="flex flex-col gap-4">
              <div className="relative isolate flex aspect-[1.6] flex-col justify-between overflow-hidden rounded-xl border bg-linear-to-br from-muted to-card p-4 shadow-xs/5">
                <span aria-hidden className="absolute -top-14 -right-12 -z-10 size-40 rounded-full bg-violet-500/12 blur-2xl" />
                <span aria-hidden className="absolute -bottom-16 -left-10 -z-10 size-36 rounded-full bg-teal-500/10 blur-2xl" />
                <div className="flex items-start justify-between">
                  <span
                    aria-hidden
                    className="h-6 w-8 rounded-sm border border-warning/40 bg-linear-to-br from-warning/50 to-warning/20"
                  />
                  <span className="font-heading font-semibold text-sm italic tracking-tight">{card.brand ?? "Card"}</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="font-mono text-sm tabular-nums tracking-widest">
                    •••• •••• •••• {card.last4}
                  </span>
                  <span className="flex justify-between gap-2 text-muted-foreground text-xs">
                    <span className="truncate">{card.holder}</span>
                    <span className="shrink-0 tabular-nums">Exp {card.expires}</span>
                  </span>
                </div>
              </div>
              <dl className="flex flex-col gap-1.5 text-xs">
                {card.email && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Billing email</dt>
                    <dd className="truncate">{card.email}</dd>
                  </div>
                )}
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Next charge</dt>
                  <dd className="tabular-nums">
                    <RollingNumber format={formatMoney} value={plan.price * seats} /> on {renewsOn}
                  </dd>
                </div>
              </dl>
              <Menu>
                <MenuTrigger render={<Button variant="outline" />}>Manage</MenuTrigger>
                <MenuPopup align="start">
                  <MenuItem>Replace card</MenuItem>
                  <MenuItem>Billing email</MenuItem>
                  <MenuItem>Tax ID</MenuItem>
                </MenuPopup>
              </Menu>
            </div>
          </Section>
        </div>

        <div className="overflow-hidden rounded-2xl border bg-card shadow-xs/5">
          <div className="flex items-baseline justify-between gap-3 px-5 pt-5 pb-2">
            <h3 className="text-balance font-medium">Invoices</h3>
            <span className="text-muted-foreground text-xs">Sent to {card.email ?? "the account owner"}</span>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="ps-5">Invoice</TableHead>
                <TableHead className="hidden @xl:table-cell">Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12 pe-5">
                  <span className="sr-only">Download</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.length === 0 && (
                <TableRow className="hover:bg-transparent">
                  <TableCell className="py-10 text-center text-muted-foreground text-xs" colSpan={5}>
                    No invoices yet. Your first one arrives on {renewsOn}.
                  </TableCell>
                </TableRow>
              )}
              {invoices.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="ps-5 font-mono text-xs">{inv.id}</TableCell>
                  <TableCell className="hidden text-muted-foreground @xl:table-cell">{inv.date}</TableCell>
                  <TableCell className="text-right tabular-nums">${inv.amount.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={invoiceBadge[inv.status].variant}>{invoiceBadge[inv.status].label}</Badge>
                  </TableCell>
                  <TableCell className="pe-5 text-right">
                    <Button aria-label={`Download ${inv.id}`} size="icon" variant="ghost">
                      <DownloadIcon />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

export function SettingsAndPlans({
  className,
  defaultTab = "workspace",
  workspace = { name: "Lumen Loop", slug: "lumen-loop", region: "eu-central" },
  members = defaultMembers,
  apiKeys = defaultKeys,
  plans = defaultPlans,
  currentPlan = "team",
  renewsOn = "Nov 14",
  usage = defaultUsage,
  invoices = defaultInvoices,
  cycleDaysLeft = 21,
  overagePer1k = 4,
  card = { brand: "Visa", last4: "4417", expires: "09/28", holder: "Ines Okafor", email: "billing@lumenloop.dev" },
}: SettingsAndPlansProps) {
  const [tab, setTab] = useState<SettingsTab>(defaultTab);
  const idPrefix = `settings-${useId().replace(/:/g, "")}`;
  const reduce = useReducedMotionAfterMount();
  const seatLimit = usage.find((u) => u.label === "Seats")?.limit ?? 10;
  const copy = tabCopy[tab];

  return (
    <div
      className={cn(
        "@container relative isolate flex h-[760px] w-full overflow-hidden bg-background text-foreground text-sm",
        "**:data-[slot=button]:transition-[box-shadow,background-color,scale] **:data-[slot=button]:duration-150 **:data-[slot=button]:ease-out motion-safe:**:data-[slot=button]:active:scale-[0.97]",
        className,
      )}
    >
      <aside className="hidden w-60 shrink-0 flex-col gap-6 border-r bg-muted/40 p-3 @3xl:flex">
        <div className="flex items-center gap-2.5 px-1.5 pt-1">
          <span className="flex size-8 items-center justify-center rounded-lg bg-orange-600 font-semibold dark:bg-orange-500 text-white text-xs">
            {initials(workspace.name)}
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-medium">{workspace.name}</span>
            <span className="text-muted-foreground text-xs">Settings</span>
          </div>
        </div>
        <nav aria-label="Settings sections" className="px-1">
          <SectionNav idPrefix={idPrefix} onChange={setTab} orientation="vertical" value={tab} />
        </nav>
        <div className="mt-auto flex flex-col gap-1">
          <div className="rounded-xl border bg-card p-3">
            <span className="flex items-center gap-2 font-medium text-xs">
              <LifeBuoyIcon className="size-3.5" /> Need a hand?
            </span>
            <p className="mt-1 text-muted-foreground text-xs">Our team replies in under an hour on Team plans.</p>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-col gap-2 border-b pt-3 @3xl:hidden">
          <div className="flex items-center gap-2 px-4">
            <span className="flex size-6 items-center justify-center rounded-md bg-orange-600 font-semibold dark:bg-orange-500 text-[10px] text-white">
              {initials(workspace.name)}
            </span>
            <span className="font-medium">{workspace.name}</span>
            <span className="text-muted-foreground">/ Settings</span>
          </div>
          <nav
            aria-label="Settings sections"
            className="overflow-x-auto px-1.5 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <SectionNav idPrefix={idPrefix} onChange={setTab} orientation="horizontal" value={tab} />
          </nav>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div
            aria-labelledby={`${idPrefix}-vertical-${tab}`}
            className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 @3xl:px-8 @3xl:py-8"
            id={`${idPrefix}-panel`}
            role="tabpanel"
          >
            <div className="flex flex-col gap-1">
              <h2 className="text-balance font-heading font-semibold text-xl tracking-tight">{copy.title}</h2>
              <p className="text-pretty text-muted-foreground">{copy.description}</p>
            </div>
            {tabs.map((t) => (
              <motion.div
                animate={tab === t.value ? { opacity: 1, y: 0 } : { opacity: 0, y: reduce ? 0 : 4 }}
                className={cn(tab !== t.value && "hidden")}
                initial={false}
                key={t.value}
                transition={{ duration: 0.18, ease: easeOut }}
              >
                {t.value === "workspace" && <WorkspacePanel workspace={workspace} />}
                {t.value === "members" && <MembersPanel initial={members} seatLimit={seatLimit} />}
                {t.value === "keys" && <KeysPanel initial={apiKeys} />}
                {t.value === "billing" && (
                  <BillingPanel
                    active={tab === "billing"}
                    card={card}
                    current={currentPlan}
                    daysLeft={cycleDaysLeft}
                    overagePer1k={overagePer1k}
                    invoices={invoices}
                    plans={plans}
                    renewsOn={renewsOn}
                    seats={members.length}
                    usage={usage}
                  />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
