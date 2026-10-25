"use client";

import {
  type AnimationPlaybackControls,
  animate,
  type MotionValue,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
  type ValueAnimationTransition,
} from "motion/react";
import {
  type ComponentProps,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
  type RefObject,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";

type Status = "idle" | "armed" | "refreshing" | "done";

export interface ElasticListActions {
  refresh: () => void;
}

export interface ElasticListProps extends Omit<ComponentProps<"div">, "onRefresh"> {
  onRefresh?: () => Promise<unknown> | unknown;
  threshold?: number;
  label?: string;
  actionsRef?: RefObject<ElasticListActions | null>;
}

const RESISTANCE = 0.55;
const HOLD = 52;
const TICKS = 8;
const settleSpring = { type: "spring", stiffness: 340, damping: 36 } as const;

function useCalmMotion() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && !!prefers;
}

function outerCanScroll(from: HTMLElement, delta: number) {
  for (let el = from.parentElement; el; el = el.parentElement) {
    const scroller = el === document.scrollingElement || /auto|scroll|overlay/.test(getComputedStyle(el).overflowY);
    if (!scroller || el.scrollHeight <= el.clientHeight + 1) continue;
    if (delta > 0 ? el.scrollTop + el.clientHeight < el.scrollHeight - 1 : el.scrollTop > 1) return true;
  }
  return false;
}

const rubber = (distance: number, size: number) => (1 - 1 / ((distance * RESISTANCE) / size + 1)) * size;
const unrubber = (offset: number, size: number) => (size / RESISTANCE) * (1 / (1 - Math.min(offset, size * 0.98) / size) - 1);

function Tick({ index, wind, spinning }: { index: number; wind: MotionValue<number>; spinning: boolean }) {
  const winding = useTransform(wind, (w) => (w * TICKS > index ? 0.35 + 0.65 * Math.min(1, w * TICKS - index) : 0));
  return (
    <motion.span
      className="absolute top-0 left-1/2 h-[30%] w-[2.5px] -translate-x-1/2 rounded-full bg-current"
      style={{
        opacity: spinning ? 0.25 + (0.75 * index) / (TICKS - 1) : winding,
        rotate: index * (360 / TICKS),
        transformOrigin: "50% 166%",
      }}
    />
  );
}

export function ElasticList({
  onRefresh,
  threshold = 64,
  label = "List",
  actionsRef,
  className,
  children,
  ...props
}: ElasticListProps) {
  const viewport = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const reduce = useCalmMotion();
  const y = useMotionValue(0);
  const thumbOpacity = useMotionValue(0);
  const [status, setStatus] = useState<Status>("idle");
  const [size, setSize] = useState({ view: 0, content: 0 });
  const statusRef = useRef<Status>("idle");
  const motionRef = useRef<AnimationPlaybackControls | null>(null);
  const drag = useRef<{ id: number; start: number; from: number; active: boolean; scale: number } | null>(null);
  const dragged = useRef(false);
  const wheel = useRef<{
    raw: number;
    atTop: boolean;
    atBottom: boolean;
    passing: boolean;
    timer: ReturnType<typeof setTimeout> | null;
  }>({
    raw: 0,
    atTop: false,
    atBottom: false,
    passing: false,
    timer: null,
  });
  const alive = useRef(true);

  const setPhase = useCallback((next: Status) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const limits = useCallback(() => {
    const view = viewport.current?.clientHeight ?? 0;
    const full = content.current?.offsetHeight ?? 0;
    const top = statusRef.current === "refreshing" ? HOLD : 0;
    return { top, bottom: Math.min(0, view - full), view: Math.max(view, 1) };
  }, []);

  const band = useCallback(
    (raw: number) => {
      const { top, bottom, view } = limits();
      if (raw > top) return top + rubber(raw - top, view);
      if (raw < bottom) return bottom - rubber(bottom - raw, view);
      return raw;
    },
    [limits],
  );

  const unband = useCallback(
    (offset: number) => {
      const { top, bottom, view } = limits();
      if (offset > top) return top + unrubber(offset - top, view);
      if (offset < bottom) return bottom - unrubber(bottom - offset, view);
      return offset;
    },
    [limits],
  );

  const run = useCallback(
    (target: number, options: ValueAnimationTransition<number> = settleSpring) => {
      motionRef.current?.stop();
      motionRef.current = animate(y, target, reduce ? { duration: 0.2, ease: [0.23, 1, 0.32, 1] } : options);
      return motionRef.current;
    },
    [y, reduce],
  );

  const refresh = useCallback(() => {
    if (statusRef.current === "refreshing") return;
    setPhase("refreshing");
    run(HOLD);
    Promise.resolve(onRefresh?.())
      .catch(() => undefined)
      .then(() => {
        if (!alive.current) return;
        setPhase("done");
        if (y.get() > 0) run(0).finished.then(() => alive.current && statusRef.current === "done" && setPhase("idle"));
        else setPhase("idle");
      });
  }, [onRefresh, run, setPhase, y]);

  useImperativeHandle(actionsRef, () => ({ refresh }), [refresh]);

  const settle = useCallback(
    (velocity: number) => {
      const { top, bottom } = limits();
      const offset = y.get();
      if (statusRef.current === "armed") {
        refresh();
        return;
      }
      if (offset > top || offset < bottom) {
        run(offset > top ? top : bottom, { ...settleSpring, velocity });
        return;
      }
      if (reduce || Math.abs(velocity) < 20) return;
      motionRef.current?.stop();
      motionRef.current = animate(y, offset, {
        type: "inertia",
        velocity,
        min: bottom,
        max: top,
        power: 0.8,
        timeConstant: 340,
        bounceStiffness: 320,
        bounceDamping: 34,
        restDelta: 0.5,
      });
    },
    [limits, y, refresh, run, reduce],
  );

  useMotionValueEvent(y, "change", (offset) => {
    const pulling = drag.current?.active || (wheel.current.timer !== null && wheel.current.atTop);
    const current = statusRef.current;
    if (pulling && onRefresh && current === "idle" && offset >= threshold) setPhase("armed");
    else if (current === "armed" && offset < threshold) setPhase("idle");
  });

  useEffect(() => {
    let hide: ReturnType<typeof setTimeout> | null = null;
    const stop = y.on("change", () => {
      if (thumbOpacity.get() < 1 && !thumbOpacity.isAnimating()) animate(thumbOpacity, 1, { duration: 0.12 });
      if (hide) clearTimeout(hide);
      hide = setTimeout(() => animate(thumbOpacity, 0, { duration: 0.3, ease: "easeOut" }), 700);
    });
    return () => {
      stop();
      if (hide) clearTimeout(hide);
    };
  }, [y, thumbOpacity]);

  useEffect(() => {
    const view = viewport.current;
    const list = content.current;
    if (!view || !list) return;
    const measure = () => {
      setSize({ view: view.clientHeight, content: list.offsetHeight });
      const { bottom } = limits();
      if (!drag.current?.active && !y.isAnimating() && y.get() < bottom) run(bottom);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(view);
    observer.observe(list);
    return () => observer.disconnect();
  }, [limits, run, y]);

  useEffect(() => {
    const view = viewport.current;
    if (!view) return;
    const state = wheel.current;
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey) return;
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? view.clientHeight : 1);
      const { top, bottom, view: height } = limits();
      const starting = state.timer === null;
      if (starting) {
        const offset = y.get();
        state.atTop = offset >= top - 1;
        state.atBottom = offset <= bottom + 1;
        state.passing = ((delta < 0 && state.atTop) || (delta > 0 && state.atBottom)) && outerCanScroll(view, delta);
      } else if (state.timer) clearTimeout(state.timer);
      state.timer = setTimeout(() => {
        state.timer = null;
        if (!state.passing) settle(0);
      }, 140);
      if (state.passing) return;
      event.preventDefault();
      if (drag.current?.active) return;
      if (starting) {
        motionRef.current?.stop();
        state.raw = unband(y.get());
      }
      const reach = height * 0.6;
      state.raw = Math.min(top + (state.atTop ? reach : 40), Math.max(bottom - (state.atBottom ? reach : 40), state.raw - delta));
      y.set(band(state.raw));
    };
    view.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      view.removeEventListener("wheel", onWheel);
      if (state.timer) clearTimeout(state.timer);
      state.timer = null;
    };
  }, [band, unband, limits, settle, y]);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      motionRef.current?.stop();
    };
  }, []);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const box = event.currentTarget.getBoundingClientRect();
    drag.current = {
      id: event.pointerId,
      start: event.clientY,
      from: y.get(),
      active: false,
      scale: box.height / (event.currentTarget.offsetHeight || 1) || 1,
    };
    dragged.current = false;
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== event.pointerId) return;
    const moved = (event.clientY - d.start) / d.scale;
    if (!d.active) {
      if (Math.abs(moved) < 5) return;
      d.active = true;
      d.start = event.clientY;
      dragged.current = true;
      motionRef.current?.stop();
      d.from = unband(y.get());
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }
    y.set(band(d.from + moved));
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== event.pointerId) return;
    drag.current = null;
    if (!d.active) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    settle(event.type === "pointercancel" ? 0 : y.getVelocity());
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget && !["PageDown", "PageUp", "Home", "End"].includes(event.key)) return;
    const { top, bottom, view } = limits();
    const step: Record<string, number> = {
      ArrowDown: -48,
      ArrowUp: 48,
      PageDown: -(view - 48),
      PageUp: view - 48,
      " ": event.shiftKey ? view - 48 : -(view - 48),
    };
    let target: number | null = null;
    if (event.key === "Home") target = top;
    else if (event.key === "End") target = bottom;
    else if (event.key in step) target = Math.min(top, Math.max(bottom, y.get() + step[event.key]));
    if (target === null) return;
    event.preventDefault();
    run(target, { type: "spring", stiffness: 420, damping: 42 });
  };

  const onFocus = (event: FocusEvent<HTMLDivElement>) => {
    const view = viewport.current;
    const list = content.current;
    if (!view || !list || event.target === view) return;
    view.scrollTop = 0;
    const scale = view.getBoundingClientRect().height / (view.offsetHeight || 1) || 1;
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const listTop = list.getBoundingClientRect().top;
    const start = (rect.top - listTop) / scale;
    const end = start + rect.height / scale;
    const { top, bottom, view: height } = limits();
    const offset = y.get();
    if (start + offset < 8) run(Math.min(top, Math.max(bottom, 8 - start)));
    else if (end + offset > height - 8) run(Math.min(top, Math.max(bottom, height - 8 - end)));
  };

  const wind = useTransform(y, (offset) => Math.min(1, Math.max(0, offset / threshold)));
  const spinnerY = useTransform(y, (offset) => Math.max(offset, 0) / 2 - 12);
  const spinnerRotate = useTransform(wind, (w) => w * 220);
  const scrollable = size.content > size.view + 1;
  const thumbSize = scrollable ? Math.max(28, (size.view * size.view) / size.content) : 0;
  const track = size.view - thumbSize - 8;
  const thumbY = useTransform(y, (offset) => {
    const range = size.content - size.view;
    if (range <= 0) return 0;
    return 4 + Math.min(1, Math.max(0, -offset / range)) * track;
  });
  const thumbScale = useTransform(y, (offset) => {
    const range = size.content - size.view;
    const over = offset > 0 ? offset : offset < -range ? -range - offset : 0;
    return Math.max(0.35, 1 - over / (thumbSize * 1.6 || 1));
  });
  const thumbOrigin = useTransform(y, (offset) => (offset > 0 ? 0 : 1));

  return (
    <div
      aria-label={label}
      className={cn("group relative touch-none select-none overflow-hidden outline-none", className)}
      onClickCapture={(event) => {
        if (dragged.current) {
          event.preventDefault();
          event.stopPropagation();
          dragged.current = false;
        }
      }}
      onFocus={onFocus}
      onKeyDown={onKeyDown}
      onPointerCancel={onPointerUp}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onScroll={(event) => {
        event.currentTarget.scrollTop = 0;
      }}
      ref={viewport}
      role="region"
      tabIndex={0}
      {...props}
    >
      <span aria-live="polite" className="sr-only">
        {status === "refreshing" ? "Refreshing" : status === "armed" ? "Release to refresh" : ""}
      </span>
      {onRefresh && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute top-0 left-1/2 -ml-3 size-6 text-muted-foreground"
          style={{ y: spinnerY }}
        >
          <motion.div
            animate={
              status === "done"
                ? { scale: 0.6, opacity: 0 }
                : status === "armed"
                  ? { scale: [1, 1.18, 1], opacity: 1 }
                  : { scale: 1, opacity: 1 }
            }
            className="size-full"
            transition={status === "armed" ? { duration: 0.28, ease: [0.23, 1, 0.32, 1] } : { duration: 0.18, ease: "easeOut" }}
          >
            <motion.div
              className={cn("relative size-full", status === "refreshing" && "animate-spin [animation-duration:0.9s]")}
              style={status === "refreshing" ? undefined : { rotate: spinnerRotate }}
            >
              {Array.from({ length: TICKS }, (_, i) => (
                <Tick index={i} key={i} spinning={status === "refreshing" || status === "done"} wind={wind} />
              ))}
            </motion.div>
          </motion.div>
        </motion.div>
      )}
      <motion.div ref={content} style={{ y }}>
        {children}
      </motion.div>
      {scrollable && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute top-0 right-1 w-1 rounded-full bg-foreground/30"
          style={{ height: thumbSize, y: thumbY, scaleY: thumbScale, originY: thumbOrigin, opacity: thumbOpacity }}
        />
      )}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit] ring-ring ring-inset group-focus-visible:ring-2"
      />
    </div>
  );
}
