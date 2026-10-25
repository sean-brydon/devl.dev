"use client";

import { ArrowRightIcon, CheckIcon, CircleAlertIcon, EyeIcon, EyeOffIcon, MailCheckIcon, TrendingUpIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type FormEvent, type ReactNode, useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export interface SignUpQuote {
  quote: string;
  name: string;
  role: string;
  tone?: string;
}

export interface SignUpValues {
  name: string;
  email: string;
  password: string;
}

export interface SplitSignUpProps {
  product?: string;
  title?: string;
  subtitle?: string;
  quotes?: SignUpQuote[];
  showcase?: ReactNode;
  checkEmail?: (email: string) => Promise<boolean>;
  onSubmit?: (values: SignUpValues) => Promise<void>;
  onSignIn?: () => void;
  className?: string;
}

const ease = [0.23, 1, 0.32, 1] as const;
const press = "transition-[box-shadow,scale,background-color] duration-150 active:scale-[0.97]";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const RULES = [
  { id: "len", label: "8+ characters", test: (p: string) => p.length >= 8 },
  { id: "num", label: "A number", test: (p: string) => /\d/.test(p) },
  {
    id: "mix",
    label: "Upper & lower case",
    test: (p: string) => /[a-z]/.test(p) && /[A-Z]/.test(p),
  },
];

const STRENGTH = [
  {
    label: "Too short",
    bar: "bg-destructive",
    text: "text-destructive-foreground",
  },
  { label: "Weak", bar: "bg-destructive", text: "text-destructive-foreground" },
  { label: "Fair", bar: "bg-warning", text: "text-warning-foreground" },
  { label: "Good", bar: "bg-info", text: "text-info-foreground" },
  { label: "Strong", bar: "bg-success", text: "text-success-foreground" },
];

function strengthOf(p: string) {
  if (!p) return 0;
  let s = RULES.filter((r) => r.test(p)).length;
  if (p.length >= 12 || /[^A-Za-z0-9]/.test(p)) s += 1;
  return p.length < 8 ? Math.min(s, 1) : Math.max(1, s);
}

function Message({ id, tone = "error", children }: { id: string; tone?: "error" | "muted"; children?: ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {children && (
        <motion.div
          animate={{ height: "auto", opacity: 1 }}
          className="overflow-hidden"
          exit={{ height: 0, opacity: 0 }}
          initial={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.18, ease }}
        >
          <p className={cn("pt-1.5 text-xs", tone === "error" ? "text-destructive-foreground" : "text-muted-foreground")} id={id}>
            {children}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function StatusIcon({ state }: { state: "idle" | "checking" | "valid" }) {
  return (
    <AnimatePresence initial={false} mode="popLayout">
      {state !== "idle" && (
        <motion.span
          animate={{ opacity: 1, scale: 1 }}
          className="flex"
          exit={{ opacity: 0, scale: 0.6 }}
          initial={{ opacity: 0, scale: 0.6 }}
          key={state}
          transition={{ duration: 0.16, ease }}
        >
          {state === "checking" ? (
            <Spinner className="size-4 text-muted-foreground" />
          ) : (
            <span className="flex size-4 items-center justify-center rounded-full bg-success text-white">
              <CheckIcon className="size-2.5" strokeWidth={3.5} />
            </span>
          )}
        </motion.span>
      )}
    </AnimatePresence>
  );
}

function DefaultShowcase() {
  const reduce = useReducedMotion();
  const bars = [38, 52, 44, 61, 58, 72, 84];
  return (
    <div className="relative mx-auto w-full max-w-[340px]">
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border bg-card p-4 shadow-xs/5"
        initial={{ opacity: 0, y: 12 }}
        transition={reduce ? { duration: 0 } : { duration: 0.4, ease, delay: 0.1 }}
      >
        <div className="flex items-center justify-between">
          <p className="font-medium text-xs">Weekly bookings</p>
          <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-1.5 py-0.5 font-medium text-[0.6875rem] text-success-foreground tabular-nums">
            <TrendingUpIcon className="size-3" />
            18%
          </span>
        </div>
        <p className="mt-1 font-semibold text-xl tabular-nums tracking-tight">1,284</p>
        <div aria-hidden className="mt-3 flex h-20 items-end gap-1.5">
          {bars.map((h, i) => (
            <motion.span
              animate={{ scaleY: 1 }}
              className={cn(
                "flex-1 origin-bottom rounded-[3px]",
                i === bars.length - 1 ? "bg-violet-500" : "bg-violet-500/25 dark:bg-violet-400/25",
              )}
              initial={{ scaleY: 0.2 }}
              key={i}
              style={{ height: `${h}%` }}
              transition={reduce ? { duration: 0 } : { duration: 0.5, ease, delay: 0.25 + i * 0.04 }}
            />
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[0.6875rem] text-muted-foreground">
          <span>Mon</span>
          <span>Sun</span>
        </div>
      </motion.div>
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="absolute -right-4 -bottom-14 flex items-center gap-2.5 rounded-xl border bg-card py-2 ps-2 pe-3.5 shadow-xs/5 lg:-right-8"
        initial={{ opacity: 0, y: 12 }}
        transition={reduce ? { duration: 0 } : { duration: 0.4, ease, delay: 0.5 }}
      >
        <span className="flex size-7 items-center justify-center rounded-full bg-emerald-500/15 font-medium text-[0.6875rem] text-emerald-700 dark:text-emerald-300">
          JR
        </span>
        <span className="text-xs">
          <span className="block font-medium">Jonah booked a table</span>
          <span className="block text-muted-foreground">Friday, 7:30 pm · party of 4</span>
        </span>
      </motion.div>
    </div>
  );
}

function QuoteBody({ item, className, ...rest }: { item: SignUpQuote; className?: string; "aria-hidden"?: boolean }) {
  const initials = item.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2);
  return (
    <div className={cn("flex h-full flex-col justify-end", className)} {...rest}>
      <blockquote className="text-pretty font-medium text-[0.9375rem]/6 tracking-tight md:text-lg/7">“{item.quote}”</blockquote>
      <figcaption className="mt-4 flex items-center gap-3">
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-full font-medium text-xs",
            item.tone ?? "bg-violet-500/15 text-violet-700 dark:text-violet-300",
          )}
        >
          {initials}
        </span>
        <span className="min-w-0 text-sm">
          <span className="block font-medium">{item.name}</span>
          <span className="block text-muted-foreground text-xs">{item.role}</span>
        </span>
      </figcaption>
    </div>
  );
}

function Quotes({ quotes }: { quotes: SignUpQuote[] }) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused || quotes.length < 2) return;
    const t = setTimeout(() => setIndex((i) => (i + 1) % quotes.length), 7000);
    return () => clearTimeout(t);
  }, [index, paused, quotes.length]);
  const q = quotes[index];
  if (!q) return null;
  return (
    <figure
      className="relative"
      onBlur={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
    >
      <div className="grid">
        {quotes.map((item) => (
          <QuoteBody aria-hidden className="invisible col-start-1 row-start-1" item={item} key={item.name} />
        ))}
        <AnimatePresence initial={false}>
          <motion.div
            animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
            className="col-start-1 row-start-1"
            exit={{
              opacity: 0,
              filter: reduce ? "blur(0px)" : "blur(4px)",
              y: reduce ? 0 : -6,
            }}
            initial={{
              opacity: 0,
              filter: reduce ? "blur(0px)" : "blur(4px)",
              y: reduce ? 0 : 6,
            }}
            key={index}
            transition={{ duration: 0.3, ease }}
          >
            <QuoteBody item={q} />
          </motion.div>
        </AnimatePresence>
      </div>
      {quotes.length > 1 && (
        <div className="absolute right-0 bottom-2.5 flex gap-1">
          {quotes.map((item, i) => (
            <button
              aria-current={i === index ? "true" : undefined}
              aria-label={`Show quote from ${item.name}`}
              className="group flex size-6 cursor-pointer items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
              key={item.name}
              onClick={() => setIndex(i)}
              type="button"
            >
              <span
                className={cn(
                  "h-1.5 rounded-full transition-[width,background-color] duration-200 ease-out",
                  i === index ? "w-4 bg-foreground" : "w-1.5 bg-foreground/20 group-hover:bg-foreground/40",
                )}
              />
            </button>
          ))}
        </div>
      )}
    </figure>
  );
}

export function SplitSignUp({
  product = "Tidewell",
  title = "Create your account",
  subtitle = "Start a 14-day trial. No card needed.",
  quotes = [],
  showcase,
  checkEmail,
  onSubmit = async () => {},
  onSignIn,
  className,
}: SplitSignUpProps) {
  const reduce = useReducedMotion();
  const uid = useId();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agree, setAgree] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [emailTaken, setEmailTaken] = useState(false);
  const [checking, setChecking] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const checkSeq = useRef(0);

  const strength = strengthOf(password);
  const passed = RULES.every((r) => r.test(password));
  const show = (field: string) => touched[field] || submitted;

  const nameError = show("name") && !name.trim() ? "Tell us what to call you." : undefined;
  const emailFormatError = !email.trim()
    ? "Enter your work email."
    : !EMAIL.test(email.trim())
      ? "That doesn't look like an email address."
      : undefined;
  const emailError = show("email") ? emailFormatError : undefined;
  const passwordError = show("password") && !passed ? "Your password needs every item below." : undefined;
  const agreeError = submitted && !agree ? "Please accept the terms to continue." : undefined;

  const runEmailCheck = async () => {
    setTouched((t) => ({ ...t, email: true }));
    if (!checkEmail || emailFormatError) return;
    const seq = ++checkSeq.current;
    setChecking(true);
    const taken = await checkEmail(email.trim());
    if (seq !== checkSeq.current) return;
    setChecking(false);
    setEmailTaken(taken);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (!name.trim() || emailFormatError || emailTaken || !passed || !agree) return;
    setBusy(true);
    await onSubmit({ name: name.trim(), email: email.trim(), password });
    setBusy(false);
    setDone(true);
  };

  const emailState = checking ? "checking" : !emailFormatError && touched.email && !emailTaken ? "valid" : "idle";

  return (
    <section
      className={cn(
        "mx-auto grid w-full max-w-[1000px] overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-xs/5 md:grid-cols-[1fr_1.05fr]",
        className,
      )}
    >
      <div className="relative px-5 py-8 sm:px-10 sm:py-10">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <svg
              aria-hidden
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="2.25"
              viewBox="0 0 16 16"
            >
              <path d="M2 6.5c2-1.6 4-1.6 6 0s4 1.6 6 0M2 10.5c2-1.6 4-1.6 6 0s4 1.6 6 0" />
            </svg>
          </span>
          <span className="font-semibold text-sm tracking-tight">{product}</span>
        </div>

        <div className="grid">
          <motion.form
            animate={{ opacity: done ? 0 : 1 }}
            aria-hidden={done || undefined}
            className="col-start-1 row-start-1"
            inert={done}
            initial={false}
            noValidate
            onSubmit={submit}
            transition={{ duration: 0.2, ease }}
          >
            <h2 className="mt-8 text-balance font-semibold text-2xl tracking-tight">{title}</h2>
            <p className="mt-1.5 text-pretty text-muted-foreground text-sm">{subtitle}</p>

            <div className="mt-7 space-y-4">
              <div>
                <label className="font-medium text-sm" htmlFor={`${uid}-name`}>
                  Full name
                </label>
                <InputGroup className="mt-2">
                  <InputGroupInput
                    aria-describedby={nameError ? `${uid}-name-msg` : undefined}
                    aria-invalid={nameError ? true : undefined}
                    autoComplete="name"
                    id={`${uid}-name`}
                    onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ada Lindqvist"
                    value={name}
                  />
                  <InputGroupAddon align="inline-end">
                    <StatusIcon state={touched.name && name.trim() ? "valid" : "idle"} />
                  </InputGroupAddon>
                </InputGroup>
                <Message id={`${uid}-name-msg`}>{nameError}</Message>
              </div>

              <div>
                <label className="font-medium text-sm" htmlFor={`${uid}-email`}>
                  Work email
                </label>
                <InputGroup className="mt-2">
                  <InputGroupInput
                    aria-describedby={emailError || emailTaken ? `${uid}-email-msg` : undefined}
                    aria-invalid={emailError || emailTaken ? true : undefined}
                    autoComplete="email"
                    id={`${uid}-email`}
                    onBlur={runEmailCheck}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setEmailTaken(false);
                      checkSeq.current++;
                      setChecking(false);
                    }}
                    placeholder="ada@company.com"
                    type="email"
                    value={email}
                  />
                  <InputGroupAddon align="inline-end">
                    <StatusIcon state={emailState} />
                  </InputGroupAddon>
                </InputGroup>
                <Message id={`${uid}-email-msg`}>
                  {emailError ??
                    (emailTaken ? (
                      <>
                        There's already an account for this email.{" "}
                        <button
                          className="cursor-pointer rounded font-medium underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          onClick={onSignIn}
                          type="button"
                        >
                          Sign in instead
                        </button>
                      </>
                    ) : undefined)}
                </Message>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="font-medium text-sm" htmlFor={`${uid}-password`}>
                    Password
                  </label>
                  <span
                    aria-live="polite"
                    className={cn(
                      "font-medium text-xs transition-colors duration-200",
                      password ? STRENGTH[strength].text : "text-transparent",
                    )}
                  >
                    {password ? STRENGTH[strength].label : "–"}
                  </span>
                </div>
                <InputGroup className="mt-2">
                  <InputGroupInput
                    aria-describedby={`${uid}-rules`}
                    aria-invalid={passwordError ? true : undefined}
                    autoComplete="new-password"
                    id={`${uid}-password`}
                    onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                  />
                  <InputGroupAddon align="inline-end">
                    <Button
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      aria-pressed={showPassword}
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword((s) => !s)}
                      size="icon-xs"
                      variant="ghost"
                    >
                      {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </Button>
                  </InputGroupAddon>
                </InputGroup>
                <div aria-hidden className="mt-2.5 grid grid-cols-4 gap-1.5">
                  {[1, 2, 3, 4].map((step) => (
                    <span className="h-1 overflow-hidden rounded-full bg-muted" key={step}>
                      <motion.span
                        animate={{ scaleX: strength >= step ? 1 : 0 }}
                        className={cn("block h-full origin-left rounded-full transition-colors duration-200", STRENGTH[strength].bar)}
                        initial={false}
                        transition={reduce ? { duration: 0 } : { duration: 0.24, ease }}
                      />
                    </span>
                  ))}
                </div>
                <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5" id={`${uid}-rules`}>
                  {RULES.map((rule) => {
                    const ok = rule.test(password);
                    const bad = !ok && show("password");
                    return (
                      <li
                        className={cn(
                          "flex items-center gap-1.5 text-xs transition-colors duration-200",
                          ok ? "text-foreground" : bad ? "text-destructive-foreground" : "text-muted-foreground",
                        )}
                        key={rule.id}
                      >
                        <span
                          className={cn(
                            "relative flex size-3.5 items-center justify-center rounded-full border transition-colors duration-200",
                            ok ? "border-success bg-success text-white" : bad ? "border-destructive/50" : "border-input",
                          )}
                        >
                          <motion.span
                            animate={{
                              scale: ok ? 1 : 0.4,
                              opacity: ok ? 1 : 0,
                            }}
                            className="flex"
                            initial={false}
                            transition={
                              reduce
                                ? { duration: 0 }
                                : {
                                    type: "spring",
                                    stiffness: 600,
                                    damping: 28,
                                  }
                            }
                          >
                            <CheckIcon className="size-2.5" strokeWidth={3.5} />
                          </motion.span>
                        </span>
                        <span className="sr-only">{ok ? "Done: " : "Missing: "}</span>
                        {rule.label}
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div>
                <label className="flex cursor-pointer items-start gap-2.5 text-muted-foreground text-sm" htmlFor={`${uid}-agree`}>
                  <Checkbox
                    aria-invalid={agreeError ? true : undefined}
                    checked={agree}
                    className="mt-0.5"
                    id={`${uid}-agree`}
                    onCheckedChange={(v) => setAgree(Boolean(v))}
                  />
                  <span className="text-pretty">
                    I agree to the <span className="font-medium text-foreground">Terms</span> and{" "}
                    <span className="font-medium text-foreground">Privacy Policy</span>.
                  </span>
                </label>
                <Message id={`${uid}-agree-msg`}>{agreeError}</Message>
              </div>
            </div>

            <AnimatePresence initial={false}>
              {submitted && (nameError || emailError || emailTaken || passwordError || agreeError) && (
                <motion.p
                  animate={{ height: "auto", opacity: 1 }}
                  className="overflow-hidden"
                  exit={{ height: 0, opacity: 0 }}
                  initial={{ height: 0, opacity: 0 }}
                  role="alert"
                  transition={{ duration: 0.18, ease }}
                >
                  <span className="mt-5 flex items-center gap-2 text-destructive-foreground text-xs">
                    <CircleAlertIcon className="size-3.5" />
                    Fix the highlighted fields to continue.
                  </span>
                </motion.p>
              )}
            </AnimatePresence>

            <Button className={cn("mt-5 w-full", press)} loading={busy} size="lg" type="submit">
              Create account
              <ArrowRightIcon />
            </Button>
            <p className="mt-4 text-center text-muted-foreground text-sm">
              Already have an account?{" "}
              <button
                className="cursor-pointer rounded font-medium text-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                onClick={onSignIn}
                type="button"
              >
                Sign in
              </button>
            </p>
          </motion.form>
          <AnimatePresence initial={false}>
            {done && (
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className="col-start-1 row-start-1 flex flex-col justify-center"
                exit={{ opacity: 0, transition: { duration: 0.12 } }}
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
                key="done"
                transition={{ duration: 0.26, ease }}
              >
                <motion.span
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex size-12 items-center justify-center rounded-2xl bg-success/12 text-success-foreground"
                  initial={reduce ? false : { scale: 0.8, opacity: 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 420,
                    damping: 22,
                    delay: 0.08,
                  }}
                >
                  <MailCheckIcon className="size-6" />
                </motion.span>
                <h2 className="mt-5 text-balance font-semibold text-2xl tracking-tight">Check your email, {name.trim().split(" ")[0]}</h2>
                <p className="mt-2 max-w-[38ch] text-pretty text-muted-foreground text-sm">
                  We sent a confirmation link to <span className="font-medium text-foreground">{email.trim()}</span>. Open it to finish
                  setting up your workspace.
                </p>
                <Button
                  className={cn("mt-6 self-start", press)}
                  onClick={() => {
                    setDone(false);
                    setSubmitted(false);
                    setTouched({});
                    setPassword("");
                    setAgree(false);
                  }}
                  variant="outline"
                >
                  Use a different email
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <aside className="relative isolate flex flex-col overflow-hidden border-t bg-muted/50 px-5 py-6 sm:px-10 md:border-t-0 md:border-l md:py-10">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[radial-gradient(var(--color-border)_1px,transparent_1px)] [background-size:18px_18px] [mask-image:linear-gradient(to_bottom,black,transparent_75%)]"
        />
        <div
          aria-hidden
          className="absolute -top-24 -right-24 -z-10 size-80 rounded-full bg-violet-500/15 blur-3xl dark:bg-violet-500/10"
        />
        <div className="hidden flex-1 items-center justify-center pt-4 pb-14 md:flex">{showcase ?? <DefaultShowcase />}</div>
        <Quotes quotes={quotes} />
      </aside>
    </section>
  );
}
