"use client";

import { ShuffleIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Odometer } from "@/registry/items/odometer/odometer";

const usd = { style: "currency", currency: "USD", maximumFractionDigits: 0 } as const;
const pct = { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 } as const;
const compact = { notation: "compact", maximumFractionDigits: 1 } as const;

function month(seed: number) {
  return {
    revenue: Math.round(84000 + seed * 41000),
    conversion: 0.031 + seed * 0.024,
    visitors: Math.round(920000 + seed * 860000),
  };
}

export default function OdometerDemo() {
  const [stats, setStats] = useState(() => month(0.42));

  useEffect(() => {
    let tick = 0;
    const id = setInterval(() => {
      tick++;
      setStats((s) => ({
        revenue: s.revenue + 49 + ((tick * 37) % 140),
        conversion: s.conversion,
        visitors: s.visitors + 900 + ((tick * 53) % 400),
      }));
    }, 2600);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex w-full max-w-md flex-col gap-5 rounded-2xl border bg-card p-6 shadow-xs/5">
      <div className="flex flex-col gap-1">
        <span className="text-muted-foreground text-xs">Revenue this month</span>
        <Odometer className="font-semibold text-5xl tracking-tight" format={usd} value={stats.revenue} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1 rounded-xl bg-muted p-3">
          <span className="text-muted-foreground text-xs">Conversion</span>
          <Odometer className="font-medium text-2xl" format={pct} value={stats.conversion} />
        </div>
        <div className="flex flex-col gap-1 rounded-xl bg-muted p-3">
          <span className="text-muted-foreground text-xs">Visitors</span>
          <Odometer className="font-medium text-2xl" format={compact} value={stats.visitors} />
        </div>
      </div>
      <Button
        className="self-start transition-[box-shadow,transform] duration-150 ease-out motion-safe:active:scale-[0.97]"
        onClick={() => setStats(month(Math.random()))}
        size="sm"
        variant="outline"
      >
        <ShuffleIcon />
        Another month
      </Button>
    </div>
  );
}
