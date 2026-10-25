import { type QuarterTarget, QuarterTargetsRingCard } from "@/registry/items/bklit-ring-chart/bklit-ring-chart";

const targets: QuarterTarget[] = [
  { label: "New business", value: 642000, target: 900000, color: "var(--color-indigo-500)", swatch: "bg-indigo-500" },
  { label: "Expansion", value: 214000, target: 250000, color: "var(--color-sky-400)", swatch: "bg-sky-400" },
  { label: "Renewals", value: 1310000, target: 1500000, color: "var(--color-teal-400)", swatch: "bg-teal-400" },
];

export default function BklitRingChartDemo() {
  return <QuarterTargetsRingCard daysLeft={67} targets={targets} />;
}
