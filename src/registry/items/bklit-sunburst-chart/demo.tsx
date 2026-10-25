import type { SunburstNode } from "@/components/charts/sunburst-chart";
import { CostSunburstCard } from "@/registry/items/bklit-sunburst-chart/bklit-sunburst-chart";

const costs: SunburstNode = {
  name: "All teams",
  children: [
    {
      name: "Platform",
      children: [
        { name: "Kubernetes", value: 9840 },
        { name: "Postgres", value: 4210 },
        { name: "Redis", value: 1180 },
      ],
    },
    {
      name: "AI",
      children: [
        { name: "GPU inference", value: 11620 },
        { name: "Embeddings", value: 2140 },
        { name: "Vector store", value: 1360 },
      ],
    },
    {
      name: "Data",
      children: [
        { name: "Warehouse", value: 5320 },
        { name: "Pipelines", value: 2470 },
      ],
    },
    {
      name: "Web",
      children: [
        { name: "Edge", value: 2860 },
        { name: "Images", value: 940 },
      ],
    },
    {
      name: "Security",
      children: [
        { name: "Logging", value: 1720 },
        { name: "WAF", value: 610 },
      ],
    },
  ],
};

export default function BklitSunburstChartDemo() {
  return <CostSunburstCard data={costs} />;
}
