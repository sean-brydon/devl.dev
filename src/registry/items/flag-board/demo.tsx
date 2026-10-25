import { type FeatureFlag, FlagBoard } from "@/registry/items/flag-board/flag-board";

const environments = [
  { id: "dev", name: "Development", audience: 40 },
  { id: "staging", name: "Staging", audience: 1200 },
  { id: "prod", name: "Production", audience: 48600 },
];

const segments = [
  { id: "staff", name: "Staff" },
  { id: "beta", name: "Beta testers" },
  { id: "eu", name: "EU" },
  { id: "enterprise", name: "Enterprise" },
  { id: "new", name: "Signed up < 30d" },
];

const on = (rollout: number, segs: string[] = []) => ({ on: true, rollout, segments: segs });
const off = (rollout = 0, segs: string[] = []) => ({ on: false, rollout, segments: segs });

const flags: FeatureFlag[] = [
  {
    key: "annual-billing",
    description: "Annual plans with a savings badge on the pricing page.",
    envs: { dev: on(100), staging: on(100), prod: on(25, ["eu"]) },
    updated: "2h ago",
  },
  {
    key: "new-checkout",
    description: "One-page checkout with saved cards.",
    envs: { dev: on(100), staging: on(50, ["beta"]), prod: on(10, ["beta", "staff"]) },
    updated: "yesterday",
  },
  {
    key: "ai-invoice-notes",
    description: "Draft invoice notes from the line items.",
    envs: { dev: on(100), staging: off(), prod: off(0, ["enterprise"]) },
    updated: "3d ago",
  },
  {
    key: "usage-alerts",
    description: "Email owners when they pass 80% of their seat limit.",
    envs: { dev: on(100), staging: on(100), prod: on(100) },
    updated: "last week",
  },
];

export default function FlagBoardDemo() {
  return <FlagBoard defaultEnvironment="prod" environments={environments} flags={flags} segments={segments} />;
}
