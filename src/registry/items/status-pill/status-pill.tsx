"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface StatusPillProps {
  phases?: string[];
  doneLabel?: string;
  interval?: number;
  done?: boolean;
  loop?: boolean;
  size?: "sm" | "default";
  className?: string;
}

const spring = { type: "spring", stiffness: 420, damping: 34 } as const;
const easeOut = [0.23, 1, 0.32, 1] as const;

function useMountedReducedMotion() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && !!prefers;
}

export function StatusPill({
  phases = ["Reading", "Searching", "Writing"],
  doneLabel = "Done",
  interval = 1400,
  done: doneProp,
  loop = false,
  size = "default",
  className,
}: StatusPillProps) {
  const reduce = useMountedReducedMotion();
  const [step, setStep] = useState(0);
  const controlled = doneProp !== undefined;
  const done = controlled ? doneProp : step >= phases.length;

  useEffect(() => {
    if (controlled) {
      if (doneProp) return;
      const t = setTimeout(() => setStep((s) => (s + 1) % phases.length), interval);
      return () => clearTimeout(t);
    }
    if (step >= phases.length) {
      if (!loop) return;
      const t = setTimeout(() => setStep(0), interval * 1.8);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setStep((s) => s + 1), interval);
    return () => clearTimeout(t);
  }, [controlled, doneProp, step, phases.length, interval, loop]);

  const label = done ? doneLabel : (phases[step % phases.length] ?? "");
  const text = done ? label : `${label}…`;
  const measureRef = useRef<HTMLSpanElement>(null);
  const [width, setWidth] = useState<number>();

  useLayoutEffect(() => {
    if (measureRef.current) setWidth(measureRef.current.offsetWidth);
  }, [text]);

  return (
    <div
      aria-live="polite"
      className={cn(
        "inline-flex items-center gap-2 rounded-full border bg-card shadow-xs/5",
        size === "sm" ? "h-7 ps-1.5 pe-3 text-xs" : "h-9 ps-2 pe-3.5 text-sm",
        className,
      )}
      role="status"
    >
      <StatusSpinner done={done} size={size === "sm" ? 14 : 18} />
      <motion.span
        animate={{ width }}
        className="relative inline-flex h-5 items-center overflow-hidden font-medium"
        initial={false}
        transition={reduce ? { duration: 0 } : spring}
      >
        <span aria-hidden className="invisible absolute whitespace-nowrap" ref={measureRef}>
          {text}
        </span>
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
            className="whitespace-nowrap"
            exit={reduce ? { opacity: 0 } : { y: -10, opacity: 0, filter: "blur(2px)" }}
            initial={reduce ? { opacity: 0 } : { y: 10, opacity: 0, filter: "blur(2px)" }}
            key={text}
            transition={{ duration: 0.3, ease: easeOut }}
          >
            {done ? <span className="text-foreground">{text}</span> : <ShimmerText>{text}</ShimmerText>}
          </motion.span>
        </AnimatePresence>
      </motion.span>
    </div>
  );
}

function ShimmerText({ children }: { children: string }) {
  const reduce = useMountedReducedMotion();
  return (
    <motion.span
      animate={reduce ? undefined : { backgroundPosition: ["100% 0%", "-100% 0%"] }}
      className="bg-clip-text text-transparent"
      style={{
        backgroundImage:
          "linear-gradient(90deg, var(--color-muted-foreground) 35%, var(--color-foreground) 50%, var(--color-muted-foreground) 65%)",
        backgroundSize: "200% 100%",
      }}
      transition={{ duration: 1.6, ease: "linear", repeat: Number.POSITIVE_INFINITY }}
    >
      {children}
    </motion.span>
  );
}

export function StatusSpinner({ done = false, size = 18 }: { done?: boolean; size?: number }) {
  const reduce = useMountedReducedMotion();

  return (
    <span aria-hidden className="relative inline-grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <AnimatePresence initial={false} mode="popLayout">
        {done ? (
          <motion.span
            animate={{ scale: 1, opacity: 1 }}
            className="absolute inset-0 grid place-items-center rounded-full bg-success text-white"
            exit={{ scale: 0.7, opacity: 0 }}
            initial={reduce ? { opacity: 0 } : { scale: 0.6, opacity: 0 }}
            key="done"
            transition={{ duration: 0.25, ease: easeOut }}
          >
            <svg
              fill="none"
              height={size * 0.62}
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3.2}
              viewBox="0 0 24 24"
              width={size * 0.62}
            >
              <motion.path
                animate={{ pathLength: 1 }}
                d="M5 12.5 10 17.5 19 7"
                initial={{ pathLength: reduce ? 1 : 0 }}
                transition={{ duration: 0.3, delay: 0.1, ease: "easeOut" }}
              />
            </svg>
          </motion.span>
        ) : (
          <motion.svg
            animate={reduce ? { opacity: 1 } : { opacity: 1, rotate: 360 }}
            className="absolute inset-0"
            exit={{ opacity: 0, scale: 0.7, transition: { duration: 0.15 } }}
            fill="none"
            initial={{ opacity: 0 }}
            key="spin"
            transition={
              reduce
                ? { duration: 0.2 }
                : { rotate: { duration: 0.8, ease: "linear", repeat: Number.POSITIVE_INFINITY }, opacity: { duration: 0.2 } }
            }
            viewBox="0 0 20 20"
          >
            <circle className="stroke-border" cx="10" cy="10" r="8" strokeWidth="2.25" />
            <circle
              className="stroke-foreground"
              cx="10"
              cy="10"
              pathLength={100}
              r="8"
              strokeDasharray="28 100"
              strokeLinecap="round"
              strokeWidth="2.25"
            />
          </motion.svg>
        )}
      </AnimatePresence>
    </span>
  );
}
