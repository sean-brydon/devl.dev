import { type BillingProduct, PhaseBuilder } from "@/registry/items/phase-builder/phase-builder";

const catalog: BillingProduct[] = [
  { id: "seat", name: "Workspace seat", price: 24, unit: "seat" },
  { id: "runs", name: "Run pack — 10k runs", price: 180, unit: "pack" },
  { id: "support", name: "Priority support", price: 400, unit: "plan" },
  { id: "onboarding", name: "Guided onboarding", price: 2500, unit: "engagement", oneTime: true },
  { id: "retention", name: "Extended log retention", price: 90, unit: "plan" },
];

export default function PhaseBuilderDemo() {
  return (
    <PhaseBuilder
      catalog={catalog}
      defaultPhase={{
        name: "Halcyon Robotics — Phase 1",
        start: new Date(2026, 10, 1),
        months: 12,
        lines: [
          { productId: "seat", quantity: 40, repeat: "monthly", timing: "advance" },
          { productId: "support", quantity: 1, repeat: "quarterly", timing: "advance" },
          { productId: "onboarding", quantity: 1, repeat: "upfront", timing: "advance" },
        ],
        discount: { enabled: true, percent: 0.1 },
        minimum: { enabled: true, amount: 20000 },
      }}
    />
  );
}
