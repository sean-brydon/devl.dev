"use client";

import {
  ArrowRightIcon,
  CheckIcon,
  DatabaseIcon,
  FileCodeIcon,
  HistoryIcon,
  LockIcon,
  MailIcon,
  MessageSquareIcon,
  RocketIcon,
  SlidersHorizontalIcon,
  Undo2Icon,
} from "lucide-react";
import { AnimatePresence, MotionConfig, motion, useReducedMotion, useSpring, useTransform } from "motion/react";
import { type KeyboardEvent, type PointerEvent, type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type RewindKind = "file" | "database" | "setting" | "message" | "email" | "deploy";

export interface RewindChange {
  id: string;
  kind: RewindKind;
  title: string;
  target: string;
  before: string;
  after: string;
  at: string;
  irreversible?: string;
}

export interface RewindProps {
  changes: RewindChange[];
  agent?: string;
  task?: string;
  defaultAt?: number;
  onRewind?: (changes: RewindChange[]) => void | Promise<void>;
  onUndo?: (changes: RewindChange[]) => void | Promise<void>;
  className?: string;
}

const kindIcons: Record<RewindKind, typeof FileCodeIcon> = {
  file: FileCodeIcon,
  database: DatabaseIcon,
  setting: SlidersHorizontalIcon,
  message: MessageSquareIcon,
  email: MailIcon,
  deploy: RocketIcon,
};

const ease = [0.23, 1, 0.32, 1] as const;
const swap = { duration: 0.16, ease };
const press = "transition-[scale,box-shadow,background-color] duration-150 ease-out active:scale-[0.97]";
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

type Phase = { name: "idle" } | { name: "confirm" } | { name: "working" } | { name: "done"; batch: RewindChange[]; to: string };

export function Rewind({ changes, agent = "Agent", task, defaultAt, onRewind, onUndo, className }: RewindProps) {
  const reduce = useReducedMotion();
  const [gone, setGone] = useState<Set<string>>(() => new Set());
  const live = changes.filter((c) => !gone.has(c.id));
  const n = live.length;
  let lockAt = -1;
  live.forEach((c, i) => {
    if (c.irreversible) lockAt = i;
  });
  const minSlot = lockAt + 1;

  const [slot, setSlot] = useState(() => clamp(defaultAt ?? n, minSlot, n));
  const [phase, setPhase] = useState<Phase>({ name: "idle" });
  const [hover, setHover] = useState<string | null>(null);
  const [bump, setBump] = useState(0);

  const track = useRef<HTMLDivElement>(null);
  const handle = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const dragging = useRef(false);
  const x = useSpring(0, { stiffness: 700, damping: 48, mass: 0.6 });
  const hatch = useTransform(x, (v) => `inset(0 0 0 ${v}px)`);
  const blockedRef = useRef(false);

  const at = (k: number) => ((k + 0.5) / (n + 1)) * width;
  const markAt = (i: number) => ((i + 1) / (n + 1)) * width;

  useLayoutEffect(() => {
    const el = track.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const placed = useRef(false);
  useLayoutEffect(() => {
    if (!width || dragging.current) return;
    const target = ((slot + 0.5) / (n + 1)) * width;
    if (!placed.current || reduce) x.jump(target);
    else x.set(target);
    placed.current = true;
  }, [slot, width, n, x, reduce]);

  const pushBack = () => {
    setBump((b) => b + 1);
    if (reduce) return;
    const home = at(minSlot);
    x.set(home - 10);
    window.setTimeout(() => !dragging.current && x.set(home), 90);
  };

  const busy = phase.name === "working";
  const move = (k: number) => {
    if (busy) return;
    if (k < minSlot) {
      if (slot !== minSlot) setSlot(minSlot);
      pushBack();
      return;
    }
    setSlot(clamp(k, minSlot, n));
    if (phase.name === "confirm" || phase.name === "done") setPhase({ name: "idle" });
  };

  const fromPointer = (e: PointerEvent) => {
    const rect = track.current?.getBoundingClientRect();
    if (!rect || !width) return;
    const px = e.clientX - rect.left;
    const raw = Math.round((px / width) * (n + 1) - 0.5);
    const k = clamp(raw, 0, n);
    if (k < minSlot) {
      if (slot !== minSlot) setSlot(minSlot);
      if (phase.name !== "idle") setPhase({ name: "idle" });
      const home = at(minSlot);
      x.set(reduce ? home : home - Math.min(14, Math.max(0, home - px) * 0.25));
      if (!blockedRef.current) setBump((b) => b + 1);
      blockedRef.current = true;
      return;
    }
    blockedRef.current = false;
    if (k !== slot) move(k);
    x.set(at(k));
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const keys: Record<string, number> = { ArrowLeft: slot - 1, ArrowDown: slot - 1, ArrowRight: slot + 1, ArrowUp: slot + 1, Home: minSlot, End: n };
    const k = keys[e.key];
    if (k === undefined) return;
    e.preventDefault();
    if (k > n) return;
    move(k);
  };

  const revert = live.slice(slot);
  const label = (k: number) => (k === n ? "Now" : k === 0 ? "Start" : live[k - 1].at);
  const locked = lockAt >= 0 && slot === minSlot;

  const commit = async () => {
    const batch = revert;
    const to = label(slot);
    setPhase({ name: "working" });
    try {
      await onRewind?.(batch);
      setGone((g) => new Set([...g, ...batch.map((c) => c.id)]));
      setPhase({ name: "done", batch, to });
      handle.current?.focus();
    } catch {
      setPhase({ name: "confirm" });
    }
  };

  const undo = async (batch: RewindChange[]) => {
    setPhase({ name: "working" });
    try {
      await onUndo?.(batch);
      setGone((g) => {
        const next = new Set(g);
        for (const c of batch) next.delete(c.id);
        return next;
      });
    } finally {
      setPhase({ name: "idle" });
    }
  };

  const prevN = useRef(n);
  useEffect(() => {
    if (prevN.current !== n) setSlot(n);
    prevN.current = n;
  }, [n]);

  let hint: { key: string; tone?: string; node: ReactNode };
  if (n === 0) hint = { key: "empty", node: "Nothing to rewind yet." };
  else if (locked && slot < n)
    hint = {
      key: `lock-${live[lockAt].id}`,
      tone: "text-warning-foreground",
      node: (
        <>
          <LockIcon aria-hidden className="mt-px size-3.5 shrink-0" />
          <span>
            <span className="font-medium">Can’t go back past “{live[lockAt].title}”.</span> {live[lockAt].irreversible}
          </span>
        </>
      ),
    };
  else if (slot < n)
    hint = {
      key: "preview",
      node: (
        <span>
          Rewinding to <span className="font-medium font-mono text-foreground tabular-nums">{label(slot)}</span> undoes {revert.length === 1 ? "1 change" : `${revert.length} changes`}.
        </span>
      ),
    };
  else if (lockAt >= 0 && lockAt === n - 1)
    hint = {
      key: "stuck",
      tone: "text-warning-foreground",
      node: (
        <>
          <LockIcon aria-hidden className="mt-px size-3.5 shrink-0" />
          <span>The last change can’t be taken back, so there’s nothing to rewind.</span>
        </>
      ),
    };
  else hint = { key: "idle", node: "Drag the playhead back to see what a rewind would undo." };

  return (
    <MotionConfig reducedMotion="user">
      <section aria-label={`${agent}'s changes`} className={cn("w-full max-w-[520px] rounded-2xl border bg-card text-card-foreground shadow-xs/5", className)}>
        <header className="flex items-start justify-between gap-3 px-4 pt-4">
          <div className="min-w-0">
            <h3 className="flex items-center gap-2 font-medium text-sm">
              <HistoryIcon aria-hidden className="size-4 text-muted-foreground" />
              Rewind {agent}
            </h3>
            {task && <p className="mt-0.5 truncate text-muted-foreground text-xs">{task}</p>}
          </div>
          <span className="shrink-0 pt-0.5 text-muted-foreground text-xs tabular-nums">{n === 1 ? "1 change" : `${n} changes`}</span>
        </header>

        <div className="px-4 pt-3">
          <div
            className={cn("relative h-16 touch-none select-none", n > 0 && !busy ? "cursor-ew-resize" : "pointer-events-none")}
            onLostPointerCapture={() => {
              dragging.current = false;
              x.set(at(slot));
            }}
            onPointerDown={(e) => {
              if (e.button !== 0 || !n) return;
              dragging.current = true;
              e.currentTarget.setPointerCapture(e.pointerId);
              fromPointer(e);
              handle.current?.focus({ preventScroll: true });
            }}
            onPointerMove={(e) => dragging.current && fromPointer(e)}
            onPointerUp={(e) => {
              dragging.current = false;
              e.currentTarget.releasePointerCapture(e.pointerId);
              x.set(at(slot));
            }}
            ref={track}
          >
            <div className="absolute inset-x-0 top-10 h-1 -translate-y-1/2 rounded-full bg-foreground/12" />
            {width > 0 && n > 0 && (
              <>
                {minSlot > 0 && (
                  <div className="absolute top-10 left-0 h-1 -translate-y-1/2 rounded-full bg-warning/40" style={{ width: markAt(lockAt) }} />
                )}
                <motion.div
                  className="absolute top-10 left-0 h-3 -translate-y-1/2 rounded-full bg-[repeating-linear-gradient(135deg,var(--color-info)_0_1.5px,transparent_1.5px_5px)] opacity-50"
                  style={{ clipPath: hatch, width: markAt(n - 1) + 10 }}
                />
              </>
            )}

            {width > 0 &&
              live.map((c, i) => {
                const undone = i >= slot;
                const Icon = c.irreversible ? LockIcon : null;
                return (
                  <motion.div
                    animate={{ x: markAt(i), opacity: 1 }}
                    className="absolute top-10 left-0"
                    initial={false}
                    key={c.id}
                    transition={{ type: "spring", stiffness: 420, damping: 40 }}
                  >
                    {Icon ? (
                      <span
                        className={cn(
                          "absolute top-0 left-0 grid size-5 -translate-1/2 place-items-center rounded-full border bg-card text-warning-foreground shadow-xs/5 transition-transform duration-150",
                          hover === c.id && "scale-110",
                        )}
                      >
                        <Icon className="size-3" />
                      </span>
                    ) : (
                      <span
                        className={cn(
                          "absolute top-0 left-0 size-2.5 -translate-1/2 rounded-full transition-[background-color,box-shadow,scale] duration-150 ease-out",
                          undone ? "bg-card shadow-[inset_0_0_0_1.5px_var(--color-info)]" : "bg-foreground/70",
                          hover === c.id && "scale-125",
                        )}
                      />
                    )}
                  </motion.div>
                );
              })}

            {width > 0 && n > 0 && (
              <motion.div className="absolute top-0 left-0 h-full" style={{ x }}>
                <div className="absolute top-0 left-0 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-1.5 py-0.5 font-medium font-mono text-[11px] text-background tabular-nums leading-4">
                  {label(slot)}
                </div>
                <div
                  aria-label="Rewind to"
                  aria-valuemax={n}
                  aria-valuemin={minSlot}
                  aria-valuenow={slot}
                  aria-valuetext={slot === n ? "Now, nothing undone" : `${label(slot)}, undoes ${revert.length} of ${n} changes`}
                  className="absolute top-[26px] left-0 h-7 w-3.5 -translate-x-1/2 cursor-grab rounded-full border bg-background shadow-sm outline-none transition-shadow before:absolute before:-inset-x-3 before:-inset-y-1.5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-card active:cursor-grabbing"
                  onKeyDown={onKeyDown}
                  ref={handle}
                  role="slider"
                  tabIndex={0}
                >
                  <span className="absolute inset-y-2 left-1/2 w-px -translate-x-1/2 bg-foreground/30" />
                </div>
              </motion.div>
            )}
          </div>

          <div className="flex justify-between font-mono text-[11px] text-muted-foreground tabular-nums">
            <span>{live[0]?.at ?? ""}</span>
            <span>Now</span>
          </div>

          <div aria-live="polite" className="mt-2 min-h-10 text-xs">
            <AnimatePresence initial={false} mode="wait">
              <motion.div
                animate={{ opacity: 1, x: 0 }}
                className={cn("flex gap-1.5 text-pretty text-muted-foreground", hint.tone)}
                exit={{ opacity: 0, transition: { duration: 0.08 } }}
                initial={{ opacity: 0 }}
                key={hint.key}
                transition={swap}
              >
                <motion.span
                  animate={hint.key.startsWith("lock") && bump > 0 ? { x: [0, -3, 3, -2, 0] } : undefined}
                  className="flex gap-1.5"
                  key={bump}
                  transition={{ duration: 0.28, ease: "easeOut" }}
                >
                  {hint.node}
                </motion.span>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <ol className="mx-2 border-t px-0 py-1.5">
          <AnimatePresence initial={false}>
            {live.map((c, i) => {
              const undone = i >= slot;
              const KindIcon = kindIcons[c.kind];
              const pickable = i >= minSlot && !busy;
              return (
                <motion.li
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  initial={{ opacity: 0, height: 0 }}
                  key={c.id}
                  transition={{ duration: 0.22, ease }}
                >
                  <button
                    aria-label={`${c.title} at ${c.at}. ${undone ? `Would go back to ${c.before}.` : c.irreversible ? "Can't be undone." : `Rewind to before this.`}`}
                    className={cn(
                      "group flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default",
                      pickable && "cursor-pointer [@media(hover:hover)]:hover:bg-accent/60",
                      hover === c.id && pickable && "bg-accent/60",
                    )}
                    disabled={!pickable}
                    onClick={() => move(i)}
                    onPointerEnter={() => setHover(c.id)}
                    onPointerLeave={() => setHover((h) => (h === c.id ? null : h))}
                    type="button"
                  >
                    <span
                      className={cn(
                        "grid size-7 shrink-0 place-items-center rounded-full transition-[opacity,background-color,color] duration-150",
                        c.irreversible ? "bg-warning/10 text-warning-foreground" : undone ? "bg-info/10 text-info-foreground" : "bg-muted text-muted-foreground",
                      )}
                    >
                      {c.irreversible ? <LockIcon className="size-3.5" /> : <KindIcon className="size-3.5" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-3">
                        <span className={cn("truncate text-sm transition-colors duration-150", undone ? "text-muted-foreground" : "text-foreground")}>{c.title}</span>
                        <span className="shrink-0 font-mono text-[11px] text-muted-foreground tabular-nums">{c.at}</span>
                      </span>
                      <span className="mt-0.5 flex items-center justify-between gap-3 font-mono text-[11px]">
                        <span className="min-w-0 truncate text-muted-foreground">{c.target}</span>
                        <span className="flex min-w-0 max-w-[60%] shrink-0 items-center gap-1">
                          {undone ? (
                            <>
                              <span className="truncate text-muted-foreground line-through decoration-muted-foreground/60">{c.after}</span>
                              <ArrowRightIcon aria-hidden className="size-3 shrink-0 text-info-foreground" />
                              <span className="truncate text-info-foreground">{c.before}</span>
                            </>
                          ) : (
                            <span className="truncate text-foreground/80">{c.after}</span>
                          )}
                        </span>
                      </span>
                    </span>
                  </button>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ol>

        <footer className="flex min-h-14 items-center justify-between gap-3 border-t px-4 py-3">
          <AnimatePresence initial={false} mode="wait">
            {phase.name === "done" ? (
              <motion.div animate={{ opacity: 1, y: 0 }} className="flex w-full items-center justify-between gap-3" exit={{ opacity: 0 }} initial={{ opacity: 0, y: 2 }} key="done" transition={swap}>
                <span className="flex min-w-0 items-center gap-1.5 text-xs">
                  <CheckIcon aria-hidden className="size-3.5 shrink-0 text-success-foreground" />
                  <span className="truncate">
                    Back to <span className="font-mono tabular-nums">{phase.to}</span> · {phase.batch.length === 1 ? "1 change" : `${phase.batch.length} changes`} undone
                  </span>
                </span>
                <Button className={press} onClick={() => undo(phase.batch)} size="sm" variant="outline">
                  <Undo2Icon />
                  Undo
                </Button>
              </motion.div>
            ) : phase.name === "confirm" || phase.name === "working" ? (
              <motion.div animate={{ opacity: 1, y: 0 }} className="flex w-full items-center justify-between gap-3" exit={{ opacity: 0 }} initial={{ opacity: 0, y: 2 }} key="confirm" transition={swap}>
                <span className="min-w-0 text-pretty text-xs">
                  Undo {revert.length === 1 ? "1 change" : `${revert.length} changes`} made after <span className="font-mono tabular-nums">{label(slot)}</span>?
                </span>
                <span className="flex shrink-0 gap-2">
                  <Button className={press} disabled={busy} onClick={() => setPhase({ name: "idle" })} size="sm" variant="ghost">
                    Cancel
                  </Button>
                  <Button autoFocus className={press} loading={busy} onClick={commit} size="sm">
                    Rewind
                  </Button>
                </span>
              </motion.div>
            ) : (
              <motion.div animate={{ opacity: 1, y: 0 }} className="flex w-full items-center justify-between gap-3" exit={{ opacity: 0 }} initial={{ opacity: 0, y: 2 }} key="idle" transition={swap}>
                <span className="text-muted-foreground text-xs tabular-nums">
                  {slot < n ? `Keeps ${slot} · undoes ${revert.length}` : "Up to date"}
                </span>
                <Button className={press} disabled={slot >= n} onClick={() => setPhase({ name: "confirm" })} size="sm">
                  <Undo2Icon />
                  Rewind to here
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </footer>
      </section>
    </MotionConfig>
  );
}
