"use client";

import {
  ArrowLeftIcon,
  CheckIcon,
  CircleAlertIcon,
  EyeIcon,
  EyeOffIcon,
  type LucideIcon,
  MailIcon,
  MailOpenIcon,
} from "lucide-react";
import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from "motion/react";
import { type FormEvent, type ReactNode, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export type SignInMethod = "password" | "link";

export interface SignInProvider {
  id: string;
  label: string;
  icon: LucideIcon;
}

export type SignInResult = { ok: true; name?: string } | { ok: false; error: string };

export interface SignInCardProps {
  product?: string;
  logo?: ReactNode;
  providers?: SignInProvider[];
  defaultEmail?: string;
  defaultMethod?: SignInMethod;
  resendAfter?: number;
  onPasswordSignIn?: (email: string, password: string) => Promise<SignInResult>;
  onSendLink?: (email: string) => Promise<void>;
  onProvider?: (provider: SignInProvider) => void;
  onForgotPassword?: (email: string) => void;
  onCreateAccount?: () => void;
  className?: string;
}

const ease = [0.23, 1, 0.32, 1] as const;
const press = "transition-[box-shadow,scale,background-color] duration-150 active:scale-[0.97]";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function useMeasuredHeight<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [height, setHeight] = useState<number | "auto">("auto");
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setHeight(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, height] as const;
}

function MethodSwitch({ value, onChange }: { value: SignInMethod; onChange: (m: SignInMethod) => void }) {
  const reduce = useReducedMotion();
  const layoutId = useId();
  const options: { value: SignInMethod; label: string }[] = [
    { value: "password", label: "Password" },
    { value: "link", label: "Email link" },
  ];
  return (
    <div aria-label="Sign-in method" className="grid grid-cols-2 rounded-lg bg-muted p-0.5" role="radiogroup">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            aria-checked={active}
            className={cn(
              "relative h-8 cursor-pointer rounded-[calc(var(--radius-lg)-2px)] font-medium text-sm outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring",
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
            key={o.value}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                e.preventDefault();
                const next = o.value === "password" ? "link" : "password";
                onChange(next);
                (e.currentTarget.parentElement?.querySelector(`[data-value=${next}]`) as HTMLElement | null)?.focus();
              }
            }}
            data-value={o.value}
            role="radio"
            tabIndex={active ? 0 : -1}
            type="button"
          >
            {active && (
              <motion.span
                className="absolute inset-0 rounded-[inherit] bg-background shadow-xs/5 dark:bg-accent"
                layoutId={layoutId}
                transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 40 }}
              />
            )}
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function FieldMessage({ id, children }: { id: string; children?: string }) {
  return (
    <AnimatePresence initial={false}>
      {children && (
        <motion.p
          animate={{ height: "auto", opacity: 1 }}
          className="overflow-hidden text-destructive-foreground text-xs"
          exit={{ height: 0, opacity: 0 }}
          id={id}
          initial={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.18, ease }}
        >
          <span className="block pt-1.5">{children}</span>
        </motion.p>
      )}
    </AnimatePresence>
  );
}

function formatClock(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function SignInCard({
  product = "Larkspur",
  logo,
  providers = [],
  defaultEmail = "",
  defaultMethod = "password",
  resendAfter = 30,
  onPasswordSignIn = async () => ({ ok: true }),
  onSendLink = async () => {},
  onProvider,
  onForgotPassword,
  onCreateAccount,
  className,
}: SignInCardProps) {
  const reduce = useReducedMotion();
  const uid = useId();
  const [contentRef, height] = useMeasuredHeight<HTMLDivElement>();
  const shake = useAnimationControls();
  const passwordRef = useRef<HTMLInputElement>(null);

  const [view, setView] = useState<"form" | "sent" | "done">("form");
  const [method, setMethod] = useState<SignInMethod>(defaultMethod);
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [emailError, setEmailError] = useState<string>();
  const [passwordError, setPasswordError] = useState<string>();
  const [formError, setFormError] = useState<string>();
  const [welcome, setWelcome] = useState<string>();
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const fail = (message: string) => {
    setFormError(message);
    if (!reduce) shake.start({ x: [0, -6, 6, -3, 3, 0], transition: { duration: 0.32, ease: "easeOut" } });
  };

  const sendLink = async () => {
    setBusy(true);
    await onSendLink(email.trim());
    setBusy(false);
    setCooldown(resendAfter);
    setView("sent");
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(undefined);
    const trimmed = email.trim();
    const badEmail = !trimmed ? "Enter your email address." : !EMAIL.test(trimmed) ? "That doesn't look like an email address." : undefined;
    const badPassword = method === "password" && !password ? "Enter your password." : undefined;
    setEmailError(badEmail);
    setPasswordError(badPassword);
    if (badEmail || badPassword) {
      if (!reduce) shake.start({ x: [0, -4, 4, 0], transition: { duration: 0.24, ease: "easeOut" } });
      return;
    }
    if (method === "link") return sendLink();
    setBusy(true);
    const result = await onPasswordSignIn(trimmed, password);
    setBusy(false);
    if (result.ok) {
      setWelcome(result.name);
      setView("done");
    } else {
      fail(result.error);
      setPassword("");
      passwordRef.current?.focus();
    }
  };

  // `animate` stays identical with reduced motion so server and client render the same styles.
  const viewMotion = {
    initial: reduce ? { opacity: 0, y: 0, filter: "blur(0px)" } : { opacity: 0, y: 8, filter: "blur(4px)" },
    animate: { opacity: 1, y: 0, filter: "blur(0px)" },
    exit: reduce ? { opacity: 0, y: 0, filter: "blur(0px)" } : { opacity: 0, y: -8, filter: "blur(4px)" },
  };

  return (
    <div className={cn("mx-auto w-full max-w-[400px]", className)}>
      <div className="overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-xs/5">
        <motion.div
          animate={{ height }}
          className="relative"
          initial={false}
          transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 40 }}
        >
          <div ref={contentRef}>
            <AnimatePresence initial={false} mode="popLayout">
              {view === "form" && (
                <motion.div key="form" {...viewMotion} transition={{ duration: 0.22, ease }}>
                  <div className="px-6 pt-7 pb-6 sm:px-8">
                    <header className="flex flex-col items-center text-center">
                      {logo ?? (
                        <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs/5">
                          <svg aria-hidden className="size-6" fill="currentColor" viewBox="0 0 24 24">
                            <circle cx="12" cy="8.5" r="4.75" />
                            <circle cx="7.75" cy="15" opacity=".7" r="4.75" />
                            <circle cx="16.25" cy="15" opacity=".45" r="4.75" />
                          </svg>
                        </span>
                      )}
                      <h2 className="mt-4 text-balance font-semibold text-lg tracking-tight">Sign in to {product}</h2>
                      <p className="mt-1 text-pretty text-muted-foreground text-sm">Welcome back. Pick up where you left off.</p>
                    </header>

                    {providers.length > 0 && (
                      <>
                        <div className={cn("mt-6 grid gap-2", providers.length > 1 && "grid-cols-2")}>
                          {providers.map((p) => (
                            <Button className={press} key={p.id} onClick={() => onProvider?.(p)} variant="outline">
                              <p.icon />
                              {p.label}
                            </Button>
                          ))}
                        </div>
                        <div className="my-5 flex items-center gap-3 text-muted-foreground text-xs">
                          <span className="h-px flex-1 bg-border" />
                          or with email
                          <span className="h-px flex-1 bg-border" />
                        </div>
                      </>
                    )}

                    <motion.form animate={shake} className={cn(!providers.length && "mt-6")} noValidate onSubmit={submit}>
                      <MethodSwitch
                        onChange={(m) => {
                          setMethod(m);
                          setFormError(undefined);
                          setPasswordError(undefined);
                        }}
                        value={method}
                      />

                      <AnimatePresence initial={false}>
                        {formError && (
                          <motion.div
                            animate={{ height: "auto", opacity: 1 }}
                            className="overflow-hidden"
                            exit={{ height: 0, opacity: 0 }}
                            initial={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease }}
                          >
                            <div
                              className="mt-4 flex gap-2.5 rounded-xl border border-destructive/20 bg-destructive/6 p-3 text-sm dark:bg-destructive/12"
                              role="alert"
                            >
                              <CircleAlertIcon className="mt-0.5 size-4 shrink-0 text-destructive-foreground" />
                              <div className="min-w-0">
                                <p className="text-pretty text-foreground">{formError}</p>
                                <button
                                  className="mt-1 cursor-pointer rounded font-medium text-destructive-foreground text-xs underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                                  onClick={() => {
                                    setMethod("link");
                                    setFormError(undefined);
                                  }}
                                  type="button"
                                >
                                  Email me a sign-in link instead
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="mt-4">
                        <label className="font-medium text-sm" htmlFor={`${uid}-email`}>
                          Email
                        </label>
                        <Input
                          aria-describedby={emailError ? `${uid}-email-error` : undefined}
                          aria-invalid={emailError ? true : undefined}
                          autoComplete="email"
                          className="mt-2"
                          id={`${uid}-email`}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            if (emailError) setEmailError(undefined);
                          }}
                          placeholder="you@company.com"
                          type="email"
                          value={email}
                        />
                        <FieldMessage id={`${uid}-email-error`}>{emailError}</FieldMessage>
                      </div>

                      <AnimatePresence initial={false}>
                        {method === "password" && (
                          <motion.div
                            animate={{ height: "auto", opacity: 1 }}
                            className="-mx-1 -mb-1 overflow-hidden px-1"
                            exit={{ height: 0, opacity: 0 }}
                            initial={{ height: 0, opacity: 0 }}
                            transition={reduce ? { duration: 0 } : { duration: 0.22, ease }}
                          >
                            <div className="pt-4 pb-1">
                              <div className="flex items-center justify-between">
                                <label className="font-medium text-sm" htmlFor={`${uid}-password`}>
                                  Password
                                </label>
                                <button
                                  className="relative -my-1 cursor-pointer rounded px-1 py-1 text-muted-foreground text-xs after:absolute after:-inset-x-1 after:-inset-y-1.5 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                                  onClick={() => onForgotPassword?.(email)}
                                  type="button"
                                >
                                  Forgot password?
                                </button>
                              </div>
                              <InputGroup className="mt-2">
                                <InputGroupInput
                                  aria-describedby={passwordError ? `${uid}-password-error` : undefined}
                                  aria-invalid={passwordError || formError ? true : undefined}
                                  autoComplete="current-password"
                                  id={`${uid}-password`}
                                  onChange={(e) => {
                                    setPassword(e.target.value);
                                    if (passwordError) setPasswordError(undefined);
                                  }}
                                  placeholder="Your password"
                                  ref={passwordRef}
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
                                    <AnimatePresence initial={false} mode="popLayout">
                                      <motion.span
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="flex"
                                        exit={{ opacity: 0, scale: 0.6 }}
                                        initial={{ opacity: 0, scale: 0.6 }}
                                        key={showPassword ? "hide" : "show"}
                                        transition={{ duration: 0.14, ease }}
                                      >
                                        {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                                      </motion.span>
                                    </AnimatePresence>
                                  </Button>
                                </InputGroupAddon>
                              </InputGroup>
                              <FieldMessage id={`${uid}-password-error`}>{passwordError}</FieldMessage>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <AnimatePresence initial={false}>
                        {method === "link" && (
                          <motion.p
                            animate={{ height: "auto", opacity: 1 }}
                            className="overflow-hidden text-muted-foreground text-xs"
                            exit={{ height: 0, opacity: 0 }}
                            initial={{ height: 0, opacity: 0 }}
                            transition={reduce ? { duration: 0 } : { duration: 0.22, ease }}
                          >
                            <span className="block pt-2">We’ll email you a link that signs you in. No password needed.</span>
                          </motion.p>
                        )}
                      </AnimatePresence>

                      <Button className={cn("mt-5 w-full", press)} loading={busy} size="lg" type="submit">
                        {method === "password" ? "Sign in" : "Email me a link"}
                      </Button>
                    </motion.form>
                  </div>
                  <footer className="border-t bg-muted/40 px-6 py-3.5 text-center text-muted-foreground text-sm sm:px-8">
                    New to {product}?{" "}
                    <button
                      className="cursor-pointer rounded font-medium text-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={onCreateAccount}
                      type="button"
                    >
                      Create an account
                    </button>
                  </footer>
                </motion.div>
              )}

              {view === "sent" && (
                <motion.div className="px-6 py-8 text-center sm:px-8" key="sent" {...viewMotion} transition={{ duration: 0.24, ease }}>
                  <Envelope />
                  <h2 className="mt-5 text-balance font-semibold text-lg tracking-tight">Check your inbox</h2>
                  <p className="mx-auto mt-1.5 max-w-[30ch] text-pretty text-muted-foreground text-sm">
                    We sent a sign-in link to <span className="font-medium text-foreground">{email.trim()}</span>. It expires in 15 minutes.
                  </p>
                  <div className="mt-6 grid gap-2">
                    <Button
                      className={press}
                      disabled={cooldown > 0 || busy}
                      onClick={sendLink}
                      variant="outline"
                    >
                      {busy ? (
                        <Spinner />
                      ) : cooldown > 0 ? (
                        <span className="tabular-nums">Resend in {formatClock(cooldown)}</span>
                      ) : (
                        <>
                          <MailIcon />
                          Resend link
                        </>
                      )}
                    </Button>
                    <Button
                      className={cn("text-muted-foreground", press)}
                      onClick={() => {
                        setView("form");
                        setMethod("link");
                      }}
                      variant="ghost"
                    >
                      <ArrowLeftIcon />
                      Use a different email
                    </Button>
                  </div>
                  <p className="mt-5 text-pretty text-muted-foreground text-xs">Can’t find it? Check spam, or search for “{product}”.</p>
                </motion.div>
              )}

              {view === "done" && (
                <motion.div className="px-6 py-10 text-center sm:px-8" key="done" {...viewMotion} transition={{ duration: 0.24, ease }}>
                  <motion.span
                    animate={{ scale: 1, opacity: 1 }}
                    className="mx-auto flex size-12 items-center justify-center rounded-full bg-success/12 text-success-foreground"
                    initial={reduce ? false : { scale: 0.8, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 420, damping: 22, delay: 0.05 }}
                  >
                    <CheckIcon className="size-6" />
                  </motion.span>
                  <h2 className="mt-4 font-semibold text-lg tracking-tight">{welcome ? `Welcome back, ${welcome}` : "You're signed in"}</h2>
                  <p className="mt-1 flex items-center justify-center gap-2 text-muted-foreground text-sm">
                    <Spinner className="size-3.5" />
                    Taking you to your workspace…
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function Envelope() {
  const reduce = useReducedMotion();
  return (
    <div className="relative mx-auto size-16">
      <motion.span
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        className="absolute inset-0 flex items-center justify-center rounded-2xl border bg-muted text-foreground"
        initial={reduce ? false : { scale: 0.85, opacity: 0, rotate: -6 }}
        transition={{ type: "spring", stiffness: 380, damping: 22 }}
      >
        <MailOpenIcon className="size-7" strokeWidth={1.5} />
      </motion.span>
      <motion.span
        animate={{ scale: 1, opacity: 1 }}
        className="absolute -top-1.5 -right-1.5 flex size-6 items-center justify-center rounded-full border-2 border-card bg-success text-white"
        initial={reduce ? false : { scale: 0.5, opacity: 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 24, delay: 0.18 }}
      >
        <CheckIcon className="size-3.5" strokeWidth={3} />
      </motion.span>
    </div>
  );
}
