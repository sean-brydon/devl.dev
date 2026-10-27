"use client";

import { AnimatePresence, MotionConfig, motion } from "motion/react";
import {
  CalendarDaysIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  MapPinIcon,
  PlusIcon,
  Trash2Icon,
  UsersIcon,
  VideoIcon,
  XIcon,
} from "lucide-react";
import {
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Kbd } from "@/components/ui/kbd";
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type CalendarTone = "teal" | "violet" | "sky" | "amber" | "rose";

export interface CalendarSource {
  id: string;
  name: string;
  tone: CalendarTone;
  visible?: boolean;
}

export interface CalendarEvent {
  id: string;
  title: string;
  calendar: string;
  date: string;
  start: number;
  end: number;
  allDay?: boolean;
  days?: number;
  location?: string;
  video?: boolean;
  people?: string[];
}

export interface CalendarWeekProps {
  calendars?: CalendarSource[];
  events?: CalendarEvent[];
  now?: string;
  className?: string;
}

const toneDot: Record<CalendarTone, string> = {
  teal: "bg-teal-500",
  violet: "bg-violet-500",
  sky: "bg-sky-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
};

const toneBlock: Record<CalendarTone, string> = {
  teal: "bg-[color-mix(in_oklab,var(--color-teal-500)_14%,var(--background))] text-teal-950 before:bg-teal-500 dark:bg-[color-mix(in_oklab,var(--color-teal-400)_16%,var(--background))] dark:text-teal-50",
  violet: "bg-[color-mix(in_oklab,var(--color-violet-500)_14%,var(--background))] text-violet-950 before:bg-violet-500 dark:bg-[color-mix(in_oklab,var(--color-violet-400)_18%,var(--background))] dark:text-violet-50",
  sky: "bg-[color-mix(in_oklab,var(--color-sky-500)_14%,var(--background))] text-sky-950 before:bg-sky-500 dark:bg-[color-mix(in_oklab,var(--color-sky-400)_16%,var(--background))] dark:text-sky-50",
  amber: "bg-[color-mix(in_oklab,var(--color-amber-500)_18%,var(--background))] text-amber-950 before:bg-amber-500 dark:bg-[color-mix(in_oklab,var(--color-amber-400)_16%,var(--background))] dark:text-amber-50",
  rose: "bg-[color-mix(in_oklab,var(--color-rose-500)_14%,var(--background))] text-rose-950 before:bg-rose-500 dark:bg-[color-mix(in_oklab,var(--color-rose-400)_16%,var(--background))] dark:text-rose-50",
};

const toneSolid: Record<CalendarTone, string> = {
  teal: "bg-teal-600 text-white before:bg-teal-800 dark:bg-teal-500",
  violet: "bg-violet-600 text-white before:bg-violet-800 dark:bg-violet-500",
  sky: "bg-sky-600 text-white before:bg-sky-800 dark:bg-sky-500",
  amber: "bg-amber-500 text-amber-950 before:bg-amber-700",
  rose: "bg-rose-600 text-white before:bg-rose-800 dark:bg-rose-500",
};

const toneCheck: Record<CalendarTone, string> = {
  teal: "border-teal-500 bg-teal-500",
  violet: "border-violet-500 bg-violet-500",
  sky: "border-sky-500 bg-sky-500",
  amber: "border-amber-500 bg-amber-500",
  rose: "border-rose-500 bg-rose-500",
};

const HOUR = 48;
const PX = HOUR / 60;
const SNAP = 15;
const ease = [0.23, 1, 0.32, 1] as const;
const settle = { type: "spring", stiffness: 640, damping: 46 } as const;

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function parse(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}
function addDays(date: string, n: number) {
  const d = parse(date);
  d.setUTCDate(d.getUTCDate() + n);
  return iso(d);
}
function weekday(date: string) {
  return (parse(date).getUTCDay() + 6) % 7;
}
function startOfWeek(date: string) {
  return addDays(date, -weekday(date));
}
function isoWeek(date: string) {
  const d = parse(date);
  d.setUTCDate(d.getUTCDate() + 3 - ((d.getUTCDay() + 6) % 7));
  const jan4 = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  return 1 + Math.round(((d.getTime() - jan4.getTime()) / 86400000 - 3 + ((jan4.getUTCDay() + 6) % 7)) / 7);
}

function diffDays(a: string, b: string) {
  return Math.round((parse(a).getTime() - parse(b).getTime()) / 86400000);
}
function fmtTime(min: number, withPeriod = true) {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  const h12 = ((h + 11) % 12) + 1;
  const period = h >= 12 ? "PM" : "AM";
  return `${h12}${m ? `:${String(m).padStart(2, "0")}` : ""}${withPeriod ? ` ${period}` : ""}`;
}
function fmtRange(a: number, b: number) {
  const samePeriod = a < 720 === b < 720;
  return `${fmtTime(a, !samePeriod)} – ${fmtTime(b)}`;
}
function fmtDuration(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h}h${m ? ` ${m}m` : ""}` : `${m}m`;
}
const snap = (min: number) => Math.round(min / SNAP) * SNAP;

const defaultCalendars: CalendarSource[] = [
  { id: "me", name: "Maya Okafor", tone: "teal", visible: true },
  { id: "team", name: "Team", tone: "violet", visible: true },
  { id: "product", name: "Product reviews", tone: "sky", visible: true },
  { id: "launches", name: "Launches", tone: "amber", visible: true },
  { id: "holidays", name: "Holidays", tone: "rose", visible: true },
];

function buildEvents(): CalendarEvent[] {
  const wk = "2026-10-19";
  const d = (n: number) => addDays(wk, n);
  const t = (h: number, m = 0) => h * 60 + m;
  const standups: CalendarEvent[] = [];
  for (let w = -1; w <= 1; w++) {
    for (let i = 0; i < 5; i++) {
      standups.push({
        id: `standup-${w}-${i}`,
        title: "Standup",
        calendar: "team",
        date: addDays(wk, w * 7 + i),
        start: t(9),
        end: t(9, 30),
        video: true,
      });
    }
  }
  return [
    ...standups,
    { id: "e1", title: "Pricing model review", calendar: "me", date: d(0), start: t(11), end: t(12), location: "Room Atlas", people: ["Jonas Weber", "Priya Raman"] },
    { id: "e2", title: "Onboarding v3 working session", calendar: "product", date: d(0), start: t(14), end: t(15, 30), video: true, people: ["Priya Raman", "Leo Marchetti"] },
    { id: "e3", title: "1:1 Jonas", calendar: "me", date: d(0), start: t(16), end: t(16, 30), video: true, people: ["Jonas Weber"] },
    { id: "e4", title: "Research readout", calendar: "team", date: d(1), start: t(10), end: t(11), location: "Big room", people: ["Ana Sousa"] },
    { id: "e5", title: "Lunch with Ellie", calendar: "me", date: d(1), start: t(12, 30), end: t(13, 30), location: "Canal Café" },
    { id: "e6", title: "Interview: Staff Engineer", calendar: "me", date: d(1), start: t(15), end: t(16), video: true, people: ["Sam Whitfield"] },
    { id: "e7", title: "Hiring sync", calendar: "team", date: d(1), start: t(15, 30), end: t(16, 15), people: ["Ana Sousa", "Sam Whitfield"] },
    { id: "e8", title: "Incident review: webhooks", calendar: "team", date: d(2), start: t(13), end: t(14), video: true, people: ["Sam Whitfield"] },
    { id: "e9", title: "Board prep", calendar: "me", date: d(2), start: t(16), end: t(17, 30), location: "Room Atlas" },
    { id: "e10", title: "Q4 pricing decision", calendar: "me", date: d(3), start: t(10), end: t(10, 45), video: true, people: ["Jonas Weber", "Priya Raman"] },
    { id: "e11", title: "Customer call: Fieldnote", calendar: "me", date: d(3), start: t(11, 30), end: t(12), video: true, people: ["Noor Haddad"] },
    { id: "e12", title: "Design crit", calendar: "product", date: d(3), start: t(14), end: t(15), location: "Studio", people: ["Priya Raman", "Leo Marchetti", "Ana Sousa"] },
    { id: "e13", title: "Release notes review", calendar: "launches", date: d(3), start: t(14, 30), end: t(15), people: ["Jonas Weber"] },
    { id: "e14", title: "Climbing", calendar: "me", date: d(3), start: t(18), end: t(19, 30), location: "Boulder Hall" },
    { id: "e15", title: "Focus: Q4 plan", calendar: "me", date: d(4), start: t(10), end: t(12) },
    { id: "e16", title: "Starter pricing goes live", calendar: "launches", date: d(4), start: t(15), end: t(15, 30) },
    { id: "e17", title: "Team drinks", calendar: "team", date: d(4), start: t(17), end: t(18, 30), location: "The Lantern" },
    { id: "e18", title: "Run club", calendar: "me", date: d(5), start: t(9), end: t(10) },
    { id: "a1", title: "Leo out", calendar: "team", date: d(3), start: 0, end: 0, allDay: true, days: 2 },
    { id: "a2", title: "Clocks go back", calendar: "holidays", date: d(6), start: 0, end: 0, allDay: true },
    { id: "n1", title: "Roadmap sync", calendar: "product", date: addDays(wk, 7), start: t(11), end: t(12), video: true },
    { id: "n2", title: "Lisbon offsite", calendar: "team", date: addDays(wk, 9), start: 0, end: 0, allDay: true, days: 2 },
    { id: "p1", title: "Quarterly planning", calendar: "product", date: addDays(wk, -5), start: t(13), end: t(16) },
  ];
}

interface Placed {
  ev: CalendarEvent;
  col: number;
  cols: number;
}

function placeDay(events: CalendarEvent[]): Placed[] {
  const sorted = [...events].sort((a, b) => a.start - b.start || b.end - a.end);
  const out: Placed[] = [];
  let cluster: Placed[] = [];
  let clusterEnd = -1;
  const flush = () => {
    const cols = Math.max(1, ...cluster.map((p) => p.col + 1));
    for (const p of cluster) p.cols = cols;
    out.push(...cluster);
    cluster = [];
  };
  for (const ev of sorted) {
    if (ev.start >= clusterEnd && cluster.length) flush();
    const used = new Set(cluster.filter((p) => p.ev.end > ev.start).map((p) => p.col));
    let col = 0;
    while (used.has(col)) col++;
    cluster.push({ ev, col, cols: 1 });
    clusterEnd = Math.max(clusterEnd, ev.end);
  }
  if (cluster.length) flush();
  return out;
}

function packAllDay(list: CalendarEvent[], first: string, count: number) {
  const rows: number[][] = [];
  return [...list]
    .sort((a, b) => a.date.localeCompare(b.date) || (b.days ?? 1) - (a.days ?? 1))
    .map((e) => {
      const startIdx = Math.max(0, diffDays(e.date, first));
      const endIdx = Math.min(count - 1, diffDays(addDays(e.date, (e.days ?? 1) - 1), first));
      let row = rows.findIndex((r) => r.every((c) => c < startIdx || c > endIdx));
      if (row < 0) row = rows.push([]) - 1;
      for (let c = startIdx; c <= endIdx; c++) rows[row].push(c);
      return { e, row, startIdx, endIdx };
    });
}

function toDate(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function fromDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function MiniMonth({
  month,
  onMonth,
  selected,
  today,
  weekStart,
  wholeWeek,
  onPick,
  busy,
}: {
  month: string;
  onMonth: (m: string) => void;
  selected: string;
  today: string;
  weekStart: string;
  wholeWeek: boolean;
  onPick: (d: string) => void;
  busy: Set<string>;
}) {
  const range = wholeWeek
    ? { from: toDate(weekStart), to: toDate(addDays(weekStart, 6)) }
    : { from: toDate(selected), to: toDate(selected) };
  return (
    <Calendar
      className="mx-auto p-0 [--cell-size:--spacing(8)] sm:[--cell-size:--spacing(8)]"
      mode="range"
      modifiers={{ busy: [...busy].filter((d) => d !== today).map(toDate) }}
      modifiersClassNames={{
        busy: "*:before:pointer-events-none *:before:absolute *:before:bottom-1 *:before:start-1/2 *:before:size-[3px] *:before:-translate-x-1/2 *:before:rounded-full *:before:bg-muted-foreground/60 [&[data-selected]:not(.range-middle)>*]:before:bg-primary-foreground/72",
      }}
      month={toDate(month)}
      onDayClick={(day) => onPick(fromDate(day))}
      onMonthChange={(m) => onMonth(fromDate(m))}
      onSelect={() => {}}
      selected={range}
      today={toDate(today)}
      weekStartsOn={1}
    />
  );
}

type DragState = {
  id: string;
  mode: "move" | "resize" | "create";
  x: number;
  y: number;
  start: number;
  end: number;
  date: string;
  moved: boolean;
  anchorMin: number;
};

type ViewMode = "day" | "week";

export function CalendarWeek({
  calendars: initialCalendars = defaultCalendars,
  events: initialEvents,
  now = "2026-10-22T10:40",
  className,
}: CalendarWeekProps) {
  const today = now.slice(0, 10);
  const [hh, mm] = now.slice(11, 16).split(":").map(Number);
  const [nowMin, setNowMin] = useState(hh * 60 + mm);
  const [calendars, setCalendars] = useState(initialCalendars);
  const [events, setEvents] = useState<CalendarEvent[]>(() => initialEvents ?? buildEvents());
  const [view, setView] = useState<ViewMode>("week");
  const [focusDay, setFocusDay] = useState(today);
  const [month, setMonth] = useState(today.slice(0, 8) + "01");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [narrow, setNarrow] = useState(false);
  const [docked, setDocked] = useState(true);
  const [toast, setToast] = useState<{ key: number; text: string; undo?: () => void } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const [allDayAt, setAllDayAt] = useState({ left: 12, top: 112 });

  useEffect(() => {
    const id = window.setInterval(() => setNowMin((m) => Math.min(m + 1, 24 * 60 - 1)), 60000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      setNarrow(e.contentRect.width < 672);
      setDocked(e.contentRect.width >= 896);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 8 * HOUR - 12;
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(id);
  }, [toast]);

  const mode: ViewMode = narrow ? "day" : view;
  const weekStart = startOfWeek(focusDay);
  const days = mode === "week" ? Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)) : [focusDay];
  const visibleCal = new Set(calendars.filter((c) => c.visible !== false).map((c) => c.id));
  const calOf = (id: string) => calendars.find((c) => c.id === id) ?? calendars[0];
  const shown = events.filter((e) => visibleCal.has(e.calendar));
  const timed = shown.filter((e) => !e.allDay);
  const allDay = shown.filter((e) => e.allDay && diffDays(addDays(e.date, (e.days ?? 1) - 1), days[0]) >= 0 && diffDays(e.date, days[days.length - 1]) <= 0);
  const busy = new Set(shown.map((e) => e.date));
  const selected = events.find((e) => e.id === selectedId) ?? null;

  const patch = (id: string, p: Partial<CalendarEvent>) => setEvents((es) => es.map((e) => (e.id === id ? { ...e, ...p } : e)));

  const goto = (d: string) => {
    setFocusDay(d);
    setMonth(d.slice(0, 8) + "01");
  };
  const step = (dir: number) => goto(addDays(focusDay, dir * (mode === "week" ? 7 : 1)));

  const header = () => {
    const a = parse(days[0]);
    const b = parse(days[days.length - 1]);
    if (mode === "day" && !narrow) return { main: `${MONTHS[a.getUTCMonth()]} ${a.getUTCDate()}`, sub: DAY_NAMES[weekday(days[0])] };
    if (a.getUTCMonth() === b.getUTCMonth()) return { main: MONTHS[a.getUTCMonth()], sub: String(a.getUTCFullYear()) };
    return { main: `${MONTHS[a.getUTCMonth()].slice(0, 3)} – ${MONTHS[b.getUTCMonth()].slice(0, 3)}`, sub: String(b.getUTCFullYear()) };
  };
  const head = header();

  const columnWidth = () => (gridRef.current ? gridRef.current.getBoundingClientRect().width / days.length : 1);

  const minuteAt = (clientY: number) => {
    const r = gridRef.current?.getBoundingClientRect();
    if (!r) return 0;
    return Math.max(0, Math.min(24 * 60, (clientY - r.top) / PX));
  };

  const beginDrag = (e: ReactPointerEvent, ev: CalendarEvent, m: "move" | "resize") => {
    if (e.button !== 0) return;
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDrag({ id: ev.id, mode: m, x: e.clientX, y: e.clientY, start: ev.start, end: ev.end, date: ev.date, moved: false, anchorMin: 0 });
  };

  const beginCreate = (e: ReactPointerEvent, date: string) => {
    if (e.button !== 0) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const at = Math.floor(minuteAt(e.clientY) / SNAP) * SNAP;
    const ev: CalendarEvent = { id: `new-${Date.now()}`, title: "", calendar: calendars[0]?.id ?? "me", date, start: at, end: at + 30 };
    setEvents((es) => [...es, ev]);
    setSelectedId(null);
    setEditing(null);
    setDrag({ id: ev.id, mode: "create", x: e.clientX, y: e.clientY, start: at, end: at + 30, date, moved: false, anchorMin: at });
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    if (!drag) return;
    const dy = e.clientY - drag.y;
    const dx = e.clientX - drag.x;
    const moved = drag.moved || Math.abs(dy) > 3 || Math.abs(dx) > 3;
    if (!moved) return;
    if (!drag.moved) setDrag({ ...drag, moved: true });
    const deltaMin = snap(dy / PX);
    if (drag.mode === "move") {
      const len = drag.end - drag.start;
      const start = Math.max(0, Math.min(24 * 60 - len, drag.start + deltaMin));
      const dDay = mode === "week" ? Math.round(dx / columnWidth()) : 0;
      const idx = Math.max(0, Math.min(days.length - 1, diffDays(drag.date, days[0]) + dDay));
      patch(drag.id, { start, end: start + len, date: days[idx] });
    } else if (drag.mode === "resize") {
      const end = Math.max(drag.start + SNAP, Math.min(24 * 60, drag.end + deltaMin));
      patch(drag.id, { end });
    } else {
      const at = snap(minuteAt(e.clientY));
      const a = Math.min(drag.anchorMin, at);
      const b = Math.max(drag.anchorMin + SNAP, at);
      patch(drag.id, { start: a, end: Math.max(a + SNAP, b) });
    }
  };

  const onPointerUp = () => {
    if (!drag) return;
    const d = drag;
    setDrag(null);
    if (d.mode === "create") {
      setSelectedId(d.id);
      setEditing(d.id);
      requestAnimationFrame(() => titleRef.current?.focus());
      return;
    }
    if (!d.moved) {
      setSelectedId(d.id);
      setEditing(null);
      return;
    }
    const ev = events.find((x) => x.id === d.id);
    if (ev && (ev.start !== d.start || ev.end !== d.end || ev.date !== d.date)) {
      setSelectedId(d.id);
      setToast({
        key: Date.now(),
        text: `${ev.title || "Event"} → ${DOW[weekday(ev.date)]} ${fmtRange(ev.start, ev.end)}`,
        undo: () => {
          patch(d.id, { start: d.start, end: d.end, date: d.date });
          setToast(null);
          rootRef.current?.focus({ preventScroll: true });
        },
      });
    }
  };

  const remove = (id: string) => {
    const ev = events.find((e) => e.id === id);
    if (!ev) return;
    setEvents((es) => es.filter((e) => e.id !== id));
    setSelectedId(null);
    setEditing(null);
    if (ev.title) {
      setToast({
        key: Date.now(),
        text: `Deleted “${ev.title}”`,
        undo: () => {
          setEvents((es) => [...es, ev]);
          setToast(null);
          rootRef.current?.focus({ preventScroll: true });
        },
      });
    }
    rootRef.current?.focus({ preventScroll: true });
  };

  const closeEditor = () => {
    if (editing) {
      const ev = events.find((e) => e.id === editing);
      if (ev && !ev.title.trim()) setEvents((es) => es.filter((e) => e.id !== editing));
    }
    setEditing(null);
    setSelectedId(null);
    rootRef.current?.focus({ preventScroll: true });
  };

  const newEventNow = () => {
    const date = mode === "day" ? focusDay : days.includes(today) ? today : days[0];
    const start = Math.ceil((date === today ? nowMin : 9 * 60) / 30) * 30;
    const ev: CalendarEvent = { id: `new-${Date.now()}`, title: "", calendar: calendars[0]?.id ?? "me", date, start, end: start + 30 };
    setEvents((es) => [...es, ev]);
    setSelectedId(ev.id);
    setEditing(ev.id);
    if (scrollRef.current) scrollRef.current.scrollTop = Math.max(0, start * PX - 120);
    requestAnimationFrame(() => titleRef.current?.focus());
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const t = e.target as HTMLElement;
    if (t.tagName === "INPUT" || t.tagName === "TEXTAREA") return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "Escape") {
      if (editing || selectedId) closeEditor();
      return;
    }
    if (selected && !selected.allDay) {
      const len = selected.end - selected.start;
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        const d = e.key === "ArrowUp" ? -SNAP : SNAP;
        if (e.shiftKey) patch(selected.id, { end: Math.max(selected.start + SNAP, Math.min(1440, selected.end + d)) });
        else {
          const start = Math.max(0, Math.min(1440 - len, selected.start + d));
          patch(selected.id, { start, end: start + len });
        }
        return;
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        const date = addDays(selected.date, e.key === "ArrowLeft" ? -1 : 1);
        patch(selected.id, { date });
        if (!days.includes(date)) goto(date);
        return;
      }
      if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        remove(selected.id);
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        setEditing(selected.id);
        requestAnimationFrame(() => titleRef.current?.focus());
        return;
      }
    }
    const k = e.key.toLowerCase();
    if (e.key === "ArrowLeft" || k === "k") step(-1);
    else if (e.key === "ArrowRight" || k === "j") step(1);
    else if (k === "t") goto(today);
    else if (k === "d") setView("day");
    else if (k === "w") setView("week");
    else if (k === "n" || k === "c") {
      e.preventDefault();
      newEventNow();
    }
  };

  const panel = selected ? { ev: selected, cal: calOf(selected.calendar), dayIndex: days.indexOf(selected.date) } : null;

  const sidebar = (
    <div className="flex h-full flex-col gap-6 px-3 pt-3 pb-4">
      <Button className="w-full justify-start transition-[box-shadow,scale] duration-150 ease-out active:scale-[0.97]" onClick={newEventNow}>
        <PlusIcon />
        New event
        <Kbd className="ms-auto bg-primary-foreground/16 text-primary-foreground">N</Kbd>
      </Button>
      <MiniMonth
        busy={busy}
        month={month}
        onMonth={setMonth}
        onPick={(d) => {
          setFocusDay(d);
          if (mode === "day" || narrow) setView("day");
        }}
        selected={focusDay}
        today={today}
        weekStart={weekStart}
        wholeWeek={mode === "week"}
      />
      <div>
        <div className="mb-1.5 ps-1.5 font-medium text-muted-foreground text-xs">Calendars</div>
        <ul className="flex flex-col gap-0.5">
          {calendars.map((c) => {
            const on = c.visible !== false;
            return (
              <li key={c.id}>
                <button
                  aria-pressed={on}
                  className="flex h-8 w-full cursor-pointer items-center gap-2.5 rounded-lg px-1.5 text-left outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => setCalendars((cs) => cs.map((x) => (x.id === c.id ? { ...x, visible: !on } : x)))}
                  type="button"
                >
                  <span
                    className={cn(
                      "flex size-4 shrink-0 items-center justify-center rounded-[5px] border-2 transition-colors duration-150",
                      on ? toneCheck[c.tone] : "border-muted-foreground/40 bg-transparent",
                    )}
                  >
                    <CheckIcon className={cn("size-3 text-white transition-opacity duration-150", on ? "opacity-100" : "opacity-0")} strokeWidth={3} />
                  </span>
                  <span className={cn("truncate", !on && "text-muted-foreground")}>{c.name}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="mt-auto hidden flex-col gap-1.5 text-muted-foreground text-xs @4xl:flex">
        <div className="flex items-center gap-1.5">
          <Kbd>←</Kbd>
          <Kbd>→</Kbd>
          <span>week</span>
          <Kbd className="ms-2">T</Kbd>
          <span>today</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd>
          <span>move event</span>
          <Kbd className="ms-2">⇧</Kbd>
          <span>resize</span>
        </div>
      </div>
    </div>
  );

  const nowTop = nowMin * PX;
  const todayIdx = days.indexOf(today);

  return (
    <MotionConfig reducedMotion="user">
      <div
        className={cn(
          "@container relative isolate flex h-[760px] w-full select-none overflow-hidden bg-sidebar text-foreground text-sm outline-none",
          className,
        )}
        onKeyDown={onKeyDown}
        ref={rootRef}
        tabIndex={-1}
      >
        <aside aria-label="Calendars" className="hidden w-64 shrink-0 overflow-y-auto @4xl:block">
          {sidebar}
        </aside>

        <main
          className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-background @4xl:my-2 @4xl:me-2 @4xl:rounded-2xl @4xl:border @4xl:shadow-xs/5"
          ref={mainRef}
        >
          <header className="flex h-14 shrink-0 items-center gap-2 border-b px-3 @lg:px-4">
            {docked ? (
              <h2 className="flex h-9 items-center gap-1.5">
                <span className="font-heading font-semibold text-lg tracking-tight">{head.main}</span>
                <span className="text-lg text-muted-foreground tabular-nums">{head.sub}</span>
              </h2>
            ) : (
            <Popover>
              <PopoverTrigger className="-ms-1.5 flex h-9 cursor-pointer items-center gap-1.5 rounded-lg px-1.5 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring data-popup-open:bg-accent">
                <span className="font-heading font-semibold text-lg tracking-tight">{head.main}</span>
                <span className="text-lg text-muted-foreground tabular-nums">{head.sub}</span>
                <ChevronDownIcon className="size-4 text-muted-foreground" />
              </PopoverTrigger>
              <PopoverPopup align="start" className="w-72">
                <div className="p-1">
                  <MiniMonth busy={busy} month={month} onMonth={setMonth} onPick={(d) => setFocusDay(d)} selected={focusDay} today={today} weekStart={weekStart} wholeWeek={mode === "week"} />
                  <div className="mt-3 flex flex-wrap gap-1.5 border-t pt-3">
                    {calendars.map((c) => {
                      const on = c.visible !== false;
                      return (
                        <button
                          aria-pressed={on}
                          className={cn(
                            "flex h-7 cursor-pointer items-center gap-1.5 rounded-full border px-2.5 text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                            on ? "bg-accent" : "text-muted-foreground",
                          )}
                          key={c.id}
                          onClick={() => setCalendars((cs) => cs.map((x) => (x.id === c.id ? { ...x, visible: !on } : x)))}
                          type="button"
                        >
                          <span className={cn("size-2 rounded-full", on ? toneDot[c.tone] : "bg-muted-foreground/40")} />
                          {c.name.split(" ")[0]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </PopoverPopup>
            </Popover>
            )}
            <div className="ms-auto flex items-center gap-1.5">
              <Button onClick={() => goto(today)} size="sm" variant="outline">
                Today
              </Button>
              <div className="flex">
                <Button aria-label={mode === "week" ? "Previous week" : "Previous day"} onClick={() => step(-1)} size="icon-sm" variant="ghost">
                  <ChevronLeftIcon />
                </Button>
                <Button aria-label={mode === "week" ? "Next week" : "Next day"} onClick={() => step(1)} size="icon-sm" variant="ghost">
                  <ChevronRightIcon />
                </Button>
              </div>
              <div aria-label="View" className="hidden rounded-lg bg-muted p-0.5 @2xl:flex" role="group">
                {(["day", "week"] as const).map((v) => (
                  <button
                    aria-pressed={view === v}
                    className={cn(
                      "relative h-7 cursor-pointer rounded-md px-2.5 font-medium text-xs capitalize outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      view === v ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                    )}
                    key={v}
                    onClick={() => setView(v)}
                    type="button"
                  >
                    {view === v && (
                      <motion.span
                        className="absolute inset-0 rounded-md bg-background shadow-xs/5 dark:bg-accent"
                        layoutId="cal-view"
                        transition={{ type: "spring", stiffness: 520, damping: 42 }}
                      />
                    )}
                    <span className="relative flex items-center gap-1.5">
                      {v}
                      <span className="text-[10px] text-muted-foreground uppercase">{v[0]}</span>
                    </span>
                  </button>
                ))}
              </div>
              <Button aria-label="New event" className="@4xl:hidden" onClick={newEventNow} size="icon-sm">
                <PlusIcon />
              </Button>
            </div>
          </header>

          {narrow && (
            <div className="grid shrink-0 grid-cols-7 gap-1 border-b px-2 py-2">
              {Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)).map((d) => {
                const on = d === focusDay;
                const isToday = d === today;
                return (
                  <button
                    aria-label={`${DOW[weekday(d)]} ${parse(d).getUTCDate()}`}
                    aria-pressed={on}
                    className="relative flex h-12 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    key={d}
                    onClick={() => setFocusDay(d)}
                    type="button"
                  >
                    {on && (
                      <motion.span
                        className="absolute inset-0 rounded-xl bg-accent"
                        layoutId="cal-strip"
                        transition={{ type: "spring", stiffness: 520, damping: 42 }}
                      />
                    )}
                    <span className={cn("relative text-[11px]", isToday ? "font-medium text-destructive-foreground" : "text-muted-foreground")}>
                      {DOW[weekday(d)].slice(0, 2)}
                    </span>
                    <span className={cn("relative font-medium tabular-nums", isToday && "text-destructive-foreground")}>{parse(d).getUTCDate()}</span>
                    {busy.has(d) && <span className="absolute bottom-1 size-1 rounded-full bg-muted-foreground/60" />}
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex shrink-0 overflow-y-hidden border-b [scrollbar-gutter:stable]">
            <div className="flex w-14 shrink-0 flex-col items-end pe-2 text-[10px] text-muted-foreground">
              {!narrow && (
                <span className="flex h-11 flex-col items-end justify-center leading-tight">
                  <span className="font-medium text-foreground/80 tabular-nums">W{isoWeek(days[0])}</span>
                  <span>CEST</span>
                </span>
              )}
              <span className="flex h-8 items-center">All day</span>
            </div>
            <div className="min-w-0 flex-1">
              {!narrow && (
                <div className="grid" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
                  {days.map((d) => {
                    const isToday = d === today;
                    return (
                      <button
                        className="flex h-11 cursor-pointer items-center gap-1.5 border-s ps-2.5 text-left outline-none hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                        key={d}
                        onClick={() => {
                          setFocusDay(d);
                          setView("day");
                        }}
                        type="button"
                      >
                        <span className={cn("text-xs", isToday ? "font-medium text-destructive-foreground" : "text-muted-foreground")}>{DOW[weekday(d)]}</span>
                        <span
                          className={cn(
                            "flex h-6 min-w-6 items-center justify-center rounded-full px-1 font-medium tabular-nums",
                            isToday && "bg-destructive text-white",
                          )}
                        >
                          {parse(d).getUTCDate()}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
              <div className="relative grid min-h-8 py-1" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
                {days.map((d) => (
                  <div className="border-s" key={d} style={{ gridColumn: "span 1", gridRow: "1 / span 3" }} />
                ))}
                {packAllDay(allDay, days[0], days.length).map(({ e, row, startIdx, endIdx }) => {
                  const cal = calOf(e.calendar);
                  return (
                    <button
                      className={cn(
                        "relative z-10 mx-1 my-px flex h-6 cursor-pointer items-center truncate rounded-md ps-2.5 pe-2 text-left font-medium text-xs outline-none before:absolute before:inset-y-1 before:left-1 before:w-0.5 before:rounded-full focus-visible:ring-2 focus-visible:ring-ring",
                        selectedId === e.id ? toneSolid[cal.tone] : toneBlock[cal.tone],
                      )}
                      key={e.id}
                      onClick={(evt) => {
                        const r = evt.currentTarget.getBoundingClientRect();
                        const m = mainRef.current?.getBoundingClientRect();
                        if (m) setAllDayAt({ left: Math.max(12, Math.min(r.left - m.left, m.width - 268)), top: r.bottom - m.top + 6 });
                        setSelectedId(e.id);
                        setEditing(null);
                      }}
                      style={{ gridColumn: `${startIdx + 1} / ${endIdx + 2}`, gridRow: row + 1 }}
                      type="button"
                    >
                      {e.title}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden [scrollbar-width:thin]" ref={scrollRef}>
            <div className="relative flex" style={{ height: 24 * HOUR }}>
              <div aria-hidden className="relative w-14 shrink-0">
                {Array.from({ length: 23 }, (_, i) => i + 1).map((h) => (
                  <span
                    className={cn(
                      "absolute right-2 -translate-y-1/2 text-[10px] text-muted-foreground tabular-nums transition-opacity",
                      todayIdx >= 0 && Math.abs(h * 60 - nowMin) < 24 && "opacity-0",
                    )}
                    key={h}
                    style={{ top: h * HOUR }}
                  >
                    {fmtTime(h * 60)}
                  </span>
                ))}
                {todayIdx >= 0 && (
                  <span
                    className="absolute right-1 z-20 -translate-y-1/2 rounded-md bg-destructive px-1 py-px font-medium text-[10px] text-white tabular-nums"
                    style={{ top: nowTop }}
                  >
                    {fmtTime(nowMin).replace(" AM", "").replace(" PM", "")}
                  </span>
                )}
              </div>

              <div
                className="relative grid min-w-0 flex-1"
                onPointerCancel={onPointerUp}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                ref={gridRef}
                style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}
              >
                <div aria-hidden className="pointer-events-none absolute inset-0">
                  {Array.from({ length: 24 }, (_, h) => (
                    <div className="absolute inset-x-0 border-t border-border/70" key={h} style={{ top: h * HOUR }} />
                  ))}
                  {Array.from({ length: 24 }, (_, h) => (
                    <div className="absolute inset-x-0 border-t border-border/30 border-dashed" key={`h${h}`} style={{ top: h * HOUR + HOUR / 2 }} />
                  ))}
                  {todayIdx >= 0 && nowMin <= 24 * 60 && <div className="absolute inset-x-0 h-px -translate-y-1/2 bg-destructive/25" style={{ top: nowTop }} />}
                </div>

                {days.map((d) => {
                  const placed = placeDay(timed.filter((e) => e.date === d));
                  const isToday = d === today;
                  return (
                    <div
                      aria-label={`${DOW[weekday(d)]} ${parse(d).getUTCDate()}, drag to create an event`}
                      className={cn("relative border-s", weekday(d) >= 5 && "bg-muted/40")}
                      key={d}
                      onPointerDown={(e) => beginCreate(e, d)}
                      role="group"
                    >
                      {isToday && nowMin <= 24 * 60 && (
                        <div aria-hidden className="pointer-events-none absolute inset-x-0 z-20" style={{ top: nowTop }}>
                          <div className="absolute inset-x-0 h-0.5 -translate-y-1/2 bg-destructive" />
                          <div className="absolute -left-1.5 size-3 -translate-y-1/2 rounded-full bg-destructive ring-2 ring-background" />
                        </div>
                      )}
                      <AnimatePresence initial={false}>
                        {placed.map(({ ev, col, cols }) => {
                          const cal = calOf(ev.calendar);
                          const isSel = selectedId === ev.id;
                          const isDrag = drag?.id === ev.id && (drag.moved || drag.mode === "create");
                          const height = Math.max((ev.end - ev.start) * PX, 18);
                          const short = height < 40;
                          const past = d < today || (d === today && ev.end <= nowMin);
                          return (
                            <motion.div
                              animate={{ opacity: 1, scale: 1, y: ev.start * PX }}
                              aria-label={`${ev.title || "New event"}, ${fmtRange(ev.start, ev.end)}`}
                              className={cn(
                                "group/ev @container absolute top-0 z-10 cursor-grab touch-none overflow-hidden rounded-md bg-clip-padding text-left outline-none before:absolute before:inset-y-1 before:left-1 before:w-0.5 before:rounded-full focus-visible:ring-2 focus-visible:ring-ring",
                                isSel || isDrag ? toneSolid[cal.tone] : toneBlock[cal.tone],
                                isDrag && "z-30 cursor-grabbing shadow-lg/20",
                                past && !isSel && !isDrag && "[&>div]:opacity-65 before:opacity-60",
                                cols > 1 && "ring-1 ring-background",
                              )}
                              exit={{ opacity: 0, scale: 0.96 }}
                              initial={{ opacity: 0, scale: 0.96, y: ev.start * PX }}
                              key={ev.id}
                              onDoubleClick={() => {
                                setSelectedId(ev.id);
                                setEditing(ev.id);
                                requestAnimationFrame(() => titleRef.current?.focus());
                              }}
                              onKeyDown={(e) => {
                                if (e.key === " ") {
                                  e.preventDefault();
                                  setSelectedId(ev.id);
                                }
                              }}
                              onPointerDown={(e) => beginDrag(e, ev, "move")}
                              role="button"
                              style={{
                                height,
                                left: `calc(${(col / cols) * 100}% + 2px)`,
                                width: `calc(${(col === cols - 1 ? 1 / cols : Math.min(1 - col / cols, (mode === "week" ? 1.7 : 1) / cols)) * 100}% - 6px)`,
                                zIndex: isDrag ? 30 : 10 + col,
                              }}
                              tabIndex={0}
                              onFocus={() => setSelectedId(ev.id)}
                              transition={isDrag ? { duration: 0 } : { y: settle, opacity: { duration: 0.15 }, scale: { duration: 0.15 } }}
                            >
                              <div className={cn("flex h-full flex-col ps-3 pe-1.5", short ? "flex-row items-center gap-1.5 py-0" : "py-1")}>
                                <span className={cn("truncate font-medium text-xs leading-4", !ev.title && "italic opacity-70")}>
                                  {ev.title || "New event"}
                                </span>
                                <span className={cn("truncate text-[11px] tabular-nums leading-4 opacity-75", short && "hidden shrink-0 @[8rem]:inline")}>
                                  {short ? fmtTime(ev.start) : fmtRange(ev.start, ev.end)}
                                </span>
                                {!short && height > 64 && ev.location && (
                                  <span className="mt-0.5 flex items-center gap-1 truncate text-[11px] leading-4 opacity-75">
                                    <MapPinIcon className="size-3 shrink-0" />
                                    {ev.location}
                                  </span>
                                )}
                              </div>
                              {isDrag && height >= 40 && (
                                <span className="pointer-events-none absolute right-1.5 bottom-1.5 rounded bg-black/20 px-1 font-medium text-[10px] tabular-nums">
                                  {fmtDuration(ev.end - ev.start)}
                                </span>
                              )}
                              <span
                                aria-hidden
                                className="absolute inset-x-0 bottom-0 h-2.5 cursor-ns-resize"
                                onPointerDown={(e) => beginDrag(e, ev, "resize")}
                              >
                                <span className="absolute bottom-0.5 left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full bg-current opacity-0 transition-opacity group-hover/ev:opacity-40" />
                              </span>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  );
                })}

                <AnimatePresence>
                  {panel && !drag && panel.dayIndex >= 0 && !panel.ev.allDay && (
                    <EventCard
                      calendars={calendars}
                      cols={days.length}
                      dayIndex={panel.dayIndex}
                      editing={editing === panel.ev.id}
                      ev={panel.ev}
                      key={panel.ev.id}
                      onCalendar={(id) => patch(panel.ev.id, { calendar: id })}
                      onClose={closeEditor}
                      onDelete={() => remove(panel.ev.id)}
                      onEdit={() => {
                        setEditing(panel.ev.id);
                        requestAnimationFrame(() => titleRef.current?.focus());
                      }}
                      onSave={() => {
                        if (!panel.ev.title.trim()) patch(panel.ev.id, { title: "Busy" });
                        setEditing(null);
                        setToast({ key: Date.now(), text: `Saved for ${DOW[weekday(panel.ev.date)]} ${fmtRange(panel.ev.start, panel.ev.end)}` });
                        rootRef.current?.focus({ preventScroll: true });
                      }}
                      onTitle={(title) => patch(panel.ev.id, { title })}
                      scrollRef={scrollRef}
                      titleRef={titleRef}
                    />
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {selected?.allDay && (
              <motion.div
                animate={{ opacity: 1, scale: 1 }}
                className="absolute z-40 w-64 origin-top-left rounded-xl border bg-popover p-3 shadow-lg/10"
                exit={{ opacity: 0, scale: 0.97 }}
                initial={{ opacity: 0, scale: 0.97 }}
                style={allDayAt}
                transition={{ duration: 0.16, ease }}
              >
                <div className="flex items-start gap-2">
                  <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", toneDot[calOf(selected.calendar).tone])} />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{selected.title}</div>
                    <div className="text-muted-foreground text-xs">
                      All day{selected.days && selected.days > 1 ? ` · ${selected.days} days` : ""} · {calOf(selected.calendar).name}
                    </div>
                  </div>
                  <Button aria-label="Close" onClick={closeEditor} size="icon-xs" variant="ghost">
                    <XIcon />
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div aria-live="polite" className="pointer-events-none absolute inset-x-0 bottom-4 z-40 flex justify-center px-4 @2xl:justify-start @2xl:ps-[4.5rem]">
            <AnimatePresence mode="popLayout">
              {toast && (
                <motion.div
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="pointer-events-auto flex h-10 max-w-full items-center gap-3 rounded-full border bg-popover ps-4 pe-1.5 shadow-lg/10"
                  exit={{ opacity: 0, y: 6, scale: 0.98 }}
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  key={toast.key}
                  transition={{ duration: 0.2, ease }}
                >
                  <span className="truncate text-sm tabular-nums">{toast.text}</span>
                  {toast.undo ? (
                    <Button className="rounded-full" onClick={toast.undo} size="xs" variant="secondary">
                      Undo
                    </Button>
                  ) : (
                    <span className="w-1" />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>
    </MotionConfig>
  );
}

function EventCard({
  ev,
  calendars,
  dayIndex,
  cols,
  editing,
  titleRef,
  scrollRef,
  onTitle,
  onCalendar,
  onSave,
  onClose,
  onDelete,
  onEdit,
}: {
  ev: CalendarEvent;
  calendars: CalendarSource[];
  dayIndex: number;
  cols: number;
  editing: boolean;
  titleRef: RefObject<HTMLInputElement | null>;
  scrollRef: RefObject<HTMLDivElement | null>;
  onTitle: (t: string) => void;
  onCalendar: (id: string) => void;
  onSave: () => void;
  onClose: () => void;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const cal = calendars.find((c) => c.id === ev.calendar) ?? calendars[0];
  const cardRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const card = cardRef.current;
    const box = scrollRef.current;
    if (!card || !box) return;
    const top = card.offsetTop;
    const bottom = top + card.offsetHeight;
    if (bottom > box.scrollTop + box.clientHeight - 12) box.scrollTo({ top: bottom - box.clientHeight + 12, behavior: "smooth" });
    else if (top < box.scrollTop + 8) box.scrollTo({ top: top - 8, behavior: "smooth" });
  }, [scrollRef, editing]);
  const toRight = cols === 1 ? false : dayIndex < cols - 2;
  const single = cols === 1;
  const top = Math.max(4, ev.start * PX - 8);
  const style = single
    ? { top: ev.end * PX + 8, right: 12, width: "min(22rem, calc(100% - 24px))" }
    : toRight
      ? { top, left: `calc(${((dayIndex + 1) / cols) * 100}% + 6px)` }
      : { top, right: `calc(${((cols - dayIndex) / cols) * 100}% + 6px)` };
  return (
    <motion.div
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "absolute z-40 w-72 cursor-default select-text rounded-xl border bg-popover text-popover-foreground shadow-lg/10",
        single ? "origin-top" : toRight ? "origin-top-left" : "origin-top-right",
      )}
      exit={{ opacity: 0, scale: 0.97 }}
      initial={{ opacity: 0, scale: 0.97 }}
      onPointerDown={(e) => e.stopPropagation()}
      ref={cardRef}
      role="dialog"
      aria-label={editing ? "Edit event" : ev.title}
      style={style}
      transition={{ duration: 0.16, ease }}
    >
      <div className="flex items-start gap-2 p-3 pb-2">
        <span className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", toneDot[cal.tone])} />
        {editing ? (
          <input
            aria-label="Event title"
            className="min-w-0 flex-1 bg-transparent font-medium text-sm outline-none placeholder:text-muted-foreground/70"
            onChange={(e) => onTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSave();
              if (e.key === "Escape") onClose();
            }}
            placeholder="Add a title"
            ref={titleRef}
            value={ev.title}
          />
        ) : (
          <button className="min-w-0 flex-1 cursor-text text-left font-medium leading-5 outline-none" onClick={onEdit} type="button">
            {ev.title}
          </button>
        )}
        <Button aria-label="Close" className="-me-1 -mt-0.5" onClick={onClose} size="icon-xs" variant="ghost">
          <XIcon />
        </Button>
      </div>
      <div className="flex flex-col gap-1.5 px-3 pb-3 text-muted-foreground text-xs">
        <div className="flex items-center gap-2">
          <ClockIcon className="size-3.5 shrink-0" />
          <span className="tabular-nums">
            {DOW[weekday(ev.date)]} {MONTHS[parse(ev.date).getUTCMonth()].slice(0, 3)} {parse(ev.date).getUTCDate()} · {fmtRange(ev.start, ev.end)}
          </span>
          <span className="ms-auto tabular-nums">{fmtDuration(ev.end - ev.start)}</span>
        </div>
        {ev.location && (
          <div className="flex items-center gap-2">
            <MapPinIcon className="size-3.5 shrink-0" />
            {ev.location}
          </div>
        )}
        {ev.video && (
          <div className="flex items-center gap-2">
            <VideoIcon className="size-3.5 shrink-0" />
            <span className="text-info-foreground">meet.kestrel.dev/{ev.id}</span>
          </div>
        )}
        {ev.people?.length ? (
          <div className="flex items-start gap-2">
            <UsersIcon className="mt-px size-3.5 shrink-0" />
            <span className="text-pretty">{ev.people.join(", ")}</span>
          </div>
        ) : null}
        <div className="flex items-center gap-2">
          <CalendarDaysIcon className="size-3.5 shrink-0" />
          {editing ? (
            <div className="flex flex-wrap gap-1">
              {calendars
                .filter((c) => c.id !== "holidays")
                .map((c) => (
                  <button
                    aria-pressed={c.id === ev.calendar}
                    className={cn(
                      "flex h-6 cursor-pointer items-center gap-1 rounded-full border px-2 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                      c.id === ev.calendar ? "border-foreground/20 bg-accent text-foreground" : "hover:text-foreground",
                    )}
                    key={c.id}
                    onClick={() => onCalendar(c.id)}
                    type="button"
                  >
                    <span className={cn("size-1.5 rounded-full", toneDot[c.tone])} />
                    {c.name.split(" ")[0]}
                  </button>
                ))}
            </div>
          ) : (
            cal.name
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5 border-t px-2 py-2">
        {editing ? (
          <>
            <Button className="transition-[box-shadow,scale] duration-150 ease-out active:scale-[0.97]" onClick={onSave} size="xs">
              Save
            </Button>
            <span className="text-muted-foreground text-xs">
              <Kbd className="h-4 text-[10px]">↵</Kbd>
            </span>
          </>
        ) : (
          <span className="flex items-center gap-1 ps-1 text-muted-foreground text-xs">
            <Kbd className="h-4 text-[10px]">↑↓</Kbd> move
            <Kbd className="ms-1 h-4 text-[10px]">⇧↑↓</Kbd> resize
          </span>
        )}
        <Button aria-label="Delete event" className="ms-auto" onClick={onDelete} size="icon-xs" variant="ghost">
          <Trash2Icon />
        </Button>
      </div>
    </motion.div>
  );
}
