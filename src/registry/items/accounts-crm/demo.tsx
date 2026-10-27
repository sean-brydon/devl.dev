import { PipelineToday } from "@/registry/items/accounts-crm/accounts-crm";

export default function AccountsCrmDemo() {
  return (
    <PipelineToday
      currentUserId="maren"
      dateLabel="Tuesday, 27 October"
      forecastLabel="Q4 weighted forecast"
      target={480000}
      workspace="Kestrel"
    />
  );
}
