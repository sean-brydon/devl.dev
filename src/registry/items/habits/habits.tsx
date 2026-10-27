"use client";

import {
  BikeIcon,
  BookOpenIcon,
  CarrotIcon,
  ChevronLeftIcon,
  DropletsIcon,
  DumbbellIcon,
  FlameIcon,
  Flower2Icon,
  FootprintsIcon,
  LanguagesIcon,
  type LucideIcon,
  MinusIcon,
  MoonIcon,
  MusicIcon,
  NotebookPenIcon,
  PersonStandingIcon,
  PlusIcon,
  SparklesIcon,
  SunIcon,
  XIcon,
} from "lucide-react";
import {
  AnimatePresence,
  animate,
  motion,
  PresenceContext,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { type FormEvent, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type HabitIcon =
  | "water"
  | "journal"
  | "stretch"
  | "walk"
  | "read"
  | "sleep"
  | "meditate"
  | "veg"
  | "lift"
  | "music"
  | "sun"
  | "language"
  | "bike";
export type HabitTone = "sky" | "amber" | "violet" | "teal" | "orange" | "rose";
export type HabitTime = "morning" | "anytime" | "evening";

export interface Habit {
  id: string;
  name: string;
  icon: HabitIcon;
  tone: HabitTone;
  time: HabitTime;
  goal?: { count: number; unit: string };
  carry: number;
  week: number[];
  since?: number;
}

export interface HabitsProps {
  className?: string;
  habits?: Habit[];
  weekStart?: string;
  todayIndex?: number;
  productName?: string;
}

const spring = { type: "spring", stiffness: 520, damping: 44, mass: 1 } as const;
const easeOut = [0.23, 1, 0.32, 1] as const;
const press = "transition-[color,background-color,box-shadow,scale,opacity] duration-150 ease-out active:scale-[0.97]";
const card = "rounded-2xl border bg-card shadow-xs/5";

const icons: Record<HabitIcon, { icon: LucideIcon; label: string }> = {
  water: { icon: DropletsIcon, label: "Water" },
  journal: { icon: NotebookPenIcon, label: "Journal" },
  stretch: { icon: PersonStandingIcon, label: "Stretch" },
  walk: { icon: FootprintsIcon, label: "Walk" },
  read: { icon: BookOpenIcon, label: "Read" },
  sleep: { icon: MoonIcon, label: "Sleep" },
  meditate: { icon: Flower2Icon, label: "Meditate" },
  veg: { icon: CarrotIcon, label: "Eat well" },
  lift: { icon: DumbbellIcon, label: "Strength" },
  music: { icon: MusicIcon, label: "Practice" },
  sun: { icon: SunIcon, label: "Outside" },
  language: { icon: LanguagesIcon, label: "Language" },
  bike: { icon: BikeIcon, label: "Ride" },
};

const tones: Record<HabitTone, { tile: string; fill: string; soft: string; on: string; label: string }> = {
  sky: {
    tile: "bg-sky-500/12 text-sky-700 dark:bg-sky-400/14 dark:text-sky-300",
    fill: "bg-sky-500 dark:bg-sky-400",
    soft: "bg-sky-500/30 dark:bg-sky-400/40",
    on: "text-white dark:text-sky-950",
    label: "Sky",
  },
  amber: {
    tile: "bg-amber-500/14 text-amber-700 dark:bg-amber-400/14 dark:text-amber-300",
    fill: "bg-amber-500 dark:bg-amber-400",
    soft: "bg-amber-500/30 dark:bg-amber-400/40",
    on: "text-white dark:text-amber-950",
    label: "Amber",
  },
  violet: {
    tile: "bg-violet-500/12 text-violet-700 dark:bg-violet-400/14 dark:text-violet-300",
    fill: "bg-violet-500 dark:bg-violet-400",
    soft: "bg-violet-500/30 dark:bg-violet-400/40",
    on: "text-white dark:text-violet-950",
    label: "Violet",
  },
  teal: {
    tile: "bg-teal-500/12 text-teal-700 dark:bg-teal-400/14 dark:text-teal-300",
    fill: "bg-teal-500 dark:bg-teal-400",
    soft: "bg-teal-500/30 dark:bg-teal-400/40",
    on: "text-white dark:text-teal-950",
    label: "Teal",
  },
  orange: {
    tile: "bg-orange-500/12 text-orange-700 dark:bg-orange-400/14 dark:text-orange-300",
    fill: "bg-orange-500 dark:bg-orange-400",
    soft: "bg-orange-500/30 dark:bg-orange-400/40",
    on: "text-white dark:text-orange-950",
    label: "Orange",
  },
  rose: {
    tile: "bg-rose-500/12 text-rose-700 dark:bg-rose-400/14 dark:text-rose-300",
    fill: "bg-rose-500 dark:bg-rose-400",
    soft: "bg-rose-500/30 dark:bg-rose-400/40",
    on: "text-white dark:text-rose-950",
    label: "Rose",
  },
};

const times: { value: HabitTime; label: string }[] = [
  { value: "morning", label: "Morning" },
  { value: "anytime", label: "Anytime" },
  { value: "evening", label: "Evening" },
];

const defaultHabits: Habit[] = [
  { id: "h1", name: "Morning pages", icon: "journal", tone: "amber", time: "morning", carry: 37, week: [1, 1, 1, 1, 1, 1, 0] },
  { id: "h2", name: "Stretch for 10 minutes", icon: "stretch", tone: "violet", time: "morning", carry: 0, week: [1, 0, 1, 1, 1, 1, 0] },
  { id: "h3", name: "Drink water", icon: "water", tone: "sky", time: "anytime", goal: { count: 8, unit: "glasses" }, carry: 9, week: [8, 8, 8, 8, 8, 5, 0] },
  { id: "h4", name: "Walk 8,000 steps", icon: "walk", tone: "teal", time: "anytime", carry: 4, week: [1, 1, 1, 1, 1, 0, 0] },
  { id: "h5", name: "Read 20 pages", icon: "read", tone: "orange", time: "evening", carry: 2, week: [1, 1, 0, 1, 1, 0, 0] },
  { id: "h6", name: "Lights out by 11", icon: "sleep", tone: "rose", time: "evening", carry: 0, week: [1, 1, 1, 0, 1, 0, 0] },
];

const suggestions: { name: string; icon: HabitIcon; tone: HabitTone; time: HabitTime; goal?: { count: number; unit: string } }[] = [
  { name: "Meditate", icon: "meditate", tone: "violet", time: "morning" },
  { name: "Eat a vegetable", icon: "veg", tone: "orange", time: "anytime", goal: { count: 3, unit: "servings" } },
  { name: "Practice guitar", icon: "music", tone: "rose", time: "evening" },
  { name: "Get outside", icon: "sun", tone: "amber", time: "anytime" },
];

const isDone = (h: Habit, v: number) => (h.goal ? v >= h.goal.count : v > 0);

function streakOf(h: Habit, today: number) {
  const since = h.since ?? 0;
  let i = isDone(h, h.week[today] ?? 0) ? today : today - 1;
  let s = 0;
  while (i >= since && isDone(h, h.week[i] ?? 0)) {
    s++;
    i--;
  }
  return i < 0 ? s + h.carry : s;
}

function Tween({ value, format = (n: number) => String(Math.round(n)) }: { value: number; format?: (n: number) => string }) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(value);
  const text = useTransform(mv, format);
  useEffect(() => {
    if (reduce) {
      mv.set(value);
      return;
    }
    const controls = animate(mv, value, { type: "spring", stiffness: 200, damping: 28 });
    return () => controls.stop();
  }, [value, reduce, mv]);
  return <motion.span className="tabular-nums">{text}</motion.span>;
}

function Ring({ value, size = 40, stroke = 4, className }: { value: number; size?: number; stroke?: number; className?: string }) {
  const reduce = useReducedMotion();
  const r = (size - stroke) / 2;
  return (
    <svg aria-hidden className={cn("-rotate-90", className)} height={size} viewBox={`0 0 ${size} ${size}`} width={size}>
      <circle className="stroke-muted" cx={size / 2} cy={size / 2} fill="none" r={r} strokeWidth={stroke} />
      <motion.circle
        animate={{ pathLength: value, opacity: value > 0 ? 1 : 0 }}
        className="stroke-foreground"
        cx={size / 2}
        cy={size / 2}
        fill="none"
        initial={false}
        r={r}
        strokeLinecap="round"
        strokeWidth={stroke}
        transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 180, damping: 26 }}
      />
    </svg>
  );
}

export function Habits({
  className,
  habits: initialHabits = defaultHabits,
  weekStart = "2026-10-19",
  todayIndex = 5,
  productName = "Kindling",
}: HabitsProps) {
  const [habits, setHabits] = useState(initialHabits);
  const [day, setDay] = useState(todayIndex);
  const [sheet, setSheet] = useState(false);
  const [freshId, setFreshId] = useState<string | null>(null);
  const [wide, setWide] = useState(false);
  const reduce = useReducedMotion();
  const uid = useId().replace(/:/g, "");
  const rootRef = useRef<HTMLDivElement>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  const counter = useRef(0);

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWide(e.contentRect.width >= 768));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!freshId) return;
    const timer = setTimeout(() => setFreshId(null), 1600);
    return () => clearTimeout(timer);
  }, [freshId]);

  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(`${weekStart}T12:00:00`);
    d.setDate(d.getDate() + i);
    return d;
  });
  const dayName = (i: number, style: "long" | "short" | "narrow" = "long") =>
    dates[i].toLocaleDateString("en-US", { weekday: style });

  const setValue = (id: string, i: number, v: number) =>
    setHabits((all) => all.map((h) => (h.id === id ? { ...h, week: h.week.map((x, j) => (j === i ? v : x)) } : h)));

  const activeOn = (i: number) => habits.filter((h) => (h.since ?? 0) <= i);
  const doneOn = (i: number) => activeOn(i).filter((h) => isDone(h, h.week[i] ?? 0)).length;
  const dayRatio = (i: number) => {
    const n = activeOn(i).length;
    return n ? doneOn(i) / n : 0;
  };
  const doneToday = doneOn(day);
  const dayTotal = activeOn(day).length;
  const allDone = dayTotal > 0 && doneToday === dayTotal;
  const days = Array.from({ length: todayIndex + 1 }, (_, i) => i);
  const possible = days.reduce((s, i) => s + activeOn(i).length, 0);
  const ticked = days.reduce((s, i) => s + doneOn(i), 0);
  const weekPct = possible ? Math.round((ticked / possible) * 100) : 0;
  const perfect = days.filter((i) => activeOn(i).length > 0 && doneOn(i) === activeOn(i).length).length;
  const best = habits.reduce<{ h: Habit | null; s: number }>(
    (acc, h) => {
      const s = streakOf(h, todayIndex);
      return s > acc.s ? { h, s } : acc;
    },
    { h: null, s: 0 },
  );

  const byTime = times
    .map((t) => {
      const list = habits.filter((h) => h.time === t.value);
      let slots = 0;
      let hit = 0;
      for (const h of list)
        for (const i of days)
          if ((h.since ?? 0) <= i) {
            slots++;
            if (isDone(h, h.week[i] ?? 0)) hit++;
          }
      return { ...t, slots, pct: slots ? Math.round((hit / slots) * 100) : 0 };
    })
    .filter((t) => t.slots > 0);
  const bestPct = Math.max(0, ...byTime.map((t) => t.pct));
  const bestTime = byTime.length > 1 ? byTime.find((t) => t.pct === bestPct) : undefined;

  const addHabit = (h: Omit<Habit, "id" | "carry" | "week">) => {
    counter.current += 1;
    const id = `new-${counter.current}`;
    setHabits((all) => [...all, { ...h, id, carry: 0, since: todayIndex, week: [0, 0, 0, 0, 0, 0, 0] }]);
    setFreshId(id);
    setDay(todayIndex);
  };

  const isToday = day === todayIndex;

  return (
    <div
      className={cn(
        "@container relative isolate flex h-[760px] w-full flex-col overflow-hidden bg-background text-foreground text-sm",
        className,
      )}
      ref={rootRef}
    >
      <header className="flex h-14 shrink-0 items-center gap-2.5 border-b px-4 @3xl:px-6">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <FlameIcon className="size-4" />
        </span>
        <span className="font-heading font-semibold">{productName}</span>
        <Button className={cn("ms-auto", press)} onClick={() => setSheet(true)} ref={addRef} size="sm">
          <PlusIcon /> New habit
        </Button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-[1100px] flex-col gap-5 px-4 pt-5 pb-10 @3xl:px-6 @3xl:pt-6 @4xl:grid @4xl:grid-cols-[minmax(0,1fr)_380px] @4xl:items-start @4xl:gap-6">
          <section aria-labelledby={`${uid}-day`} className="flex min-w-0 flex-col gap-4">
            <div className="flex items-center gap-4">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex h-5 items-center">
                  <AnimatePresence initial={false} mode="popLayout">
                    {isToday ? (
                      <motion.span
                        animate={{ opacity: 1 }}
                        className="text-muted-foreground text-xs"
                        exit={{ opacity: 0 }}
                        initial={{ opacity: 0 }}
                        key="today"
                        transition={{ duration: 0.15 }}
                      >
                        Today
                      </motion.span>
                    ) : (
                      <motion.button
                        animate={{ opacity: 1 }}
                        className={cn(
                          "-ms-1 flex h-6 cursor-pointer items-center gap-0.5 rounded-md pe-1.5 text-muted-foreground text-xs outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
                          press,
                        )}
                        exit={{ opacity: 0 }}
                        initial={{ opacity: 0 }}
                        key="back"
                        onClick={() => setDay(todayIndex)}
                        transition={{ duration: 0.15 }}
                        type="button"
                      >
                        <ChevronLeftIcon className="size-3.5" /> Back to today
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
                <h2 className="truncate font-heading font-semibold text-2xl tracking-tight" id={`${uid}-day`}>
                  {dayName(day)}, {dates[day].toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </h2>
              </div>
              <div className="relative flex size-14 shrink-0 items-center justify-center">
                <Ring className="absolute inset-0" size={56} stroke={5} value={dayRatio(day)} />
                <span className="font-medium text-xs tabular-nums">
                  <Tween value={doneToday} />/{dayTotal}
                </span>
                <span className="sr-only" role="status">
                  {doneToday} of {dayTotal} habits done
                </span>
              </div>
            </div>

            <div aria-label="Pick a day" className="grid grid-cols-7 gap-1" role="group">
              {dates.map((d, i) => {
                const future = i > todayIndex;
                const active = i === day;
                return (
                  <button
                    aria-label={`${dayName(i)}${i === todayIndex ? ", today" : ""}${future ? "" : `, ${doneOn(i)} of ${activeOn(i).length} done`}`}
                    aria-pressed={active}
                    className={cn(
                      "relative flex cursor-pointer flex-col items-center gap-1.5 rounded-xl py-2 outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default",
                      press,
                      !active && !future && "hover:bg-accent/60",
                      future && "opacity-40",
                    )}
                    disabled={future}
                    key={d.toISOString()}
                    onClick={() => setDay(i)}
                    type="button"
                  >
                    {active && (
                      <motion.span
                        className="absolute inset-0 -z-10 rounded-xl border bg-card shadow-xs/5"
                        layoutId={`${uid}-day`}
                        transition={reduce ? { duration: 0 } : spring}
                      />
                    )}
                    <span className={cn("text-xs", active ? "font-medium text-foreground" : "text-muted-foreground")}>
                      {dayName(i, "short").slice(0, 2)}
                    </span>
                    <span className="relative flex size-8 items-center justify-center">
                      <Ring className="absolute inset-0" size={32} stroke={2.5} value={future ? 0 : dayRatio(i)} />
                      <span className={cn("font-medium text-xs tabular-nums", i === todayIndex && "text-foreground")}>
                        {d.getDate()}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            <AnimatePresence initial={false}>
              {allDone && (
                <motion.div
                  animate={{ opacity: 1, height: "auto" }}
                  className="overflow-hidden"
                  exit={{ opacity: 0, height: 0 }}
                  initial={{ opacity: 0, height: 0 }}
                  transition={reduce ? { duration: 0 } : { duration: 0.28, ease: easeOut }}
                >
                  <div className="flex items-center gap-3 rounded-xl border border-success/24 bg-success/8 p-3 dark:bg-success/12">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-success text-white">
                      <SparklesIcon className="size-4" />
                    </span>
                    <p className="text-pretty">
                      <span className="font-medium">A perfect {dayName(day)}.</span>{" "}
                      <span className="text-muted-foreground">All {dayTotal} habits done.</span>
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {habits.length === 0 ? (
              <div className={cn(card, "flex flex-col items-center gap-2 px-6 py-12 text-center")}>
                <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <FlameIcon className="size-4" />
                </span>
                <p className="font-medium">No habits yet</p>
                <p className="text-muted-foreground">Start with one small thing you want to do every day.</p>
                <Button className={cn("mt-1", press)} onClick={() => setSheet(true)} size="sm">
                  <PlusIcon /> New habit
                </Button>
              </div>
            ) : (
              times.map((t) => {
                const list = habits.filter((h) => h.time === t.value && (h.since ?? 0) <= day);
                if (!list.length) return null;
                const doneHere = list.filter((h) => isDone(h, h.week[day] ?? 0)).length;
                return (
                  <div className="flex flex-col gap-2" key={t.value}>
                    <div className="flex items-baseline justify-between px-1 text-xs">
                      <h3 className="font-medium text-muted-foreground">{t.label}</h3>
                      <span className="text-muted-foreground tabular-nums">
                        {doneHere} of {list.length}
                      </span>
                    </div>
                    <ul className={cn(card, "divide-y overflow-hidden")}>
                      <AnimatePresence initial={false}>
                        {list.map((h) => (
                          <HabitRow
                            day={day}
                            fresh={h.id === freshId}
                            habit={h}
                            key={h.id}
                            onChange={(v) => setValue(h.id, day, v)}
                            streak={streakOf(h, todayIndex)}
                          />
                        ))}
                      </AnimatePresence>
                    </ul>
                  </div>
                );
              })
            )}
          </section>

          <aside className="flex min-w-0 flex-col gap-4">
            <div className={cn(card, "grid grid-cols-3 divide-x")}>
              <Stat label="This week" value={<><Tween value={weekPct} />%</>} />
              <Stat label="Perfect days" value={<Tween value={perfect} />} />
              <Stat
                hint={best.h ? icons[best.h.icon].label : undefined}
                label="Top streak"
                value={
                  <span className="flex items-center gap-1">
                    <Tween value={best.s} />
                    <FlameIcon aria-hidden className="size-3.5 text-orange-500 dark:text-orange-400" />
                  </span>
                }
              />
            </div>

            <section aria-labelledby={`${uid}-grid`} className={cn(card, "p-4")}>
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-medium" id={`${uid}-grid`}>
                  This week
                </h3>
                <span className="text-muted-foreground text-xs">
                  {dates[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} –{" "}
                  {dates[6].toLocaleDateString("en-US", { day: "numeric" })}
                </span>
              </div>
              <table className="mt-3 w-full border-separate border-spacing-y-1">
                <thead>
                  <tr>
                    <th className="w-full p-0">
                      <span className="sr-only">Habit</span>
                    </th>
                    {dates.map((d, i) => (
                      <th
                        className={cn(
                          "w-7 p-0 pb-1 text-center font-normal text-[11px]",
                          i === todayIndex ? "font-medium text-foreground" : "text-muted-foreground",
                        )}
                        key={d.toISOString()}
                        scope="col"
                      >
                        <abbr className="no-underline" title={dayName(i)}>
                          {dayName(i, "narrow")}
                        </abbr>
                      </th>
                    ))}
                    <th className="w-10 p-0 pb-1 text-right font-normal text-[11px] text-muted-foreground" scope="col">
                      <FlameIcon aria-label="Streak" className="ms-auto size-3" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {habits.map((h) => {
                    const Icon = icons[h.icon].icon;
                    const s = streakOf(h, todayIndex);
                    return (
                      <tr key={h.id}>
                        <th className="p-0 pe-2 text-left font-normal" scope="row">
                          <span className="flex min-w-0 items-center gap-2">
                            <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-md", tones[h.tone].tile)}>
                              <Icon aria-hidden className="size-3.5" />
                            </span>
                            <span className="sr-only @md:not-sr-only @md:truncate @md:text-xs @4xl:max-w-[7.5rem]">{h.name}</span>
                          </span>
                        </th>
                        {h.week.map((v, i) => (
                          <td className="p-0 text-center" key={dates[i].toISOString()}>
                            <GridCell
                              day={dayName(i)}
                              future={i > todayIndex}
                              before={i < (h.since ?? 0)}
                              habit={h}
                              onToggle={() => setValue(h.id, i, isDone(h, v) ? 0 : h.goal?.count ?? 1)}
                              selected={i === day}
                              value={v}
                            />
                          </td>
                        ))}
                        <td className="p-0 text-right font-medium text-xs tabular-nums">
                          <span className={cn(s === 0 && "text-muted-foreground")}>
                            <Tween value={s} />
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>

            <section aria-labelledby={`${uid}-when`} className={cn(card, "p-4")}>
              <h3 className="font-medium" id={`${uid}-when`}>
                When you show up
              </h3>
              <ul className="mt-3 flex flex-col gap-2.5">
                {byTime.map((t) => (
                  <li className="grid grid-cols-[4.5rem_minmax(0,1fr)_2.5rem] items-center gap-3" key={t.value}>
                    <span className="text-muted-foreground text-xs">{t.label}</span>
                    <span className="relative h-2 overflow-hidden rounded-full bg-muted">
                      <motion.span
                        animate={{ scaleX: t.pct / 100 }}
                        className={cn("absolute inset-0 origin-left rounded-full", t.pct === bestPct ? "bg-foreground" : "bg-foreground/40")}
                        initial={false}
                        transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 200, damping: 30 }}
                      />
                    </span>
                    <span className="text-right font-medium text-xs tabular-nums">
                      <Tween value={t.pct} />%
                    </span>
                  </li>
                ))}
              </ul>
              {bestTime && (
                <p className="mt-3 text-pretty text-muted-foreground text-xs">
                  {bestTime.label} habits stick best this week. Missed one? Tap a square above to fill in an earlier day.
                </p>
              )}
            </section>
          </aside>
        </div>
      </div>

      <AddHabitSheet
        onAdd={addHabit}
        onClose={() => {
          setSheet(false);
          addRef.current?.focus();
        }}
        open={sheet}
        wide={wide}
      />
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 px-4 py-3">
      <span className="truncate text-muted-foreground text-xs">{label}</span>
      <span className="font-heading font-semibold text-xl tracking-tight">{value}</span>
      {hint ? <span className="-mt-1 truncate text-muted-foreground text-xs">{hint}</span> : null}
    </div>
  );
}

function GridCell({
  habit,
  value,
  future,
  selected,
  day,
  before,
  onToggle,
}: {
  habit: Habit;
  value: number;
  future: boolean;
  before?: boolean;
  selected: boolean;
  day: string;
  onToggle: () => void;
}) {
  const reduce = useReducedMotion();
  if (before) return <span aria-hidden className="mx-auto block size-1 rounded-full bg-border" />;
  const done = isDone(habit, value);
  const partial = habit.goal && !done && value > 0 ? value / habit.goal.count : 0;
  const t = tones[habit.tone];
  const state = future ? "upcoming" : done ? "done" : partial ? `${value} of ${habit.goal?.count}` : "missed";
  return (
    <button
      aria-label={`${habit.name}, ${day}: ${state}`}
      aria-pressed={future ? undefined : done}
      className={cn(
        "relative mx-auto flex size-6 cursor-pointer items-center justify-center overflow-hidden rounded-md outline-none after:absolute after:-inset-1 after:content-[''] focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default",
        press,
        future ? "border border-dashed" : "bg-muted",
        selected && !future && "ring-1 ring-foreground/40 ring-offset-1 ring-offset-card",
      )}
      disabled={future}
      onClick={onToggle}
      type="button"
    >
      {partial > 0 && (
        <motion.span
          animate={{ scaleY: partial }}
          className={cn("absolute inset-0 origin-bottom", t.soft)}
          initial={false}
          transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 30 }}
        />
      )}
      <motion.span
        animate={{ opacity: done ? 1 : 0, scale: done ? 1 : 0.6 }}
        className={cn("absolute inset-0 rounded-md", t.fill)}
        initial={false}
        transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 600, damping: 32 }}
      />
    </button>
  );
}

function HabitRow({
  habit,
  day,
  streak,
  fresh,
  onChange,
}: {
  habit: Habit;
  day: number;
  streak: number;
  fresh: boolean;
  onChange: (v: number) => void;
}) {
  const reduce = useReducedMotion();
  const value = habit.week[day] ?? 0;
  const done = isDone(habit, value);
  const t = tones[habit.tone];
  const Icon = icons[habit.icon].icon;
  const [burst, setBurst] = useState(0);

  const tick = () => {
    if (habit.goal) {
      if (value >= habit.goal.count) return;
      const next = value + 1;
      onChange(next);
      if (next === habit.goal.count && !reduce) setBurst((b) => b + 1);
    } else {
      onChange(done ? 0 : 1);
      if (!done && !reduce) setBurst((b) => b + 1);
    }
  };

  const sub = habit.goal
    ? done
      ? `${habit.goal.count} ${habit.goal.unit} · done`
      : `${value} of ${habit.goal.count} ${habit.goal.unit}`
    : done
      ? "Done"
      : "Once a day";

  return (
    <motion.li
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative flex items-center gap-3 px-3 py-3 transition-colors duration-300 @md:px-4",
        fresh && "bg-accent/50",
      )}
      exit={{ opacity: 0 }}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
      layout={reduce ? false : "position"}
      transition={spring}
    >
      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", t.tile)}>
        <Icon aria-hidden className="size-4.5" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate font-medium">{habit.name}</span>
        <span className="flex items-center gap-2 text-muted-foreground text-xs">
          <span className="truncate tabular-nums">{sub}</span>
          {streak > 0 && (
            <span className="flex shrink-0 items-center gap-0.5 text-foreground">
              <FlameIcon aria-hidden className="size-3 text-orange-500 dark:text-orange-400" />
              <Tween value={streak} />
              <span className="sr-only"> day streak</span>
            </span>
          )}
        </span>
      </div>
      {habit.goal && value > 0 && !done && (
        <Button
          aria-label={`Take one off ${habit.name}`}
          className={press}
          onClick={() => onChange(value - 1)}
          size="icon-sm"
          variant="ghost"
        >
          <MinusIcon />
        </Button>
      )}
      <TickButton
        burst={burst}
        done={done}
        goal={habit.goal}
        label={habit.name}
        onTick={tick}
        onUndo={() => onChange(0)}
        tone={habit.tone}
        value={value}
      />
    </motion.li>
  );
}

function TickButton({
  done,
  value,
  goal,
  tone,
  label,
  burst,
  onTick,
  onUndo,
}: {
  done: boolean;
  value: number;
  goal?: { count: number; unit: string };
  tone: HabitTone;
  label: string;
  burst: number;
  onTick: () => void;
  onUndo: () => void;
}) {
  const reduce = useReducedMotion();
  const t = tones[tone];
  const level = goal ? Math.min(value / goal.count, 1) : done ? 1 : 0;
  const quick = reduce ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 34 } as const;

  // The row sits in an AnimatePresence with initial={false}; reset that here so the burst and wave still play.
  return (
    <PresenceContext.Provider value={null}>
    <span className="relative shrink-0">
      <button
        aria-label={
          goal
            ? done
              ? `${label}: ${goal.count} of ${goal.count} ${goal.unit}. Reset`
              : `Add one to ${label}, ${value} of ${goal.count} ${goal.unit}`
            : label
        }
        aria-pressed={goal ? undefined : done}
        className={cn(
          "relative flex size-10 cursor-pointer items-center justify-center overflow-hidden rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
          press,
          "active:scale-[0.95]",
          "inset-ring-2 inset-ring-border hover:inset-ring-foreground/30",
        )}
        onClick={goal && done ? onUndo : onTick}
        type="button"
      >
        {goal ? (
          <>
            <motion.span
              animate={{ y: `${(1 - level) * 100}%` }}
              aria-hidden
              className={cn("absolute inset-x-0 bottom-0 h-full", done ? t.fill : t.soft)}
              initial={false}
              transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 160, damping: 20 }}
            >
              {!done && level > 0 && (
                <motion.svg
                  animate={reduce ? undefined : { x: ["0%", "-50%"] }}
                  aria-hidden
                  className="absolute -top-[5px] left-0 h-1.5 w-[200%]"
                  key={`w${value}`}
                  preserveAspectRatio="none"
                  transition={{ duration: 0.9, ease: "easeOut" }}
                  viewBox="0 0 80 6"
                >
                  <path className={waveFill[tone]} d="M0 3 Q10 0 20 3 T40 3 T60 3 T80 3 V6 H0 Z" />
                </motion.svg>
              )}
            </motion.span>
            {!done && (
              <span className="relative font-medium text-xs tabular-nums">
                {value}
              </span>
            )}
          </>
        ) : (
          <motion.span
            animate={{ opacity: done ? 1 : 0, scale: done ? 1 : 0.95 }}
            aria-hidden
            className={cn("absolute inset-0 rounded-full", t.fill)}
            initial={false}
            transition={quick}
          />
        )}
        <svg aria-hidden className={cn("relative size-5", t.on)} fill="none" viewBox="0 0 24 24">
          <motion.path
            animate={{ pathLength: done ? 1 : 0, opacity: done ? 1 : 0 }}
            d="M5.5 12.5 10 17 18.5 7.5"
            initial={false}
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.75}
            transition={reduce ? { duration: 0 } : { duration: 0.2, ease: easeOut, delay: done ? 0.05 : 0 }}
          />
        </svg>
      </button>
      {burst > 0 && (
        <span aria-hidden className="pointer-events-none absolute inset-0" key={burst}>
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i / 8) * Math.PI * 2;
            return (
              <motion.span
                animate={{ x: Math.cos(a) * 29, y: Math.sin(a) * 29, opacity: 0, scale: 0.5 }}
                className={cn("absolute top-1/2 left-1/2 -mt-[3px] -ml-[3px] size-1.5 rounded-full", t.fill)}
                initial={{ x: Math.cos(a) * 19, y: Math.sin(a) * 19, opacity: 1, scale: 1 }}
                key={i}
                transition={{ duration: 0.4, ease: easeOut }}
              />
            );
          })}
        </span>
      )}
    </span>
    </PresenceContext.Provider>
  );
}

const waveFill: Record<HabitTone, string> = {
  sky: "fill-sky-500/30 dark:fill-sky-400/40",
  amber: "fill-amber-500/30 dark:fill-amber-400/40",
  violet: "fill-violet-500/30 dark:fill-violet-400/40",
  teal: "fill-teal-500/30 dark:fill-teal-400/40",
  orange: "fill-orange-500/30 dark:fill-orange-400/40",
  rose: "fill-rose-500/30 dark:fill-rose-400/40",
};

function AddHabitSheet({
  open,
  wide,
  onClose,
  onAdd,
}: {
  open: boolean;
  wide: boolean;
  onClose: () => void;
  onAdd: (h: Omit<Habit, "id" | "carry" | "week">) => void;
}) {
  const reduce = useReducedMotion();
  const uid = useId().replace(/:/g, "");
  const nameRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState<HabitIcon>("meditate");
  const [tone, setTone] = useState<HabitTone>("teal");
  const [time, setTime] = useState<HabitTime>("anytime");
  const [counted, setCounted] = useState(false);
  const [count, setCount] = useState(3);
  const [unit, setUnit] = useState("times");
  const [tried, setTried] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName("");
    setIcon("meditate");
    setTone("teal");
    setTime("anytime");
    setCounted(false);
    setCount(3);
    setUnit("times");
    setTried(false);
    const f = setTimeout(() => nameRef.current?.focus(), 60);
    return () => clearTimeout(f);
  }, [open]);

  const invalid = !name.trim();
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (invalid) {
      nameRef.current?.focus();
      return;
    }
    onAdd({
      name: name.trim(),
      icon,
      tone,
      time,
      goal: counted ? { count, unit: unit.trim() || "times" } : undefined,
    });
    onClose();
  };

  const Icon = icons[icon].icon;
  const t = tones[tone];
  const motionIn = wide ? { x: 0 } : { y: 0 };
  const motionOut = wide ? { x: "100%" } : { y: "100%" };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            animate={{ opacity: 1 }}
            aria-hidden
            className="absolute inset-0 z-40 bg-black/32"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            key="scrim"
            onClick={onClose}
            transition={{ duration: 0.2, ease: easeOut }}
          />
          <motion.form
            animate={motionIn}
            aria-labelledby={`${uid}-title`}
            aria-modal
            className={cn(
              "absolute z-50 flex flex-col bg-popover text-popover-foreground shadow-lg/10 outline-none",
              wide
                ? "inset-y-0 right-0 w-[400px] border-l"
                : "inset-x-0 bottom-0 max-h-[92%] rounded-t-2xl border-t",
            )}
            exit={reduce ? { opacity: 0 } : motionOut}
            initial={reduce ? { opacity: 0 } : motionOut}
            key="sheet"
            noValidate
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.stopPropagation();
                onClose();
              }
            }}
            onSubmit={submit}
            role="dialog"
            transition={reduce ? { duration: 0.15 } : { type: "spring", stiffness: 440, damping: 42 }}
          >
            {!wide && <span aria-hidden className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-border" />}
            <div className="flex items-center gap-2 px-4 pt-3 pb-2 @3xl:px-5 @3xl:pt-4">
              <h2 className="flex-1 font-heading font-semibold text-base" id={`${uid}-title`}>
                New habit
              </h2>
              <Button aria-label="Close" onClick={onClose} size="icon-sm" variant="ghost">
                <XIcon />
              </Button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 pt-2 pb-4 @3xl:px-5">
              <div className="flex items-center gap-3 rounded-xl border bg-card p-3">
                <motion.span
                  className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors duration-200", t.tile)}
                  key={icon}
                  initial={reduce ? false : { scale: 0.9, opacity: 0.6 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.18, ease: easeOut }}
                >
                  <Icon aria-hidden className="size-5" />
                </motion.span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className={cn("truncate font-medium", !name.trim() && "text-muted-foreground")}>
                    {name.trim() || "Your new habit"}
                  </span>
                  <span className="truncate text-muted-foreground text-xs">
                    {times.find((x) => x.value === time)?.label} · {counted ? `${count} ${unit.trim() || "times"} a day` : "Once a day"}
                  </span>
                </div>
                <span aria-hidden className="size-10 shrink-0 rounded-full border-2 border-border" />
              </div>

              <div className="flex flex-col gap-2">
                <label className="font-medium" htmlFor={`${uid}-name`}>
                  Name
                </label>
                <Input
                  aria-describedby={tried && invalid ? `${uid}-err` : undefined}
                  aria-invalid={tried && invalid ? true : undefined}
                  autoComplete="off"
                  id={`${uid}-name`}
                  maxLength={40}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Meditate for 5 minutes"
                  ref={nameRef}
                  value={name}
                />
                <AnimatePresence initial={false}>
                  {tried && invalid && (
                    <motion.p
                      animate={{ opacity: 1, height: "auto" }}
                      className="overflow-hidden text-destructive-foreground text-xs"
                      exit={{ opacity: 0, height: 0 }}
                      id={`${uid}-err`}
                      initial={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.18, ease: easeOut }}
                    >
                      Give it a name you’ll recognise at a glance.
                    </motion.p>
                  )}
                </AnimatePresence>
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.map((s) => (
                    <button
                      className={cn(
                        "h-7 cursor-pointer rounded-full border bg-background px-2.5 text-xs outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
                        press,
                      )}
                      key={s.name}
                      onClick={() => {
                        setName(s.name);
                        setIcon(s.icon);
                        setTone(s.tone);
                        setTime(s.time);
                        setCounted(Boolean(s.goal));
                        if (s.goal) {
                          setCount(s.goal.count);
                          setUnit(s.goal.unit);
                        }
                      }}
                      type="button"
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>

              <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 font-medium">Icon</legend>
                <div className="grid grid-cols-7 gap-1.5">
                  {(Object.keys(icons) as HabitIcon[]).map((k) => {
                    const I = icons[k].icon;
                    const on = k === icon;
                    return (
                      <button
                        aria-label={icons[k].label}
                        aria-pressed={on}
                        className={cn(
                          "flex aspect-square cursor-pointer items-center justify-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          press,
                          on ? t.tile : "text-muted-foreground hover:bg-accent hover:text-foreground",
                          on && "ring-1 ring-current/30",
                        )}
                        key={k}
                        onClick={() => setIcon(k)}
                        type="button"
                      >
                        <I className="size-4.5" />
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 font-medium">Colour</legend>
                <div className="flex gap-2.5">
                  {(Object.keys(tones) as HabitTone[]).map((k) => (
                    <button
                      aria-label={tones[k].label}
                      aria-pressed={k === tone}
                      className={cn(
                        "relative flex size-8 cursor-pointer items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-popover",
                        press,
                      )}
                      key={k}
                      onClick={() => setTone(k)}
                      type="button"
                    >
                      <span className={cn("size-6 rounded-full", tones[k].fill)} />
                      {k === tone && (
                        <motion.span
                          className="absolute inset-0 rounded-full ring-2 ring-foreground/70"
                          layoutId={`${uid}-swatch`}
                          transition={reduce ? { duration: 0 } : spring}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </fieldset>

              <Choice
                label="When"
                onChange={(v) => setTime(v as HabitTime)}
                options={times}
                uid={`${uid}-time`}
                value={time}
              />

              <div className="flex flex-col gap-3">
                <Choice
                  label="Goal"
                  onChange={(v) => setCounted(v === "count")}
                  options={[
                    { value: "once", label: "Once a day" },
                    { value: "count", label: "Count it" },
                  ]}
                  uid={`${uid}-goal`}
                  value={counted ? "count" : "once"}
                />
                <AnimatePresence initial={false}>
                  {counted && (
                    <motion.div
                      animate={{ opacity: 1, height: "auto" }}
                      className="overflow-hidden"
                      exit={{ opacity: 0, height: 0 }}
                      initial={{ opacity: 0, height: 0 }}
                      transition={reduce ? { duration: 0 } : { duration: 0.22, ease: easeOut }}
                    >
                      <div className="flex items-center gap-2 pt-0.5">
                        <div className="flex items-center rounded-lg border bg-background">
                          <Button
                            aria-label="Fewer"
                            disabled={count <= 2}
                            onClick={() => setCount((c) => Math.max(2, c - 1))}
                            size="icon-sm"
                            variant="ghost"
                          >
                            <MinusIcon />
                          </Button>
                          <span aria-live="polite" className="w-7 text-center font-medium tabular-nums">
                            {count}
                          </span>
                          <Button
                            aria-label="More"
                            disabled={count >= 20}
                            onClick={() => setCount((c) => Math.min(20, c + 1))}
                            size="icon-sm"
                            variant="ghost"
                          >
                            <PlusIcon />
                          </Button>
                        </div>
                        <Input
                          aria-label="Unit"
                          className="flex-1"
                          maxLength={14}
                          onChange={(e) => setUnit(e.target.value)}
                          placeholder="glasses, pages…"
                          value={unit}
                        />
                        <span className="shrink-0 text-muted-foreground">a day</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="flex gap-2 border-t px-4 py-3 @3xl:px-5">
              <Button className={cn("flex-1", press)} onClick={onClose} variant="outline">
                Cancel
              </Button>
              <Button className={cn("flex-1", press)} type="submit">
                Add habit
              </Button>
            </div>
          </motion.form>
        </>
      )}
    </AnimatePresence>
  );
}

function Choice({
  label,
  value,
  options,
  onChange,
  uid,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  uid: string;
}) {
  const reduce = useReducedMotion();
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 font-medium">{label}</legend>
      <div className="flex rounded-lg bg-muted p-0.5" role="radiogroup">
        {options.map((o) => {
          const on = o.value === value;
          return (
            <button
              aria-checked={on}
              className={cn(
                "relative h-8 flex-1 cursor-pointer rounded-md text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring",
                press,
                on ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
              key={o.value}
              onClick={() => onChange(o.value)}
              role="radio"
              type="button"
            >
              {on && (
                <motion.span
                  className="absolute inset-0 -z-10 rounded-md bg-background shadow-xs/5 dark:bg-input"
                  layoutId={uid}
                  transition={reduce ? { duration: 0 } : spring}
                />
              )}
              {o.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
