"use client";

import {
  ArrowUpIcon,
  CheckIcon,
  ChevronRightIcon,
  CopyIcon,
  FileTextIcon,
  FolderIcon,
  FolderKanbanIcon,
  type LucideIcon,
  MessageSquareIcon,
  PanelLeftCloseIcon,
  PanelLeftIcon,
  PaperclipIcon,
  PlusIcon,
  RotateCcwIcon,
  SearchIcon,
  SparklesIcon,
  SquareIcon,
  SquarePenIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  XIcon,
} from "lucide-react";
import { AnimatePresence, LayoutGroup, MotionConfig, motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Composer,
  ComposerActionGroup,
  ComposerActions,
  ComposerInput,
  ComposerSubmit,
  type ComposerValue,
  getComposerText,
} from "@/components/ui/composer";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control";
import { cn } from "@/lib/utils";

export type AssistantTone = 1 | 2 | 3 | 4 | 5;

export interface AssistantAttachment {
  name: string;
  size?: string;
}

export interface AssistantMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachments?: AssistantAttachment[];
}

export interface AssistantChat {
  id: string;
  title: string;
  group?: string;
  projectId?: string;
  messages?: AssistantMessage[];
}

export interface AssistantProject {
  id: string;
  name: string;
  description?: string;
  icon?: LucideIcon;
  tone?: AssistantTone;
  files?: number;
  updated?: string;
  suggestions?: AssistantSuggestion[];
}

export interface AssistantSuggestion {
  icon?: LucideIcon;
  title: string;
  hint?: string;
  prompt?: string;
}

export interface AssistantAppProps {
  productName?: string;
  user?: { name: string; initials: string; plan?: string };
  greeting?: string;
  chats?: AssistantChat[];
  projects?: AssistantProject[];
  suggestions?: AssistantSuggestion[];
  defaultChatId?: string;
  reply?: (prompt: string, project?: AssistantProject) => string;
  className?: string;
}

type Status = "thinking" | "streaming" | "done";
type LiveMessage = AssistantMessage & { status: Status; full?: string };
type LiveChat = Omit<AssistantChat, "messages"> & { messages: LiveMessage[] };

const press = "transition-[scale,box-shadow,background-color] duration-150 ease-out active:scale-[0.97]";
const cardPress = "transition-[background-color,box-shadow,scale] duration-150 ease-out active:scale-[0.98]";
const iconHit = "after:absolute after:-inset-y-1 after:inset-x-0 transition-[scale,background-color] duration-150 ease-out active:scale-[0.94]";

function fileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function AttachmentChip({ file, onRemove }: { file: AssistantAttachment; onRemove?: () => void }) {
  return (
    <span className="inline-flex h-7 max-w-48 items-center gap-1.5 rounded-lg border bg-background ps-2 pe-1 text-xs dark:bg-input/32">
      <FileTextIcon aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="truncate font-medium">{file.name}</span>
      {file.size ? <span className="shrink-0 text-muted-foreground tabular-nums">{file.size}</span> : null}
      {onRemove ? (
        <button
          aria-label={`Remove ${file.name}`}
          className="relative flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground outline-none transition-colors after:absolute after:-inset-1.5 hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          onClick={onRemove}
          type="button"
        >
          <XIcon className="size-3" />
        </button>
      ) : (
        <span className="w-1" />
      )}
    </span>
  );
}

const tones: Record<AssistantTone, { dot: string; tile: string }> = {
  1: { dot: "bg-orange-500", tile: "bg-orange-500/12 text-orange-700 dark:text-orange-300" },
  2: { dot: "bg-teal-500", tile: "bg-teal-500/12 text-teal-700 dark:text-teal-300" },
  3: { dot: "bg-violet-500", tile: "bg-violet-500/12 text-violet-700 dark:text-violet-300" },
  4: { dot: "bg-amber-500", tile: "bg-amber-500/14 text-amber-700 dark:text-amber-300" },
  5: { dot: "bg-rose-500", tile: "bg-rose-500/12 text-rose-700 dark:text-rose-300" },
};

function defaultReply(prompt: string, project?: AssistantProject) {
  const where = project ? ` using what's in **${project.name}**` : "";
  return `Here's a first pass${where}.\n\n**How I'd approach it**\n1. Pin down the goal and who it's for.\n2. Gather the two or three facts that matter most.\n3. Draft, then cut anything that doesn't move the reader.\n\nTell me more about "${prompt.slice(0, 60)}" and I'll turn this into a full draft.`;
}

function titleFrom(prompt: string) {
  const words = prompt.trim().replace(/\s+/g, " ").split(" ");
  const head = words.slice(0, 6).join(" ").replace(/[.,;:!?]+$/, "");
  return head.charAt(0).toUpperCase() + head.slice(1) + (words.length > 6 ? "…" : "");
}

function toLive(chats: AssistantChat[], defaultChatId: string | undefined, reply: AssistantAppProps["reply"], projects: AssistantProject[]) {
  return chats.map<LiveChat>((chat) => {
    const messages: LiveMessage[] = (chat.messages ?? []).map((m) => ({ ...m, status: "done" }));
    const last = messages.at(-1);
    if (chat.id === defaultChatId && last?.role === "user") {
      const project = projects.find((p) => p.id === chat.projectId);
      messages.push({
        id: `${chat.id}-pending`,
        role: "assistant",
        content: "",
        status: "thinking",
        full: (reply ?? defaultReply)(last.content, project),
      });
    }
    return { ...chat, messages };
  });
}

function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+(?:\*\*|$)|`[^`]+`)/g).filter(Boolean);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("**") ? (
          <strong className="font-medium text-foreground" key={i}>
            {part.replace(/\*\*/g, "")}
          </strong>
        ) : part.startsWith("`") && part.endsWith("`") && part.length > 1 ? (
          <code className="rounded-md bg-muted px-1 py-0.5 font-mono text-[0.8125rem]" key={i}>
            {part.slice(1, -1)}
          </code>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

type Block =
  | { kind: "p"; text: string }
  | { kind: "ul" | "ol"; items: string[] }
  | { kind: "code"; text: string };

function parse(src: string): Block[] {
  const blocks: Block[] = [];
  const lines = src.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("```")) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) body.push(lines[i++]);
      blocks.push({ kind: "code", text: body.join("\n") });
      continue;
    }
    const ul = line.match(/^[-*] (.*)/);
    const ol = line.match(/^\d+\. (.*)/);
    const prev = blocks.at(-1);
    if (ul || ol) {
      const kind = ul ? "ul" : "ol";
      const text = (ul ?? ol)?.[1] ?? "";
      if (prev && prev.kind === kind) prev.items.push(text);
      else blocks.push({ kind, items: [text] });
    } else if (line.trim()) {
      blocks.push({ kind: "p", text: line });
    }
  }
  return blocks;
}

function Caret() {
  return (
    <motion.span
      animate={{ opacity: [1, 0.25, 1] }}
      aria-hidden
      className="ms-0.5 inline-block size-2 translate-y-[-1px] rounded-full bg-foreground align-middle"
      transition={{ duration: 0.9, repeat: Number.POSITIVE_INFINITY }}
    />
  );
}

function Markdown({ text, caret }: { text: string; caret?: boolean }) {
  const blocks = parse(text);
  const lastIndex = blocks.length - 1;
  return (
    <div className="space-y-3 text-foreground/90 text-sm leading-6">
      {blocks.map((b, i) => {
        const tail = caret && i === lastIndex ? <Caret /> : null;
        if (b.kind === "code")
          return (
            <pre className="overflow-x-auto rounded-xl border bg-muted/60 px-3.5 py-3 font-mono text-xs leading-5" key={i}>
              <code>{b.text}</code>
              {tail}
            </pre>
          );
        if (b.kind === "p")
          return (
            <p key={i}>
              <Inline text={b.text} />
              {tail}
            </p>
          );
        const List = b.kind === "ul" ? "ul" : "ol";
        return (
          <List
            className={cn(
              "space-y-1.5 ps-5 marker:text-muted-foreground",
              b.kind === "ul" ? "list-disc" : "list-decimal marker:tabular-nums",
            )}
            key={i}
          >
            {b.items.map((item, j) => (
              <li className="ps-1" key={j}>
                <Inline text={item} />
                {j === b.items.length - 1 ? tail : null}
              </li>
            ))}
          </List>
        );
      })}
      {caret && blocks.length === 0 ? <Caret /> : null}
    </div>
  );
}

function AssistantMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground",
        className,
      )}
    >
      <SparklesIcon className="size-3.5" />
    </span>
  );
}

function Thinking({ reduce }: { reduce: boolean | null }) {
  return (
    <div className="flex h-7 items-center gap-2 text-muted-foreground text-sm">
      <span>Thinking</span>
      <span className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.span
            animate={{ opacity: [0.25, 1, 0.25], y: [0, -2, 0] }}
            className="size-1 rounded-full bg-muted-foreground"
            key={i}
            transition={{ duration: 0.9, repeat: Number.POSITIVE_INFINITY, delay: i * 0.15 }}
          />
        ))}
      </span>
    </div>
  );
}

function MessageActions({ text, onRetry }: { text: string; onRetry?: () => void }) {
  const [copied, setCopied] = useState(false);
  const [vote, setVote] = useState<"up" | "down" | null>(null);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1400);
    return () => clearTimeout(t);
  }, [copied]);
  const copy = () => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(true);
  };
  return (
    <motion.div
      animate={{ opacity: 1 }}
      className="-ms-1.5 mt-2 flex items-center gap-0.5 text-muted-foreground"
      initial={{ opacity: 0 }}
      transition={{ duration: 0.25, delay: 0.1 }}
    >
      <Button aria-label={copied ? "Copied" : "Copy reply"} onClick={copy} className={iconHit} size="icon-xs" variant="ghost">
        {copied ? <CheckIcon className="text-success-foreground" /> : <CopyIcon />}
      </Button>
      <Button
        aria-label="Good reply"
        aria-pressed={vote === "up"}
        className={cn(iconHit, vote === "up" && "bg-accent text-foreground")}
        onClick={() => setVote(vote === "up" ? null : "up")}
        size="icon-xs"
        variant="ghost"
      >
        <ThumbsUpIcon />
      </Button>
      <Button
        aria-label="Bad reply"
        aria-pressed={vote === "down"}
        className={cn(iconHit, vote === "down" && "bg-accent text-foreground")}
        onClick={() => setVote(vote === "down" ? null : "down")}
        size="icon-xs"
        variant="ghost"
      >
        <ThumbsDownIcon />
      </Button>
      {onRetry ? (
        <Button aria-label="Regenerate reply" className={iconHit} onClick={onRetry} size="icon-xs" variant="ghost">
          <RotateCcwIcon />
        </Button>
      ) : null}
    </motion.div>
  );
}

export function AssistantApp({
  productName = "Assistant",
  user = { name: "You", initials: "Y" },
  greeting = "Welcome back",
  chats: initialChats = [],
  projects = [],
  suggestions = [],
  defaultChatId,
  reply = defaultReply,
  className,
}: AssistantAppProps) {
  const reduce = useReducedMotion();
  const uid = useId();
  const [projectList, setProjectList] = useState(projects);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [files, setFiles] = useState<(AssistantAttachment & { id: string })[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const drawerClose = useRef<HTMLButtonElement>(null);
  const [chats, setChats] = useState<LiveChat[]>(() => toLive(initialChats, defaultChatId, reply, projects));
  const [activeId, setActiveId] = useState<string | null>(defaultChatId ?? null);
  const [scopeId, setScopeId] = useState<string | null>(
    () => initialChats.find((c) => c.id === defaultChatId)?.projectId ?? null,
  );
  const [view, setView] = useState<"chats" | "projects">("chats");
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<ComposerValue>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);
  const focusAfterSend = useRef(false);

  const active = chats.find((c) => c.id === activeId) ?? null;
  const scope = projectList.find((p) => p.id === (active?.projectId ?? scopeId)) ?? null;
  const live = chats.flatMap((c) => c.messages.map((m) => ({ chatId: c.id, m }))).find(({ m }) => m.status !== "done");
  const busy = Boolean(live);

  const patchMessage = (chatId: string, msgId: string, fn: (m: LiveMessage) => LiveMessage) =>
    setChats((cs) =>
      cs.map((c) => (c.id === chatId ? { ...c, messages: c.messages.map((m) => (m.id === msgId ? fn(m) : m)) } : c)),
    );

  useEffect(() => {
    if (!live) return;
    const { chatId, m } = live;
    if (m.status === "thinking") {
      const t = setTimeout(() => patchMessage(chatId, m.id, (x) => ({ ...x, status: "streaming" })), 700);
      return () => clearTimeout(t);
    }
    const full = m.full ?? "";
    const t = setTimeout(
      () =>
        patchMessage(chatId, m.id, (x) => {
          const rest = full.slice(x.content.length);
          const step = rest.match(/^\s*\S+\s*(\S+\s*)?/)?.[0] ?? rest;
          const content = x.content + step;
          return content.length >= full.length
            ? { id: x.id, role: x.role, content: full, status: "done" }
            : { ...x, content };
        }),
      reduce ? 12 : 34,
    );
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live?.m.status, live?.m.content, live?.m.id]);

  const following = view === "chats" && Boolean(active);
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el && following && pinned.current) el.scrollTop = el.scrollHeight;
  });

  useLayoutEffect(() => {
    pinned.current = true;
    if (scrollRef.current) scrollRef.current.scrollTop = following ? scrollRef.current.scrollHeight : 0;
  }, [activeId, view, following]);

  useEffect(() => {
    if (!focusAfterSend.current) return;
    focusAfterSend.current = false;
    composerRef.current?.querySelector<HTMLElement>("[data-slot=composer-input]")?.focus({ preventScroll: true });
  });

  const send = (raw: string) => {
    const text = raw.trim();
    if (!text || busy) return;
    const stamp = Date.now().toString(36);
    const attachments = files.map(({ name, size }) => ({ name, size }));
    const read = attachments.length
      ? `I've read ${attachments.map((f) => `**${f.name}**`).join(" and ")}.\n\n`
      : "";
    const user: LiveMessage = {
      id: `u-${stamp}`,
      role: "user",
      content: text,
      attachments: attachments.length ? attachments : undefined,
      status: "done",
    };
    const answer: LiveMessage = {
      id: `a-${stamp}`,
      role: "assistant",
      content: "",
      status: "thinking",
      full: read + reply(text, scope ?? undefined),
    };
    if (active) {
      setChats((cs) => cs.map((c) => (c.id === active.id ? { ...c, messages: [...c.messages, user, answer] } : c)));
    } else {
      const id = `c-${stamp}`;
      setChats((cs) => [
        { id, title: titleFrom(text), group: "Today", projectId: scope?.id, messages: [user, answer] },
        ...cs,
      ]);
      setActiveId(id);
    }
    setDraft([]);
    setFiles([]);
    pinned.current = true;
    focusAfterSend.current = true;
  };

  const stop = () => {
    if (!live) return;
    patchMessage(live.chatId, live.m.id, (x) => ({
      id: x.id,
      role: x.role,
      content: x.content.trim() || "Stopped.",
      status: "done",
    }));
  };

  const retry = (chatId: string, msgId: string) => {
    const chat = chats.find((c) => c.id === chatId);
    if (!chat || busy) return;
    const index = chat.messages.findIndex((m) => m.id === msgId);
    const prompt = chat.messages.slice(0, index).findLast((m) => m.role === "user")?.content ?? "";
    const project = projectList.find((p) => p.id === chat.projectId);
    patchMessage(chatId, msgId, (x) => ({ ...x, content: "", status: "thinking", full: reply(prompt, project) }));
    pinned.current = true;
  };

  const openChat = (id: string) => {
    setActiveId(id);
    setScopeId(chats.find((c) => c.id === id)?.projectId ?? null);
    setView("chats");
    setDrawer(false);
  };

  const newChat = (projectId: string | null = null) => {
    setActiveId(null);
    setScopeId(projectId);
    setView("chats");
    setDrawer(false);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? chats.filter((c) => c.title.toLowerCase().includes(q)) : chats;
  }, [chats, query]);
  const groups = useMemo(() => {
    const map = new Map<string, LiveChat[]>();
    for (const c of filtered) {
      const g = c.group ?? "Recent";
      map.set(g, [...(map.get(g) ?? []), c]);
    }
    return [...map.entries()];
  }, [filtered]);
  const chatCount = (projectId: string) => chats.filter((c) => c.projectId === projectId).length;

  const attach = (list: FileList | null) => {
    if (!list?.length) return;
    const picked = Array.from(list).map((f, i) => ({
      id: `${Date.now().toString(36)}-${i}-${f.name}`,
      name: f.name,
      size: fileSize(f.size),
    }));
    setFiles((prev) => [...prev, ...picked].slice(0, 5));
  };

  const createProject = () => {
    const name = newName.trim();
    setCreating(false);
    setNewName("");
    if (!name) return;
    const id = `p-${Date.now().toString(36)}`;
    const used = (t: AssistantTone) => projectList.filter((p) => (p.tone ?? 1) === t).length;
    const tone = ([1, 2, 3, 4, 5] as AssistantTone[]).reduce((best, t) => (used(t) < used(best) ? t : best));
    setProjectList((list) => [...list, { id, name, tone, files: 0, updated: "Just now" }]);
    newChat(id);
  };

  useEffect(() => {
    if (drawer) drawerClose.current?.focus();
  }, [drawer]);

  const spring = reduce ? { duration: 0 } : { type: "spring" as const, stiffness: 420, damping: 36 };

  const sidebar = (inDrawer: boolean) => (
    <div className="flex h-full w-64 flex-col">
      <div className="flex h-12 shrink-0 items-center gap-2 px-3">
        <span className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <SparklesIcon className="size-3.5" />
        </span>
        <span className="flex-1 truncate font-medium text-sm">{productName}</span>
        {inDrawer ? (
          <Button aria-label="Close sidebar" onClick={() => setDrawer(false)} ref={drawerClose} size="icon-sm" variant="ghost">
            <XIcon />
          </Button>
        ) : (
          <Button aria-label="Collapse sidebar" onClick={() => setCollapsed(true)} size="icon-sm" variant="ghost">
            <PanelLeftCloseIcon />
          </Button>
        )}
      </div>
      <div className="space-y-2 px-2.5 pb-2">
        <Button className={cn("w-full justify-start", press)} onClick={() => newChat(null)} size="sm" variant="outline">
          <SquarePenIcon />
          New chat
        </Button>
        <InputGroup>
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            aria-label="Search chats"
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chats"
            size="sm"
            type="search"
            value={query}
          />
        </InputGroup>
      </div>
      <ScrollArea className="flex-1" scrollFade>
        <nav aria-label="Workspace" className="space-y-4 px-2.5 pt-2 pb-4">
          {!query && projectList.length > 0 ? (
            <section>
              <div className="flex h-7 items-center justify-between ps-2">
                <h3 className="font-medium text-muted-foreground text-xs">Projects</h3>
                <Button
                  aria-label="All projects"
                  className={cn("text-muted-foreground after:-inset-x-1", iconHit)}
                  onClick={() => {
                    setView("projects");
                    setDrawer(false);
                  }}
                  size="icon-xs"
                  variant="ghost"
                >
                  <ChevronRightIcon />
                </Button>
              </div>
              <ul className="space-y-px">
                {projectList.map((p) => {
                  const on = view === "chats" && !active && scopeId === p.id;
                  return (
                    <li key={p.id}>
                      <button
                        aria-current={on ? "page" : undefined}
                        className={cn(
                          "relative flex h-8 w-full items-center gap-2.5 rounded-lg px-2 text-left text-sm outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
                          on ? "font-medium text-foreground" : "text-foreground/80",
                        )}
                        onClick={() => newChat(p.id)}
                        type="button"
                      >
                        {on ? (
                          <span className="absolute inset-0 rounded-lg bg-card shadow-xs/5 ring-1 ring-border dark:bg-accent dark:ring-0" />
                        ) : null}
                        <span className={cn("relative size-2 shrink-0 rounded-[calc(var(--radius)*0.3)]", tones[p.tone ?? 1].dot)} />
                        <span className="relative flex-1 truncate">{p.name}</span>
                        <span className="relative text-muted-foreground text-xs tabular-nums">{chatCount(p.id)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}
          {groups.map(([group, list]) => (
            <section key={group}>
              <h3 className="flex h-7 items-center ps-2 font-medium text-muted-foreground text-xs">{group}</h3>
              <ul className="space-y-px">
                <AnimatePresence initial={false}>
                  {list.map((c) => {
                    const on = view === "chats" && c.id === activeId;
                    const streaming = c.messages.some((m) => m.status !== "done");
                    return (
                      <motion.li
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        initial={{ opacity: 0, height: 0 }}
                        key={c.id}
                        layout={reduce ? false : "position"}
                        transition={spring}
                      >
                        <button
                          aria-current={on ? "page" : undefined}
                          className={cn(
                            "relative flex h-8 w-full items-center gap-2 rounded-lg px-2 text-left text-sm outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
                            on ? "font-medium text-foreground" : "text-foreground/80",
                          )}
                          onClick={() => openChat(c.id)}
                          type="button"
                        >
                          {on ? (
                            <span className="absolute inset-0 rounded-lg bg-card shadow-xs/5 ring-1 ring-border dark:bg-accent dark:ring-0" />
                          ) : null}
                          <span className="relative flex-1 truncate">{c.title}</span>
                          {streaming ? (
                            <motion.span
                              animate={{ opacity: [0.35, 1, 0.35] }}
                              aria-label="Replying"
                              className="relative size-1.5 shrink-0 rounded-full bg-info"
                              transition={{ duration: 1.2, repeat: Number.POSITIVE_INFINITY }}
                            />
                          ) : null}
                        </button>
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </ul>
            </section>
          ))}
          {groups.length === 0 ? (
            <p className="px-2 py-6 text-center text-muted-foreground text-xs">No chats match “{query}”.</p>
          ) : null}
        </nav>
      </ScrollArea>
      <div className="shrink-0 border-t p-2">
        <div className="flex w-full items-center gap-2.5 rounded-lg p-1.5">
          <Avatar className="size-7">
            <AvatarFallback className="bg-teal-500/15 text-teal-700 dark:text-teal-300 text-[11px]">{user.initials}</AvatarFallback>
          </Avatar>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium text-sm leading-4">{user.name}</span>
            {user.plan ? <span className="block text-muted-foreground text-xs">{user.plan}</span> : null}
          </span>
        </div>
      </div>
    </div>
  );

  const composer = (
    <motion.div layoutId={reduce ? undefined : `${uid}-composer`} ref={composerRef} transition={spring}>
      <Composer
        aria-label={`Message ${productName}`}
        onSubmit={(v) => send(getComposerText(v))}
        onValueChange={setDraft}
        submitDisabled={busy}
        value={draft}
      >
        <AnimatePresence initial={false}>
          {files.length > 0 ? (
            <motion.div
              animate={{ opacity: 1, height: "auto" }}
              className="overflow-hidden"
              exit={{ opacity: 0, height: 0 }}
              initial={{ opacity: 0, height: 0 }}
              transition={spring}
            >
              <div className="flex flex-wrap gap-1.5 px-2 pt-2">
                {files.map((f) => (
                  <AttachmentChip
                    file={f}
                    key={f.id}
                    onRemove={() => setFiles((prev) => prev.filter((x) => x.id !== f.id))}
                  />
                ))}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
        <ComposerInput placeholder={scope ? `Ask about ${scope.name}…` : `Ask ${productName} anything…`} />
        <ComposerActions>
          <ComposerActionGroup>
            <Button
              aria-label="Attach files"
              className={cn("text-muted-foreground", press)}
              disabled={files.length >= 5}
              onClick={() => fileInput.current?.click()}
              size="icon-sm"
              variant="ghost"
            >
              <PaperclipIcon />
            </Button>
            <input
              aria-hidden
              className="hidden"
              multiple
              onChange={(e) => {
                attach(e.target.files);
                e.target.value = "";
              }}
              ref={fileInput}
              tabIndex={-1}
              type="file"
            />
            <AnimatePresence initial={false}>
              {scope ? (
                <motion.span
                  animate={{ opacity: 1, scale: 1 }}
                  className="inline-flex h-7 max-w-44 items-center gap-1.5 rounded-full border bg-background ps-2 pe-1 text-xs dark:bg-input/32"
                  exit={{ opacity: 0, scale: 0.95 }}
                  initial={{ opacity: 0, scale: 0.95 }}
                  transition={spring}
                >
                  <span className={cn("size-2 shrink-0 rounded-[calc(var(--radius)*0.3)]", tones[scope.tone ?? 1].dot)} />
                  <span className="truncate font-medium">{scope.name}</span>
                  {!active ? (
                    <button
                      aria-label={`Leave ${scope.name}`}
                      className="relative flex size-5 items-center justify-center rounded-full text-muted-foreground outline-none after:absolute after:-inset-1.5 hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => setScopeId(null)}
                      type="button"
                    >
                      <XIcon className="size-3" />
                    </button>
                  ) : (
                    <span className="w-1" />
                  )}
                </motion.span>
              ) : null}
            </AnimatePresence>
          </ComposerActionGroup>
          <ComposerActionGroup align="end">
            {busy ? (
              <Button aria-label="Stop replying" className={cn("rounded-full", press)} onClick={stop} size="icon-sm" variant="outline">
                <SquareIcon className="size-3 fill-current" />
              </Button>
            ) : (
              <ComposerSubmit
                aria-label="Send message"
                className="inline-flex size-8 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground outline-none transition-[opacity,scale] duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background active:scale-[0.94] disabled:cursor-default disabled:opacity-32 sm:size-7"
              >
                <ArrowUpIcon className="size-4" />
              </ComposerSubmit>
            )}
          </ComposerActionGroup>
        </ComposerActions>
      </Composer>
    </motion.div>
  );

  const ideas = scope?.suggestions ?? suggestions;
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

  const welcome = (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl">
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex flex-col items-center text-center"
          initial={{ opacity: 0, y: 8 }}
          key={scope?.id ?? "none"}
          transition={spring}
        >
          {scope?.icon ? (
            <span className={cn("mb-4 flex size-11 items-center justify-center rounded-xl", tones[scope.tone ?? 1].tile)}>
              <scope.icon className="size-5" />
            </span>
          ) : (
            <AssistantMark className="mb-4 size-11 rounded-xl [&_svg]:size-5" />
          )}
          <h2 className="font-semibold text-xl tracking-tight">
            {scope ? scope.name : `${greeting}, ${user.name.split(" ")[0]}`}
          </h2>
          <p className="mt-1 text-muted-foreground text-sm">
            {scope
              ? (scope.description ?? `New chat in ${scope.name}.`)
              : "Start a chat, or pick up where a project left off."}
          </p>
        </motion.div>
        {composer}
        {ideas.length > 0 ? (
          <div className="mt-4 grid grid-cols-1 gap-2 @lg:grid-cols-2">
            {ideas.map((s, i) => (
              <motion.button
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "group flex items-start gap-3 rounded-xl border bg-background p-3 text-left outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring dark:bg-input/32 dark:hover:bg-input/64",
                  cardPress,
                )}
                initial={{ opacity: 0, y: 8 }}
                key={`${scope?.id}-${s.title}`}
                onClick={() => send(s.prompt ?? s.title)}
                transition={{ ...spring, delay: reduce ? 0 : 0.04 * i }}
                type="button"
              >
                {s.icon ? (
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:text-foreground">
                    <s.icon className="size-3.5" />
                  </span>
                ) : null}
                <span className="min-w-0">
                  <span className="block font-medium text-sm">{s.title}</span>
                  {s.hint ? <span className="mt-0.5 block text-muted-foreground text-xs">{s.hint}</span> : null}
                </span>
              </motion.button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );

  const conversation = active ? (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-6">
      {active.messages.map((m) =>
        m.role === "user" ? (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-end"
            initial={{ opacity: 0, y: 8 }}
            key={m.id}
            transition={spring}
          >
            <div className="flex max-w-[85%] flex-col items-end gap-1.5">
              {m.attachments?.length ? (
                <div className="flex flex-wrap justify-end gap-1.5">
                  {m.attachments.map((f) => (
                    <AttachmentChip file={f} key={f.name} />
                  ))}
                </div>
              ) : null}
              <div className="whitespace-pre-wrap rounded-2xl rounded-br-md bg-muted px-3.5 py-2 text-sm leading-6">
                {m.content}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3"
            initial={{ opacity: 0, y: 8 }}
            key={m.id}
            transition={spring}
          >
            <AssistantMark />
            <div aria-busy={m.status !== "done"} aria-live="polite" className="min-w-0 flex-1 pt-0.5">
              {m.status === "thinking" ? (
                <Thinking reduce={reduce} />
              ) : (
                <>
                  <Markdown caret={m.status === "streaming" && !reduce} text={m.content} />
                  {m.status === "done" ? (
                    <MessageActions onRetry={() => retry(active.id, m.id)} text={m.content} />
                  ) : null}
                </>
              )}
            </div>
          </motion.div>
        ),
      )}
    </div>
  ) : null;

  const projectsView = (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 @3xl:px-6">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="font-semibold text-base">Projects</h2>
          <p className="mt-0.5 text-muted-foreground text-xs tabular-nums">
            {plural(projectList.length, "project")} · {plural(chats.filter((c) => c.projectId).length, "chat")}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 @lg:grid-cols-2 @4xl:grid-cols-3">
        {projectList.map((p, i) => {
          const Icon = p.icon ?? FolderIcon;
          const recent = chats.filter((c) => c.projectId === p.id).slice(0, 2);
          return (
            <motion.button
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "group flex flex-col rounded-xl border bg-background p-4 text-left outline-none hover:bg-accent/60 hover:shadow-xs/5 focus-visible:ring-2 focus-visible:ring-ring dark:bg-input/32 dark:hover:bg-input/64",
                cardPress,
              )}
              initial={{ opacity: 0, y: 10 }}
              key={p.id}
              onClick={() => newChat(p.id)}
              transition={{ ...spring, delay: reduce ? 0 : 0.035 * i }}
              type="button"
            >
              <div className="flex items-start justify-between gap-3">
                <span className={cn("flex size-9 items-center justify-center rounded-lg", tones[p.tone ?? 1].tile)}>
                  <Icon className="size-4" />
                </span>
                {p.updated ? <span className="text-muted-foreground text-xs">{p.updated}</span> : null}
              </div>
              <span className="mt-3 font-medium text-sm">{p.name}</span>
              {p.description ? (
                <span className="mt-1 line-clamp-2 text-muted-foreground text-xs leading-5">{p.description}</span>
              ) : null}
              {recent.length > 0 ? (
                <span className="mt-3 space-y-1 border-t pt-3">
                  {recent.map((c) => (
                    <span className="flex items-center gap-2 text-foreground/80 text-xs" key={c.id}>
                      <MessageSquareIcon className="size-3 shrink-0 text-muted-foreground" />
                      <span className="truncate">{c.title}</span>
                    </span>
                  ))}
                </span>
              ) : null}
              <span className="mt-auto flex items-center gap-3 pt-3 text-muted-foreground text-xs tabular-nums">
                <span>{plural(chatCount(p.id), "chat")}</span>
                {p.files !== undefined ? <span>{plural(p.files, "file")}</span> : null}
              </span>
            </motion.button>
          );
        })}
        {creating ? (
          <form
            className="flex min-h-36 flex-col justify-center gap-2 rounded-xl border border-ring bg-background p-4 ring-[3px] ring-ring/24 dark:bg-input/32"
            onSubmit={(e) => {
              e.preventDefault();
              createProject();
            }}
          >
            <label className="font-medium text-muted-foreground text-xs" htmlFor={`${uid}-new-project`}>
              New project
            </label>
            <input
              autoFocus
              className="h-8 w-full bg-transparent font-medium text-sm outline-none placeholder:text-muted-foreground/72"
              id={`${uid}-new-project`}
              maxLength={48}
              onBlur={createProject}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  setNewName("");
                  setCreating(false);
                }
              }}
              placeholder="Name it, e.g. Hiring plan"
              value={newName}
            />
            <p className="text-muted-foreground text-xs">Enter to create · Esc to cancel</p>
          </form>
        ) : (
          <motion.button
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "flex min-h-36 flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-muted-foreground text-sm outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
              cardPress,
            )}
            initial={{ opacity: 0, y: 10 }}
            onClick={() => setCreating(true)}
            transition={{ ...spring, delay: reduce ? 0 : 0.035 * projectList.length }}
            type="button"
          >
            <span className="flex size-9 items-center justify-center rounded-lg border border-dashed">
              <PlusIcon className="size-4" />
            </span>
            New project
          </motion.button>
        )}
      </div>
    </div>
  );

  const title = view === "projects" ? "Projects" : active ? active.title : "New chat";

  return (
    <MotionConfig reducedMotion="user">
    <div
      className={cn(
        "@container relative mx-auto flex h-[640px] w-full max-w-[1100px] overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-xs/5",
        className,
      )}
    >
      <motion.aside
        animate={{ width: collapsed ? 0 : 256 }}
        aria-label="Sidebar"
        className="hidden shrink-0 overflow-hidden border-e bg-muted @3xl:block data-[collapsed=true]:border-e-0"
        data-collapsed={collapsed}
        initial={false}
        transition={spring}
      >
        {sidebar(false)}
      </motion.aside>

      <AnimatePresence>
        {drawer ? (
          <>
            <motion.div
              animate={{ opacity: 1 }}
              aria-hidden
              className="absolute inset-0 z-20 bg-background/70 backdrop-blur-[2px] @3xl:hidden"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              onClick={() => setDrawer(false)}
              transition={{ duration: 0.2 }}
            />
            <motion.aside
              animate={{ x: 0 }}
              aria-label="Sidebar"
              className="absolute inset-y-0 left-0 z-30 border-e bg-card shadow-lg/5 @3xl:hidden"
              exit={{ x: "-100%" }}
              initial={{ x: "-100%" }}
              onKeyDown={(e) => e.key === "Escape" && setDrawer(false)}
              transition={spring}
            >
              <div className="h-full bg-muted">{sidebar(true)}</div>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center gap-1.5 border-b px-2.5">
          <Button aria-label="Open sidebar" className="@3xl:hidden" onClick={() => setDrawer(true)} size="icon-sm" variant="ghost">
            <PanelLeftIcon />
          </Button>
          <AnimatePresence initial={false}>
            {collapsed ? (
              <motion.span
                animate={{ opacity: 1, width: "auto" }}
                className="hidden items-center gap-1.5 overflow-hidden @3xl:flex"
                exit={{ opacity: 0, width: 0 }}
                initial={{ opacity: 0, width: 0 }}
                transition={spring}
              >
                <Button aria-label="Expand sidebar" onClick={() => setCollapsed(false)} size="icon-sm" variant="ghost">
                  <PanelLeftIcon />
                </Button>
                <Button aria-label="New chat" onClick={() => newChat(null)} size="icon-sm" variant="ghost">
                  <SquarePenIcon />
                </Button>
              </motion.span>
            ) : null}
          </AnimatePresence>
          <div className="flex min-w-0 flex-1 items-center gap-1.5 ps-1 text-sm">
            {view === "chats" && scope ? (
              <>
                <button
                  className="hidden max-w-40 shrink-0 items-center gap-1.5 truncate rounded-md text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring @xl:flex"
                  onClick={() => newChat(scope.id)}
                  type="button"
                >
                  <span className={cn("size-2 shrink-0 rounded-[calc(var(--radius)*0.3)]", tones[scope.tone ?? 1].dot)} />
                  <span className="truncate">{scope.name}</span>
                </button>
                <ChevronRightIcon className="hidden size-3.5 shrink-0 text-muted-foreground/70 @xl:block" />
              </>
            ) : null}
            <AnimatePresence initial={false} mode="popLayout">
              <motion.h1
                animate={{ opacity: 1, y: 0 }}
                className="min-w-0 truncate font-medium"
                exit={{ opacity: 0, y: -6 }}
                initial={{ opacity: 0, y: 6 }}
                key={title}
                transition={{ duration: 0.18 }}
              >
                {title}
              </motion.h1>
            </AnimatePresence>
          </div>
          <SegmentedControl aria-label="View" role="group" size="sm">
            <SegmentedControlItem
              aria-pressed={view === "chats"}
              data-pressed={view === "chats" ? "" : undefined}
              onClick={() => setView("chats")}
            >
              <MessageSquareIcon className="hidden @md:block" />
              Chats
            </SegmentedControlItem>
            <SegmentedControlItem
              aria-pressed={view === "projects"}
              data-pressed={view === "projects" ? "" : undefined}
              onClick={() => setView("projects")}
            >
              <FolderKanbanIcon className="hidden @md:block" />
              Projects
            </SegmentedControlItem>
          </SegmentedControl>
        </header>

        <LayoutGroup>
          <div
            className="min-h-0 flex-1 overflow-y-auto [mask-image:linear-gradient(to_bottom,transparent,black_20px,black_calc(100%-12px),transparent)]"
            onScroll={(e) => {
              const el = e.currentTarget;
              pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
            }}
            ref={scrollRef}
          >
            <motion.div
              animate={{ opacity: 1 }}
              className="min-h-full"
              initial={{ opacity: 0 }}
              key={view === "projects" ? "projects" : active ? "chat" : `welcome-${scope?.id}`}
              transition={{ duration: 0.2 }}
            >
              {view === "projects" ? projectsView : active ? conversation : welcome}
            </motion.div>
          </div>
          {view === "chats" && active ? (
            <div className="shrink-0 px-4 pt-1 pb-3">
              <div className="mx-auto w-full max-w-2xl">
                {composer}
                <p className="mt-2 text-center text-muted-foreground text-xs">
                  {productName} can make mistakes. Check anything important.
                </p>
              </div>
            </div>
          ) : null}
        </LayoutGroup>
      </div>
    </div>
    </MotionConfig>
  );
}

