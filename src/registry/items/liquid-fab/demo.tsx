"use client";

import { CameraIcon, ListChecksIcon, type LucideIcon, MicIcon, PencilLineIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { LiquidFab } from "@/registry/items/liquid-fab/liquid-fab";

interface Note {
  id: number;
  title: string;
  meta: string;
  icon: LucideIcon;
}

const seed: Note[] = [
  { id: 3, title: "Ridge trail, north loop", meta: "Voice memo · 2:14", icon: MicIcon },
  { id: 2, title: "Camp supplies", meta: "Checklist · 6 of 9", icon: ListChecksIcon },
  { id: 1, title: "Heron at the lower pond", meta: "Photo · 07:42", icon: CameraIcon },
];

const kinds = {
  note: { title: "Untitled note", meta: "Note · just now", icon: PencilLineIcon },
  list: { title: "New checklist", meta: "Checklist · just now", icon: ListChecksIcon },
  memo: { title: "Voice memo", meta: "Recording · 0:00", icon: MicIcon },
  photo: { title: "New photo", meta: "Photo · just now", icon: CameraIcon },
};

export default function LiquidFabDemo() {
  const reduce = useReducedMotion();
  const [notes, setNotes] = useState(seed);
  const [open, setOpen] = useState(false);

  const add = (kind: keyof typeof kinds) =>
    setNotes((list) => [{ id: Date.now(), ...kinds[kind] }, ...list].slice(0, 4));

  return (
    <div className="relative flex h-[400px] w-full max-w-[340px] flex-col overflow-hidden rounded-2xl border bg-card shadow-xs/5">
      <div className="flex items-baseline justify-between border-b px-5 pt-5 pb-4">
        <div className="flex flex-col gap-0.5">
          <span className="font-medium text-sm">Field notes</span>
          <span className="text-muted-foreground text-xs">Saturday, 24 October</span>
        </div>
        <span className="text-muted-foreground text-xs tabular-nums">{notes.length} entries</span>
      </div>
      <ul
        className={cn(
          "flex flex-col gap-1 p-2 transition-opacity duration-200 ease-out",
          open && "pointer-events-none opacity-35",
        )}
      >
        <AnimatePresence initial={false} mode="popLayout">
          {notes.map((n) => (
            <motion.li
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5"
              exit={{ opacity: 0 }}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
              key={n.id}
              layout={!reduce}
              transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-lg border bg-background">
                <n.icon className="size-4 text-muted-foreground" />
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate font-medium text-sm">{n.title}</span>
                <span className="text-muted-foreground text-xs tabular-nums">{n.meta}</span>
              </span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      <LiquidFab
        actions={[
          { id: "note", label: "Write a note", icon: PencilLineIcon, onSelect: () => add("note") },
          { id: "list", label: "Start a checklist", icon: ListChecksIcon, onSelect: () => add("list") },
          { id: "memo", label: "Record a memo", icon: MicIcon, onSelect: () => add("memo") },
          { id: "photo", label: "Take a photo", icon: CameraIcon, onSelect: () => add("photo") },
        ]}
        className="absolute right-5 bottom-5"
        direction="up-left"
        label="New entry"
        onOpenChange={setOpen}
      />
    </div>
  );
}
