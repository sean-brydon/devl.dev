"use client";

import { AlertCircleIcon, CheckIcon, CopyIcon, MinusIcon, PlusIcon } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { type ClipboardEvent, type KeyboardEvent, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Tabs, TabsList, TabsTab } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export interface CronBuilderProps {
  defaultValue?: string;
  onChange?: (expression: string, valid: boolean) => void;
  presets?: { label: string; value: string }[];
  className?: string;
}

type FieldId = "minute" | "hour" | "dom" | "month" | "dow";

interface FieldSpec {
  id: FieldId;
  label: string;
  noun: string;
  plural: string;
  min: number;
  max: number;
  names?: string[];
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const FIELDS: FieldSpec[] = [
  { id: "minute", label: "Minute", noun: "minute", plural: "minutes", min: 0, max: 59 },
  { id: "hour", label: "Hour", noun: "hour", plural: "hours", min: 0, max: 23 },
  { id: "dom", label: "Day", noun: "day of the month", plural: "days", min: 1, max: 31 },
  { id: "month", label: "Month", noun: "month", plural: "months", min: 1, max: 12, names: MONTHS.map((m) => m.slice(0, 3).toUpperCase()) },
  { id: "dow", label: "Weekday", noun: "weekday", plural: "weekdays", min: 0, max: 6, names: DAYS.map((d) => d.slice(0, 3).toUpperCase()) },
];

const DEFAULT_PRESETS = [
  { label: "Every 15 min", value: "*/15 * * * *" },
  { label: "Hourly", value: "0 * * * *" },
  { label: "Daily 09:00", value: "0 9 * * *" },
  { label: "Weekdays 09:30", value: "30 9 * * 1-5" },
  { label: "Mondays 08:00", value: "0 8 * * 1" },
  { label: "1st of month", value: "0 0 1 * *" },
];

const MACROS: Record<string, string> = {
  "@yearly": "0 0 1 1 *",
  "@annually": "0 0 1 1 *",
  "@monthly": "0 0 1 * *",
  "@weekly": "0 0 * * 0",
  "@daily": "0 0 * * *",
  "@midnight": "0 0 * * *",
  "@hourly": "0 * * * *",
};

type Parsed = { values: Set<number>; error?: undefined } | { values?: undefined; error: string };

function parseField(raw: string, spec: FieldSpec): Parsed {
  const text = raw.trim();
  const What = spec.label;
  if (!text) return { error: `${What} is empty. Use * for every ${spec.noun}.` };
  const values = new Set<number>();
  const max = spec.id === "dow" ? 7 : spec.max;
  const num = (s: string): number | string => {
    const named = spec.names?.indexOf(s.toUpperCase()) ?? -1;
    if (named >= 0) return named + spec.min;
    if (!/^\d+$/.test(s)) return `“${s}” isn’t a valid ${spec.noun}.`;
    const n = Number(s);
    if (n < spec.min || n > max) return `${What} must be ${spec.min}–${max}; ${n} is out of range.`;
    return n;
  };
  for (const part of text.split(",")) {
    if (!part) return { error: `There’s an empty item in “${text}”.` };
    const [range, stepText, extra] = part.split("/");
    if (extra !== undefined) return { error: `“${part}” has more than one step.` };
    let step = 1;
    if (stepText !== undefined) {
      if (!/^\d+$/.test(stepText)) return { error: `Step “${stepText}” must be a whole number.` };
      step = Number(stepText);
      if (step === 0) return { error: "A step of 0 never moves forward. Use 1 or more." };
    }
    let lo: number;
    let hi: number;
    if (range === "*") {
      lo = spec.min;
      hi = spec.max;
    } else if (range.includes("-")) {
      const [a, b] = range.split("-");
      const na = num(a);
      const nb = num(b ?? "");
      if (typeof na === "string") return { error: na };
      if (typeof nb === "string") return { error: nb };
      if (na > nb) return { error: `The range ${a}-${b} runs backwards.` };
      lo = na;
      hi = nb;
    } else {
      const n = num(range);
      if (typeof n === "string") return { error: n };
      lo = n;
      hi = stepText !== undefined ? spec.max : n;
    }
    for (let v = lo; v <= hi; v += step) values.add(spec.id === "dow" && v === 7 ? 0 : v);
  }
  return { values };
}

function serialize(values: Set<number>, spec: FieldSpec) {
  const sorted = [...values].sort((a, b) => a - b);
  const full = spec.max - spec.min + 1;
  if (sorted.length === full) return "*";
  if (sorted.length > 2 && sorted[0] === spec.min) {
    const step = sorted[1] - sorted[0];
    const fits = sorted.every((v, i) => v === spec.min + i * step) && sorted[sorted.length - 1] + step > spec.max && step > 1;
    if (fits) return `*/${step}`;
  }
  const parts: string[] = [];
  let i = 0;
  while (i < sorted.length) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1] === sorted[j] + 1) j++;
    if (j - i >= 2) parts.push(`${sorted[i]}-${sorted[j]}`);
    else for (let k = i; k <= j; k++) parts.push(String(sorted[k]));
    i = j + 1;
  }
  return parts.join(",");
}

const pad = (n: number) => String(n).padStart(2, "0");

function list(items: string[]) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function runs(values: number[], name: (n: number) => string) {
  const out: string[] = [];
  let i = 0;
  while (i < values.length) {
    let j = i;
    while (j + 1 < values.length && values[j + 1] === values[j] + 1) j++;
    if (j - i >= 2) out.push(`${name(values[i])} through ${name(values[j])}`);
    else for (let k = i; k <= j; k++) out.push(name(values[k]));
    i = j + 1;
  }
  return list(out);
}

function stepOf(values: number[], min: number, max: number) {
  if (values.length < 2 || values[0] !== min) return 0;
  const s = values[1] - values[0];
  return values.every((v, i) => v === min + i * s) && values[values.length - 1] + s > max ? s : 0;
}

function describe(sets: Record<FieldId, Set<number>>, raw: Record<FieldId, string>) {
  const m = [...sets.minute].sort((a, b) => a - b);
  const h = [...sets.hour].sort((a, b) => a - b);
  const allM = m.length === 60;
  const allH = h.length === 24;
  const mStep = stepOf(m, 0, 59);
  const hStep = stepOf(h, 0, 23);
  let time: string;
  if (allM && allH) time = "Every minute";
  else if (mStep && allH) time = `Every ${mStep} minutes`;
  else if (m.length === 1 && allH) time = m[0] === 0 ? "Every hour, on the hour" : `At ${m[0]} minutes past every hour`;
  else if (m.length === 1 && hStep) time = `At minute ${m[0]}, every ${hStep} hours`;
  else if (m.length * h.length <= 4 && !allH) time = `At ${list(h.flatMap((hh) => m.map((mm) => `${pad(hh)}:${pad(mm)}`)))}`;
  else if (allH) time = `At minutes ${list(m.map(String))} past every hour`;
  else if (allM) time = `Every minute during ${runs(h, (x) => `${pad(x)}:00`)} hours`;
  else time = `At minutes ${runs(m, String)} past ${runs(h, (x) => `${pad(x)}:00`)}`;

  const either = !raw.dom.trim().startsWith("*") && !raw.dow.trim().startsWith("*");
  const domR = sets.dom.size < 31;
  const dowR = sets.dow.size < 7;
  const dom = [...sets.dom].sort((a, b) => a - b);
  const dow = [...sets.dow].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
  const dowSorted = dow.map((d) => (d + 6) % 7);
  const dowWords = () => {
    if (dow.length === 2 && sets.dow.has(0) && sets.dow.has(6)) return "on weekends";
    return `on ${runs(dowSorted, (x) => DAYS[(x + 1) % 7])}`;
  };
  const domWords = () => {
    const step = stepOf(dom, 1, 31);
    if (step) return `every ${step} days`;
    return `on day ${runs(dom, String)} of the month`;
  };
  let days = "";
  if (domR && dowR) days = `${domWords()} ${either ? "or" : "and"} ${dowWords()}`;
  else if (domR) days = domWords();
  else if (dowR) days = dowWords();

  const mo = [...sets.month].sort((a, b) => a - b);
  let months = "";
  if (mo.length < 12) {
    const step = stepOf(mo, 1, 12);
    months = step ? `every ${step} months` : `in ${runs(mo, (x) => MONTHS[x - 1])}`;
  }
  return [time, days, months].filter(Boolean).join(", ");
}

function nextRuns(sets: Record<FieldId, Set<number>>, raw: Record<FieldId, string>, from: Date, count = 5) {
  const out: Date[] = [];
  const hours = [...sets.hour].sort((a, b) => a - b);
  const minutes = [...sets.minute].sort((a, b) => a - b);
  const either = !raw.dom.trim().startsWith("*") && !raw.dow.trim().startsWith("*");
  const start = new Date(from);
  start.setSeconds(0, 0);
  start.setMinutes(start.getMinutes() + 1);
  const day = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  for (let i = 0; i < 366 * 5 && out.length < count; i++) {
    const d = new Date(day.getFullYear(), day.getMonth(), day.getDate() + i);
    if (!sets.month.has(d.getMonth() + 1)) continue;
    const domOk = sets.dom.has(d.getDate());
    const dowOk = sets.dow.has(d.getDay());
    const match = either ? domOk || dowOk : domOk && dowOk;
    if (!match) continue;
    for (const hh of hours) {
      for (const mm of minutes) {
        const t = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hh, mm);
        if (t >= start) out.push(t);
        if (out.length >= count) return out;
      }
    }
  }
  return out;
}

function neverReason(sets: Record<FieldId, Set<number>>) {
  const minDom = Math.min(...sets.dom);
  const mo = [...sets.month];
  if (mo.every((m) => m === 2) && minDom > 29) return `February never has a ${minDom}${minDom === 31 ? "st" : "th"}.`;
  if (minDom === 31 && mo.every((m) => [2, 4, 6, 9, 11].includes(m))) return `${list(mo.map((m) => MONTHS[m - 1]))} ${mo.length > 1 ? "don’t" : "doesn’t"} have a 31st.`;
  return "No date matches every field at once.";
}

const SHORT_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const SHORT_MONTHS = MONTHS.map((m) => m.slice(0, 3));
const when = (d: Date) => `${SHORT_DAYS[d.getDay()]}, ${SHORT_MONTHS[d.getMonth()]} ${d.getDate()}`;
function relative(d: Date, now: number) {
  const mins = Math.round((d.getTime() - now) / 60000);
  if (mins < 60) return `in ${Math.max(1, mins)} min`;
  const hrs = Math.floor(mins / 60);
  const today = new Date(now);
  const days = Math.round(
    (new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / 86400000,
  );
  if (hrs < 12 || days === 0) return `in ${hrs}h ${pad(mins % 60)}m`;
  return days === 1 ? "tomorrow" : `in ${days} days`;
}

type Mode = "every" | "step" | "specific";
const modeOf = (raw: string): Mode => (raw.trim() === "*" ? "every" : /^\*\/\d+$/.test(raw.trim()) ? "step" : "specific");

function gridFor(spec: FieldSpec, current: Set<number>) {
  if (spec.id === "minute") {
    const base = Array.from({ length: 12 }, (_, i) => i * 5);
    return [...new Set([...base, ...current])].sort((a, b) => a - b);
  }
  if (spec.id === "dow") return [1, 2, 3, 4, 5, 6, 0];
  return Array.from({ length: spec.max - spec.min + 1 }, (_, i) => spec.min + i);
}

const cellLabel = (spec: FieldSpec, v: number) =>
  spec.id === "month" ? SHORT_MONTHS[v - 1] : spec.id === "dow" ? SHORT_DAYS[v] : spec.id === "hour" ? pad(v) : spec.id === "minute" ? `:${pad(v)}` : String(v);

export function CronBuilder({ defaultValue = "30 9 * * 1-5", onChange, presets = DEFAULT_PRESETS, className }: CronBuilderProps) {
  const errorId = useId();
  const reduce = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelHeight, setPanelHeight] = useState<number | null>(null);
  const [raw, setRaw] = useState<Record<FieldId, string>>(() => {
    const parts = (MACROS[defaultValue] ?? defaultValue).trim().split(/\s+/);
    return { minute: parts[0] ?? "*", hour: parts[1] ?? "*", dom: parts[2] ?? "*", month: parts[3] ?? "*", dow: parts[4] ?? "*" };
  });
  const [active, setActive] = useState<FieldId>("minute");
  const [now, setNow] = useState<number | null>(null);
  const [tz, setTz] = useState("");
  const [copied, setCopied] = useState(false);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});
  const mounted = useRef(false);
  const changeRef = useRef(onChange);
  changeRef.current = onChange;

  useEffect(() => {
    mounted.current = true;
    setNow(Date.now());
    setTz(Intl.DateTimeFormat().resolvedOptions().timeZone.replace(/_/g, " "));
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  useLayoutEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setPanelHeight(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1400);
    return () => clearTimeout(t);
  }, [copied]);

  const parsed = useMemo(() => Object.fromEntries(FIELDS.map((f) => [f.id, parseField(raw[f.id], f)])) as Record<FieldId, Parsed>, [raw]);
  const firstError = FIELDS.find((f) => parsed[f.id].error);
  const sets = firstError ? null : (Object.fromEntries(FIELDS.map((f) => [f.id, parsed[f.id].values])) as Record<FieldId, Set<number>>);
  const expression = FIELDS.map((f) => raw[f.id].trim() || "?").join(" ");
  const sentence = sets ? describe(sets, raw) : null;
  const runsList = useMemo(() => (sets && now ? nextRuns(sets, raw, new Date(now)) : []), [sets, raw, now]);
  const never = sets && now !== null && runsList.length === 0;

  useEffect(() => {
    changeRef.current?.(expression, !firstError);
  }, [expression, firstError]);

  const spec = FIELDS.find((f) => f.id === active) ?? FIELDS[0];
  const mode = modeOf(raw[active]);
  const current = parsed[active].values ?? new Set<number>();
  const stepValue = mode === "step" ? Number(raw[active].trim().slice(2)) : 0;

  const setField = (id: FieldId, value: string) => setRaw((r) => ({ ...r, [id]: value }));

  const applyExpression = (text: string) => {
    const parts = (MACROS[text.trim().toLowerCase()] ?? text).trim().split(/\s+/);
    if (parts.length !== 5) return false;
    setRaw({ minute: parts[0], hour: parts[1], dom: parts[2], month: parts[3], dow: parts[4] });
    return true;
  };

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text");
    if (/\s/.test(text.trim()) || text.trim().startsWith("@")) {
      if (applyExpression(text)) e.preventDefault();
    }
  };

  const onFieldKey = (e: KeyboardEvent<HTMLInputElement>, i: number) => {
    const el = e.currentTarget;
    const go = (j: number) => {
      const f = FIELDS[j];
      if (!f) return;
      e.preventDefault();
      inputs.current[f.id]?.focus();
      requestAnimationFrame(() => inputs.current[f.id]?.select());
    };
    if (e.key === " ") go(i + 1);
    else if (e.key === "ArrowRight" && el.selectionStart === el.value.length) go(i + 1);
    else if (e.key === "ArrowLeft" && el.selectionStart === 0) go(i - 1);
    else if (e.key === "Backspace" && el.value === "") go(i - 1);
  };

  const setMode = (m: Mode) => {
    if (m === "every") setField(active, "*");
    else if (m === "step") setField(active, `*/${active === "minute" ? 15 : 2}`);
    else {
      const fallback = active === "dow" ? "1-5" : active === "month" || active === "dom" ? "1" : "0";
      setField(active, current.size && mode === "specific" ? raw[active] : fallback);
    }
  };

  const toggleValue = (v: number) => {
    const next = new Set(mode === "specific" ? current : []);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    setField(active, next.size ? serialize(next, spec) : "*");
  };

  const grid = gridFor(spec, current);
  const cols = spec.id === "hour" ? "grid-cols-8" : spec.id === "dom" ? "grid-cols-8" : spec.id === "dow" ? "grid-cols-7" : "grid-cols-6";
  const canStep = active !== "dow";
  const maxStep = Math.floor((spec.max - spec.min + 1) / 2);

  return (
    <div className={cn("flex w-full min-w-0 max-w-[500px] flex-col overflow-hidden rounded-2xl border bg-card text-sm shadow-xs/5", className)}>
      <div className="flex items-start gap-3 px-4 pt-3.5">
        <div className="min-w-0 flex-1">
          <h3 className="font-medium">Schedule</h3>
          <p className="truncate text-muted-foreground text-xs">
            {tz ? `Times in ${tz}` : "Times in your timezone"}
            <span className="max-sm:hidden"> · paste any cron line</span>
          </p>
        </div>
        <button
          aria-label={copied ? "Copied" : "Copy expression"}
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border bg-background px-2.5 font-mono text-xs shadow-xs/5 outline-none transition-[background-color,scale] duration-150 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97] dark:bg-input/32 [@media(hover:hover)]:hover:bg-accent"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(expression);
            } catch {}
            setCopied(true);
          }}
          type="button"
        >
          {copied ? <CheckIcon className="size-3 text-success-foreground" /> : <CopyIcon className="size-3 text-muted-foreground" />}
          {expression}
        </button>
      </div>

      <div className="grid grid-cols-5 gap-1.5 px-4 pt-3.5 sm:gap-2">
        {FIELDS.map((f, i) => {
          const err = parsed[f.id].error;
          const isActive = f.id === active;
          return (
            <label className="flex min-w-0 flex-col items-center gap-1.5" key={f.id}>
              <input
                aria-describedby={err ? errorId : undefined}
                aria-invalid={Boolean(err) || undefined}
                aria-label={f.label}
                autoComplete="off"
                className={cn(
                  "h-11 w-full min-w-0 rounded-lg border bg-background text-center font-mono text-[15px] shadow-xs/5 outline-none ring-ring/24 transition-[border-color,box-shadow] duration-150 dark:bg-input/32",
                  isActive ? "border-ring ring-[3px]" : "border-input",
                  err && "border-destructive/60 text-destructive-foreground ring-destructive/16",
                )}
                onChange={(e) => setField(f.id, e.target.value.replace(/\s/g, ""))}
                onFocus={(e) => {
                  setActive(f.id);
                  e.currentTarget.select();
                }}
                onKeyDown={(e) => onFieldKey(e, i)}
                onPaste={onPaste}
                ref={(el) => {
                  inputs.current[f.id] = el;
                }}
                spellCheck={false}
                value={raw[f.id]}
              />
              <span className={cn("text-[11px] transition-colors", isActive ? "font-medium text-foreground" : "text-muted-foreground", err && "text-destructive-foreground")}>
                {f.label}
              </span>
            </label>
          );
        })}
      </div>

      <div aria-live="polite" className="min-h-[60px] px-4 pt-3 pb-3.5">
        {firstError ? (
          <p className="flex items-start gap-2 text-destructive-foreground" id={errorId}>
            <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
            <span className="text-pretty">{parsed[firstError.id].error}</span>
          </p>
        ) : (
          <>
            <p className="font-medium text-[15px] leading-6 text-pretty">{sentence}</p>
            {never && sets && (
              <p className="mt-1 flex items-center gap-1.5 text-warning-foreground text-xs">
                <AlertCircleIcon className="size-3.5" /> Never runs: {neverReason(sets)}
              </p>
            )}
          </>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5 px-4 pb-3.5">
        {presets.map((p) => {
          const on = p.value === expression;
          return (
            <button
              aria-pressed={on}
              className={cn(
                "h-8 rounded-full border px-3 text-xs outline-none transition-[background-color,border-color,color,scale] duration-150 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]",
                on ? "border-primary bg-primary text-primary-foreground" : "bg-background text-muted-foreground dark:bg-input/32 [@media(hover:hover)]:hover:text-foreground",
              )}
              key={p.value}
              onClick={() => applyExpression(p.value)}
              type="button"
            >
              {p.label}
            </button>
          );
        })}
      </div>

      <div className="border-t bg-muted/30 px-4 py-3.5">
        <div className="flex items-center justify-between gap-3">
          <span className="font-medium text-xs">{spec.label}</span>
          <Tabs onValueChange={(v) => setMode(v as Mode)} value={mode}>
            <TabsList size="sm">
              <TabsTab className="px-2.5 text-xs sm:text-xs" value="every">
                Every
              </TabsTab>
              {canStep && (
                <TabsTab className="px-2.5 text-xs sm:text-xs" value="step">
                  Every N
                </TabsTab>
              )}
              <TabsTab className="px-2.5 text-xs sm:text-xs" value="specific">
                Specific
              </TabsTab>
            </TabsList>
          </Tabs>
        </div>

        <motion.div
          animate={{ height: panelHeight ?? "auto" }}
          className="overflow-hidden"
          initial={false}
          transition={reduce ? { duration: 0 } : { duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
        >
          <div ref={panelRef}>
            <motion.div
              animate={{ opacity: 1 }}
              className="pt-3"
              initial={mounted.current ? { opacity: 0.4 } : false}
              key={`${active}-${mode === "specific" ? "s" : mode}`}
              transition={{ duration: 0.12 }}
            >
              {mode === "every" && (
                <p className="flex h-9 items-center text-muted-foreground text-xs">
                  Runs every {spec.noun}
                  {spec.id === "dom" || spec.id === "dow" ? " (unless the other day field narrows it)" : ""}.
                </p>
              )}
              {mode === "step" && (
                <div className="flex h-9 items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Every</span>
                  <div className="flex items-center rounded-lg border bg-background shadow-xs/5 dark:bg-input/32">
                    <button
                      aria-label="Fewer"
                      className="grid size-8 place-items-center rounded-s-lg text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40 [@media(hover:hover)]:hover:text-foreground"
                      disabled={stepValue <= 2}
                      onClick={() => setField(active, `*/${stepValue - 1}`)}
                      type="button"
                    >
                      <MinusIcon className="size-3" />
                    </button>
                    <span className="w-8 text-center font-medium font-mono tabular-nums">{stepValue}</span>
                    <button
                      aria-label="More"
                      className="grid size-8 place-items-center rounded-e-lg text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40 [@media(hover:hover)]:hover:text-foreground"
                      disabled={stepValue >= maxStep}
                      onClick={() => setField(active, `*/${stepValue + 1}`)}
                      type="button"
                    >
                      <PlusIcon className="size-3" />
                    </button>
                  </div>
                  <span className="text-muted-foreground">{spec.plural}</span>
                </div>
              )}
              {mode === "specific" && (
                <div className={cn("grid gap-1", cols)}>
                  {grid.map((v) => {
                    const on = current.has(v);
                    return (
                      <button
                        aria-label={spec.id === "month" ? MONTHS[v - 1] : spec.id === "dow" ? DAYS[v] : `${spec.label} ${v}`}
                        aria-pressed={on}
                        className={cn(
                          "h-8 rounded-md font-mono text-[11px] tabular-nums outline-none transition-[background-color,color,scale] duration-100 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]",
                          on ? "border border-primary bg-primary text-primary-foreground" : "border bg-background text-muted-foreground dark:bg-input/32 [@media(hover:hover)]:hover:text-foreground",
                          (spec.id === "month" || spec.id === "dow") && "font-sans text-xs",
                        )}
                        key={v}
                        onClick={() => toggleValue(v)}
                        type="button"
                      >
                        {cellLabel(spec, v)}
                      </button>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </div>
        </motion.div>
      </div>

      <div className="border-t px-4 py-3">
        <p className="mb-1.5 font-medium text-muted-foreground text-xs">Next runs</p>
        {firstError || never ? (
          <div className="grid h-[140px] place-items-center rounded-lg border border-dashed text-center text-muted-foreground text-xs">
            {firstError ? "Fix the expression to see upcoming runs." : "Nothing scheduled: this expression never matches a real date."}
          </div>
        ) : (
          <ol className="flex flex-col">
            {(now === null ? Array.from({ length: 5 }, () => null) : runsList).map((d, i) => (
              <li className="flex h-7 items-center gap-3 text-xs" key={d ? d.getTime() : `e${i}`}>
                <span className="w-4 text-muted-foreground/60 tabular-nums">{i + 1}</span>
                {d && now !== null ? (
                  <>
                    <span className={cn("flex-1 tabular-nums", i === 0 && "font-medium")}>
                      {when(d)} <span className="text-muted-foreground">·</span> {pad(d.getHours())}:{pad(d.getMinutes())}
                    </span>
                    <span className="text-muted-foreground tabular-nums">{relative(d, now)}</span>
                  </>
                ) : (
                  <span className="h-2 flex-1 rounded-full bg-muted" style={{ maxWidth: `${60 - i * 6}%` }} />
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
