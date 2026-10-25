"use client";

import { useEffect, useRef, useState } from "react";
import { type WebhookDelivery, WebhookInspector } from "@/registry/items/webhook-inspector/webhook-inspector";

const iso = (secondsAgo: number) => new Date(Date.now() - secondsAgo * 1000).toISOString();

const headers = (event: string, id: string) => ({
  "content-type": "application/json",
  "user-agent": "Northwind-Hooks/2.1",
  "x-northwind-event": event,
  "x-northwind-delivery": id,
  "x-northwind-signature": "t=1761300412,v1=5f2b9c0e41d7a3…",
});

function seed(): WebhookDelivery[] {
  return [
    {
      id: "dlv_8Kq2",
      event: "invoice.paid",
      status: 200,
      latencyMs: 182,
      sentAt: iso(48),
      attempt: 1,
      request: {
        headers: headers("invoice.paid", "dlv_8Kq2"),
        body: { id: "evt_3Pq8Lm", type: "invoice.paid", data: { invoice: "in_1042", customer: "cus_9fK2", amount: 144000, currency: "eur", paid: true } },
      },
      response: { headers: { "content-type": "application/json" }, body: '{ "received": true }' },
    },
    {
      id: "dlv_8Kp7",
      event: "invoice.payment_failed",
      status: 500,
      latencyMs: 2140,
      sentAt: iso(260),
      attempt: 1,
      request: {
        headers: headers("invoice.payment_failed", "dlv_8Kp7"),
        body: { id: "evt_3Pp1Xa", type: "invoice.payment_failed", data: { invoice: "in_1041", customer: "cus_2Lm8", reason: "card_declined", next_attempt: 1761386812 } },
      },
      response: {
        headers: { "content-type": "application/json", "x-request-id": "req_hY61" },
        body: '{ "error": "TypeError: Cannot read properties of undefined (reading \'email\')" }',
      },
    },
    {
      id: "dlv_8Kn3",
      event: "customer.updated",
      status: 200,
      latencyMs: 94,
      sentAt: iso(900),
      attempt: 1,
      request: { headers: headers("customer.updated", "dlv_8Kn3"), body: { id: "evt_3Pn0Qe", type: "customer.updated", data: { customer: "cus_9fK2", changes: ["email"] } } },
      response: { body: '{ "received": true }' },
    },
    {
      id: "dlv_8Km9",
      event: "checkout.completed",
      status: "timeout",
      latencyMs: 30000,
      sentAt: iso(2400),
      attempt: 3,
      request: { headers: headers("checkout.completed", "dlv_8Km9"), body: { id: "evt_3Pm4Rt", type: "checkout.completed", data: { session: "cs_88Fj", amount: 4900 } } },
    },
    {
      id: "dlv_8Kk1",
      event: "subscription.created",
      status: 200,
      latencyMs: 231,
      sentAt: iso(5400),
      attempt: 1,
      request: { headers: headers("subscription.created", "dlv_8Kk1"), body: { id: "evt_3Pk2Vb", type: "subscription.created", data: { subscription: "sub_71Hc", plan: "team-annual", seats: 12 } } },
      response: { body: '{ "received": true }' },
    },
  ];
}

let n = 0;

export default function WebhookInspectorDemo() {
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>(seed);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const settle = (id: string, after: number, patch: Partial<WebhookDelivery>) => {
    timers.current.push(setTimeout(() => setDeliveries((ds) => ds.map((d) => (d.id === id ? { ...d, ...patch } : d))), after));
  };

  useEffect(() => {
    const t = setTimeout(() => {
      const id = "dlv_8Kr5";
      setDeliveries((ds) => [
        {
          id,
          event: "invoice.created",
          status: "pending",
          sentAt: new Date().toISOString(),
          attempt: 1,
          request: { headers: headers("invoice.created", id), body: { id: "evt_3Pr9Cd", type: "invoice.created", data: { invoice: "in_1043", customer: "cus_4Tn1", amount: 9900, currency: "eur" } } },
        },
        ...ds,
      ]);
      settle(id, 900, { status: 200, latencyMs: 146, response: { body: '{ "received": true }' } });
    }, 3500);
    const all = timers.current;
    return () => {
      clearTimeout(t);
      all.forEach(clearTimeout);
    };
  }, []);

  const redeliver = (d: WebhookDelivery) => {
    const id = `dlv_9R${++n}`;
    setDeliveries((ds) => [{ ...d, id, status: "pending", latencyMs: undefined, response: undefined, sentAt: new Date().toISOString(), attempt: d.attempt + 1, redeliveryOf: d.id }, ...ds]);
    settle(id, 1100, { status: 200, latencyMs: 164, response: { headers: { "content-type": "application/json" }, body: '{ "received": true }' } });
  };

  return <WebhookInspector deliveries={deliveries} endpoint="https://hooks.brightline.studio/northwind" onRedeliver={redeliver} />;
}
