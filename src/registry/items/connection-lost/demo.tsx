"use client";

import { CloudOffIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { ConnectionLost } from "@/registry/items/connection-lost/connection-lost";
import { cn } from "@/lib/utils";

const initialTasks = [
  { id: "t1", title: "Write release notes for 4.2", done: true, local: true },
  { id: "t2", title: "Record the walkthrough video", done: true, local: true },
  { id: "t3", title: "Update the pricing page copy", done: false, local: true },
  { id: "t4", title: "Email the beta customers", done: false, local: false },
  { id: "t5", title: "Schedule the launch post", done: false, local: false },
];

export default function ConnectionLostDemo() {
  const [online, setOnline] = useState(false);
  const [tasks, setTasks] = useState(initialTasks);
  const pending = tasks.filter((t) => t.local).length;

  const toggle = (id: string, done: boolean) =>
    setTasks((all) => all.map((t) => (t.id === id ? { ...t, done, local: t.local || !online } : t)));

  return (
    <div className="relative mx-auto w-full max-w-[520px] overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-xs/5">
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-muted-foreground text-xs">Ridgeline · Launch</p>
          <h3 className="truncate font-semibold text-sm">Launch checklist</h3>
        </div>
        <label className="flex shrink-0 cursor-pointer items-center gap-2 text-muted-foreground text-xs">
          {online ? "Online" : "Offline"}
          <Switch checked={online} onCheckedChange={setOnline} />
        </label>
      </div>

      <ul className="px-2 pt-2 pb-24">
        {tasks.map((t) => (
          <li key={t.id}>
            <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-accent/50">
              <Checkbox checked={t.done} onCheckedChange={(v) => toggle(t.id, v)} />
              <span className={cn("min-w-0 flex-1 truncate", t.done && "text-muted-foreground line-through")}>{t.title}</span>
              <AnimatePresence initial={false}>
                {t.local && (
                  <motion.span
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex shrink-0 items-center gap-1 text-muted-foreground text-xs"
                    exit={{ opacity: 0, scale: 0.9 }}
                    initial={{ opacity: 0, scale: 0.9 }}
                    title="Saved on this device"
                    transition={{ duration: 0.18 }}
                  >
                    <CloudOffIcon className="size-3.5" />
                    <span className="sr-only">Saved on this device</span>
                  </motion.span>
                )}
              </AnimatePresence>
            </label>
          </li>
        ))}
      </ul>

      <div className="absolute inset-x-3 bottom-3">
        <ConnectionLost
          onSynced={() => setTasks((all) => all.map((t) => ({ ...t, local: false })))}
          online={online}
          pendingChanges={pending}
        />
      </div>
    </div>
  );
}
