import { TokenBudget } from "@/registry/items/token-budget/token-budget";

export default function TokenBudgetDemo() {
  return (
    <TokenBudget
      chat={62_400}
      files={[
        { id: "invoice", name: "src/billing/invoice.ts", tokens: 18_300 },
        { id: "proration", name: "src/billing/proration.ts", tokens: 11_900 },
        { id: "rules", name: "docs/pricing-rules.md", tokens: 9_600 },
      ]}
      memory={3_100}
      model="orbit-2 · 200k window"
      results={34_200}
      system={4_200}
      tools={14_800}
      turns={24}
    />
  );
}
