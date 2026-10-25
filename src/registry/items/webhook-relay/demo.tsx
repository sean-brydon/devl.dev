import { MailIcon, TruckIcon, WalletIcon } from "lucide-react";
import { WebhookRelay } from "@/registry/items/webhook-relay/webhook-relay";

export default function WebhookRelayDemo() {
  return (
    <WebhookRelay
      description="Signed at the relay, retried with backoff, and logged until each endpoint answers 200."
      endpoints={[
        { name: "Fulfilment", path: "POST /hooks/orders", icon: TruckIcon },
        { name: "Ledger", path: "POST /v2/events", icon: WalletIcon },
        { name: "Email worker", path: "POST /notify", icon: MailIcon },
      ]}
      event="order.paid"
      failing={1}
      hue="indigo"
      source="orders-api"
      title="Every event, delivered"
    />
  );
}
