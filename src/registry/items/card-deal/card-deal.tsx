"use client";

import { motion, type TargetAndTransition, type Transition, useInView, useReducedMotion } from "motion/react";
import { type ReactNode, type RefObject, useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Offset = { x: number; y: number };
type Phase = "deck" | "dealt";

export interface CardDealProps<T> {
  items: T[];
  getKey: (item: T) => string;
  renderItem: (item: T, index: number) => ReactNode;
  origin?: RefObject<HTMLElement | null>;
  stagger?: number;
  className?: string;
  slotClassName?: string;
  label?: string;
}

function useCalmMotion() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && !!prefers;
}

function tilt(index: number, round: number) {
  const n = Math.sin(index * 12.9898 + round * 78.233) * 43758.5453;
  const unit = n - Math.floor(n);
  return (index % 2 ? 1 : -1) * (5 + unit * 9);
}

const fly = [0.55, 0, 0.25, 1] as const;

export function CardDeal<T>({
  items,
  getKey,
  renderItem,
  origin,
  stagger = 0.05,
  className,
  slotClassName,
  label = "Cards",
}: CardDealProps<T>) {
  const root = useRef<HTMLDivElement>(null);
  const slots = useRef<(HTMLDivElement | null)[]>([]);
  const reduce = useCalmMotion();
  const inView = useInView(root, { once: true, amount: 0.4 });
  const [shown, setShown] = useState(items);
  const [phase, setPhase] = useState<Phase>("deck");
  const [round, setRound] = useState(0);
  const [offsets, setOffsets] = useState<Offset[] | null>(null);
  const [instant, setInstant] = useState(true);

  const signature = items.map(getKey).join("|");
  const shownSignature = shown.map(getKey).join("|");

  useLayoutEffect(() => {
    const container = root.current;
    if (!container) return;
    const measure = () => {
      const box = container.getBoundingClientRect();
      const scale = box.width / (container.offsetWidth || 1) || 1;
      const anchor = origin?.current?.getBoundingClientRect();
      const ox = anchor ? (anchor.left + anchor.width / 2 - box.left) / scale : container.offsetWidth / 2;
      const oy = anchor ? (anchor.top + anchor.height / 2 - box.top) / scale : container.offsetHeight + 24;
      setOffsets(
        slots.current.map((slot) =>
          slot
            ? { x: ox - (slot.offsetLeft + slot.offsetWidth / 2), y: oy - (slot.offsetTop + slot.offsetHeight / 2) }
            : { x: 0, y: 0 },
        ),
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, [origin, shown.length]);

  useEffect(() => {
    if (!inView || !offsets) return;
    if (signature === shownSignature) {
      const frame = requestAnimationFrame(() => {
        setInstant(false);
        setPhase("dealt");
      });
      return () => cancelAnimationFrame(frame);
    }
    setPhase("deck");
    const wait = reduce ? 160 : 320;
    const timer = setTimeout(() => {
      setShown(items);
      setRound((r) => r + 1);
      setPhase("dealt");
    }, wait);
    return () => clearTimeout(timer);
  }, [inView, offsets === null, signature, shownSignature, reduce]);

  const count = shown.length;

  return (
    <div aria-busy={phase === "deck"} aria-label={label} className={cn("relative grid grid-cols-3 gap-3", className)} ref={root} role="list">
      {shown.map((item, i) => {
        const offset = offsets?.[i] ?? { x: 0, y: 0 };
        const gathered: TargetAndTransition = reduce
          ? { x: 0, y: 0, rotate: 0, scale: 1, opacity: 0 }
          : { x: offset.x, y: offset.y, rotate: tilt(i, round + 1), scale: 0.5, opacity: 0 };
        const dealt: TargetAndTransition = { x: 0, y: 0, rotate: 0, scale: 1, opacity: 1 };
        const out = i * stagger;
        const transition: Transition = instant
          ? { duration: 0 }
          : reduce
            ? { duration: 0.18, delay: phase === "dealt" ? i * 0.03 : 0 }
            : phase === "dealt"
              ? {
                  x: { type: "spring", stiffness: 210, damping: 26, delay: out },
                  y: { type: "spring", stiffness: 210, damping: 26, delay: out },
                  rotate: { type: "spring", stiffness: 170, damping: 17, delay: out },
                  scale: { type: "spring", stiffness: 260, damping: 24, delay: out },
                  opacity: { duration: 0.12, ease: "easeOut", delay: out },
                }
              : {
                  x: { duration: 0.3, ease: fly },
                  y: { duration: 0.3, ease: fly },
                  rotate: { duration: 0.3, ease: fly },
                  scale: { duration: 0.3, ease: fly },
                  opacity: { duration: 0.1, ease: "linear", delay: 0.2 },
                };
        return (
          <div
            className={cn("relative", slotClassName)}
            key={i}
            ref={(el) => {
              slots.current[i] = el;
            }}
            role="listitem"
            style={{ zIndex: phase === "dealt" ? i + 1 : count - i }}
          >
            <motion.div
              animate={phase === "dealt" && offsets ? dealt : gathered}
              className="h-full origin-center will-change-transform"
              initial={{ opacity: 0 }}
              transition={transition}
            >
              {renderItem(item, i)}
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}
