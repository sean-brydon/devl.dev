"use client";

import { CheckIcon, EyeIcon, EyeOffIcon } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { type FormEvent, type ReactNode, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type SignUpResult = { ok: true } | { ok: false; error: string };

export interface SignUpDetails {
  name: string;
  email: string;
  password: string;
}

export interface SignUpProps {
  product?: string;
  logo?: ReactNode;
  minLength?: number;
  onSignUp?: (details: SignUpDetails) => Promise<SignUpResult>;
  onSignIn?: () => void;
  onTerms?: () => void;
  onPrivacy?: () => void;
  className?: string;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

async function demoSignUp(): Promise<SignUpResult> {
  await new Promise((resolve) => setTimeout(resolve, 900));
  return { ok: true };
}

function Mark() {
  return (
    <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs/5">
      <svg aria-hidden className="size-6" fill="none" viewBox="0 0 28 28">
        <path d="M7 18.5 12 12l3.5 4.5 2-2.5 3.5 4.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
      </svg>
    </span>
  );
}

const linkClass =
  "cursor-pointer rounded-sm text-foreground underline underline-offset-4 outline-none decoration-border hover:decoration-foreground focus-visible:ring-2 focus-visible:ring-ring";

export function SignUp({
  product = "Ridgeline",
  logo,
  minLength = 8,
  onSignUp = demoSignUp,
  onSignIn,
  onTerms,
  onPrivacy,
  className,
}: SignUpProps) {
  const id = useId();
  const reduce = useReducedMotion();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tried, setTried] = useState(false);
  const [done, setDone] = useState(false);

  const longEnough = password.length >= minLength;
  const emailValid = EMAIL.test(email.trim());
  const emailError = tried && !emailValid ? "Enter a valid email address." : null;
  const passwordError = tried && !longEnough;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy || done) return;
    setTried(true);
    setError(null);
    if (!emailValid || !longEnough) return;
    setBusy(true);
    const result = await onSignUp({ name: name.trim(), email: email.trim(), password });
    setBusy(false);
    if (result.ok) setDone(true);
    else setError(result.error);
  };

  return (
    <div className={cn("flex h-[760px] w-full flex-col overflow-y-auto bg-background px-6 py-10 text-foreground", className)}>
      <div className="m-auto flex w-full max-w-[340px] flex-col items-center">
        {logo ?? <Mark />}
        <h1 className="mt-6 text-balance text-center font-semibold text-xl tracking-tight">Create your {product} account</h1>
        <p className="mt-1.5 text-balance text-center text-muted-foreground text-sm">Free for your first three projects. No card needed.</p>

        <form className="mt-8 flex w-full flex-col gap-4" noValidate onSubmit={submit}>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-name`}>Name</Label>
            <Input autoComplete="name" disabled={done} id={`${id}-name`} onChange={(e) => setName(e.target.value)} placeholder="Ada Lindqvist" value={name} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-email`}>Work email</Label>
            <Input
              aria-describedby={emailError ? `${id}-email-error` : undefined}
              aria-invalid={emailError ? true : undefined}
              autoComplete="email"
              disabled={done}
              id={`${id}-email`}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              type="email"
              value={email}
            />
            {emailError && (
              <p className="text-destructive-foreground text-xs" id={`${id}-email-error`}>
                {emailError}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-password`}>Password</Label>
            <InputGroup>
              <InputGroupInput
                aria-describedby={`${id}-hint`}
                aria-invalid={passwordError ? true : undefined}
                autoComplete="new-password"
                disabled={done}
                id={`${id}-password`}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                type={reveal ? "text" : "password"}
                value={password}
              />
              <InputGroupAddon align="inline-end">
                <button
                  aria-label={reveal ? "Hide password" : "Show password"}
                  className="flex size-6 cursor-pointer items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => setReveal((value) => !value)}
                  type="button"
                >
                  {reveal ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
                </button>
              </InputGroupAddon>
            </InputGroup>
            <p
              className={cn(
                "flex items-center gap-1.5 text-xs transition-colors",
                longEnough ? "text-success-foreground" : passwordError ? "text-destructive-foreground" : "text-muted-foreground",
              )}
              id={`${id}-hint`}
            >
              <span
                className={cn(
                  "flex size-3.5 items-center justify-center rounded-full border transition-colors",
                  longEnough ? "border-success bg-success text-white" : "border-current/40",
                )}
              >
                {longEnough && (
                  <motion.span animate={{ scale: 1 }} className="flex" initial={reduce ? false : { scale: 0.4 }} transition={{ type: "spring", stiffness: 500, damping: 24 }}>
                    <CheckIcon className="size-2.5" strokeWidth={3} />
                  </motion.span>
                )}
              </span>
              At least {minLength} characters
            </p>
          </div>
          {error && (
            <p className="text-destructive-foreground text-xs" role="alert">
              {error}
            </p>
          )}
          <Button className={cn("mt-2 w-full", done && "pointer-events-none")} loading={busy} type="submit">
            {done ? (
              <motion.span animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-2" initial={reduce ? false : { opacity: 0, scale: 0.9 }}>
                <CheckIcon />
                Account created
              </motion.span>
            ) : (
              "Create account"
            )}
          </Button>
          <p className="text-balance text-center text-muted-foreground text-xs leading-relaxed">
            By continuing you agree to the{" "}
            <button className={linkClass} onClick={onTerms} type="button">
              Terms
            </button>{" "}
            and{" "}
            <button className={linkClass} onClick={onPrivacy} type="button">
              Privacy Policy
            </button>
            .
          </p>
        </form>

        <p className="mt-8 text-center text-muted-foreground text-sm">
          Already have an account?{" "}
          <button
            className="cursor-pointer rounded-sm font-medium text-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
            onClick={onSignIn}
            type="button"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
