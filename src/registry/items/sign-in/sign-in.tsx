"use client";

import { Building2Icon, CheckIcon, EyeIcon, EyeOffIcon, FingerprintIcon } from "lucide-react";
import { motion, useAnimationControls, useReducedMotion } from "motion/react";
import { type FormEvent, type ReactNode, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type SignInResult = { ok: true } | { ok: false; error: string };

export interface SignInProps {
  product?: string;
  logo?: ReactNode;
  defaultEmail?: string;
  onSignIn?: (email: string, password: string) => Promise<SignInResult>;
  onPasskey?: () => Promise<SignInResult>;
  onSso?: () => void;
  onForgotPassword?: () => void;
  onSignUp?: () => void;
  className?: string;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function demoSignIn(_email: string, password: string): Promise<SignInResult> {
  await wait(900);
  if (password.length < 8 || password.toLowerCase().includes("wrong")) {
    return { ok: false, error: "That password doesn’t match this account." };
  }
  return { ok: true };
}

async function demoPasskey(): Promise<SignInResult> {
  await wait(1200);
  return { ok: true };
}

function Mark() {
  return (
    <span className="flex size-10 items-center justify-center rounded-xl bg-foreground text-background shadow-xs/5">
      <svg aria-hidden className="size-6" fill="none" viewBox="0 0 28 28">
        <path d="M7 18.5 12 12l3.5 4.5 2-2.5 3.5 4.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
      </svg>
    </span>
  );
}

export function SignIn({
  product = "Ridgeline",
  logo,
  defaultEmail = "ada@ridgeline.app",
  onSignIn = demoSignIn,
  onPasskey = demoPasskey,
  onSso,
  onForgotPassword,
  onSignUp,
  className,
}: SignInProps) {
  const id = useId();
  const reduce = useReducedMotion();
  const shake = useAnimationControls();
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState("");
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState<"password" | "passkey" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const finish = async (result: SignInResult) => {
    setBusy(null);
    if (result.ok) {
      setDone(true);
      return;
    }
    setError(result.error);
    if (!reduce) await shake.start({ x: [0, -6, 6, -4, 4, 0], transition: { duration: 0.36 } });
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy || done) return;
    setError(null);
    setBusy("password");
    await finish(await onSignIn(email, password));
  };

  const passkey = async () => {
    if (busy || done) return;
    setError(null);
    setBusy("passkey");
    await finish(await onPasskey());
  };

  return (
    <div className={cn("flex h-[760px] w-full flex-col overflow-y-auto bg-background px-6 py-10 text-foreground", className)}>
      <div className="m-auto flex w-full max-w-[340px] flex-col items-center">
        {logo ?? <Mark />}
        <h1 className="mt-6 text-balance text-center font-semibold text-xl tracking-tight">Sign in to {product}</h1>
        <p className="mt-1.5 text-balance text-center text-muted-foreground text-sm">Welcome back. Pick up where you left off.</p>

        <div className="mt-8 grid w-full grid-cols-2 gap-2">
          <Button disabled={done} loading={busy === "passkey"} onClick={passkey} type="button" variant="outline">
            <FingerprintIcon />
            Passkey
          </Button>
          <Button disabled={done || busy !== null} onClick={onSso} type="button" variant="outline">
            <Building2Icon />
            SSO
          </Button>
        </div>

        <div className="my-6 flex w-full items-center gap-3 text-muted-foreground text-xs">
          <span className="h-px flex-1 bg-border" />
          or
          <span className="h-px flex-1 bg-border" />
        </div>

        <form className="flex w-full flex-col gap-4" noValidate onSubmit={submit}>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-email`}>Email</Label>
            <Input
              autoComplete="email"
              disabled={done}
              id={`${id}-email`}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
              type="email"
              value={email}
            />
          </div>
          <motion.div animate={shake} className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor={`${id}-password`}>Password</Label>
              <button
                className="cursor-pointer rounded-sm text-muted-foreground text-sm outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                onClick={onForgotPassword}
                type="button"
              >
                Forgot password?
              </button>
            </div>
            <InputGroup>
              <InputGroupInput
                aria-describedby={error ? `${id}-error` : undefined}
                aria-invalid={error ? true : undefined}
                autoComplete="current-password"
                disabled={done}
                id={`${id}-password`}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError(null);
                }}
                placeholder="Your password"
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
            {error && (
              <p className="text-destructive-foreground text-xs" id={`${id}-error`} role="alert">
                {error}
              </p>
            )}
          </motion.div>
          <Button className={cn("mt-2 w-full", done && "pointer-events-none")} loading={busy === "password"} type="submit">
            {done ? (
              <motion.span animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-2" initial={reduce ? false : { opacity: 0, scale: 0.9 }}>
                <CheckIcon />
                Signed in
              </motion.span>
            ) : (
              "Sign in"
            )}
          </Button>
        </form>

        <p className="mt-8 text-center text-muted-foreground text-sm">
          Don’t have an account?{" "}
          <button
            className="cursor-pointer rounded-sm font-medium text-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
            onClick={onSignUp}
            type="button"
          >
            Sign up
          </button>
        </p>
      </div>
    </div>
  );
}
