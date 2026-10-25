import { BellIcon, CreditCardIcon, ShieldCheckIcon, UserIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Switch } from "@/components/ui/switch";
import { DripTabs } from "@/registry/items/drip-tabs/drip-tabs";

function Panel({ title, body, children }: { title: string; body: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <span className="font-medium text-sm">{title}</span>
        <span className="text-muted-foreground text-xs leading-relaxed">{body}</span>
      </div>
      <div className="flex flex-col divide-y rounded-xl border">{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex h-11 items-center justify-between gap-3 px-3 text-sm">
      <span className="truncate">{label}</span>
      {children}
    </div>
  );
}

const value = "shrink-0 text-muted-foreground text-xs tabular-nums";

export default function DripTabsDemo() {
  return (
    <DripTabs
      aria-label="Settings"
      className="max-w-lg"
      defaultValue="notifications"
      items={[
        {
          value: "profile",
          label: "Profile",
          icon: <UserIcon />,
          content: (
            <Panel body="How you appear to the Fernhill team." title="Profile">
              <Row label="Display name">
                <span className={value}>Ines Okafor</span>
              </Row>
              <Row label="Time zone">
                <span className={value}>Lisbon, UTC+1</span>
              </Row>
            </Panel>
          ),
        },
        {
          value: "notifications",
          label: "Notifications",
          icon: <BellIcon />,
          content: (
            <Panel body="Pick what reaches you outside the app." title="Notifications">
              <Row label="Mentions">
                <Switch aria-label="Mentions" defaultChecked />
              </Row>
              <Row label="Weekly digest">
                <Switch aria-label="Weekly digest" />
              </Row>
            </Panel>
          ),
        },
        {
          value: "billing",
          label: "Billing",
          icon: <CreditCardIcon />,
          content: (
            <Panel body="Team plan, billed monthly." title="Billing">
              <Row label="Next invoice">
                <span className={value}>$184 · 1 Nov</span>
              </Row>
              <Row label="Seats">
                <span className={value}>11 of 15</span>
              </Row>
            </Panel>
          ),
        },
        {
          value: "security",
          label: "Security",
          icon: <ShieldCheckIcon />,
          content: (
            <Panel body="Keep the workspace locked down." title="Security">
              <Row label="Two-factor sign-in">
                <Switch aria-label="Two-factor sign-in" defaultChecked />
              </Row>
              <Row label="Members with 2FA">
                <span className={value}>9 of 11</span>
              </Row>
            </Panel>
          ),
        },
      ]}
    />
  );
}
