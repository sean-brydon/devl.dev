import { SyncPair } from "@/registry/items/sync-pair/sync-pair";

export default function SyncPairDemo() {
  return (
    <SyncPair
      description="Edits hop between your devices in seconds. If two land at once, we keep both."
      hue="sky"
      laptopLabel="Laptop"
      phoneLabel="Phone"
      title="Always in sync"
    />
  );
}
