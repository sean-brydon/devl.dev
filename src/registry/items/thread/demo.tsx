import { Thread } from "@/registry/items/thread/thread";

export default function ThreadDemo() {
  return (
    <Thread
      comment={{
        id: "c1",
        author: { name: "Mara Lindqvist", initials: "ML", tone: "info" },
        time: "10:42",
        body: "The pricing table still shows last quarter's numbers. @Otto can you check, or ask @Fern to?",
      }}
      currentUser={{ name: "Otto Brand", initials: "OB", tone: "warning" }}
      mentionable={["Mara", "Otto", "Fern", "Juno"]}
      replies={[
        {
          id: "r1",
          author: { name: "Otto Brand", initials: "OB", tone: "warning" },
          time: "10:51",
          body: "@Fern this one's yours — I think the CSV import missed the new tiers.",
        },
        {
          id: "r2",
          author: { name: "Fern", initials: "FE", assistant: true },
          time: "10:52",
          body: "Updated the table from the October price sheet and flagged one mismatch for @Mara to confirm.",
          steps: [
            { label: "Read pricing-oct.csv", detail: "4 tiers · 12 rows" },
            { label: "Replaced 9 cells in Pricing", detail: "Starter, Team, Scale" },
            { label: "Enterprise left as is", detail: "price is 'contact us'", status: "skipped" },
            { label: "Left a note on Scale/yr", detail: "€1,180 vs €1,128" },
          ],
        },
      ]}
    />
  );
}
