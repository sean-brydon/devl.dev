"use client";

import { CheckIcon, ChevronDownIcon, EyeIcon, SearchIcon, WrenchIcon, XIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type IncidentStage = "investigating" | "identified" | "monitoring" | "resolved";

export interface IncidentUpdate {
  id: string;
  stage: IncidentStage;
  at: string;
  message: string;
}

export interface IncidentBannerProps {
  title: string;
  updates: IncidentUpdate[];
  affected?: string[];
  timezone?: string;
  defaultExpanded?: boolean;
  dismissible?: boolean;
  onDismiss?: () => void;
  action?: ReactNode;
  className?: string;
}

function useHeight<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [height, setHeight] = useState<number | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setHeight(entry.borderBoxSize[0]?.blockSize ?? el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, height] as const;
}

const STAGES: IncidentStage[] = ["investigating", "identified", "monitoring", "resolved"];

const TONE: Record<
  IncidentStage,
  { label: string; icon: ReactNode; border: string; tint: string; chip: string; dot: string; ring: string; fill: string }
> = {
  investigating: {
    label: "Investigating",
    icon: <SearchIcon />,
    border: "border-destructive/30",
    tint: "bg-destructive/[0.04] dark:bg-destructive/[0.08]",
    chip: "bg-destructive/10 text-destructive-foreground dark:bg-destructive/16",
    dot: "bg-destructive text-white",
    ring: "bg-destructive",
    fill: "bg-destructive",
  },
  identified: {
    label: "Identified",
    icon: <WrenchIcon />,
    border: "border-warning/35",
    tint: "bg-warning/[0.05] dark:bg-warning/[0.08]",
    chip: "bg-warning/12 text-warning-foreground dark:bg-warning/16",
    dot: "bg-warning text-white",
    ring: "bg-warning",
    fill: "bg-warning",
  },
  monitoring: {
    label: "Monitoring",
    icon: <EyeIcon />,
    border: "border-info/30",
    tint: "bg-info/[0.045] dark:bg-info/[0.09]",
    chip: "bg-info/10 text-info-foreground dark:bg-info/16",
    dot: "bg-info text-white",
    ring: "bg-info",
    fill: "bg-info",
  },
  resolved: {
    label: "Resolved",
    icon: <CheckIcon />,
    border: "border-success/30",
    tint: "bg-success/[0.045] dark:bg-success/[0.08]",
    chip: "bg-success/10 text-success-foreground dark:bg-success/16",
    dot: "bg-success text-white",
    ring: "bg-success",
    fill: "bg-success",
  },
};

const minutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
const span = (a: string, b: string) => {
  const d = (minutes(b) - minutes(a) + 1440) % 1440;
  return d >= 60 ? `${Math.floor(d / 60)}h ${d % 60}m` : `${d}m`;
};

export function IncidentBanner({
  title,
  updates,
  affected = [],
  timezone = "UTC",
  defaultExpanded = false,
  dismissible = true,
  onDismiss,
  action,
  className,
}: IncidentBannerProps) {
  const reduce = useReducedMotion();
  const panelId = useId();
  const [open, setOpen] = useState(defaultExpanded);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const latest = updates[updates.length - 1];
  const stage = latest?.stage ?? "investigating";
  const tone = TONE[stage];
  const step = STAGES.indexOf(stage);
  const first = updates[0];
  const resolved = stage === "resolved";
  const spring = reduce ? { duration: 0 } : { type: "spring" as const, stiffness: 380, damping: 36 };

  return (
    <section
      aria-label={`Incident: ${title}`}
      aria-live="polite"
      className={cn(
        "w-full max-w-[520px] overflow-hidden rounded-2xl border text-card-foreground shadow-xs/5 transition-[background-color,border-color] duration-300",
        "bg-card",
        tone.border,
        className,
      )}
    >
      <div className={cn("transition-colors duration-300", tone.tint)}>
        <div className="flex items-start gap-3 p-4">
          <span className="relative mt-0.5 flex size-7 shrink-0 items-center justify-center">
            {!resolved && mounted && !reduce ? (
              <motion.span
                animate={{ opacity: [0.35, 0], scale: [1, 1.7] }}
                className={cn("absolute inset-0 rounded-full", tone.ring)}
                initial={{ opacity: 0, scale: 1 }}
                transition={{ duration: 1.8, repeat: Number.POSITIVE_INFINITY, ease: "easeOut" }}
              />
            ) : null}
            <AnimatePresence initial={false} mode="popLayout">
              <motion.span
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                className={cn(
                  "relative flex size-7 items-center justify-center rounded-full transition-colors duration-300 [&_svg]:size-3.5",
                  tone.dot,
                )}
                exit={{ scale: 0.8, opacity: 0 }}
                initial={{ scale: reduce ? 1 : 0.8, opacity: 0, rotate: reduce ? 0 : -30 }}
                key={stage}
                transition={spring}
              >
                {tone.icon}
              </motion.span>
            </AnimatePresence>
          </span>

          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <AnimatePresence initial={false} mode="popLayout">
                <motion.span
                  animate={{ opacity: 1, y: 0 }}
                  className={cn("rounded-full px-2 py-0.5 font-medium text-xs transition-colors duration-300", tone.chip)}
                  exit={{ opacity: 0, y: reduce ? 0 : -6 }}
                  initial={{ opacity: 0, y: reduce ? 0 : 6 }}
                  key={stage}
                  transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                >
                  {tone.label}
                </motion.span>
              </AnimatePresence>
              <span className="text-muted-foreground text-xs tabular-nums">
                {resolved && first
                  ? `${span(first.at, latest.at)} total · ${first.at}–${latest.at} ${timezone}`
                  : first
                    ? `Since ${first.at} ${timezone}`
                    : null}
              </span>
            </div>
            <h3 className="text-pretty font-medium text-sm">{title}</h3>
            <AnimatePresence initial={false}>
              {!open ? (
                <motion.div
                  animate={{ height: "auto", opacity: 1 }}
                  className="overflow-hidden"
                  exit={{ height: 0, opacity: 0 }}
                  initial={{ height: 0, opacity: 0 }}
                  transition={reduce ? { duration: 0 } : { height: { type: "spring", stiffness: 420, damping: 40 }, opacity: { duration: 0.15 } }}
                >
                  <AnimatePresence initial={false} mode="wait">
                    <motion.p
                      animate={{ opacity: 1 }}
                      className="line-clamp-2 text-pretty text-muted-foreground text-xs"
                      exit={{ opacity: 0 }}
                      initial={{ opacity: 0 }}
                      key={latest?.id}
                      transition={{ duration: 0.18 }}
                    >
                      {latest?.message}
                    </motion.p>
                  </AnimatePresence>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          <div className="-me-1.5 -mt-1 flex shrink-0 items-center gap-0.5">
            {action}
            {dismissible ? (
              <Button aria-label="Dismiss incident banner" onClick={onDismiss} size="icon-sm" variant="ghost">
                <XIcon />
              </Button>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-3 px-4 pb-3">
          <ol aria-label="Incident progress" className="flex flex-1 items-center gap-1">
            {STAGES.map((s, i) => (
              <li className="relative h-1 flex-1 overflow-hidden rounded-full bg-foreground/10" key={s}>
                <span className="sr-only">{`${TONE[s].label}${i <= step ? ", reached" : ""}`}</span>
                <motion.span
                  animate={{ scaleX: i <= step ? 1 : 0 }}
                  aria-hidden
                  className={cn("absolute inset-0 rounded-full transition-colors duration-300", tone.fill)}
                  initial={false}
                  style={{ originX: 0 }}
                  transition={{ ...spring, delay: reduce ? 0 : 0.05 }}
                />
              </li>
            ))}
          </ol>
          <button
            aria-controls={panelId}
            aria-expanded={open}
            className="-me-1.5 inline-flex h-7 shrink-0 cursor-pointer items-center gap-1 rounded-md px-1.5 text-muted-foreground text-xs outline-none transition-[color,background-color,scale] duration-150 ease-out hover:bg-foreground/5 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]"
            onClick={() => setOpen((v) => !v)}
            type="button"
          >
            {updates.length} update{updates.length === 1 ? "" : "s"}
            <motion.span animate={{ rotate: open ? 180 : 0 }} className="inline-flex" transition={spring}>
              <ChevronDownIcon className="size-3.5" />
            </motion.span>
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            animate={{ height: "auto", opacity: 1 }}
            className="overflow-hidden border-t"
            exit={{ height: 0, opacity: 0 }}
            id={panelId}
            initial={{ height: 0, opacity: 0 }}
            transition={reduce ? { duration: 0 } : { height: { type: "spring", stiffness: 420, damping: 40 }, opacity: { duration: 0.15 } }}
          >
            <div className="flex flex-col gap-3 p-4">
              {affected.length ? (
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-muted-foreground">Affected</span>
                  {affected.map((a) => (
                    <span className="rounded-md border bg-background px-1.5 py-0.5 dark:bg-input/32" key={a}>
                      {a}
                    </span>
                  ))}
                </div>
              ) : null}
              <TimelineHeight spring={spring}>
                <ol className="relative flex flex-col">
                  <AnimatePresence initial={false}>
                    {[...updates].reverse().map((u, i, arr) => (
                      <motion.li
                        animate={{ opacity: 1, y: 0 }}
                        className="relative flex gap-3 pb-3 last:pb-0"
                        exit={{ opacity: 0 }}
                        initial={{ opacity: 0, y: reduce ? 0 : -6 }}
                        key={u.id}
                        layout="position"
                        transition={spring}
                      >
                        {i < arr.length - 1 ? (
                          <span aria-hidden className="absolute top-5 bottom-0 left-[7px] w-px bg-border" />
                        ) : null}
                        <span
                          className={cn(
                            "relative mt-1 flex size-[15px] shrink-0 items-center justify-center rounded-full ring-4 ring-card [&_svg]:size-2.5",
                            i === 0 ? TONE[u.stage].dot : "bg-muted text-muted-foreground",
                          )}
                        >
                          {TONE[u.stage].icon}
                        </span>
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <div className="flex items-baseline gap-2 text-xs">
                            <span className="font-medium">{TONE[u.stage].label}</span>
                            <span className="text-muted-foreground tabular-nums">
                              {u.at} {timezone}
                            </span>
                          </div>
                          <p className="text-pretty text-muted-foreground text-xs">{u.message}</p>
                        </div>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ol>
              </TimelineHeight>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}

function TimelineHeight({ children, spring }: { children: ReactNode; spring: object }) {
  const [ref, height] = useHeight<HTMLDivElement>();
  return (
    <motion.div animate={{ height: height ?? "auto" }} className="-m-1 overflow-hidden p-1" initial={false} transition={spring}>
      <div ref={ref}>{children}</div>
    </motion.div>
  );
}
