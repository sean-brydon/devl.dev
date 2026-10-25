import { CreditCardIcon, KeyboardIcon, LifeBuoyIcon, UserIcon, UserPlusIcon } from "lucide-react";
import { AccountCard } from "@/registry/items/account-card/account-card";

export default function AccountCardDemo() {
  return (
    <AccountCard
      items={[
        { id: "profile", label: "Profile", icon: UserIcon, shortcut: "⌘P" },
        { id: "billing", label: "Billing", icon: CreditCardIcon, meta: "4 seats" },
        { id: "invite", label: "Invite teammates", icon: UserPlusIcon },
        { id: "shortcuts", label: "Keyboard shortcuts", icon: KeyboardIcon, shortcut: "?" },
        { id: "help", label: "Help & feedback", icon: LifeBuoyIcon },
      ]}
      steps={[
        { id: "email", label: "Verify your email", done: true },
        { id: "name", label: "Add your full name", done: true },
        { id: "photo", label: "Upload a photo" },
        { id: "tz", label: "Set your time zone" },
        { id: "2fa", label: "Turn on two-factor" },
      ]}
      user={{ name: "Noor Haddad", email: "noor@quillpost.app", initials: "NH", plan: "Pro" }}
    />
  );
}
