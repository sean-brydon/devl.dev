"use client";

import {
  ArrowLeftIcon,
  BellIcon,
  CheckIcon,
  CreditCardIcon,
  FileTextIcon,
  FolderIcon,
  InboxIcon,
  KeyRoundIcon,
  ListTodoIcon,
  MoonIcon,
  PaletteIcon,
  PlusIcon,
  SearchIcon,
  SettingsIcon,
  ShieldIcon,
  SunIcon,
  UserIcon,
  UsersIcon,
} from "lucide-react";
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from "motion/react";
import { type ComponentType, type CSSProperties, type ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { RadioGroupPrimitive, RadioPrimitive } from "@/components/ui/radio-group";
import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

export type ThemeChoice = "system" | "light" | "dark";
export type Density = "compact" | "default" | "comfortable";
export type AccentName = "indigo" | "violet" | "rose" | "orange" | "emerald" | "sky";

export interface AppearancePrefs {
  theme: ThemeChoice;
  accent: AccentName;
  density: Density;
  textSize: number;
  reduceMotion: boolean;
  sidebarIcons: boolean;
}

export interface AppearanceTask {
  id: string;
  title: string;
  owner: string;
  due: string;
  done?: boolean;
}

export interface AppearanceSettingsProps {
  className?: string;
  defaultPrefs?: AppearancePrefs;
  workspace?: string;
  tasks?: AppearanceTask[];
  onChange?: (prefs: AppearancePrefs) => void;
  onNavigate?: (section: string) => void;
}

const easeOut = [0.23, 1, 0.32, 1] as const;
const spring = { type: "spring", stiffness: 520, damping: 40 } as const;
const press = "transition-[background-color,color,box-shadow,scale] duration-150 ease-out motion-safe:active:scale-[0.97]";
const textSizes = [12, 13, 14, 15, 16, 17, 18];
const tintTransition = "transition-[background-color,color,border-color] duration-300 ease-out";

const factoryPrefs: AppearancePrefs = {
  theme: "system",
  accent: "indigo",
  density: "default",
  textSize: 14,
  reduceMotion: false,
  sidebarIcons: true,
};

const accents: Record<
  AccentName,
  { label: string; swatch: string; light: { solid: string; ink: string }; dark: { solid: string; ink: string } }
> = {
  indigo: {
    label: "Indigo",
    swatch: "bg-indigo-600 dark:bg-indigo-500",
    light: { solid: "var(--color-indigo-600)", ink: "var(--color-indigo-700)" },
    dark: { solid: "var(--color-indigo-500)", ink: "var(--color-indigo-300)" },
  },
  violet: {
    label: "Violet",
    swatch: "bg-violet-600 dark:bg-violet-500",
    light: { solid: "var(--color-violet-600)", ink: "var(--color-violet-700)" },
    dark: { solid: "var(--color-violet-500)", ink: "var(--color-violet-300)" },
  },
  rose: {
    label: "Rose",
    swatch: "bg-rose-600 dark:bg-rose-500",
    light: { solid: "var(--color-rose-600)", ink: "var(--color-rose-700)" },
    dark: { solid: "var(--color-rose-500)", ink: "var(--color-rose-300)" },
  },
  orange: {
    label: "Orange",
    swatch: "bg-orange-600 dark:bg-orange-500",
    light: { solid: "var(--color-orange-600)", ink: "var(--color-orange-700)" },
    dark: { solid: "var(--color-orange-500)", ink: "var(--color-orange-300)" },
  },
  emerald: {
    label: "Emerald",
    swatch: "bg-emerald-600 dark:bg-emerald-500",
    light: { solid: "var(--color-emerald-600)", ink: "var(--color-emerald-700)" },
    dark: { solid: "var(--color-emerald-600)", ink: "var(--color-emerald-300)" },
  },
  sky: {
    label: "Sky",
    swatch: "bg-sky-600 dark:bg-sky-500",
    light: { solid: "var(--color-sky-600)", ink: "var(--color-sky-700)" },
    dark: { solid: "var(--color-sky-600)", ink: "var(--color-sky-300)" },
  },
};

const lightScope = {
  "--background": "var(--color-white)",
  "--foreground": "var(--color-neutral-800)",
  "--card": "var(--color-white)",
  "--card-foreground": "var(--color-neutral-800)",
  "--muted": "color-mix(in srgb, var(--color-black) 4%, transparent)",
  "--muted-foreground": "color-mix(in srgb, var(--color-neutral-500) 90%, var(--color-black))",
  "--accent": "color-mix(in srgb, var(--color-black) 4%, transparent)",
  "--border": "color-mix(in srgb, var(--color-black) 8%, transparent)",
  "--input": "color-mix(in srgb, var(--color-black) 10%, transparent)",
  "--primary": "var(--color-neutral-800)",
  "--primary-foreground": "var(--color-neutral-50)",
} as CSSProperties;

const navGroups: { label: string; items: { id: string; label: string; icon: ComponentType<{ className?: string }> }[] }[] = [
  {
    label: "Account",
    items: [
      { id: "profile", label: "Profile", icon: UserIcon },
      { id: "appearance", label: "Appearance", icon: PaletteIcon },
      { id: "notifications", label: "Notifications", icon: BellIcon },
      { id: "security", label: "Security", icon: ShieldIcon },
    ],
  },
  {
    label: "Workspace",
    items: [
      { id: "general", label: "General", icon: SettingsIcon },
      { id: "members", label: "Members & roles", icon: UsersIcon },
      { id: "billing", label: "Billing", icon: CreditCardIcon },
    ],
  },
  {
    label: "Developer",
    items: [{ id: "api", label: "API keys & webhooks", icon: KeyRoundIcon }],
  },
];

const defaultTasks: AppearanceTask[] = [
  { id: "t1", title: "Finalize pricing page copy", owner: "Ravi Chen", due: "Today", done: true },
  { id: "t2", title: "QA the onboarding emails", owner: "Mina Kova", due: "Tomorrow" },
  { id: "t3", title: "Record the walkthrough video", owner: "Ada Lindqvist", due: "Fri" },
  { id: "t4", title: "Sign-off on terms with legal", owner: "Theo Banks", due: "Nov 3", done: true },
  { id: "t5", title: "Prep the launch-day status page", owner: "Ines Abara", due: "Nov 4" },
  { id: "t6", title: "Write the changelog entry", owner: "Ada Lindqvist", due: "Nov 5" },
];

const ownerHues = [
  "bg-teal-600 text-white",
  "bg-amber-500 text-amber-950",
  "bg-fuchsia-600 text-white",
  "bg-sky-600 text-white",
  "bg-lime-500 text-lime-950",
];

const densityRow: Record<Density, string> = {
  compact: "py-[0.35em]",
  default: "py-[0.55em]",
  comfortable: "py-[0.8em]",
};

const densityNav: Record<Density, string> = {
  compact: "py-[0.25em]",
  default: "py-[0.38em]",
  comfortable: "py-[0.52em]",
};

const themeOptions: { value: ThemeChoice; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

function useReducedMotionSafe() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && Boolean(prefers);
}

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function samePrefs(a: AppearancePrefs, b: AppearancePrefs) {
  return (Object.keys(a) as (keyof AppearancePrefs)[]).every((k) => a[k] === b[k]);
}

function tintStyle(theme: "light" | "dark", accent: AccentName): CSSProperties {
  const tint = accents[accent][theme];
  return {
    ...(theme === "light" ? lightScope : {}),
    "--tint": tint.solid,
    "--tint-ink": tint.ink,
  } as CSSProperties;
}

function SettingsShell({
  active,
  account,
  onNavigate,
  children,
}: {
  active: string;
  account: ReactNode;
  onNavigate?: (section: string) => void;
  children: ReactNode;
}) {
  const items = navGroups.flatMap((g) => g.items);
  return (
    <>
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-muted/30 px-3 py-4 md:flex">
        <button
          className="flex h-8 items-center gap-2 rounded-md px-2 text-muted-foreground text-sm outline-none ring-ring/24 transition-colors hover:bg-accent/60 hover:text-foreground focus-visible:ring-[3px]"
          type="button"
        >
          <ArrowLeftIcon className="size-4" />
          Back to Ridgeline
        </button>
        <nav aria-label="Settings">
          {navGroups.map((group) => (
            <div key={group.label}>
              <div className="px-2 pt-5 pb-1.5 font-medium text-muted-foreground text-xs">{group.label}</div>
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const current = item.id === active;
                  const Icon = item.icon;
                  return (
                    <button
                      aria-current={current ? "page" : undefined}
                      className={cn(
                        "flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-sm outline-none ring-ring/24 transition-colors focus-visible:ring-[3px]",
                        current ? "bg-accent font-medium text-foreground" : "text-foreground/80 hover:bg-accent/60",
                      )}
                      key={item.id}
                      onClick={() => onNavigate?.(item.id)}
                      type="button"
                    >
                      <Icon className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="mt-auto flex items-center gap-2.5 px-2 pt-4">{account}</div>
      </aside>
      <div className="relative flex min-w-0 flex-1 flex-col">
        <div className="md:hidden">
          <div className="flex h-12 items-center gap-2 border-b px-4">
            <button
              aria-label="Back to Ridgeline"
              className="-ms-1.5 flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none ring-ring/24 hover:bg-accent/60 hover:text-foreground focus-visible:ring-[3px]"
              type="button"
            >
              <ArrowLeftIcon className="size-4" />
            </button>
            <span className="font-medium text-sm">Settings</span>
          </div>
          <nav
            aria-label="Settings"
            className="flex gap-1.5 overflow-x-auto border-b px-4 py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {items.map((item) => {
              const current = item.id === active;
              return (
                <button
                  aria-current={current ? "page" : undefined}
                  className={cn(
                    "h-7 shrink-0 rounded-full px-3 text-xs outline-none ring-ring/24 transition-colors focus-visible:ring-[3px]",
                    current ? "bg-foreground font-medium text-background" : "bg-muted text-muted-foreground hover:text-foreground",
                  )}
                  key={item.id}
                  onClick={() => onNavigate?.(item.id)}
                  type="button"
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-2xl px-6 py-10 md:px-10">{children}</div>
        </div>
      </div>
    </>
  );
}

function MiniApp({
  theme,
  prefs,
  tasks,
  onToggleTask,
  workspace,
}: {
  theme: "light" | "dark";
  prefs: AppearancePrefs;
  tasks: AppearanceTask[];
  onToggleTask: (id: string) => void;
  workspace: string;
}) {
  const done = tasks.filter((t) => t.done).length;
  const owners = [...new Set(tasks.map((t) => t.owner))];
  return (
    <div
      className={cn(
        "@container/app flex size-full flex-col overflow-hidden bg-background text-foreground leading-normal",
        theme === "dark" && "dark",
      )}
      style={{ ...tintStyle(theme, prefs.accent), fontSize: `${prefs.textSize * 0.86}px` }}
    >
      <div className="flex h-[2.5em] shrink-0 items-center gap-[0.6em] border-b px-[0.9em]">
        <span className="flex gap-[0.35em]">
          <span className="size-[0.55em] rounded-full bg-foreground/16" />
          <span className="size-[0.55em] rounded-full bg-foreground/16" />
          <span className="size-[0.55em] rounded-full bg-foreground/16" />
        </span>
        <span className="mx-auto flex h-[1.75em] w-full max-w-[18em] items-center gap-[0.4em] rounded-[0.5em] bg-muted px-[0.6em] text-[0.8em] text-muted-foreground">
          <SearchIcon className="size-[1.1em]" />
          Search {workspace}
        </span>
        <span className="flex size-[1.6em] items-center justify-center text-muted-foreground">
          {theme === "dark" ? <MoonIcon className="size-[1em]" /> : <SunIcon className="size-[1em]" />}
        </span>
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="hidden w-[12em] shrink-0 flex-col gap-[0.15em] border-r bg-muted/50 p-[0.6em] @lg/app:flex">
          <div className="mb-[0.4em] flex items-center gap-[0.5em] px-[0.4em] pt-[0.2em]">
            <span
              className={cn(
                "flex size-[1.5em] items-center justify-center rounded-[0.4em] bg-(--tint) font-semibold text-[0.85em] text-white",
                tintTransition,
              )}
            >
              {workspace[0]}
            </span>
            <span className="truncate font-semibold text-[0.9em]">{workspace}</span>
          </div>
          {[
            { label: "Inbox", icon: <InboxIcon />, count: 4 },
            { label: "My tasks", icon: <ListTodoIcon />, active: true },
            { label: "Projects", icon: <FolderIcon /> },
            { label: "Docs", icon: <FileTextIcon /> },
          ].map((item) => (
            <span
              className={cn(
                "flex items-center gap-[0.55em] rounded-[0.45em] px-[0.5em] text-[0.88em] [&_svg]:size-[1.05em] [&_svg]:shrink-0",
                densityNav[prefs.density],
                item.active
                  ? "bg-[color-mix(in_srgb,var(--tint)_14%,transparent)] font-medium text-(--tint-ink)"
                  : "text-muted-foreground",
                tintTransition,
              )}
              key={item.label}
            >
              {prefs.sidebarIcons && item.icon}
              {item.label}
              {item.count && (
                <span
                  className={cn(
                    "ms-auto rounded-full bg-(--tint) px-[0.45em] font-medium text-[0.78em] text-white tabular-nums",
                    tintTransition,
                  )}
                >
                  {item.count}
                </span>
              )}
            </span>
          ))}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-col gap-[0.6em] border-b px-[1em] pt-[0.9em]">
            <div className="flex items-center gap-[0.6em]">
              <span className="truncate font-semibold text-[1.1em] tracking-tight">Launch plan</span>
              <span className="hidden shrink-0 text-[0.8em] text-muted-foreground tabular-nums @sm/app:inline">
                {done} of {tasks.length} done
              </span>
              <span
                className={cn(
                  "ms-auto inline-flex shrink-0 items-center gap-[0.3em] rounded-[0.5em] bg-(--tint) px-[0.7em] py-[0.3em] font-medium text-[0.82em] text-white",
                  tintTransition,
                )}
              >
                <PlusIcon className="size-[1.05em]" />
                New task
              </span>
            </div>
            <div className="h-[0.28em] overflow-hidden rounded-full bg-muted">
              <motion.div
                animate={{ scaleX: done / tasks.length }}
                className={cn("h-full origin-left rounded-full bg-(--tint)", tintTransition)}
                initial={false}
                transition={spring}
              />
            </div>
            <div className="flex gap-[1.2em] text-[0.85em]">
              {["List", "Board", "Timeline"].map((tab, i) => (
                <span
                  className={cn("relative pb-[0.55em]", i === 0 ? "font-medium text-foreground" : "text-muted-foreground")}
                  key={tab}
                >
                  {tab}
                  {i === 0 && (
                    <span className={cn("absolute inset-x-0 -bottom-px h-[0.14em] rounded-full bg-(--tint)", tintTransition)} />
                  )}
                </span>
              ))}
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden px-[0.5em] py-[0.3em]">
            {tasks.map((task) => (
              <motion.div
                className={cn(
                  "flex items-center gap-[0.7em] rounded-[0.5em] px-[0.6em] transition-[padding] duration-200 ease-out",
                  densityRow[prefs.density],
                )}
                key={task.id}
                layout="position"
                layoutDependency={prefs.density}
                transition={spring}
              >
                <button
                  aria-label={`${task.done ? "Reopen" : "Complete"} “${task.title}” in the preview`}
                  aria-pressed={Boolean(task.done)}
                  className={cn(
                    "relative flex size-[1.15em] shrink-0 items-center justify-center rounded-[0.32em] border outline-none ring-(--tint)/40 focus-visible:ring-[3px]",
                    task.done ? "border-transparent bg-(--tint) text-white" : "border-foreground/24 bg-background",
                    tintTransition,
                  )}
                  onClick={() => onToggleTask(task.id)}
                  type="button"
                >
                  <AnimatePresence initial={false}>
                    {task.done && (
                      <motion.span
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute inset-0 flex items-center justify-center"
                        exit={{ opacity: 0, scale: 0.6 }}
                        initial={{ opacity: 0, scale: 0.6 }}
                        transition={{ type: "spring", stiffness: 600, damping: 30 }}
                      >
                        <CheckIcon className="size-[0.8em]" strokeWidth={3.2} />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate text-[0.92em] transition-colors duration-200",
                    task.done && "text-muted-foreground line-through decoration-foreground/24",
                  )}
                >
                  {task.title}
                </span>
                <span
                  className={cn(
                    "hidden shrink-0 rounded-[0.4em] px-[0.45em] py-[0.1em] text-[0.75em] @md/app:inline",
                    task.due === "Today"
                      ? cn("bg-[color-mix(in_srgb,var(--tint)_14%,transparent)] font-medium text-(--tint-ink)", tintTransition)
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {task.due}
                </span>
                <span
                  aria-hidden
                  className={cn(
                    "flex size-[1.55em] shrink-0 items-center justify-center rounded-full",
                    ownerHues[owners.indexOf(task.owner) % ownerHues.length],
                  )}
                >
                  <span className="font-semibold text-[0.6em] leading-none">{initialsOf(task.owner)}</span>
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ThemePreview({
  resolved,
  prefs,
  tasks,
  onToggleTask,
  workspace,
  calm,
}: {
  resolved: "light" | "dark";
  prefs: AppearancePrefs;
  tasks: AppearanceTask[];
  onToggleTask: (id: string) => void;
  workspace: string;
  calm: boolean;
}) {
  const [layers, setLayers] = useState<{ key: number; theme: "light" | "dark"; animate: boolean }[]>([
    { key: 0, theme: resolved, animate: false },
  ]);
  const settled = useRef(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      settled.current = true;
    });
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    setLayers((current) => {
      const top = current[current.length - 1];
      if (top.theme === resolved) return current;
      if (!settled.current) return [{ key: top.key + 1, theme: resolved, animate: false }];
      return [...current.slice(-1), { key: top.key + 1, theme: resolved, animate: true }];
    });
  }, [resolved]);

  const origin = "calc(100% - 1.4em) 1.25em";

  return (
    <div
      className="relative size-full overflow-hidden rounded-lg border shadow-xs/5"
      style={{ fontSize: `${prefs.textSize * 0.86}px` }}
    >
      {layers.map((layer, i) => {
        const top = i === layers.length - 1;
        return (
          <motion.div
            animate={calm ? { opacity: 1 } : { clipPath: `circle(150% at ${origin})` }}
            className="absolute inset-0"
            initial={layer.animate ? (calm ? { opacity: 0 } : { clipPath: `circle(0% at ${origin})` }) : false}
            key={layer.key}
            onAnimationComplete={() => {
              if (top) setLayers((current) => (current.length > 1 ? current.slice(-1) : current));
            }}
            transition={calm ? { duration: 0.2, ease: "linear" } : { duration: 0.55, ease: easeOut }}
          >
            <MiniApp onToggleTask={onToggleTask} prefs={prefs} tasks={tasks} theme={layer.theme} workspace={workspace} />
          </motion.div>
        );
      })}
    </div>
  );
}

function ThemeThumb({ variant, accent }: { variant: "light" | "dark"; accent: AccentName }) {
  return (
    <span
      className={cn("flex size-full bg-background", variant === "dark" && "dark")}
      style={tintStyle(variant, accent)}
    >
      <span className="flex w-[26%] flex-col gap-[6%] border-r bg-muted px-[5%] pt-[9%]">
        <span className={cn("size-2.5 rounded-[3px] bg-(--tint)", tintTransition)} />
        <span className="h-1 w-4/5 rounded-full bg-foreground/20" />
        <span className="h-1 w-3/5 rounded-full bg-foreground/12" />
        <span className="h-1 w-4/5 rounded-full bg-foreground/12" />
      </span>
      <span className="flex flex-1 flex-col gap-[7%] px-[8%] pt-[9%]">
        <span className="flex items-center justify-between">
          <span className="h-1.5 w-2/5 rounded-full bg-foreground/56" />
          <span className={cn("h-2.5 w-1/4 rounded-[3px] bg-(--tint)", tintTransition)} />
        </span>
        {[0, 1, 2, 3].map((row) => (
          <span className="flex items-center gap-[6%] border-b pb-[5%] last:border-b-0" key={row}>
            <span className="size-1.5 shrink-0 rounded-[2px] border border-foreground/24" />
            <span className={cn("h-1 rounded-full bg-foreground/16", row % 2 ? "w-1/2" : "w-3/4")} />
          </span>
        ))}
      </span>
    </span>
  );
}

function ThemeCard({ value, label, accent }: { value: ThemeChoice; label: string; accent: AccentName }) {
  return (
    <RadioPrimitive.Root
      className="group flex min-w-0 cursor-pointer flex-col items-center gap-2 outline-none"
      value={value}
    >
      <span
        className={cn(
          "relative block aspect-[16/11] w-full overflow-hidden rounded-lg border ring-offset-2 ring-offset-background transition-[box-shadow,scale] duration-150 ease-out group-active:scale-[0.98] group-focus-visible:ring-2 group-focus-visible:ring-ring",
          "group-data-checked:ring-2 group-data-checked:ring-foreground [@media(hover:hover)]:group-hover:not-group-data-checked:border-foreground/24",
        )}
      >
        {value === "system" ? (
          <>
            <span className="absolute inset-0">
              <ThemeThumb accent={accent} variant="light" />
            </span>
            <span className="absolute inset-0 [clip-path:inset(0_0_0_50%)]">
              <ThemeThumb accent={accent} variant="dark" />
            </span>
          </>
        ) : (
          <ThemeThumb accent={accent} variant={value} />
        )}
        <RadioPrimitive.Indicator
          className="absolute top-1.5 right-1.5 flex size-4.5 items-center justify-center rounded-full bg-foreground text-background shadow-xs/5 transition-[opacity,scale] duration-150 ease-out data-starting-style:scale-75 data-starting-style:opacity-0"
          keepMounted={false}
        >
          <CheckIcon className="size-3" strokeWidth={3} />
        </RadioPrimitive.Indicator>
      </span>
      <span className="text-muted-foreground text-sm transition-colors group-data-checked:font-medium group-data-checked:text-foreground">
        {label}
      </span>
    </RadioPrimitive.Root>
  );
}

function Section({
  title,
  description,
  aside,
  children,
}: {
  title: string;
  description?: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="mt-10">
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-medium text-sm">{title}</h2>
          {description && <p className="text-pretty text-muted-foreground text-sm">{description}</p>}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

function RowText({ label, help }: { label: string; help: string }) {
  return (
    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
      <span className="font-medium text-sm">{label}</span>
      <span className="text-pretty text-muted-foreground text-xs">{help}</span>
    </span>
  );
}

export function AppearanceSettings({
  className,
  defaultPrefs = factoryPrefs,
  workspace = "Ridgeline",
  tasks: initialTasks = defaultTasks,
  onChange,
  onNavigate,
}: AppearanceSettingsProps) {
  const osReduce = useReducedMotionSafe();
  const [prefs, setPrefs] = useState(defaultPrefs);
  const [system, setSystem] = useState<"light" | "dark">("light");
  const [tasks, setTasks] = useState(initialTasks);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resolved = prefs.theme === "system" ? system : prefs.theme;
  const calm = osReduce || prefs.reduceMotion;

  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => setSystem(query.matches ? "dark" : "light");
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    },
    [],
  );

  const update = (patch: Partial<AppearancePrefs>) => {
    const next = { ...prefs, ...patch };
    if (samePrefs(next, prefs)) return;
    setPrefs(next);
    onChange?.(next);
    setSaveState("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => setSaveState("saved"), 450);
  };

  const toggleTask = (id: string) => setTasks((all) => all.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  const sizeIndex = Math.max(0, textSizes.indexOf(prefs.textSize));

  return (
    <MotionConfig reducedMotion={prefs.reduceMotion ? "always" : "user"}>
      <div className={cn("flex h-[760px] w-full bg-background text-foreground", className)}>
        <SettingsShell
          account={
            <>
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-foreground font-medium text-[11px] text-background">
                AL
              </span>
              <div className="flex min-w-0 flex-col">
                <span className="truncate font-medium text-sm">Ada Lindqvist</span>
                <span className="truncate text-muted-foreground text-xs">ada@ridgeline.app</span>
              </div>
            </>
          }
          active="appearance"
          onNavigate={onNavigate}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="font-semibold text-2xl tracking-tight">Appearance</h1>
              <p className="mt-1 text-pretty text-muted-foreground text-sm">
                Customise how {workspace} looks on this device.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1 pt-1">
              <span aria-live="polite" className="hidden h-7 items-center px-1 text-muted-foreground text-xs sm:flex">
                <AnimatePresence initial={false} mode="popLayout">
                  {saveState !== "idle" && (
                    <motion.span
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-1.5"
                      exit={{ opacity: 0, y: -4 }}
                      initial={{ opacity: 0, y: 4 }}
                      key={saveState}
                      transition={{ duration: 0.16, ease: easeOut }}
                    >
                      {saveState === "saving" ? (
                        <span className="size-1.5 animate-pulse rounded-full bg-muted-foreground" />
                      ) : (
                        <CheckIcon className="size-3.5 text-success-foreground" />
                      )}
                      {saveState === "saving" ? "Saving…" : "Saved"}
                    </motion.span>
                  )}
                </AnimatePresence>
              </span>
              <Button
                className={press}
                disabled={samePrefs(prefs, factoryPrefs)}
                onClick={() => update(factoryPrefs)}
                size="sm"
                variant="ghost"
              >
                Reset
              </Button>
            </div>
          </div>

          <Section
            description={
              prefs.theme === "system"
                ? `Follows your device setting, currently ${system}.`
                : "Pick a theme, or follow your device setting."
            }
            title="Theme"
          >
            <RadioGroupPrimitive
              aria-label="Theme"
              className="mt-4 grid grid-cols-3 gap-3 sm:gap-4"
              onValueChange={(value) => update({ theme: value as ThemeChoice })}
              value={prefs.theme}
            >
              {themeOptions.map((option) => (
                <ThemeCard accent={prefs.accent} key={option.value} label={option.label} value={option.value} />
              ))}
            </RadioGroupPrimitive>

            <div className="mt-6 rounded-xl border bg-muted/40 p-2">
              <div className="h-56 sm:h-64">
                <ThemePreview
                  calm={calm}
                  onToggleTask={toggleTask}
                  prefs={prefs}
                  resolved={resolved}
                  tasks={tasks}
                  workspace={workspace}
                />
              </div>
              <div className="flex items-center justify-between gap-3 px-1.5 pt-2 pb-0.5 text-muted-foreground text-xs">
                <span className="truncate">Preview. Tick a task to try it.</span>
                <span className="flex shrink-0 items-center gap-1.5 capitalize tabular-nums">
                  {resolved === "dark" ? <MoonIcon className="size-3.5" /> : <SunIcon className="size-3.5" />}
                  {resolved} · {prefs.textSize}px
                </span>
              </div>
            </div>
          </Section>

          <Section
            aside={<span className="text-muted-foreground text-sm">{accents[prefs.accent].label}</span>}
            description="Used for buttons, links and highlights."
            title="Accent colour"
          >
            <RadioGroupPrimitive
              aria-label="Accent colour"
              className="mt-3 flex flex-wrap gap-1.5"
              onValueChange={(value) => update({ accent: value as AccentName })}
              value={prefs.accent}
            >
              {(Object.keys(accents) as AccentName[]).map((name) => (
                <RadioPrimitive.Root
                  aria-label={accents[name].label}
                  className="group relative flex size-9 cursor-pointer items-center justify-center rounded-full outline-none"
                  key={name}
                  value={name}
                >
                  <span className="absolute inset-0 rounded-full border-2 border-transparent transition-[border-color,scale] duration-200 ease-out group-focus-visible:border-ring group-data-checked:border-foreground/80" />
                  <span
                    className={cn(
                      "flex size-6.5 items-center justify-center rounded-full text-white shadow-xs/5 transition-transform duration-150 ease-out group-active:scale-90",
                      accents[name].swatch,
                    )}
                  >
                    <RadioPrimitive.Indicator
                      className="transition-[opacity,scale] duration-150 ease-out data-starting-style:scale-50 data-starting-style:opacity-0"
                      keepMounted={false}
                    >
                      <CheckIcon className="size-3.5" strokeWidth={3} />
                    </RadioPrimitive.Indicator>
                  </span>
                </RadioPrimitive.Root>
              ))}
            </RadioGroupPrimitive>
          </Section>

          <Section description="Spacing and type across lists, tables and the sidebar." title="Layout">
            <div className="mt-3 divide-y rounded-xl border bg-card">
              <div className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-4">
                <RowText help="How much room rows and lists get." label="Density" />
                <SegmentedControl aria-label="Density" className="w-full sm:w-auto" role="radiogroup" size="sm">
                  {(["compact", "default", "comfortable"] as Density[]).map((d) => (
                    <SegmentedControlItem
                      aria-checked={prefs.density === d}
                      className="flex-1 capitalize sm:flex-none"
                      data-checked={prefs.density === d ? "" : undefined}
                      key={d}
                      onClick={() => update({ density: d })}
                      role="radio"
                    >
                      {d}
                    </SegmentedControlItem>
                  ))}
                </SegmentedControl>
              </div>
              <div className="flex flex-col gap-3 px-4 py-3.5">
                <div className="flex items-center gap-4">
                  <RowText help="Scales text everywhere in the app." label="Font size" />
                  <span className="font-mono text-muted-foreground text-xs tabular-nums">{prefs.textSize}px</span>
                </div>
                <div className="flex items-center gap-3">
                  <span aria-hidden className="w-3 text-center text-muted-foreground text-xs">
                    A
                  </span>
                  <Slider
                    getAriaLabel={() => "Font size"}
                    max={textSizes.length - 1}
                    min={0}
                    onValueChange={(v) => {
                      const i = Array.isArray(v) ? v[0] : v;
                      update({ textSize: textSizes[i] ?? 14 });
                    }}
                    step={1}
                    value={sizeIndex}
                  />
                  <span aria-hidden className="w-3 text-center text-base text-muted-foreground">
                    A
                  </span>
                </div>
                <p
                  className="truncate rounded-lg bg-muted/60 px-3 py-2 text-foreground/90"
                  style={{ fontSize: `${prefs.textSize}px` }}
                >
                  Release notes are ready for review.
                </p>
              </div>
            </div>
          </Section>

          <Section description="Fine-tune motion and navigation." title="Accessibility">
            <div className="mt-3 divide-y rounded-xl border bg-card">
              <label className="flex cursor-pointer items-center gap-4 px-4 py-3.5">
                <RowText
                  help={
                    osReduce
                      ? "Your device already asks for less motion, so this is on."
                      : "Replace slides and springs with simple fades."
                  }
                  label="Reduce motion"
                />
                <Switch
                  checked={prefs.reduceMotion || osReduce}
                  disabled={osReduce}
                  onCheckedChange={(checked) => update({ reduceMotion: checked })}
                />
              </label>
              <label className="flex cursor-pointer items-center gap-4 px-4 py-3.5">
                <RowText help="Show icons next to items in the sidebar." label="Show sidebar icons" />
                <Switch checked={prefs.sidebarIcons} onCheckedChange={(checked) => update({ sidebarIcons: checked })} />
              </label>
            </div>
          </Section>
        </SettingsShell>
      </div>
    </MotionConfig>
  );
}
