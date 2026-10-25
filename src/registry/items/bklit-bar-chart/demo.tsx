import { CloudSpendBarCard, type SpendMonth } from "@/registry/items/bklit-bar-chart/bklit-bar-chart";

const months: SpendMonth[] = [
  { month: "May", compute: 4120, storage: 1380, network: 640 },
  { month: "Jun", compute: 4480, storage: 1420, network: 710 },
  { month: "Jul", compute: 4310, storage: 1510, network: 690 },
  { month: "Aug", compute: 5260, storage: 1560, network: 820 },
  { month: "Sep", compute: 5840, storage: 1640, network: 910 },
  { month: "Oct", compute: 5410, storage: 1720, network: 880 },
];

export default function BklitBarChartDemo() {
  return <CloudSpendBarCard budget={9000} months={months} />;
}
