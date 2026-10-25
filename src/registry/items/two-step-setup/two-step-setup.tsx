"use client";

import { ArrowLeftIcon, CheckIcon, CopyIcon, DownloadIcon, ShieldCheckIcon, SmartphoneIcon, KeyRoundIcon } from "lucide-react";
import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from "motion/react";
import { type ReactNode, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { OTPField, OTPFieldInput, OTPFieldSeparator } from "@/components/ui/otp-field";
import { cn } from "@/lib/utils";

export interface TwoStepSetupProps {
  account?: string;
  issuer?: string;
  secret?: string;
  backupCodes?: string[];
  verify?: (code: string) => Promise<boolean>;
  onCancel?: () => void;
  onDone?: () => void;
  className?: string;
}

type Step = 0 | 1 | 2 | 3;

const ease = [0.23, 1, 0.32, 1] as const;
const press = "transition-[box-shadow,scale,background-color] duration-150 active:scale-[0.97]";
const STEPS = ["Scan", "Verify", "Save codes"];

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

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(null), 1600);
    return () => clearTimeout(t);
  }, [copied]);
  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
    setCopied(key);
  };
  return { copied, copy };
}

function SwapIcon({ on, children, done }: { on: boolean; children: ReactNode; done: ReactNode }) {
  return (
    <AnimatePresence initial={false} mode="popLayout">
      <motion.span
        animate={{ opacity: 1, scale: 1 }}
        className="flex"
        exit={{ opacity: 0, scale: 0.6 }}
        initial={{ opacity: 0, scale: 0.6 }}
        key={on ? "on" : "off"}
        transition={{ duration: 0.14, ease }}
      >
        {on ? done : children}
      </motion.span>
    </AnimatePresence>
  );
}

function QrMock({ seed, size = 25 }: { seed: string; size?: number }) {
  const cells = useMemo(() => {
    let h = 2166136261;
    for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    const rand = () => {
      h ^= h << 13;
      h ^= h >>> 17;
      h ^= h << 5;
      return ((h >>> 0) % 1000) / 1000;
    };
    const out: [number, number][] = [];
    const inFinder = (x: number, y: number) =>
      (x < 8 && y < 8) || (x >= size - 8 && y < 8) || (x < 8 && y >= size - 8);
    const mid = Math.floor(size / 2);
    const inLogo = (x: number, y: number) => Math.abs(x - mid) <= 3 && Math.abs(y - mid) <= 3;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (inFinder(x, y) || inLogo(x, y)) continue;
        if (y === 6 || x === 6) {
          if ((x + y) % 2 === 0) out.push([x, y]);
          continue;
        }
        if (rand() > 0.52) out.push([x, y]);
      }
    }
    return out;
  }, [seed, size]);
  const finder = (x: number, y: number) => (
    <g key={`${x}-${y}`}>
      <rect height="6" rx="1.6" width="6" x={x + 0.5} y={y + 0.5} fill="none" stroke="currentColor" strokeWidth="1" />
      <rect height="3" rx="0.8" width="3" x={x + 2} y={y + 2} fill="currentColor" />
    </g>
  );
  const mid = Math.floor(size / 2);
  return (
    <svg aria-hidden className="size-full" shapeRendering="geometricPrecision" viewBox={`-1 -1 ${size + 2} ${size + 2}`}>
      {cells.map(([x, y]) => (
        <rect fill="currentColor" height="0.86" key={`${x}.${y}`} rx="0.28" width="0.86" x={x + 0.07} y={y + 0.07} />
      ))}
      {finder(0, 0)}
      {finder(size - 7, 0)}
      {finder(0, size - 7)}
      <rect className="fill-primary" height="5" rx="1.4" width="5" x={mid - 2.5} y={mid - 2.5} />
      <path
        className="stroke-primary-foreground"
        d={`M${mid - 1.1} ${mid + 0.1}l0.8 0.8 1.6-1.8`}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="0.6"
      />
    </svg>
  );
}

function Rail({ step }: { step: Step }) {
  const reduce = useReducedMotion();
  return (
    <ol className="grid grid-cols-3 gap-2">
      {STEPS.map((label, i) => {
        const state = step > i ? "done" : step === i ? "active" : "todo";
        return (
          <li aria-current={state === "active" ? "step" : undefined} className="min-w-0" key={label}>
            <span className="block h-1 overflow-hidden rounded-full bg-muted">
              <motion.span
                animate={{ scaleX: state === "todo" ? 0 : 1 }}
                className="block h-full origin-left rounded-full bg-primary"
                initial={false}
                transition={reduce ? { duration: 0 } : { duration: 0.35, ease }}
              />
            </span>
            <span
              className={cn(
                "mt-2 flex items-center gap-1 truncate text-xs transition-colors duration-200",
                state === "todo" ? "text-muted-foreground" : "font-medium text-foreground",
              )}
            >
              {state === "done" && <CheckIcon className="size-3 shrink-0" strokeWidth={3} />}
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function TwoStepSetup({
  account = "jo@quillstack.io",
  issuer = "Quillstack",
  secret = "JBSWY3DPEHPK3PXP",
  backupCodes = ["k7q2-9xmd", "p4tn-v8wc", "3hzr-m2ke", "w9fb-q6ys", "a5lc-t7np", "m8dj-4rvx", "z2ke-h9gq", "c6yw-n3fb", "r4mx-8tlz", "e7pv-2jdc"],
  verify = async () => true,
  onCancel,
  onDone,
  className,
}: TwoStepSetupProps) {
  const reduce = useReducedMotion();
  const uid = useId();
  const [contentRef, height] = useMeasuredHeight<HTMLDivElement>();
  const [step, setStep] = useState<Step>(0);
  const [dir, setDir] = useState(1);
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "checking" | "error" | "ok">("idle");
  const [saved, setSaved] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const { copied, copy } = useCopy();
  const shake = useAnimationControls();
  const otpRef = useRef<HTMLDivElement>(null);

  const go = (next: Step) => {
    setDir(next > step ? 1 : -1);
    if (next === 1) {
      setCode("");
      setStatus("idle");
    }
    setStep(next);
  };

  useEffect(() => {
    if (step !== 1) return;
    const t = setTimeout(() => otpRef.current?.querySelector("input")?.focus(), 260);
    return () => clearTimeout(t);
  }, [step]);

  useEffect(() => {
    if (status !== "ok") return;
    const t = setTimeout(() => go(2), 650);
    return () => clearTimeout(t);
  }, [status]);

  const check = async (value: string) => {
    setStatus("checking");
    const ok = await verify(value);
    if (ok) {
      setStatus("ok");
      return;
    }
    setStatus("error");
    setCode("");
    if (!reduce) shake.start({ x: [0, -7, 7, -4, 4, 0], transition: { duration: 0.34, ease: "easeOut" } });
  };

  // Inputs are disabled while checking, so focus can only return once they're enabled again.
  useEffect(() => {
    if (status !== "error") return;
    const t = setTimeout(() => otpRef.current?.querySelector("input")?.focus(), 0);
    return () => clearTimeout(t);
  }, [status]);

  const chunks = secret.match(/.{1,4}/g) ?? [secret];

  const download = () => {
    const text = `${issuer} backup codes for ${account}\nEach code works once.\n\n${backupCodes.join("\n")}\n`;
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${issuer.toLowerCase()}-backup-codes.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setDownloaded(true);
  };

  const variants = {
    enter: (d: number) => (reduce ? { opacity: 0 } : { opacity: 0, x: d * 28 }),
    center: { opacity: 1, x: 0 },
    exit: (d: number) => (reduce ? { opacity: 0 } : { opacity: 0, x: d * -28 }),
  };

  return (
    <section className={cn("mx-auto w-full max-w-[520px] overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-xs/5", className)}>
      <motion.div
        animate={{ height }}
        initial={false}
        transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 38 }}
      >
        <div ref={contentRef}>
          {step < 3 && (
            <header className="px-5 pt-6 sm:px-7">
              <div className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border bg-muted">
                  <ShieldCheckIcon className="size-4.5" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-balance font-semibold text-base tracking-tight">Turn on two-step verification</h2>
                  <p className="mt-0.5 text-pretty text-muted-foreground text-sm">
                    Add a code from your phone to every new sign-in on <span className="text-foreground">{account}</span>.
                  </p>
                </div>
              </div>
              <div className="mt-5">
                <Rail step={step} />
              </div>
            </header>
          )}

          <div className="relative overflow-hidden">
            <AnimatePresence custom={dir} initial={false} mode="popLayout">
              {step === 0 && (
                <motion.div
                  animate="center"
                  className="px-5 pt-6 pb-6 sm:px-7"
                  custom={dir}
                  exit="exit"
                  initial="enter"
                  key="scan"
                  transition={{ duration: 0.24, ease }}
                  variants={variants}
                >
                  <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start sm:gap-6">
                    <div className="size-40 shrink-0 rounded-xl border bg-background p-2.5 text-foreground shadow-xs/5">
                      <QrMock seed={secret} />
                    </div>
                    <div className="w-full min-w-0">
                      <ol className="space-y-2.5 text-sm">
                        {["Open your authenticator app.", `Scan the code to add ${issuer}.`].map((text, i) => (
                          <li className="flex items-start gap-2.5" key={text}>
                            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted font-medium text-[0.6875rem] tabular-nums">
                              {i + 1}
                            </span>
                            <span className="text-pretty pt-px">{text}</span>
                          </li>
                        ))}
                      </ol>
                      <div className="mt-5 rounded-xl border bg-muted/40 p-3">
                        <p className="text-muted-foreground text-xs">Can't scan? Enter this setup key instead.</p>
                        <div className="mt-2 flex items-center gap-2">
                          <code className="min-w-0 flex-1 font-mono text-[0.8125rem] tracking-wide">
                            {chunks.map((c, i) => (
                              <span className={cn("inline-block", i > 0 && "ms-1.5")} key={i}>
                                {c}
                              </span>
                            ))}
                          </code>
                          <Button
                            aria-label={copied === "secret" ? "Setup key copied" : "Copy setup key"}
                            className={press}
                            onClick={() => copy("secret", secret)}
                            size="icon-sm"
                            variant="outline"
                          >
                            <SwapIcon done={<CheckIcon className="text-success-foreground" />} on={copied === "secret"}>
                              <CopyIcon />
                            </SwapIcon>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 1 && (
                <motion.div
                  animate="center"
                  className="px-5 pt-6 pb-6 sm:px-7"
                  custom={dir}
                  exit="exit"
                  initial="enter"
                  key="verify"
                  transition={{ duration: 0.24, ease }}
                  variants={variants}
                >
                  <label className="block font-medium text-sm" htmlFor={`${uid}-otp`}>
                    Enter the 6-digit code from your app
                  </label>
                  <p className="mt-1 text-muted-foreground text-sm">It changes every 30 seconds, so use the one on screen now.</p>
                  <motion.div animate={shake} className="mt-5 flex justify-center sm:justify-start" ref={otpRef}>
                    <OTPField
                      aria-describedby={`${uid}-otp-msg`}
                      className={cn(status === "ok" && "has-disabled:opacity-100")}
                      disabled={status === "checking" || status === "ok"}
                      id={`${uid}-otp`}
                      length={6}
                      onValueChange={(v) => {
                        setCode(v);
                        if (status === "error") setStatus("idle");
                      }}
                      onValueComplete={check}
                      size="lg"
                      value={code}
                    >
                      {Array.from({ length: 6 }, (_, i) => (
                        <span className="contents" key={i}>
                          {i === 3 && <OTPFieldSeparator />}
                          <OTPFieldInput
                            aria-invalid={status === "error" ? true : undefined}
                            aria-label={`Digit ${i + 1}`}
                            className={cn(
                              "size-11 text-lg sm:size-11 sm:text-lg transition-[border-color,box-shadow,background-color] duration-200",
                              status === "ok" && "border-success/60 bg-success/6 selection:bg-transparent",
                            )}
                          />
                        </span>
                      ))}
                    </OTPField>
                  </motion.div>
                  <p
                    aria-live="polite"
                    className={cn(
                      "mt-3 flex min-h-5 items-center justify-center gap-1.5 text-xs sm:justify-start",
                      status === "error" ? "text-destructive-foreground" : status === "ok" ? "text-success-foreground" : "text-muted-foreground",
                    )}
                    id={`${uid}-otp-msg`}
                  >
                    {status === "checking" && "Checking…"}
                    {status === "error" && "That code didn't match. Try the newest one from your app."}
                    {status === "ok" && (
                      <>
                        <CheckIcon className="size-3.5" strokeWidth={3} />
                        Code accepted
                      </>
                    )}
                  </p>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  animate="center"
                  className="px-5 pt-6 pb-6 sm:px-7"
                  custom={dir}
                  exit="exit"
                  initial="enter"
                  key="codes"
                  transition={{ duration: 0.24, ease }}
                  variants={variants}
                >
                  <p className="font-medium text-sm">Save your backup codes</p>
                  <p className="mt-1 text-pretty text-muted-foreground text-sm">
                    If you lose your phone, each code gets you in once. We won't show them again.
                  </p>
                  <ol className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 rounded-xl border bg-muted/40 px-4 py-3.5 font-mono text-[0.8125rem]">
                    {backupCodes.map((c, i) => (
                      <motion.li
                        animate={{ opacity: 1 }}
                        className="flex items-baseline gap-2.5"
                        initial={reduce ? false : { opacity: 0 }}
                        key={c}
                        transition={{ duration: 0.2, delay: 0.1 + i * 0.025 }}
                      >
                        <span className="w-4 text-end text-muted-foreground/70 text-xs tabular-nums">{i + 1}</span>
                        <span className="tracking-wide">{c}</span>
                      </motion.li>
                    ))}
                  </ol>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Button className={press} onClick={() => copy("codes", backupCodes.join("\n"))} variant="outline">
                      <SwapIcon done={<CheckIcon className="text-success-foreground" />} on={copied === "codes"}>
                        <CopyIcon />
                      </SwapIcon>
                      {copied === "codes" ? "Copied" : "Copy all"}
                    </Button>
                    <Button className={press} onClick={download} variant="outline">
                      <SwapIcon done={<CheckIcon className="text-success-foreground" />} on={downloaded}>
                        <DownloadIcon />
                      </SwapIcon>
                      Download .txt
                    </Button>
                  </div>
                  <label className="mt-5 flex cursor-pointer items-center gap-2.5 text-sm" htmlFor={`${uid}-saved`}>
                    <Checkbox checked={saved} id={`${uid}-saved`} onCheckedChange={(v) => setSaved(Boolean(v))} />
                    I've stored these somewhere safe
                  </label>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  animate={{ opacity: 1, y: 0 }}
                  className="px-5 py-9 text-center sm:px-7"
                  exit={{ opacity: 0 }}
                  initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
                  key="done"
                  transition={{ duration: 0.26, ease }}
                >
                  <motion.span
                    animate={{ scale: 1, opacity: 1 }}
                    className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-success/12 text-success-foreground"
                    initial={reduce ? false : { scale: 0.8, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 420, damping: 22, delay: 0.08 }}
                  >
                    <ShieldCheckIcon className="size-7" />
                  </motion.span>
                  <h2 className="mt-5 font-semibold text-lg tracking-tight">Two-step verification is on</h2>
                  <p className="mx-auto mt-1 max-w-[36ch] text-pretty text-muted-foreground text-sm">
                    Next time you sign in on a new device, we'll ask for a code from your app.
                  </p>
                  <dl className="mx-auto mt-6 max-w-[320px] divide-y rounded-xl border text-left text-sm">
                    <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                      <dt className="flex items-center gap-2 text-muted-foreground">
                        <SmartphoneIcon className="size-4" />
                        Authenticator
                      </dt>
                      <dd>Added just now</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                      <dt className="flex items-center gap-2 text-muted-foreground">
                        <KeyRoundIcon className="size-4" />
                        Backup codes
                      </dt>
                      <dd className="tabular-nums">{backupCodes.length} unused</dd>
                    </div>
                  </dl>
                  <Button className={cn("mt-6", press)} onClick={onDone}>
                    Back to security settings
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {step < 3 && (
            <footer className="flex items-center justify-between gap-2 border-t bg-muted/40 px-5 py-3 sm:px-7">
              {step === 0 ? (
                <Button className={press} onClick={onCancel} variant="ghost">
                  Cancel
                </Button>
              ) : (
                <Button
                  className={press}
                  disabled={status === "checking" || (step === 1 && status === "ok")}
                  onClick={() => go((step - 1) as Step)}
                  variant="ghost"
                >
                  <ArrowLeftIcon />
                  Back
                </Button>
              )}
              <span className="text-muted-foreground text-xs tabular-nums">
                Step {step + 1} of {STEPS.length}
              </span>
              {step === 0 && (
                <Button className={press} onClick={() => go(1)}>
                  I've scanned it
                </Button>
              )}
              {step === 1 && (
                <Button
                  className={press}
                  disabled={code.length < 6 || status === "ok"}
                  loading={status === "checking"}
                  onClick={() => check(code)}
                >
                  Verify
                </Button>
              )}
              {step === 2 && (
                <Button className={press} disabled={!saved} onClick={() => go(3)}>
                  Finish setup
                </Button>
              )}
            </footer>
          )}
        </div>
      </motion.div>
    </section>
  );
}
