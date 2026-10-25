"use client";

import { ArrowDownRightIcon, ClockIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type KeyboardEvent, useMemo, useRef, useState } from "react";
import { Tabs, TabsList, TabsTab } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export interface FunnelSegment {
  label: string;
  value: number;
}

export interface FunnelStep {
  id: string;
  label: string;
  value: number;
  breakdown?: FunnelSegment[];
  medianTime?: string;
}

export type FunnelMode = "count" | "percent";

export interface FunnelProps {
  title?: string;
  caption?: string;
  steps?: FunnelStep[];
  defaultMode?: FunnelMode;
  segmentColors?: string[];
  locale?: string;
  className?: string;
}

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const SEGMENT_COLORS = ["var(--color-violet-500)", "var(--color-sky-600)", "var(--color-amber-600)", "var(--color-rose-600)"];
const TIP_W = 216;

const split = (value: number, shares: number[]) => {
  const raw = shares.map((s) => Math.round(value * s));
  raw[0] += value - raw.reduce((a, b) => a + b, 0);
  return raw;
};
const channels = (value: number, shares: number[]) =>
  split(value, shares).map((v, i) => ({ label: ["Organic", "Paid", "Referral"][i], value: v }));

const defaultSteps: FunnelStep[] = [
  { id: "visit", label: "Visited pricing", value: 48210, breakdown: channels(48210, [0.52, 0.34, 0.14]) },
  { id: "start", label: "Started signup", value: 18340, breakdown: channels(18340, [0.49, 0.33, 0.18]), medianTime: "3m" },
  { id: "verify", label: "Verified email", value: 14905, breakdown: channels(14905, [0.5, 0.31, 0.19]), medianTime: "6m" },
  { id: "workspace", label: "Created workspace", value: 8822, breakdown: channels(8822, [0.53, 0.26, 0.21]), medianTime: "1.4h" },
  { id: "invite", label: "Invited a teammate", value: 4104, breakdown: channels(4104, [0.55, 0.21, 0.24]), medianTime: "1.8 days" },
  { id: "paid", label: "Upgraded to paid", value: 2318, breakdown: channels(2318, [0.57, 0.17, 0.26]), medianTime: "6 days" },
];

function RollingNumber({ text, className }: { text: string; className?: string }) {
  const reduce = useReducedMotion();
  let d = 0;
  let o = 0;
  const glyphs = [...text]
    .reverse()
    .map((ch) => {
      const isDigit = ch >= "0" && ch <= "9";
      return { ch, key: isDigit ? `d${d++}` : `s${o++}${ch}`, digit: isDigit ? Number(ch) : null };
    })
    .reverse();
  return (
    <span className={cn("relative inline-flex whitespace-nowrap tabular-nums leading-none", className)}>
      <span className="sr-only">{text}</span>
      <span aria-hidden className="inline-flex [--row:1.15em]">
        {glyphs.map((g) =>
          g.digit === null ? (
            <span className="inline-block h-(--row) leading-(--row)" key={g.key}>
              {g.ch}
            </span>
          ) : (
            <span
              className="relative inline-block h-(--row) overflow-hidden"
              key={g.key}
              style={{ maskImage: "linear-gradient(transparent, black 18%, black 82%, transparent)" }}
            >
              <span className="invisible block leading-(--row)">0</span>
              <motion.span
                animate={{ y: `${-g.digit * 10}%` }}
                className="absolute inset-x-0 top-0 flex flex-col items-center"
                initial={false}
                transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 30 }}
              >
                {DIGITS.map((n) => (
                  <span className="block h-(--row) leading-(--row)" key={n}>
                    {n}
                  </span>
                ))}
              </motion.span>
            </span>
          ),
        )}
      </span>
    </span>
  );
}

export function Funnel({
  title = "Signup funnel",
  caption = "Last 30 days",
  steps = defaultSteps,
  defaultMode = "count",
  segmentColors = SEGMENT_COLORS,
  locale = "en-US",
  className,
}: FunnelProps) {
  const reduce = useReducedMotion();
  const listRef = useRef<HTMLOListElement>(null);
  const rowRefs = useRef<(HTMLLIElement | null)[]>([]);
  const [mode, setMode] = useState<FunnelMode>(defaultMode);
  const [active, setActive] = useState<number | null>(null);
  const [tip, setTip] = useState({ x: 0, y: 0, above: false });

  const num = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const pct = (v: number, digits = 1) => `${(v * 100).toFixed(digits)}%`;
  const top = steps[0]?.value || 1;
  const drops = steps.map((s, i) => (i === 0 ? 0 : 1 - s.value / (steps[i - 1].value || 1)));
  const worst = drops.reduce((w, d, i) => (d > drops[w] ? i : w), 1);
  const overall = (steps.at(-1)?.value ?? 0) / top;

  function placeFor(i: number) {
    const row = rowRefs.current[i];
    const list = listRef.current;
    if (!row || !list) return;
    const bar = (steps[i].value / top) * list.clientWidth;
    const below = row.offsetTop + row.offsetHeight / 2 < list.clientHeight * 0.6;
    setTip({
      x: Math.max(0, Math.min(bar - 24, list.clientWidth - TIP_W)),
      y: below ? row.offsetTop + row.offsetHeight + 8 : row.offsetTop - 8,
      above: !below,
    });
  }

  function show(i: number) {
    setActive(i);
    placeFor(i);
  }

  function onKeyDown(e: KeyboardEvent<HTMLLIElement>, i: number) {
    const next =
      e.key === "ArrowDown" ? i + 1 : e.key === "ArrowUp" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? steps.length - 1 : null;
    if (e.key === "Escape") setActive(null);
    if (next === null || next < 0 || next >= steps.length) return;
    e.preventDefault();
    rowRefs.current[next]?.focus();
  }

  const flipY = tip.above;
  const step = active === null ? null : steps[active];

  if (steps.length === 0) {
    return (
      <section
        aria-label={title}
        className={cn("w-full max-w-[460px] rounded-2xl border bg-card p-5 text-card-foreground shadow-xs/5", className)}
      >
        <h3 className="text-muted-foreground text-sm">{title}</h3>
        <p className="mt-6 mb-4 text-center text-muted-foreground text-xs">No one has entered this funnel yet.</p>
      </section>
    );
  }

  return (
    <section
      aria-label={title}
      className={cn("w-full max-w-[460px] rounded-2xl border bg-card p-5 text-card-foreground shadow-xs/5", className)}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h3 className="text-muted-foreground text-sm">{title}</h3>
          <div className="flex items-baseline gap-2">
            <RollingNumber className="font-semibold text-3xl tracking-tight" text={pct(overall)} />
            <span className="text-muted-foreground text-xs">end to end</span>
          </div>
          <span className="text-muted-foreground text-xs tabular-nums">
            {num.format(top)} entered · {caption}
          </span>
        </div>
        <Tabs onValueChange={(v) => setMode(v as FunnelMode)} value={mode}>
          <TabsList aria-label="Show values as">
            <TabsTab className="px-2 text-xs sm:text-xs" value="count">
              Count
            </TabsTab>
            <TabsTab className="px-2 text-xs sm:text-xs" value="percent">
              %
            </TabsTab>
          </TabsList>
        </Tabs>
      </header>

      <div className="relative mt-5">
        <ol
          aria-label={`${title} steps`}
          className="flex flex-col gap-2.5"
          onPointerLeave={() => setActive(null)}
          ref={listRef}
        >
          {steps.map((s, i) => {
            const share = s.value / top;
            const prevShare = i === 0 ? share : steps[i - 1].value / top;
            const lost = i === 0 ? 0 : steps[i - 1].value - s.value;
            const dim = active !== null && active !== i;
            const value = mode === "count" ? num.format(s.value) : pct(share);
            return (
              <li
                aria-label={`${i + 1}. ${s.label}: ${num.format(s.value)}, ${pct(share)} of entrants${i ? `, ${pct(drops[i])} dropped from the previous step` : ""}`}
                className="group/step relative cursor-default rounded-lg outline-none ring-offset-4 ring-offset-card focus-visible:ring-2 focus-visible:ring-ring"
                key={s.id}
                onBlur={() => setActive(null)}
                onFocus={() => show(i)}
                onKeyDown={(e) => onKeyDown(e, i)}
                onPointerEnter={() => show(i)}
                ref={(el) => {
                  rowRefs.current[i] = el;
                }}
                tabIndex={0}
              >
                <div
                  className={cn(
                    "mb-1.5 flex items-baseline justify-between gap-3 text-xs transition-opacity duration-150",
                    dim && "opacity-50",
                  )}
                >
                  <span className="flex min-w-0 items-baseline gap-2">
                    <span className="w-3 shrink-0 text-muted-foreground tabular-nums">{i + 1}</span>
                    <span className="truncate font-medium">{s.label}</span>
                  </span>
                  <RollingNumber className="shrink-0 font-medium" text={value} />
                </div>
                <div className="relative ms-5 h-5">
                  {i > 0 ? (
                    <motion.div
                      animate={{ opacity: 1 }}
                      className={cn(
                        "absolute inset-y-0 flex items-center justify-end rounded-e-md pe-1.5 transition-opacity duration-150",
                        dim && "opacity-40",
                      )}
                      initial={{ opacity: 0 }}
                      style={{
                        left: `${share * 100}%`,
                        width: `${(prevShare - share) * 100}%`,
                        backgroundImage:
                          "repeating-linear-gradient(135deg, color-mix(in oklab, var(--color-foreground) 13%, transparent) 0 1px, transparent 1px 5px)",
                      }}
                      transition={{ duration: reduce ? 0 : 0.25, delay: reduce ? 0 : 0.35 + i * 0.04 }}
                    >
                      {(prevShare - share) * 100 > 14 ? (
                        <span
                          className={cn(
                            "inline-flex items-center gap-0.5 rounded-sm bg-card/90 px-1 text-[11px] tabular-nums leading-4",
                            i === worst ? "text-destructive-foreground" : "text-muted-foreground",
                          )}
                        >
                          <ArrowDownRightIcon className="size-3" />
                          {mode === "count" ? num.format(lost) : pct(drops[i], 0)}
                        </span>
                      ) : null}
                    </motion.div>
                  ) : null}
                  <motion.div
                    animate={{ clipPath: `inset(0 0% 0 0 round ${i === 0 ? "6px" : "6px 0 0 6px"})` }}
                    className={cn(
                      "absolute inset-y-0 left-0 bg-primary transition-opacity duration-150",
                      i === 0 ? "rounded-md" : "rounded-s-md",
                      dim && "opacity-40",
                    )}
                    initial={{ clipPath: `inset(0 100% 0 0 round ${i === 0 ? "6px" : "6px 0 0 6px"})` }}
                    style={{ width: `${Math.max(share * 100, 1.5)}%` }}
                    transition={reduce ? { duration: 0 } : { duration: 0.5, delay: i * 0.04, ease: [0.23, 1, 0.32, 1] }}
                  />
                  {i > 0 && (prevShare - share) * 100 <= 14 ? (
                    <span
                      className={cn(
                        "absolute top-1/2 inline-flex -translate-y-1/2 items-center gap-0.5 ps-1.5 text-[11px] tabular-nums",
                        i === worst ? "text-destructive-foreground" : "text-muted-foreground",
                      )}
                      style={{ left: `${prevShare * 100}%` }}
                    >
                      <ArrowDownRightIcon className="size-3" />
                      {mode === "count" ? num.format(lost) : pct(drops[i], 0)}
                    </span>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>

        <AnimatePresence>
          {step && active !== null ? (
            <motion.div
              animate={{ opacity: 1, scale: 1 }}
              className={cn(
                "pointer-events-none absolute z-10 rounded-xl border bg-popover p-3 text-popover-foreground text-xs shadow-lg/5",
                flipY && "-translate-y-full",
              )}
              exit={{ opacity: 0, transition: { duration: reduce ? 0 : 0.1 } }}
              initial={{ opacity: 0, scale: reduce ? 1 : 0.96 }}
              style={{
                width: TIP_W,
                left: tip.x,
                top: tip.y,
                originX: 0,
                originY: flipY ? 1 : 0,
              }}
              transition={{ duration: reduce ? 0 : 0.14, ease: [0.23, 1, 0.32, 1] }}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate font-medium">{step.label}</span>
                <span className="shrink-0 text-muted-foreground tabular-nums">Step {active + 1}</span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 tabular-nums">
                <div className="rounded-lg bg-muted px-2 py-1.5">
                  <div className="text-muted-foreground">{active ? "Converted" : "Entered"}</div>
                  <div className="font-medium">{active ? pct(1 - drops[active]) : num.format(step.value)}</div>
                </div>
                <div className="rounded-lg bg-muted px-2 py-1.5">
                  <div className="text-muted-foreground">{active ? "Dropped" : "Of total"}</div>
                  <div className={cn("font-medium", active === worst && "text-destructive-foreground")}>
                    {active ? num.format(steps[active - 1].value - step.value) : "100%"}
                  </div>
                </div>
              </div>
              {step.breakdown?.length ? (
                <div className="mt-2.5 flex flex-col gap-1.5">
                  <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-full">
                    {step.breakdown.map((seg, k) => (
                      <div
                        className="h-full first:rounded-s-full last:rounded-e-full"
                        key={seg.label}
                        style={{ flexGrow: seg.value, background: segmentColors[k % segmentColors.length] }}
                      />
                    ))}
                  </div>
                  {step.breakdown.map((seg, k) => (
                    <div className="flex items-center gap-2 tabular-nums" key={seg.label}>
                      <span className="size-2 rounded-full" style={{ background: segmentColors[k % segmentColors.length] }} />
                      <span className="text-muted-foreground">{seg.label}</span>
                      <span className="ms-auto font-medium">{num.format(seg.value)}</span>
                      <span className="w-10 text-right text-muted-foreground">{pct(seg.value / (step.value || 1), 0)}</span>
                    </div>
                  ))}
                </div>
              ) : null}
              {step.medianTime ? (
                <div className="mt-2.5 flex items-center gap-1.5 border-t pt-2 text-muted-foreground">
                  <ClockIcon className="size-3" />
                  Median wait {step.medianTime}
                </div>
              ) : null}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {steps.length > 1 ? (
        <footer className="mt-4 flex items-center gap-1.5 text-muted-foreground text-xs">
          <span className="inline-block size-2 shrink-0 rounded-full bg-destructive" />
          <span className="shrink-0">Biggest drop:</span>
          <span className="truncate font-medium text-foreground">{steps[worst].label}</span>
          <span className="shrink-0 tabular-nums">({pct(drops[worst], 0)} lost)</span>
        </footer>
      ) : null}
    </section>
  );
}
