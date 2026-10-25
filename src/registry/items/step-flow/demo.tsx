"use client";

import { StepFlow } from "@/registry/items/step-flow/step-flow";

export default function StepFlowDemo() {
  return <StepFlow onComplete={() => new Promise((resolve) => setTimeout(resolve, 900))} />;
}
