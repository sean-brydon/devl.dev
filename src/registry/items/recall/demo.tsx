import { Recall } from "@/registry/items/recall/recall";

export default function RecallDemo() {
  return (
    <Recall
      assistantName="Atlas"
      memories={[
        { id: "1", category: "Work", text: "Leads the mobile team at Brightfold", source: "From chat · 2 Oct" },
        { id: "2", category: "Work", text: "Sprint planning is on Mondays at 10:00", source: "From calendar" },
        { id: "3", category: "Work", text: "Prefers PR summaries as bullet points", source: "From chat · 18 Sep" },
        { id: "4", category: "Preferences", text: "Uses metric units", source: "From chat · 11 Sep" },
        { id: "5", category: "Preferences", text: "Wants replies short, no emoji", source: "You told me" },
        { id: "6", category: "Personal", text: "Training for a half marathon in March", source: "From chat · 29 Aug", paused: true },
        { id: "7", category: "Personal", text: "Vegetarian", source: "You told me" },
      ]}
    />
  );
}
