"use client";

import { SmartSearch, type Ticket } from "@/registry/items/smart-search/smart-search";

const tickets: Ticket[] = [
  { id: "SUP-2381", title: "Webhook deliveries failing with 502", customer: "Halcyon Health", status: "open", owner: "riley", priority: 4, channel: "email", updated: "4m ago" },
  { id: "SUP-2379", title: "Can't remove a seat from the billing page", customer: "Lumen & Co", status: "open", owner: "riley", priority: 3, channel: "chat", updated: "18m ago" },
  { id: "SUP-2377", title: "SSO login loops back to the start", customer: "Kestrel Bank", status: "pending", owner: "noor", priority: 4, channel: "phone", updated: "32m ago" },
  { id: "SUP-2374", title: "Export to CSV is missing the notes column", customer: "Mosaic Learning", status: "open", owner: "sam", priority: 2, channel: "email", updated: "1h ago" },
  { id: "SUP-2370", title: "Webhook signing secret rotation question", customer: "Orbital Freight", status: "pending", owner: "riley", priority: 2, channel: "email", updated: "2h ago" },
  { id: "SUP-2366", title: "Invoice shows the wrong VAT number", customer: "Atlas Mutual", status: "open", owner: "none", priority: 3, channel: "email", updated: "3h ago" },
  { id: "SUP-2361", title: "Rate limit hit on the search endpoint", customer: "Nimbus Analytics", status: "open", owner: "kai", priority: 3, channel: "chat", updated: "5h ago" },
  { id: "SUP-2358", title: "How do I invite a guest to one project?", customer: "Paper Lantern", status: "solved", owner: "noor", priority: 1, channel: "chat", updated: "6h ago" },
  { id: "SUP-2352", title: "Dashboard charts blank in Safari 18", customer: "Redwood Civic", status: "open", owner: "riley", priority: 2, channel: "email", updated: "8h ago" },
  { id: "SUP-2347", title: "Mobile app crashes on the inbox tab", customer: "Verve Fitness", status: "pending", owner: "kai", priority: 4, channel: "phone", updated: "Yesterday" },
  { id: "SUP-2341", title: "Need a DPA countersigned", customer: "Meridian Air", status: "solved", owner: "sam", priority: 2, channel: "email", updated: "Yesterday" },
  { id: "SUP-2336", title: "Webhook retries arrive out of order", customer: "Ferrous Robotics", status: "closed", owner: "riley", priority: 3, channel: "email", updated: "2d ago" },
  { id: "SUP-2330", title: "Audit log export times out", customer: "Tidewater Energy", status: "open", owner: "none", priority: 4, channel: "email", updated: "2d ago" },
  { id: "SUP-2324", title: "Change the workspace URL", customer: "Saltbox Coffee", status: "closed", owner: "noor", priority: 1, channel: "chat", updated: "3d ago" },
];

export default function SmartSearchDemo() {
  return (
    <SmartSearch
      defaultValue="status:open,pending priority>2 "
      examples={["owner:me", "priority>=3", "-status:closed webhook", "channel:phone"]}
      me="riley"
      tickets={tickets}
    />
  );
}
