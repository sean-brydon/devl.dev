"use client";

import { ArrowLeftIcon, KeyRoundIcon, MailCheckIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type FormEvent, useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface ForgotPasswordProps {
  defaultEmail?: string;
  resendAfter?: number;
  onSend?: (email: string) => Promise<void>;
  onSignIn?: () => void;
  className?: string;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

async function demoSend() {
  await new Promise((resolve) => setTimeout(resolve, 900));
}

const linkClass =
  "cursor-pointer rounded-sm font-medium text-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring";

export function ForgotPassword({ defaultEmail = "", resendAfter = 30, onSend = demoSend, onSignIn, className }: ForgotPasswordProps) {
  const id = useId();
  const reduce = useReducedMotion();
  const [email, setEmail] = useState(defaultEmail);
  const [busy, setBusy] = useState(false);
  const [tried, setTried] = useState(false);
  const [sent, setSent] = useState(false);
  const [left, setLeft] = useState(0);

  useEffect(() => {
    if (left <= 0) return;
    const timer = setTimeout(() => setLeft((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [left]);

  const valid = EMAIL.test(email.trim());
  const error = tried && !valid ? "Enter the email you signed up with." : null;

  const send = async (event?: FormEvent) => {
    event?.preventDefault();
    setTried(true);
    if (!valid || busy) return;
    setBusy(true);
    await onSend(email.trim());
    setBusy(false);
    setSent(true);
    setLeft(resendAfter);
  };


  return (
    <div className={cn("flex h-[760px] w-full flex-col overflow-y-auto bg-background px-6 py-10 text-foreground", className)}>
      <div className="m-auto flex w-full max-w-[340px] flex-col items-center">
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="flex w-full flex-col items-center"
            exit={{ opacity: 0, y: -8 }}
            initial={{ opacity: 0, y: 8 }}
            key={sent ? "sent" : "ask"}
            transition={reduce ? { duration: 0 } : { duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
          >
            <span className="flex size-10 items-center justify-center rounded-xl border bg-card shadow-xs/5">
              {sent ? <MailCheckIcon className="size-5" /> : <KeyRoundIcon className="size-5" />}
            </span>
            <h1 className="mt-6 text-balance text-center font-semibold text-xl tracking-tight">{sent ? "Check your email" : "Forgot your password?"}</h1>
            <p className="mt-1.5 text-balance text-center text-muted-foreground text-sm">
              {sent ? (
                <>
                  We sent a reset link to <span className="font-medium text-foreground">{email.trim()}</span>. It expires in 30 minutes.
                </>
              ) : (
                "Enter your email and we’ll send you a link to reset it."
              )}
            </p>

            {sent ? (
              <div className="mt-8 flex w-full flex-col gap-4">
                <Button className="w-full" onClick={onSignIn} type="button" variant="outline">
                  <ArrowLeftIcon />
                  Back to sign in
                </Button>
                <p className="text-center text-muted-foreground text-sm">
                  {left > 0 ? (
                    <>
                      Didn’t get it? Resend in <span className="font-medium text-foreground tabular-nums">0:{String(left).padStart(2, "0")}</span>
                    </>
                  ) : (
                    <>
                      Didn’t get it?{" "}
                      <button className={linkClass} disabled={busy} onClick={() => send()} type="button">
                        {busy ? "Sending…" : "Resend"}
                      </button>{" "}
                      or{" "}
                      <button className={linkClass} onClick={() => setSent(false)} type="button">
                        use another email
                      </button>
                    </>
                  )}
                </p>
              </div>
            ) : (
              <form className="mt-8 flex w-full flex-col gap-4" noValidate onSubmit={send}>
                <div className="flex flex-col gap-2">
                  <Label htmlFor={`${id}-email`}>Email</Label>
                  <Input
                    aria-describedby={error ? `${id}-error` : undefined}
                    aria-invalid={error ? true : undefined}
                    autoComplete="email"
                    id={`${id}-email`}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@company.com"
                    type="email"
                    value={email}
                  />
                  {error && (
                    <p className="text-destructive-foreground text-xs" id={`${id}-error`}>
                      {error}
                    </p>
                  )}
                </div>
                <Button className="mt-2 w-full" loading={busy} type="submit">
                  Send reset link
                </Button>
              </form>
            )}
          </motion.div>
        </AnimatePresence>

        <p className="mt-8 text-center text-muted-foreground text-sm">
          Remembered it?{" "}
          <button className={linkClass} onClick={onSignIn} type="button">
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
