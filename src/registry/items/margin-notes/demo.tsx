"use client";

import { RotateCcwIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MarginNote, MarginNotes, Mark } from "@/registry/items/margin-notes/margin-notes";

export default function MarginNotesDemo() {
  const [take, setTake] = useState(0);

  return (
    <div className="flex w-full max-w-md flex-col rounded-2xl border bg-card shadow-xs/5">
      <div className="flex items-center justify-between gap-3 border-b px-5 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate font-medium text-sm">Launch post</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground text-xs">Draft 3</span>
        </div>
        <Button
          aria-label="Replay annotations"
          className="motion-safe:active:scale-[0.97]"
          onClick={() => setTake((t) => t + 1)}
          size="icon-sm"
          variant="ghost"
        >
          <RotateCcwIcon />
        </Button>
      </div>
      <MarginNotes className="px-5 pt-5 pb-6" key={take}>
        <p className="text-pretty text-foreground/90 text-sm leading-7">
          Relay 2.0 is our <Mark type="circle">biggest</Mark> release yet. Offline edits now merge without conflicts,
          search reads <Mark type="strike">every</Mark> attachment too, and the editor got a quiet redesign.
        </p>
        <p className="mt-3 text-foreground/90 text-sm leading-7">
          Sync is{" "}
          <Mark note="speed" type="double">
            4× faster
          </Mark>{" "}
          and <Mark note="calm" tone="blue" type="box">calmer</Mark> on bad Wi-Fi.
        </p>
        <div className="mt-10 flex items-start justify-between gap-6 font-medium text-[13px] leading-5">
          <MarginNote className="-rotate-2 max-w-40 text-balance" id="speed">
            Lead with this, it's the headline
          </MarginNote>
          <MarginNote className="max-w-40 rotate-1 text-balance text-right" id="calm" tone="blue">
            Calmer how? Show it
          </MarginNote>
        </div>
      </MarginNotes>
      <div className="flex items-center gap-2 border-t px-5 py-3 text-muted-foreground text-xs">
        <span className="grid size-5 place-items-center rounded-full bg-rose-500/15 font-medium text-[10px] text-rose-700 dark:text-rose-300">
          MK
        </span>
        <span>Mara Kovač left 4 marks and 2 notes</span>
      </div>
    </div>
  );
}
