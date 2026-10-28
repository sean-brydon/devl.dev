"use client";

import { InfinityIcon, KeyRoundIcon, TicketCheckIcon, TicketXIcon } from "lucide-react";
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from "motion/react";
import { type CSSProperties, useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control";
import { cn } from "@/lib/utils";

export interface AccessPassField {
  label: string;
  value: string;
}

export interface AccessPassRequest {
  number?: string;
  agent: { name: string; code?: string; role?: string };
  resource: { name: string; code?: string };
  scope: string;
  reason: string;
  fields?: AccessPassField[];
  risk?: "low" | "medium" | "high";
}

export interface AccessPassDuration {
  id: string;
  label: string;
  seconds?: number | null;
  hint: string;
}

export interface AccessPassProps {
  request: AccessPassRequest;
  durations?: AccessPassDuration[];
  defaultDuration?: string;
  onApprove?: (duration: AccessPassDuration) => void;
  onDeny?: () => void;
  onRevoke?: () => void;
  className?: string;
}

type Phase = "pending" | "tearing" | "approved" | "denied" | "ended";

const defaultDurations: AccessPassDuration[] = [
  { id: "once", label: "Once", hint: "Just this one time, then it asks again." },
  { id: "hour", label: "1 hour", seconds: 3600, hint: "For the next hour. Revoke any time." },
  { id: "always", label: "Always", seconds: null, hint: "Until you revoke it from settings." },
];

const risks = {
  low: { label: "Low", className: "text-success-foreground" },
  medium: { label: "Medium", className: "text-warning-foreground" },
  high: { label: "High", className: "text-destructive-foreground" },
};

const ease = [0.23, 1, 0.32, 1] as const;
const spring = { type: "spring", stiffness: 380, damping: 36 } as const;
const outline: CSSProperties = {
  filter:
    "drop-shadow(0 0 0.5px color-mix(in oklab, var(--color-foreground) 26%, transparent)) drop-shadow(0 1px 2px color-mix(in oklab, var(--color-foreground) 6%, transparent))",
};
const NOTCH = 11;

const notch = (x: string, y: string) => `radial-gradient(circle at ${x} ${y}, transparent ${NOTCH}px, black ${NOTCH + 0.5}px)`;
const bodyMask: CSSProperties = {
  maskImage: `${notch("0", "100%")}, ${notch("100%", "100%")}`,
  maskComposite: "intersect",
};
function stubMask(torn: boolean): CSSProperties {
  if (!torn) return { maskImage: `${notch("0", "0")}, ${notch("100%", "0")}`, maskComposite: "intersect" };
  return {
    mask: `${notch("0", "0")}, ${notch("100%", "0")}, linear-gradient(black, black) bottom / 100% calc(100% - 4px) no-repeat, conic-gradient(from 135deg at 50% 0, black 90deg, transparent 0) top / 8px 4px repeat-x`,
    maskComposite: "intersect, intersect, add, add",
  } as CSSProperties;
}

function codeOf(name: string) {
  const letters = name.replace(/[^a-z]/gi, "").toUpperCase();
  const rest = letters.slice(1).replace(/[AEIOU]/g, "");
  return (letters[0] + rest + letters.slice(1)).slice(0, 3);
}

function clock(s: number, total: number) {
  const pad = (n: number) => String(n).padStart(2, "0");
  if (total <= 3600) return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
  return `${Math.floor(s / 3600)}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;
}

const labelClass = "text-[11px] text-muted-foreground uppercase tracking-[0.12em]";

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn(labelClass, className)}>{children}</span>;
}

export function AccessPass({
  request,
  durations = defaultDurations,
  defaultDuration = durations[1]?.id ?? durations[0]?.id,
  onApprove,
  onDeny,
  onRevoke,
  className,
}: AccessPassProps) {
  const reduce = useReducedMotion();
  const labelId = useId();
  const [phase, setPhase] = useState<Phase>("pending");
  const [choice, setChoice] = useState(defaultDuration);
  const [left, setLeft] = useState(0);
  const [ended, setEnded] = useState<"revoked" | "expired" | "used">("revoked");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const duration = durations.find((d) => d.id === choice) ?? durations[0];
  const total = duration.seconds ?? 0;
  const agentCode = request.agent.code ?? codeOf(request.agent.name);
  const resourceCode = request.resource.code ?? codeOf(request.resource.name);
  const risk = request.risk ? risks[request.risk] : null;

  useEffect(() => () => clearTimeout(timer.current), []);

  useEffect(() => {
    if (phase !== "approved" || !duration.seconds) return;
    const t = setInterval(() => {
      setLeft((s) => {
        if (s <= 1) {
          clearInterval(t);
          setEnded("expired");
          setPhase("ended");
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase, duration.seconds]);

  const approve = () => {
    if (phase !== "pending") return;
    setLeft(total);
    onApprove?.(duration);
    if (reduce) return setPhase("approved");
    setPhase("tearing");
    timer.current = setTimeout(() => setPhase("approved"), 360);
  };
  const deny = () => {
    setPhase("denied");
    onDeny?.();
  };
  const revoke = () => {
    setEnded("revoked");
    setPhase("ended");
    onRevoke?.();
  };

  const torn = phase === "tearing" || phase === "approved" || phase === "ended";
  const collapsed = phase === "approved" || phase === "ended";

  return (
    <MotionConfig reducedMotion="user" transition={spring}>
      <section aria-labelledby={labelId} className={cn("flex w-[380px] max-w-full flex-col", className)}>
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              animate={{ height: "auto", opacity: 1 }}
              className="-mx-1 -mt-1 flex flex-col justify-end overflow-hidden px-1 pt-1"
              exit={{ height: 0, opacity: 0, transition: { height: spring, opacity: { duration: 0.18, ease } } }}
              initial={{ height: 0, opacity: 0 }}
              key="body"
            >
              <div style={outline}>
                <div className="relative flex flex-col gap-5 bg-card px-5 pt-5 pb-6" style={bodyMask}>
                  <div className={cn("flex flex-col gap-5 transition-opacity duration-200", phase === "denied" && "opacity-45")}>
                    <header className="flex items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/12 font-medium font-mono text-sm text-violet-700 dark:bg-violet-400/16 dark:text-violet-300">
                        {request.agent.name[0]}
                      </span>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <h3 className="truncate font-medium text-sm" id={labelId}>
                          {request.agent.name} wants access
                        </h3>
                        <span className="truncate text-muted-foreground text-xs">{request.scope}</span>
                      </div>
                      <div className="flex shrink-0 flex-col items-end">
                        <Label>Access pass</Label>
                        {request.number && <span className="font-mono text-muted-foreground text-xs tabular-nums">{request.number}</span>}
                      </div>
                    </header>

                    <div className="flex items-center gap-3">
                      <div className="flex min-w-0 flex-col">
                        <span className="font-mono font-semibold text-3xl leading-none tracking-tight">{agentCode}</span>
                        <span className="mt-1.5 truncate text-muted-foreground text-xs">{request.agent.role ?? "Agent"}</span>
                      </div>
                      <div aria-hidden className="relative flex min-w-8 flex-1 items-center self-start pt-3">
                        <span className="h-px flex-1 border-foreground/25 border-t border-dashed" />
                        <span className="mx-1.5 flex size-6 items-center justify-center rounded-full border bg-background text-muted-foreground">
                          <KeyRoundIcon className="size-3" />
                        </span>
                        <span className="h-px flex-1 border-foreground/25 border-t border-dashed" />
                      </div>
                      <div className="flex min-w-0 flex-col items-end">
                        <span className="font-mono font-semibold text-3xl leading-none tracking-tight">{resourceCode}</span>
                        <span className="mt-1.5 max-w-36 truncate font-mono text-muted-foreground text-xs">{request.resource.name}</span>
                      </div>
                    </div>

                    {Boolean(request.fields?.length || risk) && (
                      <dl className="grid grid-cols-3 gap-3">
                        {request.fields?.slice(0, risk ? 2 : 3).map((f) => (
                          <div className="flex min-w-0 flex-col gap-1" key={f.label}>
                            <dt className={cn(labelClass, "truncate")}>{f.label}</dt>
                            <dd className="truncate font-medium font-mono text-xs">{f.value}</dd>
                          </div>
                        ))}
                        {risk && (
                          <div className="flex min-w-0 flex-col gap-1">
                            <dt className={labelClass}>Risk</dt>
                            <dd className={cn("flex items-center gap-1.5 font-medium font-mono text-xs", risk.className)}>
                              <span className="size-1.5 rounded-full bg-current" />
                              {risk.label}
                            </dd>
                          </div>
                        )}
                      </dl>
                    )}

                    <div className="flex flex-col gap-1.5 rounded-xl bg-muted/70 px-3.5 py-3">
                      <Label>Why</Label>
                      <p className="text-pretty text-sm">{request.reason}</p>
                    </div>
                  </div>

                  <AnimatePresence>
                    {phase === "denied" && (
                      <motion.span
                        animate={{ opacity: 1, scale: 1, rotate: -9 }}
                        aria-hidden
                        className="pointer-events-none absolute top-[42%] left-1/2 -ml-[72px] w-36 rounded-lg border-[3px] border-destructive/75 py-1 pl-[0.3em] text-center font-bold font-mono text-3xl text-destructive-foreground/90 tracking-[0.3em]"
                        exit={{ opacity: 0, transition: { duration: 0.15 } }}
                        initial={reduce ? { opacity: 0, rotate: -9 } : { opacity: 0, scale: 1.45, rotate: -15 }}
                        transition={{ type: "spring", stiffness: 700, damping: 34 }}
                      >
                        VOID
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          animate={phase === "tearing" ? { y: 12, rotate: 2.2, x: 4 } : { y: 0, rotate: 0, x: 0 }}
          className="relative z-10"
          style={{ transformOrigin: "0% 0%", ...outline }}
          transition={phase === "tearing" ? { duration: 0.3, ease } : spring}
        >
          <motion.div
            animate={{ height: collapsed ? 40 : "auto", borderRadius: collapsed ? 20 : 0 }}
            className="relative overflow-hidden bg-card"
            initial={false}
            style={collapsed ? undefined : stubMask(torn)}
          >
            {!torn && (
              <span aria-hidden className="pointer-events-none absolute inset-x-4 top-0 border-foreground/25 border-t-2 border-dashed" />
            )}
            <AnimatePresence initial={false} mode="popLayout">
              {collapsed ? (
                <motion.div
                  animate={{ opacity: 1 }}
                  className="max-w-full"
                  exit={{ opacity: 0, transition: { duration: 0.1 } }}
                  initial={{ opacity: 0 }}
                  key={`chip-${phase}`}
                  transition={{ opacity: { duration: 0.2, delay: 0.08, ease } }}
                >
                  {phase === "approved" ? (
                    <PassChip
                      agent={request.agent.name}
                      left={left}
                      onRevoke={revoke}
                      scope={request.scope}
                      seconds={duration.seconds}
                      total={total}
                    />
                  ) : (
                    <div className="flex h-10 items-center gap-2.5 pr-1.5 pl-3 text-muted-foreground text-sm" role="status">
                      <TicketXIcon className="size-4 shrink-0" />
                      <span className="min-w-0 flex-1 truncate">
                        {ended === "expired" ? "Pass expired" : "Pass revoked"}
                        <span> · {request.agent.name} will ask next time</span>
                      </span>
                      <Button className="rounded-full" onClick={() => setPhase("pending")} size="xs" variant="ghost">
                        Reissue
                      </Button>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  animate={{ opacity: 1 }}
                  className={cn("flex flex-col gap-3 px-5 pt-5 pb-5", phase === "tearing" && "pointer-events-none")}
                  exit={{ opacity: 0, transition: { duration: 0.08 } }}
                  initial={{ opacity: 0 }}
                  key="stub"
                >
                  {phase === "denied" ? (
                    <div className="flex items-center gap-3" role="status">
                      <span className="flex-1 text-muted-foreground text-sm">
                        Denied. {request.agent.name} won’t {request.scope.charAt(0).toLowerCase() + request.scope.slice(1)}.
                      </span>
                      <Button onClick={() => setPhase("pending")} size="sm" variant="outline">
                        Undo
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between gap-3">
                        <Label>Valid for</Label>
                        <span className="truncate text-muted-foreground text-xs">{duration.hint}</span>
                      </div>
                      <SegmentedControl aria-label="How long the pass lasts" className="w-full" role="radiogroup">
                        {durations.map((d) => (
                          <SegmentedControlItem
                            aria-checked={d.id === choice}
                            className="flex-1 text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                            data-checked={d.id === choice ? "" : undefined}
                            key={d.id}
                            onClick={() => setChoice(d.id)}
                            role="radio"
                          >
                            {d.label}
                          </SegmentedControlItem>
                        ))}
                      </SegmentedControl>
                      <div className="flex gap-2">
                        <Button className="flex-1" onClick={deny} variant="outline">
                          Deny
                        </Button>
                        <Button className="flex-[2] transition-[scale,box-shadow] duration-150 ease-out active:scale-[0.97]" onClick={approve}>
                          <TicketCheckIcon />
                          Approve {duration.label.toLowerCase()}
                        </Button>
                      </div>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      </section>
    </MotionConfig>
  );
}

function PassChip({
  agent,
  scope,
  seconds,
  left,
  total,
  onRevoke,
}: {
  agent: string;
  scope: string;
  seconds?: number | null;
  left: number;
  total: number;
  onRevoke: () => void;
}) {
  const r = 9;
  const c = 2 * Math.PI * r;
  const share = seconds ? left / Math.max(total, 1) : 1;
  return (
    <div className="flex h-10 max-w-full items-center gap-2.5 pr-1.5 pl-1.5" role="status">
      <span className="relative flex size-7 shrink-0 items-center justify-center rounded-full bg-success/12 text-success-foreground">
        <svg aria-hidden className="absolute inset-0 -rotate-90" viewBox="0 0 28 28">
          <circle className="stroke-success/20" cx="14" cy="14" fill="none" r={r} strokeWidth="2" />
          <circle
            className="stroke-success transition-[stroke-dashoffset] duration-1000 ease-linear"
            cx="14"
            cy="14"
            fill="none"
            r={r}
            strokeDasharray={c}
            strokeDashoffset={c * (1 - share)}
            strokeLinecap="round"
            strokeWidth="2"
          />
        </svg>
        <KeyRoundIcon className="relative size-3" />
      </span>
      <span className="min-w-0 flex-1 truncate text-sm">
        <span className="font-medium">{agent}</span>
        <span className="text-muted-foreground"> · {scope}</span>
      </span>
      <span className="flex shrink-0 items-center gap-1 font-mono text-muted-foreground text-xs tabular-nums">
        {seconds === undefined ? "1 use" : seconds === null ? <InfinityIcon aria-label="No expiry" className="size-3.5" /> : clock(left, total)}
      </span>
      <Button className="shrink-0 rounded-full" onClick={onRevoke} size="xs" variant="ghost">
        Revoke
      </Button>
    </div>
  );
}
