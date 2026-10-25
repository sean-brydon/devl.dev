import { HandoffCard } from "@/registry/items/handoff-card/handoff-card";

export default function HandoffCardDemo() {
  return (
    <HandoffCard
      from={{ name: "Leo Brandt", initials: "LB", avatarClassName: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" }}
      links={[
        { label: "Proration fix for annual plans", meta: "#482", kind: "pr" },
        { label: "Migration runbook", meta: "doc", kind: "doc" },
        { label: "Thread with Finance", meta: "#billing", kind: "thread" },
      ]}
      questions={[
        "Do legacy annual customers keep their price until renewal?",
        "Who signs off on the dry-run numbers, Finance or Ops?",
      ]}
      acceptedAt="4:12 PM"
      sentAt="4:10 PM"
      summary="Phase 1 is live for monthly plans. Annual plans are next: the proration PR is green, and the dry run is booked for Thursday."
      title="Billing migration, phase 2"
      to={{ name: "Ana Ruiz", initials: "AR", avatarClassName: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300" }}
    />
  );
}
