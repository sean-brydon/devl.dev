import { MiniSheet } from "@/registry/items/mini-sheet/mini-sheet";

export default function MiniSheetDemo() {
  return (
    <MiniSheet
      columns={[
        { key: "company", label: "Company", width: 152 },
        { key: "owner", label: "Owner", width: 112 },
        { key: "plan", label: "Plan", width: 92 },
        { key: "seats", label: "Seats", type: "number", width: 72 },
        { key: "mrr", label: "MRR", type: "number", width: 96, format: { style: "currency", currency: "USD", maximumFractionDigits: 0 } },
      ]}
      rows={[
        { id: "1", company: "Bluebird Labs", owner: "Maya Ortiz", plan: "Team", seats: 24, mrr: 1920 },
        { id: "2", company: "Kestrel Freight", owner: "Jon Bakker", plan: "Enterprise", seats: 140, mrr: 11200 },
        { id: "3", company: "Pinecone Studio", owner: "Ava Lindqvist", plan: "Pro", seats: 6, mrr: 294 },
        { id: "4", company: "Harbor Analytics", owner: "Theo Nakamura", plan: "Team", seats: 38, mrr: 3040 },
        { id: "5", company: "Orchard Health", owner: "Priya Raman", plan: "Enterprise", seats: 92, mrr: 7360 },
        { id: "6", company: "Lumen & Co", owner: "Sam Okafor", plan: "Starter", seats: 3, mrr: 57 },
        { id: "7", company: "Atlas Robotics", owner: "Lena Fischer", plan: "Pro", seats: 12, mrr: 588 },
      ]}
    />
  );
}
