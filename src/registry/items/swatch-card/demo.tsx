import { SwatchCard } from "@/registry/items/swatch-card/swatch-card";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function SwatchCardDemo() {
  return (
    <SwatchCard
      defaultSize="750"
      defaultSwatch="sage"
      name="Fieldwell Bottle"
      onAdd={() => wait(700)}
      rating={4.8}
      reviews={212}
      sizes={[
        { id: "500", label: "500 ml", price: 32, scale: 0.74 },
        { id: "750", label: "750 ml", price: 36, scale: 0.87 },
        { id: "1000", label: "1 L", price: 42, scale: 1 },
      ]}
      swatches={[
        { id: "sage", name: "Sage", color: "color-mix(in oklch, var(--color-emerald-600) 55%, var(--color-stone-400))" },
        { id: "clay", name: "Clay", color: "color-mix(in oklch, var(--color-orange-600) 70%, var(--color-stone-500))", soldOut: ["1000"] },
        { id: "ink", name: "Ink", color: "var(--color-slate-800)", accent: "var(--color-slate-950)" },
        { id: "sand", name: "Sand", color: "var(--color-stone-300)", accent: "var(--color-stone-500)" },
        { id: "lagoon", name: "Lagoon", color: "var(--color-cyan-600)" },
      ]}
      tagline="Insulated steel · 24 h cold, 12 h hot"
    />
  );
}
