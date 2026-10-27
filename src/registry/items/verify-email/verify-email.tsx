"use client";

import { CheckIcon, MailIcon } from "lucide-react";
import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from "motion/react";
import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { OTPField, OTPFieldInput, OTPFieldSeparator } from "@/components/ui/otp-field";
import { cn } from "@/lib/utils";

export type VerifyResult = { ok: true } | { ok: false; error: string };

export interface VerifyEmailProps {
  email?: string;
  length?: number;
  resendAfter?: number;
  onVerify?: (code: string) => Promise<VerifyResult>;
  onResend?: () => void;
  onChangeEmail?: () => void;
  onContinue?: () => void;
  className?: string;
}

async function demoVerify(code: string): Promise<VerifyResult> {
  await new Promise((resolve) => setTimeout(resolve, 800));
  if (/^(\d)\1+$/.test(code)) return { ok: false, error: "That code didn’t work. Check the email and try again." };
  return { ok: true };
}

function Tile({ done }: { done: boolean }) {
  return (
    <span
      className={cn(
        "relative flex size-10 items-center justify-center overflow-hidden rounded-xl border shadow-xs/5 transition-colors duration-300",
        done ? "border-success/30 bg-success/10 text-success-foreground" : "bg-card text-foreground",
      )}
    >
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          animate={{ opacity: 1, y: 0 }}
          className="flex"
          exit={{ opacity: 0, y: -10 }}
          initial={{ opacity: 0, y: 10 }}
          key={done ? "done" : "mail"}
          transition={{ type: "spring", stiffness: 420, damping: 30 }}
        >
          {done ? <CheckIcon className="size-5" /> : <MailIcon className="size-5" />}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export function VerifyEmail({
  email = "ada@ridgeline.app",
  length = 6,
  resendAfter = 30,
  onVerify = demoVerify,
  onResend,
  onChangeEmail,
  onContinue,
  className,
}: VerifyEmailProps) {
  const id = useId();
  const reduce = useReducedMotion();
  const shake = useAnimationControls();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [left, setLeft] = useState(resendAfter);

  useEffect(() => {
    if (left <= 0 || done) return;
    const timer = setTimeout(() => setLeft((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [left, done]);

  const verify = async (value: string) => {
    if (busy || done || value.length < length) return;
    setBusy(true);
    setError(null);
    const result = await onVerify(value);
    setBusy(false);
    if (result.ok) {
      setDone(true);
      return;
    }
    setError(result.error);
    if (!reduce) await shake.start({ x: [0, -6, 6, -4, 4, 0], transition: { duration: 0.36 } });
  };

  const half = Math.ceil(length / 2);

  return (
    <div className={cn("flex h-[760px] w-full flex-col overflow-y-auto bg-background px-6 py-10 text-foreground", className)}>
      <div className="m-auto flex w-full max-w-[340px] flex-col items-center">
        <Tile done={done} />
        <h1 className="mt-6 text-balance text-center font-semibold text-xl tracking-tight">{done ? "Email verified" : "Check your email"}</h1>
        <p className="mt-1.5 text-balance text-center text-muted-foreground text-sm">
          {done ? (
            <>
              <span className="font-medium text-foreground">{email}</span> is confirmed. You’re all set.
            </>
          ) : (
            <>
              Enter the {length}-digit code we sent to <span className="font-medium text-foreground">{email}</span>
            </>
          )}
        </p>

        <form
          className="mt-8 flex w-full flex-col items-center gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (done) onContinue?.();
            else verify(code);
          }}
        >
          <motion.div animate={shake}>
            <OTPField
              aria-describedby={error ? `${id}-error` : undefined}
              aria-label="Verification code"
              disabled={busy || done}
              length={length}
              onValueChange={(value) => {
                setCode(value);
                setError(null);
              }}
              onValueComplete={verify}
              size="lg"
              value={code}
            >
              {Array.from({ length }, (_, i) => (
                <span className="contents" key={i}>
                  {i === half && <OTPFieldSeparator />}
                  <OTPFieldInput
                    aria-invalid={error ? true : undefined}
                    aria-label={`Digit ${i + 1} of ${length}`}
                    className={cn("transition-colors duration-300", done && "border-success/40 bg-success/6")}
                  />
                </span>
              ))}
            </OTPField>
          </motion.div>
          {error && (
            <p className="-mt-1 text-center text-destructive-foreground text-xs" id={`${id}-error`} role="alert">
              {error}
            </p>
          )}
          <Button className="mt-2 w-full" disabled={!done && code.length < length} loading={busy} type="submit">
            {done ? "Continue" : "Verify email"}
          </Button>
        </form>

        <p className="mt-6 text-center text-muted-foreground text-sm">
          {done ? null : left > 0 ? (
            <>
              Didn’t get a code? Resend in <span className="font-medium text-foreground tabular-nums">0:{String(left).padStart(2, "0")}</span>
            </>
          ) : (
            <>
              Didn’t get a code?{" "}
              <button
                className="cursor-pointer rounded-sm font-medium text-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => {
                  onResend?.();
                  setLeft(resendAfter);
                }}
                type="button"
              >
                Resend
              </button>
            </>
          )}
        </p>

        <p className={cn("mt-8 text-center text-muted-foreground text-sm", done && "invisible")}>
          Wrong email?{" "}
          <button
            className="cursor-pointer rounded-sm font-medium text-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
            onClick={onChangeEmail}
            type="button"
          >
            Change it
          </button>
        </p>
      </div>
    </div>
  );
}
