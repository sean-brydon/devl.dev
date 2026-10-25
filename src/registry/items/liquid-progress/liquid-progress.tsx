"use client";

import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  useVelocity,
} from "motion/react";
import { useId, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const TONES = {
  primary: "[--liquid:var(--color-primary)] [--liquid-ink:var(--color-primary-foreground)]",
  info: "[--liquid:var(--color-info)] [--liquid-ink:var(--color-white)]",
  success: "[--liquid:var(--color-success)] [--liquid-ink:var(--color-white)]",
} as const;

const HEIGHTS = { sm: 6, default: 10, lg: 28 } as const;

export interface LiquidProgressProps {
  value: number | null;
  size?: keyof typeof HEIGHTS;
  tone?: keyof typeof TONES;
  showValue?: boolean;
  className?: string;
  "aria-label"?: string;
}

function body(front: number, height: number, amp: number, t: number) {
  if (front <= 0.5) return "";
  const r = height / 2;
  const cx = front - r;
  let d = `M -2 -2 L ${cx.toFixed(2)} -2`;
  for (let i = 0; i <= 16; i++) {
    const theta = -Math.PI / 2 + (i / 16) * Math.PI;
    const push = amp * (0.8 + 0.25 * Math.sin(theta * 2 + t));
    const x = cx + Math.cos(theta) * (r + push);
    const y = r + Math.sin(theta) * r;
    d += ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
  }
  return `${d} L ${cx.toFixed(2)} ${height + 2} L -2 ${height + 2} Z`;
}

export function LiquidProgress({
  value,
  size = "default",
  tone = "primary",
  showValue = false,
  className,
  "aria-label": ariaLabel = "Progress",
}: LiquidProgressProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const reduce = useReducedMotion();
  const h = HEIGHTS[size];
  const indeterminate = value === null;
  const pct = indeterminate ? 0 : Math.min(Math.max(value, 0), 100);
  const filterId = `liquid-progress-${useId().replace(/:/g, "")}`;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setWidth(el.offsetWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const front = useSpring(0, { stiffness: 110, damping: 20, mass: 1 });
  const velocity = useVelocity(front);
  const t = useMotionValue(0);
  const placed = useRef(false);

  useLayoutEffect(() => {
    if (!width) return;
    const to = (pct / 100) * width;
    if (!placed.current || reduce) front.jump(to);
    else front.set(to);
    placed.current = true;
  }, [pct, width, reduce, front]);

  useAnimationFrame((time) => {
    if (reduce || indeterminate || Math.abs(velocity.get()) < 1) return;
    t.set(time / 1000);
  });

  const amp = () => {
    if (reduce || front.get() >= width - 0.5) return 0;
    return Math.min(Math.abs(velocity.get()) / 40, h * 0.32);
  };
  const frontPath = useTransform(() => body(front.get(), h, amp(), t.get() * 9));
  const inkClip = useTransform(front, (f) => `inset(0 ${Math.max(width - f, 0)}px 0 0 round 0 ${h / 2}px ${h / 2}px 0)`);

  const slugX = useMotionValue(0);
  const slugW = useMotionValue(0);
  const dropX = useMotionValue(0);
  useAnimationFrame((time) => {
    if (!indeterminate || !width) return;
    const period = 2.2;
    const base = width * 0.32;
    const phase = reduce ? 0.25 : ((time / 1000) % period) / period;
    const at = (p: number) => (1 - Math.cos(p * Math.PI * 2)) / 2;
    const swing = Math.sin(phase * Math.PI * 2);
    const w = base * (1 + 0.45 * Math.abs(swing));
    const x = at(phase) * (width - w);
    slugW.set(w);
    slugX.set(x);
    const trailing = swing > 0 ? x + h * 0.2 : x + w - h * 1.2;
    dropX.set(trailing - swing * h * 1.5);
  });

  const percent = Math.round(pct);

  return (
    <div
      aria-busy={indeterminate || undefined}
      aria-label={ariaLabel}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={indeterminate ? undefined : percent}
      className={cn("relative isolate w-full overflow-hidden rounded-full bg-input", TONES[tone], className)}
      ref={ref}
      role="progressbar"
      style={{ height: h }}
    >
      {width > 0 && !indeterminate && (
        <>
          <svg aria-hidden className="absolute inset-0 size-full overflow-visible" preserveAspectRatio="none">
            <motion.path d={frontPath} fill="var(--liquid)" />
          </svg>
          {showValue && size === "lg" && (
            <>
              <span className="absolute inset-0 flex items-center justify-center font-medium text-muted-foreground text-xs tabular-nums">
                {percent}%
              </span>
              <motion.span
                aria-hidden
                className="absolute inset-0 flex items-center justify-center font-medium text-(--liquid-ink) text-xs tabular-nums"
                style={{ clipPath: inkClip }}
              >
                {percent}%
              </motion.span>
            </>
          )}
        </>
      )}
      {width > 0 && indeterminate && (
        <>
          <svg aria-hidden className="absolute size-0">
            <filter colorInterpolationFilters="sRGB" height="300%" id={filterId} width="120%" x="-10%" y="-100%">
              <feGaussianBlur in="SourceGraphic" result="blur" stdDeviation={Math.max(h / 4, 1.5)} />
              <feColorMatrix in="blur" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9" />
            </filter>
          </svg>
          <span className="absolute inset-0" style={{ filter: `url(#${filterId})` }}>
            <motion.span className="absolute inset-y-0 left-0 rounded-full bg-(--liquid)" style={{ x: slugX, width: slugW }} />
            <motion.span
              className="absolute top-1/2 left-0 rounded-full bg-(--liquid)"
              style={{ x: dropX, width: h, height: h, marginTop: -h / 2 }}
            />
          </span>
          <motion.span
            className={cn("absolute inset-y-0 left-0 rounded-full bg-(--liquid)", reduce && "animate-pulse")}
            style={{ x: slugX, width: slugW }}
          />
        </>
      )}
    </div>
  );
}
