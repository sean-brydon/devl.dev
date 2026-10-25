import { ProductShotHero } from "@/registry/items/product-shot-hero/product-shot-hero";

export default function ProductShotHeroDemo() {
  return (
    <div className="overflow-hidden px-4 py-12 sm:px-8 sm:py-16">
      <ProductShotHero
        description="Tallyhaus issues every card, chases every receipt and codes every line, so month-end is a review, not a rescue."
        eyebrow="Spend management for small finance teams"
        logos={[
          { name: "Halden", mark: "ring" },
          { name: "Kitebird", mark: "wedge" },
          { name: "Orchard Lane", mark: "leaf" },
          { name: "Pinecrest", mark: "stack" },
          { name: "Brightwater", mark: "spark" },
          { name: "Tessel", mark: "grid" },
        ]}
        matches={[
          { merchant: "Framewise", amount: "$45.00", card: "•• 4417" },
          { merchant: "Docket", amount: "$96.00", card: "•• 2290" },
          { merchant: "Hopper Rides", amount: "$23.18", card: "•• 4417" },
          { merchant: "Cobalt Cloud", amount: "$1,204.55", card: "•• 0081" },
        ]}
        primaryCta={{ label: "Get started", href: "#start" }}
        proof={{
          initials: ["AP", "MD", "IK", "RT"],
          text: (
            <>
              <span className="font-medium text-foreground">2,100 finance teams</span>
              <br />
              closed October in under two days
            </>
          ),
        }}
        secondaryCta={{ label: "Watch the tour", href: "#tour" }}
        title="Close the books"
        titleQuiet="before Friday lunch."
      />
    </div>
  );
}
