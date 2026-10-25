"use client";

import { BeanIcon, CoffeeIcon, ShirtIcon } from "lucide-react";
import { CheckoutSummary } from "@/registry/items/checkout-summary/checkout-summary";

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export default function CheckoutSummaryDemo() {
  return (
    <div className="px-4 py-10 sm:px-8 sm:py-12">
      <CheckoutSummary
        email="noor@fernmail.com"
        items={[
          { id: "pour", name: "Stoneware pour-over set", variant: "Ash glaze", price: 58, quantity: 1, icon: CoffeeIcon, tone: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
          { id: "beans", name: "Single-origin beans", variant: "Huila, Colombia · 250 g", price: 16.5, quantity: 2, icon: BeanIcon, tone: "bg-rose-500/12 text-rose-700 dark:text-rose-300" },
          { id: "apron", name: "Linen barista apron", variant: "Olive · One size", price: 34, quantity: 1, icon: ShirtIcon, tone: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300" },
        ]}
        onPay={() => wait(1400)}
        shipping={[
          { id: "standard", label: "Standard", eta: "Arrives Oct 30 – Nov 3", price: 0 },
          { id: "express", label: "Express", eta: "Arrives Tue, Oct 28", price: 12 },
          { id: "nextday", label: "Next day", eta: "Order in 3 h for tomorrow", price: 24 },
        ]}
        validatePromo={async (code) => {
          await wait(700);
          return code === "MOSS15" ? { code, percent: 0.15 } : null;
        }}
      />
      <p className="mt-4 text-center text-muted-foreground text-xs">Try the promo code MOSS15.</p>
    </div>
  );
}
