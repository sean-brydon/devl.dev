"use client";

import {
  ArrowRightIcon,
  CheckIcon,
  CreditCardIcon,
  HomeIcon,
  PlayIcon,
  ReceiptIcon,
  SearchIcon,
  SettingsIcon,
  UsersIcon,
} from "lucide-react";
import { AnimatePresence, motion, MotionConfig, type MotionValue, useInView, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { type PointerEvent, type ReactNode, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function useReducedMotionSafe() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && Boolean(prefers);
}

export interface ProductShotHeroLogo {
  name: string;
  mark?: "ring" | "wedge" | "stack" | "leaf" | "spark" | "grid";
}

export interface ProductShotMatch {
  merchant: string;
  amount: string;
  card: string;
}

export interface ProductShotHeroProps {
  eyebrow?: string;
  title: ReactNode;
  titleQuiet?: ReactNode;
  description?: ReactNode;
  primaryCta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  proof?: { initials: string[]; text: ReactNode };
  logosLabel?: string;
  logos?: ProductShotHeroLogo[];
  matches?: ProductShotMatch[];
  className?: string;
}

const ease = [0.23, 1, 0.32, 1] as const;
const tiltSpring = { stiffness: 140, damping: 22, mass: 0.7 };

const avatarTones = [
  "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
];

function LogoMark({ mark = "ring" }: { mark?: ProductShotHeroLogo["mark"] }) {
  const common = { className: "size-5 shrink-0", fill: "none", viewBox: "0 0 20 20", "aria-hidden": true } as const;
  switch (mark) {
    case "wedge":
      return (
        <svg {...common}>
          <path d="M3 16 10 3l7 13H3Z" fill="currentColor" />
        </svg>
      );
    case "stack":
      return (
        <svg {...common}>
          <rect fill="currentColor" height="4" rx="2" width="14" x="3" y="3" />
          <rect fill="currentColor" height="4" opacity=".6" rx="2" width="14" x="3" y="8" />
          <rect fill="currentColor" height="4" opacity=".3" rx="2" width="14" x="3" y="13" />
        </svg>
      );
    case "leaf":
      return (
        <svg {...common}>
          <path d="M4 16C4 8 9 4 16 4c0 7-4 12-12 12Z" fill="currentColor" />
        </svg>
      );
    case "spark":
      return (
        <svg {...common}>
          <path d="M10 2c.6 4.2 3.8 7.4 8 8-4.2.6-7.4 3.8-8 8-.6-4.2-3.8-7.4-8-8 4.2-.6 7.4-3.8 8-8Z" fill="currentColor" />
        </svg>
      );
    case "grid":
      return (
        <svg {...common}>
          <circle cx="6" cy="6" fill="currentColor" r="3" />
          <circle cx="14" cy="6" fill="currentColor" opacity=".5" r="3" />
          <circle cx="6" cy="14" fill="currentColor" opacity=".5" r="3" />
          <circle cx="14" cy="14" fill="currentColor" r="3" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="3" />
        </svg>
      );
  }
}

function useDepth(px: MotionValue<number>, py: MotionValue<number>, depth: number) {
  const x = useTransform(px, (v) => v * depth);
  const y = useTransform(py, (v) => v * depth);
  return { x, y };
}

const rows = [
  { merchant: "Framewise", note: "Design · Ana P.", amount: "$45.00", tone: 0 },
  { merchant: "Norrland Air", note: "Travel · Marc D.", amount: "$612.40", tone: 2 },
  { merchant: "Cobalt Cloud", note: "Software · Team", amount: "$96.00", tone: 1 },
  { merchant: "Little Roast", note: "Meals · Iris K.", amount: "$18.75", tone: 3 },
];

const chipTones = [
  "bg-violet-500/12 text-violet-700 dark:text-violet-300",
  "bg-sky-500/12 text-sky-700 dark:text-sky-300",
  "bg-amber-500/15 text-amber-800 dark:text-amber-300",
  "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
];

function AppWindow() {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-2xl/10 ring-1 ring-black/2 dark:shadow-black/40 dark:ring-white/4">
      <div className="flex h-9 items-center gap-1.5 border-b bg-muted/50 px-3.5">
        <span className="size-2.5 rounded-full bg-foreground/12" />
        <span className="size-2.5 rounded-full bg-foreground/12" />
        <span className="size-2.5 rounded-full bg-foreground/12" />
        <span className="mx-auto flex h-5 w-40 items-center justify-center gap-1 rounded-md bg-background/80 text-[0.625rem] text-muted-foreground sm:w-52">
          <SearchIcon className="size-2.5" /> app.tallyhaus.com
        </span>
        <span className="w-10" />
      </div>
      <div className="flex">
        <aside className="hidden w-36 shrink-0 flex-col gap-0.5 border-e p-2.5 sm:flex">
          <div className="mb-2 flex items-center gap-2 px-1.5">
            <span className="flex size-5 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <LogoMark mark="stack" />
            </span>
            <span className="font-semibold text-xs">Tallyhaus</span>
          </div>
          {[
            { icon: HomeIcon, label: "Overview", active: true },
            { icon: CreditCardIcon, label: "Cards" },
            { icon: ReceiptIcon, label: "Receipts" },
            { icon: UsersIcon, label: "People" },
            { icon: SettingsIcon, label: "Settings" },
          ].map((item) => (
            <span
              className={cn(
                "flex h-7 items-center gap-2 rounded-md px-1.5 text-[0.6875rem]",
                item.active ? "bg-accent font-medium text-foreground" : "text-muted-foreground",
              )}
              key={item.label}
            >
              <item.icon className="size-3.5" />
              {item.label}
            </span>
          ))}
        </aside>
        <div className="min-w-0 flex-1 p-3.5 sm:p-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[0.625rem] text-muted-foreground">Spend this month</p>
              <p className="font-semibold text-lg tabular-nums tracking-tight sm:text-xl">$48,210.32</p>
            </div>
            <span className="rounded-full bg-emerald-500/12 px-1.5 py-0.5 font-medium text-[0.625rem] text-emerald-700 tabular-nums dark:text-emerald-300">
              −8.4% vs Sep
            </span>
          </div>
          <svg aria-hidden className="mt-2 h-20 w-full text-violet-500 dark:text-violet-400" preserveAspectRatio="none" viewBox="0 0 300 80">
            <defs>
              <linearGradient id="psh-fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="currentColor" stopOpacity=".22" />
                <stop offset="1" stopColor="currentColor" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[20, 40, 60].map((y) => (
              <line className="text-border" key={y} stroke="currentColor" strokeDasharray="2 4" x1="0" x2="300" y1={y} y2={y} />
            ))}
            <path
              d="M0 62 C 20 58, 34 50, 52 52 S 86 64, 104 54 S 138 30, 160 34 S 196 50, 214 40 S 252 16, 272 20 S 292 24, 300 22 L300 80 L0 80Z"
              fill="url(#psh-fill)"
            />
            <motion.path
              animate={{ pathLength: 1 }}
              d="M0 62 C 20 58, 34 50, 52 52 S 86 64, 104 54 S 138 30, 160 34 S 196 50, 214 40 S 252 16, 272 20 S 292 24, 300 22"
              fill="none"
              initial={{ pathLength: 0 }}
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="2"
              transition={{ duration: 1.4, ease, delay: 0.5 }}
            />
          </svg>
          <ul className="mt-3 divide-y rounded-xl border">
            {rows.map((row) => (
              <li className="flex items-center gap-2.5 px-2.5 py-2" key={row.merchant}>
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-md font-semibold text-[0.625rem]",
                    chipTones[row.tone],
                  )}
                >
                  {row.merchant[0]}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-[0.6875rem]">{row.merchant}</span>
                  <span className="block truncate text-[0.625rem] text-muted-foreground">{row.note}</span>
                </span>
                <span className="font-medium font-mono text-[0.6875rem] tabular-nums">{row.amount}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function MatchCard({ matches }: { matches: ProductShotMatch[] }) {
  const reduce = useReducedMotionSafe();
  const [index, setIndex] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref);
  useEffect(() => {
    if (reduce || !inView || matches.length < 2) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % matches.length), 3600);
    return () => window.clearInterval(id);
  }, [reduce, inView, matches.length]);
  const match = matches[index];
  if (!match) return null;
  return (
    <div ref={ref} className="w-52 overflow-hidden rounded-xl border bg-popover p-3 shadow-xl/10 sm:w-60 dark:shadow-black/40">
      <div className="flex items-center gap-2">
        <span className="flex size-5 items-center justify-center rounded-full bg-emerald-500 text-white">
          <CheckIcon className="size-3" strokeWidth={3} />
        </span>
        <span className="font-medium text-xs">Receipt matched</span>
        <span className="ms-auto text-[0.625rem] text-muted-foreground">now</span>
      </div>
      <div className="relative mt-2 h-8">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.div
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            className="absolute inset-0 flex items-center justify-between gap-2 rounded-lg bg-muted px-2.5"
            exit={{ opacity: 0, y: -8, filter: "blur(2px)" }}
            initial={{ opacity: 0, y: 8, filter: "blur(2px)" }}
            key={match.merchant}
            transition={{ duration: 0.32, ease }}
          >
            <span className="truncate text-[0.6875rem]">
              {match.merchant} <span className="text-muted-foreground">· {match.card}</span>
            </span>
            <span className="font-medium font-mono text-[0.6875rem] tabular-nums">{match.amount}</span>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function BudgetCard() {
  return (
    <div className="w-48 rounded-xl border bg-popover p-3 shadow-xl/10 sm:w-52 dark:shadow-black/40">
      <div className="flex items-baseline justify-between">
        <span className="font-medium text-xs">Marketing budget</span>
        <span className="font-mono text-[0.625rem] text-muted-foreground tabular-nums">72%</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <motion.div
          animate={{ scaleX: 0.72 }}
          className="h-full origin-left rounded-full bg-violet-500 dark:bg-violet-400"
          initial={{ scaleX: 0 }}
          transition={{ duration: 1, ease, delay: 0.9 }}
        />
      </div>
      <p className="mt-2 text-[0.625rem] text-muted-foreground tabular-nums">$14,400 of $20,000 · 9 days to go</p>
    </div>
  );
}

export function ProductShotHero({
  eyebrow,
  title,
  titleQuiet,
  description,
  primaryCta,
  secondaryCta,
  proof,
  logosLabel = "Trusted by finance teams at",
  logos = [],
  matches = [],
  className,
}: ProductShotHeroProps) {
  const reduce = useReducedMotionSafe();
  const stageRef = useRef<HTMLDivElement>(null);
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, tiltSpring);
  const sy = useSpring(py, tiltSpring);
  const [compact, setCompact] = useState(false);
  const baseY = compact ? -9 : -16;
  const baseX = compact ? 6 : 10;
  const rotateY = useTransform(sx, (v) => baseY + v * 8);
  const rotateX = useTransform(sy, (v) => baseX - v * 6);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setCompact(entry.contentRect.width < 480));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const back = useDepth(sx, sy, -10);
  const mid = useDepth(sx, sy, 14);
  const front = useDepth(sx, sy, 26);

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    if (reduce || event.pointerType !== "mouse" || !stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    px.set(Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width) * 2 - 1)));
    py.set(Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height) * 2 - 1)));
  };
  const onPointerLeave = () => {
    px.set(0);
    py.set(0);
  };

  const rise = (delay: number) => ({
    initial: { opacity: 0, y: 12, filter: "blur(6px)" },
    animate: { opacity: 1, y: 0, filter: "blur(0px)" },
    transition: { duration: 0.6, ease, delay },
  });

  return (
    <MotionConfig reducedMotion="user">
      <section
        className={cn("mx-auto w-full max-w-[1100px]", className)}
        onPointerLeave={onPointerLeave}
        onPointerMove={onPointerMove}
      >
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-8">
          <div className="flex flex-col items-start">
            {eyebrow && (
              <motion.p
                {...rise(0)}
                className="inline-flex items-center gap-2 rounded-full border bg-background px-2.5 py-1 font-medium text-muted-foreground text-xs shadow-xs/5"
              >
                <span className="size-1.5 rounded-full bg-violet-500 dark:bg-violet-400" />
                {eyebrow}
              </motion.p>
            )}
            <motion.h1
              {...rise(0.06)}
              className="mt-5 text-balance font-heading font-semibold text-[2.5rem] leading-[1.05] tracking-[-0.035em] sm:text-5xl lg:text-[3.5rem]"
            >
              {title} {titleQuiet && <span className="text-muted-foreground">{titleQuiet}</span>}
            </motion.h1>
            {description && (
              <motion.p
                {...rise(0.12)}
                className="mt-5 max-w-[27rem] text-pretty text-base text-muted-foreground leading-relaxed sm:text-lg"
              >
                {description}
              </motion.p>
            )}
            {(primaryCta || secondaryCta) && (
              <motion.div {...rise(0.18)} className="mt-8 flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row sm:gap-3">
                {primaryCta && (
                  <Button
                    className="group transition-[box-shadow,translate,scale,rotate] duration-150 ease-out active:scale-[0.97] sm:px-5"
                    render={<a href={primaryCta.href} />}
                    size="xl"
                  >
                    {primaryCta.label}
                    <ArrowRightIcon className="transition-transform duration-200 ease-out group-hover:translate-x-0.5" />
                  </Button>
                )}
                {secondaryCta && (
                  <Button
                    className="transition-[box-shadow,translate,scale,rotate] duration-150 ease-out active:scale-[0.97] sm:ps-2 sm:pe-4"
                    render={<a href={secondaryCta.href} />}
                    size="xl"
                    variant="ghost"
                  >
                    <span className="flex size-7 items-center justify-center rounded-full border bg-background shadow-xs/5">
                      <PlayIcon className="ms-px size-3 fill-current" />
                    </span>
                    {secondaryCta.label}
                  </Button>
                )}
              </motion.div>
            )}
            {proof && (
              <motion.div {...rise(0.24)} className="mt-8 flex items-center gap-3">
                <div className="flex -space-x-1.5">
                  {proof.initials.map((initials, i) => (
                    <span
                      className={cn(
                        "flex size-8 items-center justify-center rounded-full font-semibold text-[0.625rem] tracking-tight ring-2 ring-background",
                        avatarTones[i % avatarTones.length],
                      )}
                      key={initials}
                    >
                      {initials}
                    </span>
                  ))}
                </div>
                <p className="text-muted-foreground text-xs leading-snug">{proof.text}</p>
              </motion.div>
            )}
          </div>

          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="relative mx-auto w-full max-w-[540px] pt-8 pb-14 [perspective:1400px] sm:py-10"
            initial={{ opacity: 0, y: 28 }}
            ref={stageRef}
            transition={{ duration: 0.9, ease, delay: 0.15 }}
          >
            <motion.div
              className="relative [transform-style:preserve-3d]"
              style={reduce ? { rotateY: baseY, rotateX: baseX } : { rotateY, rotateX }}
            >
              <motion.div
                aria-hidden
                className="absolute inset-x-8 -bottom-6 h-16 rounded-[50%] bg-foreground/10 blur-2xl dark:bg-black/50"
                style={{ translateZ: -40 }}
              />
              <motion.div style={reduce ? undefined : back}>
                <AppWindow />
              </motion.div>
              {matches.length > 0 && (
                <motion.div
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute -top-7 right-1 sm:-top-6 sm:-right-4"
                  initial={{ opacity: 0, scale: 0.95 }}
                  style={{ ...(reduce ? {} : mid), translateZ: compact ? 30 : 60 }}
                  transition={{ duration: 0.5, ease, delay: 0.7 }}
                >
                  <MatchCard matches={matches} />
                </motion.div>
              )}
              <motion.div
                animate={{ opacity: 1, scale: 1 }}
                className="absolute -bottom-12 left-1 sm:-bottom-8 sm:-left-10"
                initial={{ opacity: 0, scale: 0.95 }}
                style={{ ...(reduce ? {} : front), translateZ: compact ? 50 : 110 }}
                transition={{ duration: 0.5, ease, delay: 0.85 }}
              >
                <BudgetCard />
              </motion.div>
            </motion.div>
          </motion.div>
        </div>

        {logos.length > 0 && (
          <div className="mt-16 border-t pt-8 sm:mt-20">
            <p className="text-center text-muted-foreground text-xs">{logosLabel}</p>
            <ul className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 lg:grid-cols-6">
              {logos.map((logo, i) => (
                <li
                  className={cn(
                    "flex items-center justify-center gap-2 text-muted-foreground/80",
                    i % 3 === 1 ? "font-semibold tracking-tight" : i % 3 === 2 ? "font-medium tracking-wide uppercase text-xs" : "font-semibold",
                  )}
                  key={logo.name}
                >
                  <LogoMark mark={logo.mark} />
                  <span className={cn(i % 3 === 2 ? "text-xs" : "text-[0.9375rem]")}>{logo.name}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </MotionConfig>
  );
}
