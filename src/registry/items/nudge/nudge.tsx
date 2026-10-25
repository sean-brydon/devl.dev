"use client";

import { CheckIcon, LightbulbIcon, RotateCcwIcon, SparklesIcon, Undo2Icon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface NudgeOption {
  id: string;
  label: string;
  title: string;
  detail?: string;
  confidence: number;
  reasons?: string[];
  result?: string;
}

export interface NudgeProps {
  options: NudgeOption[];
  undoMs?: number;
  onAccept?: (option: NudgeOption) => void;
  onUndo?: (option: NudgeOption) => void;
  className?: string;
}

const spring = { type: "spring", stiffness: 400, damping: 32 } as const;
const press = "transition-[scale,background-color,box-shadow] duration-150 ease-out active:scale-[0.97]";

function level(c: number) {
  if (c >= 0.8) return { label: "High confidence", bar: "bg-success", text: "text-success-foreground" };
  if (c >= 0.55) return { label: "Fair confidence", bar: "bg-warning", text: "text-warning-foreground" };
  return { label: "Low confidence", bar: "bg-muted-foreground", text: "text-muted-foreground" };
}

function RollingPercent({ value }: { value: number }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    if (reduce) {
      setShown(value);
      return;
    }
    const start = from.current;
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / 500);
      const e = 1 - (1 - p) ** 3;
      setShown(Math.round(start + (value - start) * e));
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      from.current = value;
    };
  }, [value, reduce]);
  return <span className="tabular-nums">{shown}%</span>;
}

function ConfidenceMeter({ value }: { value: number }) {
  const reduce = useReducedMotion();
  const l = level(value);
  const bars = 5;
  const filled = Math.max(1, Math.round(value * bars));
  return (
    <div className="flex items-center gap-2.5">
      <div aria-hidden className="flex h-4 items-end gap-[3px]">
        {Array.from({ length: bars }, (_, i) => (
          <span className="relative w-[5px] overflow-hidden rounded-full bg-muted" key={i} style={{ height: 6 + i * 2.5 }}>
            <motion.span
              animate={{ scaleY: i < filled ? 1 : 0 }}
              className={cn("absolute inset-0 origin-bottom rounded-full transition-colors duration-300", l.bar)}
              initial={false}
              transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 22, delay: i * 0.04 }}
            />
          </span>
        ))}
      </div>
      <span className={cn("font-medium text-xs transition-colors", l.text)}>
        {l.label} · <RollingPercent value={Math.round(value * 100)} />
      </span>
    </div>
  );
}

export function Nudge({ options, undoMs = 5000, onAccept, onUndo, className }: NudgeProps) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const [phase, setPhase] = useState<"open" | "accepted" | "settled" | "dismissed">("open");
  const current = options[index];
  const innerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | "auto">("auto");

  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setHeight(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (phase !== "accepted") return;
    const t = setTimeout(() => setPhase("settled"), undoMs);
    return () => clearTimeout(t);
  }, [phase, undoMs]);

  const pick = (i: number) => {
    if (i === index) return;
    setDir(i > index ? 1 : -1);
    setIndex(i);
  };

  return (
    <section
      aria-label="Suggestion"
      className={cn(
        "relative w-full max-w-[400px] overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-xs/5",
        className,
      )}
    >
      <motion.div
        animate={{ height }}
        initial={false}
        transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 320, damping: 32 }}
      >
      <div ref={innerRef}>
      <AnimatePresence initial={false} mode="popLayout">
        {phase === "open" ? (
          <motion.div
            animate={{ opacity: 1, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97, filter: "blur(4px)" }}
            initial={reduce ? false : { opacity: 0, scale: 0.97 }}
            key="open"
            transition={spring}
          >
            <header className="flex items-center gap-2 px-4 pt-4 text-xs">
              <span className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <SparklesIcon className="size-3" />
              </span>
              <span className="font-medium">{index === 0 ? "Suggested" : "Alternative"}</span>
              <span className="ms-auto">
                <ConfidenceMeter value={current.confidence} />
              </span>
            </header>

            <motion.div className="relative overflow-hidden px-4 pt-3" layout={!reduce} transition={spring}>
              <AnimatePresence custom={dir} initial={false} mode="popLayout">
                <motion.div
                  animate={{ x: 0, opacity: 1, filter: "blur(0px)" }}
                  custom={dir}
                  exit="exit"
                  initial={reduce ? false : { x: dir * 40, opacity: 0, filter: "blur(4px)" }}
                  key={current.id}
                  transition={spring}
                  variants={{
                    exit: (d: number) =>
                      reduce ? { opacity: 0 } : { x: d * -40, opacity: 0, filter: "blur(4px)", transition: { duration: 0.18 } },
                  }}
                >
                  <h2 className="text-balance font-medium text-base">{current.title}</h2>
                  {current.detail && <p className="mt-1 text-pretty text-muted-foreground text-sm">{current.detail}</p>}
                  {current.reasons && current.reasons.length > 0 && (
                    <ul className="mt-3 space-y-1.5">
                      {current.reasons.map((r, i) => (
                        <motion.li
                          animate={{ opacity: 1, y: 0 }}
                          className="flex gap-2 text-sm"
                          initial={reduce ? false : { opacity: 0, y: 4 }}
                          key={r}
                          transition={{ ...spring, delay: reduce ? 0 : 0.06 + i * 0.05 }}
                        >
                          <LightbulbIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                          <span className="text-foreground/90">{r}</span>
                        </motion.li>
                      ))}
                    </ul>
                  )}
                </motion.div>
              </AnimatePresence>
            </motion.div>

            {options.length > 1 && (
              <motion.div className="px-4 pt-4" layout={reduce ? false : "position"} transition={spring}>
                <p className="mb-1.5 text-muted-foreground text-xs">Options</p>
                <div aria-label="Options" className="flex flex-wrap gap-1.5" role="radiogroup">
                  {options.map((o, i) => {
                    const active = i === index;
                    return (
                      <button
                        aria-checked={active}
                        className={cn(
                          "relative flex h-7 cursor-pointer items-center gap-1.5 rounded-full border px-2.5 text-xs outline-none transition-[color,background-color,border-color,scale] duration-150 ease-out after:absolute after:-inset-y-1 after:inset-x-0 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]",
                          active
                            ? "border-foreground/20 bg-accent font-medium text-foreground"
                            : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                        )}
                        key={o.id}
                        onClick={() => pick(i)}
                        role="radio"
                        type="button"
                      >
                        <span className={cn("size-1.5 rounded-full", level(o.confidence).bar)} />
                        {o.label}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            <motion.footer
              className="flex items-center justify-end gap-2 p-4"
              layout={reduce ? false : "position"}
              transition={spring}
            >
              <Button className={press} onClick={() => setPhase("dismissed")} size="sm" variant="ghost">
                Not now
              </Button>
              <Button
                className={press}
                onClick={() => {
                  setPhase("accepted");
                  onAccept?.(current);
                }}
                size="sm"
              >
                <CheckIcon />
                Accept
              </Button>
            </motion.footer>
          </motion.div>
        ) : (
          <motion.div
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-3 p-4"
            initial={reduce ? false : { opacity: 0, scale: 0.97 }}
            key="after"
            transition={spring}
          >
            <motion.span
              animate={{ scale: 1, rotate: 0 }}
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-full",
                phase === "dismissed" ? "bg-muted text-muted-foreground" : "bg-success/12 text-success-foreground",
              )}
              initial={reduce ? false : { scale: 0.7, rotate: -20 }}
              transition={{ type: "spring", stiffness: 420, damping: 22 }}
            >
              {phase === "dismissed" ? <RotateCcwIcon className="size-4" /> : <CheckIcon className="size-4" />}
            </motion.span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-sm">
                {phase === "dismissed" ? "Suggestion dismissed" : current.result ?? "Done"}
              </p>
              <p className="truncate text-muted-foreground text-xs">
                {phase === "dismissed" ? "We'll suggest something else later." : current.title}
              </p>
            </div>
            {phase === "accepted" ? (
              <Button
                className={cn("relative overflow-hidden", press)}
                onClick={() => {
                  setPhase("open");
                  onUndo?.(current);
                }}
                size="sm"
                variant="outline"
              >
                <Undo2Icon />
                Undo
                <motion.span
                  animate={{ scaleX: 0 }}
                  aria-hidden
                  className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-foreground/30"
                  initial={{ scaleX: 1 }}
                  transition={{ duration: undoMs / 1000, ease: "linear" }}
                />
              </Button>
            ) : (
              <Button
                aria-label="Show suggestion again"
                className={press}
                onClick={() => {
                  setIndex(0);
                  setPhase("open");
                }}
                size="icon-sm"
                variant="ghost"
              >
                <RotateCcwIcon />
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      </div>
      </motion.div>
    </section>
  );
}
