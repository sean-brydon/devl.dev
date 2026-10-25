import { type TriageItem, TriageDesk } from "@/registry/items/triage-desk/triage-desk";

const items: TriageItem[] = [
  {
    id: "r1",
    title: "Reply to a refund request",
    agent: "Plover",
    kind: "Support reply",
    risk: 82,
    body: [
      { text: "Hi Dana, I've " },
      { text: "issued a full refund of $1,240", risk: "high", note: "Over the $500 limit agents can refund alone" },
      { text: " to your card and " },
      { text: "waived the restocking fee", risk: "medium", note: "Policy keeps the fee for opened items" },
      { text: ". You should see it in 3 to 5 days." },
    ],
  },
  {
    id: "r2",
    title: "Lower the search cache TTL",
    agent: "Kestrel",
    kind: "Config change",
    risk: 38,
    body: [
      { text: "Changed the search cache TTL from 300s to " },
      { text: "30s", risk: "medium", note: "About 10x more database reads at peak" },
      { text: " so new listings show up faster." },
    ],
  },
  {
    id: "r3",
    title: "Outage update to 1,200 customers",
    agent: "Finch",
    kind: "Email",
    risk: 64,
    body: [
      { text: "We're sorry for Tuesday's downtime. " },
      { text: "All data was fully restored", risk: "high", note: "Incident log still lists 14 accounts as pending" },
      { text: " and we've added extra monitoring. " },
      { text: "Every affected account gets a free month.", risk: "medium", note: "Credit not signed off by finance" },
    ],
  },
  {
    id: "r4",
    title: "Answer a question about exports",
    agent: "Wren",
    kind: "Support reply",
    risk: 9,
    body: [{ text: "Yes, you can export any report as CSV from the Reports tab. Let me know if you need anything else." }],
  },
];

export default function TriageDeskDemo() {
  return <TriageDesk items={items} />;
}
