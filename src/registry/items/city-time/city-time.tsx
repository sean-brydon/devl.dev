"use client";

import {
  BanknoteIcon,
  FlagIcon,
  LanguagesIcon,
  MapIcon,
  MountainIcon,
  NavigationIcon,
  PhoneIcon,
  RotateCcwIcon,
  RotateCwIcon,
  SearchIcon,
  UsersIcon,
} from "lucide-react";
import {
  AnimatePresence,
  animate,
  MotionConfig,
  type MotionValue,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { type KeyboardEvent, type ReactNode, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  Combobox,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxPopup,
} from "@/components/ui/combobox";
import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control";
import { cn } from "@/lib/utils";

export interface City {
  id: string;
  name: string;
  region: string;
  country: string;
  timeZone: string;
  latitude: number;
  longitude: number;
  elevation: number;
  population: number;
  currency: string;
  languages: string[];
  dialCode: string;
}

export type HourCycle = "12h" | "24h";

export interface CityTimeProps {
  cities?: City[];
  defaultCity?: string;
  workingHours?: { start: number; end: number };
  defaultHourCycle?: HourCycle;
  locale?: string;
  className?: string;
}

export const defaultCities: City[] = [
  {
    id: "flensburg",
    name: "Flensburg",
    region: "Schleswig-Holstein",
    country: "Germany",
    timeZone: "Europe/Berlin",
    latitude: 54.7937,
    longitude: 9.4469,
    elevation: 12,
    population: 92_550,
    currency: "Euro (EUR)",
    languages: ["German", "Danish", "Low German"],
    dialCode: "+49 461",
  },
  {
    id: "new-york",
    name: "New York",
    region: "New York",
    country: "United States",
    timeZone: "America/New_York",
    latitude: 40.7128,
    longitude: -74.006,
    elevation: 10,
    population: 8_258_035,
    currency: "US dollar (USD)",
    languages: ["English", "Spanish"],
    dialCode: "+1 212",
  },
  {
    id: "los-angeles",
    name: "Los Angeles",
    region: "California",
    country: "United States",
    timeZone: "America/Los_Angeles",
    latitude: 34.0522,
    longitude: -118.2437,
    elevation: 93,
    population: 3_820_914,
    currency: "US dollar (USD)",
    languages: ["English", "Spanish"],
    dialCode: "+1 213",
  },
  {
    id: "sao-paulo",
    name: "São Paulo",
    region: "São Paulo",
    country: "Brazil",
    timeZone: "America/Sao_Paulo",
    latitude: -23.5505,
    longitude: -46.6333,
    elevation: 760,
    population: 11_451_999,
    currency: "Brazilian real (BRL)",
    languages: ["Portuguese"],
    dialCode: "+55 11",
  },
  {
    id: "reykjavik",
    name: "Reykjavík",
    region: "Capital Region",
    country: "Iceland",
    timeZone: "Atlantic/Reykjavik",
    latitude: 64.1466,
    longitude: -21.9426,
    elevation: 15,
    population: 139_875,
    currency: "Icelandic króna (ISK)",
    languages: ["Icelandic"],
    dialCode: "+354",
  },
  {
    id: "longyearbyen",
    name: "Longyearbyen",
    region: "Svalbard",
    country: "Norway",
    timeZone: "Arctic/Longyearbyen",
    latitude: 78.2232,
    longitude: 15.6267,
    elevation: 20,
    population: 2_583,
    currency: "Norwegian krone (NOK)",
    languages: ["Norwegian"],
    dialCode: "+47 79",
  },
  {
    id: "mumbai",
    name: "Mumbai",
    region: "Maharashtra",
    country: "India",
    timeZone: "Asia/Kolkata",
    latitude: 19.076,
    longitude: 72.8777,
    elevation: 14,
    population: 12_442_373,
    currency: "Indian rupee (INR)",
    languages: ["Marathi", "Hindi", "English"],
    dialCode: "+91 22",
  },
  {
    id: "kathmandu",
    name: "Kathmandu",
    region: "Bagmati",
    country: "Nepal",
    timeZone: "Asia/Kathmandu",
    latitude: 27.7172,
    longitude: 85.324,
    elevation: 1_400,
    population: 845_767,
    currency: "Nepalese rupee (NPR)",
    languages: ["Nepali", "Newar"],
    dialCode: "+977 1",
  },
  {
    id: "tokyo",
    name: "Tokyo",
    region: "Kantō",
    country: "Japan",
    timeZone: "Asia/Tokyo",
    latitude: 35.6762,
    longitude: 139.6503,
    elevation: 40,
    population: 14_094_034,
    currency: "Japanese yen (JPY)",
    languages: ["Japanese"],
    dialCode: "+81 3",
  },
  {
    id: "sydney",
    name: "Sydney",
    region: "New South Wales",
    country: "Australia",
    timeZone: "Australia/Sydney",
    latitude: -33.8688,
    longitude: 151.2093,
    elevation: 39,
    population: 5_450_496,
    currency: "Australian dollar (AUD)",
    languages: ["English"],
    dialCode: "+61 2",
  },
  {
    id: "auckland",
    name: "Auckland",
    region: "Auckland",
    country: "New Zealand",
    timeZone: "Pacific/Auckland",
    latitude: -36.8509,
    longitude: 174.7645,
    elevation: 26,
    population: 1_798_300,
    currency: "New Zealand dollar (NZD)",
    languages: ["English", "Māori"],
    dialCode: "+64 9",
  },
];

const SECOND = 1_000;
const MINUTE = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;
const RAD = Math.PI / 180;
const ease = [0.23, 1, 0.32, 1] as const;
const glide = { type: "spring", duration: 0.5, bounce: 0 } as const;
const strip = Array.from({ length: 11 }, (_, slot) => slot % 10);
const ticks = [0, 3, 6, 9, 12, 15, 18, 21];
const shortZoneLocales = ["en-US", "en-GB", "en-AU", "en-IN", "en-NZ", "en-CA"];

type ZoneParts = { year: number; month: number; day: number; hour: number; minute: number; second: number };
type Shift = { at: number; from: number; to: number };
type Season = { start: number; end: number; offset: number };
type ClockYear = {
  start: number;
  end: number;
  seasons: Season[];
  standard: number;
  previous: Shift | null;
  next: Shift | null;
};
type Sun = { kind: "normal"; rise: number; set: number; noon: number } | { kind: "day"; noon: number } | { kind: "night"; noon: number };
type Daylight = { sun: Sun; yesterday: Sun; phase: number; next: { kind: "sunrise" | "sunset"; at: number } | null };

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(locale: string, options: Intl.DateTimeFormatOptions) {
  const key = `${locale}|${JSON.stringify(options)}`;
  let cached = formatters.get(key);
  if (!cached) {
    cached = new Intl.DateTimeFormat(locale, options);
    formatters.set(key, cached);
  }
  return cached;
}

function zoneParts(timeZone: string, at: number): ZoneParts {
  const parts: Record<string, number> = {};
  const wall = formatter("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  });
  for (const part of wall.formatToParts(at)) if (part.type !== "literal") parts[part.type] = Number(part.value);
  return { year: parts.year, month: parts.month, day: parts.day, hour: parts.hour % 24, minute: parts.minute, second: parts.second };
}

function offsetAt(timeZone: string, at: number) {
  const p = zoneParts(timeZone, at);
  const wall = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((wall - (at - (at % SECOND))) / MINUTE);
}

function dayOf(timeZone: string, at: number) {
  const p = zoneParts(timeZone, at);
  return Date.UTC(p.year, p.month - 1, p.day) / DAY;
}

function hoursOf(timeZone: string, at: number) {
  const p = zoneParts(timeZone, at);
  return p.hour + p.minute / 60;
}

function findShift(timeZone: string, from: number, direction: 1 | -1, days: number): Shift | null {
  let a = from;
  let offsetA = offsetAt(timeZone, a);
  for (let walked = 0; walked < days; walked += 7) {
    const b = a + direction * 7 * DAY;
    const offsetB = offsetAt(timeZone, b);
    if (offsetB !== offsetA) {
      let lo = Math.floor(Math.min(a, b) / MINUTE);
      let hi = Math.ceil(Math.max(a, b) / MINUTE);
      const before = offsetAt(timeZone, lo * MINUTE);
      while (hi - lo > 1) {
        const mid = Math.floor((lo + hi) / 2);
        if (offsetAt(timeZone, mid * MINUTE) === before) lo = mid;
        else hi = mid;
      }
      return { at: hi * MINUTE, from: before, to: offsetAt(timeZone, hi * MINUTE) };
    }
    a = b;
    offsetA = offsetB;
  }
  return null;
}

function monthStart(at: number, plus = 0) {
  const date = new Date(at);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + plus, 1);
}

function clockYear(timeZone: string, now: number): ClockYear {
  const previous = findShift(timeZone, now, -1, 3_650);
  const next = findShift(timeZone, now, 1, 400);
  let start = monthStart(previous && now - previous.at < 300 * DAY ? previous.at : now - 150 * DAY);
  let end = monthStart(start, 12);
  if (next && next.at >= end) {
    end = monthStart(next.at, 1);
    start = monthStart(end, -12);
  }
  const seasons: Season[] = [];
  let cursor = start;
  let offset = offsetAt(timeZone, start);
  while (cursor < end) {
    const shift = findShift(timeZone, cursor, 1, Math.ceil((end - cursor) / DAY) + 7);
    const stop = shift && shift.at < end ? shift.at : end;
    seasons.push({ start: cursor, end: stop, offset });
    if (!shift || shift.at >= end) break;
    cursor = shift.at;
    offset = shift.to;
  }
  const standard = Math.min(...seasons.map((season) => season.offset));
  return { start, end, seasons, standard, previous, next };
}

function sunOn(day: number, latitude: number, longitude: number): Sun {
  const meanNoon = day + 2_440_588 - 2_451_545 - longitude / 360;
  const anomaly = (357.5291 + 0.98560028 * meanNoon) % 360;
  const m = anomaly * RAD;
  const centre = 1.9148 * Math.sin(m) + 0.02 * Math.sin(2 * m) + 0.0003 * Math.sin(3 * m);
  const ecliptic = ((anomaly + centre + 180 + 102.9372) % 360) * RAD;
  const transit = 2_451_545 + meanNoon + 0.0053 * Math.sin(m) - 0.0069 * Math.sin(2 * ecliptic);
  const sinDeclination = Math.sin(ecliptic) * Math.sin(23.4397 * RAD);
  const cosDeclination = Math.cos(Math.asin(sinDeclination));
  const lat = latitude * RAD;
  const cosHour = (Math.sin(-0.833 * RAD) - Math.sin(lat) * sinDeclination) / (Math.cos(lat) * cosDeclination);
  const toTime = (julian: number) => (julian - 2_440_587.5) * DAY;
  const noon = toTime(transit);
  if (cosHour < -1) return { kind: "day", noon };
  if (cosHour > 1) return { kind: "night", noon };
  const half = Math.acos(cosHour) / (2 * Math.PI);
  return { kind: "normal", rise: toTime(transit - half), set: toTime(transit + half), noon };
}

function daylightAt(city: City, now: number): Daylight {
  const today = dayOf(city.timeZone, now);
  const sun = sunOn(today, city.latitude, city.longitude);
  const yesterday = sunOn(today - 1, city.latitude, city.longitude);
  const midnight = today * DAY - offsetAt(city.timeZone, now) * MINUTE;
  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
  if (sun.kind === "day") return { sun, yesterday, phase: clamp(0.5 + (now - sun.noon) / DAY, 0.03, 0.97), next: null };
  if (sun.kind === "night") {
    const fromMidnight = (now - midnight) / DAY;
    return { sun, yesterday, phase: 1 + clamp((fromMidnight + 0.5) % 1, 0.03, 0.97), next: null };
  }
  if (now < sun.rise) {
    const start = yesterday.kind === "normal" ? yesterday.set : midnight;
    return { sun, yesterday, phase: 1 + clamp((now - start) / (sun.rise - start), 0, 1), next: { kind: "sunrise", at: sun.rise } };
  }
  if (now <= sun.set) {
    return { sun, yesterday, phase: (now - sun.rise) / (sun.set - sun.rise), next: { kind: "sunset", at: sun.set } };
  }
  const tomorrow = sunOn(today + 1, city.latitude, city.longitude);
  const end = tomorrow.kind === "normal" ? tomorrow.rise : midnight + DAY;
  return {
    sun,
    yesterday,
    phase: 1 + clamp((now - sun.set) / (end - sun.set), 0, 1),
    next: tomorrow.kind === "normal" ? { kind: "sunrise", at: tomorrow.rise } : null,
  };
}

function zoneNames(timeZone: string, at: number) {
  const nameOf = (locale: string, style: "short" | "long") =>
    formatter(locale, { timeZone, timeZoneName: style })
      .formatToParts(at)
      .find((part) => part.type === "timeZoneName")?.value ?? "";
  const short = shortZoneLocales
    .map((locale) => nameOf(locale, "short").replace(/^(GMT|UTC)([+\-−]0)?$/, "GMT"))
    .find((name) => !/^(GMT|UTC)[+\-−]/.test(name));
  return { short: short ?? null, long: nameOf("en-GB", "long") || timeZone };
}

function formatOffset(minutes: number) {
  const abs = Math.abs(minutes);
  const rest = abs % 60;
  return `UTC${minutes < 0 ? "−" : "+"}${Math.floor(abs / 60)}${rest ? `:${String(rest).padStart(2, "0")}` : ""}`;
}

function formatSpan(minutes: number) {
  const abs = Math.round(Math.abs(minutes));
  const hours = Math.floor(abs / 60);
  const rest = abs % 60;
  if (!hours) return `${rest} min`;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

function formatClock(hours: number, twelve: boolean) {
  const total = Math.round((((hours % 24) + 24) % 24) * 60) % 1_440;
  const hour = Math.floor(total / 60);
  const minute = String(total % 60).padStart(2, "0");
  if (!twelve) return `${String(hour).padStart(2, "0")}:${minute}`;
  return `${hour % 12 || 12}:${minute} ${hour < 12 ? "AM" : "PM"}`;
}

function formatTick(hours: number, twelve: boolean) {
  const total = Math.round((((hours % 24) + 24) % 24) * 60) % 1_440;
  const hour = Math.floor(total / 60);
  const minute = total % 60;
  const tail = minute ? `:${String(minute).padStart(2, "0")}` : "";
  if (!twelve) return `${String(hour).padStart(2, "0")}${tail}`;
  return `${hour % 12 || 12}${tail}${hour < 12 ? "a" : "p"}`;
}

function clockAt(timeZone: string, at: number, twelve: boolean) {
  return formatClock(hoursOf(timeZone, at), twelve);
}

function placeOf(timeZone: string) {
  return (timeZone.split("/").pop() ?? timeZone).replaceAll("_", " ");
}

function searchable(text: string) {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function useReducedMotionSafe() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && Boolean(prefers);
}

function useNow() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    let timer = 0;
    const tick = () => {
      const at = Date.now();
      setNow(at);
      timer = window.setTimeout(tick, SECOND - (at % SECOND) + 4);
    };
    tick();
    return () => window.clearTimeout(timer);
  }, []);
  return now;
}

function useVisitorZone() {
  const [zone, setZone] = useState<string | null>(null);
  useEffect(() => setZone(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"), []);
  return zone;
}

function Digit({ value, forward, reduce }: { value: number; forward: boolean; reduce: boolean }) {
  const turn = useMotionValue(value);
  const goal = useRef(value);
  const forwardRef = useRef(forward);
  forwardRef.current = forward;
  const y = useTransform(turn, (t) => `${-(((t % 10) + 10) % 10)}em`);

  useEffect(() => {
    const at = ((goal.current % 10) + 10) % 10;
    let step = (value - at + 10) % 10;
    if (!forwardRef.current && step > 5) step -= 10;
    goal.current += step;
    if (reduce) {
      turn.jump(goal.current);
      return;
    }
    if (turn.get() === goal.current) return;
    const controls = animate(turn, goal.current, { type: "spring", stiffness: 320, damping: 2 * Math.sqrt(320) });
    return () => controls.stop();
  }, [value, reduce, turn]);

  return (
    <span className="relative inline-block h-[1em] overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_12%,black_88%,transparent)]">
      <span className="invisible block h-[1em]">0</span>
      <motion.span className="absolute inset-x-0 top-0 flex flex-col" style={{ y }}>
        {strip.map((digit, slot) => (
          <span className="block h-[1em] text-center" key={slot}>
            {digit}
          </span>
        ))}
      </motion.span>
    </span>
  );
}

function Slot({ children }: { children: ReactNode }) {
  return (
    <span className="relative inline-block h-[1em]">
      <span className="invisible">0</span>
      <span className="absolute inset-0 flex items-center justify-center">{children}</span>
    </span>
  );
}

function Colon() {
  return (
    <span className="mx-[0.05em] flex h-[1em] flex-col items-center justify-center gap-[0.19em] pt-[0.02em] text-foreground/30">
      <span className="size-[0.1em] rounded-full bg-current" />
      <span className="size-[0.1em] rounded-full bg-current" />
    </span>
  );
}

function BigTime({
  timeZone,
  now,
  twelve,
  forward,
  reduce,
}: {
  timeZone: string;
  now: number | null;
  twelve: boolean;
  forward: boolean;
  reduce: boolean;
}) {
  const p = now === null ? null : zoneParts(timeZone, now);
  const hour = p ? (twelve ? p.hour % 12 || 12 : p.hour) : 0;
  const hours = twelve ? String(hour) : String(hour).padStart(2, "0");
  const minutes = p ? String(p.minute).padStart(2, "0") : "00";

  return (
    <div className="flex items-end font-heading font-semibold text-[clamp(3.75rem,24cqi,8.25rem)] tabular-nums leading-none tracking-[-0.03em]">
      <span aria-hidden className="flex">
        {p ? (
          <>
            {hours.length > 1 && <Digit forward={forward} reduce={reduce} value={Number(hours[0])} />}
            <Digit forward={forward} reduce={reduce} value={Number(hours[hours.length - 1])} />
            <Colon />
            <Digit forward={forward} reduce={reduce} value={Number(minutes[0])} />
            <Digit forward={forward} reduce={reduce} value={Number(minutes[1])} />
          </>
        ) : (
          <span className="flex text-muted-foreground/30">
            <Slot>–</Slot>
            <Slot>–</Slot>
            <Colon />
            <Slot>–</Slot>
            <Slot>–</Slot>
          </span>
        )}
      </span>
      <span
        aria-hidden
        className="ms-[0.14em] mb-[0.225em] flex flex-col gap-[0.25em] font-medium font-sans text-[0.2em] text-muted-foreground leading-none tracking-normal"
      >
        <span className={cn(!twelve && "invisible")}>{p && p.hour >= 12 ? "PM" : "AM"}</span>
        <span className="tabular-nums">{p ? `:${String(p.second).padStart(2, "0")}` : ":––"}</span>
      </span>
    </div>
  );
}

function HourCycleSwitch({ value, onChange }: { value: HourCycle; onChange: (value: HourCycle) => void }) {
  const options: HourCycle[] = ["12h", "24h"];
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const index = options.indexOf(value);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === "Home" ? 0 : event.key === "End" ? 1 : 1 - index;
    onChange(options[next]);
    refs.current[next]?.focus();
  };

  return (
    <SegmentedControl aria-label="Clock format" onKeyDown={onKeyDown} role="radiogroup" size="sm">
      {options.map((option, i) => {
        const checked = option === value;
        return (
          <SegmentedControlItem
            aria-checked={checked}
            className="min-w-11 px-2.5 font-mono text-muted-foreground text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
            data-checked={checked ? "" : undefined}
            key={option}
            onClick={() => onChange(option)}
            ref={(el: HTMLButtonElement | null) => {
              refs.current[i] = el;
            }}
            role="radio"
            tabIndex={checked ? 0 : -1}
          >
            {option}
          </SegmentedControlItem>
        );
      })}
    </SegmentedControl>
  );
}

function Swap({ id, children, className }: { id: string; children: ReactNode; className?: string }) {
  return (
    <AnimatePresence initial={false} mode="popLayout">
      <motion.span
        animate={{ opacity: 1 }}
        className={cn("inline-block", className)}
        exit={{ opacity: 0 }}
        initial={{ opacity: 0 }}
        key={id}
        transition={{ duration: 0.16, ease }}
      >
        {children}
      </motion.span>
    </AnimatePresence>
  );
}

function CityPicker({
  cities,
  city,
  now,
  twelve,
  onChange,
}: {
  cities: City[];
  city: City;
  now: number | null;
  twelve: boolean;
  onChange: (id: string) => void;
}) {
  return (
    <Combobox<City>
      autoHighlight
      filter={(item, query) => {
        const needle = searchable(query.trim());
        if (!needle || needle === searchable(city.name)) return true;
        return searchable(`${item.name} ${item.region} ${item.country} ${item.timeZone}`).includes(needle);
      }}
      isItemEqualToValue={(a, b) => a.id === b.id}
      itemToStringLabel={(item) => item.name}
      items={cities}
      onValueChange={(next) => next && onChange(next.id)}
      value={city}
    >
      <ComboboxInput aria-label="Choose a city" placeholder="Search a city" startAddon={<SearchIcon />} triggerProps={{ "aria-label": "Show cities" }} />
      <ComboboxPopup className="w-(--anchor-width) min-w-64">
        <ComboboxEmpty>No city by that name.</ComboboxEmpty>
        <ComboboxList>
          {(item: City) => (
            <ComboboxItem className="py-1.5" key={item.id} value={item}>
              <span className="flex items-center justify-between gap-3">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{item.name}</span>
                  <span className="block truncate text-muted-foreground text-xs">{item.country}</span>
                </span>
                <span className="shrink-0 text-end text-muted-foreground text-xs tabular-nums">
                  <span className="block text-foreground">{now === null ? "––:––" : clockAt(item.timeZone, now, twelve)}</span>
                  <span className="block">{now === null ? "UTC" : formatOffset(offsetAt(item.timeZone, now))}</span>
                </span>
              </span>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxPopup>
    </Combobox>
  );
}

function ClockPanel({
  city,
  now,
  visitorZone,
  twelve,
  cycle,
  onCycle,
  forward,
  reduce,
  locale,
}: {
  city: City;
  now: number | null;
  visitorZone: string | null;
  twelve: boolean;
  cycle: HourCycle;
  onCycle: (value: HourCycle) => void;
  forward: boolean;
  reduce: boolean;
  locale: string;
}) {
  const minute = now === null ? null : Math.floor(now / MINUTE) * MINUTE;
  const offset = minute === null ? null : offsetAt(city.timeZone, minute);
  const names = useMemo(() => (offset === null ? null : zoneNames(city.timeZone, Date.now())), [city.timeZone, offset]);
  const date =
    minute === null
      ? null
      : formatter(locale, { timeZone: city.timeZone, weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(minute);
  const ready = minute !== null && visitorZone !== null && offset !== null;
  const gap = ready ? offset - offsetAt(visitorZone, minute) : 0;
  const dayGap = ready ? dayOf(city.timeZone, minute) - dayOf(visitorZone, minute) : 0;
  const relative = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const spoken =
    minute === null ? "" : `${clockAt(city.timeZone, minute, twelve)}, ${date}, ${names?.long ?? ""}`;

  return (
    <div className="@container flex min-w-0 flex-col gap-5 p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="flex min-w-0 items-center gap-2 text-muted-foreground text-xs">
          {names?.short && (
            <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 font-medium font-mono text-foreground">{names.short}</span>
          )}
          <span className="truncate">
            {names ? `${names.long} · ${formatOffset(offset ?? 0)}` : <span className="text-muted-foreground/50">Finding the time zone…</span>}
          </span>
        </p>
        <HourCycleSwitch onChange={onCycle} value={cycle} />
      </div>

      <div>
        <time className="sr-only" dateTime={minute === null ? undefined : new Date(minute).toISOString()}>
          {spoken}
        </time>
        <BigTime forward={forward} now={now} reduce={reduce} timeZone={city.timeZone} twelve={twelve} />
        <p className="mt-3 flex min-h-6 flex-wrap items-center gap-x-2 gap-y-1 text-base text-foreground">
          {date ?? <span className="text-muted-foreground/50">Today</span>}
          {dayGap !== 0 && (
            <span className="rounded-full bg-info/10 px-2 py-0.5 font-medium text-info-foreground text-xs">
              {relative.format(dayGap, "day").replace(/^./, (c) => c.toUpperCase())} for you
            </span>
          )}
        </p>
      </div>

      <div className="mt-auto flex flex-wrap items-baseline gap-x-2 gap-y-1 border-t pt-4 text-sm">
        <span className="font-medium">
          {!ready ? "Comparing with your time…" : gap === 0 ? "Same time as you" : `${formatSpan(gap)} ${gap > 0 ? "ahead of" : "behind"} you`}
        </span>
        {ready && (
          <span className="text-muted-foreground">
            You’re in {placeOf(visitorZone)}, <span className="tabular-nums">{clockAt(visitorZone, minute, twelve)}</span>
          </span>
        )}
      </div>
    </div>
  );
}

const arc = { cx: 160, horizon: 104, rx: 136, top: 84, bottom: 26 };

function pointAt(phase: number) {
  if (phase <= 1) {
    const angle = Math.PI * (1 - phase);
    return { x: arc.cx + arc.rx * Math.cos(angle), y: arc.horizon - arc.top * Math.sin(angle) };
  }
  const angle = Math.PI * Math.min(1, phase - 1);
  return { x: arc.cx + arc.rx * Math.cos(angle), y: arc.horizon + arc.bottom * Math.sin(angle) };
}

function SunMark({ phase, visible }: { phase: MotionValue<number>; visible: boolean }) {
  const x = useTransform(phase, (p) => pointAt(p).x);
  const y = useTransform(phase, (p) => pointAt(p).y);
  const sun = useTransform(phase, (p) => (p <= 1 ? 1 : 0));
  const moon = useTransform(phase, (p) => (p <= 1 ? 0 : 1));
  const trail = useTransform(phase, (p) => {
    const point = pointAt(Math.min(1, Math.max(0, p)));
    return `M ${arc.cx - arc.rx} ${arc.horizon} A ${arc.rx} ${arc.top} 0 0 1 ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
  });

  return (
    <motion.g animate={{ opacity: visible ? 1 : 0 }} initial={false} transition={{ duration: 0.3 }}>
      <motion.path
        className="stroke-amber-500 dark:stroke-amber-300"
        d={trail}
        fill="none"
        strokeLinecap="round"
        strokeWidth={2}
        style={{ opacity: sun }}
      />
      <motion.g style={{ x, y }}>
        <motion.circle className="fill-amber-400 stroke-card dark:fill-amber-300" r={9} strokeWidth={3} style={{ opacity: sun }} />
        <motion.path
          className="fill-indigo-400 stroke-card dark:fill-indigo-300"
          d="M 2.5 -8.6 A 9 9 0 1 0 8.9 1.6 A 7 7 0 0 1 2.5 -8.6 Z"
          strokeLinejoin="round"
          strokeWidth={2.5}
          style={{ opacity: moon }}
        />
      </motion.g>
    </motion.g>
  );
}

function DayArc({ city, now, twelve, reduce }: { city: City; now: number | null; twelve: boolean; reduce: boolean }) {
  const minute = now === null ? null : Math.floor(now / MINUTE) * MINUTE;
  const light = useMemo(() => (minute === null ? null : daylightAt(city, minute)), [city, minute]);
  const phase = useMotionValue(light?.phase ?? 0.5);
  const placed = useRef(false);

  useEffect(() => {
    if (!light) return;
    if (!placed.current || reduce) {
      phase.jump(light.phase);
      placed.current = true;
      return;
    }
    const controls = animate(phase, light.phase, glide);
    return () => controls.stop();
  }, [light, reduce, phase]);

  const sun = light?.sun;
  const at = (time: number) => clockAt(city.timeZone, time, twelve);
  const length = sun?.kind === "normal" ? (sun.set - sun.rise) / MINUTE : null;
  const before = light?.yesterday.kind === "normal" ? (light.yesterday.set - light.yesterday.rise) / MINUTE : null;
  const change = length !== null && before !== null ? Math.round(length - before) : null;
  const status = !light
    ? ""
    : light.next
      ? `${light.next.kind === "sunrise" ? "Sunrise" : "Sunset"} in ${formatSpan(Math.max(1, (light.next.at - (minute ?? 0)) / MINUTE))}`
      : sun?.kind === "day"
        ? "Midnight sun today"
        : sun?.kind === "normal"
          ? "No sunrise tomorrow"
          : "Polar night today";

  return (
    <div className="flex min-w-0 flex-col gap-3 p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-3 text-xs">
        <span className="font-medium text-foreground text-sm">Daylight</span>
        <Swap className="text-muted-foreground tabular-nums" id={status ? `${city.id}-${status}` : "pending"}>
          {status || " "}
        </Swap>
      </div>
      <svg aria-hidden className="mx-auto block h-auto w-full max-w-[360px] overflow-visible" viewBox="0 0 320 136">
        <line className="stroke-border" strokeWidth={1} x1={8} x2={312} y1={arc.horizon} y2={arc.horizon} />
        <path
          className="stroke-foreground/15"
          d={`M ${arc.cx - arc.rx} ${arc.horizon} A ${arc.rx} ${arc.top} 0 0 1 ${arc.cx + arc.rx} ${arc.horizon}`}
          fill="none"
          strokeWidth={2}
        />
        <path
          className="stroke-foreground/20"
          d={`M ${arc.cx + arc.rx} ${arc.horizon} A ${arc.rx} ${arc.bottom} 0 0 1 ${arc.cx - arc.rx} ${arc.horizon}`}
          fill="none"
          strokeDasharray="0.5 5"
          strokeLinecap="round"
          strokeWidth={2}
        />
        <circle className="fill-card stroke-foreground/30" cx={arc.cx - arc.rx} cy={arc.horizon} r={3.5} strokeWidth={1.5} />
        <circle className="fill-card stroke-foreground/30" cx={arc.cx + arc.rx} cy={arc.horizon} r={3.5} strokeWidth={1.5} />
        <SunMark phase={phase} visible={light !== null} />
      </svg>
      <dl className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <dt className="text-muted-foreground">Sunrise</dt>
          <dd className="mt-0.5 font-medium text-foreground text-sm tabular-nums">
            {sun?.kind === "normal" ? at(sun.rise) : sun ? "None" : "––:––"}
          </dd>
        </div>
        <div className="text-center">
          <dt className="text-muted-foreground">Day length</dt>
          <dd className="mt-0.5 font-medium text-foreground text-sm tabular-nums">
            {length !== null ? formatSpan(length) : sun?.kind === "day" ? "24 h" : sun ? "0 min" : "–"}
          </dd>
        </div>
        <div className="text-end">
          <dt className="text-muted-foreground">Sunset</dt>
          <dd className="mt-0.5 font-medium text-foreground text-sm tabular-nums">
            {sun?.kind === "normal" ? at(sun.set) : sun ? "None" : "––:––"}
          </dd>
        </div>
      </dl>
      <p className="min-h-4 text-center text-muted-foreground text-xs tabular-nums">
        {change === null || change === 0
          ? sun && sun.kind !== "normal"
            ? sun.kind === "day"
              ? "The sun stays above the horizon all day."
              : "The sun stays below the horizon all day."
            : " "
          : `${formatSpan(change)} ${change > 0 ? "longer" : "shorter"} than yesterday`}
      </p>
    </div>
  );
}

function overlapOf(hours: { start: number; end: number }, shift: number) {
  for (const day of [-48, -24, 0, 24, 48]) {
    const start = Math.max(hours.start, hours.start - shift + day);
    const end = Math.min(hours.end, hours.end - shift + day);
    if (end > start) return { start, end };
  }
  return null;
}

function DayTrack({
  name,
  detail,
  local,
  shift,
  hours,
  overlap,
  nowAt,
  twelve,
  tone,
  ready,
}: {
  name: ReactNode;
  detail: ReactNode;
  local: string;
  shift: number;
  hours: { start: number; end: number };
  overlap: { start: number; end: number } | null;
  nowAt: number | null;
  twelve: boolean;
  tone: "you" | "city";
  ready: boolean;
}) {
  const span = hours.end - hours.start;
  const band =
    tone === "you"
      ? "bg-sky-500/15 ring-sky-500/35 dark:bg-sky-400/15 dark:ring-sky-400/35"
      : "bg-violet-500/15 ring-violet-500/35 dark:bg-violet-400/15 dark:ring-violet-400/35";

  return (
    <div className="grid gap-x-4 gap-y-1.5 @2xl:grid-cols-[9.5rem_minmax(0,1fr)] @2xl:items-start">
      <div className="flex min-w-0 items-baseline justify-between gap-3 @2xl:flex-col @2xl:items-start @2xl:gap-0.5 @2xl:pt-0.5">
        <span className="flex min-w-0 items-center gap-2 font-medium text-sm">
          <span
            aria-hidden
            className={cn(
              "size-2 shrink-0 rounded-full",
              tone === "you" ? "bg-sky-500 dark:bg-sky-400" : "bg-violet-500 dark:bg-violet-400",
            )}
          />
          <span className="truncate">{name}</span>
        </span>
        <span className="shrink-0 truncate text-muted-foreground text-xs tabular-nums @2xl:ps-4">
          {detail} · {local}
        </span>
      </div>
      <div className="min-w-0">
        <div className="relative h-7 overflow-hidden rounded-lg bg-muted/70 dark:bg-muted/50">
          {ticks.slice(1).map((tick) => (
            <span aria-hidden className="absolute inset-y-0 w-px bg-border/70" key={tick} style={{ left: `${(tick / 24) * 100}%` }} />
          ))}
          <motion.div
            animate={{ x: `${(-shift / 72) * 100}%` }}
            className="absolute inset-y-0 -left-full w-[300%]"
            initial={false}
            transition={glide}
          >
            {[0, 24, 48].map((day) => (
              <span
                className={cn("absolute inset-y-1 rounded-md ring-1 ring-inset transition-opacity", band, !ready && "opacity-40")}
                key={day}
                style={{ left: `${((day + hours.start) / 72) * 100}%`, width: `${(span / 72) * 100}%` }}
              />
            ))}
          </motion.div>
          <motion.span
            animate={{
              left: `${((overlap?.start ?? 12) / 24) * 100}%`,
              width: `${(((overlap?.end ?? 12) - (overlap?.start ?? 12)) / 24) * 100}%`,
              opacity: overlap ? 1 : 0,
            }}
            className="absolute inset-y-1 rounded-md bg-emerald-500 dark:bg-emerald-400"
            initial={false}
            transition={glide}
          />
          {nowAt !== null && (
            <span
              aria-hidden
              className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-foreground"
              style={{ left: `${(nowAt / 24) * 100}%` }}
            />
          )}
        </div>
        <div aria-hidden className="mt-1 grid grid-cols-8 text-[10px] text-muted-foreground tabular-nums">
          {ticks.map((tick) => (
            <span className="truncate ps-1" key={tick}>
              {ready ? formatTick(tick + shift, twelve) : formatTick(tick, twelve)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function MeetPlanner({
  city,
  now,
  visitorZone,
  twelve,
  hours,
}: {
  city: City;
  now: number | null;
  visitorZone: string | null;
  twelve: boolean;
  hours: { start: number; end: number };
}) {
  const minute = now === null ? null : Math.floor(now / MINUTE) * MINUTE;
  const ready = minute !== null && visitorZone !== null;
  const yourOffset = ready ? offsetAt(visitorZone, minute) : 0;
  const cityOffset = ready ? offsetAt(city.timeZone, minute) : 0;
  const shift = (cityOffset - yourOffset) / 60;
  const overlap = ready ? overlapOf(hours, shift) : null;
  const nowAt = ready ? hoursOf(visitorZone, minute) : null;
  const yourNames = ready ? zoneNames(visitorZone, minute) : null;
  const cityNames = ready ? zoneNames(city.timeZone, minute) : null;
  const range = (start: number, end: number) => `${formatClock(start, twelve)}–${formatClock(end, twelve)}`.replaceAll(" ", "\u00a0").replace("–", "\u2060–\u2060");
  const shared = overlap ? (overlap.end - overlap.start) * 60 : 0;
  const headline = !ready ? "––:––" : overlap ? range(overlap.start, overlap.end) : "No overlap";

  return (
    <section aria-label={`Best time to meet with ${city.name}`} className="rounded-2xl border bg-card shadow-xs/5">
      <div className="grid gap-6 p-5 sm:p-6 @3xl:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] @3xl:gap-10">
        <div className="flex flex-col gap-3">
          <h3 className="font-medium text-muted-foreground text-sm">Best time to meet</h3>
          <div>
            <Swap
              className="font-heading font-semibold text-3xl tabular-nums tracking-tight"
              id={`${city.id}-${headline}`}
            >
              {headline}
            </Swap>
            <p className="mt-1 min-h-10 text-pretty text-muted-foreground text-sm">
              {!ready
                ? " "
                : overlap
                  ? shift === 0
                    ? "Your working hours line up exactly."
                    : `your time, which is ${range(overlap.start + shift, overlap.end + shift)} in ${city.name}`
                  : `Their working day runs ${range(hours.start - shift, hours.end - shift)} your time.`}
            </p>
          </div>
          <p className="mt-auto flex flex-wrap items-center gap-2 text-xs">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-medium",
                !ready
                  ? "bg-muted text-muted-foreground"
                  : overlap
                    ? "bg-emerald-500/12 text-emerald-700 dark:bg-emerald-400/12 dark:text-emerald-300"
                    : "bg-warning/12 text-warning-foreground",
              )}
            >
              <span aria-hidden className={cn("size-1.5 rounded-full", overlap ? "bg-emerald-500 dark:bg-emerald-400" : "bg-current")} />
              {!ready ? "Working hours" : overlap ? `${formatSpan(shared)} shared` : "No shared hours"}
            </span>
            <span className="text-muted-foreground">
              {formatClock(hours.start, twelve)}–{formatClock(hours.end, twelve)} each side
            </span>
          </p>
        </div>

        <div className="@container flex min-w-0 flex-col gap-4">
          <DayTrack
            detail={yourNames?.short ?? (ready ? formatOffset(yourOffset) : "Your zone")}
            hours={hours}
            local={ready ? clockAt(visitorZone, minute, twelve) : "––:––"}
            name={ready ? `You · ${placeOf(visitorZone)}` : "You"}
            nowAt={nowAt}
            overlap={overlap}
            ready={ready}
            shift={0}
            tone="you"
            twelve={twelve}
          />
          <DayTrack
            detail={cityNames?.short ?? (ready ? formatOffset(cityOffset) : "–")}
            hours={hours}
            local={ready ? clockAt(city.timeZone, minute, twelve) : "––:––"}
            name={city.name}
            nowAt={nowAt}
            overlap={overlap}
            ready={ready}
            shift={shift}
            tone="city"
            twelve={twelve}
          />
          <p className="flex items-center gap-2 text-muted-foreground text-xs @2xl:ps-[calc(9.5rem+1rem)]">
            <span aria-hidden className="h-3 w-0.5 rounded-full bg-foreground" />
            Now, on your clock
          </p>
        </div>
      </div>
    </section>
  );
}

function ClockChanges({ city, now, locale }: { city: City; now: number | null; locale: string }) {
  const hourKey = now === null ? null : Math.floor(now / HOUR);
  const year = useMemo(
    () => (hourKey === null ? null : clockYear(city.timeZone, hourKey * HOUR + 1)),
    [city.timeZone, hourKey],
  );
  const minute = now === null ? null : Math.floor(now / MINUTE) * MINUTE;
  const relative = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const longDate = (at: number) =>
    formatter(locale, { timeZone: city.timeZone, weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(at);
  const monthYear = (at: number) => formatter(locale, { timeZone: city.timeZone, month: "short", year: "numeric" }).format(at);
  const daysFrom = (at: number) => (minute === null ? 0 : dayOf(city.timeZone, at) - dayOf(city.timeZone, minute));
  const position = (at: number) => (year ? ((at - year.start) / (year.end - year.start)) * 100 : 0);
  const offset = minute === null ? 0 : offsetAt(city.timeZone, minute);
  const changes = year !== null && (year.seasons.length > 1 || year.next !== null);
  const recent = year?.previous && minute !== null && minute - year.previous.at < 370 * DAY ? year.previous : null;
  const months = year ? Array.from({ length: 12 }, (_, i) => monthStart(year.start, i)) : [];
  const monthName = (at: number) => formatter(locale, { timeZone: "UTC", month: "short" }).format(at);
  const zones = useMemo(() => {
    if (!year) return null;
    const standard = year.seasons.find((season) => season.offset === year.standard);
    const summer = year.seasons.find((season) => season.offset > year.standard);
    const nameAt = (season: Season | undefined) =>
      season ? { offset: season.offset, short: zoneNames(city.timeZone, (season.start + season.end) / 2).short } : null;
    return { standard: nameAt(standard), summer: nameAt(summer) };
  }, [year, city.timeZone]);

  const rows = [
    recent && {
      key: "previous",
      icon: recent.to > recent.from ? RotateCwIcon : RotateCcwIcon,
      label: `Clocks went ${recent.to > recent.from ? "forward" : "back"} ${formatSpan(recent.to - recent.from)}`,
      when: relative.format(daysFrom(recent.at), "day"),
      date: longDate(recent.at),
      past: true,
    },
    year?.next && {
      key: "next",
      icon: year.next.to > year.next.from ? RotateCwIcon : RotateCcwIcon,
      label: `Clocks go ${year.next.to > year.next.from ? "forward" : "back"} ${formatSpan(year.next.to - year.next.from)}`,
      when: relative.format(daysFrom(year.next.at), "day"),
      date: longDate(year.next.at),
      past: false,
    },
  ].filter((row) => Boolean(row)) as {
    key: string;
    icon: typeof RotateCwIcon;
    label: string;
    when: string;
    date: string;
    past: boolean;
  }[];

  const summary = !year
    ? " "
    : changes
      ? `On ${offset > year.standard ? "daylight saving time" : "standard time"}, ${formatOffset(offset)}.`
      : `${formatOffset(offset)} all year${year.previous ? `, unchanged since ${monthYear(year.previous.at)}` : ""}.`;

  return (
    <section aria-label="Clock changes" className="@container flex min-w-0 flex-col gap-4 rounded-2xl border bg-card p-5 shadow-xs/5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="font-medium text-sm">{year && !changes ? "No clock changes" : "Clock changes"}</h3>
        <div aria-hidden className="flex items-center gap-3 text-muted-foreground text-xs">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-amber-400 dark:bg-amber-300" />
            Daylight saving
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-foreground/15" />
            Standard
          </span>
        </div>
      </div>
      <Swap className="text-muted-foreground text-sm" id={year ? `${city.id}-${summary}` : "pending"}>
        {summary}
      </Swap>

      <div aria-hidden>
        <div className="relative py-1.5">
          <div className="relative h-2.5 overflow-hidden rounded-full bg-foreground/10">
            <AnimatePresence initial={false}>
              <motion.div
                animate={{ opacity: 1 }}
                className="absolute inset-0"
                exit={{ opacity: 0 }}
                initial={{ opacity: 0 }}
                key={city.id}
                transition={{ duration: 0.2, ease }}
              >
                {year?.seasons
                  .filter((season) => season.offset > year.standard)
                  .map((season) => (
                    <span
                      className="absolute inset-y-0 bg-amber-400 dark:bg-amber-300"
                      key={season.start}
                      style={{ left: `${position(season.start)}%`, width: `${position(season.end) - position(season.start)}%` }}
                    />
                  ))}
              </motion.div>
            </AnimatePresence>
          </div>
          {rows.map((row) => {
            const at = row.past ? recent?.at : year?.next?.at;
            if (at === undefined) return null;
            return (
              <span
                className="absolute inset-y-0 w-0.5 -translate-x-1/2 rounded-full bg-foreground/45"
                key={row.key}
                style={{ left: `${position(at)}%` }}
              />
            );
          })}
          {minute !== null && year && (
            <span
              className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground ring-2 ring-card"
              style={{ left: `${position(minute)}%` }}
            />
          )}
        </div>
        <div className="mt-1 grid grid-cols-12 text-[10px] text-muted-foreground tabular-nums">
          {(months.length ? months : Array.from({ length: 12 }, () => null)).map((month, i) => (
            <span className="truncate text-center" key={month ?? i}>
              {month === null ? " " : monthName(month)}
            </span>
          ))}
        </div>
      </div>

      <ul className="grid gap-2 text-sm">
        {rows.length ? (
          rows.map((row) => (
            <li className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5" key={row.key}>
              <span className={cn("inline-flex items-center gap-2", row.past ? "text-muted-foreground" : "font-medium")}>
                <row.icon aria-hidden className="size-3.5 shrink-0 translate-y-px opacity-70" />
                {row.label}
              </span>
              <span className="text-muted-foreground text-xs tabular-nums">
                {row.when} · {row.date}
              </span>
            </li>
          ))
        ) : (
          <li className="text-muted-foreground text-xs">
            {year ? `${city.name} doesn’t observe daylight saving time.` : " "}
          </li>
        )}
      </ul>

      <dl className="mt-auto grid grid-cols-2 gap-3 border-t border-dashed pt-4 text-xs @md:grid-cols-3">
        {[
          { label: "Time zone", value: city.timeZone.replaceAll("_", " "), mono: true },
          {
            label: "Standard",
            value: zones?.standard ? `${formatOffset(zones.standard.offset)}${zones.standard.short ? ` · ${zones.standard.short}` : ""}` : "–",
          },
          {
            label: "Daylight saving",
            value: zones?.summer ? `${formatOffset(zones.summer.offset)}${zones.summer.short ? ` · ${zones.summer.short}` : ""}` : zones ? "Not observed" : "–",
          },
        ].map((item) => (
          <div className={cn("min-w-0", item.mono && "col-span-2 @md:col-span-1")} key={item.label}>
            <dt className="text-muted-foreground">{item.label}</dt>
            <dd className={cn("mt-0.5 truncate text-foreground text-sm tabular-nums", item.mono && "font-mono text-xs leading-5")}>
              <Swap id={`${city.id}-${item.label}-${item.value}`}>{item.value}</Swap>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Facts({ city }: { city: City }) {
  const coordinates = `${Math.abs(city.latitude).toFixed(2)}° ${city.latitude >= 0 ? "N" : "S"}, ${Math.abs(city.longitude).toFixed(2)}° ${city.longitude >= 0 ? "E" : "W"}`;
  const facts = [
    { label: "Country", value: city.country, icon: FlagIcon },
    { label: "Region", value: city.region, icon: MapIcon },
    { label: "Coordinates", value: coordinates, icon: NavigationIcon, numeric: true },
    { label: "Elevation", value: `${city.elevation.toLocaleString("en-US")} m`, icon: MountainIcon, numeric: true },
    { label: "Population", value: city.population.toLocaleString("en-US"), icon: UsersIcon, numeric: true },
    { label: "Currency", value: city.currency, icon: BanknoteIcon },
    { label: "Languages", value: city.languages.join(", "), icon: LanguagesIcon },
    { label: "Dialling code", value: city.dialCode, icon: PhoneIcon, numeric: true },
  ];

  return (
    <section aria-label={`About ${city.name}`} className="@container rounded-2xl border bg-card px-5 pt-4 pb-2 shadow-xs/5 sm:px-6">
      <h3 className="font-medium text-sm">About {city.name}</h3>
      <dl className="mt-2 grid grid-cols-2 gap-x-5">
        {facts.map((fact) => (
          <div className="relative min-w-0 border-t border-dashed py-2.5 ps-6 first:border-t-0 [&:nth-child(2)]:border-t-0" key={fact.label}>
            <dt className="text-muted-foreground text-xs">
              <fact.icon aria-hidden className="absolute start-0 top-3 size-3.5 text-muted-foreground" />
              {fact.label}
            </dt>
            <dd className={cn("mt-0.5 text-sm", "numeric" in fact && "tabular-nums")}>
              <Swap id={`${city.id}-${fact.label}`}>{fact.value}</Swap>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function CityTime({
  cities = defaultCities,
  defaultCity,
  workingHours = { start: 9, end: 17 },
  defaultHourCycle = "24h",
  locale = "en-GB",
  className,
}: CityTimeProps) {
  const headingId = useId();
  const reduce = useReducedMotionSafe();
  const now = useNow();
  const visitorZone = useVisitorZone();
  const [cityId, setCityId] = useState(defaultCity ?? cities[0]?.id);
  const [cycle, setCycle] = useState<HourCycle>(defaultHourCycle);
  const city = cities.find((item) => item.id === cityId) ?? cities[0];
  const twelve = cycle === "12h";

  const shownCity = useRef(city?.id);
  const forward = shownCity.current === city?.id;
  useEffect(() => {
    shownCity.current = city?.id;
  });

  if (!city) return null;

  return (
    <MotionConfig reducedMotion="user">
      <section
        aria-labelledby={headingId}
        className={cn("@container mx-auto w-full max-w-[1100px] px-4 py-8 sm:px-8 sm:py-10", className)}
      >
        <div className="flex flex-col gap-4 @3xl:flex-row @3xl:items-end @3xl:justify-between">
          <div className="min-w-0">
            <h2 className="text-balance font-heading font-semibold text-2xl tracking-tight @3xl:text-3xl" id={headingId}>
              Local time in <Swap id={city.id}>{city.name}</Swap>
            </h2>
            <p className="mt-1 text-muted-foreground text-sm">
              <Swap id={city.id}>
                {city.region === city.name ? city.country : `${city.region}, ${city.country}`}
              </Swap>
            </p>
          </div>
          <div className="w-full @3xl:w-72">
            <CityPicker cities={cities} city={city} now={now} onChange={setCityId} twelve={twelve} />
          </div>
        </div>

        <div className="mt-6 grid gap-4">
          <div className="grid overflow-hidden rounded-2xl border bg-card shadow-xs/5 @3xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
            <ClockPanel
              city={city}
              cycle={cycle}
              forward={forward}
              locale={locale}
              now={now}
              onCycle={setCycle}
              reduce={reduce}
              twelve={twelve}
              visitorZone={visitorZone}
            />
            <div className="border-t @3xl:border-t-0 @3xl:border-l">
              <DayArc city={city} now={now} reduce={reduce} twelve={twelve} />
            </div>
          </div>

          <MeetPlanner city={city} hours={workingHours} now={now} twelve={twelve} visitorZone={visitorZone} />

          <div className="grid gap-4 @3xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
            <ClockChanges city={city} locale={locale} now={now} />
            <Facts city={city} />
          </div>
        </div>
      </section>
    </MotionConfig>
  );
}
