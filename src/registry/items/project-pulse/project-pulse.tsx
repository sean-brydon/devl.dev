"use client";

import { CalendarIcon, CheckIcon, ChevronDownIcon } from "lucide-react";
import {
  AnimatePresence,
  animate,
  type MotionValue,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount } from "@/components/ui/avatar";
import { Menu, MenuGroup, MenuGroupLabel, MenuPopup, MenuRadioGroup, MenuRadioItem, MenuTrigger } from "@/components/ui/menu";
import { cn } from "@/lib/utils";

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

function Face({ n, turn }: { n: number; turn: MotionValue<number> }) {
  const y = useTransform(turn, (t) => {
    let offset = (((n - t) % 10) + 10) % 10;
    if (offset > 5) offset -= 10;
    return `${offset * 100}%`;
  });
  return (
    <motion.span className="absolute inset-x-0 top-0 block h-[1.15em] text-center leading-[1.15em]" style={{ y }}>
      {n}
    </motion.span>
  );
}

function Wheel({ digit, instant, delay }: { digit: number; instant: boolean; delay: number }) {
  const reduce = useReducedMotion();
  const turn = useMotionValue(digit);
  const target = useRef(digit);
  useEffect(() => {
    let step = digit - (((target.current % 10) + 10) % 10);
    if (step > 5) step -= 10;
    else if (step < -5) step += 10;
    target.current += step;
    if (reduce || instant) turn.jump(target.current);
    else if (step !== 0 || (!turn.isAnimating() && turn.get() !== target.current))
      animate(turn, target.current, { type: "spring", stiffness: 280, damping: 34, delay });
  }, [digit, instant, delay, reduce, turn]);
  useEffect(() => () => turn.stop(), [turn]);
  return (
    <span className="relative inline-block h-[1.15em] overflow-hidden [mask-image:linear-gradient(transparent,black_20%,black_80%,transparent)]">
      <span className="invisible block leading-[1.15em]">0</span>
      {DIGITS.map((n) => (
        <Face key={n} n={n} turn={turn} />
      ))}
    </span>
  );
}

function Roll({
  text,
  className,
  instant = false,
  delay = 0,
}: {
  text: string;
  className?: string;
  instant?: boolean;
  delay?: number;
}) {
  let placeFromRight = 0;
  let other = 0;
  const glyphs = [...text]
    .reverse()
    .map((char) => {
      const isDigit = char >= "0" && char <= "9";
      return { char, isDigit, key: isDigit ? `d${placeFromRight++}` : `s${other++}${char}` };
    })
    .reverse();
  return (
    <span className={cn("inline-flex whitespace-nowrap tabular-nums leading-none", className)}>
      <span className="sr-only">{text}</span>
      <span aria-hidden className="inline-flex">
        {glyphs.map((g) =>
          g.isDigit ? (
            <Wheel delay={delay} digit={Number(g.char)} instant={instant} key={g.key} />
          ) : (
            <span className="inline-block h-[1.15em] leading-[1.15em]" key={g.key}>
              {g.char === " " ? " " : g.char}
            </span>
          ),
        )}
      </span>
    </span>
  );
}

export type ProjectStatus = "on-track" | "at-risk" | "off-track" | "done";

export interface ProjectMember {
  id: string;
  name: string;
}

export interface ProjectTask {
  id: string;
  title: string;
  assignee: string;
  done: boolean;
}

export interface ProjectPulseProps {
  name: string;
  due: string;
  members: ProjectMember[];
  tasks: ProjectTask[];
  defaultStatus?: ProjectStatus;
  defaultOpen?: boolean;
  onStatusChange?: (status: ProjectStatus) => void;
  onTasksChange?: (tasks: ProjectTask[]) => void;
  className?: string;
}

const STATUS: Record<ProjectStatus, { label: string; dot: string; chip: string }> = {
  "on-track": { label: "On track", dot: "bg-success", chip: "bg-success/10 text-success-foreground" },
  "at-risk": { label: "At risk", dot: "bg-warning", chip: "bg-warning/12 text-warning-foreground" },
  "off-track": { label: "Off track", dot: "bg-destructive", chip: "bg-destructive/10 text-destructive-foreground" },
  done: { label: "Done", dot: "bg-info", chip: "bg-info/10 text-info-foreground" },
};

type Tone = { stroke: string; fill: string; soft: string };
const PALETTE: Tone[] = [
  { stroke: "stroke-violet-500 dark:stroke-violet-400", fill: "bg-violet-500", soft: "bg-violet-500/16 text-violet-800 dark:text-violet-200" },
  { stroke: "stroke-sky-500 dark:stroke-sky-400", fill: "bg-sky-500", soft: "bg-sky-500/16 text-sky-800 dark:text-sky-200" },
  { stroke: "stroke-amber-500 dark:stroke-amber-400", fill: "bg-amber-500", soft: "bg-amber-500/18 text-amber-800 dark:text-amber-200" },
  { stroke: "stroke-emerald-500 dark:stroke-emerald-400", fill: "bg-emerald-500", soft: "bg-emerald-500/16 text-emerald-800 dark:text-emerald-200" },
  { stroke: "stroke-rose-500 dark:stroke-rose-400", fill: "bg-rose-500", soft: "bg-rose-500/16 text-rose-800 dark:text-rose-200" },
];

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function arc(cx: number, cy: number, r: number, start: number, end: number) {
  const toXY = (deg: number) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
  };
  const [x0, y0] = toXY(start);
  const [x1, y1] = toXY(end);
  const large = end - start > 180 ? 1 : 0;
  return `M${x0.toFixed(2)},${y0.toFixed(2)} A${r},${r} 0 ${large} 1 ${x1.toFixed(2)},${y1.toFixed(2)}`;
}

function SegmentRing({
  tasks,
  colorOf,
  focus,
  size = 48,
}: {
  tasks: ProjectTask[];
  colorOf: (id: string) => Tone;
  focus: string | null;
  size?: number;
}) {
  const reduce = useReducedMotion();
  const stroke = 4.5;
  const r = (size - stroke) / 2;
  const c = size / 2;
  const n = Math.max(tasks.length, 1);
  const step = 360 / n;
  const gap = Math.min(10, 160 / n);
  return (
    <svg aria-hidden className="shrink-0" height={size} viewBox={`0 0 ${size} ${size}`} width={size}>
      {tasks.map((task, i) => {
        const d = arc(c, c, r, i * step + gap / 2, (i + 1) * step - gap / 2);
        const faded = focus !== null && task.assignee !== focus;
        return (
          <g key={task.id}>
            <path className="stroke-muted-foreground/20" d={d} fill="none" strokeLinecap="round" strokeWidth={stroke} />
            <motion.path
              animate={{ pathLength: task.done ? 1 : 0, opacity: task.done ? (faded ? 0.25 : 1) : 0 }}
              className={colorOf(task.assignee).stroke}
              d={d}
              fill="none"
              initial={false}
              strokeLinecap="round"
              strokeWidth={stroke}
              transition={reduce ? { duration: 0 } : { type: "spring", duration: 0.5, bounce: 0 }}
            />
          </g>
        );
      })}
    </svg>
  );
}

export function ProjectPulse({
  name,
  due,
  members,
  tasks: initialTasks,
  defaultStatus = "on-track",
  defaultOpen = false,
  onStatusChange,
  onTasksChange,
  className,
}: ProjectPulseProps) {
  const reduce = useReducedMotion();
  const uid = useId().replace(/:/g, "");
  const [tasks, setTasks] = useState(initialTasks);
  const [status, setStatus] = useState<ProjectStatus>(defaultStatus);
  const [filter, setFilter] = useState<string | null>(null);
  const [open, setOpen] = useState(defaultOpen);

  const colorOf = (id: string) => PALETTE[Math.max(0, members.findIndex((m) => m.id === id)) % PALETTE.length];
  const memberOf = (id: string) => members.find((m) => m.id === id);
  const done = tasks.filter((t) => t.done).length;
  const visible = filter ? tasks.filter((t) => t.assignee === filter) : tasks;
  const spring = reduce ? { duration: 0 } : { type: "spring" as const, stiffness: 300, damping: 30 };

  const toggleTask = (id: string) => {
    const next = tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
    setTasks(next);
    onTasksChange?.(next);
  };

  const meta = STATUS[status];

  return (
    <div
      className={cn("w-[440px] max-w-full rounded-2xl border bg-card text-card-foreground shadow-xs/5", className)}
    >
      <div className="flex items-center gap-3 p-4">
        <div className="relative">
          <SegmentRing colorOf={colorOf} focus={filter} tasks={tasks} />
          <span className="absolute inset-0 flex items-center justify-center font-medium text-[11px] tabular-nums">
            <Roll text={`${Math.round((done / Math.max(tasks.length, 1)) * 100)}%`} />
          </span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <button
            aria-controls={`${uid}-body`}
            aria-expanded={open}
            className="min-w-0 cursor-pointer truncate rounded-sm text-left font-medium text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => setOpen((o) => !o)}
            type="button"
          >
            {name}
          </button>
          <div className="flex items-center gap-2.5 text-muted-foreground text-xs">
            <Menu>
              <MenuTrigger
                aria-label={`Status: ${meta.label}`}
                className={cn(
                  "inline-flex h-5 shrink-0 items-center gap-1.5 rounded-full px-2 font-medium text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                  meta.chip,
                )}
              >
                <motion.span
                  animate={{ scale: [1.6, 1] }}
                  className={cn("size-1.5 rounded-full", meta.dot)}
                  key={status}
                  transition={reduce ? { duration: 0 } : { duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
                />
                {meta.label}
                <ChevronDownIcon className="size-3 opacity-70" />
              </MenuTrigger>
              <MenuPopup align="start" className="min-w-40">
                <MenuGroup>
                  <MenuGroupLabel>Project status</MenuGroupLabel>
                  <MenuRadioGroup
                    onValueChange={(v) => {
                      setStatus(v as ProjectStatus);
                      onStatusChange?.(v as ProjectStatus);
                    }}
                    value={status}
                  >
                    {(Object.keys(STATUS) as ProjectStatus[]).map((key) => (
                      <MenuRadioItem closeOnClick key={key} value={key}>
                        <span className="flex items-center gap-2">
                          <span className={cn("size-2 rounded-full", STATUS[key].dot)} />
                          {STATUS[key].label}
                        </span>
                      </MenuRadioItem>
                    ))}
                  </MenuRadioGroup>
                </MenuGroup>
              </MenuPopup>
            </Menu>
            <span className="inline-flex items-center gap-1 whitespace-nowrap">
              <Roll className="font-medium text-foreground" text={String(done)} />
              <span>of {tasks.length} tasks</span>
            </span>
            <span className="inline-flex items-center gap-1 whitespace-nowrap">
              <CalendarIcon className="size-3" />
              {due}
            </span>
          </div>
        </div>
        <AvatarGroup className="hidden [--avatar-size:--spacing(6)] sm:flex">
          {members.slice(0, 3).map((m) => (
            <Avatar key={m.id}>
              <AvatarFallback className={cn("text-[9px]", colorOf(m.id).soft)}>
                {initials(m.name)}
              </AvatarFallback>
            </Avatar>
          ))}
          {members.length > 3 && <AvatarGroupCount className="text-[9px]">+{members.length - 3}</AvatarGroupCount>}
        </AvatarGroup>
        <button
          aria-controls={`${uid}-body`}
          aria-expanded={open}
          aria-label={open ? "Hide tasks" : "Show tasks"}
          className="-me-1 flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => setOpen((o) => !o)}
          type="button"
        >
          <motion.span animate={{ rotate: open ? 180 : 0 }} className="inline-flex" transition={spring}>
            <ChevronDownIcon className="size-4" />
          </motion.span>
        </button>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            animate={{ height: "auto", opacity: 1 }}
            className="overflow-hidden"
            exit={{ height: 0, opacity: 0 }}
            id={`${uid}-body`}
            initial={{ height: 0, opacity: 0 }}
            transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 32 }}
          >
            <div className="flex flex-col gap-3 border-t px-4 pt-3 pb-4">
              <div aria-label="Filter by assignee" className="flex items-center gap-1.5" role="group">
                <button
                  aria-pressed={filter === null}
                  className={cn(
                    "relative h-7 rounded-full px-2.5 font-medium text-xs outline-none transition-[background-color,color,transform] duration-150 ease-out after:absolute after:-inset-0.5 focus-visible:ring-2 focus-visible:ring-ring motion-safe:active:scale-[0.97]",
                    filter === null ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() => setFilter(null)}
                  type="button"
                >
                  Everyone
                </button>
                {members.map((m) => {
                  const active = filter === m.id;
                  const count = tasks.filter((t) => t.assignee === m.id && !t.done).length;
                  return (
                    <motion.button
                      animate={{ opacity: filter && !active ? 0.45 : 1, scale: active ? 1.08 : 1 }}
                      aria-label={`${m.name}, ${count} open`}
                      aria-pressed={active}
                      className="relative rounded-full outline-none after:absolute after:-inset-0.5 after:rounded-full focus-visible:ring-2 focus-visible:ring-ring"
                      key={m.id}
                      onClick={() => setFilter(active ? null : m.id)}
                      title={m.name}
                      transition={spring}
                      type="button"
                    >
                      <Avatar className={cn("[--avatar-size:--spacing(7)]", active && "ring-2 ring-foreground/70 ring-offset-2 ring-offset-card")}>
                        <AvatarFallback className={cn("font-medium text-[10px]", colorOf(m.id).soft)}>
                          {initials(m.name)}
                        </AvatarFallback>
                      </Avatar>
                      {count > 0 && (
                        <span className="absolute -top-1 -right-1 flex size-3.5 items-center justify-center rounded-full border border-card bg-foreground font-medium text-[8px] text-background tabular-nums">
                          {count}
                        </span>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              <motion.ul className="flex flex-col" layout={!reduce} transition={spring}>
                <AnimatePresence initial={false} mode="popLayout">
                  {visible.map((task) => {
                    const member = memberOf(task.assignee);
                    return (
                      <motion.li
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        initial={{ opacity: 0, y: 6 }}
                        key={task.id}
                        layout={!reduce}
                        transition={spring}
                      >
                        <button
                          aria-pressed={task.done}
                          className="group flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-left outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                          onClick={() => toggleTask(task.id)}
                          type="button"
                        >
                          <span
                            className={cn(
                              "flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors",
                              task.done ? cn("border-transparent text-white", colorOf(task.assignee).fill) : "border-input",
                            )}
                          >
                            <AnimatePresence initial={false}>
                              {task.done && (
                                <motion.span
                                  animate={{ opacity: 1, scale: 1 }}
                                  className="inline-flex"
                                  exit={{ opacity: 0, scale: 0.6 }}
                                  initial={{ opacity: 0, scale: 0.6 }}
                                  transition={reduce ? { duration: 0 } : { type: "spring", duration: 0.2, bounce: 0 }}
                                >
                                  <CheckIcon className="size-2.5" strokeWidth={3} />
                                </motion.span>
                              )}
                            </AnimatePresence>
                          </span>
                          <span
                            className={cn(
                              "flex-1 truncate text-sm transition-colors",
                              task.done && "text-muted-foreground line-through decoration-muted-foreground/50",
                            )}
                          >
                            {task.title}
                          </span>
                          <span className="text-muted-foreground text-xs">{member?.name.split(" ")[0]}</span>
                        </button>
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </motion.ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
