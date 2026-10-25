"use client";

import { motion, useAnimate, useReducedMotion } from "motion/react";
import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface TicketTearProps {
  main: ReactNode;
  stub: ReactNode;
  torn: boolean;
  onTorn?: () => void;
  stubWidth?: number;
  height?: number;
  className?: string;
}

const NOTCH = 9;
const BLEED = 4;
const CORNER = 14;

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

function useSafeReducedMotion() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && !!prefers;
}

function seam(x: number, height: number) {
  const top = NOTCH;
  const bottom = height - NOTCH;
  const n = Math.max(2, Math.round((bottom - top) / 5));
  return Array.from({ length: n + 1 }, (_, i) => {
    const edge = i === 0 || i === n;
    const j = Math.sin((i + 1) * 12.9898) * 43758.5453;
    const noise = j - Math.floor(j);
    const dx = edge ? 0 : (i % 2 ? 1 : -1) * 2.2 * (0.5 + 0.5 * noise);
    return `${(x + dx).toFixed(2)} ${(top + ((bottom - top) * i) / n).toFixed(2)}`;
  });
}

function shapes(width: number, height: number, stubWidth: number) {
  const x = width - stubWidth;
  const r = CORNER;
  const R = NOTCH;
  const H = height;
  const W = width;
  const zig = seam(x, H);
  const down = zig.map((p) => `L${p}`).join(" ");
  const up = [...zig].reverse().map((p) => `L${p}`).join(" ");
  const mainEdge = `M${x} ${H - R} A${R} ${R} 0 0 0 ${x - R} ${H} H${r} A${r} ${r} 0 0 1 0 ${H - r} V${r} A${r} ${r} 0 0 1 ${r} 0 H${x - R} A${R} ${R} 0 0 0 ${x} ${R}`;
  const stubEdge = `M${x} ${R} A${R} ${R} 0 0 0 ${x + R} 0 H${W - r} A${r} ${r} 0 0 1 ${W} ${r} V${H - r} A${r} ${r} 0 0 1 ${W - r} ${H} H${x + R} A${R} ${R} 0 0 0 ${x} ${H - R}`;
  return {
    x,
    mainFill: `${mainEdge} ${down.replace(/^L[^L]*/, "")} Z`,
    mainEdge,
    stubFill: `${stubEdge} ${up.replace(/^L[^L]*/, "")} Z`,
    stubEdge,
    seam: `M${zig.join(" L")}`,
  };
}

export function TicketTear({ main, stub, torn, onTorn, stubWidth = 96, height = 168, className }: TicketTearProps) {
  const root = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(360);
  const [mainScope, animateMain] = useAnimate<HTMLDivElement>();
  const [stubScope, animateStub] = useAnimate<HTMLDivElement>();
  const reduce = useSafeReducedMotion();
  const shown = useRef<boolean | null>(null);
  const done = useRef(onTorn);
  done.current = onTorn;

  useIsoLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const measure = () => setWidth(el.offsetWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const mainEl = mainScope.current;
    const stubEl = stubScope.current;
    if (!mainEl || !stubEl) return;
    if (shown.current === null) {
      shown.current = torn;
      if (torn) {
        animateStub(stubEl, { opacity: 0 }, { duration: 0 });
        animateMain(mainEl, { x: stubWidth / 2 }, { duration: 0 });
      }
      return;
    }
    if (shown.current === torn) return;
    shown.current = torn;
    let cancelled = false;
    if (torn) {
      if (reduce) {
        animateStub(stubEl, { opacity: 0 }, { duration: 0.2 }).then(() => {
          if (cancelled) return;
          animateMain(mainEl, { x: stubWidth / 2 }, { duration: 0 });
          done.current?.();
        });
        return () => {
          cancelled = true;
        };
      }
      const ease = [0.23, 1, 0.32, 1] as const;
      animateStub([
        [stubEl, { rotate: 2 }, { duration: 0.14, ease: "easeOut" }],
        [stubEl, { rotate: 6 }, { duration: 0.18, ease: [0.5, 0, 0.75, 0.4] }],
        [stubEl, { rotate: 13, x: -18 }, { duration: 0.55, ease: "easeOut" }],
        [stubEl, { y: 130 }, { duration: 0.55, ease: [0.45, 0, 0.9, 0.45], at: "<" }],
        [stubEl, { opacity: 0 }, { duration: 0.28, ease: "easeIn", at: "-0.3" }],
      ]).then(() => !cancelled && done.current?.());
      animateMain([
        [mainEl, { x: -2 }, { duration: 0.3, ease: "easeOut" }],
        [mainEl, { x: stubWidth / 2 }, { type: "spring", stiffness: 260, damping: 30, at: 0.5 }],
      ]);
    } else {
      animateStub(stubEl, { rotate: 0, x: 0, y: 0 }, { duration: 0 });
      animateStub(stubEl, { opacity: [0, 1], scale: reduce ? 1 : [0.96, 1] }, { duration: 0.24, ease: [0.23, 1, 0.32, 1] });
      animateMain(mainEl, { x: 0 }, reduce ? { duration: 0 } : { type: "spring", stiffness: 320, damping: 32 });
    }
    return () => {
      cancelled = true;
    };
  }, [torn, reduce, stubWidth, animateMain, animateStub, mainScope, stubScope]);

  const s = shapes(width, height, stubWidth);
  const seamTransition = { duration: reduce ? 0.2 : 0.16, delay: torn && !reduce ? 0.12 : 0 };
  const svgClass =
    "absolute inset-0 overflow-visible drop-shadow-[0_1px_2px_rgb(0_0_0/0.06)] dark:drop-shadow-[0_1px_2px_rgb(0_0_0/0.3)]";

  return (
    <div className={cn("relative w-full select-none", className)} ref={root} style={{ height }}>
      <div className="absolute inset-y-0 left-0" ref={mainScope} style={{ right: stubWidth - BLEED }}>
        <svg aria-hidden className={svgClass} height={height} viewBox={`0 0 ${s.x + BLEED} ${height}`} width={s.x + BLEED}>
          <path className="fill-card" d={s.mainFill} />
          <path className="fill-none stroke-border" d={s.mainEdge} />
          <motion.path
            animate={{ opacity: torn ? 1 : 0 }}
            className="fill-none stroke-border"
            d={s.seam}
            initial={false}
            transition={seamTransition}
          />
          <motion.line
            animate={{ opacity: torn ? 0 : 1 }}
            className="stroke-muted-foreground/45"
            initial={false}
            strokeDasharray="0.5 5.5"
            strokeLinecap="round"
            strokeWidth={2}
            transition={{ duration: 0.12 }}
            x1={s.x}
            x2={s.x}
            y1={NOTCH + 5}
            y2={height - NOTCH - 5}
          />
        </svg>
        <div className="absolute inset-y-0 left-0" style={{ right: BLEED }}>
          {main}
        </div>
      </div>
      <div
        className="absolute inset-y-0 right-0"
        ref={stubScope}
        style={{ width: stubWidth + BLEED, transformOrigin: `${BLEED}px 100%` }}
      >
        <svg
          aria-hidden
          className={svgClass}
          height={height}
          viewBox={`${s.x - BLEED} 0 ${stubWidth + BLEED} ${height}`}
          width={stubWidth + BLEED}
        >
          <path className="fill-card" d={s.stubFill} />
          <path className="fill-none stroke-border" d={s.stubEdge} />
          <motion.path
            animate={{ opacity: torn ? 1 : 0 }}
            className="fill-none stroke-border"
            d={s.seam}
            initial={false}
            transition={seamTransition}
          />
        </svg>
        <div className="absolute inset-y-0 right-0" style={{ width: stubWidth }}>
          {stub}
        </div>
      </div>
    </div>
  );
}
