"use client";

import { RotateCcwIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control";
import { InkStamp, type InkStampTone, StampSurface } from "@/registry/items/ink-stamp/ink-stamp";

const stamps: { id: string; label: string; caption: string; tone: InkStampTone }[] = [
  { id: "approved", label: "Approved", caption: "24 Oct 2026", tone: "emerald" },
  { id: "paid", label: "Paid", caption: "By wire · 24 Oct", tone: "rose" },
  { id: "shipped", label: "Shipped", caption: "Parcel 48 0172", tone: "violet" },
];

const lines = [
  { item: "Brand refresh, phase 2", qty: "1", amount: 3200 },
  { item: "Motion kit licence", qty: "3", amount: 720 },
  { item: "Print proofs", qty: "12", amount: 360 },
];

const money = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

export default function InkStampDemo() {
  const [active, setActive] = useState(stamps[0]);
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setCount((c) => c ?? 1), 700);
    return () => clearTimeout(timer);
  }, []);

  const stamp = (next = active) => {
    setActive(next);
    setCount((c) => (c ?? 0) + 1);
  };

  return (
    <StampSurface className="w-full max-w-[380px] rounded-2xl border bg-card p-5 shadow-xs/5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-muted-foreground text-xs">Invoice</span>
          <span className="font-medium font-mono text-sm">INV-2041</span>
        </div>
        <div className="flex flex-col items-end gap-0.5 text-right">
          <span className="text-muted-foreground text-xs">Billed to</span>
          <span className="font-medium text-sm">Halcyon Labs</span>
        </div>
      </div>

      <div className="relative mt-5 flex flex-col gap-2.5 border-t pt-4">
        {lines.map((l) => (
          <div className="flex items-baseline justify-between gap-3 text-sm" key={l.item}>
            <span className="min-w-0 truncate">{l.item}</span>
            <span className="shrink-0 text-muted-foreground tabular-nums">
              <span className="mr-3 text-xs">×{l.qty}</span>
              {money(l.amount)}
            </span>
          </div>
        ))}
        <div className="mt-1 flex items-baseline justify-between border-t pt-3">
          <span className="text-muted-foreground text-xs">Total due</span>
          <span className="font-semibold text-lg tabular-nums">{money(4280)}</span>
        </div>
        <InkStamp
          caption={active.caption}
          className="absolute top-3 left-1/2 -translate-x-1/2"
          label={active.label}
          stampKey={count === null ? null : `${active.id}-${count}`}
          tone={active.tone}
        />
      </div>

      <div className="mt-5 flex items-center justify-between gap-2 border-t pt-4">
        <SegmentedControl aria-label="Stamp">
          {stamps.map((s) => (
            <SegmentedControlItem
              aria-pressed={active.id === s.id}
              data-pressed={active.id === s.id ? "" : undefined}
              key={s.id}
              onClick={() => stamp(s)}
            >
              {s.label}
            </SegmentedControlItem>
          ))}
        </SegmentedControl>
        <Button
          aria-label="Stamp again"
          className="transition-[scale,box-shadow] duration-150 active:scale-[0.97]"
          onClick={() => stamp()}
          size="icon"
          variant="outline"
        >
          <RotateCcwIcon />
        </Button>
      </div>
    </StampSurface>
  );
}
