"use client";

import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { type ComponentProps, type FocusEvent, type PointerEvent, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

function useReduce() {
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && !!reduce;
}

export const liquidTarget = { "data-liquid-target": "" } as const;

const HEAD = 22;
const TAIL = [
  { size: 19, rate: 30, gap: 9 },
  { size: 16, rate: 26, gap: 8 },
  { size: 13, rate: 22, gap: 7 },
  { size: 10, rate: 18, gap: 6 },
];
const headSpring = { stiffness: 520, damping: 38, mass: 0.7 };

export interface LiquidCursorProps extends ComponentProps<"div"> {
  goo?: number;
}

export function LiquidCursor({ goo = 6, className, children, ...props }: LiquidCursorProps) {
  const filterId = `liquid-cursor-${useId().replace(/:/g, "")}`;
  const reduce = useReduce();
  const ref = useRef<HTMLDivElement>(null);
  const tailRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const activeEl = useRef<HTMLElement | null>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const tail = useRef(TAIL.map(() => ({ x: 0, y: 0 })));
  const raf = useRef(0);
  const [visible, setVisibleState] = useState(false);
  const [mouse, setMouseState] = useState(false);
  const live = useRef({ visible: false, mouse: false });
  const setVisible = (v: boolean) => {
    live.current.visible = v;
    setVisibleState(v);
  };
  const setMouse = (v: boolean) => {
    live.current.mouse = v;
    setMouseState(v);
  };

  const tx = useMotionValue(0);
  const ty = useMotionValue(0);
  const tw = useMotionValue(HEAD);
  const th = useMotionValue(HEAD);
  const tr = useMotionValue(HEAD / 2);
  const press = useMotionValue(1);
  const cx = useSpring(tx, headSpring);
  const cy = useSpring(ty, headSpring);
  const w = useSpring(tw, headSpring);
  const h = useSpring(th, headSpring);
  const r = useSpring(tr, headSpring);
  const scale = useSpring(press, { stiffness: 700, damping: 30 });
  const left = useTransform(() => cx.get() - w.get() / 2);
  const top = useTransform(() => cy.get() - h.get() / 2);

  const paint = () => {
    tail.current.forEach((p, i) => {
      const el = tailRefs.current[i];
      if (el) el.style.transform = `translate(${p.x}px, ${p.y}px)`;
    });
  };

  const run = () => {
    if (raf.current) return;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      let moving = false;
      let lead = { x: cx.get(), y: cy.get() };
      tail.current.forEach((p, i) => {
        const { rate, gap } = TAIL[i];
        const k = 1 - Math.exp(-rate * dt);
        p.x += (lead.x - p.x) * k;
        p.y += (lead.y - p.y) * k;
        const dx = p.x - lead.x;
        const dy = p.y - lead.y;
        const d = Math.hypot(dx, dy);
        if (d > gap) {
          p.x = lead.x + (dx / d) * gap;
          p.y = lead.y + (dy / d) * gap;
        }
        if (d > 0.1) moving = true;
        lead = p;
      });
      paint();
      raf.current = moving ? requestAnimationFrame(tick) : 0;
    };
    raf.current = requestAnimationFrame(tick);
  };

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const setActive = (el: HTMLElement | null) => {
    if (activeEl.current === el) return;
    activeEl.current?.removeAttribute("data-liquid-active");
    el?.setAttribute("data-liquid-active", "");
    activeEl.current = el;
  };

  useEffect(() => () => setActive(null), []);

  const local = (x: number, y: number) => {
    const a = ref.current?.getBoundingClientRect();
    return a ? { x: x - a.left, y: y - a.top } : { x: 0, y: 0 };
  };

  const shapeTo = (el: HTMLElement | null) => {
    if (el) {
      const b = el.getBoundingClientRect();
      const c = local(b.left + b.width / 2, b.top + b.height / 2);
      tx.set(c.x);
      ty.set(c.y);
      tw.set(b.width);
      th.set(b.height);
      tr.set(Math.min(Number.parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0, b.height / 2));
    } else {
      tx.set(pointer.current.x);
      ty.set(pointer.current.y);
      tw.set(HEAD);
      th.set(HEAD);
      tr.set(HEAD / 2);
    }
    setActive(el);
  };

  const placeAll = (x: number, y: number) => {
    pointer.current = { x, y };
    for (const p of tail.current) Object.assign(p, { x, y });
    paint();
    tx.jump(x);
    ty.jump(y);
    cx.jump(x);
    cy.jump(y);
  };

  const targetOf = (node: EventTarget | null) => {
    const el = node instanceof Element ? node.closest<HTMLElement>("[data-liquid-target]") : null;
    return el && ref.current?.contains(el) ? el : null;
  };

  const enter = (event: PointerEvent<HTMLDivElement>) => {
    props.onPointerEnter?.(event);
    if (reduce || event.pointerType !== "mouse") return;
    const p = local(event.clientX, event.clientY);
    placeAll(p.x, p.y);
    setMouse(true);
    setVisible(true);
  };

  const move = (event: PointerEvent<HTMLDivElement>) => {
    props.onPointerMove?.(event);
    if (reduce || event.pointerType !== "mouse") return;
    pointer.current = local(event.clientX, event.clientY);
    shapeTo(targetOf(event.target));
    run();
  };

  const leave = (event: PointerEvent<HTMLDivElement>) => {
    props.onPointerLeave?.(event);
    setMouse(false);
    setVisible(false);
    setActive(null);
  };

  const focus = (event: FocusEvent<HTMLDivElement>) => {
    props.onFocus?.(event);
    const el = targetOf(event.target);
    if (reduce || live.current.mouse || !el || !el.matches(":focus-visible")) return;
    const b = el.getBoundingClientRect();
    const c = local(b.left + b.width / 2, b.top + b.height / 2);
    if (live.current.visible) pointer.current = c;
    else placeAll(c.x, c.y);
    shapeTo(el);
    run();
    setVisible(true);
  };

  const blur = (event: FocusEvent<HTMLDivElement>) => {
    props.onBlur?.(event);
    if (live.current.mouse || ref.current?.contains(event.relatedTarget as Node | null)) return;
    setVisible(false);
    setActive(null);
  };

  return (
    <div
      {...props}
      className={cn("relative isolate", mouse && !reduce && "cursor-none [&_*]:cursor-none", className)}
      onBlur={blur}
      onFocus={focus}
      onPointerDown={(e) => {
        props.onPointerDown?.(e);
        if (e.pointerType === "mouse") press.set(0.92);
      }}
      onPointerEnter={enter}
      onPointerLeave={leave}
      onPointerMove={move}
      onPointerUp={(e) => {
        props.onPointerUp?.(e);
        press.set(1);
      }}
      ref={ref}
    >
      {!reduce && (
        <motion.div
          animate={{ opacity: visible ? 1 : 0 }}
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit]"
          initial={false}
          transition={{ duration: visible ? 0.12 : 0.2, ease: "easeOut" }}
        >
          <svg className="absolute size-0">
            <filter colorInterpolationFilters="sRGB" height="100%" id={filterId} width="100%" x="0" y="0">
              <feGaussianBlur in="SourceGraphic" result="blur" stdDeviation={goo} />
              <feColorMatrix in="blur" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9" />
            </filter>
          </svg>
          <div className="absolute inset-0" style={{ filter: `url(#${filterId})` }}>
            {TAIL.map((t, i) => (
              <span
                className="absolute top-0 left-0 rounded-full bg-brand"
                key={t.size}
                ref={(el) => {
                  tailRefs.current[i] = el;
                }}
                style={{ width: t.size, height: t.size, marginLeft: -t.size / 2, marginTop: -t.size / 2 }}
              />
            ))}
            <motion.span
              className="absolute top-0 left-0 bg-brand"
              style={{ x: left, y: top, width: w, height: h, borderRadius: r, scale }}
            />
          </div>
        </motion.div>
      )}
      {children}
    </div>
  );
}
