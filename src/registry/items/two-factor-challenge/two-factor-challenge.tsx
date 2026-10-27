"use client";

import {
  ArrowLeftIcon,
  CheckIcon,
  ChevronDownIcon,
  ClipboardIcon,
  CopyIcon,
  KeyRoundIcon,
  MessageSquareTextIcon,
  SmartphoneIcon,
} from "lucide-react";
import { AnimatePresence, MotionConfig, motion, useAnimationControls, useReducedMotion } from "motion/react";
import { type FormEvent, type ReactNode, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Menu, MenuItem, MenuPopup, MenuTrigger } from "@/components/ui/menu";
import { OTPField, OTPFieldInput } from "@/components/ui/otp-field";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export type ChallengeMethod = "app" | "sms" | "key" | "recovery";

export interface ChallengeResult {
  method: ChallengeMethod;
  trusted: boolean;
}

export interface TwoFactorChallengeProps {
  product?: string;
  email?: string;
  phoneLast4?: string;
  trustDays?: number;
  recoveryCodes?: string[];
  showDemoHint?: boolean;
  verify?: (method: ChallengeMethod, code: string) => Promise<boolean> | boolean;
  onVerified?: (result: ChallengeResult) => void;
  onContinue?: () => void;
  onBack?: () => void;
  onCreateAccount?: () => void;
  className?: string;
}

type Status = "idle" | "checking" | "error" | "ok";

const WINDOW = 30_000;
const ease = [0.23, 1, 0.32, 1] as const;
const glide = { type: "spring", stiffness: 420, damping: 40 } as const;
const quiet =
  "cursor-pointer whitespace-nowrap rounded-sm font-medium text-muted-foreground text-sm underline-offset-4 outline-none transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:underline";

function codeFor(seed: string, slot: number) {
  let h = 2166136261;
  for (const ch of `${seed}:${slot}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  h ^= h >>> 15;
  h = Math.imul(h, 2246822507);
  h ^= h >>> 13;
  return String((h >>> 0) % 1_000_000).padStart(6, "0");
}

function formatRecovery(raw: string) {
  const clean = raw.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8);
  return clean.length > 4 ? `${clean.slice(0, 4)}-${clean.slice(4)}` : clean;
}

function useNow() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    let id: ReturnType<typeof setTimeout>;
    const tick = () => {
      const t = Date.now();
      setNow(t);
      id = setTimeout(tick, 1000 - (t % 1000) + 8);
    };
    tick();
    return () => clearTimeout(id);
  }, []);
  return now;
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

function AutoHeight({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | "auto">("auto");
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setHeight(el.offsetHeight));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <motion.div animate={{ height }} className="-mx-1 overflow-hidden px-1" initial={false} transition={glide}>
      <div className="relative py-1" ref={ref}>
        {children}
      </div>
    </motion.div>
  );
}

function RollingDigits({ value }: { value: string }) {
  return (
    <span className="inline-flex h-4 align-text-bottom font-mono leading-4 tabular-nums">
      {value.split("").map((digit, i) => (
        <span className={cn("relative inline-flex h-4 w-[1ch] overflow-hidden", i === 3 && "ms-[0.5ch]")} key={i}>
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span
              animate={{ y: 0, opacity: 1 }}
              className="absolute inset-0 text-center"
              exit={{ y: "-100%", opacity: 0 }}
              initial={{ y: "100%", opacity: 0 }}
              key={digit}
              transition={{ type: "spring", stiffness: 500, damping: 36, delay: i * 0.03 }}
            >
              {digit}
            </motion.span>
          </AnimatePresence>
        </span>
      ))}
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
          transition={{ duration: 0.42, ease, delay: 0.12 }}
        />
      </svg>
    </span>
  );
}

export function TwoFactorChallenge({
  product = "Ridgeline",
  email = "ada@ridgeline.app",
  phoneLast4 = "4471",
  trustDays = 30,
  recoveryCodes = ["7kq2-m9xd", "p4tz-8wnc", "h3vr-62ja", "w2cf-k7yo"],
  showDemoHint = true,
  verify,
  onVerified,
  onContinue,
  onBack,
  onCreateAccount,
  className,
}: TwoFactorChallengeProps) {
  const uid = useId();
  const reduce = useReducedMotion();
  const now = useNow();
  const shake = useAnimationControls();
  const otpRef = useRef<HTMLDivElement>(null);
  const recoveryRef = useRef<HTMLInputElement>(null);
  const copiedRef = useRef<string | null>(null);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const switched = useRef(false);

  const [method, setMethod] = useState<ChallengeMethod>("app");
  const [code, setCode] = useState("");
  const [recovery, setRecovery] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [trusted, setTrusted] = useState(true);
  const [smsSentAt, setSmsSentAt] = useState<number | null>(null);
  const [keyWaiting, setKeyWaiting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [done, setDone] = useState<{ method: ChallengeMethod; until: string } | null>(null);

  const seed = `${product}:${email}`;
  const slot = now === null ? null : Math.floor(now / WINDOW);
  const remaining = now === null ? 30 : 30 - Math.floor((now % WINDOW) / 1000);
  const appCode = slot === null ? null : codeFor(seed, slot);
  const smsCode = smsSentAt === null ? null : codeFor(`${seed}:sms`, smsSentAt);
  const resendIn = smsSentAt !== null && now !== null ? Math.min(30, Math.max(0, 30 - Math.floor((now - smsSentAt) / 1000))) : 0;
  const hintCode = method === "sms" ? smsCode : method === "recovery" ? recoveryCodes[0] : method === "app" ? appCode : null;
  const busy = status === "checking" || status === "ok";

  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const t of pending) clearTimeout(t);
    };
  }, []);

  useEffect(() => {
    if (!switched.current) return;
    if (method === "recovery") recoveryRef.current?.focus();
    if (method === "app" || method === "sms") otpRef.current?.querySelector<HTMLInputElement>("input")?.focus();
  }, [method]);

  const later = (fn: () => void, ms: number) => {
    const t = setTimeout(() => {
      timers.current.delete(t);
      fn();
    }, ms);
    timers.current.add(t);
  };
  const wait = (ms: number) => new Promise<void>((resolve) => later(resolve, ms));

  const check = async (m: ChallengeMethod, value: string) => {
    if (verify) return verify(m, value);
    if (m === "app") return slot !== null && (value === codeFor(seed, slot) || value === codeFor(seed, slot - 1));
    if (m === "sms") return value === smsCode;
    if (m === "recovery") return recoveryCodes.includes(value);
    return true;
  };

  const finish = (m: ChallengeMethod) => {
    const until = new Date(Date.now() + trustDays * 86_400_000).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    setDone({ method: m, until });
    onVerified?.({ method: m, trusted });
  };

  const submit = async (m: ChallengeMethod, value: string) => {
    if (busy) return;
    setStatus("checking");
    setError(null);
    const [ok] = await Promise.all([Promise.resolve(check(m, value)), wait(600)]);
    if (ok) {
      setStatus("ok");
      later(() => finish(m), 450);
      return;
    }
    setStatus("error");
    setError(
      m === "recovery"
        ? "That recovery code isn’t valid. Check for typos."
        : m === "sms"
          ? "That isn’t the code we texted you."
          : "That code didn’t work. Try the newest one.",
    );
    if (!reduce) shake.start({ x: [0, -6, 6, -4, 4, 0], transition: { duration: 0.36, ease: "easeOut" } });
    later(() => {
      if (m === "recovery") recoveryRef.current?.select();
      else {
        setCode("");
        otpRef.current?.querySelector<HTMLInputElement>("input")?.focus();
      }
    }, 420);
  };

  const switchTo = (m: ChallengeMethod) => {
    switched.current = true;
    setMethod(m);
    setCode("");
    setRecovery("");
    setError(null);
    setStatus("idle");
    setKeyWaiting(false);
    if (m === "sms" && smsSentAt === null) setSmsSentAt(Date.now());
  };

  const paste = async () => {
    let text = "";
    try {
      text = await navigator.clipboard.readText();
    } catch {}
    const digits = (text.match(/\d/g) ?? []).join("").slice(0, 6) || copiedRef.current || "";
    if (digits.length !== 6) {
      setStatus("error");
      setError("There’s no 6-digit code on your clipboard.");
      return;
    }
    setCode(digits);
    submit(method, digits);
  };

  const copyHint = async () => {
    if (!hintCode) return;
    copiedRef.current = hintCode.replace("-", "").length === 6 ? hintCode : null;
    try {
      await navigator.clipboard.writeText(hintCode);
    } catch {}
    setCopied(true);
    later(() => setCopied(false), 1400);
  };

  const useHint = () => {
    if (!hintCode || busy) return;
    if (method === "recovery") {
      setRecovery(hintCode);
      submit("recovery", hintCode);
    } else {
      setCode(hintCode);
      submit(method, hintCode);
    }
  };

  const startKey = () => {
    setKeyWaiting(true);
    later(() => {
      setStatus("ok");
      later(() => finish("key"), 300);
    }, 2200);
  };

  const restart = () => {
    switched.current = false;
    setDone(null);
    setMethod("app");
    setCode("");
    setRecovery("");
    setStatus("idle");
    setError(null);
    setKeyWaiting(false);
    setSmsSentAt(null);
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (method === "key") {
      if (!keyWaiting) startKey();
      return;
    }
    if (method === "recovery") {
      if (recovery.length === 9) submit("recovery", recovery);
      else {
        setStatus("error");
        setError("Recovery codes look like xxxx-xxxx.");
      }
      return;
    }
    if (code.length === 6) submit(method, code);
    else {
      setStatus("error");
      setError("Enter all 6 digits.");
    }
  };

  const subtext: Record<ChallengeMethod, ReactNode> = {
    app: "Enter the 6-digit code from your authenticator app.",
    sms: (
      <>
        Enter the 6-digit code we sent to <span className="font-medium text-foreground tabular-nums">•••• {phoneLast4}</span>.
      </>
    ),
    key: "Insert your security key and touch it when it blinks.",
    recovery: "Enter one of the recovery codes you saved when you set up two-factor.",
  };

  const invalid = status === "error";
  const msgId = `${uid}-msg`;

  const otp = (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <label className="font-medium text-sm" htmlFor={`${uid}-otp`}>
          {method === "sms" ? "Text message code" : "Authentication code"}
        </label>
        <button
          className="flex h-7 cursor-pointer items-center gap-1.5 rounded-md bg-muted px-2 font-medium text-muted-foreground text-xs outline-none transition-[color,background-color,scale] duration-150 ease-out hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97] disabled:pointer-events-none disabled:opacity-64"
          disabled={busy}
          onClick={paste}
          type="button"
        >
          <ClipboardIcon className="size-3.5" />
          Paste code
        </button>
      </div>
      <motion.div animate={shake}>
        <OTPField
          aria-describedby={msgId}
          className="gap-2"
          disabled={busy}
          id={`${uid}-otp`}
          length={6}
          onValueChange={(value) => {
            setCode(value);
            if (invalid) {
              setStatus("idle");
              setError(null);
            }
          }}
          onValueComplete={(value) => submit(method, value)}
          ref={otpRef}
          value={code}
        >
          {Array.from({ length: 6 }, (_, i) => (
            <span className="contents" key={i}>
              {i === 3 && <span aria-hidden className="w-0" />}
              <OTPFieldInput
                aria-invalid={invalid || undefined}
                aria-label={`Digit ${i + 1} of 6`}
                className={cn(
                  "h-12! w-11! font-mono text-lg! leading-12! transition-[border-color,background-color,box-shadow] duration-200",
                  status === "ok" && "border-success/60 bg-success/6",
                )}
              />
            </span>
          ))}
        </OTPField>
      </motion.div>
    </div>
  );

  const recoveryField = (
    <div>
      <label className="mb-3 block font-medium text-sm" htmlFor={`${uid}-recovery`}>
        Recovery code
      </label>
      <motion.div animate={shake}>
        <Input
          aria-describedby={msgId}
          aria-invalid={invalid || undefined}
          autoCapitalize="off"
          autoComplete="off"
          className={cn("font-mono", status === "ok" && "border-success/60")}
          disabled={busy}
          id={`${uid}-recovery`}
          maxLength={9}
          onChange={(event) => {
            setRecovery(formatRecovery(event.target.value));
            if (invalid) {
              setStatus("idle");
              setError(null);
            }
          }}
          placeholder="xxxx-xxxx"
          ref={recoveryRef}
          spellCheck={false}
          value={recovery}
        />
      </motion.div>
    </div>
  );

  const keyField = (
    <div className="flex items-center gap-3 rounded-lg border bg-card px-3 py-3 shadow-xs/5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
        {status === "ok" ? (
          <CheckIcon className="size-4 text-success-foreground" />
        ) : keyWaiting ? (
          <Spinner className="size-4 text-muted-foreground" />
        ) : (
          <KeyRoundIcon className="size-4 text-muted-foreground" />
        )}
      </span>
      <div aria-live="polite" className="min-w-0">
        <p className="font-medium text-sm">{status === "ok" ? "Key confirmed" : keyWaiting ? "Waiting for your key…" : "Security key"}</p>
        <p className="text-muted-foreground text-xs">{keyWaiting ? "Touch the key now" : "USB-C or NFC"}</p>
      </div>
    </div>
  );

  const field = method === "recovery" ? recoveryField : method === "key" ? keyField : otp;

  const challenge = (
    <motion.form
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      initial={{ opacity: 0, y: 8 }}
      key="challenge"
      noValidate
      onSubmit={onSubmit}
      transition={{ duration: 0.22, ease }}
    >
      <button className={cn(quiet, "-ms-0.5 mb-6 flex items-center gap-1.5")} onClick={onBack} type="button">
        <ArrowLeftIcon className="size-4" />
        Back to sign in
      </button>
      <h1 className="text-balance font-semibold text-2xl tracking-tight">Two-factor authentication</h1>
      <AnimatePresence initial={false} mode="popLayout">
        <motion.p
          animate={{ opacity: 1 }}
          className="mt-1.5 min-h-10 text-pretty text-muted-foreground text-sm"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          key={method}
          transition={{ duration: 0.16 }}
        >
          {subtext[method]}
        </motion.p>
      </AnimatePresence>

      <div className="mt-5">
        <AutoHeight>
          <AnimatePresence initial={false} mode="popLayout">
            <motion.div
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              initial={{ opacity: 0, x: 12 }}
              key={method === "sms" ? "app" : method}
              transition={glide}
            >
              {field}
            </motion.div>
          </AnimatePresence>
        </AutoHeight>
        <p
          aria-live="polite"
          className={cn("mt-1.5 min-h-4 text-xs", invalid ? "text-destructive-foreground" : "text-muted-foreground")}
          id={msgId}
        >
          {error ??
            (method === "sms" ? (
              resendIn > 0 ? (
                <span className="tabular-nums">Didn’t get it? Resend in 0:{String(resendIn).padStart(2, "0")}</span>
              ) : (
                <button className="cursor-pointer font-medium text-foreground underline-offset-4 hover:underline" onClick={() => setSmsSentAt(Date.now())} type="button">
                  Resend code
                </button>
              )
            ) : (
              ""
            ))}
        </p>
      </div>

      <label className="mt-2.5 flex w-fit cursor-pointer items-center gap-2 text-sm">
        <Checkbox checked={trusted} onCheckedChange={(value) => setTrusted(value === true)} />
        Trust this device for {trustDays} days
      </label>

      <Button className="mt-6 w-full" disabled={keyWaiting} loading={status === "checking" || (method === "key" && keyWaiting)} type="submit">
        {method === "key" ? "Use security key" : "Verify"}
      </Button>

      <div className="mt-4 flex items-center justify-center gap-3">
        <button className={quiet} disabled={busy} onClick={() => switchTo(method === "recovery" ? "app" : "recovery")} type="button">
          {method === "recovery" ? "Use app instead" : "Use a recovery code"}
        </button>
        <span aria-hidden className="h-3.5 w-px bg-border" />
        <Menu>
          <MenuTrigger className={cn(quiet, "flex items-center gap-1 data-popup-open:text-foreground")} disabled={busy}>
            Try another method
            <ChevronDownIcon className="size-3.5" />
          </MenuTrigger>
          <MenuPopup align="end" className="min-w-56">
            {method !== "app" && (
              <MenuItem onClick={() => switchTo("app")}>
                <SmartphoneIcon />
                Authenticator app
              </MenuItem>
            )}
            {method !== "sms" && (
              <MenuItem onClick={() => switchTo("sms")}>
                <MessageSquareTextIcon />
                Text a code to •••• {phoneLast4}
              </MenuItem>
            )}
            {method !== "key" && (
              <MenuItem onClick={() => switchTo("key")}>
                <KeyRoundIcon />
                Use a security key
              </MenuItem>
            )}
          </MenuPopup>
        </Menu>
      </div>

      {showDemoHint && hintCode && (
        <div className="mt-8 flex items-center gap-3 rounded-lg border border-dashed px-3 py-2.5 text-muted-foreground text-xs">
          <span className="min-w-0 flex-1">
            {method === "recovery" ? "Demo recovery code " : method === "sms" ? "Demo text code " : "Demo code "}
            <span className="font-medium text-foreground">
              {method === "recovery" ? <span className="font-mono">{hintCode}</span> : <RollingDigits value={hintCode} />}
            </span>
            {method === "app" && <span className="tabular-nums"> · {remaining}s</span>}
          </span>
          <button
            aria-label={copied ? "Copied" : "Copy demo code"}
            className="flex size-7 cursor-pointer items-center justify-center rounded-md outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            onClick={copyHint}
            type="button"
          >
            {copied ? <CheckIcon className="size-3.5 text-success-foreground" /> : <CopyIcon className="size-3.5" />}
          </button>
          <button className="cursor-pointer font-medium text-foreground underline-offset-4 outline-none hover:underline focus-visible:underline" onClick={useHint} type="button">
            Use
          </button>
        </div>
      )}
    </motion.form>
  );

  const signedIn = done && (
    <motion.div animate={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: 8 }} key="done" transition={{ duration: 0.26, ease }}>
      <DrawnCheck />
      <h1 className="mt-6 text-balance font-semibold text-2xl tracking-tight">You’re signed in</h1>
      <p className="mt-1.5 text-pretty text-muted-foreground text-sm">
        {trusted ? (
          <>
            We won’t ask for a code on this device until <span className="font-medium text-foreground">{done.until}</span>.
          </>
        ) : (
          "We’ll ask for a code again next time you sign in."
        )}
      </p>
      <Button className="mt-6 w-full" onClick={onContinue}>
        Continue to {product}
      </Button>
      <div className="mt-4 text-center">
        <button className={quiet} onClick={restart} type="button">
          Run the demo again
        </button>
      </div>
    </motion.div>
  );

  return (
    <MotionConfig reducedMotion="user">
      <div className={cn("@container relative isolate flex h-[760px] w-full flex-col overflow-hidden bg-background text-foreground", className)}>
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-96 bg-radial-[ellipse_at_top] from-foreground/4 to-transparent to-70%" />
        <header className="flex h-14 shrink-0 items-center justify-between px-6">
          <RidgelineMark product={product} />
          <p className="text-muted-foreground text-sm">
            <span className="hidden @md:inline">New to {product}? </span>
            <button className="cursor-pointer font-medium text-foreground underline-offset-4 outline-none hover:underline focus-visible:underline" onClick={onCreateAccount} type="button">
              Create account
            </button>
          </p>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          <div className="mx-auto w-full max-w-[360px] px-6 pt-10 pb-10 @md:pt-18">
            <AnimatePresence initial={false} mode="wait">
              {done ? signedIn : challenge}
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
