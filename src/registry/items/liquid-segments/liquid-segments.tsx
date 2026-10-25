"use client";

import { motion, useReducedMotion, useSpring, useTransform } from "motion/react";
import {
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";

export interface LiquidSegmentsOption<T extends string = string> {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
  count?: number;
  disabled?: boolean;
}

export interface LiquidSegmentsProps<T extends string = string> {
  options: LiquidSegmentsOption<T>[];
  value?: T;
  defaultValue?: T;
  onValueChange?: (value: T) => void;
  size?: "sm" | "default";
  fullWidth?: boolean;
  className?: string;
  "aria-label"?: string;
}

type Rect = { x: number; w: number };

export function LiquidSegments<T extends string = string>({
  options,
  value: valueProp,
  defaultValue,
  onValueChange,
  size = "default",
  fullWidth = false,
  className,
  "aria-label": ariaLabel = "Options",
}: LiquidSegmentsProps<T>) {
  const [inner, setInner] = useState<T>(defaultValue ?? options[0]?.value);
  const value = valueProp ?? inner;
  const selectedIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const reduce = useReducedMotion();
  const filterId = `goo-seg-${useId().replace(/:/g, "")}`;

  const trackRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [rects, setRects] = useState<Rect[]>([]);
  const [trackWidth, setTrackWidth] = useState(0);
  const drag = useRef<{ startX: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const [dragX, setDragX] = useState<number | null>(null);

  const measure = useCallback(() => {
    setRects(buttonRefs.current.map((b) => (b ? { x: b.offsetLeft, w: b.offsetWidth } : { x: 0, w: 0 })));
    setTrackWidth(trackRef.current?.offsetWidth ?? 0);
  }, []);

  useLayoutEffect(() => {
    measure();
    const track = trackRef.current;
    if (!track) return;
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    for (const b of buttonRefs.current) if (b) observer.observe(b);
    return () => observer.disconnect();
  }, [measure, options.length]);

  const select = (index: number) => {
    const option = options[index];
    if (!option || option.disabled) return;
    if (valueProp === undefined) setInner(option.value);
    onValueChange?.(option.value);
  };

  const nearestIndex = (x: number) => {
    let best = selectedIndex;
    let bestDistance = Number.POSITIVE_INFINITY;
    rects.forEach((r, i) => {
      if (options[i]?.disabled) return;
      const d = Math.abs(r.x + r.w / 2 - x);
      if (d < bestDistance) {
        bestDistance = d;
        best = i;
      }
    });
    return best;
  };

  const localX = (event: PointerEvent) => event.clientX - (trackRef.current?.getBoundingClientRect().left ?? 0);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    suppressClick.current = false;
    drag.current = { startX: event.clientX, moved: false };
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state) return;
    if (!state.moved && Math.abs(event.clientX - state.startX) > 4) {
      state.moved = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    if (state.moved) setDragX(localX(event));
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    drag.current = null;
    if (!state?.moved) return;
    suppressClick.current = true;
    select(nearestIndex(localX(event)));
    setDragX(null);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    let next = index;
    if (step) {
      for (let i = 1; i <= options.length; i++) {
        const candidate = (index + step * i + options.length) % options.length;
        if (!options[candidate]?.disabled) {
          next = candidate;
          break;
        }
      }
    } else if (event.key === "Home") next = options.findIndex((o) => !o.disabled);
    else if (event.key === "End") next = options.findLastIndex((o) => !o.disabled);
    else return;
    event.preventDefault();
    select(next);
    buttonRefs.current[next]?.focus();
  };

  const activeIndex = dragX === null ? selectedIndex : nearestIndex(dragX);
  const settled = rects[activeIndex];
  const lead = settled && dragX !== null ? { x: Math.min(Math.max(dragX - settled.w / 2, rects[0].x), (rects.at(-1)?.x ?? 0) + (rects.at(-1)?.w ?? 0) - settled.w), w: settled.w } : settled;

  const leadX = useSpring(0, { stiffness: 520, damping: 34, mass: 0.8 });
  const leadW = useSpring(0, { stiffness: 520, damping: 34, mass: 0.8 });
  const trailX = useSpring(0, { stiffness: 230, damping: 24 });
  const trailW = useSpring(0, { stiffness: 230, damping: 24 });
  const placed = useRef(false);

  useLayoutEffect(() => {
    if (!lead || !settled || !settled.w) return;
    const targets: [typeof leadX, number][] = [
      [leadX, lead.x],
      [leadW, lead.w],
      [trailX, settled.x + settled.w * 0.1],
      [trailW, settled.w * 0.8],
    ];
    for (const [value, to] of targets) {
      if (!placed.current || reduce) value.jump(to);
      else value.set(to);
    }
    placed.current = true;
  }, [lead?.x, lead?.w, settled?.x, settled?.w, reduce, leadX, leadW, trailX, trailW]);

  // The selected labels sit in a copy of the row, clipped to the blob, so text under the pill always reads.
  const clipPath = useTransform([leadX, leadW, trailX, trailW], ([lx, lw, tx, tw]: number[]) => {
    const left = Math.min(lx, tx);
    const right = Math.max(lx + lw, tx + tw);
    return `inset(4px ${Math.max(trackWidth - right, 0)}px 4px ${left}px round 999px)`;
  });

  const segmentClass = cn(
    "relative inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full font-medium [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0",
    size === "sm" ? "h-7 px-3 text-xs" : "h-8 px-3.5 text-sm",
    fullWidth && "flex-1",
  );
  const content = (option: LiquidSegmentsOption<T>, selected: boolean) => (
    <>
      {option.icon}
      <span className={cn(fullWidth && option.icon && "@max-sm:sr-only")}>{option.label}</span>
      {option.count !== undefined && (
        <span
          className={cn(
            "min-w-5 rounded-full px-1.5 py-px text-center font-mono text-[10px] tabular-nums leading-4",
            selected ? "bg-primary-foreground/16" : "bg-foreground/8",
          )}
        >
          {option.count}
        </span>
      )}
    </>
  );

  return (
    <div
      aria-label={ariaLabel}
      className={cn(
        "relative isolate inline-flex touch-pan-y select-none rounded-full bg-muted p-1",
        fullWidth && "@container flex w-full",
        className,
      )}
      onPointerCancel={endDrag}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      ref={trackRef}
      role="radiogroup"
    >
      <svg aria-hidden className="absolute size-0">
        <filter colorInterpolationFilters="sRGB" height="200%" id={filterId} width="140%" x="-20%" y="-50%">
          <feGaussianBlur in="SourceGraphic" result="blur" stdDeviation="5" />
          <feColorMatrix in="blur" result="goo" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -8" />
          <feComposite in="SourceGraphic" in2="goo" operator="atop" />
        </filter>
      </svg>
      <span
        aria-hidden
        className={cn("pointer-events-none absolute inset-y-1 left-0 -z-10 w-full", !settled && "hidden")}
        style={{ filter: `url(#${filterId})` }}
      >
        <motion.span className="absolute inset-y-px left-0 rounded-full bg-primary" style={{ x: trailX, width: trailW }} />
        <motion.span className="absolute inset-y-0 left-0 rounded-full bg-primary" style={{ x: leadX, width: leadW }} />
      </span>
      {options.map((option, index) => {
        const checked = index === selectedIndex;
        return (
          <button
            aria-checked={checked}
            className={cn(
              segmentClass,
              "cursor-pointer text-muted-foreground outline-none transition-colors duration-200 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
            )}
            disabled={option.disabled}
            key={option.value}
            onClick={() => {
              if (suppressClick.current) {
                suppressClick.current = false;
                return;
              }
              select(index);
            }}
            onKeyDown={(event) => onKeyDown(event, index)}
            ref={(node) => {
              buttonRefs.current[index] = node;
            }}
            role="radio"
            tabIndex={checked ? 0 : -1}
            type="button"
          >
            {content(option, false)}
          </button>
        );
      })}
      <motion.div
        aria-hidden
        className={cn("pointer-events-none absolute inset-0 flex p-1 text-primary-foreground", !settled && "hidden")}
        style={{ clipPath }}
      >
        {options.map((option, index) => (
          <span className={segmentClass} key={option.value}>
            {content(option, true)}
          </span>
        ))}
      </motion.div>
    </div>
  );
}
