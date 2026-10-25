import { FeatureBento } from "@/registry/items/feature-bento/feature-bento";

export default function FeatureBentoDemo() {
  return (
    <div className="px-4 py-12 sm:px-8 sm:py-16">
      <FeatureBento
        description="Paperlane keeps docs, decisions and the busywork around them in one quiet workspace."
        eyebrow="Features"
        features={[
          {
            title: "Search that finds the doc you meant",
            description: "Type three letters and the right page is already on top, with every match marked.",
            demo: "search",
            span: 4,
          },
          {
            title: "A shortcut for everything",
            description: "Open, publish and jump around without leaving the keyboard.",
            demo: "shortcuts",
          },
          {
            title: "Every version, kept",
            description: "Scrub back through any page and restore the paragraph you miss.",
            demo: "history",
          },
          {
            title: "Busywork on autopilot",
            description: "Chain small steps into flows that run whenever something lands.",
            demo: "automation",
          },
          {
            title: "Know what gets read",
            description: "See which pages people open, finish and share each week.",
            demo: "insights",
          },
        ]}
        title="Everything your team writes, in one calm place."
      />
    </div>
  );
}
