"use client";

import { HeartIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ComponentProps, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

function useReduce() {
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && !!reduce;
}

const SPARKS = Array.from({ length: 8 }, (_, i) => i * 45);
const out = [0.22, 1, 0.36, 1] as const;

function Burst() {
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0">
      <motion.span
        animate={{ scale: 2.1, opacity: [0, 0.7, 0] }}
        className="absolute inset-0 rounded-full border-[1.5px] border-rose-500 dark:border-rose-400"
        initial={{ scale: 1, opacity: 0 }}
        transition={{ duration: 0.5, delay: 0.08, ease: out, opacity: { duration: 0.5, delay: 0.08, times: [0, 0.1, 1] } }}
      />
      {SPARKS.map((angle, i) => (
        <span className="absolute top-1/2 left-1/2" key={angle} style={{ transform: `rotate(${angle}deg)` }}>
          <motion.span
            animate={{ y: i % 2 ? -16 : -19, opacity: [0, 1, 0], scaleY: 0.3 }}
            className={cn(
              "absolute -mt-0.5 -ml-px block w-0.5 rounded-full",
              i % 2 ? "h-1 bg-amber-400 dark:bg-amber-300" : "h-1.5 bg-rose-500 dark:bg-rose-400",
            )}
            initial={{ y: -10, opacity: 0, scaleY: 1 }}
            transition={{ duration: 0.4, delay: 0.1, ease: out, opacity: { duration: 0.4, delay: 0.1, times: [0, 0.12, 1] } }}
          />
        </span>
      ))}
    </span>
  );
}

function Digit({ char, up, place, reduce }: { char: string; up: boolean; place: number; reduce: boolean }) {
  return (
    <span className="relative inline-flex overflow-hidden">
      <AnimatePresence custom={up} initial={false} mode="popLayout">
        <motion.span
          animate={{ y: 0, opacity: 1 }}
          custom={up}
          exit="exit"
          initial={reduce ? { opacity: 0 } : { y: up ? "100%" : "-100%", opacity: 0 }}
          key={char}
          transition={{ duration: 0.22, delay: reduce ? 0 : place * 0.035, ease: out }}
          variants={{ exit: (rising: boolean) => (reduce ? { opacity: 0 } : { y: rising ? "-100%" : "100%", opacity: 0 }) }}
        >
          {char}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function RollingCount({ value, up, reduce }: { value: number; up: boolean; reduce: boolean }) {
  const chars = [...value.toLocaleString("en-US")];
  return (
    <span className="inline-flex">
      {chars.map((char, i) => {
        const place = chars.length - 1 - i;
        return <Digit char={char} key={place} place={place} reduce={reduce} up={up} />;
      })}
    </span>
  );
}

export interface LikeButtonProps extends Omit<ComponentProps<"button">, "onChange"> {
  liked?: boolean;
  defaultLiked?: boolean;
  onLikedChange?: (liked: boolean) => void;
  count?: number;
}

export function LikeButton({
  liked: likedProp,
  defaultLiked = false,
  onLikedChange,
  count,
  className,
  onClick,
  ...props
}: LikeButtonProps) {
  const reduce = useReduce();
  const [internal, setInternal] = useState(defaultLiked);
  const liked = likedProp ?? internal;
  const [bursts, setBursts] = useState(0);
  const total = count === undefined ? undefined : count + (liked ? 1 : 0);

  return (
    <button
      aria-label={total === undefined ? "Like" : `Like, ${total} likes`}
      aria-pressed={liked}
      className={cn(
        "group relative inline-flex h-8 cursor-pointer select-none items-center gap-1.5 rounded-full px-2.5 text-muted-foreground text-xs tabular-nums outline-none transition-[color,background-color,scale] duration-150 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.96] [@media(hover:hover)]:hover:bg-rose-500/8 [@media(hover:hover)]:hover:text-rose-600 dark:[@media(hover:hover)]:hover:text-rose-400",
        liked && "text-rose-600 dark:text-rose-400",
        className,
      )}
      onClick={(e) => {
        onClick?.(e);
        const next = !liked;
        if (likedProp === undefined) setInternal(next);
        onLikedChange?.(next);
        if (next && !reduce) setBursts((n) => n + 1);
      }}
      type="button"
      {...props}
    >
      <span className="relative grid size-[18px] place-items-center">
        <motion.span
          animate={liked && !reduce && bursts ? { scale: [1, 0.74, 1.14, 1] } : { scale: 1 }}
          className="grid place-items-center"
          key={liked ? `on-${bursts}` : "off"}
          transition={
            liked ? { duration: 0.42, times: [0, 0.22, 0.62, 1], ease: ["easeOut", out, "easeInOut"] } : { duration: 0.15 }
          }
        >
          <HeartIcon className="size-[18px]" strokeWidth={2} />
          <motion.span
            animate={liked ? { opacity: 1, scale: 1 } : { opacity: 0, scale: reduce ? 1 : 0.9 }}
            className="absolute inset-0 grid place-items-center text-rose-500 dark:text-rose-400"
            initial={false}
            transition={liked ? { duration: 0.2, delay: reduce ? 0 : 0.08, ease: out } : { duration: 0.18, ease: "easeOut" }}
          >
            <HeartIcon className="size-[18px] fill-current" strokeWidth={2} />
          </motion.span>
        </motion.span>
        {liked && bursts > 0 && !reduce && <Burst key={bursts} />}
      </span>
      {total !== undefined && <RollingCount reduce={reduce} up={liked} value={total} />}
    </button>
  );
}
