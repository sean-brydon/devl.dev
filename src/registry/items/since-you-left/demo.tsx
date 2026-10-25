import { type SinceYouLeftMetric, SinceYouLeft } from "@/registry/items/since-you-left/since-you-left";

function walk(from: number, to: number, points: number, seed: number) {
  return Array.from({ length: points }, (_, i) => {
    const t = i / (points - 1);
    const wobble = i === 0 || i === points - 1 ? 0 : (Math.sin(i * 1.3 + seed) * 0.7 + Math.sin(i * 0.5 + seed * 2) * 0.3) * Math.max(Math.abs(to - from) * 0.22, Math.abs(from) * 0.02);
    return from + (to - from) * t + wobble;
  });
}

const usd = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }).format(v);
const pct = (v: number) => `${v.toFixed(1)}%`;
const ms = (v: number) => `${Math.round(v)}ms`;
const num = (v: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(v);

const metrics: SinceYouLeftMetric[] = [
  {
    id: "users",
    label: "Active users",
    format: num,
    series: { visit: walk(8120, 8790, 4, 1), week: walk(7640, 8790, 8, 2), month: walk(6210, 8790, 12, 3) },
  },
  {
    id: "revenue",
    label: "Revenue",
    format: usd,
    series: { visit: walk(41800, 42100, 4, 4), week: walk(44200, 42100, 8, 5), month: walk(36500, 42100, 12, 6) },
  },
  {
    id: "conversion",
    label: "Conversion",
    format: pct,
    series: { visit: walk(3.4, 3.9, 4, 7), week: walk(3.1, 3.9, 8, 8), month: walk(3.9, 3.9, 12, 9) },
  },
  {
    id: "latency",
    label: "p95 latency",
    good: "down",
    format: ms,
    series: { visit: walk(212, 248, 4, 10), week: walk(265, 248, 8, 11), month: walk(310, 248, 12, 12) },
  },
  {
    id: "churn",
    label: "Churn",
    good: "down",
    format: pct,
    series: { visit: walk(2.1, 2.1, 4, 13), week: walk(2.4, 2.1, 8, 14), month: walk(1.8, 2.1, 12, 15) },
  },
  {
    id: "tickets",
    label: "Open tickets",
    good: "down",
    format: num,
    series: { visit: walk(64, 41, 4, 16), week: walk(52, 41, 8, 17), month: walk(38, 41, 12, 18) },
  },
];

export default function SinceYouLeftDemo() {
  return (
    <SinceYouLeft
      metrics={metrics}
      periods={[
        { id: "visit", label: "Last visit", caption: "Since Tuesday, 3 days ago" },
        { id: "week", label: "7 days", caption: "Compared with last week" },
        { id: "month", label: "30 days", caption: "Compared with September" },
      ]}
      title="Since you were away"
    />
  );
}
