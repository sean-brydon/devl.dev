"use client";

import { useState } from "react";
import { DocsCallout, DocsCode, DocsLayout } from "@/registry/items/docs-layout/docs-layout";

const NODE = `import { Relay } from "@relay/node";

const relay = new Relay(process.env.RELAY_KEY);

// Subscribe an endpoint to the events you care about
const endpoint = await relay.endpoints.create({
  url: "https://api.acme-bikes.com/hooks/relay",
  events: ["order.paid", "order.refunded"],
});

console.log(endpoint.secret); // whsec_7f3a…`;

const CURL = `curl https://api.relay.dev/v1/endpoints \\
  -X POST \\
  -H "Authorization: Bearer $RELAY_KEY" \\
  -d url="https://api.acme-bikes.com/hooks/relay" \\
  -d "events[]=order.paid"`;

const VERIFY = `const valid = relay.webhooks.verify({
  payload: req.rawBody,
  signature: req.headers["relay-signature"],
  secret: process.env.RELAY_WEBHOOK_SECRET,
});

if (!valid) return res.status(400).end();`;

export default function DocsLayoutDemo() {
  const [href, setHref] = useState("/docs/webhooks");
  return (
    <div className="p-4 sm:p-8">
      <DocsLayout
        breadcrumbs={["Docs", "Webhooks", "Overview"]}
        currentHref={href}
        lead="Relay sends an HTTPS POST to your server the moment something happens, so you never have to poll."
        meta="Updated Oct 18, 2026 · 6 min read"
        nav={[
          {
            label: "Getting started",
            items: [
              { label: "Introduction", href: "/docs" },
              { label: "Quickstart", href: "/docs/quickstart" },
              { label: "Authentication", href: "/docs/auth" },
            ],
          },
          {
            label: "Webhooks",
            items: [
              { label: "Overview", href: "/docs/webhooks" },
              { label: "Event types", href: "/docs/webhooks/events" },
              { label: "Retries", href: "/docs/webhooks/retries" },
              { label: "Testing locally", href: "/docs/webhooks/local", badge: "New" },
            ],
          },
          {
            label: "API reference",
            items: [
              { label: "Endpoints", href: "/docs/api/endpoints" },
              { label: "Events", href: "/docs/api/events" },
              { label: "Deliveries", href: "/docs/api/deliveries" },
            ],
          },
        ]}
        next={{ label: "Event types", href: "/docs/webhooks/events" }}
        onNavigate={setHref}
        prev={{ label: "Authentication", href: "/docs/auth" }}
        sections={[
          {
            id: "how",
            title: "How delivery works",
            content: (
              <>
                <p>
                  When an event fires, Relay signs the payload and sends it to every endpoint subscribed to that event type. Your server has{" "}
                  <strong>10 seconds</strong> to answer with a <code>2xx</code> status.
                </p>
                <ul>
                  <li>Events arrive at least once, so make your handler idempotent.</li>
                  <li>Order isn't guaranteed. Use the <code>created_at</code> field to sort.</li>
                  <li>Payloads are JSON and never larger than 256 KB.</li>
                </ul>
                <DocsCallout title="Allowlisting">
                  Deliveries come from a fixed set of IP ranges. Find the current list at <code>api.relay.dev/ips</code>.
                </DocsCallout>
              </>
            ),
          },
          {
            id: "create",
            title: "Create an endpoint",
            content: (
              <>
                <p>Register the URL that should receive events. You'll get back a signing secret; store it somewhere safe.</p>
                <DocsCode
                  tabs={[
                    { label: "Node", lang: "js", code: NODE },
                    { label: "cURL", lang: "bash", code: CURL },
                  ]}
                />
              </>
            ),
          },
          {
            id: "verify",
            title: "Verify the signature",
            content: (
              <>
                <p>
                  Every request carries a <code>Relay-Signature</code> header. Check it against the raw body before you trust the payload.
                </p>
                <DocsCode caption="handler.js" tabs={[{ label: "Node", lang: "js", code: VERIFY }]} />
                <DocsCallout title="Use the raw body" tone="warning">
                  Frameworks that parse JSON first change the bytes, and the signature won't match. Read the body as a buffer.
                </DocsCallout>
              </>
            ),
          },
          {
            id: "rotate",
            title: "Rotating secrets",
            level: 3,
            content: (
              <p>
                Roll a secret from the dashboard and both the old and new secret stay valid for 24 hours, so you can deploy without dropping
                events.
              </p>
            ),
          },
          {
            id: "retries",
            title: "Retries",
            content: (
              <>
                <p>If your endpoint fails or times out, Relay backs off and tries again up to six times over three days.</p>
                <div className="mt-4 overflow-hidden rounded-xl border text-sm">
                  <table className="w-full">
                    <thead className="bg-muted/40 text-left text-muted-foreground text-xs">
                      <tr>
                        <th className="px-3.5 py-2 font-medium">Attempt</th>
                        <th className="px-3.5 py-2 font-medium">After</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y tabular-nums">
                      {[
                        ["1", "Immediately"],
                        ["2", "5 minutes"],
                        ["3", "30 minutes"],
                        ["4", "2 hours"],
                        ["5", "8 hours"],
                        ["6", "1 day"],
                      ].map(([a, b]) => (
                        <tr key={a}>
                          <td className="px-3.5 py-2">{a}</td>
                          <td className="px-3.5 py-2 text-muted-foreground">{b}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <DocsCallout title="Replays" tone="tip">
                  Missed something? Replay any delivery from the last 30 days in the dashboard or with <code>relay events replay</code>.
                </DocsCallout>
              </>
            ),
          },
          {
            id: "next",
            title: "Next steps",
            content: (
              <p>
                Browse the full list of <a href="#events">event types</a>, or test against your laptop with the{" "}
                <a href="#local">local tunnel</a>.
              </p>
            ),
          },
        ]}
        title="Receiving webhooks"
      />
    </div>
  );
}
