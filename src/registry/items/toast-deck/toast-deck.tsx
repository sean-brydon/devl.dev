"use client";

import { CircleAlertIcon, CircleCheckIcon, InfoIcon, LoaderCircleIcon, XIcon } from "lucide-react";
import { AnimatePresence, motion, type PanInfo, useReducedMotion } from "motion/react";
import { type ReactNode, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type ToastTone = "default" | "success" | "error" | "info" | "loading";

export interface ToastData {
  id: string;
  title: ReactNode;
  description?: ReactNode;
  tone?: ToastTone;
  action?: { label: string; onClick: () => void };
  duration?: number;
}

type ToastInput = Omit<ToastData, "id"> & { id?: string };

type PromiseMessages<T> = {
  loading: ReactNode;
  success: ReactNode | ((value: T) => ReactNode);
  error: ReactNode | ((error: unknown) => ReactNode);
  description?: ReactNode;
};

let counter = 0;

export function useToastDeck({ limit = 4 }: { limit?: number } = {}) {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const dismiss = useCallback((id: string) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const show = useCallback((input: ToastInput) => {
    const id = input.id ?? `t${++counter}`;
    setToasts((list) => {
      const exists = list.some((t) => t.id === id);
      return exists ? list.map((t) => (t.id === id ? { ...t, ...input, id } : t)) : [...list, { ...input, id }].slice(-limit);
    });
    return id;
  }, [limit]);

  const promise = useCallback(
    async <T,>(task: Promise<T>, messages: PromiseMessages<T>) => {
      const id = show({ title: messages.loading, description: messages.description, tone: "loading", duration: Infinity });
      try {
        const value = await task;
        const title = typeof messages.success === "function" ? messages.success(value) : messages.success;
        show({ id, title, tone: "success", description: undefined, duration: 4000 });
        return value;
      } catch (error) {
        const title = typeof messages.error === "function" ? messages.error(error) : messages.error;
        show({ id, title, tone: "error", description: undefined, duration: 5000 });
        throw error;
      }
    },
    [show],
  );

  return useMemo(() => ({ toasts, show, dismiss, promise }), [toasts, show, dismiss, promise]);
}

export type ToastDeckStore = ReturnType<typeof useToastDeck>;

const icons: Record<ToastTone, ReactNode> = {
  default: null,
  success: <CircleCheckIcon className="text-success" />,
  error: <CircleAlertIcon className="text-destructive" />,
  info: <InfoIcon className="text-info" />,
  loading: <LoaderCircleIcon className="animate-spin text-muted-foreground" />,
};

const PEEK = 10;
const GAP = 8;
const VISIBLE = 3;

export interface ToastDeckProps {
  deck: ToastDeckStore;
  className?: string;
}

export function ToastDeck({ deck, className }: ToastDeckProps) {
  const { toasts, dismiss } = deck;
  const [expanded, setExpanded] = useState(false);
  const [heights, setHeights] = useState<Record<string, number>>({});
  const reduce = useReducedMotion();

  const newestFirst = [...toasts].reverse();
  const frontHeight = heights[newestFirst[0]?.id] ?? 64;
  const offsets: number[] = [];
  let running = 0;
  for (const t of newestFirst) {
    offsets.push(running);
    running += (heights[t.id] ?? 64) + GAP;
  }
  const stackHeight = expanded
    ? Math.max(running - GAP, 0)
    : frontHeight + PEEK * Math.min(Math.max(newestFirst.length - 1, 0), VISIBLE - 1);

  useEffect(() => {
    if (toasts.length === 0) setExpanded(false);
  }, [toasts.length]);

  const setHeight = useCallback((id: string, h: number) => {
    setHeights((prev) => (prev[id] === h ? prev : { ...prev, [id]: h }));
  }, []);

  return (
    <section
      aria-label="Notifications"
      className={cn("pointer-events-none absolute inset-x-3 bottom-3 z-10", className)}
    >
      <motion.ol
        animate={{ height: toasts.length ? stackHeight : 0 }}
        className="pointer-events-auto relative"
        initial={false}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setExpanded(false);
        }}
        onFocus={() => setExpanded(true)}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 400, damping: 36 }}
      >
        <AnimatePresence initial={false}>
          {newestFirst.map((toast, index) => (
            <ToastItem
              expanded={expanded}
              frontHeight={frontHeight}
              index={index}
              key={toast.id}
              offset={offsets[index]}
              onDismiss={() => dismiss(toast.id)}
              onHeight={setHeight}
              paused={expanded}
              toast={toast}
            />
          ))}
        </AnimatePresence>
      </motion.ol>
    </section>
  );
}

interface ToastItemProps {
  toast: ToastData;
  index: number;
  offset: number;
  expanded: boolean;
  frontHeight: number;
  paused: boolean;
  onDismiss: () => void;
  onHeight: (id: string, h: number) => void;
}

function ToastItem({ toast, index, offset, expanded, frontHeight, paused, onDismiss, onHeight }: ToastItemProps) {
  const reduce = useReducedMotion();
  const contentRef = useRef<HTMLDivElement>(null);
  const [natural, setNatural] = useState(64);
  const [swipe, setSwipe] = useState(0);
  const tone = toast.tone ?? "default";
  const duration = toast.duration ?? 4000;

  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const measure = () => {
      setNatural(el.offsetHeight);
      onHeight(toast.id, el.offsetHeight);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [toast.id, onHeight]);

  const remaining = useRef(duration);
  useEffect(() => {
    remaining.current = duration;
  }, [duration, toast.title]);
  useEffect(() => {
    if (paused || !Number.isFinite(remaining.current)) return;
    const started = Date.now();
    const id = window.setTimeout(onDismiss, remaining.current);
    return () => {
      clearTimeout(id);
      remaining.current -= Date.now() - started;
    };
  }, [paused, onDismiss, toast.title, duration]);

  const hidden = !expanded && index >= VISIBLE;
  const y = expanded ? -offset : -index * PEEK;
  const scale = expanded ? 1 : 1 - index * 0.05;
  const height = expanded || index === 0 ? natural : frontHeight;

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (Math.abs(info.offset.x) > 90 || Math.abs(info.velocity.x) > 600) {
      setSwipe(info.offset.x > 0 ? 1 : -1);
      onDismiss();
    }
  };

  const spring = reduce ? { duration: 0 } : { type: "spring" as const, stiffness: 380, damping: 32 };

  return (
    <motion.li
      animate={{ y, scale, height, opacity: hidden ? 0 : 1 }}
      className="absolute inset-x-0 bottom-0 origin-bottom touch-pan-y"
      drag={reduce ? false : "x"}
      dragElastic={0.6}
      dragSnapToOrigin
      exit={
        swipe
          ? { x: swipe * 420, opacity: 0, transition: { duration: 0.25 } }
          : { y: y + 16, opacity: 0, scale: scale * 0.94, transition: { duration: 0.2 } }
      }
      initial={reduce ? false : { y: 40, opacity: 0, scale: 0.96, height: natural }}
      onDragEnd={onDragEnd}
      style={{ zIndex: 100 - index }}
      transition={spring}
    >
      <div
        aria-live={tone === "error" ? "assertive" : "polite"}
        className="group/toast relative h-full cursor-grab overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-lg/5 active:cursor-grabbing"
        role="status"
      >
        <motion.div
          animate={{ opacity: expanded || index === 0 ? 1 : 0 }}
          className="flex items-start gap-2.5 p-3 pe-9"
          ref={contentRef}
          transition={{ duration: 0.18 }}
        >
          <AnimatePresence initial={false} mode="popLayout">
            {icons[tone] && (
              <motion.span
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                className="mt-px flex shrink-0 [&_svg]:size-4"
                exit={{ scale: 0.6, opacity: 0 }}
                initial={reduce ? false : { scale: 0.6, opacity: 0 }}
                key={tone}
                transition={{ type: "spring", stiffness: 520, damping: 22 }}
              >
                {icons[tone]}
              </motion.span>
            )}
          </AnimatePresence>
          <div className="grid min-w-0 flex-1 gap-0.5">
            <AnimatePresence initial={false} mode="popLayout">
              <motion.p
                animate={{ opacity: 1, y: 0 }}
                className="font-medium text-sm"
                exit={{ opacity: 0, y: -6 }}
                initial={reduce ? false : { opacity: 0, y: 6 }}
                key={`${tone}`}
              >
                {toast.title}
              </motion.p>
            </AnimatePresence>
            {toast.description && <p className="text-muted-foreground text-xs">{toast.description}</p>}
          </div>
          {toast.action && (
            <button
              className="h-7 shrink-0 cursor-pointer self-center rounded-md bg-primary px-2.5 font-medium text-primary-foreground text-xs outline-none transition-[background-color,scale] hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]"
              onClick={() => {
                toast.action?.onClick();
                onDismiss();
              }}
              onPointerDownCapture={(e) => e.stopPropagation()}
              type="button"
            >
              {toast.action.label}
            </button>
          )}
        </motion.div>
        <button
          aria-label="Dismiss"
          className="absolute top-2 right-2 flex size-6 cursor-pointer items-center justify-center rounded-md text-muted-foreground opacity-0 outline-none transition-opacity hover:bg-accent hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring group-hover/toast:opacity-100 [&_svg]:size-3.5"
          onClick={onDismiss}
          onPointerDownCapture={(e) => e.stopPropagation()}
          type="button"
        >
          <XIcon />
        </button>
      </div>
    </motion.li>
  );
}
