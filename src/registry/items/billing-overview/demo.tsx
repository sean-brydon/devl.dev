import { BillingOverview } from "@/registry/items/billing-overview/billing-overview";

export default function BillingOverviewDemo() {
  return (
    <div className="p-4 sm:p-8">
      <BillingOverview
        billingEmail="ap@fieldnote.co"
        card={{ holder: "Mara Okafor", last4: "4821", expires: "08/28", kind: "Business debit" }}
        invoices={[
          { id: "INV-2026-0118", date: "Oct 1, 2026", amount: 131.4, status: "failed" },
          { id: "INV-2026-0104", date: "Sep 1, 2026", amount: 128.75, status: "paid" },
          { id: "INV-2026-0091", date: "Aug 1, 2026", amount: 96, status: "paid" },
          { id: "INV-2026-0077", date: "Jul 1, 2026", amount: 24.5, status: "refunded" },
          { id: "INV-2026-0063", date: "Jun 1, 2026", amount: 112.1, status: "paid" },
        ]}
        next={{
          dueOn: "Nov 1",
          cycleDay: 24,
          cycleLength: 31,
          lines: [
            { label: "Team plan, 8 seats", amount: 96 },
            { label: "Extra API requests", amount: 38.4 },
            { label: "Sales tax (6%)", amount: 8.06 },
          ],
        }}
        onRetry={async () => {
          await new Promise((r) => setTimeout(r, 1200));
          return true;
        }}
        plan={{ name: "Team", price: 96, interval: "month", billed: "Annual", renewsOn: "Nov 14, 2026", seatsUsed: 8, seats: 10, includes: ["1M API requests a month", "50 GB storage", "Priority support"] }}
        usage={[
          { label: "API requests", used: 812400, limit: 1000000 },
          { label: "Storage", used: 38.2, limit: 50, unit: "GB", format: (n) => n.toFixed(1).replace(/\.0$/, "") },
          { label: "Build minutes", used: 2940, limit: 3000 },
          { label: "Email sends", used: 14200, limit: 50000 },
        ]}
      />
    </div>
  );
}
