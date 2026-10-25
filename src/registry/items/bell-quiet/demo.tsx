import { BellQuiet } from "@/registry/items/bell-quiet/bell-quiet";

export default function BellQuietDemo() {
  return (
    <BellQuiet
      description="No new notifications. We'll ring when something needs you."
      hue="amber"
      title="You're all caught up"
    />
  );
}
