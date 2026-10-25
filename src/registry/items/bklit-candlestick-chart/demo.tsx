import type { OHLCDataPoint } from "@/components/charts/candlestick-chart";
import { TickerCandlestickCard } from "@/registry/items/bklit-candlestick-chart/bklit-candlestick-chart";

function noise(i: number) {
  const x = Math.sin(i * 91.345) * 47453.5453;
  return x - Math.floor(x) - 0.5;
}

function sessions(count: number, end: Date) {
  const days: Date[] = [];
  const d = new Date(end);
  while (days.length < count) {
    if (d.getDay() !== 0 && d.getDay() !== 6) days.unshift(new Date(d));
    d.setDate(d.getDate() - 1);
  }
  return days;
}

let price = 142.4;
const candles: OHLCDataPoint[] = sessions(63, new Date(2026, 9, 23)).map((date, i) => {
  const drift = i < 24 ? -0.18 : 0.42;
  const open = price + noise(i * 2) * 1.2;
  const close = open + drift + noise(i) * 4.2;
  const high = Math.max(open, close) + Math.abs(noise(i * 3)) * 2.6;
  const low = Math.min(open, close) - Math.abs(noise(i * 5)) * 2.6;
  price = close;
  return { date, open, high, low, close };
});

export default function BklitCandlestickChartDemo() {
  return <TickerCandlestickCard candles={candles} company="Halcyon Labs" symbol="HLCN" />;
}
