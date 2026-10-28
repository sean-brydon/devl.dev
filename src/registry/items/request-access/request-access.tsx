"use client";

import { CheckIcon, ChevronDownIcon, ChevronRightIcon, ClockIcon, FileTextIcon, LockIcon, LogInIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ReactNode, useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Menu, MenuGroup, MenuGroupLabel, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type AccessStatus = "denied" | "pending" | "granted";

export interface AccessPerson {
  name: string;
  email: string;
  initials: string;
}

export interface RequestAccessProps {
  workspace?: string;
  space?: string;
  doc?: string;
  owner?: AccessPerson;
  user?: AccessPerson;
  otherAccounts?: string[];
  resendAfter?: number;
  status?: AccessStatus;
  defaultStatus?: AccessStatus;
  onStatusChange?: (status: AccessStatus) => void;
  onRequest?: (note: string) => void;
  onResend?: () => void;
  onCancel?: () => void;
  onSwitchAccount?: (email: string | null) => void;
  children?: ReactNode;
  className?: string;
}

const ease = [0.23, 1, 0.32, 1] as const;

function Mark() {
  return (
    <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
      <svg aria-hidden className="size-4" fill="none" viewBox="0 0 28 28">
        <path d="M7 18.5 12 12l3.5 4.5 2-2.5 3.5 4.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.6" />
      </svg>
    </span>
  );
}

function Initials({ person, className }: { person: AccessPerson; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full bg-violet-500/15 font-medium text-violet-700 text-xs dark:text-violet-300",
        className,
      )}
    >
      {person.initials}
    </span>
  );
}

function RollingDigit({ digit }: { digit: string }) {
  const reduce = useReducedMotion();
  return (
    <span className="relative inline-flex h-[1lh] w-[1ch] justify-center overflow-hidden">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          animate={{ y: 0, opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { y: "70%", opacity: 0 }}
          initial={reduce ? { opacity: 0 } : { y: "-70%", opacity: 0 }}
          key={digit}
          transition={{ duration: 0.28, ease }}
        >
          {digit}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function Countdown({ seconds }: { seconds: number }) {
  const text = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  return (
    <span aria-hidden className="inline-flex tabular-nums">
      {text.split("").map((c, i) => (c === ":" ? <span key="colon">:</span> : <RollingDigit digit={c} key={`d${i}`} />))}
    </span>
  );
}

function DrawnCheck() {
  const reduce = useReducedMotion();
  return (
    <svg aria-hidden className="size-5" fill="none" viewBox="0 0 24 24">
      <motion.circle
        animate={{ pathLength: 1 }}
        className="stroke-success"
        cx="12"
        cy="12"
        initial={{ pathLength: reduce ? 1 : 0 }}
        r="9"
        strokeLinecap="round"
        strokeWidth="2"
        transform="rotate(-90 12 12)"
        transition={{ duration: 0.4, ease }}
      />
      <motion.path
        animate={{ pathLength: 1 }}
        className="stroke-success"
        d="m8 12.4 2.7 2.6L16 9.6"
        initial={{ pathLength: reduce ? 1 : 0 }}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        transition={{ duration: 0.3, delay: reduce ? 0 : 0.32, ease }}
      />
    </svg>
  );
}

function ago(ms: number) {
  const s = Math.floor(ms / 1000);
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  return m === 1 ? "1 min ago" : `${m} min ago`;
}

export function RequestAccess({
  workspace = "Ridgeline",
  space = "Strategy",
  doc = "Q3 roadmap",
  owner = { name: "Mara Okafor", email: "mara@ridgeline.app", initials: "MO" },
  user = { name: "Ada Lindqvist", email: "ada@ridgeline.app", initials: "AL" },
  otherAccounts = [],
  resendAfter = 60,
  status: statusProp,
  defaultStatus = "denied",
  onStatusChange,
  onRequest,
  onResend,
  onCancel,
  onSwitchAccount,
  children,
  className,
}: RequestAccessProps) {
  const reduce = useReducedMotion();
  const uid = useId();
  const [inner, setInner] = useState<AccessStatus>(defaultStatus);
  const status = statusProp ?? inner;
  const [email, setEmail] = useState(user.email);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [sentAt, setSentAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const ownerFirst = owner.name.split(" ")[0];

  const setStatus = (next: AccessStatus) => {
    setInner(next);
    onStatusChange?.(next);
  };

  useEffect(() => {
    if (status !== "pending") return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [status]);

  useEffect(() => {
    if (!sending) return;
    const t = setTimeout(() => {
      setSending(false);
      setSentAt(Date.now());
      setStatus("pending");
    }, 700);
    return () => clearTimeout(t);
  }, [sending]);

  const request = () => {
    setSending(true);
    onRequest?.(note.trim());
  };

  const resend = () => {
    setSentAt(Date.now());
    setNow(Date.now());
    onResend?.();
  };

  const cancel = () => {
    setSentAt(null);
    setStatus("denied");
    onCancel?.();
  };

  const switchTo = (next: string | null) => {
    if (next) setEmail(next);
    onSwitchAccount?.(next);
  };

  const elapsed = sentAt && now ? Math.max(0, now - sentAt) : 0;
  const wait = sentAt ? Math.max(0, resendAfter - Math.floor(elapsed / 1000)) : resendAfter;
  const sentTime = sentAt ? new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(sentAt) : "";
  const swap = reduce ? { opacity: 0 } : { opacity: 0, y: 8, filter: "blur(4px)" };

  return (
    <div className={cn("flex h-160 w-full max-w-275 flex-col overflow-hidden rounded-2xl border bg-card text-foreground shadow-xs/5", className)}>
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-3 sm:px-4">
        <Mark />
        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 text-sm">
          <span className="hidden font-medium sm:inline">{workspace}</span>
          <ChevronRightIcon aria-hidden className="hidden size-3.5 text-muted-foreground sm:block" />
          <span className="truncate text-muted-foreground">{space}</span>
          <ChevronRightIcon aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="flex min-w-0 items-center gap-1.5 font-medium" aria-current="page">
            <AnimatePresence initial={false} mode="popLayout">
              <motion.span
                animate={{ opacity: 1, scale: 1 }}
                className="flex"
                exit={{ opacity: 0, scale: reduce ? 1 : 0.8 }}
                initial={{ opacity: 0, scale: reduce ? 1 : 0.8 }}
                key={status === "granted" ? "open" : "locked"}
                transition={{ duration: 0.2, ease }}
              >
                {status === "granted" ? (
                  <FileTextIcon aria-hidden className="size-3.5 text-muted-foreground" />
                ) : (
                  <LockIcon aria-hidden className="size-3.5 text-muted-foreground" />
                )}
              </motion.span>
            </AnimatePresence>
            <span className="truncate">{doc}</span>
          </span>
        </nav>
        <div className="ms-auto flex items-center gap-2">
          <Initials className="size-7 text-[0.625rem]" person={user} />
        </div>
      </header>

      <div className="relative grid min-h-0 flex-1 overflow-y-auto bg-background">
        <AnimatePresence initial={false} mode="wait">
          {status === "granted" ? (
            <motion.div
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              className="col-start-1 row-start-1 mx-auto w-full max-w-170 px-5 py-8 sm:px-8"
              exit={{ opacity: 0 }}
              initial={swap}
              key="granted"
              transition={{ duration: 0.3, ease }}
            >
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className="mb-8 flex items-center gap-2.5 rounded-xl border bg-card px-3 py-2.5 text-sm shadow-xs/5"
                initial={{ opacity: 0, y: reduce ? 0 : -6 }}
                role="status"
                transition={{ duration: 0.3, delay: 0.15, ease }}
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-success/12 text-success-foreground">
                  <CheckIcon aria-hidden className="size-3.5" />
                </span>
                <span className="min-w-0 flex-1 text-pretty">
                  <span className="font-medium">{ownerFirst} gave you access.</span>{" "}
                  <span className="text-muted-foreground">You can view and comment on this doc.</span>
                </span>
              </motion.div>
              {children}
            </motion.div>
          ) : (
            <motion.div
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              className="col-start-1 row-start-1 flex flex-col items-center justify-center px-4 py-10 text-center sm:px-6"
              exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.98, filter: "blur(4px)" }}
              initial={swap}
              key="gate"
              transition={{ duration: 0.25, ease }}
            >
              <AnimatePresence initial={false} mode="wait">
                {status === "denied" ? (
                  <motion.div
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    className="flex w-full max-w-96 flex-col items-center"
                    exit={swap}
                    initial={swap}
                    key="denied"
                    transition={{ duration: 0.2, ease }}
                  >
                    <div className="flex size-10 items-center justify-center rounded-xl border bg-card shadow-xs/5">
                      <LockIcon aria-hidden className="size-5" />
                    </div>
                    <h2 className="mt-4 text-balance font-semibold text-xl">You don&rsquo;t have access to {doc}</h2>
                    <p className="mt-1.5 max-w-88 text-pretty text-muted-foreground text-sm">
                      This doc is private to the {space} team. Ask {ownerFirst} for access and you&rsquo;ll get an email when they reply.
                    </p>

                    <div className="mt-6 flex w-full items-center gap-3 rounded-xl border bg-card p-2 ps-3 text-left shadow-xs/5">
                      <Initials person={{ ...user, email }} />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="text-muted-foreground text-xs">You&rsquo;re signed in as</span>
                        <span className="truncate font-medium text-sm">{email}</span>
                      </span>
                      <Menu>
                        <MenuTrigger render={<Button className="shrink-0" size="sm" variant="ghost" />}>
                          <span className="max-sm:hidden">Switch account</span>
                          <span className="sm:hidden">Switch</span>
                          <ChevronDownIcon aria-hidden className="opacity-60" />
                        </MenuTrigger>
                        <MenuPopup align="end" className="min-w-60">
                          <MenuGroup>
                            <MenuGroupLabel>Accounts</MenuGroupLabel>
                            {[user.email, ...otherAccounts].map((a) => (
                              <MenuItem key={a} onClick={() => switchTo(a)}>
                                <span className="min-w-0 flex-1 truncate">{a}</span>
                                {a === email && <CheckIcon aria-label="Current account" />}
                              </MenuItem>
                            ))}
                          </MenuGroup>
                          <MenuSeparator />
                          <MenuItem onClick={() => switchTo(null)}>
                            <LogInIcon />
                            Sign in with another account
                          </MenuItem>
                        </MenuPopup>
                      </Menu>
                    </div>

                    <div className="mt-4 flex w-full flex-col gap-2 text-left">
                      <Label className="gap-1" htmlFor={`${uid}-note`}>
                        Add a note <span className="font-normal text-muted-foreground">(optional)</span>
                      </Label>
                      <Textarea
                        className="text-sm"
                        disabled={sending}
                        id={`${uid}-note`}
                        maxLength={280}
                        onChange={(e) => setNote(e.currentTarget.value)}
                        placeholder={`Tell ${ownerFirst} why you need it`}
                        size="sm"
                        value={note}
                      />
                    </div>
                    <Button className="mt-4 w-full active:scale-[0.98]" loading={sending} onClick={request}>
                      Request access
                    </Button>
                    <p className="mt-3 flex items-center gap-1.5 text-muted-foreground text-xs">
                      <Initials className="size-4 bg-amber-500/15 text-[0.4375rem] text-amber-700 dark:text-amber-300" person={owner} />
                      {owner.name} owns this doc
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    className="flex w-full max-w-96 flex-col items-center"
                    exit={swap}
                    initial={swap}
                    key="pending"
                    transition={{ duration: 0.2, ease }}
                  >
                    <div className="flex size-10 items-center justify-center rounded-xl border bg-card shadow-xs/5">
                      <DrawnCheck />
                    </div>
                    <h2 className="mt-4 text-balance font-semibold text-xl" role="status">
                      Request sent to {ownerFirst} <span className="font-normal text-muted-foreground">(owner)</span>
                    </h2>
                    <p className="mt-1.5 max-w-88 text-pretty text-muted-foreground text-sm">
                      We&rsquo;ll email {email} when {ownerFirst} responds. Most requests are answered within a day.
                    </p>
                    <p className="mt-3 flex items-center gap-1.5 text-muted-foreground text-xs tabular-nums">
                      <ClockIcon aria-hidden className="size-3.5" />
                      Sent {sentTime ? `at ${sentTime} · ${ago(elapsed)}` : "just now"}
                    </p>

                    {note.trim() && (
                      <figure className="mt-6 w-full rounded-xl border bg-card p-3 text-left shadow-xs/5">
                        <figcaption className="flex items-center gap-2 text-muted-foreground text-xs">
                          <Initials className="size-5 text-[0.5625rem]" person={user} />
                          Your note
                        </figcaption>
                        <blockquote className="mt-2 whitespace-pre-line text-pretty text-sm">{note.trim()}</blockquote>
                      </figure>
                    )}

                    <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                      <Button className="min-w-40 active:scale-[0.97]" disabled={wait > 0} onClick={resend} variant="outline">
                        {wait > 0 ? (
                          <>
                            <span className="inline-flex gap-1">
                              Resend in
                              <Countdown seconds={wait} />
                            </span>
                            <span className="sr-only">{wait} seconds</span>
                          </>
                        ) : (
                          "Resend request"
                        )}
                      </Button>
                      <Button className="active:scale-[0.97]" onClick={cancel} variant="ghost">
                        Cancel request
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
