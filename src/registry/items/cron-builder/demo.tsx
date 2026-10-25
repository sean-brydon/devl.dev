import { CronBuilder } from "@/registry/items/cron-builder/cron-builder";

export default function CronBuilderDemo() {
  return <CronBuilder defaultValue="30 9 * * 1-5" />;
}
