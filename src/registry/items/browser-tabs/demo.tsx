import { BrowserTabs } from "@/registry/items/browser-tabs/browser-tabs";

export default function BrowserTabsDemo() {
  return (
    <div className="flex w-[640px] max-w-full flex-col items-center gap-3">
      <BrowserTabs
        defaultActiveId="docs"
        defaultTabs={[
          { id: "mail", title: "Northwind Mail", url: "mail.northwind.app/inbox", tone: "sky", mark: "N", pinned: true },
          { id: "cal", title: "Tidepool Calendar", url: "tidepool.so/week", tone: "teal", mark: "T", pinned: true },
          { id: "docs", title: "Lumen Docs", headline: "Build with tokens", url: "lumen.design/docs/tokens", tone: "violet", mark: "L" },
          { id: "bill", title: "Fernhill Billing", headline: "Invoices that send themselves", url: "fernhill.co/billing", tone: "emerald", mark: "F" },
          { id: "food", title: "Kettle Recipes", headline: "Weeknight dinners in 20 minutes", url: "kettle.kitchen/recipes/miso-greens", tone: "amber", mark: "K" },
        ]}
      />
      <p className="text-center text-muted-foreground text-xs">Drag to reorder · right-click to pin · middle-click to close</p>
    </div>
  );
}
