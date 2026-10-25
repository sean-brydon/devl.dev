"use client";

import { useEffect, useState } from "react";
import { type DriftStep, DriftChart } from "@/registry/items/drift-chart/drift-chart";

const script = [
  { id: "read", label: "Read codebase", planned: 3, takes: 2.5 },
  { id: "plan", label: "Draft migration", planned: 2, takes: 2 },
  { id: "code", label: "Rewrite handlers", planned: 6, takes: 9 },
  { id: "test", label: "Run tests", planned: 4, takes: 5.5 },
  { id: "fix", label: "Fix failures", planned: 3, takes: 2 },
  { id: "pr", label: "Open pull request", planned: 1, takes: 1 },
];
const total = script.reduce((s, x) => s + x.takes, 0);

function stepsAt(t: number): DriftStep[] {
  let cursor = 0;
  return script.map(({ takes, ...step }) => {
    const start = cursor;
    cursor += takes;
    if (t >= cursor) return { ...step, actual: takes, done: true };
    if (t > start) return { ...step, actual: t - start };
    return step;
  });
}

export default function DriftChartDemo() {
  const [t, setT] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setT((prev) => (prev >= total + 6 ? 0 : prev + 0.2));
    }, 100);
    return () => clearInterval(id);
  }, []);

  return <DriftChart agent="kestrel" steps={stepsAt(t)} title="Migrate billing webhooks to v2" />;
}
