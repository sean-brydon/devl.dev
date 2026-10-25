"use client";

import { ArrowRightIcon, CheckIcon } from "lucide-react";
import {
  AnimatePresence,
  animate,
  MotionConfig,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { type KeyboardEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control";
import { cn } from "@/lib/utils";

export interface TallyLine {
  label: string;
  detail?: string;
  amount: number;
}

export interface TallyPeriod {
  id: string;
  label: string;
  range: string;
  caption: string;
  lines: TallyLine[];
}

export interface TallyHeroProps {
  periods: TallyPeriod[];
  defaultPeriod?: string;
  eyebrow?: string;
  description?: string;
  cta: { label: string; href: string };
  note?: string;
  statementLabel?: string;
  totalLabel?: string;
  reference?: string;
  reconciledLabel?: string;
  currency?: string;
  locale?: string;
  className?: string;
}

type Glyph = { key: string; kind: "digit" | "group" | "currency" | "literal"; char: string; place: number };

const ease = [0.23, 1, 0.32, 1] as const;
const hidden = "inset(0% 100% 0% 0%)";
const shown = "inset(0% 0% 0% 0%)";
const wheelStiffness = 340;
const strip = Array.from({ length: 11 }, (_, slot) => slot);

function useReducedMotionSafe() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && Boolean(prefers);
}

function toGlyphs(formatter: Intl.NumberFormat, total: number): { glyphs: Glyph[]; places: number } {
  const parts = formatter.formatToParts(total);
  const places = parts.filter((p) => p.type === "integer").reduce((n, p) => n + p.value.length, 0);
  let place = places;
  const glyphs: Glyph[] = [];
  parts.forEach((part, i) => {
    if (part.type === "integer") {
      for (const char of part.value) {
        place--;
        glyphs.push({ key: `d${place}`, kind: "digit", char, place });
      }
    } else if (part.type === "group") {
      glyphs.push({ key: `g${place}`, kind: "group", char: part.value, place });
    } else if (part.type === "currency") {
      glyphs.push({ key: place === places ? "currency" : "currency-end", kind: "currency", char: part.value, place: -1 });
    } else {
      glyphs.push({ key: `l${i}`, kind: "literal", char: part.value, place: -1 });
    }
  });
  return { glyphs, places };
}

function Wheel({ digit, from, direction, delay, reduce }: { digit: number; from: number; direction: number; delay: number; reduce: boolean }) {
  const turn = useMotionValue(from);
  const goal = useRef(from);
  const y = useTransform(turn, (t) => `${-(((t % 10) + 10) % 10) * 1.1}em`);

  useEffect(() => {
    const at = ((goal.current % 10) + 10) % 10;
    if (at !== digit) goal.current += direction < 0 ? -((at - digit + 10) % 10) : (digit - at + 10) % 10;
    if (reduce) {
      turn.jump(goal.current);
      return;
    }
    if (turn.get() === goal.current) return;
    const controls = animate(turn, goal.current, {
      type: "spring",
      stiffness: wheelStiffness,
      damping: 2 * Math.sqrt(wheelStiffness),
      delay,
    });
    return () => controls.stop();
  }, [digit, direction, delay, reduce, turn]);

  return (
    <>
      <span className="invisible block h-[1.1em]">0</span>
      <motion.span className="absolute inset-x-0 top-0 flex flex-col" style={{ y }}>
        {strip.map((slot) => (
          <span className="block h-[1.1em] text-center leading-[1.1em]" key={slot}>
            {slot % 10}
          </span>
        ))}
      </motion.span>
    </>
  );
}

function Counter({ value, total, formatter, reduce }: { value: number; total: number; formatter: Intl.NumberFormat; reduce: boolean }) {
  const { glyphs, places } = useMemo(() => toGlyphs(formatter, total), [formatter, total]);
  const padded = String(Math.round(value)).padStart(places, "0");
  const lit = value > 0 ? String(Math.round(value)).length : 0;

  const previous = useRef(value);
  const direction = Math.sign(value - previous.current);
  useEffect(() => {
    previous.current = value;
  }, [value]);

  const painted = useRef(false);
  useEffect(() => {
    painted.current = true;
  }, []);

  return (
    <span aria-hidden className="flex items-start">
      <AnimatePresence initial={false} mode="popLayout">
        {glyphs.map((glyph) => {
          const on = glyph.place < lit;
          if (glyph.kind === "currency") {
            return (
              <motion.span
                className="me-[0.06em] mt-[0.32em] font-medium text-[0.42em] text-muted-foreground leading-none tracking-normal"
                key={glyph.key}
                layout={reduce ? false : "position"}
                transition={{ type: "spring", duration: 0.4, bounce: 0 }}
              >
                {glyph.char}
              </motion.span>
            );
          }
          return (
            <motion.span
              animate={{ opacity: 1 }}
              className={cn(
                "relative inline-block h-[1.1em] leading-[1.1em] transition-colors duration-300",
                glyph.kind === "digit" &&
                  "overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_16%,black_84%,transparent)]",
                glyph.kind === "literal" || on ? "text-foreground" : "text-foreground/15",
              )}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
              initial={{ opacity: 0 }}
              key={glyph.key}
              layout={reduce ? false : "position"}
              transition={{ type: "spring", duration: 0.4, bounce: 0 }}
            >
              {glyph.kind === "digit" ? (
                <Wheel
                  delay={Math.min(glyph.place, 6) * 0.012}
                  digit={Number(padded[padded.length - 1 - glyph.place])}
                  direction={direction}
                  from={painted.current ? 0 : Number(padded[padded.length - 1 - glyph.place])}
                  reduce={reduce}
                />
              ) : (
                glyph.char
              )}
            </motion.span>
          );
        })}
      </AnimatePresence>
    </span>
  );
}

function PeriodSwitch({ periods, value, onChange }: { periods: TallyPeriod[]; value: string; onChange: (id: string) => void }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const index = Math.max(
    0,
    periods.findIndex((p) => p.id === value),
  );

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, number> = {
      ArrowRight: index + 1,
      ArrowDown: index + 1,
      ArrowLeft: index - 1,
      ArrowUp: index - 1,
      Home: 0,
      End: periods.length - 1,
    };
    if (!(event.key in moves)) return;
    event.preventDefault();
    const next = (moves[event.key] + periods.length) % periods.length;
    onChange(periods[next].id);
    refs.current[next]?.focus();
  };

  return (
    <SegmentedControl aria-label="Period" onKeyDown={onKeyDown} role="radiogroup" size="lg">
      {periods.map((period, i) => {
        const checked = i === index;
        return (
          <SegmentedControlItem
            aria-checked={checked}
            className="px-3"
            data-checked={checked ? "" : undefined}
            key={period.id}
            onClick={() => onChange(period.id)}
            ref={(el: HTMLButtonElement | null) => {
              refs.current[i] = el;
            }}
            role="radio"
            tabIndex={checked ? 0 : -1}
          >
            {period.label}
          </SegmentedControlItem>
        );
      })}
    </SegmentedControl>
  );
}

export function TallyHero({
  periods,
  defaultPeriod,
  eyebrow,
  description,
  cta,
  note,
  statementLabel = "Statement",
  totalLabel = "Total",
  reference,
  reconciledLabel = "Reconciled",
  currency = "USD",
  locale = "en-US",
  className,
}: TallyHeroProps) {
  const ref = useRef<HTMLElement>(null);
  const headingId = useId();
  const inView = useInView(ref, { once: true, amount: 0.35 });
  const reduce = useReducedMotionSafe();
  const formatter = useMemo(
    () => new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0, minimumFractionDigits: 0 }),
    [locale, currency],
  );

  const [periodId, setPeriodId] = useState(defaultPeriod ?? periods[0]?.id);
  const period = periods.find((p) => p.id === periodId) ?? periods[0];
  const lines = period.lines;
  const total = lines.reduce((sum, line) => sum + line.amount, 0);

  const [printed, setPrinted] = useState(0);
  const [swapped, setSwapped] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    if (reduce) {
      setPrinted(Number.POSITIVE_INFINITY);
      return;
    }
    if (!inView) return;
    const timers: number[] = [];
    let step = 0;
    const tick = () => {
      step++;
      setPrinted((p) => Math.max(p, step));
      if (step <= lines.length) timers.push(window.setTimeout(tick, step === lines.length ? 420 : 400));
    };
    timers.push(window.setTimeout(tick, 280));
    return () => timers.forEach(window.clearTimeout);
  }, [inView, reduce, lines.length]);

  const choose = (id: string) => {
    if (id === periodId) return;
    const next = periods.find((p) => p.id === id);
    if (!next) return;
    setPeriodId(id);
    setSwapped(true);
    setPrinted(Number.POSITIVE_INFINITY);
    setAnnouncement(`${formatter.format(next.lines.reduce((s, l) => s + l.amount, 0))} ${next.caption}`);
  };

  const value = lines.slice(0, Math.min(printed, lines.length)).reduce((sum, line) => sum + line.amount, 0);
  const totalPrinted = printed > lines.length;
  const sweep = (delay: number) => (reduce ? { duration: 0 } : { duration: 0.26, ease, delay });

  return (
    <MotionConfig reducedMotion="user">
      <section
        aria-labelledby={headingId}
        className={cn("@container mx-auto w-full max-w-[1100px] px-4 py-12 sm:px-10 sm:py-14", className)}
        ref={ref}
      >
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
          {eyebrow && <p className="font-medium font-mono text-muted-foreground text-xs uppercase tracking-widest">{eyebrow}</p>}
          {periods.length > 1 && <PeriodSwitch onChange={choose} periods={periods} value={period.id} />}
        </div>

        <h1
          className="mt-6 font-heading font-semibold text-[clamp(3rem,18cqi,12rem)] tabular-nums leading-none tracking-[-0.045em] @3xl:mt-8"
          id={headingId}
        >
          <span className="sr-only">
            {formatter.format(total)} {period.caption}
          </span>
          <Counter formatter={formatter} reduce={reduce} total={total} value={value} />
        </h1>

        <div className="relative mt-6 grid gap-8 @3xl:mt-10 @3xl:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] @3xl:grid-rows-[auto_1fr] @3xl:gap-x-14 @3xl:gap-y-6">
          <AnimatePresence initial={false} mode="popLayout">
            <motion.p
              animate={{ opacity: 1 }}
              aria-hidden
              className="max-w-lg text-balance font-heading font-medium text-2xl leading-tight tracking-tight @3xl:text-[1.75rem]"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              key={period.id}
              transition={{ duration: 0.18, ease }}
            >
              {period.caption}
            </motion.p>
          </AnimatePresence>

          <div className="order-last flex flex-col items-start gap-6 @3xl:order-none @3xl:col-start-1 @3xl:row-start-2 @3xl:self-end">
            {description && <p className="max-w-md text-pretty text-base text-muted-foreground leading-relaxed">{description}</p>}
            <div className="flex flex-col items-start gap-3">
              <Button
                className="transition-[box-shadow,transform] duration-150 ease-out active:scale-[0.97] motion-reduce:active:scale-100"
                render={<a href={cta.href} />}
                size="lg"
              >
                {cta.label}
                <ArrowRightIcon />
              </Button>
              {note && <p className="max-w-sm text-pretty text-muted-foreground text-xs leading-relaxed">{note}</p>}
            </div>
          </div>

          <div className="@container rounded-2xl border bg-card font-mono text-[0.8125rem] shadow-xs/5 @3xl:col-start-2 @3xl:row-span-2 @3xl:row-start-1">
            <div className="flex items-baseline justify-between gap-4 border-b border-dashed px-4 py-3 text-muted-foreground text-xs sm:px-5">
              <span className="uppercase tracking-widest">{statementLabel}</span>
              <span className="truncate tabular-nums">{period.range}</span>
            </div>
            <dl className="px-4 py-2.5 sm:px-5">
              {lines.map((line, i) => {
                const latest = !swapped && !totalPrinted && i === printed - 1;
                return (
                  <motion.div
                    animate={{ clipPath: i < printed ? shown : hidden }}
                    className="flex items-end gap-2 py-1.5"
                    initial={{ clipPath: hidden }}
                    key={`${period.id}-${line.label}`}
                    transition={sweep(swapped ? i * 0.045 : 0)}
                  >
                    <dt className="flex min-w-0 items-baseline gap-2">
                      <span className="truncate">{line.label}</span>
                      {line.detail && <span className="hidden shrink-0 text-muted-foreground text-xs tabular-nums @sm:inline">{line.detail}</span>}
                    </dt>
                    <span
                      aria-hidden
                      className="mb-[0.3em] h-1 min-w-4 flex-1 bg-[radial-gradient(circle,currentColor_0.75px,transparent_1.1px)] bg-size-[5px_4px] bg-repeat-x text-foreground/30"
                    />
                    <dd
                      className={cn(
                        "shrink-0 tabular-nums transition-colors duration-500",
                        latest ? "text-success-foreground" : "text-foreground",
                      )}
                    >
                      {formatter.format(line.amount)}
                    </dd>
                  </motion.div>
                );
              })}
            </dl>
            <motion.div
              animate={{ clipPath: totalPrinted ? shown : hidden }}
              className="mx-4 flex items-baseline justify-between gap-4 border-foreground/70 border-t-[3px] border-double py-3 sm:mx-5"
              initial={{ clipPath: hidden }}
              key={`${period.id}-total`}
              transition={sweep(swapped ? lines.length * 0.045 + 0.04 : 0)}
            >
              <span className="font-medium">{totalLabel}</span>
              <span className="font-semibold text-base tabular-nums">{formatter.format(total)}</span>
            </motion.div>
            <div className="flex items-center justify-between gap-4 border-t border-dashed px-4 py-3 text-muted-foreground text-xs sm:px-5">
              <span className="truncate">{reference}</span>
              <motion.span
                animate={{ opacity: totalPrinted ? 1 : 0 }}
                className="inline-flex shrink-0 items-center gap-1 text-success-foreground"
                initial={false}
                transition={{ duration: reduce ? 0 : 0.2, delay: reduce || swapped ? 0 : 0.2 }}
              >
                <CheckIcon className="size-3.5" />
                {reconciledLabel}
              </motion.span>
            </div>
          </div>
        </div>
        <p aria-live="polite" className="sr-only">
          {announcement}
        </p>
      </section>
    </MotionConfig>
  );
}
