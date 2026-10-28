"use client";

import {
  CheckIcon,
  ChevronRightIcon,
  LogOutIcon,
  type LucideIcon,
  MonitorIcon,
  MoonIcon,
  SunIcon,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import { Kbd } from "@/components/ui/kbd";
import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control";
import { cn } from "@/lib/utils";

export type ThemeChoice = "light" | "dark" | "system";

export interface AccountCardItem {
  id: string;
  label: string;
  icon: LucideIcon;
  shortcut?: string;
  meta?: string;
}

export interface AccountCardStep {
  id: string;
  label: string;
  done?: boolean;
}

export interface AccountCardProps {
  user: { name: string; email: string; initials: string; plan?: string };
  items: AccountCardItem[];
  steps?: AccountCardStep[];
  theme?: ThemeChoice;
  onThemeChange?: (theme: ThemeChoice) => void;
  onSelect?: (id: string) => void;
  onSignOut?: () => void;
  className?: string;
}

const spring = { type: "spring", stiffness: 420, damping: 34 } as const;

function Rolling({ value }: { value: number }) {
  const reduce = useReducedMotion();
  const prev = useRef(value);
  const dir = value >= prev.current ? 1 : -1;
  useEffect(() => {
    prev.current = value;
  }, [value]);
  return (
    <span className="relative inline-flex overflow-hidden tabular-nums">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          animate={{ y: 0, opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { y: `${-dir * 100}%`, opacity: 0 }}
          initial={reduce ? { opacity: 0 } : { y: `${dir * 100}%`, opacity: 0 }}
          key={value}
          transition={spring}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

const THEMES: { value: ThemeChoice; icon: LucideIcon; label: string }[] = [
  { value: "light", icon: SunIcon, label: "Light" },
  { value: "dark", icon: MoonIcon, label: "Dark" },
  { value: "system", icon: MonitorIcon, label: "System" },
];

function ThemeSwitch({ value, onChange }: { value: ThemeChoice; onChange: (t: ThemeChoice) => void }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const index = THEMES.findIndex((t) => t.value === value);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = (index + (e.key === "ArrowRight" ? 1 : -1) + THEMES.length) % THEMES.length;
    onChange(THEMES[next].value);
    refs.current[next]?.focus();
  };

  return (
    <SegmentedControl aria-label="Theme" onKeyDown={onKeyDown} role="radiogroup">
      {THEMES.map((t, i) => {
        const active = t.value === value;
        const Icon = t.icon;
        return (
          <SegmentedControlItem
            aria-checked={active}
            aria-label={t.label}
            className="w-8 px-0"
            data-checked={active ? "" : undefined}
            key={t.value}
            onClick={() => onChange(t.value)}
            ref={(el: HTMLButtonElement | null) => {
              refs.current[i] = el;
            }}
            role="radio"
            tabIndex={active ? 0 : -1}
            title={t.label}
          >
            <Icon className="size-3.5" />
          </SegmentedControlItem>
        );
      })}
    </SegmentedControl>
  );
}

export function AccountCard({
  user,
  items,
  steps: initialSteps = [],
  theme: themeProp,
  onThemeChange,
  onSelect,
  onSignOut,
  className,
}: AccountCardProps) {
  const reduce = useReducedMotion();
  const hoverId = useId();
  const [steps, setSteps] = useState(initialSteps);
  const [themeState, setThemeState] = useState<ThemeChoice>(themeProp ?? "system");
  const [hover, setHover] = useState<string | null>(null);
  const theme = themeProp ?? themeState;

  const doneCount = steps.filter((s) => s.done).length;
  const pct = steps.length ? Math.round((doneCount / steps.length) * 100) : 100;
  const next = steps.find((s) => !s.done);

  const r = 25;
  const c = 2 * Math.PI * r;

  const setTheme = (t: ThemeChoice) => {
    setThemeState(t);
    onThemeChange?.(t);
  };

  return (
    <section
      aria-label="Account"
      className={cn("w-full max-w-[320px] rounded-2xl border bg-card text-card-foreground shadow-xs/5", className)}
    >
      <div className="flex items-center gap-3 p-4">
        <div className="relative size-14 shrink-0">
          <svg aria-hidden className="-rotate-90 absolute inset-0 size-full" viewBox="0 0 56 56">
            <circle className="stroke-muted" cx="28" cy="28" fill="none" r={r} strokeWidth="2.5" />
            <motion.circle
              animate={{ strokeDashoffset: c * (1 - pct / 100) }}
              className={pct === 100 ? "stroke-success" : "stroke-primary"}
              cx="28"
              cy="28"
              fill="none"
              initial={false}
              r={r}
              strokeDasharray={c}
              strokeLinecap="round"
              strokeWidth="2.5"
              transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 110, damping: 18 }}
            />
          </svg>
          <span className="absolute inset-[6px] flex items-center justify-center rounded-full bg-info/14 font-medium text-info-foreground text-sm">
            {user.initials}
          </span>
          <AnimatePresence>
            {pct === 100 && (
              <motion.span
                animate={{ scale: 1, opacity: 1 }}
                className="absolute -right-0.5 -bottom-0.5 flex size-5 items-center justify-center rounded-full border-2 border-card bg-success text-white"
                exit={{ scale: 0.6, opacity: 0, transition: { duration: 0.12 } }}
                initial={reduce ? { opacity: 0 } : { scale: 0.6, opacity: 0 }}
                transition={{ type: "spring", stiffness: 520, damping: 24, delay: reduce ? 0 : 0.25 }}
              >
                <CheckIcon className="size-2.5" strokeWidth={3.5} />
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-medium text-sm">{user.name}</p>
            {user.plan && (
              <span className="shrink-0 rounded-full bg-primary px-1.5 py-px font-medium text-[10px] text-primary-foreground uppercase tracking-wide">
                {user.plan}
              </span>
            )}
          </div>
          <p className="truncate text-muted-foreground text-xs">{user.email}</p>
        </div>
      </div>

      {steps.length > 0 && (
        <div className="mx-3 mb-2 rounded-xl bg-muted/50 p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Profile setup</span>
            <span className="font-medium tabular-nums">
              <Rolling value={pct} />%
            </span>
          </div>
          <div className="mt-1 h-8">
            <AnimatePresence initial={false} mode="popLayout">
              {next ? (
                <motion.button
                  animate={{ opacity: 1, y: 0 }}
                  className="group/next -mx-1.5 flex h-8 w-[calc(100%+--spacing(3))] cursor-pointer items-center gap-2 rounded-md px-1.5 text-left text-xs outline-none transition-[background-color,scale] duration-150 ease-out hover:bg-background/60 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98] dark:hover:bg-input/40"
                  exit={{ opacity: 0, y: -10 }}
                  initial={reduce ? false : { opacity: 0, y: 10 }}
                  key={next.id}
                  onClick={() => setSteps((s) => s.map((x) => (x.id === next.id ? { ...x, done: true } : x)))}
                  transition={spring}
                  type="button"
                >
                  <span className="size-3.5 shrink-0 rounded-full border-[1.5px] border-dashed border-muted-foreground/60 transition-colors group-hover/next:border-solid group-hover/next:border-foreground" />
                  <span className="flex-1 truncate">
                    Next: <span className="font-medium">{next.label}</span>
                  </span>
                  <ChevronRightIcon className="size-3.5 text-muted-foreground transition-transform group-hover/next:translate-x-0.5" />
                </motion.button>
              ) : (
                <motion.p
                  animate={{ opacity: 1, y: 0 }}
                  className="flex h-8 items-center gap-2 text-success-foreground text-xs"
                  initial={reduce ? false : { opacity: 0, y: 10 }}
                  key="done"
                  transition={spring}
                >
                  <CheckIcon className="size-3.5" /> All set – your profile is complete
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      <nav aria-label="Account menu" className="border-t p-1.5" onMouseLeave={() => setHover(null)}>
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              className="relative flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-left text-sm outline-none"
              key={item.id}
              onBlur={() => setHover((h) => (h === item.id ? null : h))}
              onClick={() => onSelect?.(item.id)}
              onFocus={() => setHover(item.id)}
              onMouseEnter={() => setHover(item.id)}
              type="button"
            >
              {hover === item.id && (
                <motion.span
                  className="absolute inset-0 -z-0 rounded-lg bg-accent"
                  layoutId={`${hoverId}-hover`}
                  transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 38 }}
                />
              )}
              <Icon className="relative size-4 text-muted-foreground" />
              <span className="relative flex-1">{item.label}</span>
              {item.meta && <span className="relative text-muted-foreground text-xs">{item.meta}</span>}
              {item.shortcut && <Kbd className="relative">{item.shortcut}</Kbd>}
            </button>
          );
        })}
      </nav>

      <div className="flex items-center justify-between border-t py-2 ps-4 pe-3">
        <span className="text-sm">Theme</span>
        <ThemeSwitch onChange={setTheme} value={theme} />
      </div>

      <div className="border-t p-1.5">
        <button
          className="group/out flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-left text-sm outline-none transition-colors hover:bg-destructive/8 hover:text-destructive-foreground focus-visible:bg-destructive/8 focus-visible:text-destructive-foreground"
          onClick={onSignOut}
          type="button"
        >
          <LogOutIcon className="size-4 text-muted-foreground transition-colors group-hover/out:text-destructive-foreground" />
          Sign out
        </button>
      </div>
    </section>
  );
}
