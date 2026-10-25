"use client";

import { motion, useInView, useMotionTemplate, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { type CSSProperties, type PointerEvent, type ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface SpotlightTextProps {
  children: ReactNode;
  secret?: ReactNode;
  radius?: number;
  dim?: number;
  className?: string;
}

const drift = { stiffness: 90, damping: 18, mass: 0.8 };
const track = { stiffness: 260, damping: 28, mass: 0.6 };

function useSafeReducedMotion() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && !!prefers;
}

export function SpotlightText({ children, secret, radius = 130, dim = 0.4, className }: SpotlightTextProps) {
  const root = useRef<HTMLDivElement>(null);
  const reduce = useSafeReducedMotion();
  const inView = useInView(root);
  const [pointing, setPointing] = useState(false);
  const x = useMotionValue(radius);
  const y = useMotionValue(radius * 0.6);
  const sx = useSpring(x, pointing ? track : drift);
  const sy = useSpring(y, pointing ? track : drift);
  const r = useMotionValue(radius);
  const mask = useMotionTemplate`radial-gradient(circle ${r}px at ${sx}px ${sy}px, black 0%, rgb(0 0 0 / 0.85) 40%, transparent 100%)`;
  const glow = useMotionTemplate`radial-gradient(circle ${r}px at ${sx}px ${sy}px, var(--spotlight-glow), transparent 100%)`;

  useEffect(() => {
    r.set(radius);
  }, [radius, r]);

  useEffect(() => {
    const el = root.current;
    if (!el || pointing) return;
    const place = (t: number) => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      x.set(w * (0.5 + 0.36 * Math.sin(t * 0.42)));
      y.set(h * (0.5 + 0.34 * Math.sin(t * 0.84 + 0.6)));
    };
    if (reduce) {
      x.jump(el.clientWidth * 0.32);
      y.jump(el.clientHeight * 0.42);
      sx.jump(x.get());
      sy.jump(y.get());
      return;
    }
    if (!inView) return;
    let raf = 0;
    const start = performance.now() - 2200;
    const tick = (now: number) => {
      place((now - start) / 1000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [pointing, reduce, inView, x, y, sx, sy]);

  const follow = (e: PointerEvent<HTMLDivElement>) => {
    const el = root.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const scale = rect.width / el.offsetWidth || 1;
    const px = (e.clientX - rect.left) / scale - el.clientLeft;
    const py = (e.clientY - rect.top) / scale - el.clientTop;
    x.set(px);
    y.set(py);
    if (reduce) {
      sx.jump(px);
      sy.jump(py);
    }
  };

  const release = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.type !== "pointerleave") return;
    setPointing(false);
  };

  return (
    <div
      className={cn(
        "group relative isolate overflow-hidden [--spotlight-glow:color-mix(in_oklab,var(--color-amber-300)_34%,transparent)] dark:[--spotlight-glow:color-mix(in_oklab,var(--color-amber-300)_22%,transparent)]",
        className,
      )}
      onPointerCancel={release}
      onPointerDown={(e) => {
        setPointing(true);
        follow(e);
      }}
      onPointerEnter={(e) => {
        if (e.pointerType !== "mouse") return;
        setPointing(true);
        follow(e);
      }}
      onPointerLeave={release}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse" && !pointing) return;
        if (!pointing) setPointing(true);
        follow(e);
      }}
      onPointerUp={release}
      ref={root}
    >
      <motion.div aria-hidden className="pointer-events-none absolute inset-0 -z-10" style={{ backgroundImage: glow }} />
      <div
        className="opacity-(--spotlight-dim) transition-opacity duration-200 group-has-[:focus-visible]:opacity-100"
        style={{ "--spotlight-dim": dim } as CSSProperties}
      >
        {children}
        {secret ? <div className="blur-[3px]">{secret}</div> : null}
      </div>
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 select-none"
        inert
        style={{ padding: "inherit", maskImage: mask, WebkitMaskImage: mask }}
      >
        {children}
        {secret ? <div>{secret}</div> : null}
      </motion.div>
    </div>
  );
}
