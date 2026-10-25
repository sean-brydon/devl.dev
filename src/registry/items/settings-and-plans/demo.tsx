import { SettingsAndPlans } from "@/registry/items/settings-and-plans/settings-and-plans";

export default function SettingsAndPlansDemo() {
  return (
    <SettingsAndPlans
      card={{ brand: "Visa", last4: "4417", expires: "09/28", holder: "Ines Okafor", email: "billing@lumenloop.dev" }}
      renewsOn="Nov 14"
      workspace={{ name: "Lumen Loop", slug: "lumen-loop", region: "eu-central" }}
    />
  );
}
