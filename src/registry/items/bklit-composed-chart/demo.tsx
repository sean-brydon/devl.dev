import { type OrdersWeek, OrdersTrendCard } from "@/registry/items/bklit-composed-chart/bklit-composed-chart";

const FIRST_MONDAY = new Date(2026, 3, 20);
const ORDERS = [
  812, 864, 798, 905, 951, 880, 1012, 1087, 963, 1104, 1180, 1046, 1215, 1290, 1172, 1338, 1402, 1311, 1456, 1520, 1389,
  1574, 1612, 1548, 1690, 1734,
];

const weeks: OrdersWeek[] = ORDERS.map((orders, i) => {
  const date = new Date(FIRST_MONDAY);
  date.setDate(FIRST_MONDAY.getDate() + i * 7);
  return { date, orders };
});

export default function BklitComposedChartDemo() {
  return <OrdersTrendCard weeks={weeks} />;
}
