import { PourHero } from "@/registry/items/pour-hero/pour-hero";

export default function PourHeroDemo() {
  return (
    <PourHero
      description="Pourwell reads your sheet, works out the forms, views and permissions, and hands your team a working tool in about a minute."
      headline={["Pour in a spreadsheet.", "Pour out an app."]}
      primaryAction={{ label: "Pour in a sheet", href: "#start" }}
      secondaryAction={{ label: "Watch the 90-second tour", href: "#tour" }}
    />
  );
}
