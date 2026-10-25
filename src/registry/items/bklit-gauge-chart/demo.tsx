import { ErrorBudgetGaugeCard, type ServiceBudget } from "@/registry/items/bklit-gauge-chart/bklit-gauge-chart";

const services: ServiceBudget[] = [
  { id: "api", name: "API", slo: 99.95, remaining: 72, burnRate: 0.6, incidents: 1 },
  { id: "web", name: "Web", slo: 99.9, remaining: 38, burnRate: 1.4, incidents: 3 },
  { id: "jobs", name: "Jobs", slo: 99.5, remaining: 11, burnRate: 2.8, incidents: 5 },
];

export default function BklitGaugeChartDemo() {
  return <ErrorBudgetGaugeCard services={services} />;
}
