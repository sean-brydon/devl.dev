"use client";

import { useReducedMotion } from "motion/react";
import {
  type ComponentProps,
  type ElementType,
  type FocusEvent,
  type PointerEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";

const POOLS = {
  upper: "ABCDEFGHKLNOPQRSTUVXYZ",
  lower: "abcdeghknopqsuvxyz",
  narrow: "fijlrt",
  digit: "0123456789",
  mono: "!<>-_\\/[]{}=+*^?#%&$",
};

function noise(ch: string, mono: boolean) {
  if (ch.trim() === "") return ch;
  const pool = mono
    ? POOLS.mono
    : /[fijlrtI1]/.test(ch)
      ? POOLS.narrow
      : /[A-Z]/.test(ch)
        ? POOLS.upper
        : /[0-9]/.test(ch)
          ? POOLS.digit
          : /[a-z]/.test(ch)
            ? POOLS.lower
            : POOLS.mono;
  return pool[Math.floor(Math.random() * pool.length)];
}

type Cell = { ch: string; glyph: string | null };

export interface ScrambleTextProps extends Omit<ComponentProps<"span">, "children"> {
  text: string;
  trigger?: "view" | "hover" | "mount";
  mono?: boolean;
  hold?: number;
  stagger?: number;
  delay?: number;
  replay?: number;
  as?: ElementType;
  href?: string;
}

export function ScrambleText({
  text,
  trigger = "view",
  mono = false,
  hold = 260,
  stagger = 28,
  delay = 0,
  replay,
  as: Tag = "span",
  className,
  onPointerEnter,
  onFocus,
  ...props
}: ScrambleTextProps) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const raf = useRef(0);
  const [cells, setCells] = useState<Cell[] | null>(null);

  const run = useCallback(() => {
    if (reduce || raf.current) return;
    const chars = [...text];
    const settle = chars.map((_, i) => delay + hold + i * stagger + Math.random() * stagger * 2);
    const end = Math.max(...settle);
    const start = performance.now();
    let lastSwap = -1;
    const tick = (now: number) => {
      const t = now - start;
      const swap = Math.floor(t / 45);
      if (swap !== lastSwap || t >= end) {
        lastSwap = swap;
        setCells(chars.map((ch, i) => ({ ch, glyph: t >= settle[i] ? null : noise(ch, mono) })));
      }
      if (t < end) raf.current = requestAnimationFrame(tick);
      else {
        raf.current = 0;
        setCells(null);
      }
    };
    raf.current = requestAnimationFrame(tick);
  }, [text, hold, stagger, delay, mono, reduce]);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  useLayoutEffect(() => {
    if (reduce || trigger === "hover") return;
    setCells([...text].map((ch) => ({ ch, glyph: noise(ch, mono) })));
  }, [text, trigger, mono, reduce]);

  useEffect(() => {
    if (reduce) {
      setCells(null);
      return;
    }
    if (trigger === "mount") return run();
    if (trigger !== "view" || !ref.current) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        run();
      },
      { threshold: 0.6 },
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, [trigger, run, reduce]);

  const replayed = useRef(replay);
  useEffect(() => {
    if (replayed.current === replay) return;
    replayed.current = replay;
    cancelAnimationFrame(raf.current);
    raf.current = 0;
    run();
  }, [replay, run]);

  return (
    <Tag
      className={cn(mono && "font-mono", className)}
      onFocus={(e: FocusEvent<HTMLElement>) => {
        onFocus?.(e as FocusEvent<HTMLSpanElement>);
        if (trigger === "hover" && e.currentTarget.matches(":focus-visible")) run();
      }}
      onPointerEnter={(e: PointerEvent<HTMLElement>) => {
        onPointerEnter?.(e as PointerEvent<HTMLSpanElement>);
        if (trigger === "hover" && e.pointerType === "mouse") run();
      }}
      ref={ref}
      {...props}
    >
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {cells
          ? text.split(/(\s+)/).map((word, w, words) => {
              const offset = words.slice(0, w).join("").length;
              if (/^\s+$/.test(word)) return word;
              return (
                <span className="inline-block whitespace-nowrap" key={`${w}-${word}`}>
                  {[...word].map((ch, i) => {
                    const cell = cells[[...text.slice(0, offset)].length + i];
                    if (!cell?.glyph) return <span key={i}>{ch}</span>;
                    return (
                      <span className="relative inline-block" key={i}>
                        <span className="invisible">{ch}</span>
                        <span className="absolute inset-0 text-center text-muted-foreground">{cell.glyph}</span>
                      </span>
                    );
                  })}
                </span>
              );
            })
          : text}
      </span>
    </Tag>
  );
}
