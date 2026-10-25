"use client";

import { PauseIcon, PlayIcon, type LucideIcon } from "lucide-react";
import { motion, useAnimationFrame, useMotionValue, useReducedMotion } from "motion/react";
import { type PointerEvent, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type WordmarkStyle = "sans" | "serif" | "mono" | "caps" | "heavy" | "light";

export interface TickerLogo {
  name: string;
  icon: LucideIcon;
  style?: WordmarkStyle;
}

export interface WordmarkTickerProps {
  logos: TickerLogo[];
  title?: string;
  rows?: number;
  speed?: number;
  className?: string;
}

const wordmarkStyles: Record<WordmarkStyle, string> = {
  sans: "font-semibold text-lg tracking-tight",
  serif: "font-serif text-xl italic",
  mono: "font-mono font-medium text-base lowercase",
  caps: "font-bold text-sm uppercase tracking-[0.22em]",
  heavy: "font-black text-xl tracking-tighter",
  light: "font-light text-xl tracking-wide",
};

function Wordmark({ logo }: { logo: TickerLogo }) {
  const Icon = logo.icon;
  return (
    <span className={cn("flex items-center gap-2 whitespace-nowrap", wordmarkStyles[logo.style ?? "sans"])}>
      <Icon className="size-5 shrink-0" strokeWidth={logo.style === "light" ? 1.5 : 2.25} />
      {logo.name}
    </span>
  );
}

function TickerRow({
  logos,
  speed,
  reverse,
  paused,
}: {
  logos: TickerLogo[];
  speed: number;
  reverse: boolean;
  paused: boolean;
}) {
  const reduce = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLUListElement>(null);
  const [copyWidth, setCopyWidth] = useState(0);
  const [copies, setCopies] = useState(2);
  const x = useMotionValue(0);
  const velocity = useRef(0);
  const hovered = useRef(false);
  const drag = useRef<{ active: boolean; lastX: number; lastT: number; v: number } | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const copy = copyRef.current;
    if (!container || !copy) return;
    const measure = () => {
      const w = copy.offsetWidth;
      setCopyWidth(w);
      if (w > 0) setCopies(Math.max(2, Math.ceil(container.offsetWidth / w) + 1));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    observer.observe(copy);
    return () => observer.disconnect();
  }, []);

  const wrap = (value: number) => (copyWidth ? (((value % copyWidth) - copyWidth) % copyWidth) : value);

  useAnimationFrame((_, delta) => {
    if (!copyWidth || drag.current?.active) return;
    const dt = Math.min(delta, 50) / 1000;
    const cruise = reverse ? speed : -speed;
    const target = hovered.current || paused || reduce ? 0 : cruise;
    const gap = Math.abs(velocity.current - target);
    const rate = gap > speed * 3 ? 2.2 : hovered.current ? 5 : 1.6;
    velocity.current += (target - velocity.current) * (1 - Math.exp(-rate * dt));
    if (target === 0 && Math.abs(velocity.current) < 0.5) {
      velocity.current = 0;
      return;
    }
    x.set(wrap(x.get() + velocity.current * dt));
  });

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { active: true, lastX: event.clientX, lastT: event.timeStamp, v: 0 };
    velocity.current = 0;
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d?.active) return;
    const dx = event.clientX - d.lastX;
    const dt = Math.max(1, event.timeStamp - d.lastT);
    d.v = d.v * 0.5 + (dx / dt) * 1000 * 0.5;
    d.lastX = event.clientX;
    d.lastT = event.timeStamp;
    x.set(wrap(x.get() + dx));
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d?.active) return;
    const idle = event.timeStamp - d.lastT > 90;
    velocity.current = idle ? 0 : Math.max(-4000, Math.min(4000, d.v));
    drag.current = null;
  };

  return (
    <div
      className="relative cursor-grab touch-pan-y select-none overflow-hidden py-2 [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)] active:cursor-grabbing"
      onPointerCancel={onPointerUp}
      onPointerDown={onPointerDown}
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") hovered.current = true;
      }}
      onPointerLeave={() => {
        hovered.current = false;
      }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      ref={containerRef}
    >
      <motion.div className="flex w-max" style={{ x }}>
        {Array.from({ length: copies }, (_, copy) => {
          const items = logos.map((logo) => (
            <li
              className="flex h-12 items-center px-3 text-muted-foreground transition-colors duration-200 ease-out hover:text-foreground"
              key={logo.name}
            >
              <Wordmark logo={logo} />
            </li>
          ));
          return copy === 0 ? (
            <ul className="flex shrink-0 items-center gap-8 pe-8 sm:gap-12 sm:pe-12" key="main" ref={copyRef}>
              {items}
            </ul>
          ) : (
            <ul aria-hidden className="flex shrink-0 items-center gap-8 pe-8 sm:gap-12 sm:pe-12" key={copy}>
              {items}
            </ul>
          );
        })}
      </motion.div>
    </div>
  );
}

export function WordmarkTicker({ logos, title = "Trusted by teams at", rows = 1, speed = 40, className }: WordmarkTickerProps) {
  const [paused, setPaused] = useState(false);
  const rowCount = Math.max(1, Math.min(rows, logos.length));
  const split = Array.from({ length: rowCount }, (_, r) => logos.filter((_, i) => i % rowCount === r));

  return (
    <section aria-label={title} className={cn("mx-auto w-full max-w-[1100px]", className)}>
      <div className="relative mb-3 flex h-8 items-center justify-center gap-3 px-10">
        <span aria-hidden className="h-px w-8 shrink bg-linear-to-r from-transparent to-border sm:w-24" />
        <h2 className="truncate text-center font-medium text-muted-foreground text-sm">{title}</h2>
        <span aria-hidden className="h-px w-8 shrink bg-linear-to-l from-transparent to-border sm:w-24" />
        <button
          aria-label={paused ? "Resume scrolling" : "Pause scrolling"}
          aria-pressed={paused}
          className="absolute end-0 inline-flex size-8 cursor-pointer items-center justify-center rounded-full text-muted-foreground/72 outline-none transition-[color,background-color,transform] duration-150 ease-out hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]"
          onClick={() => setPaused((p) => !p)}
          type="button"
        >
          {paused ? <PlayIcon className="size-3.5 translate-x-px" /> : <PauseIcon className="size-3.5" />}
        </button>
      </div>
      <div className="space-y-1">
        {split.map((rowLogos, r) => (
          <TickerRow
            key={rowLogos.map((l) => l.name).join("|")}
            logos={rowLogos}
            paused={paused}
            reverse={r % 2 === 1}
            speed={speed * (r % 2 === 1 ? 0.8 : 1)}
          />
        ))}
      </div>
    </section>
  );
}
