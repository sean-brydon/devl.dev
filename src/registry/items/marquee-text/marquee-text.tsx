"use client";

import { useReducedMotion } from "motion/react";
import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface MarqueeTextProps {
  words: string[];
  speed?: number;
  direction?: "left" | "right";
  pauseOnHover?: boolean;
  paused?: boolean;
  separator?: ReactNode;
  className?: string;
}

export function MarqueeText({
  words,
  speed = 56,
  direction = "left",
  pauseOnHover = true,
  paused = false,
  separator = <span className="mx-[0.28em] inline-block size-[0.16em] rounded-full bg-brand-ink align-middle" />,
  className,
}: MarqueeTextProps) {
  const reduce = useReducedMotion();
  const root = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const copy = useRef<HTMLDivElement>(null);
  const hovered = useRef(false);
  const [copies, setCopies] = useState(2);
  const live = useRef({ speed, paused, pauseOnHover });
  useLayoutEffect(() => {
    live.current = { speed, paused, pauseOnHover };
  }, [speed, paused, pauseOnHover]);

  useLayoutEffect(() => {
    const r = root.current;
    const c = copy.current;
    if (!r || !c) return;
    const fit = () => setCopies(Math.max(2, Math.ceil(r.offsetWidth / Math.max(c.offsetWidth, 1)) + 1));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(r);
    ro.observe(c);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const r = root.current;
    const t = track.current;
    const c = copy.current;
    if (!r || !t || !c || reduce) {
      if (t) t.style.transform = "";
      return;
    }
    let raf = 0;
    let onScreen = true;
    let offset = 0;
    let velocity = live.current.paused ? 0 : live.current.speed;
    let last = performance.now();
    let width = Math.max(c.offsetWidth, 1);
    const ro = new ResizeObserver(() => {
      width = Math.max(c.offsetWidth, 1);
    });
    ro.observe(c);
    const sign = direction === "left" ? -1 : 1;

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const { speed, paused, pauseOnHover } = live.current;
      const goal = paused || (pauseOnHover && hovered.current) ? 0 : speed;
      velocity += (goal - velocity) * (1 - Math.exp(-dt / 0.12));
      offset = (offset + velocity * dt) % width;
      t.style.transform = `translate3d(${sign < 0 ? -offset : offset - width}px, 0, 0)`;
      raf = onScreen ? requestAnimationFrame(tick) : 0;
    };

    const io = new IntersectionObserver(([e]) => {
      onScreen = e.isIntersecting;
      if (onScreen && !raf) {
        last = performance.now();
        raf = requestAnimationFrame(tick);
      }
    });
    io.observe(r);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
    };
  }, [direction, reduce]);

  const row = (key: number) => (
    <div className="flex shrink-0 items-center" key={key} ref={key === 0 ? copy : undefined}>
      {words.map((word, i) => (
        <span className="flex items-center" key={`${word}-${i}`}>
          {i % 2 === 0 ? (
            <span className="whitespace-nowrap">{word}</span>
          ) : (
            // A double-width stroke under a surface-coloured copy hides the seams variable fonts show with text-stroke.
            <span className="relative whitespace-nowrap tracking-[0.015em]">
              <span className="[-webkit-text-stroke:max(2px,0.05em)_currentColor]">{word}</span>
              <span className="absolute inset-0 text-(--marquee-surface,var(--color-card))">{word}</span>
            </span>
          )}
          {separator}
        </span>
      ))}
    </div>
  );

  return (
    <div
      className={cn(
        "overflow-hidden font-heading font-semibold text-6xl leading-none tracking-tight [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]",
        className,
      )}
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") hovered.current = true;
      }}
      onPointerLeave={() => {
        hovered.current = false;
      }}
      ref={root}
    >
      <span className="sr-only">{words.join(", ")}</span>
      <div aria-hidden className="flex w-max py-[0.08em] will-change-transform" ref={track}>
        {Array.from({ length: copies }, (_, i) => row(i))}
      </div>
    </div>
  );
}
