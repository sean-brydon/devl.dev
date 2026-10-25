"use client";

import { useReducedMotion } from "motion/react";
import {
  type KeyboardEvent,
  type PointerEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";
import { cn } from "@/lib/utils";

const ITEM = 36;
const VISIBLE = 5;
const DRUM_RADIUS = ITEM * 2.4;
const LOOP_COPIES = 7;

interface WheelProps {
  items: string[];
  index: number;
  onIndexChange: (index: number) => void;
  loop?: boolean;
  label: string;
  valueText?: string;
  className?: string;
}

function Wheel({ items, index, onIndexChange, loop = false, label, valueText, className }: WheelProps) {
  const ref = useRef<HTMLDivElement>(null);
  const rows = useRef<(HTMLDivElement | null)[]>([]);
  const settle = useRef<number | undefined>(undefined);
  const drag = useRef<{ y: number; top: number; t: number; v: number } | null>(null);
  const reduce = useReducedMotion();
  const copies = loop ? LOOP_COPIES : 1;
  const total = items.length * copies;
  const middle = loop ? Math.floor(LOOP_COPIES / 2) * items.length : 0;
  const latest = useRef({ index, onIndexChange });
  latest.current = { index, onIndexChange };

  const paintDrum = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const centre = el.scrollTop + (ITEM * VISIBLE) / 2;
    for (let i = 0; i < rows.current.length; i++) {
      const row = rows.current[i];
      if (!row) continue;
      const offset = i * ITEM + ITEM / 2 + ITEM * 2 - centre;
      if (Math.abs(offset) > ITEM * 4) {
        if (row.style.visibility !== "hidden") row.style.visibility = "hidden";
        continue;
      }
      const theta = Math.max(-1.45, Math.min(1.45, offset / DRUM_RADIUS));
      row.style.visibility = "visible";
      row.style.transform = `perspective(480px) translateY(${DRUM_RADIUS * Math.sin(theta) - offset}px) rotateX(${-theta}rad)`;
      row.style.opacity = String(Math.max(0, Math.cos(theta) ** 2.2));
      row.dataset.centre = Math.abs(offset) < ITEM / 2 ? "true" : "false";
    }
  }, []);

  const scrollToIndex = useCallback(
    (i: number, smooth: boolean) => {
      ref.current?.scrollTo({ top: i * ITEM, behavior: smooth && !reduce ? "smooth" : "instant" });
    },
    [reduce],
  );

  const nearest = () => Math.round((ref.current?.scrollTop ?? 0) / ITEM);

  const onSettled = useCallback(() => {
    if (drag.current) return;
    const at = nearest();
    const value = ((at % items.length) + items.length) % items.length;
    if (loop) {
      const copy = Math.floor(at / items.length);
      if (copy !== Math.floor(LOOP_COPIES / 2)) {
        const el = ref.current;
        if (el) el.scrollTop = (middle + value) * ITEM + (el.scrollTop - at * ITEM);
      }
    }
    if (value !== latest.current.index) latest.current.onIndexChange(value);
  }, [items.length, loop, middle]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollTop = (middle + index) * ITEM;
    paintDrum();
    // Mount only: later index changes are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || drag.current) return;
    const at = nearest();
    const current = ((at % items.length) + items.length) % items.length;
    if (current === index) return;
    let delta = index - current;
    if (loop && Math.abs(delta) > items.length / 2) delta -= Math.sign(delta) * items.length;
    scrollToIndex(at + delta, true);
  }, [index, items.length, loop, scrollToIndex]);

  useEffect(() => () => window.clearTimeout(settle.current), []);

  const onScroll = () => {
    paintDrum();
    window.clearTimeout(settle.current);
    settle.current = window.setTimeout(onSettled, 110);
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { y: event.clientY, top: event.currentTarget.scrollTop, t: performance.now(), v: 0 };
    event.currentTarget.style.scrollSnapType = "none";
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const now = performance.now();
    const top = d.top - (event.clientY - d.y);
    const dt = Math.max(now - d.t, 1);
    d.v = 0.8 * ((event.currentTarget.scrollTop - top) / dt) + 0.2 * d.v;
    d.t = now;
    event.currentTarget.scrollTop = top;
  };
  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    const el = event.currentTarget;
    const moved = Math.abs(el.scrollTop - d.top) > 3;
    const fling = reduce ? 0 : -d.v * 140;
    const target = moved ? Math.round((el.scrollTop + fling) / ITEM) : Math.round((el.scrollTop + (event.clientY - el.getBoundingClientRect().top) - (ITEM * VISIBLE) / 2) / ITEM);
    el.style.scrollSnapType = "";
    scrollToIndex(Math.max(0, Math.min(total - 1, target)), true);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const steps: Record<string, number> = { ArrowUp: -1, ArrowDown: 1, PageUp: -5, PageDown: 5 };
    if (event.key in steps) {
      event.preventDefault();
      const next = index + steps[event.key];
      onIndexChange(loop ? (next + items.length) % items.length : Math.max(0, Math.min(items.length - 1, next)));
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      onIndexChange(event.key === "Home" ? 0 : items.length - 1);
    }
  };

  return (
    <div className={cn("relative", className)}>
      <div
        aria-label={label}
        aria-valuemax={items.length - 1}
        aria-valuemin={0}
        aria-valuenow={index}
        aria-valuetext={valueText ?? items[index]}
        className={cn(
          "peer relative h-[180px] cursor-grab touch-pan-y snap-y snap-mandatory overflow-y-scroll overscroll-contain outline-none [scrollbar-width:none] active:cursor-grabbing [&::-webkit-scrollbar]:hidden",
          "[mask-image:linear-gradient(to_bottom,transparent,black_28%,black_72%,transparent)]",
        )}
        onKeyDown={onKeyDown}
        onPointerCancel={onPointerUp}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onScroll={onScroll}
        ref={ref}
        role="spinbutton"
        tabIndex={0}
      >
        <div style={{ paddingTop: ITEM * 2, paddingBottom: ITEM * 2 }}>
          {Array.from({ length: total }, (_, i) => (
            <div
              aria-hidden
              className="flex snap-center select-none items-center justify-center text-lg text-muted-foreground tabular-nums transition-colors duration-100 will-change-transform data-[centre=true]:font-medium data-[centre=true]:text-foreground"
              key={i}
              ref={(node) => {
                rows.current[i] = node;
              }}
              style={{ height: ITEM }}
            >
              {items[i % items.length]}
            </div>
          ))}
        </div>
      </div>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-1/2 h-9 -translate-y-1/2 rounded-lg opacity-0 ring-2 ring-ring peer-focus-visible:opacity-100"
      />
    </div>
  );
}

export interface Time {
  hours: number;
  minutes: number;
}

export interface TimeWheelProps {
  value: Time;
  onValueChange: (value: Time) => void;
  minuteStep?: number;
  hour12?: boolean;
  className?: string;
}

export function TimeWheel({ value, onValueChange, minuteStep = 1, hour12 = true, className }: TimeWheelProps) {
  const hours = hour12 ? Array.from({ length: 12 }, (_, i) => String(i === 0 ? 12 : i)) : Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
  const minutes = Array.from({ length: Math.ceil(60 / minuteStep) }, (_, i) => String(i * minuteStep).padStart(2, "0"));
  const pm = value.hours >= 12;
  const hourIndex = hour12 ? value.hours % 12 : value.hours;
  const minuteIndex = Math.round(value.minutes / minuteStep) % minutes.length;
  const spoken = `${hours[hourIndex]}${hour12 ? (pm ? " PM" : " AM") : ""}`;

  return (
    <div className={cn("relative grid grid-cols-[1fr_auto_1fr_auto] items-center gap-1 px-2", !hour12 && "grid-cols-[1fr_auto_1fr]", className)}>
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-1/2 h-9 -translate-y-1/2 rounded-xl bg-muted ring-1 ring-border ring-inset" />
      <Wheel
        index={hourIndex}
        items={hours}
        label="Hours"
        loop
        onIndexChange={(i) => onValueChange({ ...value, hours: hour12 ? i + (pm ? 12 : 0) : i })}
        valueText={spoken}
      />
      <span aria-hidden className="relative -mt-0.5 font-medium text-foreground text-lg">
        :
      </span>
      <Wheel
        index={minuteIndex}
        items={minutes}
        label="Minutes"
        loop
        onIndexChange={(i) => onValueChange({ ...value, minutes: i * minuteStep })}
      />
      {hour12 && (
        <Wheel
          className="w-16"
          index={pm ? 1 : 0}
          items={["AM", "PM"]}
          label="AM or PM"
          onIndexChange={(i) => onValueChange({ ...value, hours: (value.hours % 12) + (i === 1 ? 12 : 0) })}
        />
      )}
    </div>
  );
}
