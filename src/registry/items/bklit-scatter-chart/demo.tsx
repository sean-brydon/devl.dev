import { type BuildRun, BuildTimesScatterCard } from "@/registry/items/bklit-scatter-chart/bklit-scatter-chart";

const BRANCHES = ["main", "feat/billing-v2", "fix/flaky-e2e", "chore/deps", "feat/search"];
const RUNS_PER_DAY = [5, 7, 8, 6, 9, 3, 2, 6, 8, 9, 7, 8, 4, 3];

function noise(i: number) {
  const x = Math.sin(i * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

let n = 0;
const runs: BuildRun[] = RUNS_PER_DAY.flatMap((count, day) =>
  Array.from({ length: count }, () => {
    n += 1;
    const cacheMiss = noise(n * 3) > 0.86;
    const slowdown = day >= 7 && day <= 9 ? 1.6 : 0;
    const minutes = 5.2 + noise(n) * 2.4 + slowdown + (cacheMiss ? 3.4 + noise(n * 5) * 2 : 0);
    return {
      date: new Date(2026, 9, 12 + day),
      minutes: Math.round(minutes * 60) / 60,
      commit: Math.floor(noise(n * 7) * 0xfffffff)
        .toString(16)
        .padStart(7, "0"),
      branch: BRANCHES[Math.floor(noise(n * 11) * BRANCHES.length)],
    };
  }),
);

export default function BklitScatterChartDemo() {
  return <BuildTimesScatterCard runs={runs} />;
}
