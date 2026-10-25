import { StatsBand } from "@/registry/items/stats-band/stats-band";

export default function StatsBandDemo() {
  return (
    <div className="px-4 py-12 sm:px-8 sm:py-16">
      <StatsBand
        description="Numbers from the last twelve months, updated on the first of every month."
        eyebrow="By the numbers"
        stats={[
          { value: 2.4, decimals: 1, suffix: "M", label: "Docs written last month", caption: "Up from 1.1M a year ago" },
          { value: 99.99, decimals: 2, suffix: "%", label: "Uptime, rolling year", caption: "Four minutes of downtime in total" },
          { value: 38, suffix: "ms", label: "Median search time", caption: "Across 40 million pages" },
          { value: 140, suffix: "+", label: "Countries with teams", caption: "From two-person studios to 9,000 seats" },
        ]}
        title="Quietly holding up a lot of writing."
      />
    </div>
  );
}
