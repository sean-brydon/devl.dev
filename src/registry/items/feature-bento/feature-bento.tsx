"use client";

import { ArrowRightIcon, FileTextIcon, MessageSquareIcon, SearchIcon, SparklesIcon, ZapIcon } from "lucide-react";
import { AnimatePresence, motion, MotionConfig, useInView, useReducedMotion } from "motion/react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

function useReducedMotionSafe() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && Boolean(prefers);
}

export type FeatureDemo = "search" | "shortcuts" | "history" | "automation" | "insights";

export interface BentoFeature {
  title: string;
  description: string;
  demo: FeatureDemo;
  span?: 2 | 3 | 4 | 6;
}

export interface FeatureBentoProps {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  features: BentoFeature[];
  className?: string;
}

const ease = [0.23, 1, 0.32, 1] as const;
const spring = { type: "spring", stiffness: 380, damping: 34 } as const;
const accent = "text-violet-600 dark:text-violet-400";

const docs = [
  { title: "Q3 roadmap", meta: "Product · edited 2h ago" },
  { title: "Onboarding checklist", meta: "People · edited yesterday" },
  { title: "Pricing page rewrite", meta: "Marketing · edited Mon" },
  { title: "Roadmap review notes", meta: "Product · edited Sep 30" },
  { title: "Launch plan: Atlas", meta: "Marketing · edited Sep 28" },
  { title: "Mobile app roadmap", meta: "Engineering · edited Sep 24" },
  { title: "Launch retro, spring", meta: "Marketing · edited Jun 3" },
  { title: "Onboarding emails v2", meta: "Lifecycle · edited Aug 14" },
];
const queries = ["roadmap", "launch", "onboarding"];

function Highlight({ text, query }: { text: string; query: string }) {
  const at = query ? text.toLowerCase().indexOf(query.toLowerCase()) : -1;
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <span className={cn("rounded-sm bg-violet-500/12 font-semibold", accent)}>{text.slice(at, at + query.length)}</span>
      {text.slice(at + query.length)}
    </>
  );
}

function SearchDemo({ active }: { active: boolean }) {
  const [q, setQ] = useState(0);
  const [typed, setTyped] = useState(queries[0].length);
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let timer: number | undefined;
    const run = (index: number, count: number) => {
      if (cancelled) return;
      const word = queries[index];
      if (count <= word.length) {
        setQ(index);
        setTyped(count);
        timer = window.setTimeout(() => run(index, count + 1), count === 0 ? 260 : 55);
      } else {
        timer = window.setTimeout(() => run((index + 1) % queries.length, 0), 1500);
      }
    };
    timer = window.setTimeout(() => run((q + 1) % queries.length, 0), 350);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const query = queries[q].slice(0, typed);
  const results = docs.filter((d) => d.title.toLowerCase().includes(query.toLowerCase())).slice(0, 3);

  return (
    <div className="flex h-full flex-col p-4 sm:p-5">
      <div className="flex h-9 items-center gap-2 rounded-lg border bg-background px-3 shadow-xs/5">
        <SearchIcon className="size-3.5 text-muted-foreground" />
        <span className="font-mono text-xs">
          {query}
          <span
            className={cn(
              "ms-px inline-block h-3.5 w-px translate-y-0.5 bg-foreground",
              active ? "animate-caret-blink" : "opacity-0",
            )}
          />
        </span>
        <span className="ms-auto font-mono text-[0.625rem] text-muted-foreground tabular-nums">
          {results.length} {results.length === 1 ? "doc" : "docs"}
        </span>
      </div>
      <ul className="relative mt-2 flex-1 space-y-1">
        <AnimatePresence initial={false} mode="popLayout">
          {results.map((doc) => (
            <motion.li
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2.5 rounded-lg bg-background/60 px-2.5 py-2"
              exit={{ opacity: 0, y: -4 }}
              initial={{ opacity: 0, y: 6 }}
              key={doc.title}
              layout
              transition={{ duration: 0.22, ease }}
            >
              <FileTextIcon className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate text-xs">
                <Highlight query={query} text={doc.title} />
              </span>
              <span className="ms-auto hidden shrink-0 text-[0.625rem] text-muted-foreground sm:block">{doc.meta}</span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}

const combos = [
  { keys: ["⌘", "K"], label: "Open anything" },
  { keys: ["⌘", "⇧", "P"], label: "Publish page" },
  { keys: ["G", "I"], label: "Go to inbox" },
];

function Key({ children, down }: { children: ReactNode; down: boolean }) {
  return (
    <motion.span
      animate={{ y: down ? 2 : 0 }}
      className={cn(
        "flex size-11 items-center justify-center rounded-xl border bg-background font-medium text-base shadow-xs/5 transition-[box-shadow,border-color] duration-100",
        down ? "border-violet-500/40 shadow-none" : "border-b-[3px]",
      )}
      transition={{ duration: 0.08 }}
    >
      {children}
    </motion.span>
  );
}

function ShortcutDemo({ active }: { active: boolean }) {
  const [combo, setCombo] = useState(0);
  const [pressed, setPressed] = useState(0);
  useEffect(() => {
    if (!active) {
      setPressed(0);
      return;
    }
    let cancelled = false;
    const timers: number[] = [];
    const later = (fn: () => void, ms: number) => timers.push(window.setTimeout(() => !cancelled && fn(), ms));
    const play = (index: number) => {
      setCombo(index);
      setPressed(0);
      const n = combos[index].keys.length;
      for (let k = 1; k <= n; k++) later(() => setPressed(k), 200 + k * 170);
      later(() => setPressed(0), 200 + n * 170 + 900);
      later(() => play((index + 1) % combos.length), 200 + n * 170 + 1400);
    };
    play((combo + 1) % combos.length);
    return () => {
      cancelled = true;
      timers.forEach(window.clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const current = combos[combo];
  const fired = pressed === current.keys.length;
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-5">
      <div className="flex items-center gap-1.5">
        {current.keys.map((key, i) => (
          <Key down={pressed > i} key={`${combo}-${key}`}>
            {key}
          </Key>
        ))}
      </div>
      <div className="h-6">
        <AnimatePresence mode="wait">
          <motion.span
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className={cn(
              "inline-flex h-6 items-center rounded-full border px-2.5 text-[0.6875rem] transition-colors duration-150",
              fired ? "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300" : "bg-background text-muted-foreground",
            )}
            exit={{ opacity: 0, y: -4 }}
            initial={{ opacity: 0, y: 4, scale: 0.97 }}
            key={combo}
            transition={{ duration: 0.18, ease }}
          >
            {current.label}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
}

const versions = [
  { label: "v9", who: "Iris", when: "Sep 12", lines: [0.9, 0.6, 0.75, 0.3] },
  { label: "v10", who: "Marc", when: "Sep 19", lines: [0.9, 0.82, 0.5, 0.64] },
  { label: "v11", who: "Maya", when: "Oct 2", lines: [0.7, 0.88, 0.62, 0.8] },
  { label: "v12", who: "Iris", when: "Oct 9", lines: [0.96, 0.7, 0.86, 0.45] },
  { label: "v13", who: "You", when: "Today", lines: [0.8, 0.94, 0.58, 0.72] },
];

function HistoryDemo({ active }: { active: boolean }) {
  const [v, setV] = useState(versions.length - 1);
  useEffect(() => {
    if (!active) {
      setV(versions.length - 1);
      return;
    }
    let i = 0;
    setV(0);
    const id = window.setInterval(() => {
      i = (i + 1) % versions.length;
      setV(i);
    }, 900);
    return () => window.clearInterval(id);
  }, [active]);
  const version = versions[v];
  return (
    <div className="flex h-full flex-col justify-center gap-6 p-4 sm:p-5">
      <div className="rounded-lg border bg-background p-3 shadow-xs/5">
        <div className="mb-2.5 flex items-center justify-between text-[0.625rem] text-muted-foreground">
          <span className="font-medium font-mono text-foreground">{version.label}</span>
          <span className="tabular-nums">
            {version.who} · {version.when}
          </span>
        </div>
        <div className="space-y-1.5">
          {version.lines.map((w, i) => (
            <motion.div
              animate={{ scaleX: w }}
              className={cn("h-1.5 origin-left rounded-full", i === 0 ? "bg-foreground/70" : "bg-foreground/15")}
              initial={false}
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed rows
              key={i}
              transition={spring}
            />
          ))}
        </div>
      </div>
      <div className="relative flex items-center justify-between px-1">
        <span className="absolute inset-x-1 top-1/2 h-px -translate-y-1/2 bg-border" />
        {versions.map((item, i) => (
          <span
            className={cn("relative size-2 rounded-full transition-colors duration-200", i <= v ? "bg-foreground/60" : "bg-border")}
            key={item.label}
          />
        ))}
        <motion.span
          animate={{ x: `${(v / (versions.length - 1)) * 100}%` }}
          className="pointer-events-none absolute inset-y-0 right-2 left-2"
          initial={false}
          transition={spring}
        >
          <span className="absolute top-1/2 left-0 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-violet-500 shadow-sm" />
        </motion.span>
      </div>
    </div>
  );
}

const steps = [
  { icon: MessageSquareIcon, label: "Form reply" },
  { icon: SparklesIcon, label: "Summarise" },
  { icon: ZapIcon, label: "Post to #sales" },
];

function AutomationDemo({ active }: { active: boolean }) {
  const reduce = useReducedMotionSafe();
  const [lit, setLit] = useState(-1);
  useEffect(() => {
    if (!active) {
      setLit(-1);
      return;
    }
    let i = 0;
    setLit(0);
    const id = window.setInterval(() => {
      i = (i + 1) % (steps.length + 1);
      setLit(i === steps.length ? -1 : i);
    }, 650);
    return () => window.clearInterval(id);
  }, [active]);
  return (
    <div className="flex h-full flex-col justify-center gap-2 p-4 sm:p-5">
      {steps.map((step, i) => (
        <div className="flex flex-col items-start" key={step.label}>
          <motion.div
            animate={{ scale: lit === i && !reduce ? 1.02 : 1 }}
            className={cn(
              "flex h-9 w-full items-center gap-2.5 rounded-lg border bg-background px-3 text-xs shadow-xs/5 transition-colors duration-200",
              lit === i && "border-violet-500/40",
              lit > i && "text-muted-foreground",
            )}
            transition={{ duration: 0.18, ease }}
          >
            <span
              className={cn(
                "flex size-5 items-center justify-center rounded-md transition-colors duration-200",
                lit === i ? "bg-violet-500 text-white" : "bg-muted text-muted-foreground",
              )}
            >
              <step.icon className="size-3" />
            </span>
            {step.label}
            <span
              className={cn(
                "ms-auto size-1.5 rounded-full transition-colors duration-200",
                lit >= i ? "bg-emerald-500" : "bg-border",
              )}
            />
          </motion.div>
          {i < steps.length - 1 && (
            <span className="relative ms-[1.375rem] h-2.5 w-px overflow-hidden bg-border">
              <motion.span
                animate={{ y: lit > i ? "0%" : "-100%" }}
                className="absolute inset-0 bg-violet-500"
                initial={false}
                transition={{ duration: 0.2, ease }}
              />
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

const rest = [38, 52, 44, 66, 58, 74, 88];
const days = ["M", "T", "W", "T", "F", "S", "S"];

function InsightsDemo({ active }: { active: boolean }) {
  const [bars, setBars] = useState(rest);
  useEffect(() => {
    if (!active) {
      setBars(rest);
      return;
    }
    const shuffle = () => setBars(rest.map((b) => Math.max(18, Math.min(100, b + Math.round((Math.random() - 0.4) * 40)))));
    shuffle();
    const id = window.setInterval(shuffle, 1100);
    return () => window.clearInterval(id);
  }, [active]);
  const total = Math.round(bars.reduce((a, b) => a + b, 0) * 3.1);
  return (
    <div className="flex h-full flex-col p-4 sm:p-5">
      <div className="flex items-baseline justify-between">
        <span className="text-[0.625rem] text-muted-foreground">Readers this week</span>
        <span className="font-semibold text-sm tabular-nums">{total.toLocaleString("en-US")}</span>
      </div>
      <div className="mt-3 flex flex-1 items-end gap-1.5">
        {bars.map((h, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed days
          <div className="flex h-full flex-1 flex-col items-center justify-end gap-1.5" key={i}>
            <motion.div
              animate={{ clipPath: `inset(${100 - h}% 0% 0% 0% round 6px)` }}
              className={cn(
                "h-full w-full",
                i === 6 ? "bg-violet-500" : "bg-[color-mix(in_srgb,var(--foreground)_12%,var(--card))]",
              )}
              initial={false}
              transition={spring}
            />
            <span className="text-[0.5625rem] text-muted-foreground">{days[i]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const demos: Record<FeatureDemo, (props: { active: boolean }) => ReactNode> = {
  search: SearchDemo,
  shortcuts: ShortcutDemo,
  history: HistoryDemo,
  automation: AutomationDemo,
  insights: InsightsDemo,
};

const spans: Record<number, string> = {
  2: "md:col-span-2",
  3: "md:col-span-3",
  4: "sm:col-span-2 md:col-span-4",
  6: "sm:col-span-2 md:col-span-6",
};

function Tile({ feature, index }: { feature: BentoFeature; index: number }) {
  const reduce = useReducedMotionSafe();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.7 });
  const [hovered, setHovered] = useState(false);
  const [touch, setTouch] = useState(false);
  useEffect(() => {
    setTouch(window.matchMedia("(hover: none)").matches);
  }, []);
  const active = !reduce && (hovered || (touch && inView));
  const Demo = demos[feature.demo];

  return (
    <motion.article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border bg-card shadow-xs/5 transition-[border-color,box-shadow] duration-200",
        "hover:border-foreground/12 hover:shadow-md/5",
        spans[feature.span ?? 2],
      )}
      initial={{ opacity: 0, y: 12 }}
      onPointerEnter={(e) => e.pointerType === "mouse" && setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      ref={ref}
      transition={{ duration: 0.5, ease, delay: Math.min(index, 5) * 0.04 }}
      viewport={{ once: true, amount: 0.3 }}
      whileInView={{ opacity: 1, y: 0 }}
    >
      <div className="relative m-2 mb-0 h-48 overflow-hidden rounded-lg bg-muted/60 bg-[radial-gradient(var(--color-border)_1px,transparent_1px)] [background-size:14px_14px]">
        <Demo active={active} />
      </div>
      <div className="flex flex-1 flex-col p-5 pt-4">
        <h3 className="font-medium text-[0.9375rem]">{feature.title}</h3>
        <p className="mt-1 text-pretty text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
      </div>
    </motion.article>
  );
}

export function FeatureBento({ eyebrow, title, description, features, className }: FeatureBentoProps) {
  return (
    <MotionConfig reducedMotion="user">
      <section className={cn("mx-auto w-full max-w-[1100px]", className)}>
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            {eyebrow && <p className="font-medium text-muted-foreground text-xs uppercase tracking-widest">{eyebrow}</p>}
            <h2 className="mt-2 text-balance font-heading font-semibold text-3xl tracking-tight sm:text-4xl">{title}</h2>
          </div>
          {description && (
            <p className="max-w-sm text-pretty text-muted-foreground text-sm leading-relaxed md:text-end">
              {description}
              <span className="mt-1 hidden items-center gap-1 text-foreground/70 text-xs md:flex md:justify-end [@media(hover:none)]:hidden">
                Hover a tile to see it work <ArrowRightIcon className="size-3" />
              </span>
            </p>
          )}
        </header>
        <div className="mt-10 grid gap-3 sm:grid-cols-2 md:grid-cols-6 md:gap-4">
          {features.map((feature, i) => (
            <Tile feature={feature} index={i} key={feature.title} />
          ))}
        </div>
      </section>
    </MotionConfig>
  );
}
