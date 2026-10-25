"use client";

import { ArchiveIcon, CalendarDaysIcon, ChartGanttIcon, InboxIcon, KanbanIcon, ListIcon, StarIcon } from "lucide-react";
import { useState } from "react";
import { LiquidSegments } from "@/registry/items/liquid-segments/liquid-segments";

export default function LiquidSegmentsDemo() {
  const [folder, setFolder] = useState("inbox");

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-5">
      <LiquidSegments
        aria-label="Folder"
        onValueChange={setFolder}
        options={[
          { value: "inbox", label: "Inbox", icon: <InboxIcon />, count: 12 },
          { value: "starred", label: "Starred", icon: <StarIcon />, count: 3 },
          { value: "archive", label: "Archive", icon: <ArchiveIcon /> },
        ]}
        value={folder}
      />
      <LiquidSegments
        aria-label="Billing period"
        options={[
          { value: "monthly", label: "Monthly" },
          { value: "yearly", label: "Yearly" },
        ]}
        size="sm"
      />
      <LiquidSegments
        aria-label="Layout"
        defaultValue="board"
        fullWidth
        options={[
          { value: "list", label: "List", icon: <ListIcon /> },
          { value: "board", label: "Board", icon: <KanbanIcon /> },
          { value: "calendar", label: "Calendar", icon: <CalendarDaysIcon /> },
          { value: "timeline", label: "Timeline", icon: <ChartGanttIcon /> },
        ]}
      />
      <p className="text-muted-foreground text-xs">Click, use arrow keys, or drag the pill across.</p>
    </div>
  );
}
