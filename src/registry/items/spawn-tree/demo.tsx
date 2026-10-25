import { type SpawnNode, SpawnTree } from "@/registry/items/spawn-tree/spawn-tree";

const root: SpawnNode = {
  id: "conductor",
  name: "Conductor",
  model: "large",
  task: "Ship the pricing page redesign",
  start: 0,
  duration: 32,
  costPerSecond: 0.006,
  children: [
    { id: "scout", name: "Scout", model: "small", task: "Audit the current pricing page", start: 1, duration: 7, costPerSecond: 0.002 },
    {
      id: "builder",
      name: "Builder",
      model: "medium",
      task: "Build the new layout",
      start: 8,
      duration: 18,
      costPerSecond: 0.008,
      children: [
        { id: "stylist", name: "Stylist", model: "small", task: "Port tokens to the new grid", start: 9, duration: 8, costPerSecond: 0.003 },
        { id: "copy", name: "Copywriter", model: "small", task: "Rewrite the plan blurbs", start: 10, duration: 6, costPerSecond: 0.002 },
        {
          id: "tester",
          name: "Tester",
          model: "medium",
          task: "Visual regression on 12 breakpoints",
          start: 12,
          duration: 12,
          costPerSecond: 0.005,
          outcome: "failed",
        },
      ],
    },
    { id: "reviewer", name: "Reviewer", model: "large", task: "Review the final diff", start: 26, duration: 5, costPerSecond: 0.011 },
  ],
};

export default function SpawnTreeDemo() {
  return <SpawnTree root={root} />;
}
