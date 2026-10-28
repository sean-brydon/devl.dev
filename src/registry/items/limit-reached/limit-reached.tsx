"use client";

import { CheckIcon, CirclePauseIcon, ClockIcon, GaugeIcon, SparklesIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface LimitReachedUpgrade {
  plan: string;
  limit: number;
}

export interface LimitReachedProps {
  used?: number;
  limit?: number;
  unit?: string;
  shortUnit?: string;
  period?: string;
  planName?: string;
  secondsUntilReset?: number;
  resetDate?: string;
  upgrade?: LimitReachedUpgrade | null;
  stillWorks?: string[];
  paused?: string[];
  upgrading?: boolean;
  secondaryLabel?: string;
  secondaryDoneLabel?: string;
  onUpgrade?: () => void;
  onSecondary?: () => void;
  onReset?: () => void;
  className?: string;
}

const meterSpring = { type: "spring", stiffness: 110, damping: 17 } as const;
const roll = { type: "spring", stiffness: 320, damping: 32 } as const;
const glide = { type: "spring", stiffness: 380, damping: 34 } as const;

// Stays false until mounted so the server render and the first client render match.
function useSafeReducedMotion() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && !!prefers;
}

const format = (n: number) => n.toLocaleString("en-US");
const pad = (n: number) => String(n).padStart(2, "0");

function split(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

function spoken(seconds: number) {
  const t = split(seconds);
  const parts = [
    t.d && `${t.d} ${t.d === 1 ? "day" : "days"}`,
    t.h && `${t.h} ${t.h === 1 ? "hour" : "hours"}`,
    !t.d && t.m && `${t.m} min`,
  ].filter(Boolean);
  return parts.length ? parts.join(" ") : "less than a minute";
}

function Roll({ text, reduce, className }: { text: string; reduce: boolean; className?: string }) {
  const chars = text.split("");
  return (
    <span aria-hidden className={cn("tabular-nums leading-[1.2em]", className)}>
      {chars.map((char, i) => {
        const key = chars.length - i;
        if (!/\d/.test(char)) return <span key={`s${key}`}>{char}</span>;
        return (
          <span className="relative inline-block [clip-path:inset(0)]" key={`d${key}`}>
            <span className="invisible">{char}</span>
            <motion.span
              animate={{ y: `${-Number(char) * 1.2}em` }}
              className="absolute inset-x-0 top-0 flex flex-col"
              initial={false}
              transition={reduce ? { duration: 0 } : roll}
            >
              {Array.from({ length: 10 }, (_, n) => (
                <span className="block h-[1.2em] text-center" key={n}>
                  {n}
                </span>
              ))}
            </motion.span>
          </span>
        );
      })}
    </span>
  );
}

function useCountdown(start: number, onZero?: () => void) {
  const [left, setLeft] = useState(start);
  const onZeroRef = useRef(onZero);
  useEffect(() => {
    onZeroRef.current = onZero;
  }, [onZero]);
  useEffect(() => {
    setLeft(start);
    if (start <= 0) return;
    const began = Date.now();
    const id = window.setInterval(() => {
      const next = Math.max(0, start - Math.floor((Date.now() - began) / 1000));
      setLeft(next);
      if (next === 0) {
        window.clearInterval(id);
        onZeroRef.current?.();
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [start]);
  return left;
}

export function LimitReached({
  used = 500,
  limit = 500,
  unit = "AI runs",
  shortUnit = "runs",
  period = "this month",
  planName = "Team",
  secondsUntilReset = 3 * 86400 + 4 * 3600 + 12 * 60 + 8,
  resetDate = "Nov 1",
  upgrade = { plan: "Pro", limit: 2000 },
  stillWorks = ["Editing and comments", "Search across projects", "Exports and the API"],
  paused = ["AI summaries", "Auto-tagging uploads", "Ask Ridgeline"],
  upgrading = false,
  secondaryLabel = "Ask your admin",
  secondaryDoneLabel = "Admin notified",
  onUpgrade,
  onSecondary,
  onReset,
  className,
}: LimitReachedProps) {
  const reduce = useSafeReducedMotion();
  const left = useCountdown(secondsUntilReset, onReset);
  const [asked, setAsked] = useState(false);
  const atLimit = used >= limit;
  const fraction = limit > 0 ? Math.min(1, used / limit) : 1;
  const percent = Math.round(fraction * 100);
  const t = split(left);
  const canUpgrade = !!upgrade && upgrade.limit > limit;

  useEffect(() => {
    if (!atLimit) setAsked(false);
  }, [atLimit]);

  return (
    <section
      aria-label={`${unit} usage`}
      className={cn("@container w-full max-w-md overflow-hidden rounded-2xl border bg-card shadow-xs/5", className)}
    >
      <div className="grid gap-5 p-5">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl border bg-card shadow-xs/5 transition-colors duration-300 [&_svg]:size-5",
              atLimit ? "text-warning-foreground" : "text-success-foreground",
            )}
          >
            <AnimatePresence initial={false} mode="popLayout">
              <motion.span
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
                key={atLimit ? "limit" : "ok"}
                transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              >
                {atLimit ? <GaugeIcon /> : <SparklesIcon />}
              </motion.span>
            </AnimatePresence>
          </span>
          <div className="grid min-w-0 gap-1">
            <h3 aria-live="polite" className="text-balance font-semibold text-base tabular-nums">
              {atLimit ? `You've used all ${format(limit)} ${unit} ${period}` : `${format(limit - used)} ${unit} left ${period}`}
            </h3>
            <p className="text-pretty text-muted-foreground text-sm">
              {atLimit
                ? `AI features are paused until your ${planName} plan resets. Everything else works as usual.`
                : "Paused features are back on."}
            </p>
          </div>
        </div>

        <div className="grid gap-2">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="font-medium">
              <span className="sr-only">{`${format(used)} of ${format(limit)} ${shortUnit} used`}</span>
              <Roll reduce={reduce} text={format(used)} />
              <span aria-hidden className="text-muted-foreground">
                {" of "}
                <Roll reduce={reduce} text={format(limit)} /> {shortUnit}
              </span>
            </span>
            <span className={cn("font-medium transition-colors duration-300", atLimit ? "text-warning-foreground" : "text-muted-foreground")}>
              <span className="sr-only">{`${percent}%`}</span>
              <Roll reduce={reduce} text={`${percent}%`} />
            </span>
          </div>
          <div
            aria-label={`${unit} used`}
            aria-valuemax={limit}
            aria-valuemin={0}
            aria-valuenow={used}
            className="h-2 overflow-hidden rounded-full bg-muted"
            role="meter"
          >
            <motion.div
              animate={{ scaleX: fraction }}
              className={cn("h-full origin-left rounded-full transition-colors duration-500", atLimit ? "bg-warning" : "bg-primary")}
              initial={false}
              transition={reduce ? { duration: 0 } : meterSpring}
            />
          </div>
          <p className="flex items-center gap-1.5 text-muted-foreground text-xs">
            <ClockIcon aria-hidden className="size-3.5 shrink-0" />
            <span className="sr-only">{`Resets in ${spoken(left)}, on ${resetDate}`}</span>
            <span aria-hidden className="inline-flex items-baseline gap-1">
              Resets in
              <span className="inline-flex items-baseline gap-1 font-medium text-foreground">
                <span>
                  <Roll reduce={reduce} text={String(t.d)} />
                  <span className="text-muted-foreground">d</span>
                </span>
                <span>
                  <Roll reduce={reduce} text={pad(t.h)} />
                  <span className="text-muted-foreground">h</span>
                </span>
                <span>
                  <Roll reduce={reduce} text={pad(t.m)} />
                  <span className="text-muted-foreground">m</span>
                </span>
                <span>
                  <Roll reduce={reduce} text={pad(t.s)} />
                  <span className="text-muted-foreground">s</span>
                </span>
              </span>
              <span className="hidden @xs:inline">· {resetDate}</span>
            </span>
          </p>
        </div>

        <div className="grid gap-4 @sm:grid-cols-2">
          <FeatureList items={stillWorks} on reduce={reduce} title="Still works" />
          <FeatureList items={paused} on={!atLimit} reduce={reduce} title={atLimit ? "Paused" : "Back on"} />
        </div>
      </div>

      <div className="flex min-h-15 flex-wrap items-center gap-2 border-t bg-muted/40 px-5 py-3">
        <AnimatePresence initial={false} mode="popLayout">
          {atLimit ? (
            <motion.div
              animate={{ opacity: 1 }}
              className="flex w-full flex-wrap gap-2 @max-sm:*:w-full"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              key="actions"
              transition={{ duration: 0.18 }}
            >
              {canUpgrade && upgrade && (
                <Button loading={upgrading} onClick={onUpgrade}>
                  Upgrade to {upgrade.plan}
                  <span className="font-normal text-primary-foreground/70 tabular-nums in-data-loading:text-transparent">
                    {format(upgrade.limit)} {shortUnit}
                  </span>
                </Button>
              )}
              <Button
                disabled={asked}
                onClick={() => {
                  onSecondary?.();
                  if (secondaryDoneLabel) setAsked(true);
                }}
                variant="outline"
              >
                {asked && <CheckIcon />}
                {asked ? secondaryDoneLabel : secondaryLabel}
              </Button>
            </motion.div>
          ) : (
            <motion.p
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 text-sm"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              key="ok"
              transition={{ duration: 0.18 }}
            >
              <span className="flex size-5 items-center justify-center rounded-full bg-success/12 text-success-foreground">
                <svg aria-hidden className="size-3" fill="none" viewBox="0 0 16 16">
                  <motion.path
                    animate={{ pathLength: 1 }}
                    d="M3.5 8.5l3 3 6-7"
                    initial={reduce ? false : { pathLength: 0 }}
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.2}
                    transition={{ duration: 0.32, delay: 0.15, ease: [0.65, 0, 0.35, 1] }}
                  />
                </svg>
              </span>
              {`You're on ${planName} · ${format(limit)} ${unit} a month`}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

function FeatureList({ title, items, on, reduce }: { title: string; items: string[]; on: boolean; reduce: boolean }) {
  return (
    <div className="grid content-start gap-2">
      <h4 className="font-medium text-muted-foreground text-xs">{title}</h4>
      <ul className="grid gap-1.5">
        {items.map((item, i) => (
          <li
            className={cn("flex items-center gap-2 text-sm transition-colors duration-300", on ? "text-foreground" : "text-muted-foreground")}
            key={item}
          >
            <span className="relative flex size-4 shrink-0 items-center justify-center [&_svg]:size-4">
              <AnimatePresence initial={false} mode="popLayout">
                <motion.span
                  animate={{ opacity: 1, scale: 1 }}
                  className={on ? "text-success-foreground" : "text-muted-foreground"}
                  exit={{ opacity: 0, scale: 0.6 }}
                  initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
                  key={on ? "on" : "off"}
                  transition={{ ...glide, delay: reduce ? 0 : 0.12 + i * 0.04 }}
                >
                  {on ? <CheckIcon aria-hidden /> : <CirclePauseIcon aria-hidden />}
                </motion.span>
              </AnimatePresence>
            </span>
            {item}
            {!on && <span className="sr-only">(paused)</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
