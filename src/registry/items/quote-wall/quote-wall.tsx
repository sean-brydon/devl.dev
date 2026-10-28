"use client";

import { PauseIcon, PlayIcon, QuoteIcon, StarIcon } from "lucide-react";
import { motion, useAnimationFrame, useMotionValue, useReducedMotion } from "motion/react";
import { type RefObject, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// Stays false until mounted so the server render and the first client render match.
function useSafeReducedMotion() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && !!prefers;
}

export interface WallQuote {
  quote: string;
  highlight?: string;
  name: string;
  role: string;
  company: string;
}

export interface QuoteWallProps {
  quotes: WallQuote[];
  eyebrow?: string;
  title?: string;
  rating?: { score: number; count: string };
  speed?: number;
  className?: string;
}

const avatarTones = [
  "bg-info/16 text-info-foreground",
  "bg-success/16 text-success-foreground",
  "bg-warning/12 text-warning-foreground",
  "bg-muted text-foreground",
];

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function toneFor(name: string) {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return avatarTones[hash % avatarTones.length];
}

function QuoteText({ text, highlight }: { text: string; highlight?: string }) {
  const at = highlight ? text.indexOf(highlight) : -1;
  if (!highlight || at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <mark className="rounded-sm bg-warning/20 px-0.5 font-medium text-foreground [box-decoration-break:clone]">
        {highlight}
      </mark>
      {text.slice(at + highlight.length)}
    </>
  );
}

function QuoteCard({ item }: { item: WallQuote }) {
  return (
    <figure className="relative rounded-2xl border bg-card p-5 shadow-xs/5 transition-colors duration-200 ease-out hover:border-foreground/16">
      <QuoteIcon
        aria-hidden
        className="absolute top-4 right-4 size-5 rotate-180 text-muted-foreground/16"
        fill="currentColor"
        strokeWidth={0}
      />
      <blockquote className="text-pretty pe-6 text-muted-foreground text-sm leading-relaxed">
        <QuoteText highlight={item.highlight} text={item.quote} />
      </blockquote>
      <figcaption className="mt-4 flex items-center gap-3">
        <span
          aria-hidden
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-full font-semibold text-xs",
            toneFor(item.name),
          )}
        >
          {initials(item.name)}
        </span>
        <span className="min-w-0">
          <span className="block truncate font-medium text-sm">{item.name}</span>
          <span className="block truncate text-muted-foreground text-xs">
            {item.role}, {item.company}
          </span>
        </span>
      </figcaption>
    </figure>
  );
}

function ScrollColumn({
  items,
  speed,
  reverse,
  offset,
  hovered,
  paused,
}: {
  items: WallQuote[];
  speed: number;
  reverse: boolean;
  offset: number;
  hovered: RefObject<boolean>;
  paused: boolean;
}) {
  const reduce = useSafeReducedMotion();
  const viewportRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const [copyHeight, setCopyHeight] = useState(0);
  const [copies, setCopies] = useState(2);
  const y = useMotionValue(0);
  const velocity = useRef(0);

  useEffect(() => {
    const viewport = viewportRef.current;
    const copy = copyRef.current;
    if (!viewport || !copy) return;
    const measure = () => {
      const h = copy.offsetHeight;
      setCopyHeight(h);
      if (h > 0) {
        setCopies(Math.max(2, Math.ceil(viewport.offsetHeight / h) + 1));
        y.set(-h * offset);
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(copy);
    return () => observer.disconnect();
  }, [offset, y]);

  useAnimationFrame((_, delta) => {
    if (!copyHeight || reduce) return;
    const dt = Math.min(delta, 50) / 1000;
    const still = hovered.current || paused;
    const target = still ? 0 : reverse ? speed : -speed;
    const rate = still ? 3.2 : 1.4;
    velocity.current += (target - velocity.current) * (1 - Math.exp(-rate * dt));
    if (target === 0 && Math.abs(velocity.current) < 0.3) {
      velocity.current = 0;
      return;
    }
    const next = y.get() + velocity.current * dt;
    y.set((((next % copyHeight) - copyHeight) % copyHeight) || 0);
  });

  return (
    <div
      aria-label={reduce ? "Customer quotes" : undefined}
      className={cn("h-full rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring", reduce ? "overflow-y-auto" : "overflow-hidden")}
      ref={viewportRef}
      role={reduce ? "region" : undefined}
      tabIndex={reduce ? 0 : undefined}
    >
      <motion.div style={reduce ? undefined : { y }}>
        {Array.from({ length: reduce ? 1 : copies }, (_, copy) => (
          <div
            aria-hidden={copy > 0 || undefined}
            className="flex flex-col gap-4 pb-4"
            key={copy}
            ref={copy === 0 ? copyRef : undefined}
          >
            {items.map((item) => (
              <QuoteCard item={item} key={item.name} />
            ))}
          </div>
        ))}
      </motion.div>
    </div>
  );
}

export function QuoteWall({
  quotes,
  eyebrow = "Wall of love",
  title = "People keep telling us nice things",
  rating,
  speed = 28,
  className,
}: QuoteWallProps) {
  const reduce = useSafeReducedMotion();
  const wallRef = useRef<HTMLDivElement>(null);
  const hovered = useRef(false);
  const [paused, setPaused] = useState(false);
  const [columnCount, setColumnCount] = useState(3);

  useEffect(() => {
    const wall = wallRef.current;
    if (!wall) return;
    const observer = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      setColumnCount(w < 560 ? 1 : w < 860 ? 2 : 3);
    });
    observer.observe(wall);
    return () => observer.disconnect();
  }, []);

  const columns = Array.from({ length: columnCount }, (_, c) => quotes.filter((_, i) => i % columnCount === c));

  return (
    <section className={cn("mx-auto w-full max-w-[1100px]", className)}>
      <header className="relative mx-auto mb-10 flex flex-col items-center px-10 text-center">
        {eyebrow && <p className="font-medium text-muted-foreground text-xs uppercase tracking-widest">{eyebrow}</p>}
        <h2 className="mt-2 max-w-xl text-balance font-semibold text-3xl tracking-tight">{title}</h2>
        {rating && (
          <div className="mt-4 flex items-center gap-2 text-sm">
            <span aria-hidden className="flex gap-0.5 text-warning">
              {Array.from({ length: 5 }, (_, i) => (
                <StarIcon className="size-4" fill="currentColor" key={i} strokeWidth={0} />
              ))}
            </span>
            <span className="font-medium tabular-nums">{rating.score.toFixed(1)}</span>
            <span className="text-muted-foreground">from {rating.count} reviews</span>
          </div>
        )}
        {!reduce && (
          <button
            aria-label={paused ? "Resume scrolling quotes" : "Pause scrolling quotes"}
            aria-pressed={paused}
            className="absolute -top-2 end-0 inline-flex size-8 cursor-pointer items-center justify-center rounded-full text-muted-foreground/72 outline-none transition-[color,background-color,transform] duration-150 ease-out hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]"
            onClick={() => setPaused((p) => !p)}
            type="button"
          >
            {paused ? <PlayIcon className="size-3.5 translate-x-px" /> : <PauseIcon className="size-3.5" />}
          </button>
        )}
      </header>
      <div
        className="grid h-[560px] gap-4 [mask-image:linear-gradient(to_bottom,transparent,black_14%,black_86%,transparent)]"
        onPointerEnter={(e) => {
          if (e.pointerType === "mouse") hovered.current = true;
        }}
        onPointerLeave={() => {
          hovered.current = false;
        }}
        ref={wallRef}
        style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}
      >
        {columns.map((items, c) => (
          <ScrollColumn
            hovered={hovered}
            items={items}
            key={`${columnCount}-${c}`}
            offset={c * 0.37}
            paused={paused}
            reverse={c % 2 === 1}
            speed={speed * (1 + (c % 3) * 0.12)}
          />
        ))}
      </div>
    </section>
  );
}
