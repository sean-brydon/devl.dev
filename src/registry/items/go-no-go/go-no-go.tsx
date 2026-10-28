"use client";

import { CheckIcon, Clock3Icon, ShieldAlertIcon, ShieldCheckIcon, ShieldIcon, Undo2Icon, XIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type KeyboardEvent, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";

export type GoNoGoRisk = "low" | "medium" | "high";
export type GoNoGoDecision = "approved" | "denied" | "expired";

export type GoNoGoPreview =
  | { type: "command"; command: string; cwd?: string }
  | { type: "diff"; file: string; lines: { kind: "+" | "-" | " "; text: string }[] };

export interface GoNoGoRequest {
  agent: string;
  action: string;
  risk: GoNoGoRisk;
  preview: GoNoGoPreview;
  reason?: string;
}

export interface GoNoGoProps {
  request: GoNoGoRequest;
  timeout?: number;
  onDecision?: (decision: GoNoGoDecision) => void;
  onUndo?: () => void;
  className?: string;
}

const risks: Record<GoNoGoRisk, { label: string; variant: "success" | "warning" | "error"; Icon: typeof ShieldIcon }> = {
  low: { label: "Low risk", variant: "success", Icon: ShieldCheckIcon },
  medium: { label: "Medium risk", variant: "warning", Icon: ShieldIcon },
  high: { label: "High risk", variant: "error", Icon: ShieldAlertIcon },
};

const outcomes: Record<GoNoGoDecision, { label: string; tone: string; Icon: typeof CheckIcon }> = {
  approved: { label: "Approved", tone: "bg-success text-white", Icon: CheckIcon },
  denied: { label: "Denied", tone: "bg-destructive text-white", Icon: XIcon },
  expired: { label: "Timed out, denied", tone: "bg-muted-foreground/60 text-background", Icon: Clock3Icon },
};

const press = "transition-[scale,box-shadow,background-color] duration-150 ease-out active:scale-[0.97]";

function previewText(p: GoNoGoPreview) {
  return p.type === "command" ? p.command : p.file;
}

function useThemeRadius(scale: number) {
  const probe = useRef<HTMLSpanElement>(null);
  const [radius, setRadius] = useState(scale * 10);
  useLayoutEffect(() => {
    const el = probe.current;
    if (!el) return;
    const read = () => setRadius(el.offsetWidth);
    read();
    const observer = new ResizeObserver(read);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const marker = (
    <span
      aria-hidden
      className="pointer-events-none invisible absolute h-0"
      ref={probe}
      style={{ width: `calc(var(--radius) * ${scale})` }}
    />
  );
  return [radius, marker] as const;
}

export function GoNoGo({ request, timeout = 30, onDecision, onUndo, className }: GoNoGoProps) {
  const reduce = useReducedMotion();
  const [radius, radiusProbe] = useThemeRadius(1.8);
  const [decision, setDecision] = useState<GoNoGoDecision | null>(null);
  const [left, setLeft] = useState(timeout * 1000);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const paused = hovered || focused;

  const decide = (d: GoNoGoDecision) => {
    setDecision(d);
    onDecision?.(d);
  };

  useEffect(() => {
    if (decision || paused) return;
    let last = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      const dt = now - last;
      last = now;
      setLeft((l) => Math.max(0, l - dt));
    }, 100);
    return () => clearInterval(id);
  }, [decision, paused]);

  useEffect(() => {
    if (left <= 0 && !decision) decide("expired");
  }, [left, decision]);

  const onKeyDown = (e: KeyboardEvent) => {
    if (decision || e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k === "y") {
      e.preventDefault();
      decide("approved");
    } else if (k === "n" || k === "escape") {
      e.preventDefault();
      decide("denied");
    }
  };

  const undo = () => {
    setDecision(null);
    setLeft(timeout * 1000);
    onUndo?.();
    requestAnimationFrame(() => rootRef.current?.focus());
  };

  const risk = risks[request.risk];
  const spring = reduce ? { duration: 0 } : { type: "spring" as const, stiffness: 380, damping: 32 };
  const fade = reduce ? { duration: 0 } : { duration: 0.18 };

  return (
    <motion.div
      aria-label={`${request.agent} asks to ${request.action}`}
      className={cn(
        "w-full max-w-[420px] overflow-hidden border bg-card text-card-foreground shadow-xs/5 outline-none",
        !decision &&
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
      layout
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setFocused(false);
      }}
      onFocus={() => setFocused(true)}
      onKeyDown={onKeyDown}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      ref={rootRef}
      role="group"
      style={{ borderRadius: radius }}
      tabIndex={decision ? -1 : 0}
      transition={spring}
    >
      {radiusProbe}
      <AnimatePresence initial={false} mode="popLayout">
        {decision ? (
          <motion.div
            animate={{ opacity: 1 }}
            className="flex items-center gap-2.5 px-3 py-2.5"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            key="resolved"
            layout="position"
            transition={fade}
          >
            <motion.span
              animate={{ scale: 1, opacity: 1 }}
              className={cn("flex size-5 shrink-0 items-center justify-center rounded-full", outcomes[decision].tone)}
              initial={reduce ? false : { scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1], delay: 0.06 }}
            >
              {(() => {
                const Icon = outcomes[decision].Icon;
                return <Icon className="size-3" strokeWidth={3} />;
              })()}
            </motion.span>
            <p className="min-w-0 flex-1 truncate text-sm">
              <span className="font-medium">{outcomes[decision].label}</span>
              <span className="text-muted-foreground">
                {" "}
                · {request.agent} · <span className="font-mono text-xs">{previewText(request.preview)}</span>
              </span>
            </p>
            <Button aria-label="Undo decision" className={press} onClick={undo} size="xs" variant="ghost">
              <Undo2Icon />
              Undo
            </Button>
          </motion.div>
        ) : (
          <motion.div
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            key="pending"
            layout="position"
            transition={fade}
          >
            <div className="flex items-start gap-3 px-4 pt-4">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary font-medium text-primary-foreground text-xs">
                {request.agent.slice(0, 1)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <span className="font-medium">{request.agent}</span>
                  <span className="text-muted-foreground"> wants to</span> {request.action}
                </p>
                <Badge className="mt-1" size="sm" variant={risk.variant}>
                  <risk.Icon />
                  {risk.label}
                </Badge>
              </div>
              <Countdown left={left} paused={paused} reduce={!!reduce} total={timeout * 1000} />
            </div>

            <div className="px-4 pt-3">
              {request.preview.type === "command" ? (
                <div className="rounded-lg bg-muted px-3 py-2.5 font-mono text-xs">
                  {request.preview.cwd && <p className="mb-1 text-muted-foreground">{request.preview.cwd}</p>}
                  <p className="break-all">
                    <span className="select-none text-muted-foreground">$ </span>
                    {request.preview.command}
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border font-mono text-xs">
                  <p className="border-b bg-muted px-3 py-1.5 text-muted-foreground">{request.preview.file}</p>
                  <div className="py-1">
                    {request.preview.lines.map((line, i) => (
                      <p
                        className={cn(
                          "whitespace-pre-wrap px-3 py-px",
                          line.kind === "+" && "bg-success/10 text-success-foreground",
                          line.kind === "-" && "bg-destructive/10 text-destructive-foreground",
                          line.kind === " " && "text-muted-foreground",
                        )}
                        key={i}
                      >
                        <span className="mr-2 select-none opacity-60">{line.kind}</span>
                        {line.text}
                      </p>
                    ))}
                  </div>
                </div>
              )}
              {request.reason && <p className="mt-2 text-muted-foreground text-xs">{request.reason}</p>}
            </div>

            <div className="mt-3 flex items-center gap-2 border-t px-4 py-3">
              <p className="mr-auto text-muted-foreground text-xs max-sm:hidden" aria-live="polite">
                {focused ? "Press Y or N" : paused ? "Paused while you look" : "Denies itself when time runs out"}
              </p>
              <Button className={cn(press, "max-sm:flex-1")} onClick={() => decide("denied")} size="sm" variant="outline">
                Deny
                <Kbd className={cn("transition-opacity", !focused && "opacity-50")}>N</Kbd>
              </Button>
              <Button
                className={cn(press, "max-sm:flex-1", request.risk === "high" && "border-red-600 bg-red-600 hover:bg-red-600/90 data-pressed:bg-red-600/90")}
                onClick={() => decide("approved")}
                size="sm"
                variant={request.risk === "high" ? "destructive" : "default"}
              >
                Approve
                <Kbd className={cn("bg-current/20 text-current transition-opacity", !focused && "opacity-50")}>
                  Y
                </Kbd>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function Countdown({ left, total, paused, reduce }: { left: number; total: number; paused: boolean; reduce: boolean }) {
  const frac = total ? left / total : 0;
  const urgent = left < 10000;
  return (
    <div
      aria-label={`${Math.ceil(left / 1000)} seconds left${paused ? ", paused" : ""}`}
      className="relative flex size-9 shrink-0 items-center justify-center"
      role="timer"
    >
      <svg aria-hidden className="absolute inset-0 -rotate-90" viewBox="0 0 36 36">
        <circle className="stroke-muted" cx="18" cy="18" fill="none" r="15" strokeWidth="3" />
        <motion.circle
          animate={{ pathLength: frac }}
          className={cn(
            "transition-[stroke] duration-300",
            paused ? "stroke-muted-foreground" : urgent ? "stroke-destructive" : "stroke-primary",
          )}
          cx="18"
          cy="18"
          fill="none"
          initial={false}
          r="15"
          strokeLinecap="round"
          strokeWidth="3"
          transition={reduce ? { duration: 0 } : { type: "tween", ease: "linear", duration: 0.1 }}
        />
      </svg>
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          animate={{ opacity: 1, scale: 1 }}
          className="font-medium font-mono text-[11px] tabular-nums"
          exit={{ opacity: 0, scale: reduce ? 1 : 0.8 }}
          initial={{ opacity: 0, scale: reduce ? 1 : 0.8 }}
          key={paused ? "p" : "n"}
          transition={{ duration: reduce ? 0.1 : 0.15, ease: "easeOut" }}
        >
          {paused ? (
            <svg aria-hidden className="size-2.5 fill-current" viewBox="0 0 10 10">
              <rect height="10" rx="1" width="3" x="1" />
              <rect height="10" rx="1" width="3" x="6" />
            </svg>
          ) : (
            Math.ceil(left / 1000)
          )}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}
