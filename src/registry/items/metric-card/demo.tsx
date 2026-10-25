import { MetricCard } from "@/registry/items/metric-card/metric-card";

export default function MetricCardDemo() {
  return <MetricCard series={[{ name: "Organic" }, { name: "Paid" }, { name: "Referral" }]} title="Active users" />;
}
