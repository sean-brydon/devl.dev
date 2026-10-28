"use client";

import { AnimatePresence, LayoutGroup, MotionConfig, motion } from "motion/react";
import {
  ArrowLeftIcon,
  AtSignIcon,
  BellOffIcon,
  BoldIcon,
  BookmarkIcon,
  CornerDownLeftIcon,
  ChevronDownIcon,
  CodeIcon,
  FileTextIcon,
  HashIcon,
  ItalicIcon,
  LockIcon,
  MenuIcon,
  MessageSquareTextIcon,
  MessagesSquareIcon,
  PaperclipIcon,
  PinIcon,
  PlusIcon,
  SearchIcon,
  SendHorizontalIcon,
  SmilePlusIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import {
  Fragment,
  type KeyboardEvent,
  type RefObject,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipPopup, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type ChatTone = "blue" | "orange" | "teal" | "violet" | "rose" | "amber" | "emerald" | "sky";

export interface ChatPerson {
  id: string;
  name: string;
  tone: ChatTone;
  title?: string;
  presence?: "active" | "away" | "offline";
}

export interface ChatReaction {
  emoji: string;
  people: string[];
}

export interface ChatReply {
  id: string;
  author: string;
  time: string;
  text: string;
  reactions?: ChatReaction[];
  saved?: boolean;
}

export interface ChatMessage extends ChatReply {
  day: string;
  replies?: ChatReply[];
  file?: { name: string; size: string; pages?: number };
}

export interface ChatChannel {
  id: string;
  name: string;
  kind: "channel" | "dm";
  with?: string;
  topic?: string;
  private?: boolean;
  unread?: number;
  mentions?: number;
  muted?: boolean;
  members?: number;
  pinned?: string[];
  messages: ChatMessage[];
}

export interface TeamChatProps {
  workspace?: string;
  me?: string;
  people?: ChatPerson[];
  channels?: ChatChannel[];
  className?: string;
}

const avatarTone: Record<ChatTone, string> = {
  blue: "bg-blue-500/14 text-blue-700 dark:text-blue-300",
  orange: "bg-orange-500/14 text-orange-700 dark:text-orange-300",
  teal: "bg-teal-500/16 text-teal-700 dark:text-teal-300",
  violet: "bg-violet-500/16 text-violet-700 dark:text-violet-300",
  rose: "bg-rose-500/14 text-rose-700 dark:text-rose-300",
  amber: "bg-amber-500/18 text-amber-800 dark:text-amber-300",
  emerald: "bg-emerald-500/16 text-emerald-700 dark:text-emerald-300",
  sky: "bg-sky-500/16 text-sky-700 dark:text-sky-300",
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

const defaultPeople: ChatPerson[] = [
  { id: "maya", name: "Maya Okafor", tone: "teal", title: "Head of Product", presence: "active" },
  { id: "priya", name: "Priya Raman", tone: "violet", title: "Product Designer", presence: "active" },
  { id: "jonas", name: "Jonas Weber", tone: "blue", title: "Growth", presence: "active" },
  { id: "leo", name: "Leo Marchetti", tone: "rose", title: "Mobile", presence: "away" },
  { id: "sam", name: "Sam Whitfield", tone: "amber", title: "Platform", presence: "active" },
  { id: "ana", name: "Ana Sousa", tone: "orange", title: "Research", presence: "offline" },
];

const defaultChannels: ChatChannel[] = [
  {
    id: "design",
    name: "design",
    kind: "channel",
    topic: "Crit Thursdays 2pm · onboarding v3 in review",
    members: 14,
    pinned: ["d1", "d6"],
    messages: [
      {
        id: "d0",
        day: "Yesterday",
        author: "ana",
        time: "4:48 PM",
        text: "Synthesis from the five beta teams is in the research folder. Short version: nobody reads step 4.",
        reactions: [{ emoji: "😅", people: ["priya", "leo"] }],
      },
      {
        id: "d1",
        day: "Today",
        author: "priya",
        time: "9:12 AM",
        text: "Onboarding v3 is up for crit at 2pm. Biggest change: we ask for the team name last, after people have seen their first project.",
        file: { name: "onboarding-v3.pdf", size: "2.4 MB", pages: 18 },
        reactions: [
          { emoji: "🔥", people: ["jonas", "leo", "sam"] },
          { emoji: "👀", people: ["ana", "maya"] },
        ],
        replies: [
          { id: "r1", author: "jonas", time: "9:20 AM", text: "Love that it ends on their first project instead of a form." },
          { id: "r2", author: "ana", time: "9:31 AM", text: "Can we test step 4 with the beta teams before we lock it?" },
          { id: "r3", author: "priya", time: "9:40 AM", text: "@Ana yes, booked three sessions for Tuesday.", reactions: [{ emoji: "🙌", people: ["ana"] }] },
          { id: "r4", author: "leo", time: "10:15 AM", text: "I'll bring the mobile prototype so we test both." },
        ],
      },
      {
        id: "d2",
        day: "Today",
        author: "leo",
        time: "9:24 AM",
        text: "The empty project state on step 3 is so much calmer. Can we reuse it in the mobile app?",
        reactions: [{ emoji: "👍", people: ["priya", "maya"] }],
      },
      { id: "d3", day: "Today", author: "leo", time: "9:25 AM", text: "Also, the progress dots feel small on phones. 6px is hard to read at arm's length." },
      {
        id: "d4",
        day: "Today",
        author: "jonas",
        time: "10:02 AM",
        text: "From the pricing side: if team name comes last, can we still show the plan picker before invites? I need it for the Starter experiment.",
        replies: [
          { id: "r1", author: "priya", time: "10:06 AM", text: "Yes, plan picker stays on step 2." },
          { id: "r2", author: "jonas", time: "10:07 AM", text: "Perfect, thank you." },
        ],
      },
      {
        id: "d5",
        day: "Today",
        author: "maya",
        time: "10:05 AM",
        text: "@Jonas plan picker stays where it is. Priya and I walked the whole flow yesterday.",
      },
      {
        id: "d6",
        day: "Today",
        author: "sam",
        time: "10:41 AM",
        text: "Shipped the `ease-out-quint` token to the design system. Every transition in the app is under 250ms now.",
        reactions: [
          { emoji: "🎉", people: ["priya", "leo", "jonas", "ana"] },
          { emoji: "⚡", people: ["maya"] },
        ],
      },
    ],
  },
  {
    id: "eng-platform",
    name: "eng-platform",
    kind: "channel",
    topic: "Queue, webhooks, deploys · on-call: Sam",
    members: 9,
    unread: 3,
    messages: [
      { id: "e1", day: "Today", author: "sam", time: "8:02 AM", text: "Webhook backlog is back to zero. Postmortem draft is in the doc, comments open until Monday." },
      { id: "e2", day: "Today", author: "sam", time: "8:03 AM", text: "Three follow-ups: poison-message handling, consumer lag alert at 2 minutes, and a replay tool.", saved: true },
      {
        id: "e3",
        day: "Today",
        author: "jonas",
        time: "9:50 AM",
        text: "Does the replay tool cover the Oct 21 window? Two customers asked.",
        reactions: [{ emoji: "👍", people: ["maya"] }],
      },
    ],
  },
  {
    id: "launches",
    name: "launches",
    kind: "channel",
    topic: "What's shipping and when",
    members: 32,
    mentions: 1,
    messages: [
      { id: "l1", day: "Today", author: "jonas", time: "11:02 AM", text: "@Maya can you sign off the Starter pricing copy before 3pm? Release notes go out at 4." },
    ],
  },
  {
    id: "research",
    name: "research",
    kind: "channel",
    private: true,
    members: 5,
    topic: "Interview notes and synthesis",
    messages: [{ id: "x1", day: "Yesterday", author: "ana", time: "3:10 PM", text: "Uploaded the last two interview recordings." }],
  },
  {
    id: "random",
    name: "random",
    kind: "channel",
    muted: true,
    members: 41,
    topic: "Dogs, lunch, and the office plant",
    messages: [{ id: "z1", day: "Today", author: "leo", time: "8:30 AM", text: "Someone watered the fern twice again. It's thriving out of spite." }],
  },
  {
    id: "dm-priya",
    name: "Priya Raman",
    kind: "dm",
    with: "priya",
    messages: [
      { id: "p1", day: "Today", author: "priya", time: "8:55 AM", text: "Do you have 10 minutes before crit? I want a second pair of eyes on step 4." },
    ],
  },
  {
    id: "dm-sam",
    name: "Sam Whitfield",
    kind: "dm",
    with: "sam",
    unread: 1,
    messages: [{ id: "s1", day: "Today", author: "sam", time: "10:58 AM", text: "Heads up: deploy freeze starts Thursday 6pm for the board demo." }],
  },
  {
    id: "dm-leo",
    name: "Leo Marchetti",
    kind: "dm",
    with: "leo",
    messages: [{ id: "o1", day: "Yesterday", author: "leo", time: "6:12 PM", text: "Venue options for Lisbon are in your email." }],
  },
];

const emojiChoices = ["👍", "🔥", "🎉", "👀", "🙌", "😅", "✅", "❤️"];

const autoReplies: Record<string, { author: string; text: string }> = {
  design: { author: "priya", text: "Good call. Adding it to the crit doc so we don't lose it." },
  "eng-platform": { author: "sam", text: "On it. I'll post an update here after standup." },
  launches: { author: "jonas", text: "Thanks! Locking the copy now." },
};

const fileExt = (name: string) => name.split(".").pop()?.toUpperCase() ?? "File";

function fileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function isTyping(e: KeyboardEvent) {
  const t = e.target as HTMLElement;
  return t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable;
}

function RichText({ text, people, me }: { text: string; people: ChatPerson[]; me: string }) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\b_[^_]+_\b|@\w+)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
          return (
            <code className="rounded-md border bg-muted px-1 py-px font-mono text-[0.8125rem]" key={i}>
              {part.slice(1, -1)}
            </code>
          );
        }
        if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
          return (
            <strong className="font-semibold" key={i}>
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith("_") && part.endsWith("_") && part.length > 2) {
          return (
            <em key={i}>
              {part.slice(1, -1)}
            </em>
          );
        }
        if (part.startsWith("@")) {
          const who = people.find((p) => p.name.split(" ")[0].toLowerCase() === part.slice(1).toLowerCase());
          if (who) {
            const isMe = who.id === me;
            return (
              <span
                className={cn(
                  "rounded px-0.5 font-medium",
                  isMe ? "bg-warning/16 text-warning-foreground" : "bg-info/10 text-info-foreground",
                )}
                key={i}
              >
                {part}
              </span>
            );
          }
        }
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}

function PersonAvatar({ person, size = "size-9", presence }: { person?: ChatPerson; size?: string; presence?: boolean }) {
  if (!person) return null;
  const tiny = size === "size-5" || size === "size-6";
  const tinyText = size === "size-5" ? "text-[9px]" : "text-[10px]";
  return (
    <span className="relative inline-flex shrink-0">
      <Avatar className={cn(size, tiny ? "rounded-md" : "rounded-lg")}>
        <AvatarFallback className={cn("font-medium", tiny ? cn("rounded-md", tinyText) : "rounded-lg text-xs", avatarTone[person.tone])}>
          {initials(person.name)}
        </AvatarFallback>
      </Avatar>
      {presence && (
        <span
          className={cn(
            "absolute -right-0.5 -bottom-0.5 size-2 rounded-full ring-2 ring-sidebar",
            person.presence === "active" ? "bg-success" : person.presence === "away" ? "bg-warning" : "border border-muted-foreground/60 bg-sidebar",
          )}
        />
      )}
    </span>
  );
}

export type ChatView = "threads" | "mentions" | "saved";

const slugify = (v: string) =>
  v
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

function NavPill() {
  return (
    <motion.span
      className="absolute inset-0 rounded-lg bg-accent"
      layoutId="chat-channel-pill"
      transition={spring}
    />
  );
}

function ChannelNav({
  workspace,
  channels,
  people,
  active,
  view,
  viewCounts,
  onSelect,
  onView,
  onCreateChannel,
  onJump,
  onClose,
}: {
  workspace: string;
  channels: ChatChannel[];
  people: ChatPerson[];
  active: string;
  view: ChatView | null;
  viewCounts: Record<ChatView, number>;
  onSelect: (id: string) => void;
  onView: (v: ChatView) => void;
  onCreateChannel: (name: string) => void;
  onJump: (mode: "all" | "people") => void;
  onClose?: () => void;
}) {
  const [open, setOpen] = useState({ channel: true, dm: true });
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const row =
    "group/row relative flex h-8 w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring";
  const finishCreate = () => {
    const name = slugify(newName);
    if (name) onCreateChannel(name);
    setCreating(false);
    setNewName("");
  };
  const section = (kind: "channel" | "dm", title: string) => (
    <div className="mt-4">
      <div className="flex h-7 items-center ps-1.5 pe-1">
        <button
          aria-expanded={open[kind]}
          className="flex h-7 cursor-pointer items-center gap-1 rounded-md px-1 font-medium text-muted-foreground text-xs outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => setOpen((o) => ({ ...o, [kind]: !o[kind] }))}
          type="button"
        >
          {title}
          <ChevronDownIcon className={cn("size-3 transition-transform duration-200 ease-out", !open[kind] && "-rotate-90")} />
        </button>
        <Button
          aria-label={kind === "channel" ? "Create a channel" : "New direct message"}
          className="ms-auto"
          onClick={() => {
            setOpen((o) => ({ ...o, [kind]: true }));
            if (kind === "channel") setCreating(true);
            else onJump("people");
          }}
          size="icon-xs"
          variant="ghost"
        >
          <PlusIcon />
        </Button>
      </div>
      <AnimatePresence initial={false}>
        {open[kind] && (
          <motion.ul
            animate={{ height: "auto", opacity: 1 }}
            className="-mx-1 flex flex-col gap-0.5 overflow-hidden px-1"
            exit={{ height: 0, opacity: 0 }}
            initial={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease }}
          >
            {channels
              .filter((c) => c.kind === kind)
              .map((c) => {
                const on = !view && c.id === active;
                const loud = !c.muted && ((c.unread ?? 0) > 0 || (c.mentions ?? 0) > 0);
                const person = c.with ? people.find((p) => p.id === c.with) : undefined;
                return (
                  <li key={c.id}>
                    <button
                      aria-current={on ? "page" : undefined}
                      className={cn(
                        row,
                        on ? "text-foreground" : loud ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                        c.muted && !on && "[&>svg]:opacity-60",
                      )}
                      onClick={() => onSelect(c.id)}
                      type="button"
                    >
                      {on ? <NavPill /> : <span className="absolute inset-0 rounded-lg transition-colors group-hover/row:bg-accent" />}
                      {person ? (
                        <span className="relative -ms-0.5">
                          <PersonAvatar person={person} presence size="size-6" />
                        </span>
                      ) : c.private ? (
                        <LockIcon className="relative size-3.5 shrink-0 opacity-70" />
                      ) : (
                        <HashIcon className="relative size-3.5 shrink-0 opacity-70" />
                      )}
                      <span className={cn("relative min-w-0 flex-1 truncate", loud ? "font-semibold" : "font-medium")}>{c.name}</span>
                      {c.muted && <BellOffIcon aria-label="Muted" className="relative size-3 shrink-0" />}
                      {c.mentions ? (
                        <span className="relative flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-red-600 px-1 font-semibold text-[11px] text-white tabular-nums">
                          {c.mentions}
                        </span>
                      ) : c.unread && kind === "dm" ? (
                        <span className="relative flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-foreground px-1 font-semibold text-[11px] text-background tabular-nums">
                          {c.unread}
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            {kind === "channel" && creating && (
              <li>
                <label className="flex h-8 items-center gap-2 rounded-lg border bg-background px-2.5 shadow-xs/5 focus-within:border-ring/60 focus-within:ring-3 focus-within:ring-ring/16 dark:bg-input/32">
                  <HashIcon className="size-3.5 shrink-0 text-muted-foreground" />
                  <input
                    aria-label="New channel name"
                    autoFocus
                    className="min-w-0 flex-1 bg-transparent font-medium outline-none placeholder:font-normal placeholder:text-muted-foreground"
                    onBlur={finishCreate}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === "Enter") finishCreate();
                      if (e.key === "Escape") {
                        setNewName("");
                        setCreating(false);
                      }
                    }}
                    placeholder="new-channel"
                    value={newName}
                  />
                  <CornerDownLeftIcon className="size-3.5 shrink-0 text-muted-foreground" />
                </label>
              </li>
            )}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );

  const views: { id: ChatView; label: string; icon: typeof AtSignIcon }[] = [
    { id: "threads", label: "Threads", icon: MessagesSquareIcon },
    { id: "mentions", label: "Mentions", icon: AtSignIcon },
    { id: "saved", label: "Saved", icon: BookmarkIcon },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 px-3 pt-3 pb-2">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-teal-600 font-semibold text-[11px] text-white">
          {initials(workspace)}
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate font-medium">{workspace}</div>
          <div className="flex items-center gap-1 text-muted-foreground text-xs">
            <span className="size-1.5 rounded-full bg-success" />
            {people.filter((p) => p.presence === "active").length} online
          </div>
        </div>
        {onClose && (
          <Button aria-label="Close channels" onClick={onClose} size="icon-sm" variant="ghost">
            <XIcon />
          </Button>
        )}
      </div>
      <div className="px-2 pb-1">
        <button
          className="flex h-8 w-full cursor-pointer items-center gap-2 rounded-lg border bg-background px-2.5 text-muted-foreground shadow-xs/5 outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring dark:bg-input/32"
          onClick={() => onJump("all")}
          type="button"
        >
          <SearchIcon className="size-4" />
          <span className="flex-1 text-left">Jump to…</span>
          <Kbd>⌘K</Kbd>
        </button>
      </div>
      <nav aria-label="Conversations" className="min-h-0 flex-1 overflow-y-auto px-2 pb-3 [scrollbar-width:thin]">
        <LayoutGroup id="chat-nav">
          <div className="mt-2 flex flex-col gap-0.5">
            {views.map((v) => {
              const on = view === v.id;
              const n = viewCounts[v.id];
              return (
                <button
                  aria-current={on ? "page" : undefined}
                  className={cn(row, on ? "text-foreground" : "text-muted-foreground hover:text-foreground")}
                  key={v.id}
                  onClick={() => onView(v.id)}
                  type="button"
                >
                  {on ? <NavPill /> : <span className="absolute inset-0 rounded-lg transition-colors group-hover/row:bg-accent" />}
                  <v.icon className="relative size-4" />
                  <span className="relative flex-1 font-medium">{v.label}</span>
                  {n > 0 && <span className="relative text-muted-foreground text-xs tabular-nums">{n}</span>}
                </button>
              );
            })}
          </div>
          {section("channel", "Channels")}
          {section("dm", "Direct messages")}
        </LayoutGroup>
      </nav>
    </div>
  );
}

function Reactions({
  reactions,
  me,
  people,
  onToggle,
}: {
  reactions: ChatReaction[];
  me: string;
  people: ChatPerson[];
  onToggle: (emoji: string) => void;
}) {
  if (!reactions.length) return null;
  return (
    <div className="mt-1.5 flex flex-wrap gap-1">
      <AnimatePresence initial={false} mode="popLayout">
        {reactions.map((r) => {
          const mine = r.people.includes(me);
          const names = r.people.map((id) => (id === me ? "You" : (people.find((p) => p.id === id)?.name.split(" ")[0] ?? id)));
          return (
            <motion.button
              animate={{ opacity: 1, scale: 1 }}
              aria-label={`${r.emoji} ${r.people.length}, ${names.join(", ")}`}
              aria-pressed={mine}
              className={cn(
                "flex h-6 cursor-pointer items-center gap-1 rounded-full border px-2 text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring active:scale-95",
                mine ? "border-info/40 bg-info/10 text-info-foreground" : "bg-background hover:border-foreground/20 dark:bg-input/32",
              )}
              exit={{ opacity: 0, scale: 0.9 }}
              initial={{ opacity: 0, scale: 0.9 }}
              key={r.emoji}
              layout
              onClick={() => onToggle(r.emoji)}
              title={names.join(", ")}
              transition={spring}
              type="button"
            >
              <span className="text-[13px] leading-none">{r.emoji}</span>
              <span className="relative inline-flex h-4 overflow-hidden font-medium tabular-nums">
                <AnimatePresence initial={false} mode="popLayout">
                  <motion.span
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -10, opacity: 0 }}
                    initial={{ y: 10, opacity: 0 }}
                    key={r.people.length}
                    transition={{ duration: 0.18, ease }}
                  >
                    {r.people.length}
                  </motion.span>
                </AnimatePresence>
              </span>
            </motion.button>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

function EmojiPicker({ onPick, className }: { onPick: (emoji: string) => void; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger
        aria-label="Add reaction"
        className={cn(
          "flex size-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-popup-open:bg-accent",
          className,
        )}
      >
        <SmilePlusIcon className="size-4" />
      </PopoverTrigger>
      <PopoverPopup align="end" className="p-0" side="top" sideOffset={6}>
        <div className="grid grid-cols-4 gap-0.5 p-1">
          {emojiChoices.map((e) => (
            <button
              aria-label={`React with ${e}`}
              className="flex size-9 cursor-pointer items-center justify-center rounded-lg text-lg outline-none transition-[background-color,scale] duration-100 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring active:scale-90"
              key={e}
              onClick={() => {
                onPick(e);
                setOpen(false);
              }}
              type="button"
            >
              {e}
            </button>
          ))}
        </div>
      </PopoverPopup>
    </Popover>
  );
}

function MessageRow({
  message,
  grouped,
  people,
  me,
  inThread,
  isNew,
  onReact,
  onSave,
  onOpenThread,
  threadOpen,
  flash,
}: {
  message: ChatMessage | ChatReply;
  grouped: boolean;
  people: ChatPerson[];
  me: string;
  inThread?: boolean;
  isNew?: boolean;
  onReact: (emoji: string) => void;
  onSave: () => void;
  onOpenThread?: () => void;
  threadOpen?: boolean;
  flash?: boolean;
}) {
  const author = people.find((p) => p.id === message.author);
  const full = message as ChatMessage;
  const replies = !inThread ? full.replies : undefined;
  const repliers = replies ? Array.from(new Set(replies.map((r) => r.author))).slice(0, 3) : [];
  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "group/msg relative flex gap-3 rounded-xl px-3 transition-colors duration-300 hover:bg-accent/50 focus-within:bg-accent/50",
        grouped ? "py-0.5" : "pt-2 pb-1 [&:not(:first-child)]:mt-1.5",
        threadOpen && "bg-info/6 hover:bg-info/8",
        message.saved && "bg-warning/6 hover:bg-warning/8",
        flash && "bg-warning/16 duration-0",
      )}
      data-msg={message.id}
      initial={isNew ? { opacity: 0, y: 8 } : false}
      transition={spring}
    >
      <div className="w-9 shrink-0">
        {grouped ? (
          <span className="block pt-0.5 text-right text-[10px] text-muted-foreground tabular-nums leading-5 opacity-0 group-hover/msg:opacity-100">
            {message.time.replace(/ (AM|PM)/, "")}
          </span>
        ) : (
          <PersonAvatar person={author} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        {message.saved && (
          <div className="flex items-center gap-1 pb-0.5 font-medium text-warning-foreground text-xs">
            <BookmarkIcon className="size-3 fill-current" />
            Saved for later
          </div>
        )}
        {!grouped && (
          <div className="flex items-baseline gap-2">
            <span className="font-semibold">{author?.name}</span>
            <span className="text-muted-foreground text-xs tabular-nums">{message.time}</span>
          </div>
        )}
        <p className="text-pretty leading-6 [overflow-wrap:anywhere]">
          <RichText me={me} people={people} text={message.text} />
        </p>
        {full.file && (
          <div className="mt-2 flex w-full max-w-sm items-center gap-3 rounded-xl border bg-card p-2.5 shadow-xs/5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-rose-500/12 text-rose-600 dark:text-rose-400">
              <FileTextIcon className="size-5" />
            </span>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate font-medium">{full.file.name}</span>
              <span className="mt-0.5 block text-muted-foreground text-xs tabular-nums">
                {[fileExt(full.file.name), full.file.pages ? `${full.file.pages} pages` : null, full.file.size].filter(Boolean).join(" · ")}
              </span>
            </span>
          </div>
        )}
        <Reactions me={me} onToggle={onReact} people={people} reactions={message.reactions ?? []} />
        {replies && replies.length > 0 && onOpenThread && (
          <button
            className="group/thr -ms-1.5 mt-1 flex cursor-pointer items-center gap-2 rounded-lg py-1 ps-1.5 pe-2 text-left outline-none transition-colors hover:bg-background focus-visible:ring-2 focus-visible:ring-ring dark:hover:bg-accent"
            onClick={onOpenThread}
            type="button"
          >
            <span className="flex gap-0.5">
              {repliers.map((id) => {
                const p = people.find((x) => x.id === id);
                return p ? <PersonAvatar key={id} person={p} size="size-5" /> : null;
              })}
            </span>
            <span className="font-medium text-info-foreground text-xs">
              {replies.length} {replies.length === 1 ? "reply" : "replies"}
            </span>
            <span className="text-muted-foreground text-xs group-hover/thr:hidden">Last reply {replies[replies.length - 1].time}</span>
            <span className="hidden text-muted-foreground text-xs group-hover/thr:inline">View thread</span>
          </button>
        )}
      </div>

      <div className="pointer-events-none absolute -top-3 right-3 z-10 flex items-center gap-0.5 rounded-lg border bg-popover p-0.5 opacity-0 shadow-xs/5 transition-opacity duration-100 group-hover/msg:pointer-events-auto group-hover/msg:opacity-100 group-focus-within/msg:pointer-events-auto group-focus-within/msg:opacity-100">
        {["✅", "👀", "🙌"].map((e) => (
          <button
            aria-label={`React with ${e}`}
            className="flex size-8 cursor-pointer items-center justify-center rounded-md text-sm outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
            key={e}
            onClick={() => onReact(e)}
            type="button"
          >
            {e}
          </button>
        ))}
        <span className="mx-0.5 h-4 w-px bg-border" />
        <EmojiPicker onPick={onReact} />
        {!inThread && onOpenThread && (
          <button
            aria-label="Reply in thread"
            className="flex size-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            onClick={onOpenThread}
            type="button"
          >
            <MessageSquareTextIcon className="size-4" />
          </button>
        )}
        <button
          aria-label={message.saved ? "Remove from saved" : "Save for later"}
          aria-pressed={!!message.saved}
          className={cn(
            "flex size-8 cursor-pointer items-center justify-center rounded-md outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
            message.saved ? "text-warning-foreground" : "text-muted-foreground hover:text-foreground",
          )}
          onClick={onSave}
          type="button"
        >
          <BookmarkIcon className={cn("size-4", message.saved && "fill-current")} />
        </button>
      </div>
    </motion.div>
  );
}

function Composer({
  placeholder,
  value,
  onChange,
  onSend,
  inputRef,
  compact,
  file,
  onFile,
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  inputRef?: RefObject<HTMLTextAreaElement | null>;
  compact?: boolean;
  file?: ChatMessage["file"];
  onFile?: (file: ChatMessage["file"]) => void;
}) {
  const local = useRef<HTMLTextAreaElement>(null);
  const ref = inputRef ?? local;
  const fileInput = useRef<HTMLInputElement>(null);
  const canSend = !!value.trim() || !!file;
  const wrap = (left: string, right = left) => {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    onChange(value.slice(0, start) + left + value.slice(start, end) + right + value.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + left.length, end + left.length);
    });
  };
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value, ref]);
  const tool =
    "flex size-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring";
  return (
    <div className="rounded-2xl border bg-card shadow-xs/5 transition-shadow focus-within:border-ring/60 focus-within:ring-3 focus-within:ring-ring/16">
      <textarea
        aria-label={placeholder}
        className="block w-full resize-none bg-transparent px-3.5 pt-3 pb-1 text-sm leading-6 outline-none placeholder:text-muted-foreground/70"
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            onSend();
          }
          if ((e.metaKey || e.ctrlKey) && !compact) {
            const k = e.key.toLowerCase();
            if (k === "b" || k === "i" || k === "e") {
              e.preventDefault();
              wrap(k === "b" ? "**" : k === "i" ? "_" : "`");
            }
          }
        }}
        placeholder={placeholder}
        ref={ref}
        rows={1}
        value={value}
      />
      {file && (
        <div className="px-2.5 pb-1">
          <span className="inline-flex h-8 max-w-full items-center gap-2 rounded-lg border bg-background ps-2 pe-0.5 text-xs dark:bg-input/32">
            <FileTextIcon className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="min-w-0 truncate font-medium">{file.name}</span>
            <span className="shrink-0 text-muted-foreground tabular-nums">{file.size}</span>
            <button
              aria-label={`Remove ${file.name}`}
              className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => onFile?.(undefined)}
              type="button"
            >
              <XIcon className="size-3" />
            </button>
          </span>
        </div>
      )}
      <div className="flex items-center gap-0.5 px-2 pb-2">
        {!compact && (
          <>
            <button aria-label="Bold" className={tool} onClick={() => wrap("**")} title="Bold (⌘B)" type="button">
              <BoldIcon className="size-4" />
            </button>
            <button aria-label="Italic" className={tool} onClick={() => wrap("_")} title="Italic (⌘I)" type="button">
              <ItalicIcon className="size-4" />
            </button>
            <button aria-label="Code" className={cn(tool, "hidden @lg:flex")} onClick={() => wrap("`")} title="Code (⌘E)" type="button">
              <CodeIcon className="size-4" />
            </button>
            <span className="mx-1 h-4 w-px bg-border" />
          </>
        )}
        {onFile && (
          <>
            <input
              aria-hidden
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFile({ name: f.name, size: fileSize(f.size) });
                e.target.value = "";
                ref.current?.focus();
              }}
              ref={fileInput}
              tabIndex={-1}
              type="file"
            />
            <button aria-label="Attach a file" className={tool} onClick={() => fileInput.current?.click()} type="button">
              <PaperclipIcon className="size-4" />
            </button>
          </>
        )}
        <button
          aria-label="Mention someone"
          className={tool}
          onClick={() => {
            onChange(`${value}${value && !value.endsWith(" ") ? " " : ""}@`);
            requestAnimationFrame(() => ref.current?.focus());
          }}
          type="button"
        >
          <AtSignIcon className="size-4" />
        </button>
        <div className="ms-auto flex items-center gap-2">
          <span className="hidden text-muted-foreground text-xs @xl:inline">
            <Kbd className="h-4 text-[10px]">⇧↵</Kbd> new line
          </span>
          <Button
            aria-label="Send message"
            className="transition-[box-shadow,scale,opacity] duration-150 ease-out active:scale-[0.97]"
            disabled={!canSend}
            onClick={onSend}
            size="icon-sm"
            variant={canSend ? "default" : "ghost"}
          >
            <SendHorizontalIcon />
          </Button>
        </div>
      </div>
    </div>
  );
}

function TypingIndicator({ name }: { name: string | null }) {
  return (
    <div aria-live="polite" className="flex h-6 items-center gap-2 px-1 text-muted-foreground text-xs">
      <AnimatePresence>
        {name && (
          <motion.span
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2"
            exit={{ opacity: 0, y: 2 }}
            initial={{ opacity: 0, y: 2 }}
            transition={{ duration: 0.18, ease }}
          >
            <span aria-hidden className="flex gap-0.5">
              {[0, 1, 2].map((i) => (
                <motion.span
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  className="size-1 rounded-full bg-current"
                  key={i}
                  transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, delay: i * 0.15, ease: "easeInOut" }}
                />
              ))}
            </span>
            <span>
              <span className="font-medium text-foreground">{name}</span> is typing
            </span>
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

function formatClock(minutes: number) {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

type ChatHit = { channel: ChatChannel; message: ChatMessage; reply?: ChatReply };

function JumpPalette({
  mode,
  channels,
  people,
  me,
  onChannel,
  onPerson,
  onClose,
}: {
  mode: "all" | "people";
  channels: ChatChannel[];
  people: ChatPerson[];
  me: string;
  onChannel: (id: string) => void;
  onPerson: (id: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const q = query.trim().toLowerCase();
  const items = [
    ...(mode === "all"
      ? channels.filter((c) => c.kind === "channel").map((c) => ({ key: c.id, kind: "channel" as const, label: c.name, channel: c, person: undefined }))
      : []),
    ...people
      .filter((p) => p.id !== me)
      .map((p) => ({ key: `p:${p.id}`, kind: "person" as const, label: p.name, channel: channels.find((c) => c.with === p.id), person: p })),
  ].filter((i) => !q || i.label.toLowerCase().includes(q));
  const current = Math.min(index, Math.max(0, items.length - 1));
  const pick = (i: (typeof items)[number] | undefined) => {
    if (!i) return;
    if (i.person) onPerson(i.person.id);
    else onChannel(i.key);
  };
  return (
    <div className="absolute inset-0 z-50 flex justify-center px-4 pt-16">
      <motion.div
        animate={{ opacity: 1 }}
        aria-hidden
        className="absolute inset-0 bg-black/24"
        exit={{ opacity: 0 }}
        initial={{ opacity: 0 }}
        onClick={onClose}
        transition={{ duration: 0.15 }}
      />
      <motion.div
        animate={{ opacity: 1, scale: 1, y: 0 }}
        aria-label={mode === "people" ? "New direct message" : "Jump to a conversation"}
        aria-modal="true"
        className="relative flex h-fit max-h-[420px] w-full max-w-md origin-top flex-col overflow-hidden rounded-2xl border bg-popover shadow-lg/10"
        exit={{ opacity: 0, scale: 0.98, y: -4 }}
        initial={{ opacity: 0, scale: 0.97, y: -6 }}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Escape") onClose();
          else if (e.key === "ArrowDown") {
            e.preventDefault();
            setIndex((current + 1) % Math.max(1, items.length));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setIndex((current - 1 + items.length) % Math.max(1, items.length));
          } else if (e.key === "Enter") {
            e.preventDefault();
            pick(items[current]);
          }
        }}
        role="dialog"
        transition={{ duration: 0.16, ease }}
      >
        <label className="flex h-12 shrink-0 items-center gap-2.5 border-b px-4">
          <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
          <input
            aria-activedescendant={items[current] ? `jump-${items[current].key}` : undefined}
            aria-controls="jump-list"
            aria-label={mode === "people" ? "Find a person" : "Find a channel or person"}
            autoFocus
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            onChange={(e) => {
              setQuery(e.target.value);
              setIndex(0);
            }}
            placeholder={mode === "people" ? "Message someone…" : "Jump to a channel or person…"}
            role="combobox"
            aria-expanded
            value={query}
          />
          <Kbd>Esc</Kbd>
        </label>
        <div className="min-h-0 overflow-y-auto p-1.5 [scrollbar-width:thin]" id="jump-list" role="listbox">
          {items.length === 0 ? (
            <p className="px-3 py-6 text-center text-muted-foreground text-xs">Nobody or nothing called “{query}”.</p>
          ) : (
            items.map((i, n) => (
              <div
                aria-selected={n === current}
                className={cn(
                  "flex h-9 cursor-pointer items-center gap-2.5 rounded-lg px-2.5",
                  n === current ? "bg-accent text-foreground" : "text-muted-foreground",
                )}
                id={`jump-${i.key}`}
                key={i.key}
                onClick={() => pick(i)}
                onMouseMove={() => n !== current && setIndex(n)}
                role="option"
                tabIndex={-1}
              >
                {i.person ? (
                  <PersonAvatar person={i.person} presence size="size-6" />
                ) : i.channel?.private ? (
                  <LockIcon className="size-3.5 shrink-0" />
                ) : (
                  <HashIcon className="size-3.5 shrink-0" />
                )}
                <span className="min-w-0 flex-1 truncate font-medium text-foreground">{i.label}</span>
                {i.person?.title && <span className="truncate text-xs">{i.person.title}</span>}
                {!i.person && i.channel?.members ? <span className="text-xs tabular-nums">{i.channel.members} members</span> : null}
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}

const viewMeta: Record<ChatView, { title: string; icon: typeof AtSignIcon; empty: string }> = {
  threads: { title: "Threads", icon: MessagesSquareIcon, empty: "Threads you follow show up here when someone replies." },
  mentions: { title: "Mentions", icon: AtSignIcon, empty: "When someone @mentions you, it lands here." },
  saved: { title: "Saved", icon: BookmarkIcon, empty: "Hover a message and press the bookmark to keep it here for later." },
};

function ViewList({
  view,
  hits,
  people,
  me,
  onOpen,
  onMenu,
}: {
  view: ChatView;
  hits: ChatHit[];
  people: ChatPerson[];
  me: string;
  onOpen: (hit: ChatHit) => void;
  onMenu: () => void;
}) {
  const meta = viewMeta[view];
  return (
    <section aria-label={meta.title} className="flex min-w-0 flex-1 flex-col">
      <header className="flex h-13 shrink-0 items-center gap-2 border-b px-3 @lg:px-4">
        <Button aria-label="Open channels" className="@4xl:hidden" onClick={onMenu} size="icon-sm" variant="ghost">
          <MenuIcon />
        </Button>
        <meta.icon className="size-4 text-muted-foreground" />
        <h2 className="font-semibold">{meta.title}</h2>
        <span className="text-muted-foreground text-xs tabular-nums">{hits.length}</span>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-1 py-2 @lg:px-2 [scrollbar-width:thin]">
        {hits.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-8 pb-10 text-center">
            <span className="flex size-10 items-center justify-center rounded-xl border bg-card text-muted-foreground shadow-xs/5">
              <meta.icon className="size-5" />
            </span>
            <p className="mt-3 font-medium">Nothing here yet</p>
            <p className="mt-1 max-w-64 text-pretty text-muted-foreground text-xs">{meta.empty}</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {hits.map((h) => {
              const m = h.reply ?? h.message;
              const author = people.find((p) => p.id === m.author);
              const replies = h.message.replies ?? [];
              return (
                <li key={`${h.channel.id}:${h.message.id}:${h.reply?.id ?? ""}`}>
                  <button
                    className="flex w-full cursor-pointer gap-3 rounded-xl px-3 py-2.5 text-left outline-none transition-colors hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => onOpen(h)}
                    type="button"
                  >
                    <PersonAvatar person={author} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline gap-2">
                        <span className="truncate font-semibold">{author?.name}</span>
                        <span className="shrink-0 text-muted-foreground text-xs tabular-nums">{m.time}</span>
                        <span className="ms-auto flex shrink-0 items-center gap-1 text-muted-foreground text-xs">
                          {h.channel.kind === "dm" ? h.channel.name : `#${h.channel.name}`}
                          {h.reply && " · thread"}
                        </span>
                      </span>
                      <span className="line-clamp-2 text-pretty leading-6">
                        <RichText me={me} people={people} text={m.text} />
                      </span>
                      {view === "threads" && replies.length > 0 && (
                        <span className="mt-0.5 block font-medium text-info-foreground text-xs">
                          {replies.length} {replies.length === 1 ? "reply" : "replies"}
                          <span className="font-normal text-muted-foreground"> · last {replies[replies.length - 1].time}</span>
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

const headerBtn =
  "flex h-7 cursor-pointer items-center gap-1.5 rounded-lg border px-2 text-muted-foreground text-xs outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-popup-open:bg-accent data-popup-open:text-foreground";

export function TeamChat({
  workspace = "Kestrel",
  me = "maya",
  people = defaultPeople,
  channels: initialChannels = defaultChannels,
  className,
}: TeamChatProps) {
  const [channels, setChannels] = useState(initialChannels);
  const [active, setActive] = useState(initialChannels[0]?.id ?? "");
  const [view, setView] = useState<ChatView | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [jump, setJump] = useState<"all" | "people" | null>(null);
  const [search, setSearch] = useState<string | null>(null);
  const [pinsOpen, setPinsOpen] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<Record<string, ChatMessage["file"]>>({});
  const [typing, setTyping] = useState<{ channel: string; name: string } | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(() => new Set());
  const [unreadFrom, setUnreadFrom] = useState<Record<string, string>>({});
  const [flash, setFlash] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const threadScrollRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const threadComposerRef = useRef<HTMLTextAreaElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const timers = useRef<number[]>([]);
  const clock = useRef(11 * 60 + 14);
  const nowTime = () => formatClock(++clock.current);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const channel = channels.find((c) => c.id === active) ?? channels[0];
  const thread = view ? null : (channel.messages.find((m) => m.id === threadId) ?? null);
  const dmPerson = channel.with ? people.find((p) => p.id === channel.with) : undefined;
  const meName = people.find((p) => p.id === me)?.name.split(" ")[0] ?? me;

  const hits = useMemo(() => {
    const mention = new RegExp(`@${meName}\\b`, "i");
    const out: Record<ChatView, ChatHit[]> = { threads: [], mentions: [], saved: [] };
    for (const c of channels) {
      for (const m of c.messages) {
        if (m.replies?.length) out.threads.push({ channel: c, message: m });
        if (mention.test(m.text)) out.mentions.push({ channel: c, message: m });
        if (m.saved) out.saved.push({ channel: c, message: m });
        for (const r of m.replies ?? []) {
          if (mention.test(r.text)) out.mentions.push({ channel: c, message: m, reply: r });
          if (r.saved) out.saved.push({ channel: c, message: m, reply: r });
        }
      }
    }
    return out;
  }, [channels, meName]);

  const q = search?.trim().toLowerCase() ?? "";
  const shown = q ? channel.messages.filter((m) => m.text.toLowerCase().includes(q)) : channel.messages;

  const count = channel.messages.length;
  const atBottom = useRef(true);
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    atBottom.current = true;
  }, [active, count, view, q]);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      if (atBottom.current) el.scrollTop = el.scrollHeight;
    });
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => ro.disconnect();
  }, [active, view]);
  useLayoutEffect(() => {
    if (!flash) return;
    const box = scrollRef.current;
    const target = box?.querySelector<HTMLElement>(`[data-msg="${flash}"]`);
    if (box && target) {
      const offset = target.getBoundingClientRect().top - box.getBoundingClientRect().top;
      box.scrollTo({ top: box.scrollTop + offset - (box.clientHeight - target.offsetHeight) / 2 });
    }
    const t = window.setTimeout(() => setFlash(null), 1400);
    return () => window.clearTimeout(t);
  }, [flash]);
  const threadCount = thread?.replies?.length ?? 0;
  const shownThread = useRef<string | null>(null);
  useLayoutEffect(() => {
    const el = threadScrollRef.current;
    if (!el) return;
    el.scrollTop = shownThread.current === threadId ? el.scrollHeight : 0;
    shownThread.current = threadId;
  }, [threadId, threadCount]);

  const updateChannel = (id: string, fn: (c: ChatChannel) => ChatChannel) =>
    setChannels((cs) => cs.map((c) => (c.id === id ? fn(c) : c)));

  const select = (id: string) => {
    const target = channels.find((c) => c.id === id);
    if (target?.unread && target.messages.length >= target.unread) {
      const first = target.messages[target.messages.length - target.unread];
      setUnreadFrom((u) => ({ ...u, [id]: first.id }));
    }
    updateChannel(id, (c) => ({ ...c, unread: 0, mentions: 0 }));
    setActive(id);
    setView(null);
    setSearch(null);
    setThreadId(null);
    setDrawer(false);
  };

  const closeJump = () => {
    setJump(null);
    requestAnimationFrame(() => composerRef.current?.focus({ preventScroll: true }));
  };

  const openDm = (personId: string) => {
    const existing = channels.find((c) => c.with === personId);
    if (existing) select(existing.id);
    else {
      const p = people.find((x) => x.id === personId);
      const id = `dm-${personId}`;
      setChannels((cs) => [...cs, { id, name: p?.name ?? personId, kind: "dm", with: personId, messages: [] }]);
      setActive(id);
      setView(null);
      setSearch(null);
      setThreadId(null);
      setDrawer(false);
    }
    closeJump();
  };

  const createChannel = (name: string) => {
    if (channels.some((c) => c.id === name)) return select(name);
    setChannels((cs) => {
      const firstDm = cs.findIndex((c) => c.kind === "dm");
      const next: ChatChannel = { id: name, name, kind: "channel", members: 1, messages: [] };
      return firstDm < 0 ? [...cs, next] : [...cs.slice(0, firstDm), next, ...cs.slice(firstDm)];
    });
    setActive(name);
    setView(null);
    setSearch(null);
    setThreadId(null);
    setDrawer(false);
    requestAnimationFrame(() => composerRef.current?.focus({ preventScroll: true }));
  };

  const toggleReaction = (reactions: ChatReaction[] | undefined, emoji: string): ChatReaction[] => {
    const list = reactions ?? [];
    const hit = list.find((r) => r.emoji === emoji);
    if (!hit) return [...list, { emoji, people: [me] }];
    const who = hit.people.includes(me) ? hit.people.filter((p) => p !== me) : [...hit.people, me];
    return who.length ? list.map((r) => (r.emoji === emoji ? { ...r, people: who } : r)) : list.filter((r) => r.emoji !== emoji);
  };

  const editMessage = (msgId: string, fn: (m: ChatMessage) => ChatMessage) =>
    updateChannel(channel.id, (c) => ({ ...c, messages: c.messages.map((m) => (m.id === msgId ? fn(m) : m)) }));

  const editReply = (msgId: string, replyId: string, fn: (r: ChatReply) => ChatReply) =>
    editMessage(msgId, (m) => ({ ...m, replies: m.replies?.map((r) => (r.id === replyId ? fn(r) : r)) }));

  const markFresh = (id: string) => setFresh((f) => new Set(f).add(id));

  const send = () => {
    const text = (drafts[channel.id] ?? "").trim();
    const file = files[channel.id];
    if (!text && !file) return;
    const id = `m${Date.now()}`;
    const chId = channel.id;
    updateChannel(chId, (c) => ({ ...c, messages: [...c.messages, { id, day: "Today", author: me, time: nowTime(), text, file }] }));
    markFresh(id);
    setDrafts((d) => ({ ...d, [chId]: "" }));
    setFiles((f) => ({ ...f, [chId]: undefined }));
    setSearch(null);
    const auto = autoReplies[chId] ?? (channel.with ? { author: channel.with, text: "Sounds good, talk soon." } : null);
    if (auto && !typing) {
      const who = people.find((p) => p.id === auto.author);
      timers.current.push(
        window.setTimeout(() => setTyping({ channel: chId, name: who?.name.split(" ")[0] ?? "Someone" }), 900),
        window.setTimeout(() => {
          const rid = `m${Date.now()}`;
          setTyping(null);
          updateChannel(chId, (c) => ({ ...c, messages: [...c.messages, { id: rid, day: "Today", author: auto.author, time: nowTime(), text: auto.text }] }));
          markFresh(rid);
        }, 2600),
      );
    }
  };

  const sendReply = () => {
    if (!thread) return;
    const key = `thread:${thread.id}`;
    const text = (drafts[key] ?? "").trim();
    if (!text) return;
    const id = `r${Date.now()}`;
    editMessage(thread.id, (m) => ({ ...m, replies: [...(m.replies ?? []), { id, author: me, time: nowTime(), text }] }));
    markFresh(id);
    setDrafts((d) => ({ ...d, [key]: "" }));
  };

  const openThread = (id: string) => {
    setThreadId(id);
    requestAnimationFrame(() => threadComposerRef.current?.focus({ preventScroll: true }));
  };

  const openHit = (h: ChatHit) => {
    select(h.channel.id);
    if (h.reply || view === "threads") openThread(h.message.id);
    else setFlash(h.message.id);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      setDrawer(false);
      setJump("all");
      return;
    }
    if (e.key === "Escape") {
      if (drawer) setDrawer(false);
      else if (threadId) {
        setThreadId(null);
        composerRef.current?.focus({ preventScroll: true });
      }
      return;
    }
    if (e.altKey && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      e.preventDefault();
      const idx = view ? -1 : channels.findIndex((c) => c.id === active);
      const next = channels[(idx + (e.key === "ArrowDown" ? 1 : -1) + channels.length) % channels.length];
      select(next.id);
      return;
    }
    if (isTyping(e) || e.metaKey || e.ctrlKey || e.altKey || view) return;
    if (e.key.length === 1 && /\S/.test(e.key)) composerRef.current?.focus({ preventScroll: true });
  };

  const typingHere = typing?.channel === channel.id ? typing.name : null;
  const marker = q ? undefined : unreadFrom[channel.id];
  const pinned = (channel.pinned ?? []).map((id) => channel.messages.find((m) => m.id === id)).filter((m): m is ChatMessage => !!m);

  const navProps = {
    workspace,
    channels,
    people,
    active,
    view,
    viewCounts: { threads: 0, mentions: hits.mentions.length, saved: hits.saved.length },
    onSelect: select,
    onView: (v: ChatView) => {
      setView(v);
      setThreadId(null);
      setSearch(null);
      setDrawer(false);
    },
    onCreateChannel: createChannel,
    onJump: (mode: "all" | "people") => {
      setDrawer(false);
      setJump(mode);
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
          <aside aria-label="Channels" className="hidden w-60 shrink-0 @4xl:block">
            <ChannelNav {...navProps} />
          </aside>

          <AnimatePresence>
            {drawer && (
              <>
                <motion.div
                  animate={{ opacity: 1 }}
                  aria-hidden
                  className="absolute inset-0 z-40 bg-black/32 @4xl:hidden"
                  exit={{ opacity: 0 }}
                  initial={{ opacity: 0 }}
                  onClick={() => setDrawer(false)}
                  transition={{ duration: 0.2 }}
                />
                <motion.div
                  animate={{ x: 0 }}
                  aria-label="Channels"
                  aria-modal="true"
                  className="absolute inset-y-2 left-2 z-50 w-[264px] max-w-[calc(100%-3rem)] overflow-hidden rounded-2xl border bg-sidebar shadow-lg/10 @4xl:hidden"
                  exit={{ x: "-110%" }}
                  initial={{ x: "-110%" }}
                  role="dialog"
                  transition={panelSpring}
                >
                  <ChannelNav {...navProps} onClose={() => setDrawer(false)} />
                </motion.div>
              </>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {jump && (
              <JumpPalette
                channels={channels}
                key={jump}
                me={me}
                mode={jump}
                onChannel={(id) => {
                  select(id);
                  closeJump();
                }}
                onClose={closeJump}
                onPerson={openDm}
                people={people}
              />
            )}
          </AnimatePresence>

          <main className="relative flex min-w-0 flex-1 overflow-hidden bg-background @4xl:my-2 @4xl:me-2 @4xl:rounded-2xl @4xl:border @4xl:shadow-xs/5">
            {view ? (
              <ViewList hits={hits[view]} me={me} onMenu={() => setDrawer(true)} onOpen={openHit} people={people} view={view} />
            ) : (
              <section aria-label={channel.kind === "dm" ? channel.name : `#${channel.name}`} className="flex min-w-0 flex-1 flex-col">
                <header className="flex h-13 shrink-0 items-center gap-1.5 border-b px-3 @lg:px-4">
                  <Button aria-label="Open channels" className="@4xl:hidden" onClick={() => setDrawer(true)} size="icon-sm" variant="ghost">
                    <MenuIcon />
                  </Button>
                  {dmPerson ? (
                    <PersonAvatar person={dmPerson} size="size-6" />
                  ) : channel.private ? (
                    <LockIcon className="size-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <HashIcon className="size-4 shrink-0 text-muted-foreground" />
                  )}
                  <div className="ms-0.5 flex min-w-0 flex-1 items-baseline gap-2">
                    <h2 className="truncate font-semibold">{channel.name}</h2>
                    {channel.topic && <span className="hidden truncate text-muted-foreground text-xs @2xl:block">{channel.topic}</span>}
                    {dmPerson?.title && <span className="hidden truncate text-muted-foreground text-xs @2xl:block">{dmPerson.title}</span>}
                  </div>
                  {channel.members ? (
                    <Popover>
                      <PopoverTrigger aria-label={`${channel.members} members`} className={cn(headerBtn, "me-1 hidden @md:flex")}>
                        <UsersIcon className="size-3.5" />
                        <span className="tabular-nums">{channel.members}</span>
                      </PopoverTrigger>
                      <PopoverPopup align="end" className="w-64">
                        <div className="-mx-1 -my-1.5 flex flex-col gap-0.5">
                          <p className="px-1 pb-1.5 font-medium text-muted-foreground text-xs">
                            {channel.members} {channel.members === 1 ? "member" : "members"}
                          </p>
                          {(channel.members === 1 ? people.filter((p) => p.id === me) : people).map((p) => (
                            <div className="flex h-9 items-center gap-2.5 px-1" key={p.id}>
                              <PersonAvatar person={p} presence size="size-6" />
                              <span className="min-w-0 flex-1 truncate font-medium">
                                {p.name}
                                {p.id === me && <span className="font-normal text-muted-foreground"> (you)</span>}
                              </span>
                              <span className="truncate text-muted-foreground text-xs">{p.title}</span>
                            </div>
                          ))}
                          {channel.members > people.length && (
                            <p className="px-1 pt-1 text-muted-foreground text-xs tabular-nums">and {channel.members - people.length} more</p>
                          )}
                        </div>
                      </PopoverPopup>
                    </Popover>
                  ) : null}
                  <Popover onOpenChange={setPinsOpen} open={pinsOpen}>
                    <Tooltip>
                      <TooltipTrigger
                        render={<PopoverTrigger render={<Button aria-label="Pinned messages" size="icon-sm" variant="ghost" />} />}
                      >
                        <PinIcon />
                      </TooltipTrigger>
                      <TooltipPopup>Pinned</TooltipPopup>
                    </Tooltip>
                    <PopoverPopup align="end" className="w-80">
                      <div className="-mx-1 -my-1.5">
                        <p className="px-1 pb-1.5 font-medium text-muted-foreground text-xs">Pinned in {dmPerson ? "this conversation" : `#${channel.name}`}</p>
                        {pinned.length === 0 ? (
                          <p className="px-1 py-3 text-pretty text-muted-foreground text-xs">Nothing pinned yet. Pins keep decisions and links easy to find.</p>
                        ) : (
                          <div className="flex flex-col gap-0.5">
                            {pinned.map((m) => {
                              const a = people.find((p) => p.id === m.author);
                              return (
                                <button
                                  className="flex w-full cursor-pointer gap-2.5 rounded-lg p-1.5 text-left outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                                  key={m.id}
                                  onClick={() => {
                                    setPinsOpen(false);
                                    setSearch(null);
                                    setFlash(m.id);
                                  }}
                                  type="button"
                                >
                                  <PersonAvatar person={a} size="size-6" />
                                  <span className="min-w-0 flex-1">
                                    <span className="flex items-baseline gap-1.5 text-xs">
                                      <span className="font-semibold">{a?.name}</span>
                                      <span className="text-muted-foreground tabular-nums">
                                        {m.day} {m.time}
                                      </span>
                                    </span>
                                    <span className="line-clamp-2 text-pretty text-xs leading-5">
                                      <RichText me={me} people={people} text={m.text} />
                                    </span>
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </PopoverPopup>
                  </Popover>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          aria-label="Search in channel"
                          aria-pressed={search !== null}
                          onClick={() => {
                            if (search === null) {
                              setSearch("");
                              requestAnimationFrame(() => searchRef.current?.focus());
                            } else setSearch(null);
                          }}
                          size="icon-sm"
                          variant="ghost"
                        />
                      }
                    >
                      <SearchIcon />
                    </TooltipTrigger>
                    <TooltipPopup>Search</TooltipPopup>
                  </Tooltip>
                </header>

                {search !== null && (
                  <div className="flex h-11 shrink-0 items-center gap-2 border-b px-4">
                    <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
                    <input
                      aria-label={`Search ${dmPerson ? dmPerson.name : `#${channel.name}`}`}
                      className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
                      onChange={(e) => setSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") {
                          e.stopPropagation();
                          setSearch(null);
                          composerRef.current?.focus({ preventScroll: true });
                        }
                      }}
                      placeholder={`Search ${dmPerson ? dmPerson.name.split(" ")[0] : `#${channel.name}`}`}
                      ref={searchRef}
                      value={search}
                    />
                    {q && (
                      <span className="shrink-0 text-muted-foreground text-xs tabular-nums">
                        {shown.length} {shown.length === 1 ? "result" : "results"}
                      </span>
                    )}
                    <Button aria-label="Close search" onClick={() => setSearch(null)} size="icon-xs" variant="ghost">
                      <XIcon />
                    </Button>
                  </div>
                )}

                <div
                  className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin]"
                  onScroll={(e) => {
                    const el = e.currentTarget;
                    atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
                  }}
                  ref={scrollRef}
                >
                  <div className="flex min-h-full flex-col justify-end px-1 pt-6 pb-2 @lg:px-2">
                    {q && shown.length === 0 ? (
                      <div className="flex flex-1 flex-col items-center justify-center pb-10 text-center">
                        <span className="flex size-10 items-center justify-center rounded-xl border bg-card text-muted-foreground shadow-xs/5">
                          <SearchIcon className="size-5" />
                        </span>
                        <p className="mt-3 font-medium">No messages match</p>
                        <p className="mt-1 text-muted-foreground text-xs">Nothing in {dmPerson ? "this conversation" : `#${channel.name}`} mentions “{search?.trim()}”.</p>
                      </div>
                    ) : (
                      !q && (
                        <div className="mb-4 px-3">
                          <span className="flex size-10 items-center justify-center rounded-xl border bg-card text-muted-foreground shadow-xs/5">
                            {dmPerson ? <PersonAvatar person={dmPerson} size="size-10" /> : <HashIcon className="size-5" />}
                          </span>
                          <h3 className="mt-3 font-heading font-semibold text-base">{dmPerson ? dmPerson.name : `Welcome to #${channel.name}`}</h3>
                          <p className="mt-0.5 text-pretty text-muted-foreground text-xs">
                            {dmPerson
                              ? `This is the start of your conversation with ${dmPerson.name.split(" ")[0]}.`
                              : (channel.topic ?? "You created this channel today. Say what it's for so people know when to use it.")}
                          </p>
                        </div>
                      )
                    )}
                    {shown.map((m, i) => {
                      const prev = shown[i - 1];
                      const newDay = !prev || prev.day !== m.day;
                      const grouped = !q && !newDay && prev.author === m.author && !prev.replies?.length && marker !== m.id && !m.saved;
                      return (
                        <Fragment key={m.id}>
                          {newDay && (
                            <>
                              <div aria-hidden className="mx-3 mt-4 h-px bg-border" />
                              <div className="pointer-events-none sticky top-2 z-10 -mt-[11px] mb-3 flex justify-center" role="separator">
                                <span className="h-[22px] rounded-full border bg-background px-2.5 font-medium text-muted-foreground text-xs leading-5">
                                  {m.day}
                                </span>
                              </div>
                            </>
                          )}
                          {marker === m.id && (
                            <div className="relative my-2 flex items-center" role="separator">
                              <span className="absolute inset-x-3 h-px bg-destructive/50" />
                              <span className="relative ms-auto me-3 rounded-full bg-background ps-2 font-semibold text-[11px] text-destructive-foreground">
                                New
                              </span>
                            </div>
                          )}
                          <MessageRow
                            flash={flash === m.id}
                            grouped={grouped}
                            isNew={fresh.has(m.id)}
                            me={me}
                            message={m}
                            onOpenThread={() => openThread(m.id)}
                            onReact={(emoji) => editMessage(m.id, (x) => ({ ...x, reactions: toggleReaction(x.reactions, emoji) }))}
                            onSave={() => editMessage(m.id, (x) => ({ ...x, saved: !x.saved }))}
                            people={people}
                            threadOpen={threadId === m.id}
                          />
                        </Fragment>
                      );
                    })}
                  </div>
                </div>

                <div className="shrink-0 px-3 pb-3 @lg:px-4">
                  <TypingIndicator name={typingHere} />
                  <Composer
                    file={files[channel.id]}
                    inputRef={composerRef}
                    onChange={(v) => setDrafts((d) => ({ ...d, [channel.id]: v }))}
                    onFile={(f) => setFiles((x) => ({ ...x, [channel.id]: f }))}
                    onSend={send}
                    placeholder={dmPerson ? `Message ${dmPerson.name.split(" ")[0]}` : `Message #${channel.name}`}
                    value={drafts[channel.id] ?? ""}
                  />
                </div>
              </section>
            )}

            <AnimatePresence>
              {thread && (
                <motion.aside
                  animate={{ x: 0, opacity: 1 }}
                  aria-label="Thread"
                  className="absolute inset-0 z-30 flex flex-col border-s bg-background @5xl:static @5xl:z-auto @5xl:w-[380px] @5xl:shrink-0"
                  exit={{ x: 40, opacity: 0 }}
                  initial={{ x: 40, opacity: 0 }}
                  key="thread"
                  transition={{ duration: 0.22, ease }}
                >
                  <header className="flex h-13 shrink-0 items-center gap-2 border-b px-3">
                    <Button aria-label="Back to channel" className="@5xl:hidden" onClick={() => setThreadId(null)} size="icon-sm" variant="ghost">
                      <ArrowLeftIcon />
                    </Button>
                    <div className="min-w-0 flex-1 leading-tight">
                      <div className="font-semibold">Thread</div>
                      <div className="truncate text-muted-foreground text-xs">{dmPerson ? dmPerson.name : `#${channel.name}`}</div>
                    </div>
                    <span className="hidden text-muted-foreground text-xs @5xl:inline">
                      <Kbd>Esc</Kbd>
                    </span>
                    <Button aria-label="Close thread" className="hidden @5xl:inline-flex" onClick={() => setThreadId(null)} size="icon-sm" variant="ghost">
                      <XIcon />
                    </Button>
                  </header>
                  <div className="min-h-0 flex-1 overflow-y-auto px-1 py-3 [scrollbar-width:thin]" ref={threadScrollRef}>
                    <MessageRow
                      grouped={false}
                      inThread
                      me={me}
                      message={thread}
                      onReact={(emoji) => editMessage(thread.id, (x) => ({ ...x, reactions: toggleReaction(x.reactions, emoji) }))}
                      onSave={() => editMessage(thread.id, (x) => ({ ...x, saved: !x.saved }))}
                      people={people}
                    />
                    <div className="relative my-3 flex items-center px-3" role="separator">
                      <span className="pe-2 text-muted-foreground text-xs tabular-nums">
                        {threadCount} {threadCount === 1 ? "reply" : "replies"}
                      </span>
                      <span className="h-px flex-1 bg-border" />
                    </div>
                    {(thread.replies ?? []).map((r, i, all) => (
                      <MessageRow
                        grouped={i > 0 && all[i - 1].author === r.author && !r.saved}
                        inThread
                        isNew={fresh.has(r.id)}
                        key={r.id}
                        me={me}
                        message={r}
                        onReact={(emoji) => editReply(thread.id, r.id, (x) => ({ ...x, reactions: toggleReaction(x.reactions, emoji) }))}
                        onSave={() => editReply(thread.id, r.id, (x) => ({ ...x, saved: !x.saved }))}
                        people={people}
                      />
                    ))}
                  </div>
                  <div className="shrink-0 px-3 pt-1 pb-3">
                    <Composer
                      compact
                      inputRef={threadComposerRef}
                      onChange={(v) => setDrafts((d) => ({ ...d, [`thread:${thread.id}`]: v }))}
                      onSend={sendReply}
                      placeholder="Reply in thread"
                      value={drafts[`thread:${thread.id}`] ?? ""}
                    />
                  </div>
                </motion.aside>
              )}
            </AnimatePresence>
          </main>
        </div>
      </TooltipProvider>
    </MotionConfig>
  );
}
