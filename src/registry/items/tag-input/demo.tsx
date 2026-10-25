"use client";

import { TagInput, type TagGroup } from "@/registry/items/tag-input/tag-input";

const GROUPS: TagGroup[] = [
  { id: "area", label: "Area", color: "violet", options: ["frontend", "backend", "infra", "design system", "mobile"] },
  { id: "type", label: "Type", color: "sky", options: ["bug", "feature", "chore", "docs", "performance"] },
  { id: "priority", label: "Priority", color: "rose", options: ["urgent", "high", "low"] },
  { id: "customer", label: "Customer", color: "emerald", options: ["Halcyon Labs", "Orbital Foods", "Pinecrest"] },
];

export default function TagInputDemo() {
  return (
    <div className="grid w-96 max-w-full gap-4 rounded-2xl border bg-card p-5 shadow-xs/5">
      <div className="grid gap-0.5">
        <p className="font-mono text-muted-foreground text-xs">NW-482</p>
        <p className="text-pretty font-medium text-sm">Checkout button stays disabled after a failed card retry</p>
      </div>
      <TagInput
        defaultValue={[
          { value: "frontend", group: "area" },
          { value: "bug", group: "type" },
          { value: "Halcyon Labs", group: "customer" },
        ]}
        groups={GROUPS}
        label="Labels"
        max={8}
        placeholder="Add a label…"
      />
    </div>
  );
}
