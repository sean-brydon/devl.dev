"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import { type ComponentProps, type ReactNode, useId, useRef } from "react";
import { cn } from "@/lib/utils";

export type DripLoaderVariant = "spin" | "drip" | "split";

export interface DripLoaderProps extends Omit<ComponentProps<"span">, "children"> {
  variant?: DripLoaderVariant;
  size?: number;
  speed?: number;
  label?: string;
}

const forever = Number.POSITIVE_INFINITY;

export function DripLoader({
  variant = "spin",
  size = 48,
  speed,
  label = "Loading",
  className,
  style,
  ...props
}: DripLoaderProps) {
  const filterId = `drip-loader-${useId().replace(/:/g, "")}`;
  const ref = useRef<HTMLSpanElement>(null);
  const onScreen = useInView(ref);
  const prefersReduced = !!useReducedMotion();
  const reduce = prefersReduced || !onScreen;
  const blur = Math.max(1.5, size / 22);

  let body: ReactNode;
  if (variant === "spin") body = <Spin duration={speed ?? 1.4} reduce={reduce} size={size} />;
  else if (variant === "drip") body = <Drip duration={speed ?? 1.7} reduce={reduce} size={size} />;
  else body = <Split duration={speed ?? 2.4} reduce={reduce} size={size} />;

  return (
    <span
      className={cn("relative inline-block shrink-0", className)}
      ref={ref}
      role="status"
      style={{ width: size, height: size, ...style }}
      {...props}
    >
      <span className="sr-only">{label}</span>
      <svg aria-hidden className="absolute size-0">
        <filter colorInterpolationFilters="sRGB" height="160%" id={filterId} width="160%" x="-30%" y="-30%">
          <feGaussianBlur in="SourceGraphic" result="blur" stdDeviation={blur} />
          <feColorMatrix in="blur" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" />
        </filter>
      </svg>
      <motion.span
        animate={prefersReduced && onScreen ? { opacity: [1, 0.45, 1] } : { opacity: 1 }}
        aria-hidden
        className="absolute inset-0"
        style={{ filter: `url(#${filterId})` }}
        transition={prefersReduced ? { duration: 1.8, ease: "easeInOut", repeat: forever } : { duration: 0 }}
      >
        {body}
      </motion.span>
    </span>
  );
}

interface PartProps {
  size: number;
  duration: number;
  reduce: boolean;
}

function Dot({ d, className, style, ...props }: { d: number } & ComponentProps<typeof motion.span>) {
  return (
    <motion.span
      className={cn("absolute top-1/2 left-1/2 rounded-full bg-current", className)}
      style={{ width: d, height: d, marginLeft: -d / 2, marginTop: -d / 2, ...style }}
      {...props}
    />
  );
}

const TRAIL = 8;
function Spin({ size, duration, reduce }: PartProps) {
  const reach = size * 0.3;
  return (
    <span className="absolute inset-0">
      {Array.from({ length: TRAIL }, (_, i) => (
        <motion.span
          animate={reduce ? undefined : { rotate: [0, 360] }}
          className="absolute inset-0"
          key={i}
          style={{ rotate: reduce ? -i * 9 : 0 }}
          transition={{ duration, ease: [0.5, 0, 0.5, 1], repeat: forever, delay: i * 0.04 }}
        >
          <Dot d={size * (0.26 - (i / (TRAIL - 1)) * 0.13)} style={{ y: -reach }} />
        </motion.span>
      ))}
    </span>
  );
}

function Drip({ size, duration, reduce }: PartProps) {
  const ledgeTop = size * 0.1;
  const ledgeH = size * 0.16;
  const poolH = size * 0.14;
  const poolTop = size - size * 0.1 - poolH;
  const drop = size * 0.24;
  const times = [0, 0.45, 0.62, 0.82, 1];
  return (
    <span className="absolute inset-0">
      <span className="absolute left-[18%] w-[64%] rounded-full bg-current" style={{ top: ledgeTop, height: ledgeH }} />
      <motion.span
        animate={reduce ? undefined : { scaleX: [1, 1, 1, 1.22, 1], scaleY: [1, 1, 1, 0.85, 1] }}
        className="absolute left-[24%] w-[52%] rounded-full bg-current"
        style={{ top: poolTop, height: poolH }}
        transition={{ duration, times, repeat: forever, ease: "easeOut" }}
      />
      <motion.span
        animate={
          reduce
            ? undefined
            : {
                y: [ledgeTop + ledgeH / 2 - drop / 2, ledgeTop + ledgeH * 0.9, ledgeTop + ledgeH * 1.4, poolTop + poolH / 2 - drop / 2, poolTop + poolH / 2 - drop / 2],
                scale: [0.35, 1, 0.9, 0.7, 0.35],
                scaleY: [1, 1.18, 1.1, 0.9, 1],
              }
        }
        className="absolute top-0 left-1/2 rounded-full bg-current"
        style={{
          width: drop,
          height: drop,
          marginLeft: -drop / 2,
          y: reduce ? ledgeTop + ledgeH * 0.9 : 0,
        }}
        transition={{ duration, times, repeat: forever, ease: ["easeInOut", "easeIn", "easeIn", "easeOut"] }}
      />
    </span>
  );
}

function Split({ size, duration, reduce }: PartProps) {
  const r = size * 0.32;
  const d = size * 0.26;
  const t = { duration, repeat: forever, ease: "easeInOut" as const, times: [0, 0.2, 0.3, 0.5, 0.7, 0.8, 1] };
  const parts: { key: string; x?: number[]; y?: number[] }[] = [
    { key: "left", x: [0, -r, -r, 0, 0, 0, 0] },
    { key: "right", x: [0, r, r, 0, 0, 0, 0] },
    { key: "up", y: [0, 0, 0, 0, -r, -r, 0] },
    { key: "down", y: [0, 0, 0, 0, r, r, 0] },
  ];
  return (
    <span className="absolute inset-0">
      <Dot animate={reduce ? undefined : { scale: [1.25, 0.9, 0.9, 1.25, 0.9, 0.9, 1.25] }} d={d} transition={t} />
      {parts.map(({ key, ...path }) => (
        <Dot animate={reduce ? undefined : path} d={d * 0.85} key={key} transition={t} />
      ))}
    </span>
  );
}
