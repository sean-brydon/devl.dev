import { Rewind, type RewindChange } from "@/registry/items/rewind/rewind";

const changes: RewindChange[] = [
  { id: "col", kind: "database", title: "Renamed a column", target: "accounts", before: "billing_tier", after: "plan", at: "14:02" },
  { id: "api", kind: "file", title: "Updated the accounts API", target: "src/api/accounts.ts", before: "row.billing_tier", after: "row.plan", at: "14:03" },
  {
    id: "mail",
    kind: "email",
    title: "Emailed beta customers",
    target: "38 recipients",
    before: "draft",
    after: "sent",
    at: "14:05",
    irreversible: "Those 38 emails are already in inboxes, and email can’t be unsent.",
  },
  { id: "flag", kind: "setting", title: "Turned on new pricing", target: "flags/new-pricing", before: "off", after: "on", at: "14:06" },
  { id: "price", kind: "setting", title: "Raised the Team price", target: "plans/team", before: "$12 / seat", after: "$14 / seat", at: "14:08" },
  { id: "copy", kind: "file", title: "Rewrote the pricing page", target: "pricing.mdx", before: "$12", after: "$14", at: "14:09" },
  { id: "post", kind: "message", title: "Posted the announcement", target: "#launches", before: "—", after: "“Team pricing is live”", at: "14:11" },
];

const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 700));

export default function RewindDemo() {
  return <Rewind agent="Atlas" changes={changes} defaultAt={5} onRewind={settle} onUndo={settle} task="Roll out new Team pricing for Northwind" />;
}
