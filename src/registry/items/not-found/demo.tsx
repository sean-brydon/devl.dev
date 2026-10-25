import { BookOpenIcon, CreditCardIcon, RssIcon, WebhookIcon } from "lucide-react";
import { NotFound } from "@/registry/items/not-found/not-found";

export default function NotFoundDemo() {
  return (
    <div className="px-4 py-10 sm:px-8 sm:py-14">
      <NotFound
        pages={[
          { title: "Webhook retries", href: "/docs/webhooks/retries", section: "Webhooks" },
          { title: "Verifying webhook signatures", href: "/docs/webhooks/signatures", section: "Webhooks" },
          { title: "Webhook event types", href: "/docs/webhooks/events", section: "Webhooks" },
          { title: "Billing and invoices", href: "/docs/billing", section: "Account" },
          { title: "Changing your billing email", href: "/docs/billing/email", section: "Account" },
          { title: "API keys and scopes", href: "/docs/api/keys", section: "API" },
          { title: "Rate limits", href: "/docs/api/rate-limits", section: "API" },
          { title: "Quickstart", href: "/docs/quickstart", section: "Getting started" },
          { title: "Changelog", href: "/changelog", section: "Product" },
        ]}
        path="/docs/webhooks/retires"
        popular={[
          { title: "Quickstart", description: "Send your first event in five minutes.", href: "/docs/quickstart", icon: BookOpenIcon },
          { title: "Webhooks", description: "Retries, signatures and every event type.", href: "/docs/webhooks", icon: WebhookIcon },
          { title: "Billing", description: "Plans, invoices and usage limits.", href: "/docs/billing", icon: CreditCardIcon },
          { title: "Changelog", description: "What shipped this week.", href: "/changelog", icon: RssIcon },
        ]}
      />
    </div>
  );
}
