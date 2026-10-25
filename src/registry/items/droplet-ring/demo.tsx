import {
  BellIcon,
  CalendarIcon,
  ChartColumnIcon,
  CreditCardIcon,
  FolderIcon,
  MailIcon,
  MessageCircleIcon,
  WebhookIcon,
} from "lucide-react";
import { DropletRing } from "@/registry/items/droplet-ring/droplet-ring";

export default function DropletRingDemo() {
  return (
    <DropletRing
      apps={[
        { name: "Postbox", icon: MailIcon, hue: "sky" },
        { name: "Daybook", icon: CalendarIcon, hue: "rose" },
        { name: "Chatter", icon: MessageCircleIcon, hue: "emerald" },
        { name: "Tally", icon: CreditCardIcon, hue: "violet" },
        { name: "Signal", icon: BellIcon, hue: "amber" },
        { name: "Hooks", icon: WebhookIcon, hue: "indigo" },
        { name: "Drawer", icon: FolderIcon, hue: "orange" },
        { name: "Charts", icon: ChartColumnIcon, hue: "teal" },
      ]}
      label="Orbit connected to eight apps"
    />
  );
}
