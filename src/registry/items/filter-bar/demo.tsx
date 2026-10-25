"use client";

import { FilterBar, type Issue } from "@/registry/items/filter-bar/filter-bar";

const issues: Issue[] = [
  { id: "ENG-412", title: "Webhook retries fire twice after a timeout", status: "in_progress", priority: "high", assignee: "riley", labels: ["bug"], estimate: 3 },
  { id: "ENG-409", title: "Chart tooltips use the wrong surface in dark mode", status: "todo", priority: "medium", assignee: "noor", labels: ["bug", "design"], estimate: 1 },
  { id: "ENG-405", title: "SAML just-in-time provisioning", status: "in_review", priority: "high", assignee: "sam", labels: ["feature"], estimate: 5 },
  { id: "ENG-401", title: "Invoices list is slow for teams over 500 seats", status: "todo", priority: "urgent", assignee: "riley", labels: ["perf"], estimate: 3 },
  { id: "ENG-398", title: "Document the new rate limit headers", status: "backlog", priority: "low", assignee: "none", labels: ["docs"], estimate: 1 },
  { id: "ENG-396", title: "Bulk archive from the inbox", status: "in_progress", priority: "medium", assignee: "kai", labels: ["feature"], estimate: 3 },
  { id: "ENG-391", title: "CSV export drops rows that contain emoji", status: "done", priority: "high", assignee: "riley", labels: ["bug"], estimate: 2 },
  { id: "ENG-388", title: "Cache workspace settings at the edge", status: "in_review", priority: "medium", assignee: "kai", labels: ["perf"], estimate: 5 },
  { id: "ENG-385", title: "Copy pass on the onboarding checklist", status: "todo", priority: "low", assignee: "noor", labels: ["design", "docs"], estimate: 1 },
  { id: "ENG-380", title: "Shortcut for switching teams", status: "backlog", priority: "none", assignee: "none", labels: ["feature"], estimate: 2 },
  { id: "ENG-377", title: "Date picker overflows on small screens", status: "in_progress", priority: "high", assignee: "noor", labels: ["bug", "design"], estimate: 2 },
  { id: "ENG-372", title: "Retire the legacy billing worker", status: "canceled", priority: "low", assignee: "sam", labels: ["perf"], estimate: 8 },
  { id: "ENG-369", title: "Filter the audit log by actor", status: "todo", priority: "medium", assignee: "riley", labels: ["feature"], estimate: 3 },
  { id: "ENG-364", title: "Search ignores accents in names", status: "done", priority: "medium", assignee: "sam", labels: ["bug"], estimate: 2 },
];

export default function FilterBarDemo() {
  return (
    <FilterBar
      defaultQuery={{
        kind: "group",
        combinator: "and",
        children: [
          { kind: "rule", field: "status", operator: "notIn", value: ["done", "canceled"] },
          { kind: "rule", field: "labels", operator: "hasAny", value: ["bug", "perf"] },
        ],
      }}
      issues={issues}
      me="riley"
    />
  );
}
