"use client";

import { ArrowUpIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Typewriter } from "@/registry/items/typewriter/typewriter";

const tasks = ["move my 3pm with Priya to Thursday.", "draft the Q3 board update.", "find a quiet table for six, Friday."];
const prompts = ["Summarise yesterday's standup", "What did Marta change in the pricing doc?", "Book the 8:40 to Porto"];

export default function TypewriterDemo() {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const showHint = !value && !focused;

  return (
    <div className="flex w-full max-w-md flex-col gap-8">
      <h3 className="min-h-[2lh] font-heading font-medium text-2xl tracking-tight">
        <span className="text-muted-foreground">Ask Juniper to </span>
        <Typewriter caretClassName="bg-brand-ink" erase="select" phrases={tasks} />
      </h3>

      <form className="relative flex items-center gap-2 rounded-2xl border bg-card p-1.5 pl-4 shadow-xs/5 focus-within:ring-2 focus-within:ring-ring/24" onSubmit={(e) => e.preventDefault()}>
        <label className="sr-only" htmlFor="tw-demo-input">
          Message Juniper
        </label>
        <div className="relative min-w-0 flex-1">
          <input
            className="h-9 w-full bg-transparent text-sm outline-none"
            id="tw-demo-input"
            onBlur={() => setFocused(false)}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setFocused(true)}
            value={value}
          />
          <span
            aria-hidden
            className={`pointer-events-none absolute inset-y-0 left-0 flex max-w-full items-center overflow-hidden whitespace-nowrap text-muted-foreground text-sm transition-opacity duration-150 ${showHint ? "" : "opacity-0"}`}
          >
            <Typewriter paused={!showHint} phrases={prompts} typeSpeed={46} />
          </span>
        </div>
        <Button aria-label="Send" className="rounded-xl" disabled={!value.trim()} size="icon" type="submit">
          <ArrowUpIcon />
        </Button>
      </form>
    </div>
  );
}
