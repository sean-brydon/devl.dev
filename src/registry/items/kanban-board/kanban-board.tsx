"use client";

import {
  CalendarIcon,
  CheckSquareIcon,
  GripVerticalIcon,
  MessageSquareIcon,
  PlusIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";
import { AnimatePresence, LayoutGroup, animate, motion, useMotionValue, useReducedMotion } from "motion/react";
import {
  type FormEvent,
  type KeyboardEvent,
  type PointerEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type LabelTone = "gray" | "blue" | "green" | "amber" | "red";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface BoardLabel {
  id: string;
  name: string;
  tone: LabelTone;
}

export interface BoardColumn {
  id: string;
  title: string;
  tone?: LabelTone;
}

export interface BoardTask {
  id: string;
  title: string;
  column: string;
  labels: string[];
  priority?: TaskPriority;
  assignee?: string;
  due?: string;
  description?: string;
  checklist?: { id: string; text: string; done: boolean }[];
  comments?: number;
}

export interface KanbanBoardProps {
  columns: BoardColumn[];
  labels: BoardLabel[];
  tasks: BoardTask[];
  onTasksChange?: (tasks: BoardTask[]) => void;
  className?: string;
}

const toneBg: Record<LabelTone, string> = {
  gray: "bg-muted-foreground/60",
  blue: "bg-info",
  green: "bg-success",
  amber: "bg-warning",
  red: "bg-destructive",
};
const toneSoft: Record<LabelTone, string> = {
  gray: "bg-muted-foreground/12",
  blue: "bg-info/12",
  green: "bg-success/12",
  amber: "bg-warning/16",
  red: "bg-destructive/12",
};
const avatarTones = [
  "bg-info/16 text-info-foreground",
  "bg-success/16 text-success-foreground",
  "bg-warning/20 text-warning-foreground",
  "bg-destructive/14 text-destructive-foreground",
];
const priorities: TaskPriority[] = ["low", "medium", "high", "urgent"];
const spring = { type: "spring", stiffness: 520, damping: 40 } as const;
const glide = { type: "spring", stiffness: 380, damping: 39 } as const;
const hit = "relative after:absolute after:-inset-y-1 after:inset-x-0 after:content-['']";

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function avatarTone(name: string) {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return avatarTones[hash % avatarTones.length];
}

function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-full font-semibold text-[0.625rem]",
        avatarTone(name),
        className,
      )}
      title={name}
    >
      {initials(name)}
    </span>
  );
}

function PriorityBars({ priority }: { priority: TaskPriority }) {
  if (priority === "urgent") {
    return (
      <span
        aria-label="Urgent"
        className="flex size-4 items-center justify-center rounded-[4px] bg-destructive font-bold text-[0.625rem] text-white"
      >
        !
      </span>
    );
  }
  const level = priorities.indexOf(priority) + 1;
  return (
    <span aria-label={`${priority} priority`} className="flex h-3.5 items-end gap-0.5" role="img">
      {[1, 2, 3].map((bar) => (
        <span
          className={cn("w-[3px] rounded-full", bar <= level ? "bg-foreground/70" : "bg-foreground/16")}
          key={bar}
          style={{ height: `${bar * 4 + 2}px` }}
        />
      ))}
    </span>
  );
}

function CardBody({
  task,
  labels,
  compact,
}: {
  task: BoardTask;
  labels: BoardLabel[];
  compact: boolean;
}) {
  const taskLabels = task.labels
    .map((id) => labels.find((l) => l.id === id))
    .filter((l): l is BoardLabel => Boolean(l));
  const done = task.checklist?.filter((c) => c.done).length ?? 0;
  const total = task.checklist?.length ?? 0;

  if (compact) {
    return (
      <span className="flex items-center gap-2">
        <span className="flex shrink-0 gap-0.5">
          {taskLabels.map((l) => (
            <span className={cn("size-2 rounded-full", toneBg[l.tone])} key={l.id} title={l.name} />
          ))}
        </span>
        <span className="min-w-0 flex-1 truncate font-medium text-sm">{task.title}</span>
        {task.priority && <PriorityBars priority={task.priority} />}
        {task.assignee && <Avatar className="size-5 text-[0.5625rem]" name={task.assignee} />}
      </span>
    );
  }

  return (
    <span className="block">
      {taskLabels.length > 0 && (
        <span className="mb-2 flex flex-wrap gap-1">
          {taskLabels.map((l) => (
            <span
              className={cn("inline-flex items-center gap-1 rounded-full px-1.5 py-px font-medium text-[0.6875rem]", toneSoft[l.tone])}
              key={l.id}
            >
              <span className={cn("size-1.5 rounded-full", toneBg[l.tone])} />
              {l.name}
            </span>
          ))}
        </span>
      )}
      <span className="block text-pretty font-medium text-sm leading-snug">{task.title}</span>
      <span className="mt-3 flex items-center gap-3 text-muted-foreground text-xs">
        {task.priority && <PriorityBars priority={task.priority} />}
        {task.due && (
          <span className="inline-flex items-center gap-1">
            <CalendarIcon className="size-3.5" />
            {task.due}
          </span>
        )}
        {total > 0 && (
          <span className={cn("inline-flex items-center gap-1 tabular-nums", done === total && "text-success-foreground")}>
            <CheckSquareIcon className="size-3.5" />
            {done}/{total}
          </span>
        )}
        {!!task.comments && (
          <span className="inline-flex items-center gap-1 tabular-nums">
            <MessageSquareIcon className="size-3.5" />
            {task.comments}
          </span>
        )}
        {task.assignee && <Avatar className="ms-auto" name={task.assignee} />}
      </span>
    </span>
  );
}

function TaskDetail({
  task,
  columns,
  labels,
  onUpdate,
  onMove,
  onClose,
}: {
  task: BoardTask;
  columns: BoardColumn[];
  labels: BoardLabel[];
  onUpdate: (patch: Partial<BoardTask>) => void;
  onMove: (column: string) => void;
  onClose: () => void;
}) {
  const reduce = useReducedMotion();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [newItem, setNewItem] = useState("");
  const checklist = task.checklist ?? [];
  const done = checklist.filter((c) => c.done).length;

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  const addItem = (event: FormEvent) => {
    event.preventDefault();
    const text = newItem.trim();
    if (!text) return;
    onUpdate({ checklist: [...checklist, { id: `${task.id}-${Date.now()}`, text, done: false }] });
    setNewItem("");
  };

  return (
    <motion.aside
      animate={{ x: 0 }}
      aria-label={`Task details: ${task.title}`}
      aria-modal="true"
      className="absolute inset-y-0 right-0 z-30 flex w-full flex-col border-s bg-popover text-popover-foreground sm:w-[380px]"
      exit={{ x: "100%" }}
      initial={{ x: "100%" }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onClose();
        }
      }}
      role="dialog"
      transition={reduce ? { duration: 0 } : glide}
    >
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <span className="font-mono text-muted-foreground text-xs">{task.id.toUpperCase()}</span>
        <button
          aria-label="Close details"
          className="ms-auto inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground outline-none transition-[color,background-color,transform] duration-150 ease-out hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]"
          onClick={onClose}
          ref={closeRef}
          type="button"
        >
          <XIcon className="size-4" />
        </button>
      </div>
      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        <textarea
          aria-label="Task title"
          className="-mx-1 block w-[calc(100%+0.5rem)] resize-none text-balance rounded-lg bg-transparent px-1 font-semibold text-lg leading-snug outline-none [field-sizing:content] focus-visible:ring-2 focus-visible:ring-ring/40"
          onChange={(e) => onUpdate({ title: e.target.value.replace(/\n/g, " ") })}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.preventDefault();
          }}
          rows={1}
          value={task.title}
        />

        <fieldset>
          <legend className="mb-2 font-medium text-muted-foreground text-xs">Status</legend>
          <div className="flex flex-wrap gap-1 rounded-xl bg-muted p-1">
            {columns.map((col) => {
              const active = col.id === task.column;
              return (
                <button
                  aria-pressed={active}
                  className={cn(
                    "relative flex-1 cursor-pointer whitespace-nowrap rounded-lg px-2 py-1.5 font-medium text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                    active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                  key={col.id}
                  onClick={() => onMove(col.id)}
                  type="button"
                >
                  {active && (
                    <motion.span
                      className="absolute inset-0 rounded-lg bg-background shadow-xs/5"
                      layoutId="status-pill"
                      transition={reduce ? { duration: 0 } : spring}
                    />
                  )}
                  <span className="relative">{col.title}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 font-medium text-muted-foreground text-xs">Priority</legend>
          <div className="flex gap-1.5">
            {priorities.map((p) => (
              <button
                aria-pressed={task.priority === p}
                className={cn(
                  "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs capitalize outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                  task.priority === p ? "border-foreground/24 bg-accent font-medium" : "text-muted-foreground hover:bg-accent/60",
                )}
                key={p}
                onClick={() => onUpdate({ priority: p })}
                type="button"
              >
                <PriorityBars priority={p} />
                {p}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 font-medium text-muted-foreground text-xs">Labels</legend>
          <div className="flex flex-wrap gap-1.5">
            {labels.map((l) => {
              const on = task.labels.includes(l.id);
              return (
                <button
                  aria-pressed={on}
                  className={cn(
                    "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                    on ? cn("border-transparent font-medium", toneSoft[l.tone]) : "text-muted-foreground hover:bg-accent/60",
                  )}
                  key={l.id}
                  onClick={() =>
                    onUpdate({ labels: on ? task.labels.filter((id) => id !== l.id) : [...task.labels, l.id] })
                  }
                  type="button"
                >
                  <span className={cn("size-2 rounded-full", toneBg[l.tone])} />
                  {l.name}
                </button>
              );
            })}
          </div>
        </fieldset>

        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl border p-3">
            <dt className="text-muted-foreground text-xs">Assignee</dt>
            <dd className="mt-1.5 flex items-center gap-2 font-medium">
              {task.assignee ? (
                <>
                  <Avatar name={task.assignee} />
                  <span className="truncate">{task.assignee}</span>
                </>
              ) : (
                <span className="text-muted-foreground">Unassigned</span>
              )}
            </dd>
          </div>
          <div className="rounded-xl border p-3">
            <dt className="text-muted-foreground text-xs">Due</dt>
            <dd className="mt-1.5 flex items-center gap-2 font-medium">
              <CalendarIcon className="size-4 text-muted-foreground" />
              {task.due ?? "No date"}
            </dd>
          </div>
        </dl>

        <div>
          <label className="mb-2 block font-medium text-muted-foreground text-xs" htmlFor={`${task.id}-desc`}>
            Description
          </label>
          <Textarea
            id={`${task.id}-desc`}
            onChange={(e) => onUpdate({ description: e.target.value })}
            placeholder="Add more detail…"
            value={task.description ?? ""}
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-medium text-muted-foreground">Checklist</span>
            {checklist.length > 0 && (
              <span className="text-muted-foreground tabular-nums">
                {done}/{checklist.length}
              </span>
            )}
          </div>
          {checklist.length > 0 && (
            <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-muted">
              <motion.div
                animate={{ scaleX: done / checklist.length }}
                className="h-full origin-left rounded-full bg-success"
                initial={false}
                transition={reduce ? { duration: 0 } : spring}
              />
            </div>
          )}
          <ul className="space-y-1">
            {checklist.map((item) => (
              <li key={item.id}>
                <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1.5 py-1 text-sm hover:bg-accent/50">
                  <Checkbox
                    checked={item.done}
                    onCheckedChange={(checked) =>
                      onUpdate({
                        checklist: checklist.map((c) => (c.id === item.id ? { ...c, done: Boolean(checked) } : c)),
                      })
                    }
                  />
                  <span className={cn("transition-colors", item.done && "text-muted-foreground line-through")}>
                    {item.text}
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <form className="mt-2" onSubmit={addItem}>
            <InputGroup>
              <InputGroupAddon>
                <PlusIcon />
              </InputGroupAddon>
              <InputGroupInput
                aria-label="Add checklist item"
                onChange={(e) => setNewItem(e.target.value)}
                placeholder="Add an item"
                size="sm"
                value={newItem}
              />
            </InputGroup>
          </form>
        </div>
      </div>
    </motion.aside>
  );
}

interface DragState {
  id: string;
  width: number;
  height: number;
  over: string;
  dropping: boolean;
}

function placeTask(
  prev: BoardTask[],
  id: string,
  column: string,
  index: number,
  visible: (t: BoardTask) => boolean,
): BoardTask[] {
  const task = prev.find((t) => t.id === id);
  if (!task) return prev;
  const current = prev.filter((t) => t.column === column && visible(t));
  if (task.column === column && current.indexOf(task) === index) return prev;
  const without = prev.filter((t) => t.id !== id);
  const peers = without.filter((t) => t.column === column && visible(t));
  let at: number;
  if (index < peers.length) at = without.indexOf(peers[Math.max(0, index)]);
  else if (peers.length) at = without.indexOf(peers[peers.length - 1]) + 1;
  else {
    const same = without.filter((t) => t.column === column);
    at = same.length ? without.indexOf(same[same.length - 1]) + 1 : without.length;
  }
  const next = [...without];
  next.splice(at, 0, { ...task, column });
  return next;
}

export function KanbanBoard({ columns, labels, tasks: initialTasks, onTasksChange, className }: KanbanBoardProps) {
  const groupId = useId();
  const reduce = useReducedMotion();
  const [tasks, setTasks] = useState(initialTasks);
  const [query, setQuery] = useState("");
  const [activeLabels, setActiveLabels] = useState<string[]>([]);
  const [compact, setCompact] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [drag, setDrag] = useState<DragState | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const columnRefs = useRef<Record<string, HTMLElement | null>>({});
  const listRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const pending = useRef<{ id: string; x: number; y: number; el: HTMLElement; pointerId: number } | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const grab = useRef({ dx: 0, dy: 0 });
  const justDragged = useRef(false);
  const ox = useMotionValue(0);
  const oy = useMotionValue(0);
  const firstRender = useRef(true);
  const onTasksChangeRef = useRef(onTasksChange);
  onTasksChangeRef.current = onTasksChange;

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    onTasksChangeRef.current?.(tasks);
  }, [tasks]);

  const q = query.trim().toLowerCase();
  const matches = (t: BoardTask) =>
    (!q || t.title.toLowerCase().includes(q) || (t.description ?? "").toLowerCase().includes(q)) &&
    (activeLabels.length === 0 || t.labels.some((l) => activeLabels.includes(l)));
  const visible = (t: BoardTask) => matches(t) || t.id === drag?.id;

  const updateTask = (id: string, patch: Partial<BoardTask>) =>
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  const columnTitle = (id: string) => columns.find((c) => c.id === id)?.title ?? id;

  const moveToColumn = (id: string, column: string) => {
    setTasks((prev) => {
      const peers = prev.filter((t) => t.column === column && t.id !== id && matches(t));
      return placeTask(prev, id, column, peers.length, matches);
    });
    const task = tasks.find((t) => t.id === id);
    if (task) setAnnouncement(`Moved “${task.title}” to ${columnTitle(column)}`);
  };

  const refocus = (id: string) =>
    requestAnimationFrame(() =>
      rootRef.current?.querySelector<HTMLElement>(`[data-task-id="${id}"] [data-card]`)?.focus(),
    );

  const onCardKeyDown = (event: KeyboardEvent<HTMLButtonElement>, task: BoardTask) => {
    if (!event.shiftKey) return;
    const colIndex = columns.findIndex((c) => c.id === task.column);
    const peers = tasks.filter((t) => t.column === task.column && matches(t));
    const index = peers.indexOf(task);
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      const next = columns[colIndex + (event.key === "ArrowRight" ? 1 : -1)];
      if (!next) return;
      event.preventDefault();
      moveToColumn(task.id, next.id);
      refocus(task.id);
    } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      const target = index + (event.key === "ArrowDown" ? 1 : -1);
      if (target < 0 || target >= peers.length) return;
      event.preventDefault();
      setTasks((prev) => placeTask(prev, task.id, task.column, target, matches));
      setAnnouncement(`Moved “${task.title}” to position ${target + 1} in ${columnTitle(task.column)}`);
      refocus(task.id);
    }
  };

  const onCardPointerDown = (event: PointerEvent<HTMLElement>, id: string) => {
    if (event.button !== 0 || dragRef.current) return;
    const fromHandle = (event.target as HTMLElement).closest("[data-drag-handle]");
    if (event.pointerType !== "mouse" && !fromHandle) return;
    const el = (event.currentTarget as HTMLElement).closest<HTMLElement>("[data-task-id]");
    if (!el) return;
    pending.current = { id, x: event.clientX, y: event.clientY, el, pointerId: event.pointerId };
    if (fromHandle) beginDrag(event.clientX, event.clientY);
  };

  const beginDrag = (clientX: number, clientY: number) => {
    const p = pending.current;
    const root = rootRef.current;
    if (!p || !root) return;
    const rootRect = root.getBoundingClientRect();
    const rect = p.el.getBoundingClientRect();
    grab.current = { dx: clientX - rect.left, dy: clientY - rect.top };
    ox.set(rect.left - rootRect.left);
    oy.set(rect.top - rootRect.top);
    const task = tasks.find((t) => t.id === p.id);
    const state: DragState = { id: p.id, width: rect.width, height: rect.height, over: task?.column ?? "", dropping: false };
    dragRef.current = state;
    setDrag(state);
    try {
      root.setPointerCapture(p.pointerId);
    } catch {}
  };

  const hitTest = (clientX: number, clientY: number, id: string) => {
    let best: string | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const col of columns) {
      const el = columnRefs.current[col.id];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      const distance = clientX < r.left ? r.left - clientX : clientX > r.right ? clientX - r.right : 0;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = col.id;
      }
    }
    const list = best ? listRefs.current[best] : null;
    if (!best || !list) return;
    const listRect = list.getBoundingClientRect();
    const y = clientY - listRect.top + list.scrollTop;
    let index = 0;
    for (const card of list.querySelectorAll<HTMLElement>("[data-task-id]:not([data-placeholder])")) {
      if (card.offsetTop + card.offsetHeight / 2 < y) index++;
    }
    if (clientY > listRect.bottom - 36) list.scrollTop += 10;
    else if (clientY < listRect.top + 24) list.scrollTop -= 10;
    const column = best;
    if (dragRef.current && dragRef.current.over !== column) {
      dragRef.current = { ...dragRef.current, over: column };
      setDrag(dragRef.current);
    }
    setTasks((prev) => placeTask(prev, id, column, index, (t) => matches(t) || t.id === id));
  };

  const onRootPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const p = pending.current;
    if (!p || p.pointerId !== event.pointerId) return;
    if (!dragRef.current) {
      if (Math.hypot(event.clientX - p.x, event.clientY - p.y) < 5) return;
      beginDrag(event.clientX, event.clientY);
    }
    const d = dragRef.current;
    const root = rootRef.current;
    if (!d || d.dropping || !root) return;
    const rootRect = root.getBoundingClientRect();
    ox.set(event.clientX - rootRect.left - grab.current.dx);
    oy.set(event.clientY - rootRect.top - grab.current.dy);
    const scroller = scrollerRef.current;
    if (scroller) {
      const r = scroller.getBoundingClientRect();
      if (event.clientX > r.right - 48) scroller.scrollLeft += 14;
      else if (event.clientX < r.left + 48) scroller.scrollLeft -= 14;
    }
    hitTest(event.clientX, event.clientY, d.id);
  };

  const endDrag = () => {
    const d = dragRef.current;
    pending.current = null;
    if (!d || d.dropping) return;
    justDragged.current = true;
    setTimeout(() => {
      justDragged.current = false;
    }, 0);
    const root = rootRef.current;
    const placeholder = root?.querySelector<HTMLElement>("[data-placeholder]");
    const finish = () => {
      dragRef.current = null;
      setDrag(null);
      const task = tasks.find((t) => t.id === d.id);
      if (task) setAnnouncement(`Dropped “${task.title}” in ${columnTitle(d.over)}`);
    };
    if (!root || !placeholder || reduce) return finish();
    const rootRect = root.getBoundingClientRect();
    const rect = placeholder.getBoundingClientRect();
    dragRef.current = { ...d, dropping: true };
    setDrag(dragRef.current);
    Promise.all([
      animate(ox, rect.left - rootRect.left, glide),
      animate(oy, rect.top - rootRect.top, glide),
    ]).then(finish);
  };

  const submitDraft = (event: FormEvent, column: string) => {
    event.preventDefault();
    const title = draft.trim();
    if (!title) return;
    const id = `t-${Date.now().toString(36)}`;
    setTasks((prev) => {
      const first = prev.findIndex((t) => t.column === column);
      const next = [...prev];
      next.splice(first < 0 ? next.length : first, 0, { id, title, column, labels: [...activeLabels], priority: "medium" });
      return next;
    });
    setDraft("");
    setAnnouncement(`Added “${title}” to ${columnTitle(column)}`);
  };

  const selected = tasks.find((t) => t.id === selectedId) ?? null;
  const dragged = drag ? tasks.find((t) => t.id === drag.id) : null;

  return (
    <LayoutGroup id={groupId}>
      <div
        className={cn(
          "relative isolate mx-auto flex h-[680px] w-full max-w-[1100px] flex-col overflow-hidden rounded-2xl border bg-card",
          drag && "cursor-grabbing select-none",
          className,
        )}
        onPointerCancel={endDrag}
        onPointerMove={onRootPointerMove}
        onPointerUp={endDrag}
        ref={rootRef}
      >
        <div className="flex flex-wrap items-center gap-2 border-b p-3">
          <InputGroup className="min-w-0 flex-1 sm:w-56 sm:flex-none">
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
            <InputGroupInput
              aria-label="Search tasks"
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tasks"
              type="search"
              value={query}
            />
          </InputGroup>
          <div aria-label="Filter by label" className="order-last flex w-full gap-1.5 overflow-x-auto py-0.5 sm:order-none sm:w-auto sm:flex-1" role="group">
            {labels.map((l) => {
              const on = activeLabels.includes(l.id);
              return (
                <button
                  aria-pressed={on}
                  className={cn(
                    "inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                    hit,
                    on ? cn("border-transparent font-medium text-foreground", toneSoft[l.tone]) : "text-muted-foreground hover:bg-accent/60",
                  )}
                  key={l.id}
                  onClick={() => setActiveLabels((prev) => (on ? prev.filter((id) => id !== l.id) : [...prev, l.id]))}
                  type="button"
                >
                  <span className={cn("size-2 rounded-full", toneBg[l.tone])} />
                  {l.name}
                </button>
              );
            })}
            <AnimatePresence>
              {(activeLabels.length > 0 || q) && (
                <motion.button
                  animate={{ opacity: 1, scale: 1 }}
                  className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-full px-2 py-1 text-muted-foreground text-xs outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  exit={{ opacity: 0, scale: 0.95 }}
                  initial={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  onClick={() => {
                    setActiveLabels([]);
                    setQuery("");
                  }}
                  type="button"
                >
                  <XIcon className="size-3" />
                  Clear
                </motion.button>
              )}
            </AnimatePresence>
          </div>
          <label className="ms-auto flex shrink-0 cursor-pointer items-center gap-2 text-muted-foreground text-xs">
            Compact
            <Switch checked={compact} onCheckedChange={setCompact} />
          </label>
        </div>

        <motion.div
          className="flex min-h-0 flex-1 snap-x snap-mandatory scroll-px-2 gap-2 overflow-x-auto p-2 lg:snap-none"
          layoutScroll
          ref={scrollerRef}
        >
          {columns.map((col) => {
            const colTasks = tasks.filter((t) => t.column === col.id && visible(t));
            const total = tasks.filter((t) => t.column === col.id).length;
            const isOver = drag?.over === col.id;
            return (
              <section
                aria-label={col.title}
                className={cn(
                  "flex h-full w-[min(280px,82vw)] shrink-0 snap-start flex-col rounded-xl border bg-muted/60 transition-colors duration-150 lg:w-auto lg:min-w-0 lg:flex-1",
                  isOver && "border-foreground/16 bg-accent",
                )}
                key={col.id}
                ref={(el) => {
                  columnRefs.current[col.id] = el;
                }}
              >
                <header className="flex items-center gap-2 ps-3 pe-2 pt-2.5 pb-2">
                  <span className={cn("size-2 rounded-full", toneBg[col.tone ?? "gray"])} />
                  <h3 className="font-medium text-sm">{col.title}</h3>
                  <span className="rounded-full bg-background px-1.5 font-medium text-muted-foreground text-xs tabular-nums">
                    {colTasks.length === total ? total : `${colTasks.length}/${total}`}
                  </span>
                  <button
                    aria-label={`Add task to ${col.title}`}
                    className="relative ms-auto -me-1 inline-flex size-7 cursor-pointer items-center justify-center rounded-lg text-muted-foreground outline-none transition-[color,background-color,transform] duration-150 ease-out after:absolute after:-inset-0.5 after:content-[''] hover:bg-background hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]"
                    onClick={() => {
                      setAddingTo(addingTo === col.id ? null : col.id);
                      setDraft("");
                    }}
                    type="button"
                  >
                    <PlusIcon className="size-4" />
                  </button>
                </header>
                <motion.div
                  className="relative min-h-0 flex-1 overflow-y-auto px-1.5 pb-1.5"
                  layoutScroll
                  ref={(el) => {
                    listRefs.current[col.id] = el;
                  }}
                >
                  <AnimatePresence initial={false}>
                    {addingTo === col.id && (
                      <motion.form
                        animate={{ opacity: 1, height: "auto" }}
                        className="overflow-hidden"
                        exit={{ opacity: 0, height: 0 }}
                        initial={{ opacity: 0, height: 0 }}
                        onSubmit={(e) => submitDraft(e, col.id)}
                        transition={glide}
                      >
                        <div className="mb-1.5 rounded-md border bg-card p-2">
                          <input
                            aria-label={`New task in ${col.title}`}
                            autoFocus
                            className="w-full bg-transparent px-1 py-1 text-sm outline-none placeholder:text-muted-foreground/72"
                            onChange={(e) => setDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Escape") setAddingTo(null);
                            }}
                            placeholder="Task title, then Enter"
                            value={draft}
                          />
                          <div className="mt-1 flex justify-end gap-1">
                            <button
                              className="h-7 cursor-pointer rounded-md px-2.5 text-muted-foreground text-xs outline-none transition-[color,background-color,transform] duration-150 ease-out hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]"
                              onClick={() => setAddingTo(null)}
                              type="button"
                            >
                              Cancel
                            </button>
                            <button
                              className="h-7 cursor-pointer rounded-md bg-primary px-2.5 font-medium text-primary-foreground text-xs outline-none transition-[opacity,transform] duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97] disabled:cursor-default disabled:opacity-50 disabled:active:scale-100"
                              disabled={!draft.trim()}
                              type="submit"
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      </motion.form>
                    )}
                  </AnimatePresence>
                  <div className={cn("flex flex-col", compact ? "gap-1.5" : "gap-2")}>
                    {colTasks.map((task) =>
                      task.id === drag?.id ? (
                        <motion.div
                          className="rounded-md border-2 border-foreground/16 border-dashed bg-background/50"
                          data-placeholder=""
                          data-task-id={task.id}
                          key={task.id}
                          layout="position"
                          layoutId={task.id}
                          style={{ height: drag.height }}
                          transition={reduce ? { duration: 0 } : spring}
                        />
                      ) : (
                        <motion.div
                          animate={{ opacity: 1, scale: 1 }}
                          className="group relative"
                          data-task-id={task.id}
                          initial={{ opacity: 0, scale: 0.96 }}
                          key={task.id}
                          layout="position"
                          layoutId={task.id}
                          transition={reduce ? { duration: 0 } : spring}
                        >
                          <button
                            aria-describedby={`${groupId}-dnd-help`}
                            className={cn(
                              "block w-full cursor-pointer rounded-md border bg-card text-start shadow-xs/5 outline-none transition-[border-color,box-shadow,transform] duration-150 ease-out hover:border-foreground/16 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97] motion-reduce:active:scale-100",
                              compact ? "px-2.5 py-2 ps-3" : "p-3 ps-3.5",
                              selectedId === task.id && "border-foreground/24 ring-2 ring-ring/24",
                            )}
                            data-card=""
                            onClick={() => {
                              if (!justDragged.current) setSelectedId(task.id);
                            }}
                            onKeyDown={(e) => onCardKeyDown(e, task)}
                            onPointerDown={(e) => onCardPointerDown(e, task.id)}
                            type="button"
                          >
                            <CardBody compact={compact} labels={labels} task={task} />
                          </button>
                          <span
                            aria-hidden
                            className="absolute top-1/2 -left-1 flex h-7 w-4 -translate-y-1/2 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 pointer-coarse:opacity-70"
                            data-drag-handle=""
                            onPointerDown={(e) => onCardPointerDown(e, task.id)}
                          >
                            <GripVerticalIcon className="size-3.5" />
                          </span>
                        </motion.div>
                      ),
                    )}
                  </div>
                  {colTasks.length === 0 && (
                    <div className="flex h-24 items-center justify-center rounded-md border border-dashed text-muted-foreground text-xs">
                      {total > 0 ? "No matching tasks" : drag ? "Drop here" : "Nothing here yet"}
                    </div>
                  )}
                </motion.div>
              </section>
            );
          })}
        </motion.div>

        {drag && dragged && (
          <motion.div
            animate={drag.dropping ? { rotate: 0, scale: 1 } : { rotate: 2.5, scale: 1.03 }}
            className="pointer-events-none absolute top-0 left-0 z-40"
            initial={{ rotate: 0, scale: 1 }}
            style={{ x: ox, y: oy, width: drag.width }}
            transition={reduce ? { duration: 0 } : spring}
          >
            <div
              className={cn(
                "rounded-md border border-foreground/16 bg-card shadow-lg/8 ring-4 ring-foreground/4",
                compact ? "px-2.5 py-2 ps-3" : "p-3 ps-3.5",
              )}
            >
              <CardBody compact={compact} labels={labels} task={dragged} />
            </div>
          </motion.div>
        )}

        <AnimatePresence>
          {selected && (
            <motion.div
              animate={{ opacity: 1 }}
              className="absolute inset-0 z-20 bg-background/40"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              key="scrim"
              onClick={() => setSelectedId(null)}
            />
          )}
          {selected && (
            <TaskDetail
              columns={columns}
              key="detail"
              labels={labels}
              onClose={() => {
                const id = selected.id;
                setSelectedId(null);
                refocus(id);
              }}
              onMove={(column) => moveToColumn(selected.id, column)}
              onUpdate={(patch) => updateTask(selected.id, patch)}
              task={selected}
            />
          )}
        </AnimatePresence>

        <p className="sr-only" id={`${groupId}-dnd-help`}>
          Press Enter to open. Shift plus arrow keys moves the task between columns or up and down.
        </p>
        <p aria-live="polite" className="sr-only">
          {announcement}
        </p>
      </div>
    </LayoutGroup>
  );
}
