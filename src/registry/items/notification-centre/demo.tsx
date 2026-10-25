import { SearchIcon } from "lucide-react";
import { NotificationCentre } from "@/registry/items/notification-centre/notification-centre";

export default function NotificationCentreDemo() {
  return (
    <div className="h-[500px] w-[420px] max-w-full">
      <div className="flex items-center gap-3 rounded-2xl border bg-card px-3 py-2.5 shadow-xs/5">
        <span className="flex size-7 items-center justify-center rounded-lg bg-primary font-semibold text-primary-foreground text-xs">H</span>
        <span className="font-medium text-sm">Halden</span>
        <span className="ms-auto hidden h-8 w-40 items-center gap-2 rounded-lg bg-muted px-2.5 text-muted-foreground text-xs sm:flex">
          <SearchIcon className="size-3.5" />
          Search…
        </span>
        <div className="flex-1 sm:hidden" />
        <NotificationCentre
          defaultOpen
          notifications={[
            {
              id: "n1",
              kind: "mention",
              actor: { name: "Mara Okafor", tone: "violet" },
              action: "mentioned you in",
              target: "Q4 launch plan",
              snippet: "@you can we lock the pricing page copy by Friday? Legal signed off this morning.",
              time: "4m",
              place: "Roadmap",
              group: "Today",
            },
            {
              id: "n2",
              kind: "access",
              actor: { name: "Ines Varga", tone: "emerald" },
              action: "requested edit access to",
              target: "Billing runbook",
              time: "26m",
              place: "Docs",
              group: "Today",
              request: true,
            },
            {
              id: "n3",
              kind: "deploy",
              actor: { name: "Ship Bot", tone: "sky" },
              action: "deployed",
              target: "web@4f2a91c to production",
              time: "1h",
              place: "halden-web",
              group: "Today",
              read: true,
            },
            {
              id: "n4",
              kind: "comment",
              actor: { name: "Sam Adeyemi", tone: "amber" },
              action: "replied to your comment on",
              target: "Onboarding v3",
              snippet: "Agreed, dropping the third step makes the flow feel much lighter.",
              time: "Tue",
              place: "Design",
              group: "Earlier this week",
            },
            {
              id: "n5",
              kind: "assign",
              actor: { name: "Noor Haddad", tone: "rose" },
              action: "assigned you",
              target: "HAL-482 Fix invoice rounding",
              time: "Mon",
              place: "Billing",
              group: "Earlier this week",
              read: true,
            },
            {
              id: "n6",
              kind: "mention",
              actor: { name: "Theo Lindqvist", tone: "teal" },
              action: "mentioned you in",
              target: "Weekly sync notes",
              snippet: "Action item for @you: share the churn cohort numbers before Thursday.",
              time: "Mon",
              place: "Meetings",
              group: "Earlier this week",
              read: true,
            },
          ]}
        />
      </div>
    </div>
  );
}
