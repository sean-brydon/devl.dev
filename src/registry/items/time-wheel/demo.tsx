"use client";

import { AlarmClockIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { type Time, TimeWheel } from "@/registry/items/time-wheel/time-wheel";

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

function untilText(time: Time, now: Date | null) {
  if (!now) return "";
  const mins = (time.hours * 60 + time.minutes - (now.getHours() * 60 + now.getMinutes()) + 1440) % 1440 || 1440;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `Rings in ${h ? `${h} h ` : ""}${m} min`;
}

export default function TimeWheelDemo() {
  const [time, setTime] = useState<Time>({ hours: 6, minutes: 45 });
  const [days, setDays] = useState([true, true, true, true, true, false, false]);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="grid w-80 max-w-full gap-4 rounded-2xl border bg-card p-5 shadow-xs/5">
      <div className="flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <AlarmClockIcon className="size-4" />
        </span>
        <div className="grid gap-0.5">
          <p className="font-medium text-sm">Wake-up</p>
          <p className="text-muted-foreground text-xs tabular-nums">{untilText(time, now) || " "}</p>
        </div>
      </div>
      <TimeWheel minuteStep={5} onValueChange={setTime} value={time} />
      <div className="flex justify-between gap-1">
        {DAYS.map((d, i) => (
          <button
            aria-label={["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][i]}
            aria-pressed={days[i]}
            className="flex size-8 cursor-pointer items-center justify-center rounded-full font-medium text-muted-foreground text-xs outline-none transition-[background-color,color,scale] duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.94] aria-pressed:bg-primary aria-pressed:text-primary-foreground"
            key={i}
            onClick={() => setDays((all) => all.map((on, j) => (j === i ? !on : on)))}
            type="button"
          >
            {d}
          </button>
        ))}
      </div>
      <Button>Save alarm</Button>
    </div>
  );
}
