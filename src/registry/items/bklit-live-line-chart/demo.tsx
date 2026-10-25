"use client";

import type { LiveLinePoint } from "@/components/charts/live-line-chart";
import { useEffect, useState } from "react";
import { LiveTrafficCard } from "@/registry/items/bklit-live-line-chart/bklit-live-line-chart";

function sample(t: number, prev: number) {
  const target = 1240 + Math.sin(t / 9) * 180 + Math.sin(t / 2.7) * 60;
  const spike = Math.sin(t * 7.13) > 0.97 ? 260 : 0;
  return Math.max(600, prev + (target - prev) * 0.45 + Math.sin(t * 3.91) * 0.5 * 70 + spike);
}

export default function BklitLiveLineChartDemo() {
  const [points, setPoints] = useState<LiveLinePoint[]>([]);

  useEffect(() => {
    const start = Date.now() / 1000;
    const seed: LiveLinePoint[] = [];
    let value = 1240;
    for (let i = 60; i > 0; i--) {
      const t = start - i;
      value = sample(t, value);
      seed.push({ time: t, value });
    }
    setPoints(seed);
    const id = setInterval(() => {
      setPoints((prev) => {
        const t = Date.now() / 1000;
        const next = { time: t, value: sample(t, prev.at(-1)?.value ?? 1240) };
        return [...prev.slice(-119), next];
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return <LiveTrafficCard points={points} />;
}
