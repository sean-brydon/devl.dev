"use client";

import { CheckIcon, ChevronDownIcon, CircleAlertIcon, CopyIcon, LinkIcon, XIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  type ClipboardEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { Menu, MenuPopup, MenuRadioGroup, MenuRadioItem, MenuTrigger } from "@/components/ui/menu";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export type InviteRole = "admin" | "member" | "viewer";

export interface Invite {
  email: string;
  role: InviteRole;
}

export interface WorkspaceMember {
  name: string;
  email: string;
  role: InviteRole | "owner";
}

export interface InviteTeammatesProps {
  workspace: string;
  description?: string;
  members?: WorkspaceMember[];
  defaultInvites?: Invite[];
  defaultRole?: InviteRole;
  inviteLink?: string;
  defaultLinkEnabled?: boolean;
  onSend?: (invites: Invite[]) => void | Promise<void>;
  onLinkToggle?: (enabled: boolean) => void;
  onCancel?: () => void;
  className?: string;
}

const roles: { value: InviteRole; label: string; hint: string }[] = [
  { value: "admin", label: "Admin", hint: "Manage billing and people" },
  { value: "member", label: "Member", hint: "Create and edit everything" },
  { value: "viewer", label: "Viewer", hint: "Read and comment" },
];
const roleLabel = (r: InviteRole | "owner") => (r === "owner" ? "Owner" : roles.find((x) => x.value === r)?.label);

const press = "transition-[scale,box-shadow,background-color] duration-150 ease-out active:scale-[0.97]";
const EMAIL = /^[^\s@<>()[\],;:"]+@[^\s@<>()[\],;:"]+\.[a-z]{2,}$/i;
const avatarTones = [
  "bg-info/16 text-info-foreground",
  "bg-success/16 text-success-foreground",
  "bg-warning/16 text-warning-foreground",
  "bg-destructive/12 text-destructive-foreground",
  "bg-muted-foreground/16 text-foreground",
];

function toneFor(text: string) {
  let h = 0;
  for (const c of text) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return avatarTones[h % avatarTones.length];
}

function splitEmails(text: string): string[] {
  return text
    .split(/[\n,;]+/)
    .flatMap((segment) => {
      const angled = segment.match(/<([^>]+)>/);
      return angled ? [angled[1]] : segment.split(/\s+/);
    })
    .map((part) => part.trim().replace(/^mailto:/i, ""))
    .filter(Boolean);
}

export function InviteTeammates({
  workspace,
  description,
  members = [],
  defaultInvites = [],
  defaultRole = "member",
  inviteLink,
  defaultLinkEnabled = false,
  onSend,
  onLinkToggle,
  onCancel,
  className,
}: InviteTeammatesProps) {
  const reduce = useReducedMotion();
  const fieldId = useId();
  const hintId = useId();
  const [invites, setInvites] = useState<Invite[]>(defaultInvites);
  const [draft, setDraft] = useState("");
  const [role, setRole] = useState<InviteRole>(defaultRole);
  const [armed, setArmed] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<number | null>(null);
  const [linkOn, setLinkOn] = useState(defaultLinkEnabled);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const count = useRef(defaultInvites.length);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);

  useEffect(() => {
    if (invites.length > count.current) {
      fieldRef.current?.scrollTo({ top: fieldRef.current.scrollHeight, behavior: reduce ? "auto" : "smooth" });
    }
    count.current = invites.length;
  }, [invites.length, reduce]);

  const memberEmails = useMemo(() => new Set(members.map((m) => m.email.toLowerCase())), [members]);
  const problem = useCallback(
    (email: string) =>
      !EMAIL.test(email)
        ? "isn't a valid email"
        : memberEmails.has(email.toLowerCase())
          ? "is already in this workspace"
          : null,
    [memberEmails],
  );

  const add = (raw: string[]) => {
    if (!raw.length) return;
    setSent(null);
    setInvites((prev) => {
      const seen = new Set(prev.map((i) => i.email.toLowerCase()));
      const next = [...prev];
      for (const email of raw) {
        const key = email.toLowerCase();
        if (seen.has(key)) {
          setFlash(key);
          later(() => setFlash(null), 600);
          continue;
        }
        seen.add(key);
        next.push({ email, role });
      }
      return next;
    });
  };

  const commitDraft = () => {
    add(splitEmails(draft));
    setDraft("");
  };

  const remove = (email: string) => {
    setInvites((prev) => prev.filter((i) => i.email !== email));
    inputRef.current?.focus();
  };

  const edit = (email: string) => {
    commitDraft();
    setInvites((prev) => prev.filter((i) => i.email !== email));
    setDraft(email);
    requestAnimationFrame(() => inputRef.current?.select());
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (["Enter", ",", ";", "Tab", " "].includes(e.key) && draft.trim()) {
      e.preventDefault();
      commitDraft();
      return;
    }
    if (e.key === "Enter" && !draft && valid.length && !invalid.length) {
      e.preventDefault();
      void send();
      return;
    }
    if (e.key === "Backspace" && !draft && invites.length) {
      e.preventDefault();
      if (armed) {
        setInvites((prev) => prev.slice(0, -1));
        setArmed(false);
      } else setArmed(true);
      return;
    }
    setArmed(false);
  };

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text");
    const parts = splitEmails(text);
    if (parts.length < 2 && !/[\n,;]/.test(text)) return;
    e.preventDefault();
    add(parts);
  };

  const valid = invites.filter((i) => !problem(i.email));
  const invalid = invites.filter((i) => problem(i.email));
  const firstInvalid = invalid[0];

  const send = async () => {
    if (!valid.length || sending) return;
    setSending(true);
    await Promise.all([onSend?.(valid), new Promise((r) => later(() => r(null), 700))]);
    setInvites((prev) => prev.filter((i) => problem(i.email)));
    setSending(false);
    setSent(valid.length);
    later(() => setSent(null), 3200);
  };

  const copy = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
    } catch {}
    setCopied(true);
    later(() => setCopied(false), 1600);
  };

  const spring = reduce ? { duration: 0 } : { type: "spring" as const, stiffness: 520, damping: 34 };
  const height = reduce ? { duration: 0 } : { type: "spring" as const, stiffness: 360, damping: 34 };

  return (
    <div
      aria-labelledby={`${fieldId}-title`}
      className={cn(
        "flex w-full max-w-[460px] flex-col overflow-hidden rounded-2xl border bg-popover text-popover-foreground shadow-lg/5",
        className,
      )}
      role="dialog"
    >
      <div className="flex items-start gap-3 px-5 pt-5 pb-4">
        <div className="min-w-0 flex-1">
          <h2 className="font-medium text-base" id={`${fieldId}-title`}>
            Invite to {workspace}
          </h2>
          {description && <p className="mt-1 text-muted-foreground text-sm">{description}</p>}
        </div>
        {onCancel && (
          <Button aria-label="Close" className={cn("-me-2 -mt-1", press)} onClick={onCancel} size="icon-sm" variant="ghost">
            <XIcon />
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-2 px-5">
        <div className="flex items-center justify-between gap-3">
          <label className="font-medium text-sm" htmlFor={fieldId}>
            Email addresses
          </label>
          <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
            <span className="hidden sm:inline">New invites join as</span>
            <span className="sm:hidden">Join as</span>
            <Select
              items={roles.map((r) => ({ value: r.value, label: r.label }))}
              onValueChange={(v) => v && setRole(v as InviteRole)}
              value={role}
            >
              <SelectTrigger aria-label="Default role for new invites" className="w-auto min-w-0" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectPopup align="end">
                {roles.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectPopup>
            </Select>
          </div>
        </div>

        <div
          className={cn(
            "relative flex max-h-44 min-h-[88px] cursor-text flex-wrap content-start items-start gap-1.5 overflow-y-auto rounded-lg border border-input bg-background p-1.5 shadow-xs/5 ring-ring/24 transition-shadow dark:bg-input/32",
            "has-[input:focus-visible]:border-ring has-[input:focus-visible]:ring-[3px]",
          )}
          onClick={(e) => {
            if (e.target === e.currentTarget) inputRef.current?.focus();
          }}
          ref={fieldRef}
        >
          <AnimatePresence initial={false} mode="popLayout">
            {invites.map((invite, index) => {
              const issue = problem(invite.email);
              const isLast = index === invites.length - 1;
              return (
                <motion.span
                  animate={{ opacity: 1, scale: 1, x: flash === invite.email.toLowerCase() && !reduce ? [0, -3, 3, -2, 0] : 0 }}
                  className={cn(
                    "inline-flex h-7 max-w-full items-center gap-1 rounded-full border ps-1 pe-0.5 text-xs transition-colors",
                    issue
                      ? "border-destructive/32 bg-destructive/8 text-destructive-foreground dark:bg-destructive/16"
                      : "bg-card text-foreground dark:bg-input/48",
                    armed && isLast && "ring-2 ring-ring",
                  )}
                  exit={{ opacity: 0, scale: 0.95 }}
                  initial={{ opacity: 0, scale: 0.95 }}
                  key={invite.email}
                  layout
                  transition={{ ...spring, x: { duration: reduce ? 0 : 0.36 } }}
                >
                  {issue ? (
                    <CircleAlertIcon aria-hidden className="ms-0.5 size-4 shrink-0" />
                  ) : (
                    <span
                      aria-hidden
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-full font-medium text-[10px] uppercase",
                        toneFor(invite.email),
                      )}
                    >
                      {invite.email[0]}
                    </span>
                  )}
                  <button
                    aria-label={issue ? `${invite.email} ${issue}. Edit` : `Edit ${invite.email}`}
                    className="min-w-0 cursor-pointer truncate rounded-sm px-0.5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => edit(invite.email)}
                    type="button"
                  >
                    {invite.email}
                  </button>
                  {!issue && (
                    <Menu>
                      <MenuTrigger
                        aria-label={`Role for ${invite.email}`}
                        className="inline-flex h-5 shrink-0 cursor-pointer items-center gap-0.5 rounded-full bg-muted px-1.5 text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-popup-open:text-foreground"
                      >
                        {roleLabel(invite.role)}
                        <ChevronDownIcon aria-hidden className="size-3" />
                      </MenuTrigger>
                      <MenuPopup align="start" className="w-60">
                        <MenuRadioGroup
                          onValueChange={(v) =>
                            setInvites((prev) =>
                              prev.map((i) => (i.email === invite.email ? { ...i, role: v as InviteRole } : i)),
                            )
                          }
                          value={invite.role}
                        >
                          {roles.map((r) => (
                            <MenuRadioItem closeOnClick key={r.value} value={r.value}>
                              <span className="flex flex-col py-0.5">
                                <span>{r.label}</span>
                                <span className="text-muted-foreground text-xs">{r.hint}</span>
                              </span>
                            </MenuRadioItem>
                          ))}
                        </MenuRadioGroup>
                      </MenuPopup>
                    </Menu>
                  )}
                  <button
                    aria-label={`Remove ${invite.email}`}
                    className={cn(
                      "relative flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-full outline-none transition-[color,background-color,scale] duration-150 ease-out after:absolute after:-inset-1.5 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.9]",
                      issue ? "hover:bg-destructive/16" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                    onClick={() => remove(invite.email)}
                    type="button"
                  >
                    <XIcon aria-hidden className="size-3" />
                  </button>
                </motion.span>
              );
            })}
            <motion.input
              aria-describedby={hintId}
              aria-invalid={invalid.length > 0 || undefined}
              autoComplete="off"
              className="h-7 min-w-36 flex-1 bg-transparent px-1.5 text-sm outline-none placeholder:text-muted-foreground/72"
              id={fieldId}
              key="input"
              layout="position"
              onBlur={() => {
                if (draft.trim()) commitDraft();
                setArmed(false);
              }}
              onChange={(e) => {
                setDraft(e.target.value);
                setArmed(false);
              }}
              onKeyDown={onKeyDown}
              onPaste={onPaste}
              placeholder={invites.length ? "Add more…" : "name@company.com, or paste a list"}
              ref={inputRef}
              spellCheck={false}
              transition={spring}
              type="text"
              value={draft}
            />
          </AnimatePresence>
        </div>

        <div className="flex min-h-5 items-center justify-between gap-3 text-xs" id={hintId}>
          <AnimatePresence initial={false} mode="wait">
            {firstInvalid ? (
              <motion.p
                animate={{ opacity: 1, y: 0 }}
                className="min-w-0 truncate text-destructive-foreground"
                exit={{ opacity: 0, y: -4 }}
                initial={{ opacity: 0, y: 4 }}
                key="invalid"
                transition={{ duration: reduce ? 0 : 0.16 }}
              >
                <span className="font-medium">{firstInvalid.email}</span> {problem(firstInvalid.email)}
                {invalid.length > 1 && ` (+${invalid.length - 1} more)`}
              </motion.p>
            ) : sent ? (
              <motion.p
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-1 text-success-foreground"
                exit={{ opacity: 0, y: -4 }}
                initial={{ opacity: 0, y: 4 }}
                key="sent"
                role="status"
                transition={{ duration: reduce ? 0 : 0.16 }}
              >
                <CheckIcon aria-hidden className="size-3.5" />
                {sent} {sent === 1 ? "invite" : "invites"} sent
              </motion.p>
            ) : (
              <motion.p
                animate={{ opacity: 1, y: 0 }}
                className="text-muted-foreground"
                exit={{ opacity: 0, y: -4 }}
                initial={{ opacity: 0, y: 4 }}
                key="help"
                transition={{ duration: reduce ? 0 : 0.16 }}
              >
                Separate with commas, spaces or new lines.
              </motion.p>
            )}
          </AnimatePresence>
          {invalid.length > 0 && (
            <button
              className="shrink-0 cursor-pointer rounded-sm font-medium text-foreground underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => setInvites((prev) => prev.filter((i) => !problem(i.email)))}
              type="button"
            >
              Remove invalid
            </button>
          )}
        </div>
      </div>

      {members.length > 0 && (
        <div className="mt-3 flex flex-col gap-1 px-5">
          <p className="pb-1 font-medium text-muted-foreground text-xs">People with access</p>
          {members.map((m) => (
            <div className="flex items-center gap-2.5 py-1" key={m.email}>
              <span
                aria-hidden
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full font-medium text-xs",
                  toneFor(m.email),
                )}
              >
                {m.name
                  .split(" ")
                  .map((p) => p[0])
                  .join("")
                  .slice(0, 2)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{m.name}</p>
                <p className="truncate text-muted-foreground text-xs">{m.email}</p>
              </div>
              <span className="text-muted-foreground text-xs">{roleLabel(m.role)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="mx-5 mt-4 rounded-xl border bg-card p-3 dark:bg-input/16">
        <div className="flex items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <LinkIcon aria-hidden className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <label className="font-medium text-sm" htmlFor={`${fieldId}-link`}>
              Invite link
            </label>
            <p className="text-muted-foreground text-xs">Anyone with the link joins as a viewer</p>
          </div>
          <Switch
            checked={linkOn}
            id={`${fieldId}-link`}
            onCheckedChange={(on) => {
              setLinkOn(on);
              onLinkToggle?.(on);
            }}
          />
        </div>
        <AnimatePresence initial={false}>
          {linkOn && inviteLink && (
            <motion.div
              animate={{ height: "auto", opacity: 1 }}
              className="overflow-hidden"
              exit={{ height: 0, opacity: 0 }}
              initial={{ height: 0, opacity: 0 }}
              transition={height}
            >
              <div className="mt-3 flex items-center gap-1.5 rounded-lg border border-input bg-background p-1 ps-2.5 dark:bg-input/32">
                <span className="min-w-0 flex-1 truncate font-mono text-muted-foreground text-xs">{inviteLink}</span>
                <Button
                  aria-label={copied ? "Link copied" : "Copy invite link"}
                  className={press}
                  onClick={copy}
                  size="xs"
                  variant="outline"
                >
                  <span className="relative inline-flex size-3.5 items-center justify-center">
                    <AnimatePresence initial={false} mode="popLayout">
                      <motion.span
                        animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
                        className="absolute inset-0 flex items-center justify-center"
                        exit={reduce ? { opacity: 0 } : { scale: 0.8, opacity: 0, filter: "blur(2px)" }}
                        initial={reduce ? { opacity: 0 } : { scale: 0.8, opacity: 0, filter: "blur(2px)" }}
                        key={copied ? "done" : "copy"}
                        transition={reduce ? { duration: 0 } : { duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
                      >
                        {copied ? <CheckIcon className="size-3.5 text-success-foreground" /> : <CopyIcon className="size-3.5" />}
                      </motion.span>
                    </AnimatePresence>
                  </span>
                  <span className="w-11 text-left">{copied ? "Copied" : "Copy"}</span>
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-5 flex items-center justify-end gap-2 border-t bg-muted/48 px-5 py-3">
        {onCancel && (
          <Button className={press} onClick={onCancel} variant="ghost">
            Cancel
          </Button>
        )}
        <Button className={press} disabled={!valid.length} loading={sending} onClick={send}>
          {valid.length ? (
            <span className="inline-flex items-center gap-1">
              Send <RollingNumber value={valid.length} /> {valid.length === 1 ? "invite" : "invites"}
            </span>
          ) : (
            "Send invites"
          )}
        </Button>
      </div>
    </div>
  );
}

function RollingNumber({ value }: { value: number }) {
  const reduce = useReducedMotion();
  return (
    <span className="relative inline-flex h-5 items-center overflow-hidden tabular-nums">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          animate={{ y: 0, opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { y: -12, opacity: 0 }}
          initial={reduce ? { opacity: 0 } : { y: 12, opacity: 0 }}
          key={value}
          transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 34 }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
