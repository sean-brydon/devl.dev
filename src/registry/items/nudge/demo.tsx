import { Nudge } from "@/registry/items/nudge/nudge";

export default function NudgeDemo() {
  return (
    <Nudge
      options={[
        {
          id: "thu",
          label: "Thu 14:00",
          title: "Move the design review to Thursday 14:00",
          detail: "All 5 people are free and nobody has a meeting right after.",
          confidence: 0.92,
          reasons: ["Kai is out Wednesday afternoon", "Thursday has the fewest meetings this week"],
          result: "Moved to Thu 14:00",
        },
        {
          id: "wed",
          label: "Wed 09:30",
          title: "Keep Wednesday, start at 09:30",
          detail: "Fits 4 of 5 – Kai would join async from notes.",
          confidence: 0.64,
          reasons: ["Earliest slot this week", "Kai can't make it"],
          result: "Moved to Wed 09:30",
        },
        {
          id: "async",
          label: "Go async",
          title: "Skip the meeting and review in the doc",
          detail: "Comments due Friday noon.",
          confidence: 0.38,
          reasons: ["Last two reviews ran under 15 min"],
          result: "Switched to an async review",
        },
      ]}
    />
  );
}
