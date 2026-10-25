"use client";

import { useEffect, useState } from "react";
import { type CreditCategory, CreditGauge } from "@/registry/items/credit-gauge/credit-gauge";

const LIMIT = 10000;
const SHARES = [0.46, 0.31, 0.15, 0.08];
const LABELS = ["Chat", "Agents", "Embeddings", "Images"];

function dayUsage(day: number) {
  const wobble = Math.sin(day * 1.7) * 70 + Math.cos(day * 0.6) * 45;
  const weekend = day % 7 === 5 || day % 7 === 6 ? -110 : 0;
  return Math.max(60, Math.round(330 + wobble + weekend + day * 4));
}

function stateAt(days: number) {
  const daily = Array.from({ length: days }, (_, i) => dayUsage(i));
  const total = daily.reduce((a, b) => a + b, 0);
  const categories: CreditCategory[] = LABELS.map((label, i) => ({
    id: label.toLowerCase(),
    label,
    used: Math.round(total * SHARES[i]),
  }));
  return { daily, categories };
}

const START = 14;
const OVER_LIMIT_DAY = (() => {
  let total = 0;
  for (let d = 0; d < 30; d++) {
    total += dayUsage(d);
    if (total > LIMIT * 1.03) return d + 1;
  }
  return 30;
})();
const HOLD = 3;

export default function CreditGaugeDemo() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s >= OVER_LIMIT_DAY - START + HOLD ? 0 : s + 1)), 2000);
    return () => clearInterval(id);
  }, []);

  const { daily, categories } = stateAt(Math.min(START + step, OVER_LIMIT_DAY));

  return (
    <CreditGauge
      categories={categories}
      daily={daily}
      daysInPeriod={30}
      limit={LIMIT}
      periodStart={new Date(2026, 9, 1)}
      plan="Pro"
    />
  );
}
