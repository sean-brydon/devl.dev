"use client";

import { useReducedMotion } from "motion/react";
import {
  type ComponentProps,
  createContext,
  type CSSProperties,
  type RefObject,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";

type Entry = { block: HTMLElement; band: HTMLElement; anim?: Animation };
type Register = (block: HTMLElement, band: HTMLElement) => () => void;

const SweepContext = createContext<Register | null>(null);

const SWEEP_EASE = "cubic-bezier(0.4, 0.14, 0.6, 0.86)";
const PULSE: Keyframe[] = [{ opacity: 1 }, { opacity: 0.55 }, { opacity: 1 }];

function useOnScreen(ref: RefObject<HTMLElement | null>) {
  const [onScreen, setOnScreen] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setOnScreen(entry?.isIntersecting ?? true));
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  return onScreen;
}

export interface SkeletonSweepProps extends ComponentProps<"div"> {
  duration?: number;
  pause?: number;
}

export function SkeletonSweep({
  duration = 1.2,
  pause = 0.2,
  className,
  children,
  style,
  ...props
}: SkeletonSweepProps) {
  const ref = useRef<HTMLDivElement>(null);
  const entries = useRef(new Set<Entry>());
  const observer = useRef<ResizeObserver | null>(null);
  const [width, setWidth] = useState(0);
  const reduce = useReducedMotion();
  const onScreen = useOnScreen(ref);
  const config = useRef({ duration, pause, width, reduce, onScreen });
  config.current = { duration, pause, width, reduce, onScreen };

  const start = useCallback((entry: Entry) => {
    entry.anim?.cancel();
    entry.anim = undefined;
    const { duration, pause, width, reduce, onScreen } = config.current;
    if (!onScreen || (!reduce && !width)) return;
    const cycle = (duration + pause) * 1000;
    entry.anim = reduce
      ? entry.block.animate(PULSE, { duration: 1800, easing: "ease-in-out", iterations: Number.POSITIVE_INFINITY })
      : entry.band.animate(
          [
            { transform: `translateX(${-0.66 * width}px)`, offset: 0, easing: SWEEP_EASE },
            { transform: `translateX(${0.66 * width}px)`, offset: duration / (duration + pause) },
            { transform: `translateX(${0.66 * width}px)`, offset: 1 },
          ],
          { duration: cycle, iterations: Number.POSITIVE_INFINITY },
        );
    // Same start time for every block, so late arrivals join the sweep in step.
    entry.anim.startTime = 0;
  }, []);

  const layout = useCallback(() => {
    const group = ref.current;
    if (!group) return;
    const g = group.getBoundingClientRect();
    const scale = group.offsetWidth ? g.width / group.offsetWidth : 1;
    group.style.setProperty("--sweep-w", `${group.offsetWidth}px`);
    group.style.setProperty("--sweep-h", `${group.offsetHeight}px`);
    for (const { block } of entries.current) {
      const r = block.getBoundingClientRect();
      block.style.setProperty("--sweep-bx", `${(r.left - g.left) / scale}px`);
      block.style.setProperty("--sweep-by", `${(r.top - g.top) / scale}px`);
    }
    setWidth(group.offsetWidth);
  }, []);

  useLayoutEffect(() => {
    const ro = new ResizeObserver(layout);
    observer.current = ro;
    if (ref.current) ro.observe(ref.current);
    for (const { block } of entries.current) ro.observe(block);
    layout();
    return () => ro.disconnect();
  }, [layout]);

  useEffect(() => {
    for (const entry of entries.current) start(entry);
  }, [start, width, duration, pause, reduce, onScreen]);

  useEffect(() => {
    const all = entries.current;
    return () => {
      for (const entry of all) entry.anim?.cancel();
    };
  }, []);

  const register = useCallback<Register>(
    (block, band) => {
      const entry: Entry = { block, band };
      entries.current.add(entry);
      observer.current?.observe(block);
      layout();
      start(entry);
      return () => {
        entry.anim?.cancel();
        entries.current.delete(entry);
        observer.current?.unobserve(block);
      };
    },
    [layout, start],
  );

  return (
    <SweepContext.Provider value={register}>
      <div
        aria-busy="true"
        aria-label="Loading"
        className={cn(
          "[--sweep-base:color-mix(in_oklab,var(--color-foreground)_8%,transparent)] [--sweep-hi:color-mix(in_oklab,var(--color-background)_88%,transparent)] dark:[--sweep-hi:color-mix(in_oklab,var(--color-foreground)_9%,transparent)]",
          className,
        )}
        ref={ref}
        role="status"
        style={style as CSSProperties}
        {...props}
      >
        {children}
      </div>
    </SweepContext.Provider>
  );
}

export function SkeletonSweepBlock({ className, style, ...props }: ComponentProps<"div">) {
  const ref = useRef<HTMLDivElement>(null);
  const band = useRef<HTMLSpanElement>(null);
  const register = useContext(SweepContext);

  useEffect(() => {
    if (!register || !ref.current || !band.current) return;
    return register(ref.current, band.current);
  }, [register]);

  return (
    <div
      aria-hidden
      className={cn("relative isolate h-3 overflow-hidden rounded-full", className)}
      ref={ref}
      style={{ backgroundColor: "var(--sweep-base, var(--color-muted))", ...style }}
      {...props}
    >
      <span
        className="pointer-events-none absolute will-change-transform"
        ref={band}
        style={{
          left: "calc(var(--sweep-bx, 0px) * -1)",
          top: "calc(var(--sweep-by, 0px) * -1)",
          width: "var(--sweep-w, 0px)",
          height: "var(--sweep-h, 0px)",
          transform: "translateX(-9999px)",
          backgroundImage: "linear-gradient(105deg, transparent 38%, var(--sweep-hi, transparent) 50%, transparent 62%)",
        }}
      />
    </div>
  );
}

export interface SkeletonSweepTextProps extends ComponentProps<"span"> {
  duration?: number;
}

export function SkeletonSweepText({ duration = 1.8, className, children, ...props }: SkeletonSweepTextProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  const onScreen = useOnScreen(ref);

  useEffect(() => {
    const el = ref.current;
    if (!el || !onScreen) return;
    const ms = duration * 1000;
    const anim = reduce
      ? el.animate(PULSE, { duration: 1800, easing: "ease-in-out", iterations: Number.POSITIVE_INFINITY })
      : el.animate(
          [
            { backgroundPosition: "150% 0%", offset: 0 },
            { backgroundPosition: "-50% 0%", offset: ms / (ms + 200) },
            { backgroundPosition: "-50% 0%", offset: 1 },
          ],
          { duration: ms + 200, easing: "linear", iterations: Number.POSITIVE_INFINITY },
        );
    return () => anim.cancel();
  }, [duration, reduce, onScreen]);

  return (
    <span className={cn("relative inline-block", className)} {...props}>
      <span
        className="inline-block bg-clip-text text-transparent"
        ref={ref}
        style={{
          backgroundImage:
            "linear-gradient(90deg, var(--color-muted-foreground) 0%, var(--color-muted-foreground) 38%, var(--color-foreground) 50%, var(--color-muted-foreground) 62%, var(--color-muted-foreground) 100%)",
          backgroundSize: "200% 100%",
          backgroundPosition: "150% 0%",
        }}
      >
        {children}
      </span>
    </span>
  );
}
