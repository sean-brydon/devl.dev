"use client";

import { FileTextIcon, Grid3x3Icon, LayoutDashboardIcon, ShrinkIcon, XIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control";
import { cn } from "@/lib/utils";

function useReducedMotionAfterMount() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && Boolean(prefers);
}

export type BudgetPart = "system" | "tools" | "memory" | "files" | "summary" | "chat" | "results" | "free";
export type BudgetView = "cells" | "treemap";

export interface BudgetFile {
  id: string;
  name: string;
  tokens: number;
}

export interface TokenBudgetProps {
  model?: string;
  limit?: number;
  system?: number;
  tools?: number;
  memory?: number;
  files?: BudgetFile[];
  chat?: number;
  turns?: number;
  results?: number;
  keepRecent?: number;
  summaryRatio?: number;
  defaultView?: BudgetView;
  cells?: number;
  columns?: number;
  onRemoveFile?: (id: string) => void;
  onCompact?: (summary: { turns: number; summaryTokens: number; freed: number }) => void;
  className?: string;
}

const parts: Record<BudgetPart, { label: string; cell: string; tile: string; dot: string }> = {
  system: {
    label: "System",
    cell: "bg-stone-500 dark:bg-stone-400",
    tile: "bg-stone-500/12 border-stone-500/30 text-stone-800 dark:bg-stone-400/14 dark:border-stone-400/30 dark:text-stone-200",
    dot: "bg-stone-500 dark:bg-stone-400",
  },
  tools: {
    label: "Tools",
    cell: "bg-sky-500 dark:bg-sky-400",
    tile: "bg-sky-500/12 border-sky-500/30 text-sky-800 dark:bg-sky-400/14 dark:border-sky-400/30 dark:text-sky-200",
    dot: "bg-sky-500 dark:bg-sky-400",
  },
  memory: {
    label: "Memory",
    cell: "bg-emerald-500 dark:bg-emerald-400",
    tile: "bg-emerald-500/12 border-emerald-500/30 text-emerald-800 dark:bg-emerald-400/14 dark:border-emerald-400/30 dark:text-emerald-200",
    dot: "bg-emerald-500 dark:bg-emerald-400",
  },
  files: {
    label: "Files",
    cell: "bg-amber-500 dark:bg-amber-400",
    tile: "bg-amber-500/14 border-amber-500/35 text-amber-900 dark:bg-amber-400/14 dark:border-amber-400/30 dark:text-amber-200",
    dot: "bg-amber-500 dark:bg-amber-400",
  },
  summary: {
    label: "Summary",
    cell: "bg-lime-500 dark:bg-lime-400",
    tile: "bg-lime-500/16 border-lime-600/40 text-lime-900 dark:bg-lime-400/16 dark:border-lime-400/35 dark:text-lime-200",
    dot: "bg-lime-500 dark:bg-lime-400",
  },
  chat: {
    label: "Chat",
    cell: "bg-violet-500 dark:bg-violet-400",
    tile: "bg-violet-500/12 border-violet-500/30 text-violet-800 dark:bg-violet-400/14 dark:border-violet-400/30 dark:text-violet-200",
    dot: "bg-violet-500 dark:bg-violet-400",
  },
  results: {
    label: "Tool results",
    cell: "bg-rose-500 dark:bg-rose-400",
    tile: "bg-rose-500/12 border-rose-500/30 text-rose-800 dark:bg-rose-400/14 dark:border-rose-400/30 dark:text-rose-200",
    dot: "bg-rose-500 dark:bg-rose-400",
  },
  free: {
    label: "Free",
    cell: "bg-foreground/[0.07]",
    tile: "border-dashed border-foreground/20 text-muted-foreground",
    dot: "bg-foreground/15",
  },
};

interface Segment {
  id: string;
  part: BudgetPart;
  label: string;
  tokens: number;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function orderedTreemap<T extends { tokens: number }>(items: T[], r: Rect, aspect: number, out: Map<T, Rect>) {
  if (!items.length) return;
  if (items.length === 1) {
    out.set(items[0], r);
    return;
  }
  const total = items.reduce((s, i) => s + i.tokens, 0) || 1;
  let acc = 0;
  let k = 1;
  let best = Number.POSITIVE_INFINITY;
  for (let i = 0; i < items.length - 1; i++) {
    acc += items[i].tokens;
    const d = Math.abs(acc - total / 2);
    if (d < best) {
      best = d;
      k = i + 1;
    }
  }
  const a = items.slice(0, k);
  const ratio = a.reduce((s, i) => s + i.tokens, 0) / total;
  if (r.w * aspect >= r.h) {
    orderedTreemap(a, { ...r, w: r.w * ratio }, aspect, out);
    orderedTreemap(items.slice(k), { ...r, x: r.x + r.w * ratio, w: r.w * (1 - ratio) }, aspect, out);
  } else {
    orderedTreemap(a, { ...r, h: r.h * ratio }, aspect, out);
    orderedTreemap(items.slice(k), { ...r, y: r.y + r.h * ratio, h: r.h * (1 - ratio) }, aspect, out);
  }
}

const k = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 100_000 ? 0 : 1).replace(/\.0$/, "")}k` : `${Math.round(n)}`);

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

function Roll({ text, className }: { text: string; className?: string }) {
  const reduce = useReducedMotionAfterMount();
  let d = 0;
  let o = 0;
  const glyphs = [...text]
    .reverse()
    .map((c) => ({ c, digit: c >= "0" && c <= "9", key: c >= "0" && c <= "9" ? `d${d++}` : `s${o++}` }))
    .reverse();
  return (
    <span className={cn("inline-flex whitespace-nowrap tabular-nums leading-none", className)}>
      <span className="sr-only">{text}</span>
      <span aria-hidden className="inline-flex [--row:1.2em]">
        {glyphs.map(({ c, digit, key }) =>
          digit ? (
            <span className="relative inline-block h-(--row) overflow-hidden" key={key}>
              <span className="invisible block leading-(--row)">0</span>
              <motion.span
                animate={{ y: `${-Number(c) * 10}%` }}
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
          ) : (
            <span className="inline-block h-(--row) leading-(--row)" key={key}>
              {c === " " ? "\u00a0" : c}
            </span>
          ),
        )}
      </span>
    </span>
  );
}

type Hover = { part: BudgetPart; id?: string } | null;

export function TokenBudget({
  model = "orbit-2",
  limit = 200_000,
  system = 4_200,
  tools = 14_800,
  memory = 3_100,
  files: initialFiles = [],
  chat: initialChat = 0,
  turns: initialTurns = 0,
  results = 0,
  keepRecent = 0.2,
  summaryRatio = 0.06,
  defaultView = "cells",
  cells = 200,
  columns = 20,
  onRemoveFile,
  onCompact,
  className,
}: TokenBudgetProps) {
  const reduce = useReducedMotionAfterMount();
  const [view, setView] = useState<BudgetView>(defaultView);
  const [files, setFiles] = useState(initialFiles);
  const [chat, setChat] = useState(initialChat);
  const [turns, setTurns] = useState(initialTurns);
  const [summary, setSummary] = useState(0);
  const [folded, setFolded] = useState(0);
  const [compacting, setCompacting] = useState(false);
  const [hover, setHover] = useState<Hover>(null);
  const [size, setSize] = useState({ w: 400, h: 200 });
  const box = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const segments = (
    [
      { id: "system", part: "system", label: "System", tokens: system },
      { id: "tools", part: "tools", label: "Tools", tokens: tools },
      { id: "memory", part: "memory", label: "Memory", tokens: memory },
    ...files.map((f) => ({ id: f.id, part: "files" as const, label: f.name.split("/").pop() ?? f.name, tokens: f.tokens })),
    ...(summary > 0 ? [{ id: "summary", part: "summary" as const, label: "Summary", tokens: summary }] : []),
    { id: "chat", part: "chat", label: "Chat", tokens: chat },
      { id: "results", part: "results", label: "Tool results", tokens: results },
    ] as Segment[]
  ).filter((s) => s.tokens > 0);
  const used = segments.reduce((s, x) => s + x.tokens, 0);
  const free = Math.max(limit - used, 0);
  const pct = Math.min(used / limit, 1);
  const perCell = limit / cells;

  const totals: Record<BudgetPart, number> = {
    system,
    tools,
    memory,
    files: files.reduce((s, f) => s + f.tokens, 0),
    summary,
    chat,
    results,
    free,
  };

  const owners: (Segment | null)[] = [];
  let si = 0;
  let end = segments[0]?.tokens ?? 0;
  for (let i = 0; i < cells; i++) {
    const mid = (i + 0.5) * perCell;
    while (si < segments.length && mid > end) {
      si++;
      end += segments[si]?.tokens ?? 0;
    }
    owners.push(si < segments.length ? segments[si] : null);
  }

  const tiles = new Map<Segment, Rect>();
  const all: Segment[] = [...segments, ...(free > 0 ? [{ id: "free", part: "free" as const, label: "Free", tokens: free }] : [])];
  orderedTreemap(all, { x: 0, y: 0, w: 1, h: 1 }, size.w / Math.max(size.h, 1), tiles);

  const lit = (seg: Segment | null) => {
    if (!hover) return true;
    const part = seg?.part ?? "free";
    if (hover.id) return seg?.id === hover.id;
    return part === hover.part;
  };

  const removeFile = (id: string) => {
    setFiles((fs) => fs.filter((f) => f.id !== id));
    setHover(null);
    onRemoveFile?.(id);
  };

  const keptTurns = Math.max(1, Math.round(turns * keepRecent));
  const foldTurns = turns - keptTurns;
  const foldTokens = Math.round(chat * (1 - keepRecent));
  const summaryTokens = Math.round(foldTokens * summaryRatio);
  const canCompact = foldTurns >= 2 && !compacting;

  const compact = () => {
    if (!canCompact) return;
    const apply = () => {
      setChat((c) => c - foldTokens);
      setSummary((s) => s + summaryTokens);
      setTurns(keptTurns);
      setFolded((f) => f + foldTurns);
      setCompacting(false);
      onCompact?.({ turns: foldTurns, summaryTokens, freed: foldTokens - summaryTokens });
    };
    if (reduce) return apply();
    setCompacting(true);
    setHover(null);
    timer.current = setTimeout(apply, 900);
  };

  const focus = hover
    ? hover.id
      ? (() => {
          const f = files.find((x) => x.id === hover.id);
          return f ? { part: "files" as const, label: f.name, tokens: f.tokens } : null;
        })()
      : { part: hover.part, label: parts[hover.part].label, tokens: totals[hover.part] }
    : null;

  const legend: BudgetPart[] = ["system", "tools", "memory", "files", ...(summary > 0 ? (["summary"] as const) : []), "chat", "results", "free"];
  const tone = pct > 0.85 ? "text-destructive-foreground" : pct > 0.7 ? "text-warning-foreground" : "text-foreground";

  return (
    <div className={cn("flex w-[440px] max-w-full flex-col gap-4 rounded-2xl border bg-card p-4 text-card-foreground shadow-xs/5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="font-medium text-sm">Context budget</span>
          <span className="truncate font-mono text-muted-foreground text-xs">{model}</span>
        </div>
        <SegmentedControl aria-label="View" size="sm">
          {(
            [
              ["cells", "Cells", Grid3x3Icon],
              ["treemap", "Treemap", LayoutDashboardIcon],
            ] as const
          ).map(([id, label, Icon]) => (
            <SegmentedControlItem
              aria-pressed={view === id}
              data-pressed={view === id ? "" : undefined}
              key={id}
              onClick={() => setView(id)}
            >
              <Icon />
              <span className="max-[420px]:sr-only">{label}</span>
            </SegmentedControlItem>
          ))}
        </SegmentedControl>
      </div>

      <div className="flex items-baseline justify-between gap-3">
        <span className="flex items-baseline gap-1.5 text-sm">
          <Roll className={cn("font-medium text-2xl tracking-tight", tone)} text={k(used)} />
          <span className="text-muted-foreground text-xs">of {k(limit)} tokens</span>
        </span>
        {focus ? (
          <span className="flex min-w-0 items-center gap-1.5 text-xs" role="status">
            <span className={cn("size-2 shrink-0 rounded-[calc(var(--radius)*0.2)]", parts[focus.part].dot)} />
            <span className="min-w-0 truncate font-medium">{focus.label}</span>
            <span className="shrink-0 text-muted-foreground tabular-nums">
              {k(focus.tokens)} · {Math.round((focus.tokens / limit) * 100)}%
            </span>
          </span>
        ) : (
          <Roll className={cn("text-xs", pct > 0.7 ? tone : "text-muted-foreground")} text={`${Math.round(pct * 100)}% full`} />
        )}
      </div>

      <div className="relative" onPointerLeave={() => setHover(null)} ref={box}>
        <div
          aria-hidden={view !== "cells"}
          className={cn(
            "grid gap-[3px] transition-[opacity,filter] duration-200 ease-out",
            view === "cells" ? "opacity-100 blur-0" : "pointer-events-none opacity-0 blur-[3px]",
          )}
          role="img"
          aria-label={`${k(used)} of ${k(limit)} tokens used`}
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {owners.map((seg, i) => {
            const row = Math.floor(i / columns);
            const col = i % columns;
            const squeeze = compacting && seg?.part === "chat";
            const on = lit(seg);
            const alt = seg?.part === "files" && files.findIndex((f) => f.id === seg.id) % 2 === 1;
            return (
              <motion.div
                animate={
                  squeeze
                    ? { scaleX: 0.35, opacity: 0.55 }
                    : { scaleX: 1, opacity: on ? (alt && !hover ? 0.7 : 1) : 0.18 }
                }
                className={cn("aspect-square rounded-[calc(var(--radius)*0.3)]", seg ? parts[seg.part].cell : parts.free.cell)}
                initial={false}
                key={i}
                onPointerEnter={() => setHover(seg ? { part: seg.part, id: seg.part === "files" ? seg.id : undefined } : { part: "free" })}
                style={{ transition: reduce ? undefined : `background-color 320ms ease ${(row + col) * 8}ms` }}
                transition={
                  squeeze
                    ? { duration: 0.5, delay: (col % 20) * 0.015, ease: [0.23, 1, 0.32, 1] }
                    : reduce
                      ? { duration: 0 }
                      : { type: "spring", stiffness: 420, damping: 30 }
                }
              />
            );
          })}
        </div>

        <div
          aria-hidden={view !== "treemap"}
          className={cn(
            "absolute inset-0 transition-[opacity,filter] duration-200 ease-out",
            view === "treemap" ? "opacity-100 blur-0" : "pointer-events-none opacity-0 blur-[3px]",
          )}
        >
          {all.map((seg) => {
            const r = tiles.get(seg);
            if (!r) return null;
            const wPx = r.w * size.w;
            const hPx = r.h * size.h;
            const on = lit(seg.part === "free" ? null : seg);
            const squeeze = compacting && seg.part === "chat";
            return (
              <motion.div
                animate={{
                  left: `${r.x * 100}%`,
                  top: `${r.y * 100}%`,
                  width: `${r.w * 100}%`,
                  height: `${r.h * 100}%`,
                  opacity: on ? 1 : 0.3,
                }}
                className="absolute p-[1.5px]"
                initial={false}
                key={seg.id}
                onPointerEnter={() => setHover({ part: seg.part, id: seg.part === "files" ? seg.id : undefined })}
                transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 32 }}
              >
                <motion.div
                  animate={squeeze ? { scaleX: 0.82, opacity: 0.6 } : { scaleX: 1, opacity: 1 }}
                  className={cn("flex size-full flex-col justify-between overflow-hidden rounded-lg border p-2 text-xs", parts[seg.part].tile)}
                  initial={false}
                  style={{ transformOrigin: "0% 50%" }}
                  transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                >
                  {wPx > 56 && hPx > 26 && <span className="truncate font-medium leading-none">{seg.label}</span>}
                  {wPx > 40 && hPx > 46 && <span className="truncate tabular-nums leading-none opacity-75">{k(seg.tokens)}</span>}
                </motion.div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <ul className="flex flex-wrap gap-1">
        {legend.map((part) => (
          <li key={part}>
            <button
              className={cn(
                "flex h-7 items-center gap-1.5 rounded-lg px-2 text-xs outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
                hover?.part === part && !hover.id && "bg-accent",
              )}
              onBlur={() => setHover(null)}
              onFocus={() => setHover({ part })}
              onPointerEnter={() => setHover({ part })}
              onPointerLeave={() => setHover(null)}
              type="button"
            >
              <span className={cn("size-2 rounded-[calc(var(--radius)*0.2)]", parts[part].dot)} />
              <span className="text-muted-foreground">{parts[part].label}</span>
              <Roll className="font-medium" text={k(totals[part])} />
            </button>
          </li>
        ))}
      </ul>

      {files.length > 0 && (
        <ul className="-mt-1 flex flex-col">
          <AnimatePresence initial={false}>
            {files.map((file) => (
              <motion.li
                animate={{ opacity: 1, height: "auto" }}
                className="overflow-hidden"
                exit={{ opacity: 0, height: 0 }}
                initial={{ opacity: 0, height: 0 }}
                key={file.id}
                transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 34 }}
              >
                <div
                  className={cn("group flex h-8 items-center gap-2 rounded-lg pr-1 pl-2 transition-colors", hover?.id === file.id && "bg-accent")}
                  onPointerEnter={() => setHover({ part: "files", id: file.id })}
                  onPointerLeave={() => setHover(null)}
                >
                  <FileTextIcon className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span className="min-w-0 flex-1 truncate font-mono text-xs">{file.name}</span>
                  <span className="text-muted-foreground text-xs tabular-nums">{k(file.tokens)}</span>
                  <Button
                    aria-label={`Remove ${file.name} from context`}
                    className="text-muted-foreground"
                    onBlur={() => setHover(null)}
                    onClick={() => removeFile(file.id)}
                    onFocus={() => setHover({ part: "files", id: file.id })}
                    size="icon-xs"
                    variant="ghost"
                  >
                    <XIcon />
                  </Button>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}

      <div className="flex items-center justify-between gap-3 border-t pt-3">
        <span aria-live="polite" className="min-w-0 text-pretty text-muted-foreground text-xs">
          {compacting
            ? `Folding ${foldTurns} older turns into a summary…`
            : canCompact
              ? `${foldTurns} older turns could fold into ~${k(summaryTokens)}, freeing ${k(foldTokens - summaryTokens)}`
              : folded > 0
                ? `${folded} turns live in a ${k(summary)} summary; the last ${turns} stay word for word`
                : "Nothing to compact yet"}
        </span>
        <Button className="shrink-0" disabled={!canCompact} loading={compacting} onClick={compact} size="sm" variant="outline">
          <ShrinkIcon />
          Compact
        </Button>
      </div>
    </div>
  );
}
