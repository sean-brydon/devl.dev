import { GrowthChart } from "@/registry/items/growth-chart/growth-chart";

export default function GrowthChartDemo() {
  return (
    <GrowthChart
      data={[
        { label: "Jan", value: 18400 },
        { label: "Feb", value: 22900 },
        { label: "Mar", value: 21300 },
        { label: "Apr", value: 29800 },
        { label: "May", value: 34900 },
        { label: "Jun", value: 48200 },
      ]}
      hue="emerald"
      title="Record month"
    />
  );
}
