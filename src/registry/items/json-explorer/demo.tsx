import { JsonExplorer, type JsonValue } from "@/registry/items/json-explorer/json-explorer";

const event: JsonValue = {
  id: "evt_3Pq8Lm2xV",
  type: "subscription.updated",
  created: 1761300412,
  livemode: false,
  customer: {
    id: "cus_9fK2aQ",
    name: "Brightline Studio",
    email: "billing@brightline.studio",
    tags: ["design", "eu", "annual"],
    address: { city: "Porto", country: "PT", postal_code: "4000-322" },
  },
  subscription: {
    id: "sub_71Hc0p",
    plan: "team-annual",
    seats: 12,
    amount: 1440,
    currency: "EUR",
    cancel_at_period_end: false,
    trial_end: null,
    items: [
      { sku: "seat", quantity: 12, unit_amount: 10000 },
      { sku: "storage-100gb", quantity: 1, unit_amount: 2400 },
    ],
  },
  previous_attributes: { seats: 9, amount: 1080 },
  request: { id: "req_W1x7Tb", "idempotency-key": "b7f0c2e4-91aa-4c3e-8d1d" },
};

export default function JsonExplorerDemo() {
  return <JsonExplorer data={event} defaultExpanded={["event.subscription"]} rootName="event" title="event" />;
}
