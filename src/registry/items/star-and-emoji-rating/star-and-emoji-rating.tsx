"use client";

import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { type KeyboardEvent, type PointerEvent, useEffect, useId, useState } from "react";
import { cn } from "@/lib/utils";

const STAR = (() => {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 10 : 4.4;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(`${(12 + r * Math.cos(a)).toFixed(2)},${(12.6 + r * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(" ");
})();

const STAR_WORDS = ["Not rated", "Awful", "Poor", "Okay", "Good", "Excellent"];

export interface StarRatingProps {
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  max?: number;
  half?: boolean;
  size?: number;
  readOnly?: boolean;
  words?: string[] | false;
  className?: string;
  "aria-label"?: string;
}

export function StarRating({
  value: valueProp,
  defaultValue = 0,
  onValueChange,
  max = 5,
  half = true,
  size = 28,
  readOnly = false,
  words = STAR_WORDS,
  className,
  "aria-label": ariaLabel = "Rating",
}: StarRatingProps) {
  const [inner, setInner] = useState(defaultValue);
  const value = valueProp ?? inner;
  const [hover, setHover] = useState<number | null>(null);
  const [pop, setPop] = useState(0);
  const reduce = useReducedMotion();
  const step = half ? 0.5 : 1;
  const shown = hover ?? value;

  const commit = (next: number) => {
    const v = next === value ? 0 : next;
    if (valueProp === undefined) setInner(v);
    onValueChange?.(v);
    if (v > 0) setPop((p) => p + 1);
  };

  const valueAt = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const raw = ((event.clientX - rect.left) / rect.width) * max;
    return Math.min(max, Math.max(step, Math.ceil(raw / step) * step));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (readOnly) return;
    const keys: Record<string, number> = {
      ArrowRight: value + step,
      ArrowUp: value + step,
      ArrowLeft: value - step,
      ArrowDown: value - step,
      Home: 0,
      End: max,
    };
    if (!(event.key in keys)) return;
    event.preventDefault();
    const next = Math.min(max, Math.max(0, keys[event.key]));
    if (valueProp === undefined) setInner(next);
    onValueChange?.(next);
    if (next > value) setPop((p) => p + 1);
  };

  const word = words ? words[Math.ceil(shown)] : null;

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        aria-label={ariaLabel}
        aria-readonly={readOnly || undefined}
        aria-valuemax={max}
        aria-valuemin={0}
        aria-valuenow={value}
        aria-valuetext={`${value} of ${max} stars`}
        className={cn(
          "-m-1 flex touch-none rounded-lg p-1 outline-none focus-visible:ring-2 focus-visible:ring-ring",
          !readOnly && "cursor-pointer",
        )}
        onKeyDown={onKeyDown}
        onPointerLeave={() => setHover(null)}
        onPointerMove={(event) => !readOnly && setHover(valueAt(event))}
        onPointerUp={(event) => !readOnly && commit(valueAt(event))}
        role="slider"
        tabIndex={readOnly ? -1 : 0}
      >
        {Array.from({ length: max }, (_, i) => {
          const fill = Math.min(Math.max(shown - i, 0), 1);
          const popping = !reduce && pop > 0 && hover === null && i < value;
          return (
            <motion.span
              animate={popping ? { scale: [1, 1.15, 0.97, 1] } : { scale: 1 }}
              className="relative block"
              key={popping ? `${i}-${pop}` : i}
              style={{ width: size, height: size }}
              transition={{ duration: 0.36, delay: i * 0.03, times: [0, 0.35, 0.7, 1], ease: "easeOut" }}
            >
              <svg aria-hidden className="absolute inset-0 size-full" viewBox="0 0 24 24">
                <polygon className="fill-muted stroke-border" points={STAR} strokeLinejoin="round" strokeWidth={1.4} />
              </svg>
              <span
                className="absolute inset-0 transition-[clip-path] duration-150 ease-out"
                style={{ clipPath: `inset(0 ${(1 - fill) * 100}% 0 0)` }}
              >
                <svg aria-hidden className="size-full" viewBox="0 0 24 24">
                  <polygon
                    className={cn(
                      "transition-colors duration-150",
                      hover !== null ? "fill-amber-300 stroke-amber-300" : "fill-amber-400 stroke-amber-400",
                    )}
                    points={STAR}
                    strokeLinejoin="round"
                    strokeWidth={1.4}
                  />
                </svg>
              </span>
            </motion.span>
          );
        })}
      </div>
      {word && (
        <span className="min-w-16 text-sm">
          <span className="font-medium tabular-nums">{shown ? shown.toFixed(half ? 1 : 0) : "–"}</span>
          <span className="text-muted-foreground"> · {word}</span>
        </span>
      )}
    </div>
  );
}

const MOODS = ["Awful", "Not great", "Okay", "Good", "Love it"];

const FACE = {
  smile: [-7, -3, 0, 5, 9],
  mouthW: [14, 13, 12, 16, 18],
  open: [0, 0, 0, 0, 5],
  eyeH: [2.6, 2.4, 2.6, 2.6, 0.9],
  eyeY: [24, 24, 24, 23.5, 24],
  brow: [16, 7, 0, -5, -9],
  browY: [16.5, 17.5, 17, 16, 15],
  hue: [28, 50, 80, 115, 145],
  browOn: [1, 0.85, 0, 0, 0],
};

const lerp = (arr: number[], t: number) => {
  const i = Math.min(Math.max(Math.floor(t), 0), arr.length - 2);
  const f = Math.min(Math.max(t - i, 0), 1);
  return arr[i] + (arr[i + 1] - arr[i]) * f;
};

export interface EmojiRatingProps {
  value?: number | null;
  defaultValue?: number | null;
  onValueChange?: (value: number) => void;
  labels?: string[];
  className?: string;
  "aria-label"?: string;
}

export function EmojiRating({
  value: valueProp,
  defaultValue = null,
  onValueChange,
  labels = MOODS,
  className,
  "aria-label": ariaLabel = "How did it go?",
}: EmojiRatingProps) {
  const [inner, setInner] = useState<number | null>(defaultValue);
  const value = valueProp === undefined ? inner : valueProp;
  const reduce = useReducedMotion();
  const id = useId();
  const target = useMotionValue(value ?? 2);
  const mood = useSpring(target, { stiffness: 260, damping: 22 });

  useEffect(() => {
    const next = value ?? 2;
    if (reduce) {
      target.jump(next);
      mood.jump(next);
    } else target.set(next);
  }, [value, reduce, target, mood]);

  const mouth = useTransform(mood, (m) => {
    const w = lerp(FACE.mouthW, m);
    const s = lerp(FACE.smile, m);
    const o = lerp(FACE.open, m);
    const y = 33.5 - s * 0.25;
    return `M ${24 - w / 2} ${y} Q 24 ${y + s} ${24 + w / 2} ${y} Q 24 ${y + s + o * 1.6} ${24 - w / 2} ${y} Z`;
  });
  const eyeRy = useTransform(mood, (m) => lerp(FACE.eyeH, m));
  const eyeY = useTransform(mood, (m) => lerp(FACE.eyeY, m));
  const browL = useTransform(mood, (m) => `rotate(${lerp(FACE.brow, m)} 17 ${lerp(FACE.browY, m)})`);
  const browR = useTransform(mood, (m) => `rotate(${-lerp(FACE.brow, m)} 31 ${lerp(FACE.browY, m)})`);
  const browY = useTransform(mood, (m) => lerp(FACE.browY, m));
  const fill = useTransform(mood, (m) => `oklch(0.86 0.12 ${lerp(FACE.hue, m)})`);
  const cheeks = useTransform(mood, [2.6, 4], [0, 0.45]);
  const brows = useTransform(mood, (m) => lerp(FACE.browOn, m));

  const set = (next: number) => {
    if (valueProp === undefined) setInner(next);
    onValueChange?.(next);
  };

  return (
    <div className={cn("grid justify-items-center gap-3", className)}>
      <svg aria-hidden className={cn("size-16 transition-opacity duration-200", value === null && "opacity-60")} viewBox="0 0 48 48">
        <motion.circle cx={24} cy={24} r={22} style={{ fill }} />
        <motion.ellipse className="fill-rose-400" cx={11.5} cy={29} rx={2.8} ry={1.7} style={{ opacity: cheeks }} />
        <motion.ellipse className="fill-rose-400" cx={36.5} cy={29} rx={2.8} ry={1.7} style={{ opacity: cheeks }} />
        <motion.line className="stroke-neutral-800" strokeLinecap="round" strokeWidth={2} style={{ opacity: brows }} transform={browL} x1={13.5} x2={20.5} y1={browY} y2={browY} />
        <motion.line className="stroke-neutral-800" strokeLinecap="round" strokeWidth={2} style={{ opacity: brows }} transform={browR} x1={27.5} x2={34.5} y1={browY} y2={browY} />
        <motion.ellipse className="fill-neutral-800" cx={17} cy={eyeY} rx={2.2} ry={eyeRy} />
        <motion.ellipse className="fill-neutral-800" cx={31} cy={eyeY} rx={2.2} ry={eyeRy} />
        <motion.path className="fill-neutral-800 stroke-neutral-800" d={mouth} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
      </svg>
      <div aria-label={ariaLabel} className="flex gap-1 rounded-full bg-muted p-1" role="radiogroup">
        {labels.map((label, i) => {
          const checked = value === i;
          return (
            <button
              aria-checked={checked}
              aria-label={label}
              className="relative flex size-8 cursor-pointer items-center justify-center rounded-full outline-none transition-[scale] duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.94]"
              key={label}
              onClick={() => set(i)}
              onKeyDown={(event) => {
                const d = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
                if (!d) return;
                event.preventDefault();
                const next = Math.min(labels.length - 1, Math.max(0, (value ?? 2) + d));
                set(next);
                (event.currentTarget.parentElement?.children[next] as HTMLElement | undefined)?.focus();
              }}
              role="radio"
              tabIndex={checked || (value === null && i === 2) ? 0 : -1}
              type="button"
            >
              {checked && (
                <motion.span
                  className="absolute inset-0 rounded-full bg-background shadow-xs/5 ring-1 ring-border dark:bg-input"
                  layoutId={`${id}-pick`}
                  transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 36 }}
                />
              )}
              <span
                className={cn(
                  "relative size-2 rounded-full transition-[background-color,scale] duration-150",
                  checked ? "scale-125 bg-foreground" : "bg-muted-foreground/48",
                )}
              />
            </button>
          );
        })}
      </div>
      <div className="relative h-5 w-full overflow-hidden text-center text-sm">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            animate={{ opacity: 1, y: 0 }}
            className={cn("absolute inset-x-0", value === null ? "text-muted-foreground" : "font-medium")}
            exit={{ opacity: 0, y: -8 }}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
            key={value ?? "none"}
            transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
          >
            {value === null ? "Pick one" : labels[value]}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
}
