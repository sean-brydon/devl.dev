"use client";

import { ArrowDownIcon, ArrowUpIcon, MinusIcon } from "lucide-react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface LeaderboardEntry {
  id: string;
  name: string;
  detail?: string;
  score: number;
  previousRank?: number;
}

export interface LeaderboardProps {
  title?: string;
  caption?: string;
  entries: LeaderboardEntry[];
  youId?: string;
  visible?: number;
  format?: Intl.NumberFormatOptions;
  locale?: string;
  action?: ReactNode;
  className?: string;
}

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const AVATAR_TONES = [
  "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  "bg-amber-500/15 text-amber-800 dark:text-amber-300",
  "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  "bg-teal-500/15 text-teal-700 dark:text-teal-300",
  "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
];
const PODIUM = [
  "bg-amber-400/20 text-amber-700 dark:text-amber-300",
  "bg-neutral-400/20 text-neutral-600 dark:text-neutral-300",
  "bg-orange-500/15 text-orange-700 dark:text-orange-300",
];

function hash(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

function RollingNumber({ text, className }: { text: string; className?: string }) {
  const reduce = useReducedMotion();
  let d = 0;
  let o = 0;
  const glyphs = [...text]
    .reverse()
    .map((ch) => {
      const isDigit = ch >= "0" && ch <= "9";
      return { ch, key: isDigit ? `d${d++}` : `s${o++}${ch}`, digit: isDigit ? Number(ch) : null };
    })
    .reverse();
  return (
    <span className={cn("relative inline-flex whitespace-nowrap tabular-nums leading-none", className)}>
      <span className="sr-only">{text}</span>
      <span aria-hidden className="inline-flex [--row:1.15em]">
        {glyphs.map((g) =>
          g.digit === null ? (
            <span className="inline-block h-(--row) leading-(--row)" key={g.key}>
              {g.ch}
            </span>
          ) : (
            <span
              className="relative inline-block h-(--row) overflow-hidden"
              key={g.key}
              style={{ maskImage: "linear-gradient(transparent, black 18%, black 82%, transparent)" }}
            >
              <span className="invisible block leading-(--row)">0</span>
              <motion.span
                animate={{ y: `${-g.digit * 10}%` }}
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
          ),
        )}
      </span>
    </span>
  );
}

function Movement({ rank, previous }: { rank: number; previous?: number }) {
  const diff = previous === undefined ? 0 : previous - rank;
  return (
    <span
      aria-label={diff === 0 ? "No change" : `${diff > 0 ? "Up" : "Down"} ${Math.abs(diff)}`}
      role="img"
      className={cn(
        "inline-flex w-8 items-center gap-px text-[11px] tabular-nums @max-[24rem]:w-auto @max-[24rem]:text-[10px] @max-[24rem]:leading-3",
        diff > 0 && "text-success-foreground",
        diff < 0 && "text-destructive-foreground",
        diff === 0 && "text-muted-foreground/60",
      )}
    >
      {diff > 0 ? <ArrowUpIcon className="size-3" /> : diff < 0 ? <ArrowDownIcon className="size-3" /> : <MinusIcon className="size-3" />}
      {diff !== 0 ? Math.abs(diff) : null}
    </span>
  );
}

function Row({
  e,
  rank,
  isYou,
  gain,
  pinned = false,
  ahead,
  fmt,
  compact,
}: {
  e: LeaderboardEntry;
  rank: number;
  isYou: boolean;
  gain?: { amount: number; key: number };
  pinned?: boolean;
  ahead?: LeaderboardEntry;
  fmt: Intl.NumberFormat;
  compact: Intl.NumberFormat;
}) {
  const reduce = useReducedMotion();
  const layoutSpring = reduce ? { duration: 0 } : { type: "spring" as const, stiffness: 420, damping: 38 };
  return (
    <motion.li
      className={cn(
        "relative flex h-12 items-center gap-2.5 rounded-xl px-2.5",
        isYou && "bg-info/8 ring-1 ring-info/20 ring-inset dark:bg-info/12",
      )}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      initial={{ opacity: 0 }}
      layout="position"
      layoutId={`row-${e.id}`}
      transition={{ layout: layoutSpring, opacity: { duration: 0.2 } }}
    >
      <span className="flex shrink-0 items-center gap-2.5 @max-[24rem]:w-6 @max-[24rem]:flex-col @max-[24rem]:gap-0">
        <span
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-md font-medium text-xs tabular-nums",
            rank <= 3 ? PODIUM[rank - 1] : "text-muted-foreground",
          )}
        >
          {rank}
        </span>
        <Movement previous={e.previousRank} rank={rank} />
      </span>
      <span
        aria-hidden
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full font-medium text-xs",
          AVATAR_TONES[hash(e.id) % AVATAR_TONES.length],
        )}
      >
        {e.name
          .split(" ")
          .map((p) => p[0])
          .slice(0, 2)
          .join("")}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-center gap-1.5 truncate font-medium text-sm">
          <span className="truncate">{e.name}</span>
          {isYou ? (
            <span className="rounded-sm bg-info/12 px-1 font-medium text-[10px] text-info-foreground uppercase tracking-wide">
              You
            </span>
          ) : null}
        </span>
        {pinned && ahead ? (
          <span className="truncate text-muted-foreground text-xs tabular-nums">
            {compact.format(ahead.score - e.score)} behind {ahead.name.split(" ")[0]}
          </span>
        ) : e.detail ? (
          <span className="truncate text-muted-foreground text-xs">{e.detail}</span>
        ) : null}
      </span>
      <span className="flex shrink-0 flex-col items-end">
        <RollingNumber className="font-medium text-sm" text={fmt.format(e.score)} />
        <span className="relative h-4 w-full">
          <AnimatePresence>
            {gain ? (
              <motion.span
                animate={{ opacity: 1, y: 0 }}
                className="absolute right-0 whitespace-nowrap font-medium text-success-foreground text-xs tabular-nums leading-4"
                exit={{ opacity: 0, transition: { duration: 0.25 } }}
                initial={{ opacity: 0, y: reduce ? 0 : 4 }}
                key={gain.key}
                transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              >
                +{compact.format(gain.amount)}
              </motion.span>
            ) : null}
          </AnimatePresence>
        </span>
      </span>
    </motion.li>
  );
}

export function Leaderboard({
  title = "Leaderboard",
  caption,
  entries,
  youId,
  visible = 5,
  format = { maximumFractionDigits: 0 },
  locale = "en-US",
  action,
  className,
}: LeaderboardProps) {
  const reduce = useReducedMotion();
  const fmt = useMemo(() => new Intl.NumberFormat(locale, format), [locale, format]);
  const compact = useMemo(
    () => new Intl.NumberFormat(locale, { ...format, notation: "compact", maximumFractionDigits: 1 }),
    [locale, format],
  );
  const ranked = useMemo(() => [...entries].sort((a, b) => b.score - a.score), [entries]);
  const rankOf = (id: string) => ranked.findIndex((e) => e.id === id) + 1;

  const prevScores = useRef<Map<string, number>>(new Map());
  const [gains, setGains] = useState<Record<string, { amount: number; key: number }>>({});
  useEffect(() => {
    const next: Record<string, { amount: number; key: number }> = {};
    for (const e of entries) {
      const before = prevScores.current.get(e.id);
      if (before !== undefined && e.score > before) next[e.id] = { amount: e.score - before, key: Date.now() };
      prevScores.current.set(e.id, e.score);
    }
    if (Object.keys(next).length === 0) return;
    setGains((g) => ({ ...g, ...next }));
    const timer = setTimeout(() => {
      setGains((g) => {
        const copy = { ...g };
        for (const id of Object.keys(next)) if (copy[id]?.key === next[id].key) delete copy[id];
        return copy;
      });
    }, 1400);
    return () => clearTimeout(timer);
  }, [entries]);

  const top = ranked.slice(0, visible);
  const you = youId ? ranked.find((e) => e.id === youId) : undefined;
  const youRank = you ? rankOf(you.id) : 0;
  const youPinned = you && youRank > visible;
  const ahead = you && youRank > 1 ? ranked[youRank - 2] : undefined;
  const behind = you ? ranked[youRank] : undefined;

  return (
    <section
      aria-label={title}
      className={cn("@container w-full max-w-[420px] rounded-2xl border bg-card p-3 text-card-foreground shadow-xs/5", className)}
    >
      <header className="flex items-center justify-between gap-3 px-2.5 pt-1.5 pb-3">
        <div className="flex min-w-0 flex-col">
          <h3 className="truncate font-medium text-sm">{title}</h3>
          {caption ? <span className="truncate text-muted-foreground text-xs">{caption}</span> : null}
        </div>
        {action}
      </header>
      <LayoutGroup>
        <ol aria-label={`${title}, top ${visible}`} className="flex flex-col gap-0.5">
          <AnimatePresence initial={false} mode="popLayout">
          {top.map((e) => (
            <Row
              compact={compact}
              e={e}
              fmt={fmt}
              gain={gains[e.id]}
              isYou={e.id === youId}
              key={e.id}
              rank={rankOf(e.id)}
            />
          ))}
          </AnimatePresence>
        </ol>
        <div className="mt-1.5 border-t border-dashed pt-1.5">
          {youPinned && you ? (
            <ol aria-label="Your position">
              <Row
                ahead={ahead}
                compact={compact}
                e={you}
                fmt={fmt}
                gain={gains[you.id]}
                isYou
                pinned
                rank={youRank}
              />
            </ol>
          ) : (
            <motion.p
              animate={{ opacity: 1 }}
              className="flex h-12 items-center justify-center gap-1.5 text-muted-foreground text-xs tabular-nums"
              initial={{ opacity: 0 }}
              key={youRank}
              transition={{ duration: 0.2 }}
            >
              {you
                ? youRank === 1
                  ? behind
                    ? `You're on top, ${compact.format(you.score - behind.score)} clear of ${behind.name.split(" ")[0]}`
                    : "You're on top"
                  : `You're #${youRank} · ${compact.format((ahead?.score ?? 0) - you.score)} to pass ${ahead?.name.split(" ")[0]}`
                : `${entries.length} people ranked`}
            </motion.p>
          )}
        </div>
      </LayoutGroup>
    </section>
  );
}
