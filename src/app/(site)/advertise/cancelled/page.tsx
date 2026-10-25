import type { Metadata } from "next";
import { Suspense } from "react";
import { CancelledView } from "@/components/sponsor/checkout-flow";

export const metadata: Metadata = { title: "Checkout cancelled", robots: { index: false } };

export default function Page() {
  return (
    <Suspense>
      <CancelledView />
    </Suspense>
  );
}
