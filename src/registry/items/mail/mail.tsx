"use client";

import { AnimatePresence, LayoutGroup, MotionConfig, motion } from "motion/react";
import {
  ArchiveIcon,
  ArrowLeftIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon,
  FileIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  ImageIcon,
  InboxIcon,
  MailIcon,
  type LucideIcon,
  MailOpenIcon,
  MenuIcon,
  PaperclipIcon,
  PenSquareIcon,
  ReplyIcon,
  SearchIcon,
  SendIcon,
  StarIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { type KeyboardEvent, type ReactElement, type ReactNode, type RefObject, useEffect, useMemo, useRef, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Tooltip, TooltipPopup, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type MailTone = "blue" | "orange" | "teal" | "violet" | "rose" | "amber" | "emerald" | "sky";
export type MailFolder = "inbox" | "starred" | "snoozed" | "sent" | "drafts" | "archive" | "trash";

export interface MailPerson {
  name: string;
  email: string;
  tone?: MailTone;
}

export interface MailAttachment {
  name: string;
  size: string;
  kind: "pdf" | "sheet" | "image" | "doc";
}

export interface MailMessage {
  id: string;
  from: MailPerson;
  to: string;
  time: string;
  body: string[];
  attachments?: MailAttachment[];
}

export interface MailThread {
  id: string;
  subject: string;
  folder: Exclude<MailFolder, "starred">;
  labels?: string[];
  unread?: boolean;
  starred?: boolean;
  time: string;
  messages: MailMessage[];
}

export interface MailLabel {
  id: string;
  name: string;
  tone: MailTone;
}

export interface MailProps {
  account?: MailPerson;
  threads?: MailThread[];
  labels?: MailLabel[];
  className?: string;
}

const avatarTone: Record<MailTone, string> = {
  blue: "bg-blue-500/14 text-blue-700 dark:text-blue-300",
  orange: "bg-orange-500/14 text-orange-700 dark:text-orange-300",
  teal: "bg-teal-500/16 text-teal-800 dark:text-teal-300",
  violet: "bg-violet-500/16 text-violet-700 dark:text-violet-300",
  rose: "bg-rose-500/14 text-rose-700 dark:text-rose-300",
  amber: "bg-amber-500/18 text-amber-800 dark:text-amber-300",
  emerald: "bg-emerald-500/16 text-emerald-700 dark:text-emerald-300",
  sky: "bg-sky-500/16 text-sky-700 dark:text-sky-300",
};

const dotTone: Record<MailTone, string> = {
  blue: "bg-blue-500",
  orange: "bg-orange-500",
  teal: "bg-teal-500",
  violet: "bg-violet-500",
  rose: "bg-rose-500",
  amber: "bg-amber-500",
  emerald: "bg-emerald-500",
  sky: "bg-sky-500",
};

const spring = { type: "spring", stiffness: 520, damping: 42 } as const;
const panelSpring = { type: "spring", stiffness: 420, damping: 40 } as const;
const ease = [0.23, 1, 0.32, 1] as const;

const initials = (name: string) =>
  name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

function Person({ person, size = "size-8" }: { person: MailPerson; size?: string }) {
  return (
    <Avatar className={size}>
      <AvatarFallback className={cn("font-medium text-[11px]", avatarTone[person.tone ?? "blue"])}>
        {initials(person.name)}
      </AvatarFallback>
    </Avatar>
  );
}

const me: MailPerson = { name: "Maya Okafor", email: "maya@kestrel.dev", tone: "teal" };

const jonas: MailPerson = { name: "Jonas Weber", email: "jonas@kestrel.dev", tone: "blue" };
const priya: MailPerson = { name: "Priya Raman", email: "priya@kestrel.dev", tone: "violet" };
const ana: MailPerson = { name: "Ana Sousa", email: "ana@kestrel.dev", tone: "orange" };
const noor: MailPerson = { name: "Noor Haddad", email: "noor@fieldnote.app", tone: "emerald" };
const leo: MailPerson = { name: "Leo Marchetti", email: "leo@kestrel.dev", tone: "rose" };
const sam: MailPerson = { name: "Sam Whitfield", email: "sam@kestrel.dev", tone: "amber" };
const felix: MailPerson = { name: "Felix Bauer", email: "felix@bauer-legal.eu", tone: "sky" };
const harbor: MailPerson = { name: "Harbor Bank", email: "statements@harborbank.example", tone: "teal" };
const ellie: MailPerson = { name: "Ellie Park", email: "ellie.park@hey.example", tone: "violet" };

const defaultLabels: MailLabel[] = [
  { id: "product", name: "Product", tone: "violet" },
  { id: "customers", name: "Customers", tone: "sky" },
  { id: "finance", name: "Finance", tone: "emerald" },
  { id: "hiring", name: "Hiring", tone: "amber" },
];

const defaultThreads: MailThread[] = [
  {
    id: "t1",
    subject: "Q4 pricing review, notes before Thursday",
    folder: "inbox",
    labels: ["finance"],
    unread: true,
    starred: true,
    time: "9:41",
    messages: [
      {
        id: "m1",
        from: jonas,
        to: "to me, Priya",
        time: "Tue 4:12 PM",
        body: [
          "Sharing the first pass of the Q4 pricing numbers so we're not reading them cold on Thursday.",
          "Short version: seat expansion is carrying us, but the Starter tier churns at 6.1% a month. I'd like us to decide whether we fold it into Team or raise the floor.",
        ],
        attachments: [{ name: "q4-pricing-model.xlsx", size: "184 KB", kind: "sheet" }],
      },
      {
        id: "m2",
        from: priya,
        to: "to Jonas, me",
        time: "Wed 10:03 AM",
        body: [
          "Folding Starter into Team would break the self-serve path we just rebuilt. Can we model a $12 floor before we go there?",
        ],
      },
      {
        id: "m3",
        from: jonas,
        to: "to me, Priya",
        time: "9:41 AM",
        body: [
          "Ran it. A $12 floor keeps 82% of Starter accounts and adds about $41k MRR by end of quarter. That's the scenario on tab 3.",
          "Maya, could you pressure-test the churn assumption before Thursday? You know the cohort data better than either of us.",
          "Thanks,\nJonas",
        ],
      },
    ],
  },
  {
    id: "t2",
    subject: "Rollout to 40 seats next week?",
    folder: "inbox",
    labels: ["customers"],
    unread: true,
    time: "9:02",
    messages: [
      {
        id: "m1",
        from: noor,
        to: "to me",
        time: "9:02 AM",
        body: [
          "Hi Maya, the pilot team has been living in Kestrel for three weeks and they won't give it back. We'd like to roll out to the remaining 40 seats on Monday.",
          "Two questions before I send the PO: can we keep our pilot workspace as-is, and is SSO included on the annual plan?",
          "Best,\nNoor",
        ],
      },
    ],
  },
  {
    id: "t3",
    subject: "Design crit: onboarding v3",
    folder: "inbox",
    labels: ["product"],
    unread: true,
    time: "8:15",
    messages: [
      {
        id: "m1",
        from: priya,
        to: "to Product team",
        time: "8:15 AM",
        body: [
          "Attached the v3 flow ahead of crit at 2pm. The big change: we ask for the team name last, after people have seen their first project.",
          "I'd love blunt feedback on step 4. It still feels like a form.",
        ],
        attachments: [
          { name: "onboarding-v3.pdf", size: "2.4 MB", kind: "pdf" },
          { name: "step-4-variants.png", size: "860 KB", kind: "image" },
        ],
      },
    ],
  },
  {
    id: "t4",
    subject: "Candidate packet: Staff Engineer, Platform",
    folder: "inbox",
    labels: ["hiring"],
    time: "Yesterday",
    messages: [
      {
        id: "m1",
        from: ana,
        to: "to me, Sam",
        time: "Thu 5:40 PM",
        body: [
          "Packet for Friday's debrief is attached: resume, take-home, and notes from the two technical rounds.",
          "Strong yes from systems design. Mixed signal on the collaboration round, so I'd like your read on it.",
        ],
        attachments: [{ name: "packet-r-alvarez.pdf", size: "1.1 MB", kind: "pdf" }],
      },
    ],
  },
  {
    id: "t5",
    subject: "Incident review: Oct 21 webhook delays",
    folder: "inbox",
    time: "Yesterday",
    messages: [
      {
        id: "m1",
        from: sam,
        to: "to Engineering",
        time: "Thu 2:18 PM",
        body: [
          "Draft review is up. Root cause was a queue consumer stuck on a poison message for 38 minutes; retries masked it until the backlog hit 120k.",
          "Three follow-ups, owners assigned. Comments welcome until Monday.",
        ],
      },
    ],
  },
  {
    id: "t6",
    subject: "Re: Lisbon offsite, venue shortlist",
    folder: "inbox",
    time: "Oct 22",
    messages: [
      {
        id: "m1",
        from: me,
        to: "to Leo",
        time: "Oct 21",
        body: ["Anything with a big table and a door that closes works for me."],
      },
      {
        id: "m2",
        from: leo,
        to: "to me",
        time: "Oct 22",
        body: [
          "Down to two: a converted printworks in Marvila and a quinta 30 minutes out. The printworks wins on walkability, the quinta on sunsets.",
          "Need a call by Friday to hold the dates.",
        ],
      },
    ],
  },
  {
    id: "t7",
    subject: "Contract redlines v2",
    folder: "inbox",
    labels: ["finance"],
    time: "Oct 21",
    messages: [
      {
        id: "m1",
        from: felix,
        to: "to me",
        time: "Oct 21",
        body: [
          "Second round of redlines attached. We accepted your liability cap; the open item is the 60-day termination notice.",
        ],
        attachments: [{ name: "msa-redlines-v2.docx", size: "96 KB", kind: "doc" }],
      },
    ],
  },
  {
    id: "t8",
    subject: "Your October statement is ready",
    folder: "inbox",
    time: "Oct 20",
    messages: [
      {
        id: "m1",
        from: harbor,
        to: "to me",
        time: "Oct 20",
        body: ["Your statement for the account ending 0417 is ready to view in online banking."],
      },
    ],
  },
  {
    id: "t9",
    subject: "Coffee next week?",
    folder: "inbox",
    time: "Oct 19",
    messages: [
      {
        id: "m1",
        from: ellie,
        to: "to me",
        time: "Oct 19",
        body: ["Back in town from Tuesday. That place by the canal still good?"],
      },
    ],
  },
  {
    id: "s1",
    subject: "Re: Hiring plan for H1",
    folder: "sent",
    time: "Oct 18",
    messages: [
      {
        id: "m1",
        from: me,
        to: "to Ana",
        time: "Oct 18",
        body: ["Looks right. Let's hold the second designer req until we see Q4 numbers."],
      },
    ],
  },
  {
    id: "s2",
    subject: "Board update draft",
    folder: "drafts",
    time: "Oct 17",
    messages: [
      { id: "m1", from: me, to: "to Board", time: "Oct 17", body: ["Headline for the quarter: net revenue retention back above 120%."] },
    ],
  },
  {
    id: "a1",
    subject: "Your flight to Lisbon is confirmed",
    folder: "archive",
    time: "Oct 12",
    messages: [
      { id: "m1", from: { name: "Gull Air", email: "trips@gullair.example", tone: "sky" }, to: "to me", time: "Oct 12", body: ["Booking reference KX4Q2M. Check-in opens 24 hours before departure."] },
    ],
  },
];

const folderMeta: { id: MailFolder; label: string; icon: LucideIcon }[] = [
  { id: "inbox", label: "Inbox", icon: InboxIcon },
  { id: "starred", label: "Starred", icon: StarIcon },
  { id: "snoozed", label: "Snoozed", icon: ClockIcon },
  { id: "sent", label: "Sent", icon: SendIcon },
  { id: "drafts", label: "Drafts", icon: FileIcon },
  { id: "archive", label: "Archive", icon: ArchiveIcon },
  { id: "trash", label: "Trash", icon: Trash2Icon },
];

const attachmentIcon: Record<MailAttachment["kind"], LucideIcon> = {
  pdf: FileTextIcon,
  sheet: FileSpreadsheetIcon,
  image: ImageIcon,
  doc: FileTextIcon,
};

const quickReplies = ["Thanks, on it.", "Can we talk Thursday?", "Looks good to me."];

function fileKind(name: string): MailAttachment["kind"] {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return "pdf";
  if (["xls", "xlsx", "csv", "numbers"].includes(ext)) return "sheet";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg", "heic"].includes(ext)) return "image";
  return "doc";
}

function fileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function AttachButton({ onFiles }: { onFiles: (files: MailAttachment[]) => void }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        aria-hidden
        className="hidden"
        multiple
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []).map((f) => ({ name: f.name, size: fileSize(f.size), kind: fileKind(f.name) }));
          if (files.length) onFiles(files);
          e.target.value = "";
        }}
        ref={input}
        tabIndex={-1}
        type="file"
      />
      <Button aria-label="Attach a file" onClick={() => input.current?.click()} size="icon-sm" variant="ghost">
        <PaperclipIcon />
      </Button>
    </>
  );
}

function PendingFiles({ files, onRemove }: { files: MailAttachment[]; onRemove: (name: string) => void }) {
  if (!files.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 px-3 pb-2">
      {files.map((f) => {
        const Icon = attachmentIcon[f.kind];
        return (
          <span className="inline-flex h-7 max-w-full items-center gap-1.5 rounded-lg border bg-background ps-2 pe-0.5 text-xs dark:bg-input/32" key={f.name}>
            <Icon className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="min-w-0 truncate font-medium">{f.name}</span>
            <span className="shrink-0 text-muted-foreground tabular-nums">{f.size}</span>
            <button
              aria-label={`Remove ${f.name}`}
              className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => onRemove(f.name)}
              type="button"
            >
              <XIcon className="size-3" />
            </button>
          </span>
        );
      })}
    </div>
  );
}

const preview = (m: MailMessage) => m.body[0] ?? m.attachments?.map((a) => a.name).join(", ") ?? "";

function isTyping(e: KeyboardEvent) {
  const t = e.target as HTMLElement;
  return t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable;
}

function scrollIntoContainer(el: HTMLElement | null, container: HTMLElement | null) {
  if (!el || !container) return;
  const top = el.offsetTop;
  const bottom = top + el.offsetHeight;
  if (top < container.scrollTop + 8) container.scrollTop = top - 8;
  else if (bottom > container.scrollTop + container.clientHeight - 8)
    container.scrollTop = bottom - container.clientHeight + 8;
}

function Tip({ label, keys, children }: { label: string; keys?: string; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger render={children as ReactElement} />
      <TooltipPopup>
        <span className="flex items-center gap-2">
          {label}
          {keys && <Kbd className="h-4 min-w-4 text-[10px]">{keys}</Kbd>}
        </span>
      </TooltipPopup>
    </Tooltip>
  );
}

function FolderNav({
  account,
  folder,
  counts,
  labels,
  label,
  onFolder,
  onLabel,
  onCompose,
  onClose,
}: {
  account: MailPerson;
  folder: MailFolder;
  counts: Partial<Record<MailFolder, number>>;
  labels: MailLabel[];
  label: string | null;
  onFolder: (f: MailFolder) => void;
  onLabel: (id: string) => void;
  onCompose: () => void;
  onClose?: () => void;
}) {
  const row =
    "group/row relative flex h-8 w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring";
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 px-3 pt-3 pb-2">
        <Person person={account} size="size-7" />
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate font-medium">{account.name}</div>
          <div className="truncate text-muted-foreground text-xs">{account.email}</div>
        </div>
        {onClose && (
          <Button aria-label="Close folders" onClick={onClose} size="icon-sm" variant="ghost">
            <XIcon />
          </Button>
        )}
      </div>
      <div className="px-2 pb-3">
        <Button
          className="w-full justify-start transition-[box-shadow,scale] duration-150 ease-out active:scale-[0.97]"
          onClick={onCompose}
          variant="outline"
        >
          <PenSquareIcon />
          Compose
          <Kbd className="ms-auto">C</Kbd>
        </Button>
      </div>
      <nav aria-label="Folders" className="min-h-0 flex-1 overflow-y-auto px-2 [scrollbar-width:thin]">
        <LayoutGroup id="mail-folders">
          <ul className="flex flex-col gap-0.5">
            {folderMeta.map((f) => {
              const on = !label && folder === f.id;
              const n = counts[f.id];
              return (
                <li key={f.id}>
                  <button
                    aria-current={on ? "page" : undefined}
                    className={cn(row, on ? "text-foreground" : "text-muted-foreground hover:text-foreground")}
                    onClick={() => onFolder(f.id)}
                    type="button"
                  >
                    {on ? (
                      <motion.span
                        className="absolute inset-0 rounded-lg bg-accent"
                        layoutId="mail-folder-pill"
                        transition={spring}
                      />
                    ) : (
                      <span className="absolute inset-0 rounded-lg transition-colors group-hover/row:bg-accent" />
                    )}
                    <f.icon className="relative size-4 shrink-0" />
                    <span className="relative flex-1 truncate font-medium">{f.label}</span>
                    {n ? (
                      <span
                        className={cn(
                          "relative text-xs tabular-nums",
                          f.id === "inbox" ? "rounded-full bg-info/12 px-1.5 font-medium text-info-foreground" : "text-muted-foreground",
                        )}
                      >
                        {n}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="mt-5 mb-1 px-2.5 font-medium text-muted-foreground text-xs">Labels</div>
          <ul className="flex flex-col gap-0.5">
            {labels.map((l) => {
              const on = label === l.id;
              return (
                <li key={l.id}>
                  <button
                    aria-current={on ? "page" : undefined}
                    className={cn(row, on ? "text-foreground" : "text-muted-foreground hover:text-foreground")}
                    onClick={() => onLabel(l.id)}
                    type="button"
                  >
                    {on ? (
                      <motion.span
                        className="absolute inset-0 rounded-lg bg-accent"
                        layoutId="mail-folder-pill"
                        transition={spring}
                      />
                    ) : (
                      <span className="absolute inset-0 rounded-lg transition-colors group-hover/row:bg-accent" />
                    )}
                    <span className="relative flex size-4 items-center justify-center">
                      <span className={cn("size-2 rounded-full", dotTone[l.tone])} />
                    </span>
                    <span className="relative truncate">{l.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </LayoutGroup>
      </nav>
      <div className="px-4.5 pt-2 pb-4">
        <div className="h-1 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-[37%] rounded-full bg-foreground/60" />
        </div>
        <div className="mt-2 text-muted-foreground text-xs tabular-nums">11.2 GB of 30 GB used</div>
      </div>
    </div>
  );
}

function LabelChip({ label }: { label: MailLabel }) {
  return (
    <span className="inline-flex h-[18px] shrink-0 items-center gap-1 rounded-md bg-muted px-1.5 font-normal text-[11px] text-muted-foreground leading-none">
      <span className={cn("size-1.5 rounded-full", dotTone[label.tone])} />
      {label.name}
    </span>
  );
}

function ThreadRow({
  thread,
  selected,
  labels,
  onOpen,
  onStar,
  rowRef,
}: {
  thread: MailThread;
  selected: boolean;
  labels: MailLabel[];
  onOpen: () => void;
  onStar: () => void;
  rowRef: (el: HTMLButtonElement | null) => void;
}) {
  const last = thread.messages[thread.messages.length - 1];
  const senders = Array.from(new Set(thread.messages.map((m) => (m.from.email === me.email ? "me" : m.from.name.split(" ")[0]))));
  const sender = thread.messages.length > 1 ? senders.join(", ") : last.from.name;
  const firstLabel = labels.find((l) => thread.labels?.includes(l.id));
  const hasFiles = thread.messages.some((m) => m.attachments?.length);
  return (
    <div className="group/thread relative">
      <button
        aria-current={selected ? "true" : undefined}
        className={cn(
          "relative flex w-full cursor-pointer items-start gap-3 rounded-lg py-2.5 ps-3.5 pe-3 text-left outline-none transition-colors duration-100 focus-visible:ring-2 focus-visible:ring-ring",
          selected ? "bg-accent" : "hover:bg-accent/60",
        )}
        onClick={onOpen}
        ref={rowRef}
        type="button"
      >
        {thread.unread && (
          <span aria-label="Unread" className="absolute top-[18px] left-1 size-1.5 rounded-full bg-info" role="img" />
        )}
        <Person person={last.from.email === me.email ? thread.messages[0].from : last.from} size="size-8" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="flex h-5 items-center gap-1.5">
            <span className={cn("truncate", thread.unread ? "font-semibold text-foreground" : "font-medium text-foreground/80")}>{sender}</span>
            {thread.messages.length > 1 && (
              <span className="text-muted-foreground text-xs tabular-nums">{thread.messages.length}</span>
            )}
            <span className="ms-auto flex shrink-0 items-center gap-1.5 ps-2 text-muted-foreground text-xs tabular-nums">
              {hasFiles && <PaperclipIcon aria-label="Has attachments" className="size-3" />}
              <span className={cn("pe-7", thread.unread && "font-medium text-foreground")}>{thread.time}</span>
            </span>
          </span>
          <span className={cn("flex h-5 min-w-0 items-center gap-1.5", thread.unread ? "font-medium text-foreground" : "text-foreground/80")}>
            <span className="truncate">{thread.subject}</span>
            {firstLabel && <LabelChip label={firstLabel} />}
          </span>
          <span className="truncate text-muted-foreground leading-5">{preview(last)}</span>
        </span>
      </button>
      <button
        aria-label={thread.starred ? "Unstar" : "Star"}
        aria-pressed={!!thread.starred}
        className={cn(
          "absolute top-1.5 right-1.5 flex size-8 cursor-pointer items-center justify-center rounded-md outline-none transition-[opacity,color,scale] duration-150 ease-out hover:bg-background/80 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring active:scale-90",
          thread.starred ? "text-amber-500" : "text-muted-foreground opacity-0 group-hover/thread:opacity-100",
        )}
        onClick={onStar}
        type="button"
      >
        <StarIcon className={cn("size-3.5", thread.starred && "fill-current")} />
      </button>
    </div>
  );
}

function MessageBlock({
  message,
  open,
  fade,
  onToggle,
  onAttachment,
}: {
  message: MailMessage;
  open: boolean;
  fade: boolean;
  onToggle: () => void;
  onAttachment: (a: MailAttachment) => void;
}) {
  if (!open) {
    return (
      <button
        aria-expanded={false}
        className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left outline-none transition-colors hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring"
        onClick={onToggle}
        type="button"
      >
        <Person person={message.from} size="size-7" />
        <span className="w-28 shrink-0 truncate font-medium @lg:w-36">{message.from.name}</span>
        <span className="min-w-0 flex-1 truncate text-muted-foreground">{preview(message)}</span>
        <span className="shrink-0 text-muted-foreground text-xs tabular-nums">{message.time}</span>
      </button>
    );
  }
  return (
    <motion.article
      animate={{ opacity: 1 }}
      className="rounded-xl px-3 py-3"
      initial={fade ? { opacity: 0 } : false}
      transition={{ duration: 0.18, ease }}
    >
      <button
        aria-expanded
        className="-m-1 flex w-[calc(100%+0.5rem)] cursor-pointer items-start gap-3 rounded-lg p-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={onToggle}
        type="button"
      >
        <Person person={message.from} />
        <span className="min-w-0 flex-1 leading-tight">
          <span className="flex items-baseline gap-1.5">
            <span className="truncate font-medium">{message.from.name}</span>
            <span className="hidden truncate text-muted-foreground text-xs @lg:inline">&lt;{message.from.email}&gt;</span>
          </span>
          <span className="mt-0.5 block text-muted-foreground text-xs">{message.to}</span>
        </span>
        <span className="shrink-0 text-muted-foreground text-xs tabular-nums">{message.time}</span>
      </button>
      <div className="mt-3 flex flex-col gap-3 text-pretty leading-6 @lg:ps-11">
        {message.body.map((p) => (
          <p className="whitespace-pre-line" key={p}>
            {p}
          </p>
        ))}
        {message.attachments && (
          <div className="mt-1 flex flex-wrap gap-2">
            {message.attachments.map((a) => {
              const Icon = attachmentIcon[a.kind];
              return (
                <button
                  className="flex min-w-0 max-w-full cursor-pointer items-center gap-2.5 rounded-xl border bg-card py-2 ps-2 pe-3 text-left shadow-xs/5 outline-none transition-[background-color,scale] duration-150 ease-out hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]"
                  key={a.name}
                  onClick={() => onAttachment(a)}
                  type="button"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 leading-tight">
                    <span className="block truncate font-medium text-xs">{a.name}</span>
                    <span className="block text-muted-foreground text-xs tabular-nums">{a.size}</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </motion.article>
  );
}

function QuickReply({
  to,
  draft,
  onDraft,
  onSend,
  textareaRef,
  files,
  onFiles,
}: {
  to: MailPerson;
  draft: string;
  onDraft: (v: string) => void;
  onSend: () => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  files: MailAttachment[];
  onFiles: (files: MailAttachment[]) => void;
}) {
  const canSend = !!draft.trim() || files.length > 0;
  return (
    <div className="shrink-0 border-t bg-background px-3 pt-3 pb-3 @lg:px-5">
      <div className="rounded-2xl border bg-card shadow-xs/5 transition-shadow focus-within:border-ring/60 focus-within:ring-3 focus-within:ring-ring/16">
        <div className="flex items-center gap-2 px-3 pt-2.5 text-muted-foreground text-xs">
          <ReplyIcon className="size-3.5" />
          <span>
            Reply to <span className="font-medium text-foreground">{to.name}</span>
          </span>
        </div>
        <textarea
          aria-label={`Reply to ${to.name}`}
          className="block max-h-40 min-h-16 w-full resize-none bg-transparent px-3 py-2 text-sm leading-6 outline-none placeholder:text-muted-foreground/70"
          onChange={(e) => onDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              onSend();
            }
            if (e.key === "Escape") (e.target as HTMLTextAreaElement).blur();
          }}
          placeholder="Write a reply…"
          ref={textareaRef}
          rows={2}
          value={draft}
        />
        <PendingFiles files={files} onRemove={(name) => onFiles(files.filter((f) => f.name !== name))} />
        <div className="flex items-center gap-1.5 px-2 pb-2">
          <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto pe-4 [mask-image:linear-gradient(to_right,black_calc(100%-1.5rem),transparent)] [scrollbar-width:none]">
            {draft.length === 0 &&
              quickReplies.map((q) => (
                <button
                  className="h-7 shrink-0 cursor-pointer rounded-full border px-2.5 text-muted-foreground text-xs outline-none transition-[background-color,color,scale] duration-150 ease-out hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.96]"
                  key={q}
                  onClick={() => {
                    onDraft(q);
                    textareaRef.current?.focus();
                  }}
                  type="button"
                >
                  {q}
                </button>
              ))}
          </div>
          <AttachButton onFiles={(add) => onFiles([...files, ...add.filter((a) => !files.some((f) => f.name === a.name))])} />
          <Button
            className="transition-[box-shadow,scale] duration-150 ease-out active:scale-[0.97]"
            disabled={!canSend}
            onClick={onSend}
            size="sm"
            variant={canSend ? "default" : "secondary"}
          >
            Send
            <span className={cn("hidden text-[11px] @md:inline", canSend ? "text-primary-foreground/70" : "text-muted-foreground")}>⌘↵</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

function Compose({
  onClose,
  onSend,
}: {
  onClose: () => void;
  onSend: (to: string, subject: string, body: string, files: MailAttachment[]) => void;
}) {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<MailAttachment[]>([]);
  const first = useRef<HTMLInputElement>(null);
  useEffect(() => first.current?.focus(), []);
  const field = "h-10 w-full border-b bg-transparent px-4 text-sm outline-none placeholder:text-muted-foreground/70";
  const send = () => to.trim() && onSend(to.trim(), subject.trim() || "(no subject)", body.trim(), files);
  const dirty = !!(to || subject || body || files.length);
  return (
    <motion.div
      animate={{ opacity: 1, scale: 1, y: 0 }}
      aria-label="New message"
      className="absolute right-3 bottom-3 left-3 z-40 flex origin-bottom-right flex-col overflow-hidden rounded-2xl border bg-popover shadow-lg/10 @xl:left-auto @xl:w-[440px]"
      exit={{ opacity: 0, scale: 0.96, y: 8 }}
      initial={{ opacity: 0, scale: 0.96, y: 8 }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send();
      }}
      role="dialog"
      transition={{ duration: 0.2, ease }}
    >
      <div className="flex h-11 items-center justify-between border-b ps-4 pe-2">
        <span className="font-medium">New message</span>
        <Button aria-label="Discard draft" onClick={onClose} size="icon-sm" variant="ghost">
          <XIcon />
        </Button>
      </div>
      <input aria-label="To" className={field} onChange={(e) => setTo(e.target.value)} placeholder="To" ref={first} value={to} />
      <input aria-label="Subject" className={field} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" value={subject} />
      <textarea
        aria-label="Message"
        className="h-40 w-full resize-none bg-transparent px-4 py-3 text-sm leading-6 outline-none placeholder:text-muted-foreground/70"
        onChange={(e) => setBody(e.target.value)}
        placeholder="Say hello…"
        value={body}
      />
      <PendingFiles files={files} onRemove={(name) => setFiles((fs) => fs.filter((f) => f.name !== name))} />
      <div className="flex items-center gap-2 border-t px-3 py-2">
        <Button className="transition-[box-shadow,scale] duration-150 ease-out active:scale-[0.97]" disabled={!to.trim()} onClick={send} size="sm">
          <SendIcon />
          Send
        </Button>
        <AttachButton onFiles={(add) => setFiles((fs) => [...fs, ...add.filter((a) => !fs.some((f) => f.name === a.name))])} />
        <span className={cn("ms-auto text-muted-foreground text-xs transition-opacity duration-150", dirty ? "opacity-100" : "opacity-0")}>
          Draft saved
        </span>
      </div>
    </motion.div>
  );
}

export function Mail({ account = me, threads: initialThreads = defaultThreads, labels = defaultLabels, className }: MailProps) {
  const [threads, setThreads] = useState(() =>
    initialThreads.map((t, i) => (i === 0 ? { ...t, unread: false } : t)),
  );
  const [folder, setFolder] = useState<MailFolder>("inbox");
  const [label, setLabel] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(initialThreads[0]?.id ?? null);
  const [readerOpen, setReaderOpen] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [composing, setComposing] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [draftFiles, setDraftFiles] = useState<Record<string, MailAttachment[]>>({});
  const [toggled, setToggled] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; undo?: () => void; key: number } | null>(null);

  const listRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef(new Map<string, HTMLButtonElement>());
  const replyRef = useRef<HTMLTextAreaElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const readerRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [wide, setWide] = useState(true);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWide(entry.contentRect.width >= 768));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return threads.filter((t) => {
      if (label) {
        if (!t.labels?.includes(label) || t.folder === "trash") return false;
      } else if (folder === "starred") {
        if (!t.starred || t.folder === "trash") return false;
      } else if (t.folder !== folder) return false;
      if (filter === "unread" && !t.unread) return false;
      if (q && !`${t.subject} ${t.messages.map((m) => `${m.from.name} ${m.body.join(" ")}`).join(" ")}`.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [threads, folder, label, filter, query]);

  const counts: Partial<Record<MailFolder, number>> = {
    inbox: threads.filter((t) => t.folder === "inbox" && t.unread).length,
    drafts: threads.filter((t) => t.folder === "drafts").length,
  };

  const selected = visible.find((t) => t.id === selectedId) ?? null;
  const selectedIndex = selected ? visible.indexOf(selected) : -1;

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(id);
  }, [toast]);

  const patch = (id: string, p: Partial<MailThread>) => setThreads((ts) => ts.map((t) => (t.id === id ? { ...t, ...p } : t)));

  const open = (id: string, opts?: { reader?: boolean; focus?: boolean }) => {
    setSelectedId(id);
    patch(id, { unread: false });
    if (opts?.reader !== false) setReaderOpen(true);
    if (opts?.focus) {
      const el = rowRefs.current.get(id);
      el?.focus({ preventScroll: true });
      scrollIntoContainer(el?.parentElement?.parentElement ?? null, listRef.current);
    }
  };

  const move = (delta: number) => {
    if (!visible.length) return;
    const next = visible[Math.min(visible.length - 1, Math.max(0, (selectedIndex < 0 ? -1 : selectedIndex) + delta))];
    if (next) open(next.id, { reader: readerOpen, focus: true });
  };

  const moveTo = (id: string | undefined, target: MailThread["folder"], text: string) => {
    const t = threads.find((x) => x.id === id);
    if (!t) return;
    const idx = visible.findIndex((x) => x.id === id);
    const neighbour = visible[idx + 1] ?? visible[idx - 1];
    const prevFolder = t.folder;
    patch(t.id, { folder: target });
    setSelectedId(neighbour?.id ?? null);
    if (neighbour) patch(neighbour.id, { unread: false });
    if (!neighbour) setReaderOpen(false);
    requestAnimationFrame(() => {
      const next = neighbour ? rowRefs.current.get(neighbour.id) : null;
      (next ?? rootRef.current)?.focus({ preventScroll: true });
    });
    setToast({
      key: Date.now(),
      text,
      undo: () => {
        patch(t.id, { folder: prevFolder });
        setSelectedId(t.id);
        setToast(null);
        rootRef.current?.focus({ preventScroll: true });
      },
    });
  };

  const archive = (id = selected?.id) => {
    const t = threads.find((x) => x.id === id);
    if (!t) return;
    if (t.folder === "archive") moveTo(id, "inbox", "Moved to Inbox");
    else moveTo(id, "archive", "Conversation archived");
  };

  const snooze = (id = selected?.id) => {
    const t = threads.find((x) => x.id === id);
    if (!t) return;
    if (t.folder === "snoozed") moveTo(id, "inbox", "Moved to Inbox");
    else moveTo(id, "snoozed", "Snoozed until Mon 8:00");
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset on thread change only
  useEffect(() => {
    if (readerRef.current) readerRef.current.scrollTop = 0;
  }, [selected?.id]);

  const sendReply = () => {
    if (!selected) return;
    const text = (drafts[selected.id] ?? "").trim();
    const files = draftFiles[selected.id] ?? [];
    if (!text && !files.length) return;
    const msg: MailMessage = {
      id: `r${Date.now()}`,
      from: account,
      to: `to ${selected.messages[selected.messages.length - 1].from.name.split(" ")[0]}`,
      time: "Just now",
      body: text ? text.split(/\n{2,}/) : [],
      attachments: files.length ? files : undefined,
    };
    patch(selected.id, { messages: [...selected.messages, msg], time: "Now" });
    setDrafts((d) => ({ ...d, [selected.id]: "" }));
    setDraftFiles((d) => ({ ...d, [selected.id]: [] }));
    setToast({ key: Date.now(), text: "Reply sent" });
    requestAnimationFrame(() => readerRef.current?.scrollTo({ top: readerRef.current.scrollHeight, behavior: "smooth" }));
  };

  const goFolder = (f: MailFolder) => {
    setFolder(f);
    setLabel(null);
    setDrawer(false);
    setReaderOpen(false);
    setQuery("");
    listRef.current?.scrollTo({ top: 0 });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      if (composing) return;
      if (drawer) return setDrawer(false);
      if (readerOpen) {
        setReaderOpen(false);
        if (selected) rowRefs.current.get(selected.id)?.focus({ preventScroll: true });
      }
      return;
    }
    if (isTyping(e) || e.metaKey || e.ctrlKey || e.altKey || composing) return;
    const k = e.key.toLowerCase();
    if (k === "j" || e.key === "ArrowDown") {
      e.preventDefault();
      move(1);
    } else if (k === "k" || e.key === "ArrowUp") {
      e.preventDefault();
      move(-1);
    } else if (k === "e" && selected) {
      e.preventDefault();
      archive();
    } else if (k === "h" && selected) {
      e.preventDefault();
      snooze();
    } else if (k === "s" && selected) {
      patch(selected.id, { starred: !selected.starred });
    } else if (k === "u" && selected) {
      patch(selected.id, { unread: !selected.unread });
    } else if (k === "r" && selected) {
      e.preventDefault();
      setReaderOpen(true);
      requestAnimationFrame(() => replyRef.current?.focus());
    } else if (k === "c") {
      e.preventDefault();
      setComposing(true);
    } else if (e.key === "/") {
      e.preventDefault();
      searchRef.current?.focus();
    } else if (e.key === "Enter" && selected && !readerOpen) {
      setReaderOpen(true);
    }
  };

  const title = label ? labels.find((l) => l.id === label)?.name : folderMeta.find((f) => f.id === folder)?.label;
  const lastFrom = selected
    ? ([...selected.messages].reverse().find((m) => m.from.email !== account.email)?.from ?? selected.messages[0].from)
    : null;

  const navProps = {
    account,
    counts,
    folder,
    label,
    labels,
    onCompose: () => {
      setDrawer(false);
      setComposing(true);
    },
    onFolder: goFolder,
    onLabel: (id: string) => {
      setLabel(id);
      setDrawer(false);
      setReaderOpen(false);
    },
  };

  return (
    <MotionConfig reducedMotion="user">
      <TooltipProvider delay={500}>
        <div
          className={cn(
            "@container relative isolate flex h-[760px] w-full overflow-hidden bg-sidebar text-foreground text-sm outline-none",
            className,
          )}
          onKeyDown={onKeyDown}
          ref={rootRef}
          tabIndex={-1}
        >
          <aside aria-label="Mailboxes" className="hidden w-60 shrink-0 @5xl:block">
            <FolderNav {...navProps} />
          </aside>

          <AnimatePresence>
            {drawer && (
              <>
                <motion.div
                  animate={{ opacity: 1 }}
                  aria-hidden
                  className="absolute inset-0 z-40 bg-black/32 @5xl:hidden"
                  exit={{ opacity: 0 }}
                  initial={{ opacity: 0 }}
                  onClick={() => setDrawer(false)}
                  transition={{ duration: 0.2 }}
                />
                <motion.div
                  animate={{ x: 0 }}
                  aria-label="Mailboxes"
                  aria-modal="true"
                  className="absolute inset-y-2 left-2 z-50 w-[264px] max-w-[calc(100%-3rem)] overflow-hidden rounded-2xl border bg-sidebar shadow-lg/10 @5xl:hidden"
                  exit={{ x: "-110%" }}
                  initial={{ x: "-110%" }}
                  role="dialog"
                  transition={panelSpring}
                >
                  <FolderNav {...navProps} onClose={() => setDrawer(false)} />
                </motion.div>
              </>
            )}
          </AnimatePresence>

          <main className="relative flex min-w-0 flex-1 overflow-hidden bg-background @5xl:my-2 @5xl:me-2 @5xl:rounded-2xl @5xl:border @5xl:shadow-xs/5">
            <section
              aria-label={`${title} conversations`}
              className="flex w-full min-w-0 flex-col @3xl:w-[340px] @3xl:shrink-0 @3xl:border-e @6xl:w-[380px]"
            >
              <header className="flex shrink-0 flex-col gap-3 px-3 pt-3 pb-2">
                <div className="flex h-8 items-center gap-1.5">
                  <Button aria-label="Open mailboxes" className="@5xl:hidden" onClick={() => setDrawer(true)} size="icon-sm" variant="ghost">
                    <MenuIcon />
                  </Button>
                  <h2 className="ps-1 font-heading font-semibold text-base">{title}</h2>
                  <span className="text-muted-foreground text-xs tabular-nums">{visible.length}</span>
                  <div className="ms-auto flex rounded-lg bg-muted p-0.5" role="group" aria-label="Filter">
                    {(["all", "unread"] as const).map((f) => (
                      <button
                        aria-pressed={filter === f}
                        className={cn(
                          "relative h-6 cursor-pointer rounded-md px-2 font-medium text-xs capitalize outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          filter === f ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                        )}
                        key={f}
                        onClick={() => setFilter(f)}
                        type="button"
                      >
                        {filter === f && (
                          <motion.span
                            className="absolute inset-0 rounded-md bg-background shadow-xs/5 dark:bg-accent"
                            layoutId="mail-filter"
                            transition={spring}
                          />
                        )}
                        <span className="relative">{f}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <label className="flex h-8 items-center gap-2 rounded-lg border bg-background px-2.5 text-muted-foreground shadow-xs/5 transition-shadow focus-within:border-ring/60 focus-within:ring-3 focus-within:ring-ring/16 dark:bg-input/32">
                  <SearchIcon className="size-4 shrink-0" />
                  <input
                    aria-label="Search mail"
                    className="min-w-0 flex-1 bg-transparent text-foreground text-sm outline-none placeholder:text-muted-foreground"
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        setQuery("");
                        (e.target as HTMLInputElement).blur();
                      }
                      if (e.key === "ArrowDown" || e.key === "Enter") {
                        e.preventDefault();
                        if (visible[0]) open(visible[0].id, { reader: e.key === "Enter", focus: true });
                      }
                    }}
                    placeholder="Search mail"
                    ref={searchRef}
                    value={query}
                  />
                  {query ? (
                    <button aria-label="Clear search" className="cursor-pointer rounded text-muted-foreground hover:text-foreground" onClick={() => setQuery("")} type="button">
                      <XIcon className="size-3.5" />
                    </button>
                  ) : (
                    <Kbd>/</Kbd>
                  )}
                </label>
              </header>

              <div className="relative min-h-0 flex-1 overflow-y-auto px-1.5 pb-2 [scrollbar-width:thin]" ref={listRef}>
                {visible.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center px-8 pb-10 text-center">
                    <span className="flex size-10 items-center justify-center rounded-xl border bg-card text-muted-foreground shadow-xs/5">
                      {query ? <SearchIcon className="size-5" /> : <MailOpenIcon className="size-5" />}
                    </span>
                    <p className="mt-3 font-medium">{query ? "No matches" : folder === "inbox" && !label ? "Inbox zero" : "Nothing here"}</p>
                    <p className="mt-1 max-w-56 text-pretty text-muted-foreground text-xs">
                      {query
                        ? `Nothing in ${title} mentions “${query}”.`
                        : folder === "inbox" && !label
                          ? "Every conversation is handled. New mail lands here."
                          : "Conversations you move here will show up in this list."}
                    </p>
                  </div>
                ) : (
                  <ul className="flex flex-col gap-0.5" key={`${folder}|${label}|${filter}|${query}`}>
                    <AnimatePresence initial={false}>
                      {visible.map((t) => (
                        <motion.li
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          initial={{ opacity: 0, height: 0 }}
                          key={t.id}
                          style={{ overflow: "hidden" }}
                          transition={{ duration: 0.2, ease }}
                        >
                          <ThreadRow
                            labels={labels}
                            onOpen={() => open(t.id)}
                            onStar={() => patch(t.id, { starred: !t.starred })}
                            rowRef={(el) => {
                              if (el) rowRefs.current.set(t.id, el);
                              else rowRefs.current.delete(t.id);
                            }}
                            selected={t.id === selected?.id}
                            thread={t}
                          />
                        </motion.li>
                      ))}
                    </AnimatePresence>
                  </ul>
                )}
              </div>

              <footer className="hidden shrink-0 items-center gap-3 border-t px-4 py-2 text-muted-foreground text-xs @3xl:flex">
                <span className="flex items-center gap-1">
                  <Kbd>J</Kbd>
                  <Kbd>K</Kbd>
                  move
                </span>
                <span className="flex items-center gap-1">
                  <Kbd>E</Kbd>
                  archive
                </span>
                <span className="flex items-center gap-1">
                  <Kbd>R</Kbd>
                  reply
                </span>
                <span className="flex items-center gap-1">
                  <Kbd>H</Kbd>
                  snooze
                </span>
              </footer>
            </section>

            <section
              aria-label="Conversation"
              className={cn(
                "absolute inset-0 z-20 flex min-w-0 flex-col bg-background transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] @3xl:static @3xl:z-auto @3xl:flex-1 @3xl:translate-x-0 motion-reduce:transition-none",
                readerOpen ? "translate-x-0" : "pointer-events-none translate-x-full @3xl:pointer-events-auto",
              )}
              inert={!wide && !readerOpen ? true : undefined}
            >
              {selected && lastFrom ? (
                <>
                  <header className="flex h-12 shrink-0 items-center gap-1 border-b px-2 @lg:px-3">
                    <Button aria-label="Back to list" className="@3xl:hidden" onClick={() => setReaderOpen(false)} size="icon-sm" variant="ghost">
                      <ArrowLeftIcon />
                    </Button>
                    <Tip keys="E" label={selected.folder === "archive" ? "Move to Inbox" : "Archive"}>
                      <Button aria-label="Archive" onClick={() => archive()} size="icon-sm" variant="ghost">
                        {selected.folder === "archive" ? <InboxIcon /> : <ArchiveIcon />}
                      </Button>
                    </Tip>
                    <Tip keys="H" label={selected.folder === "snoozed" ? "Unsnooze" : "Snooze until Monday"}>
                      <Button aria-label={selected.folder === "snoozed" ? "Unsnooze" : "Snooze"} onClick={() => snooze()} size="icon-sm" variant="ghost">
                        {selected.folder === "snoozed" ? <InboxIcon /> : <ClockIcon />}
                      </Button>
                    </Tip>
                    <Tip keys="U" label={selected.unread ? "Mark read" : "Mark unread"}>
                      <Button
                        aria-label={selected.unread ? "Mark read" : "Mark unread"}
                        onClick={() => patch(selected.id, { unread: !selected.unread })}
                        size="icon-sm"
                        variant="ghost"
                      >
                        {selected.unread ? <MailOpenIcon /> : <MailIcon />}
                      </Button>
                    </Tip>
                    <Tip keys="S" label={selected.starred ? "Unstar" : "Star"}>
                      <Button
                        aria-label={selected.starred ? "Unstar" : "Star"}
                        aria-pressed={!!selected.starred}
                        onClick={() => patch(selected.id, { starred: !selected.starred })}
                        size="icon-sm"
                        variant="ghost"
                      >
                        <StarIcon className={cn(selected.starred && "fill-amber-500 text-amber-500 opacity-100")} />
                      </Button>
                    </Tip>
                    <span className="ms-auto me-1 text-muted-foreground text-xs tabular-nums">
                      {selectedIndex + 1} of {visible.length}
                    </span>
                    <Tip keys="K" label="Newer">
                      <Button aria-label="Newer conversation" disabled={selectedIndex <= 0} onClick={() => move(-1)} size="icon-sm" variant="ghost">
                        <ChevronUpIcon />
                      </Button>
                    </Tip>
                    <Tip keys="J" label="Older">
                      <Button
                        aria-label="Older conversation"
                        disabled={selectedIndex >= visible.length - 1}
                        onClick={() => move(1)}
                        size="icon-sm"
                        variant="ghost"
                      >
                        <ChevronDownIcon />
                      </Button>
                    </Tip>
                  </header>

                  <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin]" ref={readerRef}>
                    <div className="mx-auto flex max-w-3xl flex-col px-2 pt-5 pb-6 @lg:px-4">
                      <div className="px-3 pb-3">
                        <h1 className="text-balance font-heading font-semibold text-lg tracking-tight">{selected.subject}</h1>
                        {selected.labels?.length ? (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {labels
                              .filter((l) => selected.labels?.includes(l.id))
                              .map((l) => (
                                <LabelChip key={l.id} label={l} />
                              ))}
                          </div>
                        ) : null}
                      </div>
                      <div className="flex flex-col gap-1">
                        {selected.messages.map((m, i) => {
                          const isLast = i === selected.messages.length - 1;
                          const key = `${selected.id}:${m.id}`;
                          const isOpen = expanded[key] ?? isLast;
                          return (
                            <div className={cn(i > 0 && "border-t pt-1")} key={m.id}>
                              <MessageBlock
                                fade={toggled === key}
                                message={m}
                                onAttachment={(a) => setToast({ key: Date.now(), text: `Downloading ${a.name}` })}
                                onToggle={() => {
                                  setToggled(key);
                                  setExpanded((x) => ({ ...x, [key]: !isOpen }));
                                }}
                                open={isOpen}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <QuickReply
                    draft={drafts[selected.id] ?? ""}
                    files={draftFiles[selected.id] ?? []}
                    onDraft={(v) => setDrafts((d) => ({ ...d, [selected.id]: v }))}
                    onFiles={(files) => setDraftFiles((d) => ({ ...d, [selected.id]: files }))}
                    onSend={sendReply}
                    textareaRef={replyRef}
                    to={lastFrom}
                  />
                </>
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <span className="flex size-10 items-center justify-center rounded-xl border bg-card text-muted-foreground shadow-xs/5">
                    <InboxIcon className="size-5" />
                  </span>
                  <p className="mt-3 font-medium">No conversation selected</p>
                  <p className="mt-1 text-muted-foreground text-xs">
                    Press <Kbd>J</Kbd> to open the next one.
                  </p>
                </div>
              )}
            </section>

            <AnimatePresence>
              {composing && (
                <Compose
                  onClose={() => setComposing(false)}
                  onSend={(to, subject, body, files) => {
                    const id = `c${Date.now()}`;
                    setThreads((ts) => [
                      {
                        id,
                        subject,
                        folder: "sent",
                        time: "Now",
                        messages: [
                          {
                            id: "m1",
                            from: account,
                            to: `to ${to}`,
                            time: "Just now",
                            body: body ? body.split(/\n{2,}/) : [],
                            attachments: files.length ? files : undefined,
                          },
                        ],
                      },
                      ...ts,
                    ]);
                    setComposing(false);
                    setToast({ key: Date.now(), text: "Message sent" });
                  }}
                />
              )}
            </AnimatePresence>

            <div
              aria-live="polite"
              className="pointer-events-none absolute inset-x-0 bottom-4 z-30 flex justify-center px-4 @3xl:right-auto @3xl:bottom-12 @3xl:w-[340px] @6xl:w-[380px]"
            >
              <AnimatePresence mode="popLayout">
                {toast && !composing && (
                  <motion.div
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className="pointer-events-auto flex h-10 items-center gap-3 rounded-full border bg-popover ps-4 pe-1.5 shadow-lg/10"
                    exit={{ opacity: 0, y: 6, scale: 0.98 }}
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    key={toast.key}
                    transition={{ duration: 0.2, ease }}
                  >
                    <span className="text-sm">{toast.text}</span>
                    {toast.undo ? (
                      <Button className="rounded-full" onClick={toast.undo} size="xs" variant="secondary">
                        Undo
                      </Button>
                    ) : (
                      <span className="w-1" />
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </main>
        </div>
      </TooltipProvider>
    </MotionConfig>
  );
}
