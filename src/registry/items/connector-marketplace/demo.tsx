import {
  ActivityIcon,
  ArchiveIcon,
  BrainIcon,
  CalendarDaysIcon,
  ChartPieIcon,
  CloudIcon,
  CodeIcon,
  GitBranchIcon,
  HardDriveIcon,
  ListChecksIcon,
  MailIcon,
  MessageCircleIcon,
  MessagesSquareIcon,
  ReceiptIcon,
  RocketIcon,
  SparklesIcon,
  WalletIcon,
} from "lucide-react";
import { ConnectorMarketplace } from "@/registry/items/connector-marketplace/connector-marketplace";

export default function ConnectorMarketplaceDemo() {
  return (
    <div className="p-4 sm:p-8">
      <ConnectorMarketplace
        apps={[
          { id: "pigeonpost", name: "Pigeonpost", category: "comms", icon: MailIcon, tone: "blue", rating: 4.8, installs: "42k", pricing: "free", connected: true, description: "Shared inboxes as threads your team can assign and close." },
          { id: "chatterbox", name: "Chatterbox", category: "comms", icon: MessagesSquareIcon, tone: "green", rating: 4.6, installs: "31k", pricing: "free", description: "Post updates to channels and reply to alerts in place." },
          { id: "gitwise", name: "Gitwise", category: "dev", icon: GitBranchIcon, tone: "red", rating: 4.9, installs: "58k", pricing: "free", description: "Link pull requests to tasks so status moves when code ships." },
          { id: "deploybot", name: "Deploybot", category: "dev", icon: RocketIcon, tone: "blue", rating: 4.5, installs: "12k", pricing: "paid", isNew: true, description: "A preview URL for every change, promoted with one click." },
          { id: "metricly", name: "Metricly", category: "analytics", icon: ChartPieIcon, tone: "amber", rating: 4.7, installs: "22k", pricing: "paid", description: "Live dashboards from your product events, no SQL needed." },
          { id: "pulseboard", name: "Pulseboard", category: "analytics", icon: ActivityIcon, tone: "green", rating: 4.3, installs: "8.4k", pricing: "free", isNew: true, description: "Uptime and latency checks with calm, deduplicated alerts." },
          { id: "ledgerly", name: "Ledgerly", category: "finance", icon: ReceiptIcon, tone: "neutral", rating: 4.6, installs: "19k", pricing: "paid", description: "Invoices and payments synced to your books every night." },
          { id: "coinjar", name: "Coinjar", category: "finance", icon: WalletIcon, tone: "amber", rating: 4.2, installs: "6.1k", pricing: "free", description: "Team spend against budget, with a nudge before you overshoot." },
          { id: "vaultbox", name: "Vaultbox", category: "storage", icon: ArchiveIcon, tone: "blue", rating: 4.4, installs: "27k", pricing: "free", connected: true, description: "Attach files from your drive and keep permissions in sync." },
          { id: "cloudnest", name: "Cloudnest", category: "storage", icon: CloudIcon, tone: "blue", rating: 4.1, installs: "9.8k", pricing: "paid", description: "Nightly backups of your workspace to your own bucket." },
          { id: "quill", name: "Quill AI", category: "ai", icon: SparklesIcon, tone: "neutral", rating: 4.8, installs: "36k", pricing: "paid", isNew: true, description: "Draft replies, summaries and release notes in your team's voice." },
          { id: "brainstorm", name: "Brainstorm", category: "ai", icon: BrainIcon, tone: "amber", rating: 4.5, installs: "14k", pricing: "free", description: "Sorts feedback into themes so you see what people ask for." },
          { id: "calendo", name: "Calendo", category: "productivity", icon: CalendarDaysIcon, tone: "green", rating: 4.7, installs: "48k", pricing: "free", description: "Book meetings from any task and block focus time automatically." },
          { id: "taskfox", name: "Taskfox", category: "productivity", icon: ListChecksIcon, tone: "neutral", rating: 4.0, installs: "5.2k", pricing: "paid", description: "Move boards and checklists from your old tool in a minute." },
        ]}
        categories={[
          { id: "comms", label: "Communication", icon: MessageCircleIcon },
          { id: "dev", label: "Developer tools", icon: CodeIcon },
          { id: "analytics", label: "Analytics", icon: ChartPieIcon },
          { id: "finance", label: "Finance", icon: WalletIcon },
          { id: "storage", label: "Storage", icon: HardDriveIcon },
          { id: "ai", label: "AI", icon: SparklesIcon },
          { id: "productivity", label: "Productivity", icon: ListChecksIcon },
        ]}
        workspace={{ name: "Juniper & Co." }}
      />
    </div>
  );
}
