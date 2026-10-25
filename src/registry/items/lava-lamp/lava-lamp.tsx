"use client";

import { motion, useInView, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { type ComponentProps, type PointerEvent, useEffect, useId, useRef } from "react";
import { cn } from "@/lib/utils";

export interface LavaLampBlob {
  size: number;
  color: string;
  x: number[];
  y: number[];
  duration: number;
}

const palette = ["--color-violet-500", "--color-fuchsia-500", "--color-rose-500", "--color-orange-500", "--color-amber-400"];
const c = (n: number) => `var(${palette[n - 1]})`;

const defaultBlobs: LavaLampBlob[] = [
  { size: 34, color: c(2), x: [16, 40, 28, 10], y: [30, 58, 80, 52], duration: 19 },
  { size: 28, color: c(1), x: [82, 60, 72, 92], y: [24, 50, 78, 50], duration: 16 },
  { size: 20, color: c(3), x: [50, 66, 38, 30], y: [12, 38, 44, 18], duration: 13 },
  { size: 26, color: c(4), x: [36, 20, 54, 62], y: [88, 62, 52, 80], duration: 21 },
  { size: 17, color: c(5), x: [68, 86, 56, 46], y: [84, 64, 68, 92], duration: 11 },
  { size: 14, color: c(1), x: [90, 72, 94, 78], y: [10, 30, 40, 16], duration: 9 },
  { size: 13, color: c(3), x: [6, 24, 14, 30], y: [10, 20, 36, 12], duration: 12 },
];

export interface LavaLampProps extends ComponentProps<"div"> {
  blobs?: LavaLampBlob[];
  followPointer?: boolean;
  pointerColor?: string;
  goo?: number;
  intensity?: number;
}

const LEG = "cubic-bezier(0.37, 0, 0.63, 1)";

function Blob({ blob, running }: { blob: LavaLampBlob; running: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const anim = useRef<Animation | null>(null);
  const reduce = useReducedMotion();
  const { x, y, duration } = blob;
  const path = x.map((v, i) => `${v},${y[i] ?? y[0]}`).join(" ");

  useEffect(() => {
    const el = ref.current;
    if (!el || reduce) return;
    const points = path.split(" ").map((p) => p.split(",").map(Number));
    const frames = [...points, points[0]].map(([px, py]) => ({ transform: `translate(${px}%, ${py}%)`, easing: LEG }));
    anim.current = el.animate(frames, { duration: duration * 1000, iterations: Number.POSITIVE_INFINITY });
    return () => {
      anim.current?.cancel();
      anim.current = null;
    };
  }, [path, duration, reduce]);

  useEffect(() => {
    if (running) anim.current?.play();
    else anim.current?.pause();
  }, [running]);

  return (
    <div className="absolute inset-0" ref={ref} style={{ transform: `translate(${x[0]}%, ${y[0]}%)` }}>
      <div
        className="absolute top-0 left-0 aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ width: `${blob.size}%`, background: blob.color }}
      />
    </div>
  );
}

export function LavaLamp({
  blobs = defaultBlobs,
  followPointer = true,
  pointerColor = c(3),
  goo = 10,
  intensity = 0.85,
  className,
  children,
  onPointerMove,
  onPointerLeave,
  ...props
}: LavaLampProps) {
  const filterId = `lava-lamp-${useId().replace(/:/g, "")}`;
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref);
  const reduce = useReducedMotion();

  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const present = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 38, damping: 14, mass: 1.2 });
  const sy = useSpring(py, { stiffness: 38, damping: 14, mass: 1.2 });
  const swell = useSpring(present, { stiffness: 120, damping: 20 });
  const scale = useTransform(swell, [0, 1], [0.3, 1]);
  const opacity = useTransform(swell, [0, 0.25], [0, 1]);

  const handleMove = (e: PointerEvent<HTMLDivElement>) => {
    onPointerMove?.(e);
    if (!followPointer || reduce || e.pointerType === "touch") return;
    const r = e.currentTarget.getBoundingClientRect();
    if (present.get() === 0) {
      sx.jump(e.clientX - r.left);
      sy.jump(e.clientY - r.top);
    }
    px.set(e.clientX - r.left);
    py.set(e.clientY - r.top);
    present.set(1);
  };

  const handleLeave = (e: PointerEvent<HTMLDivElement>) => {
    onPointerLeave?.(e);
    present.set(0);
  };

  return (
    <div
      className={cn("relative isolate overflow-hidden", className)}
      onPointerLeave={handleLeave}
      onPointerMove={handleMove}
      ref={ref}
      {...props}
    >
      <svg aria-hidden className="absolute size-0">
        <filter colorInterpolationFilters="sRGB" height="140%" id={filterId} width="140%" x="-20%" y="-20%">
          <feGaussianBlur in="SourceGraphic" result="blur" stdDeviation={goo} />
          <feColorMatrix in="blur" result="goo" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9" />
          <feComposite in="SourceGraphic" in2="goo" operator="atop" />
        </filter>
      </svg>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{ filter: `url(#${filterId})`, opacity: intensity }}
      >
        {blobs.map((b, i) => (
          <Blob blob={b} key={i} running={inView} />
        ))}
        {followPointer && (
          <motion.div
            className="absolute top-0 left-0 -mt-[8%] -ml-[8%] aspect-square w-[16%] rounded-full"
            style={{ x: sx, y: sy, scale, opacity, background: pointerColor }}
          />
        )}
      </div>
      {children}
    </div>
  );
}
