import { CreditCardIcon, FolderKanbanIcon, ShieldIcon, UsersIcon } from "lucide-react";
import { NotificationMatrix } from "@/registry/items/notification-matrix/notification-matrix";

export default function NotificationMatrixDemo() {
  return (
    <div className="p-4 sm:p-8">
      <NotificationMatrix
        defaultValue={{
          mentions: { email: true, push: true, inApp: true },
          comments: { push: true, inApp: true },
          assigned: { email: true, push: true, inApp: true },
          status: { inApp: true },
          invites: { email: true, inApp: true },
          joins: { inApp: true },
          invoice: { email: true },
          usage: { email: true, inApp: true },
          signin: { push: true },
        }}
        groups={[
          {
            id: "projects",
            label: "Projects",
            icon: FolderKanbanIcon,
            events: [
              { id: "mentions", label: "Mentions", description: "Someone @-mentions you in a task or doc." },
              { id: "comments", label: "Comments on your tasks" },
              { id: "assigned", label: "Assigned to you" },
              { id: "status", label: "Status changes", description: "A task you follow moves between columns." },
            ],
          },
          {
            id: "team",
            label: "Team",
            icon: UsersIcon,
            events: [
              { id: "invites", label: "Invitations to a workspace" },
              { id: "joins", label: "New teammates join" },
            ],
          },
          {
            id: "billing",
            label: "Billing",
            icon: CreditCardIcon,
            events: [
              { id: "invoice", label: "Invoices and receipts" },
              { id: "usage", label: "Usage nears your limit", description: "At 80% and 100% of any plan limit." },
            ],
          },
          {
            id: "security",
            label: "Security",
            icon: ShieldIcon,
            events: [
              {
                id: "signin",
                label: "New sign-in",
                description: "From a device or location we haven’t seen.",
                locked: { email: "Sign-in alerts always go to your email." },
              },
              {
                id: "password",
                label: "Password or 2FA changed",
                locked: { email: "Account changes always go to your email." },
              },
            ],
          },
        ]}
        onSave={() => new Promise((r) => setTimeout(r, 900))}
      />
    </div>
  );
}
