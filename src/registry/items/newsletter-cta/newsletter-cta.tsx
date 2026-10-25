"use client";

import { AlertCircleIcon, ArrowRightIcon, LockIcon } from "lucide-react";
import { AnimatePresence, motion, MotionConfig, useAnimationControls, useReducedMotion } from "motion/react";
import { type FormEvent, type ReactNode, useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function useReducedMotionSafe() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && Boolean(prefers);
}

export interface NewsletterIssue {
  number: number;
  title: string;
  date: string;
  minutes: number;
}

export interface NewsletterCtaProps {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  subscribers: number;
  readers?: string[];
  issues?: NewsletterIssue[];
  note?: string;
  onSubscribe?: (email: string) => Promise<void> | void;
  className?: string;
}

const ease = [0.23, 1, 0.32, 1] as const;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const tones = [
  "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
];

const typos: Record<string, string> = {
  "gmial.com": "gmail.com",
  "gmal.com": "gmail.com",
  "gmail.co": "gmail.com",
  "gnail.com": "gmail.com",
  "hotmial.com": "hotmail.com",
  "hotmail.co": "hotmail.com",
  "yaho.com": "yahoo.com",
  "outlok.com": "outlook.com",
  "icloud.co": "icloud.com",
  "iclod.com": "icloud.com",
};

function suggest(email: string) {
  const [user, domain] = email.toLowerCase().split("@");
  if (!user || !domain) return null;
  const fixed = typos[domain];
  return fixed ? `${user}@${fixed}` : null;
}

function RollingDigit({ digit }: { digit: number }) {
  const reduce = useReducedMotionSafe();
  return (
    <span aria-hidden className="relative inline-block h-[1lh] w-[1ch] overflow-hidden align-top">
      <motion.span
        animate={{ y: `${-digit * 10}%` }}
        className="absolute inset-x-0 top-0 flex flex-col"
        initial={false}
        transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 28 }}
      >
        {Array.from({ length: 10 }, (_, n) => (
          <span className="block h-[1lh]" key={n}>
            {n}
          </span>
        ))}
      </motion.span>
    </span>
  );
}

function Count({ value }: { value: number }) {
  const text = value.toLocaleString("en-US");
  const chars = text.split("");
  return (
    <span className="inline-flex tabular-nums">
      <span className="sr-only">{text}</span>
      {chars.map((char, i) => {
        const key = chars.length - i;
        return /\d/.test(char) ? (
          <RollingDigit digit={Number(char)} key={`d${key}`} />
        ) : (
          <span aria-hidden key={`s${key}`}>
            {char}
          </span>
        );
      })}
    </span>
  );
}

function initialsFrom(email: string) {
  const name = email.split("@")[0].replace(/[^a-z]/gi, " ").trim();
  const parts = name.split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "Y") + (parts[1]?.[0] ?? parts[0]?.[1] ?? "")).toUpperCase();
}

function IssueStack({ issues }: { issues: NewsletterIssue[] }) {
  const reduce = useReducedMotionSafe();
  const [open, setOpen] = useState(false);
  const shown = issues.slice(0, 3);
  return (
    <div
      className="relative mx-auto h-64 w-full max-w-[19rem]"
      onPointerEnter={(e) => e.pointerType === "mouse" && setOpen(true)}
      onPointerLeave={() => setOpen(false)}
    >
      {shown.map((issue, i) => {
        const depth = shown.length - 1 - i;
        const rest = { y: depth * -18, scale: 1 - depth * 0.05, rotate: depth === 0 ? -2 : depth === 1 ? 2 : -1 };
        const fanned = { y: depth * -46, scale: 1 - depth * 0.03, rotate: depth === 0 ? -2 : depth === 1 ? 1.5 : -1 };
        return (
          <motion.article
            animate={reduce ? rest : open ? fanned : rest}
            className={cn(
              "absolute inset-x-0 bottom-0 rounded-2xl border bg-popover p-5 shadow-lg/5 dark:shadow-black/30",
              depth > 0 && "pointer-events-none",
            )}
            initial={false}
            key={issue.number}
            style={{ zIndex: i }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <div
              className={cn(
                "flex items-center justify-between font-mono text-[0.6875rem] text-muted-foreground tabular-nums transition-opacity duration-200 ease-out",
                depth > 0 && !open && "opacity-0",
              )}
            >
              <span>No. {issue.number}</span>
              <span>{issue.date}</span>
            </div>
            <h3 className={cn("mt-6 line-clamp-2 min-h-[2lh] text-balance font-heading font-semibold text-lg leading-snug tracking-tight", depth > 0 && "opacity-0")}>
              {issue.title}
            </h3>
            <div className={cn("mt-5 space-y-1.5", depth > 0 && "opacity-0")} aria-hidden>
              <div className="h-1.5 w-full rounded-full bg-foreground/8" />
              <div className="h-1.5 w-11/12 rounded-full bg-foreground/8" />
              <div className="h-1.5 w-3/5 rounded-full bg-foreground/8" />
            </div>
            <p className={cn("mt-5 text-muted-foreground text-xs", depth > 0 && "opacity-0")}>
              {issue.minutes} min read
            </p>
          </motion.article>
        );
      })}
    </div>
  );
}

export function NewsletterCta({
  eyebrow,
  title,
  description,
  subscribers,
  readers = [],
  issues = [],
  note = "No spam. One click to unsubscribe.",
  onSubscribe,
  className,
}: NewsletterCtaProps) {
  const reduce = useReducedMotionSafe();
  const fieldId = useId();
  const errorId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const shake = useAnimationControls();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "sending" | "done">("idle");
  const [count, setCount] = useState(subscribers);
  const [joined, setJoined] = useState<string | null>(null);
  const hint = error ? null : suggest(email);

  useEffect(() => setCount(subscribers), [subscribers]);

  const fail = (message: string) => {
    setError(message);
    if (!reduce) shake.start({ x: [0, -6, 5, -3, 2, 0], transition: { duration: 0.32, ease: "easeOut" } });
    inputRef.current?.focus();
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const value = email.trim();
    if (!value) return fail("Add your email so we know where to send it.");
    if (!EMAIL.test(value)) return fail("That doesn't look like an email address yet.");
    setError(null);
    setStatus("sending");
    try {
      await Promise.all([onSubscribe?.(value), new Promise((r) => setTimeout(r, 900))]);
      setJoined(initialsFrom(value));
      setCount((c) => c + 1);
      setStatus("done");
    } catch (err) {
      setStatus("idle");
      fail(err instanceof Error ? err.message : "Something went wrong. Try again in a moment.");
    }
  };

  const undo = () => {
    setStatus("idle");
    setJoined(null);
    setCount((c) => c - 1);
    setEmail("");
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const stack = joined ? [...readers.slice(0, 4), joined] : readers.slice(0, 4);

  return (
    <MotionConfig reducedMotion="user">
      <section
        className={cn(
          "relative isolate mx-auto w-full max-w-[1100px] overflow-hidden rounded-3xl border bg-card shadow-xs/5",
          className,
        )}
      >
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[radial-gradient(var(--color-border)_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(70%_80%_at_85%_50%,black,transparent)]"
        />
        <div className="grid items-center gap-12 px-5 py-10 sm:px-12 sm:py-14 md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] md:gap-10">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="flex -space-x-1.5">
                <AnimatePresence initial={false}>
                  {stack.map((initials, i) => (
                    <motion.span
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      className={cn(
                        "flex size-8 items-center justify-center rounded-full font-semibold text-[0.625rem] tracking-tight ring-2 ring-card",
                        joined && i === stack.length - 1
                          ? "bg-primary text-primary-foreground"
                          : tones[i % tones.length],
                      )}
                      exit={{ opacity: 0, scale: 0.9, x: -6 }}
                      initial={{ opacity: 0, scale: 0.9, x: -6 }}
                      key={`${initials}-${i}`}
                      layout
                      transition={{ type: "spring", stiffness: 420, damping: 30 }}
                    >
                      {initials}
                    </motion.span>
                  ))}
                </AnimatePresence>
              </div>
              <p className="flex items-center gap-1 text-muted-foreground text-xs">
                {joined ? "You're reader no." : "Join"}
                <span className="flex font-medium text-foreground">
                  <Count value={count} />
                </span>
                {!joined && "readers"}
              </p>
            </div>

            {eyebrow && (
              <p className="mt-8 font-medium text-muted-foreground text-xs uppercase tracking-widest">{eyebrow}</p>
            )}
            <h2
              className={cn(
                "text-balance font-heading font-semibold text-3xl leading-[1.1] tracking-tight sm:text-4xl",
                eyebrow ? "mt-2" : "mt-8",
              )}
            >
              {title}
            </h2>
            {description && (
              <p className="mt-4 max-w-md text-pretty text-muted-foreground text-sm leading-relaxed sm:text-base">
                {description}
              </p>
            )}

            <div className="mt-8 max-w-md">
              <AnimatePresence initial={false} mode="popLayout">
                {status !== "done" ? (
                  <motion.form
                    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                    exit={{ opacity: 0, scale: 0.98, filter: "blur(4px)" }}
                    initial={{ opacity: 0, scale: 0.98, filter: "blur(4px)" }}
                    key="form"
                    noValidate
                    onSubmit={submit}
                    transition={{ duration: 0.25, ease }}
                  >
                    <label className="sr-only" htmlFor={fieldId}>
                      Email address
                    </label>
                    <motion.div
                      animate={shake}
                      className={cn(
                        "flex flex-col gap-2 rounded-xl sm:flex-row sm:gap-0 sm:border sm:bg-background sm:p-1 sm:shadow-xs/5 sm:transition-[border-color,box-shadow] sm:duration-150 dark:sm:bg-input/32",
                        "sm:has-focus-visible:border-ring sm:has-focus-visible:ring-[3px] sm:has-focus-visible:ring-ring/24",
                        error && "sm:border-destructive/40 sm:has-focus-visible:border-destructive/60 sm:has-focus-visible:ring-destructive/16",
                      )}
                    >
                      <input
                        aria-describedby={error ? errorId : undefined}
                        aria-invalid={Boolean(error)}
                        autoComplete="email"
                        className={cn(
                          "h-11 w-full min-w-0 rounded-lg border sm:flex-1 bg-background px-3.5 text-base outline-none placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/24 sm:h-9 sm:border-0 sm:bg-transparent sm:px-2.5 sm:text-sm sm:focus-visible:ring-0 dark:bg-input/32 dark:sm:bg-transparent",
                          error && "max-sm:border-destructive/40",
                        )}
                        disabled={status === "sending"}
                        id={fieldId}
                        inputMode="email"
                        onBlur={() => {
                          const v = email.trim();
                          if (v && !EMAIL.test(v)) setError("That doesn't look like an email address yet.");
                        }}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (error && EMAIL.test(e.target.value.trim())) setError(null);
                        }}
                        placeholder="you@company.com"
                        ref={inputRef}
                        type="email"
                        value={email}
                      />
                      <Button
                        className="h-11 rounded-lg transition-[box-shadow,translate,scale,rotate] duration-150 ease-out active:scale-[0.97] sm:h-9"
                        loading={status === "sending"}
                        type="submit"
                      >
                        Subscribe
                      </Button>
                    </motion.div>
                    <div className="mt-2 min-h-5 text-xs" id={errorId}>
                      <AnimatePresence initial={false} mode="wait">
                        {error ? (
                          <motion.p
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-1.5 text-destructive-foreground"
                            exit={{ opacity: 0, y: -2 }}
                            initial={{ opacity: 0, y: -2 }}
                            key="error"
                            role="alert"
                            transition={{ duration: 0.15, ease }}
                          >
                            <AlertCircleIcon className="size-3.5 shrink-0" />
                            {error}
                          </motion.p>
                        ) : hint ? (
                          <motion.p
                            animate={{ opacity: 1, y: 0 }}
                            className="text-muted-foreground"
                            exit={{ opacity: 0, y: -2 }}
                            initial={{ opacity: 0, y: -2 }}
                            key="hint"
                            transition={{ duration: 0.15, ease }}
                          >
                            Did you mean{" "}
                            <button
                              className="cursor-pointer rounded-sm font-medium text-foreground underline decoration-foreground/30 underline-offset-2 outline-none hover:decoration-foreground focus-visible:ring-2 focus-visible:ring-ring"
                              onClick={() => {
                                setEmail(hint);
                                inputRef.current?.focus();
                              }}
                              type="button"
                            >
                              {hint}
                            </button>
                            ?
                          </motion.p>
                        ) : (
                          <motion.p
                            animate={{ opacity: 1 }}
                            className="flex items-center gap-1.5 text-muted-foreground"
                            exit={{ opacity: 0 }}
                            initial={{ opacity: 0 }}
                            key="note"
                            transition={{ duration: 0.15 }}
                          >
                            <LockIcon className="size-3 shrink-0" />
                            {note}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.form>
                ) : (
                  <motion.div
                    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                    className="flex items-start gap-3 rounded-xl border border-success/25 bg-success/8 p-3.5"
                    exit={{ opacity: 0, scale: 0.98, filter: "blur(4px)" }}
                    initial={{ opacity: 0, scale: 0.98, filter: "blur(4px)" }}
                    key="done"
                    role="status"
                    transition={{ duration: 0.3, ease }}
                  >
                    <span className="mt-px flex size-6 shrink-0 items-center justify-center rounded-full bg-success text-white">
                      <svg aria-hidden className="size-3.5" fill="none" viewBox="0 0 16 16">
                        <motion.path
                          animate={{ pathLength: 1 }}
                          d="M3.5 8.5 6.5 11.5 12.5 4.5"
                          initial={{ pathLength: reduce ? 1 : 0 }}
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2.2"
                          transition={{ duration: 0.35, ease, delay: 0.15 }}
                        />
                      </svg>
                    </span>
                    <div className="min-w-0 flex-1 text-sm">
                      <p className="font-medium">You're on the list.</p>
                      <p className="mt-0.5 text-muted-foreground text-xs">
                        We sent a confirmation to <span className="break-all text-foreground">{email.trim()}</span>. The next
                        issue lands Thursday.
                      </p>
                    </div>
                    <button
                      className="-my-1.5 -me-1.5 h-8 shrink-0 cursor-pointer rounded-md px-2.5 text-muted-foreground text-xs outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={undo}
                      type="button"
                    >
                      Undo
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {issues.length > 0 && (
            <div className="hidden min-w-0 pt-6 md:block">
              <IssueStack issues={issues} />
              <a
                className="group mx-auto mt-5 flex w-fit items-center gap-1 rounded-md text-muted-foreground text-xs outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                href="#archive"
              >
                Read past issues
                <ArrowRightIcon className="size-3 transition-transform duration-200 ease-out group-hover:translate-x-0.5" />
              </a>
            </div>
          )}
        </div>
      </section>
    </MotionConfig>
  );
}
