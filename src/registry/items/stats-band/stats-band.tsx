"use client";

import { animate, motion, MotionConfig, useInView, useReducedMotion } from "motion/react";
import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

function useReducedMotionSafe() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && Boolean(prefers);
}

export interface Stat {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  label: string;
  caption?: string;
}

export interface StatsBandProps {
  eyebrow?: string;
  title?: ReactNode;
  description?: ReactNode;
  stats: Stat[];
  duration?: number;
  className?: string;
}

const ease = [0.23, 1, 0.32, 1] as const;

function format(value: number, decimals = 0) {
  return value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function CountUp({ stat, start, delay, duration }: { stat: Stat; start: boolean; delay: number; duration: number }) {
  const reduce = useReducedMotionSafe();
  const ref = useRef<HTMLSpanElement>(null);
  const final = format(stat.value, stat.decimals);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduce) {
      el.textContent = final;
      return;
    }
    if (!start) {
      el.textContent = format(0, stat.decimals);
      return;
    }
    // Write straight to the node so a running count never re-renders React.
    const controls = animate(0, stat.value, {
      duration,
      delay,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        el.textContent = format(v, stat.decimals);
      },
    });
    return () => controls.stop();
  }, [start, reduce, stat.value, stat.decimals, final, delay, duration]);

  return (
    <span className="relative inline-grid tabular-nums">
      <span aria-hidden className="invisible col-start-1 row-start-1">
        {final}
      </span>
      <span aria-hidden className="col-start-1 row-start-1" ref={ref}>
        {reduce ? final : format(0, stat.decimals)}
      </span>
    </span>
  );
}

export function StatsBand({ eyebrow, title, description, stats, duration = 1.8, className }: StatsBandProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const columns = stats.length;

  return (
    <MotionConfig reducedMotion="user">
      <section className={cn("mx-auto w-full max-w-[1100px]", className)}>
        {(eyebrow || title || description) && (
          <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-xl">
              {eyebrow && <p className="font-medium text-muted-foreground text-xs uppercase tracking-widest">{eyebrow}</p>}
              {title && (
                <h2 className="mt-2 text-balance font-heading font-semibold text-3xl tracking-tight sm:text-4xl">{title}</h2>
              )}
            </div>
            {description && (
              <p className="max-w-sm text-pretty text-muted-foreground text-sm leading-relaxed md:text-end">{description}</p>
            )}
          </header>
        )}

        <div className="mt-12 sm:mt-14" ref={ref}>
          <motion.div
            animate={inView ? { clipPath: "inset(0 0% 0 0)" } : undefined}
            aria-hidden
            className="relative h-3 text-foreground/15"
            initial={{ clipPath: "inset(0 100% 0 0)" }}
            transition={{ duration: 1.2, ease }}
          >
            <div className="absolute inset-x-0 bottom-0 h-px bg-border" />
            <div className="absolute inset-x-0 bottom-0 h-1.5 bg-[repeating-linear-gradient(to_right,currentColor_0_1px,transparent_1px_8px)] [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]" />
            <div
              className="absolute inset-0 hidden lg:grid"
              style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
            >
              {stats.map((stat) => (
                <span className="relative" key={stat.label}>
                  <span className="absolute bottom-0 left-0 h-3 w-px bg-foreground/40" />
                </span>
              ))}
            </div>
          </motion.div>

          <dl
            className="grid grid-cols-2 lg:grid-cols-[repeat(var(--cols),minmax(0,1fr))]"
            style={{ "--cols": columns } as CSSProperties}
          >
            {stats.map((stat, i) => (
              <motion.div
                animate={inView ? { opacity: 1, y: 0 } : undefined}
                className={cn(
                  "flex flex-col py-7 ps-4 pe-3 sm:py-9 sm:ps-6",
                  i % 2 === 1 && "border-l",
                  i % 2 === 0 && i > 0 && "lg:border-l",
                  i >= 2 && "max-lg:border-t",
                  i === 0 && "lg:ps-0",
                  i % 2 === 0 && "max-lg:ps-0",
                )}
                initial={{ opacity: 0, y: 8 }}
                key={stat.label}
                transition={{ duration: 0.6, ease, delay: 0.15 + i * 0.08 }}
              >
                <dt className="order-2 mt-3 font-medium text-sm">{stat.label}</dt>
                <dd className="order-1 flex items-baseline font-heading font-semibold text-[2.5rem] leading-none tracking-[-0.04em] sm:text-6xl lg:text-[4.25rem]">
                  <span className="sr-only">
                    {stat.prefix}
                    {format(stat.value, stat.decimals)}
                    {stat.suffix}
                  </span>
                  {stat.prefix && (
                    <span aria-hidden className="me-0.5 text-[0.55em] text-muted-foreground tracking-tight">
                      {stat.prefix}
                    </span>
                  )}
                  <CountUp delay={0.15 + i * 0.12} duration={duration} start={inView} stat={stat} />
                  {stat.suffix && (
                    <span
                      aria-hidden
                      className={cn(
                        "text-[0.55em] text-muted-foreground tracking-tight",
                        /^[a-z]/i.test(stat.suffix) ? "ms-[0.08em]" : "-ms-[0.02em]",
                      )}
                    >
                      {stat.suffix}
                    </span>
                  )}
                </dd>
                {stat.caption && (
                  <dd className="order-3 mt-1 text-pretty text-muted-foreground text-xs leading-relaxed">{stat.caption}</dd>
                )}
              </motion.div>
            ))}
          </dl>
          <div aria-hidden className="h-px bg-border" />
        </div>
      </section>
    </MotionConfig>
  );
}
