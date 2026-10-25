import type { HeatmapColumn } from "@/components/charts/heatmap";
import { DeployHeatmapCard } from "@/registry/items/bklit-heatmap-chart/bklit-heatmap-chart";

const FIRST_SUNDAY = new Date(2026, 4, 3);
const WEEKS = 25;

function noise(i: number) {
  const x = Math.sin(i * 39.425) * 43758.5453;
  return x - Math.floor(x);
}

const weeks: HeatmapColumn[] = Array.from({ length: WEEKS }, (_, week) => ({
  bin: week,
  bins: Array.from({ length: 7 }, (_, day) => {
    const date = new Date(FIRST_SUNDAY);
    date.setDate(FIRST_SUNDAY.getDate() + week * 7 + day);
    const n = week * 7 + day;
    const weekend = day === 0 || day === 6;
    const freeze = week >= 11 && week <= 12;
    const r = noise(n);
    const count = weekend || freeze ? (r > 0.9 ? 1 : 0) : r < 0.12 ? 0 : Math.round(r * 5);
    return { bin: day, count, date };
  }),
}));

export default function BklitHeatmapChartDemo() {
  return <DeployHeatmapCard weeks={weeks} />;
}
