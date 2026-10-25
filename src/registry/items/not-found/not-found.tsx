"use client";

import { ArrowRightIcon, CheckIcon, CornerDownLeftIcon, FlagIcon, HouseIcon, type LucideIcon, SearchIcon } from "lucide-react";
import { AnimatePresence, type MotionValue, motion, useReducedMotion, useSpring, useTransform } from "motion/react";
import { type KeyboardEvent, type PointerEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { cn } from "@/lib/utils";

export interface NotFoundPage {
  title: string;
  href: string;
  section?: string;
}

export interface NotFoundLink {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
}

export interface NotFoundProps {
  path?: string;
  pages?: NotFoundPage[];
  popular?: NotFoundLink[];
  homeHref?: string;
  onNavigate?: (href: string) => void;
  onReport?: (path: string) => void;
  className?: string;
}

const ease = [0.23, 1, 0.32, 1] as const;
const press = "transition-[box-shadow,scale,background-color] duration-150 active:scale-[0.97]";

function distance(a: string, b: string) {
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

function Highlight({ text, query }: { text: string; query: string }) {
  const i = query ? text.toLowerCase().indexOf(query.toLowerCase()) : -1;
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded-[3px] bg-warning/25 text-foreground">{text.slice(i, i + query.length)}</mark>
      {text.slice(i + query.length)}
    </>
  );
}

function Compass({ angle }: { angle: MotionValue<number> }) {
  const rotate = useTransform(angle, (a) => `rotate(${a}deg)`);
  const ticks = Array.from({ length: 36 }, (_, i) => i * 10);
  return (
    <svg aria-hidden className="size-full overflow-visible" viewBox="0 0 200 200">
      <circle className="fill-card stroke-border" cx="100" cy="100" r="92" strokeWidth="1.5" />
      <circle className="fill-muted stroke-border" cx="100" cy="100" r="74" strokeWidth="1" />
      {ticks.map((t) => (
        <line
          className={t % 90 === 0 ? "stroke-foreground/50" : "stroke-foreground/15"}
          key={t}
          strokeLinecap="round"
          strokeWidth={t % 90 === 0 ? 2 : 1.25}
          transform={`rotate(${t} 100 100)`}
          x1="100"
          x2="100"
          y1="12"
          y2={t % 90 === 0 ? 22 : 18}
        />
      ))}
      {[
        ["N", 100, 42],
        ["E", 158, 104],
        ["S", 100, 166],
        ["W", 42, 104],
      ].map(([l, x, y]) => (
        <text
          className={cn("font-medium font-mono text-[11px]", l === "N" ? "fill-rose-600 dark:fill-rose-400" : "fill-muted-foreground")}
          key={l as string}
          textAnchor="middle"
          x={x}
          y={y}
        >
          {l}
        </text>
      ))}
      <motion.g style={{ transform: rotate, transformOrigin: "100px 100px" }}>
        <path className="fill-rose-500" d="M100 48 L109 100 L91 100 Z" />
        <path className="fill-foreground/25" d="M100 152 L109 100 L91 100 Z" />
      </motion.g>
      <circle className="fill-card stroke-foreground/30" cx="100" cy="100" r="6" strokeWidth="1.5" />
      <circle className="fill-foreground/50" cx="100" cy="100" r="2" />
    </svg>
  );
}

export function NotFound({
  path = "/docs/webhooks/retires",
  pages = [],
  popular = [],
  homeHref = "/",
  onNavigate,
  onReport,
  className,
}: NotFoundProps) {
  const reduce = useReducedMotion();
  const uid = useId();
  const dialRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [reported, setReported] = useState(false);
  const [aim, setAim] = useState<"wander" | "pointer" | "search">("wander");
  const angle = useSpring(38, { stiffness: 90, damping: 9, mass: 0.8 });

  const suggestion = useMemo(() => {
    let best: NotFoundPage | undefined;
    let score = Number.POSITIVE_INFINITY;
    for (const p of pages) {
      const d = distance(path.toLowerCase(), p.href.toLowerCase());
      if (d < score) {
        score = d;
        best = p;
      }
    }
    return best && score <= Math.max(3, Math.round(path.length * 0.2)) ? best : undefined;
  }, [pages, path]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return pages
      .filter((p) => `${p.title} ${p.section ?? ""} ${p.href}`.toLowerCase().includes(q))
      .slice(0, 5);
  }, [pages, query]);

  useEffect(() => {
    if (reduce || aim !== "wander") return;
    const headings = [38, -24, 112, 64, 196, 10, -70];
    let i = 0;
    const t = setInterval(() => {
      i = (i + 1) % headings.length;
      angle.set(headings[i]);
    }, 2200);
    return () => clearInterval(t);
  }, [aim, angle, reduce]);

  const pointTo = (x: number, y: number) => {
    const dial = dialRef.current?.getBoundingClientRect();
    if (!dial) return;
    const deg = (Math.atan2(y - (dial.top + dial.height / 2), x - (dial.left + dial.width / 2)) * 180) / Math.PI + 90;
    const current = angle.get();
    const delta = ((((deg - current) % 360) + 540) % 360) - 180;
    angle.set(current + delta);
  };

  useEffect(() => {
    if (reduce || aim !== "search") return;
    const box = inputRef.current?.getBoundingClientRect();
    if (box) pointTo(box.left + 24, box.top + box.height / 2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aim, reduce]);

  const onPointerMove = (e: PointerEvent) => {
    if (reduce || e.pointerType !== "mouse" || aim === "search") return;
    setAim("pointer");
    pointTo(e.clientX, e.clientY);
  };

  const go = (href: string) => onNavigate?.(href);

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!results.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(results[active].href);
    }
  };

  return (
    <section
      className={cn("mx-auto w-full max-w-[1000px] overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-xs/5", className)}
      onPointerLeave={() => aim === "pointer" && setAim("wander")}
      onPointerMove={onPointerMove}
    >
      <div className="grid items-center gap-8 px-5 pt-8 pb-8 sm:px-10 sm:pt-12 md:grid-cols-[260px_1fr] md:gap-12">
        <div className="relative mx-auto w-44 sm:w-52 md:w-full" ref={dialRef}>
          <div aria-hidden className="absolute inset-6 -z-0 rounded-full bg-rose-500/10 blur-2xl" />
          <div className="relative">
            <Compass angle={angle} />
          </div>
        </div>

        <div className="min-w-0">
          <p className="font-medium font-mono text-muted-foreground text-xs tracking-wide">ERROR 404</p>
          <h2 className="mt-2 text-balance font-semibold text-3xl tracking-tight sm:text-4xl">This page wandered off</h2>
          <p className="mt-3 max-w-[52ch] text-pretty text-muted-foreground text-sm sm:text-base">
            We couldn’t find{" "}
            <code className="break-all rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.8125rem] text-foreground">{path}</code>. It may
            have moved, or the link has a typo.
          </p>
          {suggestion && (
            <button
              className="group mt-4 inline-flex max-w-full cursor-pointer items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-left text-sm outline-none transition-[background-color,scale] duration-150 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]"
              onClick={() => go(suggestion.href)}
              type="button"
            >
              <span className="shrink-0 text-muted-foreground">Did you mean</span>
              <span className="min-w-0 font-medium font-mono text-[0.8125rem] [overflow-wrap:anywhere]">
                {suggestion.href.split("/").map((part, i) => (
                  <span key={i}>
                    {i > 0 && "/"}
                    {i > 0 && <wbr />}
                    {part}
                  </span>
                ))}
              </span>
              <ArrowRightIcon className="size-3.5 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5" />
            </button>
          )}

          <div className="relative mt-6">
            <label className="sr-only" htmlFor={`${uid}-q`}>
              Search the site
            </label>
            <InputGroup className="h-10 sm:h-10">
              <InputGroupAddon>
                <SearchIcon />
              </InputGroupAddon>
              <InputGroupInput
                aria-activedescendant={results.length ? `${uid}-r${active}` : undefined}
                aria-autocomplete="list"
                aria-controls={`${uid}-list`}
                aria-expanded={results.length > 0}
                autoComplete="off"
                id={`${uid}-q`}
                onBlur={() => setAim("wander")}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                onFocus={() => setAim("search")}
                onKeyDown={onKeyDown}
                placeholder="Search the docs"
                ref={inputRef}
                role="combobox"
                size="lg"
                value={query}
              />
              {results.length > 0 && (
                <InputGroupAddon align="inline-end">
                  <span className="hidden items-center gap-1 whitespace-nowrap text-muted-foreground text-xs sm:flex">
                    <CornerDownLeftIcon className="size-3" />
                    to open
                  </span>
                </InputGroupAddon>
              )}
            </InputGroup>
            <AnimatePresence initial={false}>
              {query.trim() && (
                <motion.div
                  animate={{ height: "auto", opacity: 1 }}
                  className="overflow-hidden"
                  exit={{ height: 0, opacity: 0 }}
                  initial={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease }}
                >
                  <ul className="mt-2 rounded-xl border bg-popover p-1 shadow-xs/5" id={`${uid}-list`} role="listbox">
                    {results.map((r, i) => (
                      <li
                        aria-selected={i === active}
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-sm",
                          i === active ? "bg-accent" : "hover:bg-accent/60",
                        )}
                        id={`${uid}-r${i}`}
                        key={r.href}
                        onClick={() => go(r.href)}
                        onMouseEnter={() => setActive(i)}
                        role="option"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">
                            <Highlight query={query.trim()} text={r.title} />
                          </span>
                          <span className="block truncate font-mono text-muted-foreground text-xs">{r.href}</span>
                        </span>
                        {r.section && <span className="shrink-0 text-muted-foreground text-xs">{r.section}</span>}
                      </li>
                    ))}
                    {!results.length && (
                      <li className="px-2.5 py-3 text-muted-foreground text-sm" role="presentation">
                        Nothing matches “{query.trim()}”. Try “billing” or “webhooks”.
                      </li>
                    )}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Button className={press} onClick={() => go(homeHref)}>
              <HouseIcon />
              Back to home
            </Button>
            <Button
              className={cn("text-muted-foreground", press)}
              disabled={reported}
              onClick={() => {
                setReported(true);
                onReport?.(path);
              }}
              variant="ghost"
            >
              <AnimatePresence initial={false} mode="popLayout">
                <motion.span
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2"
                  exit={{ opacity: 0, y: -6 }}
                  initial={{ opacity: 0, y: 6 }}
                  key={reported ? "done" : "idle"}
                  transition={{ duration: 0.16, ease }}
                >
                  {reported ? <CheckIcon className="text-success-foreground" /> : <FlagIcon />}
                  {reported ? "Thanks, we’ll fix it" : "Report broken link"}
                </motion.span>
              </AnimatePresence>
            </Button>
          </div>
        </div>
      </div>

      {popular.length > 0 && (
        <div className="border-t bg-muted/40 px-5 py-6 sm:px-10">
          <h3 className="font-medium text-muted-foreground text-xs">Popular right now</h3>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {popular.map((l) => (
              <li key={l.href}>
                <button
                  className="group flex h-full w-full cursor-pointer items-start gap-3 rounded-xl border bg-card p-3 text-left shadow-xs/5 outline-none transition-[border-color,scale,box-shadow] duration-150 hover:border-foreground/15 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]"
                  onClick={() => go(l.href)}
                  type="button"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                    <l.icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1 font-medium text-sm">
                      {l.title}
                      <ArrowRightIcon className="size-3.5 -translate-x-1 text-muted-foreground opacity-0 transition-[opacity,translate] duration-200 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100" />
                    </span>
                    <span className="mt-0.5 block text-pretty text-muted-foreground text-xs">{l.description}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
