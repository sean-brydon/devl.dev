"use client";

import {
  AlertTriangleIcon,
  BellIcon,
  CheckCheckIcon,
  CheckCircle2Icon,
  InfoIcon,
  RotateCcwIcon,
  XIcon,
  type LucideIcon,
} from "lucide-react";
import { AnimatePresence, motion, type PanInfo, useReducedMotion } from "motion/react";
import { type KeyboardEvent, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type NoticeTone = "info" | "success" | "warning" | "destructive";

export interface Notice {
  id: string;
  title: string;
  body?: string;
  time?: string;
  tone?: NoticeTone;
  action?: string;
}

export interface CardPileProps {
  notices: Notice[];
  visible?: number;
  onDismiss?: (notice: Notice) => void;
  onAction?: (notice: Notice) => void;
  className?: string;
}

const toneStyle: Record<NoticeTone, { icon: LucideIcon; chip: string }> = {
  info: { icon: InfoIcon, chip: "bg-info/12 text-info-foreground" },
  success: { icon: CheckCircle2Icon, chip: "bg-success/12 text-success-foreground" },
  warning: { icon: AlertTriangleIcon, chip: "bg-warning/14 text-warning-foreground" },
  destructive: { icon: AlertTriangleIcon, chip: "bg-destructive/10 text-destructive-foreground" },
};

const SWIPE = 90;
const press = "transition-[scale,background-color,box-shadow] duration-150 ease-out active:scale-[0.97]";

export function CardPile({ notices, visible = 3, onDismiss, onAction, className }: CardPileProps) {
  const reduce = useReducedMotion();
  const [queue, setQueue] = useState(notices);
  const [exitDir, setExitDir] = useState<1 | -1>(1);
  // Exiting cards keep stale closures; always act on the live queue.
  const queueRef = useRef(queue);
  queueRef.current = queue;
  const stackRef = useRef<HTMLDivElement>(null);

  const dismiss = (dir: 1 | -1 = 1) => {
    const [front, next] = queueRef.current;
    if (!front) return;
    const hadFocus = stackRef.current?.contains(document.activeElement) ?? false;
    queueRef.current = queueRef.current.slice(1);
    setExitDir(dir);
    setQueue((q) => q.filter((n) => n.id !== front.id));
    onDismiss?.(front);
    if (hadFocus && next) {
      requestAnimationFrame(() => stackRef.current?.querySelector<HTMLElement>(`[data-notice="${next.id}"]`)?.focus());
    }
  };

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (Math.abs(info.offset.x) > SWIPE || Math.abs(info.velocity.x) > 600) dismiss(info.offset.x > 0 ? 1 : -1);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Delete" || e.key === "Backspace" || e.key === "ArrowRight") {
      e.preventDefault();
      dismiss(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      dismiss(-1);
    }
  };

  const stack = queue.slice(0, visible + 1);

  return (
    <section aria-label="Notifications" className={cn("w-full max-w-[380px]", className)}>
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="flex items-center gap-2 font-medium text-sm">
          <BellIcon className="size-4 text-muted-foreground" />
          Notifications
        </h2>
        <span aria-live="polite" className="text-muted-foreground text-xs tabular-nums">
          {queue.length ? `${queue.length} unread` : "All read"}
        </span>
      </div>

      <div className="relative h-[156px]" ref={stackRef} style={{ perspective: 800 }}>
        <AnimatePresence custom={exitDir} initial={false}>
          {stack
            .map((n, i) => {
              const front = i === 0;
              const hidden = i >= visible;
              const tone = toneStyle[n.tone ?? "info"];
              const Icon = tone.icon;
              return (
                <motion.article
                  animate={{
                    y: hidden ? -36 : -i * 12,
                    scale: 1 - i * 0.05,
                    opacity: hidden ? 0 : 1,
                    x: 0,
                    rotate: 0,
                  }}
                  aria-label={front ? `${n.title}. Press Delete or swipe to dismiss.` : undefined}
                  aria-hidden={!front}
                  className={cn(
                    "absolute inset-x-0 bottom-0 flex h-[132px] origin-top select-none flex-col rounded-2xl border bg-card p-4 text-card-foreground shadow-xs/5 outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    front ? "cursor-grab active:cursor-grabbing" : "pointer-events-none",
                  )}
                  custom={exitDir}
                  data-notice={n.id}
                  drag={front ? "x" : false}
                  dragElastic={0.6}
                  dragSnapToOrigin
                  exit="exit"
                  variants={{
                    exit: (dir: 1 | -1) =>
                      reduce
                        ? { opacity: 0, zIndex: 60, transition: { duration: 0.15 } }
                        : {
                            zIndex: 60,
                            x: dir * 360,
                            rotate: dir * 14,
                            opacity: 0,
                            pointerEvents: "none",
                            transition: { type: "spring", stiffness: 420, damping: 40 },
                          },
                  }}
                  initial={{ y: -48, scale: 1 - (visible + 1) * 0.05, opacity: 0 }}
                  key={n.id}
                  onDragEnd={front ? onDragEnd : undefined}
                  onKeyDown={front ? onKeyDown : undefined}
                  role="group"
                  style={{ zIndex: 50 - i }}
                  tabIndex={front ? 0 : -1}
                  transition={
                    reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 34 }
                  }
                  whileDrag={{ rotate: 0, scale: 1.02 }}
                >
                  <div className={cn("flex gap-3 transition-opacity duration-200", i > 1 && "opacity-0")}>
                    <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full", tone.chip)}>
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <h3 className="truncate font-medium text-sm">{n.title}</h3>
                        {n.time && <span className="ms-auto shrink-0 text-muted-foreground text-xs">{n.time}</span>}
                      </div>
                      {n.body && <p className="mt-0.5 line-clamp-2 text-muted-foreground text-sm">{n.body}</p>}
                    </div>
                  </div>
                  <div
                    className={cn(
                      "mt-auto flex items-center gap-2 pt-2 transition-opacity duration-200",
                      i > 1 && "opacity-0",
                    )}
                  >
                    <span className="text-muted-foreground/70 text-xs">Swipe to dismiss</span>
                    <div className="ms-auto flex gap-1.5">
                      {n.action && (
                        <Button
                          onClick={() => {
                            onAction?.(n);
                            dismiss(1);
                          }}
                          onPointerDown={(e) => e.stopPropagation()}
                          className={press}
                          size="xs"
                          tabIndex={front ? 0 : -1}
                          variant="outline"
                        >
                          {n.action}
                        </Button>
                      )}
                      <Button
                        aria-label={`Dismiss ${n.title}`}
                        className={cn(press, "after:absolute after:-inset-1")}
                        onClick={() => dismiss(1)}
                        onPointerDown={(e) => e.stopPropagation()}
                        size="icon-xs"
                        tabIndex={front ? 0 : -1}
                        variant="ghost"
                      >
                        <XIcon />
                      </Button>
                    </div>
                  </div>
                </motion.article>
              );
            })
            .reverse()}
        </AnimatePresence>

        <AnimatePresence>
          {queue.length === 0 && (
            <motion.div
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="absolute inset-x-0 bottom-0 flex h-[132px] flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed bg-muted/40 text-center"
              exit={{ opacity: 0, scale: 0.96 }}
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: "spring", stiffness: 380, damping: 32, delay: reduce ? 0 : 0.12 }}
            >
              <span className="flex size-7 items-center justify-center rounded-full bg-success/12 text-success-foreground">
                <CheckCheckIcon className="size-3.5" />
              </span>
              <p className="font-medium text-sm">You're all caught up</p>
              <Button className={press} onClick={() => setQueue(notices)} size="xs" variant="ghost">
                <RotateCcwIcon />
                Bring them back
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
