"use client";

import { Facets, type FacetGroup } from "@/registry/items/facets/facets";

const dot = (className: string) => <span className={`size-2 rounded-full ${className}`} />;

const groups: FacetGroup[] = [
  {
    id: "status",
    label: "Status",
    options: [
      { value: "backlog", label: "Backlog", count: 42, icon: dot("bg-muted-foreground") },
      { value: "todo", label: "Todo", count: 31, icon: dot("bg-info") },
      { value: "progress", label: "In progress", count: 18, icon: dot("bg-warning") },
      { value: "done", label: "Done", count: 37, icon: dot("bg-success") },
    ],
  },
  {
    id: "priority",
    label: "Priority",
    options: [
      { value: "urgent", label: "Urgent", count: 4, icon: dot("bg-destructive") },
      { value: "high", label: "High", count: 19 },
      { value: "medium", label: "Medium", count: 56 },
      { value: "low", label: "Low", count: 49 },
    ],
  },
  {
    id: "assignee",
    label: "Assignee",
    options: [
      { value: "mara", label: "Mara Okafor", count: 22 },
      { value: "ines", label: "Ines Varga", count: 17 },
      { value: "sam", label: "Sam Adeyemi", count: 25 },
      { value: "none", label: "Unassigned", count: 64 },
    ],
  },
  {
    id: "labels",
    label: "Labels",
    options: [
      { value: "bug", label: "Bug", count: 33 },
      { value: "feature", label: "Feature", count: 51 },
      { value: "design", label: "Design", count: 14 },
      { value: "perf", label: "Performance", count: 9 },
    ],
  },
];

export default function FacetsDemo() {
  return (
    <Facets
      defaultValue={{ status: ["todo", "progress"], priority: ["urgent"] }}
      groups={groups}
      summary={(value) => {
        const picked = Object.values(value).flat().length;
        const shown = Math.max(3, Math.round(128 / (1 + picked * 0.9)));
        return (
          <>
            Showing <span className="font-medium text-foreground tabular-nums">{picked ? shown : 128}</span> of 128 issues
          </>
        );
      }}
    />
  );
}
