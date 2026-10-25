"use client";

import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform, useVelocity } from "motion/react";
import { type ReactNode, useEffect, useId, useState } from "react";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: { w: 34, h: 20, pad: 2, blur: 3 },
  default: { w: 44, h: 26, pad: 3, blur: 3.5 },
  lg: { w: 58, h: 34, pad: 3, blur: 4.5 },
} as const;

const TONES = {
  primary: "data-checked:bg-primary",
  success: "data-checked:bg-success",
  info: "data-checked:bg-info",
  destructive: "data-checked:bg-destructive",
} as const;

export interface LiquidSwitchProps
  extends Omit<SwitchPrimitive.Root.Props, "children" | "checked" | "defaultChecked" | "onCheckedChange"> {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  size?: keyof typeof SIZES;
  tone?: keyof typeof TONES;
  label?: ReactNode;
  description?: ReactNode;
}

export function LiquidSwitch({
  checked: checkedProp,
  defaultChecked = false,
  onCheckedChange,
  size = "default",
  tone = "primary",
  label,
  description,
  className,
  disabled,
  ...props
}: LiquidSwitchProps) {
  const [inner, setInner] = useState(defaultChecked);
  const checked = checkedProp ?? inner;
  const reduce = useReducedMotion();
  const filterId = `liquid-switch-${useId().replace(/:/g, "")}`;
  const descriptionId = useId();
  const { w, h, pad, blur } = SIZES[size];
  const thumb = h - pad * 2;
  const travel = w - h;

  const target = useMotionValue(checked ? travel : 0);
  const x = useSpring(target, { stiffness: 560, damping: 34, mass: 0.9 });
  const trailA = useSpring(target, { stiffness: 300, damping: 26 });
  const trailB = useSpring(target, { stiffness: 170, damping: 20 });
  const velocity = useVelocity(x);
  const scaleX = useTransform(velocity, [-1400, 0, 1400], [1.3, 1, 1.3], { clamp: true });
  const scaleY = useTransform(velocity, [-1400, 0, 1400], [0.86, 1, 0.86], { clamp: true });

  useEffect(() => {
    const next = checked ? travel : 0;
    if (reduce) {
      for (const value of [target, x, trailA, trailB]) value.jump(next);
    } else {
      target.set(next);
    }
  }, [checked, travel, reduce, target, x, trailA, trailB]);

  const setChecked = (next: boolean) => {
    if (checkedProp === undefined) setInner(next);
    onCheckedChange?.(next);
  };

  const blob = cn(
    "absolute top-1/2 left-0 rounded-full bg-white transition-colors duration-150",
    tone === "primary" && "group-data-checked/switch:bg-primary-foreground",
  );

  const control = (
    <SwitchPrimitive.Root
      aria-describedby={description ? descriptionId : undefined}
      checked={checked}
      className={cn(
        "group/switch relative isolate inline-flex shrink-0 cursor-pointer rounded-full bg-input outline-none after:absolute after:-inset-x-1 after:-inset-y-2 transition-[background-color,box-shadow] duration-150 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background data-disabled:cursor-not-allowed data-disabled:opacity-64",
        TONES[tone],
        !label && className,
      )}
      disabled={disabled}
      onCheckedChange={setChecked}
      style={{ width: w, height: h }}
      {...props}
    >
      <svg aria-hidden className="absolute size-0">
        <filter colorInterpolationFilters="sRGB" height="300%" id={filterId} width="300%" x="-100%" y="-100%">
          <feGaussianBlur in="SourceGraphic" result="blur" stdDeviation={blur} />
          <feColorMatrix in="blur" result="goo" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -8" />
          <feComposite in="SourceGraphic" in2="goo" operator="atop" />
        </filter>
      </svg>
      <span aria-hidden className="pointer-events-none absolute inset-0 drop-shadow-sm">
        <span className="absolute inset-y-0" style={{ left: pad, right: pad, filter: `url(#${filterId})` }}>
        <motion.span
          className={blob}
          style={{ x: trailB, width: thumb * 0.6, height: thumb * 0.6, marginLeft: thumb * 0.2, marginTop: -thumb * 0.3 }}
        />
        <motion.span
          className={blob}
          style={{ x: trailA, width: thumb * 0.84, height: thumb * 0.84, marginLeft: thumb * 0.08, marginTop: -thumb * 0.42 }}
        />
        <motion.span
          className={cn(blob, "origin-center")}
          style={{ x, scaleX, scaleY, width: thumb, height: thumb, marginTop: -thumb / 2 }}
        >
          <span className="absolute inset-0 rounded-full bg-inherit transition-[scale] duration-200 group-active/switch:scale-x-[1.18] group-active/switch:scale-y-90" />
        </motion.span>
        </span>
      </span>
    </SwitchPrimitive.Root>
  );

  if (!label) return control;

  return (
    <label
      className={cn(
        "flex cursor-pointer items-start justify-between gap-4 has-data-disabled:cursor-not-allowed has-data-disabled:opacity-64",
        className,
      )}
    >
      <span className="grid gap-0.5">
        <span className="font-medium text-sm">{label}</span>
        {description && (
          <span className="text-muted-foreground text-xs" id={descriptionId}>
            {description}
          </span>
        )}
      </span>
      {control}
    </label>
  );
}
