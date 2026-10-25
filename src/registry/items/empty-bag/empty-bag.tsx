"use client";

import { PlusIcon } from "lucide-react";
import { animate, motion, useInView, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type EmptyBagHue = "sky" | "emerald" | "amber" | "violet" | "rose" | "orange" | "indigo" | "teal";

const hues: Record<EmptyBagHue, string> = {
  sky: "[--hue-hi:var(--color-sky-300)] [--hue:var(--color-sky-500)] [--hue-deep:var(--color-sky-700)]",
  emerald: "[--hue-hi:var(--color-emerald-300)] [--hue:var(--color-emerald-500)] [--hue-deep:var(--color-emerald-700)]",
  amber: "[--hue-hi:var(--color-amber-300)] [--hue:var(--color-amber-500)] [--hue-deep:var(--color-amber-700)]",
  violet: "[--hue-hi:var(--color-violet-300)] [--hue:var(--color-violet-500)] [--hue-deep:var(--color-violet-700)]",
  rose: "[--hue-hi:var(--color-rose-300)] [--hue:var(--color-rose-500)] [--hue-deep:var(--color-rose-700)]",
  orange: "[--hue-hi:var(--color-orange-300)] [--hue:var(--color-orange-500)] [--hue-deep:var(--color-orange-700)]",
  indigo: "[--hue-hi:var(--color-indigo-300)] [--hue:var(--color-indigo-500)] [--hue-deep:var(--color-indigo-700)]",
  teal: "[--hue-hi:var(--color-teal-300)] [--hue:var(--color-teal-500)] [--hue-deep:var(--color-teal-700)]",
};

export interface EmptyBagProps {
  count?: number;
  onAdd?: () => void;
  title?: string;
  description?: string;
  filledTitle?: string;
  filledDescription?: string;
  actionLabel?: string;
  price?: string;
  hue?: EmptyBagHue;
  className?: string;
}

const W = 400;
const H = 175;
const TOP = 30;
const FLOOR = 196;
const TAG_X = 236;

type Pt = [number, number];

const lerp = (a: number, b: number, f: number) => a + (b - a) * f;
const mix = (a: Pt, b: Pt, f: number): Pt => [lerp(a[0], b[0], f), lerp(a[1], b[1], f)];
const pt = (p: Pt, dy = 0) => `${p[0].toFixed(2)} ${(p[1] + dy).toFixed(2)}`;

function topEdge(f: number) {
  return {
    tl: mix([146, 90], [142, 78], f),
    c1: mix([170, 104], [171, 78], f),
    m: mix([199, 95], [200, 78], f),
    c2: mix([226, 86], [229, 78], f),
    tr: mix([254, 92], [258, 78], f),
  };
}

function frontPath(f: number) {
  const { tl, c1, m, c2, tr } = topEdge(f);
  const sideR: Pt = [lerp(248, 261, f), 136];
  const sideL: Pt = [lerp(152, 139, f), 136];
  return `M${pt(tl)} Q${pt(c1)} ${pt(m)} Q${pt(c2)} ${pt(tr)} Q${pt(sideR)} 264 ${FLOOR - 7} Q264 ${FLOOR} 257 ${FLOOR} L143 ${FLOOR} Q136 ${FLOOR} 136 ${FLOOR - 7} Q${pt(sideL)} ${pt(tl)} Z`;
}

function rimPath(f: number) {
  const { tl, c1, m, c2, tr } = topEdge(f);
  return `M${pt(tl)} Q${pt(c1)} ${pt(m)} Q${pt(c2)} ${pt(tr)} L${pt(tr, 12)} Q${pt(c2, 12)} ${pt(m, 12)} Q${pt(c1, 12)} ${pt(tl, 12)} Z`;
}

function backPath(f: number) {
  const l = mix([150, 100], [143, 79], f);
  const m = mix([200, 104], [200, 62], f);
  const r = mix([250, 98], [257, 79], f);
  return `M${pt(l)} Q${pt(m)} ${pt(r)} L${r[0]} 150 L${l[0]} 150 Z`;
}

function anchors(f: number) {
  const { tl, m, tr } = topEdge(f);
  return { a: [176, lerp(tl[1], m[1], 0.6) + 15] as Pt, b: [224, lerp(m[1], tr[1], 0.4) + 15] as Pt };
}

function frontHandle(f: number) {
  const { a, b } = anchors(f);
  const lift = lerp(-34, -58, f);
  const lean = lerp(-34, 0, f);
  return `M${pt(a)} C${a[0] - 2 + lean} ${a[1] + lift} ${b[0] + 2 + lean} ${b[1] + lift} ${pt(b)}`;
}

function backHandle(f: number) {
  const y = lerp(106, 74, f);
  const lift = lerp(-24, -66, f);
  const lean = lerp(24, 0, f);
  return `M182 ${y} C${180 + lean} ${y + lift} ${220 + lean} ${y + lift} 218 ${y}`;
}

function useCalmMotion() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && !!prefers;
}

export function EmptyBag({
  count: countProp,
  onAdd,
  title = "Your bag is empty",
  description = "Nothing in here yet. Find something you love and it'll wait for you.",
  filledTitle,
  filledDescription = "Held for 48 hours. Shipping is free over $50 and returns are on us.",
  actionLabel = "Add to bag",
  price = "$48",
  hue = "violet",
  className,
}: EmptyBagProps) {
  const uid = useId().replace(/:/g, "");
  const reduce = useCalmMotion();
  const root = useRef<HTMLDivElement>(null);
  const inView = useInView(root);
  const [own, setOwn] = useState(0);
  const count = countProp ?? own;
  const full = count > 0;
  const [peek, setPeek] = useState(false);
  const first = useRef(true);

  const fill = useMotionValue(full ? 1 : 0);
  const breath = useMotionValue(0);
  const f = useTransform(() => fill.get() + breath.get());
  const front = useTransform(f, frontPath);
  const rim = useTransform(f, rimPath);
  const back = useTransform(f, backPath);
  const handleFront = useTransform(f, frontHandle);
  const handleBack = useTransform(f, backHandle);
  const grommetA = useTransform(f, (v) => anchors(v).a);
  const grommetB = useTransform(f, (v) => anchors(v).b);
  const ax = useTransform(grommetA, (p) => p[0]);
  const ay = useTransform(grommetA, (p) => p[1]);
  const bx = useTransform(grommetB, (p) => p[0]);
  const by = useTransform(grommetB, (p) => p[1]);
  const shadow = useTransform(f, (v) => lerp(58, 74, Math.min(1, Math.max(0, v))));

  useEffect(() => {
    if (first.current || reduce) {
      fill.set(full ? 1 : 0);
      first.current = false;
      return;
    }
    const c = full
      ? animate(fill, 1, { type: "spring", stiffness: 360, damping: 14, mass: 0.8, delay: 0.3 })
      : animate(fill, 0, { type: "spring", stiffness: 90, damping: 18 });
    return () => c.stop();
  }, [full, reduce, fill]);

  const sighing = !full && !peek && inView && !reduce;
  useEffect(() => {
    if (!sighing) {
      const c = animate(breath, 0, { duration: 0.3, ease: "easeOut" });
      return () => c.stop();
    }
    const c = animate(breath, [0, 0.14, -0.05, 0], {
      delay: 1.2,
      duration: 2.4,
      ease: "easeInOut",
      repeat: Number.POSITIVE_INFINITY,
      repeatDelay: 2.6,
      times: [0, 0.4, 0.75, 1],
    });
    return () => c.stop();
  }, [sighing, breath]);

  const add = () => {
    if (countProp === undefined) setOwn((n) => n + 1);
    setPeek(false);
    onAdd?.();
  };

  const hover = (on: boolean) => setPeek(on && !full);
  const looking = peek && !full;
  const heading = filledTitle ?? `${count} ${count === 1 ? "item" : "items"} in your bag`;

  return (
    <div
      ref={root}
      className={cn("relative w-full max-w-[420px] overflow-hidden rounded-2xl border bg-card p-4 shadow-xs/5 sm:p-6", hues[hue], className)}
    >
      <div
        aria-hidden
        className="dot-grid pointer-events-none absolute inset-0 opacity-50 [mask-image:radial-gradient(closest-side,black,transparent)]"
      />

      <div
        aria-label={full ? `Shopping bag with ${count} ${count === 1 ? "item" : "items"}` : "An empty shopping bag, sagging"}
        className="relative mx-auto aspect-[400/175] w-full max-w-[380px]"
        onPointerEnter={(e) => e.pointerType === "mouse" && hover(true)}
        onPointerLeave={() => hover(false)}
        role="img"
      >
        <svg aria-hidden className="absolute inset-0 size-full overflow-visible" viewBox={`0 ${TOP} ${W} ${H}`}>
          <defs>
            <linearGradient id={`${uid}-bag`} x1="0" x2="1" y1="0" y2="0.3">
              <stop offset="0" stopColor="var(--hue-hi)" />
              <stop offset="0.35" stopColor="var(--hue)" />
              <stop offset="1" stopColor="var(--hue-deep)" />
            </linearGradient>
          </defs>

          <motion.ellipse className="fill-foreground/8" cx={200} cy={FLOOR + 2} rx={shadow} ry={5} />

          <motion.path className="fill-none stroke-(--hue-deep)" d={handleBack} strokeLinecap="round" strokeOpacity={0.8} strokeWidth={5} />
          <motion.path className="fill-(--hue-deep)" d={back} />

          <motion.g
            animate={looking ? { opacity: 1, y: 0, rotate: [0, -7, 5, -2, 0] } : { opacity: 0, y: -90, rotate: 0 }}
            initial={false}
            style={{ originX: `${TAG_X}px`, originY: "-60px", transformBox: "view-box" }}
            transition={
              reduce
                ? { duration: 0.15 }
                : looking
                  ? { y: { type: "spring", stiffness: 220, damping: 20 }, opacity: { duration: 0.15 }, rotate: { duration: 1.1, ease: "easeOut" } }
                  : { duration: 0.22, ease: [0.23, 1, 0.32, 1] }
            }
          >
            <path className="stroke-foreground/30" d={`M${TAG_X} -60 V64`} strokeWidth={1.2} />
            <g transform={`translate(${TAG_X} 64) rotate(8)`}>
              <path className="fill-card stroke-foreground/20" d="M-12 6 L0 -6 L12 6 V38 Q12 42 8 42 H-8 Q-12 42 -12 38 Z" strokeWidth={1.2} />
              <circle className="fill-none stroke-foreground/30" r={2.4} strokeWidth={1.2} />
              <text className="fill-foreground font-mono font-semibold" fontSize={8.5} textAnchor="middle" x={0} y={24}>
                {price}
              </text>
            </g>
          </motion.g>

          <motion.g
            animate={full ? { opacity: 1, y: 0 } : { opacity: 0, y: reduce ? 0 : -160 }}
            initial={false}
            transition={
              reduce
                ? { duration: 0.2 }
                : full
                  ? { y: { duration: 0.34, ease: [0.55, 0, 1, 0.45] }, opacity: { duration: 0.1 } }
                  : { duration: 0.2, ease: "easeOut" }
            }
          >
            <path className="fill-amber-300" d="M173 54 H187 Q200 68 213 54 H227 Q235 54 235 62 V124 H165 V62 Q165 54 173 54 Z" />
            <path className="fill-amber-400" d="M187 54 Q200 68 213 54 Q200 61 187 54 Z" />
            <g className="fill-white/45">
              <rect height={5} rx={2.5} width={70} x={165} y={78} />
              <rect height={5} rx={2.5} width={70} x={165} y={90} />
            </g>
            <g className="stroke-amber-700/25" strokeLinecap="round" strokeWidth={1.5}>
              <path d="M180 64 V120" />
              <path d="M220 64 V120" />
            </g>
          </motion.g>

          <motion.path d={front} fill={`url(#${uid}-bag)`} />
          <motion.path className="fill-white/15" d={rim} />
          <g className="stroke-black/8" strokeLinecap="round" strokeWidth={1.5}>
            <path d={`M158 118 L150 ${FLOOR - 4}`} />
            <path d={`M242 118 L250 ${FLOOR - 4}`} />
          </g>

          <motion.path className="fill-none stroke-(--hue-deep)" d={handleFront} strokeLinecap="round" strokeWidth={5} />
          <motion.circle className="fill-white/70" cx={ax} cy={ay} r={3} />
          <motion.circle className="fill-white/70" cx={bx} cy={by} r={3} />

          <g className="fill-none stroke-white" strokeLinecap="round" strokeWidth={3.5}>
            <motion.g animate={{ opacity: full ? 0 : 1 }} initial={false} transition={{ duration: 0.15 }}>
              <motion.g
                animate={looking ? { x: 3, y: -3 } : { x: 0, y: 0 }}
                initial={false}
                transition={{ type: "spring", stiffness: 300, damping: 24 }}
              >
                <circle className="fill-white stroke-none" cx={182} cy={150} r={4.5} />
                <circle className="fill-white stroke-none" cx={218} cy={150} r={4.5} />
              </motion.g>
              <motion.g animate={{ y: looking ? -4 : 0 }} initial={false} strokeWidth={3} transition={{ duration: 0.2, ease: "easeOut" }}>
                <path d="M172 140 L188 135" />
                <path d="M212 135 L228 140" />
              </motion.g>
              <motion.path animate={{ opacity: looking ? 0 : 1 }} d="M193 168 q7 -5 14 0" initial={false} transition={{ duration: 0.15 }} />
              <motion.circle animate={{ opacity: looking ? 1 : 0 }} cx={200} cy={167} initial={false} r={3} strokeWidth={2.5} transition={{ duration: 0.15 }} />
            </motion.g>
            <motion.g animate={{ opacity: full ? 1 : 0 }} initial={false} transition={{ duration: 0.15, delay: full ? 0.3 : 0 }}>
              <path d="M174 152 q8 -9 16 0" />
              <path d="M210 152 q8 -9 16 0" />
              <path className="fill-white" d="M190 162 q10 12 20 0 Z" strokeLinejoin="round" />
            </motion.g>
          </g>

          {sighing && (
            <motion.g
              animate={{ opacity: [0, 1, 0], x: [0, -6, -12], y: [0, -10, -20] }}
              className="fill-none stroke-foreground/30"
              strokeLinecap="round"
              strokeWidth={2.5}
              transition={{ delay: 2.1, duration: 1.3, ease: "easeOut", repeat: Number.POSITIVE_INFINITY, repeatDelay: 3.7 }}
            >
              <path d="M160 82 q-5 -6 0 -12" />
              <path d="M150 88 q-6 -8 0 -16" />
            </motion.g>
          )}

          <motion.g
            animate={full ? { opacity: 1, scale: 1 } : { opacity: 0, scale: reduce ? 1 : 0.6 }}
            initial={false}
            style={{ originX: "262px", originY: "80px", transformBox: "view-box" }}
            transition={reduce ? { duration: 0.15 } : full ? { type: "spring", stiffness: 500, damping: 22, delay: 0.42 } : { duration: 0.15 }}
          >
            <circle className="fill-foreground stroke-card" cx={262} cy={80} r={12} strokeWidth={3} />
            <text
              className="fill-background font-semibold tabular-nums"
              dominantBaseline="central"
              fontSize={11}
              textAnchor="middle"
              x={262}
              y={80.5}
            >
              {Math.min(count, 99)}
            </text>
          </motion.g>
        </svg>
      </div>

      <div className="relative mt-3 grid text-center [&>*]:col-start-1 [&>*]:row-start-1">
        {[
          { key: "empty", show: !full, t: title, d: description },
          { key: "full", show: full, t: heading, d: filledDescription },
        ].map((copy) => (
          <motion.div
            animate={{ opacity: copy.show ? 1 : 0, y: copy.show || reduce ? 0 : copy.key === "full" ? 4 : -4 }}
            aria-hidden={!copy.show}
            initial={false}
            key={copy.key}
            transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
          >
            <p aria-live={copy.key === "full" ? "polite" : undefined} className="text-balance font-medium text-foreground text-sm tabular-nums">
              {copy.t}
            </p>
            <p className="mx-auto mt-1 max-w-[34ch] text-pretty text-muted-foreground text-xs">{copy.d}</p>
          </motion.div>
        ))}
      </div>

      <div className="relative mt-4 flex justify-center">
        <Button
          className="transition-[box-shadow,transform] duration-150 ease-out active:scale-[0.97]"
          onBlur={() => hover(false)}
          onClick={add}
          onFocus={(e) => e.currentTarget.matches(":focus-visible") && hover(true)}
          onPointerEnter={(e) => e.pointerType === "mouse" && hover(true)}
          onPointerLeave={() => hover(false)}
          size="sm"
          variant="outline"
        >
          <PlusIcon aria-hidden />
          {actionLabel}
        </Button>
      </div>
    </div>
  );
}
