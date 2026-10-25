import { type FlameFrame, FlameProfile } from "@/registry/items/flame-profile/flame-profile";

const run: FlameFrame = {
  id: "root",
  name: "Research agent",
  kind: "agent",
  ms: 9400,
  detail: "Compare three vector databases for Halcyon",
  children: [
    { id: "plan", name: "Plan the search", kind: "llm", ms: 1200, tokens: 1030, cost: 0.0041, detail: "large model" },
    {
      id: "search",
      name: "web.search ×3",
      kind: "tool",
      ms: 1650,
      detail: "3 queries in parallel",
      children: [
        { id: "q1", name: "vector db benchmarks", kind: "tool", ms: 610, detail: "12 results" },
        { id: "q2", name: "pgvector vs qdrant", kind: "tool", ms: 520, detail: "9 results" },
        { id: "q3", name: "latency at 10M rows", kind: "tool", ms: 490, detail: "7 results" },
      ],
    },
    {
      id: "reader",
      name: "Reader",
      kind: "agent",
      ms: 4650,
      detail: "Sub-agent that reads and condenses sources",
      children: [
        { id: "f1", name: "fetch /docs/benchmarks", kind: "tool", ms: 900, detail: "GET 84 KB" },
        { id: "f2", name: "fetch /blog/latency-at-scale", kind: "tool", ms: 1400, detail: "GET 212 KB" },
        {
          id: "condense",
          name: "Condense",
          kind: "agent",
          ms: 2350,
          detail: "Map-reduce over 2 chunks",
          children: [
            { id: "c1", name: "Summarise chunk 1", kind: "llm", ms: 800, tokens: 2900, cost: 0.011, detail: "medium model" },
            { id: "c2", name: "Summarise chunk 2", kind: "llm", ms: 900, tokens: 3100, cost: 0.012, detail: "medium model" },
            { id: "merge", name: "Merge notes", kind: "llm", ms: 600, tokens: 1100, cost: 0.0082, detail: "large model" },
          ],
        },
      ],
    },
    { id: "draft", name: "Draft the answer", kind: "llm", ms: 1350, tokens: 3740, cost: 0.0142, detail: "large model" },
    { id: "cite", name: "cite.check", kind: "tool", ms: 380, detail: "4 links verified" },
  ],
};

export default function FlameProfileDemo() {
  return <FlameProfile root={run} title="Vector DB research" />;
}
