"use client";

import {
  ArrowLeftIcon,
  BellIcon,
  CheckIcon,
  CopyIcon,
  CreditCardIcon,
  DownloadIcon,
  FingerprintIcon,
  KeyRoundIcon,
  LaptopIcon,
  LogOutIcon,
  MonitorIcon,
  MoreHorizontalIcon,
  PaletteIcon,
  PencilIcon,
  PlusIcon,
  SettingsIcon,
  ShieldIcon,
  SmartphoneIcon,
  TabletIcon,
  Trash2Icon,
  UsbIcon,
  UserIcon,
  UsersIcon,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, type InputProps } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Menu, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from "@/components/ui/menu";

export type SettingsSectionId =
  | "profile"
  | "appearance"
  | "notifications"
  | "security"
  | "general"
  | "members"
  | "billing"
  | "developer";

export type SecurityDeviceKind = "laptop" | "desktop" | "phone" | "tablet" | "key";

export interface SecurityPasskey {
  id: string;
  name: string;
  kind: SecurityDeviceKind;
  added: string;
  lastUsed: string;
}

export interface SecuritySession {
  id: string;
  browser: string;
  os: string;
  kind: SecurityDeviceKind;
  location: string;
  lastActive: string;
  current?: boolean;
}

export interface SecuritySettingsProps {
  className?: string;
  passwordChanged?: string;
  passkeys?: SecurityPasskey[];
  sessions?: SecuritySession[];
  authenticatorSince?: string;
  recoveryCodesLeft?: number;
  recoveryCodesSaved?: boolean;
  newPasskey?: { name: string; kind: SecurityDeviceKind; authenticator: string };
  onNavigate?: (section: SettingsSectionId) => void;
}

const easeOut = [0.23, 1, 0.32, 1] as const;

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

const deviceIcons: Record<SecurityDeviceKind, ReactNode> = {
  laptop: <LaptopIcon />,
  desktop: <MonitorIcon />,
  phone: <SmartphoneIcon />,
  tablet: <TabletIcon />,
  key: <UsbIcon />,
};

const defaultPasskeys: SecurityPasskey[] = [
  { id: "pk1", name: "MacBook Air", kind: "laptop", added: "Mar 4, 2026", lastUsed: "2 hours ago" },
  { id: "pk2", name: "Pixel 9", kind: "phone", added: "Jun 18, 2026", lastUsed: "Yesterday" },
  { id: "pk3", name: "YubiKey 5C", kind: "key", added: "Aug 30, 2026", lastUsed: "3 weeks ago" },
];

const defaultSessions: SecuritySession[] = [
  { id: "s1", browser: "Chrome", os: "macOS", kind: "laptop", location: "Lisbon, PT", lastActive: "Now", current: true },
  { id: "s2", browser: "Ridgeline", os: "Android", kind: "phone", location: "Lisbon, PT", lastActive: "18 min ago" },
  { id: "s3", browser: "Safari", os: "iPadOS", kind: "tablet", location: "Porto, PT", lastActive: "2 days ago" },
  { id: "s4", browser: "Firefox", os: "Windows", kind: "desktop", location: "Rotterdam, NL", lastActive: "9 days ago" },
];

const defaultNewPasskey = { name: "MacBook Pro", kind: "laptop" as const, authenticator: "Touch ID" };

const codeAlphabet = "abcdefghjkmnpqrstuvwxyz23456789";

function makeCodes(seed: number, count = 10) {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return Array.from({ length: count }, () => {
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += codeAlphabet[Math.floor(next() * codeAlphabet.length)];
      if (i === 3) code += "-";
    }
    return code;
  });
}

function useFocusOnMount<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, []);
  return ref;
}

function AutoFocusInput(props: InputProps) {
  const ref = useFocusOnMount<HTMLInputElement>();
  return <Input ref={ref} {...props} />;
}

function useCalmMotion() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && Boolean(prefers);
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

function SectionHeader({ title, description, action }: { title: string; description: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <h2 className="font-medium text-sm">{title}</h2>
        <p className="text-pretty text-muted-foreground text-sm">{description}</p>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

function Collapse({ open, children, reduce }: { open: boolean; children: ReactNode; reduce: boolean }) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          animate={{ height: "auto", opacity: 1 }}
          className="overflow-hidden"
          exit={{ height: 0, opacity: 0 }}
          initial={{ height: 0, opacity: 0 }}
          transition={reduce ? { duration: 0 } : { duration: 0.22, ease: easeOut }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ConfirmStrip({
  tone = "destructive",
  title,
  detail,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  tone?: "destructive" | "default";
  title: string;
  detail: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const cancelRef = useFocusOnMount<HTMLButtonElement>();
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-2.5 border-t px-4 py-3",
        tone === "destructive" ? "bg-destructive/4" : "bg-muted/40",
      )}
      role="alert"
    >
      <p className="min-w-0 flex-1 basis-56 text-pretty text-sm">
        <span className="font-medium">{title}</span> <span className="text-muted-foreground">{detail}</span>
      </p>
      <div className="flex gap-2">
        <Button onClick={onCancel} ref={cancelRef} size="sm" variant="ghost">
          Cancel
        </Button>
        <Button onClick={onConfirm} size="sm" variant={tone === "destructive" ? "destructive" : "default"}>
          {confirmLabel}
        </Button>
      </div>
    </div>
  );
}

function DeviceIcon({ kind, className }: { kind: SecurityDeviceKind; className?: string }) {
  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-lg border bg-background text-muted-foreground [&_svg]:size-4",
        className,
      )}
    >
      {deviceIcons[kind]}
    </span>
  );
}

function ProgressRing({ steps, done, reduce }: { steps: number; done: number; reduce: boolean }) {
  const r = 8;
  const c = 2 * Math.PI * r;
  const gap = 3;
  const seg = c / steps - gap;
  const complete = done === steps;
  return (
    <svg aria-hidden className="size-5 shrink-0 -rotate-90" fill="none" viewBox="0 0 20 20">
      {Array.from({ length: steps }, (_, i) => (
        <motion.circle
          animate={{ opacity: i < done ? 1 : 0.18 }}
          className={cn(
            "transition-[stroke] duration-300",
            i < done ? (complete ? "stroke-success" : "stroke-foreground") : "stroke-foreground",
          )}
          cx="10"
          cy="10"
          initial={false}
          key={i}
          r={r}
          strokeDasharray={`${seg.toFixed(2)} ${(c - seg).toFixed(2)}`}
          strokeDashoffset={(-(i * (c / steps)) - gap / 2).toFixed(2)}
          strokeLinecap="round"
          strokeWidth="2.5"
          transition={reduce ? { duration: 0 } : { duration: 0.3, ease: easeOut }}
        />
      ))}
    </svg>
  );
}

function DrawnCheck({ className }: { className?: string }) {
  return (
    <svg aria-hidden className={cn("size-3.5", className)} fill="none" viewBox="0 0 16 16">
      <motion.path
        animate={{ pathLength: 1 }}
        d="M3.5 8.5 6.5 11.5 12.5 4.5"
        initial={{ pathLength: 0 }}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        transition={{ duration: 0.3, ease: easeOut, delay: 0.05 }}
      />
    </svg>
  );
}

function PasswordRow({ changed, reduce }: { changed: string; reduce: boolean }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [updated, setUpdated] = useState(false);
  const inputId = useId();
  const errorId = useId();

  const submit = () => {
    if (value.length < 12) return setError("Use at least 12 characters.");
    setOpen(false);
    setValue("");
    setError(null);
    setUpdated(true);
  };

  return (
    <div className="mt-3 overflow-hidden rounded-xl border bg-card">
      <div className="flex items-center gap-4 px-4 py-3.5">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="font-medium text-sm">Password</span>
          <span className="flex items-center gap-1 text-muted-foreground text-xs">
            {updated && <DrawnCheck className="text-success-foreground" />}
            {updated ? "Changed just now" : `Last changed ${changed}`}
          </span>
        </div>
        <Button onClick={() => setOpen((v) => !v)} size="sm" variant="outline">
          {open ? "Cancel" : "Change"}
        </Button>
      </div>
      <Collapse open={open} reduce={reduce}>
        <form
          className="flex flex-col gap-2 border-t bg-muted/30 px-4 py-3.5"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <Label htmlFor={inputId}>New password</Label>
          <div className="flex gap-2">
            <AutoFocusInput
              aria-describedby={error ? errorId : undefined}
              aria-invalid={!!error || undefined}
              autoComplete="new-password"
              id={inputId}
              onChange={(e) => {
                setValue(e.target.value);
                if (error) setError(null);
              }}
              type="password"
              value={value}
            />
            <Button type="submit">Update</Button>
          </div>
          <p className={cn("text-xs", error ? "text-destructive-foreground" : "text-muted-foreground")} id={errorId}>
            {error ?? "Other sessions stay signed in. Sign them out below if you need to."}
          </p>
        </form>
      </Collapse>
    </div>
  );
}

function PasskeyRow({
  passkey,
  isLast,
  isNew,
  editing,
  confirming,
  onRename,
  onStartRename,
  onCancelRename,
  onAskRemove,
  onCancelRemove,
  onRemove,
  reduce,
}: {
  passkey: SecurityPasskey;
  isLast: boolean;
  isNew: boolean;
  editing: boolean;
  confirming: boolean;
  onRename: (name: string) => void;
  onStartRename: () => void;
  onCancelRename: () => void;
  onAskRemove: () => void;
  onCancelRemove: () => void;
  onRemove: () => void;
  reduce: boolean;
}) {
  const [draft, setDraft] = useState(passkey.name);
  const inputId = useId();

  useEffect(() => {
    if (editing) setDraft(passkey.name);
  }, [editing, passkey.name]);

  const commit = () => {
    const name = draft.trim();
    if (name && name !== passkey.name) onRename(name);
    else onCancelRename();
  };

  return (
    <motion.li
      animate={{ opacity: 1, height: "auto" }}
      className="relative overflow-hidden border-t first:border-t-0"
      exit={{ opacity: 0, height: 0 }}
      initial={reduce ? false : { opacity: 0, height: 0 }}
      transition={reduce ? { duration: 0 } : { duration: 0.24, ease: easeOut }}
    >
      {isNew && !reduce && (
        <motion.span
          animate={{ opacity: 0 }}
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-success/8"
          initial={{ opacity: 1 }}
          transition={{ duration: 1.4, ease: "easeOut", delay: 0.3 }}
        />
      )}
      <div className="relative flex items-center gap-3 px-4 py-3 sm:grid sm:grid-cols-[minmax(0,1fr)_7.5rem_7.5rem_2rem] sm:gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <DeviceIcon kind={passkey.kind} />
          <div className="flex min-w-0 flex-1 flex-col">
            {editing ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  commit();
                }}
              >
                <Label className="sr-only" htmlFor={inputId}>
                  Passkey name
                </Label>
                <AutoFocusInput

                  id={inputId}
                  maxLength={40}
                  onBlur={commit}
                  onChange={(e) => setDraft(e.target.value)}
                  onFocus={(e) => e.currentTarget.select()}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      e.preventDefault();
                      onCancelRename();
                    }
                  }}
                  size="sm"
                  value={draft}
                />
              </form>
            ) : (
              <span className="truncate font-medium text-sm">{passkey.name}</span>
            )}
            <span className="truncate text-muted-foreground text-xs sm:hidden">
              Added {passkey.added} · {passkey.lastUsed === "Never" ? "Not used yet" : `Used ${passkey.lastUsed}`}
            </span>
          </div>
        </div>
        <span className="hidden text-muted-foreground text-sm sm:block">{passkey.added}</span>
        <span className="hidden text-muted-foreground text-sm sm:block">
          {passkey.lastUsed === "Never" ? "Not yet" : passkey.lastUsed}
        </span>
        <Menu>
          <MenuTrigger
            render={<Button aria-label={`Options for ${passkey.name}`} className="shrink-0" size="icon-sm" variant="ghost" />}
          >
            <MoreHorizontalIcon />
          </MenuTrigger>
          <MenuPopup align="end">
            <MenuItem onClick={onStartRename}>
              <PencilIcon /> Rename
            </MenuItem>
            <MenuSeparator />
            <MenuItem onClick={onAskRemove} variant="destructive">
              <Trash2Icon /> Remove
            </MenuItem>
          </MenuPopup>
        </Menu>
      </div>
      <Collapse open={confirming} reduce={reduce}>
        <ConfirmStrip
          confirmLabel="Remove"
          detail={
            isLast
              ? "It's your only passkey, so you'll sign in with your password and a code."
              : "You can still sign in with your other passkeys."
          }
          onCancel={onCancelRemove}
          onConfirm={onRemove}
          title={`Remove ${passkey.name}?`}
        />
      </Collapse>
    </motion.li>
  );
}

function PendingPasskeyRow({
  authenticator,
  onCancel,
  reduce,
}: {
  authenticator: string;
  onCancel: () => void;
  reduce: boolean;
}) {
  return (
    <motion.li
      animate={{ opacity: 1, height: "auto" }}
      className="overflow-hidden border-t first:border-t-0"
      exit={{ opacity: 0, height: 0 }}
      initial={reduce ? false : { opacity: 0, height: 0 }}
      transition={reduce ? { duration: 0 } : { duration: 0.24, ease: easeOut }}
    >
      <div className="flex items-center gap-3 px-4 py-3" role="status">
        <span className="relative flex size-8 shrink-0 items-center justify-center rounded-lg border bg-background text-foreground">
          {!reduce && (
            <motion.span
              animate={{ opacity: [0.6, 0], scale: [1, 1.45] }}
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-lg border border-foreground/30"
              transition={{ duration: 1.4, ease: "easeOut", repeat: Number.POSITIVE_INFINITY }}
            />
          )}
          <FingerprintIcon className="size-4" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="font-medium text-sm">Waiting for your device…</span>
          <span className="truncate text-muted-foreground text-xs">Confirm with {authenticator} to create the passkey</span>
        </div>
        <Button onClick={onCancel} size="sm" variant="ghost">
          Cancel
        </Button>
      </div>
    </motion.li>
  );
}

function RecoveryCodesPanel({
  codes,
  used,
  copied,
  onCopy,
  onDownload,
}: {
  codes: string[];
  used: number;
  copied: boolean;
  onCopy: () => void;
  onDownload: () => void;
}) {
  return (
    <div className="border-t bg-muted/30 px-4 py-4">
      <ol className="grid max-w-md grid-cols-2 gap-x-6 gap-y-2 font-mono text-sm tabular-nums">
        {codes.map((code, i) => (
          <li className="flex items-baseline gap-3" key={code + i}>
            <span className="w-4 text-right text-muted-foreground/70 text-xs">{i + 1}</span>
            <span className={cn(i < used && "text-muted-foreground/60 line-through")}>{code}</span>
            {i < used && <span className="sr-only">(used)</span>}
          </li>
        ))}
      </ol>
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2.5">
        <p className="min-w-0 flex-1 basis-48 text-pretty text-muted-foreground text-xs">
          Each code works once. Keep them somewhere other than this device.
        </p>
        <div className="flex gap-2">
          <Button onClick={onDownload} size="sm" variant="ghost">
            <DownloadIcon /> Download
          </Button>
          <Button className="min-w-22" onClick={onCopy} size="sm" variant="outline">
            <AnimatePresence initial={false} mode="popLayout">
              <motion.span
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-1.5"
                exit={{ opacity: 0, scale: 0.96 }}
                initial={{ opacity: 0, scale: 0.96 }}
                key={copied ? "copied" : "copy"}
                transition={{ duration: 0.15, ease: easeOut }}
              >
                {copied ? <DrawnCheck className="size-4 text-success-foreground" /> : <CopyIcon />}
                {copied ? "Copied" : "Copy"}
              </motion.span>
            </AnimatePresence>
          </Button>
        </div>
      </div>
    </div>
  );
}

function SessionRow({
  session,
  index,
  onSignOut,
  reduce,
}: {
  session: SecuritySession;
  index: number;
  onSignOut: () => void;
  reduce: boolean;
}) {
  return (
    <motion.li
      animate={{ opacity: 1, x: 0, height: "auto" }}
      className="overflow-hidden border-t first:border-t-0"
      exit="leave"
      initial={false}
      transition={reduce ? { duration: 0 } : { duration: 0.24, ease: easeOut }}
      variants={{
        leave: (stagger: boolean) => {
          const delay = stagger ? index * 0.05 : 0;
          return {
            opacity: 0,
            x: reduce ? 0 : 24,
            height: 0,
            transition: reduce
              ? { duration: 0.12 }
              : {
                  opacity: { duration: 0.16, delay },
                  x: { duration: 0.22, ease: easeOut, delay },
                  height: { duration: 0.22, ease: easeOut, delay: 0.1 + delay },
                },
          };
        },
      }}
    >
      <div className="flex items-center gap-3 px-4 py-3 sm:grid sm:grid-cols-[minmax(0,1fr)_6.5rem_5.5rem_4.5rem] sm:gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <DeviceIcon kind={session.kind} />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate font-medium text-sm">
                {session.browser} on {session.os}
              </span>
              {session.current && (
                <Badge className="shrink-0" variant="success">
                  This device
                </Badge>
              )}
            </span>
            <span className="truncate text-muted-foreground text-xs sm:hidden">
              {session.location} · {session.current ? "Active now" : session.lastActive}
            </span>
          </div>
        </div>
        <span className="hidden truncate text-muted-foreground text-sm sm:block">{session.location}</span>
        <span className={cn("hidden text-sm sm:block", session.current ? "text-success-foreground" : "text-muted-foreground")}>
          {session.current ? "Active now" : session.lastActive}
        </span>
        <div className="flex shrink-0 justify-end">
          {!session.current && (
            <Button
              aria-label={`Sign out ${session.browser} on ${session.os}`}
              onClick={onSignOut}
              size="sm"
              variant="ghost"
            >
              <LogOutIcon className="sm:hidden" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          )}
        </div>
      </div>
    </motion.li>
  );
}

export function SecuritySettings({
  className,
  passwordChanged = "4 months ago",
  passkeys: initialPasskeys = defaultPasskeys,
  sessions: initialSessions = defaultSessions,
  authenticatorSince = "Jan 12, 2026",
  recoveryCodesLeft = 8,
  recoveryCodesSaved = false,
  newPasskey = defaultNewPasskey,
  onNavigate,
}: SecuritySettingsProps) {
  const reduce = useCalmMotion();

  const [passkeys, setPasskeys] = useState(initialPasskeys);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [newId, setNewId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [created, setCreated] = useState(0);

  const [authOn, setAuthOn] = useState(true);
  const [confirmDisable, setConfirmDisable] = useState(false);
  const [codesOpen, setCodesOpen] = useState(false);
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [codeSeed, setCodeSeed] = useState(4471);
  const [used, setUsed] = useState(Math.max(0, 10 - recoveryCodesLeft));
  const [saved, setSaved] = useState(recoveryCodesSaved);
  const [copied, setCopied] = useState(false);

  const [sessions, setSessions] = useState(initialSessions);
  const [confirmAll, setConfirmAll] = useState(false);
  const [bulk, setBulk] = useState(false);

  const codes = makeCodes(codeSeed);
  const others = sessions.filter((s) => !s.current);
  const steps = [
    { done: passkeys.length > 0, hint: "Add a passkey" },
    { done: authOn, hint: "Turn on two-factor" },
    { done: authOn && saved, hint: "Save your recovery codes" },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const nextStep = steps.find((s) => !s.done);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(t);
  }, [copied]);

  useEffect(() => {
    if (!pending) return;
    const t = setTimeout(
      () => {
        const id = `pk-new-${created + 1}`;
        setCreated((c) => c + 1);
        setPasskeys((all) => [
          ...all,
          { id, name: newPasskey.name, kind: newPasskey.kind, added: "Today", lastUsed: "Never" },
        ]);
        setNewId(id);
        setEditingId(id);
        setPending(false);
      },
      reduce ? 400 : 1600,
    );
    return () => clearTimeout(t);
  }, [pending, created, newPasskey.name, newPasskey.kind, reduce]);

  const copyCodes = () => {
    const text = codes.filter((_, i) => i >= used).join("\n");
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(true);
    setSaved(true);
  };

  const downloadCodes = () => {
    const text = `Ridgeline recovery codes for ada@ridgeline.app\n\n${codes.filter((_, i) => i >= used).join("\n")}\n`;
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "ridgeline-recovery-codes.txt" });
    a.click();
    URL.revokeObjectURL(url);
    setSaved(true);
  };

  const fixNext = () => {
    if (!passkeys.length) setPending(true);
    else if (!authOn) setAuthOn(true);
    else setCodesOpen(true);
  };

  return (
    <RidgelineShell active="security" className={className} onNavigate={onNavigate}>
      <div className="mx-auto w-full max-w-2xl px-6 py-10 md:px-10">
        <h1 className="font-semibold text-2xl tracking-tight">Security</h1>
        <p className="mt-1 text-muted-foreground text-sm">How you sign in, and where you're signed in right now.</p>
        <div aria-live="polite" className="mt-4 flex min-h-6 flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <ProgressRing done={doneCount} reduce={reduce} steps={steps.length} />
          <span className="font-medium tabular-nums">
            {doneCount === steps.length
              ? "All recommended steps done"
              : `${doneCount} of ${steps.length} recommended steps done`}
          </span>
          {nextStep && (
            <>
              <span aria-hidden className="text-muted-foreground max-sm:hidden">
                ·
              </span>
              <button
                className="cursor-pointer rounded-sm max-sm:basis-full max-sm:ps-7 max-sm:text-left text-muted-foreground underline-offset-4 outline-none transition-colors hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                onClick={fixNext}
                type="button"
              >
                {nextStep.hint}
              </button>
            </>
          )}
        </div>

        <section className="mt-10">
          <SectionHeader description="How you prove it's you when a passkey isn't handy." title="Sign-in" />
          <PasswordRow changed={passwordChanged} reduce={reduce} />
        </section>

        <section className="mt-10">
          <SectionHeader
            description="A second check after your password, so a leaked password isn't enough."
            title="Two-factor authentication"
          />
          <div className="mt-3 overflow-hidden rounded-xl border bg-card">
            <div className="flex items-center gap-4 px-4 py-3.5">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex items-center gap-2">
                  <span className="font-medium text-sm">Authenticator app</span>
                  <Badge variant={authOn ? "success" : "outline"}>{authOn ? "Enabled" : "Off"}</Badge>
                </span>
                <span className="text-pretty text-muted-foreground text-xs">
                  {authOn ? `6-digit codes from an app on your phone. Added ${authenticatorSince}.` : "Use an app on your phone for 6-digit codes."}
                </span>
              </div>
              {authOn ? (
                <Button onClick={() => setConfirmDisable((v) => !v)} size="sm" variant="outline">
                  Disable
                </Button>
              ) : (
                <Button onClick={() => setAuthOn(true)} size="sm" variant="outline">
                  Set up
                </Button>
              )}
            </div>
            <Collapse open={confirmDisable && authOn} reduce={reduce}>
              <ConfirmStrip
                confirmLabel="Disable"
                detail="Anyone with your password could sign in as you."
                onCancel={() => setConfirmDisable(false)}
                onConfirm={() => {
                  setConfirmDisable(false);
                  setCodesOpen(false);
                  setConfirmRegen(false);
                  setAuthOn(false);
                }}
                title="Turn off two-factor?"
              />
            </Collapse>
            <div className={cn("flex items-center gap-4 border-t px-4 py-3.5 transition-opacity", !authOn && "opacity-60")}>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex items-center gap-2">
                  <span className="font-medium text-sm">Recovery codes</span>
                  {authOn && !saved && <Badge variant="warning">Not saved</Badge>}
                </span>
                <span className="text-muted-foreground text-xs tabular-nums">
                  {authOn ? `${10 - used} of 10 left. Use one if you lose your phone.` : "Available once two-factor is on."}
                </span>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  className="max-sm:hidden"
                  disabled={!authOn}
                  onClick={() => setConfirmRegen((v) => !v)}
                  size="sm"
                  variant="ghost"
                >
                  Regenerate
                </Button>
                <Button
                  aria-expanded={codesOpen}
                  disabled={!authOn}
                  onClick={() => setCodesOpen((v) => !v)}
                  size="sm"
                  variant="outline"
                >
                  {codesOpen ? "Hide" : "View"}
                </Button>
              </div>
            </div>
            <Collapse open={confirmRegen && authOn} reduce={reduce}>
              <ConfirmStrip
                confirmLabel="Regenerate"
                detail="Your current codes stop working straight away."
                onCancel={() => setConfirmRegen(false)}
                onConfirm={() => {
                  setConfirmRegen(false);
                  setCodeSeed((s) => s * 7 + 13);
                  setUsed(0);
                  setSaved(false);
                  setCopied(false);
                  setCodesOpen(true);
                }}
                title="Make a new set?"
                tone="default"
              />
            </Collapse>
            <Collapse open={codesOpen && authOn} reduce={reduce}>
              <RecoveryCodesPanel codes={codes} copied={copied} onCopy={copyCodes} onDownload={downloadCodes} used={used} />
              <div className="flex justify-end border-t px-4 py-2.5 sm:hidden">
                <Button onClick={() => setConfirmRegen(true)} size="sm" variant="ghost">
                  Regenerate codes
                </Button>
              </div>
            </Collapse>
          </div>
        </section>

        <section className="mt-10">
          <SectionHeader
            action={
              <Button disabled={pending} onClick={() => setPending(true)} size="sm" variant="outline">
                <PlusIcon /> Add passkey
              </Button>
            }
            description="Sign in with your fingerprint, face or a security key."
            title="Passkeys"
          />
          <div className="mt-3 overflow-hidden rounded-xl border bg-card">
            <div className="hidden grid-cols-[minmax(0,1fr)_7.5rem_7.5rem_2rem] gap-4 border-b px-4 py-2.5 font-medium text-muted-foreground text-xs sm:grid">
              <span>Name</span>
              <span>Added</span>
              <span>Last used</span>
              <span className="sr-only">Actions</span>
            </div>
            <ul aria-label="Passkeys">
              <AnimatePresence initial={false}>
                {passkeys.map((p) => (
                  <PasskeyRow
                    confirming={confirmingId === p.id}
                    editing={editingId === p.id}
                    isLast={passkeys.length === 1}
                    isNew={newId === p.id}
                    key={p.id}
                    onAskRemove={() => {
                      setEditingId(null);
                      setConfirmingId(p.id);
                    }}
                    onCancelRemove={() => setConfirmingId(null)}
                    onCancelRename={() => setEditingId(null)}
                    onRemove={() => {
                      setConfirmingId(null);
                      setPasskeys((all) => all.filter((x) => x.id !== p.id));
                    }}
                    onRename={(name) => {
                      setPasskeys((all) => all.map((x) => (x.id === p.id ? { ...x, name } : x)));
                      setEditingId(null);
                    }}
                    onStartRename={() => {
                      setConfirmingId(null);
                      setEditingId(p.id);
                    }}
                    passkey={p}
                    reduce={reduce}
                  />
                ))}
                {pending && (
                  <PendingPasskeyRow
                    authenticator={newPasskey.authenticator}
                    key="pending"
                    onCancel={() => setPending(false)}
                    reduce={reduce}
                  />
                )}
              </AnimatePresence>
            </ul>
            <Collapse open={passkeys.length === 0 && !pending} reduce={reduce}>
              <p className="px-4 py-6 text-center text-muted-foreground text-sm">
                No passkeys yet. Add one and skip the password next time.
              </p>
            </Collapse>
          </div>
        </section>

        <section className="mt-10">
          <SectionHeader
            action={
              <Button
                className="max-sm:hidden"
                disabled={others.length === 0}
                onClick={() => setConfirmAll((v) => !v)}
                size="sm"
                variant="outline"
              >
                Sign out of all other sessions
              </Button>
            }
            description="Where you're signed in. Locations are approximate."
            title="Sessions"
          />
          <div className="mt-3 overflow-hidden rounded-xl border bg-card">
            <div className="hidden grid-cols-[minmax(0,1fr)_6.5rem_5.5rem_4.5rem] gap-3 border-b px-4 py-2.5 font-medium text-muted-foreground text-xs sm:grid">
              <span>Device</span>
              <span>Location</span>
              <span>Last active</span>
              <span className="sr-only">Actions</span>
            </div>
            <ul aria-label="Sessions">
              <AnimatePresence custom={bulk} initial={false}>
                {sessions.map((s) => (
                  <SessionRow
                    index={Math.max(0, others.findIndex((o) => o.id === s.id))}
                    key={s.id}
                    onSignOut={() => {
                      setBulk(false);
                      setSessions((all) => all.filter((x) => x.id !== s.id));
                    }}
                    reduce={reduce}
                    session={s}
                  />
                ))}
              </AnimatePresence>
            </ul>
            <Collapse open={confirmAll && others.length > 0} reduce={reduce}>
              <ConfirmStrip
                confirmLabel={`Sign out ${others.length}`}
                detail="They'll need a passkey or password to get back in."
                onCancel={() => setConfirmAll(false)}
                onConfirm={() => {
                  setConfirmAll(false);
                  setBulk(true);
                  setSessions((all) => all.filter((s) => s.current));
                }}
                title={`Sign out of ${others.length} other ${others.length === 1 ? "session" : "sessions"}?`}
              />
            </Collapse>
            {others.length > 0 && !confirmAll && (
              <div className="border-t px-4 py-2.5 sm:hidden">
                <Button className="w-full" onClick={() => setConfirmAll(true)} size="sm" variant="ghost">
                  Sign out of all other sessions
                </Button>
              </div>
            )}
            <Collapse open={others.length === 0} reduce={reduce}>
              <p className="flex items-center gap-2 border-t px-4 py-3 text-muted-foreground text-xs">
                <CheckIcon className="size-3.5 text-success-foreground" />
                You're only signed in on this device.
              </p>
            </Collapse>
          </div>
        </section>
      </div>
    </RidgelineShell>
  );
}
