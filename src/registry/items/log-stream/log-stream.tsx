"use client";

import { ArrowDownIcon, ChevronRightIcon, PauseIcon, PlayIcon, SearchIcon, XIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ReactNode, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogLine {
  id: string;
  ts: number;
  level: LogLevel;
  service: string;
  message: string;
}

export interface LogStreamProps {
  initialLines?: LogLine[];
  subscribe?: (push: (line: LogLine) => void) => () => void;
  limit?: number;
  foldAfter?: number;
  title?: string;
  className?: string;
}

const LEVELS: { id: LogLevel; label: string; short: string; text: string; dot: string }[] = [
  { id: "debug", label: "Debug", short: "DBG", text: "text-muted-foreground", dot: "bg-muted-foreground/60" },
  { id: "info", label: "Info", short: "INF", text: "text-info-foreground", dot: "bg-info" },
  { id: "warn", label: "Warn", short: "WRN", text: "text-warning-foreground", dot: "bg-warning" },
  { id: "error", label: "Error", short: "ERR", text: "text-destructive-foreground", dot: "bg-destructive" },
];
const levelInfo = Object.fromEntries(LEVELS.map((l) => [l.id, l])) as Record<LogLevel, (typeof LEVELS)[number]>;

const template = (m: string) => m.replace(/\b[0-9a-f]{6,}\b/gi, "#").replace(/\d+(\.\d+)?/g, "#");

const pad = (n: number, w = 2) => String(n).padStart(w, "0");
const clock = (ts: number) => {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
};

function Mark({ text, q }: { text: string; q: string }) {
  if (!q) return <>{text}</>;
  const out: ReactNode[] = [];
  const lower = text.toLowerCase();
  let at = 0;
  let hit = lower.indexOf(q);
  while (hit !== -1) {
    out.push(text.slice(at, hit));
    out.push(
      <mark className="rounded-[calc(var(--radius)*0.3)] bg-warning/30 px-px text-inherit dark:bg-warning/35" key={hit}>
        {text.slice(hit, hit + q.length)}
      </mark>,
    );
    at = hit + q.length;
    hit = lower.indexOf(q, at);
  }
  out.push(text.slice(at));
  return <>{out}</>;
}

type Item = { kind: "line"; line: LogLine } | { kind: "group"; id: string; lines: LogLine[] };

function Row({ line, q, nested, fresh }: { line: LogLine; q: string; nested?: boolean; fresh: boolean }) {
  const reduce = useReducedMotion();
  const lvl = levelInfo[line.level];
  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "grid grid-cols-[88px_30px_minmax(0,1fr)] items-baseline gap-x-2.5 px-3 py-[3px] sm:grid-cols-[88px_30px_64px_minmax(0,1fr)]",
        line.level === "error" && !nested && "bg-destructive/[0.06]",
        line.level === "warn" && !nested && "bg-warning/[0.06]",
        nested && "ps-6",
      )}
      initial={fresh && !reduce ? { opacity: 0, y: 4 } : false}
      transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
    >
      <span className="text-muted-foreground tabular-nums">{clock(line.ts)}</span>
      <span className={cn("font-semibold", lvl.text)}>{lvl.short}</span>
      <span className="truncate text-muted-foreground max-sm:hidden">{line.service}</span>
      <span className="min-w-0 break-words">
        <Mark q={q} text={line.message} />
      </span>
    </motion.div>
  );
}

export function LogStream({ initialLines = [], subscribe, limit = 500, foldAfter = 3, title = "Logs", className }: LogStreamProps) {
  const reduce = useReducedMotion();
  const [lines, setLines] = useState<LogLine[]>(initialLines);
  const [shownCount, setShownCount] = useState(initialLines.length);
  const [paused, setPaused] = useState(false);
  const [follow, setFollow] = useState(true);
  const [levels, setLevels] = useState<Set<LogLevel>>(new Set(["debug", "info", "warn", "error"]));
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [rate, setRate] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const seen = useRef(new Set<string>(initialLines.map((l) => l.id)));
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useEffect(() => {
    if (!subscribe) return;
    setLines(initialLines);
    return subscribe((line) => {
      setLines((ls) => {
        const next = [...ls, line];
        return next.length > limit ? next.slice(next.length - limit) : next;
      });
    });
  }, [subscribe, limit]);

  const linesRef = useRef(lines);
  linesRef.current = lines;
  useEffect(() => {
    const t = setInterval(() => {
      const now = Date.now();
      const ls = linesRef.current;
      let n = 0;
      for (let i = ls.length - 1; i >= 0 && now - ls[i].ts < 5000; i--) n++;
      setRate(n / 5);
    }, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!paused) setShownCount(lines.length);
  }, [lines.length, paused]);
  const visible = paused ? lines.slice(0, Math.min(shownCount, lines.length)) : lines;
  const newWhilePaused = paused ? Math.max(0, lines.length - shownCount) : 0;

  const q = query.trim().toLowerCase();
  const counts = useMemo(() => {
    const c: Record<LogLevel, number> = { debug: 0, info: 0, warn: 0, error: 0 };
    for (const l of visible) c[l.level]++;
    return c;
  }, [visible]);

  const filtered = useMemo(
    () => visible.filter((l) => levels.has(l.level) && (!q || l.message.toLowerCase().includes(q) || l.service.includes(q))),
    [visible, levels, q],
  );

  const items = useMemo(() => {
    const out: Item[] = [];
    let i = 0;
    while (i < filtered.length) {
      const first = filtered[i];
      const key = `${first.level}|${first.service}|${template(first.message)}`;
      let j = i + 1;
      while (j < filtered.length && `${filtered[j].level}|${filtered[j].service}|${template(filtered[j].message)}` === key) j++;
      if (j - i >= foldAfter) out.push({ kind: "group", id: first.id, lines: filtered.slice(i, j) });
      else for (let k = i; k < j; k++) out.push({ kind: "line", line: filtered[k] });
      i = j;
    }
    return out;
  }, [filtered, foldAfter]);

  const freshIds = useMemo(() => {
    const fresh = new Set<string>();
    for (const l of filtered) if (!seen.current.has(l.id)) fresh.add(l.id);
    return fresh;
  }, [filtered]);
  useEffect(() => {
    for (const id of freshIds) seen.current.add(id);
  }, [freshIds]);

  const [behind, setBehind] = useState(0);
  const lastLen = useRef(filtered.length);
  useLayoutEffect(() => {
    const el = listRef.current;
    const added = filtered.length - lastLen.current;
    lastLen.current = filtered.length;
    if (!el) return;
    if (follow && !paused) {
      el.scrollTop = el.scrollHeight;
      setBehind(0);
    } else if (added > 0 && !paused) setBehind((b) => b + added);
  }, [filtered.length, follow, paused, items.length]);

  const jump = () => {
    setPaused(false);
    setFollow(true);
    setBehind(0);
    requestAnimationFrame(() => {
      const el = listRef.current;
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: reduce ? "auto" : "smooth" });
    });
  };

  const toggleLevel = (lvl: LogLevel) =>
    setLevels((s) => {
      const n = new Set(s);
      if (n.has(lvl) && n.size > 1) n.delete(lvl);
      else n.add(lvl);
      return n;
    });

  const pending = paused ? newWhilePaused : behind;

  return (
    <div className={cn("flex w-full min-w-0 max-w-[640px] flex-col overflow-hidden rounded-2xl border bg-card text-sm shadow-xs/5", className)}>
      <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2.5 sm:flex-nowrap">
        <div aria-label="Levels" className="flex shrink-0 items-center gap-1" role="group">
          {LEVELS.map((l) => {
            const on = levels.has(l.id);
            return (
              <button
                aria-pressed={on}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-xs outline-none transition-[background-color,border-color,color,scale] duration-150 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]",
                  on ? "border-border bg-background text-foreground shadow-xs/5 dark:bg-input/32" : "border-transparent text-muted-foreground/70 [@media(hover:hover)]:hover:text-foreground",
                )}
                key={l.id}
                onClick={() => toggleLevel(l.id)}
                type="button"
              >
                <span className={cn("size-1.5 rounded-full transition-opacity max-sm:hidden", l.dot, !on && "opacity-40")} />
                {l.label}
                <span className="text-muted-foreground tabular-nums">{counts[l.id]}</span>
              </button>
            );
          })}
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-1.5 max-sm:basis-full">
          <label className="relative flex h-8 min-w-0 flex-1 items-center rounded-lg border border-input bg-background shadow-xs/5 ring-ring/24 transition-shadow has-focus-visible:border-ring has-focus-visible:ring-[3px] dark:bg-input/32">
            <SearchIcon className="ms-2 size-3.5 shrink-0 text-muted-foreground" />
            <input
              aria-label="Search logs"
              className="h-full min-w-0 flex-1 bg-transparent px-1.5 text-xs outline-none placeholder:text-muted-foreground/72"
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && setQuery("")}
              placeholder="Search"
              value={query}
            />
            {query && (
              <button aria-label="Clear search" className="me-1 grid size-6 place-items-center rounded-md text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring [@media(hover:hover)]:hover:text-foreground" onClick={() => setQuery("")} type="button">
                <XIcon className="size-3" />
              </button>
            )}
          </label>
          <button
            aria-label={paused ? "Resume stream" : "Pause stream"}
            aria-pressed={paused}
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-input bg-background px-2.5 text-xs shadow-xs/5 outline-none transition-[background-color,scale] duration-150 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97] dark:bg-input/32 [@media(hover:hover)]:hover:bg-accent"
            onClick={() => (paused ? jump() : setPaused(true))}
            type="button"
          >
            {paused ? <PlayIcon className="size-3" /> : <PauseIcon className="size-3" />}
            <span className="w-11 text-start">{paused ? "Resume" : "Pause"}</span>
          </button>
        </div>
      </div>

      <div className="relative">
        <div
          aria-label={title}
          aria-live="off"
          className="h-[320px] overflow-y-auto py-1 font-mono text-[11.5px] leading-[18px] outline-none [scrollbar-width:thin] focus-visible:shadow-[inset_0_0_0_2px_var(--color-ring)]"
          onScroll={(e) => {
            const el = e.currentTarget;
            const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 12;
            if (atBottom !== follow) setFollow(atBottom);
            if (atBottom) setBehind(0);
          }}
          ref={listRef}
          role="log"
          tabIndex={0}
        >
          {items.length === 0 && (
            <div className="grid h-full place-items-center px-6 text-center font-sans">
              <div>
                <p className="font-medium text-sm">{q ? `No lines match “${query.trim()}”` : "Waiting for logs…"}</p>
                <p className="mt-1 text-muted-foreground text-xs">{q ? "Try fewer words or turn on more levels." : "New lines show up here as they arrive."}</p>
              </div>
            </div>
          )}
          {items.map((item) => {
            if (item.kind === "line") return <Row fresh={freshIds.has(item.line.id)} key={item.line.id} line={item.line} q={q} />;
            const isOpen = open.has(item.id);
            const last = item.lines[item.lines.length - 1];
            const lvl = levelInfo[last.level];
            const freshGroup = item.lines.some((l) => freshIds.has(l.id));
            return (
              <div className={cn(last.level === "error" ? "bg-destructive/[0.06]" : last.level === "warn" ? "bg-warning/[0.06]" : "")} key={item.id}>
                <button
                  aria-expanded={isOpen}
                  className="grid w-full grid-cols-[88px_30px_minmax(0,1fr)] items-baseline gap-x-2.5 px-3 py-[3px] text-start outline-none focus-visible:shadow-[inset_0_0_0_2px_var(--color-ring)] sm:grid-cols-[88px_30px_64px_minmax(0,1fr)] [@media(hover:hover)]:hover:bg-accent/40"
                  onClick={() =>
                    setOpen((s) => {
                      const n = new Set(s);
                      if (n.has(item.id)) n.delete(item.id);
                      else n.add(item.id);
                      return n;
                    })
                  }
                  type="button"
                >
                  <span className="text-muted-foreground tabular-nums">{clock(last.ts)}</span>
                  <span className={cn("font-semibold", lvl.text)}>{lvl.short}</span>
                  <span className="truncate text-muted-foreground max-sm:hidden">{last.service}</span>
                  <span className="flex min-w-0 items-baseline gap-2">
                    <span className="min-w-0 truncate">
                      <Mark q={q} text={last.message} />
                    </span>
                    <motion.span
                      animate={{ scale: 1 }}
                      className={cn(
                        "inline-flex shrink-0 items-center gap-0.5 self-center rounded-full px-1.5 font-sans font-medium text-[10.5px] tabular-nums leading-4",
                        last.level === "error" ? "bg-destructive/12 text-destructive-foreground" : "bg-muted text-muted-foreground",
                      )}
                      initial={freshGroup && !reduce ? { scale: 1.15 } : false}
                      key={item.lines.length}
                      transition={{ type: "spring", stiffness: 600, damping: 20 }}
                    >
                      <motion.span animate={{ rotate: isOpen ? 90 : 0 }} className="grid place-items-center" transition={{ duration: 0.15 }}>
                        <ChevronRightIcon className="size-2.5" />
                      </motion.span>
                      {item.lines.length} similar
                    </motion.span>
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      animate={{ height: "auto", opacity: 1 }}
                      className="overflow-hidden border-destructive/20 border-s-2 ms-3"
                      exit={{ height: 0, opacity: 0 }}
                      initial={{ height: 0, opacity: 0 }}
                      transition={reduce ? { duration: 0 } : { duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                    >
                      {item.lines.map((l) => (
                        <Row fresh={false} key={l.id} line={l} nested q={q} />
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        <AnimatePresence>
          {pending > 0 && (
            <motion.button
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="absolute bottom-3 left-1/2 inline-flex h-7 -translate-x-1/2 items-center gap-1.5 rounded-full bg-primary px-3 font-medium text-primary-foreground text-xs shadow-lg/10 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.97]"
              exit={{ opacity: 0, y: 6, scale: 0.96 }}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.96 }}
              onClick={jump}
              transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
              type="button"
            >
              <ArrowDownIcon className="size-3" />
              <span className="tabular-nums">
                {pending} new {pending === 1 ? "line" : "lines"}
              </span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <div className="flex h-9 items-center gap-2 border-t px-3 text-muted-foreground text-xs">
        <span className="relative flex size-2 shrink-0">
          {!paused && <span className="absolute inset-0 animate-ping rounded-full bg-success/50 motion-reduce:hidden" />}
          <span className={cn("relative size-2 rounded-full", paused ? "bg-muted-foreground/50" : "bg-success")} />
        </span>
        <span className="min-w-0 flex-1 truncate">
          {paused ? "Paused · buffering" : follow ? "Live · following" : "Live · scrolled back"}
          <span className="tabular-nums"> · {rate.toFixed(1)} lines/s</span>
        </span>
        <span className="shrink-0 tabular-nums">
          {q ? `${filtered.length} of ${visible.length}` : `${lines.length.toLocaleString("en-US")} lines`}
        </span>
      </div>
    </div>
  );
}
