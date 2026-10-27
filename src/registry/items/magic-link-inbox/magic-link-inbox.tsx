"use client";

import { CheckIcon, ChevronDownIcon, GlobeIcon, MailIcon, PencilIcon, RotateCwIcon, XIcon } from "lucide-react";
import { AnimatePresence, MotionConfig, motion, useAnimationControls, useReducedMotion } from "motion/react";
import { type FormEvent, type ReactNode, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OTPField, OTPFieldInput } from "@/components/ui/otp-field";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export type MailOpener = "app" | "webmail";

export interface MagicLinkInboxProps {
  product?: string;
  email?: string;
  code?: string;
  resendAfter?: number;
  expiresIn?: string;
  showDemoControls?: boolean;
  onResend?: (email: string) => void;
  onEmailChange?: (email: string) => void;
  onOpenMail?: (opener: MailOpener) => void;
  onVerifyCode?: (code: string) => boolean | Promise<boolean>;
  onContinue?: () => void;
  onCreateAccount?: () => void;
  className?: string;
}

type Resend = "counting" | "ready" | "sending" | "sent";
type SignedIn = null | "link" | "code";

const ease = [0.23, 1, 0.32, 1] as const;
const spring = { type: "spring", stiffness: 420, damping: 36 } as const;
const press = "transition-[box-shadow,scale,background-color] duration-150 ease-out active:scale-[0.97]";
const quietLink =
  "cursor-pointer rounded-sm font-medium text-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function useSafeReducedMotion() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && !!prefers;
}

function AutoHeight({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | "auto">("auto");
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setHeight(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <motion.div animate={{ height }} className="-mx-1 overflow-hidden px-1" initial={false} transition={spring}>
      <div ref={ref}>{children}</div>
    </motion.div>
  );
}

function RidgelineMark({ product }: { product: string }) {
  return (
    <span className="flex items-center gap-2">
      <svg aria-hidden className="size-7" viewBox="0 0 28 28">
        <rect className="fill-foreground" height="28" rx="8" width="28" />
        <path
          className="stroke-background"
          d="M7 18.5 12 12l3.5 4.5 2-2.5 3.5 4.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.2"
        />
      </svg>
      <span className="font-heading font-semibold text-[15px] tracking-tight">{product}</span>
    </span>
  );
}

function AuthShell({
  product,
  onCreateAccount,
  className,
  children,
}: {
  product: string;
  onCreateAccount?: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("@container relative isolate flex h-[760px] w-full flex-col overflow-hidden bg-background text-foreground text-sm", className)}>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(55%_100%_at_50%_0%,--theme(--color-foreground/3%),transparent)]"
      />
      <header className="flex h-14 shrink-0 items-center justify-between gap-4 px-6">
        <RidgelineMark product={product} />
        <p className="text-muted-foreground">
          <span className="hidden @md:inline">New to {product}? </span>
          <button className={quietLink} onClick={onCreateAccount} type="button">
            Create account
          </button>
        </p>
      </header>
      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[360px] px-6 pt-12 pb-10 @md:pt-[72px]">{children}</div>
      </main>
      <footer className="flex h-12 shrink-0 items-center justify-center gap-2 text-muted-foreground text-xs">
        {["Privacy", "Terms", "Help"].map((l, i) => (
          <span className="flex items-center gap-2" key={l}>
            {i > 0 && <span aria-hidden>·</span>}
            <button className="cursor-pointer rounded-sm outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring" type="button">
              {l}
            </button>
          </span>
        ))}
      </footer>
    </div>
  );
}

function RollingText({ text }: { text: string }) {
  return (
    <span aria-hidden className="inline-flex tabular-nums">
      {text.split("").map((ch, i) => (
        <span className="relative inline-flex overflow-hidden" key={i}>
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "80%", opacity: 0 }}
              initial={{ y: "-80%", opacity: 0 }}
              key={ch}
              transition={{ duration: 0.22, ease }}
            >
              {ch}
            </motion.span>
          </AnimatePresence>
        </span>
      ))}
    </span>
  );
}

function DrawnCheck() {
  return (
    <motion.span
      animate={{ scale: 1, opacity: 1 }}
      className="grid size-10 place-items-center rounded-full bg-success/12 text-success-foreground"
      initial={{ scale: 0.85, opacity: 0 }}
      transition={{ type: "spring", stiffness: 480, damping: 26 }}
    >
      <svg aria-hidden className="size-5" fill="none" viewBox="0 0 24 24">
        <motion.path
          animate={{ pathLength: 1 }}
          className="stroke-current"
          d="M5 12.5l4.5 4.5L19 7.5"
          initial={{ pathLength: 0 }}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.5"
          transition={{ duration: 0.36, delay: 0.12, ease }}
        />
      </svg>
    </motion.span>
  );
}

function EmailChip({ email, onEdit }: { email: string; onEdit: () => void }) {
  return (
    <button
      aria-label={`${email}, change address`}
      className={cn(
        "group/chip inline-flex h-8 max-w-full cursor-pointer items-center gap-2 rounded-full border bg-background ps-1 pe-2.5 align-middle text-foreground shadow-xs/5 outline-none hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring dark:bg-input/32 dark:hover:bg-input/64",
        press,
      )}
      onClick={onEdit}
      type="button"
    >
      <Avatar className="[--avatar-size:--spacing(6)]">
        <AvatarFallback className="bg-primary font-medium text-[11px] text-primary-foreground">{email[0]?.toUpperCase()}</AvatarFallback>
      </Avatar>
      <span className="truncate font-medium">{email}</span>
      <PencilIcon aria-hidden className="size-3.5 shrink-0 text-muted-foreground transition-colors group-hover/chip:text-foreground" />
    </button>
  );
}

function EmailEditor({ value, onSave, onCancel }: { value: string; onSave: (email: string) => void; onCancel: () => void }) {
  const uid = useId();
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.select();
  }, []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next = draft.trim();
    if (!EMAIL.test(next)) {
      setError("Enter a full email address, like ada@company.com.");
      inputRef.current?.focus();
      return;
    }
    onSave(next);
  };

  return (
    <form className="flex flex-col gap-1.5" noValidate onSubmit={submit}>
      <div className="flex items-center gap-2">
        <Input
          aria-describedby={error ? `${uid}-err` : undefined}
          aria-invalid={error ? true : undefined}
          aria-label="Email address"
          className="flex-1"
          onChange={(e) => {
            setDraft(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              onCancel();
            }
          }}
          ref={inputRef}
          type="email"
          value={draft}
        />
        <Button className={press} type="submit">
          Send
        </Button>
        <Button aria-label="Cancel editing" className={cn("text-muted-foreground", press)} onClick={onCancel} size="icon" variant="ghost">
          <XIcon />
        </Button>
      </div>
      <AnimatePresence initial={false}>
        {error && (
          <motion.p
            animate={{ height: "auto", opacity: 1 }}
            className="overflow-hidden text-destructive-foreground text-xs"
            exit={{ height: 0, opacity: 0 }}
            id={`${uid}-err`}
            initial={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease }}
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </form>
  );
}

function ResendChip({ state, wait, onResend }: { state: Resend; wait: number; onResend: () => void }) {
  const clock = `${Math.floor(wait / 60)}:${String(wait % 60).padStart(2, "0")}`;
  const content =
    state === "counting" ? (
      <>
        <RotateCwIcon aria-hidden className="size-3.5" />
        <span>
          Send again in <RollingText text={clock} />
          <span className="sr-only">{wait} seconds</span>
        </span>
      </>
    ) : state === "sending" ? (
      <>
        <Spinner className="size-3.5" />
        Sending
      </>
    ) : state === "sent" ? (
      <>
        <CheckIcon aria-hidden className="size-3.5 text-success-foreground" />
        Sent
      </>
    ) : (
      <>
        <RotateCwIcon aria-hidden className="size-3.5" />
        Send again
      </>
    );
  return (
    <motion.button
      className={cn(
        "inline-flex h-7 items-center gap-1.5 overflow-hidden rounded-full bg-muted px-2.5 font-medium text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring",
        state === "ready" ? "cursor-pointer text-foreground hover:bg-accent active:scale-[0.97]" : "cursor-default text-muted-foreground",
        "transition-[background-color,color,scale] duration-150",
      )}
      disabled={state !== "ready"}
      layout
      onClick={onResend}
      style={{ borderRadius: 999 }}
      transition={spring}
      type="button"
    >
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          animate={{ opacity: 1 }}
          className="inline-flex items-center gap-1.5 whitespace-nowrap"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          key={state}
          layout="position"
          transition={{ duration: 0.15 }}
        >
          {content}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}

function CodeEntry({ onVerify }: { onVerify: (code: string) => Promise<boolean> }) {
  const uid = useId();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "checking" | "error">("idle");
  const shake = useAnimationControls();
  const reduce = useSafeReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);

  const failed = status === "error";
  useEffect(() => {
    if (open) rootRef.current?.querySelector<HTMLInputElement>("input:not(:disabled)")?.focus();
  }, [open]);
  useEffect(() => {
    if (failed) rootRef.current?.querySelector<HTMLInputElement>("input:not(:disabled)")?.focus();
  }, [failed]);

  const check = async (value: string) => {
    setStatus("checking");
    const ok = await onVerify(value);
    if (ok) return;
    setStatus("error");
    setCode("");
    if (!reduce) shake.start({ x: [0, -6, 6, -3, 3, 0], transition: { duration: 0.32, ease: "easeOut" } });
  };

  return (
    <div ref={rootRef}>
      <button
        aria-controls={`${uid}-panel`}
        aria-expanded={open}
        className="group/toggle flex h-8 cursor-pointer items-center gap-1.5 rounded-sm font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => setOpen((o) => !o)}
        type="button"
      >
        Enter a code instead
        <ChevronDownIcon aria-hidden className={cn("size-4 transition-transform duration-200 ease-out", open && "rotate-180")} />
      </button>
      <AutoHeight>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              animate={{ opacity: 1 }}
              className="flex flex-col gap-3 pt-3 pb-1"
              exit={{ opacity: 0 }}
              id={`${uid}-panel`}
              initial={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <motion.div animate={shake}>
                <OTPField
                  aria-describedby={`${uid}-msg`}
                  aria-label="Sign-in code"
                  className="justify-between gap-0"
                  disabled={status === "checking"}
                  length={6}
                  onValueChange={(v) => {
                    setCode(v);
                    if (status === "error") setStatus("idle");
                  }}
                  onValueComplete={check}
                  value={code}
                >
                  {[0, 1].map((group) => (
                    <span className="flex gap-2" key={group}>
                      {[0, 1, 2].map((i) => (
                        <OTPFieldInput
                          aria-invalid={status === "error" ? true : undefined}
                          aria-label={`Digit ${group * 3 + i + 1}`}
                          className="h-12 w-11 font-mono text-lg sm:h-12 sm:w-11 sm:text-lg"
                          key={i}
                        />
                      ))}
                    </span>
                  ))}
                </OTPField>
              </motion.div>
              <p
                aria-live="polite"
                className={cn("flex min-h-4 items-center gap-1.5 text-xs", status === "error" ? "text-destructive-foreground" : "text-muted-foreground")}
                id={`${uid}-msg`}
              >
                {status === "checking" && (
                  <>
                    <Spinner className="size-3.5" />
                    Checking
                  </>
                )}
                {status === "error" && "That code doesn’t match the latest email."}
                {status === "idle" && "It’s under the button in the same email."}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </AutoHeight>
    </div>
  );
}

export function MagicLinkInbox({
  product = "Ridgeline",
  email: initialEmail = "ada@ridgeline.app",
  code = "204816",
  resendAfter = 30,
  expiresIn = "15 minutes",
  showDemoControls = true,
  onResend,
  onEmailChange,
  onOpenMail,
  onVerifyCode,
  onContinue,
  onCreateAccount,
  className,
}: MagicLinkInboxProps) {
  const [email, setEmail] = useState(initialEmail);
  const [editing, setEditing] = useState(false);
  const [wait, setWait] = useState(resendAfter);
  const [resend, setResend] = useState<Resend>("counting");
  const [signedIn, setSignedIn] = useState<SignedIn>(null);
  const [opening, setOpening] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (resend !== "counting" || signedIn) return;
    if (wait <= 0) {
      setResend("ready");
      return;
    }
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait, resend, signedIn]);

  useEffect(() => {
    const t = timers.current;
    return () => t.forEach(clearTimeout);
  }, []);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  };

  const restartCountdown = () => {
    setWait(resendAfter);
    setResend("counting");
  };

  const sendAgain = (to: string) => {
    setResend("sending");
    onResend?.(to);
    later(() => setResend("sent"), 700);
    later(restartCountdown, 2000);
  };

  const verify = async (value: string) => {
    const ok = onVerifyCode ? await onVerifyCode(value) : await new Promise<boolean>((r) => later(() => r(value === code), 700));
    if (ok) setSignedIn("code");
    return ok;
  };

  const simulateOpen = () => {
    setOpening(true);
    later(() => {
      setOpening(false);
      setSignedIn("link");
    }, 900);
  };

  const reset = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setSignedIn(null);
    setOpening(false);
    setEditing(false);
    setEmail(initialEmail);
    restartCountdown();
  };

  return (
    <MotionConfig reducedMotion="user">
      <AuthShell className={className} onCreateAccount={onCreateAccount} product={product}>
        <AnimatePresence initial={false} mode="wait">
          {signedIn ? (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-6"
              exit={{ opacity: 0, y: -6 }}
              initial={{ opacity: 0, y: 8 }}
              key="done"
              transition={{ duration: 0.22, ease }}
            >
              <DrawnCheck />
              <div>
                <h2 className="text-balance font-heading font-semibold text-2xl tracking-tight">You’re signed in</h2>
                <p className="mt-1.5 text-pretty text-muted-foreground">
                  {signedIn === "link" ? "The link worked, so this device is now signed in as " : "Code accepted. This device is now signed in as "}
                  <span className="font-medium text-foreground">{email}</span>.
                </p>
              </div>
              <Button className={cn("w-full", press)} onClick={onContinue}>
                Continue to {product}
              </Button>
              <p className="text-center text-muted-foreground">
                Wrong account?{" "}
                <button className={quietLink} onClick={reset} type="button">
                  Sign out
                </button>
              </p>
            </motion.div>
          ) : (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col"
              exit={{ opacity: 0, y: -6 }}
              initial={{ opacity: 0, y: 8 }}
              key="waiting"
              transition={{ duration: 0.22, ease }}
            >
              <AutoHeight>
                <AnimatePresence initial={false} mode="popLayout">
                  {editing ? (
                    <motion.div animate={{ opacity: 1 }} exit={{ opacity: 0 }} initial={{ opacity: 0 }} key="edit" transition={{ duration: 0.15 }}>
                      <EmailEditor
                        onCancel={() => setEditing(false)}
                        onSave={(next) => {
                          setEditing(false);
                          if (next === email) return;
                          setEmail(next);
                          onEmailChange?.(next);
                          sendAgain(next);
                        }}
                        value={email}
                      />
                    </motion.div>
                  ) : (
                    <motion.p
                      animate={{ opacity: 1 }}
                      className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-muted-foreground"
                      exit={{ opacity: 0 }}
                      initial={{ opacity: 0 }}
                      key="line"
                      transition={{ duration: 0.15 }}
                    >
                      We sent a sign-in link to
                      <EmailChip email={email} onEdit={() => setEditing(true)} />
                    </motion.p>
                  )}
                </AnimatePresence>
              </AutoHeight>

              <h2 className="mt-4 text-balance font-heading font-semibold text-3xl tracking-tight @md:text-4xl">Check your inbox</h2>
              <p className="mt-2 text-pretty text-muted-foreground">
                Open the link on this device to sign in. It works once and expires in {expiresIn}.
              </p>
              <div className="mt-4">
                <ResendChip
                  onResend={() => sendAgain(email)}
                  state={resend}
                  wait={wait}
                />
              </div>

              <div className="mt-8 grid grid-cols-2 gap-2">
                <Button className={press} onClick={() => onOpenMail?.("app")} variant="outline">
                  <MailIcon />
                  Open mail app
                </Button>
                <Button className={press} onClick={() => onOpenMail?.("webmail")} variant="outline">
                  <GlobeIcon />
                  Open webmail
                </Button>
              </div>

              <div className="mt-6 flex items-center gap-3 text-muted-foreground text-xs">
                <span className="h-px flex-1 bg-border" />
                or
                <span className="h-px flex-1 bg-border" />
              </div>

              <div className="mt-3">
                <CodeEntry onVerify={verify} />
              </div>

              {showDemoControls && (
                <p className="mt-8 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-muted-foreground text-xs">
                  <span className="rounded-sm bg-muted px-1.5 py-0.5 font-medium">Demo</span>
                  <span>
                    Code <span className="font-mono text-foreground tabular-nums">{code.slice(0, 3)} {code.slice(3)}</span>
                  </span>
                  <span aria-hidden>·</span>
                  <button className={cn(quietLink, "inline-flex items-center gap-1 text-xs")} disabled={opening} onClick={simulateOpen} type="button">
                    {opening && <Spinner className="size-3" />}
                    Simulate opening the link
                  </button>
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </AuthShell>
    </MotionConfig>
  );
}
