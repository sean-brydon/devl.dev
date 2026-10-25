import { CheckoutFunnelCard, type FunnelPeriod } from "@/registry/items/bklit-funnel-chart/bklit-funnel-chart";

const periods: FunnelPeriod[] = [
  {
    id: "week",
    label: "This week",
    stages: [
      { label: "Visits", value: 48210 },
      { label: "Product", value: 21480 },
      { label: "Cart", value: 6920 },
      { label: "Checkout", value: 2870 },
      { label: "Paid", value: 1964 },
    ],
  },
  {
    id: "last",
    label: "Last week",
    stages: [
      { label: "Visits", value: 45130 },
      { label: "Product", value: 19020 },
      { label: "Cart", value: 5410 },
      { label: "Checkout", value: 2010 },
      { label: "Paid", value: 1268 },
    ],
  },
];

export default function BklitFunnelChartDemo() {
  return <CheckoutFunnelCard periods={periods} />;
}
