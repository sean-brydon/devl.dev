import { MailIcon } from "lucide-react";
import { ConnectionCard } from "@/registry/items/connection-card/connection-card";

export default function ConnectionCardDemo() {
  return (
    <ConnectionCard
      defaultValues={{
        enabled: true,
        apiKey: "pm_live_7Hq2vXk9LwR4tN8bZc3f9a",
        siteUrl: "shop.northwind.io",
        timeZone: "Europe/Berlin",
      }}
      lastSaved={{ by: "Mara Ellison", at: "Oct 22" }}
      service={{
        name: "Pigeon Mail",
        description: "Sending receipts and digests",
        icon: MailIcon,
        iconClassName: "bg-info text-white",
      }}
    />
  );
}
