import { MeshHero } from "@/registry/items/mesh-hero/mesh-hero";

export default function MeshHeroDemo() {
  return (
    <div className="px-4 py-12 sm:px-8">
      <MeshHero
        announcement={{ tag: "New", label: "Weekly digests, written for you", href: "#digests" }}
        description="Overstory turns scattered docs, tickets and standups into one living roadmap that updates as work lands, not when someone remembers."
        notes={["Free up to 10 seats", "SOC 2 Type II", "Set up in four minutes"]}
        primaryCta={{ label: "Start for free", href: "#start" }}
        secondaryCta={{ label: "Book a demo", href: "#demo" }}
        title="Plans that move"
        titleQuiet="as fast as your team."
      />
    </div>
  );
}
