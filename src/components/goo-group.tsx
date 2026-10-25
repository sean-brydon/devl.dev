"use client";

import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { type ReactNode, useId, useLayoutEffect, useRef, useState } from "react";
import { playGoo } from "@/lib/sound";
import { cn } from "@/lib/utils";

export interface GooGroupItem {
  value: string;
  label: ReactNode;
  href?: string;
  ariaLabel?: string;
}

interface GooGroupProps {
  items: GooGroupItem[];
  value: string | null;
  onValueChange?: (value: string) => void;
  size?: "sm" | "md";
  orientation?: "horizontal" | "vertical";
  label: string;
  className?: string;
  sound?: boolean;
}

/**
 * A segmented group whose selection is a liquid blob: two pills on different springs under an SVG goo
 * filter, so moving the selection stretches it toward the target and it pinches back into one.
 */
export function GooGroup({
  items,
  value,
  onValueChange,
  size = "md",
  orientation = "horizontal",
  label,
  className,
  sound = true,
}: GooGroupProps) {
  const filterId = `goo-${useId().replace(/:/g, "")}`;
  const listRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const reduce = useReducedMotion();
  const vertical = orientation === "vertical";

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const measure = () => {
      const el = list.querySelector<HTMLElement>(`[data-goo-value="${CSS.escape(value ?? "")}"]`);
      setRect(el ? { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight } : null);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    return () => observer.disconnect();
  }, [value]);

  const lead = reduce ? { duration: 0 } : { type: "spring" as const, stiffness: 520, damping: 34 };
  const trail = reduce ? { duration: 0 } : { type: "spring" as const, stiffness: 190, damping: 22 };
  const itemClass = cn(
    "relative z-10 inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full font-medium outline-none transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-ring [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0",
    size === "sm" ? "h-7 min-w-7 px-2 text-xs" : "h-8 min-w-8 px-3 text-sm",
    "text-muted-foreground hover:text-foreground data-[active=true]:text-background",
  );

  return (
    <div
      aria-label={label}
      className={cn(
        "relative isolate inline-flex rounded-full bg-muted p-1",
        vertical ? "flex-col gap-0.5" : "items-center gap-0.5",
        className,
      )}
      ref={listRef}
      role={onValueChange ? "radiogroup" : undefined}
    >
      <svg aria-hidden className="absolute size-0">
        <filter colorInterpolationFilters="sRGB" height="200%" id={filterId} width="200%" x="-50%" y="-50%">
          <feGaussianBlur in="SourceGraphic" result="blur" stdDeviation="4" />
          <feColorMatrix in="blur" result="goo" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -8" />
          <feComposite in="SourceGraphic" in2="goo" operator="atop" />
        </filter>
      </svg>
      {rect && (
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10" style={{ filter: `url(#${filterId})` }}>
          {[lead, trail].map((transition, i) => (
            <motion.span
              animate={{ x: rect.x, y: rect.y, width: rect.w, height: rect.h }}
              className="absolute top-0 left-0 rounded-full bg-foreground"
              initial={false}
              key={i}
              transition={transition}
            />
          ))}
        </div>
      )}
      {items.map((item, index) => {
        const active = item.value === value;
        const blip = () => {
          if (sound && !active) playGoo(index);
        };
        const shared = {
          "aria-label": item.ariaLabel,
          className: itemClass,
          "data-active": active,
          "data-goo-value": item.value,
        };
        return item.href ? (
          <Link {...shared} aria-current={active ? "page" : undefined} href={item.href} key={item.value} onClick={blip}>
            {item.label}
          </Link>
        ) : (
          <button
            {...shared}
            aria-checked={active}
            key={item.value}
            onClick={() => {
              blip();
              onValueChange?.(item.value);
            }}
            role="radio"
            type="button"
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
