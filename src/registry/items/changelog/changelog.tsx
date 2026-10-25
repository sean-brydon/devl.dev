"use client";

import { ArrowDownIcon, CheckIcon, CloudIcon, CommandIcon, FileTextIcon, RssIcon, SearchIcon } from "lucide-react";
import { AnimatePresence, motion, MotionConfig, useReducedMotion } from "motion/react";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function useReducedMotionSafe() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && Boolean(prefers);
}

export type ChangeType = "new" | "improved" | "fixed";
export type ReleaseMedia = "palette" | "chart" | "editor" | "offline";

export interface Release {
  version: string;
  date: string;
  title: string;
  summary?: string;
  media?: ReleaseMedia;
  changes: { type: ChangeType; text: string }[];
}

export interface ChangelogProps {
  eyebrow?: string;
  title?: ReactNode;
  description?: ReactNode;
  releases: Release[];
  pageSize?: number;
  rssHref?: string;
  endNote?: string;
  className?: string;
}

const ease = [0.23, 1, 0.32, 1] as const;

const typeStyle: Record<ChangeType, { label: string; chip: string; dot: string }> = {
  new: { label: "New", chip: "bg-info/10 text-info-foreground", dot: "bg-info" },
  improved: { label: "Improved", chip: "bg-success/10 text-success-foreground", dot: "bg-success" },
  fixed: { label: "Fixed", chip: "bg-warning/12 text-warning-foreground", dot: "bg-warning" },
};

function MediaFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative mt-5 flex h-48 items-center justify-center overflow-hidden rounded-xl border bg-muted/50 sm:h-56">
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(60%_70%_at_50%_50%,black,transparent)]"
      />
      <div className="relative w-full px-6">{children}</div>
    </div>
  );
}

function PaletteMedia() {
  return (
    <MediaFrame>
      <div className="mx-auto max-w-sm overflow-hidden rounded-xl border bg-popover shadow-lg/5">
        <div className="flex items-center gap-2 border-b px-3 py-2.5 text-xs">
          <SearchIcon className="size-3.5 text-muted-foreground" />
          <span>move to</span>
          <span className="ms-auto flex items-center gap-0.5 rounded border bg-muted px-1 font-mono text-[0.625rem] text-muted-foreground">
            <CommandIcon className="size-2.5" />K
          </span>
        </div>
        {["Move to… Product / Roadmaps", "Move to… Marketing / Launches", "Move to… Archive"].map((row, i) => (
          <div className={cn("flex items-center gap-2 px-3 py-2 text-xs", i === 0 && "bg-accent")} key={row}>
            <FileTextIcon className="size-3.5 text-muted-foreground" />
            <span className="truncate">{row}</span>
            {i === 0 && <span className="ms-auto text-[0.625rem] text-muted-foreground">↵</span>}
          </div>
        ))}
      </div>
    </MediaFrame>
  );
}

function ChartMedia() {
  const bars = [32, 44, 38, 56, 50, 68, 62, 80, 74, 92];
  return (
    <MediaFrame>
      <div className="mx-auto max-w-sm rounded-xl border bg-popover p-4 shadow-lg/5">
        <div className="flex items-baseline justify-between">
          <span className="text-[0.6875rem] text-muted-foreground">Page reads, last 10 weeks</span>
          <span className="font-semibold text-sm tabular-nums">18,204</span>
        </div>
        <div className="mt-3 flex h-20 items-end gap-1.5">
          {bars.map((h, i) => (
            <div
              className={cn("flex-1 rounded-[3px]", i === bars.length - 1 ? "bg-foreground/80" : "bg-foreground/12")}
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed chart
              key={i}
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>
    </MediaFrame>
  );
}

function EditorMedia() {
  return (
    <MediaFrame>
      <div className="relative mx-auto max-w-sm">
        <div className="rounded-xl border bg-popover p-4 shadow-lg/5">
          <div className="h-2 w-2/5 rounded-full bg-foreground/60" />
          <div className="mt-3 space-y-1.5">
            <div className="h-1.5 w-full rounded-full bg-foreground/10" />
            <div className="relative h-1.5 w-11/12 rounded-full bg-warning/50" />
            <div className="h-1.5 w-4/5 rounded-full bg-foreground/10" />
            <div className="h-1.5 w-3/5 rounded-full bg-foreground/10" />
          </div>
        </div>
        <div className="absolute -right-2 -bottom-6 w-44 rounded-lg border bg-popover p-2.5 shadow-lg/5 sm:-right-6">
          <div className="flex items-center gap-1.5">
            <span className="flex size-4 items-center justify-center rounded-full bg-amber-100 font-semibold text-[0.5rem] text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              IK
            </span>
            <span className="font-medium text-[0.625rem]">Iris K.</span>
          </div>
          <p className="mt-1 text-[0.625rem] text-muted-foreground leading-snug">Can we tighten this paragraph before Friday?</p>
        </div>
      </div>
    </MediaFrame>
  );
}

function OfflineMedia() {
  return (
    <MediaFrame>
      <div className="mx-auto flex max-w-sm items-center justify-center gap-4">
        <div className="flex flex-col items-center gap-2">
          <span className="flex size-12 items-center justify-center rounded-2xl border bg-popover shadow-lg/5">
            <FileTextIcon className="size-5 text-muted-foreground" />
          </span>
          <span className="text-[0.625rem] text-muted-foreground">On device</span>
        </div>
        <div className="flex items-center gap-1" aria-hidden>
          {[0, 1, 2, 3, 4].map((i) => (
            <span className="size-1 rounded-full bg-foreground/25" key={i} />
          ))}
        </div>
        <div className="flex flex-col items-center gap-2">
          <span className="relative flex size-12 items-center justify-center rounded-2xl border bg-popover shadow-lg/5">
            <CloudIcon className="size-5 text-muted-foreground" />
            <span className="absolute -right-1 -bottom-1 flex size-4 items-center justify-center rounded-full bg-success text-white ring-2 ring-popover">
              <CheckIcon className="size-2.5" strokeWidth={3} />
            </span>
          </span>
          <span className="text-[0.625rem] text-muted-foreground">Synced 2s ago</span>
        </div>
      </div>
    </MediaFrame>
  );
}

const media: Record<ReleaseMedia, () => ReactNode> = {
  palette: PaletteMedia,
  chart: ChartMedia,
  editor: EditorMedia,
  offline: OfflineMedia,
};

function slug(version: string) {
  return `release-${version.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
}

export function Changelog({
  eyebrow = "Changelog",
  title = "What's new",
  description,
  releases,
  pageSize = 3,
  rssHref,
  endNote,
  className,
}: ChangelogProps) {
  const reduce = useReducedMotionSafe();
  const filterId = useId();
  const [filter, setFilter] = useState<ChangeType | "all">("all");
  const [shown, setShown] = useState(pageSize);
  const [loading, setLoading] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const filtered = releases
    .map((r) => ({ ...r, changes: filter === "all" ? r.changes : r.changes.filter((c) => c.type === filter) }))
    .filter((r) => r.changes.length > 0);
  const visible = filtered.slice(0, shown);
  const remaining = filtered.length - visible.length;
  const count = (t: ChangeType | "all") =>
    releases.reduce((n, r) => n + (t === "all" ? r.changes.length : r.changes.filter((c) => c.type === t).length), 0);

  const loadMore = () => {
    setLoading(true);
    timer.current = window.setTimeout(() => {
      setShown((s) => s + pageSize);
      setLoading(false);
    }, 650);
  };

  const filters: (ChangeType | "all")[] = ["all", "new", "improved", "fixed"];

  return (
    <MotionConfig reducedMotion="user">
      <section className={cn("mx-auto w-full max-w-[1100px]", className)}>
        <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            {eyebrow && <p className="font-medium text-muted-foreground text-xs uppercase tracking-widest">{eyebrow}</p>}
            <h2 className="mt-2 text-balance font-heading font-semibold text-3xl tracking-tight sm:text-4xl">{title}</h2>
            {description && <p className="mt-3 text-pretty text-muted-foreground text-sm leading-relaxed">{description}</p>}
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div aria-label="Filter changes" className="flex rounded-full border bg-muted p-0.5" role="radiogroup">
              {filters.map((f) => {
                const on = filter === f;
                return (
                  <button
                    aria-checked={on}
                    className={cn(
                      "relative flex h-7 cursor-pointer items-center gap-1.5 rounded-full px-2.5 font-medium text-xs outline-none after:absolute after:inset-x-0 after:-inset-y-[3px] after:content-[''] transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring",
                      on ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                    )}
                    key={f}
                    onClick={() => {
                      setFilter(f);
                      setShown(pageSize);
                    }}
                    role="radio"
                    type="button"
                  >
                    {on && (
                      <motion.span
                        className="absolute inset-0 rounded-full bg-background shadow-xs/5 dark:bg-input"
                        layoutId={filterId}
                        transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 40 }}
                      />
                    )}
                    {f !== "all" && <span className={cn("relative size-1.5 rounded-full", typeStyle[f].dot)} />}
                    <span className="relative">{f === "all" ? "All" : typeStyle[f].label}</span>
                    <span className="relative font-mono text-[0.625rem] text-muted-foreground tabular-nums">{count(f)}</span>
                  </button>
                );
              })}
            </div>
            {rssHref && (
              <a
                aria-label="RSS feed"
                className="flex h-8 items-center justify-center gap-1.5 rounded-full text-muted-foreground text-xs outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring max-sm:w-8 sm:px-2"
                href={rssHref}
              >
                <RssIcon className="size-3.5" />
                <span aria-hidden className="max-sm:hidden">
                  RSS
                </span>
              </a>
            )}
          </div>
        </header>

        <ol className="mt-12 sm:mt-14">
          <AnimatePresence initial={false} mode="popLayout">
            {visible.map((release, i) => {
              const Media = release.media ? media[release.media] : null;
              const latest = release.version === releases[0]?.version;
              return (
                <motion.li
                  animate={{ opacity: 1, y: 0 }}
                  className="group/release relative grid gap-3 md:grid-cols-[11rem_minmax(0,1fr)] md:gap-10"
                  exit={{ opacity: 0 }}
                  id={slug(release.version)}
                  initial={{ opacity: 0, y: 12 }}
                  key={release.version}
                  layout="position"
                  transition={{ duration: 0.4, ease, delay: i >= shown - pageSize && i > 0 ? (i % pageSize) * 0.06 : 0 }}
                >
                  <div className="md:sticky md:top-8 md:self-start md:pt-1">
                    <div className="flex items-center gap-2 md:flex-col md:items-start md:gap-2.5">
                      <a
                        className="rounded-md border bg-background px-2 py-0.5 font-medium font-mono text-xs shadow-xs/5 outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                        href={`#${slug(release.version)}`}
                      >
                        {release.version}
                      </a>
                      <time className="text-muted-foreground text-xs tabular-nums">{release.date}</time>
                      {latest && (
                        <span className="rounded-full bg-primary px-2 py-0.5 font-medium text-[0.625rem] text-primary-foreground">
                          Latest
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="relative pb-14 md:border-l md:ps-10">
                    <span
                      aria-hidden
                      className={cn(
                        "absolute top-2 -left-[5px] hidden size-[9px] rounded-full ring-4 ring-background md:block",
                        latest ? "bg-foreground" : "bg-foreground/25",
                      )}
                    />
                    <h3 className="text-balance font-heading font-semibold text-xl tracking-tight">{release.title}</h3>
                    {release.summary && (
                      <p className="mt-2 max-w-prose text-pretty text-muted-foreground text-sm leading-relaxed">{release.summary}</p>
                    )}
                    {Media && filter === "all" && <Media />}
                    <ul className="mt-5 space-y-2.5">
                      {release.changes.map((change) => (
                        <li className="flex items-start gap-3 text-sm" key={change.text}>
                          <span
                            className={cn(
                              "mt-px w-[4.75rem] shrink-0 rounded-full px-2 py-0.5 text-center font-medium text-[0.6875rem]",
                              typeStyle[change.type].chip,
                            )}
                          >
                            {typeStyle[change.type].label}
                          </span>
                          <span className="text-pretty leading-relaxed">{change.text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ol>

        <div className="flex justify-center md:ps-[16rem] md:justify-start">
          {remaining > 0 ? (
            <Button
              className="transition-[box-shadow,translate,scale,rotate] duration-150 ease-out active:scale-[0.97]"
              loading={loading}
              onClick={loadMore}
              variant="outline"
            >
              <ArrowDownIcon />
              Load older releases
              <span className="font-mono text-muted-foreground text-xs tabular-nums">{remaining}</span>
            </Button>
          ) : (
            <p className="text-muted-foreground text-xs">{endNote ?? "You've reached the beginning."}</p>
          )}
        </div>
      </section>
    </MotionConfig>
  );
}
