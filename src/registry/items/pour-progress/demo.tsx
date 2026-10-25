"use client";

import { GlassWaterIcon, Undo2Icon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PourProgress } from "@/registry/items/pour-progress/pour-progress";

const GOAL = 2000;
const GLASS = 250;
const week = [
  { day: "M", ml: 1850 },
  { day: "T", ml: 2000 },
  { day: "W", ml: 1250 },
  { day: "T", ml: 1600 },
  { day: "F", ml: 2000 },
  { day: "S", ml: 900 },
];

export default function PourProgressDemo() {
  const [ml, setMl] = useState(1250);
  const left = Math.max(0, Math.ceil((GOAL - ml) / GLASS));
  const done = ml >= GOAL;
  const hits = week.filter((d) => d.ml >= GOAL).length + (done ? 1 : 0);

  return (
    <div className="flex w-full max-w-[360px] flex-col gap-5 rounded-2xl border bg-card p-5 shadow-xs/5">
      <div className="flex items-center gap-5">
        <PourProgress label="Water today" max={GOAL} size={124} value={ml} />
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-muted-foreground text-xs tabular-nums">Water today · {GOAL / 1000} l goal</span>
            <span className="whitespace-nowrap font-medium text-xl tabular-nums">
              {ml.toLocaleString("en-US")}
              <span className="font-normal text-muted-foreground text-sm"> ml</span>
            </span>
            <span aria-live="polite" className="text-pretty text-muted-foreground text-xs tabular-nums">
              {done
                ? "Goal reached, nice work"
                : `${left} more ${left === 1 ? "glass" : "glasses"} to go`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              className="transition-[scale,box-shadow] duration-150 active:scale-[0.97]"
              disabled={done}
              onClick={() => setMl((v) => Math.min(GOAL, v + GLASS))}
              size="sm"
              variant="outline"
            >
              <GlassWaterIcon />
              {GLASS} ml
            </Button>
            <Button
              aria-label="Undo last glass"
              className="transition-[scale,box-shadow] duration-150 active:scale-[0.97]"
              disabled={ml <= 0}
              onClick={() => setMl((v) => Math.max(0, v - GLASS))}
              size="icon-sm"
              variant="ghost"
            >
              <Undo2Icon />
            </Button>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-3 border-t pt-4">
        <div className="flex items-baseline justify-between">
          <span className="font-medium text-xs">This week</span>
          <span className="text-muted-foreground text-xs tabular-nums">{hits} of 7 goals hit</span>
        </div>
        <div className="flex items-end justify-between px-1">
          {[...week, { day: "S", ml }].map((d, i) => (
            <div className="flex flex-col items-center gap-1.5" key={`${d.day}-${i}`}>
              <PourProgress
                className={i === week.length ? undefined : "text-sky-600/60 dark:text-sky-400/60"}
                delay={i * 90}
                label={`Day ${i + 1}: ${d.ml} ml`}
                max={GOAL}
                size={64}
                thickness={18}
                value={d.ml}
                variant="bar"
              />
              <span className={i === week.length ? "font-medium text-xs" : "text-muted-foreground text-xs"}>{d.day}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
