"use client";

import { PauseIcon, PlayIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MarqueeText } from "@/registry/items/marquee-text/marquee-text";

export default function MarqueeTextDemo() {
  const [paused, setPaused] = useState(false);

  return (
    <div className="@container flex w-full max-w-xl flex-col gap-6 overflow-hidden rounded-2xl border bg-card py-8 shadow-xs/5">
      <div className="flex flex-col gap-1">
        <MarqueeText className="text-5xl @md:text-6xl" paused={paused} words={["Brand", "Product", "Motion", "Web", "Type"]} />
        <MarqueeText
          className="text-3xl text-muted-foreground @md:text-4xl"
          direction="right"
          paused={paused}
          separator={<span className="mx-[0.4em] text-muted-foreground/40">/</span>}
          speed={34}
          words={["Lisbon", "Since 2019", "Two people", "Booking March"]}
        />
      </div>
      <div className="flex items-center justify-between px-6">
        <p className="text-muted-foreground text-xs">Fieldnote Studio — selected work 2019–2026</p>
        <Button
          aria-label={paused ? "Play marquee" : "Pause marquee"}
          aria-pressed={paused}
          onClick={() => setPaused((p) => !p)}
          size="icon-sm"
          variant="ghost"
        >
          {paused ? <PlayIcon /> : <PauseIcon />}
        </Button>
      </div>
    </div>
  );
}
