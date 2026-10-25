"use client";

import { RotateCcwIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BlurRise } from "@/registry/items/blur-rise/blur-rise";

export default function BlurRiseDemo() {
  const [run, setRun] = useState(0);

  return (
    <div className="flex w-full max-w-md flex-col items-start gap-5">
      <div className="flex flex-col gap-3" key={run}>
        <BlurRise
          as="h2"
          by="letter"
          className="font-semibold text-3xl tracking-tight"
          text="Where your team thinks out loud."
        />
        <BlurRise
          className="text-pretty text-muted-foreground text-sm leading-relaxed"
          delay={0.35}
          text="Fernhill is a calm home for your team's docs, plans and decisions. Write together, link anything, and find it again in a second."
        />
      </div>
      <Button onClick={() => setRun((n) => n + 1)} size="sm" variant="outline">
        <RotateCcwIcon />
        Replay
      </Button>
    </div>
  );
}
