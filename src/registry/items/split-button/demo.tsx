"use client";

import { CalendarClockIcon, FlaskConicalIcon, GitCommitHorizontalIcon, RocketIcon, ZapOffIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { SplitButton } from "@/registry/items/split-button/split-button";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function SplitButtonDemo() {
  const [log, setLog] = useState<{ id: number; text: string }[]>([{ id: 0, text: "Deployed to production · yesterday" }]);
  return (
    <div className="w-[400px] max-w-full rounded-2xl border bg-card p-4 shadow-xs/5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-sm">halden-web</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-muted-foreground text-xs">
            <GitCommitHorizontalIcon className="size-3.5" />
            <span className="font-mono">a91f3c2</span>
            <span className="truncate">Fix invoice rounding</span>
          </p>
        </div>
        <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-success/10 px-2 py-0.5 font-medium text-success-foreground text-xs">
          <span className="size-1.5 rounded-full bg-success" />
          Checks passed
        </span>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 border-t pt-4">
        <div className="relative h-4 min-w-0 flex-1 overflow-hidden text-muted-foreground text-xs">
          <AnimatePresence initial={false} mode="popLayout">
            <motion.p
              animate={{ opacity: 1, y: 0 }}
              className="truncate"
              exit={{ opacity: 0, y: -8 }}
              initial={{ opacity: 0, y: 8 }}
              key={log[0].id}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            >
              {log[0].text}
            </motion.p>
          </AnimatePresence>
        </div>
        <SplitButton
          actions={[
            { id: "prod", label: "Deploy", description: "Ship this commit to production.", icon: <RocketIcon />, done: "Deployed" },
            { id: "preview", label: "Deploy preview", description: "A private link to review first.", icon: <FlaskConicalIcon />, done: "Preview ready" },
            { id: "schedule", label: "Deploy at 6 pm", description: "Ship after hours, when it’s quiet.", icon: <CalendarClockIcon />, done: "Scheduled" },
            { id: "clean", label: "Deploy clean", description: "Rebuild everything, skip the cache.", icon: <ZapOffIcon />, done: "Deployed" },
          ]}
          menuLabel="Deploy a91f3c2"
          onAction={async (a) => {
            await wait(1100);
            const text = { prod: "Deployed to production", preview: "Preview deployed", schedule: "Scheduled for 6:00 pm", clean: "Clean build deployed" }[a.id];
            setLog((l) => [{ id: l[0].id + 1, text: `${text} · just now` }, ...l]);
          }}
        />
      </div>
    </div>
  );
}
