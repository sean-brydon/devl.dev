"use client";

import { useReducedMotion } from "motion/react";
import { useId, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface RimLightProps {
  duration?: number;
  length?: number;
  phase?: number;
  reverse?: boolean;
  width?: number;
  className?: string;
}

const TAIL = [
  { share: 0.3, opacity: 1 },
  { share: 0.6, opacity: 0.45 },
  { share: 1, opacity: 0.18 },
];

export function RimLight({ duration = 6, length = 0.16, phase = 0, reverse = false, width = 1.5, className }: RimLightProps) {
  const reduce = useReducedMotion();
  const glowId = `beam-glow-${useId().replace(/:/g, "")}`;
  const ref = useRef<SVGSVGElement>(null);
  const [box, setBox] = useState<{ w: number; h: number; r: number } | null>(null);
  const [onScreen, setOnScreen] = useState(true);

  useLayoutEffect(() => {
    const parent = ref.current?.parentElement;
    if (!parent) return;
    const measure = () => {
      const r = Number.parseFloat(getComputedStyle(parent).borderTopLeftRadius) || 0;
      setBox({ w: parent.offsetWidth, h: parent.offsetHeight, r });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(parent);
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting));
    io.observe(parent);
    return () => {
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  useLayoutEffect(() => {
    const svg = ref.current;
    if (!svg || !box || reduce || !onScreen) return;
    const anims = [...svg.querySelectorAll<SVGRectElement>("[data-dash]")].map((rect) => {
      const dash = Number(rect.dataset.dash);
      const from = dash - phase * 100;
      const a = rect.animate(
        { strokeDashoffset: reverse ? [from - 100, from] : [from, from - 100] },
        { duration: duration * 1000, iterations: Number.POSITIVE_INFINITY, easing: "linear" },
      );
      a.startTime = 0;
      return a;
    });
    return () => {
      for (const a of anims) a.cancel();
    };
  }, [box, duration, phase, reverse, reduce, onScreen]);

  const rect = box && {
    x: 0.5,
    y: 0.5,
    width: Math.max(box.w - 1, 0),
    height: Math.max(box.h - 1, 0),
    rx: Math.max(box.r - 0.5, 0),
  };

  return (
    <svg
      aria-hidden
      className={cn("pointer-events-none absolute -inset-px size-[calc(100%+2px)] overflow-visible", className)}
      ref={ref}
    >
      {rect && reduce && <rect {...rect} fill="none" opacity={0.35} stroke="currentColor" strokeWidth={1} />}
      {rect && !reduce && (
        <>
          <defs>
            <filter height="200%" id={glowId} width="200%" x="-50%" y="-50%">
              <feGaussianBlur stdDeviation={3} />
            </filter>
          </defs>
          <g filter={`url(#${glowId})`} opacity={0.7}>
            <Dash dash={length * 100 * TAIL[0].share} rect={rect} width={width + 2} />
          </g>
          {TAIL.map((t) => (
            <Dash dash={length * 100 * t.share} key={t.share} opacity={t.opacity} rect={rect} width={width} />
          ))}
        </>
      )}
    </svg>
  );
}

function Dash({
  rect,
  dash,
  width,
  opacity = 1,
}: {
  rect: { x: number; y: number; width: number; height: number; rx: number };
  dash: number;
  width: number;
  opacity?: number;
}) {
  return (
    <rect
      {...rect}
      data-dash={dash}
      fill="none"
      opacity={opacity}
      pathLength={100}
      stroke="currentColor"
      strokeDasharray={`${dash} ${100 - dash}`}
      strokeDashoffset={dash}
      strokeLinecap="round"
      strokeWidth={width}
    />
  );
}
