"use client";

import { GitBranchIcon, GitMergeIcon, TagIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface CommitRef {
  name: string;
  type: "branch" | "tag";
  current?: boolean;
}

export interface Commit {
  sha: string;
  message: string;
  body?: string;
  author: { name: string; initials?: string; className?: string };
  date: string;
  parents: string[];
  refs?: CommitRef[];
  stats?: { files: number; additions: number; deletions: number };
}

export interface BranchGraphProps {
  commits: Commit[];
  title?: string;
  onSelect?: (commit: Commit) => void;
  className?: string;
}

const ROW = 36;
const LANE = 16;
const PAD = 14;
const R = 4;

const LANES = [
  { stroke: "stroke-sky-500", fill: "fill-sky-500", dot: "bg-sky-500", chip: "bg-sky-500/12 text-sky-700 dark:text-sky-300", ring: "stroke-sky-500/30" },
  { stroke: "stroke-violet-500", fill: "fill-violet-500", dot: "bg-violet-500", chip: "bg-violet-500/12 text-violet-700 dark:text-violet-300", ring: "stroke-violet-500/30" },
  { stroke: "stroke-emerald-500", fill: "fill-emerald-500", dot: "bg-emerald-500", chip: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300", ring: "stroke-emerald-500/30" },
  { stroke: "stroke-amber-500", fill: "fill-amber-500", dot: "bg-amber-500", chip: "bg-amber-500/14 text-amber-800 dark:text-amber-300", ring: "stroke-amber-500/30" },
  { stroke: "stroke-rose-500", fill: "fill-rose-500", dot: "bg-rose-500", chip: "bg-rose-500/12 text-rose-700 dark:text-rose-300", ring: "stroke-rose-500/30" },
  { stroke: "stroke-cyan-500", fill: "fill-cyan-500", dot: "bg-cyan-500", chip: "bg-cyan-500/12 text-cyan-700 dark:text-cyan-300", ring: "stroke-cyan-500/30" },
];
const laneTone = (i: number) => LANES[i % LANES.length];

interface Edge {
  from: number;
  to: number;
  fromLane: number;
  toLane: number;
  route: number;
}

function layout(commits: Commit[]) {
  const row = new Map(commits.map((c, i) => [c.sha, i]));
  const lanes: (string | null)[] = [];
  const laneOf: number[] = [];
  const pending: { from: number; parent: string; route: number }[] = [];
  const free = (skip = -1) => {
    const i = lanes.findIndex((l, k) => l === null && k !== skip);
    return i === -1 ? lanes.length : i;
  };
  commits.forEach((c, i) => {
    let lane = lanes.indexOf(c.sha);
    if (lane === -1) lane = free();
    lanes.forEach((l, k) => {
      if (l === c.sha && k !== lane) lanes[k] = null;
    });
    laneOf[i] = lane;
    lanes[lane] = c.parents[0] ?? null;
    if (c.parents[0]) pending.push({ from: i, parent: c.parents[0], route: lane });
    for (const p of c.parents.slice(1)) {
      let j = lanes.indexOf(p);
      if (j === -1) {
        j = free(lane);
        lanes[j] = p;
      }
      pending.push({ from: i, parent: p, route: j });
    }
    while (lanes.length && lanes[lanes.length - 1] === null) lanes.pop();
  });
  const edges: Edge[] = pending.map((e) => {
    const to = row.get(e.parent);
    return to === undefined
      ? { from: e.from, to: commits.length, fromLane: laneOf[e.from], toLane: e.route, route: e.route }
      : { from: e.from, to, fromLane: laneOf[e.from], toLane: laneOf[to], route: e.route };
  });
  const width = Math.max(...laneOf, ...edges.map((e) => e.route)) + 1;
  return { laneOf, edges, width };
}

const x = (lane: number) => PAD + lane * LANE;
const y = (r: number) => r * ROW + ROW / 2;
const curve = (x1: number, y1: number, x2: number, y2: number) => {
  const m = (y2 - y1) / 2;
  return `C ${x1} ${y1 + m} ${x2} ${y2 - m} ${x2} ${y2}`;
};

function edgePath(e: Edge) {
  const x1 = x(e.fromLane);
  const y1 = y(e.from);
  const xr = x(e.route);
  const x2 = x(e.toLane);
  const y2 = y(e.to);
  if (e.to - e.from === 1) return `M ${x1} ${y1} ${x1 === x2 ? `L ${x2} ${y2}` : curve(x1, y1, x2, y2)}`;
  let d = `M ${x1} ${y1} `;
  let cy = y1;
  if (xr !== x1) {
    d += `${curve(x1, y1, xr, y1 + ROW)} `;
    cy = y1 + ROW;
  }
  if (xr !== x2) {
    if (y2 - ROW > cy) d += `L ${xr} ${y2 - ROW} `;
    d += curve(xr, y2 - ROW, x2, y2);
  } else d += `L ${x2} ${y2}`;
  return d;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad2 = (n: number) => String(n).padStart(2, "0");
const shortDate = (iso: string) => {
  const d = new Date(iso);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
};
const longDate = (iso: string) => {
  const d = new Date(iso);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()} · ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())} UTC`;
};
const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

function Avatar({ author, size = "sm" }: { author: Commit["author"]; size?: "sm" | "md" }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-full font-medium",
        size === "sm" ? "size-5 text-[9px]" : "size-6 text-[10px]",
        author.className ?? "bg-muted text-muted-foreground",
      )}
    >
      {author.initials ?? initialsOf(author.name)}
    </span>
  );
}

export function BranchGraph({ commits, title = "History", onSelect, className }: BranchGraphProps) {
  const reduce = useReducedMotion();
  const { laneOf, edges, width } = useMemo(() => layout(commits), [commits]);
  const graphW = PAD * 2 + (width - 1) * LANE;
  const [hover, setHover] = useState<number | null>(null);
  const [focusRow, setFocusRow] = useState(0);
  const [warm, setWarm] = useState(false);
  const [shown, setShown] = useState<number | null>(null);
  const delay = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cool = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (delay.current) clearTimeout(delay.current);
    if (hover === null) {
      cool.current = setTimeout(() => {
        setShown(null);
        setWarm(false);
      }, 120);
      return;
    }
    if (cool.current) clearTimeout(cool.current);
    if (warm) setShown(hover);
    else
      delay.current = setTimeout(() => {
        setShown(hover);
        setWarm(true);
      }, 380);
  }, [hover, warm]);

  useEffect(
    () => () => {
      if (delay.current) clearTimeout(delay.current);
      if (cool.current) clearTimeout(cool.current);
    },
    [],
  );

  const onKey = (e: KeyboardEvent, i: number) => {
    const next = e.key === "ArrowDown" ? i + 1 : e.key === "ArrowUp" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? commits.length - 1 : -1;
    if (next >= 0 && next < commits.length) {
      e.preventDefault();
      setFocusRow(next);
      rowRefs.current[next]?.focus();
    } else if (e.key === "Enter") onSelect?.(commits[i]);
    else if (e.key === "Escape") setHover(null);
  };

  const card = shown !== null ? commits[shown] : null;
  const cardBelow = shown !== null && shown < commits.length - 3;
  const branches = new Set(commits.flatMap((c) => (c.refs ?? []).filter((r) => r.type === "branch").map((r) => r.name)));
  const merges = commits.filter((c) => c.parents.length > 1).length;

  return (
    <div className={cn("w-full min-w-0 max-w-[600px] rounded-2xl border bg-card text-sm shadow-xs/5", className)}>
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <h3 className="flex-1 font-medium">{title}</h3>
        <span className="flex items-center gap-1 text-muted-foreground text-xs tabular-nums">
          <GitBranchIcon className="size-3.5" />
          {branches.size} branches
        </span>
        <span className="flex items-center gap-1 text-muted-foreground text-xs tabular-nums">
          <GitMergeIcon className="size-3.5" />
          {merges} merges
        </span>
      </div>

      <div className="relative py-1.5" onMouseLeave={() => setHover(null)}>
        <svg
          aria-hidden
          className="pointer-events-none absolute top-1.5 left-0"
          fill="none"
          height={commits.length * ROW}
          width={graphW}
        >
          {edges.map((e, i) => (
            <motion.path
              animate={{ pathLength: 1, opacity: 1 }}
              className={laneTone(e.route).stroke}
              d={edgePath(e)}
              initial={{ pathLength: 0, opacity: 0 }}
              key={i}
              strokeLinecap="round"
              strokeWidth={2}
              transition={reduce ? { duration: 0 } : { duration: 0.5, delay: e.from * 0.035, ease: [0.23, 1, 0.32, 1] }}
            />
          ))}
          {commits.map((c, i) => {
            const tone = laneTone(laneOf[i]);
            const active = hover === i || shown === i;
            const merge = c.parents.length > 1;
            return (
              <g key={c.sha} transform={`translate(${x(laneOf[i])} ${y(i)})`}>
                <motion.circle
                  animate={{ scale: active ? 1 : 0.4, opacity: active ? 1 : 0 }}
                  className={tone.ring}
                  fill="none"
                  initial={false}
                  r={9}
                  strokeWidth={3}
                  transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
                />
                <motion.circle
                  animate={{ scale: active ? 1.35 : 1, opacity: 1 }}
                  className={cn(merge ? "fill-card" : tone.fill, tone.stroke)}
                  initial={{ scale: 0.6, opacity: 0 }}
                  r={merge ? R + 0.5 : R}
                  strokeWidth={merge ? 2.5 : 0}
                  transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 26, delay: active ? 0 : i * 0.035 }}
                />
              </g>
            );
          })}
        </svg>

        <div aria-label="Commits" role="list">
          {commits.map((c, i) => {
            const tone = laneTone(laneOf[i]);
            return (
              <div
                aria-label={`${c.message}, ${c.author.name}, ${shortDate(c.date)}, ${c.sha.slice(0, 7)}`}
                className={cn(
                  "relative flex h-9 cursor-default items-center gap-2 pe-4 outline-none transition-colors duration-100",
                  hover === i ? "bg-accent/60" : "",
                  "focus-visible:bg-accent/60 focus-visible:shadow-[inset_2px_0_0_var(--color-ring)]",
                )}
                key={c.sha}
                onBlur={() => setHover(null)}
                onClick={() => onSelect?.(c)}
                onFocus={() => {
                  setFocusRow(i);
                  setHover(i);
                }}
                onKeyDown={(e) => onKey(e, i)}
                onMouseEnter={() => setHover(i)}
                ref={(el) => {
                  rowRefs.current[i] = el;
                }}
                role="listitem"
                style={{ paddingInlineStart: graphW + 4 }}
                tabIndex={i === focusRow ? 0 : -1}
              >
                {(c.refs ?? []).map((ref) => (
                  <span
                    className={cn(
                      "inline-flex h-5 shrink-0 items-center gap-1 rounded-md px-1.5 font-medium font-mono text-[10.5px] max-sm:hidden",
                      ref.type === "tag" ? "border bg-background text-muted-foreground" : tone.chip,
                      ref.current && "ring-1 ring-current/40",
                    )}
                    key={ref.name}
                  >
                    {ref.type === "tag" ? <TagIcon className="size-2.5" /> : <GitBranchIcon className="size-2.5" />}
                    {ref.name}
                  </span>
                ))}
                <span className={cn("min-w-0 flex-1 truncate", c.parents.length > 1 && "text-muted-foreground")}>{c.message}</span>
                <span className="shrink-0 max-sm:hidden">
                  <Avatar author={c.author} />
                </span>
                <span className="w-12 shrink-0 text-end text-muted-foreground text-xs tabular-nums max-sm:hidden">{shortDate(c.date)}</span>
                <code className="w-[52px] shrink-0 text-end font-mono text-muted-foreground text-xs">{c.sha.slice(0, 7)}</code>
              </div>
            );
          })}
        </div>

        <AnimatePresence>
          {card && shown !== null && (
            <motion.div
              animate={{ opacity: 1, scale: 1, y: cardBelow ? y(shown) + ROW / 2 + 6 : y(shown) - ROW / 2 - 6 }}
              aria-hidden
              className="pointer-events-none absolute top-1.5 z-20 w-[300px]"
              exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.12 } }}
              initial={{ opacity: 0, scale: 0.97, y: cardBelow ? y(shown) + ROW / 2 + 6 : y(shown) - ROW / 2 - 6 }}
              style={{ left: graphW + 2, maxWidth: `calc(100% - ${graphW + 14}px)`, transformOrigin: "top left" }}
              transition={{
                y: reduce ? { duration: 0 } : { type: "spring", stiffness: 600, damping: 44 },
                opacity: { duration: 0.14 },
                scale: { duration: 0.16, ease: [0.23, 1, 0.32, 1] },
              }}
            >
              <div
                className={cn(
                  "rounded-xl border bg-popover p-3 text-popover-foreground shadow-lg/5",
                  !cardBelow && "-translate-y-full",
                )}
              >
                <div className="flex items-start gap-2.5">
                  <Avatar author={card.author} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm leading-5 text-pretty">{card.message}</p>
                    <p className="mt-0.5 text-muted-foreground text-xs">
                      {card.author.name} · {longDate(card.date)}
                    </p>
                  </div>
                </div>
                {card.body && <p className="mt-2 text-muted-foreground text-xs leading-5 text-pretty">{card.body}</p>}
                <div className="mt-2.5 flex items-center gap-2 border-t pt-2.5 font-mono text-xs">
                  <span className={cn("size-2 rounded-full", laneTone(laneOf[shown]).dot)} />
                  <span className="text-foreground">{card.sha.slice(0, 10)}</span>
                  {card.parents.length > 1 ? (
                    <span className="truncate text-muted-foreground">
                      merges {card.parents.map((p) => p.slice(0, 7)).join(" + ")}
                    </span>
                  ) : (
                    card.stats && (
                      <span className="ms-auto flex items-center gap-1.5 tabular-nums">
                        <span className="text-success-foreground">+{card.stats.additions}</span>
                        <span className="text-destructive-foreground">−{card.stats.deletions}</span>
                        <span className="font-sans text-muted-foreground">
                          · {card.stats.files} file{card.stats.files === 1 ? "" : "s"}
                        </span>
                      </span>
                    )
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
