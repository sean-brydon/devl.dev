"use client";

import { SmilePlusIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type KeyboardEvent, type PointerEvent, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// Stays false until mounted so the server render and the first client render match.
function useSafeReducedMotion() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && !!prefers;
}

export interface ReactionOption {
  emoji: string;
  label: string;
}

export interface Reaction {
  emoji: string;
  count: number;
  mine?: boolean;
}

export interface ReactionPickerProps {
  reactions?: Reaction[];
  options?: ReactionOption[];
  onChange?: (reactions: Reaction[]) => void;
  holdDelay?: number;
  className?: string;
}

export const defaultReactionOptions: ReactionOption[] = [
  { emoji: "👍", label: "Like" },
  { emoji: "❤️", label: "Love" },
  { emoji: "😂", label: "Funny" },
  { emoji: "🎉", label: "Celebrate" },
  { emoji: "😮", label: "Wow" },
  { emoji: "🙏", label: "Thanks" },
];

const TRIGGER = 32;
const SLOT = 36;
const PAD = 4;
const TRAY_H = 44;
const GAP = 8;
const BLUR_ROOM = 24;

const spring = { type: "spring", stiffness: 520, damping: 34 } as const;

function Count({ value, reduce }: { value: number; reduce: boolean | null }) {
  return (
    <span className="relative inline-flex h-4 min-w-[1ch] justify-center overflow-hidden tabular-nums">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          animate={{ y: 0, opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { y: -10, opacity: 0 }}
          initial={reduce ? { opacity: 0 } : { y: 10, opacity: 0 }}
          key={value}
          transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export function ReactionPicker({
  reactions: initial = [],
  options = defaultReactionOptions,
  onChange,
  holdDelay = 280,
  className,
}: ReactionPickerProps) {
  const reduce = useSafeReducedMotion();
  const filterId = `goo-${useId().replace(/:/g, "")}`;
  const trayId = useId();
  const [reactions, setReactions] = useState(initial);
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);
  const [focusIndex, setFocusIndex] = useState(0);
  const holdTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const holding = useRef(false);
  const wasOpen = useRef(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const emojiRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const trayW = options.length * SLOT + PAD * 2;

  useEffect(() => () => clearTimeout(holdTimer.current), []);

  const toggle = (emoji: string) => {
    setReactions((rs) => {
      const existing = rs.find((r) => r.emoji === emoji);
      let next: Reaction[];
      if (!existing) next = [...rs, { emoji, count: 1, mine: true }];
      else if (existing.mine) {
        next = rs
          .map((r) => (r.emoji === emoji ? { ...r, count: r.count - 1, mine: false } : r))
          .filter((r) => r.count > 0);
      } else next = rs.map((r) => (r.emoji === emoji ? { ...r, count: r.count + 1, mine: true } : r));
      onChange?.(next);
      return next;
    });
  };

  const pick = (emoji: string) => {
    const mine = reactions.find((r) => r.emoji === emoji)?.mine;
    if (!mine) toggle(emoji);
    close(true);
  };

  const close = (refocus = false) => {
    setOpen(false);
    setHovered(null);
    if (refocus) triggerRef.current?.focus({ preventScroll: true });
  };

  const emojiAt = (x: number, y: number) => {
    const i = emojiRefs.current.findIndex((el) => {
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return x >= r.left - 2 && x <= r.right + 2 && y >= r.top - 14 && y <= r.bottom + 14;
    });
    return i < 0 ? null : i;
  };

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    wasOpen.current = open;
    holding.current = false;
    clearTimeout(holdTimer.current);
    holdTimer.current = setTimeout(() => {
      holding.current = true;
      setOpen(true);
    }, holdDelay);
  };
  const onPointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    if (holding.current) setHovered(emojiAt(e.clientX, e.clientY));
  };
  const onPointerUp = (e: PointerEvent<HTMLButtonElement>) => {
    clearTimeout(holdTimer.current);
    if (holding.current) {
      holding.current = false;
      const i = emojiAt(e.clientX, e.clientY);
      if (i !== null) pick(options[i].emoji);
      return;
    }
    setOpen(!wasOpen.current);
  };

  const onTriggerKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Enter" || e.key === " " || e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      setFocusIndex(0);
      requestAnimationFrame(() => emojiRefs.current[0]?.focus());
    }
  };

  const onTrayKey = (e: KeyboardEvent<HTMLDivElement>) => {
    let i = focusIndex;
    if (e.key === "ArrowRight") i = (focusIndex + 1) % options.length;
    else if (e.key === "ArrowLeft") i = (focusIndex - 1 + options.length) % options.length;
    else if (e.key === "Home") i = 0;
    else if (e.key === "End") i = options.length - 1;
    else if (e.key === "Escape") {
      e.preventDefault();
      close(true);
      return;
    } else return;
    e.preventDefault();
    setFocusIndex(i);
    emojiRefs.current[i]?.focus();
  };

  const trayLeft = -PAD;
  const trayTop = -(TRAY_H + GAP);
  const originX = TRIGGER / 2 - trayLeft;

  return (
    <div className={cn("relative flex flex-wrap items-center gap-1.5", className)}>
      <div className="relative" style={{ width: TRIGGER, height: TRIGGER }}>
        <svg aria-hidden className="absolute size-0">
          <filter colorInterpolationFilters="sRGB" height="140%" id={filterId} width="120%" x="-10%" y="-20%">
            <feGaussianBlur in="SourceGraphic" result="blur" stdDeviation="5" />
            <feColorMatrix in="blur" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -11" />
          </filter>
        </svg>

        <div
          aria-hidden
          className="pointer-events-none absolute transition-[filter] duration-200 ease-out"
          style={{
            left: trayLeft - BLUR_ROOM,
            top: trayTop - BLUR_ROOM,
            width: trayW + BLUR_ROOM * 2,
            height: -trayTop + TRIGGER + BLUR_ROOM * 2,
            filter: reduce
              ? undefined
              : `drop-shadow(0 6px 14px color-mix(in srgb, black ${open ? 12 : 0}%, transparent))`,
          }}
        >
        <div
          className="absolute inset-0"
          style={{
            filter: reduce
              ? undefined
              : `url(#${filterId}) drop-shadow(0 0 0.75px color-mix(in srgb, var(--color-foreground) 22%, transparent))`,
          }}
        >
          <div className="absolute" style={{ left: BLUR_ROOM - trayLeft, top: BLUR_ROOM - trayTop }}>
          <span className="absolute top-0 left-0 rounded-full bg-popover" style={{ width: TRIGGER, height: TRIGGER }} />
          <AnimatePresence>
            {open && (
              <motion.span
                animate={{ y: 0, scaleX: 1, scaleY: 1, opacity: 1 }}
                className={cn("absolute rounded-full bg-popover", reduce && "border shadow-lg/5")}
                exit={
                  reduce
                    ? { opacity: 0 }
                    : {
                        y: TRAY_H * 0.9,
                        scaleX: 0.14,
                        scaleY: 0.72,
                        transition: {
                          scaleX: { duration: 0.16, ease: [0.4, 0, 0.2, 1] },
                          scaleY: { duration: 0.16, ease: [0.4, 0, 0.2, 1] },
                          y: { duration: 0.2, delay: 0.05, ease: [0.4, 0, 0.2, 1] },
                        },
                      }
                }
                initial={reduce ? { opacity: 0 } : { y: TRAY_H * 0.9, scaleX: 0.14, scaleY: 0.72, opacity: 1 }}
                style={{ left: trayLeft, top: trayTop, width: trayW, height: TRAY_H, transformOrigin: `${originX}px 100%` }}
                transition={
                  reduce
                    ? { duration: 0.12 }
                    : {
                        y: { type: "spring", stiffness: 700, damping: 42 },
                        scaleX: { type: "spring", stiffness: 380, damping: 30, delay: 0.04 },
                        scaleY: { type: "spring", stiffness: 420, damping: 30 },
                      }
                }
              />
            )}
          </AnimatePresence>
          </div>
        </div>
        </div>
        {reduce && (
          <span aria-hidden className="pointer-events-none absolute inset-0 rounded-full border bg-popover" />
        )}

        <button
          aria-controls={open ? trayId : undefined}
          aria-expanded={open}
          aria-haspopup="true"
          aria-label="Add reaction"
          className="relative z-10 flex size-8 cursor-pointer touch-none select-none items-center justify-center rounded-full text-muted-foreground outline-none transition-[color,scale] duration-150 ease-out hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card active:scale-[0.95]"
          onBlur={(e) => {
            const tray = document.getElementById(trayId);
            if (!tray?.contains(e.relatedTarget as Node)) close();
          }}
          onContextMenu={(e) => e.preventDefault()}
          onKeyDown={onTriggerKey}
          onPointerCancel={() => clearTimeout(holdTimer.current)}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          ref={triggerRef}
          type="button"
        >
          <SmilePlusIcon className="size-4" />
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              aria-label="Pick a reaction"
              className="absolute z-20 flex items-center"
              exit={{ opacity: 0, transition: { duration: 0.08 } }}
              id={trayId}
              key="tray"
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node) && e.relatedTarget !== triggerRef.current) close();
              }}
              onKeyDown={onTrayKey}
              role="toolbar"
              style={{ left: trayLeft, top: trayTop, width: trayW, height: TRAY_H, paddingInline: PAD }}
            >
              {options.map((o, i) => {
                const mine = reactions.find((r) => r.emoji === o.emoji)?.mine;
                const isHot = hovered === i;
                return (
                  <motion.button
                    animate={{ opacity: 1, y: isHot ? -6 : 0, scale: isHot ? 1.32 : 1 }}
                    aria-label={o.label}
                    aria-pressed={!!mine}
                    className="group/emoji relative flex shrink-0 cursor-pointer items-center justify-center rounded-full text-[22px] leading-none outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    data-emoji={o.emoji}
                    initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.6 }}
                    key={o.emoji}
                    onClick={() => pick(o.emoji)}
                    onFocus={() => setFocusIndex(i)}
                    onPointerEnter={(e) => e.pointerType === "mouse" && setHovered(i)}
                    onPointerLeave={(e) => e.pointerType === "mouse" && setHovered((h) => (h === i ? null : h))}
                    ref={(el) => {
                      emojiRefs.current[i] = el;
                    }}
                    style={{ width: SLOT, height: SLOT }}
                    tabIndex={i === focusIndex ? 0 : -1}
                    transition={
                      reduce
                        ? { duration: 0.12 }
                        : {
                            ...spring,
                            delay: isHot || hovered !== null ? 0 : 0.05 + i * 0.025,
                          }
                    }
                    type="button"
                  >
                    <span aria-hidden>{o.emoji}</span>
                    {mine && <span aria-hidden className="absolute -bottom-0.5 size-1 rounded-full bg-info" />}
                    <AnimatePresence>
                      {isHot && (
                        <motion.span
                          animate={{ opacity: 1, y: 0 }}
                          className="pointer-events-none absolute -top-7 whitespace-nowrap rounded-md bg-primary px-1.5 py-0.5 font-medium text-[10px] text-primary-foreground"
                          exit={{ opacity: 0, transition: { duration: 0.06 } }}
                          initial={{ opacity: 0, y: 3 }}
                          style={{ scale: 1 / 1.32 }}
                          transition={{ duration: 0.12 }}
                        >
                          {o.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence initial={false} mode="popLayout">
        {reactions.map((r) => {
          const label = options.find((o) => o.emoji === r.emoji)?.label ?? r.emoji;
          return (
            <motion.button
              animate={{ opacity: 1, scale: 1 }}
              aria-label={`${label}, ${r.count} ${r.count === 1 ? "reaction" : "reactions"}${r.mine ? ", including you" : ""}`}
              aria-pressed={!!r.mine}
              className={cn(
                "flex h-7 cursor-pointer items-center gap-1 rounded-full border px-2 font-medium text-xs outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]",
                r.mine
                  ? "border-info/40 bg-info/10 text-info-foreground"
                  : "bg-background text-muted-foreground hover:border-foreground/20 hover:text-foreground dark:bg-input/32",
              )}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.12 } }}
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.85 }}
              key={r.emoji}
              layout
              onClick={() => toggle(r.emoji)}
              transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 600, damping: 36 }}
              type="button"
            >
              <span aria-hidden className="text-sm leading-none">
                {r.emoji}
              </span>
              <Count reduce={reduce} value={r.count} />
            </motion.button>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
