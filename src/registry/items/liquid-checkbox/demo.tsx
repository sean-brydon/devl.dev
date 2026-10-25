"use client";

import { useState } from "react";
import { LiquidCheckbox } from "@/registry/items/liquid-checkbox/liquid-checkbox";

const STEPS = [
  { id: "dns", label: "Point DNS at the new region", note: "TTL is 300s, give it five minutes" },
  { id: "keys", label: "Rotate the staging API keys" },
  { id: "smoke", label: "Run the smoke tests on eu-west" },
  { id: "notes", label: "Publish the changelog" },
  { id: "support", label: "Give support a heads-up" },
];

export default function LiquidCheckboxDemo() {
  const [done, setDone] = useState<string[]>(["dns", "keys"]);
  const all = done.length === STEPS.length;

  return (
    <div className="w-80 max-w-full rounded-2xl border bg-card shadow-xs/5">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <LiquidCheckbox
          checked={all}
          fill={done.length / STEPS.length}
          label={<span className="font-medium">Launch checklist</span>}
          onCheckedChange={(next) => setDone(next ? STEPS.map((s) => s.id) : [])}
          tone="success"
        />
        <span className="font-mono text-muted-foreground text-xs tabular-nums">
          {done.length}/{STEPS.length}
        </span>
      </div>
      <div className="grid gap-3.5 p-4">
        {STEPS.map((step) => (
          <LiquidCheckbox
            checked={done.includes(step.id)}
            description={step.note}
            key={step.id}
            label={step.label}
            onCheckedChange={(next) => setDone((d) => (next ? [...d, step.id] : d.filter((id) => id !== step.id)))}
            strike
          />
        ))}
      </div>
    </div>
  );
}
