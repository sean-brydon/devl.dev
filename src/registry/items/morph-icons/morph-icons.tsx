"use client";

import { type MotionValue, motion, useReducedMotion, useSpring, useTransform } from "motion/react";
import { type ComponentProps, useEffect, useId } from "react";
import { cn } from "@/lib/utils";

export type MorphIconName = "menu" | "play" | "plus" | "theme";

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (t: number) => Math.min(Math.max(t, 0), 1);

type Seg = { x: number; y: number; a: number; l: number };

function segPath(from: Seg, to: Seg, t: number) {
  const x = lerp(from.x, to.x, t);
  const y = lerp(from.y, to.y, t);
  const a = (lerp(from.a, to.a, t) * Math.PI) / 180;
  const l = Math.max(lerp(from.l, to.l, t), 0) / 2;
  const dx = Math.cos(a) * l;
  const dy = Math.sin(a) * l;
  return `M${(x - dx).toFixed(2)} ${(y - dy).toFixed(2)}L${(x + dx).toFixed(2)} ${(y + dy).toFixed(2)}`;
}

type Pt = [number, number];
function polyPath(from: Pt[], to: Pt[], t: number) {
  return `${from.map((p, i) => `${i ? "L" : "M"}${lerp(p[0], to[i][0], t).toFixed(2)} ${lerp(p[1], to[i][1], t).toFixed(2)}`).join("")}Z`;
}

function SegPath({ p, start, end, opacity }: { p: MotionValue<number>; start: Seg; end: Seg; opacity?: MotionValue<number> }) {
  const d = useTransform(p, (t) => segPath(start, end, t));
  return <motion.path d={d} opacity={opacity} />;
}

function PolyPath({ p, from, to }: { p: MotionValue<number>; from: Pt[]; to: Pt[] }) {
  const d = useTransform(p, (t) => polyPath(from, to, t));
  return <motion.path d={d} />;
}

function MenuClose({ p }: { p: MotionValue<number> }) {
  const mid = useTransform(p, [0, 0.45], [1, 0]);
  return (
    <>
      <SegPath start={{ x: 12, y: 6, a: 0, l: 16 }} p={p} end={{ x: 12, y: 12, a: 45, l: 17 }} />
      <SegPath start={{ x: 12, y: 12, a: 0, l: 16 }} opacity={mid} p={p} end={{ x: 12, y: 12, a: 0, l: 4 }} />
      <SegPath start={{ x: 12, y: 18, a: 0, l: 16 }} p={p} end={{ x: 12, y: 12, a: -45, l: 17 }} />
    </>
  );
}

const PLAY: [Pt[], Pt[]] = [
  [
    [8.5, 5],
    [14, 8.5],
    [14, 15.5],
    [8.5, 19],
  ],
  [
    [14, 8.5],
    [19.5, 12],
    [19.5, 12],
    [14, 15.5],
  ],
];
const PAUSE: [Pt[], Pt[]] = [
  [
    [6.5, 5],
    [10, 5],
    [10, 19],
    [6.5, 19],
  ],
  [
    [14, 5],
    [17.5, 5],
    [17.5, 19],
    [14, 19],
  ],
];

function PlayPause({ p }: { p: MotionValue<number> }) {
  return (
    <g fill="currentColor" strokeWidth={1.5}>
      <PolyPath from={PLAY[0]} p={p} to={PAUSE[0]} />
      <PolyPath from={PLAY[1]} p={p} to={PAUSE[1]} />
    </g>
  );
}

function PlusCheck({ p }: { p: MotionValue<number> }) {
  return (
    <>
      <SegPath start={{ x: 12, y: 12, a: 0, l: 14 }} p={p} end={{ x: 7.25, y: 14.75, a: 45, l: 6.4 }} />
      <SegPath start={{ x: 12, y: 12, a: 90, l: 14 }} p={p} end={{ x: 14.25, y: 12, a: 133.5, l: 13.8 }} />
    </>
  );
}

const RAYS = Array.from({ length: 8 }, (_, i) => i * 45);

function SunMoon({ p }: { p: MotionValue<number> }) {
  const maskId = `morph-moon-${useId().replace(/:/g, "")}`;
  const t = useTransform(p, clamp01);
  const r = useTransform(p, (v) => lerp(4.5, 8, v));
  const mx = useTransform(t, (v) => lerp(26, 17, v));
  const my = useTransform(t, (v) => lerp(-2, 7, v));
  const spin = useTransform(p, (v) => v * 90);
  const rayOpacity = useTransform(t, [0, 0.6], [1, 0]);
  return (
    <>
      <mask id={maskId}>
        <rect fill="white" height="24" width="24" />
        <motion.circle cx={mx} cy={my} fill="black" r={7} />
      </mask>
      <motion.circle cx={12} cy={12} fill="currentColor" mask={`url(#${maskId})`} r={r} stroke="none" />
      <motion.g opacity={rayOpacity} style={{ rotate: spin }}>
        {RAYS.map((a) => (
          <SegPath
            start={{ x: 12 + Math.cos((a * Math.PI) / 180) * 8.75, y: 12 + Math.sin((a * Math.PI) / 180) * 8.75, a, l: 2.5 }}
            key={a}
            p={t}
            end={{ x: 12 + Math.cos((a * Math.PI) / 180) * 8, y: 12 + Math.sin((a * Math.PI) / 180) * 8, a, l: 0 }}
          />
        ))}
      </motion.g>
    </>
  );
}

const ICONS = { menu: MenuClose, play: PlayPause, plus: PlusCheck, theme: SunMoon };

export interface MorphIconProps extends Omit<ComponentProps<"svg">, "children"> {
  name: MorphIconName;
  morphed: boolean;
}

export function MorphIcon({ name, morphed, className, ...props }: MorphIconProps) {
  const reduce = useReducedMotion();
  const p = useSpring(morphed ? 1 : 0, { stiffness: 420, damping: 28, mass: 0.8 });

  useEffect(() => {
    if (reduce) p.jump(morphed ? 1 : 0);
    else p.set(morphed ? 1 : 0);
  }, [morphed, reduce, p]);

  const Icon = ICONS[name];
  return (
    <svg
      aria-hidden
      className={cn("size-6 shrink-0", className)}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      viewBox="0 0 24 24"
      {...props}
    >
      <Icon p={p} />
    </svg>
  );
}
