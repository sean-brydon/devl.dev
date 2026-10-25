"use client";

import { RotateCcwIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { type CarrierEvent, OrderTracker } from "@/registry/items/order-tracker/order-tracker";

const BASE: CarrierEvent[] = [
  { id: "e4", time: "07:52", day: "Today", title: "Out for delivery", location: "Leith depot" },
  { id: "e3", time: "23:10", day: "Wed", title: "Arrived at local depot", location: "Leith depot" },
  { id: "e2", time: "14:36", day: "Wed", title: "In transit to your region", location: "Carlisle hub" },
  { id: "e1", time: "18:05", day: "Tue", title: "Picked up from Oakmoss", location: "Manchester" },
];

const LATER: { step: number; event: CarrierEvent }[] = [
  { step: 2, event: { id: "e5", time: "12:58", day: "Today", title: "Driver is 3 stops away", location: "Abbeyhill" } },
  { step: 3, event: { id: "e6", time: "13:42", day: "Today", title: "Delivered, left at front door", location: "Edinburgh EH7" } },
];

export default function OrderTrackerDemo() {
  const [tick, setTick] = useState(0);
  const [run, setRun] = useState(0);

  useEffect(() => {
    setTick(0);
    const timers = [window.setTimeout(() => setTick(1), 3200), window.setTimeout(() => setTick(2), 6400)];
    return () => timers.forEach(clearTimeout);
  }, [run]);

  const extra = LATER.slice(0, tick);
  const current = extra.length ? extra[extra.length - 1].step : 2;
  const events = [...extra.map((e) => e.event).reverse(), ...BASE];

  return (
    <div className="flex w-[400px] max-w-full flex-col items-center gap-3">
      <OrderTracker
        carrier="Parcelwise"
        current={current}
        delivered={{ title: "Delivered", detail: "Today, 13:42 · left at front door" }}
        eta={{ title: "Arriving today", detail: "Between 12:00 and 14:00" }}
        events={events}
        orderId="#OK-48213"
        steps={[
          { label: "Ordered", date: "Mon 21" },
          { label: "Shipped", date: "Tue 22" },
          { label: "Out for delivery", date: "Today" },
          { label: "Delivered", date: current >= 3 ? "13:42" : "By 14:00" },
        ]}
        trackingNumber="PW 4821 7730 GB"
      />
      <button
        className="flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-2 text-muted-foreground text-xs outline-none transition-[color,opacity] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-0"
        disabled={tick < 2}
        onClick={() => setRun((n) => n + 1)}
        type="button"
      >
        <RotateCcwIcon className="size-3.5" />
        Replay delivery
      </button>
    </div>
  );
}
