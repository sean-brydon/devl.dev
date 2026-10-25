"use client";

import { FlameIcon, StarIcon, TrophyIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type KeyboardEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface StreakDay {
  date: string;
  count: number;
}

export interface StreakHeatmapProps {
  title?: string;
  data?: StreakDay[];
  endDate?: string;
  unit?: [string, string];
  color?: string;
  weekStart?: 0 | 1;
  locale?: string;
  className?: string;
}

const DAY = 86400000;
const GAP = 2;
const LABEL_W = 28;
const MONTH_H = 16;
const WEEKS = 53;
const MIX = [0, 30, 52, 76, 100];

const toUtc = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};
const toIso = (t: number) => new Date(t).toISOString().slice(0, 10);

function mulberry(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sampleYear(end = "2026-10-24"): StreakDay[] {
  const rand = mulberry(7);
  const endT = toUtc(end);
  const out: StreakDay[] = [];
  for (let i = 370; i >= 0; i--) {
    const t = endT - i * DAY;
    const date = new Date(t);
    const dow = date.getUTCDay();
    const iso = toIso(t);
    const weekend = dow === 0 || dow === 6;
    const breakTime = iso >= "2026-08-08" && iso <= "2026-08-23";
    const holidays = iso >= "2025-12-22" && iso <= "2026-01-02";
    const springRun = iso >= "2026-03-02" && iso <= "2026-04-11";
    const liveRun = i <= 22;
    const season = Math.round((1 + 0.35 * Math.sin((i / 365) * Math.PI * 2 + 1.2)) * 100) / 100;
    let active = rand() < (weekend ? 0.28 : 0.84);
    if (breakTime || holidays) active = rand() < 0.05;
    if (springRun || liveRun) active = true;
    if (i === 23) active = false;
    if (!active) continue;
    const burst = rand() < 0.06 ? 2.4 : 1;
    const count = Math.max(1, Math.round((weekend ? 2 : 5) * season * burst * (0.4 + rand() * 1.4)));
    out.push({ date: iso, count });
  }
  return out;
}

const defaultData = sampleYear();

interface Cell {
  t: number;
  iso: string;
  count: number;
  level: number;
  col: number;
  row: number;
  future: boolean;
}

interface Run {
  start: number;
  end: number;
  length: number;
}

export function StreakHeatmap({
  title = "Activity",
  data = defaultData,
  endDate,
  unit = ["contribution", "contributions"],
  color = "var(--color-emerald-500)",
  weekStart = 1,
  locale = "en-US",
  className,
}: StreakHeatmapProps) {
  const reduce = useReducedMotion();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(560);
  const [active, setActive] = useState<number | null>(null);
  const [focus, setFocus] = useState<{ key: string; cells: Set<number> } | null>(null);
  const [announce, setAnnounce] = useState("");
  const [scrollX, setScrollX] = useState(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    el.scrollLeft = el.scrollWidth;
    return () => ro.disconnect();
  }, []);

  const model = useMemo(() => {
    const counts = new Map(data.map((d) => [d.date, d.count]));
    const last = endDate ?? data.reduce((m, d) => (d.date > m ? d.date : m), data[0]?.date ?? "2026-10-24");
    const endT = toUtc(last);
    const endDow = (new Date(endT).getUTCDay() - weekStart + 7) % 7;
    const firstT = endT - (endDow + (WEEKS - 1) * 7) * DAY;
    const sorted = [...data.filter((d) => d.count > 0).map((d) => d.count)].sort((a, b) => a - b);
    const q = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] ?? 1;
    const cuts = [q(0.25), q(0.55), q(0.85)];
    const cells: Cell[] = [];
    for (let i = 0; i < WEEKS * 7; i++) {
      const t = firstT + i * DAY;
      const iso = toIso(t);
      const count = counts.get(iso) ?? 0;
      const level = count <= 0 ? 0 : count <= cuts[0] ? 1 : count <= cuts[1] ? 2 : count <= cuts[2] ? 3 : 4;
      cells.push({ t, iso, count, level, col: Math.floor(i / 7), row: i % 7, future: t > endT });
    }
    const endIdx = cells.findIndex((c) => c.t === endT);

    const runs: Run[] = [];
    const runOf = new Map<number, Run>();
    let start = -1;
    for (let i = 0; i <= endIdx + 1; i++) {
      const on = i <= endIdx && cells[i].count > 0;
      if (on && start < 0) start = i;
      if (!on && start >= 0) {
        const run = { start, end: i - 1, length: i - start };
        runs.push(run);
        for (let k = start; k < i; k++) runOf.set(k, run);
        start = -1;
      }
    }
    const longest = runs.reduce<Run | null>((best, r) => (!best || r.length > best.length ? r : best), null);
    const tail = runs.at(-1);
    const current = tail && (tail.end === endIdx || tail.end === endIdx - 1) ? tail : null;
    const best = cells.slice(0, endIdx + 1).reduce((b, c, i) => (c.count > cells[b].count ? i : b), 0);
    const total = cells.reduce((sum, c) => sum + (c.future ? 0 : c.count), 0);

    const months: { col: number; label: string }[] = [];
    for (let col = 0; col < WEEKS; col++) {
      const firstOfMonth = cells.slice(col * 7, col * 7 + 7).find((c) => new Date(c.t).getUTCDate() === 1);
      const atStart = col === 0 && new Date(cells[0].t).getUTCDate() <= 21;
      if (firstOfMonth || atStart) {
        const t = firstOfMonth?.t ?? cells[6].t;
        if (months.length && col - months[months.length - 1].col < 3) {
          if (months.length === 1 && !firstOfMonth) continue;
          months.pop();
        }
        months.push({ col, label: new Date(t).toLocaleDateString(locale, { month: "short", timeZone: "UTC" }) });
      }
    }
    return { cells, endIdx, runOf, longest, current, best, total, months, firstT, endT };
  }, [data, endDate, weekStart, locale]);

  const { cells, endIdx, runOf, longest, current, best, total, months } = model;
  const cell = Math.max(8, Math.min(13, (width + GAP) / WEEKS - GAP));
  const pitch = cell + GAP;
  const svgW = WEEKS * pitch - GAP;
  const svgH = MONTH_H + 7 * pitch - GAP;
  const radius = Math.max(2, Math.round(cell / 4));

  const fmtDate = (t: number, opts: Intl.DateTimeFormatOptions) =>
    new Date(t).toLocaleDateString(locale, { timeZone: "UTC", ...opts });
  const noun = (n: number) => (n === 1 ? unit[0] : unit[1]);
  const num = new Intl.NumberFormat(locale);
  const fill = (level: number) =>
    level === 0
      ? "color-mix(in oklab, var(--color-foreground) 7%, var(--color-card))"
      : `color-mix(in oklab, ${color} ${MIX[level]}%, var(--color-card))`;

  const range = (run: Run | null) => new Set(run ? Array.from({ length: run.length }, (_, k) => run.start + k) : []);
  const runLabel = (run: Run | null) => {
    if (!run) return "No active run";
    const s = fmtDate(cells[run.start].t, { month: "short", day: "numeric" });
    const e = run.end === endIdx ? "today" : fmtDate(cells[run.end].t, { month: "short", day: "numeric" });
    return `${s} – ${e}`;
  };

  function describe(i: number) {
    const c = cells[i];
    return `${c.count ? num.format(c.count) : "No"} ${noun(c.count)} on ${fmtDate(c.t, { weekday: "long", month: "long", day: "numeric" })}`;
  }

  function move(i: number) {
    const next = Math.max(0, Math.min(endIdx, i));
    setActive(next);
    setAnnounce(describe(next));
    const el = scrollRef.current;
    if (el) {
      const x = cells[next].col * pitch;
      if (x < el.scrollLeft) el.scrollLeft = x - pitch;
      else if (x + pitch > el.scrollLeft + el.clientWidth) el.scrollLeft = x + pitch * 2 - el.clientWidth;
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const cur = active ?? endIdx;
    const map: Record<string, number> = {
      ArrowRight: cur + 7,
      ArrowLeft: cur - 7,
      ArrowDown: cur + 1,
      ArrowUp: cur - 1,
      Home: 0,
      End: endIdx,
    };
    if (e.key === "Escape") {
      setActive(null);
      return;
    }
    if (!(e.key in map)) return;
    e.preventDefault();
    move(map[e.key]);
  }

  const activeCell = active === null ? null : cells[active];
  const activeRun = active === null ? undefined : runOf.get(active);
  const tipX = activeCell ? activeCell.col * pitch + cell / 2 : 0;
  const tipY = activeCell ? MONTH_H + activeCell.row * pitch : 0;
  const visibleX = LABEL_W + tipX - scrollX;
  const align = visibleX < 90 ? "start" : visibleX > LABEL_W + width - 90 ? "end" : "center";
  const dayRows = weekStart === 1 ? ["Mon", "", "Wed", "", "Fri", "", ""] : ["", "Mon", "", "Wed", "", "Fri", ""];
  const highlight = focus?.cells ?? null;

  return (
    <section
      aria-label={title}
      className={cn("@container w-full max-w-[620px] rounded-2xl border bg-card p-5 text-card-foreground shadow-xs/5", className)}
    >
      <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="font-medium text-sm">{title}</h3>
        <p className="text-muted-foreground text-xs tabular-nums">
          <span className="font-medium text-foreground">{num.format(total)}</span> {noun(total)} in the last year
        </p>
      </header>

      <div className="mt-4 grid grid-cols-3 gap-2 @max-[26rem]:gap-1.5">
        <Callout
          active={focus?.key === "current"}
          detail={runLabel(current)}
          shortDetail={current ? `Since ${fmtDate(cells[current.start].t, { month: "short", day: "numeric" })}` : "No run"}
          icon={<FlameIcon />}
          label="Current streak"
          short="Streak"
          onFocusChange={(on) => setFocus(on ? { key: "current", cells: range(current) } : null)}
          tone="text-orange-600 dark:text-orange-400"
          value={current ? `${current.length} days` : "0 days"}
        />
        <Callout
          active={focus?.key === "longest"}
          detail={runLabel(longest)}
          shortDetail={
            !longest
              ? "No run"
              : longest.end >= endIdx - 1
                ? `Since ${fmtDate(cells[longest.start].t, { month: "short", day: "numeric" })}`
                : `Ended ${fmtDate(cells[longest.end].t, { month: "short", day: "numeric" })}`
          }
          icon={<TrophyIcon />}
          label="Longest streak"
          short="Longest"
          onFocusChange={(on) => setFocus(on ? { key: "longest", cells: range(longest) } : null)}
          tone="text-amber-600 dark:text-amber-400"
          value={longest ? `${longest.length} days` : "0 days"}
        />
        <Callout
          active={focus?.key === "best"}
          detail={cells[best].count ? fmtDate(cells[best].t, { month: "short", day: "numeric" }) : "No activity yet"}
          icon={<StarIcon />}
          label="Best day"
          short="Best day"
          onFocusChange={(on) => setFocus(on ? { key: "best", cells: new Set([best]) } : null)}
          tone="text-sky-600 dark:text-sky-400"
          value={cells[best].count ? num.format(cells[best].count) : "–"}
        />
      </div>

      <div className="relative mt-4 flex">
        <svg aria-hidden className="block shrink-0" height={svgH} width={LABEL_W}>
          {dayRows.map((d, r) =>
            d ? (
              <text
                className="fill-muted-foreground text-[10px]"
                dominantBaseline="central"
                key={d}
                x={0}
                y={MONTH_H + r * pitch + cell / 2}
              >
                {d}
              </text>
            ) : null,
          )}
        </svg>
        <div
          aria-label={`${title} calendar. Use arrow keys to move between days.`}
          className="-m-[3px] min-w-0 flex-1 overflow-x-auto overscroll-x-contain rounded-md p-[3px] outline-none ring-offset-2 ring-offset-card [scrollbar-width:none] focus-visible:ring-2 focus-visible:ring-ring"
          onBlur={() => setActive(null)}
          onFocus={(e) => e.target === e.currentTarget && active === null && move(endIdx)}
          onKeyDown={onKeyDown}
          onPointerLeave={() => setActive(null)}
          onScroll={(e) => setScrollX(e.currentTarget.scrollLeft)}
          ref={scrollRef}
          role="application"
          tabIndex={0}
        >
          <svg aria-hidden className="block" height={svgH} width={svgW}>
            {months.map((m) => (
              <text className="fill-muted-foreground text-[10px]" key={`${m.col}-${m.label}`} x={m.col * pitch} y={10}>
                {m.label}
              </text>
            ))}
            {Array.from({ length: WEEKS }, (_, col) => (
              <motion.g
                animate={{ opacity: 1 }}
                initial={{ opacity: 0 }}
                key={col}
                transition={{ duration: reduce ? 0 : 0.3, delay: reduce ? 0 : Math.min(0.45, col * 0.008), ease: "easeOut" }}
              >
                {cells.slice(col * 7, col * 7 + 7).map((c, r) => {
                  const i = col * 7 + r;
                  if (c.future) return null;
                  const dim = highlight ? !highlight.has(i) : false;
                  return (
                    <rect
                      className="transition-opacity duration-150 ease-out"
                      height={cell}
                      key={c.iso}
                      onPointerEnter={() => setActive(i)}
                      opacity={dim ? 0.22 : 1}
                      rx={radius}
                      style={{ fill: fill(c.level) }}
                      width={cell}
                      x={col * pitch}
                      y={MONTH_H + r * pitch}
                    />
                  );
                })}
              </motion.g>
            ))}
            {activeCell ? (
              <rect
                className="pointer-events-none fill-none stroke-foreground"
                height={cell + 2}
                rx={radius + 1}
                strokeWidth={1.5}
                width={cell + 2}
                x={tipX - cell / 2 - 1}
                y={tipY - 1}
              />
            ) : null}
          </svg>
        </div>

        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-0 w-5 bg-linear-to-r from-card to-transparent transition-opacity duration-150",
            scrollX > 2 ? "opacity-100" : "opacity-0",
          )}
          style={{ left: LABEL_W }}
        />
        <AnimatePresence>
          {activeCell ? (
            <motion.div
              animate={{ opacity: 1, scale: 1 }}
              className={cn(
                "pointer-events-none absolute z-10 whitespace-nowrap rounded-lg border bg-popover px-2.5 py-1.5 text-popover-foreground text-xs shadow-md/5",
                align === "center" && "-translate-x-1/2",
                align === "end" && "-translate-x-full",
                "-translate-y-full",
              )}
              exit={{ opacity: 0, transition: { duration: reduce ? 0 : 0.1 } }}
              initial={{ opacity: 0, scale: reduce ? 1 : 0.96 }}
              style={{
                left: visibleX + (align === "start" ? -cell / 2 - 4 : align === "end" ? cell / 2 + 4 : 0),
                top: tipY - 8,
                originX: align === "start" ? 0 : align === "end" ? 1 : 0.5,
                originY: 1,
              }}
              transition={{ duration: reduce ? 0 : 0.14, ease: [0.23, 1, 0.32, 1] }}
            >
              <div className="tabular-nums">
                <span className="font-medium">
                  {activeCell.count ? num.format(activeCell.count) : "No"} {noun(activeCell.count)}
                </span>
                <span className="text-muted-foreground">
                  {" "}
                  · {fmtDate(activeCell.t, { weekday: "short", month: "short", day: "numeric" })}
                </span>
              </div>
              {activeRun && activeRun.length >= 3 && active !== null ? (
                <div className="mt-0.5 text-muted-foreground">
                  Day {active - activeRun.start + 1} of a {activeRun.length}-day streak
                </div>
              ) : null}
            </motion.div>
          ) : null}
        </AnimatePresence>
        <span aria-live="polite" className="sr-only">
          {announce}
        </span>
      </div>

      <footer className="mt-3 flex items-center justify-between gap-3 text-muted-foreground text-xs">
        <span className="tabular-nums">
          {fmtDate(model.firstT, { month: "short", year: "numeric" })} – {fmtDate(model.endT, { month: "short", year: "numeric" })}
        </span>
        <div className="flex items-center gap-1.5">
          <span>Less</span>
          <div className="flex gap-0.5" onPointerLeave={() => setFocus(null)}>
            {MIX.map((_, level) => (
              <span
                aria-hidden
                className="size-2.5 rounded-[3px] transition-transform duration-150 ease-out hover:scale-125"
                key={level}
                onPointerEnter={() =>
                  setFocus({
                    key: `level-${level}`,
                    cells: new Set(cells.flatMap((c, i) => (c.level === level && !c.future ? [i] : []))),
                  })
                }
                style={{ background: fill(level) }}
              />
            ))}
          </div>
          <span>More</span>
        </div>
      </footer>
    </section>
  );
}

function Callout({
  label,
  short,
  value,
  detail,
  shortDetail,
  icon,
  tone,
  active,
  onFocusChange,
}: {
  label: string;
  short: string;
  value: string;
  detail: string;
  shortDetail?: string;
  icon: ReactNode;
  tone: string;
  active: boolean;
  onFocusChange: (on: boolean) => void;
}) {
  return (
    <button
      aria-label={`${label}: ${value}, ${detail}. Highlights it on the calendar.`}
      className={cn(
        "flex min-w-0 cursor-default flex-col items-start gap-0.5 rounded-xl border border-transparent bg-muted/60 px-3 py-2.5 @max-[26rem]:px-2 text-left outline-none transition-[background-color,border-color,scale] duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97] dark:bg-muted",
        active && "border-border bg-background dark:bg-accent",
      )}
      onBlur={() => onFocusChange(false)}
      onFocus={() => onFocusChange(true)}
      onPointerEnter={() => onFocusChange(true)}
      onPointerLeave={() => onFocusChange(false)}
      type="button"
    >
      <span className="flex items-center gap-1 text-muted-foreground text-xs">
        <span className={cn("[&_svg]:size-3.5", tone)}>{icon}</span>
        <span className="truncate @max-[26rem]:hidden">{label}</span>
        <span className="truncate @min-[26rem]:hidden">{short}</span>
      </span>
      <span className="font-semibold text-base tabular-nums tracking-tight">{value}</span>
      <span className="w-full truncate text-muted-foreground text-xs tabular-nums @max-[26rem]:hidden">{detail}</span>
      <span className="w-full truncate text-muted-foreground text-xs tabular-nums @min-[26rem]:hidden">
        {shortDetail ?? detail}
      </span>
    </button>
  );
}
