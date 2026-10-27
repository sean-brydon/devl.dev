"use client";

import { ArrowLeftIcon, CheckIcon, EyeIcon, EyeOffIcon, PencilIcon, XIcon } from "lucide-react";
import { AnimatePresence, MotionConfig, motion, useAnimationControls, useReducedMotion } from "motion/react";
import { type FormEvent, type ReactNode, useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { OTPField, OTPFieldInput } from "@/components/ui/otp-field";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export interface PasswordResetResult {
  email: string;
}

export interface PasswordResetFlowProps {
  product?: string;
  defaultEmail?: string;
  minLength?: number;
  otherSessions?: number;
  showDemoHint?: boolean;
  requestCode?: (email: string) => Promise<void> | void;
  verifyCode?: (email: string, code: string) => Promise<boolean> | boolean;
  checkBreaches?: (password: string) => Promise<number> | number;
  onReset?: (result: PasswordResetResult) => void;
  onSignIn?: () => void;
  onCreateAccount?: () => void;
  className?: string;
}

type Step = 0 | 1 | 2 | 3;
type Breach = "idle" | "checking" | "clean" | "found";

const ease = [0.23, 1, 0.32, 1] as const;
const glide = { type: "spring", stiffness: 380, damping: 36 } as const;
const tick = { type: "spring", stiffness: 600, damping: 28 } as const;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const COMMON = ["password", "qwerty", "letmein", "welcome", "summer", "winter", "iloveyou", "admin", "dragon", "monkey", "sunshine", "123456"];
const quiet =
  "cursor-pointer whitespace-nowrap rounded-sm font-medium text-muted-foreground text-sm underline-offset-4 outline-none transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:underline";
const inline = "cursor-pointer font-medium text-foreground underline-offset-4 outline-none hover:underline focus-visible:underline";

const STRENGTH = [
  { label: "Weak", bar: "bg-destructive", text: "text-destructive-foreground" },
  { label: "Fair", bar: "bg-warning", text: "text-warning-foreground" },
  { label: "Good", bar: "bg-info", text: "text-info-foreground" },
  { label: "Strong", bar: "bg-success", text: "text-success-foreground" },
];

function hash(text: string) {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  h ^= h >>> 15;
  h = Math.imul(h, 2246822507);
  h ^= h >>> 13;
  return h >>> 0;
}

const codeFor = (email: string, round: number) => String(hash(`${email}:${round}`) % 1_000_000).padStart(6, "0");

function fakeBreaches(password: string) {
  const lower = password.toLowerCase();
  return COMMON.some((word) => lower.includes(word)) ? 12_000 + (hash(lower) % 88_000) : 0;
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

function Tick({ state }: { state: "met" | "unmet" | "checking" | "failed" }) {
  return (
    <span
      className={cn(
        "relative flex size-4 shrink-0 items-center justify-center rounded-full border transition-[background-color,border-color] duration-200",
        state === "met" && "border-success bg-success text-white",
        state === "failed" && "border-destructive bg-destructive text-white",
        (state === "unmet" || state === "checking") && "border-border",
      )}
    >
      <AnimatePresence initial={false} mode="popLayout">
        {state === "met" && (
          <motion.span animate={{ scale: 1 }} className="flex" exit={{ scale: 0 }} initial={{ scale: 0 }} key="met" transition={tick}>
            <CheckIcon className="size-2.5" strokeWidth={3.5} />
          </motion.span>
        )}
        {state === "failed" && (
          <motion.span animate={{ scale: 1 }} className="flex" exit={{ scale: 0 }} initial={{ scale: 0 }} key="failed" transition={tick}>
            <XIcon className="size-2.5" strokeWidth={3.5} />
          </motion.span>
        )}
      </AnimatePresence>
      {state === "checking" && <Spinner className="absolute size-3.5 text-muted-foreground" />}
    </span>
  );
}

function DrawnCheck() {
  return (
    <span className="relative flex size-12 items-center justify-center rounded-full bg-success/10">
      <svg aria-hidden className="size-6 text-success-foreground" fill="none" viewBox="0 0 24 24">
        <motion.path
          animate={{ pathLength: 1 }}
          d="M5 12.5 10 17.5 19 7"
          initial={{ pathLength: 0 }}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2.25}
          transition={{ duration: 0.42, ease, delay: 0.15 }}
        />
      </svg>
    </span>
  );
}

function Heading({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <h1 className="text-balance font-semibold text-2xl tracking-tight">{title}</h1>
      <p className="mt-1.5 text-pretty text-muted-foreground text-sm">{children}</p>
    </>
  );
}

export function PasswordResetFlow({
  product = "Ridgeline",
  defaultEmail = "ada@ridgeline.app",
  minLength = 12,
  otherSessions = 3,
  showDemoHint = true,
  requestCode,
  verifyCode,
  checkBreaches,
  onReset,
  onSignIn,
  onCreateAccount,
  className,
}: PasswordResetFlowProps) {
  const uid = useId();
  const reduce = useReducedMotion();
  const shake = useAnimationControls();
  const otpRef = useRef<HTMLDivElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const navigated = useRef(false);

  const [[step, direction], setStepState] = useState<[Step, number]>([0, 1]);
  const [email, setEmail] = useState(defaultEmail);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [round, setRound] = useState(0);
  const [resendIn, setResendIn] = useState(0);
  const [code, setCode] = useState("");
  const [codeStatus, setCodeStatus] = useState<"idle" | "checking" | "error">("idle");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [reveal, setReveal] = useState(false);
  const [breach, setBreach] = useState<Breach>("idle");
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const cleanEmail = email.trim();
  const sentCode = round > 0 ? codeFor(cleanEmail.toLowerCase(), round) : null;
  const rules = [
    { id: "length", label: `${minLength}+ characters`, met: password.length >= minLength },
    { id: "upper", label: "1 uppercase letter", met: /[A-Z]/.test(password) },
    { id: "lower", label: "1 lowercase letter", met: /[a-z]/.test(password) },
    { id: "number", label: "1 number", met: /\d/.test(password) },
    { id: "symbol", label: "1 symbol", met: /[^A-Za-z0-9]/.test(password) },
  ];
  const basicsMet = rules.every((rule) => rule.met);
  const metCount = rules.filter((rule) => rule.met).length;
  const level = breach === "found" ? 0 : basicsMet ? (breach === "clean" && password.length >= minLength + 4 ? 3 : 2) : metCount >= 4 ? 1 : 0;
  const strength = STRENGTH[level];
  const matches = confirm.length > 0 && confirm === password;
  const canSave = basicsMet && breach === "clean" && matches;

  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const t of pending) clearTimeout(t);
    };
  }, []);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  useEffect(() => {
    if (!basicsMet) {
      setBreach("idle");
      return;
    }
    setBreach("checking");
    let live = true;
    const t = setTimeout(async () => {
      const count = await Promise.resolve(checkBreaches ? checkBreaches(password) : fakeBreaches(password));
      if (live) setBreach(count > 0 ? "found" : "clean");
    }, 700);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [basicsMet, password, checkBreaches]);

  useEffect(() => {
    if (!navigated.current) return;
    if (step === 0) emailRef.current?.focus();
    if (step === 1) otpRef.current?.querySelector<HTMLInputElement>("input")?.focus();
    if (step === 2) passwordRef.current?.focus();
  }, [step]);

  const later = (fn: () => void, ms: number) => {
    const t = setTimeout(() => {
      timers.current.delete(t);
      fn();
    }, ms);
    timers.current.add(t);
  };
  const wait = (ms: number) => new Promise<void>((resolve) => later(resolve, ms));

  const go = (next: Step) => {
    navigated.current = true;
    setStepState(([current]) => [next, next >= current ? 1 : -1]);
  };

  const sendCode = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!EMAIL.test(cleanEmail)) {
      setEmailError("Enter a valid email address.");
      return;
    }
    setEmailError(null);
    setSending(true);
    await Promise.all([Promise.resolve(requestCode?.(cleanEmail)), wait(800)]);
    setSending(false);
    setRound((n) => n + 1);
    setResendIn(30);
    setCode("");
    setCodeStatus("idle");
    setCodeError(null);
    if (step === 0) go(1);
  };

  const checkCode = async (value: string) => {
    if (codeStatus === "checking") return;
    setCodeStatus("checking");
    setCodeError(null);
    const [ok] = await Promise.all([Promise.resolve(verifyCode ? verifyCode(cleanEmail, value) : value === sentCode), wait(600)]);
    if (ok) {
      setCodeStatus("idle");
      go(2);
      return;
    }
    setCodeStatus("error");
    setCodeError("That code doesn’t match. Check your latest email.");
    if (!reduce) shake.start({ x: [0, -6, 6, -4, 4, 0], transition: { duration: 0.36, ease: "easeOut" } });
    later(() => {
      setCode("");
      otpRef.current?.querySelector<HTMLInputElement>("input")?.focus();
    }, 420);
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (!canSave || saving) return;
    setSaving(true);
    await wait(900);
    setSaving(false);
    onReset?.({ email: cleanEmail });
    go(3);
  };

  const restart = () => {
    navigated.current = true;
    setStepState([0, -1]);
    setRound(0);
    setResendIn(0);
    setCode("");
    setCodeStatus("idle");
    setCodeError(null);
    setPassword("");
    setConfirm("");
    setReveal(false);
    setSubmitted(false);
  };

  const requestStep = (
    <form noValidate onSubmit={sendCode}>
      <Heading title="Reset your password">Enter your account email and we’ll send you a 6-digit code.</Heading>
      <div className="mt-6">
        <label className="mb-2 block font-medium text-sm" htmlFor={`${uid}-email`}>
          Email
        </label>
        <Input
          aria-describedby={emailError ? `${uid}-email-msg` : undefined}
          aria-invalid={emailError ? true : undefined}
          autoComplete="email"
          id={`${uid}-email`}
          onChange={(event) => {
            setEmail(event.target.value);
            if (emailError) setEmailError(null);
          }}
          placeholder="you@company.com"
          ref={emailRef}
          type="email"
          value={email}
        />
        <p aria-live="polite" className="mt-2 min-h-4 text-destructive-foreground text-xs" id={`${uid}-email-msg`}>
          {emailError}
        </p>
      </div>
      <Button className="mt-2 w-full" loading={sending} type="submit">
        Send code
      </Button>
      <p className="mt-6 text-center text-muted-foreground text-sm">
        Remembered it?{" "}
        <button className={inline} onClick={onSignIn} type="button">
          Sign in
        </button>
      </p>
    </form>
  );

  const verifyStep = (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (code.length === 6) checkCode(code);
        else {
          setCodeStatus("error");
          setCodeError("Enter all 6 digits.");
        }
      }}
    >
      <Heading title="Check your email">Enter the 6-digit code we sent to</Heading>
      <button
        aria-label={`Change email, currently ${cleanEmail}`}
        className="mt-3 flex h-8 max-w-full cursor-pointer items-center gap-2 rounded-full border bg-card ps-1 pe-3 shadow-xs/5 outline-none transition-[background-color,scale] duration-150 ease-out hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]"
        onClick={() => go(0)}
        type="button"
      >
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted font-medium text-[0.6875rem] uppercase">
          {cleanEmail.slice(0, 1)}
        </span>
        <span className="truncate font-medium text-sm">{cleanEmail}</span>
        <PencilIcon className="size-3.5 shrink-0 text-muted-foreground" />
      </button>
      <div className="mt-6">
        <label className="mb-3 block font-medium text-sm" htmlFor={`${uid}-otp`}>
          Reset code
        </label>
        <motion.div animate={shake}>
          <OTPField
            aria-describedby={`${uid}-otp-msg`}
            className="gap-2"
            disabled={codeStatus === "checking"}
            id={`${uid}-otp`}
            length={6}
            onValueChange={(value) => {
              setCode(value);
              if (codeStatus === "error") {
                setCodeStatus("idle");
                setCodeError(null);
              }
            }}
            onValueComplete={checkCode}
            ref={otpRef}
            value={code}
          >
            {Array.from({ length: 6 }, (_, i) => (
              <span className="contents" key={i}>
                {i === 3 && <span aria-hidden className="w-0" />}
                <OTPFieldInput
                  aria-invalid={codeStatus === "error" || undefined}
                  aria-label={`Digit ${i + 1} of 6`}
                  className="h-12! w-11! font-mono text-lg! leading-12!"
                />
              </span>
            ))}
          </OTPField>
        </motion.div>
        <p
          aria-live="polite"
          className={cn("mt-2 min-h-4 text-xs", codeError ? "text-destructive-foreground" : "text-muted-foreground")}
          id={`${uid}-otp-msg`}
        >
          {codeError ??
            (resendIn > 0 ? (
              <span className="tabular-nums">Didn’t get it? Resend in 0:{String(resendIn).padStart(2, "0")}</span>
            ) : (
              <>
                Didn’t get it?{" "}
                <button className={inline} onClick={() => sendCode()} type="button">
                  Resend code
                </button>
              </>
            ))}
        </p>
      </div>
      <Button className="mt-4 w-full" loading={codeStatus === "checking"} type="submit">
        Continue
      </Button>
      {showDemoHint && sentCode && (
        <div className="mt-8 flex items-center gap-3 rounded-lg border border-dashed px-3 py-2.5 text-muted-foreground text-xs">
          <span className="min-w-0 flex-1">
            Demo email code <span className="font-medium font-mono text-foreground tabular-nums">{`${sentCode.slice(0, 3)} ${sentCode.slice(3)}`}</span>
          </span>
          <button
            className={inline}
            disabled={codeStatus === "checking"}
            onClick={() => {
              setCode(sentCode);
              checkCode(sentCode);
            }}
            type="button"
          >
            Use
          </button>
        </div>
      )}
    </form>
  );

  const ruleState = (met: boolean) => (met ? "met" : "unmet") as "met" | "unmet";
  const breachState = breach === "checking" ? "checking" : breach === "clean" ? "met" : breach === "found" ? "failed" : "unmet";
  const confirmMismatch = confirm.length > 0 && !matches && (submitted || confirm.length >= password.length);

  const passwordStep = (
    <form noValidate onSubmit={save}>
      <Heading title="Set a new password">Choose something you don’t use anywhere else.</Heading>
      <div className="mt-6">
        <label className="mb-2 block font-medium text-sm" htmlFor={`${uid}-password`}>
          New password
        </label>
        <InputGroup>
          <InputGroupInput
            aria-describedby={`${uid}-rules`}
            autoComplete="new-password"
            id={`${uid}-password`}
            onChange={(event) => setPassword(event.target.value)}
            ref={passwordRef}
            spellCheck={false}
            type={reveal ? "text" : "password"}
            value={password}
          />
          <InputGroupAddon align="inline-end">
            <Button
              aria-label={reveal ? "Hide password" : "Show password"}
              aria-pressed={reveal}
              onClick={() => setReveal((v) => !v)}
              size="icon-xs"
              variant="ghost"
            >
              {reveal ? <EyeOffIcon /> : <EyeIcon />}
            </Button>
          </InputGroupAddon>
        </InputGroup>
        <div className="mt-3 flex items-center gap-3">
          <div aria-hidden className="grid flex-1 grid-cols-4 gap-1.5">
            {STRENGTH.map((item, i) => (
              <span className="h-1 overflow-hidden rounded-full bg-muted" key={item.label}>
                <motion.span
                  animate={{ scaleX: password && i <= level ? 1 : 0 }}
                  className={cn("block h-full origin-left rounded-full transition-colors duration-200", strength.bar)}
                  initial={false}
                  transition={{ ...glide, delay: i * 0.03 }}
                />
              </span>
            ))}
          </div>
          <span aria-live="polite" className={cn("w-12 text-end font-medium text-xs", password ? strength.text : "text-muted-foreground")}>
            {password ? strength.label : ""}
          </span>
        </div>
        <ul className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2.5" id={`${uid}-rules`}>
          {rules.map((rule) => (
            <li className={cn("flex items-center gap-2 text-xs transition-colors duration-200", rule.met ? "text-foreground" : "text-muted-foreground")} key={rule.id}>
              <Tick state={ruleState(rule.met)} />
              {rule.label}
            </li>
          ))}
          <li
            className={cn(
              "col-span-2 flex items-center gap-2 text-xs transition-colors duration-200",
              breach === "clean" ? "text-foreground" : breach === "found" ? "text-destructive-foreground" : "text-muted-foreground",
            )}
          >
            <Tick state={breachState} />
            <span aria-live="polite">
              {breach === "checking" ? "Checking known breaches…" : breach === "found" ? "Found in known breaches, pick another" : "Not found in known breaches"}
            </span>
          </li>
        </ul>
      </div>
      <div className="mt-6">
        <label className="mb-2 block font-medium text-sm" htmlFor={`${uid}-confirm`}>
          Confirm password
        </label>
        <Input
          aria-describedby={`${uid}-confirm-msg`}
          aria-invalid={confirmMismatch || undefined}
          autoComplete="new-password"
          id={`${uid}-confirm`}
          onChange={(event) => setConfirm(event.target.value)}
          spellCheck={false}
          type={reveal ? "text" : "password"}
          value={confirm}
        />
        <p
          aria-live="polite"
          className={cn(
            "mt-2 flex min-h-4 items-center gap-2 text-xs",
            matches ? "text-foreground" : confirmMismatch ? "text-destructive-foreground" : "text-muted-foreground",
          )}
          id={`${uid}-confirm-msg`}
        >
          {matches && <Tick state="met" />}
          {matches ? "Passwords match" : confirmMismatch ? "Passwords don’t match" : ""}
        </p>
      </div>
      <Button className="mt-4 w-full" disabled={submitted && !canSave} loading={saving} type="submit">
        Update password
      </Button>
      {submitted && !canSave && !saving && (
        <p className="mt-2 text-center text-muted-foreground text-xs">
          {breach === "found" ? "Pick a password that hasn’t leaked." : !basicsMet ? "Meet every requirement above." : "Confirm your new password."}
        </p>
      )}
    </form>
  );

  const doneStep = (
    <div>
      <DrawnCheck />
      <h1 className="mt-6 text-balance font-semibold text-2xl tracking-tight">Password updated</h1>
      <p className="mt-1.5 text-pretty text-muted-foreground text-sm">
        You can now sign in with your new password.
        {otherSessions > 0 && ` We signed you out of ${otherSessions} other ${otherSessions === 1 ? "device" : "devices"}.`}
      </p>
      <Button className="mt-6 w-full" onClick={onSignIn}>
        Back to sign in
      </Button>
      <div className="mt-4 text-center">
        <button className={quiet} onClick={restart} type="button">
          Run the demo again
        </button>
      </div>
    </div>
  );

  const views = [requestStep, verifyStep, passwordStep, doneStep];
  const shown = Math.min(step, 2);

  return (
    <MotionConfig reducedMotion="user">
      <div className={cn("@container relative isolate flex h-[760px] w-full flex-col overflow-hidden bg-background text-foreground", className)}>
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-96 bg-radial-[ellipse_at_top] from-foreground/4 to-transparent to-70%" />
        <header className="flex h-14 shrink-0 items-center justify-between px-6">
          <RidgelineMark product={product} />
          <p className="text-muted-foreground text-sm">
            <span className="hidden @md:inline">New to {product}? </span>
            <button className={inline} onClick={onCreateAccount} type="button">
              Create account
            </button>
          </p>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          <div className="mx-auto w-full max-w-[360px] px-6 pt-10 pb-10 @md:pt-14">
            <div className="mb-8 h-10">
              <AnimatePresence initial={false}>
                {step < 3 && (
                  <motion.div animate={{ opacity: 1 }} exit={{ opacity: 0 }} initial={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                    <div aria-hidden className="grid grid-cols-3 gap-1.5">
                      {[0, 1, 2].map((i) => (
                        <span className="h-1 overflow-hidden rounded-full bg-muted" key={i}>
                          <motion.span
                            animate={{ scaleX: i <= shown ? 1 : 0 }}
                            className="block h-full origin-left rounded-full bg-foreground"
                            initial={false}
                            transition={glide}
                          />
                        </span>
                      ))}
                    </div>
                    <div className="mt-2.5 flex items-center justify-between">
                      <p className="text-muted-foreground text-xs tabular-nums">Step {shown + 1} of 3</p>
                      {step > 0 ? (
                        <button className={cn(quiet, "flex items-center gap-1 text-xs")} onClick={() => go((step - 1) as Step)} type="button">
                          <ArrowLeftIcon className="size-3.5" />
                          Back
                        </button>
                      ) : (
                        <button className={cn(quiet, "flex items-center gap-1 text-xs")} onClick={onSignIn} type="button">
                          <ArrowLeftIcon className="size-3.5" />
                          Back to sign in
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <AnimatePresence custom={direction} initial={false} mode="popLayout">
              <motion.div
                animate="center"
                custom={direction}
                exit="exit"
                initial="enter"
                key={step}
                transition={glide}
                variants={{
                  enter: (d: number) => ({ opacity: 0, x: d * 32 }),
                  center: { opacity: 1, x: 0 },
                  exit: (d: number) => ({ opacity: 0, x: d * -32 }),
                }}
              >
                {views[step]}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
        <footer className="flex h-12 shrink-0 items-center justify-center gap-2 text-muted-foreground text-xs">
          {["Privacy", "Terms", "Help"].map((link, i) => (
            <span className="flex items-center gap-2" key={link}>
              {i > 0 && <span aria-hidden>·</span>}
              <button className="cursor-pointer rounded-sm outline-none transition-colors hover:text-foreground focus-visible:text-foreground" type="button">
                {link}
              </button>
            </span>
          ))}
        </footer>
      </div>
    </MotionConfig>
  );
}
