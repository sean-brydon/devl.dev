"use client";

import { CheckIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export const confettiPalettes = {
  party: ["bg-rose-500", "bg-amber-400", "bg-emerald-500", "bg-sky-500", "bg-violet-500"],
  brand: ["bg-brand", "bg-brand-ink", "bg-foreground", "bg-emerald-500"],
  mono: ["bg-foreground", "bg-muted-foreground", "bg-neutral-400"],
} as const;

export type ConfettiPalette = keyof typeof confettiPalettes | string[];

const W = 760;
const H = 680;
const OY = 320;
const EDGE = 56;

type Shape = "rect" | "strip" | "dot";
interface Bit {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  spin: number;
  flip: number;
  flipSpeed: number;
  sway: number;
  w: number;
  h: number;
  shape: Shape;
  color: string;
  age: number;
  life: number;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

function makeBits(count: number, colors: string[], ox: number): Bit[] {
  return Array.from({ length: count }, () => {
    const angle = (-90 + rand(-52, 52)) * (Math.PI / 180);
    const speed = rand(480, 1050);
    const shape: Shape = Math.random() < 0.55 ? "rect" : Math.random() < 0.6 ? "strip" : "dot";
    return {
      x: ox + rand(-8, 8),
      y: OY + rand(-4, 4),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      rot: rand(0, Math.PI * 2),
      spin: rand(-11, 11),
      flip: rand(0, Math.PI * 2),
      flipSpeed: rand(7, 15),
      sway: rand(0, Math.PI * 2),
      w: shape === "rect" ? rand(7, 10) : shape === "strip" ? rand(3, 4) : rand(4.5, 6),
      h: shape === "rect" ? rand(4, 6) : shape === "strip" ? rand(10, 14) : 0,
      shape,
      color: colors[Math.floor(Math.random() * colors.length)],
      age: 0,
      life: rand(1.6, 2.4),
    };
  });
}

export interface UseConfettiOptions {
  palette?: ConfettiPalette;
  count?: number;
}

export function useConfetti({ palette = "party", count = 90 }: UseConfettiOptions = {}) {
  const reduce = useReducedMotion();
  const canvas = useRef<HTMLCanvasElement>(null);
  const swatches = useRef<HTMLSpanElement>(null);
  const bits = useRef<Bit[]>([]);
  const raf = useRef(0);
  const size = useRef({ w: W, ox: W / 2 });
  const [pops, setPops] = useState(0);
  const classes = typeof palette === "string" ? confettiPalettes[palette] : palette;

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  useEffect(() => {
    if (!pops) return;
    const t = setTimeout(() => setPops(0), 900);
    return () => clearTimeout(t);
  }, [pops]);

  const fire = useCallback(() => {
    if (reduce) {
      setPops((n) => n + 1);
      return;
    }
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) return;
    const colors = [...(swatches.current?.children ?? [])].map((s) => getComputedStyle(s).backgroundColor);
    const anchor = el.parentElement?.getBoundingClientRect();
    if (!anchor) return;
    const cx = anchor.left + anchor.width / 2;
    const left = Math.max(cx - W / 2, 0);
    const right = Math.min(cx + W / 2, document.documentElement.clientWidth);
    const cw = Math.max(right - left, 0);
    const ox = cx - left;
    const dpr = window.devicePixelRatio || 1;
    if (!raf.current) {
      el.style.width = `${cw}px`;
      el.style.transform = `translate(${-ox}px, ${-OY}px)`;
      el.style.display = "block";
      el.width = cw * dpr;
      el.height = H * dpr;
      size.current = { w: cw, ox };
    }
    bits.current.push(...makeBits(count, colors.length ? colors : ["currentColor"], size.current.ox));
    if (raf.current) return;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size.current.w, H);
      bits.current = bits.current.filter((b) => b.age < b.life);
      for (const b of bits.current) {
        b.age += dt;
        const drag = Math.exp(-2.3 * dt);
        b.vx *= drag;
        b.vy = b.vy * drag + 1100 * dt;
        b.sway += dt * 5;
        b.x += (b.vx + Math.sin(b.sway) * 26) * dt;
        b.y += b.vy * dt;
        b.rot += b.spin * dt;
        b.flip += b.flipSpeed * dt;
        const fade = Math.min(1, (b.life - b.age) / (b.life * 0.3));
        const edge = Math.min(b.x, size.current.w - b.x, b.y, H - b.y) / EDGE;
        ctx.globalAlpha = Math.max(Math.min(fade, edge, 1), 0);
        ctx.fillStyle = b.color;
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.rot);
        ctx.scale(1, Math.cos(b.flip));
        if (b.shape === "dot") {
          ctx.beginPath();
          ctx.arc(0, 0, b.w / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
        }
        ctx.restore();
      }
      if (bits.current.length) raf.current = requestAnimationFrame(tick);
      else {
        raf.current = 0;
        el.style.display = "none";
      }
    };
    raf.current = requestAnimationFrame(tick);
  }, [count, reduce]);

  const layer: ReactNode = (
    <>
      <span aria-hidden className="hidden" ref={swatches}>
        {classes.map((c) => (
          <span className={c} key={c} />
        ))}
      </span>
      <canvas
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 z-10 hidden"
        ref={canvas}
        style={{ height: H }}
      />
      <AnimatePresence>
        {pops > 0 && (
          <motion.span
            animate={{ opacity: 1, scale: 1 }}
            aria-hidden
            className={cn(
              "pointer-events-none absolute top-0 left-1/2 z-10 -mt-3 -ml-3 grid size-6 place-items-center rounded-full bg-success text-white shadow-xs/5",
            )}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            initial={{ opacity: 0, scale: 0.85 }}
            key={pops}
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
          >
            <CheckIcon className="size-3.5" strokeWidth={3} />
          </motion.span>
        )}
      </AnimatePresence>
    </>
  );

  return { fire, layer };
}

export interface ConfettiBurstProps extends UseConfettiOptions {
  children: ReactNode;
  className?: string;
}

export function ConfettiBurst({ children, className, ...options }: ConfettiBurstProps) {
  const { fire, layer } = useConfetti(options);
  return (
    <span className={cn("relative inline-flex", className)} onClickCapture={fire}>
      {children}
      {layer}
    </span>
  );
}
