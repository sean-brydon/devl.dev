import { RevenueAreaCard, type RevenuePoint } from "@/registry/items/bklit-area-chart/bklit-area-chart";

const END = new Date(2026, 9, 24);

function noise(i: number) {
  const x = Math.sin(i * 12.9898) * 43758.5453;
  return x - Math.floor(x) - 0.5;
}

const series: RevenuePoint[] = Array.from({ length: 180 }, (_, i) => {
  const date = new Date(END);
  date.setDate(END.getDate() - (179 - i));
  const weekday = date.getDay();
  const weekend = weekday === 0 || weekday === 6 ? 0.86 : 1;
  const trend = 1240 + i * 3.6;
  const wave = Math.sin(i / 14) * 90 + Math.sin(i / 3.1) * 60;
  const revenue = Math.round((trend + wave + noise(i) * 220) * weekend);
  return { date, revenue, orders: Math.round(revenue / (38 + noise(i + 7) * 6)) };
});

export default function BklitAreaChartDemo() {
  return <RevenueAreaCard series={series} />;
}
