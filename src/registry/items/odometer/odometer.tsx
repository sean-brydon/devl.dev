"use client";

import {
  AnimatePresence,
  animate,
  type MotionValue,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { type ComponentProps, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

export interface OdometerProps extends Omit<ComponentProps<"span">, "children"> {
  value: number;
  from?: number;
  format?: Intl.NumberFormatOptions;
  locale?: string;
  startOnView?: boolean;
  stiffness?: number;
  stagger?: number;
}

type Glyph = { key: string; char: string; digit: number | null; place: number };

function toGlyphs(text: string): Glyph[] {
  let place = 0;
  let other = 0;
  return [...text]
    .reverse()
    .map((char) => {
      const isDigit = char >= "0" && char <= "9";
      const key = isDigit ? `d${place}` : `s${other++}-${char}`;
      return { key, char, digit: isDigit ? Number(char) : null, place: isDigit ? place++ : place };
    })
    .reverse();
}

function Face({ n, turn }: { n: number; turn: MotionValue<number> }) {
  const y = useTransform(turn, (t) => {
    let offset = (((n - t) % 10) + 10) % 10;
    if (offset > 5) offset -= 10;
    return `${offset * 100}%`;
  });
  return (
    <motion.span className="absolute inset-x-0 top-0 block h-(--row) text-center leading-(--row)" style={{ y }}>
      {n}
    </motion.span>
  );
}

function Wheel({
  digit,
  direction,
  startAt,
  delay,
  stiffness,
  reduce,
}: {
  digit: number;
  direction: number;
  startAt: number;
  delay: number;
  stiffness: number;
  reduce: boolean;
}) {
  const turn = useMotionValue(startAt);
  const target = useRef(startAt);

  useEffect(() => {
    const current = ((target.current % 10) + 10) % 10;
    let step = digit - current;
    if (direction > 0) step = (step + 10) % 10;
    else if (direction < 0) step = -((-step + 10) % 10);
    else if (step > 5) step -= 10;
    else if (step < -5) step += 10;
    target.current += step;
    if (reduce) turn.jump(target.current);
    else if (step !== 0 || (!turn.isAnimating() && turn.get() !== target.current))
      animate(turn, target.current, { type: "spring", stiffness, damping: 2 * Math.sqrt(stiffness), delay });
  }, [digit, direction, delay, stiffness, reduce, turn]);

  useEffect(() => () => turn.stop(), [turn]);

  return (
    <>
      <span className="invisible block leading-(--row)">0</span>
      {DIGITS.map((n) => (
        <Face key={n} n={n} turn={turn} />
      ))}
    </>
  );
}

export function Odometer({
  value,
  from = 0,
  format,
  locale = "en-US",
  startOnView = true,
  stiffness = 170,
  stagger = 0.035,
  className,
  ...props
}: OdometerProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  const reduce = useReducedMotion() ?? false;
  const formatter = useMemo(() => new Intl.NumberFormat(locale, format), [locale, format]);

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const shown = !startOnView || inView || (hydrated && reduce) ? value : from;
  const glyphs = toGlyphs(formatter.format(shown));

  const previous = useRef(shown);
  const direction = Math.sign(shown - previous.current);
  useEffect(() => {
    previous.current = shown;
  }, [shown]);

  const painted = useRef(false);
  useEffect(() => {
    painted.current = true;
  }, []);

  return (
    <span
      className={cn("relative inline-flex items-baseline whitespace-nowrap tabular-nums leading-none", className)}
      ref={ref}
      {...props}
    >
      <span className="sr-only">{formatter.format(value)}</span>
      <span aria-hidden className="relative inline-flex [--row:1.15em]">
        <AnimatePresence initial={false} mode="popLayout">
          {glyphs.map((glyph) => (
            <motion.span
              animate={{ opacity: 1 }}
              className={cn(
                "relative inline-block h-(--row) leading-(--row)",
                glyph.digit !== null &&
                  "overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_20%,black_80%,transparent)]",
              )}
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              key={glyph.key}
              layout={reduce ? false : "position"}
              transition={{ type: "spring", duration: 0.35, bounce: 0 }}
            >
              {glyph.digit === null ? (
                glyph.char
              ) : (
                <Wheel
                  delay={Math.min(glyph.place, 6) * stagger}
                  digit={glyph.digit}
                  direction={direction}
                  reduce={reduce}
                  startAt={painted.current && direction > 0 ? 0 : glyph.digit}
                  stiffness={stiffness}
                />
              )}
            </motion.span>
          ))}
        </AnimatePresence>
      </span>
    </span>
  );
}
