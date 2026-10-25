"use client";

import { SparklesIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { ReplyToolbar } from "@/registry/items/reply-toolbar/reply-toolbar";

const versions = [
  "Bring a light rain shell and layers: Lisbon in April swings from 12\u00a0°C mornings to 22\u00a0°C afternoons.",
  "Pack for spring: a packable jacket, a sweater for the evenings and shoes that grip wet cobblestones.",
  "Expect mild days around 20\u00a0°C with the odd shower. Layers and a compact umbrella will cover it.",
  "Think layers. Mornings are cool, afternoons warm, and short showers roll in off the Atlantic.",
  "A light jacket, one warm layer and comfortable walking shoes. Lisbon's hills and April showers do the rest.",
];

export default function ReplyToolbarDemo() {
  const [index, setIndex] = useState(0);
  const text = versions[index % versions.length] ?? "";
  return (
    <div className="flex w-[400px] max-w-full flex-col gap-3 rounded-2xl border bg-card p-4 shadow-xs/5">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
          <SparklesIcon className="size-3.5" />
        </span>
        <div className="grid min-h-18 flex-1 text-sm leading-6">
          <AnimatePresence initial={false}>
            <motion.p
              animate={{ opacity: 1, filter: "blur(0px)" }}
              className="col-start-1 row-start-1 text-pretty"
              exit={{ opacity: 0, filter: "blur(4px)" }}
              initial={{ opacity: 0, filter: "blur(4px)" }}
              key={index}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              {text}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
      <ReplyToolbar onVersionChange={setIndex} text={text} />
    </div>
  );
}
