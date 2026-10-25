import { BranchGraph, type Commit } from "@/registry/items/branch-graph/branch-graph";

const mira = { name: "Mira Okafor", className: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300" };
const tomas = { name: "Tomás Reyes", className: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300" };
const june = { name: "June Park", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" };
const ada = { name: "Ada Lindqvist", className: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" };

const commits: Commit[] = [
  {
    sha: "a1f9c2e4b7d0",
    message: "Merge pull request #482 from feat/annual-billing",
    author: mira,
    date: "2026-10-23T16:42:00Z",
    parents: ["f9c03b18e2aa", "b7e51d0c9f31"],
    refs: [
      { name: "main", type: "branch", current: true },
      { name: "v2.5.0", type: "tag" },
    ],
  },
  {
    sha: "b7e51d0c9f31",
    message: "Show savings badge on the annual toggle",
    body: "The badge reads the discount from the plan instead of hard-coding 20%.",
    author: tomas,
    date: "2026-10-23T14:05:00Z",
    parents: ["b6d2a9f01c44"],
    refs: [{ name: "feat/annual-billing", type: "branch" }],
    stats: { files: 3, additions: 64, deletions: 12 },
  },
  {
    sha: "f9c03b18e2aa",
    message: "Raise API rate limit to 120 requests a minute",
    author: june,
    date: "2026-10-23T11:20:00Z",
    parents: ["e0a7c55d2b19"],
    stats: { files: 1, additions: 6, deletions: 4 },
  },
  {
    sha: "b6d2a9f01c44",
    message: "Prorate seat changes mid-cycle",
    body: "Upgrades charge the remaining days now; downgrades credit the next invoice.",
    author: tomas,
    date: "2026-10-22T17:48:00Z",
    parents: ["b5a1e7730d82"],
    stats: { files: 7, additions: 211, deletions: 38 },
  },
  {
    sha: "e0a7c55d2b19",
    message: "Merge pull request #479 from fix/webhook-retry",
    author: mira,
    date: "2026-10-22T15:02:00Z",
    parents: ["e44f90b3a6c1", "c2d81f4e07ab"],
    refs: [{ name: "v2.4.1", type: "tag" }],
  },
  {
    sha: "c2d81f4e07ab",
    message: "Retry failed webhooks with exponential backoff",
    author: ada,
    date: "2026-10-22T10:31:00Z",
    parents: ["c19b03aa58de"],
    refs: [{ name: "fix/webhook-retry", type: "branch" }],
    stats: { files: 4, additions: 97, deletions: 21 },
  },
  {
    sha: "b5a1e7730d82",
    message: "Add annual plan to the pricing table",
    author: tomas,
    date: "2026-10-21T16:14:00Z",
    parents: ["e44f90b3a6c1"],
    stats: { files: 5, additions: 142, deletions: 9 },
  },
  {
    sha: "c19b03aa58de",
    message: "Log every delivery attempt with its status",
    author: ada,
    date: "2026-10-21T12:40:00Z",
    parents: ["e44f90b3a6c1"],
    stats: { files: 2, additions: 33, deletions: 2 },
  },
  {
    sha: "e44f90b3a6c1",
    message: "Cache invoice PDFs for 24 hours",
    author: june,
    date: "2026-10-20T09:55:00Z",
    parents: ["d31c6b2f9e70"],
    refs: [{ name: "v2.4.0", type: "tag" }],
    stats: { files: 3, additions: 48, deletions: 17 },
  },
  {
    sha: "d31c6b2f9e70",
    message: "Fix rounding on EUR invoices with VAT",
    author: mira,
    date: "2026-10-18T14:27:00Z",
    parents: ["c2001ab9d4f5"],
    stats: { files: 2, additions: 11, deletions: 7 },
  },
];

export default function BranchGraphDemo() {
  return <BranchGraph commits={commits} title="northwind-web" />;
}
