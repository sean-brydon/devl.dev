"use client";

import { SavedViews, type ViewIssue } from "@/registry/items/saved-views/saved-views";

const issues: ViewIssue[] = [
  { id: "ENG-412", title: "Webhook retries fire twice after a timeout", status: "in_progress", priority: "high", assignee: "riley", labels: ["bug"] },
  { id: "ENG-409", title: "Chart tooltips use the wrong surface in dark mode", status: "todo", priority: "medium", assignee: "noor", labels: ["bug", "design"] },
  { id: "ENG-405", title: "SAML just-in-time provisioning", status: "in_review", priority: "high", assignee: "sam", labels: ["feature"] },
  { id: "ENG-401", title: "Invoices list is slow for teams over 500 seats", status: "todo", priority: "urgent", assignee: "riley", labels: ["perf"] },
  { id: "ENG-398", title: "Settings page layout on tablets", status: "backlog", priority: "low", assignee: "noor", labels: ["design"] },
  { id: "ENG-396", title: "Bulk archive from the inbox", status: "in_progress", priority: "medium", assignee: "kai", labels: ["feature"] },
  { id: "ENG-391", title: "CSV export drops rows that contain emoji", status: "done", priority: "high", assignee: "riley", labels: ["bug"] },
  { id: "ENG-388", title: "Cache workspace settings at the edge", status: "in_review", priority: "medium", assignee: "kai", labels: ["perf"] },
  { id: "ENG-385", title: "New empty states for projects", status: "in_review", priority: "low", assignee: "noor", labels: ["design"] },
  { id: "ENG-377", title: "Date picker overflows on small screens", status: "in_progress", priority: "urgent", assignee: "noor", labels: ["bug", "design"] },
  { id: "ENG-369", title: "Filter the audit log by actor", status: "todo", priority: "medium", assignee: "riley", labels: ["feature"] },
  { id: "ENG-364", title: "Search ignores accents in names", status: "in_review", priority: "medium", assignee: "riley", labels: ["bug"] },
];

export default function SavedViewsDemo() {
  return (
    <SavedViews
      issues={issues}
      me="riley"
      views={[
        { id: "all", name: "All issues", query: { kind: "group", combinator: "and", children: [] } },
        {
          id: "mine",
          name: "My work",
          query: {
            kind: "group",
            combinator: "and",
            children: [
              { kind: "rule", field: "assignee", operator: "in", value: ["riley"] },
              { kind: "rule", field: "status", operator: "in", value: ["todo", "in_progress", "in_review"] },
            ],
          },
        },
        {
          id: "urgent-bugs",
          name: "Urgent bugs",
          query: {
            kind: "group",
            combinator: "and",
            children: [
              { kind: "rule", field: "labels", operator: "hasAny", value: ["bug"] },
              { kind: "rule", field: "priority", operator: "in", value: ["urgent", "high"] },
            ],
          },
        },
        {
          id: "design",
          name: "Design review",
          query: {
            kind: "group",
            combinator: "and",
            children: [
              { kind: "rule", field: "labels", operator: "hasAny", value: ["design"] },
              { kind: "rule", field: "status", operator: "in", value: ["in_review"] },
            ],
          },
        },
      ]}
    />
  );
}
