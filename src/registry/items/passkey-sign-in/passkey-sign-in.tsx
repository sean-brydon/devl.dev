"use client";

import { ArrowLeftIcon, ChevronDownIcon, FingerprintIcon, KeyRoundIcon, MailIcon, UsbIcon } from "lucide-react";
import { AnimatePresence, MotionConfig, motion, useAnimationControls, useReducedMotion } from "motion/react";
import { type FormEvent, type ReactNode, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { OTPField, OTPFieldInput } from "@/components/ui/otp-field";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export interface PasskeySsoCompany {
  domain: string;
  name: string;
  signInUrl: string;
}

export interface PasskeyAccount {
  name: string;
  email: string;
}

export type PasskeyMethod = "passkey" | "security-key" | "sso" | "email-code";

export interface PasskeySignInProps {
  product?: string;
  account?: PasskeyAccount;
  companies?: PasskeySsoCompany[];
  onSignedIn?: (result: { email: string; method: PasskeyMethod }) => void;
  onCreateAccount?: () => void;
  className?: string;
}

type View = "account" | "email" | "code" | "sso" | "done";
type Waiting = null | "passkey" | "security-key";

const ease = [0.23, 1, 0.32, 1] as const;
const spring = { type: "spring", stiffness: 420, damping: 36 } as const;
const press = "transition-[box-shadow,scale,background-color] duration-150 ease-out active:scale-[0.97]";
const quietLink =
  "cursor-pointer rounded-sm font-medium text-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring";
const EMAIL = /^[^\s@]+@([^\s@]+\.[^\s@]{2,})$/;

const defaultAccount: PasskeyAccount = { name: "Ada Lindqvist", email: "ada@ridgeline.app" };
const defaultCompanies: PasskeySsoCompany[] = [
  { domain: "northwind.co", name: "Northwind", signInUrl: "login.northwind.co" },
];

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

function Heading({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div>
      <h2 className="text-balance font-heading font-semibold text-2xl tracking-tight">{title}</h2>
      {children && <p className="mt-1.5 text-pretty text-muted-foreground">{children}</p>}
    </div>
  );
}

function AccountChip({ email, onClick }: { email: string; onClick: () => void }) {
  return (
    <button
      aria-label={`${email}, use a different account`}
      className={cn(
        "flex h-9 max-w-full cursor-pointer items-center gap-2 rounded-full border bg-background ps-1 pe-2.5 shadow-xs/5 outline-none hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring dark:bg-input/32 dark:hover:bg-input/64",
        press,
      )}
      onClick={onClick}
      type="button"
    >
      <Avatar className="[--avatar-size:--spacing(7)]">
        <AvatarFallback className="bg-primary font-medium text-primary-foreground text-xs">{email[0]?.toUpperCase()}</AvatarFallback>
      </Avatar>
      <span className="truncate font-medium">{email}</span>
      <ChevronDownIcon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

function Divider() {
  return (
    <div className="flex items-center gap-3 text-muted-foreground text-xs">
      <span className="h-px flex-1 bg-border" />
      or
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

function DrawnCheck({ className }: { className?: string }) {
  return (
    <motion.span
      animate={{ scale: 1, opacity: 1 }}
      className={cn("grid size-10 place-items-center rounded-full bg-success/12 text-success-foreground", className)}
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

function PasskeyButton({
  waiting,
  verified,
  onStart,
}: {
  waiting: Waiting;
  verified: boolean;
  onStart: () => void;
}) {
  const reduce = useSafeReducedMotion();
  const busy = waiting !== null || verified;
  const label = verified ? "Verified" : waiting === "security-key" ? "Touch your security key…" : waiting ? "Waiting for your device…" : "Continue with passkey";
  return (
    <Button
      aria-busy={busy || undefined}
      className={cn("w-full", press)}
      onClick={() => {
        if (!busy) onStart();
      }}
    >
      <span className="relative grid size-4 place-items-center">
        {waiting && !verified && !reduce && (
          <motion.span
            animate={{ scale: [1, 1.9], opacity: [0.5, 0] }}
            aria-hidden
            className="absolute inset-0 rounded-full border border-current"
            transition={{ duration: 1.3, repeat: Infinity, ease: "easeOut" }}
          />
        )}
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            animate={{ opacity: 1, scale: 1 }}
            className="flex"
            exit={{ opacity: 0, scale: 0.7 }}
            initial={{ opacity: 0, scale: 0.7 }}
            key={verified ? "ok" : waiting === "security-key" ? "key" : "print"}
            transition={{ duration: 0.16, ease }}
          >
            {verified ? (
              <svg aria-hidden className="size-4" fill="none" viewBox="0 0 24 24">
                <motion.path
                  animate={{ pathLength: 1 }}
                  className="stroke-current"
                  d="M5 12.5l4.5 4.5L19 7.5"
                  initial={{ pathLength: 0 }}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.75"
                  transition={{ duration: 0.3, ease }}
                />
              </svg>
            ) : waiting === "security-key" ? (
              <UsbIcon />
            ) : (
              <FingerprintIcon />
            )}
          </motion.span>
        </AnimatePresence>
      </span>
      <span className="relative">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            animate={{ opacity: 1, y: 0 }}
            className="block"
            exit={{ opacity: 0, y: -6 }}
            initial={{ opacity: 0, y: 6 }}
            key={label}
            transition={{ duration: 0.18, ease }}
          >
            {label}
          </motion.span>
        </AnimatePresence>
      </span>
    </Button>
  );
}

function AccountView({
  account,
  waiting,
  verified,
  onStart,
  onCancel,
  onSwitch,
  onCode,
}: {
  account: PasskeyAccount;
  waiting: Waiting;
  verified: boolean;
  onStart: (kind: "passkey" | "security-key") => void;
  onCancel: () => void;
  onSwitch: () => void;
  onCode: () => void;
}) {
  const first = account.name.split(" ")[0];
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <Heading title={first ? `Welcome back, ${first}` : "Welcome back"}>Sign in with the passkey saved on this device.</Heading>
        <div>
          <AccountChip email={account.email} onClick={onSwitch} />
        </div>
      </div>
      <div className="flex flex-col">
        <PasskeyButton onStart={() => onStart("passkey")} verified={verified} waiting={waiting} />
        <AutoHeight>
          <AnimatePresence initial={false} mode="popLayout">
            {waiting && !verified && (
              <motion.p
                animate={{ opacity: 1 }}
                className="flex items-center justify-between gap-3 pt-3 text-muted-foreground text-xs"
                exit={{ opacity: 0 }}
                initial={{ opacity: 0 }}
                key="hint"
                role="status"
                transition={{ duration: 0.18 }}
              >
                <span>{waiting === "security-key" ? "Insert your key, then touch it." : "Confirm with your fingerprint or face."}</span>
                <button className={cn(quietLink, "shrink-0 text-xs")} onClick={onCancel} type="button">
                  Cancel
                </button>
              </motion.p>
            )}
          </AnimatePresence>
        </AutoHeight>
      </div>
      <Divider />
      <div className="flex flex-col gap-2">
        <Button className={cn("w-full", press)} disabled={waiting !== null} onClick={onCode} variant="outline">
          <MailIcon />
          Sign in with email code
        </Button>
        <Button className={cn("w-full", press)} disabled={waiting !== null} onClick={() => onStart("security-key")} variant="outline">
          <KeyRoundIcon />
          Use a security key
        </Button>
      </div>
      <p className="text-center text-muted-foreground">
        Not you?{" "}
        <button className={quietLink} onClick={onSwitch} type="button">
          Use a different account
        </button>
      </p>
    </div>
  );
}

function EmailView({
  defaultEmail,
  companies,
  onBack,
  onContinue,
}: {
  defaultEmail: string;
  companies: PasskeySsoCompany[];
  onBack: () => void;
  onContinue: (email: string, company: PasskeySsoCompany | null) => void;
}) {
  const uid = useId();
  const [email, setEmail] = useState(defaultEmail);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const domain = EMAIL.exec(email.trim())?.[1]?.toLowerCase();
  const company = companies.find((c) => c.domain === domain) ?? null;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const value = email.trim();
    if (!domain) {
      setError(value ? "Enter a full email address, like ada@company.com." : "Enter your email to continue.");
      inputRef.current?.focus();
      return;
    }
    onContinue(value, company);
  };

  return (
    <form className="flex flex-col gap-6" noValidate onSubmit={submit}>
      <Heading title="Sign in">Enter your email and we’ll find the right way in.</Heading>
      <Field invalid={error !== null}>
        <FieldLabel>Email</FieldLabel>
        <Input
          aria-describedby={error ? `${uid}-err` : undefined}
          autoComplete="username webauthn"
          inputMode="email"
          onChange={(e) => {
            setEmail(e.target.value);
            if (error) setError(null);
          }}
          placeholder="you@company.com"
          ref={inputRef}
          type="email"
          value={email}
        />
        <AnimatePresence initial={false}>
          {error && (
            <motion.p
              animate={{ height: "auto", opacity: 1 }}
              className="-mt-1 overflow-hidden text-destructive-foreground text-xs"
              exit={{ height: 0, opacity: 0 }}
              id={`${uid}-err`}
              initial={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18, ease }}
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </Field>
      <div className="flex flex-col">
        <AutoHeight>
          <AnimatePresence initial={false} mode="popLayout">
            {company && (
              <motion.div
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="pb-3"
                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                key={company.domain}
                transition={spring}
              >
                <div className="flex items-center gap-3 rounded-xl border bg-muted/50 px-3 py-2.5 dark:bg-muted/30">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-foreground font-heading font-semibold text-background text-xs">
                    {company.name[0]}
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-medium">{company.name} uses single sign-on</span>
                    <span className="truncate text-muted-foreground text-xs">You’ll continue on {company.signInUrl}</span>
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </AutoHeight>
        <Button className={cn("w-full", press)} type="submit">
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span
              animate={{ opacity: 1, y: 0 }}
              className="block"
              exit={{ opacity: 0, y: -6 }}
              initial={{ opacity: 0, y: 6 }}
              key={company ? "sso" : "plain"}
              transition={{ duration: 0.18, ease }}
            >
              {company ? "Continue with SSO" : "Continue"}
            </motion.span>
          </AnimatePresence>
        </Button>
      </div>
      <button className={cn(quietLink, "inline-flex items-center gap-1.5 self-center font-normal text-muted-foreground hover:text-foreground")} onClick={onBack} type="button">
        <ArrowLeftIcon aria-hidden className="size-4" />
        Back to passkey
      </button>
    </form>
  );
}

function CodeView({ email, onBack, onVerified }: { email: string; onBack: () => void; onVerified: () => void }) {
  const uid = useId();
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "checking" | "error">("idle");
  const shake = useAnimationControls();
  const reduce = useSafeReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const t = timers.current;
    return () => t.forEach(clearTimeout);
  }, []);

  const failed = status === "error";
  const mounted = useRef(false);
  useEffect(() => {
    if (failed || !mounted.current) rootRef.current?.querySelector<HTMLInputElement>("input:not(:disabled)")?.focus();
    mounted.current = true;
  }, [failed]);

  const check = (value: string) => {
    setStatus("checking");
    timers.current.push(
      setTimeout(() => {
        if (value === "000000") {
          setStatus("error");
          setCode("");
          if (!reduce) shake.start({ x: [0, -6, 6, -3, 3, 0], transition: { duration: 0.32, ease: "easeOut" } });
          return;
        }
        onVerified();
      }, 800),
    );
  };

  return (
    <div className="flex flex-col gap-6" ref={rootRef}>
      <Heading title="Check your email">
        Enter the 6-digit code we sent to <span className="font-medium text-foreground">{email}</span>.
      </Heading>
      <div className="flex flex-col gap-3">
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
          {status === "error" && "That code didn’t work. Try the one in the latest email."}
          {status === "idle" && "The code expires in 10 minutes."}
        </p>
      </div>
      <button className={cn(quietLink, "inline-flex items-center gap-1.5 self-center font-normal text-muted-foreground hover:text-foreground")} onClick={onBack} type="button">
        <ArrowLeftIcon aria-hidden className="size-4" />
        Back to passkey
      </button>
    </div>
  );
}

function SsoView({ company, email, onCancel, onDone }: { company: PasskeySsoCompany; email: string; onCancel: () => void; onDone: () => void }) {
  const reduce = useSafeReducedMotion();
  const doneRef = useRef(onDone);
  useEffect(() => {
    doneRef.current = onDone;
  });
  useEffect(() => {
    const t = setTimeout(() => doneRef.current(), 2600);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <span className="relative grid size-10 place-items-center rounded-xl bg-foreground font-heading font-semibold text-background">
        {company.name[0]}
        <span className="absolute -right-1 -bottom-1 grid size-5 place-items-center rounded-full bg-background">
          <Spinner className="size-3.5 text-muted-foreground" />
        </span>
      </span>
      <Heading title={`Redirecting to ${company.name}…`}>
        {company.name} manages sign-in for <span className="font-medium text-foreground">{email}</span>. You’ll come straight back once you’re through.
      </Heading>
      <div className="flex flex-col gap-2">
        <div className="h-1 overflow-hidden rounded-full bg-muted">
          <motion.span
            animate={{ scaleX: 1 }}
            className="block h-full origin-left rounded-full bg-foreground"
            initial={{ scaleX: 0.05 }}
            transition={{ duration: reduce ? 0 : 2.5, ease: [0.4, 0, 0.2, 1] }}
          />
        </div>
        <span className="font-mono text-muted-foreground text-xs">{company.signInUrl}</span>
      </div>
      <button className={cn(quietLink, "self-start font-normal text-muted-foreground hover:text-foreground")} onClick={onCancel} type="button">
        Cancel
      </button>
    </div>
  );
}

function DoneView({ product, email, method, onSignOut }: { product: string; email: string; method: PasskeyMethod; onSignOut: () => void }) {
  const via = { passkey: "your passkey", "security-key": "your security key", sso: "single sign-on", "email-code": "an email code" }[method];
  return (
    <div className="flex flex-col gap-6">
      <DrawnCheck />
      <Heading title="You’re signed in">
        Signed in as <span className="font-medium text-foreground">{email}</span> with {via}.
      </Heading>
      <Button className={cn("w-full", press)}>Continue to {product}</Button>
      <p className="text-center text-muted-foreground">
        Wrong account?{" "}
        <button className={quietLink} onClick={onSignOut} type="button">
          Sign out
        </button>
      </p>
    </div>
  );
}

export function PasskeySignIn({
  product = "Ridgeline",
  account: initialAccount = defaultAccount,
  companies = defaultCompanies,
  onSignedIn,
  onCreateAccount,
  className,
}: PasskeySignInProps) {
  const [view, setView] = useState<View>("account");
  const [account, setAccount] = useState(initialAccount);
  const [waiting, setWaiting] = useState<Waiting>(null);
  const [verified, setVerified] = useState(false);
  const [company, setCompany] = useState<PasskeySsoCompany | null>(null);
  const [ssoEmail, setSsoEmail] = useState("");
  const [result, setResult] = useState<{ email: string; method: PasskeyMethod } | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const t = timers.current;
    return () => t.forEach(clearTimeout);
  }, []);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const finish = (email: string, method: PasskeyMethod) => {
    setResult({ email, method });
    setView("done");
    onSignedIn?.({ email, method });
  };

  const startPasskey = (kind: "passkey" | "security-key") => {
    setWaiting(kind);
    timers.current.push(
      setTimeout(() => setVerified(true), kind === "security-key" ? 2600 : 2000),
      setTimeout(() => {
        setWaiting(null);
        setVerified(false);
        finish(account.email, kind);
      }, kind === "security-key" ? 3300 : 2700),
    );
  };

  const cancel = () => {
    clearTimers();
    setWaiting(null);
    setVerified(false);
  };

  const reset = () => {
    clearTimers();
    setWaiting(null);
    setVerified(false);
    setResult(null);
    setAccount(initialAccount);
    setView("account");
  };

  return (
    <MotionConfig reducedMotion="user">
      <AuthShell className={className} onCreateAccount={onCreateAccount} product={product}>
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            initial={{ opacity: 0, y: 8 }}
            key={view}
            transition={{ duration: 0.2, ease }}
          >
            {view === "account" && (
              <AccountView
                account={account}
                onCancel={cancel}
                onCode={() => setView("code")}
                onStart={startPasskey}
                onSwitch={() => {
                  cancel();
                  setView("email");
                }}
                verified={verified}
                waiting={waiting}
              />
            )}
            {view === "email" && (
              <EmailView
                companies={companies}
                defaultEmail=""
                onBack={() => setView("account")}
                onContinue={(email, c) => {
                  if (c) {
                    setCompany(c);
                    setSsoEmail(email);
                    setView("sso");
                    return;
                  }
                  setAccount({ name: "", email });
                  setView("account");
                }}
              />
            )}
            {view === "code" && <CodeView email={account.email} onBack={() => setView("account")} onVerified={() => finish(account.email, "email-code")} />}
            {view === "sso" && company && (
              <SsoView company={company} email={ssoEmail} onCancel={() => setView("email")} onDone={() => finish(ssoEmail, "sso")} />
            )}
            {view === "done" && result && <DoneView email={result.email} method={result.method} onSignOut={reset} product={product} />}
          </motion.div>
        </AnimatePresence>
      </AuthShell>
    </MotionConfig>
  );
}
