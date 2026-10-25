"use client";

import { RotateCcwIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { type HighlightColor, Highlight } from "@/registry/items/highlighter/highlighter";

const saved: { quote: string; page: number; color: HighlightColor }[] = [
  { quote: "It answers quickly, forgives mistakes and remembers where you left off.", page: 112, color: "yellow" },
  { quote: "Everything within reach, nothing shouting.", page: 113, color: "pink" },
];

export default function HighlighterDemo() {
  const [take, setTake] = useState(0);

  return (
    <div className="flex w-full max-w-md flex-col rounded-2xl border bg-card shadow-xs/5">
      <div className="flex items-center justify-between gap-3 border-b px-5 py-3">
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-medium text-sm">The Quiet Interface</span>
          <span className="text-muted-foreground text-xs">Chapter 4 · Calm defaults</span>
        </div>
        <Button
          aria-label="Replay highlights"
          className="motion-safe:active:scale-[0.97]"
          onClick={() => setTake((t) => t + 1)}
          size="icon-sm"
          variant="ghost"
        >
          <RotateCcwIcon />
        </Button>
      </div>
      <p className="text-pretty px-5 pt-4 pb-5 text-foreground/90 text-sm leading-7" key={take}>
        Good software rarely asks for attention.{" "}
        <Highlight delay={0.15}>It answers quickly, forgives mistakes and remembers where you left off.</Highlight> The
        best tools feel less like machines and more like a tidy desk:{" "}
        <Highlight color="pink" delay={1.05}>
          everything within reach, nothing shouting.
        </Highlight>{" "}
        When it needs you, it says so <Highlight color="green" delay={1.55}>once, plainly</Highlight>, then gets out of
        the way.
      </p>
      <div className="flex flex-col gap-1 border-t p-2">
        <span className="px-3 pt-1 pb-1 text-muted-foreground text-xs">Your highlights</span>
        {saved.map((item) => (
          <button
            className="flex cursor-pointer items-baseline justify-between gap-4 rounded-lg px-3 py-2 text-left outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring [@media(hover:hover)]:hover:bg-accent/60"
            key={item.page + item.quote}
            type="button"
          >
            <span className="min-w-0 text-sm">
              <Highlight color={item.color} speed={1100} trigger="hover">
                {item.quote}
              </Highlight>
            </span>
            <span className="shrink-0 text-muted-foreground text-xs tabular-nums">p. {item.page}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
