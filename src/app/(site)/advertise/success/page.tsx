import type { Metadata } from "next";
import { Suspense } from "react";
import { SuccessView } from "@/components/sponsor/checkout-flow";

export const metadata: Metadata = { title: "Booking confirmed", robots: { index: false } };

export default function Page() {
  return (
    <Suspense>
      <SuccessView />
    </Suspense>
  );
}
