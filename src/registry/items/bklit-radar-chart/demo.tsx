import type { RadarMetric } from "@/components/charts/radar-context";
import { type EvalModel, ModelEvalRadarCard } from "@/registry/items/bklit-radar-chart/bklit-radar-chart";

const metrics: RadarMetric[] = [
  { key: "reasoning", label: "Reasoning" },
  { key: "coding", label: "Coding" },
  { key: "math", label: "Math" },
  { key: "speed", label: "Speed" },
  { key: "cost", label: "Low cost" },
  { key: "context", label: "Context" },
];

const models: EvalModel[] = [
  {
    name: "Atlas 2",
    color: "var(--color-indigo-500)",
    swatch: "bg-indigo-500",
    scores: { reasoning: 88, coding: 91, math: 79, speed: 54, cost: 48, context: 86 },
  },
  {
    name: "Nimbus Mini",
    color: "var(--color-teal-400)",
    swatch: "bg-teal-400",
    scores: { reasoning: 66, coding: 70, math: 61, speed: 93, cost: 90, context: 58 },
  },
];

export default function BklitRadarChartDemo() {
  return <ModelEvalRadarCard metrics={metrics} models={models} subtitle="Internal suite · October 2026" />;
}
