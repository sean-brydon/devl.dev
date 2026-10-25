import { BellIcon, ChevronRightIcon, CreditCardIcon, type LucideIcon, ShieldIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Ripple } from "@/registry/items/press-ripple/press-ripple";

const rows: { icon: LucideIcon; label: string; meta: string }[] = [
  { icon: BellIcon, label: "Notifications", meta: "Mentions only" },
  { icon: ShieldIcon, label: "Privacy", meta: "2 apps connected" },
  { icon: CreditCardIcon, label: "Billing", meta: "Pro · renews Dec 3" },
];

const press = "transition-[scale,box-shadow] duration-150 active:scale-[0.97]";

export default function PressRippleDemo() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      <div className="overflow-hidden rounded-2xl border bg-card shadow-xs/5">
        {rows.map((row) => (
          <button
            className="relative flex w-full cursor-pointer items-center gap-3 border-b px-4 py-3 text-left outline-none last:border-b-0 focus-visible:bg-accent"
            key={row.label}
            type="button"
          >
            <Ripple />
            <span className="grid size-8 place-items-center rounded-lg border bg-background">
              <row.icon className="size-4 text-muted-foreground" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="font-medium text-sm">{row.label}</span>
              <span className="truncate text-muted-foreground text-xs">{row.meta}</span>
            </span>
            <ChevronRightIcon className="size-4 text-muted-foreground" />
          </button>
        ))}
      </div>
      <div className="flex items-center justify-end gap-2">
        <Button className={press} variant="outline">
          <Ripple />
          Discard
        </Button>
        <Button className={press}>
          <Ripple />
          Save changes
        </Button>
      </div>
    </div>
  );
}
