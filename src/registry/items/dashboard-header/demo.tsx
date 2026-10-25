import { DashboardHeader } from "@/registry/items/dashboard-header/dashboard-header";

export default function DashboardHeaderDemo() {
  return (
    <div className="p-4 sm:p-8">
      <DashboardHeader dailyGoal={2250} title="Storefront overview" />
    </div>
  );
}
