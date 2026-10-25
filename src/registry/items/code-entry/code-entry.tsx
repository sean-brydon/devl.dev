"use client";

import { CheckIcon } from "lucide-react";
import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from "motion/react";
import { Fragment, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

type Status = "idle" | "checking" | "error" | "success";

export interface CodeEntryProps {
  length?: number;
  groupSize?: number;
  onVerify?: (code: string) => boolean | Promise<boolean>;
  onVerified?: (code: string) => void;
  label?: string;
  hint?: string;
  errorMessage?: string;
  successLabel?: string;
  autoFocus?: boolean;
  className?: string;
}

const SLOT_W = 44;
const SLOT_H = 52;
const PILL_W = 148;
const PILL_H = 44;

export function CodeEntry({
  length = 6,
  groupSize = 3,
  onVerify,
  onVerified,
  label = "Verification code",
  hint = "Enter the 6-digit code we sent you.",
  errorMessage = "That code didn’t match. Try again.",
  successLabel = "Verified",
  autoFocus = false,
  className,
}: CodeEntryProps) {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [focused, setFocused] = useState(false);
  const [slots, setSlots] = useState<number[]>([]);
  const [width, setWidth] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const slotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const timers = useRef<number[]>([]);
  const shake = useAnimationControls();
  const reduce = useReducedMotion();
  const id = useId();
  const filterId = `code-entry-goo-${id.replace(/:/g, "")}`;

  useLayoutEffect(() => {
    const measure = () => {
      setSlots(slotRefs.current.map((el) => el?.offsetLeft ?? 0));
      setWidth(rowRef.current?.offsetWidth ?? 0);
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (rowRef.current) observer.observe(rowRef.current);
    return () => observer.disconnect();
  }, [length, groupSize]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  const verify = async (value: string) => {
    setStatus("checking");
    const ok = onVerify ? await onVerify(value) : true;
    if (ok) {
      setStatus("success");
      inputRef.current?.blur();
      later(() => onVerified?.(value), 900);
      return;
    }
    setStatus("error");
    if (!reduce) void shake.start({ x: [0, -7, 6, -4, 2, 0], transition: { duration: 0.5, ease: "easeInOut" } });
    later(() => {
      setCode("");
      inputRef.current?.focus();
    }, 900);
  };

  const onChange = (raw: string) => {
    if (status === "checking" || status === "success") return;
    const next = raw.replace(/\D/g, "").slice(0, length);
    setCode(next);
    if (status === "error") setStatus("idle");
    if (next.length === length) void verify(next);
  };

  const active = Math.min(code.length, length - 1);
  const ringX = slots[active] ?? 0;
  const spring = reduce ? { duration: 0 } : { type: "spring" as const, stiffness: 520, damping: 36 };
  const success = status === "success";
  const pillX = width / 2 - PILL_W / 2;

  return (
    <div className={cn("grid justify-items-center gap-3", className)}>
      <div className="grid justify-items-center gap-1 text-center">
        <label className="font-medium text-sm" htmlFor={id}>
          {label}
        </label>
        <p className="text-muted-foreground text-xs" id={`${id}-hint`}>
          {hint}
        </p>
      </div>

      <motion.div animate={shake} className="relative" ref={rowRef} style={{ height: SLOT_H }}>
        <motion.div
          animate={{ opacity: success ? 0 : 1 }}
          className="flex items-center gap-2"
          transition={{ duration: success ? 0.15 : 0.3 }}
        >
          {Array.from({ length }, (_, i) => {
            const char = code[i];
            const isActive = focused && i === active && status !== "checking";
            return (
              <Fragment key={i}>
                {groupSize > 0 && i > 0 && i % groupSize === 0 && (
                  <span aria-hidden className="h-0.5 w-2.5 rounded-full bg-border" />
                )}
                <div
                  className={cn(
                    "relative flex items-center justify-center rounded-xl border bg-background font-medium font-mono text-xl tabular-nums shadow-xs/5 transition-colors duration-300 dark:bg-input/32",
                    status === "error" && "border-destructive/60 bg-destructive/4 text-destructive-foreground",
                    status === "checking" && "text-muted-foreground",
                  )}
                  ref={(el) => {
                    slotRefs.current[i] = el;
                  }}
                  style={{ width: SLOT_W, height: SLOT_H }}
                >
                  <AnimatePresence initial={false}>
                    {char && (
                      <motion.span
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, transition: { duration: 0.1 } }}
                        initial={reduce ? { opacity: 0 } : { scale: 0.9, opacity: 0, y: 4 }}
                        key={`${i}-${char}`}
                        transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
                        className="absolute"
                      >
                        {char}
                      </motion.span>
                    )}
                  </AnimatePresence>
                  {isActive && !char && (
                    <span aria-hidden className="h-6 w-px animate-caret-blink bg-foreground" />
                  )}
                </div>
              </Fragment>
            );
          })}
        </motion.div>

        <motion.div
          animate={{ x: ringX, opacity: focused && !success && status !== "checking" ? 1 : 0 }}
          aria-hidden
          className={cn(
            "pointer-events-none absolute top-0 left-0 rounded-xl border-2 border-ring ring-4 ring-ring/16",
            status === "error" && "border-destructive/70 ring-destructive/16",
          )}
          initial={false}
          style={{ width: SLOT_W, height: SLOT_H }}
          transition={{ x: spring, opacity: { duration: 0.15 } }}
        />

        <AnimatePresence>
          {status === "checking" && (
            <motion.div
              animate={{ opacity: 1 }}
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
            >
              <span className="flex size-8 items-center justify-center rounded-full bg-popover shadow-xs/5 ring-1 ring-border">
                <Spinner className="size-4" />
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {success && (
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <svg className="absolute size-0">
              <filter colorInterpolationFilters="sRGB" height="200%" id={filterId} width="140%" x="-20%" y="-50%">
                <feGaussianBlur in="SourceGraphic" result="blur" stdDeviation="6" />
                <feColorMatrix in="blur" result="goo" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9" />
                <feComposite in="SourceGraphic" in2="goo" operator="atop" />
              </filter>
            </svg>
            <div className="absolute inset-0" style={{ filter: `url(#${filterId})` }}>
              {slots.map((x, i) => (
                <motion.span
                  animate={{ x: pillX, y: (SLOT_H - PILL_H) / 2, width: PILL_W, height: PILL_H, borderRadius: PILL_H / 2, opacity: 1 }}
                  className="absolute top-0 left-0 bg-success"
                  initial={reduce ? false : { x, y: 0, width: SLOT_W, height: SLOT_H, borderRadius: 12, opacity: 0 }}
                  key={i}
                  transition={
                    reduce
                      ? { duration: 0 }
                      : {
                          type: "spring",
                          stiffness: 260,
                          damping: 28,
                          delay: Math.abs(i - (length - 1) / 2) * 0.04,
                          opacity: { duration: 0.12 },
                        }
                  }
                />
              ))}
            </div>
            <motion.div
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 flex items-center justify-center gap-1.5 font-medium text-sm text-white"
              initial={reduce ? false : { opacity: 0, scale: 0.85 }}
              transition={{ delay: reduce ? 0 : 0.3, type: "spring", stiffness: 400, damping: 24 }}
            >
              <motion.span
                animate={{ rotate: 0, scale: 1, opacity: 1 }}
                className="flex size-5 items-center justify-center rounded-full bg-white/20"
                initial={reduce ? false : { rotate: -45, scale: 0.6, opacity: 0 }}
                transition={{ delay: reduce ? 0 : 0.36, type: "spring", stiffness: 500, damping: 26 }}
              >
                <CheckIcon className="size-3.5" strokeWidth={3} />
              </motion.span>
              {successLabel}
            </motion.div>
          </div>
        )}

        <input
          aria-describedby={`${id}-hint ${id}-status`}
          aria-invalid={status === "error" || undefined}
          autoComplete="one-time-code"
          autoFocus={autoFocus}
          className="absolute inset-0 z-10 w-full cursor-text bg-transparent text-transparent caret-transparent outline-none selection:bg-transparent disabled:cursor-default"
          disabled={success}
          id={id}
          inputMode="numeric"
          maxLength={length}
          onBlur={() => setFocused(false)}
          onChange={(e) => onChange(e.target.value)}
          onFocus={(e) => {
            setFocused(true);
            const end = e.target.value.length;
            e.target.setSelectionRange(end, end);
          }}
          onSelect={(e) => {
            const el = e.currentTarget;
            const end = el.value.length;
            if (el.selectionStart !== end) el.setSelectionRange(end, end);
          }}
          pattern="\d*"
          ref={inputRef}
          spellCheck={false}
          value={code}
        />
      </motion.div>

      <p
        aria-live="polite"
        className={cn(
          "h-4 text-xs transition-colors",
          status === "error" ? "text-destructive-foreground" : success ? "text-success-foreground" : "text-muted-foreground",
        )}
        id={`${id}-status`}
      >
        {status === "error" ? errorMessage : status === "checking" ? "Checking…" : success ? "You’re all set." : ""}
      </p>
    </div>
  );
}
