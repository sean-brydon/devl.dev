"use client";

import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const TONES = {
  primary: "[--liquid:var(--color-primary)] [--liquid-ink:var(--color-primary-foreground)]",
  success: "[--liquid:var(--color-success)] [--liquid-ink:var(--color-white)]",
  info: "[--liquid:var(--color-info)] [--liquid-ink:var(--color-white)]",
} as const;

const SIZES = { sm: 16, default: 20, lg: 24 } as const;

function liquid(size: number, level: number, slosh: number, swing: number, offset: number) {
  const amp = size * 0.11 * Math.sin(Math.PI * Math.min(Math.max(slosh, 0), 1)) * swing;
  const top = -size * 0.15 + size * 1.3 * (1 - level);
  const phase = slosh * Math.PI * 2.2 + offset;
  const wavelength = size * 0.9;
  let d = `M -1 ${size + 1}`;
  for (let x = -1; x <= size + 1; x += size / 16) {
    d += ` L ${x.toFixed(2)} ${(top + amp * Math.sin((x / wavelength) * Math.PI * 2 + phase)).toFixed(2)}`;
  }
  return `${d} L ${size + 1} ${size + 1} Z`;
}

export interface LiquidCheckboxProps
  extends Omit<CheckboxPrimitive.Root.Props, "checked" | "defaultChecked" | "onCheckedChange" | "children" | "className"> {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  fill?: number;
  label?: ReactNode;
  description?: ReactNode;
  size?: keyof typeof SIZES;
  tone?: keyof typeof TONES;
  strike?: boolean;
  className?: string;
}

export function LiquidCheckbox({
  checked: checkedProp,
  defaultChecked = false,
  onCheckedChange,
  fill = 0,
  label,
  description,
  size = "default",
  tone = "primary",
  strike = false,
  disabled,
  className,
  ...props
}: LiquidCheckboxProps) {
  const [inner, setInner] = useState(defaultChecked);
  const checked = checkedProp ?? inner;
  const reduce = useReducedMotion();
  const s = SIZES[size];
  const clipId = `liquid-check-${useId().replace(/:/g, "")}`;
  const descriptionId = useId();
  const partial = !checked && fill > 0 && fill < 1;
  const target = checked ? 1 : Math.min(Math.max(fill, 0), 1);

  const level = useMotionValue(target);
  const slosh = useMotionValue(1);
  const swing = useRef(0);
  const front = useTransform(() => liquid(s, level.get(), slosh.get(), swing.current, 0));
  const back = useTransform(() => liquid(s, Math.min(level.get() + 0.07, 1), slosh.get(), swing.current * 0.8, Math.PI * 0.9));

  useEffect(() => {
    const from = level.get();
    if (from === target) return;
    if (reduce) {
      level.jump(target);
      return;
    }
    swing.current = Math.min(1, Math.abs(target - from) * 1.6);
    const transition = target > from ? { duration: 0.32, ease: [0.23, 1, 0.32, 1] as const } : { duration: 0.24, ease: [0.45, 0, 0.55, 1] as const };
    slosh.jump(0);
    const a = animate(level, target, transition);
    const b = animate(slosh, 1, transition);
    return () => {
      a.stop();
      b.stop();
    };
  }, [target, reduce, level, slosh]);

  const setChecked = (next: boolean) => {
    if (checkedProp === undefined) setInner(next);
    onCheckedChange?.(next);
  };

  const box = (
    <CheckboxPrimitive.Root
      aria-describedby={description ? descriptionId : undefined}
      checked={checked}
      className={cn(
        "group/check relative inline-flex shrink-0 cursor-pointer rounded-[calc(var(--box)*0.3)] border border-input bg-background not-dark:bg-clip-padding shadow-xs/5 outline-none transition-[scale,box-shadow] duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background after:absolute after:-inset-1.5 active:scale-[0.95] data-disabled:cursor-not-allowed data-disabled:opacity-64 dark:bg-input/32",
        TONES[tone],
        !label && className,
      )}
      disabled={disabled}
      indeterminate={partial}
      onCheckedChange={(next) => setChecked(next)}
      style={{ width: s, height: s, ["--box" as string]: `${s}px` }}
      {...props}
    >
      <svg aria-hidden className="absolute -inset-px overflow-visible" height={s} viewBox={`0 0 ${s} ${s}`} width={s}>
        <clipPath id={clipId}>
          <rect height={s} rx={s * 0.3} width={s} />
        </clipPath>
        <g clipPath={`url(#${clipId})`}>
          <motion.path d={back} fill="var(--liquid)" opacity={0.32} />
          <motion.path d={front} fill="var(--liquid)" />
        </g>
        <motion.path
          animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
          d={`M ${s * 0.27} ${s * 0.52} L ${s * 0.43} ${s * 0.68} L ${s * 0.74} ${s * 0.35}`}
          fill="none"
          initial={false}
          stroke="var(--liquid-ink)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={s * 0.1}
          transition={
            reduce
              ? { duration: 0 }
              : checked
                ? { pathLength: { delay: 0.08, duration: 0.18, ease: [0.23, 1, 0.32, 1] }, opacity: { delay: 0.08, duration: 0.01 } }
                : { pathLength: { duration: 0.1 }, opacity: { duration: 0.1 } }
          }
        />
      </svg>
    </CheckboxPrimitive.Root>
  );

  if (!label) return box;

  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 has-data-disabled:cursor-not-allowed has-data-disabled:opacity-64",
        className,
      )}
    >
      <span className="flex h-5 items-center">{box}</span>
      <span className="grid min-w-0 gap-0.5">
        <span
          className={cn(
            "text-pretty text-sm transition-colors duration-200",
            strike &&
              "w-fit bg-[linear-gradient(currentColor,currentColor)] bg-position-[0_58%] bg-no-repeat box-decoration-clone transition-[background-size,color] duration-200 ease-out",
            strike && (checked ? "bg-size-[100%_1px] text-muted-foreground" : "bg-size-[0%_1px]"),
          )}
        >
          {label}
        </span>
        {description && (
          <span className="text-muted-foreground text-xs" id={descriptionId}>
            {description}
          </span>
        )}
      </span>
    </label>
  );
}
