import type { Metadata } from "next";
import { Suspense } from "react";
import { TestCheckoutView } from "@/components/sponsor/checkout-flow";

export const metadata: Metadata = { title: "Test checkout", robots: { index: false } };

export default function Page() {
  return (
    <Suspense>
      <TestCheckoutView />
    </Suspense>
  );
}
