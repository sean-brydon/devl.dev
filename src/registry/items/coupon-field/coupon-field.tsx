"use client";

import { CircleAlertIcon, TagIcon, XIcon } from "lucide-react";
import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from "motion/react";
import { type FormEvent, useEffect, useId, useRef, useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export type CouponResult =
  | {
      ok: true;
      label: string;
      percent?: number;
      amount?: number;
      freeShipping?: boolean;
    }
  | { ok: false; reason: string };

export interface SummaryLine {
  label: string;
  amount: number;
}

export interface CouponFieldProps {
  lines?: SummaryLine[];
  shipping?: number;
  validate: (code: string) => Promise<CouponResult>;
  onApplied?: (code: string | null, savings: number) => void;
  currency?: string;
  locale?: string;
  title?: string;
  className?: string;
}

type State =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "error"; reason: string }
  | { status: "applied"; code: string; result: Extract<CouponResult, { ok: true }> };

export function CouponField({
  lines = [],
  shipping = 0,
  validate,
  onApplied,
  currency = "USD",
  locale = "en-US",
  title = "Order summary",
  className,
}: CouponFieldProps) {
  const reduce = useReducedMotion();
  const [code, setCode] = useState("");
  const [state, setState] = useState<State>({ status: "idle" });
  const shake = useAnimationControls();
  const inputRef = useRef<HTMLInputElement>(null);
  const removeRef = useRef<HTMLButtonElement>(null);
  const request = useRef(0);
  const inputId = useId();
  const errorId = useId();
  useEffect(
    () => () => {
      request.current++;
    },
    [],
  );

  const fmt = (n: number) => new Intl.NumberFormat(locale, { style: "currency", currency }).format(n);
  const subtotal = lines.reduce((n, l) => n + l.amount, 0);
  const applied = state.status === "applied" ? state.result : null;
  const shipOff = applied?.freeShipping ? shipping : 0;
  const itemsOff = applied ? Math.min(subtotal, (applied.percent ? (subtotal * applied.percent) / 100 : 0) + (applied.amount ?? 0)) : 0;
  const savings = Math.round((itemsOff + shipOff) * 100) / 100;
  const total = subtotal + shipping - savings;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const value = code.trim().toUpperCase();
    if (!value || state.status === "checking") return;
    const id = ++request.current;
    setState({ status: "checking" });
    const result = await validate(value);
    if (id !== request.current) return;
    if (result.ok) {
      setState({ status: "applied", code: value, result });
      const s = Math.round(
        (Math.min(subtotal, (result.percent ? (subtotal * result.percent) / 100 : 0) + (result.amount ?? 0)) + (result.freeShipping ? shipping : 0)) * 100,
      ) / 100;
      onApplied?.(value, s);
      requestAnimationFrame(() => removeRef.current?.focus({ preventScroll: true }));
    } else {
      setState({ status: "error", reason: result.reason });
      if (!reduce) shake.start({ x: [0, -5, 5, -3, 3, 0], transition: { duration: 0.32, ease: "easeOut" } });
      inputRef.current?.focus();
    }
  };

  const remove = () => {
    setState({ status: "idle" });
    setCode("");
    onApplied?.(null, 0);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const ease = [0.23, 1, 0.32, 1] as const;
  const error = state.status === "error";
  const checking = state.status === "checking";

  return (
    <div className={cn("w-full max-w-[360px] rounded-2xl border bg-card p-4 text-card-foreground shadow-xs/5", className)}>
      <h3 className="font-semibold text-sm">{title}</h3>

      {lines.length > 0 && (
        <ul className="mt-3 space-y-1.5 text-sm">
          {lines.map((l) => (
            <li className="flex justify-between gap-3" key={l.label}>
              <span className="truncate text-muted-foreground">{l.label}</span>
              <span className="tabular-nums">{fmt(l.amount)}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4">
        <label className="mb-1.5 block font-medium text-xs" htmlFor={inputId}>
          Promo code
        </label>
        <div className="relative h-9">
          <AnimatePresence initial={false} mode="popLayout">
            {applied && state.status === "applied" ? (
              <motion.div
                animate={{ opacity: 1, scale: 1 }}
                className="flex h-9 items-center gap-2 rounded-lg border border-success/30 bg-success/8 ps-2.5 pe-1 text-sm"
                exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.12 } }}
                initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
                key="applied"
                transition={{ duration: 0.22, ease }}
              >
                <TagIcon className="size-3.5 shrink-0 text-success-foreground" />
                <span className="font-medium font-mono text-[13px] tracking-wide">{state.code}</span>
                <span className="truncate text-success-foreground text-xs">{applied.label}</span>
                <button
                  aria-label={`Remove code ${state.code}`}
                  className="ms-auto flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-[calc(var(--radius-lg)-4px)] text-muted-foreground outline-none transition-colors hover:bg-success/12 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={remove}
                  ref={removeRef}
                  type="button"
                >
                  <XIcon className="size-3.5" />
                </button>
              </motion.div>
            ) : (
              <motion.form
                animate={shake}
                className="h-9"
                exit={{ opacity: 0, transition: { duration: 0.1 } }}
                initial={false}
                key="form"
                onSubmit={submit}
              >
                <div
                  className={cn(
                    "flex h-9 items-center rounded-lg border bg-background ps-3 pe-1 shadow-xs/5 transition-[border-color,box-shadow] duration-150 focus-within:ring-[3px] dark:bg-input/32",
                    error ? "border-destructive/60 ring-destructive/16 focus-within:border-destructive/70" : "focus-within:border-ring focus-within:ring-ring/24",
                  )}
                >
                  <input
                    aria-describedby={error ? errorId : undefined}
                    aria-invalid={error || undefined}
                    autoCapitalize="characters"
                    autoComplete="off"
                    className="h-full min-w-0 flex-1 bg-transparent font-mono text-[13px] uppercase tracking-wide outline-none placeholder:font-sans placeholder:text-muted-foreground placeholder:normal-case placeholder:tracking-normal"
                    id={inputId}
                    onChange={(e) => {
                      setCode(e.target.value);
                      if (error) setState({ status: "idle" });
                    }}
                    placeholder="Enter a code"
                    readOnly={checking}
                    ref={inputRef}
                    spellCheck={false}
                    value={code}
                  />
                  <button
                    className="relative flex h-7 min-w-16 cursor-pointer items-center justify-center rounded-[calc(var(--radius-lg)-4px)] bg-primary px-3 font-medium text-primary-foreground text-xs outline-none transition-[opacity,scale] duration-150 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background active:scale-[0.97] disabled:cursor-default disabled:opacity-40"
                    aria-busy={checking || undefined}
                    disabled={!code.trim()}
                    type="submit"
                  >
                    <AnimatePresence initial={false} mode="popLayout">
                      <motion.span
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center"
                        exit={{ opacity: 0, scale: 0.8 }}
                        initial={{ opacity: 0, scale: 0.8 }}
                        key={checking ? "spin" : "apply"}
                        transition={{ duration: 0.14 }}
                      >
                        {checking ? <Spinner className="size-3.5" /> : "Apply"}
                      </motion.span>
                    </AnimatePresence>
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
        <AnimatePresence initial={false}>
          {error && (
            <motion.p
              animate={{ opacity: 1, height: "auto" }}
              className="overflow-hidden text-destructive-foreground text-xs"
              exit={{ opacity: 0, height: 0 }}
              id={errorId}
              initial={reduce ? { opacity: 0, height: "auto" } : { opacity: 0, height: 0 }}
              key="err"
              role="alert"
              transition={{ duration: 0.2, ease }}
            >
              <span className="flex items-start gap-1.5 pt-1.5">
                <CircleAlertIcon className="mt-px size-3.5 shrink-0" />
                {state.reason}
              </span>
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-4 space-y-1.5 border-t pt-3 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="tabular-nums">{fmt(subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Shipping</span>
          <span className={cn("tabular-nums transition-colors duration-200", shipOff ? "text-muted-foreground line-through" : "")}>{fmt(shipping)}</span>
        </div>
        <AnimatePresence initial={false}>
          {savings > 0 && state.status === "applied" && (
            <motion.div
              animate={{ opacity: 1, height: "auto" }}
              className="overflow-hidden"
              exit={{ opacity: 0, height: 0 }}
              initial={reduce ? { opacity: 0, height: "auto" } : { opacity: 0, height: 0 }}
              key="savings"
              transition={{ duration: 0.24, ease }}
            >
              <motion.div
                animate={{ x: 0 }}
                className="flex justify-between text-success-foreground"
                initial={reduce ? false : { x: -8 }}
                transition={{ duration: 0.28, ease }}
              >
                <span className="flex items-center gap-1.5">
                  <TagIcon className="size-3.5" />
                  {state.code}
                </span>
                <span className="font-medium tabular-nums">−{fmt(savings)}</span>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="flex items-baseline justify-between border-t pt-2.5">
          <span className="font-medium">Total</span>
          <RollingNumber className="font-semibold text-base" text={fmt(total)} />
        </div>
      </div>
    </div>
  );
}

function RollingNumber({ text, className }: { text: string; className?: string }) {
  const reduce = useReducedMotion();
  const chars = text.split("");
  return (
    <span aria-label={text} className={cn("inline-flex tabular-nums leading-6", className)} role="img">
      {chars.map((c, i) => {
        const key = chars.length - i;
        if (!/\d/.test(c)) {
          return (
            <span aria-hidden key={`s${key}`}>
              {c}
            </span>
          );
        }
        return (
          <span aria-hidden className="relative inline-block h-6 overflow-hidden [mask-image:linear-gradient(transparent,black_15%,black_85%,transparent)]" key={`d${key}`}>
            <motion.span
              animate={{ y: `${-Number(c) * 10}%` }}
              className="flex flex-col"
              initial={false}
              transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 30 }}
            >
              {Array.from({ length: 10 }, (_, d) => (
                <span className="h-6" key={d}>
                  {d}
                </span>
              ))}
            </motion.span>
          </span>
        );
      })}
    </span>
  );
}
