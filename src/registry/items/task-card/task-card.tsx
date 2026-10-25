"use client";

import {
  AlertTriangleIcon,
  ArchiveIcon,
  CalendarIcon,
  CheckIcon,
  ChevronDownIcon,
  CopyIcon,
  LinkIcon,
  MessageSquareIcon,
  MoreHorizontalIcon,
  PaperclipIcon,
  Undo2Icon,
  UserPlusIcon,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Menu,
  MenuCheckboxItem,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuShortcut,
  MenuTrigger,
} from "@/components/ui/menu";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type TaskTone = "violet" | "sky" | "emerald" | "amber" | "rose" | "slate";
export type TaskPriority = "none" | "low" | "medium" | "high" | "urgent";

export interface TaskLabel {
  name: string;
  tone: TaskTone;
}

export interface TaskPerson {
  id: string;
  name: string;
  initials: string;
  tone?: TaskTone;
}

export interface TaskChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface Task {
  id: string;
  title: string;
  priority?: TaskPriority;
  labels?: TaskLabel[];
  assignees?: string[];
  checklist?: TaskChecklistItem[];
  due?: Date | string | null;
  comments?: number;
  attachments?: number;
}

export type TaskCardAction = "copy-link" | "duplicate" | "archive" | "restore";

export interface TaskCardProps {
  task: Task;
  people?: TaskPerson[];
  now?: Date;
  defaultExpanded?: boolean;
  onChange?: (task: Task) => void;
  onAction?: (action: TaskCardAction, task: Task) => void;
  className?: string;
}

const labelTones: Record<TaskTone, { chip: string; dot: string }> = {
  violet: { chip: "bg-violet-500/10 text-violet-700 dark:bg-violet-500/16 dark:text-violet-300", dot: "bg-violet-500" },
  sky: { chip: "bg-sky-500/10 text-sky-700 dark:bg-sky-500/16 dark:text-sky-300", dot: "bg-sky-500" },
  emerald: {
    chip: "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/16 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  amber: { chip: "bg-amber-500/12 text-amber-700 dark:bg-amber-500/16 dark:text-amber-300", dot: "bg-amber-500" },
  rose: { chip: "bg-rose-500/10 text-rose-700 dark:bg-rose-500/16 dark:text-rose-300", dot: "bg-rose-500" },
  slate: { chip: "bg-muted text-muted-foreground", dot: "bg-muted-foreground" },
};

const personTones: Record<TaskTone, string> = {
  violet: "bg-violet-500 text-white",
  sky: "bg-sky-600 text-white",
  emerald: "bg-emerald-600 text-white",
  amber: "bg-amber-500 text-white",
  rose: "bg-rose-500 text-white",
  slate: "bg-muted-foreground text-background",
};

const priorityLabel: Record<TaskPriority, string> = {
  none: "No priority",
  low: "Low priority",
  medium: "Medium priority",
  high: "High priority",
  urgent: "Urgent",
};

const DAY = 86_400_000;
const quick =
  "text-muted-foreground transition-[scale,background-color] duration-150 ease-out after:absolute after:inset-x-0 after:-inset-y-1 active:scale-[0.94]";
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const toDate = (d: Date | string | null | undefined) => (d == null ? null : d instanceof Date ? d : new Date(d));
const shortDate = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

type DueState = { key: string; label: string; tone: string; Icon: typeof CalendarIcon; hint: string };

function dueState(due: Date | null, now: Date, complete: boolean): DueState | null {
  if (!due) return null;
  const diff = Math.round((startOfDay(due) - startOfDay(now)) / DAY);
  const date = shortDate(due);
  if (complete) {
    return {
      key: "done",
      label: date,
      tone: "bg-success/10 text-success-foreground dark:bg-success/16",
      Icon: CheckIcon,
      hint: `Checklist complete, due ${date}`,
    };
  }
  if (diff <= -3) {
    return {
      key: "overdue",
      label: `${-diff}d late`,
      tone: "bg-destructive/10 text-destructive-foreground dark:bg-destructive/16",
      Icon: AlertTriangleIcon,
      hint: `Was due ${date}`,
    };
  }
  if (diff < 0) {
    return {
      key: "late",
      label: `${-diff}d late`,
      tone: "bg-warning/12 text-warning-foreground dark:bg-warning/16",
      Icon: AlertTriangleIcon,
      hint: `Was due ${date}`,
    };
  }
  if (diff === 0) {
    return { key: "today", label: "Today", tone: "bg-info/10 text-info-foreground dark:bg-info/16", Icon: CalendarIcon, hint: `Due today, ${date}` };
  }
  if (diff === 1) {
    return { key: "soon", label: "Tomorrow", tone: "bg-muted text-foreground", Icon: CalendarIcon, hint: `Due ${date}` };
  }
  return { key: "later", label: date, tone: "bg-muted text-muted-foreground", Icon: CalendarIcon, hint: `Due ${date}` };
}

function PriorityGlyph({ level }: { level: TaskPriority }) {
  if (level === "urgent") {
    return (
      <span className="flex size-4 items-center justify-center rounded-[4px] bg-destructive font-bold text-[10px] text-white leading-none">
        !
      </span>
    );
  }
  const filled = { none: 0, low: 1, medium: 2, high: 3 }[level];
  return (
    <svg aria-hidden className="size-4" viewBox="0 0 16 16">
      {[0, 1, 2].map((i) => (
        <rect
          className={i < filled ? "fill-foreground/80" : "fill-foreground/16"}
          height={4 + i * 3}
          key={i}
          rx={1}
          width={3}
          x={2.5 + i * 4}
          y={12.5 - (4 + i * 3)}
        />
      ))}
    </svg>
  );
}

function RollingCount({ value, reduce }: { value: number; reduce: boolean | null }) {
  return (
    <span className="relative inline-flex overflow-hidden tabular-nums">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          animate={{ y: 0, opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { y: "-100%", opacity: 0 }}
          initial={reduce ? { opacity: 0 } : { y: "100%", opacity: 0 }}
          key={value}
          transition={{ type: "spring", stiffness: 500, damping: 34 }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function ProgressRing({ value, complete, reduce }: { value: number; complete: boolean; reduce: boolean | null }) {
  const r = 6.5;
  return (
    <span className="relative flex size-4 shrink-0 items-center justify-center">
      <svg aria-hidden className="size-4 -rotate-90" viewBox="0 0 16 16">
        <circle className="stroke-foreground/12" cx={8} cy={8} fill="none" r={r} strokeWidth={2} />
        <motion.circle
          animate={{ pathLength: value }}
          className={cn("transition-colors duration-300", complete ? "stroke-success" : "stroke-foreground/72")}
          cx={8}
          cy={8}
          fill="none"
          initial={false}
          r={r}
          strokeLinecap="round"
          strokeWidth={2}
          transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 220, damping: 26 }}
        />
      </svg>
    </span>
  );
}

export function TaskCard({
  task,
  people = [],
  now: nowProp,
  defaultExpanded = false,
  onChange,
  onAction,
  className,
}: TaskCardProps) {
  const reduce = useReducedMotion();
  const listId = useId();
  const [now] = useState(() => nowProp ?? new Date());
  const [checklist, setChecklist] = useState<TaskChecklistItem[]>(task.checklist ?? []);
  const [assignees, setAssignees] = useState<string[]>(task.assignees ?? []);
  const [due, setDue] = useState<Date | null>(toDate(task.due));
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [archived, setArchived] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const archiveRef = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLElement>(null);

  useEffect(() => () => clearTimeout(copyTimer.current), []);

  const done = checklist.filter((i) => i.done).length;
  const total = checklist.length;
  const complete = total > 0 && done === total;
  const dueInfo = dueState(due, nowProp ?? now, complete);
  const peopleById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const assigned = assignees.map((id) => peopleById.get(id)).filter((p): p is TaskPerson => Boolean(p));
  const current = (patch: Partial<Task>): Task => ({ ...task, checklist, assignees, due, ...patch });

  const spring = reduce ? { duration: 0 } : { type: "spring" as const, stiffness: 420, damping: 34 };

  const toggleItem = (id: string) => {
    const next = checklist.map((i) => (i.id === id ? { ...i, done: !i.done } : i));
    setChecklist(next);
    onChange?.(current({ checklist: next }));
  };

  const toggleAssignee = (id: string, on: boolean) => {
    const next = on ? [...assignees.filter((a) => a !== id), id] : assignees.filter((a) => a !== id);
    setAssignees(next);
    onChange?.(current({ assignees: next }));
  };

  const setDueIn = (days: number | null) => {
    const next = days == null ? null : new Date(startOfDay(nowProp ?? now) + days * DAY);
    setDue(next);
    onChange?.(current({ due: next }));
  };

  const action = (a: TaskCardAction) => {
    if (a === "copy-link") {
      navigator.clipboard?.writeText(`#${task.id}`).catch(() => {});
      setCopied(true);
      clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 1600);
    }
    if (a === "archive") {
      setArchived(true);
      requestAnimationFrame(() => archiveRef.current?.focus());
    }
    if (a === "restore") {
      setArchived(false);
      requestAnimationFrame(() => cardRef.current?.focus());
    }
    onAction?.(a, current({}));
  };

  const menuProps = (name: string) => ({
    open: openMenu === name,
    onOpenChange: (open: boolean) => setOpenMenu((o) => (open ? name : o === name ? null : o)),
  });

  const priority = task.priority ?? "none";

  return (
    <motion.div
      className={cn("w-full max-w-[340px]", className)}
      layout={!reduce}
      style={{ borderRadius: 16 }}
      transition={spring}
    >
      <AnimatePresence initial={false} mode="popLayout">
        {archived ? (
          <motion.div
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 rounded-2xl border border-dashed bg-card/60 px-3 py-2.5 text-muted-foreground text-xs"
            exit={{ opacity: 0, scale: 0.98 }}
            initial={{ opacity: 0, scale: 0.98 }}
            key="archived"
            transition={spring}
          >
            <ArchiveIcon className="size-3.5" />
            <span className="min-w-0 flex-1 truncate">
              <span className="font-mono">{task.id}</span> archived
            </span>
            <Button onClick={() => action("restore")} ref={archiveRef} size="xs" variant="ghost">
              <Undo2Icon />
              Undo
            </Button>
          </motion.div>
        ) : (
          <motion.article
            animate={{ opacity: 1, scale: 1 }}
            aria-label={task.title}
            className="group/card relative rounded-2xl border bg-card p-3.5 text-card-foreground shadow-xs/5 outline-none transition-[border-color,box-shadow] hover:border-foreground/16 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            exit={{ opacity: 0, scale: 0.98 }}
            initial={{ opacity: 0, scale: 0.98 }}
            key="card"
            ref={cardRef}
            tabIndex={0}
            transition={spring}
          >
            <header className="flex h-6 items-center gap-1.5 pe-24">
              <Tooltip>
                <TooltipTrigger
                  render={<span aria-label={priorityLabel[priority]} className="flex text-foreground" role="img" />}
                >
                  <PriorityGlyph level={priority} />
                </TooltipTrigger>
                <TooltipPopup>{priorityLabel[priority]}</TooltipPopup>
              </Tooltip>
              <AnimatePresence initial={false} mode="popLayout">
                <motion.span
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "inline-flex items-center gap-1 font-mono text-xs",
                    copied ? "text-success-foreground" : "text-muted-foreground",
                  )}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
                  initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
                  key={copied ? "copied" : "id"}
                  transition={{ duration: 0.16 }}
                >
                  {copied ? (
                    <>
                      <CheckIcon className="size-3" /> Link copied
                    </>
                  ) : (
                    task.id
                  )}
                </motion.span>
              </AnimatePresence>
            </header>

            <div
              className={cn(
                "absolute end-2.5 top-2.5 flex items-center gap-0.5 rounded-lg border bg-popover p-0.5 shadow-xs/5 transition-[opacity,translate,scale] duration-200 ease-out",
                "pointer-events-none translate-y-0.5 scale-95 opacity-0",
                "group-focus-within/card:pointer-events-auto group-focus-within/card:translate-y-0 group-focus-within/card:scale-100 group-focus-within/card:opacity-100",
                "group-hover/card:pointer-events-auto group-hover/card:translate-y-0 group-hover/card:scale-100 group-hover/card:opacity-100",
                "pointer-coarse:pointer-events-auto pointer-coarse:translate-y-0 pointer-coarse:scale-100 pointer-coarse:opacity-100",
                openMenu && "pointer-events-auto translate-y-0 scale-100 opacity-100",
                "motion-reduce:transition-opacity",
              )}
              data-slot="quick-actions"
            >
              <Menu {...menuProps("assign")}>
                <MenuTrigger
                  render={<Button aria-label="Assign people" className={quick} size="icon-xs" variant="ghost" />}
                >
                  <UserPlusIcon />
                </MenuTrigger>
                <MenuPopup align="end" className="w-48">
                  <MenuGroup>
                    <MenuGroupLabel>Assign to</MenuGroupLabel>
                    {people.map((p) => (
                      <MenuCheckboxItem
                        checked={assignees.includes(p.id)}
                        closeOnClick={false}
                        key={p.id}
                        onCheckedChange={(on) => toggleAssignee(p.id, on)}
                      >
                        <span className="flex items-center gap-2">
                          <Avatar className="[--avatar-size:--spacing(5)]">
                            <AvatarFallback className={cn("text-[9px]", personTones[p.tone ?? "slate"])}>
                              {p.initials}
                            </AvatarFallback>
                          </Avatar>
                          {p.name}
                        </span>
                      </MenuCheckboxItem>
                    ))}
                  </MenuGroup>
                </MenuPopup>
              </Menu>

              <Menu {...menuProps("due")}>
                <MenuTrigger
                  render={<Button aria-label="Set due date" className={quick} size="icon-xs" variant="ghost" />}
                >
                  <CalendarIcon />
                </MenuTrigger>
                <MenuPopup align="end" className="w-48">
                  <MenuGroup>
                    <MenuGroupLabel>Due date</MenuGroupLabel>
                    {[
                      { label: "Today", days: 0 },
                      { label: "Tomorrow", days: 1 },
                      { label: "Next week", days: 7 },
                    ].map((o) => (
                      <MenuItem key={o.label} onClick={() => setDueIn(o.days)}>
                        {o.label}
                        <MenuShortcut className="tracking-normal">
                          {shortDate(new Date(startOfDay(nowProp ?? now) + o.days * DAY))}
                        </MenuShortcut>
                      </MenuItem>
                    ))}
                  </MenuGroup>
                  <MenuSeparator />
                  <MenuItem disabled={!due} onClick={() => setDueIn(null)}>
                    Clear due date
                  </MenuItem>
                </MenuPopup>
              </Menu>

              <Menu {...menuProps("more")}>
                <MenuTrigger
                  render={<Button aria-label="More actions" className={quick} size="icon-xs" variant="ghost" />}
                >
                  <MoreHorizontalIcon />
                </MenuTrigger>
                <MenuPopup align="end" className="w-44">
                  <MenuItem onClick={() => action("copy-link")}>
                    <LinkIcon />
                    Copy link
                  </MenuItem>
                  <MenuItem onClick={() => action("duplicate")}>
                    <CopyIcon />
                    Duplicate
                  </MenuItem>
                  <MenuSeparator />
                  <MenuItem onClick={() => action("archive")} variant="destructive">
                    <ArchiveIcon />
                    Archive
                  </MenuItem>
                </MenuPopup>
              </Menu>
            </div>

            <h3 className="mt-1.5 text-pretty font-medium text-sm leading-snug">{task.title}</h3>

            {task.labels && task.labels.length > 0 && (
              <ul aria-label="Labels" className="mt-2.5 flex flex-wrap gap-1">
                {task.labels.map((l) => (
                  <li
                    className={cn(
                      "inline-flex h-5 items-center gap-1.5 rounded-full px-2 font-medium text-xs",
                      labelTones[l.tone].chip,
                    )}
                    key={l.name}
                  >
                    <span aria-hidden className={cn("size-1.5 rounded-full", labelTones[l.tone].dot)} />
                    {l.name}
                  </li>
                ))}
              </ul>
            )}

            {total > 0 && (
              <div className="mt-3 rounded-xl bg-muted/60 dark:bg-muted/40">
                <button
                  aria-controls={listId}
                  aria-expanded={expanded}
                  className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 text-left outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => setExpanded((e) => !e)}
                  type="button"
                >
                  <ProgressRing complete={complete} reduce={reduce} value={total ? done / total : 0} />
                  <span className="font-medium text-xs">Checklist</span>
                  <span className="relative h-1 flex-1 overflow-hidden rounded-full bg-foreground/10">
                    <motion.span
                      animate={{ scaleX: total ? done / total : 0 }}
                      className={cn(
                        "absolute inset-0 origin-left rounded-full transition-colors duration-300",
                        complete ? "bg-success" : "bg-foreground/60",
                      )}
                      initial={false}
                      transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 220, damping: 26 }}
                    />
                  </span>
                  <span className="inline-flex text-muted-foreground text-xs tabular-nums">
                    <RollingCount reduce={reduce} value={done} />/{total}
                  </span>
                  <ChevronDownIcon
                    className={cn(
                      "size-3.5 text-muted-foreground transition-transform duration-200",
                      expanded && "rotate-180",
                    )}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {expanded && (
                    <motion.div
                      animate={{ height: "auto", opacity: 1 }}
                      className="overflow-hidden"
                      exit={{ height: 0, opacity: 0 }}
                      id={listId}
                      initial={{ height: 0, opacity: 0 }}
                      transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 36 }}
                    >
                      <ul className="flex flex-col gap-0.5 px-1 pb-1.5">
                        {checklist.map((item) => (
                          <li key={item.id}>
                            <label className="flex cursor-pointer items-start gap-2.5 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-background/70 dark:hover:bg-background/40">
                              <Checkbox
                                checked={item.done}
                                className="mt-px"
                                onCheckedChange={() => toggleItem(item.id)}
                              />
                              <span
                                className={cn(
                                  "relative text-xs leading-4 transition-colors duration-200",
                                  item.done ? "text-muted-foreground" : "text-foreground",
                                )}
                              >
                                {item.text}
                                <motion.span
                                  animate={{ scaleX: item.done ? 1 : 0 }}
                                  aria-hidden
                                  className="absolute inset-x-0 top-1/2 h-px origin-left bg-muted-foreground/70"
                                  initial={false}
                                  transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 30 }}
                                />
                              </span>
                            </label>
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            <footer className="mt-3 flex h-6 items-center gap-3 text-muted-foreground text-xs">
              <AnimatePresence initial={false} mode="popLayout">
                {dueInfo && (
                  <motion.span
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex"
                    exit={{ opacity: 0, scale: 0.9 }}
                    initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
                    key={dueInfo.key + dueInfo.label}
                    layout={!reduce}
                    transition={spring}
                  >
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <span
                            aria-label={dueInfo.hint}
                            className={cn(
                              "inline-flex h-6 items-center gap-1 rounded-full px-2 font-medium tabular-nums",
                              dueInfo.tone,
                            )}
                            role="img"
                          />
                        }
                      >
                        <dueInfo.Icon className="size-3.5" />
                        {dueInfo.label}
                      </TooltipTrigger>
                      <TooltipPopup>{dueInfo.hint}</TooltipPopup>
                    </Tooltip>
                  </motion.span>
                )}
              </AnimatePresence>
              {(task.comments ?? 0) > 0 && (
                <motion.span
                  className="inline-flex items-center gap-1 tabular-nums"
                  layout={!reduce ? "position" : false}
                  transition={spring}
                >
                  <MessageSquareIcon aria-hidden className="size-3.5" />
                  {task.comments}
                  <span className="sr-only">comments</span>
                </motion.span>
              )}
              {(task.attachments ?? 0) > 0 && (
                <motion.span
                  className="inline-flex items-center gap-1 tabular-nums"
                  layout={!reduce ? "position" : false}
                  transition={spring}
                >
                  <PaperclipIcon aria-hidden className="size-3.5" />
                  {task.attachments}
                  <span className="sr-only">attachments</span>
                </motion.span>
              )}
              <ul aria-label="Assignees" className="-me-0.5 ms-auto flex items-center">
                <AnimatePresence initial={false} mode="popLayout">
                  {assigned.length === 0 && (
                    <motion.li
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      initial={{ opacity: 0 }}
                      key="none"
                      transition={{ duration: 0.15 }}
                    >
                      <span className="flex size-6 items-center justify-center rounded-full border border-dashed border-muted-foreground/40">
                        <UserPlusIcon className="size-3" />
                        <span className="sr-only">Unassigned</span>
                      </span>
                    </motion.li>
                  )}
                  {assigned.map((p, i) => (
                    <motion.li
                      animate={{ opacity: 1, scale: 1 }}
                      className={cn("relative rounded-full bg-card p-0.5", i > 0 && "-ms-2")}
                      exit={{ opacity: 0, scale: 0.85 }}
                      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.85 }}
                      key={p.id}
                      layout={!reduce}
                      style={{ zIndex: assigned.length - i }}
                      transition={spring}
                    >
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Avatar
                              aria-label={p.name}
                              className="[--avatar-size:--spacing(6)]"
                              role="img"
                            />
                          }
                        >
                          <AvatarFallback className={cn("text-[10px]", personTones[p.tone ?? "slate"])}>
                            {p.initials}
                          </AvatarFallback>
                        </TooltipTrigger>
                        <TooltipPopup>{p.name}</TooltipPopup>
                      </Tooltip>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            </footer>
          </motion.article>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
