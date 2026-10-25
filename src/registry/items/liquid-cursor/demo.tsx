"use client";

import { ArrowUpRightIcon } from "lucide-react";
import { useState } from "react";
import { LiquidCursor, liquidTarget } from "@/registry/items/liquid-cursor/liquid-cursor";

const nav = ["Work", "Studio", "Journal"];
const services = ["Brand", "Product", "Motion", "Web"];

const target =
  "relative cursor-pointer select-none outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring data-[liquid-active]:text-brand-foreground! data-[liquid-active]:delay-75";

export default function LiquidCursorDemo() {
  const [picked, setPicked] = useState<string[]>(["Product"]);

  return (
    <LiquidCursor className="flex w-full max-w-md flex-col gap-10 rounded-2xl border bg-card p-5 shadow-xs/5">
      <header className="flex items-center justify-between">
        <span className="font-medium text-sm">Fieldnote</span>
        <nav aria-label="Studio" className="-mr-1 flex items-center gap-0.5">
          {nav.map((item) => (
            <a
              className={`${target} rounded-full px-3 py-1.5 text-muted-foreground text-sm hover:text-foreground`}
              href={`#${item.toLowerCase()}`}
              key={item}
              onClick={(e) => e.preventDefault()}
              {...liquidTarget}
            >
              {item}
            </a>
          ))}
        </nav>
      </header>

      <div className="flex flex-col gap-2">
        <h3 className="text-balance font-heading font-medium text-3xl tracking-tight">We make quiet software for loud ideas.</h3>
        <p className="text-pretty text-muted-foreground text-sm">A two-person studio in Lisbon. Booking projects from March.</p>
      </div>

      <div className="flex flex-col gap-3">
        <span className="text-muted-foreground text-xs">What do you need?</span>
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {services.map((s) => {
              const on = picked.includes(s);
              return (
                <button
                  aria-pressed={on}
                  className={`${target} h-8 rounded-full border px-3 font-medium text-muted-foreground text-xs aria-pressed:border-foreground/40 aria-pressed:text-foreground data-[liquid-active]:border-transparent`}
                  key={s}
                  onClick={() => setPicked((p) => (on ? p.filter((x) => x !== s) : [...p, s]))}
                  type="button"
                  {...liquidTarget}
                >
                  {s}
                </button>
              );
            })}
          </div>
          <button
            aria-label="Start a project"
            className={`${target} grid size-10 shrink-0 place-items-center rounded-full border`}
            type="button"
            {...liquidTarget}
          >
            <ArrowUpRightIcon className="size-4" />
          </button>
        </div>
      </div>
    </LiquidCursor>
  );
}
