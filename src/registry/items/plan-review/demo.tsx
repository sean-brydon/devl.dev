import { PlanReview, type PlanStep } from "@/registry/items/plan-review/plan-review";

const steps: PlanStep[] = [
  { id: "s1", label: "Read open issues labeled bug", tool: "github.search", duration: 1600 },
  { id: "s2", label: "Group them by component", tool: "think", duration: 1200 },
  {
    id: "s3",
    label: "Reproduce the top three locally",
    tool: "shell",
    duration: 2600,
    failOnce: true,
    error: "Exit 1: port 5173 is already in use",
  },
  { id: "s4", label: "Write a failing test for each", tool: "editor", duration: 2000 },
  { id: "s5", label: "Open a draft pull request", tool: "github.pr", duration: 1400 },
];

export default function PlanReviewDemo() {
  return <PlanReview agent="Wren" steps={steps} title="Fix the top bugs in Lumen" />;
}
