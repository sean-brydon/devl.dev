"use client";

import { type LucideIcon, PlusIcon } from "lucide-react";
import {
  type AnimationPlaybackControls,
  animate,
  type MotionValue,
  motion,
  motionValue,
  useReducedMotion,
  type ValueAnimationTransition,
} from "motion/react";
import { type KeyboardEvent, type MouseEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import { Tooltip, TooltipPopup, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface LiquidFabAction {
  id: string;
  label: string;
  icon: LucideIcon;
  onSelect?: () => void;
}

export type LiquidFabDirection = "up" | "up-left" | "up-right";

export interface LiquidFabProps {
  actions: LiquidFabAction[];
  direction?: LiquidFabDirection;
  label?: string;
  size?: number;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

const ARCS: Record<LiquidFabDirection, [number, number]> = {
  up: [-150, -30],
  "up-left": [-90, -180],
  "up-right": [-90, 0],
};

const settle = [0.23, 1, 0.32, 1] as const;

interface Drop {
  x: MotionValue<number>;
  y: MotionValue<number>;
  neckX: MotionValue<number>;
  neckY: MotionValue<number>;
  scale: MotionValue<number>;
  stretchX: MotionValue<number>;
  stretchY: MotionValue<number>;
  opacity: MotionValue<number>;
}

function useSafeReducedMotion() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && !!prefers;
}

function layout(count: number, direction: LiquidFabDirection, size: number, actionSize: number) {
  const [from, to] = ARCS[direction];
  const step = count > 1 ? (to - from) / (count - 1) : 0;
  const spacing = Math.abs(step) * (Math.PI / 180);
  const reach = Math.max(size * 1.5, spacing ? (actionSize + 14) / (2 * Math.sin(spacing / 2)) : 0);
  return Array.from({ length: count }, (_, i) => {
    const angle = count > 1 ? from + step * i : (from + to) / 2;
    const rad = angle * (Math.PI / 180);
    const x = Math.cos(rad) * reach;
    const y = Math.sin(rad) * reach;
    const side: "left" | "right" | "top" = Math.cos(rad) < -0.4 ? "left" : Math.cos(rad) > 0.4 ? "right" : "top";
    return { x, y, angle, side };
  });
}

export function LiquidFab({
  actions,
  direction = "up",
  label = "Quick actions",
  size = 56,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  className,
}: LiquidFabProps) {
  const uid = useId().replace(/:/g, "");
  const filterId = `liquid-fab-${uid}`;
  const groupId = `liquid-fab-group-${uid}`;
  const reduce = useSafeReducedMotion();
  const [openState, setOpenState] = useState(defaultOpen);
  const open = openProp ?? openState;
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const focusFirst = useRef(false);
  const mainScale = useMemo(() => motionValue(1), []);

  const actionSize = Math.round(size * 0.78);
  const blur = size * 0.125;
  const spots = useMemo(() => layout(actions.length, direction, size, actionSize), [actions.length, direction, size, actionSize]);
  const drops = useMemo<Drop[]>(
    () =>
      Array.from({ length: actions.length }, () => ({
        x: motionValue(0),
        y: motionValue(0),
        neckX: motionValue(0),
        neckY: motionValue(0),
        scale: motionValue(0.5),
        stretchX: motionValue(1),
        stretchY: motionValue(1),
        opacity: motionValue(0),
      })),
    [actions.length],
  );

  const margin = actionSize * 0.7 + 8;
  const minX = Math.min(-size / 2, ...spots.map((s) => s.x - margin));
  const maxX = Math.max(size / 2, ...spots.map((s) => s.x + margin));
  const minY = Math.min(-size / 2, ...spots.map((s) => s.y - margin));
  const maxY = Math.max(size / 2, ...spots.map((s) => s.y + margin));
  const boxW = maxX - minX;
  const boxH = maxY - minY;
  const pad = blur * 3;

  const setOpen = (next: boolean) => {
    if (openProp === undefined) setOpenState(next);
    onOpenChange?.(next);
  };

  useEffect(() => {
    const count = drops.length;
    const runs: AnimationPlaybackControls[] = [];
    const run = (value: MotionValue<number>, to: number | number[], options: ValueAnimationTransition<number>) => {
      runs.push(animate(value, to, options));
    };
    drops.forEach((d, i) => {
      const spot = spots[i];
      if (!spot) return;
      if (reduce) {
        if (open) {
          d.x.set(spot.x);
          d.y.set(spot.y);
          d.scale.set(1);
        }
        run(d.opacity, open ? 1 : 0, { duration: 0.16 });
        return;
      }
      if (open) {
        const delay = i * 0.04;
        run(d.x, spot.x, { type: "spring", stiffness: 460, damping: 26, delay });
        run(d.y, spot.y, { type: "spring", stiffness: 460, damping: 26, delay });
        run(d.scale, 1, { duration: 0.3, ease: settle, delay });
        run(d.stretchX, [d.stretchX.get(), 1.32, 0.94, 1], { duration: 0.55, times: [0, 0.3, 0.65, 1], delay });
        run(d.stretchY, [d.stretchY.get(), 0.8, 1.05, 1], { duration: 0.55, times: [0, 0.3, 0.65, 1], delay });
        run(d.neckX, [0, spot.x * 0.42, 0], { duration: 0.42, times: [0, 0.4, 1], ease: "easeOut", delay });
        run(d.neckY, [0, spot.y * 0.42, 0], { duration: 0.42, times: [0, 0.4, 1], ease: "easeOut", delay });
        run(d.opacity, 1, { duration: 0.16, delay: delay + 0.1 });
      } else {
        const delay = (count - 1 - i) * 0.03;
        run(d.opacity, 0, { duration: 0.1 });
        run(d.x, 0, { type: "spring", stiffness: 420, damping: 34, delay });
        run(d.y, 0, { type: "spring", stiffness: 420, damping: 34, delay });
        run(d.scale, 0.5, { duration: 0.34, ease: [0.4, 0, 0.2, 1], delay });
        run(d.stretchX, [d.stretchX.get(), 1.22, 1], { duration: 0.36, delay });
        run(d.stretchY, [d.stretchY.get(), 0.86, 1], { duration: 0.36, delay });
        run(d.neckX, [0, d.x.get() * 0.5, 0], { duration: 0.34, times: [0, 0.35, 1], delay });
        run(d.neckY, [0, d.y.get() * 0.5, 0], { duration: 0.34, times: [0, 0.35, 1], delay });
      }
    });
    if (!reduce) {
      run(mainScale, open ? [mainScale.get(), 0.9, 1.04, 1] : [mainScale.get(), 1, 1.05, 1], {
        duration: 0.42,
        times: [0, 0.3, 0.65, 1],
        delay: open ? 0 : 0.12,
      });
    }
    return () => {
      for (const r of runs) r.stop();
    };
  }, [open, reduce, drops, spots, mainScale]);

  useEffect(() => {
    if (!open) return;
    if (focusFirst.current) {
      focusFirst.current = false;
      buttons.current[0]?.focus();
    }
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  });

  const toggle = (e: MouseEvent<HTMLButtonElement>) => {
    if (!open && e.detail === 0) focusFirst.current = true;
    setOpen(!open);
  };

  const choose = (action: LiquidFabAction) => {
    action.onSelect?.();
    setOpen(false);
    trigger.current?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape" && open) {
      e.stopPropagation();
      setOpen(false);
      trigger.current?.focus();
      return;
    }
    if (!open) return;
    const keys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End"];
    if (!keys.includes(e.key)) return;
    const list = buttons.current.filter(Boolean) as HTMLButtonElement[];
    const at = list.indexOf(document.activeElement as HTMLButtonElement);
    e.preventDefault();
    if (e.key === "Home") return list[0]?.focus();
    if (e.key === "End") return list[list.length - 1]?.focus();
    const forward = e.key === "ArrowUp" || (direction === "up-left" ? e.key === "ArrowLeft" : e.key === "ArrowRight");
    const next = at === -1 ? 0 : (at + (forward ? 1 : -1) + list.length) % list.length;
    list[next]?.focus();
  };

  return (
    <TooltipProvider delay={250}>
      <div
        className={cn(
          "relative inline-block shrink-0 text-primary-foreground [--liquid-fab:var(--color-primary)]",
          className,
        )}
        onBlur={(e) => {
          if (open && !root.current?.contains(e.relatedTarget as Node)) setOpen(false);
        }}
        onKeyDown={onKeyDown}
        ref={root}
        style={{ width: size, height: size }}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute drop-shadow-[0_2px_3px_rgb(0_0_0/0.12)] dark:drop-shadow-[0_2px_4px_rgb(0_0_0/0.4)]"
          style={{ left: size / 2 + minX, top: size / 2 + minY, width: boxW, height: boxH }}
        >
          <svg className="absolute size-0">
            <filter
              colorInterpolationFilters="sRGB"
              height={`${((boxH + pad * 2) / boxH) * 100}%`}
              id={filterId}
              width={`${((boxW + pad * 2) / boxW) * 100}%`}
              x={`${(-pad / boxW) * 100}%`}
              y={`${(-pad / boxH) * 100}%`}
            >
              <feGaussianBlur in="SourceGraphic" result="blur" stdDeviation={blur} />
              <feColorMatrix in="blur" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10" />
            </filter>
          </svg>
          <span className="absolute inset-0" style={{ filter: `url(#${filterId})` }}>
            {drops.map((d, i) => {
              const spot = spots[i];
              if (!spot || reduce) return null;
              const neck = actionSize * 0.5;
              return (
                <span key={actions[i]?.id ?? i}>
                  <motion.span
                    className="absolute rounded-full bg-(--liquid-fab)"
                    style={{
                      left: -minX - neck / 2,
                      top: -minY - neck / 2,
                      width: neck,
                      height: neck,
                      x: d.neckX,
                      y: d.neckY,
                    }}
                  />
                  <motion.span
                    className="absolute"
                    style={{
                      left: -minX - actionSize / 2,
                      top: -minY - actionSize / 2,
                      width: actionSize,
                      height: actionSize,
                      x: d.x,
                      y: d.y,
                      rotate: spot.angle,
                      scale: d.scale,
                    }}
                  >
                    <motion.span
                      className="absolute inset-0 rounded-full bg-(--liquid-fab)"
                      style={{ scaleX: d.stretchX, scaleY: d.stretchY }}
                    />
                  </motion.span>
                </span>
              );
            })}
            <motion.span
              className="absolute rounded-full bg-(--liquid-fab)"
              style={{ left: -minX - size / 2, top: -minY - size / 2, width: size, height: size, scale: mainScale }}
            />
          </span>
        </span>

        <div
          aria-label={label}
          className={cn("absolute inset-0", !open && "pointer-events-none")}
          id={groupId}
          inert={!open}
          role="group"
        >
          {actions.map((action, i) => {
            const d = drops[i];
            const spot = spots[i];
            if (!d || !spot) return null;
            const Icon = action.icon;
            return (
              <Tooltip key={action.id}>
                <TooltipTrigger
                  render={
                    <motion.button
                      aria-label={action.label}
                      className={cn(
                        "absolute grid cursor-pointer place-items-center rounded-full outline-none transition-[box-shadow] before:absolute before:inset-0 before:rounded-full before:bg-current before:opacity-0 before:transition-opacity before:duration-150 hover:before:opacity-12 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background [&_svg]:pointer-events-none",
                        reduce && "bg-(--liquid-fab) shadow-sm",
                      )}
                      onClick={() => choose(action)}
                      ref={(el: HTMLButtonElement | null) => {
                        buttons.current[i] = el;
                      }}
                      style={{
                        left: size / 2 - actionSize / 2,
                        top: size / 2 - actionSize / 2,
                        width: actionSize,
                        height: actionSize,
                        x: d.x,
                        y: d.y,
                        scale: d.scale,
                        opacity: d.opacity,
                      }}
                      type="button"
                      whileTap={reduce ? undefined : { scale: 0.92 }}
                    />
                  }
                >
                  <Icon className="size-[18px]" strokeWidth={2.25} />
                </TooltipTrigger>
                <TooltipPopup side={spot.side} sideOffset={8}>
                  {action.label}
                </TooltipPopup>
              </Tooltip>
            );
          })}
        </div>

        <button
          aria-controls={groupId}
          aria-expanded={open}
          aria-label={open ? `Close ${label.toLowerCase()}` : label}
          className="absolute inset-0 grid cursor-pointer touch-manipulation select-none place-items-center rounded-full outline-none [-webkit-tap-highlight-color:transparent] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          onClick={toggle}
          onPointerCancel={() => !reduce && animate(mainScale, 1, { duration: 0.2, ease: settle })}
          onPointerDown={() => !reduce && animate(mainScale, 0.93, { duration: 0.12, ease: settle })}
          onPointerLeave={() => !reduce && animate(mainScale, 1, { duration: 0.2, ease: settle })}
          onPointerUp={() => !reduce && animate(mainScale, 1, { duration: 0.2, ease: settle })}
          ref={trigger}
          type="button"
        >
          <motion.span
            animate={{ rotate: open ? 135 : 0 }}
            className="grid place-items-center"
            initial={false}
            transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 28 }}
          >
            <PlusIcon className="size-6" strokeWidth={2.25} />
          </motion.span>
        </button>
      </div>
    </TooltipProvider>
  );
}
