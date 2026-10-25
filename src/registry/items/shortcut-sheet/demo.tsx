import { ArchiveIcon, InboxIcon, PenSquareIcon, StarIcon } from "lucide-react";
import { ShortcutSheet } from "@/registry/items/shortcut-sheet/shortcut-sheet";

const mail = [
  { from: "Mara Okafor", subject: "Pricing page copy, final pass", time: "9:12", unread: true },
  { from: "Fernhill Billing", subject: "Your October invoice is ready", time: "8:40", unread: true },
  { from: "Sam Adeyemi", subject: "Re: Onboarding v3 walkthrough", time: "Wed" },
  { from: "Noor Haddad", subject: "Offsite agenda + room bookings", time: "Tue" },
  { from: "Theo Lindqvist", subject: "Churn cohorts for Thursday", time: "Mon" },
  { from: "Ada Brennan", subject: "Contract redlines from Fernhill", time: "Mon" },
];

export default function ShortcutSheetDemo() {
  return (
    <ShortcutSheet
      className="h-[440px] w-[460px] max-w-full"
      groups={[
        {
          title: "General",
          shortcuts: [
            { label: "Search mail", keys: [["/"]], keywords: ["find"] },
            { label: "Open command menu", keys: [["mod", "K"]], keywords: ["palette"] },
            { label: "Compose", keys: [["C"]], keywords: ["new", "write"] },
            { label: "Show shortcuts", keys: [["?"]], keywords: ["help"] },
          ],
        },
        {
          title: "Navigation",
          shortcuts: [
            { label: "Go to Inbox", keys: [["G"], ["I"]] },
            { label: "Go to Starred", keys: [["G"], ["S"]] },
            { label: "Next conversation", keys: [["J"]], keywords: ["down"] },
            { label: "Previous conversation", keys: [["K"]], keywords: ["up"] },
          ],
        },
        {
          title: "Conversation",
          shortcuts: [
            { label: "Reply", keys: [["R"]] },
            { label: "Reply all", keys: [["shift", "R"]] },
            { label: "Archive", keys: [["E"]], keywords: ["done"] },
            { label: "Star or unstar", keys: [["S"]], keywords: ["favourite"] },
            { label: "Mark as unread", keys: [["shift", "U"]] },
            { label: "Snooze", keys: [["H"]], keywords: ["later", "remind"] },
            { label: "Send", keys: [["mod", "enter"]] },
            { label: "Move to folder", keys: [["mod", "shift", "M"]], keywords: ["label"] },
            { label: "Undo", keys: [["mod", "Z"]] },
          ],
        },
      ]}
    >
      <div className="flex items-center gap-1 border-b px-3 py-2">
        <span className="me-auto flex items-center gap-2 font-medium text-sm">
          <InboxIcon className="size-4 text-muted-foreground" />
          Inbox
          <span className="rounded-full bg-muted px-1.5 font-medium text-[11px] text-muted-foreground tabular-nums">2</span>
        </span>
        <span className="flex size-7 items-center justify-center rounded-md text-muted-foreground">
          <ArchiveIcon className="size-4" />
        </span>
        <span className="flex size-7 items-center justify-center rounded-md text-muted-foreground">
          <StarIcon className="size-4" />
        </span>
        <span className="flex size-7 items-center justify-center rounded-md text-muted-foreground">
          <PenSquareIcon className="size-4" />
        </span>
      </div>
      <ul className="h-[352px] divide-y overflow-hidden">
        {mail.map((m, i) => (
          <li className={`flex items-baseline gap-3 px-4 py-2.5 text-sm ${i === 0 ? "bg-accent/60" : ""}`} key={m.subject}>
            <span className={`size-1.5 shrink-0 -translate-y-0.5 rounded-full ${m.unread ? "bg-info" : "bg-transparent"}`} />
            <span className="min-w-0 flex-1">
              <span className={`block truncate ${m.unread ? "font-medium" : "text-muted-foreground"}`}>{m.from}</span>
              <span className="block truncate text-muted-foreground text-xs">{m.subject}</span>
            </span>
            <span className="shrink-0 text-muted-foreground text-xs tabular-nums">{m.time}</span>
          </li>
        ))}
      </ul>
    </ShortcutSheet>
  );
}
