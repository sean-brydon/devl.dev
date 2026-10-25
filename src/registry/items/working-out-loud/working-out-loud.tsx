"use client";

import { ChevronDownIcon, GlobeIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// Stays false until mounted so the server render and the first client render match.
function useSafeReducedMotion() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && !!prefers;
}

export interface WorkingSource {
  title: string;
  domain: string;
}

export interface WorkingStep {
  label: string;
  duration?: number;
  sources?: WorkingSource[];
}

export interface WorkingOutLoudProps {
  title?: string;
  steps?: WorkingStep[];
  loop?: boolean;
  defaultOpen?: boolean;
  className?: string;
}

const defaultSteps: WorkingStep[] = [
  { label: "Understanding the question", duration: 1400 },
  {
    label: "Searching the web",
    duration: 3600,
    sources: [
      { title: "Heat pump sizing guide", domain: "northwind.energy" },
      { title: "Cold-climate efficiency study", domain: "fjordlabs.org" },
      { title: "Installer pricing survey 2026", domain: "hearthly.com" },
      { title: "Rebate programs by region", domain: "civicgrid.gov" },
    ],
  },
  { label: "Comparing running costs", duration: 2200 },
  { label: "Writing the answer", duration: 1800 },
];

const spring = { type: "spring", stiffness: 380, damping: 32 } as const;

const easeOut = [0.23, 1, 0.32, 1] as const;
const tints = ["bg-sky-500", "bg-emerald-500", "bg-orange-500", "bg-violet-500", "bg-rose-500"];

export function WorkingOutLoud({
  title = "Thinking",
  steps = defaultSteps,
  loop = false,
  defaultOpen = true,
  className,
}: WorkingOutLoudProps) {
  const reduce = useSafeReducedMotion();
  const panelId = useId();
  const [open, setOpen] = useState(defaultOpen);
  const [active, setActive] = useState(0);
  const [revealed, setRevealed] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number>(0);
  const done = active >= steps.length;

  useEffect(() => {
    if (done) return;
    if (active === 0 && revealed === 0) startRef.current = performance.now();
    const t = setInterval(() => setElapsed(performance.now() - startRef.current), 100);
    return () => clearInterval(t);
  }, [done, active, revealed]);

  useEffect(() => {
    if (done) {
      if (!loop) return;
      const t = setTimeout(() => {
        setActive(0);
        setRevealed(0);
        setElapsed(0);
        startRef.current = performance.now();
      }, 4200);
      return () => clearTimeout(t);
    }
    const step = steps[active];
    const duration = step?.duration ?? 1600;
    const sources = step?.sources ?? [];
    if (sources.length && revealed < sources.length) {
      const t = setTimeout(() => setRevealed((r) => r + 1), duration / (sources.length + 1));
      return () => clearTimeout(t);
    }
    const remaining = sources.length ? duration / (sources.length + 1) : duration;
    const t = setTimeout(() => {
      setActive((a) => a + 1);
      setRevealed(0);
    }, remaining);
    return () => clearTimeout(t);
  }, [active, revealed, done, loop, steps]);

  const seconds = (elapsed / 1000).toFixed(1);
  const sourceCount = steps.reduce(
    (n, s, i) => n + (i < active ? (s.sources?.length ?? 0) : i === active ? revealed : 0),
    0,
  );

  return (
    <div className={cn("w-full max-w-md rounded-2xl border bg-card text-sm shadow-xs/5", className)}>
      <button
        aria-controls={panelId}
        aria-expanded={open}
        className="group/head flex w-full cursor-pointer items-center gap-3 rounded-2xl px-4 py-3 text-start outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => setOpen((o) => !o)}
        type="button"
      >
        <PulseDot done={done} />
        <span className="min-w-0 flex-1">
          <span className="relative block h-5 overflow-hidden font-medium">
            <AnimatePresence initial={false} mode="popLayout">
              <motion.span
                animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                className="block truncate"
                exit={{ y: -12, opacity: 0, filter: "blur(2px)" }}
                initial={{ y: 12, opacity: 0, filter: "blur(2px)" }}
                key={done ? "done" : "working"}
                transition={{ duration: reduce ? 0 : 0.25, ease: easeOut }}
              >
                {done ? `Thought for ${seconds}s` : title}
              </motion.span>
            </AnimatePresence>
          </span>
          <span className="block truncate text-muted-foreground text-xs">
            {done
              ? `${steps.length} steps · ${sourceCount} sources`
              : (steps[active]?.label ?? "")}
          </span>
        </span>
        {!done && (
          <span aria-label={`${seconds} seconds elapsed`} className="min-w-[5ch] text-end font-mono text-muted-foreground text-xs tabular-nums">
            {seconds}s
          </span>
        )}
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          className="grid size-6 place-items-center rounded-md text-muted-foreground transition-colors duration-150 group-hover/head:bg-accent group-hover/head:text-foreground"
          transition={{ duration: reduce ? 0 : 0.2, ease: easeOut }}
        >
          <ChevronDownIcon className="size-4" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            animate={{ height: "auto", opacity: 1 }}
            className="overflow-hidden"
            exit={{ height: 0, opacity: 0 }}
            id={panelId}
            initial={{ height: 0, opacity: 0 }}
            transition={reduce ? { duration: 0 } : spring}
          >
            <ol className="relative mx-4 mb-4 border-t pt-3">
              {steps.map((step, i) => {
                const state = i < active ? "done" : i === active ? "active" : "pending";
                const shown = i < active ? (step.sources?.length ?? 0) : i === active ? revealed : 0;
                return (
                  <li className="relative flex gap-3 pb-3 last:pb-0" key={step.label}>
                    {i < steps.length - 1 && (
                      <span aria-hidden className="absolute start-[8.5px] top-[22px] bottom-px w-px bg-border">
                        <motion.span
                          animate={{ scaleY: i < active ? 1 : 0 }}
                          className="absolute inset-0 origin-top bg-success"
                          initial={false}
                          transition={spring}
                        />
                      </span>
                    )}
                    <StepMark state={state} />
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "leading-5 transition-colors duration-300",
                          state === "pending" ? "text-muted-foreground/70" : "text-foreground",
                          state === "done" && "text-muted-foreground",
                        )}
                      >
                        {step.label}
                      </p>
                      {step.sources && step.sources.length > 0 && (
                        <ul className="flex flex-col">
                          <AnimatePresence initial={false}>
                            {step.sources.slice(0, shown).map((src, si) => (
                              <motion.li
                                animate={{ height: "auto", opacity: 1 }}
                                className="overflow-hidden"
                                initial={reduce ? false : { height: 0, opacity: 0 }}
                                key={src.domain}
                                transition={{ height: spring, opacity: { duration: 0.2, ease: "easeOut" } }}
                              >
                                <motion.div
                                  animate={{ y: 0, filter: "blur(0px)" }}
                                  className="mt-1.5 flex items-center gap-2 rounded-lg bg-muted/60 px-2 py-1.5"
                                  initial={reduce ? false : { y: 6, filter: "blur(2px)" }}
                                  transition={{ duration: 0.3, ease: easeOut }}
                                >
                                <span
                                  className={cn(
                                    "grid size-4 shrink-0 place-items-center rounded-full font-medium text-[9px] text-white uppercase",
                                    tints[si % tints.length],
                                  )}
                                >
                                  {src.domain[0]}
                                </span>
                                <span className="min-w-0 flex-1 truncate text-xs">{src.title}</span>
                                <span className="flex shrink-0 items-center gap-1 text-muted-foreground text-xs">
                                  <GlobeIcon className="size-3" />
                                  {src.domain}
                                </span>
                                </motion.div>
                              </motion.li>
                            ))}
                          </AnimatePresence>
                        </ul>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StepMark({ state }: { state: "done" | "active" | "pending" }) {
  const reduce = useSafeReducedMotion();
  return (
    <span className="relative z-10 mt-px grid size-4.5 shrink-0 place-items-center">
      <span
        className={cn(
          "absolute inset-0 rounded-full border-[1.5px] transition-colors duration-300",
          state === "done" ? "border-success bg-success" : "bg-card",
          state === "active" && "border-border",
          state === "pending" && "border-muted-foreground/35",
        )}
      />
      {state === "active" &&
        (reduce ? (
          <span className="size-1.5 rounded-full bg-foreground" />
        ) : (
          <motion.span
            animate={{ rotate: 360 }}
            className="absolute inset-0 rounded-full border-[1.5px] border-transparent border-t-foreground"
            transition={{ duration: 0.8, ease: "linear", repeat: Number.POSITIVE_INFINITY }}
          />
        ))}
      {state === "done" && (
        <motion.svg
          animate={{ scale: 1 }}
          aria-hidden
          className="relative size-3 text-white"
          fill="none"
          initial={reduce ? false : { scale: 0.7 }}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={3.2}
          transition={{ duration: 0.2, ease: easeOut }}
          viewBox="0 0 24 24"
        >
          <motion.path
            animate={{ pathLength: 1 }}
            d="M5 12.5 10 17.5 19 7"
            initial={{ pathLength: reduce ? 1 : 0 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
          />
        </motion.svg>
      )}
    </span>
  );
}

function PulseDot({ done }: { done: boolean }) {
  const reduce = useSafeReducedMotion();
  return (
    <span aria-hidden className="relative grid size-8 shrink-0 place-items-center rounded-full bg-muted">
      {!done && !reduce && (
        <motion.span
          animate={{ scale: [1, 1.9], opacity: [0.5, 0] }}
          className="absolute inset-1 rounded-full bg-info/40"
          transition={{ duration: 1.6, repeat: Number.POSITIVE_INFINITY, ease: "easeOut" }}
        />
      )}
      <motion.span
        animate={{ scale: done && !reduce ? 1.2 : 1 }}
        className={cn("size-2.5 rounded-full transition-colors duration-300", done ? "bg-success" : "bg-info")}
        transition={{ duration: 0.25, ease: easeOut }}
      />
    </span>
  );
}
