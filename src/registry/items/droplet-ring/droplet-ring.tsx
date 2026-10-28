"use client";

import { motion, useReducedMotion } from "motion/react";
import { type ComponentType, type ReactNode, type SVGProps, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type DropletRingHue = "sky" | "rose" | "emerald" | "violet" | "amber" | "indigo" | "orange" | "teal";

const hueBg: Record<DropletRingHue, string> = {
  sky: "bg-sky-500",
  rose: "bg-rose-500",
  emerald: "bg-emerald-500",
  violet: "bg-violet-500",
  amber: "bg-amber-500",
  indigo: "bg-indigo-500",
  orange: "bg-orange-500",
  teal: "bg-teal-500",
};
const hueOrder = Object.keys(hueBg) as DropletRingHue[];

export interface DropletRingApp {
  name: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  hue?: DropletRingHue;
}

export interface DropletRingProps {
  apps: DropletRingApp[];
  mark?: ReactNode;
  label?: string;
  hold?: number;
  className?: string;
}

const launch = { type: "spring", stiffness: 170, damping: 15, mass: 0.9 } as const;
const gather = { type: "spring", stiffness: 210, damping: 26 } as const;
const STAGGER = 0.1;

function DefaultMark() {
  return (
    <svg aria-hidden className="size-10" fill="currentColor" viewBox="0 0 40 40">
      <path d="M20 5a15 15 0 1 0 15 15h-7.5A7.5 7.5 0 1 1 20 12.5V5Z" />
      <circle cx="29" cy="11" r="5" />
    </svg>
  );
}

function useStageSize() {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setSize({ w: el.offsetWidth, h: el.offsetHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

export function DropletRing({
  apps,
  mark,
  label = "Your product connected to its apps",
  hold = 5,
  className,
}: DropletRingProps) {
  const filterId = `droplet-ring-goo-${useId().replace(/:/g, "")}`;
  const reduce = useReducedMotion();
  const [stageRef, size] = useStageSize();
  const [out, setOut] = useState(false);
  const [round, setRound] = useState(0);

  useEffect(() => {
    if (reduce) {
      setOut(true);
      return;
    }
    let timer: ReturnType<typeof setTimeout>;
    const cycle = (next: boolean) => {
      setOut(next);
      if (next) setRound((r) => r + 1);
      if (!next) timer = setTimeout(() => cycle(true), 900);
      else if (hold > 0) timer = setTimeout(() => cycle(false), hold * 1000 + apps.length * STAGGER * 1000);
    };
    timer = setTimeout(() => cycle(true), 500);
    return () => clearTimeout(timer);
  }, [reduce, hold, apps.length]);

  const radius = Math.min(size.w, size.h) * 0.37;
  const disc = Math.round(Math.min(size.w, size.h) * 0.3);
  const drop = Math.round(disc * 0.4);
  const swell = disc / 2 - drop * 0.3;
  const ready = size.w > 0;
  const compact = size.w < 380;

    const motionFor = (i: number) => {
    if (reduce) return { duration: 0 };
    const delay = out ? i * STAGGER : (apps.length - i) * 0.05;
    return out ? { ...launch, delay } : { ...gather, delay };
  };

  const spots = apps.map((_, i) => {
    const a = -Math.PI / 2 + (i / apps.length) * Math.PI * 2;
    return { x: Math.cos(a) * radius, y: Math.sin(a) * radius };
  });

  return (
    <div
      className={cn(
        "relative w-full max-w-[480px] overflow-hidden rounded-2xl border bg-card p-4 shadow-xs/5 sm:p-6",
        className,
      )}
    >
      <div
        aria-hidden
        className="dot-grid pointer-events-none absolute inset-0 opacity-50 [mask-image:radial-gradient(closest-side,black,transparent)]"
      />
      <div aria-label={label} className="relative mx-auto aspect-[6/5] w-full max-w-[440px]" ref={stageRef} role="img">
        {ready && (
          <>
            <svg aria-hidden className="absolute inset-0 size-full overflow-visible text-foreground">
              <circle
                cx={size.w / 2}
                cy={size.h / 2}
                fill="none"
                r={radius}
                stroke="currentColor"
                strokeDasharray="3 7"
                strokeLinecap="round"
                strokeOpacity={0.14}
              />
              <circle
                cx={size.w / 2}
                cy={size.h / 2}
                fill="none"
                r={disc / 2 + 14}
                stroke="currentColor"
                strokeOpacity={0.08}
              />
            </svg>

            <div
              aria-hidden
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/12 blur-2xl"
              style={{ height: disc * 1.6, width: disc * 1.6 }}
            />

            {apps.map((app, i) => {
              const Icon = app.icon;
              const hue = app.hue ?? hueOrder[i % hueOrder.length];
              return (
                <motion.div
                  animate={
                    out
                      ? { x: spots[i].x, y: spots[i].y, scale: 1, rotate: 0 }
                      : { x: 0, y: 0, scale: 0.35, rotate: -20 }
                  }
                  className={cn("absolute top-1/2 left-1/2", compact ? "-mt-5 -ml-5" : "-mt-6 -ml-6")}
                  initial={false}
                  key={app.name}
                  title={app.name}
                  transition={motionFor(i)}
                >
                  <motion.div
                    animate={reduce || !out ? { y: 0 } : { y: [0, -3, 0, 2, 0] }}
                    className={cn(
                      "relative flex items-center justify-center text-white shadow-md shadow-black/10 inset-shadow-[0_1px_--theme(--color-white/24%)]",
                      compact ? "size-10 rounded-xl" : "size-12 rounded-xl",
                      hueBg[hue],
                    )}
                    transition={{
                      delay: 1.4 + i * 0.2,
                      duration: 4 + (i % 3) * 0.7,
                      ease: "easeInOut",
                      repeat: Number.POSITIVE_INFINITY,
                    }}
                  >
                    <span aria-hidden className="absolute inset-0 rounded-[inherit] bg-linear-to-b from-white/18 to-transparent" />
                    <Icon aria-hidden className={cn("relative drop-shadow-sm", compact ? "size-[18px]" : "size-[22px]")} />
                  </motion.div>
                </motion.div>
              );
            })}

            <svg aria-hidden className="absolute size-0">
              <filter colorInterpolationFilters="sRGB" height="140%" id={filterId} width="140%" x="-20%" y="-20%">
                <feGaussianBlur in="SourceGraphic" result="blur" stdDeviation="8" />
                <feColorMatrix in="blur" result="goo" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10" />
                <feComposite in="SourceGraphic" in2="goo" operator="atop" />
              </filter>
            </svg>
            <div aria-hidden className="absolute inset-0" style={{ filter: `url(#${filterId})` }}>
              <motion.div
                animate={round === 0 || reduce ? { scale: 1 } : out ? { scale: [1, 0.96, 1.02, 1] } : { scale: [1, 1.05, 0.98, 1] }}
                className="absolute top-1/2 left-1/2 rounded-full bg-primary"
                key={`disc-${round}-${out}`}
                style={{ height: disc, marginLeft: -disc / 2, marginTop: -disc / 2, width: disc }}
                transition={{ delay: out ? 0 : 0.4, duration: out ? 0.8 : 0.6, ease: "easeOut" }}
              />
              {spots.map((spot, i) => {
                const len = Math.hypot(spot.x, spot.y) || 1;
                const rim = { x: (spot.x / len) * swell, y: (spot.y / len) * swell };
                const still = round === 0 || reduce || !out;
                return (
                  <motion.div
                    animate={
                      still
                        ? { x: 0, y: 0, scale: 0.6 }
                        : { x: [0, rim.x, 0], y: [0, rim.y, 0], scale: [0.6, 1, 0.6] }
                    }
                    className="absolute top-1/2 left-1/2 rounded-full bg-primary"
                    initial={false}
                    key={`${apps[i].name}-${out}`}
                    style={{ height: drop, marginLeft: -drop / 2, marginTop: -drop / 2, width: drop }}
                    transition={
                      still
                        ? { duration: 0 }
                        : { delay: i * STAGGER, duration: 0.5, ease: ["easeOut", "easeInOut"], times: [0, 0.26, 1] }
                    }
                  />
                );
              })}
            </div>

            <div className="pointer-events-none absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center text-primary-foreground">
              {mark ?? <DefaultMark />}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
