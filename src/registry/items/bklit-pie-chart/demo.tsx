import { type StorageCategory, StorageDonutCard } from "@/registry/items/bklit-pie-chart/bklit-pie-chart";

const categories: StorageCategory[] = [
  { label: "Video", gigabytes: 412, color: "var(--color-indigo-500)", swatch: "bg-indigo-500" },
  { label: "Photos", gigabytes: 238, color: "var(--color-sky-400)", swatch: "bg-sky-400" },
  { label: "Backups", gigabytes: 154, color: "var(--color-teal-400)", swatch: "bg-teal-400" },
  { label: "Documents", gigabytes: 96, color: "var(--color-amber-400)", swatch: "bg-amber-400" },
  { label: "Other", gigabytes: 41, color: "var(--color-stone-400)", swatch: "bg-stone-400" },
];

export default function BklitPieChartDemo() {
  return <StorageDonutCard capacity={2000} categories={categories} />;
}
