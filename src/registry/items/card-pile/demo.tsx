import { CardPile } from "@/registry/items/card-pile/card-pile";

export default function CardPileDemo() {
  return (
    <CardPile
      notices={[
        {
          id: "1",
          title: "Deploy finished",
          body: "harbor-web is live on production. 0 errors in the first 5 minutes.",
          time: "now",
          tone: "success",
          action: "Open",
        },
        {
          id: "2",
          title: "Ada requested a review",
          body: "“Move billing to the new ledger” · 14 files changed",
          time: "4m",
          tone: "info",
          action: "Review",
        },
        {
          id: "3",
          title: "Card expiring soon",
          body: "The Visa on the Pinecrest workspace expires in 9 days.",
          time: "1h",
          tone: "warning",
          action: "Update",
        },
        {
          id: "4",
          title: "Nightly backup failed",
          body: "Storage quota reached on bucket ledger-archive.",
          time: "6h",
          tone: "destructive",
        },
        { id: "5", title: "Weekly digest is ready", body: "12 merged PRs, 3 incidents, 1 new teammate.", time: "1d" },
      ]}
    />
  );
}
