"use client";

import { animate, type MotionValue, motion, useInView, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { type ComponentProps, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type HighlightColor = "yellow" | "pink" | "green" | "blue" | "orange";
export type HighlightTrigger = "view" | "hover" | "manual";

const inks: Record<HighlightColor, string> = {
  yellow: "text-yellow-300 dark:text-amber-300/35",
  pink: "text-pink-300 dark:text-pink-400/40",
  green: "text-lime-300 dark:text-lime-300/35",
  blue: "text-sky-300 dark:text-sky-400/40",
  orange: "text-orange-300 dark:text-orange-400/40",
};

type Stroke = { x: number; y: number; w: number; h: number; start: number; d: string; streak: string };

const TIP = 3;

function seeded(text: string) {
  let a = 2166136261;
  for (const c of text) a = Math.imul(a ^ c.charCodeAt(0), 16777619);
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round = (n: number) => Math.round(n * 10) / 10;

function edge(from: number, to: number, y: number, rand: () => number) {
  const steps = Math.max(2, Math.round(Math.abs(to - from) / 14));
  const points: string[] = [];
  for (let i = 1; i < steps; i++) points.push(`L${round(from + ((to - from) * i) / steps)} ${round(y + (rand() - 0.5) * 1.3)}`);
  return points.join(" ");
}

function shape(w: number, h: number, rand: () => number) {
  const top = 0.6 + rand() * 0.6;
  const bottom = h - 0.6 - rand() * 0.6;
  const d = [
    `M${TIP} ${round(top)}`,
    edge(TIP, w, top, rand),
    `L${round(w)} ${round(top + (rand() - 0.5))}`,
    `L${round(w - TIP)} ${round(bottom)}`,
    edge(w - TIP, 0, bottom, rand),
    `L0 ${round(bottom)}`,
    "Z",
  ].join(" ");
  const band = h * (0.62 + rand() * 0.12);
  const streak = `M${TIP + 4} ${round(band)} L${round(w - TIP - 6)} ${round(band + (rand() - 0.5) * 1.2)} L${round(w - TIP - 7)} ${round(band + 1.6)} L${TIP + 3} ${round(band + 1.4)} Z`;
  return { d, streak };
}

function useCalmMotion() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && !!prefers;
}

function Bar({ stroke, total, progress, ink, id }: { stroke: Stroke; total: number; progress: MotionValue<number>; ink: string; id: string }) {
  const clipPath = useTransform(progress, (p) => {
    const reach = Math.min(1, Math.max(0, (p * total - stroke.start) / stroke.w)) * (stroke.w + TIP);
    return `polygon(0px 0px, ${round(reach)}px 0px, ${round(reach - TIP)}px 100%, 0px 100%)`;
  });
  const fade = Math.min(0.45, 11 / stroke.w);

  return (
    <motion.svg
      aria-hidden
      className={cn("pointer-events-none absolute -z-10 overflow-visible", ink)}
      height={stroke.h}
      style={{ left: stroke.x, top: stroke.y, clipPath }}
      viewBox={`0 0 ${round(stroke.w)} ${round(stroke.h)}`}
      width={stroke.w}
    >
      <defs>
        <linearGradient gradientUnits="userSpaceOnUse" id={id} x1="0" x2={stroke.w} y1="0" y2="0">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.95" />
          <stop offset={fade} stopColor="currentColor" stopOpacity="0" />
          <stop offset={1 - fade} stopColor="currentColor" stopOpacity="0" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.95" />
        </linearGradient>
      </defs>
      <path d={stroke.d} fill="currentColor" fillOpacity={0.78} />
      <path d={stroke.streak} fill="currentColor" fillOpacity={0.35} />
      <path d={stroke.d} fill={`url(#${id})`} />
    </motion.svg>
  );
}

export interface HighlightProps extends ComponentProps<"span"> {
  color?: HighlightColor;
  trigger?: HighlightTrigger;
  active?: boolean;
  delay?: number;
  speed?: number;
}

export function Highlight({
  color = "yellow",
  trigger = "view",
  active = false,
  delay = 0,
  speed = 700,
  className,
  children,
  ...props
}: HighlightProps) {
  const id = `ink${useId().replace(/[^\w-]/g, "")}`;
  const ref = useRef<HTMLSpanElement>(null);
  const origin = useRef<HTMLSpanElement>(null);
  const reduce = useCalmMotion();
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const [hovered, setHovered] = useState(false);
  const [touchOnly, setTouchOnly] = useState(false);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const progress = useMotionValue(0);
  const total = strokes.reduce((sum, s) => sum + s.w, 0);

  useLayoutEffect(() => {
    const wrapper = ref.current;
    const probe = origin.current;
    if (!wrapper || !probe) return;
    let frame = 0;
    const measure = () => {
      const scale = wrapper.getBoundingClientRect().width / (wrapper.offsetWidth || 1) || 1;
      const zero = probe.getBoundingClientRect();
      const rand = seeded(wrapper.textContent ?? "");
      let start = 0;
      const next = [...wrapper.getClientRects()]
        .filter((r) => r.width > 1)
        .map((r) => {
          const w = r.width / scale + 6;
          const h = (r.height / scale) * 0.86;
          const stroke = {
            x: (r.left - zero.left) / scale - 3,
            y: (r.top - zero.top) / scale + (r.height / scale) * 0.09,
            w,
            h,
            start,
            ...shape(w, h, rand),
          };
          start += w;
          return stroke;
        });
      setStrokes(next);
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    measure();
    const observer = new ResizeObserver(schedule);
    observer.observe(wrapper.parentElement ?? wrapper);
    document.fonts?.ready.then(schedule);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const wrapper = ref.current;
    if (trigger !== "hover" || !wrapper) return;
    const media = window.matchMedia("(hover: none)");
    const sync = () => setTouchOnly(media.matches);
    sync();
    media.addEventListener("change", sync);
    const host = wrapper.closest<HTMLElement>("a, button, [tabindex]") ?? wrapper;
    const enter = (e: PointerEvent) => e.pointerType !== "touch" && setHovered(true);
    const leave = () => setHovered(false);
    const focus = () => host.matches(":focus-visible") && setHovered(true);
    host.addEventListener("pointerenter", enter);
    host.addEventListener("pointerleave", leave);
    host.addEventListener("focus", focus);
    host.addEventListener("blur", leave);
    return () => {
      media.removeEventListener("change", sync);
      host.removeEventListener("pointerenter", enter);
      host.removeEventListener("pointerleave", leave);
      host.removeEventListener("focus", focus);
      host.removeEventListener("blur", leave);
    };
  }, [trigger]);

  const on = trigger === "manual" ? active : trigger === "hover" ? hovered || (touchOnly && inView) : inView;

  useEffect(() => {
    if (!total) return;
    const target = on ? 1 : 0;
    if (reduce) {
      progress.jump(1);
      return;
    }
    const remaining = Math.abs(target - progress.get());
    if (remaining === 0) return;
    const full = Math.min(1.2, Math.max(0.25, total / speed));
    const controls = animate(progress, target, {
      duration: full * remaining * (on ? 1 : 0.6),
      delay: on ? delay : 0,
      ease: on ? [0.45, 0.05, 0.3, 1] : [0.23, 1, 0.32, 1],
    });
    return () => controls.stop();
  }, [on, total, reduce, delay, speed, progress]);

  return (
    <span className={cn("relative isolate", className)} ref={ref} {...props}>
      <span aria-hidden className="pointer-events-none absolute top-0 left-0 size-0" ref={origin} />
      <motion.span
        animate={{ opacity: reduce && !on ? 0 : 1 }}
        aria-hidden
        className="pointer-events-none absolute top-0 left-0 -z-10"
        initial={false}
        transition={{ duration: 0.2, delay: reduce && on ? delay * 0.3 : 0 }}
      >
        {strokes.map((stroke, i) => (
          <Bar id={`${id}-${i}`} ink={inks[color]} key={`${i}-${stroke.w}`} progress={progress} stroke={stroke} total={total} />
        ))}
      </motion.span>
      {children}
    </span>
  );
}
