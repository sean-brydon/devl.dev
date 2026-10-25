"use client";

import { CheckIcon, RotateCcwIcon, TrainFrontIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TicketTear } from "@/registry/items/ticket-tear/ticket-tear";

const barcode = [2, 1, 1, 3, 1, 2, 1, 1, 2, 3, 1, 1, 2, 1, 3, 1, 2, 2, 1, 1, 3, 1].reduce<{ x: number; w: number }[]>(
  (list, w) => {
    const last = list[list.length - 1];
    list.push({ x: last ? last.x + last.w + 1.2 : 0, w });
    return list;
  },
  [],
);
const swap = { duration: 0.18, ease: [0.23, 1, 0.32, 1] } as const;

export default function TicketTearDemo() {
  const [torn, setTorn] = useState(false);
  const [settled, setSettled] = useState(false);

  return (
    <div className="flex w-full max-w-[380px] flex-col items-stretch gap-4">
      <TicketTear
        main={
          <div className="flex h-full flex-col justify-between p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 font-medium text-sm">
                <span className="grid size-6 place-items-center rounded-md bg-sky-500/15 text-sky-700 dark:text-sky-300">
                  <TrainFrontIcon className="size-3.5" />
                </span>
                Northline
              </span>
              <AnimatePresence initial={false} mode="popLayout">
                {torn ? (
                  <motion.span
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-1 rounded-full bg-success/12 px-2 py-0.5 font-medium text-success-foreground text-xs"
                    initial={{ opacity: 0, scale: 0.95 }}
                    key="ok"
                    transition={{ ...swap, delay: 0.35 }}
                  >
                    <CheckIcon className="size-3" strokeWidth={3} />
                    Confirmed
                  </motion.span>
                ) : (
                  <motion.span
                    animate={{ opacity: 1 }}
                    className="rounded-full bg-warning/12 px-2 py-0.5 font-medium text-warning-foreground text-xs"
                    exit={{ opacity: 0 }}
                    initial={{ opacity: 0 }}
                    key="hold"
                    transition={swap}
                  >
                    On hold
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex flex-col">
                <span className="font-semibold text-xl leading-none">AMS</span>
                <span className="mt-1 text-muted-foreground text-xs tabular-nums">08:42</span>
              </div>
              <div className="flex flex-1 flex-col items-center gap-1">
                <span className="text-[10px] text-muted-foreground tabular-nums">1h 49m</span>
                <span className="h-px w-full bg-border" />
              </div>
              <div className="flex flex-col items-end">
                <span className="font-semibold text-xl leading-none">BRU</span>
                <span className="mt-1 text-muted-foreground text-xs tabular-nums">10:31</span>
              </div>
            </div>
            <div className="flex justify-between gap-2 text-xs">
              <span className="flex flex-col gap-0.5">
                <span className="text-muted-foreground">Passenger</span>
                <span className="font-medium">Mila Verhoef</span>
              </span>
              <span className="flex flex-col gap-0.5 text-right">
                <span className="text-muted-foreground">Departs</span>
                <span className="font-medium tabular-nums">Sat 7 Nov</span>
              </span>
            </div>
          </div>
        }
        onTorn={() => setSettled(true)}
        stub={
          <div className="flex h-full flex-col items-center justify-between py-4 pr-1 pl-2">
            <span className="text-muted-foreground text-xs tabular-nums">Coach 6</span>
            <span className="font-semibold text-2xl tabular-nums leading-none">42A</span>
            <svg aria-hidden className="h-7 w-14 text-foreground/80" viewBox="0 0 56 28">
              {barcode.map((b) => (
                <rect fill="currentColor" height="28" key={b.x} width={b.w} x={b.x} />
              ))}
            </svg>
            <span className="font-mono text-[10px] text-muted-foreground">NL-7F3K</span>
          </div>
        }
        torn={torn}
      />
      <div className="flex items-center justify-between gap-3 px-1">
        <span aria-live="polite" className="text-muted-foreground text-xs">
          {settled ? "Stub collected, have a good trip" : "€38.40 · held for 10 minutes"}
        </span>
        <Button
          aria-disabled={torn && !settled ? true : undefined}
          className={cn(
            "transition-[scale,box-shadow,opacity] duration-150 active:scale-[0.97]",
            torn && !settled && "pointer-events-none opacity-64",
          )}
          onClick={() => {
            if (!torn) return setTorn(true);
            if (!settled) return;
            setTorn(false);
            setSettled(false);
          }}
          size="sm"
          variant={torn ? "ghost" : "default"}
        >
          {torn ? <RotateCcwIcon /> : null}
          {torn ? "Reset" : "Confirm booking"}
        </Button>
      </div>
    </div>
  );
}
