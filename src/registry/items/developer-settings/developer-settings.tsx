"use client";

import {
  ArrowLeftIcon,
  BellIcon,
  CheckIcon,
  ClockIcon,
  CopyIcon,
  CreditCardIcon,
  EllipsisIcon,
  EyeIcon,
  EyeOffIcon,
  KeyRoundIcon,
  PaletteIcon,
  PlusIcon,
  RefreshCwIcon,
  RotateCwIcon,
  SendIcon,
  SettingsIcon,
  ShieldIcon,
  Trash2Icon,
  TriangleAlertIcon,
  UserIcon,
  UsersIcon,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type FormEvent, type ReactNode, useEffect, useId, useRef, useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Menu, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";

export type SettingsSectionId =
  | "profile"
  | "appearance"
  | "notifications"
  | "security"
  | "general"
  | "members"
  | "billing"
  | "developer";

export interface DevScopeResource {
  id: string;
  name: string;
  readOnly?: boolean;
}

export interface DevApiKey {
  id: string;
  name: string;
  last4: string;
  scopes: string[];
  expires?: string;
  daysLeft?: number;
  lastUsed?: string;
}

export interface DevEventGroup {
  id: string;
  name: string;
  events: { id: string; hint: string }[];
}

export interface DevDelivery {
  id: string;
  event: string;
  status: number | "timeout";
  latency: number;
  time: string;
}

export interface DevEndpoint {
  id: string;
  url: string;
  paused?: boolean;
  events: string[];
  secret: string;
  deliveries: DevDelivery[];
}

export interface DeveloperSettingsProps {
  className?: string;
  today?: string;
  keyPrefix?: string;
  resources?: DevScopeResource[];
  apiKeys?: DevApiKey[];
  eventGroups?: DevEventGroup[];
  endpoints?: DevEndpoint[];
  onNavigate?: (section: SettingsSectionId) => void;
}

const easeOut = [0.23, 1, 0.32, 1] as const;
const press = "transition-[color,background-color,box-shadow,scale] duration-150 ease-out active:scale-[0.97]";
const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

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

const expiryOptions = [
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "365", label: "1 year" },
  { value: "0", label: "No expiry" },
];

const defaultResources: DevScopeResource[] = [
  { id: "projects", name: "Projects" },
  { id: "deployments", name: "Deployments" },
  { id: "domains", name: "Domains" },
  { id: "env", name: "Environment variables" },
  { id: "webhooks", name: "Webhooks" },
  { id: "logs", name: "Logs", readOnly: true },
];

const defaultKeys: DevApiKey[] = [
  {
    id: "k1",
    name: "GitHub Actions deploy",
    last4: "8f2a",
    scopes: ["write:deployments", "read:deployments", "read:projects", "read:logs"],
    expires: "Feb 4, 2027",
    daysLeft: 100,
    lastUsed: "2 min ago",
  },
  {
    id: "k2",
    name: "Status page sync",
    last4: "41ad",
    scopes: ["read:deployments", "read:logs"],
    expires: "Nov 3, 2026",
    daysLeft: 7,
    lastUsed: "3 hours ago",
  },
  {
    id: "k3",
    name: "Terraform",
    last4: "c07e",
    scopes: [
      "write:projects",
      "read:projects",
      "write:deployments",
      "read:deployments",
      "write:domains",
      "read:domains",
      "write:env",
      "read:env",
      "read:logs",
    ],
    lastUsed: "41 days ago",
  },
  {
    id: "k4",
    name: "Jonah’s local scripts",
    last4: "9b13",
    scopes: ["read:projects", "read:env"],
    expires: "Nov 19, 2026",
    daysLeft: 23,
  },
];

const defaultEventGroups: DevEventGroup[] = [
  {
    id: "deployment",
    name: "Deployments",
    events: [
      { id: "deployment.created", hint: "A build starts" },
      { id: "deployment.succeeded", hint: "A build is ready" },
      { id: "deployment.failed", hint: "A build or check fails" },
      { id: "deployment.promoted", hint: "A preview goes to production" },
    ],
  },
  {
    id: "project",
    name: "Projects",
    events: [
      { id: "project.created", hint: "A project is created" },
      { id: "project.deleted", hint: "A project is deleted" },
    ],
  },
  {
    id: "domain",
    name: "Domains",
    events: [
      { id: "domain.verified", hint: "DNS checks pass" },
      { id: "domain.expiring", hint: "A certificate is close to expiry" },
    ],
  },
  {
    id: "member",
    name: "Members",
    events: [
      { id: "member.added", hint: "Someone joins" },
      { id: "member.removed", hint: "Someone leaves" },
    ],
  },
];

const defaultEndpoints: DevEndpoint[] = [
  {
    id: "e1",
    url: "https://api.paperkite.app/webhooks/ridgeline",
    events: ["deployment.created", "deployment.succeeded", "deployment.failed", "deployment.promoted", "project.created"],
    secret: "rlsig_test_Q2m8vLx4TfR9kZp1Wd7nYc3h",
    deliveries: [
      { id: "d1", event: "deployment.failed", status: 503, latency: 2140, time: "2 min ago" },
      { id: "d2", event: "deployment.succeeded", status: "timeout", latency: 10000, time: "9 min ago" },
      { id: "d3", event: "deployment.promoted", status: 200, latency: 182, time: "1 hour ago" },
      { id: "d4", event: "deployment.created", status: 200, latency: 164, time: "1 hour ago" },
      { id: "d5", event: "project.created", status: 201, latency: 240, time: "3 hours ago" },
    ],
  },
  {
    id: "e2",
    url: "https://ops.ridgeline.app/hooks/deploy-bot",
    events: ["deployment.failed", "domain.verified", "domain.expiring", "member.added", "member.removed"],
    secret: "rlsig_test_Hn5bWq0Ys8Lr2Mc6Xe4Tj9Ka",
    deliveries: [
      { id: "d6", event: "member.added", status: 204, latency: 96, time: "26 min ago" },
      { id: "d7", event: "domain.verified", status: 204, latency: 88, time: "2 hours ago" },
      { id: "d8", event: "deployment.failed", status: 204, latency: 131, time: "Yesterday" },
    ],
  },
  {
    id: "e3",
    url: "https://ci.grovehouse.io/preview-comments",
    paused: true,
    events: ["deployment.succeeded"],
    secret: "rlsig_test_Pz3cVn7Rk1Gd5Sy9Bf2Lm6Qw",
    deliveries: [{ id: "d9", event: "deployment.succeeded", status: 200, latency: 301, time: "Oct 12" }],
  },
];

function useReducedMotionAfterMount() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && Boolean(prefers);
}

function randomToken(length: number) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

function isOk(status: DevDelivery["status"]) {
  return typeof status === "number" && status < 300;
}

function hostOf(url: string) {
  return url.replace(/^https?:\/\//, "").split("/")[0];
}

function formatLatency(ms: number) {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${ms} ms`;
}

function useCopy() {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  const copy = (text: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1800);
  };
  return { copied, copy };
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

function SwapIcon({ on, onIcon, offIcon }: { on: boolean; onIcon: ReactNode; offIcon: ReactNode }) {
  return (
    <AnimatePresence initial={false} mode="popLayout">
      <motion.span
        animate={{ opacity: 1, scale: 1 }}
        className="flex"
        exit={{ opacity: 0, scale: 0.8 }}
        initial={{ opacity: 0, scale: 0.8 }}
        key={on ? "on" : "off"}
        transition={{ duration: 0.15, ease: easeOut }}
      >
        {on ? onIcon : offIcon}
      </motion.span>
    </AnimatePresence>
  );
}

function SectionHeader({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <h2 className="font-medium text-sm">{title}</h2>
        <p className="text-pretty text-muted-foreground text-sm">{description}</p>
      </div>
      {action}
    </div>
  );
}

function ScopeChips({ scopes }: { scopes: string[] }) {
  const chip = "inline-flex h-5 items-center rounded-md bg-muted px-1.5 font-mono text-[11px] text-foreground";
  if (scopes.length === 0) return <span className="text-muted-foreground text-sm">None</span>;
  return (
    <span className="flex min-w-0 items-center gap-1">
      <span className={cn(chip, "truncate")}>{scopes[0]}</span>
      {scopes.length > 1 && <span className={cn(chip, "shrink-0 text-muted-foreground")}>+{scopes.length - 1}</span>}
    </span>
  );
}

function Expiry({ apiKey }: { apiKey: DevApiKey }) {
  if (!apiKey.expires) return <span className="text-muted-foreground">Never</span>;
  const soon = (apiKey.daysLeft ?? 99) < 14;
  return (
    <span className={cn("inline-flex items-center gap-1 tabular-nums", soon ? "text-destructive-foreground" : "text-muted-foreground")}>
      {apiKey.expires}
      {soon && <ClockIcon aria-label={`Expires in ${apiKey.daysLeft} days`} className="size-3.5" />}
    </span>
  );
}

function StatusCode({ status, busy, reduce }: { status: DevDelivery["status"]; busy: boolean; reduce: boolean }) {
  const ok = isOk(status);
  return (
    <span
      className={cn(
        "relative inline-flex h-5 w-[3.75rem] items-center justify-center overflow-hidden rounded-md px-1.5 font-medium font-mono text-[11px] tabular-nums transition-colors duration-200",
        busy
          ? "bg-muted text-muted-foreground"
          : ok
            ? "bg-success/10 text-success-foreground dark:bg-success/16"
            : "bg-destructive/8 text-destructive-foreground dark:bg-destructive/16",
      )}
    >
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center"
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
          key={busy ? "busy" : String(status)}
          transition={{ duration: 0.2, ease: easeOut }}
        >
          {busy ? <Spinner className="size-3" /> : status === "timeout" ? "timeout" : status}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function SecretReveal({ name, secret, onDone, reduce }: { name: string; secret: string; onDone: () => void; reduce: boolean }) {
  const { copied, copy } = useCopy();
  const [everCopied, setEverCopied] = useState(false);
  return (
    <>
      <DialogHeader>
        <DialogTitle>Save your key</DialogTitle>
        <DialogDescription>
          <span className="font-medium text-foreground">{name}</span> is ready. This is the only time the full key is shown.
        </DialogDescription>
      </DialogHeader>
      <DialogPanel className="flex flex-col gap-3">
        <div
          className={cn(
            "relative flex items-center gap-2 overflow-hidden rounded-lg border bg-muted/50 py-1.5 ps-3 pe-1.5 transition-colors duration-300",
            copied && "border-success/40 bg-success/6",
          )}
        >
          <AnimatePresence>
            {copied && !reduce && (
              <motion.span
                animate={{ x: "100%" }}
                aria-hidden
                className="pointer-events-none absolute inset-y-0 left-0 w-full bg-gradient-to-r from-transparent via-success/15 to-transparent"
                exit={{ opacity: 0 }}
                initial={{ x: "-100%" }}
                transition={{ duration: 0.6, ease: easeOut }}
              />
            )}
          </AnimatePresence>
          <code className="relative min-w-0 flex-1 break-all font-mono text-xs leading-5">{secret}</code>
          <Button
            className={cn("relative shrink-0", press)}
            onClick={() => {
              copy(secret);
              setEverCopied(true);
            }}
            size="sm"
            variant="outline"
          >
            <SwapIcon offIcon={<CopyIcon />} on={copied} onIcon={<CheckIcon className="text-success-foreground" />} />
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        <p className="flex items-start gap-2 text-pretty text-muted-foreground text-xs">
          <TriangleAlertIcon className="mt-px size-3.5 shrink-0 text-warning-foreground" />
          Store it in your secret manager now. If it’s lost, roll the key to get a new one.
        </p>
      </DialogPanel>
      <DialogFooter>
        <Button className={press} onClick={onDone} variant={everCopied ? "default" : "outline"}>
          {everCopied ? "Done" : "I’ve saved it"}
        </Button>
      </DialogFooter>
    </>
  );
}

function CreateKeyForm({
  resources,
  today,
  onCreate,
}: {
  resources: DevScopeResource[];
  today: string;
  onCreate: (name: string, scopes: string[], days: number) => void;
}) {
  const id = useId();
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<string[]>(["read:projects", "read:deployments"]);
  const [expiry, setExpiry] = useState("90");
  const days = Number(expiry);

  const setAccess = (resource: string, kind: "read" | "write", on: boolean) =>
    setScopes((all) => {
      const read = `read:${resource}`;
      const write = `write:${resource}`;
      const rest = all.filter((s) => s !== read && s !== write);
      const hasWrite = all.includes(write);
      if (kind === "write") return on ? [...rest, write, read] : [...rest, read];
      if (!on) return rest;
      return hasWrite ? [...rest, write, read] : [...rest, read];
    });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || scopes.length === 0) return;
    onCreate(name.trim(), [...scopes.filter((s) => s.startsWith("write")), ...scopes.filter((s) => s.startsWith("read"))], days);
  };

  return (
    <form className="contents" onSubmit={submit}>
      <DialogHeader>
        <DialogTitle>Create API key</DialogTitle>
        <DialogDescription>Keys act as the workspace, not as you. Give each one only what it needs.</DialogDescription>
      </DialogHeader>
      <DialogPanel className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-name`}>Name</Label>
          <Input autoFocus id={`${id}-name`} onChange={(e) => setName(e.target.value)} placeholder="Release pipeline" value={name} />
        </div>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 font-medium text-sm">Scopes</legend>
          <div className="divide-y rounded-lg border">
            {resources.map((r) => {
              const read = scopes.includes(`read:${r.id}`);
              const write = scopes.includes(`write:${r.id}`);
              return (
                <div className="flex items-center gap-3 px-3 py-2" key={r.id}>
                  <span className="min-w-0 flex-1 truncate text-sm">{r.name}</span>
                  <label className="flex cursor-pointer items-center gap-1.5 font-mono text-muted-foreground text-xs">
                    <Checkbox checked={read} onCheckedChange={(on) => setAccess(r.id, "read", Boolean(on))} />
                    read
                  </label>
                  <label
                    className={cn(
                      "flex w-14 items-center gap-1.5 font-mono text-muted-foreground text-xs",
                      r.readOnly ? "cursor-not-allowed opacity-40" : "cursor-pointer",
                    )}
                  >
                    <Checkbox checked={write} disabled={r.readOnly} onCheckedChange={(on) => setAccess(r.id, "write", Boolean(on))} />
                    write
                  </label>
                </div>
              );
            })}
          </div>
          <p className="text-muted-foreground text-xs">Write includes read.</p>
        </fieldset>
        <div className="flex flex-col gap-2">
          <Label>Expires</Label>
          <Select items={expiryOptions} onValueChange={(v) => v && setExpiry(v as string)} value={expiry}>
            <SelectTrigger aria-label="Expiry">
              <SelectValue />
            </SelectTrigger>
            <SelectPopup>
              {expiryOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
          <p className={cn("text-xs tabular-nums", days === 0 ? "text-warning-foreground" : "text-muted-foreground")}>
            {days === 0 ? "Keys that never expire are easy to forget about." : `Stops working on ${addDays(today, days)}.`}
          </p>
        </div>
      </DialogPanel>
      <DialogFooter>
        <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
        <Button className={press} disabled={!name.trim() || scopes.length === 0} type="submit">
          Create key
        </Button>
      </DialogFooter>
    </form>
  );
}

function EventsForm({
  groups,
  initial,
  url,
  onSave,
}: {
  groups: DevEventGroup[];
  initial: string[];
  url?: string;
  onSave: (events: string[], url: string) => void;
}) {
  const id = useId();
  const [selected, setSelected] = useState(initial);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const adding = url === undefined;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (adding && !/^https:\/\/[^\s/]+\.[^\s/]+/.test(value.trim())) {
      setError("Use a full https:// address.");
      return;
    }
    onSave(selected, adding ? value.trim() : url);
  };

  return (
    <form className="contents" onSubmit={submit}>
      <DialogHeader>
        <DialogTitle>{adding ? "Add endpoint" : "Events"}</DialogTitle>
        <DialogDescription>
          {adding ? "Ridgeline sends a signed POST to this URL for each event you pick." : <span className="break-all font-mono text-xs">{url}</span>}
        </DialogDescription>
      </DialogHeader>
      <DialogPanel className="flex flex-col gap-5">
        {adding && (
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-url`}>Endpoint URL</Label>
            <Input
              aria-describedby={error ? `${id}-error` : undefined}
              aria-invalid={error ? true : undefined}
              autoFocus
              id={`${id}-url`}
              onChange={(e) => {
                setValue(e.target.value);
                setError(null);
              }}
              placeholder="https://example.com/webhooks"
              type="url"
              value={value}
            />
            {error && (
              <p className="text-destructive-foreground text-xs" id={`${id}-error`}>
                {error}
              </p>
            )}
          </div>
        )}
        <div className="flex flex-col gap-4">
          {groups.map((g) => {
            const ids = g.events.map((e) => e.id);
            const count = ids.filter((e) => selected.includes(e)).length;
            return (
              <div className="flex flex-col gap-2" key={g.id}>
                <label className="flex w-fit cursor-pointer items-center gap-2 font-medium text-sm">
                  <Checkbox
                    checked={count === ids.length}
                    indeterminate={count > 0 && count < ids.length}
                    onCheckedChange={(on) => setSelected((s) => (on ? Array.from(new Set([...s, ...ids])) : s.filter((e) => !ids.includes(e))))}
                  />
                  {g.name}
                </label>
                <div className="grid gap-x-4 gap-y-1.5 ps-6 sm:grid-cols-2">
                  {g.events.map((ev) => (
                    <label className="flex cursor-pointer items-start gap-2" key={ev.id}>
                      <Checkbox
                        checked={selected.includes(ev.id)}
                        className="mt-0.5"
                        onCheckedChange={(on) => setSelected((s) => (on ? [...s, ev.id] : s.filter((e) => e !== ev.id)))}
                      />
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate font-mono text-xs">{ev.id}</span>
                        <span className="text-muted-foreground text-xs">{ev.hint}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </DialogPanel>
      <DialogFooter>
        <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
        <Button className={press} disabled={selected.length === 0} type="submit">
          {adding ? "Add endpoint" : "Save events"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function DeveloperSettings({
  className,
  today = "2026-10-27",
  keyPrefix = "dvl_test_",
  resources = defaultResources,
  apiKeys = defaultKeys,
  eventGroups = defaultEventGroups,
  endpoints: initialEndpoints = defaultEndpoints,
  onNavigate,
}: DeveloperSettingsProps) {
  const reduce = useReducedMotionAfterMount();
  const [keys, setKeys] = useState(apiKeys);
  const [endpoints, setEndpoints] = useState(initialEndpoints);
  const [selectedId, setSelectedId] = useState(initialEndpoints[0]?.id ?? "");
  const [keyDialog, setKeyDialog] = useState<{ mode: "create" } | { mode: "reveal"; name: string; secret: string } | null>(null);
  const [keyDialogOpen, setKeyDialogOpen] = useState(false);
  const [eventsDialog, setEventsDialog] = useState<{ endpointId?: string; key: number } | null>(null);
  const [eventsOpen, setEventsOpen] = useState(false);
  const [revoking, setRevoking] = useState<DevApiKey | null>(null);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [deleting, setDeleting] = useState<DevEndpoint | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [fresh, setFresh] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [rolled, setRolled] = useState<string | null>(null);
  const [busy, setBusy] = useState<string[]>([]);
  const counter = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const secretCopy = useCopy();

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  };

  const endpoint = endpoints.find((e) => e.id === selectedId) ?? endpoints[0];
  const statusOf = (e: DevEndpoint) => (e.paused ? "paused" : e.deliveries.some((d) => !isOk(d.status)) ? "failing" : "active");
  const updateEndpoint = (eid: string, fn: (e: DevEndpoint) => DevEndpoint) => setEndpoints((all) => all.map((e) => (e.id === eid ? fn(e) : e)));
  const totalEvents = eventGroups.reduce((n, g) => n + g.events.length, 0);

  const flash = (kid: string) => {
    setFresh(kid);
    later(() => setFresh((f) => (f === kid ? null : f)), 2400);
  };

  const createKey = (name: string, scopes: string[], days: number) => {
    const token = randomToken(32);
    counter.current += 1;
    const kid = `new-${counter.current}`;
    setKeys((all) => [
      { id: kid, name, last4: token.slice(-4), scopes, expires: days ? addDays(today, days) : undefined, daysLeft: days || undefined },
      ...all,
    ]);
    setKeyDialog({ mode: "reveal", name, secret: `${keyPrefix}${token}` });
    flash(kid);
  };

  const rollKey = (k: DevApiKey) => {
    const token = randomToken(32);
    setKeys((all) => all.map((x) => (x.id === k.id ? { ...x, last4: token.slice(-4), lastUsed: undefined } : x)));
    setKeyDialog({ mode: "reveal", name: k.name, secret: `${keyPrefix}${token}` });
    setKeyDialogOpen(true);
    flash(k.id);
  };

  const retry = (eid: string, ids: string[]) => {
    setBusy((b) => [...b, ...ids]);
    ids.forEach((did, i) =>
      later(
        () => {
          updateEndpoint(eid, (e) => ({
            ...e,
            deliveries: e.deliveries.map((d) =>
              d.id === did ? { ...d, status: 200, latency: 140 + ((did.charCodeAt(did.length - 1) * 37) % 160), time: "just now" } : d,
            ),
          }));
          setBusy((b) => b.filter((x) => x !== did));
        },
        900 + i * 240,
      ),
    );
  };

  const sendTest = (eid: string) => {
    counter.current += 1;
    const did = `test-${counter.current}`;
    updateEndpoint(eid, (e) => ({ ...e, deliveries: [{ id: did, event: "ping", status: 200, latency: 0, time: "just now" }, ...e.deliveries] }));
    retry(eid, [did]);
  };

  const fade = reduce ? { duration: 0 } : { duration: 0.22, ease: easeOut };
  const failed = endpoint ? endpoint.deliveries.filter((d) => !isOk(d.status)) : [];
  const eventsTarget = eventsDialog?.endpointId ? endpoints.find((e) => e.id === eventsDialog.endpointId) : undefined;

  return (
    <RidgelineShell active="developer" className={className} onNavigate={onNavigate}>
      <div className="mx-auto w-full max-w-2xl px-6 py-10 md:px-10">
        <h1 className="font-semibold text-2xl tracking-tight">API keys & webhooks</h1>
        <p className="mt-1 text-muted-foreground text-sm">Authenticate scripts against the Ridgeline API, and hear about changes as they happen.</p>

        <section className="mt-10">
          <SectionHeader
            action={
              <Button
                className={cn("shrink-0 self-start sm:self-auto", press)}
                onClick={() => {
                  setKeyDialog({ mode: "create" });
                  setKeyDialogOpen(true);
                }}
                size="sm"
              >
                <PlusIcon />
                Create key
              </Button>
            }
            description="Send a key as a bearer token, from servers only."
            title="API keys"
          />
          <div className="mt-3 overflow-hidden rounded-xl border bg-card">
            <div className="hidden grid-cols-[minmax(0,1fr)_10rem_7.5rem_2rem] items-center gap-3 border-b px-4 py-2.5 font-medium text-muted-foreground text-xs sm:grid">
              <span>Name</span>
              <span>Scopes</span>
              <span>Expires</span>
              <span className="sr-only">Actions</span>
            </div>
            <ul>
              <AnimatePresence initial={false}>
                {keys.map((k) => (
                  <motion.li
                    animate={{ opacity: 1, height: "auto" }}
                    className={cn("overflow-hidden border-b transition-colors duration-700 last:border-b-0", fresh === k.id && "bg-success/6")}
                    exit={{ opacity: 0, height: 0 }}
                    initial={{ opacity: 0, height: 0 }}
                    key={k.id}
                    transition={fade}
                  >
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_10rem_7.5rem_2rem]">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-sm">{k.name}</p>
                        <p className="truncate text-muted-foreground text-xs">
                          <span className="font-mono">
                            {keyPrefix}…{k.last4}
                          </span>
                          <span aria-hidden> · </span>
                          {k.lastUsed ? `used ${k.lastUsed}` : "never used"}
                        </p>
                      </div>
                      <div className="col-span-2 row-start-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 text-xs sm:contents sm:text-sm">
                        <ScopeChips scopes={k.scopes} />
                        <span className="sm:hidden">
                          <span className="text-muted-foreground">Expires </span>
                          <Expiry apiKey={k} />
                        </span>
                        <span className="hidden sm:inline">
                          <Expiry apiKey={k} />
                        </span>
                      </div>
                      <Menu>
                        <MenuTrigger
                          render={
                            <Button
                              aria-label={`Actions for ${k.name}`}
                              className={cn("col-start-2 row-start-1 justify-self-end sm:col-start-auto sm:row-start-auto", press)}
                              size="icon-sm"
                              variant="ghost"
                            />
                          }
                        >
                          <EllipsisIcon />
                        </MenuTrigger>
                        <MenuPopup align="end" className="w-48">
                          <MenuItem onClick={() => rollKey(k)}>
                            <RefreshCwIcon />
                            Roll key
                          </MenuItem>
                          <MenuSeparator />
                          <MenuItem
                            onClick={() => {
                              setRevoking(k);
                              setRevokeOpen(true);
                            }}
                            variant="destructive"
                          >
                            <Trash2Icon />
                            Revoke key
                          </MenuItem>
                        </MenuPopup>
                      </Menu>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
            {keys.length === 0 && (
              <div className="flex flex-col items-center gap-1 px-4 py-10 text-center">
                <p className="font-medium text-sm">No API keys</p>
                <p className="text-muted-foreground text-xs">Create one for CI, scripts or anything server-side.</p>
              </div>
            )}
          </div>
        </section>

        <section className="mt-10">
          <SectionHeader
            action={
              <Button
                className={cn("shrink-0 self-start sm:self-auto", press)}
                onClick={() => {
                  counter.current += 1;
                  setEventsDialog({ key: counter.current });
                  setEventsOpen(true);
                }}
                size="sm"
                variant="outline"
              >
                <PlusIcon />
                Add endpoint
              </Button>
            }
            description="Ridgeline posts signed events to these URLs."
            title="Webhooks"
          />
          <div className="mt-3 overflow-hidden rounded-xl border bg-card">
            <ul>
              <AnimatePresence initial={false}>
                {endpoints.map((e) => {
                  const s = statusOf(e);
                  const active = e.id === endpoint?.id;
                  return (
                    <motion.li
                      animate={{ opacity: 1, height: "auto" }}
                      className="relative overflow-hidden border-b last:border-b-0"
                      exit={{ opacity: 0, height: 0 }}
                      initial={{ opacity: 0, height: 0 }}
                      key={e.id}
                      transition={fade}
                    >
                      <div className={cn("flex items-center gap-3 py-3 ps-4 pe-3 transition-colors duration-150", active ? "bg-accent/50" : "hover:bg-accent/30")}>
                        <button
                          aria-current={active ? "true" : undefined}
                          className="flex min-w-0 flex-1 items-center gap-3 text-left outline-none after:absolute after:inset-0 focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-inset"
                          onClick={() => {
                            setSelectedId(e.id);
                            setRevealed(false);
                          }}
                          type="button"
                        >
                          <span
                            aria-hidden
                            className={cn(
                              "size-2 shrink-0 rounded-full",
                              s === "active" && "bg-success",
                              s === "failing" && "bg-destructive",
                              s === "paused" && "bg-muted-foreground/40",
                            )}
                          />
                          <span className="flex min-w-0 flex-col">
                            <span className="truncate font-mono text-[13px]">{e.url.replace(/^https:\/\//, "")}</span>
                            <span className={cn("text-xs", s === "failing" ? "text-destructive-foreground" : "text-muted-foreground")}>
                              {e.events.length === 1 ? "1 event" : `${e.events.length} events`} ·{" "}
                              {s === "failing"
                                ? `${e.deliveries.filter((d) => !isOk(d.status)).length} failing`
                                : s === "paused"
                                  ? "Paused"
                                  : "Healthy"}
                            </span>
                          </span>
                        </button>
                        <Switch
                          aria-label={`Send events to ${hostOf(e.url)}`}
                          checked={!e.paused}
                          className="relative"
                          onCheckedChange={(on) => updateEndpoint(e.id, (x) => ({ ...x, paused: !on }))}
                        />
                        <Menu>
                          <MenuTrigger render={<Button aria-label={`Actions for ${hostOf(e.url)}`} className={cn("relative", press)} size="icon-sm" variant="ghost" />}>
                            <EllipsisIcon />
                          </MenuTrigger>
                          <MenuPopup align="end" className="w-48">
                            <MenuItem
                              onClick={() => {
                                counter.current += 1;
                                setEventsDialog({ endpointId: e.id, key: counter.current });
                                setEventsOpen(true);
                              }}
                            >
                              <CheckIcon />
                              Edit events
                            </MenuItem>
                            <MenuItem
                              onClick={() => {
                                setSelectedId(e.id);
                                sendTest(e.id);
                              }}
                            >
                              <SendIcon />
                              Send test event
                            </MenuItem>
                            <MenuSeparator />
                            <MenuItem
                              onClick={() => {
                                setDeleting(e);
                                setDeleteOpen(true);
                              }}
                              variant="destructive"
                            >
                              <Trash2Icon />
                              Delete endpoint
                            </MenuItem>
                          </MenuPopup>
                        </Menu>
                      </div>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
            {endpoints.length === 0 && (
              <div className="flex flex-col items-center gap-1 px-4 py-10 text-center">
                <p className="font-medium text-sm">No endpoints</p>
                <p className="text-muted-foreground text-xs">Add one to hear about deploys, domains and members.</p>
              </div>
            )}
          </div>

          {endpoint && (
            <>
              <h3 className="mt-6 truncate font-medium text-muted-foreground text-xs">
                Settings for <span className="font-mono">{hostOf(endpoint.url)}</span>
              </h3>
              <div className="mt-2 divide-y rounded-xl border bg-card">
                <div className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm">Signing secret</p>
                    <p className="text-muted-foreground text-xs">
                      {rolled === endpoint.id ? "Rolled just now. The old one works for 24 more hours." : "Verify the ridgeline-signature header with it."}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="flex min-w-0 flex-1 items-center rounded-lg border bg-muted/50 py-0.5 ps-2.5 pe-0.5 sm:w-56 sm:flex-none">
                      <code className="min-w-0 flex-1 truncate font-mono text-xs">{revealed ? endpoint.secret : `rlsig_test_${"•".repeat(10)}`}</code>
                      <Button
                        aria-label={revealed ? "Hide secret" : "Reveal secret"}
                        aria-pressed={revealed}
                        className={press}
                        onClick={() => setRevealed((r) => !r)}
                        size="icon-xs"
                        variant="ghost"
                      >
                        <SwapIcon offIcon={<EyeIcon />} on={revealed} onIcon={<EyeOffIcon />} />
                      </Button>
                      <Button aria-label="Copy secret" className={press} onClick={() => secretCopy.copy(endpoint.secret)} size="icon-xs" variant="ghost">
                        <SwapIcon offIcon={<CopyIcon />} on={secretCopy.copied} onIcon={<CheckIcon className="text-success-foreground" />} />
                      </Button>
                    </div>
                    <Button
                      className={press}
                      onClick={() => {
                        updateEndpoint(endpoint.id, (x) => ({ ...x, secret: `rlsig_test_${randomToken(24)}` }));
                        setRolled(endpoint.id);
                        setRevealed(true);
                      }}
                      size="sm"
                      variant="outline"
                    >
                      Roll
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-4 px-4 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm">Events</p>
                    <p className="truncate text-muted-foreground text-xs tabular-nums">
                      {endpoint.events.length} of {totalEvents} · {endpoint.events.slice(0, 2).join(", ")}
                      {endpoint.events.length > 2 && ` and ${endpoint.events.length - 2} more`}
                    </p>
                  </div>
                  <Button
                    className={press}
                    onClick={() => {
                      counter.current += 1;
                      setEventsDialog({ endpointId: endpoint.id, key: counter.current });
                      setEventsOpen(true);
                    }}
                    size="sm"
                    variant="outline"
                  >
                    Edit
                  </Button>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between gap-3">
                <h3 className="font-medium text-muted-foreground text-xs">Recent deliveries</h3>
                <div className="-me-2 flex items-center gap-1">
                  {failed.length > 1 && (
                    <Button
                      className={press}
                      disabled={failed.every((d) => busy.includes(d.id))}
                      onClick={() => retry(endpoint.id, failed.filter((d) => !busy.includes(d.id)).map((d) => d.id))}
                      size="xs"
                      variant="ghost"
                    >
                      <RotateCwIcon />
                      Retry failed
                    </Button>
                  )}
                  <Button className={press} onClick={() => sendTest(endpoint.id)} size="xs" variant="ghost">
                    <SendIcon />
                    Send test
                  </Button>
                </div>
              </div>
              <div className="mt-2 overflow-hidden rounded-xl border bg-card">
                <div className="hidden grid-cols-[minmax(0,1fr)_4.5rem_4.5rem_6rem_4.5rem] items-center gap-3 border-b px-4 py-2.5 font-medium text-muted-foreground text-xs sm:grid">
                  <span>Event</span>
                  <span>Status</span>
                  <span className="text-right">Latency</span>
                  <span className="text-right">Time</span>
                  <span className="sr-only">Actions</span>
                </div>
                <ul>
                  <AnimatePresence initial={false}>
                    {endpoint.deliveries.map((d) => {
                      const ok = isOk(d.status);
                      const isBusy = busy.includes(d.id);
                      return (
                        <motion.li
                          animate={{ opacity: 1, height: "auto" }}
                          className="overflow-hidden border-b last:border-b-0"
                          exit={{ opacity: 0, height: 0 }}
                          initial={{ opacity: 0, height: 0 }}
                          key={d.id}
                          transition={fade}
                        >
                          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 px-4 py-2.5 sm:grid-cols-[minmax(0,1fr)_4.5rem_4.5rem_6rem_4.5rem]">
                            <span className="col-start-2 row-start-1 truncate font-mono text-[13px] sm:col-start-auto">{d.event}</span>
                            <span className="col-start-1 row-span-2 row-start-1 sm:col-start-auto sm:row-span-1 sm:row-start-auto">
                              <StatusCode busy={isBusy} reduce={reduce} status={d.status} />
                            </span>
                            <span
                              className={cn(
                                "col-start-2 row-start-2 font-mono text-muted-foreground text-xs tabular-nums sm:col-start-auto sm:row-start-auto sm:text-right",
                                !isBusy && d.latency >= 1000 && "text-warning-foreground",
                              )}
                            >
                              {isBusy ? "…" : formatLatency(d.latency)}
                              <span className="font-sans text-muted-foreground sm:hidden"> · {d.time}</span>
                            </span>
                            <span className="hidden text-right text-muted-foreground text-sm sm:block">{d.time}</span>
                            <span className="col-start-3 row-span-2 row-start-1 flex justify-end sm:col-start-auto sm:row-span-1 sm:row-start-auto">
                              {!ok && (
                                <Button className={press} disabled={isBusy} onClick={() => retry(endpoint.id, [d.id])} size="xs" variant="outline">
                                  <RotateCwIcon />
                                  Retry
                                </Button>
                              )}
                            </span>
                          </div>
                        </motion.li>
                      );
                    })}
                  </AnimatePresence>
                </ul>
                {endpoint.deliveries.length === 0 && (
                  <p className="px-4 py-8 text-center text-muted-foreground text-sm">Nothing sent yet. Send a test event to check it answers.</p>
                )}
              </div>
            </>
          )}
        </section>
      </div>

      <Dialog onOpenChange={setKeyDialogOpen} open={keyDialogOpen}>
        <DialogPopup className="sm:max-w-md" showCloseButton={keyDialog?.mode === "create"}>
          {keyDialog?.mode === "reveal" ? (
            <SecretReveal key={keyDialog.secret} name={keyDialog.name} onDone={() => setKeyDialogOpen(false)} reduce={reduce} secret={keyDialog.secret} />
          ) : (
            <CreateKeyForm onCreate={createKey} resources={resources} today={today} />
          )}
        </DialogPopup>
      </Dialog>

      <Dialog onOpenChange={setEventsOpen} open={eventsOpen}>
        <DialogPopup className="sm:max-w-lg">
          {eventsDialog && (
            <EventsForm
              groups={eventGroups}
              initial={eventsTarget?.events ?? ["deployment.failed"]}
              key={eventsDialog.key}
              onSave={(events, url) => {
                if (eventsTarget) {
                  updateEndpoint(eventsTarget.id, (x) => ({ ...x, events }));
                } else {
                  counter.current += 1;
                  const eid = `ep-${counter.current}`;
                  setEndpoints((all) => [...all, { id: eid, url, events, secret: `rlsig_test_${randomToken(24)}`, deliveries: [] }]);
                  setSelectedId(eid);
                  setRevealed(false);
                }
                setEventsOpen(false);
              }}
              url={eventsTarget?.url}
            />
          )}
        </DialogPopup>
      </Dialog>

      <AlertDialog onOpenChange={setRevokeOpen} open={revokeOpen}>
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke {revoking?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Anything using <span className="font-mono text-foreground">…{revoking?.last4}</span> stops working straight away. This can’t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="ghost" />}>Cancel</AlertDialogClose>
            <AlertDialogClose
              render={<Button onClick={() => revoking && setKeys((all) => all.filter((x) => x.id !== revoking.id))} variant="destructive" />}
            >
              Revoke key
            </AlertDialogClose>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>

      <AlertDialog onOpenChange={setDeleteOpen} open={deleteOpen}>
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this endpoint?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="break-all font-mono text-foreground">{deleting?.url}</span> stops receiving events, and its delivery history goes with it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="ghost" />}>Cancel</AlertDialogClose>
            <AlertDialogClose
              render={
                <Button
                  onClick={() => {
                    if (!deleting) return;
                    const next = endpoints.find((x) => x.id !== deleting.id);
                    setEndpoints((all) => all.filter((x) => x.id !== deleting.id));
                    if (selectedId === deleting.id && next) setSelectedId(next.id);
                  }}
                  variant="destructive"
                />
              }
            >
              Delete endpoint
            </AlertDialogClose>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </RidgelineShell>
  );
}
