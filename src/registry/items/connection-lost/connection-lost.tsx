"use client";

import { WifiOffIcon } from "lucide-react";
import { AnimatePresence, MotionConfig, type MotionValue, motion, useReducedMotion, useSpring, useTransform } from "motion/react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ConnectionPhase = "hidden" | "offline" | "reconnecting" | "synced";

export interface ConnectionLostProps {
  online: boolean;
  pendingChanges?: number;
  retryDelays?: number[];
  checkConnection?: () => Promise<boolean>;
  settleAfter?: number;
  onSynced?: (count: number) => void;
  onPhaseChange?: (phase: ConnectionPhase) => void;
  className?: string;
}

const ease = [0.23, 1, 0.32, 1] as const;
const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

function changes(n: number) {
  return `${n} ${n === 1 ? "change" : "changes"}`;
}

function Face({ n, turn }: { n: number; turn: MotionValue<number> }) {
  const y = useTransform(turn, (t) => {
    let offset = (((n - t) % 10) + 10) % 10;
    if (offset > 5) offset -= 10;
    return `${offset * 100}%`;
  });
  return (
    <motion.span aria-hidden className="absolute inset-0 text-center" style={{ y }}>
      {n}
    </motion.span>
  );
}

function RollingDigit({ value }: { value: number }) {
  const reduce = useReducedMotion();
  const target = useRef(value);
  const turn = useSpring(value, { stiffness: 320, damping: 32, mass: 0.7 });

  useEffect(() => {
    const current = ((target.current % 10) + 10) % 10;
    let step = value - current;
    if (step > 5) step -= 10;
    else if (step < -5) step += 10;
    target.current += step;
    if (reduce) turn.jump(target.current);
    else turn.set(target.current);
  }, [value, reduce, turn]);

  return (
    <span className="relative inline-block h-[1.4em] w-[0.62em] overflow-hidden leading-[1.4em] [mask-image:linear-gradient(transparent,black_25%,black_75%,transparent)]">
      {DIGITS.map((n) => (
        <Face key={n} n={n} turn={turn} />
      ))}
    </span>
  );
}

function Clock({ seconds }: { seconds: number }) {
  const m = Math.floor(seconds / 60);
  const s = String(seconds % 60).padStart(2, "0");
  return (
    <span className="inline-flex items-center font-medium text-foreground tabular-nums">
      <span className="sr-only">{`${m}:${s}`}</span>
      <span aria-hidden className="inline-flex items-center">
        <RollingDigit value={m} />
        <span className="px-px">:</span>
        <RollingDigit value={Number(s[0])} />
        <RollingDigit value={Number(s[1])} />
      </span>
    </span>
  );
}

function GooDots() {
  const reduce = useReducedMotion();
  const filterId = `connection-goo-${useId().replace(/:/g, "")}`;
  const spots = [6, 20, 34];

  return (
    <span aria-hidden className="relative block h-6 w-10 shrink-0 text-foreground">
      <svg className="absolute size-0">
        <filter colorInterpolationFilters="sRGB" height="200%" id={filterId} width="160%" x="-30%" y="-50%">
          <feGaussianBlur in="SourceGraphic" result="blur" stdDeviation="2" />
          <feColorMatrix in="blur" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" />
        </filter>
      </svg>
      <span className="absolute inset-0" style={{ filter: `url(#${filterId})` }}>
        {spots.map((x, i) => (
          <motion.span
            animate={reduce ? { opacity: [0.35, 1, 0.35] } : { scale: [1, 0.85, 1] }}
            className="absolute top-1/2 size-2 rounded-full bg-current"
            key={x}
            style={{ left: x - 4, marginTop: -4 }}
            transition={{ duration: 1.2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut", delay: i * 0.2 }}
          />
        ))}
        {!reduce && (
          <motion.span
            animate={{ x: [0, 28, 0] }}
            className="absolute top-1/2 left-px size-2.5 rounded-full bg-current"
            style={{ marginTop: -5 }}
            transition={{ duration: 1.8, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
          />
        )}
      </span>
    </span>
  );
}

function DrawnCheck({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  return (
    <svg aria-hidden className={className} fill="none" viewBox="0 0 24 24">
      <motion.path
        animate={{ pathLength: 1 }}
        d="M5 12.5l4.5 4.5L19 7.5"
        initial={{ pathLength: reduce ? 1 : 0 }}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.5}
        transition={{ duration: 0.34, delay: 0.1, ease }}
      />
    </svg>
  );
}

const swap = {
  initial: { opacity: 0, y: 5, filter: "blur(2px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -5, filter: "blur(2px)" },
  transition: { duration: 0.2, ease },
};

export function ConnectionLost({
  online,
  pendingChanges = 0,
  retryDelays = [8, 15, 30],
  checkConnection,
  settleAfter = 2600,
  onSynced,
  onPhaseChange,
  className,
}: ConnectionLostProps) {
  const [phase, setPhase] = useState<ConnectionPhase>(online ? "hidden" : "offline");
  const [left, setLeft] = useState(retryDelays[0] ?? 8);
  const [synced, setSynced] = useState(0);
  const attempt = useRef(0);
  const run = useRef(0);
  const onlineRef = useRef(online);
  const pendingRef = useRef(pendingChanges);
  const phaseRef = useRef(phase);

  useEffect(() => {
    onlineRef.current = online;
    pendingRef.current = pendingChanges;
  });

  useEffect(() => {
    phaseRef.current = phase;
    onPhaseChange?.(phase);
  }, [phase, onPhaseChange]);

  useEffect(
    () => () => {
      run.current += 1;
    },
    [],
  );

  const delayFor = useCallback(
    (n: number) => retryDelays[Math.min(n, retryDelays.length - 1)] ?? 8,
    [retryDelays],
  );

  const reconnect = useCallback(async () => {
    const token = ++run.current;
    setPhase("reconnecting");
    const ok = checkConnection
      ? await checkConnection().catch(() => false)
      : await new Promise<boolean>((resolve) => setTimeout(() => resolve(onlineRef.current), 1400));
    if (token !== run.current) return;
    if (ok) {
      attempt.current = 0;
      setSynced(pendingRef.current);
      setPhase("synced");
      onSynced?.(pendingRef.current);
    } else {
      attempt.current += 1;
      setLeft(delayFor(attempt.current));
      setPhase("offline");
    }
  }, [checkConnection, delayFor, onSynced]);

  useEffect(() => {
    const current = phaseRef.current;
    if (!online && (current === "hidden" || current === "synced")) {
      run.current += 1;
      attempt.current = 0;
      setLeft(delayFor(0));
      setPhase("offline");
    } else if (online && current === "offline") {
      reconnect();
    }
  }, [online, delayFor, reconnect]);

  useEffect(() => {
    if (phase !== "offline") return;
    if (left <= 0) {
      reconnect();
      return;
    }
    const t = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, left, reconnect]);

  useEffect(() => {
    if (phase !== "synced") return;
    const t = setTimeout(() => setPhase("hidden"), settleAfter);
    return () => clearTimeout(t);
  }, [phase, settleAfter]);

  const savedLine = pendingChanges > 0 ? `${changes(pendingChanges)} saved on this device.` : "New changes will be saved on this device.";

  return (
    <MotionConfig reducedMotion="user">
      <div aria-live="polite" className={cn("@container w-full", className)} role="status">
        <AnimatePresence>
          {phase !== "hidden" && (
            <motion.div
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="flex items-center gap-2.5 rounded-xl border bg-popover p-2.5 pe-3 @md:gap-3 text-popover-foreground shadow-lg/5"
              exit={{ opacity: 0, y: 10, scale: 0.97 }}
              initial={{ opacity: 0, y: 14, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 420, damping: 34 }}
            >
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors duration-300 @md:size-9",
                  phase === "synced" ? "bg-success/12 text-success-foreground" : "bg-warning/12 text-warning-foreground",
                )}
              >
                {phase === "synced" ? <DrawnCheck className="size-4 @md:size-4.5" /> : <WifiOffIcon className="size-4 @md:size-4.5" />}
              </span>

              <div className="relative min-w-0 flex-1">
                <AnimatePresence initial={false} mode="popLayout">
                  <motion.div key={phase === "synced" ? "synced" : phase === "reconnecting" ? "reconnecting" : "offline"} {...swap}>
                    {phase === "synced" ? (
                      <>
                        <p className="truncate font-medium text-sm">
                          Back online
                          <span className="font-normal text-muted-foreground"> · synced {changes(synced)}</span>
                        </p>
                        <p className="truncate text-muted-foreground text-xs">Everything is up to date.</p>
                      </>
                    ) : (
                      <>
                        <p className="truncate font-medium text-sm">{phase === "reconnecting" ? "Reconnecting" : "You’re offline."}</p>
                        <p className="truncate text-muted-foreground text-xs">{savedLine}</p>
                        {phase === "offline" && (
                          <p className="flex items-center gap-1 text-muted-foreground text-xs @md:hidden">
                            Retrying in <Clock seconds={left} />
                          </p>
                        )}
                      </>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              <AnimatePresence initial={false} mode="popLayout">
                {phase === "offline" && (
                  <motion.div className="flex shrink-0 items-center gap-2.5" key="retry" {...swap}>
                    <span className="hidden items-center gap-1 whitespace-nowrap text-muted-foreground text-xs @md:inline-flex">
                      Retrying in <Clock seconds={left} />
                    </span>
                    <Button aria-label="Retry now" className="text-sm active:scale-[0.97]" onClick={reconnect} size="sm" variant="outline">
                      <span className="@md:hidden">Retry</span>
                      <span className="hidden @md:inline">Retry now</span>
                    </Button>
                  </motion.div>
                )}
                {phase === "reconnecting" && (
                  <motion.div className="flex shrink-0 items-center pe-1" key="goo" {...swap}>
                    <GooDots />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
