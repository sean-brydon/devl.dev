"use client";

import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  RefreshCwIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  Volume2Icon,
  XIcon,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type MouseEvent, type ReactElement, type ReactNode, useEffect, useRef, useState } from "react";
import { Tooltip, TooltipPopup, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type Vote = "up" | "down";

export interface ReplyToolbarProps {
  text?: string;
  initialVersions?: number;
  maxVersions?: number;
  reasons?: Record<Vote, string[]>;
  speakDuration?: number;
  onRegenerate?: () => void;
  onVersionChange?: (index: number, total: number) => void;
  onFeedback?: (vote: Vote | null, reason?: string) => void;
  onSpeak?: (speaking: boolean) => void;
  className?: string;
}

const defaultReasons: Record<Vote, string[]> = {
  up: ["Accurate", "Clear", "Saved time"],
  down: ["Wrong", "Too long", "Missed the point"],
};

const spring = { type: "spring", stiffness: 500, damping: 34 } as const;
const easeOut = [0.23, 1, 0.32, 1] as const;
const press = "transition-[background-color,color,opacity,scale] duration-150 ease-out active:scale-[0.97]";
const btn = cn(
  "relative grid size-8 place-items-center rounded-lg text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring aria-pressed:text-foreground",
  press,
);
const smallBtn = cn(
  "relative grid size-7 place-items-center rounded-md outline-none after:absolute after:-inset-0.5 hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40",
  press,
);

export function ReplyToolbar({
  text = "",
  initialVersions = 1,
  maxVersions = 5,
  reasons = defaultReasons,
  speakDuration = 4200,
  onRegenerate,
  onVersionChange,
  onFeedback,
  onSpeak,
  className,
}: ReplyToolbarProps) {
  const reduce = useReducedMotion();
  const [copied, setCopied] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [spins, setSpins] = useState(0);
  const [total, setTotal] = useState(initialVersions);
  const [index, setIndex] = useState(initialVersions - 1);
  const [vote, setVote] = useState<Vote | null>(null);
  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  };
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);

  useEffect(() => {
    if (!speaking) return;
    const t = setTimeout(() => {
      setSpeaking(false);
      onSpeak?.(false);
    }, speakDuration);
    return () => clearTimeout(t);
  }, [speaking, speakDuration, onSpeak]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
    setCopied(true);
  };

  const regenerate = () => {
    if (spinning || total >= maxVersions) return;
    setSpinning(true);
    setSpins((s) => s + 1);
    onRegenerate?.();
    later(
      () => {
        const next = total + 1;
        setSpinning(false);
        setTotal(next);
        setIndex(next - 1);
        onVersionChange?.(next - 1, next);
      },
      reduce ? 0 : 900,
    );
  };

  const go = (dir: -1 | 1) => {
    const next = Math.min(total - 1, Math.max(0, index + dir));
    if (next === index) return;
    setIndex(next);
    onVersionChange?.(next, total);
  };

  const castVote = (v: Vote) => {
    const next = vote === v ? null : v;
    setVote(next);
    setReason(null);
    setAsking(next !== null);
    onFeedback?.(next);
  };

  const pickReason = (r: string) => {
    setReason(r);
    onFeedback?.(vote, r);
    later(() => setAsking(false), 1400);
  };

  return (
    <TooltipProvider closeDelay={0} delay={500} timeout={400}>
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="-ms-2 flex items-center gap-0.5">
        <Tip label={copied ? "Copied" : "Copy"}>
          <button aria-label="Copy message" className={btn} onClick={copy} type="button">
            <AnimatePresence initial={false} mode="popLayout">
              <motion.span
                animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
                className="grid"
                exit={{ scale: 0.6, opacity: 0, filter: "blur(2px)" }}
                initial={{ scale: 0.6, opacity: 0, filter: "blur(2px)" }}
                key={copied ? "check" : "copy"}
                transition={{ duration: 0.18, ease: easeOut }}
              >
                {copied ? (
                  <svg
                    aria-hidden
                    className="size-4 text-success-foreground"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    viewBox="0 0 24 24"
                  >
                    <motion.path
                      animate={{ pathLength: 1 }}
                      d="M5 12.5 10 17.5 19 7"
                      initial={{ pathLength: reduce ? 1 : 0 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                    />
                  </svg>
                ) : (
                  <CopyIcon className="size-4" />
                )}
              </motion.span>
            </AnimatePresence>
          </button>
        </Tip>

        <Tip label={total >= maxVersions ? "Version limit reached" : "Regenerate"}>
          <button
            aria-busy={spinning}
            aria-label="Regenerate response"
            className={cn(btn, "disabled:pointer-events-none disabled:opacity-50")}
            disabled={total >= maxVersions && !spinning}
            onClick={regenerate}
            type="button"
          >
            <motion.span
              animate={{ rotate: spins * 360 }}
              className="grid"
              transition={reduce ? { duration: 0 } : { duration: 0.8, ease: "easeInOut" }}
            >
              <RefreshCwIcon className="size-4" />
            </motion.span>
          </button>
        </Tip>

        <AnimatePresence initial={false}>
          {total > 1 && (
            <motion.div
              animate={{ width: "auto", opacity: 1 }}
              className="flex items-center overflow-hidden"
              exit={{ width: 0, opacity: 0 }}
              initial={{ width: 0, opacity: 0 }}
              transition={reduce ? { duration: 0 } : spring}
            >
              <div className="flex items-center rounded-lg text-muted-foreground text-xs">
                <button
                  aria-label="Previous version"
                  className={smallBtn}
                  disabled={index === 0}
                  onClick={() => go(-1)}
                  type="button"
                >
                  <ChevronLeftIcon className="size-3.5" />
                </button>
                <span aria-live="polite" className="flex min-w-8 items-center justify-center font-mono tabular-nums">
                  <span className="relative inline-flex h-4 w-[1ch] justify-center overflow-hidden">
                    <AnimatePresence initial={false} mode="popLayout">
                      <motion.span
                        animate={{ y: 0, opacity: 1 }}
                        exit={reduce ? { opacity: 0 } : { y: -10, opacity: 0 }}
                        initial={reduce ? { opacity: 0 } : { y: 10, opacity: 0 }}
                        key={index}
                        transition={{ duration: 0.2, ease: easeOut }}
                      >
                        {index + 1}
                      </motion.span>
                    </AnimatePresence>
                  </span>
                  /{total}
                </span>
                <button
                  aria-label="Next version"
                  className={smallBtn}
                  disabled={index === total - 1}
                  onClick={() => go(1)}
                  type="button"
                >
                  <ChevronRightIcon className="size-3.5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <span aria-hidden className="mx-1 h-4 w-px bg-border" />

        {(["up", "down"] as const).map((v) => (
          <Tip key={v} label={v === "up" ? "Good response" : "Bad response"}>
            <ThumbButton on={vote === v} onClick={() => castVote(v)} vote={v} />
          </Tip>
        ))}

        <Tip label={speaking ? "Stop" : "Read aloud"}>
          <button
            aria-label={speaking ? "Stop reading" : "Read aloud"}
            aria-pressed={speaking}
            className={btn}
            onClick={() => {
              setSpeaking((s) => !s);
              onSpeak?.(!speaking);
            }}
            type="button"
          >
            <AnimatePresence initial={false} mode="popLayout">
              {speaking ? (
                <motion.span
                  animate={{ opacity: 1, scale: 1 }}
                  aria-hidden
                  className="flex h-4 items-center gap-[2px]"
                  exit={{ opacity: 0, scale: 0.6 }}
                  initial={{ opacity: 0, scale: 0.6 }}
                  key="eq"
                  transition={{ duration: 0.18, ease: easeOut }}
                >
                  {[0.55, 0.9, 0.7, 0.45].map((d, i) => (
                    <motion.span
                      animate={reduce ? { scaleY: 0.6 } : { scaleY: [0.3, 1, 0.45, 0.85, 0.3] }}
                      className="h-3.5 w-[3px] rounded-full bg-info"
                      key={d}
                      transition={{ duration: d + 0.35, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY, delay: i * 0.08 }}
                    />
                  ))}
                </motion.span>
              ) : (
                <motion.span
                  animate={{ opacity: 1, scale: 1 }}
                  className="grid"
                  exit={{ opacity: 0, scale: 0.6 }}
                  initial={{ opacity: 0, scale: 0.6 }}
                  key="vol"
                  transition={{ duration: 0.18, ease: easeOut }}
                >
                  <Volume2Icon className="size-4" />
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </Tip>
      </div>

      <AnimatePresence initial={false}>
        {asking && vote && (
          <motion.div
            animate={{ height: "auto", opacity: 1 }}
            className="overflow-hidden"
            exit={{ height: 0, opacity: 0 }}
            initial={{ height: 0, opacity: 0 }}
            transition={reduce ? { duration: 0 } : spring}
          >
            <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-xl border bg-card px-2.5 py-1.5 text-xs">
              <AnimatePresence initial={false} mode="popLayout">
                {reason ? (
                  <motion.span
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-1.5 text-muted-foreground"
                    initial={{ opacity: 0, y: 4 }}
                    key="thanks"
                    transition={{ duration: 0.2, ease: easeOut }}
                  >
                    <CheckIcon className="size-3.5 text-success-foreground" />
                    Thanks, noted “{reason}”.
                  </motion.span>
                ) : (
                  <motion.div
                    className="flex flex-1 items-center gap-2"
                    exit={{ opacity: 0, y: -4 }}
                    key="ask"
                    transition={{ duration: 0.15, ease: "easeOut" }}
                  >
                    <div className="flex flex-1 flex-wrap items-center gap-1.5 py-0.5">
                    <span className="me-0.5 text-muted-foreground">{vote === "up" ? "What worked?" : "What went wrong?"}</span>
                    {reasons[vote].map((r, i) => (
                      <motion.button
                        animate={{ opacity: 1, scale: 1 }}
                        className={cn(
                          "relative h-6 rounded-full border bg-background px-2 outline-none after:absolute after:-inset-1 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
                          press,
                        )}
                        initial={reduce ? false : { opacity: 0, scale: 0.95 }}
                        key={r}
                        onClick={() => pickReason(r)}
                        transition={{ duration: 0.2, ease: easeOut, delay: 0.05 + i * 0.03 }}
                        type="button"
                      >
                        {r}
                      </motion.button>
                    ))}
                    </div>
                    <button
                      aria-label="Dismiss"
                      className={cn(
                        "relative grid size-6 shrink-0 place-items-center rounded-md text-muted-foreground outline-none after:absolute after:-inset-1 hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
                        press,
                      )}
                      onClick={() => setAsking(false)}
                      type="button"
                    >
                      <XIcon className="size-3.5" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </TooltipProvider>
  );
}

function Tip({ label, children }: { label: ReactNode; children: ReactElement }) {
  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipPopup>{label}</TooltipPopup>
    </Tooltip>
  );
}

function ThumbButton({
  vote,
  on,
  onClick,
  ...props
}: { vote: Vote; on: boolean; onClick: (event: MouseEvent<HTMLButtonElement>) => void } & Record<string, unknown>) {
  const reduce = useReducedMotion();
  const [burst, setBurst] = useState(0);
  const Icon = vote === "up" ? ThumbsUpIcon : ThumbsDownIcon;
  const tint = vote === "up" ? "bg-success" : "bg-destructive";

  return (
    <button
      {...props}
      aria-label={vote === "up" ? "Good response" : "Bad response"}
      aria-pressed={on}
      className={btn}
      onClick={(event) => {
        if (!on) setBurst((b) => b + 1);
        onClick(event);
      }}
      type="button"
    >
      <motion.span
        animate={on && !reduce ? { scale: [1, 1.25, 0.96, 1], rotate: vote === "up" ? [0, -12, 3, 0] : [0, 12, -3, 0] } : {}}
        className="grid"
        key={on ? `on-${burst}` : "off"}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <Icon className={cn("size-4", on && "fill-current")} />
      </motion.span>
      {!reduce && burst > 0 && on && (
        <span aria-hidden className="pointer-events-none absolute inset-0" key={burst}>
          {Array.from({ length: 6 }, (_, i) => {
            const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
            return (
              <motion.span
                animate={{ x: Math.cos(angle) * 15, y: Math.sin(angle) * 15, scale: 0, opacity: 0 }}
                className={cn("absolute top-1/2 left-1/2 -mt-0.5 -ml-0.5 size-1 rounded-full", tint)}
                initial={{ x: 0, y: 0, scale: 1.2, opacity: 1 }}
                key={i}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            );
          })}
        </span>
      )}
    </button>
  );
}
