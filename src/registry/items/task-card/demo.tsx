"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { type Task, TaskCard, type TaskPerson } from "@/registry/items/task-card/task-card";

const people: TaskPerson[] = [
  { id: "mira", name: "Mira Okafor", initials: "MO", tone: "violet" },
  { id: "jonas", name: "Jonas Lindqvist", initials: "JL", tone: "sky" },
  { id: "ines", name: "Inès Morel", initials: "IM", tone: "emerald" },
  { id: "dev", name: "Dev Raman", initials: "DR", tone: "amber" },
  { id: "tal", name: "Tal Ben-Ami", initials: "TB", tone: "rose" },
];

const inDays = (days: number) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d;
};

const initialTasks = (): Task[] => [
  {
    id: "HRB-142",
    title: "Ship offline mode for the field inspection app",
    priority: "high",
    labels: [
      { name: "Mobile", tone: "sky" },
      { name: "Sync", tone: "violet" },
    ],
    assignees: ["mira", "jonas", "ines"],
    checklist: [
      { id: "a", text: "Queue writes while offline", done: true },
      { id: "b", text: "Resolve conflicts on reconnect", done: true },
      { id: "c", text: "Cache floor plans per site", done: false },
      { id: "d", text: "QA on a throttled connection", done: false },
    ],
    due: inDays(4),
    comments: 12,
    attachments: 3,
  },
  {
    id: "HRB-128",
    title: "Rotate signing keys for the partner webhooks",
    priority: "urgent",
    labels: [
      { name: "Security", tone: "rose" },
      { name: "Backend", tone: "emerald" },
    ],
    assignees: ["dev"],
    checklist: [
      { id: "a", text: "Generate new key pair", done: true },
      { id: "b", text: "Dual-sign for 48 hours", done: false },
      { id: "c", text: "Email partners the cutover date", done: false },
    ],
    due: inDays(-2),
    comments: 4,
  },
];

export default function TaskCardDemo() {
  const reduce = useReducedMotion();
  const [today] = useState(() => new Date());
  const [tasks, setTasks] = useState(initialTasks);
  const [archived, setArchived] = useState<string[]>([]);
  const [nextId, setNextId] = useState(143);

  const onAction = (action: string, task: Task) => {
    if (action === "archive") setArchived((a) => [...a, task.id]);
    if (action === "restore") setArchived((a) => a.filter((x) => x !== task.id));
    if (action === "duplicate") {
      const copy: Task = { ...task, id: `HRB-${nextId}`, comments: 0, attachments: 0 };
      setNextId((n) => n + 1);
      setTasks((list) => {
        const at = list.findIndex((t) => t.id === task.id);
        return [...list.slice(0, at + 1), copy, ...list.slice(at + 1)];
      });
    }
  };

  return (
    <div className="flex w-full max-w-[356px] flex-col gap-2 rounded-2xl bg-muted/50 p-2 dark:bg-muted/30">
      <div className="flex h-6 items-center gap-2 px-1.5">
        <span aria-hidden className="size-2 rounded-full bg-info" />
        <span className="font-medium text-sm">In progress</span>
        <span className="text-muted-foreground text-xs tabular-nums">{tasks.length - archived.length}</span>
      </div>
      <AnimatePresence initial={false}>
        {tasks.map((task, i) => (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
            key={task.id}
            layout={!reduce}
            transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 36 }}
          >
            <TaskCard
              defaultExpanded={i === 0}
              now={today}
              onAction={onAction}
              people={people}
              task={task}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
