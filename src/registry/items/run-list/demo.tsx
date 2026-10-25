import { RunList, type RunListItem } from "@/registry/items/run-list/run-list";

const tasks: RunListItem[] = [
  {
    id: "t1",
    title: "Migrate billing webhooks to v2",
    agent: "Kestrel",
    repo: "orbit/api",
    status: "running",
    elapsed: 312,
    outcome: "review",
    steps: ["Mapped 14 webhook handlers", "Rewrote signature checks", "Running the billing test suite"],
  },
  {
    id: "t2",
    title: "Fix flaky checkout e2e test",
    agent: "Wren",
    repo: "orbit/web",
    status: "review",
    elapsed: 845,
    steps: ["Reproduced the flake 3 of 20 runs", "Replaced a fixed wait with a network idle check", "Opened a pull request for review"],
  },
  {
    id: "t3",
    title: "Bump Postgres driver to 9.x",
    agent: "Heron",
    repo: "orbit/api",
    status: "failed",
    elapsed: 127,
    steps: ["Updated the lockfile", "Two migrations use a removed API", "Stopped: tests failed after 3 tries"],
  },
  {
    id: "t4",
    title: "Add rate limiting to search",
    agent: "Kestrel",
    repo: "orbit/search",
    status: "running",
    elapsed: 58,
    outcome: "done",
    steps: ["Read the search router", "Adding a token bucket per API key"],
  },
  {
    id: "t5",
    title: "Write copy for onboarding emails",
    agent: "Finch",
    repo: "orbit/marketing",
    status: "done",
    elapsed: 1260,
    steps: ["Drafted 5 emails", "Matched the brand voice guide", "Finished, all checks green"],
  },
];

export default function RunListDemo() {
  return <RunList tasks={tasks} />;
}
