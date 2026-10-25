"use client";

import { type HTMLMotionProps, motion, useReducedMotion } from "motion/react";
import { type ReactNode, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const FALL = 0.24;
const LAND = 0.32;

// Opaque on purpose: flaps stack, so an alpha token would show the layers through.
const tile =
  "bg-[color-mix(in_srgb,var(--color-foreground)_3%,var(--color-card))] dark:bg-[color-mix(in_srgb,var(--color-foreground)_7%,var(--color-card))]";

type HalfProps = HTMLMotionProps<"span"> & { side: "top" | "bottom"; children: ReactNode };

function Half({ side, children, className, ...props }: HalfProps) {
  return (
    <motion.span
      className={cn(
        "absolute inset-x-0 h-1/2 overflow-hidden backface-hidden",
        tile,
        side === "top" ? "top-0 origin-bottom rounded-t-[inherit]" : "bottom-0 origin-top rounded-b-[inherit]",
        className,
      )}
      {...props}
    >
      <span className={cn("absolute inset-x-0 grid h-[200%] place-items-center leading-none", side === "top" ? "top-0" : "bottom-0")}>
        {children}
      </span>
    </motion.span>
  );
}

export interface FlipDigitProps {
  value: string;
  className?: string;
}

export function FlipDigit({ value, className }: FlipDigitProps) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState({ current: value, previous: value, flip: 0 });

  if (shown.current !== value) setShown((s) => ({ current: value, previous: s.current, flip: s.flip + 1 }));

  const { current, previous, flip } = shown;
  const flipping = !reduce && current !== previous;

  return (
    <span
      className={cn(
        "relative inline-block h-[1.45em] w-[1.06em] rounded-[0.16em] font-mono font-medium tabular-nums shadow-xs/5 [perspective:4.5em]",
        className,
      )}
    >
      <Half side="top">{current}</Half>
      <Half side="bottom">{flipping ? previous : current}</Half>
      {flipping && (
        <>
          <motion.span
            animate={{ opacity: [0, 0.22] }}
            className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 rounded-b-[inherit] bg-black"
            key={`shade-${flip}`}
            transition={{ duration: FALL, ease: "easeIn" }}
          />
          <Half
            animate={{ rotateX: -90 }}
            initial={{ rotateX: 0 }}
            key={`top-${flip}`}
            side="top"
            transition={{ duration: FALL, ease: [0.55, 0, 1, 0.45] }}
          >
            {previous}
            <motion.span
              animate={{ opacity: 0.4 }}
              className="absolute inset-0 bg-black"
              initial={{ opacity: 0 }}
              transition={{ duration: FALL, ease: "easeIn" }}
            />
          </Half>
          <Half
            animate={{ rotateX: [90, 0, 6, 0] }}
            initial={{ rotateX: 90 }}
            key={`bottom-${flip}`}
            onAnimationComplete={() => setShown((s) => (s.flip === flip ? { ...s, previous: s.current } : s))}
            side="bottom"
            transition={{
              delay: FALL,
              duration: LAND,
              times: [0, 0.55, 0.78, 1],
              ease: [
                [0.5, 0, 1, 0.6],
                [0, 0, 0.4, 1],
                [0.6, 0, 1, 1],
              ],
            }}
          >
            {current}
            <motion.span
              animate={{ opacity: 0 }}
              className="absolute inset-0 bg-black"
              initial={{ opacity: 0.3 }}
              transition={{ delay: FALL, duration: LAND * 0.55, ease: "easeOut" }}
            />
          </Half>
        </>
      )}
      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-background/80" />
      <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-border ring-inset" />
    </span>
  );
}

export interface FlipClockUnit {
  label: string;
  value: number;
  digits?: number;
}

export interface FlipClockProps {
  units: FlipClockUnit[];
  label: string;
  className?: string;
}

export function FlipClock({ units, label, className }: FlipClockProps) {
  return (
    <div className={cn("flex items-start gap-[0.3em] text-[40px]", className)} role="timer">
      <span className="sr-only">{label}</span>
      {units.map((u, i) => (
        <div aria-hidden className="contents" key={u.label}>
          {i > 0 && (
            <span className="flex h-[1.45em] flex-col justify-center gap-[0.22em] px-[0.04em]">
              <span className="size-[0.1em] rounded-full bg-muted-foreground/50" />
              <span className="size-[0.1em] rounded-full bg-muted-foreground/50" />
            </span>
          )}
          <div className="flex flex-col items-center gap-2">
            <div className="flex gap-[0.08em]">
              {String(u.value)
                .padStart(u.digits ?? 2, "0")
                .split("")
                .map((d, j) => (
                  <FlipDigit key={j} value={d} />
                ))}
            </div>
            <span className="text-muted-foreground text-xs">{u.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function useCountdown(target: number | null) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    let id: ReturnType<typeof setTimeout>;
    const tick = () => {
      setNow(Date.now());
      id = setTimeout(tick, 1000 - (Date.now() % 1000));
    };
    id = setTimeout(tick, 1000 - (Date.now() % 1000));
    return () => clearTimeout(id);
  }, []);
  const left = target && now ? Math.max(0, Math.floor((target - now) / 1000)) : 0;
  return {
    ready: now !== null && target !== null,
    days: Math.floor(left / 86400),
    hours: Math.floor((left % 86400) / 3600),
    minutes: Math.floor((left % 3600) / 60),
    seconds: left % 60,
  };
}
