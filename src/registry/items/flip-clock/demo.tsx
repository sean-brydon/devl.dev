"use client";

import { CalendarPlusIcon } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { FlipClock, useCountdown } from "@/registry/items/flip-clock/flip-clock";

const OFFSET = ((3 * 24 + 14) * 60 + 26) * 60_000 + 9_000;

export default function FlipClockDemo() {
  const [target, setTarget] = useState<number | null>(null);
  useEffect(() => setTarget(Date.now() + OFFSET), []);
  const { ready, days, hours, minutes, seconds } = useCountdown(target);

  return (
    <div className="@container flex w-full max-w-lg flex-col items-center gap-7">
      <div className="flex flex-col items-center gap-1.5 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-0.5 text-muted-foreground text-xs shadow-xs/5">
          <span className="size-1.5 rounded-full bg-success" />
          Live keynote
        </span>
        <h3 className="text-balance font-heading font-medium text-lg">Northwind 2.0 goes live in</h3>
      </div>
      <motion.div
        animate={{ opacity: ready ? 1 : 0 }}
        initial={{ opacity: 0 }}
        key={ready ? "live" : "idle"}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <FlipClock
          className="text-[30px] @md:text-[40px]"
          label={`${days} days, ${hours} hours and ${minutes} minutes to go`}
          units={[
            { label: "Days", value: days },
            { label: "Hours", value: hours },
            { label: "Minutes", value: minutes },
            { label: "Seconds", value: seconds },
          ]}
        />
      </motion.div>
      <Button size="sm" variant="outline">
        <CalendarPlusIcon />
        Add to calendar
      </Button>
    </div>
  );
}
