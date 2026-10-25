"use client";

import { FolderIcon, MailIcon, MusicIcon, NotebookPenIcon, SquareTerminalIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { MagnifyDock } from "@/registry/items/magnify-dock/magnify-dock";

function CalendarGlyph() {
  return (
    <svg aria-hidden className="!size-full !drop-shadow-none" viewBox="0 0 40 40">
      <text className="fill-red-500 font-semibold" fontSize="7" letterSpacing=".4" textAnchor="middle" x="20" y="12">
        THU
      </text>
      <text className="fill-neutral-800 font-light" fontSize="19" textAnchor="middle" x="20" y="31">
        24
      </text>
    </svg>
  );
}

export default function MagnifyDockDemo() {
  const [last, setLast] = useState("Hover the dock, or Tab in and use the arrow keys");
  return (
    <div className="flex w-[520px] max-w-full flex-col items-center gap-3">
      <div className="relative flex h-72 w-full items-end justify-center overflow-hidden rounded-2xl border bg-linear-to-br from-sky-200 via-indigo-200 to-rose-200 pb-3 dark:from-sky-950 dark:via-indigo-950 dark:to-rose-950">
        <div aria-hidden className="absolute top-6 left-6 text-indigo-950/70 dark:text-indigo-100/70">
          <p className="font-light text-5xl tabular-nums tracking-tight">9:41</p>
          <p className="mt-1 font-medium text-sm">Thursday, 24 October</p>
        </div>
        <MagnifyDock
          apps={[
            { id: "files", name: "Files", icon: <FolderIcon />, tile: "bg-linear-to-b from-sky-400 to-blue-600 text-white", running: true },
            { id: "mail", name: "Mail", icon: <MailIcon />, tile: "bg-linear-to-b from-blue-400 to-indigo-600 text-white", running: true, badge: 3 },
            { id: "calendar", name: "Calendar", icon: <CalendarGlyph />, tile: "bg-white" },
            { id: "notes", name: "Notes", icon: <NotebookPenIcon />, tile: "bg-linear-to-b from-amber-300 to-amber-500 text-amber-950" },
            { id: "music", name: "Music", icon: <MusicIcon />, tile: "bg-linear-to-b from-rose-400 to-pink-600 text-white" },
            { id: "term", name: "Terminal", icon: <SquareTerminalIcon />, tile: "bg-neutral-900 text-neutral-100 ring-1 ring-white/10 ring-inset" },
          ]}
          onOpen={(app) => setLast(`${app.name} is open`)}
          trailing={[{ id: "trash", name: "Bin", icon: <Trash2Icon />, tile: "bg-white/50 text-neutral-600 dark:bg-white/10 dark:text-neutral-300" }]}
        />
      </div>
      <p aria-live="polite" className="text-muted-foreground text-xs">
        {last}
      </p>
    </div>
  );
}
