import { Swarm } from "@/registry/items/swarm/swarm";

export default function SwarmDemo() {
  return <Swarm tasks={60} title="Re-embed help center" workers={8} />;
}
