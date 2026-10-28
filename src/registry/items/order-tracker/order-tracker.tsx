"use client";

import { CheckIcon, ChevronDownIcon, CopyIcon, MapPinIcon, PackageCheckIcon, TruckIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface TrackerStep {
  label: string;
  date?: string;
}

export interface CarrierEvent {
  id: string;
  time: string;
  day?: string;
  title: string;
  location?: string;
}

export interface OrderTrackerProps {
  orderId: string;
  carrier: string;
  trackingNumber?: string;
  steps: TrackerStep[];
  current: number;
  eta: { title: string; detail?: string };
  delivered?: { title: string; detail?: string };
  events: CarrierEvent[];
  visibleEvents?: number;
  className?: string;
}

export function OrderTracker({
  orderId,
  carrier,
  trackingNumber,
  steps,
  current,
  eta,
  delivered,
  events,
  visibleEvents = 3,
  className,
}: OrderTrackerProps) {
  const reduce = useReducedMotion();
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [celebrate, setCelebrate] = useState(0);
  const last = steps.length - 1;
  const isDelivered = current >= last;
  const prev = useRef(current);
  const copyTimer = useRef<number>(undefined);

  useEffect(() => {
    if (current >= last && prev.current < last) setCelebrate((n) => n + 1);
    prev.current = current;
  }, [current, last]);
  useEffect(() => () => clearTimeout(copyTimer.current), []);

  const copy = async () => {
    if (!trackingNumber) return;
    try {
      await navigator.clipboard.writeText(trackingNumber);
    } catch {}
    setCopied(true);
    clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopied(false), 1400);
  };

  const ease = [0.23, 1, 0.32, 1] as const;
  const head = isDelivered && delivered ? delivered : eta;
  const shown = expanded ? events : events.slice(0, visibleEvents);
  const progress = Math.min(1, current / Math.max(1, last));

  return (
    <div className={cn("w-full max-w-[400px] rounded-2xl border bg-card text-card-foreground shadow-xs/5", className)}>
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <div className="min-w-0">
          <p className="font-medium text-sm">Order {orderId}</p>
          <p className="truncate text-muted-foreground text-xs">
            {carrier}
            {trackingNumber && (
              <>
                {" · "}
                <span className="font-mono">{trackingNumber}</span>
              </>
            )}
          </p>
        </div>
        {trackingNumber && (
          <button
            aria-label={copied ? "Tracking number copied" : "Copy tracking number"}
            className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground outline-none transition-[background-color,color,scale] hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]"
            onClick={copy}
            type="button"
          >
            <AnimatePresence initial={false} mode="popLayout">
              <motion.span
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                initial={{ opacity: 0, scale: 0.6 }}
                key={copied ? "y" : "n"}
                transition={{ duration: 0.15 }}
              >
                {copied ? <CheckIcon className="size-4 text-success" /> : <CopyIcon className="size-3.5" />}
              </motion.span>
            </AnimatePresence>
          </button>
        )}
      </div>

      <div className="px-4 pt-4">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors duration-300",
              isDelivered ? "bg-success/12 text-success-foreground" : "bg-info/10 text-info-foreground",
            )}
          >
            <AnimatePresence initial={false} mode="popLayout">
              <motion.span
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.7 }}
                initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.7, rotate: -8 }}
                key={isDelivered ? "done" : "truck"}
                transition={{ duration: 0.24, ease }}
              >
                {isDelivered ? <PackageCheckIcon className="size-5" /> : <TruckIcon className="size-5" />}
              </motion.span>
            </AnimatePresence>
          </span>
          <div className="relative min-w-0 flex-1">
            <AnimatePresence initial={false} mode="popLayout">
              <motion.div
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6, filter: "blur(2px)" }}
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6, filter: "blur(2px)" }}
                key={head.title}
                transition={{ duration: 0.24, ease }}
              >
                <p aria-live="polite" className="text-balance font-semibold text-lg leading-tight">
                  {head.title}
                </p>
                {head.detail && <p className="mt-0.5 text-muted-foreground text-sm tabular-nums">{head.detail}</p>}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <ol aria-label="Shipment progress" className="relative mt-5 grid" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
          <div aria-hidden className="absolute top-[9px] h-0.5 rounded-full bg-border" style={{ left: `${50 / steps.length}%`, right: `${50 / steps.length}%` }}>
            <motion.div
              animate={{ scaleX: progress }}
              className={cn("h-full origin-left rounded-full transition-colors duration-300", isDelivered ? "bg-success" : "bg-primary")}
              initial={false}
              transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 140, damping: 24 }}
            />
          </div>
          {steps.map((s, i) => {
            const done = i < current || isDelivered;
            const active = i === current && !isDelivered;
            return (
              <li aria-current={active ? "step" : undefined} className="relative flex flex-col items-center text-center" key={s.label}>
                <span className="relative flex size-5 items-center justify-center">
                  {active && (
                    <motion.span
                      animate={reduce ? { opacity: 0 } : { scale: [1, 2.1], opacity: [0.35, 0] }}
                      className="absolute inset-0 rounded-full bg-info opacity-0"
                      transition={reduce ? { duration: 0 } : { duration: 1.8, repeat: Number.POSITIVE_INFINITY, ease: "easeOut" }}
                    />
                  )}
                  <motion.span
                    animate={{ scale: 1 }}
                    className={cn(
                      "relative flex size-5 items-center justify-center rounded-full border-2 transition-colors duration-300",
                      done && (isDelivered ? "border-success bg-success text-white" : "border-primary bg-primary text-primary-foreground"),
                      active && "border-info bg-card",
                      !done && !active && "border-border bg-card",
                    )}
                    initial={false}
                  >
                    {done ? (
                      <svg aria-hidden className="size-3" fill="none" viewBox="0 0 12 12">
                        <motion.path
                          animate={{ pathLength: 1 }}
                          d="M2.5 6.2 5 8.5l4.5-5"
                          initial={{ pathLength: 0 }}
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.8}
                          transition={reduce ? { duration: 0 } : { duration: 0.3, ease: "easeOut", delay: 0.1 }}
                        />
                      </svg>
                    ) : active ? (
                      <span className="size-2 rounded-full bg-info" />
                    ) : null}
                  </motion.span>
                  {i === last && <Burst key={celebrate} run={celebrate > 0 && !reduce} />}
                </span>
                <span className={cn("mt-2 text-pretty font-medium text-xs leading-tight", done || active ? "text-foreground" : "text-muted-foreground")}>{s.label}</span>
                {s.date && <span className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">{s.date}</span>}
              </li>
            );
          })}
        </ol>
      </div>

      <div className="mt-4 border-t px-4 pt-3 pb-2">
        <p className="mb-1 font-medium text-muted-foreground text-xs">Updates from {carrier}</p>
        <ol className="relative -mx-1 px-1">
          <AnimatePresence initial={false}>
            {shown.map((e, i) => (
              <motion.li
                animate={{ opacity: 1, height: "auto" }}
                className="overflow-hidden"
                exit={{ opacity: 0, height: 0 }}
                initial={reduce ? { opacity: 0, height: "auto" } : { opacity: 0, height: 0 }}
                key={e.id}
                layout={reduce ? false : "position"}
                transition={{ duration: 0.28, ease }}
              >
                <div className="relative flex gap-3 py-2">
                  <span className="relative flex w-3 shrink-0 justify-center pt-1.5">
                    <span className={cn("relative z-10 size-2 rounded-full ring-4 ring-card", i === 0 ? (isDelivered ? "bg-success" : "bg-info") : "bg-muted-foreground/40")} />
                    {i < shown.length - 1 && <span className="absolute top-3.5 -bottom-3.5 w-px bg-border" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-sm leading-snug", i === 0 ? "font-medium text-foreground" : "text-muted-foreground")}>{e.title}</p>
                    {e.location && (
                      <p className="mt-0.5 flex items-center gap-1 text-muted-foreground text-xs">
                        <MapPinIcon className="size-3" />
                        {e.location}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-end text-muted-foreground text-xs tabular-nums">
                    {e.day && <span className="block">{e.day}</span>}
                    {e.time}
                  </span>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ol>
        {events.length > visibleEvents && (
          <button
            aria-expanded={expanded}
            className="-mx-1.5 mt-0.5 flex h-8 cursor-pointer items-center gap-1 rounded-md px-1.5 font-medium text-muted-foreground text-xs outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => setExpanded((v) => !v)}
            type="button"
          >
            {expanded ? "Show fewer" : `Show all ${events.length} updates`}
            <ChevronDownIcon className={cn("size-3.5 transition-transform duration-200", expanded && "rotate-180")} />
          </button>
        )}
      </div>
    </div>
  );
}

function Burst({ run }: { run: boolean }) {
  if (!run) return null;
  const dots = Array.from({ length: 10 }, (_, i) => {
    const angle = (i / 10) * Math.PI * 2 + 0.3;
    const dist = 16 + (i % 3) * 5;
    return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, tone: ["bg-success", "bg-amber-400", "bg-info", "bg-rose-400"][i % 4] };
  });
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0">
      {dots.map((d, i) => (
        <motion.span
          animate={{ x: d.x, y: d.y, opacity: [0, 1, 0], scale: [0.6, 1, 0.4] }}
          className={cn("absolute top-1/2 left-1/2 -mt-[2px] -ml-[2px] size-1 rounded-full", d.tone)}
          initial={{ x: 0, y: 0, opacity: 0 }}
          key={i}
          transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1], delay: 0.15 }}
        />
      ))}
    </span>
  );
}
