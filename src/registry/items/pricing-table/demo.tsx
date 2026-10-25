import { BuildingIcon, RocketIcon, SproutIcon } from "lucide-react";
import { PricingTable } from "@/registry/items/pricing-table/pricing-table";

export default function PricingTableDemo() {
  return (
    <div className="px-4 py-12 sm:px-8">
      <PricingTable
        features={[
          {
            name: "Workspace",
            rows: [
              { label: "Projects", values: { starter: "3", pro: "Unlimited", scale: "Unlimited" } },
              { label: "Storage", values: { starter: "5 GB", pro: "100 GB", scale: "1 TB" } },
              { label: "Version history", values: { starter: "7 days", pro: "90 days", scale: "Forever" } },
              { label: "Custom domains", values: { starter: false, pro: true, scale: true } },
            ],
          },
          {
            name: "Collaboration",
            rows: [
              { label: "Guest seats", values: { starter: false, pro: "10", scale: "Unlimited" } },
              { label: "Shared templates", values: { starter: false, pro: true, scale: true } },
              { label: "Roles & permissions", values: { starter: false, pro: false, scale: true } },
            ],
          },
          {
            name: "Support",
            rows: [
              { label: "Community forum", values: { starter: true, pro: true, scale: true } },
              { label: "Priority email", values: { starter: false, pro: true, scale: true } },
              { label: "Dedicated manager", values: { starter: false, pro: false, scale: true } },
            ],
          },
        ]}
        plans={[
          {
            id: "starter",
            name: "Starter",
            icon: SproutIcon,
            description: "For side projects and solo makers finding their feet.",
            monthly: 19,
            yearly: 15,
            cta: "Start free trial",
            highlights: ["3 projects", "5 GB storage", "Community support"],
          },
          {
            id: "pro",
            name: "Pro",
            icon: RocketIcon,
            description: "For small teams shipping every week.",
            monthly: 49,
            yearly: 39,
            cta: "Get Pro",
            highlights: ["Unlimited projects", "100 GB storage", "10 guest seats", "Priority email support"],
          },
          {
            id: "scale",
            name: "Scale",
            icon: BuildingIcon,
            description: "For growing orgs that need control and room.",
            monthly: 129,
            yearly: 103,
            cta: "Talk to sales",
            highlights: ["Everything in Pro", "1 TB storage", "Roles & permissions", "Dedicated manager"],
          },
        ]}
      />
    </div>
  );
}
