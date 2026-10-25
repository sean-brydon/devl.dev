"use client";

import { PauseIcon, PlayIcon, RotateCcwIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface MilestoneStep {
  id: string;
  title: string;
  description?: string;
}

export interface MilestoneRailProps {
  steps: MilestoneStep[];
  title?: string;
  initialDone?: number;
  autoPlay?: boolean;
  stepMs?: number;
  onChange?: (done: number) => void;
  className?: string;
}

const ROW = 60;
const NODE = 22;
const spring = { type: "spring", stiffness: 380, damping: 30 } as const;
const iconButton = "transition-[scale,background-color] duration-150 ease-out after:absolute after:-inset-1 active:scale-[0.97]";

function Percent({ value }: { value: number }) {
  const reduce = useReducedMotion();
  const digits = String(value).split("");
  return (
    <span aria-hidden className="inline-flex overflow-hidden tabular-nums">
      {digits.map((d, i) => (
        <span className="relative inline-flex h-[1.2em] w-[1ch] justify-center overflow-hidden" key={digits.length - i}>
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span
              animate={{ y: 0, opacity: 1 }}
              exit={reduce ? { opacity: 0 } : { y: "-100%", opacity: 0 }}
              initial={reduce ? { opacity: 0 } : { y: "100%", opacity: 0 }}
              key={d}
              transition={spring}
            >
              {d}
            </motion.span>
          </AnimatePresence>
        </span>
      ))}
      %
    </span>
  );
}

export function MilestoneRail({
  steps,
  title = "Getting started",
  initialDone = 0,
  autoPlay = false,
  stepMs = 1400,
  onChange,
  className,
}: MilestoneRailProps) {
  const reduce = useReducedMotion();
  const [done, setDone] = useState(initialDone);
  const [playing, setPlaying] = useState(autoPlay);
  const total = steps.length;
  const complete = done >= total;
  const pct = Math.round((Math.min(done, total) / total) * 100);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  useEffect(() => {
    onChangeRef.current?.(done);
  }, [done]);

  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => setDone((d) => (d >= total ? 0 : d + 1)), done >= total ? stepMs * 1.8 : stepMs);
    return () => clearTimeout(t);
  }, [playing, done, total, stepMs]);

  const activeIdx = Math.min(done, total - 1);
  const fillTo = activeIdx * ROW;

  return (
    <section
      aria-label={title}
      className={cn("w-full max-w-[380px] rounded-2xl border bg-card text-card-foreground shadow-xs/5", className)}
    >
      <header className="p-4 pb-3">
        <div className="flex items-center gap-2">
          <h2 className="font-medium text-sm">{title}</h2>
          <AnimatePresence initial={false}>
            {complete && (
              <motion.span
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-full bg-success/12 px-1.5 py-px font-medium text-[11px] text-success-foreground"
                exit={{ opacity: 0, scale: 0.8 }}
                initial={reduce ? false : { opacity: 0, scale: 0.6 }}
                transition={{ type: "spring", stiffness: 500, damping: 18 }}
              >
                All done
              </motion.span>
            )}
          </AnimatePresence>
          <div className="ms-auto flex items-center gap-0.5">
            <Button
              aria-label={playing ? "Pause demo" : "Play demo"}
              className={iconButton}
              onClick={() => setPlaying((p) => !p)}
              size="icon-xs"
              variant="ghost"
            >
              {playing ? <PauseIcon /> : <PlayIcon />}
            </Button>
            <Button aria-label="Restart" className={iconButton} onClick={() => setDone(0)} size="icon-xs" variant="ghost">
              <RotateCcwIcon />
            </Button>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div
            aria-label="Progress"
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={pct}
            className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
            role="progressbar"
          >
            <motion.div
              animate={{ x: `${pct - 100}%` }}
              className={cn(
                "absolute inset-0 rounded-full transition-colors duration-500",
                complete ? "bg-success" : "bg-primary",
              )}
              initial={false}
              transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 140, damping: 24 }}
            />
          </div>
          <span className="w-10 text-right font-medium text-xs">
            <Percent value={pct} />
            <span className="sr-only">{pct}%</span>
          </span>
        </div>
      </header>

      <div className="relative px-4 pb-3">
        <div
          aria-hidden
          className="pointer-events-none absolute top-0 left-4"
          style={{ width: NODE, height: total * ROW }}
        >
          <span
            className="absolute left-1/2 w-0.5 -translate-x-1/2 rounded-full bg-border"
            style={{ top: ROW / 2, height: (total - 1) * ROW }}
          />
          <motion.span
            animate={{ scaleY: total > 1 ? fillTo / ((total - 1) * ROW) : 0 }}
            className={cn(
              "absolute left-1/2 w-0.5 -translate-x-1/2 origin-top rounded-full transition-colors duration-500",
              complete ? "bg-success" : "bg-primary",
            )}
            initial={false}
            style={{ top: ROW / 2, height: (total - 1) * ROW }}
            transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 170, damping: 26 }}
          />
        </div>

        <ol className="relative">
          {steps.map((s, i) => {
            const isDone = i < done;
            const isActive = i === done;
            return (
              <li key={s.id} style={{ height: ROW }}>
                <button
                  aria-current={isActive ? "step" : undefined}
                  aria-label={`${s.title}${isDone ? ", done" : isActive ? ", in progress" : ""}. Set progress here.`}
                  className="group/step flex h-full w-full cursor-pointer items-center gap-3 rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => {
                    setPlaying(false);
                    setDone(isDone && done === i + 1 ? i : i + 1);
                  }}
                  type="button"
                >
                  <span
                    className="relative flex shrink-0 items-center justify-center rounded-full"
                    style={{ width: NODE, height: NODE }}
                  >
                    <span
                      className={cn(
                        "absolute inset-0 rounded-full border-2 bg-card transition-colors duration-300",
                        isActive ? "border-primary" : "border-muted-foreground/30 group-hover/step:border-foreground/50",
                      )}
                    />
                    {isActive && (
                      <motion.span
                        animate={reduce ? { opacity: 0 } : { scale: [1, 1.7], opacity: [0.25, 0] }}
                        className="absolute inset-0 rounded-full bg-primary opacity-0"
                        transition={reduce ? { duration: 0 } : { duration: 1.4, repeat: Number.POSITIVE_INFINITY, ease: "easeOut" }}
                      />
                    )}
                    <AnimatePresence initial={false}>
                      {isActive && (
                        <motion.span
                          animate={{ scale: 1, opacity: 1 }}
                          className="relative size-2 rounded-full bg-primary"
                          exit={{ scale: 0.5, opacity: 0, transition: { duration: 0.12 } }}
                          initial={reduce ? { opacity: 0 } : { scale: 0.5, opacity: 0 }}
                          transition={spring}
                        />
                      )}
                    </AnimatePresence>
                    <motion.span
                      animate={{ scale: isDone ? 1 : 0.4, opacity: isDone ? 1 : 0 }}
                      className={cn(
                        "absolute inset-0 rounded-full transition-colors duration-500",
                        complete ? "bg-success" : "bg-primary",
                      )}
                      initial={false}
                      transition={
                        reduce ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 24, delay: isDone ? 0.12 : 0 }
                      }
                    />
                    <svg
                      aria-hidden
                      className={cn("absolute size-3", complete ? "text-white" : "text-primary-foreground")}
                      fill="none"
                      viewBox="0 0 16 16"
                    >
                      <motion.path
                        animate={{ pathLength: isDone ? 1 : 0, opacity: isDone ? 1 : 0 }}
                        d="M3.5 8.5l3 3 6-7"
                        initial={false}
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.6}
                        transition={reduce ? { duration: 0 } : { duration: 0.25, delay: isDone ? 0.22 : 0, ease: "easeOut" }}
                      />
                    </svg>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block truncate font-medium text-sm transition-colors duration-300",
                        isDone ? "text-muted-foreground" : isActive ? "text-foreground" : "text-foreground/70",
                      )}
                    >
                      {s.title}
                    </span>
                    {s.description && (
                      <span className="block truncate text-muted-foreground text-xs">{s.description}</span>
                    )}
                  </span>
                  <AnimatePresence initial={false} mode="popLayout">
                    {isActive && (
                      <motion.span
                        animate={{ opacity: 1, x: 0 }}
                        className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                        exit={{ opacity: 0, x: 6 }}
                        initial={reduce ? false : { opacity: 0, x: 6 }}
                        transition={spring}
                      >
                        Up next
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
