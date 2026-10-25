"use client";

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform, useVelocity } from "motion/react";
import { type ReactNode, useCallback, useId, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface DripTabItem {
  value: string;
  label: string;
  icon?: ReactNode;
  content: ReactNode;
}

export interface DripTabsProps {
  items: DripTabItem[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  "aria-label"?: string;
}

const leadSpring = { stiffness: 480, damping: 36, mass: 0.7 };
const trailSpring = { stiffness: 200, damping: 25, mass: 1 };
const DROP = 0.55;

export function DripTabs({
  items,
  value: valueProp,
  defaultValue,
  onValueChange,
  className,
  "aria-label": ariaLabel = "Sections",
}: DripTabsProps) {
  const filterId = `drip-tabs-${useId().replace(/:/g, "")}`;
  const reduce = useReducedMotion();
  const [internal, setInternal] = useState(defaultValue ?? items[0]?.value);
  const value = valueProp ?? internal;
  const listRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef(new Map<string, HTMLElement>());
  const ready = useRef(false);

  const targetY = useMotionValue(0);
  const targetH = useMotionValue(0);
  const leadY = useSpring(targetY, leadSpring);
  const leadH = useSpring(targetH, leadSpring);
  const trailY = useSpring(targetY, trailSpring);
  const trailH = useSpring(targetH, trailSpring);

  const leadV = useVelocity(leadY);
  const trailV = useVelocity(trailY);
  const leadThin = useTransform(leadV, (v) => 1 - Math.min(Math.abs(v) / 6000, 0.08));
  const trailThin = useTransform(trailV, (v) => 0.5 - Math.min(Math.abs(v) / 3000, 0.14));
  const dropY = useTransform(() => trailY.get() + (trailH.get() * (1 - DROP)) / 2);
  const dropH = useTransform(trailH, (h) => h * DROP);

  const place = useCallback(
    (instant: boolean) => {
      const el = value ? tabRefs.current.get(value) : undefined;
      if (!el) return;
      targetY.set(el.offsetTop);
      targetH.set(el.offsetHeight);
      if (instant) {
        for (const [mv, v] of [
          [leadY, el.offsetTop],
          [trailY, el.offsetTop],
          [leadH, el.offsetHeight],
          [trailH, el.offsetHeight],
        ] as const)
          mv.jump(v);
      }
    },
    [value, targetY, targetH, leadY, trailY, leadH, trailH],
  );

  useLayoutEffect(() => {
    place(!ready.current || !!reduce);
    ready.current = true;
  }, [place, reduce]);

  const placeRef = useRef(place);
  useLayoutEffect(() => {
    placeRef.current = place;
  }, [place]);
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    let size = `${list.offsetWidth}x${list.offsetHeight}`;
    const ro = new ResizeObserver(() => {
      const next = `${list.offsetWidth}x${list.offsetHeight}`;
      if (next === size) return;
      size = next;
      placeRef.current(true);
    });
    ro.observe(list);
    return () => ro.disconnect();
  }, []);

  const change = (next: string) => {
    if (valueProp === undefined) setInternal(next);
    onValueChange?.(next);
  };

  return (
    <TabsPrimitive.Root
      className={cn("@container/drip-tabs flex w-full overflow-hidden rounded-2xl border bg-card shadow-xs/5", className)}
      onValueChange={(v) => change(v as string)}
      orientation="vertical"
      value={value}
    >
      <TabsPrimitive.List
        aria-label={ariaLabel}
        className="relative isolate flex shrink-0 flex-col gap-0.5 border-r p-2"
        ref={listRef}
      >
        <svg aria-hidden className="absolute size-0">
          <filter colorInterpolationFilters="sRGB" height="140%" id={filterId} width="160%" x="-30%" y="-20%">
            <feGaussianBlur in="SourceGraphic" result="blur" stdDeviation="6" />
            <feColorMatrix in="blur" result="goo" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -8" />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </svg>
        {/* An opaque fill (never an alpha token) so the goo threshold leaves clean edges with no fringe. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 [--drip-fill:color-mix(in_srgb,var(--color-foreground)_7%,var(--color-card))] dark:[--drip-fill:color-mix(in_srgb,var(--color-foreground)_10%,var(--color-card))]"
          style={{ filter: `url(#${filterId})` }}
        >
          <motion.span
            className="absolute inset-x-2 top-0 rounded-full bg-(--drip-fill)"
            style={{ y: dropY, height: dropH, scaleX: trailThin }}
          />
          <motion.span
            className="absolute inset-x-2 top-0 rounded-lg bg-(--drip-fill)"
            style={{ y: leadY, height: leadH, scaleX: leadThin }}
          />
        </span>
        {items.map((item) => (
          <TabsPrimitive.Tab
            className={cn(
              "relative flex h-9 cursor-pointer select-none items-center gap-2 whitespace-nowrap rounded-lg px-2.5 font-medium text-muted-foreground text-sm outline-none transition-colors duration-200 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0",
              "data-active:text-foreground",
            )}
            key={item.value}
            ref={(el: HTMLElement | null) => {
              if (el) tabRefs.current.set(item.value, el);
              else tabRefs.current.delete(item.value);
            }}
            value={item.value}
          >
            {item.icon}
            <span className="sr-only @[26rem]/drip-tabs:not-sr-only">{item.label}</span>
          </TabsPrimitive.Tab>
        ))}
      </TabsPrimitive.List>
      {items.map((item) => (
        <TabsPrimitive.Panel className="min-w-0 flex-1 p-4 outline-none" key={item.value} value={item.value}>
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            initial={{ opacity: 0, y: 3 }}
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1], y: reduce ? { duration: 0 } : undefined }}
          >
            {item.content}
          </motion.div>
        </TabsPrimitive.Panel>
      ))}
    </TabsPrimitive.Root>
  );
}
