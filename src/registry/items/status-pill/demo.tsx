import { StatusPill } from "@/registry/items/status-pill/status-pill";

export default function StatusPillDemo() {
  return (
    <div className="flex w-44 flex-col items-start gap-4">
      <StatusPill loop />
      <StatusPill
        doneLabel="Answer ready"
        interval={1100}
        loop
        phases={["Planning", "Calling tools", "Checking", "Drafting"]}
        size="sm"
      />
    </div>
  );
}
