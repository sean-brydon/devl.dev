import { ArticleCards } from "@/registry/items/article-cards/article-cards";

export default function ArticleCardsDemo() {
  return (
    <div className="px-4 py-12 sm:px-8 sm:py-16">
      <ArticleCards
        allHref="#journal"
        articles={[
          {
            title: "Why we deleted half our settings page",
            excerpt:
              "Every toggle was a decision we'd pushed onto our customers. Here's how we chose which ones to keep, and what happened to support volume after we shipped it.",
            href: "#settings",
            tags: ["Product", "Design"],
            minutes: 9,
            date: "Oct 22",
            author: { name: "Theo Marchetti" },
            cover: "rings",
            tone: "violet",
          },
          {
            title: "A field guide to writing decisions down",
            href: "#decisions",
            tags: ["Writing"],
            minutes: 6,
            date: "Oct 17",
            author: { name: "Maya Okafor" },
            cover: "pages",
            tone: "amber",
          },
          {
            title: "Building search that answers in 38ms",
            href: "#search",
            tags: ["Engineering"],
            minutes: 12,
            date: "Oct 10",
            author: { name: "Priya Raman" },
            cover: "dots",
            tone: "emerald",
          },
          {
            title: "Offline first, conflicts last",
            excerpt: "How the desktop app merges a week of plane edits paragraph by paragraph without asking you to pick a winner.",
            href: "#offline",
            tags: ["Engineering", "Sync"],
            minutes: 11,
            date: "Oct 3",
            author: { name: "Sasha Kim" },
            cover: "orbit",
            tone: "sky",
          },
          {
            title: "Support as a product surface",
            excerpt: "Our median first reply is under three hours. The trick isn't headcount, it's what happens to a ticket after it's closed.",
            href: "#support",
            tags: ["Customers"],
            minutes: 5,
            date: "Sep 26",
            author: { name: "Diego Alvarez" },
            cover: "waves",
            tone: "rose",
          },
          {
            title: "Subject lines are promises",
            excerpt: "What two years of the Thursday Brief taught us about writing emails people open, read to the end and forward.",
            href: "#email",
            tags: ["Marketing", "Writing"],
            minutes: 4,
            date: "Sep 19",
            author: { name: "Hana Sato" },
            cover: "glyph",
            tone: "indigo",
          },
        ]}
        title="Notes on writing, teams and tools"
      />
    </div>
  );
}
