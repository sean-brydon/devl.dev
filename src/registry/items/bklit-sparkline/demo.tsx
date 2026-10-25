import { type Kpi, type KpiPoint, KpiSparklineGrid } from "@/registry/items/bklit-sparkline/bklit-sparkline";

const dayFmt = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" });

function series(values: number[]): KpiPoint[] {
  return values.map((value, i) => {
    const date = new Date(2026, 9, 11 + i);
    return { label: dayFmt.format(date), value };
  });
}

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const whole = new Intl.NumberFormat("en-US");

const kpis: Kpi[] = [
  {
    id: "mrr",
    name: "MRR",
    kind: "area",
    format: (v) => usd.format(v),
    points: series([84120, 84390, 84510, 85020, 85260, 85240, 85710, 86180, 86440, 86390, 86920, 87310, 87680, 88040]),
  },
  {
    id: "dau",
    name: "Active users",
    kind: "line",
    format: (v) => whole.format(v),
    points: series([5020, 6480, 6390, 6720, 6880, 6950, 5120, 4980, 6910, 7020, 7180, 7090, 7240, 5410]),
  },
  {
    id: "signups",
    name: "Signups",
    kind: "bar",
    format: (v) => whole.format(v),
    points: series([96, 168, 155, 181, 176, 184, 94, 88, 190, 204, 198, 211, 215, 102]),
  },
  {
    id: "churn",
    name: "Churned",
    kind: "line",
    lowerIsBetter: true,
    format: (v) => whole.format(v),
    points: series([9, 7, 11, 8, 6, 4, 5, 7, 6, 5, 4, 6, 3, 4]),
  },
];

export default function BklitSparklineDemo() {
  return <KpiSparklineGrid kpis={kpis} />;
}
