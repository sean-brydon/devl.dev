import { type ActiveUsersWeek, ActiveUsersLineCard } from "@/registry/items/bklit-line-chart/bklit-line-chart";

const FIRST_MONDAY = new Date(2026, 3, 27);

const weeks: ActiveUsersWeek[] = Array.from({ length: 26 }, (_, i) => {
  const date = new Date(FIRST_MONDAY);
  date.setDate(FIRST_MONDAY.getDate() + i * 7);
  const summer = i > 7 && i < 15 ? -1600 * Math.sin(((i - 7) / 8) * Math.PI) : 0;
  const current = Math.round(18400 + i * 520 + summer + Math.sin(i * 1.7) * 380);
  const previous = Math.round(15200 + i * 260 + summer * 0.8 + Math.cos(i * 1.3) * 420);
  return { date, current, previous };
});

export default function BklitLineChartDemo() {
  return <ActiveUsersLineCard weeks={weeks} />;
}
