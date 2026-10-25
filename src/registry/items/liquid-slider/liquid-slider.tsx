"use client";

import { motion, useMotionValue, useReducedMotion, useSpring, useTransform, useVelocity } from "motion/react";
import { type ReactNode, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const TONES = {
  primary: "[--liquid:var(--color-primary)] [--liquid-ink:var(--color-primary-foreground)]",
  info: "[--liquid:var(--color-info)] [--liquid-ink:var(--color-white)]",
  success: "[--liquid:var(--color-success)] [--liquid-ink:var(--color-white)]",
  destructive: "[--liquid:var(--color-destructive)] [--liquid-ink:var(--color-white)]",
} as const;

const THUMB = 22;
const BAR = 8;
const HIT = 32;
const BUBBLE_H = 26;
const BUBBLE_RISE = 40;
const TETHER = THUMB * 0.5;
const BUD = THUMB * 0.7;
const ease = (v: number, a: number, b: number) => {
  const t = Math.min(Math.max((v - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
};

export interface LiquidSliderProps {
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: ReactNode;
  icon?: ReactNode;
  formatValue?: (value: number) => string;
  bubble?: boolean;
  tone?: keyof typeof TONES;
  disabled?: boolean;
  name?: string;
  className?: string;
  "aria-label"?: string;
}

export function LiquidSlider({
  value: valueProp,
  defaultValue,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  label,
  icon,
  formatValue = (v) => String(v),
  bubble = true,
  tone = "primary",
  disabled,
  name,
  className,
  "aria-label": ariaLabel,
}: LiquidSliderProps) {
  const [inner, setInner] = useState(defaultValue ?? min);
  const value = valueProp ?? inner;
  const [width, setWidth] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [nudged, setNudged] = useState(false);
  const nudgeTimer = useRef<number | undefined>(undefined);
  const trackRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const id = useId();
  const filterId = `liquid-slider-${id.replace(/:/g, "")}`;

  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const measure = () => setWidth(track.offsetWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    return () => observer.disconnect();
  }, []);

  useEffect(() => () => window.clearTimeout(nudgeTimer.current), []);

  const pct = max > min ? (Math.min(Math.max(value, min), max) - min) / (max - min) : 0;
  const centre = THUMB / 2 + pct * Math.max(width - THUMB, 0);

  const target = useMotionValue(centre);
  const x = useSpring(target, { stiffness: 900, damping: 56, mass: 0.6 });
  const lag = useSpring(target, { stiffness: 260, damping: 26 });
  const trail = useTransform(() => x.get() + Math.max(-TETHER, Math.min(TETHER, lag.get() - x.get())));
  const bubbleX = useSpring(target, { stiffness: 380, damping: 30 });
  const velocity = useVelocity(x);
  const scaleX = useTransform(velocity, [-2400, 0, 2400], [1.38, 1, 1.38], { clamp: true });
  const scaleY = useTransform(velocity, [-2400, 0, 2400], [0.8, 1, 0.8], { clamp: true });
  const fillClip = useTransform(x, (cx) => `inset(0 ${Math.max(width - cx, 0)}px 0 0 round ${BAR}px)`);

  const showBubble = bubble && !disabled && (dragging || nudged);
  const rise = useSpring(0, { stiffness: 420, damping: 24, mass: 0.7 });
  const labelOpacity = useTransform(rise, [BUBBLE_RISE * 0.72, BUBBLE_RISE * 0.92], [0, 1]);

  useLayoutEffect(() => {
    if (!width) return;
    if (reduce || target.get() === 0) {
      for (const v of [target, x, lag, bubbleX]) v.jump(centre);
    } else target.set(centre);
  }, [centre, width, reduce, target, x, lag, bubbleX]);

  useEffect(() => {
    const to = showBubble ? BUBBLE_RISE : 0;
    if (reduce) rise.jump(to);
    else rise.set(to);
  }, [showBubble, reduce, rise]);

  const bubbleY = useTransform(rise, (r) => -r);
  const longest = Math.max(formatValue(min).length, formatValue(max).length, formatValue(value).length);
  const bubbleW = Math.max(BUBBLE_H + 4, Math.round(longest * 7.2 + 18));
  const budW = useTransform(rise, (r) => BUD + (bubbleW - BUD) * ease(r, BUBBLE_RISE * 0.45, BUBBLE_RISE * 0.9));
  const budH = useTransform(rise, (r) => BUD + (BUBBLE_H - BUD) * ease(r, BUBBLE_RISE * 0.25, BUBBLE_RISE * 0.75));
  const budMarginX = useTransform(budW, (w) => -w / 2);
  const budMarginY = useTransform(budH, (h) => -h / 2);

  const set = (next: number) => {
    if (valueProp === undefined) setInner(next);
    onValueChange?.(next);
  };

  const nudge = () => {
    setNudged(true);
    window.clearTimeout(nudgeTimer.current);
    nudgeTimer.current = window.setTimeout(() => setNudged(false), 900);
  };

  // Drawn twice: under the goo filter for the necks, then crisp on top so edges stay sharp.
  const shapes = (crisp: boolean) => (
    <>
      <motion.span
        className="absolute top-1/2 left-0 w-full rounded-full bg-(--liquid)"
        style={{ height: BAR, marginTop: -BAR / 2, clipPath: fillClip }}
      />
      {!crisp && (
        <motion.span
          className="absolute top-1/2 left-0 rounded-full bg-(--liquid)"
          style={{ x: trail, width: THUMB * 0.62, height: THUMB * 0.62, marginLeft: -THUMB * 0.31, marginTop: -THUMB * 0.31 }}
        />
      )}
      {!crisp && bubble && (
        <motion.span
          className="absolute top-1/2 left-0 rounded-full bg-(--liquid)"
          style={{ x: bubbleX, y: bubbleY, width: budW, height: budH, marginLeft: budMarginX, marginTop: budMarginY }}
        />
      )}
      <motion.span
        className={cn(
          "absolute top-1/2 left-0 rounded-full bg-(--liquid)",
          crisp &&
            "ring-offset-background transition-shadow duration-150 group-has-[input:focus-visible]/slider:ring-2 group-has-[input:focus-visible]/slider:ring-ring group-has-[input:focus-visible]/slider:ring-offset-2",
        )}
        style={{ x, scaleX, scaleY, width: THUMB, height: THUMB, marginLeft: -THUMB / 2, marginTop: -THUMB / 2 }}
      >
        {crisp && (
          <span className="absolute inset-[7px] rounded-full bg-(--liquid-ink) opacity-90 transition-[scale,opacity] duration-150 ease-out group-has-[input:active]/slider:scale-50 group-has-[input:active]/slider:opacity-0" />
        )}
      </motion.span>
    </>
  );

  const valueText = formatValue(value);

  return (
    <div className={cn("grid w-full gap-2", TONES[tone], disabled && "opacity-64", className)}>
      {label && (
        <div
          className={cn(
            "flex items-center justify-between gap-3 text-sm transition-opacity duration-150 ease-out",
            showBubble ? "opacity-0" : "delay-75",
          )}
        >
          <label className="flex items-center gap-2 font-medium [&_svg]:size-4 [&_svg]:text-muted-foreground" htmlFor={id}>
            {icon}
            {label}
          </label>
          <output className="font-mono text-muted-foreground text-xs tabular-nums" htmlFor={id}>
            {valueText}
          </output>
        </div>
      )}
      <div className="group/slider relative" ref={trackRef} style={{ height: HIT }}>
        <input
          aria-label={label ? undefined : ariaLabel}
          aria-valuetext={valueText}
          className={cn(
            "absolute inset-0 z-10 m-0 w-full cursor-grab appearance-none bg-transparent opacity-0 outline-none active:cursor-grabbing disabled:cursor-not-allowed",
            "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:size-[22px] [&::-moz-range-thumb]:size-[22px] [&::-moz-range-thumb]:border-0",
          )}
          disabled={disabled}
          id={id}
          max={max}
          min={min}
          name={name}
          onBlur={() => setDragging(false)}
          onChange={(event) => set(Number(event.currentTarget.value))}
          onKeyDown={(event) => {
            if (event.key.startsWith("Arrow") || event.key === "Home" || event.key === "End" || event.key.startsWith("Page")) nudge();
          }}
          onPointerCancel={() => setDragging(false)}
          onPointerDown={() => setDragging(true)}
          onPointerUp={() => setDragging(false)}
          step={step}
          type="range"
          value={value}
        />
        <span aria-hidden className="absolute inset-x-0 top-1/2 rounded-full bg-input" style={{ height: BAR, marginTop: -BAR / 2 }} />
        <svg aria-hidden className="absolute size-0">
          <filter colorInterpolationFilters="sRGB" height="600%" id={filterId} width="140%" x="-20%" y="-350%">
            <feGaussianBlur in="SourceGraphic" result="blur" stdDeviation="4" />
            <feColorMatrix in="blur" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -10" />
          </filter>
        </svg>
        {width > 0 && (
          <>
            <span aria-hidden className="pointer-events-none absolute inset-0" style={{ filter: `url(#${filterId})` }}>
              {shapes(false)}
            </span>
            <span aria-hidden className="pointer-events-none absolute inset-0">
              {shapes(true)}
            </span>
            {bubble && (
              <motion.span
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-0 flex items-center justify-center rounded-full bg-(--liquid) font-medium text-(--liquid-ink) text-xs tabular-nums"
                style={{
                  x: bubbleX,
                  y: bubbleY,
                  opacity: labelOpacity,
                  width: bubbleW,
                  height: BUBBLE_H,
                  marginLeft: -bubbleW / 2,
                  marginTop: -BUBBLE_H / 2,
                }}
              >
                {valueText}
              </motion.span>
            )}
          </>
        )}
      </div>
    </div>
  );
}
