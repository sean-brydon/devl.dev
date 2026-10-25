"use client";

import { CalendarOffIcon, ChevronLeftIcon, ChevronRightIcon, MapPinIcon, TriangleAlertIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  type KeyboardEvent,
  type PointerEvent,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CalendarTone = "info" | "success" | "warning" | "destructive" | "neutral";

export interface AgendaCalendar {
  id: string;
  name: string;
  tone: CalendarTone;
}

export interface AgendaEvent {
  id: string;
  title: string;
  calendarId: string;
  start: Date;
  end: Date;
  location?: string;
}

export interface WeekAgendaProps {
  calendars: AgendaCalendar[];
  events: AgendaEvent[];
  now?: Date;
  startHour?: number;
  endHour?: number;
  snap?: number;
  onEventChange?: (event: AgendaEvent) => void;
  className?: string;
}

const tones: Record<CalendarTone, { dot: string; soft: string }> = {
  info: { dot: "bg-info", soft: "bg-info/10 group-hover/event:bg-info/16 dark:bg-info/16 dark:group-hover/event:bg-info/24" },
  success: {
    dot: "bg-success",
    soft: "bg-success/10 group-hover/event:bg-success/16 dark:bg-success/16 dark:group-hover/event:bg-success/24",
  },
  warning: {
    dot: "bg-warning",
    soft: "bg-warning/12 group-hover/event:bg-warning/18 dark:bg-warning/16 dark:group-hover/event:bg-warning/24",
  },
  destructive: {
    dot: "bg-destructive",
    soft: "bg-destructive/10 group-hover/event:bg-destructive/16 dark:bg-destructive/16 dark:group-hover/event:bg-destructive/24",
  },
  neutral: {
    dot: "bg-muted-foreground",
    soft: "bg-muted-foreground/10 group-hover/event:bg-muted-foreground/16 dark:bg-muted-foreground/16 dark:group-hover/event:bg-muted-foreground/24",
  },
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAYS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const PX_PER_MIN = 0.9;
const iconHit = "after:absolute after:-inset-1 transition-[scale,background-color] duration-150 ease-out active:scale-[0.94]";

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const minutesOf = (d: Date) => d.getHours() * 60 + d.getMinutes();
const atMinutes = (day: Date, m: number) => new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, m);

function startOfWeek(d: Date) {
  const day = startOfDay(d);
  const offset = (day.getDay() + 6) % 7;
  return addDays(day, -offset);
}

function formatTime(m: number, withPeriod = true) {
  const h = Math.floor(m / 60) % 24;
  const mm = m % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const period = h < 12 ? "AM" : "PM";
  return `${h12}${mm ? `:${String(mm).padStart(2, "0")}` : ""}${withPeriod ? ` ${period}` : ""}`;
}

function formatRange(a: number, b: number) {
  const samePeriod = a < 720 === b < 720;
  return `${formatTime(a, !samePeriod)} – ${formatTime(b)}`;
}

function formatDuration(m: number) {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return h ? `${h}h${mm ? ` ${mm}m` : ""}` : `${mm}m`;
}

interface Placed {
  event: AgendaEvent;
  col: number;
  cols: number;
  conflict: boolean;
}

function layoutDay(events: AgendaEvent[]): Placed[] {
  const sorted = [...events].sort((a, b) => +a.start - +b.start || +b.end - +a.end);
  const placed: Placed[] = [];
  let cluster: Placed[] = [];
  let clusterEnd = 0;
  const flush = () => {
    const cols = Math.max(1, ...cluster.map((p) => p.col + 1));
    for (const p of cluster) p.cols = cols;
    placed.push(...cluster);
    cluster = [];
  };
  for (const event of sorted) {
    if (cluster.length && +event.start >= clusterEnd) flush();
    const taken = new Set(cluster.filter((p) => +p.event.end > +event.start).map((p) => p.col));
    let col = 0;
    while (taken.has(col)) col++;
    const overlaps = cluster.filter((p) => +p.event.end > +event.start);
    for (const p of overlaps) p.conflict = true;
    cluster.push({ event, col, cols: 1, conflict: overlaps.length > 0 });
    clusterEnd = Math.max(clusterEnd, +event.end);
  }
  flush();
  return placed;
}

function findConflicts(events: AgendaEvent[]) {
  const sorted = [...events].sort((a, b) => +a.start - +b.start);
  const pairs: { a: AgendaEvent; b: AgendaEvent; minutes: number }[] = [];
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const a = sorted[i];
      const b = sorted[j];
      if (+b.start >= +a.end) continue;
      pairs.push({ a, b, minutes: Math.round((Math.min(+a.end, +b.end) - +b.start) / 60000) });
    }
  }
  return pairs;
}

export function WeekAgenda({
  calendars,
  events: initialEvents,
  now: nowProp,
  startHour = 8,
  endHour = 19,
  snap = 15,
  onEventChange,
  className,
}: WeekAgendaProps) {
  const reduce = useReducedMotion();
  const uid = useId();
  const [events, setEvents] = useState(initialEvents);
  const [liveNow, setLiveNow] = useState<Date | null>(null);
  const now = nowProp ?? liveNow;
  const [selected, setSelected] = useState<Date | null>(() => (nowProp ? startOfDay(nowProp) : null));
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());
  const [dragging, setDragging] = useState<string | null>(null);
  const [announce, setAnnounce] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string; y: number; start: number; length: number; moved: boolean } | null>(null);

  useEffect(() => {
    if (nowProp) return;
    const tick = () => setLiveNow(new Date());
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [nowProp]);

  useEffect(() => {
    if (!selected && now) setSelected(startOfDay(now));
  }, [now, selected]);

  const day = selected ?? (now ? startOfDay(now) : startOfWeek(new Date(0)));
  const week = useMemo(() => {
    const first = startOfWeek(day);
    return Array.from({ length: 7 }, (_, i) => addDays(first, i));
  }, [day]);

  const calendarById = useMemo(() => new Map(calendars.map((c) => [c.id, c])), [calendars]);
  const visible = useMemo(() => events.filter((e) => !hidden.has(e.calendarId)), [events, hidden]);
  const byDay = useMemo(() => {
    const map = new Map<string, AgendaEvent[]>();
    for (const e of visible) {
      const k = dayKey(e.start);
      map.set(k, [...(map.get(k) ?? []), e]);
    }
    return map;
  }, [visible]);

  const dayEvents = byDay.get(dayKey(day)) ?? [];
  const placed = useMemo(() => layoutDay(dayEvents), [dayEvents]);
  const conflicts = useMemo(() => findConflicts(dayEvents), [dayEvents]);
  const booked = dayEvents.reduce((sum, e) => sum + (+e.end - +e.start) / 60000, 0);

  const rangeStart = startHour * 60;
  const rangeEnd = endHour * 60;
  const height = (rangeEnd - rangeStart) * PX_PER_MIN;
  const isToday = now ? dayKey(now) === dayKey(day) : false;
  const nowMinutes = now ? minutesOf(now) : 0;
  const showNow = isToday && nowMinutes >= rangeStart && nowMinutes <= rangeEnd;

  const dayStamp = dayKey(day);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const first = dayEvents.length ? Math.min(...dayEvents.map((e) => minutesOf(e.start))) : rangeStart + 60;
    const anchor = (isToday ? Math.min(nowMinutes - 45, first) : first) - 20;
    el.scrollTo({ top: Math.max(0, (anchor - rangeStart) * PX_PER_MIN), behavior: reduce ? "auto" : "smooth" });
  }, [dayStamp]);

  const reschedule = useCallback(
    (id: string, startMin: number, commit: boolean) => {
      setEvents((prev) =>
        prev.map((e) => {
          if (e.id !== id) return e;
          const length = (+e.end - +e.start) / 60000;
          const clamped = Math.max(rangeStart, Math.min(rangeEnd - length, startMin));
          const next = { ...e, start: atMinutes(e.start, clamped), end: atMinutes(e.start, clamped + length) };
          if (commit) {
            onEventChange?.(next);
            setAnnounce(`${e.title} moved to ${formatRange(clamped, clamped + length)}`);
          }
          return next;
        }),
      );
    },
    [onEventChange, rangeEnd, rangeStart],
  );

  const onPointerDown = (e: PointerEvent<HTMLDivElement>, ev: AgendaEvent) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = {
      id: ev.id,
      y: e.clientY,
      start: minutesOf(ev.start),
      length: (+ev.end - +ev.start) / 60000,
      moved: false,
    };
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const dy = e.clientY - d.y;
    if (!d.moved && Math.abs(dy) < 4) return;
    if (!d.moved) {
      d.moved = true;
      setDragging(d.id);
    }
    const raw = d.start + dy / PX_PER_MIN;
    reschedule(d.id, Math.round(raw / snap) * snap, false);
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    drag.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    if (!d?.moved) return;
    setDragging(null);
    const ev = events.find((x) => x.id === d.id);
    if (ev) reschedule(d.id, minutesOf(ev.start), true);
  };

  const onEventKey = (e: KeyboardEvent<HTMLDivElement>, ev: AgendaEvent) => {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    e.preventDefault();
    reschedule(ev.id, minutesOf(ev.start) + (e.key === "ArrowUp" ? -snap : snap), true);
  };

  const toggleCalendar = (id: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const spring = reduce ? { duration: 0 } : { type: "spring" as const, stiffness: 420, damping: 36 };
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);
  const firstConflict = conflicts[0];

  return (
    <div
      className={cn(
        "flex w-full max-w-[420px] flex-col overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-xs/5",
        className,
      )}
    >
      <div className="flex items-center gap-2 px-4 pt-3.5 pb-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm">
            {MONTHS[week[3].getMonth()]} <span className="text-muted-foreground">{week[3].getFullYear()}</span>
          </p>
        </div>
        <Button
          className="transition-[scale,box-shadow,background-color] duration-150 ease-out active:scale-[0.97]"
          disabled={!now || isToday}
          onClick={() => now && setSelected(startOfDay(now))}
          size="xs"
          variant="outline"
        >
          Today
        </Button>
        <div className="flex items-center">
          <Button aria-label="Previous week" className={iconHit} onClick={() => setSelected(addDays(day, -7))} size="icon-xs" variant="ghost">
            <ChevronLeftIcon />
          </Button>
          <Button aria-label="Next week" className={iconHit} onClick={() => setSelected(addDays(day, 7))} size="icon-xs" variant="ghost">
            <ChevronRightIcon />
          </Button>
        </div>
      </div>

      <div aria-label="Week" className="grid grid-cols-7 gap-1 px-3 pb-3" role="group">
        {week.map((d) => {
          const active = dayKey(d) === dayKey(day);
          const today = now ? dayKey(d) === dayKey(now) : false;
          const dots = [...new Set((byDay.get(dayKey(d)) ?? []).map((e) => calendarById.get(e.calendarId)?.tone))]
            .filter(Boolean)
            .slice(0, 3) as CalendarTone[];
          return (
            <button
              aria-label={`${WEEKDAYS_LONG[d.getDay()]} ${MONTHS[d.getMonth()]} ${d.getDate()}${today ? ", today" : ""}`}
              aria-current={today ? "date" : undefined}
              aria-pressed={active}
              className="relative flex cursor-pointer flex-col items-center gap-1 rounded-xl py-1.5 outline-none transition-[background-color,scale] duration-150 ease-out hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]"
              key={dayKey(d)}
              onClick={() => setSelected(d)}
              type="button"
            >
              {active && (
                <motion.span
                  aria-hidden
                  className="absolute inset-0 rounded-xl bg-primary"
                  layoutId={`${uid}-day`}
                  transition={spring}
                />
              )}
              <span
                className={cn(
                  "relative text-[11px] uppercase tracking-wide",
                  active ? "text-primary-foreground/72" : "text-muted-foreground",
                )}
              >
                {WEEKDAYS[d.getDay()]}
              </span>
              <span
                className={cn(
                  "relative font-medium text-sm tabular-nums",
                  active ? "text-primary-foreground" : today ? "text-destructive-foreground" : "text-foreground",
                )}
              >
                {d.getDate()}
              </span>
              <span className="relative flex h-1 items-center gap-0.5">
                {dots.map((t) => (
                  <span className={cn("size-1 rounded-full", tones[t].dot)} key={t} />
                ))}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-1.5 border-t px-4 py-2.5">
        {calendars.map((c) => {
          const off = hidden.has(c.id);
          return (
            <button
              aria-pressed={!off}
              className={cn(
                "relative inline-flex h-6 cursor-pointer items-center gap-1.5 rounded-full border px-2 text-xs outline-none transition-[color,background-color,border-color,scale] duration-150 ease-out after:absolute after:inset-x-0 after:-inset-y-1 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]",
                off ? "border-dashed text-muted-foreground" : "bg-background text-foreground dark:bg-input/32",
              )}
              key={c.id}
              onClick={() => toggleCalendar(c.id)}
              type="button"
            >
              <span
                className={cn("size-2 rounded-full transition-opacity", tones[c.tone].dot, off && "opacity-32")}
              />
              {c.name}
            </button>
          );
        })}
      </div>

      <div className="flex items-baseline justify-between gap-3 border-t px-4 pt-3 pb-2">
        <p className="font-medium text-sm">
          {isToday ? "Today" : WEEKDAYS_LONG[day.getDay()]}
          <span className="font-normal text-muted-foreground">
            , {MONTHS[day.getMonth()].slice(0, 3)} {day.getDate()}
          </span>
        </p>
        <p className="text-muted-foreground text-xs tabular-nums">
          {dayEvents.length} {dayEvents.length === 1 ? "event" : "events"}
          {booked > 0 && ` · ${formatDuration(booked)} booked`}
        </p>
      </div>

      <AnimatePresence initial={false}>
        {firstConflict && (
          <motion.div
            animate={{ height: "auto", opacity: 1 }}
            className="overflow-hidden"
            exit={{ height: 0, opacity: 0 }}
            initial={{ height: 0, opacity: 0 }}
            transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 34 }}
          >
            <div
              className="mx-3 mb-2 flex items-start gap-2 rounded-xl bg-warning/10 px-3 py-2 text-warning-foreground text-xs dark:bg-warning/16"
              role="status"
            >
              <TriangleAlertIcon aria-hidden className="mt-px size-3.5 shrink-0" />
              <p className="min-w-0">
                <span className="font-medium">{firstConflict.a.title}</span> overlaps{" "}
                <span className="font-medium">{firstConflict.b.title}</span> by {formatDuration(firstConflict.minutes)}
                {conflicts.length > 1 && ` · ${conflicts.length - 1} more`}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className="relative h-[300px] overflow-y-auto overscroll-contain border-t [mask-image:linear-gradient(to_bottom,black_calc(100%-28px),transparent)] [scrollbar-width:thin]"
        ref={scrollRef}
      >
        <div className="relative" style={{ height: height + 16 }}>
          {hours.map((h) => (
            <div
              aria-hidden
              className={cn(
                "absolute inset-x-0 flex -translate-y-1/2 items-center transition-opacity",
                showNow && Math.abs(h * 60 - nowMinutes) < 14 && "[&>span:first-child]:opacity-0",
              )}
              key={h}
              style={{ top: 8 + (h * 60 - rangeStart) * PX_PER_MIN }}
            >
              <span className="w-14 pe-2 text-right text-[11px] text-muted-foreground tabular-nums">
                {formatTime(h * 60)}
              </span>
              <span className="h-px flex-1 bg-border" />
            </div>
          ))}

          <div className="absolute inset-y-2 right-2 left-14">
            {dayEvents.length === 0 && (
              <div className="absolute inset-x-0 top-12 flex flex-col items-center gap-1.5 text-center text-muted-foreground text-xs">
                <CalendarOffIcon aria-hidden className="size-4" />
                Nothing scheduled
              </div>
            )}
            {placed.map(({ event: ev, col, cols, conflict }) => {
              const cal = calendarById.get(ev.calendarId);
              const tone = tones[cal?.tone ?? "neutral"];
              const s = minutesOf(ev.start);
              const length = (+ev.end - +ev.start) / 60000;
              const top = (s - rangeStart) * PX_PER_MIN;
              const h = Math.max(20, length * PX_PER_MIN - 2);
              const compact = h < 40;
              const isDragging = dragging === ev.id;
              return (
                <motion.div
                  animate={{
                    top,
                    height: h,
                    left: `calc(${(col / cols) * 100}% + ${col ? 2 : 0}px)`,
                    width: `calc(${100 / cols}% - ${cols > 1 ? 2 : 0}px)`,
                    scale: isDragging ? 1.02 : 1,
                  }}
                  aria-label={`${ev.title}, ${formatRange(s, s + length)}${cal ? `, ${cal.name}` : ""}${conflict ? ", conflicts with another event" : ""}. Use arrow keys to move.`}
                  className={cn(
                    "group/event absolute flex cursor-grab touch-none select-none overflow-hidden rounded-lg bg-card py-1 ps-2.5 pe-2 outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isDragging && "z-10 cursor-grabbing shadow-lg/10 ring-1 ring-border",
                    conflict && !isDragging && "ring-1 ring-warning/60",
                    compact ? "items-center" : "flex-col",
                  )}
                  initial={false}
                  key={ev.id}
                  onKeyDown={(e) => onEventKey(e, ev)}
                  onPointerCancel={onPointerUp}
                  onPointerDown={(e) => onPointerDown(e, ev)}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  role="button"
                  tabIndex={0}
                  transition={isDragging ? { top: { duration: 0 }, scale: spring } : spring}
                >
                  <span aria-hidden className={cn("absolute inset-0 transition-colors", tone.soft)} />
                  <span aria-hidden className={cn("absolute inset-y-1 left-1 w-0.75 rounded-full", tone.dot)} />
                  <span className="relative flex min-w-0 items-center gap-1">
                    {conflict && <TriangleAlertIcon aria-hidden className="size-3 shrink-0 text-warning-foreground" />}
                    <span className="truncate font-medium text-foreground text-xs">{ev.title}</span>
                    {compact && (
                      <span className="shrink-0 text-muted-foreground text-xs tabular-nums">{formatTime(s)}</span>
                    )}
                  </span>
                  {!compact && (
                    <span className="relative truncate text-muted-foreground text-xs tabular-nums">
                      {formatRange(s, s + length)}
                    </span>
                  )}
                  {!compact && h > 58 && ev.location && (
                    <span className="relative mt-auto flex min-w-0 items-center gap-1 text-muted-foreground text-xs">
                      <MapPinIcon aria-hidden className="size-3 shrink-0" />
                      <span className="truncate">{ev.location}</span>
                    </span>
                  )}
                </motion.div>
              );
            })}
          </div>

          {showNow && (
            <div
              aria-label={`Now, ${formatTime(nowMinutes)}`}
              className="pointer-events-none absolute inset-x-0 z-20 flex -translate-y-1/2 items-center"
              role="img"
              style={{ top: 8 + (nowMinutes - rangeStart) * PX_PER_MIN }}
            >
              <span className="w-14 pe-1.5 text-right">
                <span className="rounded-full bg-destructive px-1.5 py-px font-medium text-[10px] text-white tabular-nums">
                  {formatTime(nowMinutes, false)}
                </span>
              </span>
              <span className="relative h-px flex-1 bg-destructive">
                <span className="absolute -top-[3px] -left-[3px] size-[7px] rounded-full bg-destructive" />
              </span>
            </div>
          )}
        </div>
      </div>
      <p aria-live="polite" className="sr-only">
        {announce}
      </p>
    </div>
  );
}
