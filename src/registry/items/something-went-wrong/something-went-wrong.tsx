"use client";

import { ChevronDownIcon, CopyIcon, FlagIcon, LayoutDashboardIcon, MountainIcon, RotateCwIcon } from "lucide-react";
import { AnimatePresence, MotionConfig, motion, useAnimationControls, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

export interface ErrorDetails {
  id: string;
  status?: string;
  request?: string;
  time?: string;
  stack?: string[];
}

export interface RecoveredCopy {
  title: string;
  description: string;
  actionLabel: string;
}

export interface SomethingWentWrongProps {
  title?: string;
  description?: string;
  stillFailingDescription?: string;
  details?: ErrorDetails;
  recovered?: RecoveredCopy;
  breadcrumb?: string[];
  product?: string;
  userInitials?: string;
  onRetry?: () => Promise<void> | void;
  onGoToDashboard?: () => void;
  onReport?: (errorId: string) => void;
  onContinue?: () => void;
  className?: string;
}

const ease = [0.23, 1, 0.32, 1] as const;
const W = 34;
const H = 17;
const CELL = 3;
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];
const QUESTION = [".###.", "#...#", "....#", "...#.", "..#..", ".....", "..#.."];
const BANG = ["#", "#", "#", "#", "#", ".", "#"];
const CHECK = ["......##", ".....##.", "##..##..", ".####...", "..##...."];

function stamp(cells: Set<number>, rows: string[], ox: number, oy: number, scale = 2) {
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch !== "#") return;
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) cells.add((oy + y * scale + dy) * W + ox + x * scale + dx);
      }
    });
  });
  return cells;
}

const ERROR_INK = stamp(stamp(new Set(), QUESTION, 10, 1), BANG, 22, 1);
const CHECK_INK = stamp(new Set(), CHECK, 9, 3);

function hash(x: number, y: number, seed: number) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function nearInk(ink: Set<number>, x: number, y: number) {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < W && ny >= 0 && ny < H && ink.has(ny * W + nx)) return true;
    }
  }
  return false;
}

function DitherGlyph({ recovered, busy }: { recovered: boolean; busy: boolean }) {
  const reduce = useReducedMotion();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (reduce || recovered) return;
    const t = setInterval(() => setTick((n) => n + 1), busy ? 180 : 1400);
    return () => clearInterval(t);
  }, [busy, recovered, reduce]);

  const cells = useMemo(() => {
    const ink = recovered ? CHECK_INK : ERROR_INK;
    const out: { x: number; y: number; kind: "ink" | "dot" | "off"; delay: number }[] = [];
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const dx = (x - (W - 1) / 2) / (W / 2);
        const dy = (y - (H - 1) / 2) / (H / 2);
        const glow = Math.max(0, 1 - Math.hypot(dx, dy)) * (recovered ? 0.85 : 1.15);
        const noise = (hash(x, y, tick) - 0.5) * 0.14;
        let kind: "ink" | "dot" | "off" = "off";
        if (ink.has(y * W + x)) kind = "ink";
        else if (!nearInk(ink, x, y) && (BAYER[y % 4][x % 4] + 0.5) / 16 < glow + noise) kind = "dot";
        out.push({ x, y, kind, delay: Math.round(hash(x, y, 7) * 260) });
      }
    }
    return out;
  }, [recovered, tick]);

  return (
    <svg aria-hidden className="h-auto w-36 overflow-visible" viewBox={`0 0 ${W * CELL} ${H * CELL}`}>
      {cells.map((c) => (
        <rect
          className={cn(
            "transition-opacity duration-300 ease-out motion-reduce:transition-none",
            c.kind === "ink" ? "fill-foreground" : "fill-foreground/35",
          )}
          height={c.kind === "ink" ? CELL + 0.02 : CELL - 1}
          key={`${c.x}-${c.y}`}
          style={{ opacity: c.kind === "off" ? 0 : 1, transitionDelay: `${c.delay}ms` }}
          shapeRendering="crispEdges"
          width={c.kind === "ink" ? CELL + 0.02 : CELL - 1}
          x={c.x * CELL + (c.kind === "ink" ? 0 : 0.5)}
          y={c.y * CELL + (c.kind === "ink" ? 0 : 0.5)}
        />
      ))}
    </svg>
  );
}

function DrawnCheck({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  return (
    <svg aria-hidden className={className} fill="none" viewBox="0 0 24 24">
      <motion.path
        animate={{ pathLength: 1 }}
        d="M4.5 12.5l5 5L19.5 7"
        initial={{ pathLength: reduce ? 1 : 0 }}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.25}
        transition={{ duration: 0.32, ease }}
      />
    </svg>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1800);
  };

  return (
    <Button
      aria-label={copied ? "Copied" : "Copy error details"}
      className="text-muted-foreground"
      onClick={copy}
      size="icon-xs"
      variant="ghost"
    >
      {copied ? <DrawnCheck className="size-3.5 text-success-foreground" /> : <CopyIcon className="size-3.5" />}
    </Button>
  );
}

const swap = {
  initial: { opacity: 0, y: 6, filter: "blur(2px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -6, filter: "blur(2px)" },
  transition: { duration: 0.22, ease },
};

export function SomethingWentWrong({
  title = "Something went wrong",
  description = "We couldn’t load this report. Your data is safe, and we’ve logged the error.",
  stillFailingDescription = "Still not loading. This usually clears up in a few minutes.",
  details = { id: "err_7Hq2kV9x", stack: [] },
  recovered = { title: "You’re back", description: "The report loaded. Nothing was lost.", actionLabel: "Continue" },
  breadcrumb = ["Reports"],
  product = "Ridgeline",
  userInitials = "AL",
  onRetry,
  onGoToDashboard,
  onReport,
  onContinue,
  className,
}: SomethingWentWrongProps) {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<"error" | "retrying" | "recovered">("error");
  const [attempts, setAttempts] = useState(1);
  const [reported, setReported] = useState(false);
  const shake = useAnimationControls();
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const retry = async () => {
    setPhase("retrying");
    try {
      await onRetry?.();
      if (alive.current) setPhase("recovered");
    } catch {
      if (!alive.current) return;
      setPhase("error");
      setAttempts((a) => a + 1);
      if (!reduce) shake.start({ x: [0, -7, 6, -4, 2, 0], transition: { duration: 0.42, ease: "easeOut" } });
    }
  };

  const isRecovered = phase === "recovered";
  const copyText = [
    `Error ID: ${details.id}`,
    details.status && `Status: ${details.status}`,
    details.request && `Request: ${details.request}`,
    details.time && `Time: ${details.time}`,
    `Attempts: ${attempts}`,
    ...(details.stack ?? []),
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <MotionConfig reducedMotion="user">
      <section
        className={cn(
          "mx-auto w-full max-w-[1040px] overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-xs/5",
          className,
        )}
      >
        <header className="flex h-12 items-center gap-3 border-b px-4">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <MountainIcon className="size-3.5" />
          </span>
          <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
            <span className="font-medium">{product}</span>
            {breadcrumb.map((crumb, i) => (
              <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground" key={crumb}>
                <span aria-hidden className="text-foreground/20">
                  /
                </span>
                <span className={cn("truncate", i === breadcrumb.length - 1 && "text-foreground")}>{crumb}</span>
              </span>
            ))}
          </nav>
          <span className="ms-auto flex size-7 shrink-0 items-center justify-center rounded-full bg-muted font-medium text-muted-foreground text-xs">
            {userInitials}
          </span>
        </header>

        <div className="flex min-h-[500px] flex-col items-center px-5 pt-14 pb-12 text-center sm:min-h-[620px] sm:pt-24 sm:pb-14">
          <motion.div animate={shake} className="flex w-full flex-col items-center">
            <DitherGlyph busy={phase === "retrying"} recovered={isRecovered} />

            <div aria-live="polite" className="mt-7 grid w-full max-w-md place-items-center">
              <AnimatePresence initial={false} mode="popLayout">
                <motion.div className="flex flex-col items-center" key={isRecovered ? "ok" : "err"} {...swap}>
                  <h2 className="text-balance font-semibold text-xl tracking-tight">{isRecovered ? recovered.title : title}</h2>
                  <p className="mt-2 max-w-[26rem] text-pretty text-muted-foreground text-sm">
                    {isRecovered ? recovered.description : attempts > 1 ? stillFailingDescription : description}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <AnimatePresence initial={false} mode="popLayout">
                {isRecovered ? (
                  <motion.div key="continue" {...swap}>
                    <Button className="active:scale-[0.97]" onClick={onContinue}>
                      {recovered.actionLabel}
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div className="flex flex-wrap items-center justify-center gap-2" key="actions" {...swap}>
                    <Button className="min-w-28 active:scale-[0.97]" loading={phase === "retrying"} onClick={retry}>
                      <RotateCwIcon />
                      Try again
                    </Button>
                    <Button className="active:scale-[0.97]" onClick={onGoToDashboard} variant="outline">
                      <LayoutDashboardIcon />
                      Go to dashboard
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          <AnimatePresence initial={false}>
            {!isRecovered && (
              <motion.div
                animate={{ opacity: 1, height: "auto" }}
                className="w-full max-w-md overflow-hidden"
                exit={{ opacity: 0, height: 0 }}
                initial={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.24, ease }}
              >
                <Collapsible className="mt-8 rounded-xl border bg-background text-left shadow-xs/5 dark:bg-input/16">
                  <div className="flex items-center gap-2 pe-2">
                    <CollapsibleTrigger className="group flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-xl py-2.5 ps-3.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <ChevronDownIcon className="size-4 shrink-0 -rotate-90 text-muted-foreground transition-transform duration-200 group-data-panel-open:rotate-0" />
                      <span className="font-medium">Error details</span>
                      <span className="ms-auto truncate font-mono text-muted-foreground text-xs">{details.id}</span>
                    </CollapsibleTrigger>
                    <CopyButton text={copyText} />
                  </div>
                  <CollapsiblePanel>
                    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 border-t px-3.5 pt-3 font-mono text-xs">
                      {details.status && (
                        <>
                          <dt className="text-muted-foreground">Status</dt>
                          <dd className="min-w-0 truncate">{details.status}</dd>
                        </>
                      )}
                      {details.request && (
                        <>
                          <dt className="text-muted-foreground">Request</dt>
                          <dd className="min-w-0 truncate">{details.request}</dd>
                        </>
                      )}
                      {details.time && (
                        <>
                          <dt className="text-muted-foreground">Time</dt>
                          <dd className="min-w-0 truncate tabular-nums">{details.time}</dd>
                        </>
                      )}
                      <dt className="text-muted-foreground">Attempts</dt>
                      <dd className="tabular-nums">{attempts}</dd>
                    </dl>
                    {details.stack && details.stack.length > 0 && (
                      <pre className="mx-3.5 mt-3 mb-3.5 overflow-x-auto rounded-lg bg-muted/60 px-3 py-2.5 font-mono text-[0.6875rem] text-muted-foreground leading-5">
                        {details.stack.map((line, i) => (
                          <span className={cn("block", i === 0 && "text-foreground")} key={line}>
                            {line}
                          </span>
                        ))}
                      </pre>
                    )}
                  </CollapsiblePanel>
                </Collapsible>

                <div className="mt-3 flex h-7 justify-center">
                  <AnimatePresence initial={false} mode="popLayout">
                    {reported ? (
                      <motion.p
                        className="flex items-center gap-1.5 text-muted-foreground text-xs"
                        key="done"
                        role="status"
                        {...swap}
                      >
                        <DrawnCheck className="size-3.5 text-success-foreground" />
                        Reported. We’ll look into {details.id}.
                      </motion.p>
                    ) : (
                      <motion.div key="report" {...swap}>
                        <Button
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            setReported(true);
                            onReport?.(details.id);
                          }}
                          size="xs"
                          variant="ghost"
                        >
                          <FlagIcon />
                          Report this
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </MotionConfig>
  );
}
