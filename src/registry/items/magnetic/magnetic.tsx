"use client";

import { type MotionValue, motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import {
  type ComponentProps,
  createContext,
  type PointerEvent,
  type ReactNode,
  useContext,
  useLayoutEffect,
  useRef,
} from "react";
import { cn } from "@/lib/utils";

interface Magnet {
  anchor: HTMLElement;
  x: MotionValue<number>;
  y: MotionValue<number>;
  strength: number;
  radius: number;
  max: number;
  group?: string;
}

type Registry = Set<Magnet>;

const FieldContext = createContext<Registry | null>(null);

const spring = { stiffness: 260, damping: 17, mass: 0.6 };

export interface MagneticFieldProps extends ComponentProps<"div"> {
  children: ReactNode;
}

export function MagneticField({ children, className, onPointerMove, onPointerLeave, ...props }: MagneticFieldProps) {
  const registry = useRef<Registry>(new Set()).current;
  const reduce = useReducedMotion();

  const move = (event: PointerEvent<HTMLDivElement>) => {
    onPointerMove?.(event);
    if (reduce || event.pointerType !== "mouse") return;
    const pulls: { m: Magnet; dx: number; dy: number; edge: number }[] = [];
    const nearest = new Map<string, number>();
    for (const m of registry) {
      const r = m.anchor.getBoundingClientRect();
      const dx = event.clientX - (r.left + r.width / 2);
      const dy = event.clientY - (r.top + r.height / 2);
      const half = Math.min(r.width, r.height) / 2;
      const wide = r.width >= r.height;
      const along = Math.max(Math.abs(wide ? dx : dy) - (Math.max(r.width, r.height) / 2 - half), 0);
      const edge = Math.max(Math.hypot(along, wide ? dy : dx) - half, 0);
      pulls.push({ m, dx, dy, edge });
      if (m.group) nearest.set(m.group, Math.min(nearest.get(m.group) ?? Infinity, edge));
    }
    for (const { m, dx, dy, edge } of pulls) {
      const t = m.group && edge > (nearest.get(m.group) ?? 0) ? 1 : Math.min(edge / m.radius, 1);
      const pull = 1 - t * t * (3 - 2 * t);
      m.x.set(m.max * Math.tanh((dx * m.strength * pull) / m.max));
      m.y.set(m.max * Math.tanh((dy * m.strength * pull) / m.max));
    }
  };

  const leave = (event: PointerEvent<HTMLDivElement>) => {
    onPointerLeave?.(event);
    for (const m of registry) {
      m.x.set(0);
      m.y.set(0);
    }
  };

  return (
    <FieldContext.Provider value={registry}>
      <div className={className} onPointerLeave={leave} onPointerMove={move} {...props}>
        {children}
      </div>
    </FieldContext.Provider>
  );
}

export interface MagneticProps {
  children: ReactNode;
  strength?: number;
  radius?: number;
  max?: number;
  group?: string;
  className?: string;
}

export function Magnetic({ children, strength = 0.35, radius = 72, max = 10, group, className }: MagneticProps) {
  const registry = useContext(FieldContext);
  const anchor = useRef<HTMLSpanElement>(null);
  const tx = useMotionValue(0);
  const ty = useMotionValue(0);
  const x = useSpring(tx, spring);
  const y = useSpring(ty, spring);

  useLayoutEffect(() => {
    const el = anchor.current;
    if (!registry || !el) return;
    const magnet: Magnet = { anchor: el, x: tx, y: ty, strength, radius, max, group };
    registry.add(magnet);
    return () => {
      registry.delete(magnet);
    };
  }, [registry, tx, ty, strength, radius, max, group]);

  return (
    <span className={cn("inline-flex", className)} ref={anchor}>
      <motion.span className="inline-flex will-change-transform" style={{ x, y }}>
        {children}
      </motion.span>
    </span>
  );
}
