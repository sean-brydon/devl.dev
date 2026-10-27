import { SettingsAndPlans } from "@/registry/items/settings-and-plans/settings-and-plans";

export default function SettingsAndPlansDemo() {
  return (
    <SettingsAndPlans
      card={{ brand: "Visa", last4: "4417", expires: "09/28", holder: "Ada Lindqvist", email: "billing@ridgeline.app" }}
      renewsOn="Nov 14"
      workspace={{ name: "Ridgeline", slug: "ridgeline", region: "eu-central" }}
    />
  );
}
