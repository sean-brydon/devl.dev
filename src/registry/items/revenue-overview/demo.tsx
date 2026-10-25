import { RevenueOverview } from "@/registry/items/revenue-overview/revenue-overview";

export default function RevenueOverviewDemo() {
  return (
    <RevenueOverview
      defaultRange="30d"
      store={{ name: "Fernwood Goods", plan: "Growth plan" }}
      user={{ name: "Ines Moreau", email: "ines@fernwood.shop" }}
    />
  );
}
