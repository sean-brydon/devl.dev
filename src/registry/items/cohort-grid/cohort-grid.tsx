"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type KeyboardEvent, type PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { Tabs, TabsList, TabsTab } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export interface Cohort {
  label: string;
  size: number;
  retained: number[];
}

export type CohortMode = "percent" | "count";

export interface CohortGridProps {
  title?: string;
  caption?: string;
  cohorts?: Cohort[];
  periodPrefix?: string;
  periodName?: string;
  defaultMode?: CohortMode;
  color?: string;
  locale?: string;
  className?: string;
}

const CELL_W = 38;
const CELL_H = 30;
const LABEL_W = 56;
const SIZE_W = 50;

function mulberry(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sampleCohorts(): Cohort[] {
  const rand = mulberry(42);
  const weeks = ["Aug 24", "Aug 31", "Sep 7", "Sep 14", "Sep 21", "Sep 28", "Oct 5", "Oct 12", "Oct 19"];
  return weeks.map((label, i) => {
    const size = Math.round(980 + rand() * 420 + i * 24);
    const lift = 1 + i * 0.018;
    const retained = Array.from({ length: weeks.length - i }, (_, w) => {
      if (w === 0) return size;
      const curve = 0.2 + 0.3 * Math.exp(-(w - 1) / 2.4);
      return Math.round(size * Math.min(0.95, curve * lift * (0.93 + rand() * 0.14)));
    });
    return { label, size, retained };
  });
}

const defaultCohorts = sampleCohorts();

export function CohortGrid({
  title = "Retention by signup week",
  caption = "Active users each week after signing up",
  cohorts = defaultCohorts,
  periodPrefix = "W",
  periodName = "Week",
  defaultMode = "percent",
  color = "var(--color-violet-500)",
  locale = "en-US",
  className,
}: CohortGridProps) {
  const reduce = useReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<CohortMode>(defaultMode);
  const [active, setActive] = useState<{ r: number; c: number } | null>(null);
  const [tip, setTip] = useState({ x: 0, y: 0 });
  const [announce, setAnnounce] = useState("");
  const [moreRight, setMoreRight] = useState(false);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const check = () => setMoreRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    el.addEventListener("scroll", check, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", check);
    };
  }, []);
  const num = useMemo(() => new Intl.NumberFormat(locale), [locale]);

  const periods = Math.max(...cohorts.map((c) => c.retained.length));
  const avg = useMemo(
    () =>
      Array.from({ length: periods }, (_, p) => {
        let kept = 0;
        let base = 0;
        for (const c of cohorts) {
          if (c.retained[p] === undefined) continue;
          kept += c.retained[p];
          base += c.size;
        }
        return base ? kept / base : 0;
      }),
    [cohorts, periods],
  );

  const rate = (r: number, c: number) => (r === cohorts.length ? avg[c] : cohorts[r].retained[c] / (cohorts[r].size || 1));
  const has = (r: number, c: number) => (r === cohorts.length ? avg[c] > 0 : cohorts[r].retained[c] !== undefined);
  const maxLater = Math.max(...cohorts.flatMap((co) => co.retained.slice(1).map((v) => v / (co.size || 1))), 0.01);
  const strength = (r: number, c: number) => (c === 0 ? 1 : Math.min(1, rate(r, c) / maxLater));
  const label = (r: number, c: number) => {
    if (mode === "percent") return `${Math.round(rate(r, c) * 100)}%`;
    if (r === cohorts.length) return `${Math.round(rate(r, c) * 100)}%`;
    const v = cohorts[r].retained[c];
    return v >= 10000 ? `${Math.round(v / 1000)}k` : num.format(v);
  };

  function describe(r: number, c: number) {
    if (r === cohorts.length) return `Average, ${periodName.toLowerCase()} ${c}: ${(avg[c] * 100).toFixed(1)}% retained`;
    const co = cohorts[r];
    return `${co.label} cohort, ${periodName.toLowerCase()} ${c}: ${num.format(co.retained[c])} of ${num.format(co.size)} active, ${(rate(r, c) * 100).toFixed(1)}%`;
  }

  function placeAt(r: number, c: number) {
    const wrap = wrapRef.current;
    const scroller = scrollRef.current;
    const cell = wrap?.querySelector<HTMLElement>(`[data-cell="${r}-${c}"]`);
    if (!wrap || !cell || !scroller) return;
    const sb = scroller.getBoundingClientRect();
    let b = cell.getBoundingClientRect();
    const leftEdge = sb.left + LABEL_W + SIZE_W;
    if (b.left < leftEdge) scroller.scrollLeft -= leftEdge - b.left + 4;
    else if (b.right > sb.right) scroller.scrollLeft += b.right - sb.right + 4;
    b = cell.getBoundingClientRect();
    const a = wrap.getBoundingClientRect();
    setTip({ x: b.left - a.left + b.width / 2, y: b.top - a.top });
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const target = (e.target as HTMLElement).closest<HTMLElement>("[data-cell]");
    if (!target || !wrapRef.current) {
      setActive(null);
      return;
    }
    const [r, c] = target.dataset.cell!.split("-").map(Number);
    if (active?.r === r && active?.c === c) return;
    const a = wrapRef.current.getBoundingClientRect();
    const b = target.getBoundingClientRect();
    setActive({ r, c });
    setTip({ x: b.left - a.left + b.width / 2, y: b.top - a.top });
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const cur = active ?? { r: 0, c: 1 };
    let { r, c } = cur;
    if (e.key === "ArrowRight") c += 1;
    else if (e.key === "ArrowLeft") c -= 1;
    else if (e.key === "ArrowDown") r += 1;
    else if (e.key === "ArrowUp") r -= 1;
    else if (e.key === "Home") c = 0;
    else if (e.key === "End") c = periods - 1;
    else if (e.key === "Escape") return setActive(null);
    else return;
    e.preventDefault();
    r = Math.max(0, Math.min(cohorts.length, r));
    c = Math.max(0, Math.min(periods - 1, c));
    while (c > 0 && !has(r, c)) c -= 1;
    setActive({ r, c });
    placeAt(r, c);
    setAnnounce(describe(r, c));
  }

  const cellBg = (s: number) =>
    `color-mix(in oklab, ${color} calc(8% + var(--lift) + ${s.toFixed(3)} * (92% - var(--lift))), var(--color-card))`;
  const rows = [...cohorts.map((c, i) => ({ key: c.label, i })), { key: "avg", i: cohorts.length }];
  const wrapW = wrapRef.current?.clientWidth ?? 480;
  const below = tip.y < 120;
  const tipAlign = tip.x < 110 ? "start" : tip.x > wrapW - 110 ? "end" : "center";
  const activeRate = active ? rate(active.r, active.c) : 0;
  const vsAvg = active && active.r < cohorts.length ? (activeRate - avg[active.c]) * 100 : null;

  return (
    <section
      aria-label={title}
      className={cn("w-full max-w-[540px] rounded-2xl [--lift:0%] dark:[--lift:14%] border bg-card p-5 text-card-foreground shadow-xs/5", className)}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h3 className="font-medium text-sm">{title}</h3>
          <p className="text-pretty text-muted-foreground text-xs">{caption}</p>
        </div>
        <Tabs onValueChange={(v) => setMode(v as CohortMode)} value={mode}>
          <TabsList aria-label="Show cells as">
            <TabsTab className="px-2 text-xs sm:text-xs" value="percent">
              %
            </TabsTab>
            <TabsTab className="px-2 text-xs sm:text-xs" value="count">
              Users
            </TabsTab>
          </TabsList>
        </Tabs>
      </header>

      <div className="relative mt-4" ref={wrapRef}>
        <div
          aria-label={`${title}. Use arrow keys to move between cells.`}
          className="overflow-x-auto overscroll-x-contain rounded-lg outline-none ring-offset-2 ring-offset-card [scrollbar-width:none] focus-visible:ring-2 focus-visible:ring-ring"
          onBlur={() => setActive(null)}
          onFocus={(e) => {
            if (e.target === e.currentTarget && !active) {
              setActive({ r: 0, c: 1 });
              requestAnimationFrame(() => placeAt(0, 1));
            }
          }}
          onKeyDown={onKeyDown}
          onPointerLeave={() => setActive(null)}
          onPointerMove={onPointerMove}
          ref={scrollRef}
          role="application"
          tabIndex={0}
        >
          <div
            className="grid w-max gap-[3px] text-xs tabular-nums"
            style={{ gridTemplateColumns: `${LABEL_W}px ${SIZE_W}px repeat(${periods}, ${CELL_W}px)` }}
          >
            <div className="sticky left-0 z-[1] bg-card text-muted-foreground">Cohort</div>
            <div className="pe-2 text-right text-muted-foreground">Users</div>
            {Array.from({ length: periods }, (_, c) => (
              <div
                className={cn("text-center text-muted-foreground", active?.c === c && "text-foreground")}
                key={c}
              >
                {periodPrefix}
                {c}
              </div>
            ))}

            {rows.map(({ key, i: r }) => {
              const isAvg = r === cohorts.length;
              const rowOn = active?.r === r;
              return (
                <div className="contents" key={key}>
                  {isAvg ? <div className="col-span-full my-1 h-px bg-border" /> : null}
                  <div
                    className={cn(
                      "sticky left-0 z-[1] flex items-center bg-card text-muted-foreground",
                      rowOn && "text-foreground",
                    )}
                    style={{ height: CELL_H }}
                  >
                    {isAvg ? "Average" : cohorts[r].label}
                  </div>
                  <div
                    className="flex items-center justify-end pe-2 text-muted-foreground"
                    style={{ height: CELL_H }}
                  >
                    {isAvg ? num.format(Math.round(cohorts.reduce((s, c) => s + c.size, 0) / (cohorts.length || 1))) : num.format(cohorts[r].size)}
                  </div>
                  {Array.from({ length: periods }, (_, c) => {
                    if (!has(r, c)) return <div key={c} />;
                    const s = c === 0 ? 0 : strength(r, c);
                    const dim = active && active.r !== r && active.c !== c;
                    const on = active?.r === r && active?.c === c;
                    return (
                      <div className={cn(dim && "opacity-50")} key={c}>
                        <motion.div
                          animate={{ opacity: 1, scale: 1 }}
                          className={cn(
                            "relative flex items-center justify-center rounded-[6px] text-[11px]",
                            c === 0 ? "text-muted-foreground" : "text-foreground",
                            isAvg && "font-medium",
                            on && "ring-2 ring-foreground ring-offset-1 ring-offset-card",
                          )}
                          data-cell={`${r}-${c}`}
                          initial={{ opacity: 0, scale: 0.95 }}
                          style={{ height: CELL_H, background: c === 0 ? "var(--color-muted)" : cellBg(s) }}
                          transition={{ duration: reduce ? 0 : 0.25, delay: reduce ? 0 : Math.min(0.4, (r + c) * 0.025), ease: [0.23, 1, 0.32, 1] }}
                        >
                          <AnimatePresence initial={false} mode="popLayout">
                            <motion.span
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: reduce ? 0 : -4 }}
                              initial={{ opacity: 0, y: reduce ? 0 : 4 }}
                              key={label(r, c)}
                              transition={{ duration: 0.15 }}
                            >
                              {label(r, c)}
                            </motion.span>
                          </AnimatePresence>
                        </motion.div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-0 right-0 w-8 bg-linear-to-l from-card to-transparent transition-opacity duration-150",
            moreRight ? "opacity-100" : "opacity-0",
          )}
        />
        <AnimatePresence>
          {active ? (
            <motion.div
              animate={{ opacity: 1, scale: 1 }}
              className={cn(
                "pointer-events-none absolute z-10 w-max max-w-[240px] rounded-lg border bg-popover px-2.5 py-2 text-popover-foreground text-xs shadow-md/5",
                tipAlign === "center" && "-translate-x-1/2",
                tipAlign === "end" && "-translate-x-full",
                !below && "-translate-y-full",
              )}
              exit={{ opacity: 0, transition: { duration: reduce ? 0 : 0.1 } }}
              initial={{ opacity: 0, scale: reduce ? 1 : 0.96 }}
              style={{
                left: tip.x + (tipAlign === "start" ? -12 : tipAlign === "end" ? 12 : 0),
                top: below ? tip.y + CELL_H + 6 : tip.y - 6,
                originX: tipAlign === "start" ? 0 : tipAlign === "end" ? 1 : 0.5,
                originY: below ? 0 : 1,
              }}
              transition={{ duration: reduce ? 0 : 0.14, ease: [0.23, 1, 0.32, 1] }}
            >
              <div className="font-medium">
                {active.r === cohorts.length ? "All cohorts" : `Joined week of ${cohorts[active.r].label}`}
                <span className="font-normal text-muted-foreground"> · {periodName} {active.c}</span>
              </div>
              <div className="mt-1 text-muted-foreground tabular-nums">
                {active.r === cohorts.length ? (
                  <>
                    <span className="text-foreground">{(activeRate * 100).toFixed(1)}%</span> still active on average
                  </>
                ) : (
                  <>
                    <span className="text-foreground">{num.format(cohorts[active.r].retained[active.c])}</span> of{" "}
                    {num.format(cohorts[active.r].size)} active · {(activeRate * 100).toFixed(1)}%
                  </>
                )}
              </div>
              {vsAvg !== null && active.c > 0 ? (
                <div
                  className={cn(
                    "mt-0.5 tabular-nums",
                    vsAvg >= 2 ? "text-success-foreground" : vsAvg <= -2 ? "text-destructive-foreground" : "text-muted-foreground",
                  )}
                >
                  {vsAvg >= 0 ? "+" : "−"}
                  {Math.abs(vsAvg).toFixed(1)} pts vs average
                </div>
              ) : null}
            </motion.div>
          ) : null}
        </AnimatePresence>
        <span aria-live="polite" className="sr-only">
          {announce}
        </span>
      </div>

      <footer className="mt-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 text-muted-foreground text-xs">
        <span className="tabular-nums">
          {periodName} 4 retention{" "}
          <span className="font-medium text-foreground">{avg[4] !== undefined ? `${(avg[4] * 100).toFixed(1)}%` : "–"}</span>
        </span>
        <div aria-hidden className="flex items-center gap-1.5">
          <span>0%</span>
          <span className="h-1.5 w-20 rounded-full" style={{ background: `linear-gradient(to right, ${cellBg(0)}, ${cellBg(1)})` }} />
          <span className="tabular-nums">{Math.round(maxLater * 100)}%+</span>
        </div>
      </footer>
    </section>
  );
}
